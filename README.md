# 🦀 Crabwalk

Real-time companion monitor for [OpenClaw (Clawdbot)](https://github.com/openclaw/openclaw) agents by [@luccasveg](https://x.com/luccasveg).

Watch your AI agents work across WhatsApp, Telegram, Discord, and Slack in a live node graph. See thinking states, tool calls, and response chains as they happen.

![Crabwalk Home](public/home.png)

![Crabwalk Monitor](public/monitor.png)

## Features

- **Live activity graph** - ReactFlow visualization of agent sessions and action chains
- **Multi-platform** - Monitor agents across all messaging platforms simultaneously
- **Real-time streaming** - WebSocket connection to clawdbot gateway
- **Action tracing** - Expand nodes to inspect tool args and payloads
- **Session filtering** - Filter by platform, search by recipient

## Installation

### Via OpenClaw Agent

Paste this link to your OpenClaw agent and ask it to install/update Crabwalk:

```
https://raw.githubusercontent.com/luccast/crabwalk/master/public/skill.md
```

### CLI Install

```bash
VERSION=$(curl -s https://api.github.com/repos/luccast/crabwalk/releases/latest | grep '"tag_name"' | cut -d'"' -f4)
mkdir -p ~/.crabwalk ~/.local/bin
curl -sL "https://github.com/luccast/crabwalk/releases/download/${VERSION}/crabwalk-${VERSION}.tar.gz" | tar -xz -C ~/.crabwalk
cp ~/.crabwalk/bin/crabwalk ~/.local/bin/
chmod +x ~/.local/bin/crabwalk
```

Then run:

```bash
crabwalk                    # Start on 0.0.0.0:3000
crabwalk start --daemon     # Run in background
crabwalk start -p 8080      # Custom port
crabwalk stop               # Stop daemon
crabwalk status             # Check if running
crabwalk update             # Update to latest
```

### Docker (recommended)

```bash
docker run -d \
  -p 3000:3000 \
  -e CLAWDBOT_API_TOKEN=your-token \
  -e CLAWDBOT_URL=ws://host.docker.internal:18789 \
  ghcr.io/luccast/crabwalk:latest
```

> Note: When running Crabwalk in Docker, the OpenClaw gateway typically runs on the _host_.
> Use `CLAWDBOT_URL=ws://host.docker.internal:18789` so the container can connect.
> If you're running OpenClaw with `bind: loopback` and `tailscale serve` for secure tailnet-only access, you'll need to run the crabwalk container with host networking - replace `p:3000:3000` with `--network host`
> This allows the container to reach 127.0.0.1:18789 while maintaining the security benefits of loopback-only binding.

Or with docker-compose:

```bash
curl -O https://raw.githubusercontent.com/luccast/crabwalk/master/docker-compose.yml
CLAWDBOT_API_TOKEN=your-token CLAWDBOT_URL=ws://host.docker.internal:18789 docker-compose up -d
```

> If gateway is `bind: loopback` only, you will need to edit the `docker-compose.yml` to add `network_mode: host`

### From source

```bash
git clone https://github.com/luccast/crabwalk.git
cd crabwalk
npm install
CLAWDBOT_API_TOKEN=your-token npm run dev
```

Open `http://localhost:3000/monitor`

## Configuration

Requires OpenClaw gateway running on the same machine.

### Gateway Token

Find your token in the clawdbot config file:

```bash
# Look for gateway.auth.token
cat ~/.clawdbot/clawdbot.json | rg "gateway\.auth\.token"
```

Or with jq:

```bash
jq '.gateway.auth.token' ~/.clawdbot/clawdbot.json
```

Or copy it directly:

```bash
export CLAWDBOT_API_TOKEN=$(python3 -c "import json,os; print(json.load(open(os.path.expanduser('~/.clawdbot/clawdbot.json')))['gateway']['auth']['token'])")
```

## Stack

TanStack Start, ReactFlow, Framer Motion, tRPC, TanStack DB
