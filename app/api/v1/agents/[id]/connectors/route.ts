import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agents, connectors } from "@/lib/db/schema";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;

  const agent = db.select().from(agents).where(eq(agents.id, id)).get();
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const rows = db
    .select({
      id: connectors.id,
      provider: connectors.provider,
      status: connectors.status,
      scopes: connectors.scopes,
      createdAt: connectors.createdAt,
    })
    .from(connectors)
    .where(eq(connectors.agentId, id))
    .all();

  return NextResponse.json({ connectors: rows });
}
