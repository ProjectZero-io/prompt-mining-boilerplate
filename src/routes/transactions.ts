import { Router } from 'express';
import * as transactionController from '../controllers/transactionController';
import { asyncHandler } from '../middleware/errorHandler';
import { conditionalAuth } from '../middleware/auth';

const router = Router();

/**
 * Get transaction status.
 *
 * GET /api/tx/:hash?chainId=xxx
 *
 * Returns the status of a transaction including whether it's pending, confirmed, or failed.
 * Requires authentication to prevent abuse.
 *
 * Path Parameters:
 * - hash: Transaction hash (0x-prefixed 64-character hex string)
 *
 * Query Parameters:
 * - chainId (optional): Chain ID to check the transaction on. Uses default chain if not provided.
 *
 * Example Request:
 * GET /api/tx/0x1234...?chainId=56
 * x-api-key: your-api-key
 *
 * Response (Pending):
 * {
 *   "success": true,
 *   "data": {
 *     "hash": "0x1234...",
 *     "status": "pending",
 *     "blockNumber": null,
 *     "confirmations": 0
 *   }
 * }
 *
 * Response (Confirmed):
 * {
 *   "success": true,
 *   "data": {
 *     "hash": "0x1234...",
 *     "status": "success",
 *     "blockNumber": 12345678,
 *     "blockHash": "0xabcd...",
 *     "confirmations": 10,
 *     "from": "0x...",
 *     "to": "0x...",
 *     "gasUsed": "450000",
 *     "effectiveGasPrice": "5000000000",
 *     "chainId": "56"
 *   }
 * }
 */
router.get(
  '/:hash',
  conditionalAuth(true), // Always require auth for this endpoint
  asyncHandler(transactionController.getTransactionStatus)
);

export default router;
