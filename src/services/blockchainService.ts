import { ethers } from 'ethers';
import {
  getTypedDataForMetaTxMint as sdkGetTypedDataForMetaTxMint,
  buildRequest as sdkBuildRequest,
  contractFactories,
} from '@project_zero/prompt-mining-sdk';
import type {
  PromptDOType,
  PromptMinerWithActivityPointsActionUpgradeableType,
  ActivityPointsType,
} from '@project_zero/prompt-mining-sdk';
import { config } from '../config';

/**
 * Blockchain provider and wallet instances.
 * Initialized once and reused for all transactions.
 */
let provider: ethers.JsonRpcProvider | null = null;
let wallet: ethers.Wallet | null = null;

/**
 * SDK contract instances.
 */
let promptMinerContract: PromptMinerWithActivityPointsActionUpgradeableType | null = null;
let promptDOContract: PromptDOType | null = null;
let activityPointsContract: ActivityPointsType | null = null;

/**
 * Initializes blockchain provider and wallet.
 *
 * This function should be called once at application startup.
 * Subsequent calls will return the existing instances.
 *
 * @returns Initialized provider and wallet
 *
 * @throws {Error} If RPC connection fails
 *
 * @example
 * const { provider, wallet } = initializeBlockchain();
 */
export function initializeBlockchain(): {
  provider: ethers.JsonRpcProvider;
  wallet: ethers.Wallet;
} {
  if (provider && wallet) {
    return { provider, wallet };
  }

  // Initialize provider
  provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);

  // Initialize wallet
  wallet = new ethers.Wallet(config.blockchain.privateKey, provider);

  console.log(`Blockchain initialized:`);
  console.log(`- Chain ID: ${config.blockchain.chainId}`);
  console.log(`- Wallet: ${wallet.address}`);

  return { provider, wallet };
}

/**
 * Gets or initializes PromptMiner contract instance.
 *
 * @returns PromptMiner contract connected to wallet
 */
function getPromptMinerContract(): PromptMinerWithActivityPointsActionUpgradeableType {
  if (!promptMinerContract) {
    promptMinerContract = contractFactories.PromptMinerWithActivityPoints.connect(
      config.contracts.promptMiner
    );
  }

  const { wallet: w } = initializeBlockchain();
  return promptMinerContract.connect(w);
}

/**
 * Gets or initializes PromptDO contract instance.
 *
 * @returns PromptDO contract connected to provider
 */
export function getPromptDOContract(): PromptDOType {
  if (!promptDOContract) {
    promptDOContract = contractFactories.PromptDO.connect(config.contracts.promptDO);
  }

  const { wallet: w } = initializeBlockchain();
  return promptDOContract.connect(w);
}

/**
 * Gets or initializes ActivityPoints contract instance.
 *
 * @returns ActivityPoints contract connected to provider
 */
function getActivityPointsContract(): ActivityPointsType {
  if (!activityPointsContract) {
    activityPointsContract = contractFactories.ActivityPoints.connect(
      config.contracts.activityPoints
    );
  }

  const { wallet: w } = initializeBlockchain();
  return activityPointsContract.connect(w);
}

/**
 * Checks if a prompt has been minted.
 *
 * This is a read-only operation that queries the PromptMiner contract.
 *
 * @param promptHash - Keccak256 hash of the prompt
 * @returns True if prompt is minted
 *
 * @example
 * const isMinted = await checkPromptMinted(promptHash);
 */
export async function checkPromptMinted(promptHash: string): Promise<boolean> {
  const contract = getPromptMinerContract();

  try {
    const isMinted = await contract.isPromptMinted(promptHash);
    return isMinted;
  } catch (error: any) {
    console.error(`Failed to check prompt status:`, error.message);
    throw new Error(`Failed to query prompt status: ${error.message}`);
  }
}

/**
 * Gets activity points balance for an address.
 *
 * @param address - Ethereum address to check
 * @returns Balance information (wei and ether)
 *
 * @example
 * const balance = await getActivityPointsBalance("0x...");
 * console.log(`Balance: ${balance.ether} points`);
 */
export async function getActivityPointsBalance(address: string): Promise<{
  wei: string;
  ether: string;
  symbol: string;
}> {
  const contract = getActivityPointsContract();

  try {
    const [balance, symbol] = await Promise.all([contract.balanceOf(address), contract.symbol()]);

    return {
      wei: balance.toString(),
      ether: ethers.formatEther(balance),
      symbol,
    };
  } catch (error: any) {
    console.error(`Failed to get balance:`, error.message);
    throw new Error(`Failed to query activity points balance: ${error.message}`);
  }
}

/**
 * Gets current gas price from the network.
 *
 * Useful for estimating transaction costs.
 *
 * @returns Gas price in wei
 */
