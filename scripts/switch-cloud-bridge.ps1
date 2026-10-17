# =====================================================================
# SWITCH Cloud Bridge - Host PC (Morphy PC)
# Bridges Vercel Cloud Controller to local network for WoL & Power
# =====================================================================

param(
    [string]$CloudUrl = "https://switch-pc-power.vercel.app",
    [string]$DeviceId = "morphy-host",
    [int]$PollInterval = 2,
    [switch]$Silent = $false
)

$HostName = $env:COMPUTERNAME
$Tls12 = [Net.SecurityProtocolType]::Tls12
[Net.SecurityPointManager]::SecurityProtocol = $Tls12

# Function to transmit native Wake-on-LAN packets across local network
function Send-WakeOnLanPacket {
    param(
        [string]$MacAddress,
        [string]$BroadcastAddress = "192.168.254.255"
    )
    try {
        $CleanMac = $MacAddress -replace '[^0-9A-Fa-f]', ''
        if ($CleanMac.Length -ne 12) {
            Write-Host "[WoL] Invalid MAC format: $MacAddress" -ForegroundColor Red
            return
        }

        $MacBytes = for ($i = 0; $i -lt 12; $i += 2) { [Convert]::ToByte($CleanMac.Substring($i, 2), 16) }
        $Packet = [byte[]]::new(102)
        for ($i = 0; $i -lt 6; $i++) { $Packet[$i] = 0xFF }
        for ($i = 6; $i -lt 102; $i += 6) { [Array]::Copy($MacBytes, 0, $Packet, $i, 6) }

        $UdpClient = [System.Net.Sockets.UdpClient]::new()
        $UdpClient.EnableBroadcast = $true

        # Targets: primary broadcast, local subnet, gaming pc subnet, global broadcast
        $Targets = @($BroadcastAddress, "192.168.254.255", "192.168.68.255", "192.168.254.112", "192.168.68.62", "255.255.255.255")
        
        for ($burst = 0; $burst -lt 4; $burst++) {
            foreach ($target in $Targets) {
                try {
                    $Ep9 = [System.Net.IPEndPoint]::new([System.Net.IPAddress]::Parse($target), 9)
                    $Ep7 = [System.Net.IPEndPoint]::new([System.Net.IPAddress]::Parse($target), 7)
                    $UdpClient.Send($Packet, $Packet.Length, $Ep9) | Out-Null
                    $UdpClient.Send($Packet, $Packet.Length, $Ep7) | Out-Null
                } catch {}
            }
            Start-Sleep -Milliseconds 100
        }
        $UdpClient.Close()
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] [WoL] Magic Packet bursts transmitted for $MacAddress!" -ForegroundColor Green
    } catch {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] [WoL] Failed to transmit: $_" -ForegroundColor Red
    }
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   SWITCH HOST CLOUD BRIDGE (Morphy PC - Windows 11)     " -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Cloud Hub:  $CloudUrl" -ForegroundColor Green
Write-Host " Device ID:  $DeviceId" -ForegroundColor Yellow
Write-Host " Hostname:   $HostName" -ForegroundColor Yellow
Write-Host " Polling:    Every $PollInterval seconds" -ForegroundColor Gray
Write-Host " Mode:       Listening for Cloud WoL & Shutdown commands" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$UrlConfigFile = Join-Path $PSScriptRoot "VERCEL_URL.txt"
if (Test-Path $UrlConfigFile) {
    $SavedUrl = (Get-Content $UrlConfigFile -Raw).Trim()
    if ($SavedUrl -match "^https?://") {
        $CloudUrl = $SavedUrl
        Write-Host "[CONFIG] Loaded Cloud URL from VERCEL_URL.txt: $CloudUrl" -ForegroundColor Cyan
    }
}

while ($true) {
    try {
        $Uri = "$CloudUrl/api/agent/poll?deviceId=$DeviceId&hostname=$([System.Uri]::EscapeDataString($HostName))&role=host"
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop

        if ($Response -and $Response.success) {
            $Cmd = $Response.command

            if ($Cmd -eq "wake") {
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] [COMMAND] WoL Wake received for $($Response.targetName) ($($Response.mac))" -ForegroundColor Magenta
                Send-WakeOnLanPacket -MacAddress $Response.mac -BroadcastAddress $Response.broadcast
            }
            elseif ($Cmd -eq "shutdown") {
                $Delay = if ($Response.delay) { $Response.delay } else { 10 }
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] [COMMAND] Local Host Shutdown received! Delay: $Delay s" -ForegroundColor Red
                & shutdown.exe /s /t $Delay /c "SWITCH Remote Shutdown via Vercel Cloud"
                break
            }
            elseif ($Cmd -eq "abort") {
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] [COMMAND] Remote Abort received! Cancelling shutdown..." -ForegroundColor Yellow
                & shutdown.exe /a
            }
        }
    }
    catch {
        # Quiet heartbeat error handling
    }

    Start-Sleep -Seconds $PollInterval
}
