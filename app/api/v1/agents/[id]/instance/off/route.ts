import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { shutdownDroplet, DoApiError } from "@/lib/do-client";
import { writeAuditEvent } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

type RouteCtx = { params: Promise<{ id: string }> };

// POST /api/v1/agents/:id/instance/off — Graceful shutdown
export async function POST(req: NextRequest, ctx: RouteCtx) {
  const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
  if (!rateLimit(`instance-off:${ip}`, 10_000)) {
    return NextResponse.json(
      { error: "Rate limited — wait 10 seconds between shutdown requests" },
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

  if (agent.status === "offline") {
    return NextResponse.json(
      { error: "Agent is already offline" },
      { status: 409 },
    );
  }

  try {
    await shutdownDroplet(agent.doDropletId);
  } catch (err) {
    if (err instanceof DoApiError) {
      return NextResponse.json(
        { error: `Shutdown failed: ${err.message}` },
        { status: 502 },
      );
    }
    throw err;
  }

  db.update(agents)
    .set({ status: "offline", updatedAt: new Date() })
    .where(eq(agents.id, id))
    .run();

  await writeAuditEvent(id, "instance.shutdown", {
    dropletId: agent.doDropletId,
    note: "Billing continues until the droplet is destroyed.",
  }, "user");

  return NextResponse.json({
    status: "offline",
    warning: "Billing continues until the droplet is destroyed via DELETE.",
  });
}
