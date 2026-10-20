import {
  BaseError,
  ContractFunctionRevertedError,
  isAddress,
  zeroAddress,
  type Address,
  type PublicClient,
} from "viem";
import { jb721TiersHookStoreAbi } from "../generated/juicebox.js";
import type { JBChainId } from "../types.js";
import { getProjectNftInventory } from "./nftInventory.js";

const ownershipAbi = [
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "ERC721NonexistentToken",
    type: "error",
    inputs: [{ type: "uint256", name: "tokenId" }],
  },
] as const;
const tokenMultiplier = 1_000_000_000n;
export type DefifaHolding = { tokenId: bigint; tierId: number };
type MintedTier = {
  id: number;
  initialSupply: number;
  remainingSupply: number;
};
function nonexistentToken(error: unknown): boolean {
  if (!(error instanceof BaseError)) return false;
  const revert = error.walk(
    (cause) => cause instanceof ContractFunctionRevertedError,
  );
  return (
    revert instanceof ContractFunctionRevertedError &&
    revert.data?.errorName === "ERC721NonexistentToken"
  );
}
/** @internal Existing cumulative-mint scan; public callers authenticate the snapshot first. */
export async function scanDefifaHoldings(
  client: PublicClient,
  context: {
    hook: Address;
    blockNumber: bigint;
    account: Address;
    owned: bigint;
    tiers: readonly MintedTier[];
    cursor?: string;
    limit: number;
  },
) {
  const { hook, blockNumber, account, owned, tiers, cursor, limit } = context;
  const minted = tiers.map((tier) => ({
    tierId: Number(tier.id),
    count: BigInt(tier.initialSupply) - BigInt(tier.remainingSupply),
  }));
  if (minted.some((tier) => tier.count < 0n))
    throw new Error("The NFT supply returned an invalid count.");
  const total = minted.reduce((sum, tier) => sum + tier.count, 0n);
  const start = cursorOffset(cursor);
  if (start > total)
    throw new Error("The inventory cursor is outside this snapshot.");
  if (owned === 0n)
    return {
      tokens: [] as DefifaHolding[],
      totalOwned: 0n,
      totalCandidates: total,
      nextCursor: null,
      complete: true,
    };
  const end = start + BigInt(limit) < total ? start + BigInt(limit) : total;
  const candidates: DefifaHolding[] = [];
  let offset = 0n;
  for (const tier of minted) {
    const low = start > offset ? start - offset : 0n;
    const high = end < offset + tier.count ? end - offset : tier.count;
    for (let i = low; i < high; i++)
      candidates.push({
        tierId: tier.tierId,
        tokenId: BigInt(tier.tierId) * tokenMultiplier + i + 1n,
      });
    offset += tier.count;
    if (offset >= end) break;
  }
  const checks = await Promise.all(
    candidates.map(async (token) => {
      try {
        const owner = await client.readContract({
          address: hook,
          abi: ownershipAbi,
          functionName: "ownerOf",
          args: [token.tokenId],
          blockNumber,
        });
        return owner.toLowerCase() === account.toLowerCase() ? token : null;
      } catch (error) {
        if (nonexistentToken(error)) return null;
        throw error;
      }
    }),
  );
  const tokens = checks.filter(
    (token): token is DefifaHolding => token !== null,
  );
  const complete =
    end === total || (start === 0n && BigInt(tokens.length) === owned);
  return {
    tokens,
    totalOwned: owned,
    totalCandidates: total,
    nextCursor: complete ? null : end.toString(),
    complete,
  };
}

function cursorOffset(cursor?: string): bigint {
  if (
    cursor !== undefined &&
    (typeof cursor !== "string" ||
      !/^(0|[1-9]\d{0,77})$/.test(cursor) ||
      BigInt(cursor) >= 1n << 256n)
  )
    throw new Error("Enter a valid inventory cursor.");
  return cursor === undefined ? 0n : BigInt(cursor);
}

export interface DefifaHoldingsArgs {
  chainId: JBChainId;
  projectId: bigint;
  account: Address;
  expectedHook?: Address;
  /** Ownership checks per candidate page: default 100, maximum 200. */
  limit?: number;
  /** Decimal cumulative candidate offset. Continuation requires blockNumber. */
  cursor?: string;
  blockNumber?: bigint;
}

