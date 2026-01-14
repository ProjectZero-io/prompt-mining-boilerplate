import { Request, Response } from 'express';
import * as blockchainService from '../services/blockchainService';
import { ApiResponse } from '../types';

/**
 * Controller for transaction status operations.
 */

/**
 * Gets the status of a transaction.
 *
 * GET /api/tx/:hash?chainId=xxx
 *
 * @param req - Express request with hash as path parameter and optional chainId query param
 * @param res - Express response
 */
export async function getTransactionStatus(req: Request, res: Response): Promise<void> {
  const { hash } = req.params;
  const { chainId } = req.query;

  // Validate transaction hash
  if (!hash || typeof hash !== 'string' || !hash.match(/^0x[a-fA-F0-9]{64}$/)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_HASH',
        message: 'Transaction hash must be a valid 0x-prefixed 64-character hex string',
      },
    });
    return;
  }

  try {
    // Get transaction receipt from blockchain
    const receipt = await blockchainService.getTransactionReceipt(hash, chainId as string | undefined);

    if (!receipt) {
      // Transaction not found or still pending
      res.status(200).json({
        success: true,
        data: {
          hash,
          status: 'pending',
          blockNumber: null,
          confirmations: 0,
        },
      });
      return;
    }

    // Transaction is confirmed
    const response: ApiResponse = {
      success: true,
      data: {
        hash: receipt.hash,
        status: receipt.status === 1 ? 'success' : 'failed',
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        confirmations: receipt.confirmations || 0,
        from: receipt.from,
        to: receipt.to,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.gasPrice?.toString(),
        chainId: chainId || 'default',
      },
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('Error fetching transaction status:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'TRANSACTION_STATUS_ERROR',
        message: error.message || 'Failed to fetch transaction status',
      },
    });
  }
}
