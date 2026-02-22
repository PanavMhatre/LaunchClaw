import type {
  DoCreateDropletResponse,
  DoDropletResponse,
  DoActionResponse,
  DoErrorResponse,
} from "./types";

const DO_API = "https://api.digitalocean.com/v2";

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class DoApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly doErrorId: string,
    message: string,
  ) {
    super(message);
    this.name = "DoApiError";
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getToken(): string {
  const token = process.env.DO_TOKEN;
  if (!token || token === "dop_v1_xxxx") {
    throw new DoApiError(500, "missing_token", "DO_TOKEN is not configured");
  }
  return token;
}

async function doFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = getToken();
  const res = await fetch(`${DO_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!res.ok && res.status !== 204) {
    let doErr: DoErrorResponse = { id: "unknown", message: res.statusText };
    try {
      doErr = (await res.json()) as DoErrorResponse;
    } catch {
      // response may not be JSON
    }
    throw new DoApiError(
      res.status,
      doErr.id,
      doErr.message || `DO API ${res.status}`,
    );
  }

  return res;
}

// ---------------------------------------------------------------------------
// Droplet CRUD
// ---------------------------------------------------------------------------

export interface CreateDropletParams {
  name: string;
  region: string;
  size: string;
  userData: string;
  tags?: string[];
}

export async function createDroplet(
  params: CreateDropletParams,
): Promise<DoCreateDropletResponse> {
  const res = await doFetch("/droplets", {
    method: "POST",
    body: JSON.stringify({
      name: params.name,
      region: params.region,
      size: params.size,
      image: "openclaw",
      user_data: params.userData,
      tags: params.tags ?? ["launchclaw", "openclaw"],
    }),
  });
  return (await res.json()) as DoCreateDropletResponse;
}

export async function getDroplet(
  dropletId: number,
): Promise<DoDropletResponse> {
  const res = await doFetch(`/droplets/${dropletId}`);
  return (await res.json()) as DoDropletResponse;
}

export async function deleteDroplet(dropletId: number): Promise<void> {
  await doFetch(`/droplets/${dropletId}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Droplet actions
// ---------------------------------------------------------------------------

async function dropletAction(
  dropletId: number,
  type: string,
): Promise<DoActionResponse> {
  const res = await doFetch(`/droplets/${dropletId}/actions`, {
    method: "POST",
    body: JSON.stringify({ type }),
  });
  return (await res.json()) as DoActionResponse;
}

export function shutdownDroplet(dropletId: number) {
  return dropletAction(dropletId, "shutdown");
}

export function powerOffDroplet(dropletId: number) {
  return dropletAction(dropletId, "power_off");
}

export function powerOnDroplet(dropletId: number) {
  return dropletAction(dropletId, "power_on");
}

export function rebootDroplet(dropletId: number) {
  return dropletAction(dropletId, "reboot");
}

// ---------------------------------------------------------------------------
// Actions polling
// ---------------------------------------------------------------------------

export async function getAction(actionId: number): Promise<DoActionResponse> {
  const res = await doFetch(`/actions/${actionId}`);
  return (await res.json()) as DoActionResponse;
}
