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
│ • Hash only │  NEVER sees full prompts
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
  ├─▶ Stays in YOUR infrastructure
  ├─▶ NEVER sent to PZERO
  └─▶ ONLY goes to blockchain (public, decentralized)

Prompt Hash (keccak256):
  ├─▶ Sent to PZERO for authorization
  └─▶ PZERO cannot reverse hash to get prompt

PZERO Gateway (B2B):
  ├─▶ Receives: Hash only
  ├─▶ Tracks: Usage quotas and rate limits
  ├─▶ Returns: Authorization signature
  └─▶ NEVER sees: Full prompts
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
    signature: authorization.signature
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
- User owns the transaction (true Web3)
- Decentralized experience
- User controls gas fees
- Transparent on-chain record
- No backend wallet management needed

**Cons:**
- Requires Metamask or Web3 wallet
- User must have gas tokens (tNXRA for testnet, NXRA for mainnet)
- UX friction (Metamask popup)
- User sees gas fees

### Use Cases

- Public LLM services
- Community-driven platforms
- Decentralized applications
- Services where users expect Web3 interactions

## SECONDARY: Meta-Transaction Mode (EIP-2771 Gasless)

In this mode, users sign EIP-712 typed data (free, no gas), and your backend acts as a **relayer** to submit the transaction on their behalf through an **ERC2771Forwarder** contract. Users don't pay gas but maintain cryptographic proof of authorship.

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
│  signable-mint-data │  3. Requests PZERO authorization
│                     │     → PZERO API
│                     │     Sends: {hash, author, reward}
│                     │     Gets: {signature, nonce, expiry}
│                     │
│                     │  4. Prepares EIP-712 typed data
│                     │     • Uses SDK getTypedDataForMetaTxMint
│                     │     • Includes forwarder nonce
│                     │     • Sets deadline for signature
│                     │
│                     │  5. Returns typed data to frontend
│                     │     {domain, types, requestForSigning}
└─────────────────────┘
     │
     ▼
┌─────────────────────┐
│  Frontend + Metamask│  6. User signs EIP-712 typed data
│                     │     • NO GAS FEE for signing
│  ethers.js          │     • Metamask shows readable message
│  • Connect wallet   │     • User approves signature
│  • Sign typed data  │
│                     │  7. Sends signature back to backend
│                     │     POST /api/prompts/execute-metatx
└────┬────────────────┘
     │
     ▼
┌─────────────────────┐
│  Your Backend API   │  8. Acts as RELAYER
│                     │     • Builds forward request
│  POST /api/prompts/ │     • Backend wallet pays gas
│    execute-metatx   │     • Submits to ERC2771Forwarder
└────┬────────────────┘
     │
     │ 9. Transaction submitted by relayer
     ▼
┌─────────────────────┐
│  Blockchain         │  10. ERC2771Forwarder verifies:
│  ERC2771Forwarder   │      • User's EIP-712 signature valid
│                     │      • Deadline not expired
│                     │      • Nonce matches
│                     │
│                     │  11. Forwarder calls PromptMiner
│  PromptMiner.mint() │      • Sets msg.sender to USER (not relayer)
│                     │      • Verifies PZERO signature
│                     │      • Mints prompt
│                     │      • Transfers rewards to USER
└─────────────────────┘
```

### Implementation Steps

**Backend - Step 1: Prepare Signable Data**

```typescript
// POST /api/prompts/signable-mint-data

// Step 1: Hash prompt locally
const promptHash = hashPrompt(prompt);

// Step 2: Encode activity points
const encodedPoints = encodeActivityPoints(activityPoints);

// Step 3: Request PZERO authorization (hash only!)
const authorization = await pzeroAuthService.requestMintAuthorization(
  promptHash,
  author,
  activityPoints,
  config.contracts.promptMiner
);

// Step 4: Get typed data using SDK
const typedData = await blockchainService.getTypedDataForMetaTxMint(
  author,           // User's address (signer)
  500000n,          // Gas limit
  deadline,         // Signature deadline
  promptHash,       // Prompt hash
  encodedPoints,    // Encoded reward
  authorization.signature  // PZERO auth
);

// Step 5: Return to frontend for signing
return {
  promptHash,
  domain: typedData.domain,
  types: typedData.types,
  requestForSigning: typedData.requestForSigning,
  authorization
};
```

**Frontend - Step 2: User Signs Typed Data**

```javascript
// Step 1: Get signable data from backend
const response = await fetch('/api/prompts/signable-mint-data', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    prompt: "What is machine learning?",
    author: userAddress,
    activityPoints: "10"
  })
});

const {domain, types, requestForSigning} = await response.json();

// Step 2: User signs EIP-712 typed data with Metamask
const signer = await provider.getSigner();
const signature = await signer.signTypedData(
  domain,
  types,
  requestForSigning
);
// NO GAS FEE! This is just a signature

