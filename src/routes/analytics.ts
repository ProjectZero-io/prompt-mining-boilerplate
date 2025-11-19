import { Router } from 'express';
import * as analyticsController from '../controllers/analyticsController';
import { asyncHandler } from '../middleware/errorHandler';
import { conditionalAuth } from '../middleware/auth';
import { strictRateLimiter } from '../middleware/rateLimiter';
import { config } from '../config';

const router = Router();

/**
 * Get customer's prompts (paginated).
 *
 * GET /api/analytics/prompts
 *
 * Returns a paginated list of all prompts minted by this customer.
 * Useful for displaying prompt history or building dashboards.
 *
 * @param {number} req.query.page - Page number (default: 1)
 * @param {number} req.query.limit - Items per page (default: 50, max: 100)
 * @param {string} req.query.chainId - Optional filter by chain ID
 * @returns {PZeroPromptsResponse} Paginated list of prompts
 *
 * @throws {400} If pagination parameters are invalid
 * @throws {401} If authentication is required but invalid/missing
 * @throws {429} If rate limit exceeded
 *
 * Example:
 * GET /api/analytics/prompts?page=1&limit=50&chainId=72080
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "prompts": [
 *       {
 *         "id": "...",
 *         "promptHash": "0x...",
 *         "author": "0x...",
 *         "activityPoints": "10",
 *         "chainId": "72080",
 *         "transactionHash": "0x...",
 *         "createdAt": "2025-11-19T10:00:00Z"
 *       }
 *     ],
 *     "pagination": {
 *       "page": 1,
 *       "limit": 50,
 *       "total": 150,
 *       "totalPages": 3
 *     }
 *   }
 * }
 */
router.get(
  '/prompts',
  strictRateLimiter,
  conditionalAuth(config.auth.requireAuthRead),
  asyncHandler(analyticsController.getCustomerPrompts)
);

/**
 * Get time-based analytics for customer's prompts.
 *
 * GET /api/analytics/time-series
 *
 * Returns analytics data showing prompt minting trends over time.
 * Useful for creating charts and graphs of minting activity.
 *
 * @param {string} req.query.period - Time period: 'day' | 'week' | 'month' (required)
 * @param {string} req.query.date - ISO date string (optional, defaults to current period)
 * @returns {PZeroAnalyticsResponse} Time-series analytics data
 *
 * @throws {400} If period is missing or invalid
 * @throws {401} If authentication is required but invalid/missing
 * @throws {429} If rate limit exceeded
 *
 * Example:
 * GET /api/analytics/time-series?period=week
 * GET /api/analytics/time-series?period=day&date=2025-11-19
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "period": "week",
 *     "dateRange": {
 *       "start": "2025-11-13",
 *       "end": "2025-11-19"
 *     },
 *     "data": [
 *       {
 *         "date": "2025-11-13",
 *         "count": 25,
 *         "totalActivityPoints": "250"
 *       },
 *       {
 *         "date": "2025-11-14",
 *         "count": 30,
 *         "totalActivityPoints": "300"
 *       }
 *     ],
 *     "summary": {
 *       "totalPrompts": 175,
 *       "totalActivityPoints": "1750"
 *     }
 *   }
 * }
 */
router.get(
  '/time-series',
  strictRateLimiter,
  conditionalAuth(config.auth.requireAuthRead),
  asyncHandler(analyticsController.getCustomerAnalytics)
);

/**
 * Get overall statistics for customer's prompts.
 *
 * GET /api/analytics/stats
 *
 * Returns aggregate statistics across all customer prompts.
 * Useful for displaying summary metrics on dashboards.
 *
 * @returns {PZeroStatsResponse} Overall statistics
 *
 * @throws {401} If authentication is required but invalid/missing
 * @throws {429} If rate limit exceeded
 *
 * Example:
 * GET /api/analytics/stats
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "totalPrompts": 1500,
 *     "totalActivityPoints": "15000",
 *     "uniqueAuthors": 342,
 *     "byChain": [
 *       {
 *         "chainId": "72080",
 *         "count": 1200,
 *         "totalActivityPoints": "12000"
 *       },
 *       {
 *         "chainId": "7208",
 *         "count": 300,
 *         "totalActivityPoints": "3000"
 *       }
 *     ],
 *     "firstPromptAt": "2025-01-01T00:00:00Z",
 *     "lastPromptAt": "2025-11-19T10:00:00Z"
 *   }
 * }
 */
router.get(
  '/stats',
  strictRateLimiter,
  conditionalAuth(config.auth.requireAuthRead),
  asyncHandler(analyticsController.getCustomerStats)
);

export default router;
