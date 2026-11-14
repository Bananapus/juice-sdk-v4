import {
  encodeAbiParameters,
  erc20Abi,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { NATIVE_TOKEN } from "../constants.js";
import type { JBChainId } from "../types.js";
import { addToHookMetadata, hookMetadataId } from "../utils/hook.js";
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

/** How long a signed pay authorization stays usable, matching the swap flows. */
export const PERMIT2_PAY_AUTHORIZATION_SECONDS = 1_800;

const MAX_UINT160 = (1n << 160n) - 1n;

/** What an ERC-20 payment to a pay entry still needs from the payer. */
export interface Permit2PayAuthorization {
  /** The entry's own ERC-20 allowance covers the amount: pay with no authorization. */
  direct: boolean;
  /** The token's allowance for Permit2 is short: one approval of Permit2 comes first. */
  needsTokenApproval: boolean;
  /** The exact, expiring allowance to sign with `signReviewed({ kind: "permit2" })`. */
  authorization: Permit2SignatureAuthorization;
}

/**
 * Read what paying `amount` of an ERC-20 into a pay entry needs. The entry is
 * the contract the payer calls: JBMultiTerminal, JBRouterTerminal, its registry
 * or its gateway. Each pulls through its own ERC-20 allowance when that covers
 * the amount, and otherwise through Permit2 with the allowance its pay
 * metadata carries (see {@link addPermit2PayMetadata}).
 *
 * The authorization is for exactly `amount`, to `entry` only, and expires
 * {@link PERMIT2_PAY_AUTHORIZATION_SECONDS} after the chain's latest block.
 */
export async function readPermit2PayAuthorization(
  client: PublicClient,
  {
    chainId,
    owner,
    token,
    entry,
    amount,
    blockNumber,
  }: {
    chainId: JBChainId;
    owner: Address;
    token: Address;
    entry: Address;
    amount: bigint;
    /** Read allowances at this block, so an approval just mined is seen on a lagging backend. */
    blockNumber?: bigint;
  },
): Promise<Permit2PayAuthorization> {
  if (amount <= 0n || amount > MAX_UINT160) {
    throw new Error("The payment amount is outside Permit2's uint160 range.");
  }
  const allowanceFor = (spender: Address) =>
    client.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "allowance",
      args: [owner, spender],
      blockNumber,
    });
  const [direct, permit2Token, [, , nonce], block] = await Promise.all([
    allowanceFor(entry),
    allowanceFor(PERMIT2_ADDRESS),
    client.readContract({
      address: PERMIT2_ADDRESS,
      abi: permit2Abi,
      functionName: "allowance",
      args: [owner, token, entry],
      blockNumber,
    }),
    client.getBlock({ blockTag: "latest" }),
  ]);
  const now = Number(block.timestamp);
  if (!Number.isSafeInteger(now) || now <= 0) {
    throw new Error("Could not read the chain's time for the authorization.");
  }
  const deadline = now + PERMIT2_PAY_AUTHORIZATION_SECONDS;
  return {
    direct: direct >= amount,
    needsTokenApproval: permit2Token < amount,
    authorization: {
      chainId,
      token,
      spender: entry,
      amount,
      expiration: deadline,
      nonce,
      sigDeadline: BigInt(deadline),
    },
  };
}

/**
 * Add a signed Permit2 allowance to pay metadata, keyed to the entry that
 * spends it. The entry decodes one `JBSingleAllowance` tuple
 * (`sigDeadline, amount, expiration, nonce, signature`), so the payload is a
 * single dynamic tuple, not flat fields.
 *
 * @link https://github.com/Bananapus/nana-core-v6/blob/main/src/structs/JBSingleAllowance.sol
 */
export function addPermit2PayMetadata({
  metadata,
  authorization,
  signature,
}: {
  metadata?: Hex;
  authorization: Permit2SignatureAuthorization;
  signature: Hex;
}): Hex {
  return addToHookMetadata(
    metadata,
    hookMetadataId(authorization.spender, "permit2"),
    encodeAbiParameters(
      [
        {
          type: "tuple",
          components: [
            { name: "sigDeadline", type: "uint256" },
            { name: "amount", type: "uint160" },
            { name: "expiration", type: "uint48" },
            { name: "nonce", type: "uint48" },
            { name: "signature", type: "bytes" },
          ],
        },
      ],
      [
        {
          sigDeadline: authorization.sigDeadline,
          amount: authorization.amount,
          expiration: authorization.expiration,
          nonce: authorization.nonce,
          signature,
        },
      ],
    ),
  );
}

/** How a payer authorizes an ERC-20 payment to a pay entry. */
export type Erc20PayAuthorizationPlan =
  /** The entry's own allowance already covers the amount. */
  | { kind: "none" }
  /**
   * A contract wallet (a Safe, or any account with code) approves the entry
   * for the exact amount: it cannot produce the signature Permit2 checks, and
   * its signers can outlast the authorization's deadline.
   */
  | { kind: "approve"; spender: Address; amount: bigint }
  /**
   * An EOA signs an exact, expiring Permit2 allowance for the entry. When
   * `needsTokenApproval`, one approval of Permit2 itself comes first.
   */
  | {
      kind: "permit2";
      needsTokenApproval: boolean;
      authorization: Permit2SignatureAuthorization;
    };

/**
 * Decide how `owner` authorizes paying `amount` of an ERC-20 into a pay entry.
 * One rule for every client: nothing when the entry is already approved, an
 * exact approval of the entry for contract wallets, a Permit2 signature for
 * EOAs. The native token needs no authorization and has no plan; do not call
 * this for it.
 *
 * @param args.isSafe The connected wallet is a Safe (a Safe app or a Safe
 * reached through WalletConnect), whatever its code reads as here.
 */
export async function planErc20PayAuthorization(
  client: PublicClient,
  {
    isSafe,
    ...args
  }: {
    chainId: JBChainId;
    owner: Address;
    token: Address;
    entry: Address;
    amount: bigint;
    blockNumber?: bigint;
    isSafe: boolean;
  },
): Promise<Erc20PayAuthorizationPlan> {
  const [read, walletBytecode] = await Promise.all([
    readPermit2PayAuthorization(client, args),
    client.getCode({ address: args.owner }),
  ]);
  if (read.direct) return { kind: "none" };
  return shouldUsePermit2Signature({
    needsApproval: true,
    walletLookupSettled: true,
    walletBytecode,
    isSafe,
  })
    ? {
        kind: "permit2",
        needsTokenApproval: read.needsTokenApproval,
        authorization: read.authorization,
      }
    : { kind: "approve", spender: args.entry, amount: args.amount };
}
