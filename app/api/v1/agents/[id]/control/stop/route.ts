import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { writeAuditEvent } from "@/lib/audit";
import { relayControlCommand } from "@/lib/control-relay";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;

  const agent = db.select().from(agents).where(eq(agents.id, id)).get();
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  if (agent.status !== "online") {
    return NextResponse.json(
      { error: `Agent is ${agent.status}, must be online to stop` },
      { status: 409 },
    );
  }

  if (agent.runtimeState === "stopped") {
    return NextResponse.json(
      { error: "Agent is already stopped" },
      { status: 409 },
    );
  }

  const relay = await relayControlCommand(id, "control.stop");
  if (!relay.ok) {
    return NextResponse.json(
      { error: `Failed to relay stop command: ${relay.error}` },
      { status: 502 },
    );
  }

  const now = new Date();
  db.update(agents)
    .set({
      runtimeState: "stopped",
      updatedAt: now,
    })
    .where(eq(agents.id, id))
    .run();

  await writeAuditEvent(id, "control.stop", undefined, "user");

  return NextResponse.json({ runtime_state: "stopped" });
}
