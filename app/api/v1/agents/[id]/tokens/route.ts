import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  agents,
  budgets,
  tokenUsageTotals,
  tokenUsageSessions,
} from "@/lib/db/schema";

type RouteCtx = { params: Promise<{ id: string }> };

// GET /api/v1/agents/:id/tokens — Token usage with budget info
export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;

  const agent = db.select().from(agents).where(eq(agents.id, id)).get();
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const totals = db
    .select()
    .from(tokenUsageTotals)
    .where(eq(tokenUsageTotals.agentId, id))
    .get();

  const lifetimeInput = totals?.totalInputTokens ?? 0;
  const lifetimeOutput = totals?.totalOutputTokens ?? 0;
  const lifetimeTotal = lifetimeInput + lifetimeOutput;

  const result: Record<string, unknown> = {
    lifetime: {
      input: lifetimeInput,
      output: lifetimeOutput,
      total: lifetimeTotal,
    },
  };

  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (sessionId) {
    const session = db
      .select()
      .from(tokenUsageSessions)
      .where(eq(tokenUsageSessions.sessionId, sessionId))
      .get();

    const sessionInput = session?.inputTokens ?? 0;
    const sessionOutput = session?.outputTokens ?? 0;
    result.session = {
      input: sessionInput,
      output: sessionOutput,
      total: sessionInput + sessionOutput,
    };
  }

  const budget = db
    .select()
    .from(budgets)
    .where(eq(budgets.agentId, id))
    .get();

  if (budget) {
    const limit = budget.tokenLimitTotal ?? null;
    const remaining = limit !== null ? Math.max(0, limit - lifetimeTotal) : null;
    let status: "ok" | "exceeded" | "disabled" = "ok";
    if (!budget.enabled) status = "disabled";
    else if (budget.exceededAt) status = "exceeded";

    result.budget = { limit, remaining, status };
  } else {
    result.budget = { limit: null, remaining: null, status: "ok" };
  }

  return NextResponse.json(result);
}
