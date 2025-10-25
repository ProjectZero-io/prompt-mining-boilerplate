import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

/**
 * Authentication middleware that validates API keys from request headers.
 *
 * This middleware checks for an API key in the 'x-api-key' header and validates
 * it against the configured list of valid API keys.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 *
 * @throws {401} If API key is missing or invalid
 *
 * @example
 * // Apply to specific routes
 * router.post('/mint', authenticate, controller.mint);
 *
 * @example
 * // Apply globally to all routes
 * app.use('/api', authenticate);
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Extract API key from header
  const apiKey = req.headers['x-api-key'] as string | undefined;

  // Check if API key is provided
  if (!apiKey) {
    res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_API_KEY',
        message: 'API key is required. Please provide it in the x-api-key header.',
      },
    });
    return;
  }

  // Validate API key against configured keys
  if (!config.auth.validApiKeys.includes(apiKey)) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_API_KEY',
        message: 'Invalid API key provided.',
      },
    });
    return;
  }

  // API key is valid, proceed to next middleware
  next();
};

/**
 * Optional authentication middleware.
 *
 * This middleware validates the API key if provided, but allows requests
 * without an API key to proceed. Useful for endpoints that want to provide
 * enhanced features for authenticated users but remain accessible to all.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 *
 * @example
 * // Allow both authenticated and unauthenticated access
 * router.get('/prompts/:hash', optionalAuthenticate, controller.getPrompt);
 */
export const optionalAuthenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const apiKey = req.headers['x-api-key'] as string | undefined;

  // If no API key provided, proceed without authentication
  if (!apiKey) {
    next();
    return;
  }

  // If API key is provided, validate it
  if (!config.auth.validApiKeys.includes(apiKey)) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_API_KEY',
        message: 'Invalid API key provided.',
      },
    });
    return;
  }

  // Mark request as authenticated (can be used by controllers)
  (req as any).authenticated = true;
  next();
};

/**
 * Conditional authentication middleware factory.
 *
 * Creates an authentication middleware that can be enabled or disabled
 * based on configuration. Useful for allowing deployers to toggle
 * authentication requirements per endpoint.
 *
 * @param required - Whether authentication is required for this endpoint
 * @returns Express middleware function
 *
 * @example
 * // Authentication required only if configured
 * router.post('/mint', conditionalAuth(config.auth.requireAuthForMint), controller.mint);
 */
export const conditionalAuth = (required: boolean) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (required) {
      authenticate(req, res, next);
    } else {
      next();
    }
  };
};
