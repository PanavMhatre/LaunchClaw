import { NextRequest, NextResponse } from "next/server";
import { eq, and, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { agents, scheduleEvents } from "@/lib/db/schema";
import { addDays } from "date-fns";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;

  const agent = db.select().from(agents).where(eq(agents.id, id)).get();
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const daysParam = req.nextUrl.searchParams.get("days");
  const days = Math.min(Math.max(Number(daysParam) || 14, 1), 30);

  const now = new Date();
  const until = addDays(now, days);

  const events = db
    .select({
      ts: scheduleEvents.ts,
      action: scheduleEvents.action,
      source: scheduleEvents.source,
    })
    .from(scheduleEvents)
    .where(
      and(
        eq(scheduleEvents.agentId, id),
        eq(scheduleEvents.executed, false),
        gte(scheduleEvents.ts, now),
        lte(scheduleEvents.ts, until),
      ),
    )
    .orderBy(scheduleEvents.ts)
    .all();

  return NextResponse.json({
    events: events.map((e) => ({
      ts: e.ts.toISOString(),
      action: e.action,
      source: e.source,
    })),
  });
}
