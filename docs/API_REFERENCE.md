# LaunchClaw API Reference

Complete API endpoint list for frontend-backend integration.

**Base URL:** `http://localhost:3000` (dev) or your deployed control plane URL  
**WebSocket URL:** `ws://localhost:8080` (dev) or your deployed WS server URL

---

## Authentication

All `/api/v1/agents/*` and `/api/v1/connectors/*/start` endpoints require API key authentication when `LAUNCHCLAW_API_KEY` is set.

**Headers (pick one):**
```
X-API-Key: <your-api-key>
Authorization: Bearer <your-api-key>
```

If `LAUNCHCLAW_API_KEY` is empty or unset, authentication is disabled (dev mode).

---

## 1. Agent CRUD & Lifecycle

### List Agents
```
GET /api/v1/agents
```
Returns all agents (excludes soft-deleted).

**Response:**
```json
{
  "agents": [
    {
      "id": "uuid",
      "name": "my-agent",
      "status": "online",
      "runtimeState": "running",
      "pauseReason": null,
      "region": "nyc3",
      "size": "s-2vcpu-4gb",
      "ipv4": "1.2.3.4",
      "createdAt": "2026-02-21T12:00:00.000Z",
      "updatedAt": "2026-02-21T12:00:00.000Z",
      "deletedAt": null
    }
  ]
}
```

---

### Create Agent
```
POST /api/v1/agents
```
Creates a new agent and provisions a DigitalOcean droplet.

**Request Body:**
```json
{
  "name": "my-agent",
  "region": "nyc3",
  "size": "s-2vcpu-4gb",
  "connections": ["slack", "github"]
}
```

**Response (202 Accepted):**
```json
{
  "agent_id": "uuid",
  "status": "creating"
}
```

---

### Get Agent
```
GET /api/v1/agents/:id
```
Returns a single agent with full details. Includes soft-deleted agents (with `deleted: true` flag).

**Response:**
```json
{
  "agent": {
    "id": "uuid",
    "name": "my-agent",
    "status": "online",
    "runtimeState": "running",
    "pauseReason": null,
    "doDropletId": 12345678,
    "region": "nyc3",
    "size": "s-2vcpu-4gb",
    "ipv4": "1.2.3.4",
    "lastActivityAt": "2026-02-21T12:00:00.000Z",
    "createdAt": "2026-02-21T12:00:00.000Z",
    "updatedAt": "2026-02-21T12:00:00.000Z",
    "deletedAt": null
  },
  "deleted": false
}
```

---

### Delete Agent (Close Instance)
```
DELETE /api/v1/agents/:id
```
Soft-deletes the agent and destroys the DigitalOcean droplet.

**Response:**
```json
{
  "deleted": true,
  "agent_id": "uuid"
}
```

---

## 2. Instance Power Controls

### Power On
```
POST /api/v1/agents/:id/instance/on
```
Powers on a stopped droplet.

**Response:**
```json
{
  "status": "creating"
}
```

---

### Shutdown (Turn Off)
```
POST /api/v1/agents/:id/instance/off
```
Gracefully shuts down the droplet.

**Response:**
```json
{
  "status": "offline",
  "warning": "Billing continues until the droplet is destroyed via DELETE."
}
```

---

## 3. Manual Controls (Sandboxing)

### Pause Agent
```
POST /api/v1/agents/:id/control/pause
```
Pauses the agent. Chat connections will be blocked.

**Request Body (optional):**
```json
{
  "reason": "Manual pause for maintenance"
}
```

**Response:**
```json
{
  "runtime_state": "paused",
  "reason": "Manual pause for maintenance"
}
```

---

### Resume Agent
```
POST /api/v1/agents/:id/control/resume
```
Resumes a paused agent. Fails if budget is exceeded.

**Response:**
```json
{
  "runtime_state": "running"
}
```

**Error (409 Conflict):**
```json
{
  "error": "Cannot resume — budget is exceeded. Reset the budget first."
}
```

---

### Stop OpenClaw Service
```
POST /api/v1/agents/:id/control/stop
```
Stops the OpenClaw service on the droplet (via agentd).

**Response:**
```json
{
  "runtime_state": "stopped"
}
```

---

### Restart OpenClaw Service
```
POST /api/v1/agents/:id/control/restart
```
Restarts the OpenClaw service. Optionally wipes workspace.

