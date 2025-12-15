import { ethers } from 'ethers';
import { config } from '../config';

/**
 * Calculates a single reward value based on the index/id.
 *
 * This function can implement different logic based on the index parameter,
 * allowing for varied rewards in multi-variant scenarios.
 *
 * @param index - The index/id of the reward (0 for single-value mode, 0-N for multi-variant)
 * @param _prompt - The prompt text (reserved for future logic)
 * @param _author - The author's Ethereum address (reserved for future logic)
 * @returns Single reward amount as string in wei (with 18 decimals)
 *
 * @example
 * const reward0 = calculateSingleReward(0, "What is AI?", "0x...");
 * console.log(reward0); // "10000000000000000000" (10 tokens)
 *
 * const reward1 = calculateSingleReward(1, "What is AI?", "0x...");
 * console.log(reward1); // "15000000000000000000" (15 tokens)
 */
export function calculateSingleReward(
  index: number,
  _prompt: string,
  _author: string
): string {
  // TODO: Implement sophisticated reward calculation logic based on index
  // Parameters are prefixed with _ as they're reserved for future use
  // Current implementation: Hardcoded values based on index

  const REWARD_VALUES = ['10', '15', '20', '30'];

  // Get the reward value for this index (cycle if index exceeds array length)
  const value = REWARD_VALUES[index % REWARD_VALUES.length];

  // Convert to wei (18 decimals)
  return ethers.parseEther(value).toString();
}

/**
 * Calculates the reward for a prompt based on the configuration.
 *
 * Returns either a single value or an array of values depending on
 * the PM_REWARD_VALUES_COUNT environment variable:
 * - 0: Returns single value (calls calculateSingleReward with index 0)
 * - >0: Returns array with that many values (calls calculateSingleReward in loop)
 *
 * @param prompt - The prompt text
 * @param author - The author's Ethereum address
 * @returns Single reward value or array of rewards based on config
 *
 * @example
 * // If PM_REWARD_VALUES_COUNT=0
 * const reward = calculateReward("What is AI?", "0x...");
 * console.log(reward); // "10000000000000000000" (single value)
 *
 * // If PM_REWARD_VALUES_COUNT=4
 * const reward = calculateReward("What is AI?", "0x...");
 * console.log(reward); // ["10000000000000000000", "15000000000000000000", ...] (array)
 */
export function calculateReward(prompt: string, author: string): string | string[] {
  const count = config.rewards.rewardValuesCount;

  // Single value mode (count = 0)
  if (count === 0) {
    return calculateSingleReward(0, prompt, author);
  }

  // Multi-variant mode (count > 0)
  const rewards: string[] = [];
  for (let i = 0; i < count; i++) {
    rewards.push(calculateSingleReward(i, prompt, author));
  }

  return rewards;
}
