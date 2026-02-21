import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { writeAuditEvent } from "@/lib/audit";

type RouteCtx = { params: Promise<{ id: string }> };

// POST /api/v1/agents/:id/heartbeat — Called by cloud-init on boot
export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;

  const agent = db.select().from(agents).where(eq(agents.id, id)).get();
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");

  if (!agent.bootToken || token !== agent.bootToken) {
    return NextResponse.json({ error: "Invalid boot token" }, { status: 401 });
  }

  const forwarded = req.headers.get("x-forwarded-for");
  const callerIp = forwarded?.split(",")[0]?.trim() ?? null;

  db.update(agents)
    .set({
      status: "online",
      ipv4: callerIp ?? agent.ipv4,
      bootToken: null, // one-time use: clear after successful heartbeat
      updatedAt: new Date(),
    })
    .where(eq(agents.id, id))
    .run();

  await writeAuditEvent(id, "instance.boot_complete", {
    callerIp,
  });

  return NextResponse.json({ acknowledged: true });
}
