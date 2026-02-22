import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { connectors, oauthStates } from "@/lib/db/schema";
import { getProvider } from "@/lib/connectors/registry";
import { encrypt } from "@/lib/crypto";
import { writeAuditEvent } from "@/lib/audit";

type RouteCtx = { params: Promise<{ provider: string }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { provider } = await ctx.params;
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing code or state" },
      { status: 400 },
    );
  }

  // Look up and consume state (one-time use)
  const stateRow = db
    .select()
    .from(oauthStates)
    .where(eq(oauthStates.state, state))
    .get();
  if (!stateRow) {
    return NextResponse.json(
      { error: "Invalid or expired state" },
      { status: 400 },
    );
  }
  db.delete(oauthStates).where(eq(oauthStates.state, state)).run();

  if (stateRow.provider !== provider) {
    return NextResponse.json(
      { error: "Provider mismatch" },
      { status: 400 },
    );
  }

  const providerModule = getProvider(provider)!;
  const redirectUri = `${process.env.CONTROL_PLANE_URL}/api/v1/connectors/${provider}/callback`;

  let tokens;
  try {
    tokens = await providerModule.exchangeCode(code, redirectUri);
  } catch (err) {
    return NextResponse.json(
      { error: `Token exchange failed: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  const accessTokenEncrypted = encrypt(tokens.access_token);
  const refreshTokenEncrypted = tokens.refresh_token
    ? encrypt(tokens.refresh_token)
    : null;
  const expiresAt = tokens.expires_in
    ? Math.floor(Date.now() / 1000) + tokens.expires_in
    : null;

  // Upsert: update existing pending/error row or insert new
  const existing = db
    .select()
    .from(connectors)
    .where(
      and(
        eq(connectors.agentId, stateRow.agentId),
        eq(connectors.provider, provider),
      ),
    )
    .get();

  if (existing) {
    db.update(connectors)
      .set({
        status: "connected",
        scopes: JSON.stringify(tokens.scopes),
        accessTokenEncrypted,
        refreshTokenEncrypted,
        expiresAt,
      })
      .where(eq(connectors.id, existing.id))
      .run();
  } else {
    db.insert(connectors)
      .values({
        id: crypto.randomUUID(),
        agentId: stateRow.agentId,
        provider,
        status: "connected",
        scopes: JSON.stringify(tokens.scopes),
        accessTokenEncrypted,
        refreshTokenEncrypted,
        expiresAt,
        createdAt: new Date(),
      })
      .run();
  }

  await writeAuditEvent(stateRow.agentId, "connector.connected", {
    provider,
    scopes: tokens.scopes,
  }, "system");

  return NextResponse.redirect(`${stateRow.redirectUrl}?connected=${provider}`);
}
