import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const apiKey = process.env.LAUNCHCLAW_API_KEY;

  // No key configured = open access (dev mode)
  if (!apiKey) return NextResponse.next();

  const provided =
    req.headers.get("x-api-key") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();

  if (provided !== apiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/v1/agents/:path*",
    "/api/v1/connectors/:provider/start",
  ],
};
