import { ethers } from 'ethers';
import * as pzeroAuthService from './pzeroAuthService';
import * as blockchainService from './blockchainService';
import { hashPrompt, encodeActivityPoints } from '../utils/crypto';
import { PromptStatusResponse, ActivityPointsBalanceResponse } from '../types';
import { config } from '../config';
import { ERC2771_FORWARD_REQUEST_TYPES } from '@project_zero/prompt-mining-sdk';

/**
 * High-level orchestration service for prompt mining operations.
 *
 * This service implements the privacy-preserving architecture:
 * 1. Hash prompts locally (privacy: full text stays in company infrastructure)
 * 2. Request PZERO authorization with hash only (no prompt leakage)
 * 3. Mint directly to blockchain with full prompt + authorization
 *
 * PRIVACY GUARANTEE:
 * - Full prompts are NEVER sent to PZERO
 * - Only keccak256 hashes are shared for authorization
 * - Full prompts go directly to blockchain (decentralized, public ledger)
 */

/**
 * Gets PZERO authorization for user-signed minting.
 *
 * USER-SIGNED MODE (PRIMARY METHOD):
 * This function returns the PZERO authorization signature to the frontend.
 * The user's wallet (Metamask) will then sign and submit the transaction.
 *
 * Privacy Flow:
 * 1. Hash prompt locally (full text stays private)
 * 2. Request PZERO authorization with hash only
 * 3. Return authorization to frontend
 * 4. Frontend uses authorization for user to sign transaction
 *
 * @param prompt - User's prompt text (PRIVACY: never sent to PZERO)
 * @param author - Ethereum address of the prompt author
 * @param activityPoints - Amount of activity points to reward
 * @returns PZERO authorization for frontend to use
 *
 * @throws {PZeroError} If PZERO authorization fails
 *
 * @example
 * // Backend returns this to frontend
 * const auth = await authorizePromptMint(
 *   "What is AI?",
 *   "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
 *   "10"
 * );
 * // Frontend uses auth for user to sign transaction with Metamask
 */
export async function authorizePromptMint(
  prompt: string,
  author: string,
  activityPoints: string | string[]
): Promise<{
  promptHash: string;
  authorization: {
    signature: string;
  };
  mintData: {
    prompt: string;
    author: string;
  };
  transaction: {
    to: string;
    data: string;
    value: string;
  };
}> {
  console.log('=== User-Signed Authorization Flow ===');

  // Step 1: Hash prompt locally
  const promptHash = hashPrompt(prompt);
  console.log(`1. Hashed prompt locally: ${promptHash.slice(0, 10)}...`);

  // Step 2: Request PZERO authorization (hash only!)
  console.log(`2. Requesting PZERO authorization (hash only)...`);
  const authorization = await pzeroAuthService.requestMintAuthorization(
    promptHash,
    author,
    activityPoints,
    config.contracts.promptMiner,
    config.contracts.promptMiner
  );
  console.log(`   Authorization received: ${authorization.signature.slice(0, 10)}...`);
  
  // Step 3: Encode activity points
  const encodedPoints = encodeActivityPoints(activityPoints);
  console.log(`3. Encoded activity points: ${encodedPoints.slice(0, 10)}...`);

  // Step 4: Build transaction data for mint(bytes32 prompt, string calldata contentURI, bytes calldata actionData, bytes calldata actionSignature)
  const contract = new ethers.Interface([
    'function mint(bytes32 prompt, string calldata contentURI, bytes calldata actionData, bytes calldata actionSignature) external'
  ]);
  
  const txData = contract.encodeFunctionData('mint', [
    promptHash,           // bytes32 prompt
    '',                   // string contentURI (empty for now)
    encodedPoints,        // bytes actionData (encoded activity points)
    authorization.signature // bytes actionSignature (PZERO authorization)
  ]);
  
  console.log(`4. Encoded transaction data: ${txData.slice(0, 10)}...`);
  console.log('=== Returning authorization to frontend ===\n');

  return {
    promptHash,
    authorization: {
      signature: authorization.signature,
    },
    mintData: {
      prompt, // Full prompt returned so frontend can include in transaction
      author,
    },
    transaction: {
      to: config.contracts.promptMiner,
      data: txData,
      value: '0',
    },
  };
}

/**
 * Checks if a prompt has been minted.
 *
 * This is a read-only operation that doesn't require PZERO authorization.
 *
 * @param promptOrHash - Either full prompt text or prompt hash
 * @returns Prompt status
 *
 * @example
 * const status = await getPromptStatus("0x1234...");
 * console.log('Is minted:', status.isMinted);
 */
export async function getPromptStatus(promptOrHash: string): Promise<PromptStatusResponse> {
  // If input looks like a hash (0x...), use it directly
  // Otherwise, hash it first
  const promptHash = promptOrHash.startsWith('0x') ? promptOrHash : hashPrompt(promptOrHash);

  const isMinted = await blockchainService.checkPromptMinted(promptHash);

  return {
    promptHash,
    isMinted,
  };
}

