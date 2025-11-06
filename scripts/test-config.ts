/**
 * Configuration Verification Script
 *
 * Tests that all environment variables are properly configured
 * and that external services (PZERO, blockchain) are accessible.
 */

import dotenv from 'dotenv';
import { ethers } from 'ethers';
import axios from 'axios';

// Load environment variables
dotenv.config();

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function test(name: string, passed: boolean, message: string) {
  results.push({ name, passed, message });
  const icon = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${icon}\x1b[0m ${name}: ${message}`);
}

async function runTests() {
  console.log('\n═══════════════════════════════════════');
  console.log('  Configuration Verification Tests');
  console.log('═══════════════════════════════════════\n');

  // Test 1: Check required environment variables
  console.log('1. Checking Environment Variables...\n');

  const requiredVars = [
    'NODE_ENV',
    'PORT',
    'RPC_URL',
    'CHAIN_ID',
    'PROMPT_MINER_ADDRESS',
    'ACTIVITY_POINTS_ADDRESS',
    'PRIVATE_KEY',
    'PZERO_API_KEY',
    'PZERO_CLIENT_ID',
    'PZERO_API_URL',
  ];

  for (const varName of requiredVars) {
    const value = process.env[varName];
    test(
      `  ${varName}`,
      !!value,
      value ? 'Set' : 'Missing!'
    );
  }

  console.log('\n2. Validating Configuration Values...\n');

  // Test 2: Validate PZERO API key format
  const pzeroKey = process.env.PZERO_API_KEY || '';
  test(
    '  PZERO_API_KEY format',
    pzeroKey.startsWith('pzero_'),
    pzeroKey.startsWith('pzero_')
      ? 'Valid (starts with pzero_)'
      : 'Invalid! Must start with "pzero_"'
  );

  // Test 3: Validate PZERO API URL
  let pzeroUrlValid = false;
  try {
    new URL(process.env.PZERO_API_URL || '');
    pzeroUrlValid = true;
    test('  PZERO_API_URL format', true, 'Valid URL');
  } catch (error) {
    test('  PZERO_API_URL format', false, 'Invalid URL format');
  }

  // Test 4: Validate Ethereum addresses
  const addresses = {
    PROMPT_MINER_ADDRESS: process.env.PROMPT_MINER_ADDRESS,
    ACTIVITY_POINTS_ADDRESS: process.env.ACTIVITY_POINTS_ADDRESS,
  };

  for (const [name, address] of Object.entries(addresses)) {
    if (address) {
      const isValid = ethers.isAddress(address);
      test(
        `  ${name}`,
        isValid,
        isValid ? 'Valid Ethereum address' : 'Invalid address format'
      );
    }
  }

  // Test 5: Validate private key format
  const privateKey = process.env.PRIVATE_KEY || '';
  const pkValid = privateKey.startsWith('0x') && privateKey.length === 66;
  test(
    '  PRIVATE_KEY format',
    pkValid,
    pkValid
      ? 'Valid (0x + 64 hex chars)'
      : 'Invalid! Must be 0x followed by 64 hex characters'
  );

  // Test 6: Validate chain ID is a number
  const chainId = process.env.CHAIN_ID || '';
  const chainIdNum = parseInt(chainId, 10);
  test(
    '  CHAIN_ID',
    !isNaN(chainIdNum),
    !isNaN(chainIdNum) ? `Valid (${chainIdNum})` : 'Invalid! Must be a number'
  );

  console.log('\n3. Testing External Connections...\n');

  // Test 7: Test RPC connection
  if (process.env.RPC_URL) {
    try {
      const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
      const network = await provider.getNetwork();
      const blockNumber = await provider.getBlockNumber();
      test(
        '  Blockchain RPC',
        true,
        `Connected! Chain ID: ${network.chainId}, Block: ${blockNumber}`
      );
    } catch (error: any) {
      test(
        '  Blockchain RPC',
        false,
        `Connection failed: ${error.message}`
      );
    }
  }

  // Test 8: Test PZERO API connection
  if (pzeroUrlValid && process.env.PZERO_API_URL) {
    try {
      const response = await axios.get(
        `${process.env.PZERO_API_URL}/health`,
        {
          timeout: 5000,
          headers: {
            'x-pzero-api-key': process.env.PZERO_API_KEY,
            'x-pzero-client-id': process.env.PZERO_CLIENT_ID,
          },
        }
      );
      test(
        '  PZERO API',
        response.status === 200,
        'Connected! PZERO service is healthy'
      );
    } catch (error: any) {
      if (error.response?.status === 401) {
        test(
          '  PZERO API',
          false,
          'Connection successful but API key is invalid'
        );
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        test(
          '  PZERO API',
          false,
          `Cannot reach PZERO API (${error.code})`
        );
      } else {
        test(
          '  PZERO API',
          false,
          `Connection failed: ${error.message}`
        );
      }
    }
  }

  // Test 9: Test wallet balance (optional warning)
  if (process.env.RPC_URL && process.env.PRIVATE_KEY && pkValid) {
    try {
      const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
      const balance = await provider.getBalance(wallet.address);
      const balanceEth = ethers.formatEther(balance);

      test(
        '  Wallet Balance',
        parseFloat(balanceEth) > 0,
        `${balanceEth} ETH (Wallet: ${wallet.address.slice(0, 10)}...)`
      );

      if (parseFloat(balanceEth) < 0.01) {
        console.log('    ⚠️  Warning: Low balance. You may need more ETH for gas fees.');
      }
    } catch (error) {
      // Don't fail on this test, just skip
      console.log('    ℹ️  Could not check wallet balance (non-critical)');
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════');
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const failed = total - passed;

  if (failed === 0) {
    console.log('✅ All tests passed!');
    console.log('═══════════════════════════════════════\n');
    console.log('Your configuration is ready. You can now run:');
    console.log('  npm run dev     - Start development server');
    console.log('  npm run build   - Build for production');
    console.log('  npm start       - Start production server\n');
    process.exit(0);
  } else {
    console.log(`❌ ${failed} test(s) failed`);
    console.log('═══════════════════════════════════════\n');
    console.log('Please fix the issues above before running the server.');
    console.log('Check your .env file and ensure all values are correct.\n');
    console.log('For help, see: README.md#configuration\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('\n❌ Configuration test failed:', error.message);
  process.exit(1);
});
