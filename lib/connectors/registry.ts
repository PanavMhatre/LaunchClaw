import * as slack from "./slack";
import * as google from "./google";
import * as github from "./github";
import * as twitter from "./twitter";

export interface OAuthProvider {
  defaultScopes: string[];
  getAuthUrl(agentId: string, redirectUrl: string, state: string): string;
  exchangeCode(
    code: string,
    redirectUri: string,
  ): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scopes: string[];
  }>;
}

const providers: Record<string, OAuthProvider> = {
  slack,
  google,
  github,
  twitter,
};

export function getProvider(name: string): OAuthProvider | undefined {
  return providers[name];
}

export function isValidProvider(name: string): boolean {
  return name in providers;
}