export async function getCurrentGasPrice(): Promise<bigint> {
  const { provider: p } = initializeBlockchain();
  const feeData = await p.getFeeData();
  return feeData.gasPrice || BigInt(0);
}

/**
 * Gets wallet balance (ETH).
 *
 * Useful for checking if wallet has sufficient funds for transactions.
 *
 * @returns Wallet ETH balance
 */
export async function getWalletBalance(): Promise<{
  wei: string;
  ether: string;
}> {
  const { provider: p, wallet: w } = initializeBlockchain();
  const balance = await p.getBalance(w.address);

  return {
    wei: balance.toString(),
    ether: ethers.formatEther(balance),
  };
}

/**
 * Gets typed data for meta-transaction mint using SDK.
 *
 * This function wraps the SDK's getTypedDataForMetaTxMint to prepare
 * EIP-712 typed data for gasless meta-transactions through ERC2771 forwarder.
 *
 * @param from - The address that will be the original sender (author)
 * @param gas - Gas limit for the meta-transaction
 * @param deadline - Timestamp deadline for the meta-transaction
 * @param promptHash - The keccak256 hash of the prompt
 * @param encodedPoints - The ABI-encoded activity points
 * @param actionSignature - The PZERO authorization signature
 * @returns Typed data containing domain, types, and request for signing
 *
 * @example
 * const typedData = await getTypedDataForMetaTxMint(
 *   "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
 *   500000n,
 *   BigInt(Math.floor(Date.now() / 1000) + 3600),
 *   promptHash,
 *   encodedPoints,
 *   pzeroSignature
 * );
 */
export async function getTypedDataForMetaTxMint(
  from: string,
  gas: bigint,
  deadline: bigint,
  promptHash: string,
  encodedPoints: string,
  actionSignature: string
): Promise<{
  domain: {
    name: string;
    version: string;
    chainId: bigint;
    verifyingContract: string;
  };
  types: any;
  requestForSigning: {
    from: string;
    to: string;
    value: bigint;
    gas: bigint;
    nonce: bigint;
    deadline: bigint;
    data: string;
  };
}> {
  const contract = getPromptMinerContract();
  const { wallet: w } = initializeBlockchain();

  // Use the SDK function to get typed data
  // contentURI is empty string for now (will be used for IPFS/Arweave URIs in the future)
  return await sdkGetTypedDataForMetaTxMint(
    contract,
    w,
    from,
    gas,
    deadline,
    promptHash,
    '', // contentURI - empty for now
    encodedPoints,
    actionSignature
  );
}

/**
 * Executes a meta-transaction mint through the ERC2771 forwarder.
 *
 * This function acts as a relayer, building the forward request and
 * submitting it to the ERC2771Forwarder contract which will verify
 * the user's signature and execute the mint operation.
 *
 * @param requestForSigning - The request data that was signed by the user
 * @param forwardSignature - The user's EIP-712 signature
 * @returns Transaction receipt from the forwarder execution
 *
 * @throws {Error} If meta-transaction execution fails
 *
 * @example
 * const receipt = await executeMetaTxMint(
 *   {
 *     from: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
 *     to: "0xPromptMinerAddress",
 *     value: 0n,
 *     gas: 500000n,
 *     nonce: 0n,
 *     deadline: 1735401600n,
 *     data: "0x..."
 *   },
 *   "0xUserSignature..."
 * );
 */
export async function executeMetaTxMint(
  requestForSigning: {
    from: string;
    to: string;
    value: bigint;
    gas: bigint;
    nonce: bigint;
    deadline: bigint;
    data: string;
  },
  forwardSignature: string
): Promise<ethers.TransactionReceipt> {
  const { wallet: w } = initializeBlockchain();

  console.log(`Building meta-transaction request...`);
  console.log(`- User (from): ${requestForSigning.from}`);
  console.log(`- Target (to): ${requestForSigning.to}`);
  console.log(`- Gas limit: ${requestForSigning.gas.toString()}`);
  console.log(`- Deadline: ${requestForSigning.deadline.toString()}`);

  // Use SDK to build the complete forward request
  const { request, erc2771Forwarder } = await sdkBuildRequest(
    requestForSigning,
    forwardSignature,
    w
  );

  console.log(`Forward request built successfully`);
  console.log(`- Forwarder address: ${await erc2771Forwarder.getAddress()}`);

  // Connect the forwarder to our wallet (relayer)
  const forwarderWithSigner = erc2771Forwarder.connect(w);

  try {
    console.log(`Executing meta-transaction through forwarder...`);

    // Execute the forward request
    // The forwarder will verify the signature and call the PromptMiner contract
    const tx = await forwarderWithSigner.execute(request, {
      gasLimit: request.gas + 50000n, // Add buffer for forwarder overhead
    });

    console.log(`Meta-transaction submitted: ${tx.hash}`);
    console.log(`Waiting for confirmation...`);

    // Wait for transaction confirmation
    const receipt = await tx.wait();

    console.log(`✅ Meta-transaction executed! Block: ${receipt!.blockNumber}`);
    console.log(`   Gas used: ${receipt!.gasUsed.toString()}`);

    return receipt!;
  } catch (error: any) {
    console.error(`Failed to execute meta-transaction:`, error.message);

    // Provide helpful error messages
    if (error.message.includes('ERC2771ForwarderExpiredRequest')) {
      throw new Error('Meta-transaction expired. The deadline has passed.');
    } else if (error.message.includes('ERC2771ForwarderInvalidSigner')) {
      throw new Error('Invalid signature. The signature does not match the request.');
    } else if (error.message.includes('ERC2771UntrustfulTarget')) {
      throw new Error('Target contract does not trust this forwarder.');
    }

    throw new Error(`Meta-transaction execution failed: ${error.message}`);
  }
}