/**
 * Gets activity points balance for an address from a specific token contract.
 *
 * This is a read-only operation that doesn't require PZERO authorization.
 *
 * @param tokenAddress - Activity token contract address
 * @param address - Ethereum address to check
 * @returns Balance information
 *
 * @example
 * const balance = await getUserBalance("0x...", "0x...");
 * console.log(`Balance: ${balance.balanceEther} ${balance.symbol}`);
 */
export async function getUserBalance(tokenAddress: string, address: string): Promise<ActivityPointsBalanceResponse> {
  const balance = await blockchainService.getActivityPointsBalance(tokenAddress, address);

  return {
    address,
    balanceWei: balance.wei,
    balanceEther: balance.ether,
    symbol: balance.symbol,
  };
}

/**
 * Gets current PZERO quota status.
 *
 * Useful for displaying quota information in admin dashboards.
 *
 * @returns Quota information
 *
 * @example
 * const quota = await getQuotaStatus();
 * console.log(`Quota: ${quota.used}/${quota.limit} (${quota.tier})`);
 */
export async function getQuotaStatus(): Promise<{
  used: number;
  limit: number;
  tier: string;
  resetAt: number;
}> {
  return await pzeroAuthService.getQuotaStatus();
}

/**
 * Gets signable meta-transaction data for user-signed minting with ERC2771 forwarder.
 *
 * META-TRANSACTION MODE (EIP-2771):
 * This function prepares everything needed for the user to sign an EIP-712 typed data message
 * that will be used to execute a gasless meta-transaction through the ERC2771 forwarder.
 *
 * Flow:
 * 1. Hash prompt locally (privacy preserved)
 * 2. Request PZERO authorization with hash only
 * 3. Prepare meta-transaction typed data using SDK
 * 4. Return domain, types, and request for frontend to sign
 *
 * @param prompt - User's prompt text (PRIVACY: never sent to PZERO)
 * @param author - Ethereum address of the prompt author (also the meta-tx signer)
 * @param activityPoints - Amount of activity points to reward
 * @param gas - Gas limit for the meta-transaction (default: 500000)
 * @param deadline - Timestamp deadline for the meta-transaction (default: 1 hour from now)
 * @returns Typed data for EIP-712 signing and additional metadata
 *
 * @throws {PZeroError} If PZERO authorization fails
 *
 * @example
 * const signableData = await getSignableMintData(
 *   "What is AI?",
 *   "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
 *   "10",
 *   500000n,
 *   Math.floor(Date.now() / 1000) + 3600
 * );
 * // Frontend uses signableData.domain, signableData.types, and signableData.requestForSigning
 * // to create an EIP-712 signature with the user's wallet
 */
export async function getSignableMintData(
  prompt: string,
  author: string,
  activityPoints: string | string[],
  gas: bigint = 500000n,
  deadline?: bigint
): Promise<{
  promptHash: string;
  domain: {
    name: string;
    version: string;
    chainId: bigint;
    verifyingContract: string;
  };
  types: typeof ERC2771_FORWARD_REQUEST_TYPES;
  requestForSigning: {
    from: string;
    to: string;
    value: bigint;
    gas: bigint;
    nonce: bigint;
    deadline: bigint;
    data: string;
  };
  authorization: {
    signature: string;
  };
}> {
  console.log('=== Meta-Transaction Signable Data Flow ===');

  // Set default deadline to 1 hour from now if not provided
  const metaTxDeadline = deadline ?? BigInt(Math.floor(Date.now() / 1000) + 3600);

  // Step 1: Hash prompt locally
  const promptHash = hashPrompt(prompt);
  console.log(`1. Hashed prompt locally: ${promptHash.slice(0, 10)}...`);

  // Step 2: Encode activity points
  const encodedPoints = encodeActivityPoints(activityPoints);
  console.log(`2. Encoded activity points: ${encodedPoints.slice(0, 10)}...`);

  // Step 3: Request PZERO authorization (hash only!)
  console.log(`3. Requesting PZERO authorization (hash only)...`);
  const authorization = await pzeroAuthService.requestMintAuthorization(
    promptHash,
    author,
    activityPoints,
    config.contracts.promptMiner,
    config.contracts.promptMiner
  );
  console.log(`   Authorization received: ${authorization.signature.slice(0, 10)}...`);

  // Step 4: Get typed data for meta-transaction using SDK
  console.log(`4. Preparing meta-transaction typed data...`);
  const typedData = await blockchainService.getTypedDataForMetaTxMint(
    author,
    gas,
    metaTxDeadline,
    promptHash,
    encodedPoints,
    authorization.signature
  );
  console.log(`   Typed data prepared for signing`);

  console.log('=== Returning signable data to frontend ===\n');

  return {
    promptHash,
    domain: typedData.domain,
    types: typedData.types,
    requestForSigning: typedData.requestForSigning,
    authorization: {
      signature: authorization.signature,
    },
  };
}

