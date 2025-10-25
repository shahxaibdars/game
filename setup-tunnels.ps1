# MEMORIX - Cloudflare Tunnel Setup (Free & Stable!)
# Windows PowerShell Version

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "MEMORIX - Cloudflare Tunnel Setup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if servers are running
Write-Host "Checking if servers are running..." -ForegroundColor Yellow
Write-Host ""

$serversOk = $true

$port8545 = Get-NetTCPConnection -LocalPort 8545 -State Listen -ErrorAction SilentlyContinue
if (-not $port8545) {
    Write-Host "X Blockchain (port 8545) not running" -ForegroundColor Red
    Write-Host "   Start: npx hardhat node" -ForegroundColor Gray
    $serversOk = $false
} else {
    Write-Host "OK Blockchain running (port 8545)" -ForegroundColor Green
}

$port3001 = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
if (-not $port3001) {
    Write-Host "X Backend (port 3001) not running" -ForegroundColor Red
    Write-Host "   Start: node server.js" -ForegroundColor Gray
    $serversOk = $false
} else {
    Write-Host "OK Backend running (port 3001)" -ForegroundColor Green
}

$port8000 = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if (-not $port8000) {
    Write-Host "X Frontend (port 8000) not running" -ForegroundColor Red
    Write-Host "   Start: cd public; python -m http.server 8000" -ForegroundColor Gray
    $serversOk = $false
} else {
    Write-Host "OK Frontend running (port 8000)" -ForegroundColor Green
}

Write-Host ""

