import { Address, Hex, PublicClient, zeroAddress, zeroHash } from "viem";
import { jbControllerAbi, jbTokensAbi } from "../generated/juicebox.js";
import { JBChainId } from "../types.js";
import { v6Address } from "./types.js";

/**
 * A prepared `deployERC20For` transaction request.
 */
export interface V6DeployErc20TxRequest {
  chainId: JBChainId;
  address: Address;
  abi: typeof jbControllerAbi;
  functionName: "deployERC20For";
  args: readonly [bigint, string, string, Hex];
}

/**
 * Build a `JBController.deployERC20For(projectId, name, symbol, salt)` transaction
 * request, deploying a claimable ERC-20 for a project's tokens.
 *
 * Requires the project owner or the DEPLOY_ERC20 permission.
 *
 * @param args.chainId The chain to deploy on.
 * @param args.projectId The project's id.
 * @param args.name The ERC-20's name.
 * @param args.symbol The ERC-20's symbol.
 * @param args.salt A CREATE2 salt. Use the same non-zero salt (from the same deployer)
 * across chains for a same-address omnichain ERC-20. Defaults to zero (non-deterministic
 * address).
 * @returns The transaction request.
 */
export function buildDeployErc20Tx({
  chainId,
  projectId,
  name,
  symbol,
  salt = zeroHash,
}: {
  chainId: JBChainId;
  projectId: bigint;
  name: string;
  symbol: string;
  salt?: Hex;
}): V6DeployErc20TxRequest {
  return {
    chainId,
    address: v6Address("JBController", chainId),
    abi: jbControllerAbi,
    functionName: "deployERC20For",
    args: [projectId, name, symbol, salt],
  };
}

/**
 * A prepared `claimTokensFor` transaction request.
 */
export interface V6ClaimTokensTxRequest {
  chainId: JBChainId;
  address: Address;
  abi: typeof jbControllerAbi;
  functionName: "claimTokensFor";
  args: readonly [Address, bigint, bigint, Address];
}

/**
 * Build a `JBController.claimTokensFor(holder, projectId, tokenCount, beneficiary)`
 * transaction request, claiming a holder's internal token credits as ERC-20 tokens.
 *
 * The project must have an ERC-20 deployed (see {@link buildDeployErc20Tx}). Claiming
 * for another holder requires the CLAIM_TOKENS permission.
 *
 * @param args.chainId The chain to claim on.
 * @param args.holder The address whose credits are being claimed.
 * @param args.projectId The project's id.
 * @param args.tokenCount The number of credits to claim, as a fixed point number with
 * 18 decimals.
 * @param args.beneficiary The address that receives the ERC-20 tokens.
 * @returns The transaction request.
 */
export function buildClaimTokensTx({
  chainId,
  holder,
  projectId,
  tokenCount,
  beneficiary,
}: {
  chainId: JBChainId;
  holder: Address;
  projectId: bigint;
  tokenCount: bigint;
  beneficiary: Address;
}): V6ClaimTokensTxRequest {
  return {
    chainId,
    address: v6Address("JBController", chainId),
    abi: jbControllerAbi,
    functionName: "claimTokensFor",
    args: [holder, projectId, tokenCount, beneficiary],
  };
}

/**
 * A prepared `transferCreditsFrom` transaction request.
 */
export interface V6TransferCreditsTxRequest {
  chainId: JBChainId;
  address: Address;
  abi: typeof jbControllerAbi;
  functionName: "transferCreditsFrom";
  args: readonly [Address, bigint, Address, bigint];
}

/**
 * Build a `JBController.transferCreditsFrom(holder, projectId, recipient,
 * creditCount)` transaction request, transferring internal token credits (unclaimed
 * tokens) to another address.
 *
 * Transferring another holder's credits requires the TRANSFER_CREDITS permission.
 *
 * @param args.chainId The chain to transfer on.
 * @param args.holder The address whose credits are being transferred.
 * @param args.projectId The project's id.
 * @param args.recipient The address that receives the credits.
 * @param args.creditCount The number of credits to transfer, as a fixed point number
 * with 18 decimals.
 * @returns The transaction request.
 */
export function buildTransferCreditsTx({
  chainId,
  holder,
  projectId,
  recipient,
  creditCount,
}: {
  chainId: JBChainId;
  holder: Address;
  projectId: bigint;
  recipient: Address;
  creditCount: bigint;
}): V6TransferCreditsTxRequest {
  return {
    chainId,
    address: v6Address("JBController", chainId),
    abi: jbControllerAbi,
    functionName: "transferCreditsFrom",
    args: [holder, projectId, recipient, creditCount],
  };
}

