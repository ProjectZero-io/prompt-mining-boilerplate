import { Request, Response } from 'express';
import * as promptMiningService from '../services/promptMiningService';
import { isValidAddress, isValidHash } from '../utils/crypto';
import { ApiResponse } from '../types';

/**
 * Controller for prompt minting operations.
 *
 * Handles HTTP requests, validates input, calls service layer,
 * and formats responses.
 */

/**
 * Gets PZERO authorization for user-signed minting.
 *
 * USER-SIGNED MODE (PRIMARY METHOD):
 * Returns PZERO authorization signature to frontend.
 * User's wallet (Metamask) signs and submits the transaction.
 *
 * POST /api/prompts/authorize
 *
 * @param req - Express request
 * @param res - Express response
 */
export async function authorizePromptMint(req: Request, res: Response): Promise<void> {
  const { prompt, author, activityPoints } = req.body;

  // Validate required fields
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PROMPT',
        message: 'Prompt is required and must be a non-empty string',
      },
    });
    return;
  }

  if (!author || !isValidAddress(author)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_AUTHOR',
        message: 'Author must be a valid Ethereum address',
      },
    });
    return;
  }

  if (!activityPoints || isNaN(parseFloat(activityPoints))) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ACTIVITY_POINTS',
        message: 'Activity points must be a valid number',
      },
    });
    return;
  }

  // Call service layer to get authorization
  const result = await promptMiningService.authorizePromptMint(
    prompt.trim(),
    author,
    activityPoints
  );

  // Return authorization response
  const response: ApiResponse = {
    success: true,
    data: result,
  };

  res.status(200).json(response);
}

/**
 * Gets signable meta-transaction data for EIP-2771 gasless minting.
 *
 * META-TRANSACTION MODE (EIP-2771):
 * Returns typed data for EIP-712 signing that will be used for gasless meta-transactions.
 * User signs the typed data with their wallet, and a relayer submits it to the forwarder.
 *
 * POST /api/prompts/signable-mint-data
 *
 * @param req - Express request
 * @param res - Express response
 */
export async function getSignableMintData(req: Request, res: Response): Promise<void> {
  const { prompt, author, activityPoints, gas, deadline } = req.body;

  // Validate required fields
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PROMPT',
        message: 'Prompt is required and must be a non-empty string',
      },
    });
    return;
  }

  if (!author || !isValidAddress(author)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_AUTHOR',
        message: 'Author must be a valid Ethereum address',
      },
    });
    return;
  }

  if (!activityPoints || isNaN(parseFloat(activityPoints))) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ACTIVITY_POINTS',
        message: 'Activity points must be a valid number',
      },
    });
    return;
  }

  // Optional: validate gas if provided
  const gasLimit = gas ? BigInt(gas) : undefined;

  // Optional: validate deadline if provided
  const metaTxDeadline = deadline ? BigInt(deadline) : undefined;

  // Call service layer to get signable data
  const result = await promptMiningService.getSignableMintData(
    prompt.trim(),
    author,
    activityPoints,
    gasLimit,
    metaTxDeadline
  );

  // Convert BigInt values to strings for JSON serialization
  const serializedResult = {
    promptHash: result.promptHash,
    domain: {
      name: result.domain.name,
      version: result.domain.version,
      chainId: result.domain.chainId.toString(),
      verifyingContract: result.domain.verifyingContract,
    },
    types: result.types,
    requestForSigning: {
      from: result.requestForSigning.from,
      to: result.requestForSigning.to,
      value: result.requestForSigning.value.toString(),
      gas: result.requestForSigning.gas.toString(),
      nonce: result.requestForSigning.nonce.toString(),
      deadline: result.requestForSigning.deadline.toString(),
      data: result.requestForSigning.data,
    },
    authorization: {
      signature: result.authorization.signature,
      nonce: result.authorization.nonce,
      expiresAt: result.authorization.expiresAt,
    },
  };

  // Return signable data response
  const response: ApiResponse = {
    success: true,
    data: serializedResult,
  };

  res.status(200).json(response);
}

/**
 * Executes a meta-transaction mint (relayer mode).
 *
 * RELAYER MODE:
 * Receives the user's signature and request data, then submits the
 * meta-transaction to the ERC2771 forwarder on behalf of the user.
 * The relayer (company) pays the gas fees.
 *
 * POST /api/prompts/execute-metatx
 *
 * @param req - Express request
 * @param res - Express response
 */
