import { NextRequest, NextResponse } from "next/server";
import { slackPostMessageSchema } from "@/lib/types";
import { authenticateToolRequest } from "@/lib/tool-auth";
import { writeAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = slackPostMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { agent_id, channel, text } = parsed.data;
  const auth = authenticateToolRequest(
    req.headers.get("authorization"),
    agent_id,
    "slack",
  );
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const slackRes = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.ctx.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel, text }),
  });
  const result = await slackRes.json();

  await writeAuditEvent(agent_id, "tool.invoked", {
    tool: "slack.postMessage",
    channel,
    ok: result.ok,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    ts: result.ts,
    channel: result.channel,
  });
}