**Request Body (optional):**
```json
{
  "fresh_state": true
}
```

**Response:**
```json
{
  "runtime_state": "running",
  "fresh_state": true
}
```

---

## 4. Chat

### Create Chat Session
```
POST /api/v1/agents/:id/chat/sessions
```
Creates a new chat session for the agent.

**Response (201 Created):**
```json
{
  "session_id": "sess_uuid"
}
```

---

### Chat WebSocket
```
WS ws://host:8080/ws/chat?agent_id=<id>&session_id=<session_id>
```

**Outbound Messages (server → client):**
```json
{"type": "assistant_delta", "text": "Hello..."}
{"type": "assistant_done"}
{"type": "error", "message": "Agent not reachable"}
{"type": "paused", "reason": "Budget exceeded"}
{"type": "stopped"}
```

**Inbound Messages (client → server):**
```json
{"type": "user_message", "text": "Hello, agent!"}
```

**Close Codes:**
- `4001` - Missing agent_id or session_id
- `4003` - Agent is paused or stopped
- `4004` - Session not found
- `4009` - Agent not reachable

---

## 5. Token Usage & Budget

### Get Token Usage
```
GET /api/v1/agents/:id/tokens?session_id=<optional>
```

**Response:**
```json
{
  "lifetime": {
    "input": 1000,
    "output": 2000,
    "total": 3000
  },
  "session": {
    "input": 100,
    "output": 200,
    "total": 300
  },
  "budget": {
    "limit": 5000,
    "remaining": 2000,
    "status": "ok"
  }
}
```

Budget status values: `"ok"`, `"exceeded"`, `"disabled"`

---

### Get Budget
```
GET /api/v1/agents/:id/budget
```

**Response:**
```json
{
  "agent_id": "uuid",
  "token_limit_total": 5000,
  "cost_limit_usd": 1.50,
  "action_on_exceed": "pause_only",
  "enabled": true,
  "exceeded_at": null,
  "usage": {
    "total_tokens": 3000,
    "total_input_tokens": 1000,
    "total_output_tokens": 2000,
    "estimated_cost_usd": 0.007
  }
}
```

---

### Update Budget
```
PUT /api/v1/agents/:id/budget
```

**Request Body:**
```json
{
  "enabled": true,
  "token_limit_total": 5000,
  "cost_limit_usd": 1.50,
  "action_on_exceed": "pause_only"
}
```

`action_on_exceed` values: `"pause_only"`, `"shutdown_instance"`, `"power_off_instance"`

---

## 6. Scheduling & Calendar

### Get Schedule
```
GET /api/v1/agents/:id/schedule
```

**Response:**
```json
{
  "id": "uuid",
  "agent_id": "uuid",
  "mode": "both",
  "timezone": "America/Chicago",
  "weekdays": [1, 2, 3, 4, 5],
  "start_time": "09:00",
  "end_time": "17:00",
  "idle_minutes": 20,
  "idle_action": "pause_only",
  "enabled": true
}
```

---

### Update Schedule
```
PUT /api/v1/agents/:id/schedule
```

**Request Body:**
```json
{
  "mode": "both",
  "timezone": "America/Chicago",
  "weekdays": [1, 2, 3, 4, 5],
  "start_time": "09:00",
  "end_time": "17:00",
  "idle_minutes": 20,
  "idle_action": "shutdown_instance",
  "enabled": true
}
```

`mode` values: `"time_window"`, `"idle_rule"`, `"both"`  
`idle_action` values: `"pause_only"`, `"shutdown_instance"`

---

### Get Calendar Events
```
GET /api/v1/agents/:id/calendar?days=14
```

**Response:**
```json
{
  "events": [
    {
      "id": "uuid",
      "ts": "2026-02-22T14:00:00.000Z",
      "action": "power_on",
      "source": "time_window",
      "executed": false
    },
    {
      "id": "uuid",
      "ts": "2026-02-22T22:00:00.000Z",
      "action": "shutdown",
      "source": "time_window",
      "executed": false
    }
  ]
}
```

---

## 7. Audit Log

### Get Audit Events
```
GET /api/v1/agents/:id/audit?limit=50&cursor=<iso_timestamp>
```

**Response:**
```json
{
  "events": [
    {
      "id": "uuid",
      "agentId": "uuid",
      "actor": "user",
      "type": "control.pause",
      "payload": "{\"reason\":\"Manual pause\"}",
      "createdAt": "2026-02-21T12:00:00.000Z"
    }
  ],
  "next_cursor": "2026-02-21T11:00:00.000Z"
}
```

