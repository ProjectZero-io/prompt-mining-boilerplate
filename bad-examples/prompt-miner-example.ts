/**
 * Example: Using PromptMiner SDK
 * 
 * This example demonstrates how to interact with the PromptMiner contract
 * using the Prompt Mining SDK, including how to mint prompts with activity points.
 */

import { ethers } from 'ethers';
import { PromptMinerWithActivityPointsActionUpgradeable, getPromptHash, signMessage } from '@projectzero-io/prompt-mining-sdk';

async function main() {
  // Setup provider and contract address
  const provider = new ethers.JsonRpcProvider('...');
  const promptMinerAddress = '0x...'; // Replace with actual contract address
  const chainId = (await provider.getNetwork()).chainId.toString();

  // Initialize the PromptMiner SDK instance
  const promptMiner = new PromptMinerWithActivityPointsActionUpgradeable(promptMinerAddress);
  const contract = promptMiner.contract.connect(provider);

  console.log('=== PromptMiner Contract Examples ===\n');

  // Example 1: Get contract owner
  const owner = await contract.owner();
  console.log('1. Contract Owner:', owner);

  // Example 2: Check contract constants
  const changeValidityPeriod = await contract.ACTIVE_DATAPOINT_CHANGE_VALIDITY_PERIOD();
  console.log('2. Active DataPoint Change Validity Period:', changeValidityPeriod.toString(), 'seconds');

  console.log('\n=== Helper Functions Example ===\n');

  // Example 3: Using helper functions
  const examplePrompt = ethers.keccak256(ethers.toUtf8Bytes('Example'));
  const exampleAuthor = '0x1234567890123456789012345678901234567890';
  const examplePointsEncoded = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [ethers.parseEther("5")]);

  const exampleHash = getPromptHash(chainId, promptMinerAddress, examplePrompt, exampleAuthor, examplePointsEncoded);
  console.log('3. Generated Prompt Hash:', exampleHash);
  
  // Sign with current wallet
  const wallet = new ethers.Wallet('0x...'); // Replace with actual private key
  const exampleSignature = await signMessage(wallet, exampleHash);
  console.log('4. Generated Signature:', exampleSignature);

  console.log('\n=== Examples completed ===');
}

// Error handling
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
