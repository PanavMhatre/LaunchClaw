#!/usr/bin/env node
"use strict";

/**
 * LaunchClaw agentd — lightweight sidecar that runs on each OpenClaw droplet.
 *
 * Bridges the LaunchClaw control-plane tunnel with the local OpenClaw gateway.
 * Zero npm dependencies — uses Node 22+ built-in WebSocket.
 *
 * Required env:
 *   AGENT_ID, DEVICE_TOKEN, GATEWAY_TOKEN, TUNNEL_URL
 *
 * Optional env:
 *   GATEWAY_HOST  (default 127.0.0.1)
 *   GATEWAY_PORT  (default 18789)
 */

const AGENT_ID = process.env.AGENT_ID;
const DEVICE_TOKEN = process.env.DEVICE_TOKEN;
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN;
const TUNNEL_URL = process.env.TUNNEL_URL;
const GATEWAY_HOST = process.env.GATEWAY_HOST || "127.0.0.1";
const GATEWAY_PORT = process.env.GATEWAY_PORT || "18789";

if (!AGENT_ID || !DEVICE_TOKEN || !GATEWAY_TOKEN || !TUNNEL_URL) {
  console.error("[agentd] Missing required env vars: AGENT_ID, DEVICE_TOKEN, GATEWAY_TOKEN, TUNNEL_URL");
  process.exit(1);
}

const HEARTBEAT_INTERVAL_MS = 30_000;
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

let tunnelWs = null;
let gatewayWs = null;
let reconnectDelay = RECONNECT_BASE_MS;
let heartbeatTimer = null;

// -------------------------------------------------------------------------
// Tunnel connection (outbound to control plane)
// -------------------------------------------------------------------------

function connectTunnel() {
  const url = `${TUNNEL_URL}?agent_id=${AGENT_ID}&device_token=${DEVICE_TOKEN}`;
  console.log(`[agentd] connecting tunnel -> ${TUNNEL_URL}`);

  tunnelWs = new WebSocket(url);

  tunnelWs.addEventListener("open", () => {
    console.log("[agentd] tunnel connected");
    reconnectDelay = RECONNECT_BASE_MS;

    tunnelWs.send(JSON.stringify({ type: "status", state: "ready" }));

    clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(() => {
      if (tunnelWs && tunnelWs.readyState === WebSocket.OPEN) {
        tunnelWs.send(JSON.stringify({ type: "heartbeat" }));
      }
    }, HEARTBEAT_INTERVAL_MS);
  });

  tunnelWs.addEventListener("message", (event) => {
    let msg;
    try {
      msg = JSON.parse(typeof event.data === "string" ? event.data : event.data.toString());
    } catch {
      return;
    }

    if (msg.type === "chat.message") {
      forwardToGateway(msg);
    }
  });

  tunnelWs.addEventListener("close", (event) => {
    console.log(`[agentd] tunnel closed: ${event.code} ${event.reason}`);
    clearInterval(heartbeatTimer);
    scheduleTunnelReconnect();
  });

  tunnelWs.addEventListener("error", (event) => {
    console.error("[agentd] tunnel error:", event.message || "unknown");
  });
}

function scheduleTunnelReconnect() {
  const jitter = Math.random() * 500;
  const delay = Math.min(reconnectDelay + jitter, RECONNECT_MAX_MS);
  console.log(`[agentd] reconnecting tunnel in ${Math.round(delay)}ms`);
  setTimeout(connectTunnel, delay);
  reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS);
}

// -------------------------------------------------------------------------
// OpenClaw gateway connection (local on the droplet)
// -------------------------------------------------------------------------

let gatewayReady = false;

function connectGateway() {
  const url = `ws://${GATEWAY_HOST}:${GATEWAY_PORT}?token=${GATEWAY_TOKEN}`;
  console.log(`[agentd] connecting gateway -> ws://${GATEWAY_HOST}:${GATEWAY_PORT}`);

  gatewayWs = new WebSocket(url);

  gatewayWs.addEventListener("open", () => {
    console.log("[agentd] gateway connected");
    gatewayReady = true;
  });

  gatewayWs.addEventListener("message", (event) => {
    let msg;
    try {
      msg = JSON.parse(typeof event.data === "string" ? event.data : event.data.toString());
    } catch {
      return;
    }

    // Forward assistant responses back through the tunnel.
    // OpenClaw gateway may send various message types; we look for content
    // that represents assistant output and translate to our wire format.
    if (msg.type === "assistant" || msg.type === "content" || msg.role === "assistant") {
      const deltaText = msg.text || msg.content || msg.delta?.content || "";
      const done = msg.done === true || msg.finish_reason != null;

      if (deltaText && tunnelWs && tunnelWs.readyState === WebSocket.OPEN) {
        tunnelWs.send(JSON.stringify({
          type: "chat.delta",
          session_id: msg.session_id || currentSessionId,
          text: deltaText,
        }));
      }

      if (done && tunnelWs && tunnelWs.readyState === WebSocket.OPEN) {
        tunnelWs.send(JSON.stringify({
          type: "chat.done",
          session_id: msg.session_id || currentSessionId,
        }));
      }
    }
  });

  gatewayWs.addEventListener("close", () => {
    console.log("[agentd] gateway closed, reconnecting in 3s");
    gatewayReady = false;
    setTimeout(connectGateway, 3000);
  });

  gatewayWs.addEventListener("error", (event) => {
    console.error("[agentd] gateway error:", event.message || "unknown");
  });
}

// -------------------------------------------------------------------------
// Bridge: tunnel -> gateway
// -------------------------------------------------------------------------

let currentSessionId = null;

function forwardToGateway(msg) {
  currentSessionId = msg.session_id || null;

  if (!gatewayWs || gatewayWs.readyState !== WebSocket.OPEN) {
    // Tell the tunnel the gateway isn't available
    if (tunnelWs && tunnelWs.readyState === WebSocket.OPEN) {
      tunnelWs.send(JSON.stringify({
        type: "status",
        state: "gateway_unavailable",
      }));
    }
    return;
  }

  // Forward as an OpenClaw chat RPC. The exact shape depends on the
  // OpenClaw protocol version; this covers the common pattern.
  gatewayWs.send(JSON.stringify({
    type: "chat.send",
    session_id: msg.session_id,
    message: { role: "user", content: msg.text },
  }));
}

// -------------------------------------------------------------------------
// Boot
// -------------------------------------------------------------------------

console.log(`[agentd] starting — agent=${AGENT_ID}`);
connectGateway();
connectTunnel();

process.on("SIGTERM", () => {
  console.log("[agentd] SIGTERM received, shutting down");
  clearInterval(heartbeatTimer);
  if (tunnelWs) tunnelWs.close(1000, "shutdown");
  if (gatewayWs) gatewayWs.close(1000, "shutdown");
  process.exit(0);
});
