@echo off
title Stop Crabwalk
color 0C

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║                     Stop Crabwalk                         ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.

echo Stopping all Crabwalk processes...

taskkill /f /im node.exe /fi "windowtitle eq Crabwalk*" 2>nul
taskkill /f /im node.exe /fi "windowtitle eq *crabwalk*" 2>nul

echo Checking port 3000...
netstat -ano | findstr :3000 >nul
if %ERRORLEVEL% EQU 0 (
    echo [WARNING] Port 3000 is still in use. You may need to restart your computer.
) else (
    echo [SUCCESS] Crabwalk has been stopped successfully.
)

echo.
pause