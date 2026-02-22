import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agents, budgets } from "@/lib/db/schema";
import { writeAuditEvent } from "@/lib/audit";
import { relayControlCommand } from "@/lib/control-relay";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;

  const agent = db.select().from(agents).where(eq(agents.id, id)).get();
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  if (agent.runtimeState !== "paused") {
    return NextResponse.json(
      { error: `Agent runtime_state is ${agent.runtimeState}, must be paused to resume` },
      { status: 409 },
    );
  }

  const budget = db
    .select()
    .from(budgets)
    .where(eq(budgets.agentId, id))
    .get();
  if (budget?.enabled && budget.exceededAt) {
    return NextResponse.json(
      { error: "Cannot resume — budget is exceeded. Reset the budget first." },
      { status: 409 },
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

  await relayControlCommand(id, "control.resume");

  await writeAuditEvent(id, "control.resume", undefined, "user");

  return NextResponse.json({ runtime_state: "running" });
}
