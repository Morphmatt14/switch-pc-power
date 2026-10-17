@echo off
setlocal EnableDelayedExpansion
title SWITCH Host Cloud Bridge - Morphy PC
cd /d "%~dp0"

echo ==========================================================
echo    SWITCH HOST CLOUD BRIDGE (Morphy PC)
echo ==========================================================
echo Starting background cloud bridge to connect Vercel to LAN...
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

:: Configure silent auto-start in Windows Startup
set "STARTUP_VBS=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\SWITCH-CloudBridge.vbs"
if not exist "%STARTUP_VBS%" (
    echo [SETUP] Registering SWITCH Cloud Bridge in Windows Startup...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$vbs = 'Set WshShell = CreateObject(\"WScript.Shell\")' + [Environment]::NewLine + 'WshShell.Run \"powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"\"%~dp0switch-cloud-bridge.ps1\"\" -CloudUrl \"\"%CONFIG_URL%\"\" -DeviceId \"\"morphy-host\"\" -Silent\", 0, False'; [System.IO.File]::WriteAllText('%STARTUP_VBS%', $vbs)"
    echo [SETUP] Auto-start configured successfully!
    echo.
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0switch-cloud-bridge.ps1" -CloudUrl "%CONFIG_URL%" -DeviceId "morphy-host"

echo.
pause
