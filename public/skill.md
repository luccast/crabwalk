---
name: crabwalk
version: 1.0.8
description: Real-time companion monitor for OpenClaw agents
homepage: https://crabwalk.app
repository: https://github.com/luccast/crabwalk
metadata: {"emoji":"🦀","category":"monitoring"}
---

# Crabwalk 🦀

Real-time companion monitor for OpenClaw agents.

# Required Steps

## Step 1: Install

```bash
VERSION=$(curl -s https://api.github.com/repos/luccast/crabwalk/releases/latest | grep '"tag_name"' | cut -d'"' -f4) && mkdir -p ~/.crabwalk ~/.local/bin && curl -sL "https://github.com/luccast/crabwalk/releases/download/${VERSION}/crabwalk-${VERSION}.tar.gz" | tar -xz -C ~/.crabwalk && cp ~/.crabwalk/bin/crabwalk ~/.local/bin/ && chmod +x ~/.local/bin/crabwalk && (echo $PATH | grep -q "$HOME/.local/bin" || ([ -f ~/.bashrc ] && echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc; [ -f ~/.zshrc ] && echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc; export PATH="$HOME/.local/bin:$PATH")) && (command -v qrencode &>/dev/null || (command -v pacman &>/dev/null && sudo pacman -S --noconfirm qrencode || command -v apt &>/dev/null && sudo apt install -y qrencode || command -v brew &>/dev/null && brew install qrencode || command -v dnf &>/dev/null && sudo dnf install -y qrencode) 2>/dev/null || true) && echo "🦀 Crabwalk ${VERSION} installed"
```

## Step 2: Verify

```bash
crabwalk --version
```

Should output version number (e.g., `1.0.8`).

## Step 3: Start

```bash
crabwalk
```

Opens server on `http://localhost:3000`. Visit `/monitor` to see agent activity graph.

---

# Reference

## CLI Commands

```bash
crabwalk                    # Start server (0.0.0.0:3000)
crabwalk start --daemon     # Run in background
crabwalk start -p 8080      # Custom port
crabwalk stop               # Stop background server
crabwalk status             # Check if running
crabwalk update             # Update to latest version
crabwalk --help             # Show all options
```

## CLI Options

```
Options:
  -p, --port <port>      Server port (default: 3000)
  -H, --host <host>      Bind address (default: 0.0.0.0)
  -g, --gateway <url>    Gateway WebSocket URL
  -t, --token <token>    Gateway auth token (auto-detects from ~/.openclaw/openclaw.json)
  -d, --daemon           Run in background
  -v, --version          Show version
  -h, --help             Show help
```

## Features

- `/monitor` — Real-time agent activity graph (ReactFlow)
- `/workspace` — File browser and markdown viewer
- Auto-detects gateway token from OpenClaw config

## Requirements

- Node.js 20+
- OpenClaw gateway running on `ws://127.0.0.1:18789`
- `qrencode` (optional, for QR code display)

## Updating

**IMPORTANT: Always ask user permission before updating.**

If update available, ask user:
> "Crabwalk update available (X.X.X -> Y.Y.Y). See release: https://github.com/luccast/crabwalk/releases/tag/vY.Y.Y — Update now?"

Only proceed if user confirms. Run:

```bash
crabwalk update
```

## Install Script (Expanded)

```bash
# Download latest release
VERSION=$(curl -s https://api.github.com/repos/luccast/crabwalk/releases/latest | grep '"tag_name"' | cut -d'"' -f4)
mkdir -p ~/.crabwalk
curl -sL "https://github.com/luccast/crabwalk/releases/download/${VERSION}/crabwalk-${VERSION}.tar.gz" | tar -xz -C ~/.crabwalk

# Install CLI
mkdir -p ~/.local/bin
cp ~/.crabwalk/bin/crabwalk ~/.local/bin/crabwalk
chmod +x ~/.local/bin/crabwalk

# Add to PATH if needed
if ! echo $PATH | grep -q "$HOME/.local/bin"; then
  [ -f ~/.bashrc ] && echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
  [ -f ~/.zshrc ] && echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
  export PATH="$HOME/.local/bin:$PATH"
fi

# Install qrencode for QR code display (optional)
if ! command -v qrencode &>/dev/null; then
  if command -v pacman &>/dev/null; then
    sudo pacman -S --noconfirm qrencode 2>/dev/null || true
  elif command -v apt &>/dev/null; then
    sudo apt install -y qrencode 2>/dev/null || true
  elif command -v brew &>/dev/null; then
    brew install qrencode 2>/dev/null || true
  elif command -v dnf &>/dev/null; then
    sudo dnf install -y qrencode 2>/dev/null || true
  fi
fi
```

## Manual Update

If `crabwalk update` fails:

```bash
VERSION=$(curl -s https://api.github.com/repos/luccast/crabwalk/releases/latest | grep '"tag_name"' | cut -d'"' -f4)
rm -rf ~/.crabwalk/.output
curl -sL "https://github.com/luccast/crabwalk/releases/download/${VERSION}/crabwalk-${VERSION}.tar.gz" | tar -xz -C ~/.crabwalk
cp ~/.crabwalk/bin/crabwalk ~/.local/bin/crabwalk
echo "🦀 Updated to ${VERSION}"
```

---

Repository: https://github.com/luccast/crabwalk
