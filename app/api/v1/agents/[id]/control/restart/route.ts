import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agents, budgets } from "@/lib/db/schema";
import { writeAuditEvent } from "@/lib/audit";
import { relayControlCommand } from "@/lib/control-relay";
import { rebootDroplet, powerOnDroplet } from "@/lib/do-client";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;

  const agent = db.select().from(agents).where(eq(agents.id, id)).get();
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  if (agent.status === "deleting") {
    return NextResponse.json(
      { error: "Agent is being deleted" },
      { status: 409 },
    );
  }

  let freshState = false;
  try {
    const body = (await req.json()) as { fresh_state?: boolean };
    if (body.fresh_state) freshState = true;
  } catch {
    // body is optional
  }

  // Best-effort: try to relay the restart command through the tunnel
  const relay = await relayControlCommand(id, "control.restart", freshState);
  if (!relay.ok) {
    console.log(
      `[control/restart] relay failed for ${id} (best-effort): ${relay.error}`,
    );
  }

  // Actually reboot or power on the DO droplet
  if (agent.doDropletId) {
    if (agent.status === "offline" || agent.runtimeState === "stopped") {
      // Droplet is off — power it on
      try {
        await powerOnDroplet(agent.doDropletId);
      } catch (err) {
        console.error(`[control/restart] power on failed for droplet ${agent.doDropletId}:`, err);
      }
    } else {
      // Droplet is on — reboot it
      try {
        await rebootDroplet(agent.doDropletId);
      } catch (err) {
        console.error(`[control/restart] reboot failed for droplet ${agent.doDropletId}:`, err);
        // Try power on as fallback
        try {
          await powerOnDroplet(agent.doDropletId);
        } catch (err2) {
          console.error(`[control/restart] power on fallback also failed:`, err2);
        }
      }
    }
  }

  const now = new Date();
  db.update(agents)
    .set({
      status: "creating",
      runtimeState: "running",
      pauseReason: null,
      updatedAt: now,
    })
    .where(eq(agents.id, id))
    .run();

  const budget = db
    .select()
    .from(budgets)
    .where(eq(budgets.agentId, id))
    .get();
  if (budget?.exceededAt) {
    db.update(budgets)
      .set({ exceededAt: null })
      .where(eq(budgets.agentId, id))
      .run();
  }

  await writeAuditEvent(
    id,
    "control.restart",
    { fresh_state: freshState },
    "user",
  );

  return NextResponse.json({ status: "creating", runtime_state: "running", fresh_state: freshState });
}
