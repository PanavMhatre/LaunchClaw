import { z } from "zod";
import type { InferSelectModel } from "drizzle-orm";
import type {
  agents,
  auditEvents,
  budgets,
  chatSessions,
  connectors,
  oauthStates,
  scheduleEvents,
  schedules,
  tokenUsageSessions,
  tokenUsageTotals,
} from "./db/schema";

// ---------------------------------------------------------------------------
// DB row types
// ---------------------------------------------------------------------------

export type Agent = InferSelectModel<typeof agents>;
export type AuditEvent = InferSelectModel<typeof auditEvents>;
export type ChatSession = InferSelectModel<typeof chatSessions>;
export type TokenUsageSession = InferSelectModel<typeof tokenUsageSessions>;
export type TokenUsageTotal = InferSelectModel<typeof tokenUsageTotals>;

export type AgentStatus = Agent["status"];
export type AgentRuntimeState = Agent["runtimeState"];

export type Schedule = InferSelectModel<typeof schedules>;
export type ScheduleEvent = InferSelectModel<typeof scheduleEvents>;
export type Budget = InferSelectModel<typeof budgets>;

export type Connector = InferSelectModel<typeof connectors>;
export type OAuthState = InferSelectModel<typeof oauthStates>;
export type ConnectorProvider = "slack" | "google" | "github" | "twitter";
export type ConnectorStatus = "pending" | "connected" | "revoked" | "error";

// ---------------------------------------------------------------------------
// Tunnel wire protocol (WS server <-> agentd)
// ---------------------------------------------------------------------------

export interface TunnelChatMessage {
  type: "chat.message";
  session_id: string;
  text: string;
}

export interface TunnelChatDelta {
  type: "chat.delta";
  session_id: string;
  text: string;
}

export interface TunnelChatDone {
  type: "chat.done";
  session_id: string;
}

export interface TunnelStatus {
  type: "status";
  state: string;
}

export interface TunnelControlCommand {
  type:
    | "control.pause"
    | "control.resume"
    | "control.stop"
    | "control.restart";
  fresh_state?: boolean;
}

export interface TunnelControlAck {
  type: "control.ack";
  command: string;
  success: boolean;
}

export type TunnelMessage =
  | TunnelChatMessage
  | TunnelChatDelta
  | TunnelChatDone
  | TunnelStatus
  | TunnelControlAck;

// ---------------------------------------------------------------------------
// Frontend chat wire protocol (WS server <-> browser)
// ---------------------------------------------------------------------------

export interface ChatUserMessage {
  type: "user_message";
  text: string;
}

export interface ChatAssistantDelta {
  type: "assistant_delta";
  text: string;
}

export interface ChatAssistantDone {
  type: "assistant_done";
}

export interface ChatError {
  type: "error";
  message: string;
}

export interface ChatPaused {
  type: "paused";
  reason?: string;
}

export interface ChatStopped {
  type: "stopped";
}

export type ChatOutboundMessage =
  | ChatAssistantDelta
  | ChatAssistantDone
  | ChatError
  | ChatPaused
  | ChatStopped;

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

export const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  region: z.string().default("nyc3"),
  size: z.string().default("s-2vcpu-4gb"),
  connections: z.array(z.string()).default([]),
});

export type CreateAgentRequest = z.infer<typeof createAgentSchema>;

// ---------------------------------------------------------------------------
// Connector request validation
// ---------------------------------------------------------------------------

export const connectorProviderSchema = z.enum([
  "slack",
  "google",
  "github",
  "twitter",
]);

export const oauthStartSchema = z.object({
  agent_id: z.string().uuid(),
  redirect_url: z.string().url(),
});

export type OAuthStartRequest = z.infer<typeof oauthStartSchema>;

// ---------------------------------------------------------------------------
// Tool request schemas
// ---------------------------------------------------------------------------

export const slackPostMessageSchema = z.object({
  agent_id: z.string().uuid(),
  channel: z.string().min(1),
  text: z.string().min(1),
});

export const githubCreateIssueSchema = z.object({
  agent_id: z.string().uuid(),
  owner: z.string().min(1),
  repo: z.string().min(1),
  title: z.string().min(1),
  body: z.string().optional(),
});

export const gmailSendSchema = z.object({
  agent_id: z.string().uuid(),
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
});

export const gcalCreateEventSchema = z.object({
  agent_id: z.string().uuid(),
  summary: z.string().min(1),
  start: z.string(),
  end: z.string(),
});

export const twitterPostSchema = z.object({
  agent_id: z.string().uuid(),
  text: z.string().min(1).max(280),
});

// ---------------------------------------------------------------------------
// Schedule + Budget request validation
// ---------------------------------------------------------------------------

export const scheduleSchema = z
  .object({
    mode: z.enum(["time_window", "idle_rule", "both"]),
    timezone: z.string().default("America/Chicago"),
    weekdays: z.array(z.number().int().min(0).max(6)).optional(),
    start_time: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    end_time: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    idle_minutes: z.number().int().min(1).optional(),
    idle_action: z
      .enum(["pause_only", "shutdown_instance"])
      .default("pause_only"),
    enabled: z.boolean().default(true),
  })
  .refine(
    (d) => {
      if (d.mode === "time_window" || d.mode === "both") {
        return (
          d.weekdays !== undefined &&
          d.weekdays.length > 0 &&
          d.start_time !== undefined &&
          d.end_time !== undefined
        );
      }
      return true;
    },
    {
      message:
        "time_window/both modes require weekdays, start_time, and end_time",
    },
  )
  .refine(
    (d) => {
      if (d.mode === "idle_rule" || d.mode === "both") {
        return d.idle_minutes !== undefined;
      }
      return true;
    },
    { message: "idle_rule/both modes require idle_minutes" },
  );

export type ScheduleRequest = z.infer<typeof scheduleSchema>;

export const budgetSchema = z.object({
  enabled: z.boolean().default(true),
  token_limit_total: z.number().int().min(1).nullable().optional(),
  cost_limit_usd: z.number().min(0).nullable().optional(),
  action_on_exceed: z
    .enum(["pause_only", "shutdown_instance", "power_off_instance"])
    .default("pause_only"),
});

export type BudgetRequest = z.infer<typeof budgetSchema>;

// ---------------------------------------------------------------------------
// DigitalOcean API response types
// ---------------------------------------------------------------------------

export interface DoNetwork {
  ip_address: string;
  netmask: string;
  gateway: string;
  type: "public" | "private";
}

export interface DoDroplet {
  id: number;
  name: string;
  status: "new" | "active" | "off" | "archive";
  memory: number;
  vcpus: number;
  disk: number;
  region: { slug: string; name: string };
  image: { id: number; slug: string; name: string };
  size_slug: string;
  networks: {
    v4: DoNetwork[];
    v6: DoNetwork[];
  };
  tags: string[];
  created_at: string;
}

export interface DoAction {
  id: number;
  status: "in-progress" | "completed" | "errored";
  type: string;
  started_at: string;
  completed_at: string | null;
  resource_id: number;
  resource_type: string;
}

export interface DoCreateDropletResponse {
  droplet: DoDroplet;
  links: {
    actions: { id: number; rel: string; href: string }[];
  };
}

export interface DoDropletResponse {
  droplet: DoDroplet;
}

export interface DoActionResponse {
  action: DoAction;
}

export interface DoErrorResponse {
  id: string;
  message: string;
}
