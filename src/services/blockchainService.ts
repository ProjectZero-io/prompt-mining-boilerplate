import { ethers } from 'ethers';
import {
  PromptMinerWithActivityPointsActionUpgradeable,
  PromptDO,
  ActivityPoints
} from '@projectzero-io/prompt-mining-sdk';
import type { PromptDOType, PromptMinerWithActivityPointsActionUpgradeableType, ActivityPointsType } from '@projectzero-io/prompt-mining-sdk';
import { config } from '../config';
import { PZeroAuthorization } from '../types';
import { hashPrompt, encodeActivityPoints } from '../utils/crypto';

/**
 * Blockchain provider and wallet instances.
 * Initialized once and reused for all transactions.
 */
let provider: ethers.JsonRpcProvider | null = null;
let wallet: ethers.Wallet | null = null;

/**
 * SDK contract instances.
 */
let promptMinerContract: PromptMinerWithActivityPointsActionUpgradeable | null = null;
let promptDOContract: PromptDO | null = null;
let activityPointsContract: ActivityPoints | null = null;

/**
 * Initializes blockchain provider and wallet.
 *
 * This function should be called once at application startup.
 * Subsequent calls will return the existing instances.
 *
 * @returns Initialized provider and wallet
 *
 * @throws {Error} If RPC connection fails
 *
 * @example
 * const { provider, wallet } = initializeBlockchain();
 */
export function initializeBlockchain(): {
  provider: ethers.JsonRpcProvider;
  wallet: ethers.Wallet;
} {
  if (provider && wallet) {
    return { provider, wallet };
  }

  // Initialize provider
  provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);

  // Initialize wallet
  wallet = new ethers.Wallet(config.blockchain.privateKey, provider);

  console.log(`Blockchain initialized:`);
  console.log(`- Chain ID: ${config.blockchain.chainId}`);
  console.log(`- Wallet: ${wallet.address}`);

  return { provider, wallet };
}

/**
 * Gets or initializes PromptMiner contract instance.
 *
 * @returns PromptMiner contract connected to wallet
 */
function getPromptMinerContract(): PromptMinerWithActivityPointsActionUpgradeableType {
  if (!promptMinerContract) {
    promptMinerContract = new PromptMinerWithActivityPointsActionUpgradeable(
      config.contracts.promptMiner
    );
  }

  const { wallet: w } = initializeBlockchain();
  return promptMinerContract.contract.connect(w);
}

/**
 * Gets or initializes PromptDO contract instance.
 *
 * @returns PromptDO contract connected to provider
 */
function getPromptDOContract(): PromptDOType {
  if (!promptDOContract) {
    promptDOContract = new PromptDO(config.contracts.promptDO);
  }

  const { provider: p } = initializeBlockchain();
  return promptDOContract.contract.connect(p);
}

/**
 * Gets or initializes ActivityPoints contract instance.
 *
 * @returns ActivityPoints contract connected to provider
 */
function getActivityPointsContract(): ActivityPointsType {
  if (!activityPointsContract) {
    activityPointsContract = new ActivityPoints(config.contracts.activityPoints);
  }

  const { provider: p } = initializeBlockchain();
  return activityPointsContract.contract.connect(p);
}

/**
 * Mints a prompt directly to the blockchain.
 *
 * CRITICAL PRIVACY IMPLEMENTATION:
 * This function receives the FULL PROMPT and sends it directly to the blockchain.
 * The prompt is NEVER sent to PZERO or any other intermediary service.
 *
 * @param prompt - Full prompt text (PRIVACY: sent only to blockchain)
 * @param author - Author's Ethereum address
 * @param activityPoints - Amount to reward (in ether or wei)
 * @param authorization - PZERO authorization signature
 * @returns Transaction receipt
 *
 * @throws {Error} If blockchain transaction fails
 *
 * @security
 * - Full prompt sent ONLY to blockchain (decentralized, public)
 * - PZERO authorization signature included for verification
 * - Smart contract verifies PZERO signature on-chain
 *
 * @example
 * const receipt = await mintPromptToBlockchain(
 *   "What is artificial intelligence?",
 *   "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
 *   "10",
 *   pzeroAuthorization
 * );
 */
