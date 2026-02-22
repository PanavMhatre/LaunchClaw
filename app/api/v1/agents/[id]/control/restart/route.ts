import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agents, budgets } from "@/lib/db/schema";
import { writeAuditEvent } from "@/lib/audit";
import { relayControlCommand } from "@/lib/control-relay";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;

  const agent = db.select().from(agents).where(eq(agents.id, id)).get();
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  if (agent.status !== "online") {
    return NextResponse.json(
      { error: `Agent is ${agent.status}, must be online to restart` },
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

  const relay = await relayControlCommand(id, "control.restart", freshState);
  if (!relay.ok) {
    return NextResponse.json(
      { error: `Failed to relay restart command: ${relay.error}` },
      { status: 502 },
    );
  }

  const now = new Date();
  db.update(agents)
    .set({
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

  return NextResponse.json({ runtime_state: "running", fresh_state: freshState });
}
