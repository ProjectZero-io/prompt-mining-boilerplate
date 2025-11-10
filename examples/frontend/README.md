# Frontend Integration Examples

This directory contains **complete, standalone examples** demonstrating how to integrate Metamask wallet functionality with the Prompt Mining Boilerplate for reward-based prompt submission.

##  Examples Overview

### 1. `user-signed-transaction.html` - User-Signed Transaction Mode (RECOMMENDED)

**What it does:**
- User connects Metamask wallet
- User submits a prompt
- Backend provides PZERO authorization
- **User signs the blockchain transaction** with Metamask
- **User pays gas fees**
- User receives Activity Points directly

**When to use:**
- Public LLM services
- Decentralized applications
- Community-driven platforms
- Services where users expect Web3 interactions
- When you want users to have full control and ownership

**User Experience:**
- User owns the transaction (true Web3)
- Transparent on-chain record
- Requires Metamask and gas tokens
- UX friction (Metamask popup for transaction)

---

### 2. `metatx-gasless-minting.html` - Gasless Meta-Transaction Mode (EIP-2771)

**What it does:**
- User connects Metamask wallet
- User signs an **EIP-712 typed message** (not a transaction)
- **No gas fees for user** (message signing is free)
- Backend (relayer) submits meta-transaction through ERC2771 forwarder
- **Company pays gas fees**
- User receives Activity Points without blockchain interaction

**When to use:**
- Enterprise deployments
- Onboarding new users to Web3
- High-volume services where you want to subsidize gas
- Services targeting non-crypto users
- When you want seamless UX without gas fees

**User Experience:**
- No gas fees for users
- Seamless UX (no transaction signing)
- Cryptographically secure (EIP-712 signatures)
- User maintains proof of authorship
- Company pays all gas fees
- Requires relayer infrastructure

---

##  Which Example Should I Use?

| Requirement | Recommended Example |
|-------------|---------------------|
| Users should pay their own gas | `user-signed-transaction.html` |
| Company will subsidize gas fees | `metatx-gasless-minting.html` |
| True decentralized Web3 experience | `user-signed-transaction.html` |
| Onboarding non-crypto users | `metatx-gasless-minting.html` |
| Users expect to sign blockchain transactions | `user-signed-transaction.html` |
| Seamless UX without Metamask transaction popups | `metatx-gasless-minting.html` |
| High-volume service with optimized gas | `metatx-gasless-minting.html` |

---

##  Prerequisites

### For All Examples

1. **Metamask Browser Extension**
   - Install from: https://metamask.io
   - Create or import a wallet
   - Keep your seed phrase secure

2. **Backend API Running**
   - The Prompt Mining Boilerplate backend must be running
   - Default: `http://localhost:3000`
   - See main README.md for backend setup

3. **Contract Addresses**
   - PromptMiner contract address
   - ActivityPoints token address
   - PromptDO data object address
   - Provided by ProjectZero or from your deployment

4. **RPC Endpoint**
   - Configured in backend `.env`
   - Nexera RPC or your own node

### For User-Signed Transaction Example

5. **Test tNXRA (Testnet)**
   - Get tNXRA from Nexera testnet faucet
   - Contact Nexera team for testnet tokens
   - Need ~0.01 tNXRA for gas fees

6. **Network Configuration**
   - Add Nexera testnet to Metamask:
     - Network Name: Nexera Testnet
     - RPC URL: https://rpc.testnet.nexera.network
     - Chain ID: 72080
     - Currency Symbol: tNXRA
     - Block Explorer: https://explorer.testnet.nexera.network

### For Meta-Transaction Example

5. **Backend Wallet Funded**
   - Relayer's backend wallet needs tNXRA (testnet) or NXRA (mainnet) for gas
   - Configure `PM_PRIVATE_KEY` in backend `.env`
   - Monitor wallet balance regularly

---

##  Configuration

### Step 1: Update Configuration in HTML Files

Both examples have a `CONFIG` section at the top of the JavaScript. Update these values:

**`user-signed-transaction.html`:**
```javascript
const CONFIG = {
  BACKEND_API_URL: 'http://localhost:3000',           // Your backend URL
  PROMPT_MINER_ADDRESS: '0xYourContractAddress...',   // UPDATE THIS
  CHAIN_ID: 72080,                                    // Nexera testnet
  BLOCK_EXPLORER_URL: 'https://explorer.testnet.nexera.network',
  API_KEY: ''                                         // Optional
};
```

