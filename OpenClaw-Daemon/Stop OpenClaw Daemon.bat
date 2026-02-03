@echo off
title Stop OpenClaw Daemon
color 0C

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║                  Stop OpenClaw Daemon                    ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.

echo Stopping all OpenClaw and daemon processes...

taskkill /f /im node.exe /fi "windowtitle eq *OpenClaw*" 2>nul
taskkill /f /im node.exe /fi "windowtitle eq *daemon*" 2>nul

echo Checking port 18789...
netstat -ano | findstr :18789 >nul
if %ERRORLEVEL% EQU 0 (
    echo [WARNING] Port 18789 is still in use. You may need to restart your computer.
) else (
    echo [SUCCESS] OpenClaw daemon has been stopped successfully.
)

echo.
pause