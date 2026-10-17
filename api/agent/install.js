module.exports = async function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'switch-power.vercel.app';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const serverUrl = `${proto}://${host}`;

  const psScript = `# =====================================================================
# SWITCH Agent - Remote PC Power Controller (Vercel Cloud Edition)
# Runs silently on Windows 11 PC, polls Vercel Cloud API for commands
# =====================================================================

param(
    [string]$ServerUrl = "${serverUrl}",
    [string]$DeviceId = "rhu-it-pc",
    [int]$PollIntervalSeconds = 2,
    [switch]$Silent = $false
)

$HostName = $env:COMPUTERNAME
$Tls12 = [Net.SecurityProtocolType]::Tls12
[Net.ServicePointManager]::SecurityProtocol = $Tls12

if (-not $Silent) {
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "    SWITCH Remote Power Agent (Vercel Cloud Edition)" -ForegroundColor White
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host " Cloud Server: $ServerUrl" -ForegroundColor Green
    Write-Host " Device ID:    $DeviceId" -ForegroundColor Yellow
    Write-Host " Computer:     $HostName" -ForegroundColor Yellow
    Write-Host " Polling Every: $PollIntervalSeconds seconds" -ForegroundColor Gray
    Write-Host "==========================================================" -ForegroundColor Cyan
}

$ConsecutiveErrors = 0
$MaxConsecutiveErrors = 10

while ($true) {
    try {
        $Uri = "$ServerUrl/api/agent/poll?deviceId=$DeviceId&hostname=$([System.Uri]::EscapeDataString($HostName))"
        $Response = Invoke-RestMethod -Uri $Uri -Method Get -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop

        if ($ConsecutiveErrors -gt 0) {
            $ConsecutiveErrors = 0
            if (-not $Silent) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Reconnected to Vercel Cloud Hub (OK)" -ForegroundColor Green }
        }

        if ($Response -and $Response.success) {
            $Cmd = $Response.command

            if ($Cmd -eq "shutdown") {
                $Delay = if ($Response.delay) { $Response.delay } else { 10 }
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] [COMMAND] Remote Shutdown received! Delay: $Delay s" -ForegroundColor Red
                
                # Execute graceful Windows shutdown
                & shutdown.exe /s /t $Delay /c "SWITCH Remote Shutdown via Vercel Cloud"
                break
            }
            elseif ($Cmd -eq "abort") {
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] [COMMAND] Remote Abort received! Cancelling shutdown..." -ForegroundColor Yellow
                & shutdown.exe /a
            }
            elseif ($Cmd -eq "wake") {
                # Host bridge handling Wake-on-LAN
                $Mac = $Response.mac
                $Broadcast = if ($Response.broadcast) { $Response.broadcast } else { "192.168.254.255" }
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] [COMMAND] WoL Wake dispatched for $Mac on $Broadcast" -ForegroundColor Magenta
                
                # Native UDP WoL Packet Dispatch
                try {
                    $CleanMac = $Mac -replace '[^0-9A-Fa-f]', ''
                    if ($CleanMac.Length -eq 12) {
                        $MacBytes = for ($i = 0; $i -lt 12; $i += 2) { [Convert]::ToByte($CleanMac.Substring($i, 2), 16) }
                        $Packet = [byte[]]::new(102)
                        for ($i = 0; $i -lt 6; $i++) { $Packet[$i] = 0xFF }
                        for ($i = 6; $i -lt 102; $i += 6) { [Array]::Copy($MacBytes, 0, $Packet, $i, 6) }
                        
                        $UdpClient = [System.Net.Sockets.UdpClient]::new()
                        $UdpClient.EnableBroadcast = $true
                        $Targets = @($Broadcast, "192.168.254.255", "192.168.68.255", "255.255.255.255")
                        foreach ($t in $Targets) {
                            $EndPoint = [System.Net.IPEndPoint]::new([System.Net.IPAddress]::Parse($t), 9)
                            $UdpClient.Send($Packet, $Packet.Length, $EndPoint) | Out-Null
                        }
                        $UdpClient.Close()
                        Write-Host "   -> Magic Packet bursts sent across LAN!" -ForegroundColor Green
                    }
                } catch {
                    Write-Host "   -> WoL Broadcast Error: $_" -ForegroundColor Red
                }
            }
        }
    }
    catch {
        $ConsecutiveErrors++
        if ($ConsecutiveErrors -le 3 -and -not $Silent) {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Polling error: $_" -ForegroundColor DarkGray
        }
    }

    Start-Sleep -Seconds $PollIntervalSeconds
}
`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  return res.status(200).send(psScript);
};
