import { z } from "zod";
import type { InferSelectModel } from "drizzle-orm";
import type {
  agents,
  auditEvents,
  chatSessions,
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

export type TunnelMessage =
  | TunnelChatMessage
  | TunnelChatDelta
  | TunnelChatDone
  | TunnelStatus;

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

export type ChatOutboundMessage =
  | ChatAssistantDelta
  | ChatAssistantDone
  | ChatError;

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
