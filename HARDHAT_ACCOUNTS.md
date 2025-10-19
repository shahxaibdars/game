# Hardhat Default Test Accounts

All accounts start with **10,000 ETH** on local Hardhat node.

## 🔐 Account #0 - DEPLOYER (DO NOT USE FOR PLAYING)
```
Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
Role: Contract owner, used by server.js to pay gas fees
```

---

## 🎮 Player Accounts (Safe to Use)

### Account #1 - Player 1
```
Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

### Account #2 - Player 2
```
Address: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
Private Key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
```

### Account #3 - Player 3
```
Address: 0x90F79bf6EB2c4f870365E785982E1f101E93b906
Private Key: 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6
```

### Account #4 - Player 4
```
Address: 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65
Private Key: 0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a
```

### Account #5 - Player 5
```
Address: 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc
Private Key: 0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba
```

### Account #6 - Player 6
```
Address: 0x976EA74026E726554dB657fA54763abd0C3a0aa9
Private Key: 0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e
```

### Account #7 - Player 7
```
Address: 0x14dC79964da2C08b23698B3D3cc7Ca32193d9955
Private Key: 0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356
```

### Account #8 - Player 8
```
Address: 0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f
Private Key: 0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97
```

### Account #9 - Player 9
```
Address: 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720
Private Key: 0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6
```

---

## 📝 How to Use

### For Players:
1. **Add Hardhat network to MetaMask:**
   - Network Name: `Hardhat Local`
   - RPC URL: `http://localhost:8545` (or Cloudflare tunnel URL)
   - Chain ID: `31337`
   - Currency Symbol: `ETH`

2. **Import account** (choose Account #1-9, NOT #0):
   - MetaMask → Import Account → Private Key
   - Paste one of the player private keys above

3. **Play the game** and earn rewards!

### For Developers:
- Account #0 is automatically used by `server.js`
- Funds contract with rewards
- Pays gas for all player transactions
- Do not import to MetaMask for playing

---

## 💡 Tips

- **Multiple simultaneous players:** Each person can use a different account
- **Bot testing:** Use some accounts for automated bot testing
- **Data collection:** 9 player accounts = diverse dataset
- **Balance check:** Each account shows 10,000 ETH initially in MetaMask

---

## ⚠️ Security Note

**These are DEFAULT Hardhat test accounts - NEVER use on mainnet or with real funds!**

They are publicly known and anyone can access them. Only safe for local development.
