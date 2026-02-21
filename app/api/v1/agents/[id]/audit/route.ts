import { NextRequest, NextResponse } from "next/server";
import { eq, desc, and, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditEvents } from "@/lib/db/schema";
import { agents } from "@/lib/db/schema";

type RouteCtx = { params: Promise<{ id: string }> };

// GET /api/v1/agents/:id/audit — Paginated audit events
export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;

  const agent = db.select().from(agents).where(eq(agents.id, id)).get();
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 100);
  const cursor = url.searchParams.get("cursor"); // ISO timestamp for keyset pagination

  const conditions = [eq(auditEvents.agentId, id)];
  if (cursor) {
    conditions.push(lt(auditEvents.createdAt, new Date(cursor)));
  }

  const events = db
    .select()
    .from(auditEvents)
    .where(and(...conditions))
    .orderBy(desc(auditEvents.createdAt))
    .limit(limit)
    .all();

  const nextCursor =
    events.length === limit
      ? events[events.length - 1].createdAt.toISOString()
      : null;

  return NextResponse.json({
    events,
    next_cursor: nextCursor,
  });
}
