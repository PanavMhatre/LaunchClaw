import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agents, chatSessions, tokenUsageSessions } from "@/lib/db/schema";
import { writeAuditEvent } from "@/lib/audit";

type RouteCtx = { params: Promise<{ id: string }> };

// POST /api/v1/agents/:id/chat/sessions — Create a new chat session
export async function POST(_req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;

  const agent = db.select().from(agents).where(eq(agents.id, id)).get();
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  if (agent.status !== "online") {
    return NextResponse.json(
      { error: `Agent is ${agent.status}, must be online to start a session` },
      { status: 409 },
    );
  }

  const sessionId = `sess_${crypto.randomUUID()}`;
  const now = new Date();

  db.insert(chatSessions)
    .values({ id: sessionId, agentId: id, createdAt: now })
    .run();

  db.insert(tokenUsageSessions)
    .values({
      id: crypto.randomUUID(),
      agentId: id,
      sessionId,
      inputTokens: 0,
      outputTokens: 0,
      startedAt: now,
      updatedAt: now,
    })
    .run();

  await writeAuditEvent(id, "chat.session_created", { sessionId }, "user");

  return NextResponse.json({ session_id: sessionId }, { status: 201 });
}
