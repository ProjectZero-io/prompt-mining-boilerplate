/**
 * Basic Example: Minting a prompt with PZERO authorization
 *
 * This example demonstrates the privacy-preserving flow:
 * 1. Prompt is hashed locally (full text never leaves your server)
 * 2. PZERO authorization requested (hash only!)
 * 3. Blockchain mint (full prompt sent directly to blockchain)
 *
 * PRIVACY GUARANTEE:
 * - PZERO only sees the keccak256 hash of the prompt
 * - Full prompt goes directly to the blockchain
 * - Your users' data never passes through PZERO servers
 */

import * as promptMiningService from '../src/services/promptMiningService';

async function main() {
  console.log('=== Prompt Mining Example ===\n');

  // User's prompt - this is sensitive data that stays on your server!
  const userPrompt = 'What is the capital of France?';
  const userAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1';
  const rewardPoints = '10'; // 10 activity points

  console.log(`Prompt: "${userPrompt}"`);
  console.log(`Author: ${userAddress}`);
  console.log(`Reward: ${rewardPoints} activity points\n`);

  try {
    // This single call orchestrates the entire privacy-preserving flow:
    // 1. Hashes prompt: keccak256(userPrompt)
    // 2. Requests PZERO auth with hash only (not full prompt!)
    // 3. Mints to blockchain with full prompt + authorization
    const result = await promptMiningService.mintPrompt(
      userPrompt,    // Full prompt (goes to blockchain only!)
      userAddress,
      rewardPoints
    );

    console.log('\nSUCCESS!');
    console.log('─────────────────────────────────────────');
    console.log(`Transaction Hash:  ${result.transactionHash}`);
    console.log(`Prompt Hash:       ${result.promptHash}`);
    console.log(`Block Number:      ${result.blockNumber}`);
    console.log(`PZERO Nonce:       ${result.pzeroAuthorization?.nonce}`);
    console.log('─────────────────────────────────────────\n');

    // Check quota status
    console.log('Checking PZERO quota...');
    const quota = await promptMiningService.getQuotaStatus();
    console.log(`Quota: ${quota.used}/${quota.limit} (${quota.tier} tier)`);
    console.log(`Resets at: ${new Date(quota.resetAt * 1000).toLocaleString()}\n`);

  } catch (error: any) {
    console.error('\nERROR:', error.message);

    // Handle specific error types
    if (error.name === 'PZeroError') {
      console.error(`PZERO Error Code: ${error.code}`);

      if (error.code === 'QUOTA_EXCEEDED') {
        console.error('\nYour PZERO quota is exceeded.');
        console.error('   Please upgrade your tier at https://dashboard.pzero.io');
      } else if (error.code === 'INVALID_API_KEY') {
        console.error('\nInvalid PZERO API key.');
        console.error('   Check your PZERO_API_KEY in .env file');
      }
    }

    process.exit(1);
  }

  console.log('=== Example Complete ===\n');
}

// Run example
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