export async function mintPromptToBlockchain(
  prompt: string,
  author: string,
  activityPoints: string,
  authorization: PZeroAuthorization
): Promise<ethers.TransactionReceipt> {
  const contract = getPromptMinerContract();
  const { wallet: w } = initializeBlockchain();

  // Encode activity points
  const encodedPoints = encodeActivityPoints(activityPoints);

  // Hash prompt for internal verification
  const promptHash = hashPrompt(prompt);

  console.log(`Minting prompt to blockchain:`);
  console.log(`- Prompt hash: ${promptHash}`);
  console.log(`- Author: ${author}`);
  console.log(`- Activity points: ${activityPoints}`);
  console.log(`- PZERO authorization: ${authorization.signature.slice(0, 10)}...`);

  try {
    // Call mint function on PromptMiner contract
    // This uses the SDK's mint method which handles signature verification
    const tx = await contract.mint(
      promptHash,        // Full prompt goes to blockchain
      "",                // Empty metadata for now
      encodedPoints,
      authorization.signature,
      {
        // Gas estimation and limits
        gasLimit: 500000, // Adjust based on contract complexity
      }
    );

    console.log(`Transaction submitted: ${tx.hash}`);
    console.log(`Waiting for confirmation...`);

    // Wait for transaction confirmation
    const receipt = await tx.wait();

    console.log(`✅ Prompt minted! Block: ${receipt!.blockNumber}`);

    return receipt!;
  } catch (error: any) {
    console.error(`Blockchain mint failed:`, error.message);

    // Enhanced error handling
    if (error.code === 'INSUFFICIENT_FUNDS') {
      throw new Error(
        `Insufficient funds for gas. Wallet ${w.address} needs more ETH.`
      );
    } else if (error.message?.includes('AUTHORIZATION_EXPIRED')) {
      throw new Error(
        'PZERO authorization expired. Please request a new authorization.'
      );
    } else if (error.message?.includes('INVALID_SIGNATURE')) {
      throw new Error(
        'Invalid PZERO signature. Authorization may be corrupted or tampered with.'
      );
    }

    throw new Error(`Blockchain transaction failed: ${error.message}`);
  }
}

/**
 * Checks if a prompt has been minted.
 *
 * This is a read-only operation that queries the PromptDO contract.
 *
 * @param promptHash - Keccak256 hash of the prompt
 * @returns True if prompt is minted
 *
 * @example
 * const isMinted = await checkPromptMinted(promptHash);
 */
export async function checkPromptMinted(promptHash: string): Promise<boolean> {
  const contract = getPromptDOContract();

  try {
    const isMinted = await contract.isPromptMinted(promptHash);
    return isMinted;
  } catch (error: any) {
    console.error(`Failed to check prompt status:`, error.message);
    throw new Error(`Failed to query prompt status: ${error.message}`);
  }
}

/**
 * Gets activity points balance for an address.
 *
 * @param address - Ethereum address to check
 * @returns Balance information (wei and ether)
 *
 * @example
 * const balance = await getActivityPointsBalance("0x...");
 * console.log(`Balance: ${balance.ether} points`);
 */
export async function getActivityPointsBalance(address: string): Promise<{
  wei: string;
  ether: string;
  symbol: string;
}> {
  const contract = getActivityPointsContract();

  try {
    const [balance, symbol] = await Promise.all([
      contract.balanceOf(address),
      contract.symbol(),
    ]);

    return {
      wei: balance.toString(),
      ether: ethers.formatEther(balance),
      symbol,
    };
  } catch (error: any) {
    console.error(`Failed to get balance:`, error.message);
    throw new Error(`Failed to query activity points balance: ${error.message}`);
  }
}

/**
 * Gets current gas price from the network.
 *
 * Useful for estimating transaction costs.
 *
 * @returns Gas price in wei
 */
export async function getCurrentGasPrice(): Promise<bigint> {
  const { provider: p } = initializeBlockchain();
  const feeData = await p.getFeeData();
  return feeData.gasPrice || BigInt(0);
}

/**
 * Gets wallet balance (ETH).
 *
 * Useful for checking if wallet has sufficient funds for transactions.
 *
 * @returns Wallet ETH balance
 */
export async function getWalletBalance(): Promise<{
  wei: string;
  ether: string;
}> {
  const { provider: p, wallet: w } = initializeBlockchain();
  const balance = await p.getBalance(w.address);

  return {
    wei: balance.toString(),
    ether: ethers.formatEther(balance),
  };
}
