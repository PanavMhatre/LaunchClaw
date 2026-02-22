import { NextRequest, NextResponse } from "next/server";
import { gmailSendSchema } from "@/lib/types";
import { authenticateToolRequest } from "@/lib/tool-auth";
import { writeAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = gmailSendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { agent_id, to, subject } = parsed.data;
  const auth = authenticateToolRequest(
    req.headers.get("authorization"),
    agent_id,
    "google",
  );
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const messageId = `stub_${crypto.randomUUID()}`;

  await writeAuditEvent(agent_id, "tool.succeeded", {
    tool: "gmail.send",
    to,
    subject,
    stubbed: true,
    message_id: messageId,
  }, "agent");

  return NextResponse.json({ ok: true, message_id: messageId });
}
