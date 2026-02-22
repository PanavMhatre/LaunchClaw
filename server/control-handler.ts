import type { IncomingMessage, ServerResponse } from "http";
import { tunnelSockets } from "./tunnel-map";

interface ControlRequest {
  agent_id: string;
  command: "control.pause" | "control.resume" | "control.stop" | "control.restart";
  fresh_state?: boolean;
}

export function handleControlRequest(
  req: IncomingMessage,
  res: ServerResponse,
): void {
  let body = "";
  req.on("data", (chunk: Buffer) => {
    body += chunk.toString();
  });

  req.on("end", () => {
    try {
      const data = JSON.parse(body) as ControlRequest;

      if (!data.agent_id || !data.command) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing agent_id or command" }));
        return;
      }

      const tunnel = tunnelSockets.get(data.agent_id);
      if (!tunnel || tunnel.readyState !== 1) {
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Agent tunnel not connected" }));
        return;
      }

      const payload: Record<string, unknown> = { type: data.command };
      if (data.fresh_state !== undefined) {
        payload.fresh_state = data.fresh_state;
      }

      tunnel.send(JSON.stringify(payload));

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, command: data.command }));
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
    }
  });
}
