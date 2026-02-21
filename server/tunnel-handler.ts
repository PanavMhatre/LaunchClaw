import type { IncomingMessage } from "http";
import type { WebSocket } from "ws";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { agents } from "../lib/db/schema";
import { writeAuditEvent } from "../lib/audit";
import { tunnelSockets, chatSockets } from "./tunnel-map";

export function handleTunnelConnection(ws: WebSocket, req: IncomingMessage) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const agentId = url.searchParams.get("agent_id");
  const deviceToken = url.searchParams.get("device_token");

  if (!agentId || !deviceToken) {
    ws.close(4001, "Missing agent_id or device_token");
    return;
  }

  const agent = db.select().from(agents).where(eq(agents.id, agentId)).get();

  if (!agent) {
    ws.close(4004, "Agent not found");
    return;
  }

  if (agent.deviceToken !== deviceToken) {
    ws.close(4003, "Invalid device token");
    return;
  }

  if (agent.status === "deleting" || agent.status === "error") {
    ws.close(4009, `Agent is ${agent.status}`);
    return;
  }

  // Close any stale tunnel for the same agent
  const existing = tunnelSockets.get(agentId);
  if (existing && existing.readyState <= 1) {
    existing.close(4010, "Replaced by new tunnel connection");
  }

  tunnelSockets.set(agentId, ws);

  db.update(agents)
    .set({ status: "online", updatedAt: new Date() })
    .where(eq(agents.id, agentId))
    .run();

  writeAuditEvent(agentId, "tunnel.connected");
  console.log(`[tunnel] agent ${agentId} connected`);

  ws.on("message", (raw) => {
    let msg: { type: string; session_id?: string; text?: string; state?: string };
    try {
      msg = JSON.parse(typeof raw === "string" ? raw : raw.toString("utf-8"));
    } catch {
      return;
    }

    if (msg.type === "chat.delta" || msg.type === "chat.done") {
      const viewers = chatSockets.get(agentId);
      if (!viewers) return;

      const outType = msg.type === "chat.delta" ? "assistant_delta" : "assistant_done";
      const payload: Record<string, string> = { type: outType };
      if (msg.text !== undefined) payload.text = msg.text;

      const serialized = JSON.stringify(payload);
      for (const viewer of viewers) {
        if (viewer.readyState === 1) viewer.send(serialized);
      }
    }

    if (msg.type === "status") {
      console.log(`[tunnel] agent ${agentId} status: ${msg.state}`);
    }
  });

  ws.on("close", () => {
    if (tunnelSockets.get(agentId) === ws) {
      tunnelSockets.delete(agentId);
    }

    db.update(agents)
      .set({ status: "offline", updatedAt: new Date() })
      .where(eq(agents.id, agentId))
      .run();

    writeAuditEvent(agentId, "tunnel.disconnected");
    console.log(`[tunnel] agent ${agentId} disconnected`);

    // Notify any chat viewers that the agent is gone
    const viewers = chatSockets.get(agentId);
    if (viewers) {
      const err = JSON.stringify({ type: "error", message: "Agent disconnected" });
      for (const v of viewers) {
        if (v.readyState === 1) v.send(err);
      }
    }
  });

  ws.on("error", (err) => {
    console.error(`[tunnel] agent ${agentId} ws error:`, err.message);
  });
}
