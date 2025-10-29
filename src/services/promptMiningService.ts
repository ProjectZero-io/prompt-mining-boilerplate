import * as pzeroAuthService from './pzeroAuthService';
import * as blockchainService from './blockchainService';
import { hashPrompt, encodeActivityPoints } from '../utils/crypto';
import {
  MintPromptResponse,
  PromptStatusResponse,
  ActivityPointsBalanceResponse,
} from '../types';
import { config } from '../config';
import { ERC2771_FORWARD_REQUEST_TYPES } from '@projectzero-io/prompt-mining-sdk';

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
 * Mints a prompt with privacy-preserving PZERO authorization.
 *
 * This function orchestrates the complete minting flow:
 * 1. Hash prompt locally (keeps full text private from PZERO)
 * 2. Request PZERO authorization with hash only
 * 3. Mint to blockchain with full prompt + authorization signature
 *
 * @param prompt - User's prompt text (PRIVACY: never sent to PZERO)
 * @param author - Ethereum address of the prompt author
 * @param activityPoints - Amount of activity points to reward
 * @returns Mint result with transaction details
 *
 * @throws {PZeroError} If PZERO authorization fails
 * @throws {Error} If blockchain transaction fails
 *
 * @example
 * const result = await mintPrompt(
 *   "What is the meaning of life?",
 *   "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
 *   "10"
 * );
 * console.log('Minted!', result.transactionHash);
 */
export async function mintPrompt(
  prompt: string,
  author: string,
  activityPoints: string
): Promise<MintPromptResponse> {
  console.log('=== Privacy-Preserving Mint Flow ===');

  // Step 1: Hash prompt locally
  // PRIVACY: This ensures the full prompt never leaves this server
  const promptHash = hashPrompt(prompt);
  console.log(`1. Hashed prompt locally: ${promptHash.slice(0, 10)}...`);

  // Step 2: Request PZERO authorization
  // PRIVACY: Only the HASH is sent to PZERO, never the full prompt
  console.log(`2. Requesting PZERO authorization (hash only)...`);
  const authorization = await pzeroAuthService.requestMintAuthorization(
    promptHash,
    author,
    activityPoints,
    config.contracts.promptMiner
  );
  console.log(`   ✅ Authorization received: ${authorization.signature.slice(0, 10)}...`);

  // Step 3: Mint to blockchain
  // PRIVACY: Full prompt sent directly to blockchain (not through PZERO)
  console.log(`3. Minting to blockchain (full prompt + authorization)...`);
  const receipt = await blockchainService.mintPromptToBlockchain(
    prompt,            // Full prompt goes here (to blockchain only!)
    author,
    activityPoints,
    authorization
  );
  console.log(`   ✅ Minted! Tx: ${receipt.hash}`);

  console.log('=== Mint Complete ===\n');

  return {
    transactionHash: receipt.hash,
    promptHash,
    blockNumber: receipt.blockNumber,
    pzeroAuthorization: {
      nonce: authorization.nonce,
      expiresAt: authorization.expiresAt,
    },
  };
}

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
  activityPoints: string
): Promise<{
  promptHash: string;
  authorization: {
    signature: string;
    nonce: string;
    expiresAt: number;
  };
  mintData: {
    prompt: string;
    author: string;
    activityPoints: string;
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
    config.contracts.promptMiner
  );
  console.log(`   ✅ Authorization received: ${authorization.signature.slice(0, 10)}...`);
  console.log('=== Returning authorization to frontend ===\n');

  return {
    promptHash,
    authorization: {
      signature: authorization.signature,
      nonce: authorization.nonce,
      expiresAt: authorization.expiresAt,
    },
    mintData: {
      prompt,  // Full prompt returned so frontend can include in transaction
      author,
      activityPoints,
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
export async function getPromptStatus(
  promptOrHash: string
): Promise<PromptStatusResponse> {
  // If input looks like a hash (0x...), use it directly
  // Otherwise, hash it first
  const promptHash = promptOrHash.startsWith('0x')
    ? promptOrHash
    : hashPrompt(promptOrHash);

  const isMinted = await blockchainService.checkPromptMinted(promptHash);

  return {
    promptHash,
    isMinted,
  };
}

/**
 * Gets activity points balance for an address.
 *
 * This is a read-only operation that doesn't require PZERO authorization.
 *
 * @param address - Ethereum address to check
 * @returns Balance information
 *
 * @example
 * const balance = await getUserBalance("0x...");
 * console.log(`Balance: ${balance.balanceEther} ${balance.symbol}`);
 */
export async function getUserBalance(
  address: string
): Promise<ActivityPointsBalanceResponse> {
  const balance = await blockchainService.getActivityPointsBalance(address);

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
  activityPoints: string | number,
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
    nonce: string;
    expiresAt: number;
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
    String(activityPoints),
    config.contracts.promptMiner
  );
  console.log(`   ✅ Authorization received: ${authorization.signature.slice(0, 10)}...`);

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
  console.log(`   ✅ Typed data prepared for signing`);

  console.log('=== Returning signable data to frontend ===\n');

  return {
    promptHash,
    domain: typedData.domain,
    types: typedData.types,
    requestForSigning: typedData.requestForSigning,
    authorization: {
      signature: authorization.signature,
      nonce: authorization.nonce,
      expiresAt: authorization.expiresAt,
    },
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
  console.log('✅ Blockchain initialized');
}
