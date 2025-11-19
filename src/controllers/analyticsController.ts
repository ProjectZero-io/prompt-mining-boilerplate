import { Request, Response } from 'express';
import * as pzeroAuthService from '../services/pzeroAuthService';
import { ApiResponse, AnalyticsPeriod } from '../types';

/**
 * Controller for analytics and statistics endpoints.
 *
 * Handles HTTP requests for fetching customer prompts, analytics,
 * and statistics from PZERO.
 */

/**
 * Gets paginated list of customer's prompts.
 *
 * GET /api/analytics/prompts
 *
 * @param req - Express request
 * @param res - Express response
 */
export async function getCustomerPrompts(req: Request, res: Response): Promise<void> {
  const { page, limit, chainId } = req.query;

  // Validate and parse pagination parameters
  const pageNum = page ? parseInt(page as string, 10) : 1;
  const limitNum = limit ? parseInt(limit as string, 10) : 50;

  // Validate page number
  if (isNaN(pageNum) || pageNum < 1) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PAGE',
        message: 'Page must be a positive integer',
      },
    });
    return;
  }

  // Validate limit
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_LIMIT',
        message: 'Limit must be between 1 and 100',
      },
    });
    return;
  }

  // Call service layer
  const result = await pzeroAuthService.getCustomerPrompts(
    pageNum,
    limitNum,
    chainId as string | undefined
  );

  // Return success response
  const response: ApiResponse = {
    success: true,
    data: result,
  };

  res.status(200).json(response);
}

/**
 * Gets time-based analytics for customer's prompts.
 *
 * GET /api/analytics/time-series
 *
 * @param req - Express request
 * @param res - Express response
 */
export async function getCustomerAnalytics(req: Request, res: Response): Promise<void> {
  const { period, date } = req.query;

  // Validate period parameter
  if (!period) {
    res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_PERIOD',
        message: 'Period parameter is required (day, week, or month)',
      },
    });
    return;
  }

  const validPeriods: AnalyticsPeriod[] = ['day', 'week', 'month'];
  if (!validPeriods.includes(period as AnalyticsPeriod)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PERIOD',
        message: 'Period must be one of: day, week, month',
      },
    });
    return;
  }

  // Validate date if provided
  if (date && typeof date === 'string') {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DATE',
          message: 'Date must be in ISO format (YYYY-MM-DD)',
        },
      });
      return;
    }
  }

  // Call service layer
  const result = await pzeroAuthService.getCustomerAnalytics(
    period as AnalyticsPeriod,
    date as string | undefined
  );

  // Return success response
  const response: ApiResponse = {
    success: true,
    data: result,
  };

  res.status(200).json(response);
}

/**
 * Gets overall statistics for customer's prompts.
 *
 * GET /api/analytics/stats
 *
 * @param req - Express request
 * @param res - Express response
 */
export async function getCustomerStats(_req: Request, res: Response): Promise<void> {
  // Call service layer
  const result = await pzeroAuthService.getCustomerStats();

  // Return success response
  const response: ApiResponse = {
    success: true,
    data: result,
  };

  res.status(200).json(response);
}
