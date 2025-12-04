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
  };
  /** Data to include in the user's transaction */
  mintData: {
    /** Full prompt text (user includes this in their Metamask transaction) */
    prompt: string;
    /** Author's Ethereum address */
    author: string;
  };
  /** Transaction data ready to be sent to the blockchain */
  transaction: {
    /** Contract address to send the transaction to */
    to: string;
    /** Encoded function call data */
    data: string;
    /** Value to send with transaction (always '0' for minting) */
    value: string;
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

// ============================================================================
// PZERO Analytics Types
// ============================================================================

/**
 * Prompt data from PZERO customer prompts endpoint.
 */
export interface PZeroPrompt {
  /** Unique identifier for the prompt */
  id: string;
  /** Keccak256 hash of the prompt */
  promptHash: string;
  /** Ethereum address of the prompt author */
  author: string;
  /** Amount of activity points rewarded */
  activityPoints: string;
  /** Blockchain chain ID where prompt was minted */
  chainId: string;
  /** Transaction hash of the mint operation */
  transactionHash?: string;
  /** Timestamp when prompt was minted */
  createdAt: string;
}

/**
 * Paginated response for customer prompts.
 */
export interface PZeroPromptsResponse {
  /** Array of prompts */
  prompts: PZeroPrompt[];
  /** Pagination metadata */
  pagination: {
    /** Current page number */
    page: number;
    /** Items per page */
    limit: number;
    /** Total number of prompts */
    total: number;
    /** Total number of pages */
    totalPages: number;
  };
}

/**
 * Time period for analytics queries.
 */
export type AnalyticsPeriod = 'day' | 'week' | 'month';

/**
 * Analytics data point for a specific time period.
 */
export interface AnalyticsDataPoint {
  /** Date label for this data point */
  date: string;
  /** Number of prompts minted in this period */
  count: number;
  /** Total activity points distributed in this period */
  totalActivityPoints: string;
}

/**
 * Time-based analytics response from PZERO.
 */
export interface PZeroAnalyticsResponse {
  /** The time period analyzed */
  period: AnalyticsPeriod;
  /** Date range for the analytics */
  dateRange: {
    /** Start date (ISO string) */
    start: string;
    /** End date (ISO string) */
    end: string;
  };
  /** Analytics data points */
  data: AnalyticsDataPoint[];
  /** Summary statistics */
  summary: {
    /** Total prompts in this period */
    totalPrompts: number;
    /** Total activity points distributed */
    totalActivityPoints: string;
  };
}

/**
 * Overall statistics for customer prompts from PZERO.
 */
export interface PZeroStatsResponse {
  /** Total number of prompts minted */
  totalPrompts: number;
  /** Total activity points distributed across all prompts */
  totalActivityPoints: string;
  /** Number of unique authors */
  uniqueAuthors: number;
  /** Breakdown by chain ID */
  byChain: Array<{
    /** Chain ID */
    chainId: string;
    /** Number of prompts on this chain */
    count: number;
    /** Total activity points on this chain */
    totalActivityPoints: string;
  }>;
  /** First prompt timestamp */
  firstPromptAt?: string;
  /** Most recent prompt timestamp */
  lastPromptAt?: string;
}
