import {
  Address,
  Hex,
  PublicClient,
  encodeAbiParameters,
  getAddress,
  keccak256,
  pad,
  sliceHex,
  zeroAddress,
  zeroHash,
} from "viem";
import { jbSuckerRegistryAbi } from "../generated/juicebox.js";
import { JBChainId } from "../types.js";
import { v6Address } from "./types.js";

const jbSuckerV6WriteAbi = [
  {
    type: "function",
    name: "prepare",
    inputs: [
      { name: "projectTokenCount", type: "uint256", internalType: "uint256" },
      { name: "beneficiary", type: "bytes32", internalType: "bytes32" },
      { name: "minTokensReclaimed", type: "uint256", internalType: "uint256" },
      { name: "token", type: "address", internalType: "address" },
      { name: "metadata", type: "bytes32", internalType: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "toRemote",
    inputs: [{ name: "token", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "claim",
    inputs: [
      {
        name: "claimData",
        type: "tuple",
        internalType: "struct JBClaim",
        components: [
          { name: "token", type: "address", internalType: "address" },
          {
            name: "leaf",
            type: "tuple",
            internalType: "struct JBLeaf",
            components: [
              { name: "index", type: "uint256", internalType: "uint256" },
              { name: "beneficiary", type: "bytes32", internalType: "bytes32" },
              {
                name: "projectTokenCount",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "terminalTokenAmount",
                type: "uint256",
                internalType: "uint256",
              },
              { name: "metadata", type: "bytes32", internalType: "bytes32" },
            ],
          },
          { name: "proof", type: "bytes32[32]", internalType: "bytes32[32]" },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

/** Common v6 sucker view surface used to reconstruct and verify bridge state. */
export const jbSuckerV6ViewAbi = [
  {
    type: "function",
    name: "peer",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "peerChainId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "projectId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "outboxOf",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [
      {
        name: "outbox",
        type: "tuple",
        components: [
          { name: "nonce", type: "uint64" },
          { name: "numberOfClaimsSent", type: "uint192" },
          { name: "balance", type: "uint256" },
          {
            name: "tree",
            type: "tuple",
            components: [
              { name: "branch", type: "bytes32[32]" },
              { name: "count", type: "uint256" },
            ],
          },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "inboxOf",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [
      {
        name: "inbox",
        type: "tuple",
        components: [
          { name: "nonce", type: "uint64" },
          { name: "root", type: "bytes32" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "executedLeafHashOf",
    stateMutability: "view",
    inputs: [
      { name: "token", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ name: "hash", type: "bytes32" }],
  },
  {
    type: "function",
    name: "remoteTokenFor",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [
      {
        name: "remoteToken",
        type: "tuple",
        components: [
          { name: "enabled", type: "bool" },
          { name: "emergencyHatch", type: "bool" },
          { name: "minGas", type: "uint32" },
          { name: "addr", type: "bytes32" },
        ],
      },
    ],
  },
] as const;

/** Event carrying the complete v6 outbox leaf preimage and resulting root. */
export const insertToSuckerOutboxEvent = {
  type: "event",
  name: "InsertToOutboxTree",
  inputs: [
    { name: "beneficiary", type: "bytes32", indexed: true },
    { name: "token", type: "address", indexed: true },
    { name: "hashed", type: "bytes32", indexed: false },
    { name: "index", type: "uint256", indexed: false },
    { name: "root", type: "bytes32", indexed: false },
    { name: "projectTokenCount", type: "uint256", indexed: false },
    { name: "terminalTokenAmount", type: "uint256", indexed: false },
    { name: "metadata", type: "bytes32", indexed: false },
    { name: "caller", type: "address", indexed: false },
  ],
} as const;

/** CCIP-only probe used to distinguish fee-bearing sucker transports. */
export const jbCcipSuckerV6Abi = [
  {
    type: "function",
    name: "CCIP_ROUTER",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

/** Native-bridge-only probes used to positively identify sucker transports. */
export const jbNativeSuckerV6ProbeAbi = [
  {
    type: "function",
    name: "OPMESSENGER",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "ARBINBOX",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

/**
 * Reusable v6 JBSucker ABI: transaction builders, bridge-state views, the
 * outbox event, and the permissionless accounting-sync entrypoint.
 */
export const jbSuckerV6Abi = [
  ...jbSuckerV6ViewAbi,
  insertToSuckerOutboxEvent,
  ...jbSuckerV6WriteAbi,
  {
    type: "function",
    name: "syncAccountingData",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
] as const;

/**
 * A leaf of a v6 sucker's merkle tree, representing tokens bridged for one beneficiary.
 * The beneficiary is a bytes32 (an EVM address left-padded to 32 bytes).
 */
export type JBLeaf = {
  index: bigint;
  beneficiary: Hex;
  projectTokenCount: bigint;
  terminalTokenAmount: bigint;
  metadata: Hex;
};

/** Fields committed by `JBSucker._buildTreeHash` for one outbox leaf. */
export type JBSuckerLeafData = Pick<
  JBLeaf,
  "beneficiary" | "projectTokenCount" | "terminalTokenAmount" | "metadata"
>;

/** Reproduce the exact leaf hash committed by a v6 sucker. */
export function suckerLeafHash({
  projectTokenCount,
  terminalTokenAmount,
  beneficiary,
  metadata,
}: JBSuckerLeafData): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: "uint256" },
        { type: "uint256" },
        { type: "bytes32" },
        { type: "bytes32" },
      ],
      [projectTokenCount, terminalTokenAmount, beneficiary, metadata],
    ),
  );
}

/**
 * A 32-entry bytes32 merkle inclusion proof, matching the fixed-size `bytes32[32]` the
 * sucker's `claim` function takes.
 */
// prettier-ignore
export type JBLeafProof = readonly [
  Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex,
  Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex,
  Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex,
  Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex,
];

/**
 * A claim against a v6 sucker: the terminal token being claimed, the merkle leaf, and its
 * inclusion proof. The proof must contain exactly 32 bytes32 entries.
 */
export type JBClaim = {
  token: Address;
  leaf: JBLeaf;
  proof: JBLeafProof;
};

/**
 * A v6 sucker pair for a project: the local sucker and its remote counterpart.
 * The registry stores remotes as bytes32; this type carries the unpacked EVM address.
 */
export type JBSuckerPairV6 = {
  local: Address;
  remote: Address;
  remoteChainId: bigint;
};

/** Fixed depth used by the v6 suckers' incremental Merkle trees. */
export const SUCKER_MERKLE_DEPTH = 32;

/** MerkleLib's root for an empty depth-32 tree. */
export const SUCKER_EMPTY_TREE_ROOT =
  "0x27ae5ba08d7291c96c8cbddcc148bf48a6d68c7974b94356f53754ef6171d757" as Hex;

/** Hash a MerkleLib node pair (`keccak256(abi.encode(bytes32, bytes32))`). */
export function suckerHashPair(left: Hex, right: Hex): Hex {
  return keccak256(
    encodeAbiParameters(
      [{ type: "bytes32" }, { type: "bytes32" }],
      [left, right],
    ),
  );
}

let suckerZeroHashesCache: Hex[] | null = null;

/** Empty-subtree hashes for depths 0 through 32, self-checked at depth 32. */
export function suckerZeroHashes(): readonly Hex[] {
  if (suckerZeroHashesCache) return suckerZeroHashesCache;
  const hashes: Hex[] = [zeroHash];
  for (let depth = 0; depth < SUCKER_MERKLE_DEPTH; depth++) {
    hashes.push(suckerHashPair(hashes[depth], hashes[depth]));
  }
  if (hashes[SUCKER_MERKLE_DEPTH] !== SUCKER_EMPTY_TREE_ROOT) {
    throw new Error("The sucker Merkle zero-hash self-check failed.");
  }
  suckerZeroHashesCache = hashes;
  return hashes;
}

/**
 * Build the fixed 32-sibling inclusion path for a dense outbox leaf array.
 * Missing right-hand subtrees are filled with MerkleLib's canonical zero hash.
 */
export function suckerLeafProof(
  leafHashes: readonly Hex[],
  index: number,
): JBLeafProof {
  if (!Number.isSafeInteger(index) || index < 0 || index >= leafHashes.length) {
    throw new Error("The requested sucker leaf is outside the outbox.");
  }

  const zeroHashes = suckerZeroHashes();
  let level = leafHashes.slice();
  const proof: Hex[] = [];
  let position = index;
  for (let depth = 0; depth < SUCKER_MERKLE_DEPTH; depth++) {
    const sibling = position ^ 1;
    proof.push(sibling < level.length ? level[sibling] : zeroHashes[depth]);

    const next: Hex[] = [];
    for (let offset = 0; offset < level.length; offset += 2) {
      next.push(
        suckerHashPair(
          level[offset],
          offset + 1 < level.length ? level[offset + 1] : zeroHashes[depth],
        ),
      );
    }
    level = next;
    position = Math.floor(position / 2);
  }
  return proof as unknown as JBLeafProof;
}

/** Recompute a sucker root from one leaf hash and its inclusion proof. */
export function suckerBranchRoot(
  leafHash: Hex,
  proof: readonly Hex[],
  index: number,
): Hex {
  if (!Number.isSafeInteger(index) || index < 0) {
    throw new Error("A sucker leaf index must be a non-negative safe integer.");
  }
  if (proof.length !== SUCKER_MERKLE_DEPTH) {
    throw new Error(
      `A sucker proof must contain ${SUCKER_MERKLE_DEPTH} sibling hashes.`,
    );
  }

  let current = leafHash;
  let position = index;
  for (let depth = 0; depth < SUCKER_MERKLE_DEPTH; depth++) {
    current =
      position & 1
        ? suckerHashPair(proof[depth], current)
        : suckerHashPair(current, proof[depth]);
    position = Math.floor(position / 2);
  }
  return current;
}

/** Complete preimage emitted for one v6 sucker outbox leaf. */
export interface JBSuckerOutboxLeaf {
  index: number;
  hashed: Hex;
  root: Hex;
  beneficiary: Hex;
  projectTokenCount: bigint;
  terminalTokenAmount: bigint;
  metadata: Hex;
  blockNumber: bigint;
}

/** Log scanning controls for {@link getSuckerOutboxLeaves}. */
export interface JBSuckerOutboxScanOptions {
  fromBlock?: bigint;
  toBlock?: bigint;
  /** Fallback range size for RPCs which reject a genesis-to-latest query. */
  blockRange?: bigint;
  /** Backstop against an accidentally unbounded historical scan. */
  maxBlockRanges?: number;
}

type SuckerOutboxEventLog = {
  blockNumber: bigint;
  args: {
    beneficiary: Hex;
    token: Address;
    hashed: Hex;
    index: bigint;
    root: Hex;
    projectTokenCount: bigint;
    terminalTokenAmount: bigint;
    metadata: Hex;
    caller: Address;
  };
};

function safeSuckerCount(value: bigint, label: string): number {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error(`The sucker returned an invalid ${label}.`);
  }
  return count;
}

/** Convert a low-20-byte EVM address stored in bytes32 into a checksum address. */
export function suckerBytes32ToAddress(value: Hex): Address {
  if (value.toLowerCase() === zeroHash) {
    throw new Error("The sucker bytes32 value does not contain an address.");
  }
  if (!/^0x0{24}[0-9a-fA-F]{40}$/.test(value)) {
    throw new Error("The sucker bytes32 value is not an EVM address.");
  }
  return getAddress(sliceHex(value, 12));
}

/**
 * Read every dense outbox leaf for a sucker/token and verify the reconstructed
 * latest root against the root emitted on-chain.
 *
 * A wide log request is attempted first. Providers that reject it fall back to
 * bounded reverse scans, avoiding the subtly truncated histories which would
 * otherwise produce invalid claim proofs.
 */
export async function getSuckerOutboxLeaves(
  client: PublicClient,
  {
    sucker,
    token,
    count: requestedCount,
    fromBlock = 0n,
    toBlock,
    blockRange = 45_000n,
    maxBlockRanges = 512,
  }: {
    sucker: Address;
    token: Address;
    count?: number;
  } & JBSuckerOutboxScanOptions,
): Promise<JBSuckerOutboxLeaf[]> {
  if (fromBlock < 0n) throw new Error("fromBlock cannot be negative.");
  if (blockRange <= 0n) throw new Error("blockRange must be positive.");
  if (!Number.isSafeInteger(maxBlockRanges) || maxBlockRanges < 1) {
    throw new Error("maxBlockRanges must be a positive safe integer.");
  }

  const count =
    requestedCount ??
    safeSuckerCount(
      (
        await client.readContract({
          address: sucker,
          abi: jbSuckerV6ViewAbi,
          functionName: "outboxOf",
          args: [token],
        })
      ).tree.count,
      "outbox count",
    );
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error("count must be a non-negative safe integer.");
  }
  if (count === 0) return [];

  const latest = toBlock ?? (await client.getBlockNumber());
  if (latest < fromBlock) throw new Error("toBlock cannot precede fromBlock.");
  const byIndex = new Map<number, JBSuckerOutboxLeaf>();
  const collect = (logs: readonly SuckerOutboxEventLog[]) => {
    for (const log of logs) {
      const index = safeSuckerCount(log.args.index, "outbox leaf index");
      if (index >= count) continue;
      const hashed = suckerLeafHash({
        beneficiary: log.args.beneficiary,
        projectTokenCount: log.args.projectTokenCount,
        terminalTokenAmount: log.args.terminalTokenAmount,
        metadata: log.args.metadata,
      });
      if (hashed.toLowerCase() !== log.args.hashed.toLowerCase()) {
        throw new Error(
          `The sucker outbox event's leaf preimage does not match leaf ${index}.`,
        );
      }
      byIndex.set(index, {
        index,
        hashed,
        root: log.args.root,
        beneficiary: log.args.beneficiary,
        projectTokenCount: log.args.projectTokenCount,
        terminalTokenAmount: log.args.terminalTokenAmount,
        metadata: log.args.metadata,
        blockNumber: log.blockNumber,
      });
    }
  };

  let wideScanFailed = false;
  try {
    collect(
      (await client.getLogs({
        address: sucker,
        event: insertToSuckerOutboxEvent,
        args: { token },
        fromBlock,
        toBlock: latest,
        strict: true,
      })) as SuckerOutboxEventLog[],
    );
  } catch {
    wideScanFailed = true;
  }

  if (wideScanFailed || byIndex.size !== count) {
    byIndex.clear();
    let cursor = latest;
    let ranges = 0;
    while (
      cursor >= fromBlock &&
      byIndex.size < count &&
      ranges < maxBlockRanges
    ) {
      const rangeStart =
        cursor - fromBlock + 1n > blockRange
          ? cursor - blockRange + 1n
          : fromBlock;
      collect(
        (await client.getLogs({
          address: sucker,
          event: insertToSuckerOutboxEvent,
          args: { token },
          fromBlock: rangeStart,
          toBlock: cursor,
          strict: true,
        })) as SuckerOutboxEventLog[],
      );
      ranges += 1;
      if (rangeStart === fromBlock) break;
      cursor = rangeStart - 1n;
    }
  }

  const leaves: JBSuckerOutboxLeaf[] = [];
  for (let index = 0; index < count; index++) {
    const leaf = byIndex.get(index);
    if (!leaf) {
      throw new Error(
        `The RPC did not return the complete sucker outbox history (missing leaf ${index}).`,
      );
    }
    leaves.push(leaf);
  }

  const last = leaves[count - 1];
  const latestRoot = suckerBranchRoot(
    last.hashed,
    suckerLeafProof(
      leaves.map((leaf) => leaf.hashed),
      count - 1,
    ),
    count - 1,
  );
  if (latestRoot.toLowerCase() !== last.root.toLowerCase()) {
    throw new Error(
      "The reconstructed sucker outbox does not match its latest emitted root.",
    );
  }

  return leaves;
}

/** Lifecycle state of one cross-chain sucker movement. */
export type JBSuckerMovementStatus = "pending" | "claimable" | "claimed";

/** Bridge family used by a sucker. Unknown values must fail closed for fees. */
export type JBSuckerTransport = "ccip" | "native" | "unknown";

/** Verified movement reconstructed from sucker logs and destination state. */
export interface JBSuckerMovement {
  sourceToken: Address;
  remoteToken: Address;
  leaf: JBLeaf;
  leafHash: Hex;
  outboxRoot: Hex;
  blockNumber: bigint;
  status: JBSuckerMovementStatus;
  /** True when a pending leaf has not yet been included in a toRemote send. */
  canExecute: boolean;
  /** Present only when verified against the destination inbox root. */
  proof: JBLeafProof | null;
}

/** Pure status classification shared by bridge movement lists. */
export function classifySuckerMovement({
  executed,
  index,
  deliveredCount,
  sentCount,
}: {
  executed: boolean;
  index: number;
  deliveredCount: number;
  sentCount: number;
}): { status: JBSuckerMovementStatus; canExecute: boolean } {
  if (executed) return { status: "claimed", canExecute: false };
  if (index < deliveredCount) {
    return { status: "claimable", canExecute: false };
  }
  return { status: "pending", canExecute: index >= sentCount };
}

/**
 * Reconstruct all movements for one source sucker/token, verify the outbox and
 * destination inbox roots, and attach a claim proof only to claimable leaves.
 */
export async function getSuckerMovements(
  sourceClient: PublicClient,
  destinationClient: PublicClient,
  {
    sourceSucker,
    destinationSucker,
    sourceToken,
    remoteToken: requestedRemoteToken,
    ...scanOptions
  }: {
    sourceSucker: Address;
    destinationSucker: Address;
    sourceToken: Address;
    /**
     * Verified historical mapping override. Required only if a disabled token
     * mapping has been cleared to bytes32(0); a non-zero live mapping wins and
     * must agree with this value.
     */
    remoteToken?: Address;
  } & JBSuckerOutboxScanOptions,
): Promise<JBSuckerMovement[]> {
  const [outbox, remoteMapping] = await Promise.all([
    sourceClient.readContract({
      address: sourceSucker,
      abi: jbSuckerV6ViewAbi,
      functionName: "outboxOf",
      args: [sourceToken],
    }),
    sourceClient.readContract({
      address: sourceSucker,
      abi: jbSuckerV6ViewAbi,
      functionName: "remoteTokenFor",
      args: [sourceToken],
    }),
  ]);
  const count = safeSuckerCount(outbox.tree.count, "outbox count");
  const sentCount = safeSuckerCount(
    outbox.numberOfClaimsSent,
    "sent-claims count",
  );
  if (sentCount > count) {
    throw new Error("The sucker sent-claims count exceeds its outbox count.");
  }
  if (count === 0) return [];

  const mappedRemoteToken =
    remoteMapping.addr.toLowerCase() === zeroHash
      ? null
      : suckerBytes32ToAddress(remoteMapping.addr);
  if (
    mappedRemoteToken &&
    requestedRemoteToken &&
    mappedRemoteToken.toLowerCase() !== requestedRemoteToken.toLowerCase()
  ) {
    throw new Error(
      "The supplied historical token does not match the sucker's live mapping.",
    );
  }
  const remoteToken = mappedRemoteToken ?? requestedRemoteToken;
  if (!remoteToken) {
    throw new Error(
      "The sucker's historical remote token mapping must be supplied explicitly.",
    );
  }
  const leaves = await getSuckerOutboxLeaves(sourceClient, {
    sucker: sourceSucker,
    token: sourceToken,
    count,
    ...scanOptions,
  });
  const leafHashes = leaves.map((leaf) => leaf.hashed);

  const [inbox, executedHashes] = await Promise.all([
    destinationClient.readContract({
      address: destinationSucker,
      abi: jbSuckerV6ViewAbi,
      functionName: "inboxOf",
      args: [remoteToken],
    }),
    Promise.all(
      leaves.map((leaf) =>
        destinationClient.readContract({
          address: destinationSucker,
          abi: jbSuckerV6ViewAbi,
          functionName: "executedLeafHashOf",
          args: [remoteToken, BigInt(leaf.index)],
        }),
      ),
    ),
  ]);

  let deliveredCount = 0;
  if (inbox.root.toLowerCase() !== zeroHash) {
    for (let index = leaves.length - 1; index >= 0; index--) {
      if (leaves[index].root.toLowerCase() === inbox.root.toLowerCase()) {
        deliveredCount = index + 1;
        break;
      }
    }
    if (deliveredCount === 0) {
      throw new Error(
        "The destination sucker inbox root is absent from the reconstructed outbox.",
      );
    }
  }

  return leaves.map((outboxLeaf, index) => {
    const executedHash = executedHashes[index];
    if (
      executedHash.toLowerCase() !== zeroHash &&
      executedHash.toLowerCase() !== outboxLeaf.hashed.toLowerCase()
    ) {
      throw new Error(
        "The destination sucker's executed leaf does not match the reconstructed outbox.",
      );
    }
    const { status, canExecute } = classifySuckerMovement({
      executed: executedHash.toLowerCase() !== zeroHash,
      index,
      deliveredCount,
      sentCount,
    });
    const proof =
      status === "claimable"
        ? suckerLeafProof(leafHashes.slice(0, deliveredCount), index)
        : null;
    if (
      proof &&
      suckerBranchRoot(outboxLeaf.hashed, proof, index).toLowerCase() !==
        inbox.root.toLowerCase()
    ) {
      throw new Error(
        "The reconstructed sucker proof does not match the destination inbox.",
      );
    }

    return {
      sourceToken,
      remoteToken,
      leaf: {
        index: BigInt(index),
        beneficiary: outboxLeaf.beneficiary,
        projectTokenCount: outboxLeaf.projectTokenCount,
        terminalTokenAmount: outboxLeaf.terminalTokenAmount,
        metadata: outboxLeaf.metadata,
      },
      leafHash: outboxLeaf.hashed,
      outboxRoot: outboxLeaf.root,
      blockNumber: outboxLeaf.blockNumber,
      status,
      canExecute,
      proof,
    };
  });
}

/** Build a claim object from a movement whose proof was verified by the SDK. */
export function claimFromSuckerMovement(movement: JBSuckerMovement): JBClaim {
  if (movement.status !== "claimable" || !movement.proof) {
    throw new Error("Only a claimable sucker movement has a verified proof.");
  }
  return {
    token: movement.remoteToken,
    leaf: movement.leaf,
    proof: movement.proof,
  };
}

/** Common escalating native-value candidates for CCIP sucker simulations. */
export const CCIP_SUCKER_TRANSPORT_VALUES: readonly bigint[] = [
  1_000_000_000_000_000n,
  5_000_000_000_000_000n,
  20_000_000_000_000_000n,
  50_000_000_000_000_000n,
  200_000_000_000_000_000n,
  500_000_000_000_000_000n,
];

/** Common escalating native-value candidates for native bridge simulations. */
export const NATIVE_SUCKER_TRANSPORT_VALUES: readonly bigint[] = [
  0n,
  1_000_000_000_000_000n,
  10_000_000_000_000_000n,
  50_000_000_000_000_000n,
];

/** Return the first value whose exact transaction simulation succeeds. */
export async function findSuckerTransportValue(
  values: readonly bigint[],
  simulate: (value: bigint) => Promise<unknown>,
): Promise<bigint | null> {
  for (const value of values) {
    try {
      await simulate(value);
      return value;
    } catch {
      // Try the next fee tier.
    }
  }
  return null;
}

/** Refuse the CCIP zero-transport path, which would switch fees to LINK. */
export function assertSuckerTransportValue(
  transport: JBSuckerTransport,
  value: bigint,
  baseFee = 0n,
): void {
  if (transport === "unknown") {
    throw new Error("The sucker transport could not be verified.");
  }
  if (transport === "ccip" && value - baseFee <= 0n) {
    throw new Error(
      "A CCIP sucker message requires a positive native transport budget.",
    );
  }
}

/**
 * Positively identify a sucker's bridge family. RPC failures and unfamiliar
 * implementations return `unknown`; callers must not assume they are native.
 */
export async function classifySuckerTransport(
  client: PublicClient,
  sucker: Address,
): Promise<JBSuckerTransport> {
  try {
    const router = await client.readContract({
      address: sucker,
      abi: jbCcipSuckerV6Abi,
      functionName: "CCIP_ROUTER",
    });
    if (router.toLowerCase() !== "0x0000000000000000000000000000000000000000") {
      return "ccip";
    }
  } catch {
    // Probe the native bridge families below.
  }

  for (const functionName of ["OPMESSENGER", "ARBINBOX"] as const) {
    try {
      const bridge = await client.readContract({
        address: sucker,
        abi: jbNativeSuckerV6ProbeAbi,
        functionName,
      });
      if (bridge.toLowerCase() !== zeroAddress) return "native";
    } catch {
      // Keep probing; an RPC error must not be treated as a positive match.
    }
  }
  return "unknown";
}

/** Build a payable JBSucker.syncAccountingData transaction request. */
export function buildSyncAccountingDataTx(args: {
  chainId: JBChainId;
  sucker: Address;
  value?: bigint;
}) {
  return {
    chainId: args.chainId,
    address: args.sucker,
    abi: jbSuckerV6Abi,
    functionName: "syncAccountingData" as const,
    args: [] as const,
    value: args.value ?? 0n,
  };
}

/** Relative absolute drift between two unsigned bigint values, from 0 to 1. */
export function relativeSuckerDrift(left: bigint, right: bigint): number {
  if (left < 0n || right < 0n) {
    throw new Error("Sucker accounting values cannot be negative.");
  }
  const larger = left > right ? left : right;
  if (larger === 0n) return 0;
  const difference = left > right ? left - right : right - left;
  return Number((difference * 1_000_000n) / larger) / 1_000_000;
}

/** Unpack a sucker freshness key (`timestamp << 128 | sequence`). */
export function suckerTimestampSeconds(value: bigint): number {
  const timestamp = Number(value >> 128n);
  if (!Number.isSafeInteger(timestamp) || timestamp < 0) {
    throw new Error("The sucker timestamp is outside JavaScript's safe range.");
  }
  return timestamp;
}

/**
 * Builds a `prepare` transaction on a v6 sucker, locking project tokens into an outbox
 * leaf destined for the remote chain.
 *
 * The beneficiary is an EVM address; it's left-padded to bytes32 internally (v6 suckers
 * identify beneficiaries as bytes32 for cross-VM compatibility).
 *
 * @param args.chainId The chain the sucker lives on.
 * @param args.sucker The sucker's address.
 * @param args.projectTokenCount The number of project tokens to bridge, as a fixed point
 * number with 18 decimals.
 * @param args.beneficiary The address that will claim the bridged tokens on the remote chain.
 * @param args.minTokensReclaimed The minimum number of terminal tokens to reclaim when the
 * project tokens are cashed out. Defaults to 0.
 * @param args.token The local terminal token being bridged alongside the project tokens.
 * @param args.metadata Opaque bytes32 attribution payload hashed into the leaf. Defaults to
 * zero.
 */
export function buildBridgePrepareTx({
  chainId,
  sucker,
  projectTokenCount,
  beneficiary,
  minTokensReclaimed = 0n,
  token,
  metadata = zeroHash,
}: {
  chainId: JBChainId;
  sucker: Address;
  projectTokenCount: bigint;
  beneficiary: Address;
  minTokensReclaimed?: bigint;
  token: Address;
  metadata?: Hex;
}): {
  chainId: JBChainId;
  address: Address;
  abi: typeof jbSuckerV6Abi;
  functionName: "prepare";
  args: readonly [bigint, Hex, bigint, Address, Hex];
} {
  return {
    chainId,
    address: sucker,
    abi: jbSuckerV6Abi,
    functionName: "prepare",
    args: [
      projectTokenCount,
      // Lowercase so the bytes32 is deterministic regardless of input checksum casing.
      pad(beneficiary.toLowerCase() as Address, { size: 32 }),
      minTokensReclaimed,
      token,
      metadata,
    ],
  };
}

/**
 * Builds a `claim` transaction on a v6 sucker, redeeming an inbox leaf that was bridged
 * from the remote chain.
 *
 * @param args.chainId The chain the sucker lives on.
 * @param args.sucker The sucker's address.
 * @param args.claim The claim: terminal token, leaf (with bytes32 beneficiary), and a
 * 32-entry bytes32 inclusion proof.
 */
export function buildBridgeClaimTx({
  chainId,
  sucker,
  claim,
}: {
  chainId: JBChainId;
  sucker: Address;
  claim: JBClaim;
}): {
  chainId: JBChainId;
  address: Address;
  abi: typeof jbSuckerV6Abi;
  functionName: "claim";
  args: readonly [JBClaim];
} {
  return {
    chainId,
    address: sucker,
    abi: jbSuckerV6Abi,
    functionName: "claim",
    args: [claim],
  };
}

/**
 * Builds a `toRemote` transaction on a v6 sucker, sending the outbox tree for a token to
 * the remote chain.
 *
 * Payable: bridging over CCIP requires a fee to be sent along as `value`. Native-bridge
 * suckers (OP/Base/Arbitrum) take no fee.
 *
 * @param args.chainId The chain the sucker lives on.
 * @param args.sucker The sucker's address.
 * @param args.token The local terminal token whose outbox tree should be bridged.
 * @param args.value The bridge fee to send along. Defaults to 0.
 */
export function buildToRemoteTx({
  chainId,
  sucker,
  token,
  value = 0n,
}: {
  chainId: JBChainId;
  sucker: Address;
  token: Address;
  value?: bigint;
}): {
  chainId: JBChainId;
  address: Address;
  abi: typeof jbSuckerV6Abi;
  functionName: "toRemote";
  args: readonly [Address];
  value: bigint;
} {
  return {
    chainId,
    address: sucker,
    abi: jbSuckerV6Abi,
    functionName: "toRemote",
    args: [token],
    value,
  };
}

/**
 * Reads a project's v6 sucker pairs from the JBSuckerRegistry on the given chain.
 *
 * The v6 registry stores remote suckers as bytes32 (for cross-VM compatibility); for EVM
 * peers the address is in the low 20 bytes, which this unpacks to a checksummed address.
 *
 * @param client A viem PublicClient connected to `chainId`.
 * @param args.chainId The chain to read the registry on.
 * @param args.projectId The project to look up pairs for.
 */
export async function getV6SuckerPairs(
  client: PublicClient,
  { chainId, projectId }: { chainId: JBChainId; projectId: bigint },
): Promise<JBSuckerPairV6[]> {
  const pairs = await client.readContract({
    address: v6Address("JBSuckerRegistry", chainId),
    abi: jbSuckerRegistryAbi,
    functionName: "suckerPairsOf",
    args: [projectId],
  });

  return pairs.map((pair) => ({
    local: pair.local,
    remote: getAddress(sliceHex(pair.remote, 12)),
    remoteChainId: pair.remoteChainId,
  }));
}

/**
 * Read active and deprecated suckers for a project. Historical suckers remain
 * relevant because their already-delivered leaves can still be claimed.
 */
export async function getAllV6SuckerPairs(
  client: PublicClient,
  { chainId, projectId }: { chainId: JBChainId; projectId: bigint },
): Promise<JBSuckerPairV6[]> {
  const suckers = await client.readContract({
    address: v6Address("JBSuckerRegistry", chainId),
    abi: jbSuckerRegistryAbi,
    functionName: "allSuckersOf",
    args: [projectId],
  });

  return Promise.all(
    suckers.map(async (local) => {
      const [remote, remoteChainId] = await Promise.all([
        client.readContract({
          address: local,
          abi: jbSuckerV6ViewAbi,
          functionName: "peer",
        }),
        client.readContract({
          address: local,
          abi: jbSuckerV6ViewAbi,
          functionName: "peerChainId",
        }),
      ]);
      return {
        local,
        remote: suckerBytes32ToAddress(remote),
        remoteChainId,
      };
    }),
  );
}
