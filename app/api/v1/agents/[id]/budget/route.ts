import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agents, budgets, tokenUsageTotals } from "@/lib/db/schema";
import { budgetSchema } from "@/lib/types";
import { calculateCostUsd } from "@/lib/cost";
import { writeAuditEvent } from "@/lib/audit";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;

  const agent = db.select().from(agents).where(eq(agents.id, id)).get();
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const budget = db
    .select()
    .from(budgets)
    .where(eq(budgets.agentId, id))
    .get();

  if (!budget) {
    return NextResponse.json(
      { error: "No budget configured" },
      { status: 404 },
    );
  }

  const totals = db
    .select()
    .from(tokenUsageTotals)
    .where(eq(tokenUsageTotals.agentId, id))
    .get();

  const totalInput = totals?.totalInputTokens ?? 0;
  const totalOutput = totals?.totalOutputTokens ?? 0;

  return NextResponse.json({
    ...formatBudget(budget),
    usage: {
      total_tokens: totalInput + totalOutput,
      total_input_tokens: totalInput,
      total_output_tokens: totalOutput,
      estimated_cost_usd: calculateCostUsd(totalInput, totalOutput),
    },
  });
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;

  const agent = db.select().from(agents).where(eq(agents.id, id)).get();
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = budgetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const data = parsed.data;

  const existing = db
    .select()
    .from(budgets)
    .where(eq(budgets.agentId, id))
    .get();

  const wasExceeded = existing?.exceededAt !== null && existing?.exceededAt !== undefined;
  const isReEnabling = wasExceeded && data.enabled;

  if (existing) {
    db.update(budgets)
      .set({
        tokenLimitTotal: data.token_limit_total ?? null,
        costLimitUsd:
          data.cost_limit_usd !== null && data.cost_limit_usd !== undefined
            ? String(data.cost_limit_usd)
            : null,
        actionOnExceed: data.action_on_exceed,
        enabled: data.enabled,
        exceededAt: isReEnabling ? null : existing.exceededAt,
      })
      .where(eq(budgets.agentId, id))
      .run();
  } else {
    db.insert(budgets)
      .values({
        agentId: id,
        tokenLimitTotal: data.token_limit_total ?? null,
        costLimitUsd:
          data.cost_limit_usd !== null && data.cost_limit_usd !== undefined
            ? String(data.cost_limit_usd)
            : null,
        actionOnExceed: data.action_on_exceed,
        enabled: data.enabled,
        exceededAt: null,
      })
      .run();
  }

  if (isReEnabling && agent.status === "paused") {
    db.update(agents)
      .set({
        status: "online",
        runtimeState: "running",
        pauseReason: null,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, id))
      .run();

    await writeAuditEvent(id, "budget.reset", {
      note: "Budget re-enabled, agent unpaused",
    }, "user");
  }

  const saved = db
    .select()
    .from(budgets)
    .where(eq(budgets.agentId, id))
    .get()!;

  const totals = db
    .select()
    .from(tokenUsageTotals)
    .where(eq(tokenUsageTotals.agentId, id))
    .get();

  const totalInput = totals?.totalInputTokens ?? 0;
  const totalOutput = totals?.totalOutputTokens ?? 0;

  return NextResponse.json({
    ...formatBudget(saved),
    usage: {
      total_tokens: totalInput + totalOutput,
      total_input_tokens: totalInput,
      total_output_tokens: totalOutput,
      estimated_cost_usd: calculateCostUsd(totalInput, totalOutput),
    },
  });
}

function formatBudget(b: typeof budgets.$inferSelect) {
  return {
    agent_id: b.agentId,
    token_limit_total: b.tokenLimitTotal,
    cost_limit_usd: b.costLimitUsd ? Number(b.costLimitUsd) : null,
    action_on_exceed: b.actionOnExceed,
    enabled: b.enabled,
    exceeded_at: b.exceededAt?.toISOString() ?? null,
  };
}
