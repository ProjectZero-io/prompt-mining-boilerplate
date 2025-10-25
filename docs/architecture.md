# Prompt Mining Boilerplate Architecture

## Overview

This boilerplate enables AI companies to reward users for quality prompts with on-chain tokens. The architecture implements a **privacy-first** approach where prompts never leave your infrastructure before going directly to the blockchain.

**Who is this for?** Companies running LLM services (like Lovable, ChatGPT, Claude, etc.) who want to incentivize users for contributing high-quality prompts.

## High-Level Architecture

```
┌──────────────┐
│   End User   │ "What is AI?"
│  (Metamask)  │
└──────┬───────┘
       │
       │ (B2C Auth - signed with Metamask)
       ▼
┌─────────────────────────────┐
│  B2B Boilerplate Instance   │  ← Your Company's Backend
│   (Your LLM Service API)    │    (e.g., Lovable, ChatGPT)
│                             │
│  1. Hash prompt locally:    │
│     hash = keccak256(...)   │
│                             │
│  2. Request authorization:  │
│     → PZERO API             │
│     Sends: hash (NOT prompt)│
│     Gets: signature         │
│                             │
│  3. Return authorization    │
│     to user's frontend      │
└─────────────────────────────┘
       │
       │ hash only
       ▼
┌─────────────┐
│  PZERO API  │  ← B2B Gateway (ProjectZero Service)
│             │
│ Receives:   │
│ • Hash only │  ✅ NEVER sees full prompts
│ • Author    │
│ • Reward    │
│             │
│ Returns:    │
│ • Signature │  Authorization for minting
│ • Nonce     │
│ • Expiry    │
│             │
│ Tracks:     │
│ • Usage     │
│ • Quotas    │
└─────────────┘
       │
       │ 4. Authorization returned to user's frontend
       ▼
┌──────────────┐
│  End User's  │
│   Metamask   │  ← User signs transaction
│              │
│ Signs:       │
│ • Prompt     │  Full prompt text
│ • Signature  │  PZERO authorization
│ • Reward     │  Activity points amount
│              │
│ Submits →    │  Transaction to blockchain
└──────────────┘
       │
       │ 5. User submits signed transaction
       ▼
┌──────────────┐
│  Blockchain  │  ← Smart Contracts (Nexera Network)
│              │
│ Verifies:    │
│ • PZERO sig  │  Authorization is valid
│ • User sig   │  User signed transaction
│              │
│ Stores:      │
│ • Prompt     │  Full prompt on-chain (public)
│ • Hash       │  Prompt hash
│              │
│ Mints:       │
│ • Rewards    │  Activity Points to user
└──────────────┘
       │
       │ 6. User receives rewards!
       ▼
┌──────────────┐
│  User Wallet │
│              │
│ Receives:    │  Activity Points (ERC20 tokens)
└──────────────┘
```

## Privacy Architecture

**Critical Privacy Guarantee:**

```
Full Prompt Text:
  ├─▶ Stays in YOUR infrastructure ✅
  ├─▶ NEVER sent to PZERO ✅
  └─▶ ONLY goes to blockchain (public, decentralized) ✅

Prompt Hash (keccak256):
  ├─▶ Sent to PZERO for authorization ✅
  └─▶ PZERO cannot reverse hash to get prompt ✅

PZERO Gateway (B2B):
  ├─▶ Receives: Hash only
  ├─▶ Tracks: Usage quotas and rate limits
  ├─▶ Returns: Authorization signature
  └─▶ NEVER sees: Full prompts ✅
```

**Why this matters:** Your prompts may contain sensitive user data or proprietary information. PZERO never sees the actual prompt content - only a cryptographic hash. The full prompt goes directly to the blockchain where it becomes public and immutable.

## PRIMARY: User-Signed Transaction Mode (Recommended)

This is the **recommended approach** for most integrations. Users own their transactions and pay their own gas fees.

### Flow

