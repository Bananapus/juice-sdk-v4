import {
  Address,
  isAddress,
  isAddressEqual,
  keccak256,
  zeroAddress,
  zeroHash,
  type Hex,
  type PublicClient,
} from "viem";
import {
  jbSuckerRegistryAbi,
  jbControllerAbi,
  jbDirectoryAbi,
  jbMultiTerminalAbi,
  jbTokensAbi,
  stickyHookAbi,
  stickyRewardReceiverFactoryAbi,
} from "../generated/juicebox.js";
import { SPLITS_TOTAL_PERCENT } from "../pureConstants.js";
import type { JBChainId } from "../types.js";
import { buildSplit, type JBSplit } from "./splits.js";
import { v6Address } from "./types.js";

/**
 * A split routes funds to Sticky holders when its `hook` is the chain's
 * `StickyDistributor`. The distributor reads the rest of the split this way:
 *
 * - `beneficiary` is the Sticky token whose holders are rewarded.
 * - `projectId` is the reward group: {@link STICKY_DEFAULT_GROUP_ID} splits the
 *   pot by delegated voting power at the round's snapshot, and a tenure group
 *   ({@link stickyGroupId}) splits it by stake held for a range of weeks.
 *
 * The distributor never reverts on a bad group or beneficiary, since a
 * split-hook revert returns the funds to the project. A `projectId` that
 * {@link validateStickyGroupId} rejects funds the default group instead, and so
 * does a tenure group whose beneficiary the Sticky hook does not track. The
 * distributor has no public view for that second case: a token is tracked when
 * `stickyHookAbi` `tokenOf(projectId)` returns the token, where `projectId` is
 * the token's own `PROJECT_ID()`.
 */

/** The default reward group: every holder, weighted by delegated voting power. */
export const STICKY_DEFAULT_GROUP_ID = 0n;

/** A tenure group ID is `minWeeks * STICKY_CRITERIA_BASE + maxWeeks`. */
export const STICKY_CRITERIA_BASE = 1000n;

/** The highest `minWeeks` or `maxWeeks` a tenure group can use. */
export const STICKY_MAX_CRITERIA_WEEKS = 520;

/**
 * A Sticky reward group. A tenure group rewards stake added between `maxWeeks`
 * and `minWeeks` before the round started; `maxWeeks` 0 means no upper bound.
 */
export type StickyGroup =
  | { kind: "default" }
  | { kind: "tenure"; minWeeks: number; maxWeeks: number };

/** The `StickyDistributor` a chain's Sticky splits must use as their hook. */
export function stickyDistributorAddress(chainId: JBChainId): Address {
  return v6Address("StickyDistributor", chainId);
}

/** Whether a split pays Sticky holders on this chain. */
export function isStickySplit(
  split: Pick<JBSplit, "hook">,
  chainId: JBChainId,
): boolean {
  return isAddressEqual(split.hook, stickyDistributorAddress(chainId));
}

/**
 * Why the distributor would not honor a group ID, or null when it would.
 * Gives the same answer as the distributor's pure `isValidGroupId` view: 0 is
 * valid, otherwise `minWeeks` must be 1 to 520 and `maxWeeks` must be 0 or
 * `minWeeks` to 520.
 */
export function validateStickyGroupId(groupId: bigint): string | null {
  if (groupId === STICKY_DEFAULT_GROUP_ID) return null;
  if (groupId < 0n) return "Group ID can't be negative.";

  const minWeeks = groupId / STICKY_CRITERIA_BASE;
  const maxWeeks = groupId % STICKY_CRITERIA_BASE;
  const limit = BigInt(STICKY_MAX_CRITERIA_WEEKS);

  if (minWeeks === 0n)
    return "Tenure groups need a minimum of at least 1 week.";
  if (minWeeks > limit) {
    return `Minimum weeks can't be more than ${STICKY_MAX_CRITERIA_WEEKS}.`;
  }
  if (maxWeeks > limit) {
    return `Maximum weeks can't be more than ${STICKY_MAX_CRITERIA_WEEKS}.`;
  }
  if (maxWeeks !== 0n && maxWeeks < minWeeks) {
    return "Maximum weeks can't be less than minimum weeks.";
  }
  return null;
}

