@echo off
setlocal EnableDelayedExpansion
title SWITCH Host Cloud Bridge - Morphy PC
cd /d "%~dp0"

echo ==========================================================
echo    SWITCH HOST CLOUD BRIDGE (Morphy PC)
echo ==========================================================
echo Starting background cloud bridge to connect Vercel to LAN...
echo.

set "CONFIG_URL=https://switch-app-morphmatt14s-projects.vercel.app"

if exist "%~dp0VERCEL_URL.txt" (
    set /p CONFIG_URL=<"%~dp0VERCEL_URL.txt"
)

echo Target Vercel Cloud: %CONFIG_URL%
echo.

set "BRIDGE_DIR=%LOCALAPPDATA%\SWITCH_Bridge"
if not exist "%BRIDGE_DIR%" mkdir "%BRIDGE_DIR%"
set "PS1_FILE=%BRIDGE_DIR%\switch-cloud-bridge.ps1"

:: 1. Check local directory or project directory for switch-cloud-bridge.ps1
if exist "%~dp0switch-cloud-bridge.ps1" (
    copy /y "%~dp0switch-cloud-bridge.ps1" "%PS1_FILE%" >nul 2>&1
) else if exist "C:\Users\admin\Desktop\morphy\SWITCH-VERCEL\scripts\switch-cloud-bridge.ps1" (
    copy /y "C:\Users\admin\Desktop\morphy\SWITCH-VERCEL\scripts\switch-cloud-bridge.ps1" "%PS1_FILE%" >nul 2>&1
) else if exist "C:\Users\admin\.gemini\antigravity-ide\scratch\SWITCH-VERCEL\scripts\switch-cloud-bridge.ps1" (
    copy /y "C:\Users\admin\.gemini\antigravity-ide\scratch\SWITCH-VERCEL\scripts\switch-cloud-bridge.ps1" "%PS1_FILE%" >nul 2>&1
)

:: Also put a copy on Desktop so it's always accessible
if exist "%PS1_FILE%" (
    copy /y "%PS1_FILE%" "C:\Users\admin\Desktop\switch-cloud-bridge.ps1" >nul 2>&1
)

:: 2. Configure silent auto-start in Windows Startup
set "STARTUP_VBS=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\SWITCH-CloudBridge.vbs"
echo [SETUP] Registering SWITCH Cloud Bridge in Windows Startup...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$vbs = 'Set WshShell = CreateObject(\"WScript.Shell\")' + [Environment]::NewLine + 'WshShell.Run \"powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"\"%PS1_FILE%\"\" -CloudUrl \"\"%CONFIG_URL%\"\" -DeviceId \"\"morphy-host\"\" -Silent\", 0, False'; [System.IO.File]::WriteAllText('%STARTUP_VBS%', $vbs)"
echo [SETUP] Auto-start configured successfully!
echo.

echo ==========================================================
echo Starting SWITCH Host Bridge...
echo Keep this window open (or close it - it will auto-run on boot)
echo ==========================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1_FILE%" -CloudUrl "%CONFIG_URL%" -DeviceId "morphy-host"

echo.
pause
