import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { agents, budgets, tokenUsageSessions, tokenUsageTotals } from "@/lib/db/schema";
import { writeAuditEvent } from "@/lib/audit";
import { checkAndEnforceBudget } from "@/lib/budget-enforcer";

const MINIMAX_BASE = "https://api.minimax.io/v1";

type RouteCtx = { params: Promise<{ agentId: string }> };

/**
 * OpenAI-compatible chat completions proxy.
 * OpenClaw on each droplet hits this instead of MiniMax directly so we can
 * track every token that flows through.
 */
export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { agentId } = await ctx.params;
  const minimaxKey = process.env.MINIMAX_API_KEY;

  if (!minimaxKey) {
    return NextResponse.json(
      { error: "MINIMAX_API_KEY not configured" },
      { status: 500 },
    );
  }

  const agent = db.select().from(agents).where(eq(agents.id, agentId)).get();
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Optionally validate the bearer token from OpenClaw matches the device token
  const authHeader = req.headers.get("authorization") ?? "";
  const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (agent.deviceToken && bearerToken !== agent.deviceToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (agent.status === "paused") {
    return NextResponse.json(
      { error: "Agent is paused" },
      { status: 403 },
    );
  }

  const budget = db.select().from(budgets).where(eq(budgets.agentId, agentId)).get();
  if (budget?.enabled && budget.exceededAt) {
    return NextResponse.json(
      { error: "Budget exceeded — agent is paused" },
      { status: 429 },
    );
  }

  db.update(agents)
    .set({ lastActivityAt: new Date(), updatedAt: new Date() })
    .where(eq(agents.id, agentId))
    .run();

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Ensure model is set
  if (!body.model) {
    body.model = "MiniMax-M2.5";
  }

  const isStream = body.stream === true;

  const upstreamRes = await fetch(`${MINIMAX_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${minimaxKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!upstreamRes.ok) {
    const errText = await upstreamRes.text().catch(() => "upstream error");
    return NextResponse.json(
      { error: "Upstream LLM error", detail: errText },
      { status: upstreamRes.status },
    );
  }

  if (isStream) {
    return handleStream(upstreamRes, agentId, agent.activeSessionId);
  }

  return handleNonStream(upstreamRes, agentId, agent.activeSessionId);
}

// ---------------------------------------------------------------------------
// Non-streaming path
// ---------------------------------------------------------------------------

async function handleNonStream(
  upstreamRes: Response,
  agentId: string,
  sessionId: string | null,
) {
  const data = (await upstreamRes.json()) as {
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    [k: string]: unknown;
  };

  const inputTokens = data.usage?.prompt_tokens ?? 0;
  const outputTokens = data.usage?.completion_tokens ?? 0;

  recordTokenUsage(agentId, sessionId, inputTokens, outputTokens);

  return NextResponse.json(data);
}

// ---------------------------------------------------------------------------
// Streaming path — pipe SSE, accumulate usage on the fly
// ---------------------------------------------------------------------------

function handleStream(
  upstreamRes: Response,
  agentId: string,
  sessionId: string | null,
) {
  const upstreamBody = upstreamRes.body;
  if (!upstreamBody) {
    return NextResponse.json(
      { error: "No upstream body" },
      { status: 502 },
    );
  }

  let inputTokens = 0;
  let outputTokens = 0;

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      controller.enqueue(chunk);

      // Best-effort parse SSE lines for usage data
      try {
        const text = new TextDecoder().decode(chunk);
        for (const line of text.split("\n")) {
          if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
          const json = JSON.parse(line.slice(6));
          if (json.usage) {
            inputTokens = json.usage.prompt_tokens ?? inputTokens;
            outputTokens = json.usage.completion_tokens ?? outputTokens;
          }
        }
      } catch {
        // Parsing SSE is best-effort; don't break the stream
      }
    },
    flush() {
      recordTokenUsage(agentId, sessionId, inputTokens, outputTokens);
    },
  });

  const piped = upstreamBody.pipeThrough(transform);

  return new Response(piped, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// ---------------------------------------------------------------------------
// Token accounting
// ---------------------------------------------------------------------------

function recordTokenUsage(
  agentId: string,
  sessionId: string | null,
  inputTokens: number,
  outputTokens: number,
) {
  if (inputTokens === 0 && outputTokens === 0) return;

  try {
    // Upsert lifetime totals
    const existing = db
      .select()
      .from(tokenUsageTotals)
      .where(eq(tokenUsageTotals.agentId, agentId))
      .get();

    if (existing) {
      db.update(tokenUsageTotals)
        .set({
          totalInputTokens: sql`${tokenUsageTotals.totalInputTokens} + ${inputTokens}`,
          totalOutputTokens: sql`${tokenUsageTotals.totalOutputTokens} + ${outputTokens}`,
        })
        .where(eq(tokenUsageTotals.agentId, agentId))
        .run();
    } else {
      db.insert(tokenUsageTotals)
        .values({
          agentId,
          totalInputTokens: inputTokens,
          totalOutputTokens: outputTokens,
        })
        .run();
    }

    // Upsert session-level usage
    if (sessionId) {
      const sessionRow = db
        .select()
        .from(tokenUsageSessions)
        .where(eq(tokenUsageSessions.sessionId, sessionId))
        .get();

      if (sessionRow) {
        db.update(tokenUsageSessions)
          .set({
            inputTokens: sql`${tokenUsageSessions.inputTokens} + ${inputTokens}`,
            outputTokens: sql`${tokenUsageSessions.outputTokens} + ${outputTokens}`,
            updatedAt: new Date(),
          })
          .where(eq(tokenUsageSessions.sessionId, sessionId))
          .run();
      } else {
        const now = new Date();
        db.insert(tokenUsageSessions)
          .values({
            id: crypto.randomUUID(),
            agentId,
            sessionId,
            inputTokens,
            outputTokens,
            startedAt: now,
            updatedAt: now,
          })
          .run();
      }
    }

    writeAuditEvent(agentId, "llm.completion", {
      inputTokens,
      outputTokens,
      sessionId,
    }, "agent");

    checkAndEnforceBudget(agentId);
  } catch (err) {
    console.error("[llm-proxy] token accounting error:", err);
  }
}
