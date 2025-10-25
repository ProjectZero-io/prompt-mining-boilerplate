/**
 * Example: Using PromptDO SDK
 * 
 * This example demonstrates how to interact with the PromptDO (Data Object) contract
 * using the Prompt Mining SDK.
 */

import { ethers } from 'ethers';
import { PromptDO } from '@projectzero-io/prompt-mining-sdk';

async function main() {
  // Setup provider and contract address
  const provider = new ethers.JsonRpcProvider('...');
  const promptDOAddress = '0x...'; // Replace with actual contract address

  // Initialize the PromptDO SDK instance
  const promptDO = new PromptDO(promptDOAddress);
  const contract = promptDO.contract.connect(provider);

  console.log('=== PromptDO Contract Examples ===\n');

  // Example 1: Check if a prompt is minted
  const promptHash = ethers.keccak256(ethers.toUtf8Bytes('Example prompt'));
  const isMinted = await contract.isPromptMinted(promptHash);
  console.log('1. Prompt is minted:', isMinted);

  console.log('\n=== Examples completed ===');
}

// Error handling
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
