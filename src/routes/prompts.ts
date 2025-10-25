import { Router } from 'express';
import { config } from '../config';
import { conditionalAuth } from '../middleware/auth';
import { strictRateLimiter, lenientRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import * as promptController from '../controllers/promptController';

const router = Router();

/**
 * Get PZERO authorization for user-signed minting.
 *
 * POST /api/prompts/authorize
 *
 * USER-SIGNED MODE (PRIMARY METHOD):
 * This endpoint returns PZERO authorization signature to the frontend.
 * The user's wallet (Metamask) signs and submits the transaction.
 *
 * @param {MintPromptRequest} req.body - Authorization request data
 * @returns {PromptAuthorizationResponse} Authorization data for frontend
 *
 * @throws {400} If request validation fails
 * @throws {401} If authentication is required but invalid/missing
 * @throws {402} If PZERO quota exceeded
 * @throws {429} If rate limit exceeded
 * @throws {500} If PZERO authorization fails
 *
 * @example
 * POST /api/prompts/authorize
 * Content-Type: application/json
 * x-api-key: your-api-key
 *
 * {
 *   "prompt": "What is artificial intelligence?",
 *   "author": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
 *   "activityPoints": "10"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "promptHash": "0x...",
 *     "authorization": {
 *       "signature": "0x...",
 *       "nonce": "...",
 *       "expiresAt": 1234567890
 *     },
 *     "mintData": {
 *       "prompt": "What is artificial intelligence?",
 *       "author": "0x...",
 *       "activityPoints": "10"
 *     }
 *   }
 * }
 */
router.post(
  '/authorize',
  strictRateLimiter,
  conditionalAuth(config.auth.requireAuthMint),
  asyncHandler(promptController.authorizePromptMint)
);

/**
 * Mint a new prompt with company-sponsored transaction.
 *
 * POST /api/prompts/mint-sponsored
 *
 * COMPANY-SPONSORED MODE (OPTIONAL):
 * Company's wallet signs and submits the transaction.
 * User receives rewards without paying gas fees.
 *
 * @param {MintPromptRequest} req.body - Mint request data
 * @returns {MintPromptResponse} Transaction details
 *
 * @throws {400} If request validation fails
 * @throws {401} If authentication is required but invalid/missing
 * @throws {402} If insufficient funds for transaction
 * @throws {429} If rate limit exceeded
 * @throws {500} If blockchain transaction fails
 *
 * @example
 * POST /api/prompts/mint-sponsored
 * Content-Type: application/json
 * x-api-key: your-api-key
 *
 * {
 *   "prompt": "What is artificial intelligence?",
 *   "author": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
 *   "activityPoints": "10"
 * }
 */
router.post(
  '/mint-sponsored',
  strictRateLimiter,
  conditionalAuth(config.auth.requireAuthMint),
  asyncHandler(promptController.mintPrompt)
);

/**
 * Check if a prompt is minted.
 *
 * GET /api/prompts/:hash
 *
 * Checks whether a specific prompt (identified by its hash) has been minted.
 * This is a read-only operation with lenient rate limiting.
 *
 * @param {string} req.params.hash - Prompt hash (keccak256)
 * @returns {PromptStatusResponse} Prompt minting status
 *
 * @throws {400} If hash format is invalid
 * @throws {401} If authentication is required but invalid/missing
 * @throws {429} If rate limit exceeded
 * @throws {500} If blockchain query fails
 *
 * @example
 * GET /api/prompts/0x1234567890abcdef...
 * x-api-key: your-api-key (optional based on config)
 */
router.get(
  '/:hash',
  lenientRateLimiter,
  conditionalAuth(config.auth.requireAuthRead),
  asyncHandler(promptController.getPromptStatus)
);

export default router;