/**
 * Encode a tenure group as a split `projectId`. Leave out `maxWeeks` (or pass
 * 0) for no upper bound.
 *
 * @throws If the distributor would not honor the group.
 */
export function stickyGroupId(args: {
  minWeeks: number;
  maxWeeks?: number;
}): bigint {
  const { minWeeks, maxWeeks = 0 } = args;
  if (
    !Number.isInteger(minWeeks) ||
    !Number.isInteger(maxWeeks) ||
    minWeeks < 0 ||
    maxWeeks < 0
  ) {
    throw new Error("Sticky group weeks must be whole numbers, 0 or more.");
  }
  // Checked before encoding: a larger maxWeeks would carry into minWeeks.
  if (maxWeeks > STICKY_MAX_CRITERIA_WEEKS) {
    throw new Error(
      `Maximum weeks can't be more than ${STICKY_MAX_CRITERIA_WEEKS}.`,
    );
  }
  const groupId = BigInt(minWeeks) * STICKY_CRITERIA_BASE + BigInt(maxWeeks);
  const reason = validateStickyGroupId(groupId);
  if (reason) throw new Error(reason);
  return groupId;
}

/**
 * The group a split `projectId` actually funds. An invalid group ID decodes as
 * the default group, since that is where the distributor sends it.
 */
export function decodeStickyGroupId(groupId: bigint): StickyGroup {
  if (groupId === 0n || validateStickyGroupId(groupId) !== null) {
    return { kind: "default" };
  }
  return {
    kind: "tenure",
    minWeeks: Number(groupId / STICKY_CRITERIA_BASE),
    maxWeeks: Number(groupId % STICKY_CRITERIA_BASE),
  };
}

function weeks(count: number): string {
  return count === 1 ? "1 week" : `${count} weeks`;
}

/**
 * Short plain text naming who a Sticky split rewards, for confirm dialogs and
 * activity rows. Assumes the beneficiary is a tracked Sticky token; if it is
 * not, a tenure split funds the default group instead.
 */
export function describeStickySplit(split: Pick<JBSplit, "projectId">): string {
  const group = decodeStickyGroupId(split.projectId);
  if (group.kind === "default") {
    const fallback =
      split.projectId === 0n
        ? ""
        : `, since group ${split.projectId} is invalid`;
    return `Sticky group 0 (all holders by voting power)${fallback}`;
  }
  if (group.maxWeeks === 0) {
    return `Sticky holders stuck ${weeks(group.minWeeks)} or more`;
  }
  if (group.maxWeeks === group.minWeeks) {
    return `Sticky holders stuck ${weeks(group.minWeeks)}`;
  }
  return `Sticky holders stuck ${group.minWeeks} to ${group.maxWeeks} weeks`;
}

