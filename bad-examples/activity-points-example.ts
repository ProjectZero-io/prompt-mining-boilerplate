/**
 * Example: Using ActivityPoints SDK
 * 
 * This example demonstrates how to interact with the ActivityPoints contract
 * using the Prompt Mining SDK.
 */

import { ethers } from 'ethers';
import { ActivityPoints } from '@projectzero-io/prompt-mining-sdk';

async function main() {
  // Setup provider and contract address
  const provider = new ethers.JsonRpcProvider('...');
  const activityPointsAddress = '0x...'; // Replace with actual contract address

  // Initialize the ActivityPoints SDK instance
  const activityPoints = new ActivityPoints(activityPointsAddress);
  const contract = activityPoints.contract.connect(provider);

  console.log('=== ActivityPoints Contract Examples ===\n');

  // Example 1: Get token name
  const name = await contract.name();
  console.log('1. Token Name:', name);

  // Example 2: Get token symbol
  const symbol = await contract.symbol();
  console.log('2. Token Symbol:', symbol);

  // Example 3: Get total supply
  const totalSupply = await contract.totalSupply();
  console.log('3. Total Supply:', ethers.formatEther(totalSupply), symbol);

  // Example 4: Get decimals
  const decimals = await contract.decimals();
  console.log('4. Decimals:', decimals);

  // Example 5: Check if address has MINTER_ROLE
  const minterRole = await contract.MINTER_ROLE();
  const minterAddress = '0x...'; // Replace with address to check
  const hasMinterRole = await contract.hasRole(minterRole, minterAddress);
  console.log('5. Has MINTER_ROLE:', hasMinterRole);

  // Example 6: Check if address has DEFAULT_ADMIN_ROLE
  const adminRole = await contract.DEFAULT_ADMIN_ROLE();
  const adminAddress = '0x...'; // Replace with address to check
  const hasAdminRole = await contract.hasRole(adminRole, adminAddress);
  console.log('6. Has DEFAULT_ADMIN_ROLE:', hasAdminRole);

  console.log('\n=== Examples completed ===');
}

// Error handling
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
