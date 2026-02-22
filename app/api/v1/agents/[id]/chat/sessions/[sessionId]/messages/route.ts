import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  agents,
  chatSessions,
  tokenUsageSessions,
  tokenUsageTotals,
} from "@/lib/db/schema";
import { writeAuditEvent } from "@/lib/audit";

const MINIMAX_BASE = "https://api.minimax.io/v1";

type RouteCtx = { params: Promise<{ id: string; sessionId: string }> };

type ChatMsg = { role: string; content: string };

// POST /api/v1/agents/:id/chat/sessions/:sessionId/messages
// Accepts { text: string } and streams an SSE response from the LLM.
export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { id: agentId, sessionId } = await ctx.params;

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

  // Block messages when agent is paused or stopped
  if (agent.runtimeState === "paused") {
    return NextResponse.json(
      { error: "Agent is paused — resume it before sending messages" },
      { status: 409 },
    );
  }
  if (agent.runtimeState === "stopped") {
    return NextResponse.json(
      { error: "Agent is stopped — restart it before sending messages" },
      { status: 409 },
    );
  }

  const session = db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .get();

  if (!session || session.agentId !== agentId) {
    return NextResponse.json(
      { error: "Session not found for this agent" },
      { status: 404 },
    );
  }

  let body: { text?: string; history?: ChatMsg[] };
  try {
    body = (await req.json()) as { text?: string; history?: ChatMsg[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userText = body.text?.trim();
  if (!userText) {
    return NextResponse.json(
      { error: "Missing 'text' field" },
      { status: 400 },
    );
  }

  await writeAuditEvent(agentId, "chat.user_message", {
    sessionId,
    textLength: userText.length,
  });

  // Build messages array — include history if provided
  const messages: ChatMsg[] = [
    {
      role: "system",
      content:
        "You are OpenClaw, a capable AI agent deployed via LaunchClaw. You help users accomplish tasks by coordinating actions across connected services. Be concise, direct, and proactive.",
    },
  ];

  if (Array.isArray(body.history)) {
    for (const msg of body.history) {
      if (
        msg &&
        typeof msg.role === "string" &&
        typeof msg.content === "string" &&
        (msg.role === "user" || msg.role === "assistant")
      ) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
  }

  messages.push({ role: "user", content: userText });

  // Call LLM with streaming
  const upstreamRes = await fetch(`${MINIMAX_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${minimaxKey}`,
    },
    body: JSON.stringify({
      model: "MiniMax-M2.5",
      messages,
      stream: true,
    }),
  });

  if (!upstreamRes.ok) {
    const errText = await upstreamRes.text().catch(() => "upstream error");
    return NextResponse.json(
      { error: "LLM error", detail: errText },
      { status: 502 },
    );
  }

  const upstreamBody = upstreamRes.body;
  if (!upstreamBody) {
    return NextResponse.json(
      { error: "No response body from LLM" },
      { status: 502 },
    );
  }

  // Track tokens from the stream
  let inputTokens = 0;
  let outputTokens = 0;

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      controller.enqueue(chunk);
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
        // best-effort
      }
    },
    flush() {
      recordTokenUsage(agentId, sessionId, inputTokens, outputTokens);
      writeAuditEvent(agentId, "chat.assistant_response", {
        sessionId,
        inputTokens,
        outputTokens,
      });
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
// Token accounting (same logic as the LLM proxy)
// ---------------------------------------------------------------------------

function recordTokenUsage(
  agentId: string,
  sessionId: string,
  inputTokens: number,
  outputTokens: number,
) {
  if (inputTokens === 0 && outputTokens === 0) return;

  try {
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
        .values({ agentId, totalInputTokens: inputTokens, totalOutputTokens: outputTokens })
        .run();
    }

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
  } catch (err) {
    console.error("[chat-messages] token accounting error:", err);
  }
}
