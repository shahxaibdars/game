# 🎮 MEMORIX - Web3 Memory Game

## Quick Setup Guide

---

## 🔗 Game Access

**Game URL:** https://salaries-decimal-supply-goal.trycloudflare.com

---

## 📋 Player Setup

### Step 1: Install MetaMask
- Visit: https://metamask.io/download/
- Install browser extension and complete setup

### Step 2: Add Hardhat Local Network to MetaMask
1. Open MetaMask → Click network dropdown → "Add Network"
2. Choose "Add a network manually"
3. Enter these details:
   ```
   Network Name: Hardhat Local
   RPC URL: http://localhost:8545
   Chain ID: 31337
   Currency Symbol: ETH
   ```
   **OR** (for remote players using Cloudflare tunnel):
   ```
   Network Name: Hardhat via Tunnel
   RPC URL: https://[blockchain-tunnel-url].trycloudflare.com
   Chain ID: 31337
   Currency Symbol: ETH
   ```
4. Click "Save"

### Step 3: Import Test Player Account
⚠️ **Important:** Use **Account #1 or #2** (NOT Account #0 - that's the deployer)

1. In MetaMask → Click account icon → "Import Account"
2. Select "Private Key"
3. Paste one of these **PLAYER** keys:
   ```
   Account #1: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
   Account #2: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
   Account #3: 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6
   ```
4. Click "Import"
5. Optional: Rename account to "Player 1", "Player 2", etc.

### Step 4: Play
1. Switch to "Hardhat Local" network in MetaMask
2. Open game URL above
3. Click "Connect Wallet"
4. Approve MetaMask connection
5. Choose game mode (INFINITE or DAILY CHALLENGE)

**Note:** Each account starts with 10,000 test ETH. You can withdraw earned rewards!

---

## 🔧 Developer Setup: Cloudflare Tunnel

### Installation
```bash
wget -O /tmp/cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i /tmp/cloudflared.deb
```

### Running Locally

⚠️ **Important:** Your computer must remain on and connected to the internet while others are playing. Cloudflare tunnels forward traffic to your local servers.

**Start Local Servers (3 terminals):**
```bash
# Terminal 1 - Blockchain
npx hardhat node

# Terminal 2 - Backend
node server.js

# Terminal 3 - Frontend
cd public && python3 -m http.server 8000
```

**Setup Tunnels:**
```bash
# Terminal 4 - Automated setup
./start-cloudflare-tunnels.sh
```

The script automatically:
- Creates public URLs for backend, frontend, and blockchain
- Updates configuration files
- Displays shareable game URL
- **Requires your computer to stay on**

**Manual Setup (Alternative):**
```bash
cloudflared tunnel --url http://localhost:3001  # Backend
cloudflared tunnel --url http://localhost:8000  # Frontend
cloudflared tunnel --url http://localhost:8545  # Blockchain
```

Then manually update `public/index.html`:
- Line 254: `API_URL` with backend tunnel URL
- Line 892: Blockchain RPC with blockchain tunnel URL

---

## 🔒 Security

- Test private keys for development only
- Contains test ETH (not real cryptocurrency)
- Never use for real transactions

## 👥 Account Roles

**Account #0 (Owner/Deployer):**
- Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Role: Contract owner, pays all gas fees
- **DO NOT use for playing** - used by backend server

**Accounts #1-9 (Players):**
- Each has 10,000 ETH for playing and testing
- Use these accounts to play the game
- Can withdraw earned rewards
- Multiple people can use different accounts simultaneously

---

## 📊 Data Collection

Collected for ML anti-bot training:
- Click patterns and timing
- Reaction times and accuracy
- Device fingerprints

---

**Repository:** https://github.com/Mary-yumm/FYP-F25-115-R-ProofPlay
