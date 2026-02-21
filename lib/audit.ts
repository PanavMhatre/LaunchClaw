import { db } from "./db";
import { auditEvents } from "./db/schema";

export type AuditEventType =
  | "instance.creating"
  | "instance.online"
  | "instance.boot_complete"
  | "instance.shutdown"
  | "instance.power_on"
  | "instance.power_off"
  | "instance.error"
  | "instance.deleting"
  | "instance.deleted"
  | "tunnel.connected"
  | "tunnel.disconnected"
  | "chat.session_created"
  | "chat.user_message"
  | "chat.assistant_response"
  | "llm.completion";

export async function writeAuditEvent(
  agentId: string,
  type: AuditEventType,
  payload?: Record<string, unknown>,
): Promise<void> {
  db.insert(auditEvents)
    .values({
      id: crypto.randomUUID(),
      agentId,
      type,
      payload: payload ? JSON.stringify(payload) : null,
      createdAt: new Date(),
    })
    .run();
}
