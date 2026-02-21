import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agents, tokenUsageTotals, tokenUsageSessions } from "@/lib/db/schema";

type RouteCtx = { params: Promise<{ id: string }> };

// GET /api/v1/agents/:id/tokens — Token usage (total + optional session)
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

  const result: Record<string, unknown> = {
    total: {
      input_tokens: totals?.totalInputTokens ?? 0,
      output_tokens: totals?.totalOutputTokens ?? 0,
    },
  };

  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (sessionId) {
    const session = db
      .select()
      .from(tokenUsageSessions)
      .where(eq(tokenUsageSessions.sessionId, sessionId))
      .get();

    result.session = {
      input_tokens: session?.inputTokens ?? 0,
      output_tokens: session?.outputTokens ?? 0,
    };
  }

  return NextResponse.json(result);
}
