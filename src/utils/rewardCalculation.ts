import { ethers } from 'ethers';

/**
 * Calculates the reward amount for a prompt.
 *
 * This function determines how many activity points tokens should be awarded
 * for a given prompt. The calculation logic can be customized based on:
 * - Prompt quality/length
 * - User contribution history
 * - Platform-specific rules
 * - Time-based multipliers
 *
 * Current implementation: Returns a fixed amount of 30 tokens.
 *
 * @param _prompt - The prompt text (reserved for future logic)
 * @param _author - The author's Ethereum address (reserved for future logic)
 * @returns The reward amount as a string in wei (with 18 decimals)
 *
 * @example
 * const reward = calculateReward("What is AI?", "0x...");
 * console.log(reward); // "30000000000000000000" (30 tokens with 18 decimals)
 */
export function calculateReward(_prompt: string, _author: string): string {
  // TODO: Implement sophisticated reward calculation logic
  // Parameters are prefixed with _ as they're reserved for future use
  // Current implementation: Fixed 30 tokens

  const FIXED_REWARD_TOKENS = '30';

  // Convert to wei (18 decimals)
  const rewardWei = ethers.parseEther(FIXED_REWARD_TOKENS);

  return rewardWei.toString();
}
