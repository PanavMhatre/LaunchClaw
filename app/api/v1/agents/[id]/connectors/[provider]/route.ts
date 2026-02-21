import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { connectors } from "@/lib/db/schema";
import { writeAuditEvent } from "@/lib/audit";

type RouteCtx = { params: Promise<{ id: string; provider: string }> };

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const { id, provider } = await ctx.params;

  const row = db
    .select()
    .from(connectors)
    .where(
      and(eq(connectors.agentId, id), eq(connectors.provider, provider)),
    )
    .get();

  if (!row) {
    return NextResponse.json(
      { error: "Connector not found" },
      { status: 404 },
    );
  }

  db.update(connectors)
    .set({
      status: "revoked",
      accessTokenEncrypted: null,
      refreshTokenEncrypted: null,
    })
    .where(eq(connectors.id, row.id))
    .run();

  await writeAuditEvent(id, "connector.revoked", { provider });

  return NextResponse.json({ revoked: true, provider });
}
