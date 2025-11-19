import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../config';
import {
  PZeroAuthorization,
  PZeroMintAuthRequest,
  PZeroErrorCode,
  PZeroPromptsResponse,
  PZeroAnalyticsResponse,
  PZeroStatsResponse,
  AnalyticsPeriod,
} from '../types';

/**
 * Custom error class for PZERO authorization errors.
 */
export class PZeroError extends Error {
  constructor(
    public code: PZeroErrorCode,
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'PZeroError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * HTTP client configured for PZERO API.
 */
const pzeroClient: AxiosInstance = axios.create({
  baseURL: config.pzero.apiUrl,
  timeout: config.pzero.authTimeoutMs,
  headers: {
    'Content-Type': 'application/json',
    'x-pzero-api-key': config.pzero.apiKey,
  },
});

/**
 * Retry logic with exponential backoff.
 *
 * @param fn - Function to retry
 * @param attempts - Number of retry attempts
 * @returns Result of function
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  attempts: number = config.pzero.retryAttempts
): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      // Don't retry on client errors (4xx)
      if (error instanceof PZeroError && error.statusCode && error.statusCode < 500) {
        throw error;
      }

      // Last attempt, throw error
      if (i === attempts - 1) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s, ...
      const delay = Math.pow(2, i) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('Retry logic failed unexpectedly');
}

/**
 * Handles PZERO API errors and converts them to PZeroError instances.
 *
 * @param error - Axios error
 * @throws {PZeroError} Structured error
 */
function handlePZeroApiError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const axiosError = error as AxiosError<any>;

    // Timeout error
    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
      throw new PZeroError(
        'PZERO_TIMEOUT',
        'PZERO API request timed out. Please try again.',
        undefined,
        { timeout: config.pzero.authTimeoutMs }
      );
    }

    // Network error
    if (!axiosError.response) {
      throw new PZeroError(
        'PZERO_UNAVAILABLE',
        'Unable to reach PZERO API. Please check your network connection.',
        undefined,
        { originalError: axiosError.message }
      );
    }

    // API returned an error response
    const { status, data } = axiosError.response;
    const errorData = data?.error || {};

    switch (status) {
      case 401:
        throw new PZeroError(
          'INVALID_API_KEY',
          errorData.message || 'Invalid PZERO API key. Check your PZERO_API_KEY configuration.',
          401,
          errorData
        );

      case 402:
        throw new PZeroError(
          'QUOTA_EXCEEDED',
          errorData.message || 'PZERO quota exceeded. Please upgrade your tier.',
          402,
          errorData
        );

      case 403:
        throw new PZeroError(
          'INVALID_TIER',
          errorData.message || 'This feature is not available in your current PZERO tier.',
          403,
          errorData
        );

      case 429:
        throw new PZeroError(
          'RATE_LIMITED',
          errorData.message || 'PZERO rate limit exceeded. Please try again later.',
          429,
          errorData
        );

      case 503:
        throw new PZeroError(
          'PZERO_UNAVAILABLE',
          errorData.message || 'PZERO service temporarily unavailable.',
          503,
          errorData
        );

      default:
        throw new PZeroError(
          'PZERO_ERROR',
          errorData.message || 'An unexpected error occurred with PZERO API.',
          status,
          errorData
        );
    }
  }

  // Unknown error type
  throw new PZeroError(
    'PZERO_ERROR',
    'An unexpected error occurred while communicating with PZERO.',
    undefined,
    { originalError: String(error) }
  );
}

/**
 * Requests mint authorization from PZERO.
 *
 * CRITICAL PRIVACY GUARANTEE:
 * This function sends ONLY the prompt HASH to PZERO, never the full prompt text.
 * This ensures user privacy while still allowing PZERO to authorize and track usage.
 *
 * @param promptHash - Keccak256 hash of the prompt (NOT the full prompt!)
 * @param author - Ethereum address of the prompt author
 * @param activityPoints - Amount of activity points to reward (in ether or wei)
 * @returns PZERO authorization signature
 *
 * @throws {PZeroError} If authorization fails
 *
 * @security
 * - Only promptHash is sent, not full prompt
 * - Full prompt goes directly to blockchain
 * - PZERO never sees user's actual prompt text
 *
 * @example
 * const promptHash = hashPrompt("What is AI?");
 * const auth = await requestMintAuthorization(
 *   promptHash,
 *   "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
 *   "10"
 * );
 */
