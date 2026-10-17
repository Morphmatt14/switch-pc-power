# =====================================================================
# SWITCH Cloud Agent - RHU IT Gaming PC
# Connects Gaming PC directly to Vercel Cloud for 1-click shutdown
# =====================================================================

param(
    [string]$CloudUrl = "https://switch-pc-power.vercel.app",
    [string]$DeviceId = "rhu-it-pc",
    [int]$PollInterval = 2,
    [switch]$Silent = $false
)

$HostName = $env:COMPUTERNAME
$Tls12 = [Net.SecurityProtocolType]::Tls12
[Net.SecurityPointManager]::SecurityProtocol = $Tls12

$UrlConfigFile = Join-Path $PSScriptRoot "VERCEL_URL.txt"
if (Test-Path $UrlConfigFile) {
    $SavedUrl = (Get-Content $UrlConfigFile -Raw).Trim()
    if ($SavedUrl -match "^https?://") {
        $CloudUrl = $SavedUrl
    }
}

if (-not $Silent) {
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "   SWITCH CLOUD AGENT (RHU IT Gaming PC)                  " -ForegroundColor White
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host " Cloud Hub:  $CloudUrl" -ForegroundColor Green
    Write-Host " Device ID:  $DeviceId" -ForegroundColor Yellow
    Write-Host " Hostname:   $HostName" -ForegroundColor Yellow
    Write-Host " Polling:    Every $PollInterval seconds" -ForegroundColor Gray
    Write-Host " Mode:       Listening for Cloud Remote Shutdown" -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Cyan
}

while ($true) {
    try {
        $Uri = "$CloudUrl/api/agent/poll?deviceId=$DeviceId&hostname=$([System.Uri]::EscapeDataString($HostName))"
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop

        if ($Response -and $Response.success) {
            $Cmd = $Response.command

            if ($Cmd -eq "shutdown") {
                $Delay = if ($Response.delay) { $Response.delay } else { 10 }
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] [COMMAND] Shutdown command received! Powering off in $Delay seconds..." -ForegroundColor Red
                & shutdown.exe /s /t $Delay /c "SWITCH Remote Shutdown via Vercel Cloud"
                break
            }
            elseif ($Cmd -eq "abort") {
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] [COMMAND] Shutdown aborted." -ForegroundColor Yellow
                & shutdown.exe /a
            }
        }
    }
    catch {
        # Quiet heartbeat error handling
    }

    Start-Sleep -Seconds $PollInterval
}
