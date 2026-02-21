# agentd — LaunchClaw Agent Daemon

Lightweight sidecar that runs on each OpenClaw droplet. Bridges the
LaunchClaw control-plane tunnel with the local OpenClaw gateway WebSocket.

## Requirements

- Node.js 22+ (uses built-in `WebSocket`, zero npm dependencies)

## Environment Variables

| Variable        | Required | Description                                  |
| --------------- | -------- | -------------------------------------------- |
| `AGENT_ID`      | Yes      | UUID of this agent in the control plane DB   |
| `DEVICE_TOKEN`  | Yes      | Auth token for the tunnel WebSocket          |
| `GATEWAY_TOKEN` | Yes      | Token for OpenClaw gateway WS auth           |
| `TUNNEL_URL`    | Yes      | Control plane tunnel endpoint                |
| `GATEWAY_HOST`  | No       | OpenClaw gateway host (default `127.0.0.1`)  |
| `GATEWAY_PORT`  | No       | OpenClaw gateway port (default `18789`)      |

## Local Testing

```bash
AGENT_ID=test-id \
DEVICE_TOKEN=test-token \
GATEWAY_TOKEN=test-gw \
TUNNEL_URL=ws://localhost:8080/ws/tunnel \
node agentd/index.js
```