```
┌─────────┐
│  User   │  1. Submits prompt via frontend
└────┬────┘     "What is machine learning?"
     │
     ▼
┌─────────────────────┐
│  Your Backend API   │  2. Hashes prompt locally
│                     │     hash = keccak256(prompt)
│  POST /api/prompts/ │
│       authorize     │  3. Requests PZERO authorization
│                     │     → PZERO API
│                     │     Sends: {hash, author, reward}
│                     │     Gets: {signature, nonce, expiry}
└────┬────────────────┘
     │
     │ 4. Returns authorization to frontend
     │    {promptHash, authorization, mintData}
     ▼
┌─────────────────────┐
│  Frontend + Metamask│  5. User signs transaction with Metamask
│                     │
│  ethers.js          │  6. Transaction includes:
│  • Connect wallet   │     • Full prompt text
│  • Sign transaction │     • PZERO signature
│  • Submit to chain  │     • Reward amount
└────┬────────────────┘
     │
     │ 7. Signed transaction submitted
     ▼
┌─────────────────────┐
│  Blockchain         │  8. Smart contract verifies:
│  PromptMiner.mint() │     • PZERO signature valid
│                     │     • User signed transaction
│                     │     • Nonce not used
│                     │
│                     │  9. Mints prompt + transfers rewards
└─────────────────────┘
```

### Implementation Steps

**Backend (Your API):**

```typescript
// Step 1: Hash prompt locally
const promptHash = keccak256(prompt);

// Step 2: Request PZERO authorization (hash only!)
const authorization = await pzeroAuthService.requestMintAuthorization({
  promptHash,      // Only hash sent
  author,          // User's wallet address
  activityPoints   // Reward amount (you calculate this)
});

// Step 3: Return to frontend
return {
  promptHash,
  authorization: {
    signature: authorization.signature,
    nonce: authorization.nonce,
    expiresAt: authorization.expiresAt
  },
  mintData: {
    prompt,        // Full prompt for frontend to submit
    author,
    activityPoints
  }
};
```

