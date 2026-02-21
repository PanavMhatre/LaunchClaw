export const defaultScopes = ["repo", "read:user"];

export function getAuthUrl(
  _agentId: string,
  _redirectUrl: string,
  state: string,
): string {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    scope: defaultScopes.join(" "),
    redirect_uri: `${process.env.CONTROL_PLANE_URL}/api/v1/connectors/github/callback`,
    state,
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}

export async function exchangeCode(code: string, redirectUri: string) {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID!,
      client_secret: process.env.GITHUB_CLIENT_SECRET!,
      code,
      redirect_uri: redirectUri,
    }),
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description}`);
  }
  return {
    access_token: data.access_token as string,
    scopes: (data.scope as string).split(","),
  };
}
