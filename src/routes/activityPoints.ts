import { Router } from 'express';
import { config } from '../config';
import { conditionalAuth } from '../middleware/auth';
import { lenientRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import * as promptController from '../controllers/promptController';

const router = Router();

/**
 * Get activity points balance for an address.
 *
 * GET /api/activity-points/:tokenAddress/:address
 *
 * Retrieves the activity points balance for a given Ethereum address from a specific token contract.
 * This is a read-only operation with lenient rate limiting.
 *
 * @param {string} req.params.tokenAddress - Activity token contract address
 * @param {string} req.params.address - Ethereum address to check balance for
 * @returns {ActivityPointsBalanceResponse} Balance information
 *
 * @throws {400} If address or tokenAddress is invalid
 * @throws {401} If authentication is required but invalid/missing
 * @throws {429} If rate limit exceeded
 * @throws {500} If blockchain query fails
 *
 * @example
 * GET /api/activity-points/0xe98a383b311b1287973Da3081834e55A1a7B0b92/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1
 * x-api-key: your-api-key (optional based on config)
 */
router.get(
  '/:tokenAddress/:address',
  lenientRateLimiter,
  conditionalAuth(config.auth.requireAuthRead),
  asyncHandler(promptController.getBalance)
);

export default router;
