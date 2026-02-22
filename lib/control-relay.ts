const WS_SERVER_URL =
  process.env.WS_INTERNAL_URL ?? "http://ws-server:8080";

/**
 * Relay a control command to the WS server, which forwards it to the
 * agent's tunnel socket. Returns true if the command was accepted.
 */
export async function relayControlCommand(
  agentId: string,
  command: "control.pause" | "control.resume" | "control.stop" | "control.restart",
  freshState?: boolean,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const body: Record<string, unknown> = {
      agent_id: agentId,
      command,
    };
    if (freshState !== undefined) {
      body.fresh_state = freshState;
    }

    const res = await fetch(`${WS_SERVER_URL}/internal/control`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as { ok?: boolean; error?: string };

    if (!res.ok) {
      return { ok: false, error: data.error ?? `WS server returned ${res.status}` };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