**`metatx-gasless-minting.html`:**
```javascript
const CONFIG = {
  BACKEND_API_URL: 'http://localhost:3000',           // Your backend URL
  API_KEY: '',                                        // Optional
  CHAIN_ID: 72080,                                    // Nexera testnet
  BLOCK_EXPLORER_URL: 'https://explorer.testnet.nexera.network'
};
```

### Step 2: Configure Backend

Ensure your backend `.env` is properly configured:

```env
# PZERO B2B Credentials
PM_PZERO_API_KEY=your-pzero-api-key
PM_PZERO_CLIENT_ID=your-client-id

# Blockchain Configuration
PM_RPC_URL=https://rpc.testnet.nexera.network
PM_CHAIN_ID=72080

# Contract Addresses
PM_PROMPT_MINER_ADDRESS=0x...
PM_ACTIVITY_POINTS_ADDRESS=0x...
PM_PROMPT_DO_ADDRESS=0x...
PM_DATA_INDEX_ADDRESS=0x...

# For Meta-Transaction Example (Gasless Minting)
PM_PRIVATE_KEY=0x...  # Relayer wallet private key
```

### Step 3: Start Backend Server

```bash
cd /path/to/prompt-mining-boilerplate
npm install
npm run dev
```

Backend should be running on `http://localhost:3000`

---

## How to Run the Examples

### Option 1: Open Directly in Browser

1. Navigate to the example file:
   ```bash
   cd examples/frontend
   ```

2. Open in browser:
   - **macOS:** `open user-signed-transaction.html` or `open metatx-gasless-minting.html`
   - **Linux:** `xdg-open user-signed-transaction.html` or `xdg-open metatx-gasless-minting.html`
   - **Windows:** `start user-signed-transaction.html` or `start metatx-gasless-minting.html`
   - Or drag the file into your browser

3. Metamask should prompt you to connect

### Option 2: Serve with Local HTTP Server

For better compatibility and to avoid CORS issues:

```bash
# Using Python 3
cd examples/frontend
python3 -m http.server 8080

# Using Node.js (if http-server is installed)
npx http-server -p 8080

# Then open in browser
# http://localhost:8080/user-signed-transaction.html
# http://localhost:8080/metatx-gasless-minting.html
```

### Option 3: Integrate Into Your Application

Copy the JavaScript logic from the examples into your React, Vue, or other frontend framework:

**React Example:**
```jsx
import { ethers } from 'ethers';

async function connectWallet() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  return { provider, signer, address };
}

async function mintPrompt(prompt, signer, address) {
  // Get authorization from backend
  const response = await fetch('http://localhost:3000/api/prompts/authorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      author: address,
      activityPoints: '10'
    })
  });

  const { authorization, mintData } = await response.json();

  // Sign transaction with user's wallet
  const contract = new ethers.Contract(
    PROMPT_MINER_ADDRESS,
    PROMPT_MINER_ABI,
    signer
  );

  const tx = await contract.mint(
    mintData.prompt,
    mintData.author,
    ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [mintData.activityPoints]),
    authorization.signature,
    authorization.nonce
  );

  return await tx.wait();
}
```

---

##  Expected Behavior

### User-Signed Transaction Example

1. **Connect Wallet**
   - Click "Connect Metamask"
   - Metamask popup asks to connect
   - Wallet address displays

2. **Submit Prompt**
   - Enter prompt text
   - Enter reward amount (or use default)
   - Click "Mint Prompt & Earn Rewards"

3. **Backend Authorization**
   - Status shows: "Requesting authorization from backend..."
   - Backend hashes prompt and gets PZERO signature
   - Takes 1-3 seconds typically

4. **User Signs Transaction**
   - Metamask popup shows transaction details
   - Shows gas fee estimate
   - User confirms transaction

5. **Wait for Confirmation**
   - Status shows: "Waiting for confirmation..."
   - Typically takes 15-30 seconds on testnet
   - Longer on mainnet during high congestion

6. **Success**
   - Green success message displays
   - Transaction hash link to block explorer
   - Prompt hash shown
   - Activity Points credited to wallet

---

##  Troubleshooting

### Metamask Not Detected

**Error:** "Metamask is not installed"

**Solutions:**
- Install Metamask browser extension from https://metamask.io
- Refresh the page after installation
- Try a different browser (Chrome, Firefox, Brave)
- Check if Metamask is enabled (not disabled in browser extensions)

---

### Wrong Network

**Error:** "Please switch to the correct network"

**Solutions:**
- Open Metamask
- Click network dropdown at top
- Select "Nexera Testnet" (or your configured network)
- Or add custom network manually:
  - Settings → Networks → Add Network
  - Fill in Nexera testnet details (see Prerequisites section)