if (-not $serversOk) {
    Write-Host "WARNING: Please start all servers first!" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Starting Cloudflare Tunnels..." -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting 3 tunnels (this takes ~10 seconds)..." -ForegroundColor Yellow
Write-Host ""

# Create temp directory for logs
$tempDir = $env:TEMP

# Start tunnels and capture output directly
$backendJob = Start-Job -ScriptBlock {
    cloudflared tunnel --url http://localhost:3001 2>&1 | Tee-Object -FilePath "$using:tempDir\cf-backend.log"
}

$frontendJob = Start-Job -ScriptBlock {
    cloudflared tunnel --url http://localhost:8000 2>&1 | Tee-Object -FilePath "$using:tempDir\cf-frontend.log"
}

$blockchainJob = Start-Job -ScriptBlock {
    cloudflared tunnel --url http://localhost:8545 2>&1 | Tee-Object -FilePath "$using:tempDir\cf-blockchain.log"
}

# Wait for tunnels to start and URLs to be generated
Start-Sleep -Seconds 12

# Extract URLs from job output
function Get-CloudflareUrl {
    param($job)
    
    $output = Receive-Job -Job $job -Keep
    $urlMatch = $output | Select-String -Pattern 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' | Select-Object -First 1
    
    if ($urlMatch) {
        return $urlMatch.Matches[0].Value
    }
    return $null
}

$backendUrl = Get-CloudflareUrl $backendJob
$frontendUrl = Get-CloudflareUrl $frontendJob
$blockchainUrl = Get-CloudflareUrl $blockchainJob

# Check if URLs were obtained
if (-not $backendUrl -or -not $frontendUrl -or -not $blockchainUrl) {
    Write-Host "ERROR: Failed to create tunnels. Check logs:" -ForegroundColor Red
    Write-Host "   $tempDir\cf-backend.log" -ForegroundColor Gray
    Write-Host "   $tempDir\cf-frontend.log" -ForegroundColor Gray
    Write-Host "   $tempDir\cf-blockchain.log" -ForegroundColor Gray
    
    Stop-Job -Job $backendJob -ErrorAction SilentlyContinue
    Stop-Job -Job $frontendJob -ErrorAction SilentlyContinue
    Stop-Job -Job $blockchainJob -ErrorAction SilentlyContinue
    Remove-Job -Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $frontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $blockchainJob -ErrorAction SilentlyContinue
    
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "SUCCESS: All tunnels created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "YOUR PUBLIC URLS:" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend:    $backendUrl" -ForegroundColor White
Write-Host "Frontend:   $frontendUrl" -ForegroundColor White
Write-Host "Blockchain: $blockchainUrl" -ForegroundColor White
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "UPDATING CONFIGURATION..." -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Update index.html with new URLs
$indexFile = "$env:USERPROFILE\Desktop\fyp\F25_115_R_ProofPlay\MEMORIX--Web3-Memory-Challenge\public\index.html"

if (Test-Path $indexFile) {
    # Backup original
    Copy-Item $indexFile "$indexFile.backup" -Force
    
    # Read content
    $content = Get-Content $indexFile -Raw
    
    # Update API_URL
    $content = $content -replace "const API_URL = '[^']*';", "const API_URL = '$backendUrl/api';"
    
    # Update blockchain RPC
    $content = $content -replace "new ethers\.providers\.JsonRpcProvider\('https?://[^']*'\)", "new ethers.providers.JsonRpcProvider('$blockchainUrl')"
    
    # Save
    $content | Set-Content $indexFile -NoNewline
    
    Write-Host "SUCCESS: Configuration updated automatically!" -ForegroundColor Green
    Write-Host ""
    Write-Host "   Backup saved: public\index.html.backup" -ForegroundColor Gray
} else {
    Write-Host "WARNING: Could not find index.html at:" -ForegroundColor Yellow
    Write-Host "   $indexFile" -ForegroundColor Gray
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "SHARE WITH FRIENDS:" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Game URL: $frontendUrl" -ForegroundColor Green
Write-Host ""
Write-Host "Instructions for friends:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Open: $frontendUrl" -ForegroundColor White
Write-Host ""
Write-Host "2. Install MetaMask: https://metamask.io/download/" -ForegroundColor White
Write-Host ""
Write-Host "3. Import test wallet (use ONE of these private keys):" -ForegroundColor White
Write-Host ""
Write-Host "   0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" -ForegroundColor Gray
Write-Host "   0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" -ForegroundColor Gray
Write-Host "   0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Connect wallet and play!" -ForegroundColor White
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "DATA COLLECTION:" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "All gameplay data saves to:" -ForegroundColor Yellow
Write-Host "$env:USERPROFILE\Desktop\fyp\F25_115_R_ProofPlay\MEMORIX--Web3-Memory-Challenge\dataset.csv" -ForegroundColor White
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "SUCCESS: Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: Keep this window open!" -ForegroundColor Yellow
Write-Host "   Closing it will stop all tunnels." -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C or close window when done to stop tunnels." -ForegroundColor Yellow
Write-Host ""

# Save info
$urlInfo = @"
Backend: $backendUrl
Frontend: $frontendUrl
Blockchain: $blockchainUrl
"@
$urlInfo | Set-Content "$tempDir\memorix-cloudflare-urls.txt"

Write-Host "Tunnels are active and stable..." -ForegroundColor Green
Write-Host ""

# Cleanup function
$cleanupScript = {
    Write-Host ""
    Write-Host "Stopping tunnels..." -ForegroundColor Yellow
    Get-Job | Where-Object { $_.Command -like "*cloudflared*" } | Stop-Job
    Get-Job | Where-Object { $_.Command -like "*cloudflared*" } | Remove-Job
    Remove-Item "$env:TEMP\cf-*.log" -Force -ErrorAction SilentlyContinue
    Remove-Item "$env:TEMP\memorix-cloudflare-urls.txt" -Force -ErrorAction SilentlyContinue
    Write-Host "Tunnels stopped!" -ForegroundColor Green
}

# Register cleanup on Ctrl+C
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action $cleanupScript | Out-Null

# Keep running
try {
    while ($true) {
        Start-Sleep -Seconds 5
        
        # Check if jobs are still running
        if ($backendJob.State -ne 'Running') {
            Write-Host "WARNING: Backend tunnel stopped unexpectedly!" -ForegroundColor Yellow
            break
        }
        if ($frontendJob.State -ne 'Running') {
            Write-Host "WARNING: Frontend tunnel stopped unexpectedly!" -ForegroundColor Yellow
            break
        }
        if ($blockchainJob.State -ne 'Running') {
            Write-Host "WARNING: Blockchain tunnel stopped unexpectedly!" -ForegroundColor Yellow
            break
        }
    }
} finally {
    & $cleanupScript
}