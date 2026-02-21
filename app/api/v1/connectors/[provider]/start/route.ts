import { NextRequest, NextResponse } from "next/server";
import { eq, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { agents, oauthStates } from "@/lib/db/schema";
import { oauthStartSchema } from "@/lib/types";
import { getProvider, isValidProvider } from "@/lib/connectors/registry";

type RouteCtx = { params: Promise<{ provider: string }> };

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { provider } = await ctx.params;

  if (!isValidProvider(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = oauthStartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { agent_id, redirect_url } = parsed.data;
  const agent = db
    .select()
    .from(agents)
    .where(eq(agents.id, agent_id))
    .get();
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Clean up stale states older than 10 minutes
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
  db.delete(oauthStates).where(lt(oauthStates.createdAt, tenMinAgo)).run();

  const state = crypto.randomUUID();
  db.insert(oauthStates)
    .values({
      state,
      agentId: agent_id,
      provider,
      redirectUrl: redirect_url,
      createdAt: new Date(),
    })
    .run();

  const providerModule = getProvider(provider)!;
  const auth_url = providerModule.getAuthUrl(agent_id, redirect_url, state);

  return NextResponse.json({ auth_url });
}
