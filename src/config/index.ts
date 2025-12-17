import dotenv from 'dotenv';
import { ethers } from 'ethers';

// Load environment variables from .env file
dotenv.config();

/**
 * Chain configuration for multi-chain support.
 */
export interface ChainConfig {
  name: string;
  rpcUrl: string;
  chainId: string;
  promptMinerAddress: string;
}

/**
 * Configuration interface for type-safe access to environment variables.
 */
interface Config {
  env: string;
  server: {
    port: number;
  };
  privateKey: string;
  chains: ChainConfig[];
  pzero: {
    apiKey: string;
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
  rewards: {
    rewardValuesCount: number;
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
 * Parses the multi-chain configuration from JSON.
 *
 * @param value - JSON string with chain configurations
 * @returns Array of chain configurations
 */
const parseChains = (value: string | undefined): ChainConfig[] => {
  if (!value || value.trim() === '') {
    return [];
  }

  try {
    const chains = JSON.parse(value) as ChainConfig[];
    
    // Validate each chain configuration
    chains.forEach((chain, index) => {
      if (!chain.name || typeof chain.name !== 'string') {
        throw new Error(`Chain at index ${index}: 'name' is required and must be a string`);
      }
      if (!chain.rpcUrl || typeof chain.rpcUrl !== 'string') {
        throw new Error(`Chain at index ${index}: 'rpcUrl' is required and must be a string`);
      }
      if (!chain.chainId || typeof chain.chainId !== 'string') {
        throw new Error(`Chain at index ${index}: 'chainId' is required and must be a string`);
      }
      if (!chain.promptMinerAddress || typeof chain.promptMinerAddress !== 'string') {
        throw new Error(`Chain at index ${index}: 'promptMinerAddress' is required and must be a string`);
      }
      // Validate promptMinerAddress is a valid Ethereum address
      if (!ethers.isAddress(chain.promptMinerAddress)) {
        throw new Error(`Chain at index ${index}: 'promptMinerAddress' is not a valid Ethereum address`);
      }
      // Checksum the address
      chain.promptMinerAddress = ethers.getAddress(chain.promptMinerAddress);
    });

    return chains;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`PM_CHAINS is not valid JSON: ${error.message}`);
    }
    throw error;
  }
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

  privateKey: requireEnv('PM_PRIVATE_KEY', process.env.PM_PRIVATE_KEY),

  chains: parseChains(process.env.PM_CHAINS),

  pzero: {
    apiKey: requireEnv('PM_PZERO_API_KEY', process.env.PM_PZERO_API_KEY),
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

  rewards: {
    rewardValuesCount: parseInt(process.env.PM_REWARD_VALUES_COUNT || '0', 10),
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
  // Validate chains configuration is provided
  if (config.chains.length === 0) {
    throw new Error(
      'PM_CHAINS is required. Please provide at least one chain configuration as a JSON array.'
    );
  }

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
  if (!config.privateKey.startsWith('0x')) {
    throw new Error('PM_PRIVATE_KEY must start with 0x');
  }

  if (config.privateKey.length !== 66) {
    throw new Error('PM_PRIVATE_KEY must be 66 characters (including 0x prefix)');
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
  console.log(`Configured ${config.chains.length} chain(s):`);
  config.chains.forEach(chain => {
    console.log(`  - ${chain.name} (chainId: ${chain.chainId})`);
  });
};

/**
 * Gets chain configuration by chainId.
 *
 * @param chainId - The chain ID to look up
 * @returns Chain configuration or null if not found
 *
 * @example
 * const chain = getChainConfig('97');
 * if (chain) {
 *   console.log(`Using ${chain.name}`);
 * }
 */
export const getChainConfig = (chainId: string): ChainConfig | null => {
  const chain = config.chains.find(c => c.chainId === chainId);
  return chain || null;
};

/**
 * Gets the default chain configuration.
 *
 * @returns Default chain configuration
 */
export const getDefaultChainConfig = (): ChainConfig => {
  if (config.chains.length === 0) {
    throw new Error('No chains configured. Please set PM_CHAINS environment variable.');
  }
  return config.chains[0];
};
