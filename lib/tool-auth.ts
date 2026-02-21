import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { agents, connectors } from "@/lib/db/schema";
import { decrypt } from "@/lib/crypto";

export interface ToolContext {
  agentId: string;
  accessToken: string;
  connector: { id: string; provider: string };
}

export function authenticateToolRequest(
  authHeader: string | null,
  agentId: string,
  provider: string,
): { ctx: ToolContext } | { error: string; status: number } {
  const bearerToken = (authHeader ?? "").replace(/^Bearer\s+/i, "").trim();

  const agent = db.select().from(agents).where(eq(agents.id, agentId)).get();
  if (!agent) return { error: "Agent not found", status: 404 };
  if (!bearerToken || bearerToken !== agent.deviceToken) {
    return { error: "Unauthorized", status: 401 };
  }

  const connector = db
    .select()
    .from(connectors)
    .where(
      and(eq(connectors.agentId, agentId), eq(connectors.provider, provider)),
    )
    .get();

  if (
    !connector ||
    connector.status !== "connected" ||
    !connector.accessTokenEncrypted
  ) {
    return {
      error: `No connected ${provider} connector for this agent`,
      status: 400,
    };
  }

  const accessToken = decrypt(connector.accessTokenEncrypted);

  return {
    ctx: {
      agentId,
      accessToken,
      connector: { id: connector.id, provider },
    },
  };
}
