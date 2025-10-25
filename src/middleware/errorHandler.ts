import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

/**
 * Custom error class for API errors.
 *
 * Provides structured error information including HTTP status code,
 * error code, and user-friendly message.
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Centralized error handling middleware.
 *
 * Catches all errors thrown in the application and returns consistent,
 * secure error responses. Logs errors for debugging while preventing
 * sensitive information leakage to clients.
 *
 * @param err - Error object
 * @param req - Express request object
 * @param res - Express response object
 * @param _next - Express next function (unused but required by Express)
 *
 * @example
 * // Apply as last middleware in Express app
 * app.use(errorHandler);
 *
 * @security
 * - In production, stack traces are not sent to clients
 * - Sensitive error details are logged server-side only
 * - Generic messages for unexpected errors
 */
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Default to 500 server error
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let details: any = undefined;

  // Handle custom ApiError instances
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    message = err.message;
    details = err.details;
  }
  // Handle PZERO errors
  else if (err.name === 'PZeroError') {
    const pzeroError = err as any;
    statusCode = pzeroError.statusCode || 500;
    errorCode = pzeroError.code || 'PZERO_ERROR';
    message = pzeroError.message;
    details = pzeroError.details;

    // Specific PZERO error handling
    if (pzeroError.code === 'QUOTA_EXCEEDED') {
      statusCode = 402; // Payment Required
    } else if (pzeroError.code === 'INVALID_API_KEY') {
      statusCode = 403; // Forbidden
    } else if (pzeroError.code === 'AUTHORIZATION_EXPIRED') {
      statusCode = 401; // Unauthorized
    } else if (pzeroError.code === 'PZERO_TIMEOUT') {
      statusCode = 504; // Gateway Timeout
    } else if (pzeroError.code === 'PZERO_UNAVAILABLE') {
      statusCode = 503; // Service Unavailable
    }
  }
  // Handle specific error types
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = err.message;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
    message = 'Authentication required';
  } else if (err.message && err.message.includes('INSUFFICIENT_FUNDS')) {
    statusCode = 402;
    errorCode = 'INSUFFICIENT_FUNDS';
    message = 'Insufficient funds for blockchain transaction';
  } else if (err.message && err.message.includes('NONCE_EXPIRED')) {
    statusCode = 409;
    errorCode = 'NONCE_EXPIRED';
    message = 'Transaction nonce expired, please retry';
  }

  // Log error for debugging (server-side only)
  if (config.env === 'development') {
    console.error('Error Details:', {
      statusCode,
      errorCode,
      message,
      details,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
  } else {
    // In production, log errors without exposing full details
    console.error('Error:', {
      statusCode,
      errorCode,
      path: req.path,
      method: req.method,
      message: err.message,
    });
  }

  // Send error response to client
  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details && { details }),
      // Only include stack trace in development
      ...(config.env === 'development' && { stack: err.stack }),
    },
  });
};

/**
 * 404 Not Found handler.
 *
 * Catches requests to undefined routes and returns a consistent
 * 404 error response.
 *
 * @param req - Express request object
 * @param res - Express response object
 *
 * @example
 * // Apply after all other routes
 * app.use(notFoundHandler);
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
};

/**
 * Async error wrapper utility.
 *
 * Wraps async route handlers to catch errors and pass them to error middleware.
 * Eliminates need for try-catch blocks in every async route handler.
 *
 * @param fn - Async route handler function
 * @returns Wrapped route handler
 *
 * @example
 * router.post('/mint', asyncHandler(async (req, res) => {
 *   const result = await promptService.mint(req.body);
 *   res.json({ success: true, data: result });
 * }));
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
