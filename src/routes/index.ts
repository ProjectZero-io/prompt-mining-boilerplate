import { Router } from 'express';
import healthRoutes from './health';
import promptRoutes from './prompts';
import activityPointsRoutes from './activityPoints';
import { asyncHandler } from '../middleware/errorHandler';
import * as promptController from '../controllers/promptController';
import { conditionalAuth } from '../middleware/auth';
import { config } from '../config';

/**
 * Main application router.
 *
 * Combines all route modules and organizes them under appropriate paths.
 *
 * Routes:
 * - /health - Health check endpoint (no auth required)
 * - /api/prompts - Prompt minting and management (configurable auth)
 * - /api/activity-points - Activity points balance queries (configurable auth)
 * - /api/quota - PZERO quota status (configurable auth)
 *
 * @example
 * import routes from './routes';
 * app.use(routes);
 */
const router = Router();

// Health check endpoint (no authentication required)
router.use('/health', healthRoutes);

// API routes
router.use('/api/prompts', promptRoutes);
router.use('/api/activity-points', activityPointsRoutes);

// Quota endpoint - useful for monitoring PZERO usage
router.get(
  '/api/quota',
  conditionalAuth(config.auth.requireAuthRead),
  asyncHandler(promptController.getQuota)
);

export default router;
