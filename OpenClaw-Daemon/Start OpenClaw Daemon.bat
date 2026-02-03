@echo off
title OpenClaw Daemon
color 0B

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║                  OpenClaw Process Daemon                   ║
echo  ║                    Windows Edition                        ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.

echo Starting OpenClaw Daemon...
echo.
echo [INFO] The daemon will automatically monitor OpenClaw and restart on crashes
echo [INFO] Log files will be saved to daemon.log
echo [INFO] Press Ctrl+C to completely stop the daemon
echo.

REM Try to find OpenClaw installation
set OPENCLAW_FOUND=0

if exist "D:\gitcode\openclaw\openclaw.mjs" (
    echo [FOUND] OpenClaw at: D:\gitcode\openclaw
    set OPENCLAW_FOUND=1
    set OPENCLAW_PATH=D:\gitcode\openclaw
)
if exist "C:\gitcode\openclaw\openclaw.mjs" (
    echo [FOUND] OpenClaw at: C:\gitcode\openclaw
    set OPENCLAW_FOUND=1
    set OPENCLAW_PATH=C:\gitcode\openclaw
)
if exist "%USERPROFILE%\gitcode\openclaw\openclaw.mjs" (
    echo [FOUND] OpenClaw at: %USERPROFILE%\gitcode\openclaw
    set OPENCLAW_FOUND=1
    set OPENCLAW_PATH=%USERPROFILE%\gitcode\openclaw
)

if %OPENCLAW_FOUND%==0 (
    echo.
    echo [ERROR] OpenClaw installation not found!
    echo.
    echo Please install OpenClaw first from:
    echo https://github.com/anomalyco/openclaw
    echo.
    echo Expected locations:
    echo   - D:\gitcode\openclaw
    echo   - C:\gitcode\openclaw  
    echo   - %USERPROFILE%\gitcode\openclaw
    echo.
    pause
    exit /b 1
)

cd /d "%OPENCLAW_PATH%"
node daemon.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to start OpenClaw daemon. Please check:
    echo        1. Node.js is installed (node --version)
    echo        2. OpenClaw is properly installed
    echo        3. Port 18789 is not occupied
    echo.
    pause
)