// Step 3: Send signature back to backend for execution
await fetch('/api/prompts/execute-metatx', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    requestForSigning,
    forwardSignature: signature
  })
});

console.log('Minted! User paid no gas fees!');
```

**Backend - Step 3: Execute as Relayer**

```typescript
// POST /api/prompts/execute-metatx

// Step 1: Build forward request using SDK
const {request, erc2771Forwarder} = await sdkBuildRequest(
  requestForSigning,
  forwardSignature,
  relayerWallet
);

// Step 2: Connect forwarder to relayer wallet
const forwarderWithSigner = erc2771Forwarder.connect(relayerWallet);

// Step 3: Submit to forwarder (relayer pays gas)
const tx = await forwarderWithSigner.execute(request, {
  gasLimit: request.gas + 50000n  // Add buffer for forwarder overhead
});

// Step 4: Wait for confirmation
const receipt = await tx.wait();

return {
  transactionHash: receipt.hash,
  blockNumber: receipt.blockNumber,
  from: requestForSigning.from  // Original user, not relayer!
};
```

**See `examples/frontend/metatx-gasless-minting.html` for a complete working example.**

### Pros & Cons

**Pros:**
- No gas fees for users (seamless UX)
- Cryptographically secure (EIP-712 signatures)
- User maintains proof of authorship
- Smart contract correctly attributes to user (via ERC2771)
- No wallet needed for auth (just for signing)
- Easy onboarding for non-Web3 users

**Cons:**
- Company/relayer pays all gas fees
- Requires backend wallet management
- Requires monitoring relayer balance
- More complex flow (2 backend endpoints)
- Still requires Metamask for signing

### Use Cases

- Enterprise deployments
- Onboarding new users to Web3
- High-volume services where you want to subsidize gas
- Services targeting non-crypto users
- Applications prioritizing UX over decentralization

## THIRD: Backend-Signed Mode (No User Interaction)

This mode allows your backend to mint prompts **directly** without any user signature or wallet interaction. Perfect for rewarding users who don't have wallets yet or for promotional campaigns.

### Flow

```
┌─────────┐
│  User   │  1. Uses your service (no wallet needed!)
└────┬────┘     "What is machine learning?"
     │
     ▼
┌─────────────────────┐
│  Your Backend API   │  2. Hashes prompt locally
│                     │     hash = keccak256(prompt)
│  POST /api/prompts/ │
│    mint-for-user    │  3. Requests PZERO authorization
│                     │     → PZERO API
│                     │     Sends: {hash, author, reward}
│                     │     Gets: {signature, nonce, expiry}
│                     │
│                     │  4. Backend wallet signs transaction
│                     │     • Backend pays gas fees
│                     │     • NO user signature required
│                     │
│                     │  5. Submits transaction directly
│                     │     mint(address, bytes32, string, bytes, bytes)
└────┬────────────────┘
     │
     │ 6. Signed transaction submitted
     ▼
┌─────────────────────┐
│  Blockchain         │  7. Smart contract verifies:
│  PromptMiner.mint() │     • PZERO signature valid
│                     │     • Nonce not used
│                     │     • Authorization not expired
│                     │
│                     │  8. Mints prompt + transfers rewards to USER
│                     │     (even though backend signed the TX)
└─────────────────────┘
```

### Implementation Steps

**Backend (Your API):**

```typescript
// POST /api/prompts/mint-for-user

// Step 1: Hash prompt locally
const promptHash = hashPrompt(prompt);

// Step 2: Encode activity points
const encodedPoints = encodeActivityPoints(activityPoints);

// Step 3: Request PZERO authorization (hash only!)
const authorization = await pzeroAuthService.requestMintAuthorization(
  promptHash,
  author,           // User's address (will receive rewards)
  activityPoints,
  config.contracts.promptMiner
);

// Step 4: Execute mint directly (backend signs)
const tx = await blockchainService.executeMint(
  author,                    // User who receives rewards
  promptHash,                // Prompt hash
  prompt,                    // Full prompt text
  encodedPoints,             // Encoded reward
  authorization.signature    // PZERO authorization
);

// Step 5: Wait for confirmation
await tx.wait();

// Done! User receives rewards without signing anything
```

**Key Difference from Other Modes:**

The smart contract method signature is different:
```solidity
// User-signed & Meta-tx modes use:
mint(bytes32 promptHash, string memory prompt, bytes memory encodedData, bytes memory signature)

