import rateLimit from 'express-rate-limit';
import { config } from '../config';

/**
 * Standard rate limiter for general API endpoints.
 *
 * Limits the number of requests from a single IP address within a time window.
 * Helps prevent abuse and ensures fair usage of the API.
 *
 * Configuration:
 * - Window: Configurable via RATE_LIMIT_WINDOW_MS (default: 15 minutes)
 * - Max requests: Configurable via RATE_LIMIT_MAX_REQUESTS (default: 100)
 *
 * @example
 * // Apply to all routes
 * app.use(standardRateLimiter);
 *
 * @example
 * // Apply to specific routes
 * router.post('/mint', standardRateLimiter, controller.mint);
 */
export const standardRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
    },
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Key generator: use IP address
  keyGenerator: (req) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});

/**
 * Strict rate limiter for sensitive endpoints.
 *
 * More restrictive rate limiting for endpoints that perform blockchain
 * transactions or other resource-intensive operations.
 *
 * Configuration:
 * - Window: 15 minutes
 * - Max requests: 10 per IP
 *
 * @example
 * // Apply to blockchain transaction endpoints
 * router.post('/mint', strictRateLimiter, authenticate, controller.mint);
 * router.post('/migrate', strictRateLimiter, authenticate, controller.migrate);
 */
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests for this sensitive operation. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
  // Skip rate limiting for requests with valid API keys (optional)
  skip: (req) => {
    const apiKey = req.headers['x-api-key'] as string | undefined;
    // If configured to skip rate limiting for authenticated users
    if (config.rateLimit.skipAuthenticatedUsers && apiKey) {
      return config.auth.validApiKeys.includes(apiKey);
    }
    return false;
  },
});

/**
 * Lenient rate limiter for read-only endpoints.
 *
 * More permissive rate limiting for endpoints that only read data
 * and don't perform state-changing operations.
 *
 * Configuration:
 * - Window: 15 minutes
 * - Max requests: 300 per IP
 *
 * @example
 * // Apply to read-only endpoints
 * router.get('/prompts/:hash', lenientRateLimiter, controller.getPrompt);
 * router.get('/activity-points/:address', lenientRateLimiter, controller.getBalance);
 */
export const lenientRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});
