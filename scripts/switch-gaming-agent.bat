@echo off
setlocal EnableDelayedExpansion
title SWITCH Gaming PC Cloud Agent - RHU IT PC
cd /d "%~dp0"

echo ==========================================================
echo    SWITCH GAMING PC CLOUD AGENT (RHU IT PC)
echo ==========================================================
echo Target: RHU IT Gaming PC (rhu-it-pc)
echo.

set "CONFIG_URL=https://switch-app-morphmatt14s-projects.vercel.app"

if exist "%~dp0VERCEL_URL.txt" (
    set /p CONFIG_URL=<"%~dp0VERCEL_URL.txt"
)

echo Target Vercel Cloud: %CONFIG_URL%
echo.

set "AGENT_DIR=%LOCALAPPDATA%\SWITCH_Agent"
if not exist "%AGENT_DIR%" mkdir "%AGENT_DIR%"
set "PS1_FILE=%AGENT_DIR%\switch-gaming-agent.ps1"

:: 1. Copy local file if present
if exist "%~dp0switch-gaming-agent.ps1" (
    copy /y "%~dp0switch-gaming-agent.ps1" "%PS1_FILE%" >nul 2>&1
)

:: 2. If missing, auto-download directly from Vercel Cloud!
if not exist "%PS1_FILE%" (
    echo [SETUP] Downloading SWITCH Cloud Agent from Vercel...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; try { (New-Object Net.WebClient).DownloadFile('${CONFIG_URL}/agent', '%PS1_FILE%') } catch { Write-Host 'Download error: ' $_.Exception.Message }"
)

:: Register silent background auto-start on Windows boot
set "STARTUP_VBS=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\SWITCH-GamingAgent.vbs"
if not exist "%STARTUP_VBS%" (
    echo [SETUP] Registering Gaming Agent in Windows Startup...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$vbs = 'Set WshShell = CreateObject(\"WScript.Shell\")' + [Environment]::NewLine + 'WshShell.Run \"powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"\"%PS1_FILE%\"\" -ServerUrl \"\"%CONFIG_URL%\"\" -DeviceId \"\"rhu-it-pc\"\" -Silent\", 0, False'; [System.IO.File]::WriteAllText('%STARTUP_VBS%', $vbs)"
    echo [SETUP] Auto-start configured successfully!
    echo.
)

echo ==========================================================
echo Starting SWITCH Gaming Agent...
echo Keep this window open or minimized (runs in background)
echo ==========================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1_FILE%" -ServerUrl "%CONFIG_URL%" -DeviceId "rhu-it-pc"

pause
