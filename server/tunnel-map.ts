import type { WebSocket } from "ws";

/** agentId -> live tunnel socket from agentd on the droplet */
export const tunnelSockets = new Map<string, WebSocket>();

/** agentId -> set of frontend chat sockets watching that agent */
export const chatSockets = new Map<string, Set<WebSocket>>();