/** The collector's public delivery, accounting and immutable identity surface. */
export const stickySourceCollectorAbi = [
  {
    name: "DESTINATION_CHAIN_ID",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        type: "uint256",
      },
    ],
  },
  {
    name: "DIRECTORY",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        type: "address",
      },
    ],
  },
  {
    name: "FEE_PAYER",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        type: "address",
      },
    ],
  },
  {
    name: "RECEIVER_FACTORY",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        type: "address",
      },
    ],
  },
  {
    name: "REGISTRY",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        type: "address",
      },
    ],
  },
  {
    name: "TOKENS",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        type: "address",
      },
    ],
  },
  {
    name: "pendingOf",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        type: "uint256",
        name: "sourceProjectId",
      },
      {
        type: "address",
        name: "stickyToken",
      },
      {
        type: "uint256",
        name: "groupId",
      },
    ],
    outputs: [
      {
        type: "uint256",
      },
    ],
  },
  {
    name: "totalPendingOf",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        type: "uint256",
        name: "sourceProjectId",
      },
    ],
    outputs: [
      {
        type: "uint256",
      },
    ],
  },
  {
    name: "send",
    type: "function",
    stateMutability: "payable",
    inputs: [
      {
        type: "uint256",
        name: "sourceProjectId",
      },
      {
        type: "address",
        name: "stickyToken",
      },
      {
        type: "uint256",
        name: "groupId",
      },
      {
        type: "uint256",
        name: "amount",
      },
      {
        type: "address",
        name: "sucker",
      },
      {
        type: "address",
        name: "backingToken",
      },
    ],
    outputs: [
      {
        type: "uint256",
        name: "leafIndex",
      },
    ],
  },
  {
    name: "settle",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        type: "uint256",
        name: "sourceProjectId",
      },
      {
        type: "address",
        name: "stickyToken",
      },
      {
        type: "uint256",
        name: "groupId",
      },
      {
        type: "uint256",
        name: "amount",
      },
    ],
    outputs: [
      {
        type: "uint256",
        name: "settled",
      },
    ],
  },
  {
    name: "Queue",
    type: "event",
    inputs: [
      {
        type: "uint256",
        name: "sourceProjectId",
        indexed: true,
      },
      {
        type: "address",
        name: "stickyToken",
        indexed: true,
      },
      {
        type: "uint256",
        name: "groupId",
        indexed: true,
      },
      {
        type: "address",
        name: "receiver",
      },
      {
        type: "uint256",
        name: "amount",
      },
      {
        type: "address",
        name: "caller",
      },
    ],
  },
  {
    name: "Send",
    type: "event",
    inputs: [
      {
        type: "uint256",
        name: "sourceProjectId",
        indexed: true,
      },
      {
        type: "address",
        name: "stickyToken",
        indexed: true,
      },
      {
        type: "uint256",
        name: "groupId",
        indexed: true,
      },
      {
        type: "address",
        name: "sucker",
      },
      {
        type: "address",
        name: "backingToken",
      },
      {
        type: "uint256",
        name: "index",
      },
      {
        type: "uint256",
        name: "projectTokenCount",
      },
      {
        type: "uint256",
        name: "minimumReclaimed",
      },
      {
        type: "uint256",
        name: "feeTokenCount",
      },
      {
        type: "uint256",
        name: "refundedFee",
      },
      {
        type: "uint256",
        name: "refundedTransportPayment",
      },
      {
        type: "address",
        name: "caller",
      },
    ],
  },
  {
    name: "Settle",
    type: "event",
    inputs: [
      {
        type: "uint256",
        name: "sourceProjectId",
        indexed: true,
      },
      {
        type: "address",
        name: "stickyToken",
        indexed: true,
      },
      {
        type: "uint256",
        name: "groupId",
        indexed: true,
      },
      {
        type: "uint256",
        name: "amount",
      },
      {
        type: "uint256",
        name: "settled",
      },
      {
        type: "address",
        name: "caller",
      },
    ],
  },
] as const;

const stickyFeePayerIdentityAbi = [
  {
    name: "COLLECTOR",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        type: "address",
      },
    ],
  },
] as const;
const stickyTokenIdentityAbi = [
  {
    name: "PROJECT_ID",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        type: "uint256",
      },
    ],
  },
] as const;
const stickySuckerIdentityAbi = [
  {
    name: "DIRECTORY",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        type: "address",
      },
    ],
  },
  {
    name: "REGISTRY",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        type: "address",
      },
    ],
  },
  {
    name: "TOKENS",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        type: "address",
      },
    ],
  },
  {
    name: "state",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        type: "uint8",
      },
    ],
  },
] as const;

/**
 * A reviewed, actually deployed collector and fee child on one source chain.
 * Obtain hashes and bindings from verified deployment artifacts, never predictions
 * or the target's own getters. A destination family has one address across sources.
 */
