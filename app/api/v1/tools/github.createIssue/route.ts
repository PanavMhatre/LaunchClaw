import { NextRequest, NextResponse } from "next/server";
import { githubCreateIssueSchema } from "@/lib/types";
import { authenticateToolRequest } from "@/lib/tool-auth";
import { writeAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = githubCreateIssueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { agent_id, owner, repo, title, body: issueBody } = parsed.data;
  const auth = authenticateToolRequest(
    req.headers.get("authorization"),
    agent_id,
    "github",
  );
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const ghRes = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.ctx.accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ title, body: issueBody }),
    },
  );
  const result = await ghRes.json();

  if (!ghRes.ok) {
    await writeAuditEvent(agent_id, "tool.failed", {
      tool: "github.createIssue",
      owner,
      repo,
      error: result.message,
    }, "agent");
    return NextResponse.json({ error: result.message }, { status: ghRes.status });
  }

  await writeAuditEvent(agent_id, "tool.succeeded", {
    tool: "github.createIssue",
    owner,
    repo,
    issue_number: result.number,
  }, "agent");

  return NextResponse.json({
    ok: true,
    issue_number: result.number,
    html_url: result.html_url,
  });
}
