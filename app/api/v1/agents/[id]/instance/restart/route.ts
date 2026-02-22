import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { rebootDroplet, DoApiError } from "@/lib/do-client";
import { writeAuditEvent } from "@/lib/audit";

type RouteCtx = { params: Promise<{ id: string }> };

// POST /api/v1/agents/:id/instance/restart — Reboot the agent droplet
export async function POST(_req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;

  const agent = db.select().from(agents).where(eq(agents.id, id)).get();
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  if (!agent.doDropletId) {
    return NextResponse.json(
      { error: "No droplet associated with this agent" },
      { status: 400 },
    );
  }

  if (agent.status === "offline") {
    return NextResponse.json(
      { error: "Agent is offline — use resume (power on) instead of restart" },
      { status: 409 },
    );
  }

  try {
    await rebootDroplet(agent.doDropletId);
  } catch (err) {
    if (err instanceof DoApiError) {
      return NextResponse.json(
        { error: `Reboot failed: ${err.message}` },
        { status: 502 },
      );
    }
    throw err;
  }

  db.update(agents)
    .set({ status: "creating", updatedAt: new Date() })
    .where(eq(agents.id, id))
    .run();

  await writeAuditEvent(id, "instance.restart", {
    dropletId: agent.doDropletId,
  });

  return NextResponse.json({ status: "restarting" });
}
