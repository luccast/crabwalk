@echo off
title Crabwalk - OpenClaw Session Monitor
color 0A

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║                Crabwalk - OpenClaw Session Monitor         ║
echo  ║                    Windows Edition v1.0.8                  ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.

echo Starting Crabwalk Server...
echo.
echo [INFO] Connecting to OpenClaw Gateway at ws://127.0.0.1:18789
echo [INFO] Using authentication token
echo [INFO] Default session: agent:main:main
echo.

cd /d "%~dp0\.output\server"

REM Set OpenClaw connection environment variables
set CLAWDBOT_URL=ws://127.0.0.1:18789
set CLAWDBOT_API_TOKEN=your_token
set CLAWDBOT_DEFAULT_SESSION=agent:main:main

echo [READY] Crabwalk will be available at: http://localhost:3000
echo [READY] Press Ctrl+C to stop the server
echo.

REM Start server
node index.mjs --port 3000

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to start Crabwalk. Please check:
    echo        1. Node.js is installed (node --version)
    echo        2. OpenClaw is running on port 18789
    echo        3. Authentication token is valid
    echo.
    pause
)