import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import {
  getDroplet,
  deleteDroplet,
  DoApiError,
} from "@/lib/do-client";
import { writeAuditEvent } from "@/lib/audit";

type RouteCtx = { params: Promise<{ id: string }> };

// GET /api/v1/agents/:id — Get agent with lazy status reconciliation
export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;

  const agent = db.select().from(agents).where(eq(agents.id, id)).get();
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  if (
    (agent.status === "creating" || agent.status === "offline") &&
    agent.doDropletId
  ) {
    try {
      const { droplet } = await getDroplet(agent.doDropletId);
      const publicIp =
        droplet.networks.v4.find((n) => n.type === "public")?.ip_address ??
        null;

      if (droplet.status === "active") {
        db.update(agents)
          .set({
            status: "online",
            ipv4: publicIp,
            updatedAt: new Date(),
          })
          .where(eq(agents.id, id))
          .run();

        await writeAuditEvent(id, "instance.online", {
          ipv4: publicIp,
          dropletStatus: droplet.status,
        });

        return NextResponse.json({
          agent: { ...agent, status: "online", ipv4: publicIp },
        });
      }

      if (droplet.status === "off" && agent.status !== "offline") {
        db.update(agents)
          .set({ status: "offline", updatedAt: new Date() })
          .where(eq(agents.id, id))
          .run();

        return NextResponse.json({
          agent: { ...agent, status: "offline" },
        });
      }
    } catch (err) {
      if (err instanceof DoApiError && err.status === 404) {
        db.update(agents)
          .set({
            status: "error",
            errorPayload: "Droplet not found on DigitalOcean",
            updatedAt: new Date(),
          })
          .where(eq(agents.id, id))
          .run();

        await writeAuditEvent(id, "instance.error", {
          reason: "droplet_not_found",
        });

        return NextResponse.json({
          agent: {
            ...agent,
            status: "error",
            errorPayload: "Droplet not found on DigitalOcean",
          },
        });
      }
      // For transient DO API errors, return the stale DB row rather than failing
    }
  }

  return NextResponse.json({ agent });
}

// DELETE /api/v1/agents/:id — Destroy agent and its droplet
export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;

  const agent = db.select().from(agents).where(eq(agents.id, id)).get();
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  db.update(agents)
    .set({ status: "deleting", updatedAt: new Date() })
    .where(eq(agents.id, id))
    .run();

  await writeAuditEvent(id, "instance.deleting");

  if (agent.doDropletId) {
    try {
      await deleteDroplet(agent.doDropletId);
    } catch (err) {
      if (err instanceof DoApiError && err.status !== 404) {
        db.update(agents)
          .set({
            status: "error",
            errorPayload: `Delete failed: ${err.message}`,
            updatedAt: new Date(),
          })
          .where(eq(agents.id, id))
          .run();

        return NextResponse.json(
          { error: `Failed to destroy droplet: ${err.message}` },
          { status: 502 },
        );
      }
      // 404 is fine — droplet already gone
    }
  }

  db.delete(agents).where(eq(agents.id, id)).run();
  await writeAuditEvent(id, "instance.deleted", {
    dropletId: agent.doDropletId,
  });

  return NextResponse.json({ deleted: true, agent_id: id });
}
