import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { writeAuditEvent } from "@/lib/audit";
import { relayControlCommand } from "@/lib/control-relay";
import { shutdownDroplet, powerOffDroplet } from "@/lib/do-client";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;

  const agent = db.select().from(agents).where(eq(agents.id, id)).get();
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Block only if already deleting or already stopped
  if (agent.status === "deleting") {
    return NextResponse.json(
      { error: "Agent is being deleted" },
      { status: 409 },
    );
  }

  if (agent.runtimeState === "stopped" && agent.status === "offline") {
    return NextResponse.json(
      { error: "Agent is already stopped" },
      { status: 409 },
    );
  }

  // Best-effort: try to relay the stop command through the tunnel.
  // If the WS server or tunnel isn't available, we still proceed.
  const relay = await relayControlCommand(id, "control.stop");
  if (!relay.ok) {
    console.log(
      `[control/stop] relay failed for ${id} (best-effort): ${relay.error}`,
    );
  }

  // Actually power off the DO droplet so the agent is truly stopped
  if (agent.doDropletId) {
    try {
      await shutdownDroplet(agent.doDropletId);
    } catch (shutdownErr) {
      console.log(
        `[control/stop] graceful shutdown failed for droplet ${agent.doDropletId}, forcing power off`,
      );
      try {
        await powerOffDroplet(agent.doDropletId);
      } catch (powerOffErr) {
        console.error(
          `[control/stop] power off also failed for droplet ${agent.doDropletId}:`,
          powerOffErr,
        );
      }
    }
  }

  // Always update the DB — this is the authoritative state
  const now = new Date();
  db.update(agents)
    .set({
      runtimeState: "stopped",
      status: "offline",
      updatedAt: now,
    })
    .where(eq(agents.id, id))
    .run();

  await writeAuditEvent(id, "control.stop", undefined, "user");

  return NextResponse.json({ runtime_state: "stopped", status: "offline" });
}