export interface StickySourceCollectorDeployment {
  sourceChainId: JBChainId;
  destinationChainId: JBChainId;
  address: Address;
  runtimeCodeHash: Hex;
  feePayer: Address;
  feePayerRuntimeCodeHash: Hex;
  registry: Address;
  tokens: Address;
  directory: Address;
  receiverFactory: Address;
}

/** No new collector family has been published as a verified live deployment yet. */
export const STICKY_SOURCE_COLLECTOR_DEPLOYMENTS: readonly StickySourceCollectorDeployment[] =
  [];

/**
 * Find a deployed source/home pair. Unknown or conflicting family records fail
 * closed, including different addresses for the same destination on other sources.
 */
export function stickySourceCollectorDeployment(
  sourceChainId: number,
  destinationChainId: number,
  deployments = STICKY_SOURCE_COLLECTOR_DEPLOYMENTS,
): StickySourceCollectorDeployment | undefined {
  const family = deployments.filter(
    (item) => item.destinationChainId === destinationChainId,
  );
  const matches = family.filter((item) => item.sourceChainId === sourceChainId);
  if (matches.length !== 1) return undefined;
  const found = matches[0];
  if (
    family.some(
      (item) =>
        !isAddressEqual(item.address, found.address) ||
        item.runtimeCodeHash.toLowerCase() !==
          found.runtimeCodeHash.toLowerCase(),
    )
  )
    return undefined;
  return found;
}

/** Recognize only an unambiguous deployed collector on this particular chain. */
export function stickySourceCollectorAt(
  sourceChainId: number,
  address: Address,
  deployments = STICKY_SOURCE_COLLECTOR_DEPLOYMENTS,
): StickySourceCollectorDeployment | undefined {
  if (!isAddress(address, { strict: false })) return undefined;
  const matches = deployments.filter(
    (item) =>
      item.sourceChainId === sourceChainId &&
      isAddressEqual(item.address, address),
  );
  if (matches.length !== 1) return undefined;
  return stickySourceCollectorDeployment(
    sourceChainId,
    matches[0].destinationChainId,
    deployments,
  );
}

/** One source project's attributed queue for a pool on the deployment's home chain. */
export interface StickyCollectorAllocation {
  deployment: StickySourceCollectorDeployment;
  sourceProjectId: bigint;
  stickyToken: Address;
  groupId: bigint;
}

function assertStickyAllocation(args: StickyCollectorAllocation): void {
  if (
    args.sourceProjectId <= 0n ||
    isAddressEqual(args.stickyToken, zeroAddress)
  )
    throw new Error("Sticky source project and share token must be nonzero.");
  const reason = validateStickyGroupId(args.groupId);
  if (reason) throw new Error(reason);
}

/**
 * Build one reserved-token split. Place it in RESERVED_TOKEN_SPLIT_GROUP_ID (1).
 * The split projectId remains the existing reward group, not a chain encoding.
 * Call verifyStickyCollectorRoute before configuring it; this pure builder cannot
 * establish deployment, destination readiness or an actually usable transport lane.
 */
export function buildStickyReservedSplit(
  args: StickyCollectorAllocation & {
    percent: number;
    lockedUntil?: number;
  },
): JBSplit {
  assertStickyAllocation(args);
  if (
    !Number.isInteger(args.percent) ||
    args.percent < 0 ||
    args.percent > SPLITS_TOTAL_PERCENT
  )
    throw new Error("Sticky split percent must be an integer from 0 to 1e9.");
  return buildSplit({
    beneficiary: args.stickyToken,
    hook: args.deployment.address,
    projectId: args.groupId,
    percent: args.percent,
    lockedUntil: args.lockedUntil,
  });
}

