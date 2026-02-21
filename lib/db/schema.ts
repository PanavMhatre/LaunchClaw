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
    enum: ["creating", "online", "offline", "error", "deleting"],
  }).notNull(),
  bootToken: text("boot_token"),
  deviceToken: text("device_token"),
  gatewayToken: text("gateway_token"),
  activeSessionId: text("active_session_id"),
  errorPayload: text("error_payload"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  agentId: text("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
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
