# 🦀 Crabwalk

Real-time companion monitor for [Clawdbot](https://github.com/anthropics/clawdbot) agents.

Watch your AI agents work across WhatsApp, Telegram, Discord, and Slack in a live node graph. See thinking states, tool calls, and response chains as they happen.

## Features

- **Live activity graph** - ReactFlow visualization of agent sessions and action chains
- **Multi-platform** - Monitor agents across all messaging platforms simultaneously
- **Real-time streaming** - WebSocket connection to clawdbot gateway
- **Action tracing** - Expand nodes to inspect tool args and payloads
- **Session filtering** - Filter by platform, search by recipient

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000/monitor`

Requires clawdbot gateway running on `ws://127.0.0.1:18789`.

## Config

```bash
# Option 1: command line
CLAWDBOT_API_TOKEN=your-token npm run dev

# Option 2: env file
echo "CLAWDBOT_API_TOKEN=your-token" > .env.local
npm run dev
```

## Stack

TanStack Start, ReactFlow, Framer Motion, tRPC, TanStack DB
