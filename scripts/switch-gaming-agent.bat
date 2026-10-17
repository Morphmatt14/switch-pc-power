@echo off
setlocal EnableDelayedExpansion
title SWITCH Gaming PC Cloud Agent
cd /d "%~dp0"

echo ==========================================================
echo    SWITCH GAMING PC CLOUD AGENT
echo ==========================================================
echo.

set "CONFIG_URL="
if exist "%~dp0VERCEL_URL.txt" (
    set /p CONFIG_URL=<"%~dp0VERCEL_URL.txt"
)

if "%CONFIG_URL%"=="" (
    set "CONFIG_URL=https://switch-pc-power.vercel.app"
)

echo Target Vercel Cloud: %CONFIG_URL%
echo.

set "AGENT_DIR=%LOCALAPPDATA%\SWITCH_Agent"
if not exist "%AGENT_DIR%" mkdir "%AGENT_DIR%"
set "PS1_FILE=%AGENT_DIR%\switch-gaming-agent.ps1"

if exist "%~dp0switch-gaming-agent.ps1" (
    copy /y "%~dp0switch-gaming-agent.ps1" "%PS1_FILE%" >nul 2>&1
)

:: Register silent background auto-start on Windows boot
set "STARTUP_VBS=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\SWITCH-GamingAgent.vbs"
if not exist "%STARTUP_VBS%" (
    echo [SETUP] Registering Gaming Agent in Windows Startup...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$vbs = 'Set WshShell = CreateObject(\"WScript.Shell\")' + [Environment]::NewLine + 'WshShell.Run \"powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"\"%PS1_FILE%\"\" -CloudUrl \"\"%CONFIG_URL%\"\" -DeviceId \"\"rhu-it-pc\"\" -Silent\", 0, False'; [System.IO.File]::WriteAllText('%STARTUP_VBS%', $vbs)"
    echo [SETUP] Auto-start configured successfully!
    echo.
)

echo Starting SWITCH Gaming Agent...
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1_FILE%" -CloudUrl "%CONFIG_URL%" -DeviceId "rhu-it-pc"

pause