// Backend-signed mode uses:
mint(address author, bytes32 promptHash, string memory prompt, bytes memory encodedData, bytes memory signature)
```

The extra `address author` parameter tells the contract who should receive the rewards, even though the backend wallet is signing the transaction.

### Pros & Cons

**Pros:**
- No wallet required for users
- Zero user interaction (seamless UX)
- Perfect for onboarding flows
- Ideal for promotional campaigns
- Can reward users retroactively

**Cons:**
- Your backend pays ALL gas fees
- User doesn't prove wallet ownership
- Requires strong access control (API keys, authentication)
- Higher centralization (backend has full control)

### Security Considerations

**Critical Security Requirements:**

1. **Strong API Authentication**: ALWAYS require API key authentication
2. **Rate Limiting**: Prevent abuse and gas fee exhaustion
3. **Address Validation**: Verify addresses are valid before minting
4. **Monitoring**: Track spending to prevent runaway gas costs
5. **Access Control**: Restrict which services/users can call this endpoint

**Example `.env` configuration:**
```env
# Require authentication for backend-signed mints
PM_REQUIRE_AUTH_MINT=true

# Use strong API keys
PM_API_KEYS=secure-key-1,secure-key-2

# Rate limiting
PM_RATE_LIMIT_MAX_REQUESTS=100
PM_RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
```

### Use Cases

- **Onboarding flows**: Give new users their first prompts/rewards without requiring wallet setup
- **Promotional campaigns**: Mint prompts for all users as a promotion ("Everyone gets 100 points!")
- **Admin operations**: Retroactively reward users who participated before the system launched
- **No-wallet users**: Reward users who haven't set up Web3 wallets yet
- **Batch operations**: Mint prompts for multiple users in a single backend job

### Cost Implications

Since your backend pays ALL gas fees in this mode, monitor costs carefully:

```typescript
// Estimate gas costs before deployment
const gasEstimate = await contract.estimateGas.mint(
  author,
  promptHash,
  prompt,
  encodedPoints,
  signature
);

const gasPrice = await provider.getFeeData();
const estimatedCost = gasEstimate * gasPrice.gasPrice;

console.log(`Estimated cost per mint: ${ethers.formatEther(estimatedCost)} ETH`);
```

**Recommendation:** Use this mode sparingly for special cases. For regular operations, prefer user-signed or meta-transaction modes where users have some accountability.

## Authentication Modes

### B2C Authentication (User to Your Service)

**User-Signed Mode:**
- User authenticates with Metamask wallet signature
- User proves wallet ownership
- User pays gas and signs transaction
- Example: Sign message "Authenticate for [YourService]"

**Meta-Transaction Mode:**
- User signs EIP-712 typed data for gasless transactions
- Relayer (your backend) submits on behalf of user
- User doesn't pay gas but maintains cryptographic proof
- User proves wallet ownership through signature

**Backend-Signed Mode:**
- NO user authentication or signature required
- Backend mints directly on behalf of user address
- Requires strong API-level authentication (API keys)
- User receives rewards without any wallet interaction

**See `examples/frontend/user-signed-transaction.html` and `examples/frontend/message-signing-auth.html` for complete examples.**

### B2B Authentication (Your Service to PZERO)

**Always required:**
- Header: `x-pzero-api-key`
- Header: `x-pzero-client-id`
- Get credentials at: https://pm-gateway.projectzero.io/register

## Components

### 1. Your Backend API (This Boilerplate)

**Responsibilities:**
- Receive user prompts
- **Calculate reward amounts** (your logic)
- Hash prompts locally (keccak256)
- Request PZERO authorization (hash-only)
- Return authorization to frontend (user-signed) OR act as relayer (meta-transactions)

**API Endpoints:**
- `POST /api/prompts/authorize` - Get authorization for user to sign (user-signed mode)
- `POST /api/prompts/signable-mint-data` - Get EIP-712 typed data for meta-transactions
- `POST /api/prompts/execute-metatx` - Execute meta-transaction (relayer mode)
- `POST /api/prompts/mint-for-user` - Mint on behalf of user (backend-signed mode)
- `GET /api/prompts/:hash` - Check if prompt minted
- `GET /api/activity-points/:address` - Get user's balance
- `GET /api/quota` - Check PZERO usage quota

**Your Control:**
- Reward algorithm (quality scoring, user tier, etc.)
- B2C authentication mechanism
- Choose between three minting modes:
  1. **User-signed** - User signs transaction with wallet
  2. **Meta-transaction** - User signs EIP-712 message, backend relays
  3. **Backend-signed** - Backend mints directly without user signature
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

**Privacy Guarantee:** NEVER sees full prompt text

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

**Meta-Transaction Mode:**
- User signs EIP-712 typed data (no gas)
- Relayer submits transaction
- User still receives Activity Points

**Backend-Signed Mode:**
- No wallet interaction required
- Backend mints on behalf of user
- User receives Activity Points without signing
- Ideal for onboarding users without wallets

## Privacy-Preserving Data Flow

### Step-by-Step Privacy Flow

```
Step 1: User Prompt
├─▶ "What is machine learning?"
└─▶ Stays in your backend

