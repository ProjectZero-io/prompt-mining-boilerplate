import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import { getDefaultChainConfig } from '../config';
import { ApiResponse, HealthCheckResponse } from '../types';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Track when the server started
const startTime = Date.now();

/**
 * Health check endpoint.
 *
 * GET /health
 *
 * Returns the health status of the API service, including:
 * - Overall service status
 * - Uptime
 * - Version
 * - Blockchain connection status
 *
 * This endpoint does not require authentication and is useful for:
 * - Load balancer health checks
 * - Monitoring systems
 * - Verifying service availability
 *
 * @returns {HealthCheckResponse} Health status information
 *
 * @example
 * curl http://localhost:3000/health
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    let blockchainStatus: 'connected' | 'disconnected' = 'disconnected';
    let chainId: string | undefined;
    let blockNumber: number | undefined;

    // Check blockchain connection
    try {
      const chain = getDefaultChainConfig();
      const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
      const network = await provider.getNetwork();
      chainId = network.chainId.toString();
      blockNumber = await provider.getBlockNumber();
      blockchainStatus = 'connected';
    } catch (error) {
      console.warn('Blockchain health check failed:', error);
      blockchainStatus = 'disconnected';
    }

    // Calculate uptime in seconds
    const uptime = Math.floor((Date.now() - startTime) / 1000);

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (blockchainStatus === 'disconnected') {
      status = 'unhealthy';
    }

    const response: ApiResponse<HealthCheckResponse> = {
      success: true,
      data: {
        status,
        timestamp: new Date().toISOString(),
        uptime,
        version: '1.0.0', // TODO: Load from package.json
        services: {
          blockchain: {
            status: blockchainStatus,
            chainId,
            blockNumber,
          },
        },
      },
    };

    // Return appropriate status code
    const statusCode = status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(response);
  })
);

export default router;