/** Read the queued amount, in source project-token atoms, without initiating delivery. */
export async function getStickyCollectorPending(
  client: PublicClient,
  args: StickyCollectorAllocation,
): Promise<bigint> {
  assertStickyAllocation(args);
  await assertStickyChain(client, args.deployment.sourceChainId);
  return client.readContract({
    address: args.deployment.address,
    abi: stickySourceCollectorAbi,
    functionName: "pendingOf",
    args: [args.sourceProjectId, args.stickyToken, args.groupId],
  });
}

function assertStickyDelivery(
  args: StickyCollectorAllocation & { amount: bigint },
): void {
  assertStickyAllocation(args);
  if (args.amount <= 0n)
    throw new Error("Sticky delivery amount must be positive.");
}

/**
 * Prepare permissionless source submission, not final destination settlement.
 * Reverify identity/route and pending custody before wallet simulation. Value pays
 * the registry fee plus any native transport budget; this builder does not quote it.
 */
export function buildStickyCollectorSendTx(
  args: StickyCollectorAllocation & {
    amount: bigint;
    sucker: Address;
    backingToken: Address;
    value: bigint;
  },
): {
  chainId: JBChainId;
  address: Address;
  abi: typeof stickySourceCollectorAbi;
  functionName: "send";
  args: readonly [bigint, Address, bigint, bigint, Address, Address];
  value: bigint;
} {
  assertStickyDelivery(args);
  if (args.deployment.sourceChainId === args.deployment.destinationChainId)
    throw new Error("Use settle on the Sticky pool's home chain.");
  if (
    isAddressEqual(args.sucker, zeroAddress) ||
    isAddressEqual(args.backingToken, zeroAddress) ||
    args.value < 0n
  )
    throw new Error(
      "Sticky send requires a route, backing token and nonnegative native budget.",
    );
  return {
    chainId: args.deployment.sourceChainId,
    address: args.deployment.address,
    abi: stickySourceCollectorAbi,
    functionName: "send" as const,
    args: [
      args.sourceProjectId,
      args.stickyToken,
      args.groupId,
      args.amount,
      args.sucker,
      args.backingToken,
    ] as const,
    value: args.value,
  };
}

/** Prepare permissionless local settlement; the source must be the bound home chain. */
export function buildStickyCollectorSettleTx(
  args: StickyCollectorAllocation & { amount: bigint },
): {
  chainId: JBChainId;
  address: Address;
  abi: typeof stickySourceCollectorAbi;
  functionName: "settle";
  args: readonly [bigint, Address, bigint, bigint];
} {
  assertStickyDelivery(args);
  if (args.deployment.sourceChainId !== args.deployment.destinationChainId)
    throw new Error("Sticky settlement must execute on the pool's home chain.");
  return {
    chainId: args.deployment.sourceChainId,
    address: args.deployment.address,
    abi: stickySourceCollectorAbi,
    functionName: "settle" as const,
    args: [
      args.sourceProjectId,
      args.stickyToken,
      args.groupId,
      args.amount,
    ] as const,
  };
}

async function assertStickyChain(
  client: PublicClient,
  chainId: number,
): Promise<void> {
  if ((await client.getChainId()) !== chainId)
    throw new Error("Sticky RPC chain does not match the configured chain.");
}

async function requireStickyCode(
  client: PublicClient,
  address: Address,
): Promise<Hex> {
  const code = await client.getCode({ address });
  if (!code || code === "0x")
    throw new Error(`Sticky requires deployed code at ${address}.`);
  return code;
}

