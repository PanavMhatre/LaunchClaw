import { readFileSync } from "fs";
import { resolve } from "path";

export interface CloudInitOptions {
  agentId: string;
  bootToken: string;
  deviceToken: string;
  gatewayToken: string;
  controlPlaneUrl: string;
  tunnelUrl: string;
  llmProxyBaseUrl: string;
  allowedConnectors?: string[];
}

/**
 * Generates the cloud-init user_data script injected into every OpenClaw
 * droplet at creation time. Installs and configures the agentd sidecar,
 * sets up OpenClaw to use our LLM proxy, and starts everything via systemd.
 */
export function generateCloudInit(opts: CloudInitOptions): string {
  const {
    agentId,
    bootToken,
    deviceToken,
    gatewayToken,
    controlPlaneUrl,
    tunnelUrl,
    llmProxyBaseUrl,
  } = opts;

  // Read the agentd script to embed it in cloud-init
  let agentdSource: string;
  try {
    agentdSource = readFileSync(
      resolve(process.cwd(), "agentd", "index.js"),
      "utf-8",
    );
  } catch {
    agentdSource = "// agentd source not found at build time — placeholder";
    console.warn("[cloud-init] Could not read agentd/index.js, using placeholder");
  }

  return `#!/bin/bash
set -euo pipefail

AGENT_ID="${agentId}"
BOOT_TOKEN="${bootToken}"
DEVICE_TOKEN="${deviceToken}"
GATEWAY_TOKEN="${gatewayToken}"
CONTROL_PLANE="${controlPlaneUrl}"
TUNNEL_URL="${tunnelUrl}"
LLM_PROXY_BASE_URL="${llmProxyBaseUrl}"

# ---------- 1. Wait for network ----------
sleep 5

# ---------- 2. Phone home (heartbeat) ----------
curl -sf -X POST "\${CONTROL_PLANE}/api/v1/agents/\${AGENT_ID}/heartbeat" \\
  -H "Authorization: Bearer \${BOOT_TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d '{"event":"boot_complete"}' || true

# ---------- 3. Install Node.js 22 if not present ----------
if ! command -v node &>/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource_setup.sh
  chmod +x /tmp/nodesource_setup.sh
  bash /tmp/nodesource_setup.sh
  apt-get install -y nodejs
  rm -f /tmp/nodesource_setup.sh
fi

# ---------- 4. Create agentd directory ----------
mkdir -p /opt/launchclaw/agentd
mkdir -p /etc/launchclaw

# ---------- 5. Write agentd script ----------
cat > /opt/launchclaw/agentd/index.js << 'AGENTD_EOF'
${agentdSource}
AGENTD_EOF

chmod +x /opt/launchclaw/agentd/index.js

# ---------- 6. Write agentd env file ----------
cat > /etc/launchclaw/agentd.env << ENV_EOF
AGENT_ID=\${AGENT_ID}
DEVICE_TOKEN=\${DEVICE_TOKEN}
GATEWAY_TOKEN=\${GATEWAY_TOKEN}
TUNNEL_URL=\${TUNNEL_URL}
GATEWAY_HOST=0.0.0.0
GATEWAY_PORT=18789
ENV_EOF

chmod 600 /etc/launchclaw/agentd.env

# ---------- 7. Configure OpenClaw ----------
# Write an environment override for the OpenClaw service so it uses our
# LLM proxy and enables gateway token auth. The exact drop-in path depends
# on the OpenClaw image; we try the common locations.
OPENCLAW_ENV_DIR="/etc/openclaw"
mkdir -p "\${OPENCLAW_ENV_DIR}"

cat > "\${OPENCLAW_ENV_DIR}/launchclaw.env" << OC_EOF
OPENCLAW_GATEWAY_TOKEN=\${GATEWAY_TOKEN}
OPENAI_BASE_URL=\${LLM_PROXY_BASE_URL}
OPENAI_API_KEY=\${DEVICE_TOKEN}
OPENCLAW_ALLOWED_CONNECTORS=${opts.allowedConnectors?.join(",") ?? ""}
OC_EOF

# If openclaw uses a systemd service, create an override to source our env
if systemctl list-unit-files openclaw.service &>/dev/null; then
  mkdir -p /etc/systemd/system/openclaw.service.d
  cat > /etc/systemd/system/openclaw.service.d/launchclaw.conf << SYSD_EOF
[Service]
EnvironmentFile=/etc/openclaw/launchclaw.env
SYSD_EOF
  systemctl daemon-reload
  systemctl restart openclaw.service || true
fi

# ---------- 8. Create systemd unit for agentd ----------
cat > /etc/systemd/system/launchclaw-agentd.service << UNIT_EOF
[Unit]
Description=LaunchClaw Agent Daemon
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
EnvironmentFile=/etc/launchclaw/agentd.env
ExecStart=/usr/bin/node /opt/launchclaw/agentd/index.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
UNIT_EOF

# ---------- 9. Start agentd ----------
systemctl daemon-reload
systemctl enable --now launchclaw-agentd
`;
}
