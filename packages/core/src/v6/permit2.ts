import type { Address, Hex, PublicClient } from "viem";
import { NATIVE_TOKEN } from "../constants.js";
import type { JBChainId } from "../types.js";
import {
  UNISWAP_PERMIT2_ADDRESS,
  uniswapV4Deployment,
} from "./uniswapV4Deployments.js";

/** Canonical Permit2 deployment shared by supported EVM chains. */
export const PERMIT2_ADDRESS = UNISWAP_PERMIT2_ADDRESS;

/** Permit2 methods used to inspect or establish Universal Router allowances. */
export const permit2Abi = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "token", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
      { name: "nonce", type: "uint48" },
    ],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "spender", type: "address" },
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
    ],
    outputs: [],
  },
] as const;

/** EIP-712 types for Permit2's one-token, one-spender authorization. */
export const PERMIT2_TYPES = {
  PermitDetails: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint160" },
    { name: "expiration", type: "uint48" },
    { name: "nonce", type: "uint48" },
  ],
  PermitSingle: [
    { name: "details", type: "PermitDetails" },
    { name: "spender", type: "address" },
    { name: "sigDeadline", type: "uint256" },
  ],
} as const;

export interface Permit2SignatureAuthorization {
  chainId: JBChainId;
  token: Address;
  spender: Address;
  amount: bigint;
  expiration: number;
  nonce: number;
  sigDeadline: bigint;
}

export interface Permit2Allowance {
  amount: bigint;
  expiration: number;
  nonce: number;
}

/** Build the exact typed-data payload a wallet signs for PermitSingle. */
export function permit2TypedData(authorization: Permit2SignatureAuthorization) {
  return {
    domain: {
      name: "Permit2" as const,
      chainId: authorization.chainId,
      verifyingContract: PERMIT2_ADDRESS,
    },
    types: PERMIT2_TYPES,
    primaryType: "PermitSingle" as const,
    message: {
      details: {
        token: authorization.token,
        amount: authorization.amount,
        expiration: authorization.expiration,
        nonce: authorization.nonce,
      },
      spender: authorization.spender,
      sigDeadline: authorization.sigDeadline,
    },
  };
}

/** Read an owner's Permit2 allowance, defaulting the spender to Universal Router. */
export async function readPermit2Allowance(
  client: PublicClient,
  {
    chainId,
    owner,
    token,
    spender,
  }: {
    chainId: JBChainId;
    owner: Address;
    token: Address;
    spender?: Address;
  },
): Promise<Permit2Allowance> {
  const resolvedSpender =
    spender ?? uniswapV4Deployment(chainId)?.universalRouter;
  if (!resolvedSpender) {
    throw new Error(
      `No supported Uniswap Universal Router on chain ${chainId}.`,
    );
  }
  const [amount, expiration, nonce] = await client.readContract({
    address: PERMIT2_ADDRESS,
    abi: permit2Abi,
    functionName: "allowance",
    args: [owner, token, resolvedSpender],
  });
  return { amount, expiration, nonce };
}

/** Whether an allowance is too small or expires inside the safety buffer. */
export function permit2AllowanceNeedsRefresh({
  allowance,
  amount,
  now = Math.floor(Date.now() / 1000),
  expirationBufferSeconds = 1_800,
}: {
  allowance: Pick<Permit2Allowance, "amount" | "expiration">;
  amount: bigint;
  now?: number;
  expirationBufferSeconds?: number;
}): boolean {
  if (expirationBufferSeconds < 0) {
    throw new Error("expirationBufferSeconds cannot be negative.");
  }
  return (
    allowance.amount < amount ||
    allowance.expiration <= now + expirationBufferSeconds
  );
}

/** Read whether an ERC-20 needs a fresh Permit2 authorization for Universal Router. */
export async function needsPermit2Approval({
  client,
  chainId,
  owner,
  token,
  amount,
  now,
  expirationBufferSeconds,
}: {
  client: PublicClient;
  chainId: JBChainId;
  owner: Address;
  token: Address;
  amount: bigint;
  now?: number;
  expirationBufferSeconds?: number;
}): Promise<boolean> {
  if (token.toLowerCase() === NATIVE_TOKEN.toLowerCase()) return false;
  const allowance = await readPermit2Allowance(client, {
    chainId,
    owner,
    token,
  });
  return permit2AllowanceNeedsRefresh({
    allowance,
    amount,
    now,
    expirationBufferSeconds,
  });
}

/**
 * Prefer a gasless Permit2 signature for EOAs. Contract wallets generally need
 * the on-chain Permit2 approval path unless their integration handles ERC-1271.
 */
export function shouldUsePermit2Signature({
  needsApproval,
  walletLookupSettled,
  walletBytecode,
  isSafe,
}: {
  needsApproval: boolean;
  walletLookupSettled: boolean;
  walletBytecode?: Hex;
  isSafe: boolean;
}): boolean {
  const isContract = !!walletBytecode && walletBytecode !== "0x";
  return needsApproval && walletLookupSettled && !isContract && !isSafe;
}

/** Fall back only for wallets that cannot sign typed data, never on rejection. */
export function permit2SignatureNeedsOnchainFallback(error: unknown): boolean {
  const messages: string[] = [];
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth += 1) {
    if (typeof current !== "object") break;
    const value = current as Record<string, unknown>;
    for (const key of ["code", "shortMessage", "message", "details"]) {
      if (value[key] !== undefined) messages.push(String(value[key]));
    }
    current = value.cause;
  }
  const text = messages.join(" ").toLowerCase();
  if (/user rejected|rejected the request|denied|4001/.test(text)) return false;
  return /(^|\s)-32602(\s|$)|(^|\s)-32601(\s|$)|(^|\s)4200(\s|$)|invalid parameters|method .*not supported|unsupported method|typed data.*not supported/.test(
    text,
  );
}
