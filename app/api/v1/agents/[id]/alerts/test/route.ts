import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { writeAuditEvent } from "@/lib/audit";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;

  const agent = db.select().from(agents).where(eq(agents.id, id)).get();
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  await writeAuditEvent(id, "alert.test", {
    message: "This is a test alert fired from the demo endpoint.",
    timestamp: new Date().toISOString(),
  }, "user");

  return NextResponse.json({ ok: true, message: "Test alert fired" });
}
