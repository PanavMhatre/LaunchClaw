import { NextRequest, NextResponse } from "next/server";
import { twitterPostSchema } from "@/lib/types";
import { authenticateToolRequest } from "@/lib/tool-auth";
import { writeAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = twitterPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { agent_id, text } = parsed.data;
  const auth = authenticateToolRequest(
    req.headers.get("authorization"),
    agent_id,
    "twitter",
  );
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const tweetId = `stub_${crypto.randomUUID()}`;

  await writeAuditEvent(agent_id, "tool.succeeded", {
    tool: "twitter.post",
    text_length: text.length,
    stubbed: true,
    tweet_id: tweetId,
  }, "agent");

  return NextResponse.json({ ok: true, tweet_id: tweetId });
}