/**
 * Executes a direct mint transaction (backend-signed mode).
 *
 * This function allows the BACKEND to mint a prompt on behalf of any user.
 * The backend's wallet signs and submits the transaction, paying for gas.
 * The specified author receives the Activity Points rewards, even if they didn't sign anything.
 *
 * This is useful for server-side minting where you want to reward users without requiring
 * them to have a wallet or pay gas fees, and without using meta-transactions.
 *
 * Contract signature: mint(address author, bytes32 promptHash, string contentURI, bytes actionData, bytes actionSignature)
 *
 * @param author - The address that will receive the Activity Points (can be any address)
 * @param promptHash - The keccak256 hash of the prompt
 * @param contentURI - Content URI for metadata (empty string for now)
 * @param encodedPoints - The ABI-encoded activity points (actionData)
 * @param actionSignature - The PZERO authorization signature
 * @returns Transaction receipt
 *
 * @throws {Error} If mint transaction fails
 *
 * @example
 * // Backend mints and rewards user at 0x742d35... (user doesn't need to sign anything)
 * const receipt = await executeMint(
 *   "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",  // User receives rewards
 *   promptHash,
 *   "",
 *   encodedPoints,
 *   pzeroSignature  // Backend got this from PZERO
 * );
 */
export async function executeMint(
  author: string,
  promptHash: string,
  contentURI: string,
  encodedPoints: string,
  actionSignature: string
): Promise<ethers.TransactionReceipt> {
  const contract = getPromptMinerContract();
  const { wallet: w } = initializeBlockchain();

  console.log(`Executing direct mint transaction...`);
  console.log(`- Author: ${author}`);
  console.log(`- Prompt hash: ${promptHash}`);
  console.log(`- Content URI: ${contentURI || '(empty)'}`);
  console.log(`- PZERO authorization: ${actionSignature.slice(0, 10)}...`);

  try {
    // Call mint function on PromptMiner contract
    // Signature: mint(address author, bytes32 promptHash, string contentURI, bytes actionData, bytes actionSignature)
    // Note: Using full signature to call the specific overload (with author parameter)
    const tx = await contract['mint(address,bytes32,string,bytes,bytes)'](
      author, // Address of the author (receives rewards)
      promptHash, // Prompt hash (bytes32)
      contentURI, // Content URI / metadata (empty string for now)
      encodedPoints, // Encoded activity points amount (actionData)
      actionSignature, // PZERO authorization signature
      {
        gasLimit: 500000, // Adjust based on contract complexity
      }
    );

    console.log(`Transaction submitted: ${tx.hash}`);
    console.log(`Waiting for confirmation...`);

    // Wait for transaction confirmation
    const receipt = await tx.wait();

    console.log(`✅ Prompt minted! Block: ${receipt!.blockNumber}`);
    console.log(`   Gas used: ${receipt!.gasUsed.toString()}`);

    return receipt!;
  } catch (error: any) {
    console.error(`Direct mint failed:`, error.message);

    // Enhanced error handling
    if (error.code === 'INSUFFICIENT_FUNDS') {
      throw new Error(`Insufficient funds for gas. Wallet ${w.address} needs more ETH.`);
    } else if (error.message?.includes('AUTHORIZATION_EXPIRED')) {
      throw new Error('PZERO authorization expired. Please request a new authorization.');
    } else if (error.message?.includes('INVALID_SIGNATURE')) {
      throw new Error('Invalid PZERO signature. Authorization may be corrupted or tampered with.');
    }

    throw new Error(`Mint transaction failed: ${error.message}`);
  }
}