**Actor values:** `"user"`, `"system"`, `"agent"`

**Event types:**
- Instance: `instance.creating`, `instance.online`, `instance.boot_complete`, `instance.shutdown`, `instance.power_on`, `instance.power_off`, `instance.error`, `instance.deleting`, `instance.deleted`
- Control: `control.pause`, `control.resume`, `control.stop`, `control.restart`
- Chat: `chat.session_created`, `chat.user_message`, `chat.assistant_response`, `chat.stream_error`
- Tunnel: `tunnel.connected`, `tunnel.disconnected`
- LLM: `llm.completion`
- Connectors: `connector.requested`, `connector.connected`, `connector.revoked`
- Tools: `tool.invoked`, `tool.succeeded`, `tool.failed`
- Scheduler: `scheduler.window_on`, `scheduler.window_off`, `scheduler.idle_triggered`
- Budget: `budget.exceeded`, `budget.paused_agent`, `budget.shutdown_instance`, `budget.reset`
- Alerts: `alert.test`

---

## 8. Connectors (OAuth)

### List Connectors
```
GET /api/v1/agents/:id/connectors
```

**Response:**
```json
{
  "connectors": [
    {
      "id": "uuid",
      "provider": "slack",
      "status": "connected",
      "scopes": "[\"chat:write\"]",
      "createdAt": "2026-02-21T12:00:00.000Z"
    }
  ]
}
```

---

### Start OAuth Flow
```
POST /api/v1/connectors/:provider/start
```

**Request Body:**
```json
{
  "agent_id": "uuid",
  "redirect_url": "https://your-app.com/settings"
}
```

**Response:**
```json
{
  "auth_url": "https://slack.com/oauth/v2/authorize?..."
}
```

Redirect the user's browser to `auth_url`.

---

### OAuth Callback
```
GET /api/v1/connectors/:provider/callback?code=X&state=Y
```
Browser redirect endpoint. Redirects back to `redirect_url` with `?connected=<provider>`.

---

### Revoke Connector
```
DELETE /api/v1/agents/:id/connectors/:provider
```

**Response:**
```json
{
  "revoked": true,
  "provider": "slack"
}
```

---

## 9. Alerts / Misc

### Fire Test Alert
```
POST /api/v1/agents/:id/alerts/test
```

**Response:**
```json
{
  "ok": true,
  "message": "Test alert fired"
}
```

---

### Heartbeat (Internal)
```
POST /api/v1/agents/:id/heartbeat
Authorization: Bearer <boot_token>
```
Called by cloud-init on droplet boot. Not called by frontend.

---

## 10. Security

### Security Scan
```
GET /api/security/scan
```

### Security Metrics
```
GET /api/security/metrics
```

---

## 11. Machine-to-Machine (Internal Only)

These endpoints are called by OpenClaw/agentd, not by the frontend.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/v1/llm/:agentId/chat/completions` | LLM proxy (OpenAI-compatible) |
| `POST` | `/api/v1/tools/slack.postMessage` | Slack tool |
| `POST` | `/api/v1/tools/github.createIssue` | GitHub tool |
| `POST` | `/api/v1/tools/gmail.send` | Gmail tool (stubbed) |
| `POST` | `/api/v1/tools/gcal.createEvent` | Google Calendar tool (stubbed) |
| `POST` | `/api/v1/tools/twitter.post` | Twitter tool (stubbed) |
| `WS` | `ws://host:8080/ws/tunnel?agent_id=X&device_token=Y` | Agent tunnel |

---

## Summary

| Category | Endpoints | Frontend Needs |
|----------|-----------|----------------|
| Agent CRUD | 4 | Yes |
| Instance Power | 2 | Yes |
| Manual Controls | 4 | Yes |
| Chat | 1 HTTP + 1 WS | Yes |
| Token/Budget | 3 | Yes |
| Scheduling | 3 | Yes |
| Audit | 1 | Yes |
| Connectors | 4 | Yes |
| Alerts/Misc | 2 | Partial (1) |
| Security | 2 | Yes |
| Machine-to-Machine | 6 HTTP + 1 WS | No |

**Total: 28 HTTP + 2 WebSocket endpoints**  
**Frontend integration required: 22 endpoints**
