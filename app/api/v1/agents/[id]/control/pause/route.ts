import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
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
      { error: `Agent is ${agent.status}, must be online to pause` },
      { status: 409 },
    );
  }

  if (agent.runtimeState === "paused") {
    return NextResponse.json(
      { error: "Agent is already paused" },
      { status: 409 },
    );
  }

  let reason: string | null = null;
  try {
    const body = (await req.json()) as { reason?: string };
    if (body.reason) reason = body.reason;
  } catch {
    // body is optional
  }

  const now = new Date();
  db.update(agents)
    .set({
      runtimeState: "paused",
      pauseReason: reason,
      updatedAt: now,
    })
    .where(eq(agents.id, id))
    .run();

  await relayControlCommand(id, "control.pause");

  await writeAuditEvent(id, "control.pause", { reason }, "user");

  return NextResponse.json({ runtime_state: "paused", reason });
}
