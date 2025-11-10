import dotenv from 'dotenv';
import { ethers } from 'ethers';

// Load environment variables from .env file
dotenv.config();

/**
 * Configuration interface for type-safe access to environment variables.
 */
interface Config {
  env: string;
  server: {
    port: number;
  };
  blockchain: {
    rpcUrl: string;
    chainId: string;
    privateKey: string;
  };
  contracts: {
    promptMiner: string;
    activityPoints: string;
  };
  pzero: {
    apiKey: string;
    clientId: string;
    apiUrl: string;
    authTimeoutMs: number;
    retryAttempts: number;
  };
  auth: {
    validApiKeys: string[];
    requireAuth: boolean;
    requireAuthMint: boolean;
    requireAuthRead: boolean;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    skipAuthenticatedUsers: boolean;
  };
}

/**
 * Validates a required environment variable.
 *
 * @param name - Environment variable name
 * @param value - Environment variable value
 * @throws {Error} If required variable is missing
 */
const requireEnv = (name: string, value: string | undefined): string => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

/**
 * Validates an Ethereum address.
 *
 * @param name - Environment variable name
 * @param address - Ethereum address to validate
 * @throws {Error} If address is invalid
 * @returns Checksummed Ethereum address
 */
const validateAddress = (name: string, address: string): string => {
  if (!ethers.isAddress(address)) {
    throw new Error(`Invalid Ethereum address for ${name}: ${address}`);
  }
  return ethers.getAddress(address); // Return checksummed address
};

/**
 * Parses a boolean environment variable.
 *
 * @param value - String value from environment
 * @param defaultValue - Default value if not set
 * @returns Boolean value
 */
const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

/**
 * Parses a comma-separated list of API keys.
 *
 * @param value - Comma-separated string of API keys
 * @returns Array of API keys
 */
const parseApiKeys = (value: string | undefined): string[] => {
  if (!value) {
    console.warn('WARNING: No API keys configured. Authentication will not work properly.');
    return [];
  }
  return value
    .split(',')
    .map((key) => key.trim())
    .filter((key) => key.length > 0);
};

/**
 * Application configuration object.
 *
 * Loads and validates all environment variables at startup.
 * Provides type-safe access to configuration throughout the application.
 *
 * @throws {Error} If required environment variables are missing or invalid
 *
 * @example
 * import { config } from './config';
 * const port = config.server.port;
 * const rpcUrl = config.blockchain.rpcUrl;
 */
export const config: Config = {
  env: process.env.PM_NODE_ENV || 'development',

  server: {
    port: parseInt(process.env.PM_PORT || '3000', 10),
  },

  blockchain: {
    rpcUrl: requireEnv('PM_RPC_URL', process.env.PM_RPC_URL),
    chainId: requireEnv('PM_CHAIN_ID', process.env.PM_CHAIN_ID),
    privateKey: requireEnv('PM_PRIVATE_KEY', process.env.PM_PRIVATE_KEY),
  },

  contracts: {
    promptMiner: validateAddress(
      'PM_PROMPT_MINER_ADDRESS',
      requireEnv('PM_PROMPT_MINER_ADDRESS', process.env.PM_PROMPT_MINER_ADDRESS)
    ),
    activityPoints: validateAddress(
      'PM_ACTIVITY_POINTS_ADDRESS',
      requireEnv('PM_ACTIVITY_POINTS_ADDRESS', process.env.PM_ACTIVITY_POINTS_ADDRESS)
    ),
  },

  pzero: {
    apiKey: requireEnv('PM_PZERO_API_KEY', process.env.PM_PZERO_API_KEY),
    clientId: requireEnv('PM_PZERO_CLIENT_ID', process.env.PM_PZERO_CLIENT_ID),
    apiUrl: requireEnv('PM_PZERO_API_URL', process.env.PM_PZERO_API_URL),
    authTimeoutMs: parseInt(process.env.PM_PZERO_AUTH_TIMEOUT_MS || '5000', 10),
    retryAttempts: parseInt(process.env.PM_PZERO_RETRY_ATTEMPTS || '3', 10),
  },

  auth: {
    validApiKeys: parseApiKeys(process.env.PM_API_KEYS),
    requireAuth: parseBoolean(process.env.PM_REQUIRE_AUTH, true),
    requireAuthMint: parseBoolean(process.env.PM_REQUIRE_AUTH_MINT, true),
    requireAuthRead: parseBoolean(process.env.PM_REQUIRE_AUTH_READ, false),
  },

  rateLimit: {
    windowMs: parseInt(process.env.PM_RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 min default
    maxRequests: parseInt(process.env.PM_RATE_LIMIT_MAX_REQUESTS || '100', 10),
    skipAuthenticatedUsers: parseBoolean(process.env.PM_RATE_LIMIT_SKIP_AUTHENTICATED, false),
  },
};

/**
 * Validates the entire configuration at startup.
 *
 * This function should be called when the application starts to ensure
 * all required configuration is present and valid.
 *
 * @throws {Error} If configuration is invalid
 */
export const validateConfig = (): void => {
  // Validate PZERO API key format
  if (!config.pzero.apiKey.startsWith('pzero_')) {
    throw new Error(
      'PZERO_API_KEY must start with "pzero_" (e.g., pzero_live_xxx or pzero_test_xxx)'
    );
  }

  // Validate PZERO API URL
  try {
    new URL(config.pzero.apiUrl);
  } catch (error) {
    throw new Error('PM_PZERO_API_URL must be a valid URL');
  }

  // Validate private key format
  if (!config.blockchain.privateKey.startsWith('0x')) {
    throw new Error('PM_PRIVATE_KEY must start with 0x');
  }

  if (config.blockchain.privateKey.length !== 66) {
    throw new Error('PM_PRIVATE_KEY must be 66 characters (including 0x prefix)');
  }

  // Validate chain ID is a number
  const chainIdNum = parseInt(config.blockchain.chainId, 10);
  if (isNaN(chainIdNum)) {
    throw new Error('PM_CHAIN_ID must be a valid number');
  }

  // Validate port is in valid range
  if (config.server.port < 1 || config.server.port > 65535) {
    throw new Error('PM_PORT must be between 1 and 65535');
  }

  // Validate API keys are configured if authentication is required
  if (config.auth.requireAuth && config.auth.validApiKeys.length === 0) {
    throw new Error(
      'PM_REQUIRE_AUTH is true but no PM_API_KEYS are configured. Either disable authentication or provide valid API keys.'
    );
  }

  console.log('Configuration validated successfully');
};
