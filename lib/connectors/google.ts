export const defaultScopes = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar.events",
];

export function getAuthUrl(
  _agentId: string,
  _redirectUrl: string,
  state: string,
): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.CONTROL_PLANE_URL}/api/v1/connectors/google/callback`,
    response_type: "code",
    scope: defaultScopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCode(code: string, redirectUri: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(`Google OAuth error: ${data.error_description}`);
  }
  return {
    access_token: data.access_token as string,
    refresh_token: data.refresh_token as string | undefined,
    expires_in: data.expires_in as number | undefined,
    scopes: (data.scope as string).split(" "),
  };
}