/** A positive-backed claim needs a live controller and a terminal accepting that exact asset. */
async function stickyBackingContext(
  client: PublicClient,
  chainId: JBChainId,
  projectId: bigint,
  token: Address,
) {
  const [controller, terminal] = await Promise.all([
    client.readContract({
      address: v6Address("JBDirectory", chainId),
      abi: jbDirectoryAbi,
      functionName: "controllerOf",
      args: [projectId],
    }),
    client.readContract({
      address: v6Address("JBDirectory", chainId),
      abi: jbDirectoryAbi,
      functionName: "primaryTerminalOf",
      args: [projectId, token],
    }),
  ]);
  if (
    isAddressEqual(controller, zeroAddress) ||
    isAddressEqual(terminal, zeroAddress)
  )
    throw new Error(
      "Sticky reward route needs a controller and backing terminal on both chains.",
    );
  await Promise.all([
    requireStickyCode(client, controller),
    requireStickyCode(client, terminal),
  ]);
  const context = await client.readContract({
    address: terminal,
    abi: jbMultiTerminalAbi,
    functionName: "accountingContextForTokenOf",
    args: [projectId, token],
  });
  if (!isAddressEqual(context.token, token))
    throw new Error(
      "Sticky backing terminal does not accept the mapped asset.",
    );
  return { ...context, controller };
}

/**
 * Verify reviewed runtime fingerprints and immutable bindings on the actual source
 * chain. This is read-only evidence at the time of the call, not execution authority.
 */
export async function verifyStickySourceCollector(
  client: PublicClient,
  deployment: StickySourceCollectorDeployment,
): Promise<void> {
  await assertStickyChain(client, deployment.sourceChainId);
  const [collectorCode, feeCode] = await Promise.all([
    requireStickyCode(client, deployment.address),
    requireStickyCode(client, deployment.feePayer),
  ]);
  if (
    keccak256(collectorCode).toLowerCase() !==
      deployment.runtimeCodeHash.toLowerCase() ||
    keccak256(feeCode).toLowerCase() !==
      deployment.feePayerRuntimeCodeHash.toLowerCase()
  )
    throw new Error(
      "Sticky collector runtime does not match the reviewed deployment.",
    );
  const bindings = [
    ["DIRECTORY", deployment.directory, "JBDirectory"],
    ["REGISTRY", deployment.registry, "JBSuckerRegistry"],
    ["TOKENS", deployment.tokens, "JBTokens"],
    [
      "RECEIVER_FACTORY",
      deployment.receiverFactory,
      "StickyRewardReceiverFactory",
    ],
  ] as const;
  for (const [name, expected, canonical] of bindings) {
    if (
      !isAddressEqual(expected, v6Address(canonical, deployment.sourceChainId))
    )
      throw new Error(`Sticky ${name} is not the canonical V6 binding.`);
    const actual = await client.readContract({
      address: deployment.address,
      abi: stickySourceCollectorAbi,
      functionName: name,
    });
    if (!isAddressEqual(actual, expected))
      throw new Error(`Sticky collector ${name} binding changed.`);
  }
  const [destination, feePayer, collector] = await Promise.all([
    client.readContract({
      address: deployment.address,
      abi: stickySourceCollectorAbi,
      functionName: "DESTINATION_CHAIN_ID",
    }),
    client.readContract({
      address: deployment.address,
      abi: stickySourceCollectorAbi,
      functionName: "FEE_PAYER",
    }),
    client.readContract({
      address: deployment.feePayer,
      abi: stickyFeePayerIdentityAbi,
      functionName: "COLLECTOR",
    }),
  ]);
  if (
    destination !== BigInt(deployment.destinationChainId) ||
    !isAddressEqual(feePayer, deployment.feePayer) ||
    !isAddressEqual(collector, deployment.address)
  )
    throw new Error(
      "Sticky collector destination or fee-child binding changed.",
    );
}

/** A qualified route snapshot. It does not prove finality or install an executor. */
export interface StickyCollectorRoute {
  receiver: Address;
  sourceToken: Address;
  rewardToken: Address;
  destinationProjectId: bigint;
}

/**
 * Freshly qualify one local or direct remote lane before configuring a split or
 * sending. Source credits may queue before their ERC-20 exists; the home-chain
 * reward ERC-20 and registered Sticky pool must already exist. The canonical
 * registered peer determines the destination reward project, never address parity.
 * Re-run through the reviewed-write reverify boundary before simulation/submission.
 */
