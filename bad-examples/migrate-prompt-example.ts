
/**
 * Example: Migrating a Prompt using PromptMiner SDK
 * 
 * This example demonstrates how to interact with the SDK instances to migrate a prompt
 *
 * NOTE: PromptMiner2 address must be allowed to interact with the new DP in DataIndex contract (allowDataManager).
 */

import { ethers } from 'ethers';
import { PromptMinerWithActivityPointsActionUpgradeable, PromptMinerWithERC20TransferActionUpgradeable } from '@projectzero-io/prompt-mining-sdk';

async function main() {
  // Setup provider and contract address
  const provider = new ethers.JsonRpcProvider('...');

  const promptMiner1Address = '0x...'; // Replace with actual contract address
  const promptMiner2Address = '0x...'; // Replace with actual contract address

  const newDp = "0x...";

  const privateKey = '0x...'; // Replace with actual private key

  // Initialize the PromptMiners SDK instances
  const promptMiner1 = new PromptMinerWithActivityPointsActionUpgradeable(promptMiner1Address);
  const promptMiner2 = new PromptMinerWithERC20TransferActionUpgradeable(promptMiner2Address);

  // Sign with current wallet
  const wallet = new ethers.Wallet(privateKey, provider); // Replace with actual private key

  // Migrate the prompt
  const prompt = "What is the capital of France?";

  const migrateTx = await promptMiner1.migratePrompt(
    wallet,
    prompt,
    newDp,
    promptMiner2.contract
  );
  await migrateTx.wait();

  console.log(`Prompt migrated: ${prompt}`);
}

// Error handling
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
