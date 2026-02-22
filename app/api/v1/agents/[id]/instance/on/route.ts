import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { powerOnDroplet, DoApiError } from "@/lib/do-client";
import { writeAuditEvent } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

type RouteCtx = { params: Promise<{ id: string }> };

// POST /api/v1/agents/:id/instance/on — Power on
export async function POST(req: NextRequest, ctx: RouteCtx) {
  const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
  if (!rateLimit(`instance-on:${ip}`, 10_000)) {
    return NextResponse.json(
      { error: "Rate limited — wait 10 seconds between power on requests" },
      { status: 429 },
    );
  }

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

  if (agent.status === "online" || agent.status === "creating") {
    return NextResponse.json(
      { error: "Agent is already running or starting" },
      { status: 409 },
    );
  }

  try {
    await powerOnDroplet(agent.doDropletId);
  } catch (err) {
    if (err instanceof DoApiError) {
      return NextResponse.json(
        { error: `Power on failed: ${err.message}` },
        { status: 502 },
      );
    }
    throw err;
  }

  db.update(agents)
    .set({ status: "creating", updatedAt: new Date() })
    .where(eq(agents.id, id))
    .run();

  await writeAuditEvent(id, "instance.power_on", {
    dropletId: agent.doDropletId,
  }, "user");

  return NextResponse.json({ status: "creating" });
}