export async function verifyStickyCollectorRoute(
  sourceClient: PublicClient,
  destinationClient: PublicClient,
  args: StickyCollectorAllocation & {
    sucker?: Address;
    backingToken?: Address;
  },
): Promise<StickyCollectorRoute> {
  assertStickyAllocation(args);
  const { deployment, sourceProjectId, stickyToken, groupId } = args;
  const home = deployment.destinationChainId;
  await Promise.all([
    verifyStickySourceCollector(sourceClient, deployment),
    assertStickyChain(destinationClient, home),
  ]);
  await requireStickyCode(destinationClient, stickyToken);
  const stickyProjectId = await destinationClient.readContract({
    address: stickyToken,
    abi: stickyTokenIdentityAbi,
    functionName: "PROJECT_ID",
  });
  const [registered, projectToken] = await Promise.all([
    destinationClient.readContract({
      address: v6Address("StickyHook", home),
      abi: stickyHookAbi,
      functionName: "tokenOf",
      args: [stickyProjectId],
    }),
    destinationClient.readContract({
      address: v6Address("JBTokens", home),
      abi: jbTokensAbi,
      functionName: "tokenOf",
      args: [stickyProjectId],
    }),
  ]);
  if (
    !isAddressEqual(registered, stickyToken) ||
    !isAddressEqual(projectToken, stickyToken)
  )
    throw new Error(
      "Sticky share token is not the registered home-chain pool.",
    );
  const destinationFactory = v6Address("StickyRewardReceiverFactory", home);
  const [sourceReceiver, receiver, distributor] = await Promise.all([
    sourceClient.readContract({
      address: deployment.receiverFactory,
      abi: stickyRewardReceiverFactoryAbi,
      functionName: "predictReceiverOf",
      args: [stickyToken, groupId],
    }),
    destinationClient.readContract({
      address: destinationFactory,
      abi: stickyRewardReceiverFactoryAbi,
      functionName: "predictReceiverOf",
      args: [stickyToken, groupId],
    }),
    destinationClient.readContract({
      address: destinationFactory,
      abi: stickyRewardReceiverFactoryAbi,
      functionName: "DISTRIBUTOR",
    }),
  ]);
  if (
    !isAddressEqual(sourceReceiver, receiver) ||
    !isAddressEqual(distributor, v6Address("StickyDistributor", home))
  )
    throw new Error(
      "Sticky receiver identity differs between source and home chain.",
    );
  let destinationProjectId = sourceProjectId;
  if (deployment.sourceChainId !== home) {
    const { jbSuckerV6ViewAbi, suckerBytes32ToAddress } = await import(
      "./suckers.js"
    );
    const { sucker, backingToken } = args;
    if (!sucker || !backingToken)
      throw new Error("A direct Sticky source-to-home route is required.");
    // Membership is anchored before any candidate getters are trusted.
    if (
      !(await sourceClient.readContract({
        address: deployment.registry,
        abi: jbSuckerRegistryAbi,
        functionName: "isSuckerOf",
        args: [sourceProjectId, sucker],
      }))
    )
      throw new Error(
        "Sticky source route is not registered for this project.",
      );
    const [
      projectId,
      peerChainId,
      peer,
      state,
      mapping,
      registry,
      tokens,
      directory,
    ] = await Promise.all([
      sourceClient.readContract({
        address: sucker,
        abi: jbSuckerV6ViewAbi,
        functionName: "projectId",
      }),
      sourceClient.readContract({
        address: sucker,
        abi: jbSuckerV6ViewAbi,
        functionName: "peerChainId",
      }),
      sourceClient.readContract({
        address: sucker,
        abi: jbSuckerV6ViewAbi,
        functionName: "peer",
      }),
      sourceClient.readContract({
        address: sucker,
        abi: stickySuckerIdentityAbi,
        functionName: "state",
      }),
      sourceClient.readContract({
        address: sucker,
        abi: jbSuckerV6ViewAbi,
        functionName: "remoteTokenFor",
        args: [backingToken],
      }),
      sourceClient.readContract({
        address: sucker,
        abi: stickySuckerIdentityAbi,
        functionName: "REGISTRY",
      }),
      sourceClient.readContract({
        address: sucker,
        abi: stickySuckerIdentityAbi,
        functionName: "TOKENS",
      }),
      sourceClient.readContract({
        address: sucker,
        abi: stickySuckerIdentityAbi,
        functionName: "DIRECTORY",
      }),
    ]);
    if (
      projectId !== sourceProjectId ||
      peerChainId !== BigInt(home) ||
      peer === zeroHash ||
      !isAddressEqual(registry, deployment.registry) ||
      !isAddressEqual(tokens, deployment.tokens) ||
      !isAddressEqual(directory, deployment.directory)
    )
      throw new Error(
        "Sticky route does not bind this source project to the selected home chain.",
      );
    // JBSuckerState: ENABLED=0, DEPRECATION_PENDING=1; other states cannot send.
    if (state !== 0 && state !== 1)
      throw new Error("Sticky source route no longer permits sending.");
    if (!mapping.enabled || mapping.emergencyHatch || mapping.addr === zeroHash)
      throw new Error("Sticky source backing mapping is unavailable.");
    const peerAddress = suckerBytes32ToAddress(peer);
    destinationProjectId = await destinationClient.readContract({
      address: peerAddress,
      abi: jbSuckerV6ViewAbi,
      functionName: "projectId",
    });
    if (
      !(await destinationClient.readContract({
        address: v6Address("JBSuckerRegistry", home),
        abi: jbSuckerRegistryAbi,
        functionName: "isSuckerOf",
        args: [destinationProjectId, peerAddress],
      }))
    )
      throw new Error("Sticky destination route is not registered.");
    const [returnChain, returnPeer] = await Promise.all([
      destinationClient.readContract({
        address: peerAddress,
        abi: jbSuckerV6ViewAbi,
        functionName: "peerChainId",
      }),
      destinationClient.readContract({
        address: peerAddress,
        abi: jbSuckerV6ViewAbi,
        functionName: "peer",
      }),
    ]);
    if (
      returnChain !== BigInt(deployment.sourceChainId) ||
      !isAddressEqual(suckerBytes32ToAddress(returnPeer), sucker)
    )
      throw new Error(
        "Sticky destination peer does not match the source route.",
      );
    const remoteBackingToken = suckerBytes32ToAddress(mapping.addr);
    const [sourceContext, destinationContext] = await Promise.all([
      stickyBackingContext(
        sourceClient,
        deployment.sourceChainId,
        sourceProjectId,
        backingToken,
      ),
      stickyBackingContext(
        destinationClient,
        home,
        destinationProjectId,
        remoteBackingToken,
      ),
    ]);
    if (sourceContext.decimals !== destinationContext.decimals)
      throw new Error(
        "Sticky backing decimals differ between source and home chain.",
      );
    // Registration survives some ruleset changes that can revoke mint authority.
    // Probe the actual current controller as the peer; this eth_call mints no live tokens.
    await destinationClient.simulateContract({
      address: destinationContext.controller,
      abi: jbControllerAbi,
      functionName: "mintTokensOf",
      args: [destinationProjectId, 1n, receiver, "", false],
      account: peerAddress,
    });
  }
  const [sourceToken, rewardToken] = await Promise.all([
    sourceClient.readContract({
      address: deployment.tokens,
      abi: jbTokensAbi,
      functionName: "tokenOf",
      args: [sourceProjectId],
    }),
    destinationClient.readContract({
      address: v6Address("JBTokens", home),
      abi: jbTokensAbi,
      functionName: "tokenOf",
      args: [destinationProjectId],
    }),
  ]);
  await requireStickyCode(destinationClient, rewardToken);
  return { receiver, sourceToken, rewardToken, destinationProjectId };
}
