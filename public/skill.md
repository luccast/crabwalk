---
name: crabwalk
version: 1.0.7
description: Real-time companion monitor for OpenClaw agents
homepage: https://crabwalk.app
repository: https://github.com/luccast/crabwalk
metadata: {"emoji":"🦀","category":"monitoring"}
---

# Crabwalk 🦀

Real-time companion monitor for OpenClaw agents. Visualize agent sessions, tool calls, and activity in a reactive graph UI.

## Quick Install

```bash
# Get latest version
VERSION=$(curl -s https://api.github.com/repos/luccast/crabwalk/releases/latest | grep '"tag_name"' | cut -d'"' -f4)

# Download and extract
mkdir -p ~/.crabwalk
curl -sL "https://github.com/luccast/crabwalk/releases/download/${VERSION}/crabwalk-${VERSION}.tar.gz" | tar -xz -C ~/.crabwalk

# Start server (runs on port 3000)
node ~/.crabwalk/.output/server/index.mjs
```

## One-Liner Install

```bash
VERSION=$(curl -s https://api.github.com/repos/luccast/crabwalk/releases/latest | grep '"tag_name"' | cut -d'"' -f4) && mkdir -p ~/.crabwalk && curl -sL "https://github.com/luccast/crabwalk/releases/download/${VERSION}/crabwalk-${VERSION}.tar.gz" | tar -xz -C ~/.crabwalk && echo "Crabwalk ${VERSION} installed to ~/.crabwalk"
```

## Running

```bash
# Default (port 3000)
node ~/.crabwalk/.output/server/index.mjs

# Custom port
PORT=8080 node ~/.crabwalk/.output/server/index.mjs

# With gateway auth token
CLAWDBOT_API_TOKEN=your_token node ~/.crabwalk/.output/server/index.mjs
```

Open http://localhost:3000 in browser.

## Configuration

| Env Var | Description | Default |
|---------|-------------|---------|
| `PORT` | Server port | `3000` |
| `CLAWDBOT_API_TOKEN` | Gateway auth token | none |

## Features

- `/monitor` — Real-time agent activity graph (ReactFlow)
- `/workspace` — File browser and markdown viewer
- Live WebSocket updates from clawdbot gateway

## Requirements

- Node.js 20+
- clawdbot gateway running on `ws://127.0.0.1:18789`

## Updating

```bash
VERSION=$(curl -s https://api.github.com/repos/luccast/crabwalk/releases/latest | grep '"tag_name"' | cut -d'"' -f4)
rm -rf ~/.crabwalk
mkdir -p ~/.crabwalk
curl -sL "https://github.com/luccast/crabwalk/releases/download/${VERSION}/crabwalk-${VERSION}.tar.gz" | tar -xz -C ~/.crabwalk
echo "Updated to ${VERSION}"
```

## Verify Installation

```bash
# Check version
cat ~/.crabwalk/package.json | grep '"version"'

# Test server starts
timeout 5 node ~/.crabwalk/.output/server/index.mjs 2>&1 | head -5 || true
```

---

Repository: https://github.com/luccast/crabwalk
