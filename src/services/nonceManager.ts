import { ethers } from 'ethers';
import { config, type ChainConfig } from '../config';

/**
 * Nonce Manager Service
 * 
 * Manages transaction nonces per chain to prevent nonce conflicts.
 */

// Map of chainId -> current nonce
const nonces = new Map<string, number>();

/**
 * Initialize nonces for all configured chains.
 * Should be called once on application startup.
 * 
 * @param chains - Array of chain configurations
 */
export async function initializeNonces(chains: ChainConfig[]): Promise<void> {
  console.log('Initializing nonce manager for all chains...');
  
  const privateKey = config.privateKey;
  const wallet = new ethers.Wallet(privateKey);
  const walletAddress = wallet.address;
  
  console.log(`Wallet address: ${walletAddress}`);
  
  const initPromises = chains.map(async (chain) => {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
      const currentNonce = await provider.getTransactionCount(walletAddress, 'latest');
      
      nonces.set(chain.chainId, currentNonce);
      
      console.log(`✓ ${chain.name} (Chain ${chain.chainId}): nonce = ${currentNonce}`);
    } catch (error: any) {
      console.error(`✗ Failed to initialize nonce for ${chain.name}:`, error.message);
      // Set to 0 as fallback
      nonces.set(chain.chainId, 0);
    }
  });
  
  await Promise.all(initPromises);
  console.log('Nonce manager initialized successfully\n');
}

/**
 * Get and increment the nonce for a chain.
 * 
 * @param chainId - The chain ID to get nonce for
 * @returns The nonce to use for the next transaction
 */
export function getAndIncrementNonce(chainId: string): number {
  const currentNonce = nonces.get(chainId);
  
  if (currentNonce === undefined) {
    throw new Error(`Nonce not initialized for chain ${chainId}`);
  }
  
  const nonce = currentNonce;
  nonces.set(chainId, currentNonce + 1);
  
  console.log(`[NonceManager] Chain ${chainId}: Using nonce ${nonce}`);
  
  return nonce;
}

/**
 * Get current nonce value for a chain (for monitoring/debugging).
 * 
 * @param chainId - The chain ID
 * @returns Current nonce value or undefined if not initialized
 */
export function getCurrentNonce(chainId: string): number | undefined {
  return nonces.get(chainId);
}
