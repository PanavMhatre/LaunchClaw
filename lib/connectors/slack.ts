export const defaultScopes = ["chat:write", "channels:read"];

export function getAuthUrl(
  _agentId: string,
  _redirectUrl: string,
  state: string,
): string {
  const params = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID!,
    scope: defaultScopes.join(" "),
    redirect_uri: `${process.env.CONTROL_PLANE_URL}/api/v1/connectors/slack/callback`,
    state,
  });
  return `https://slack.com/oauth/v2/authorize?${params}`;
}

export async function exchangeCode(code: string, redirectUri: string) {
  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code,
      redirect_uri: redirectUri,
    }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack OAuth error: ${data.error}`);
  return {
    access_token: data.access_token as string,
    scopes: (data.scope as string).split(","),
  };
}
