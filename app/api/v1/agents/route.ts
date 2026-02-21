import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { agents, tokenUsageTotals } from "@/lib/db/schema";
import { createAgentSchema } from "@/lib/types";
import { createDroplet, DoApiError } from "@/lib/do-client";
import { generateCloudInit } from "@/lib/cloud-init";
import { writeAuditEvent } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/v1/agents — Create a new agent + provision an OpenClaw droplet
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
  if (!rateLimit(ip, 10_000)) {
    return NextResponse.json(
      { error: "Rate limited — wait 10 seconds between creates" },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = createAgentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, region, size } = parsed.data;
  const agentId = crypto.randomUUID();
  const bootToken = crypto.randomUUID().replace(/-/g, "");
  const deviceToken = crypto.randomUUID().replace(/-/g, "");
  const gatewayToken = crypto.randomUUID().replace(/-/g, "");

  const controlPlaneUrl =
    process.env.CONTROL_PLANE_URL ?? "http://localhost:3000";
  const tunnelUrl =
    process.env.WS_TUNNEL_URL ?? "ws://localhost:8080/ws/tunnel";
  const llmProxyBaseUrl = `${controlPlaneUrl}/api/v1/llm/${agentId}`;

  const userData = generateCloudInit({
    agentId,
    bootToken,
    deviceToken,
    gatewayToken,
    controlPlaneUrl,
    tunnelUrl,
    llmProxyBaseUrl,
  });

  const shortId = agentId.split("-")[0];

  try {
    const doRes = await createDroplet({
      name: `launchclaw-agent-${shortId}`,
      region,
      size,
      userData,
      tags: ["launchclaw", "openclaw"],
    });

    const now = new Date();
    db.insert(agents)
      .values({
        id: agentId,
        name,
        doDropletId: doRes.droplet.id,
        doActionId: doRes.links.actions?.[0]?.id ?? null,
        region,
        size,
        status: "creating",
        bootToken,
        deviceToken,
        gatewayToken,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    db.insert(tokenUsageTotals)
      .values({
        agentId,
        totalInputTokens: 0,
        totalOutputTokens: 0,
      })
      .run();

    await writeAuditEvent(agentId, "instance.creating", {
      dropletId: doRes.droplet.id,
      region,
      size,
    });

    return NextResponse.json(
      { agent_id: agentId, status: "creating" },
      { status: 202 },
    );
  } catch (err) {
    if (err instanceof DoApiError) {
      return NextResponse.json(
        { error: err.message, do_error_id: err.doErrorId },
        { status: err.status >= 500 ? 502 : err.status },
      );
    }
    throw err;
  }
}

// GET /api/v1/agents — List all agents
export async function GET() {
  const rows = db
    .select()
    .from(agents)
    .orderBy(desc(agents.createdAt))
    .all();

  return NextResponse.json({ agents: rows });
}
