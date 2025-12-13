import { ethers } from 'ethers';
import { config } from '../config';

/**
 * Calculates the reward amounts for a prompt.
 *
 * This function determines how many activity points tokens should be awarded
 * for a given prompt. The calculation logic can be customized based on:
 * - Prompt quality/length
 * - User contribution history
 * - Platform-specific rules
 * - Time-based multipliers
 *
 * Current implementation: Returns a hardcoded array of reward values.
 *
 * @param _prompt - The prompt text (reserved for future logic)
 * @param _author - The author's Ethereum address (reserved for future logic)
 * @returns Array of reward amounts as strings in wei (with 18 decimals)
 *
 * @example
 * const rewards = calculateRewardArray("What is AI?", "0x...");
 * console.log(rewards); // ["10000000000000000000", "15000000000000000000", "20000000000000000000", "30000000000000000000"]
 */
export function calculateRewardArray(_prompt: string, _author: string): string[] {
  // TODO: Implement sophisticated reward calculation logic
  // Parameters are prefixed with _ as they're reserved for future use
  // Current implementation: Hardcoded array of rewards

  const REWARD_VALUES = ['10', '15', '20', '30'];

  // Convert to wei (18 decimals)
  return REWARD_VALUES.map(value => ethers.parseEther(value).toString());
}

/**
 * Calculates the reward for a prompt based on the configuration.
 *
 * Returns either a single value (first element) or the full array
 * depending on the PM_USE_MULTI_REWARDS environment variable.
 *
 * @param prompt - The prompt text
 * @param author - The author's Ethereum address
 * @returns Single reward value or array of rewards based on config
 *
 * @example
 * // If PM_USE_MULTI_REWARDS=false
 * const reward = calculateReward("What is AI?", "0x...");
 * console.log(reward); // "10000000000000000000" (first value)
 *
 * // If PM_USE_MULTI_REWARDS=true
 * const reward = calculateReward("What is AI?", "0x...");
 * console.log(reward); // ["10000000000000000000", "15000000000000000000", ...]
 */
export function calculateReward(prompt: string, author: string): string | string[] {
  const rewardArray = calculateRewardArray(prompt, author);

  if (config.rewards.useMultiRewards) {
    return rewardArray;
  }

  // Return first value only for single-reward mode
  return rewardArray[0];
}
