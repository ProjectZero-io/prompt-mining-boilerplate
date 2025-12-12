import { ethers } from 'ethers';

/**
 * Hashes a prompt using keccak256.
 *
 * This function is critical for privacy: it allows us to send only the hash
 * to PZERO for authorization, never the full prompt text.
 *
 * @param prompt - The prompt text to hash
 * @returns Keccak256 hash of the prompt (0x-prefixed hex string)
 *
 * @security
 * - The full prompt is NEVER sent to PZERO
 * - Only this hash is shared for authorization
 * - Full prompt goes directly to blockchain
 *
 * @example
 * const hash = hashPrompt("What is AI?");
 * // Returns: "0x1234567890abcdef..."
 */
export function hashPrompt(prompt: string): string {
  // Convert prompt to bytes and hash
  const promptBytes = ethers.toUtf8Bytes(prompt);
  const hash = ethers.keccak256(promptBytes);
  return hash;
}

/**
 * Encodes activity points for contract interaction.
 *
 * Activity points must be ABI-encoded before being used in contract calls
 * and signature generation. Supports both single values and arrays.
 *
 * @param points - Activity points amount as a string or array of strings (exact token amounts in wei)
 * @returns ABI-encoded activity points
 *
 * @example
 * // Single value
 * const encoded = encodeActivityPoints("10"); // 10 tokens (wei)
 * 
 * // Array of values
 * const encoded = encodeActivityPoints(["10", "15", "20", "30"]);
 */
export function encodeActivityPoints(points: string | string[]): string {
  // Handle array of points
  if (Array.isArray(points)) {
    const pointsWei = points.map(p => BigInt(p));
    
    // ABI encode as uint256[]
    return ethers.AbiCoder.defaultAbiCoder().encode(['uint256[]'], [pointsWei]);
  }
  
  // Handle single point value
  const pointsWei = BigInt(points);

  if (pointsWei < 0n) return '0x';

  // ABI encode as uint256
  return ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [pointsWei]);
}

/**
 * Generates the full prompt hash used for contract signing.
 *
 * This matches the SDK's getPromptHash function and is used to generate
 * the message that PZERO signs for authorization.
 *
 * @param chainId - Blockchain chain ID
 * @param contractAddress - PromptMiner contract address
 * @param promptHash - Keccak256 hash of the prompt
 * @param author - Author's Ethereum address
 * @param encodedPoints - ABI-encoded activity points
 * @returns Hash to be signed for authorization
 *
 * @see @project_zero/prompt-mining-sdk/getPromptHash
 *
 * @example
 * const hash = getPromptHashForSigning(
 *   "1",
 *   "0xContractAddress",
 *   "0xPromptHash",
 *   "0xAuthorAddress",
 *   encodedPoints
 * );
 */
export function getPromptHashForSigning(
  chainId: string,
  contractAddress: string,
  promptHash: string,
  author: string,
  encodedPoints: string
): string {
  // This implementation should match the SDK's getPromptHash exactly
  // Encode all parameters together
  const encoded = ethers.solidityPackedKeccak256(
    ['uint256', 'address', 'bytes32', 'address', 'bytes'],
    [BigInt(chainId), contractAddress, promptHash, author, encodedPoints]
  );

  return encoded;
}

/**
 * Validates an Ethereum address.
 *
 * @param address - Address to validate
 * @returns True if valid Ethereum address
 *
 * @example
 * isValidAddress("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1"); // true
 * isValidAddress("0xinvalid"); // false
 */
export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

/**
 * Validates a hex hash string.
 *
 * @param hash - Hash string to validate
 * @param length - Expected length in bytes (default: 32 for keccak256)
 * @returns True if valid hex hash
 *
 * @example
 * isValidHash("0x1234567890abcdef..."); // true (if 32 bytes)
 * isValidHash("0xinvalid"); // false
 */
export function isValidHash(hash: string, length: number = 32): boolean {
  if (!hash.startsWith('0x')) return false;
  const hexPart = hash.slice(2);
  if (hexPart.length !== length * 2) return false;
  return /^[0-9a-fA-F]+$/.test(hexPart);
}

/**
 * Formats wei amount to ether string.
 *
 * @param wei - Wei amount (string or bigint)
 * @returns Ether amount as string
 *
 * @example
 * formatEther("1000000000000000000"); // "1.0"
 */
export function formatEther(wei: string | bigint): string {
  return ethers.formatEther(wei);
}

/**
 * Parses ether amount to wei.
 *
 * @param ether - Ether amount as string
 * @returns Wei amount as bigint
 *
 * @example
 * parseEther("1.0"); // 1000000000000000000n
 */
export function parseEther(ether: string): bigint {
  return ethers.parseEther(ether);
}
