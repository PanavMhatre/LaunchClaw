import { db } from "./db";
import { auditEvents } from "./db/schema";

export type AuditActor = "user" | "system" | "agent";

export type AuditEventType =
  // Instance lifecycle
  | "instance.creating"
  | "instance.online"
  | "instance.boot_complete"
  | "instance.shutdown"
  | "instance.shutdown_requested"
  | "instance.power_on"
  | "instance.power_off"
  | "instance.power_off_forced"
  | "instance.error"
  | "instance.deleting"
  | "instance.deleted"
  | "instance.restart"
  // Tunnel
  | "tunnel.connected"
  | "tunnel.disconnected"
  // Chat
  | "chat.session_created"
  | "chat.user_message"
  | "chat.assistant_response"
  | "chat.stream_error"
  // LLM proxy
  | "llm.completion"
  // Connectors
  | "connector.requested"
  | "connector.connected"
  | "connector.revoked"
  // Tools
  | "tool.invoked"
  | "tool.succeeded"
  | "tool.failed"
  // Scheduler
  | "scheduler.window_on"
  | "scheduler.window_off"
  | "scheduler.idle_triggered"
  // Budget
  | "budget.exceeded"
  | "budget.paused_agent"
  | "budget.shutdown_instance"
  | "budget.reset"
  // Manual controls
  | "control.pause"
  | "control.resume"
  | "control.stop"
  | "control.restart"
  // Alerts
  | "alert.test";

export async function writeAuditEvent(
  agentId: string,
  type: AuditEventType,
  payload?: Record<string, unknown>,
  actor: AuditActor = "system",
): Promise<void> {
  db.insert(auditEvents)
    .values({
      id: crypto.randomUUID(),
      agentId,
      actor,
      type,
      payload: payload ? JSON.stringify(payload) : null,
      createdAt: new Date(),
    })
    .run();
}