/**
 * Executes a meta-transaction mint through the ERC2771 forwarder.
 *
 * RELAYER MODE:
 * This function acts as a relayer, receiving the user's signature and
 * submitting the meta-transaction to the ERC2771 forwarder on their behalf.
 *
 * Flow:
 * 1. Receive user's signature and request data
 * 2. Build the complete forward request using SDK
 * 3. Submit to ERC2771 forwarder (relayer pays gas)
 * 4. Forwarder verifies signature and executes mint
 * 5. User receives Activity Points without paying gas
 *
 * @param requestForSigning - The request data that was signed by the user
 * @param forwardSignature - The user's EIP-712 signature
 * @returns Transaction receipt
 *
 * @throws {Error} If meta-transaction execution fails
 *
 * @example
 * const receipt = await executeMetaTxMint(
 *   {
 *     from: "0x...",
 *     to: "0x...",
 *     value: 0n,
 *     gas: 500000n,
 *     nonce: 0n,
 *     deadline: 1735401600n,
 *     data: "0x..."
 *   },
 *   "0xUserSignature..."
 * );
 */
export async function executeMetaTxMint(
  requestForSigning: {
    from: string;
    to: string;
    value: bigint;
    gas: bigint;
    nonce: bigint;
    deadline: bigint;
    data: string;
  },
  forwardSignature: string
): Promise<{
  transactionHash: string;
  blockNumber: number;
  from: string;
  gasUsed: string;
}> {
  console.log('=== Meta-Transaction Execution Flow ===');
  console.log(`Relayer executing meta-transaction for user: ${requestForSigning.from}`);

  const receipt = await blockchainService.executeMetaTxMint(requestForSigning, forwardSignature);

  console.log(`   Meta-transaction executed! Tx: ${receipt.hash}`);
  console.log('=== Meta-Transaction Complete ===\n');

  return {
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    from: requestForSigning.from,
    gasUsed: receipt.gasUsed.toString(),
  };
}

/**
 * Mints a prompt on behalf of a user (backend-signed mode).
 *
 * BACKEND-SIGNED MODE:
 * This function allows the backend to mint prompts for any user without requiring
 * them to sign anything or pay gas. The backend wallet signs and submits the transaction.
 *
 * Flow:
 * 1. Hash prompt locally (privacy preserved)
 * 2. Request PZERO authorization with hash only
 * 3. Backend signs and submits transaction directly
 * 4. Specified author receives Activity Points
 *
 * @param prompt - User's prompt text (PRIVACY: never sent to PZERO)
 * @param author - Ethereum address that will receive the Activity Points
 * @param activityPoints - Amount of activity points to reward
 * @returns Transaction receipt with mint details
 *
 * @throws {PZeroError} If PZERO authorization fails
 * @throws {Error} If blockchain transaction fails
 *
 * @example
 * // Backend mints and rewards user (user doesn't need wallet or signature)
 * const result = await mintPromptForUser(
 *   "What is AI?",
 *   "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",  // This user receives rewards
 *   "10"
 * );
 * console.log('Minted!', result.transactionHash);
 */
export async function mintPromptForUser(
  prompt: string,
  author: string,
  activityPoints: string | string[]
): Promise<{
  transactionHash: string;
  promptHash: string;
  blockNumber: number;
  gasUsed: string;
}> {
  console.log('=== Backend-Signed Mint Flow ===');
  console.log(`Minting prompt for author: ${author}`);

  // Step 1: Hash prompt locally
  const promptHash = hashPrompt(prompt);
  console.log(`1. Hashed prompt locally: ${promptHash.slice(0, 10)}...`);

  // Step 2: Check if prompt is already minted
  const isMinted = await blockchainService.checkPromptMinted(promptHash);
  if (isMinted) {
    console.log(`   Prompt already minted! Hash: ${promptHash}`);
    throw new Error(`Prompt has already been minted. Prompt hash: ${promptHash}`);
  }
  console.log(`2. Prompt not yet minted, proceeding...`);

  // Step 3: Encode activity points
  const encodedPoints = encodeActivityPoints(activityPoints);
  console.log(`3. Encoded activity points: ${encodedPoints.slice(0, 10)}...`);

  // Step 4: Request PZERO authorization (hash only!)
  console.log(`4. Requesting PZERO authorization (hash only)...`);
  const authorization = await pzeroAuthService.requestMintAuthorization(
    promptHash,
    author,
    activityPoints,
    config.contracts.promptMiner,
    config.contracts.promptMiner
  );
  console.log(`   Authorization received: ${authorization.signature.slice(0, 10)}...`);

  // Step 5: Backend signs and submits transaction
  console.log(`5. Backend signing and submitting transaction...`);
  const receipt = await blockchainService.executeMint(
    author, // User who receives rewards
    promptHash, // Prompt hash
    '', // Content URI (empty for now)
    encodedPoints, // Encoded activity points
    authorization.signature // PZERO authorization
  );
  console.log(`   Minted! Tx: ${receipt.hash}`);

  console.log('=== Backend-Signed Mint Complete ===\n');

  return {
    transactionHash: receipt.hash,
    promptHash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
  };
}

/**
 * Initializes the blockchain connection.
 *
 * This should be called at application startup to ensure
 * blockchain connectivity is established early.
 *
 * @throws {Error} If blockchain initialization fails
 */
export function initialize(): void {
  console.log('Initializing prompt mining service...');
  blockchainService.initializeBlockchain();
  console.log('Blockchain initialized');
}