/**
 * A prepared `mintTokensOf` transaction request.
 */
export interface V6MintTokensTxRequest {
  chainId: JBChainId;
  address: Address;
  abi: typeof jbControllerAbi;
  functionName: "mintTokensOf";
  args: readonly [bigint, bigint, Address, string, boolean];
}

/**
 * Build a `JBController.mintTokensOf(projectId, tokenCount, beneficiary, memo,
 * useReservedPercent)` transaction request, minting new project tokens.
 *
 * Only works when the project's ruleset allows owner minting; requires the project
 * owner or the MINT_TOKENS permission.
 *
 * @param args.chainId The chain to mint on.
 * @param args.projectId The project's id.
 * @param args.tokenCount The number of tokens to mint, as a fixed point number with 18
 * decimals.
 * @param args.beneficiary The address that receives the minted tokens.
 * @param args.memo A memo included in the MintTokens event. Defaults to "".
 * @param args.useReservedPercent Whether the ruleset's reserved percent should be
 * withheld from the mint for the project's reserved splits. Defaults to true.
 * @returns The transaction request.
 */
export function buildMintTokensTx({
  chainId,
  projectId,
  tokenCount,
  beneficiary,
  memo = "",
  useReservedPercent = true,
}: {
  chainId: JBChainId;
  projectId: bigint;
  tokenCount: bigint;
  beneficiary: Address;
  memo?: string;
  useReservedPercent?: boolean;
}): V6MintTokensTxRequest {
  return {
    chainId,
    address: v6Address("JBController", chainId),
    abi: jbControllerAbi,
    functionName: "mintTokensOf",
    args: [projectId, tokenCount, beneficiary, memo, useReservedPercent],
  };
}

/**
 * A prepared `burnTokensOf` transaction request.
 */
export interface V6BurnTokensTxRequest {
  chainId: JBChainId;
  address: Address;
  abi: typeof jbControllerAbi;
  functionName: "burnTokensOf";
  args: readonly [Address, bigint, bigint, string];
}

/**
 * Build a `JBController.burnTokensOf(holder, projectId, tokenCount, memo)` transaction
 * request, burning a holder's project tokens.
 *
 * Burning another holder's tokens requires the BURN_TOKENS permission.
 *
 * @param args.chainId The chain to burn on.
 * @param args.holder The address whose tokens are being burned.
 * @param args.projectId The project's id.
 * @param args.tokenCount The number of tokens to burn, as a fixed point number with 18
 * decimals.
 * @param args.memo A memo included in the BurnTokens event. Defaults to "".
 * @returns The transaction request.
 */
export function buildBurnTokensTx({
  chainId,
  holder,
  projectId,
  tokenCount,
  memo = "",
}: {
  chainId: JBChainId;
  holder: Address;
  projectId: bigint;
  tokenCount: bigint;
  memo?: string;
}): V6BurnTokensTxRequest {
  return {
    chainId,
    address: v6Address("JBController", chainId),
    abi: jbControllerAbi,
    functionName: "burnTokensOf",
    args: [holder, projectId, tokenCount, memo],
  };
}

/**
 * Read a project's ERC-20 token address via `JBTokens.tokenOf(projectId)`.
 *
 * @param client A viem public client on the given chain.
 * @param args.chainId The chain to read from.
 * @param args.projectId The project's id.
 * @returns The token address, or null when the project has no ERC-20 deployed (token
 * balances are held as internal credits).
 */
export async function getTokenAddress(
  client: PublicClient,
  {
    chainId,
    projectId,
  }: {
    chainId: JBChainId;
    projectId: bigint;
  },
): Promise<Address | null> {
  const token = await client.readContract({
    address: v6Address("JBTokens", chainId),
    abi: jbTokensAbi,
    functionName: "tokenOf",
    args: [projectId],
  });

  return token === zeroAddress ? null : token;
}

/**
 * Read a holder's internal token credit balance (unclaimed tokens) via
 * `JBTokens.creditBalanceOf(holder, projectId)`.
 *
 * @param client A viem public client on the given chain.
 * @param args.chainId The chain to read from.
 * @param args.projectId The project's id.
 * @param args.holder The holder to read the credit balance of.
 * @returns The holder's credit balance, as a fixed point number with 18 decimals.
 */
export async function getCreditBalance(
  client: PublicClient,
  {
    chainId,
    projectId,
    holder,
  }: {
    chainId: JBChainId;
    projectId: bigint;
    holder: Address;
  },
): Promise<bigint> {
  return client.readContract({
    address: v6Address("JBTokens", chainId),
    abi: jbTokensAbi,
    functionName: "creditBalanceOf",
    args: [holder, projectId],
  });
}
