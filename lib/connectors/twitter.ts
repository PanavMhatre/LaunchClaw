export const defaultScopes = ["tweet.read", "tweet.write", "users.read"];

export function getAuthUrl(
  _agentId: string,
  _redirectUrl: string,
  state: string,
): string {
  const controlPlane =
    process.env.CONTROL_PLANE_URL ?? "http://control-plane:3000";
  const params = new URLSearchParams({
    state,
    code: `mock_twitter_code_${crypto.randomUUID()}`,
  });
  return `${controlPlane}/api/v1/connectors/twitter/callback?${params}`;
}

export async function exchangeCode(_code: string, _redirectUri: string) {
  return {
    access_token: `mock_twitter_access_${crypto.randomUUID()}`,
    refresh_token: `mock_twitter_refresh_${crypto.randomUUID()}`,
    expires_in: 7200,
    scopes: defaultScopes,
  };
}
