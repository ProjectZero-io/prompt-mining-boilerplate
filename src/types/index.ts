/**
 * Type definitions for API requests and responses.
 *
 * This file provides TypeScript interfaces for all API endpoints,
 * ensuring type safety throughout the application.
 */

/**
 * Standard API response wrapper.
 *
 * All API endpoints return responses in this format for consistency.
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    stack?: string; // Only in development
  };
}

/**
 * Request body for minting a prompt.
 */
export interface MintPromptRequest {
  /** The prompt text submitted by the user */
  prompt: string;
  /** Ethereum address of the prompt author */
  author: string;
  /** Amount of activity points to reward (in wei or ether string) */
  activityPoints: string;
}

/**
 * Response data for PZERO authorization (user-signed mode).
 *
 * USER-SIGNED MODE: This response is returned to the frontend.
 * The frontend uses this data to let the user sign the transaction with Metamask.
 */
export interface PromptAuthorizationResponse {
  /** Hash of the prompt */
  promptHash: string;
  /** PZERO authorization signature and metadata */
  authorization: {
    /** PZERO's authorization signature (verified by smart contract) */
    signature: string;
    /** Unique nonce for this authorization */
    nonce: string;
  };
  /** Data to include in the user's transaction */
  mintData: {
    /** Full prompt text (user includes this in their Metamask transaction) */
    prompt: string;
    /** Author's Ethereum address */
    author: string;
    /** Activity points to reward */
    activityPoints: string;
  };
}

/**
 * Response data for a successful prompt mint (company-sponsored mode).
 *
 * COMPANY-SPONSORED MODE: Transaction was submitted by company's wallet.
 * User receives rewards automatically without signing transaction.
 */
export interface MintPromptResponse {
  /** Transaction hash of the mint operation */
  transactionHash: string;
  /** Hash of the minted prompt */
  promptHash: string;
  /** Block number where the transaction was included */
  blockNumber: number;
}

/**
 * Response data for checking if a prompt is minted.
 */
export interface PromptStatusResponse {
  /** Hash of the prompt */
  promptHash: string;
  /** Whether the prompt is minted */
  isMinted: boolean;
}

/**
 * Response data for getting activity points balance.
 */
export interface ActivityPointsBalanceResponse {
  /** Ethereum address */
  address: string;
  /** Balance in wei */
  balanceWei: string;
  /** Balance in ether (human-readable) */
  balanceEther: string;
  /** Token symbol */
  symbol: string;
}

/**
 * Health check response.
 */
export interface HealthCheckResponse {
  /** Service status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Timestamp of the health check */
  timestamp: string;
  /** Uptime in seconds */
  uptime: number;
  /** Version information */
  version: string;
  /** Additional service details */
  services?: {
    blockchain?: {
      status: 'connected' | 'disconnected';
      chainId?: string;
      blockNumber?: number;
    };
  };
}

// ============================================================================
// PZERO B2B Integration Types
// ============================================================================

/**
 * Request to PZERO for mint authorization.
 *
 * PRIVACY NOTE: This request contains ONLY the prompt hash, never the full prompt.
 * This ensures PZERO can authorize and track usage without accessing user data.
 */
export interface PZeroMintAuthRequest {
  /** Keccak256 hash of the prompt (NOT the full prompt!) */
  promptHash: string;
  /** Ethereum address of the contract signer */
  signerAddress: string;
  /** Ethereum address of the prompt author */
  author: string;
  /** Amount of activity points to reward */
  activityPoints: string;
  /** Blockchain chain ID */
  chainId: string;
  /** Request timestamp (Unix milliseconds) */
  timestamp: number;
}

/**
 * Authorization response from PZERO.
 *
 * Contains the signature that proves PZERO has authorized this operation.
 * This signature is verified by the smart contract during minting.
 */
export interface PZeroAuthorization {
  /** PZERO's authorization signature */
  signature: string;
  /** Unique nonce for this authorization */
  nonce: string;
}

/**
 * PZERO error codes.
 *
 * These map to specific error conditions from the PZERO API.
 */
export type PZeroErrorCode =
  | 'QUOTA_EXCEEDED' // Company exceeded monthly quota
  | 'INVALID_API_KEY' // Invalid PZERO_API_KEY
  | 'INVALID_TIER' // Feature not available in current tier
  | 'AUTHORIZATION_EXPIRED' // Signature has expired
  | 'PZERO_TIMEOUT' // PZERO API request timed out
  | 'PZERO_UNAVAILABLE' // PZERO service unavailable
  | 'PZERO_ERROR' // Generic PZERO error
  | 'RATE_LIMITED'; // Too many requests to PZERO

/**
 * PZERO quota information.
 */
export interface PZeroQuota {
  /** Number of mints used this period */
  used: number;
  /** Maximum mints allowed in this period */
  limit: number;
  /** Customer tier (free, starter, pro, enterprise) */
  tier: string;
  /** Unix timestamp when quota resets */
  resetAt: number;
}