export async function requestMintAuthorization(
  promptHash: string,
  author: string,
  activityPoints: string,
  signerAddress: string
): Promise<PZeroAuthorization> {
  const requestBody: PZeroMintAuthRequest = {
    promptHash, // ONLY hash, never full prompt
    author,
    activityPoints,
    signerAddress,
    chainId: config.blockchain.chainId,
    timestamp: Date.now(),
  };

  try {
    const response = await retryWithBackoff(async () => {
      return await pzeroClient.post('/authorize/mint', requestBody);
    });

    const { authorization, quota } = response.data;

    // Log quota status for monitoring
    if (quota && config.env !== 'production') {
      console.log(`PZERO Quota: ${quota.used}/${quota.limit} (${quota.tier})`);
    }

    return authorization;
  } catch (error) {
    handlePZeroApiError(error);
  }
}

/**
 * Gets current quota status from PZERO.
 *
 * Useful for displaying quota information to admins or implementing
 * client-side quota warnings.
 *
 * @returns Quota information
 *
 * @example
 * const quota = await getQuotaStatus();
 * console.log(`Used: ${quota.used}/${quota.limit}`);
 */
export async function getQuotaStatus(): Promise<{
  used: number;
  limit: number;
  tier: string;
  resetAt: number;
}> {
  try {
    const response = await pzeroClient.get('/quota');
    return response.data.quota;
  } catch (error) {
    handlePZeroApiError(error);
  }
}

/**
 * Health check for PZERO API.
 *
 * @returns True if PZERO is available
 *
 * @example
 * const healthy = await checkPZeroHealth();
 * if (!healthy) {
 *   console.warn('PZERO API is unavailable');
 * }
 */
export async function checkPZeroHealth(): Promise<boolean> {
  try {
    const response = await pzeroClient.get('/health', {
      timeout: 3000, // Quick health check
    });
    return response.data.status === 'healthy';
  } catch (error) {
    return false;
  }
}

// ============================================================================
// PZERO Analytics Functions
// ============================================================================

/**
 * Gets paginated list of customer's prompts from PZERO.
 *
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 50, max: 100)
 * @param chainId - Optional filter by chain ID
 * @returns Paginated prompts data
 *
 * @example
 * const prompts = await getCustomerPrompts(1, 50, '72080');
 * console.log(`Total prompts: ${prompts.pagination.total}`);
 */
export async function getCustomerPrompts(
  page: number = 1,
  limit: number = 50,
  chainId?: string
): Promise<PZeroPromptsResponse> {
  try {
    const params: any = { page, limit };
    if (chainId) {
      params.chainId = chainId;
    }

    const response = await pzeroClient.get('/customer/prompts', { params });
    return response.data;
  } catch (error) {
    handlePZeroApiError(error);
  }
}

/**
 * Gets time-based analytics for customer's prompts from PZERO.
 *
 * @param period - Time period: 'day', 'week', or 'month'
 * @param date - Optional ISO date string (defaults to current period)
 * @returns Analytics data for the specified period
 *
 * @example
 * // Get analytics for the current week
 * const analytics = await getCustomerAnalytics('week');
 *
 * // Get analytics for a specific day
 * const dayAnalytics = await getCustomerAnalytics('day', '2025-11-19');
 */
export async function getCustomerAnalytics(
  period: AnalyticsPeriod,
  date?: string
): Promise<PZeroAnalyticsResponse> {
  try {
    const params: any = { period };
    if (date) {
      params.date = date;
    }

    const response = await pzeroClient.get('/customer/prompts/analytics', { params });
    return response.data;
  } catch (error) {
    handlePZeroApiError(error);
  }
}

/**
 * Gets overall statistics for customer's prompts from PZERO.
 *
 * @returns Overall statistics including total prompts, activity points, and breakdown by chain
 *
 * @example
 * const stats = await getCustomerStats();
 * console.log(`Total prompts: ${stats.totalPrompts}`);
 * console.log(`Total activity points: ${stats.totalActivityPoints}`);
 */
export async function getCustomerStats(): Promise<PZeroStatsResponse> {
  try {
    const response = await pzeroClient.get('/customer/stats');
    return response.data;
  } catch (error) {
    handlePZeroApiError(error);
  }
}