**Frontend (User's Browser):**

```javascript
// Step 1: Connect to Metamask
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const userAddress = await signer.getAddress();

// Step 2: Get authorization from your backend
const response = await fetch('/api/prompts/authorize', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    prompt: "What is machine learning?",
    author: userAddress,
    activityPoints: "10"
  })
});

const {promptHash, authorization, mintData} = await response.json();

// Step 3: User signs transaction with Metamask
const promptMinerContract = new ethers.Contract(
  PROMPT_MINER_ADDRESS,
  PROMPT_MINER_ABI,
  signer
);

// Step 4: Submit mint transaction
const tx = await promptMinerContract.mint(
  mintData.prompt,                    // Full prompt
  mintData.author,                    // User's address
  ethers.AbiCoder.defaultAbiCoder()
    .encode(['uint256'], [mintData.activityPoints]),  // Encoded reward
  authorization.signature,            // PZERO signature
  authorization.nonce                 // PZERO nonce
);

// Step 5: Wait for confirmation
const receipt = await tx.wait();
console.log('Minted! Transaction:', receipt.hash);
```

**See `examples/frontend/user-signed-transaction.html` for a complete working example.**

### Pros & Cons

**Pros:**
- ✅ User owns the transaction (true Web3)
- ✅ Decentralized experience
- ✅ User controls gas fees
- ✅ Transparent on-chain record
- ✅ No backend wallet management needed

**Cons:**
- ❌ Requires Metamask or Web3 wallet
- ❌ User must have gas tokens (tNXRA for testnet, NXRA for mainnet)
- ❌ UX friction (Metamask popup)
- ❌ User sees gas fees

### Use Cases

- Public LLM services
- Community-driven platforms
- Decentralized applications
- Services where users expect Web3 interactions

## SECONDARY: Company-Sponsored Transaction Mode (Optional)

In this mode, your company's backend submits and pays for transactions on behalf of users. Users don't need Metamask or gas tokens.

### Flow

```
┌─────────┐
│  User   │  1. Submits prompt via API
└────┬────┘     (no wallet required)
     │
     ▼
┌─────────────────────┐
│  Your Backend API   │  2. Hashes prompt locally
│                     │     hash = keccak256(prompt)
│  POST /api/prompts/ │
│     mint-sponsored  │  3. Requests PZERO authorization
│                     │     → PZERO API
│                     │     Sends: {hash, author, reward}
│                     │     Gets: {signature, nonce, expiry}
│                     │
│  Company Wallet     │  4. COMPANY signs transaction
│  (Private Key)      │     • Your backend's wallet
│                     │     • Your company pays gas
│                     │
│                     │  5. Submits to blockchain
└────┬────────────────┘
     │
     │ 6. Transaction submitted
     ▼
┌─────────────────────┐
│  Blockchain         │  7. Verifies PZERO signature
│  PromptMiner.mint() │  8. Mints prompt
│                     │  9. Transfers rewards to user
└─────────────────────┘
```

### Implementation

**Backend Only:**

```typescript
// Your API endpoint: POST /api/prompts/mint-sponsored
async function mintSponsoredPrompt(prompt, userAddress, activityPoints) {
  // Step 1: Hash prompt
  const promptHash = hashPrompt(prompt);

  // Step 2: Get PZERO authorization
  const authorization = await pzeroAuthService.requestMintAuthorization({
    promptHash,
    author: userAddress,
    activityPoints
  });

  // Step 3: Company's wallet signs and submits
  const tx = await blockchainService.mintPromptToBlockchain(
    prompt,
    userAddress,
    activityPoints,
    authorization
  );

  return {
    transactionHash: tx.hash,
    promptHash,
    blockNumber: tx.blockNumber
  };
}
```

**Frontend (Simple):**

```javascript
// No Metamask required! Just call your API
const response = await fetch('/api/prompts/mint-sponsored', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    prompt: "What is AI?",
    author: "0xUserAddress...",  // Could be from your auth system
    activityPoints: "10"
  })
});

const {transactionHash, promptHash} = await response.json();
console.log('Minted! TX:', transactionHash);
```

### Pros & Cons

**Pros:**
- ✅ No wallet required for users
- ✅ Seamless UX (no Metamask popup)
- ✅ Company controls gas optimization
- ✅ Easier onboarding for non-Web3 users

**Cons:**
- ❌ Company pays all gas fees
- ❌ Requires secure wallet management
- ❌ Centralized transaction submission
- ❌ Company must monitor wallet balance

### Use Cases

- Enterprise deployments
- Onboarding new users to Web3
- High-volume services where gas optimization matters
- Services targeting non-crypto users

## Authentication Modes

### B2C Authentication (User to Your Service)

**User-Signed Mode:**
- User authenticates with Metamask wallet signature
- User proves wallet ownership
- Example: Sign message "Authenticate for [YourService]"

**Company-Sponsored Mode:**
- You implement your own authentication (API keys, OAuth, JWT, etc.)
- User doesn't need crypto wallet for auth
- You map user identity to reward recipient address

**See `examples/frontend/message-signing-auth.html` for Metamask authentication example.**

### B2B Authentication (Your Service to PZERO)

**Always required:**
- Header: `x-pzero-api-key`
- Header: `x-pzero-client-id`
- Get credentials at: https://gateway.pzero.io/register

## Components

### 1. Your Backend API (This Boilerplate)

**Responsibilities:**
- Receive user prompts
- **Calculate reward amounts** (your logic)
- Hash prompts locally (keccak256)
- Request PZERO authorization (hash-only)
- Return authorization to frontend (user-signed) OR submit transaction (sponsored)

**API Endpoints:**
- `POST /api/prompts/authorize` - Get authorization for user to sign
- `POST /api/prompts/mint-sponsored` - Company submits transaction
- `GET /api/prompts/:hash` - Check if prompt minted
- `GET /api/activity-points/:address` - Get user's balance
- `GET /api/quota` - Check PZERO usage quota

**Your Control:**
- Reward algorithm (quality scoring, user tier, etc.)
- B2C authentication mechanism
- Choose user-signed or sponsored mode
- Monitor costs and usage

### 2. PZERO Gateway (B2B Service)

**Purpose:** Authorizes prompt minting operations while preserving privacy.

**Receives:**
- Prompt hash (NOT full prompt)
- Author address
- Reward amount

**Returns:**
- Authorization signature
- Nonce (prevents replay attacks)
- Expiry timestamp

**Tracks:**
- Company usage quotas
- Rate limits by tier
- Monthly mint allowances

**Privacy Guarantee:** NEVER sees full prompt text ✅

### 3. Smart Contracts (Blockchain)

**Main Contracts:**
- `PromptMiner` - Mints prompts and rewards users
- `ActivityPoints` - ERC20 token for rewards
- `PromptDO` - Data object for prompt storage
- `DataIndex` - Registry for authorized contracts

**Verification:**
- Validates PZERO authorization signature
- Ensures nonce hasn't been used
- Checks authorization hasn't expired
- Verifies user signed transaction (user-signed mode)

**Minting:**
- Stores full prompt on-chain (public and immutable)
- Transfers Activity Points to user
- Emits events for indexing

### 4. User's Wallet (Metamask)

**User-Signed Mode:**
- Signs transactions to mint prompts
- Pays gas fees
- Receives Activity Points directly

**Company-Sponsored Mode:**
- Optional (not required)
- Can still receive Activity Points at any address

## Privacy-Preserving Data Flow

### Step-by-Step Privacy Flow

```
Step 1: User Prompt
├─▶ "What is machine learning?"
└─▶ Stays in your backend ✅

Step 2: Local Hashing
├─▶ hash = keccak256("What is machine learning?")
└─▶ Result: 0xabc123def456... (irreversible)

Step 3: PZERO Authorization
├─▶ Send to PZERO: {hash: "0xabc123...", author, reward}
├─▶ PZERO NEVER sees: "What is machine learning?" ✅
└─▶ Receive: {signature, nonce, expiresAt}

Step 4: Transaction Submission
├─▶ USER signs (Mode 1): Full prompt + PZERO signature
├─▶ OR COMPANY signs (Mode 2): Full prompt + PZERO signature
└─▶ Submit to blockchain

Step 5: Blockchain Verification
├─▶ Verify PZERO signature is valid ✅
├─▶ Verify authorization not expired ✅
├─▶ Verify nonce not used (prevents replay) ✅
└─▶ Mint prompt + transfer Activity Points

Result: ✅ User rewarded, prompt on-chain, PZERO never saw content
```

## Reward Calculation

**Your Responsibility:** This boilerplate does NOT determine reward amounts. YOU must implement your own logic.

### Example Metrics

Consider basing rewards on:
- Prompt quality score (AI evaluation)
- User reputation/tier
- Prompt length and complexity
- Time of day / demand levels
- Historical contribution
- Prompt category/type

### Implementation Example

```typescript
/**
 * Calculate reward amount for a prompt
 *
 * @param prompt - The user's prompt text
 * @param userAddress - User's wallet address
 * @returns Activity points amount (in wei/smallest unit)
 */
function calculateReward(prompt: string, userAddress: string): string {
  // Example: Base reward + quality score
  const baseReward = 10;

  // Simple quality heuristics (replace with your AI model)
  const lengthScore = Math.min(prompt.length / 100, 5);
  const complexityScore = calculateComplexity(prompt); // Your logic
  const userTier = getUserTier(userAddress); // Your user system

  const totalReward = baseReward + lengthScore + complexityScore + userTier;

  // Return as wei (18 decimals for ERC20)
  return ethers.parseEther(totalReward.toString()).toString();
}
```

## Security Considerations

### What This Boilerplate Provides

✅ Privacy-first architecture (hash-only to PZERO)
✅ Input validation and sanitization
✅ Rate limiting (configurable per endpoint)
✅ API key authentication
✅ Transaction confirmation waiting
✅ Error handling and retry logic

### What YOU Must Implement

⚠️ **Reward calculation logic** - Determine fair reward amounts
⚠️ **B2C authentication** - User authentication for your service
⚠️ **Fraud prevention** - Detect/prevent reward gaming
⚠️ **Gas fee management** - Monitor wallet balance (sponsored mode)
⚠️ **Monitoring & alerting** - Track usage, errors, costs
⚠️ **Private key security** - Use HSM/KMS for production (sponsored mode)

### Smart Contract Security

**On-Chain Verification:**
- PZERO signature validation (prevents unauthorized mints)
- Nonce tracking (prevents replay attacks)
- Authorization expiry (prevents stale authorizations)
- Access control (only allowlisted contracts)

**Off-Chain Security:**
- Never expose private keys
- Use environment variables for all secrets
- Implement rate limiting and quotas
- Validate all user input
- Monitor for suspicious patterns

## Integration Guide for Companies

### Prerequisites

1. **Register with PZERO:**
   - Get API credentials at https://gateway.pzero.io/register
   - Choose tier (Starter, Pro, Enterprise)
   - Note your API key and client ID

2. **Deploy Contracts (or use existing):**
   - PromptMiner contract address
   - ActivityPoints token address
   - PromptDO data object address
   - DataIndex registry address

3. **Setup Infrastructure:**
   - RPC endpoint (Alchemy, Infura, or your own node)
   - Wallet with gas funds (if using sponsored mode)
   - Backend server environment (Node.js + Express)

### Setup Steps

**1. Clone and Configure:**
```bash
git clone <this-repo>
cd prompt-mining-boilerplate
npm install
cp .env.example .env
```

**2. Configure Environment:**
Edit `.env` with your values:
```env
# PZERO B2B Credentials
PZERO_API_KEY=your-api-key
PZERO_CLIENT_ID=your-client-id

# Blockchain Configuration
RPC_URL=https://rpc.testnet.nexera.network
CHAIN_ID=72080  # Nexera testnet

# Contract Addresses
PROMPT_MINER_ADDRESS=0x...
ACTIVITY_POINTS_ADDRESS=0x...
PROMPT_DO_ADDRESS=0x...

# Optional: For company-sponsored mode
PRIVATE_KEY=0x...  # Your wallet private key
```

**3. Implement Reward Logic:**
Edit `src/services/promptMiningService.ts` and implement `calculateReward()`:
```typescript
function calculateReward(prompt: string, author: string): string {
  // Your custom logic here
  return ethers.parseEther("10").toString();
}
```

**4. Choose Integration Mode:**

**Option A: User-Signed (Recommended)**
- Integrate frontend with Metamask
- Use examples in `examples/frontend/user-signed-transaction.html`
- Call `POST /api/prompts/authorize` from frontend
- User signs transaction with Metamask

**Option B: Company-Sponsored**
- Add your authentication logic
- Call `POST /api/prompts/mint-sponsored` from frontend
- Your backend handles all blockchain interactions

**5. Test on Testnet:**
```bash
npm run dev
```
Test with Nexera testnet before mainnet deployment.

**6. Deploy to Production:**
```bash
npm run build
npm start
```
Or use Docker:
```bash
docker-compose up -d
```

### Testing the Integration

**Test Authorization Endpoint:**
```bash
curl -X POST http://localhost:3000/api/prompts/authorize \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "prompt": "What is AI?",
    "author": "0xYourAddress",
    "activityPoints": "10"
  }'
```

**Test Sponsored Mint:**
```bash
curl -X POST http://localhost:3000/api/prompts/mint-sponsored \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "prompt": "What is blockchain?",
    "author": "0xUserAddress",
    "activityPoints": "10"
  }'
```

**Check Prompt Status:**
```bash
curl http://localhost:3000/api/prompts/0xPromptHash
```

## Monitoring and Maintenance

### Key Metrics to Track

**Usage Metrics:**
- Prompts minted per day/hour
- PZERO quota remaining
- Successful vs failed mints
- Average gas costs (sponsored mode)

**Performance Metrics:**
- API response times
- PZERO authorization latency
- Blockchain transaction times
- Error rates by type

**Cost Metrics:**
- Gas fees spent (sponsored mode)
- PZERO tier usage
- RPC call costs
- Infrastructure costs

### Health Monitoring

**Endpoints to Monitor:**
- `GET /health` - Overall service health
- `GET /api/quota` - PZERO quota status

**Alerts to Setup:**
- Low wallet balance (< $100 in gas)
- PZERO quota nearly exhausted (> 90%)
- High error rate (> 5%)
- Slow response times (> 3s p95)

## Troubleshooting

### Common Issues

**1. "PZERO authorization failed" (402)**
- **Cause:** Monthly quota exceeded
- **Solution:** Upgrade PZERO tier or wait for monthly reset

**2. "Insufficient gas funds"**
- **Cause:** Wallet balance too low (sponsored mode)
- **Solution:** Fund wallet with gas tokens

**3. "Authorization expired"**
- **Cause:** User took too long to sign transaction
- **Solution:** Request new authorization

**4. "Nonce already used"**
- **Cause:** Replay attempt or duplicate submission
- **Solution:** Request fresh authorization

**5. "Metamask transaction failed"**
- **Cause:** User rejected, insufficient gas, or network issues
- **Solution:** Retry with higher gas limit or check network status

## Next Steps

1. ✅ **Try the Examples:**
   - Review `examples/basic-usage.ts` for backend integration
   - Open `examples/frontend/user-signed-transaction.html` for frontend
   - Test `examples/frontend/message-signing-auth.html` for authentication

2. ✅ **Customize Reward Logic:**
   - Implement your reward calculation algorithm
   - Consider quality, user tier, and other factors

3. ✅ **Add Your Authentication:**
   - Integrate with your existing auth system
   - Implement user verification for sponsored mode

4. ✅ **Deploy to Testnet:**
   - Test thoroughly on Nexera testnet
   - Verify gas costs and performance

5. ✅ **Launch to Production:**
   - Deploy to Nexera mainnet
   - Monitor metrics and costs
   - Iterate based on user feedback

## Additional Resources

- **PZERO Gateway:** https://gateway.pzero.io
- **Smart Contract Docs:** https://docs.projectzero.io
- **ERC-7208 Specification:** https://eips.ethereum.org/EIPS/eip-7208
- **Support:** support@projectzero.io

---

**Questions?** Check the main README.md or open an issue on GitHub.
