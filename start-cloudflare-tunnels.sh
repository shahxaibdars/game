#!/bin/bash

# MEMORIX - Cloudflare Tunnel Setup (Free & Stable!)
# No account needed, completely free

echo "======================================"
echo "🎮 MEMORIX - Cloudflare Tunnel Setup"
echo "======================================"
echo ""

# Check if servers are running
echo "📋 Checking if servers are running..."
echo ""

SERVERS_OK=true

if ! lsof -Pi :8545 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "❌ Blockchain (port 8545) not running"
    echo "   Start: npx hardhat node"
    SERVERS_OK=false
else
    echo "✅ Blockchain running (port 8545)"
fi

if ! lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "❌ Backend (port 3001) not running"
    echo "   Start: node server.js"
    SERVERS_OK=false
else
    echo "✅ Backend running (port 3001)"
fi

if ! lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "❌ Frontend (port 8000) not running"
    echo "   Start: cd public && python3 -m http.server 8000"
    SERVERS_OK=false
else
    echo "✅ Frontend running (port 8000)"
fi

echo ""

if [ "$SERVERS_OK" = false ]; then
    echo "⚠️  Please start all servers first!"
    exit 1
fi

echo "======================================"
echo "🚀 Starting Cloudflare Tunnels..."
echo "======================================"
echo ""
echo "Starting 3 tunnels (this takes ~10 seconds)..."
echo ""

# Start tunnels in background
cloudflared tunnel --url http://localhost:3001 > /tmp/cf-backend.log 2>&1 &
BACKEND_PID=$!

cloudflared tunnel --url http://localhost:8000 > /tmp/cf-frontend.log 2>&1 &
FRONTEND_PID=$!

cloudflared tunnel --url http://localhost:8545 > /tmp/cf-blockchain.log 2>&1 &
BLOCKCHAIN_PID=$!

# Wait for tunnels to start
sleep 12

# Extract URLs from logs
BACKEND_URL=$(grep -o 'https://[^[:space:]]*\.trycloudflare\.com' /tmp/cf-backend.log | head -1)
FRONTEND_URL=$(grep -o 'https://[^[:space:]]*\.trycloudflare\.com' /tmp/cf-frontend.log | head -1)
BLOCKCHAIN_URL=$(grep -o 'https://[^[:space:]]*\.trycloudflare\.com' /tmp/cf-blockchain.log | head -1)

# Check if URLs were obtained
if [ -z "$BACKEND_URL" ] || [ -z "$FRONTEND_URL" ] || [ -z "$BLOCKCHAIN_URL" ]; then
    echo "❌ Failed to create tunnels. Check logs:"
    echo "   cat /tmp/cf-backend.log"
    echo "   cat /tmp/cf-frontend.log"
    echo "   cat /tmp/cf-blockchain.log"
    kill $BACKEND_PID $FRONTEND_PID $BLOCKCHAIN_PID 2>/dev/null
    exit 1
fi

echo "✅ All tunnels created successfully!"
echo ""
echo "======================================"
echo "📡 YOUR PUBLIC URLS:"
echo "======================================"
echo ""
echo "Backend:    $BACKEND_URL"
echo "Frontend:   $FRONTEND_URL"
echo "Blockchain: $BLOCKCHAIN_URL"
echo ""
echo "======================================"
echo ""
echo "⚙️  UPDATING CONFIGURATION..."
echo "======================================"
echo ""

# Update index.html with new URLs
INDEX_FILE="$HOME/Desktop/fyp/F25_115_R_ProofPlay/MEMORIX--Web3-Memory-Challenge/public/index.html"

# Backup original
cp "$INDEX_FILE" "$INDEX_FILE.backup"

# Update API_URL
sed -i "s|const API_URL = '.*';|const API_URL = '$BACKEND_URL/api';|" "$INDEX_FILE"

# Update blockchain RPC
sed -i "s|new ethers.providers.JsonRpcProvider('http[s]*://[^']*')|new ethers.providers.JsonRpcProvider('$BLOCKCHAIN_URL')|g" "$INDEX_FILE"

echo "✅ Configuration updated automatically!"
echo ""
echo "   Backup saved: public/index.html.backup"
echo ""
echo "======================================"
echo "📤 SHARE WITH FRIENDS:"
echo "======================================"
echo ""
echo "🎮 Game URL: $FRONTEND_URL"
echo ""
echo "Instructions for friends:"
echo ""
echo "1. Open: $FRONTEND_URL"
echo ""
echo "2. Install MetaMask: https://metamask.io/download/"
echo ""
echo "3. Import test wallet (use ONE of these private keys):"
echo ""
echo "   0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
echo "   0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
echo "   0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
echo ""
echo "4. Connect wallet and play!"
echo ""
echo "======================================"
echo "💾 DATA COLLECTION:"
echo "======================================"
echo ""
echo "All gameplay data saves to:"
echo "~/Desktop/fyp/F25_115_R_ProofPlay/MEMORIX--Web3-Memory-Challenge/dataset.csv"
echo ""
echo "Monitor it with:"
echo "  watch -n 5 'wc -l dataset.csv'"
echo ""
echo "======================================"
echo ""
echo "✅ Setup Complete!"
echo ""
echo "⚠️  IMPORTANT: Keep this terminal open!"
echo "   Closing it will stop all tunnels."
echo ""
echo "Press Ctrl+C when done to stop tunnels."
echo ""

# Save info
cat > /tmp/memorix-cloudflare-urls.txt << EOF
Backend: $BACKEND_URL
Frontend: $FRONTEND_URL
Blockchain: $BLOCKCHAIN_URL
EOF

echo "$BACKEND_PID" > /tmp/cf-backend.pid
echo "$FRONTEND_PID" > /tmp/cf-frontend.pid
echo "$BLOCKCHAIN_PID" > /tmp/cf-blockchain.pid

# Cleanup on exit
trap "echo ''; echo '🛑 Stopping tunnels...'; kill $BACKEND_PID $FRONTEND_PID $BLOCKCHAIN_PID 2>/dev/null; rm -f /tmp/cf-*.pid /tmp/cf-*.log /tmp/memorix-cloudflare-urls.txt; echo '✅ Tunnels stopped!'; exit 0" INT TERM

# Keep running
echo "🔄 Tunnels are active and stable..."
wait