export async function executeMetaTx(req: Request, res: Response): Promise<void> {
  const { requestForSigning, forwardSignature } = req.body;

  // Validate requestForSigning
  if (!requestForSigning || typeof requestForSigning !== 'object') {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'requestForSigning is required and must be an object',
      },
    });
    return;
  }

  // Validate required fields in requestForSigning
  const { from, to, value, gas, nonce, deadline, data } = requestForSigning;

  if (!from || !isValidAddress(from)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FROM',
        message: 'from must be a valid Ethereum address',
      },
    });
    return;
  }

  if (!to || !isValidAddress(to)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_TO',
        message: 'to must be a valid Ethereum address',
      },
    });
    return;
  }

  if (value === undefined || value === null) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_VALUE',
        message: 'value is required',
      },
    });
    return;
  }

  if (!gas) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_GAS',
        message: 'gas is required',
      },
    });
    return;
  }

  if (nonce === undefined || nonce === null) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_NONCE',
        message: 'nonce is required',
      },
    });
    return;
  }

  if (!deadline) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_DEADLINE',
        message: 'deadline is required',
      },
    });
    return;
  }

  if (!data || typeof data !== 'string' || !data.startsWith('0x')) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_DATA',
        message: 'data must be a hex string starting with 0x',
      },
    });
    return;
  }

  // Validate forwardSignature
  if (!forwardSignature || typeof forwardSignature !== 'string' || !forwardSignature.startsWith('0x')) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_SIGNATURE',
        message: 'forwardSignature must be a hex string starting with 0x',
      },
    });
    return;
  }

  // Convert to BigInt
  const request = {
    from,
    to,
    value: BigInt(value),
    gas: BigInt(gas),
    nonce: BigInt(nonce),
    deadline: BigInt(deadline),
    data,
  };

  // Call service layer
  const result = await promptMiningService.executeMetaTxMint(
    request,
    forwardSignature
  );

  // Return success response
  const response: ApiResponse = {
    success: true,
    data: result,
  };

  res.status(201).json(response);
}


/**
 * Mints a new prompt and rewards the author (company-sponsored mode).
 *
 * COMPANY-SPONSORED MODE (OPTIONAL):
 * Company's wallet signs and submits transaction.
 * User receives rewards without paying gas fees.
 *
 * POST /api/prompts/mint-sponsored
 *
 * @param req - Express request
 * @param res - Express response
 */
export async function mintPrompt(req: Request, res: Response): Promise<void> {
  const { prompt, author, activityPoints } = req.body;

  // Validate required fields
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PROMPT',
        message: 'Prompt is required and must be a non-empty string',
      },
    });
    return;
  }

  if (!author || !isValidAddress(author)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_AUTHOR',
        message: 'Author must be a valid Ethereum address',
      },
    });
    return;
  }

  if (!activityPoints || isNaN(parseFloat(activityPoints))) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ACTIVITY_POINTS',
        message: 'Activity points must be a valid number',
      },
    });
    return;
  }

  // Call service layer
  const result = await promptMiningService.mintPrompt(
    prompt.trim(),
    author,
    activityPoints
  );

  // Return success response
  const response: ApiResponse = {
    success: true,
    data: result,
  };

  res.status(201).json(response);
}

/**
 * Checks if a prompt has been minted.
 *
 * GET /api/prompts/:hash
 *
 * @param req - Express request
 * @param res - Express response
 */
export async function getPromptStatus(req: Request, res: Response): Promise<void> {
  const { hash } = req.params;

  // Validate hash format
  if (!hash || !isValidHash(hash)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_HASH',
        message: 'Invalid prompt hash format. Must be a 32-byte hex string (0x...)',
      },
    });
    return;
  }

  // Call service layer
  const result = await promptMiningService.getPromptStatus(hash);

  // Return success response
  const response: ApiResponse = {
    success: true,
    data: result,
  };

  res.status(200).json(response);
}

/**
 * Gets activity points balance for an address.
 *
 * GET /api/activity-points/:address
 *
 * @param req - Express request
 * @param res - Express response
 */
export async function getBalance(req: Request, res: Response): Promise<void> {
  const { address } = req.params;

  // Validate address
  if (!address || !isValidAddress(address)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ADDRESS',
        message: 'Invalid Ethereum address',
      },
    });
    return;
  }

  // Call service layer
  const result = await promptMiningService.getUserBalance(address);

  // Return success response
  const response: ApiResponse = {
    success: true,
    data: result,
  };

  res.status(200).json(response);
}

/**
 * Gets current PZERO quota status.
 *
 * GET /api/quota
 *
 * @param req - Express request
 * @param res - Express response
 */
export async function getQuota(req: Request, res: Response): Promise<void> {
  // Call service layer
  const result = await promptMiningService.getQuotaStatus();

  // Return success response
  const response: ApiResponse = {
    success: true,
    data: result,
  };

  res.status(200).json(response);
}
