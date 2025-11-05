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
    host: string;
  };
  blockchain: {
    rpcUrl: string;
    chainId: string;
    privateKey: string;
  };
  contracts: {
    promptMiner: string;
    activityPoints: string;
    promptDO: string;
    dataIndex: string;
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
  logging: {
    level: string;
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
  env: process.env.NODE_ENV || 'development',

  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || 'localhost',
  },

  blockchain: {
    rpcUrl: requireEnv('RPC_URL', process.env.RPC_URL),
    chainId: requireEnv('CHAIN_ID', process.env.CHAIN_ID),
    privateKey: requireEnv('PRIVATE_KEY', process.env.PRIVATE_KEY),
  },

  contracts: {
    promptMiner: validateAddress(
      'PROMPT_MINER_ADDRESS',
      requireEnv('PROMPT_MINER_ADDRESS', process.env.PROMPT_MINER_ADDRESS)
    ),
    activityPoints: validateAddress(
      'ACTIVITY_POINTS_ADDRESS',
      requireEnv('ACTIVITY_POINTS_ADDRESS', process.env.ACTIVITY_POINTS_ADDRESS)
    ),
    promptDO: validateAddress(
      'PROMPT_DO_ADDRESS',
      requireEnv('PROMPT_DO_ADDRESS', process.env.PROMPT_DO_ADDRESS)
    ),
    dataIndex: validateAddress(
      'DATA_INDEX_ADDRESS',
      requireEnv('DATA_INDEX_ADDRESS', process.env.DATA_INDEX_ADDRESS)
    ),
  },

  pzero: {
    apiKey: requireEnv('PZERO_API_KEY', process.env.PZERO_API_KEY),
    clientId: requireEnv('PZERO_CLIENT_ID', process.env.PZERO_CLIENT_ID),
    apiUrl: requireEnv('PZERO_API_URL', process.env.PZERO_API_URL),
    authTimeoutMs: parseInt(process.env.PZERO_AUTH_TIMEOUT_MS || '5000', 10),
    retryAttempts: parseInt(process.env.PZERO_RETRY_ATTEMPTS || '3', 10),
  },

  auth: {
    validApiKeys: parseApiKeys(process.env.API_KEYS),
    requireAuth: parseBoolean(process.env.REQUIRE_AUTH, true),
    requireAuthMint: parseBoolean(process.env.REQUIRE_AUTH_MINT, true),
    requireAuthRead: parseBoolean(process.env.REQUIRE_AUTH_READ, false),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 min default
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    skipAuthenticatedUsers: parseBoolean(process.env.RATE_LIMIT_SKIP_AUTHENTICATED, false),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
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
    throw new Error('PZERO_API_URL must be a valid URL');
  }

  // Validate private key format
  if (!config.blockchain.privateKey.startsWith('0x')) {
    throw new Error('PRIVATE_KEY must start with 0x');
  }

  if (config.blockchain.privateKey.length !== 66) {
    throw new Error('PRIVATE_KEY must be 66 characters (including 0x prefix)');
  }

  // Validate chain ID is a number
  const chainIdNum = parseInt(config.blockchain.chainId, 10);
  if (isNaN(chainIdNum)) {
    throw new Error('CHAIN_ID must be a valid number');
  }

  // Validate port is in valid range
  if (config.server.port < 1 || config.server.port > 65535) {
    throw new Error('PORT must be between 1 and 65535');
  }

  // Validate API keys are configured if authentication is required
  if (config.auth.requireAuth && config.auth.validApiKeys.length === 0) {
    throw new Error(
      'REQUIRE_AUTH is true but no API_KEYS are configured. Either disable authentication or provide valid API keys.'
    );
  }

  console.log('Configuration validated successfully');
};
