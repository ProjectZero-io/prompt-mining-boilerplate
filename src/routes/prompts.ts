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
 * Get signable meta-transaction data for EIP-2771 gasless minting.
 *
 * POST /api/prompts/signable-mint-data
 *
 * META-TRANSACTION MODE (EIP-2771):
 * Returns typed data for EIP-712 signing for gasless meta-transactions.
 * User signs the typed data with their wallet, and a relayer submits it.
 *
 * @param {object} req.body - Meta-transaction request data
 * @param {string} req.body.prompt - The prompt text
 * @param {string} req.body.author - Ethereum address of the author
 * @param {string} req.body.activityPoints - Activity points amount
 * @param {string} [req.body.gas] - Optional gas limit (default: 500000)
 * @param {string} [req.body.deadline] - Optional deadline timestamp (default: 1 hour from now)
 * @returns {object} Typed data for EIP-712 signing
 *
 * @throws {400} If request validation fails
 * @throws {401} If authentication is required but invalid/missing
 * @throws {402} If PZERO quota exceeded
 * @throws {429} If rate limit exceeded
 * @throws {500} If PZERO authorization fails
 *
 * @example
 * POST /api/prompts/signable-mint-data
 * Content-Type: application/json
 * x-api-key: your-api-key
 *
 * {
 *   "prompt": "What is artificial intelligence?",
 *   "author": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
 *   "activityPoints": "10",
 *   "gas": "500000",
 *   "deadline": "1735401600"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "promptHash": "0x...",
 *     "domain": {
 *       "name": "ERC2771Forwarder",
 *       "version": "1",
 *       "chainId": "1",
 *       "verifyingContract": "0x..."
 *     },
 *     "types": {
 *       "ForwardRequest": [...]
 *     },
 *     "requestForSigning": {
 *       "from": "0x...",
 *       "to": "0x...",
 *       "value": 0,
 *       "gas": "500000",
 *       "nonce": "0",
 *       "deadline": "1735401600",
 *       "data": "0x..."
 *     },
 *     "authorization": {
 *       "signature": "0x...",
 *       "nonce": "...",
 *       "expiresAt": 1234567890
 *     }
 *   }
 * }
 */
router.post(
  '/signable-mint-data',
  strictRateLimiter,
  conditionalAuth(config.auth.requireAuthMint),
  asyncHandler(promptController.getSignableMintData)
);

/**
 * Execute a meta-transaction mint (relayer endpoint).
 *
 * POST /api/prompts/execute-metatx
 *
 * RELAYER MODE:
 * Receives user's signature and request data, then submits the
 * meta-transaction to the ERC2771 forwarder. The relayer pays gas.
 *
 * @param {object} req.body - Meta-transaction execution data
 * @param {object} req.body.requestForSigning - The signed request data
 * @param {string} req.body.requestForSigning.from - User's address
 * @param {string} req.body.requestForSigning.to - PromptMiner contract address
 * @param {string} req.body.requestForSigning.value - Value to send (usually "0")
 * @param {string} req.body.requestForSigning.gas - Gas limit
 * @param {string} req.body.requestForSigning.nonce - Forwarder nonce
 * @param {string} req.body.requestForSigning.deadline - Deadline timestamp
 * @param {string} req.body.requestForSigning.data - Encoded mint call data
 * @param {string} req.body.forwardSignature - User's EIP-712 signature
 * @returns {object} Transaction receipt
 *
 * @throws {400} If request validation fails
 * @throws {401} If authentication is required but invalid/missing
 * @throws {429} If rate limit exceeded
 * @throws {500} If meta-transaction execution fails
 *
 * @example
 * POST /api/prompts/execute-metatx
 * Content-Type: application/json
 * x-api-key: your-api-key
 *
 * {
 *   "requestForSigning": {
 *     "from": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
 *     "to": "0xPromptMinerAddress",
 *     "value": "0",
 *     "gas": "500000",
 *     "nonce": "0",
 *     "deadline": "1735401600",
 *     "data": "0x..."
 *   },
 *   "forwardSignature": "0xUserSignature..."
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "transactionHash": "0x...",
 *     "blockNumber": 12345,
 *     "from": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
 *     "gasUsed": "450000"
 *   }
 * }
 */
router.post(
  '/execute-metatx',
  strictRateLimiter,
  conditionalAuth(config.auth.requireAuthMint),
  asyncHandler(promptController.executeMetaTx)
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