---

### Insufficient Funds (User-Signed Example)

**Error:** "Insufficient funds for gas fees"

**Solutions:**
- Get test tNXRA from Nexera testnet faucet
- Contact Nexera team for testnet tokens
- Check wallet balance in Metamask
- Ensure you're on Nexera testnet (testnet tokens are free)
- Try reducing gas limit (advanced)

---

### Backend Connection Failed

**Error:** "Backend error: 500" or "Failed to fetch"

**Solutions:**
- Check backend is running: `curl http://localhost:3000/health`
- Verify `BACKEND_API_URL` in CONFIG matches your backend
- Check CORS settings if running on different domain
- Check backend logs for errors
- Verify `.env` configuration in backend

---

### Authorization Failed

**Error:** "PZERO authorization failed" (402)

**Solutions:**
- PZERO monthly quota exceeded
- Check quota: `curl http://localhost:3000/api/quota`
- Upgrade PZERO tier at https://gateway.pzero.io
- Wait for monthly quota reset
- Verify `PM_PZERO_API_KEY` and `PM_PZERO_CLIENT_ID` in backend `.env`

---

### Transaction Rejected

**Error:** "Transaction was rejected by user"

**Solutions:**
- This is normal if user clicked "Reject" in Metamask
- User can try again by clicking the mint button
- Ensure gas fee estimate looks reasonable
- Check network isn't congested (very high gas)

---

### Contract Address Not Set

**Error:** "Please update PROMPT_MINER_ADDRESS"

**Solutions:**
- Open the HTML file in a text editor
- Find the CONFIG section
- Update `PM_PROMPT_MINER_ADDRESS` with your deployed contract address
- Save and refresh browser

---

##  Integration Into Production

### Security Considerations

1. **Never Hardcode Secrets**
   - Don't include API keys or private keys in frontend code
   - Use environment variables for backend
   - Use secure vaults (AWS KMS, HashiCorp Vault) for production keys

2. **Validate All Input**
   - Backend must validate all prompts, addresses, and amounts
   - Check for SQL injection, XSS, etc.
   - Implement rate limiting (already included in boilerplate)

3. **HTTPS Only**
   - Always use HTTPS in production
   - Metamask requires HTTPS for Web3 features
   - Use valid SSL certificates

4. **CORS Configuration**
   - Configure backend CORS to only allow your frontend domain
   - Don't use `*` wildcard in production

### Production Checklist

- [ ] Update all contract addresses to mainnet
- [ ] Change `PM_CHAIN_ID` to 7208 (Nexera mainnet)
- [ ] Update `PM_BACKEND_API_URL` to production URL (HTTPS)
- [ ] Update `PM_BLOCK_EXPLORER_URL` to Nexera mainnet explorer
- [ ] Implement proper error tracking (Sentry, etc.)
- [ ] Add analytics (track mints, errors, user flow)
- [ ] Test with real NXRA on mainnet (small amounts first)
- [ ] Monitor backend wallet balance (for sponsored mode)
- [ ] Set up alerting for low balance, high error rates
- [ ] Implement reward calculation logic in backend
- [ ] Add fraud prevention mechanisms
- [ ] Load test backend with expected traffic
- [ ] Create user documentation
- [ ] Monitor relayer wallet balance (for meta-transaction mode)

### Customization Ideas

**UI/UX Improvements:**
- Add loading animations and better feedback
- Show estimated gas costs before transaction
- Display user's Activity Points balance
- Show transaction history
- Add prompt preview before submission
- Implement prompt quality indicators

**Feature Additions:**
- Prompt categories/tags
- Quality scoring display
- Leaderboards (top contributors)
- User profiles and stats
- Batch prompt submission
- Prompt templates
- Social sharing of prompts

**Advanced Integrations:**
- WalletConnect for mobile wallets
- Multi-wallet support (MetaMask, Coinbase Wallet, etc.)
- ENS name resolution (show user.eth instead of 0x...)
- IPFS integration for long prompts
- Real-time updates via WebSockets
- Push notifications for successful mints

---

##  Support

- **Documentation:** See main [README.md](../../README.md) and [docs/architecture.md](../../docs/architecture.md)
- **Backend Issues:** Check backend logs and [CLAUDE.md](../../CLAUDE.md) for development guidelines
- **PZERO API:** https://gateway.pzero.io
- **Smart Contracts:** https://docs.projectzero.io

---

##  License

These examples are part of the Prompt Mining Boilerplate and share the same license as the main project.
