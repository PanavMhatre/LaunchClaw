import type { IncomingMessage } from "http";
import type { WebSocket } from "ws";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { agents, chatSessions } from "../lib/db/schema";
import { writeAuditEvent } from "../lib/audit";
import { tunnelSockets, chatSockets } from "./tunnel-map";

export function handleChatConnection(ws: WebSocket, req: IncomingMessage) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "0.0.0.0"}`);
  const agentId = url.searchParams.get("agent_id");
  const sessionId = url.searchParams.get("session_id");

  if (!agentId || !sessionId) {
    ws.close(4001, "Missing agent_id or session_id");
    return;
  }

  const session = db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .get();

  if (!session || session.agentId !== agentId) {
    ws.close(4004, "Session not found for this agent");
    return;
  }

  const agent = db.select().from(agents).where(eq(agents.id, agentId)).get();

  if (agent?.runtimeState === "paused") {
    ws.send(JSON.stringify({ type: "paused", reason: agent.pauseReason }));
    ws.close(4003, "Agent is paused");
    return;
  }
  if (agent?.runtimeState === "stopped") {
    ws.send(JSON.stringify({ type: "stopped" }));
    ws.close(4003, "Agent is stopped");
    return;
  }

  const tunnel = tunnelSockets.get(agentId);
  if (!tunnel || tunnel.readyState !== 1) {
    ws.close(4009, "Agent is not reachable");
    return;
  }

  let viewers = chatSockets.get(agentId);
  if (!viewers) {
    viewers = new Set();
    chatSockets.set(agentId, viewers);
  }
  viewers.add(ws);

  db.update(agents)
    .set({ activeSessionId: sessionId, updatedAt: new Date() })
    .where(eq(agents.id, agentId))
    .run();

  console.log(`[chat] viewer joined agent ${agentId} session ${sessionId}`);

  ws.on("message", (raw) => {
    let msg: { type: string; text?: string };
    try {
      msg = JSON.parse(typeof raw === "string" ? raw : raw.toString("utf-8"));
    } catch {
      return;
    }

    if (msg.type !== "user_message" || typeof msg.text !== "string") return;

    const currentAgent = db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .get();

    if (currentAgent?.runtimeState === "paused") {
      ws.send(JSON.stringify({ type: "paused", reason: currentAgent.pauseReason }));
      return;
    }
    if (currentAgent?.runtimeState === "stopped") {
      ws.send(JSON.stringify({ type: "stopped" }));
      return;
    }

    db.update(agents)
      .set({ lastActivityAt: new Date(), updatedAt: new Date() })
      .where(eq(agents.id, agentId))
      .run();

    const currentTunnel = tunnelSockets.get(agentId);
    if (!currentTunnel || currentTunnel.readyState !== 1) {
      ws.send(JSON.stringify({ type: "error", message: "Agent not reachable" }));
      return;
    }

    const tunnelPayload = JSON.stringify({
      type: "chat.message",
      session_id: sessionId,
      text: msg.text,
    });
    currentTunnel.send(tunnelPayload);

    writeAuditEvent(agentId, "chat.user_message", {
      sessionId,
      textLength: msg.text.length,
    }, "user");
  });

  ws.on("close", () => {
    viewers?.delete(ws);
    if (viewers && viewers.size === 0) {
      chatSockets.delete(agentId);
      db.update(agents)
        .set({ activeSessionId: null, updatedAt: new Date() })
        .where(eq(agents.id, agentId))
        .run();
    }
    console.log(`[chat] viewer left agent ${agentId} session ${sessionId}`);
  });

  ws.on("error", (err) => {
    console.error(`[chat] agent ${agentId} viewer ws error:`, err.message);
  });
}
