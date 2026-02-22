import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const agents = sqliteTable("agents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  doDropletId: integer("do_droplet_id").unique(),
  doActionId: integer("do_action_id"),
  region: text("region").notNull().default("nyc3"),
  size: text("size").notNull().default("s-2vcpu-4gb"),
  ipv4: text("ipv4"),
  status: text("status", {
    enum: ["creating", "online", "offline", "error", "deleting", "paused"],
  }).notNull(),
  runtimeState: text("runtime_state", {
    enum: ["running", "paused", "stopped"],
  })
    .notNull()
    .default("running"),
  pauseReason: text("pause_reason"),
  lastActivityAt: integer("last_activity_at", { mode: "timestamp" }),
  bootToken: text("boot_token"),
  deviceToken: text("device_token"),
  gatewayToken: text("gateway_token"),
  activeSessionId: text("active_session_id"),
  errorPayload: text("error_payload"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  agentId: text("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  actor: text("actor", {
    enum: ["user", "system", "agent"],
  })
    .notNull()
    .default("system"),
  type: text("type").notNull(),
  payload: text("payload"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const chatSessions = sqliteTable("chat_sessions", {
  id: text("id").primaryKey(),
  agentId: text("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  endedAt: integer("ended_at", { mode: "timestamp" }),
});

export const tokenUsageSessions = sqliteTable("token_usage_sessions", {
  id: text("id").primaryKey(),
  agentId: text("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  sessionId: text("session_id"),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const tokenUsageTotals = sqliteTable("token_usage_totals", {
  agentId: text("agent_id")
    .primaryKey()
    .references(() => agents.id, { onDelete: "cascade" }),
  totalInputTokens: integer("total_input_tokens").notNull().default(0),
  totalOutputTokens: integer("total_output_tokens").notNull().default(0),
});

export const connectors = sqliteTable("connectors", {
  id: text("id").primaryKey(),
  agentId: text("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  provider: text("provider", {
    enum: ["slack", "google", "github"],
  }).notNull(),
  status: text("status", {
    enum: ["pending", "connected", "revoked", "error"],
  }).notNull(),
  scopes: text("scopes"),
  accessTokenEncrypted: text("access_token_encrypted"),
  refreshTokenEncrypted: text("refresh_token_encrypted"),
  expiresAt: integer("expires_at"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const oauthStates = sqliteTable("oauth_states", {
  state: text("state").primaryKey(),
  agentId: text("agent_id").notNull(),
  provider: text("provider").notNull(),
  redirectUrl: text("redirect_url").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const schedules = sqliteTable("schedules", {
  id: text("id").primaryKey(),
  agentId: text("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" })
    .unique(),
  mode: text("mode", {
    enum: ["time_window", "idle_rule", "both"],
  }).notNull(),
  timezone: text("timezone").notNull().default("America/Chicago"),
  weekdays: text("weekdays"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  idleMinutes: integer("idle_minutes"),
  idleAction: text("idle_action", {
    enum: ["pause_only", "shutdown_instance"],
  })
    .notNull()
    .default("pause_only"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const scheduleEvents = sqliteTable("schedule_events", {
  id: text("id").primaryKey(),
  agentId: text("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  ts: integer("ts", { mode: "timestamp" }).notNull(),
  action: text("action", { enum: ["power_on", "shutdown"] }).notNull(),
  source: text("source", {
    enum: ["time_window", "idle_rule", "budget"],
  }).notNull(),
  executed: integer("executed", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const budgets = sqliteTable("budgets", {
  agentId: text("agent_id")
    .primaryKey()
    .references(() => agents.id, { onDelete: "cascade" }),
  tokenLimitTotal: integer("token_limit_total"),
  costLimitUsd: text("cost_limit_usd"),
  actionOnExceed: text("action_on_exceed", {
    enum: ["pause_only", "shutdown_instance", "power_off_instance"],
  })
    .notNull()
    .default("pause_only"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  exceededAt: integer("exceeded_at", { mode: "timestamp" }),
});