Step 2: Local Hashing
├─▶ hash = keccak256("What is machine learning?")
└─▶ Result: 0xabc123def456... (irreversible)

Step 3: PZERO Authorization
├─▶ Send to PZERO: {hash: "0xabc123...", author, reward}
├─▶ PZERO NEVER sees: "What is machine learning?"
└─▶ Receive: {signature}

Step 4: Transaction Submission
├─▶ USER signs (Mode 1): Full prompt + PZERO signature → Blockchain
├─▶ OR USER signs typed data (Mode 2): Relayer submits → Forwarder → Blockchain
└─▶ Smart contract receives full prompt on-chain

Step 5: Blockchain Verification
├─▶ Verify PZERO signature is valid
└─▶ Mint prompt + transfer Activity Points

Result: User rewarded, prompt on-chain, PZERO never saw content
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

Privacy-first architecture (hash-only to PZERO)
Input validation and sanitization
Rate limiting (configurable per endpoint)
API key authentication
Transaction confirmation waiting
Error handling and retry logic

### What YOU Must Implement

**Reward calculation logic** - Determine fair reward amounts
**B2C authentication** - User authentication for your service
**Fraud prevention** - Detect/prevent reward gaming
**Gas fee management** - Monitor relayer wallet balance (meta-transaction mode)
**Monitoring & alerting** - Track usage, errors, costs
**Private key security** - Use HSM/KMS for production (relayer wallet)

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
   - Get API credentials at https://pm-gateway.projectzero.io/register
   - Choose tier (Starter, Pro, Enterprise)
   - Note your API key and client ID

2. **Deploy Contracts (or use existing):**
   - PromptMiner contract address
   - ActivityPoints token address
   - PromptDO data object address
   - DataIndex registry address

3. **Setup Infrastructure:**
   - RPC endpoint (Alchemy, Infura, or your own node)
   - Relayer wallet with gas funds (if using meta-transaction mode)
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
PM_PZERO_API_KEY=your-api-key

# Blockchain Configuration
PM_RPC_URL=https://rpc.testnet.nexera.network
PM_CHAIN_ID=72080  # Nexera testnet

# Contract Addresses
PM_PROMPT_MINER_ADDRESS=0x...
PM_PROMPT_DO_ADDRESS=0x...

# Optional: For meta-transaction relayer mode
PM_PRIVATE_KEY=0x...  # Relayer wallet private key
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

**Option A: User-Signed (Recommended for Web3 Apps)**
- Integrate frontend with Metamask
- Use examples in `examples/frontend/user-signed-transaction.html`
- Call `POST /api/prompts/authorize` from frontend
- User signs transaction with Metamask

**Option B: Meta-Transaction (Gasless for Users)**
- Use EIP-2771 for gasless transactions
- See `examples/frontend/message-signing-auth.html`
- Call `POST /api/prompts/signable-mint-data` for typed data
- User signs with Metamask, relayer executes via `POST /api/prompts/execute-metatx`

**Option C: Backend-Signed (No Wallet Required)**
- Mint prompts directly from backend
- No user signature needed
- Call `POST /api/prompts/mint-for-user` from backend
- Ideal for: onboarding flows, promotional campaigns, rewarding users without wallets

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
- Average gas costs (user-signed and meta-transactions)

**Performance Metrics:**
- API response times
- PZERO authorization latency
- Blockchain transaction times
- Error rates by type

**Cost Metrics:**
- Gas fees spent (meta-transaction relayer mode)
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

**2. "Insufficient funds"**
- **Cause:** Wallet balance too low (meta-transaction relayer mode)
- **Solution:** Fund relayer wallet with gas tokens

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

1. **Try the Examples:**
   - Review `examples/basic-usage.ts` for backend integration
   - Open `examples/frontend/user-signed-transaction.html` for user-signed mode
   - Test `examples/frontend/metatx-gasless-minting.html` for meta-transactions

2. **Customize Reward Logic:**
   - Implement your reward calculation algorithm
   - Consider quality, user tier, and other factors

3. **Add Your Authentication:**
   - Integrate with your existing auth system
   - Implement user verification for API access

4. **Deploy to Testnet:**
   - Test thoroughly on Nexera testnet
   - Verify gas costs and performance

5. **Launch to Production:**
   - Deploy to Nexera mainnet
   - Monitor metrics and costs
   - Iterate based on user feedback

## Additional Resources

- **PZERO Gateway:** https://pm-api.projectzero.io
- **Smart Contract Docs:** https://docs.projectzero.io
- **ERC-7208 Specification:** https://eips.ethereum.org/EIPS/eip-7208
- **Support:** support@projectzero.io

---

**Questions?** Check the main README.md or open an issue on GitHub.