/** Authenticated, bounded native holdings at one immutable snapshot; no indexer required. */
export async function getDefifaHoldings(
  client: PublicClient,
  args: DefifaHoldingsArgs,
) {
  const {
    chainId,
    projectId,
    account,
    expectedHook,
    cursor,
    blockNumber,
    limit = 100,
  } = args;
  if (!isAddress(account) || account === zeroAddress)
    throw new Error("Provide a nonzero holdings account.");
  if (
    expectedHook !== undefined &&
    (!isAddress(expectedHook) || expectedHook === zeroAddress)
  )
    throw new Error("Provide a valid expected Defifa hook.");
  if (projectId <= 0n || projectId >= 1n << 256n)
    throw new Error("Provide a valid Defifa project ID.");
  if (!Number.isInteger(limit) || limit < 1 || limit > 200)
    throw new Error("Defifa holdings limit must be between 1 and 200.");
  cursorOffset(cursor);
  if (cursor !== undefined && blockNumber === undefined)
    throw new Error("Holdings continuation requires its original blockNumber.");
  if (blockNumber !== undefined && blockNumber < 0n)
    throw new Error("Provide a valid holdings blockNumber.");
  const identity = await getProjectNftInventory(client, {
    chainId,
    projectId,
    blockNumber,
    tierLimit: 1,
  });
  if (!identity || identity.protocol !== "defifa")
    throw new Error("The project is not a verified Defifa collection.");
  if (
    expectedHook &&
    expectedHook.toLowerCase() !== identity.hook.toLowerCase()
  )
    throw new Error("The Defifa hook changed. Refresh the collection.");
  const snapshot = identity.blockNumber;
  const owned = await client.readContract({
    address: identity.hook,
    abi: ownershipAbi,
    functionName: "balanceOf",
    args: [account],
    blockNumber: snapshot,
  });
  if (owned < 0n || owned >= 1n << 256n)
    throw new Error("The NFT balance returned an invalid count.");
  const tiers: MintedTier[] = [];
  const ids = new Set<number>();
  const cursors = new Set<bigint>();
  let startingId = 0n;
  for (;;) {
    if (cursors.has(startingId))
      throw new Error("Defifa holdings tier pagination repeated a cursor.");
    cursors.add(startingId);
    const raw = await client.readContract({
      address: identity.store,
      abi: jb721TiersHookStoreAbi,
      functionName: "tiersOf",
      args: [identity.hook, [], false, startingId, 129n],
      blockNumber: snapshot,
    });
    if (
      raw.length > 129 ||
      raw.some(
        (tier) =>
          !Number.isSafeInteger(tier.initialSupply) || tier.initialSupply < 0,
      )
    )
      throw new Error("The NFT tier page returned an invalid count.");
    const visible = raw.filter((tier) => tier.initialSupply > 0);
    for (const tier of visible.slice(0, 128)) {
      if (
        !Number.isSafeInteger(tier.id) ||
        tier.id < 1 ||
        tier.id > 65535 ||
        ids.has(tier.id)
      )
        throw new Error(
          "Defifa holdings returned an invalid or duplicate tier ID.",
        );
      if (
        !Number.isSafeInteger(tier.initialSupply) ||
        !Number.isSafeInteger(tier.remainingSupply) ||
        tier.remainingSupply < 0 ||
        tier.remainingSupply > tier.initialSupply ||
        tier.initialSupply >= Number(tokenMultiplier)
      )
        throw new Error("The NFT supply returned an invalid count.");
      ids.add(tier.id);
      tiers.push(tier);
    }
    if (tiers.length > 4096 || (tiers.length === 4096 && visible[128]))
      throw new Error("Defifa holdings tier pagination exceeded 4096 tiers.");
    if (!visible[128]) break;
    startingId = BigInt(visible[128].id);
  }
  const result = await scanDefifaHoldings(client, {
    hook: identity.hook,
    blockNumber: snapshot,
    account,
    owned,
    tiers,
    cursor,
    limit,
  });
  return { hook: identity.hook, blockNumber: snapshot, ...result };
}
