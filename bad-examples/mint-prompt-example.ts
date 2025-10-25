/**
 * Example: Minting a Prompt using PromptMiner SDK
 * 
 * This example demonstrates how to interact with the SDK instances to mint a prompt
 * without activity points, register as an active data point change signer, and
 * set up the PromptDO data index implementation.
 *
 * NOTE: PromptMiner address must be allowed to interact with the DP in DataIndex contract (allowDataManager).
 */

import { ethers } from 'ethers';
import { PromptMinerWithActivityPointsActionUpgradeable, PromptDO } from '@projectzero-io/prompt-mining-sdk';

async function main() {
  // Setup provider and contract address
  const provider = new ethers.JsonRpcProvider('...');

  const promptMinerAddress = '0x...'; // Replace with actual contract address
  const promptDOAddress = '0x...'; // Replace with actual PromptDO contract address

  const dp = "0x...";
  const dataIndexAddress = "0x...";

  const privateKey = '0x...'; // Replace with actual private key

  const chainId = (await provider.getNetwork()).chainId.toString();

  // Initialize the PromptMiner and PromptDO SDK instances
  const promptMiner = new PromptMinerWithActivityPointsActionUpgradeable(promptMinerAddress);
  const promptDO = new PromptDO(promptDOAddress);

  // Sign with current wallet
  const wallet = new ethers.Wallet(privateKey, provider); // Replace with actual private key

  const setdiTx = await promptDO.contract.connect(wallet).setDataIndexImplementation(dp, dataIndexAddress);
  await setdiTx.wait();

  console.log("DataIndex implementation set for PromptDO");

  const registerTx = await promptMiner.contract.connect(wallet).registerAsActiveDataPointChangeSigner(true);
  await registerTx.wait();

  console.log("Registered as active data point change signer");

  // Mint a prompt without activity points
  const prompt = "What is the capital of France?";
  const author = wallet.address;

  const mintTx = await promptMiner.mint(
    wallet,
    prompt,
    author,
    0, // No activity points
    null,
    parseInt(chainId),
  );
  await mintTx.wait();

  console.log(`Minted prompt: "${prompt}" to author: ${author}`);
}

// Error handling
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
