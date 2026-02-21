import { createServer } from "http";
import { WebSocketServer } from "ws";
import { handleTunnelConnection } from "./tunnel-handler";
import { handleChatConnection } from "./chat-handler";

const PORT = Number(process.env.WS_PORT) || 8080;

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("LaunchClaw WS Server");
});

const wss = new WebSocketServer({ noServer: true });

httpServer.on("upgrade", (req, socket, head) => {
  const pathname = new URL(
    req.url ?? "/",
    `http://${req.headers.host ?? "localhost"}`,
  ).pathname;

  if (pathname === "/ws/tunnel") {
    wss.handleUpgrade(req, socket, head, (ws) => handleTunnelConnection(ws, req));
    return;
  }

  if (pathname === "/ws/chat") {
    wss.handleUpgrade(req, socket, head, (ws) => handleChatConnection(ws, req));
    return;
  }

  socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
  socket.destroy();
});

httpServer.listen(PORT, () => {
  console.log(`[ws-server] listening on port ${PORT}`);
});
