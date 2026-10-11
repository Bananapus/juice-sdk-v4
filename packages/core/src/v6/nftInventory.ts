import { type Address, type PublicClient, parseAbi, zeroAddress } from "viem";
import {
  jb721TiersHookStoreAbi,
  jbProjectsAbi,
} from "../generated/juicebox.js";
import { v6Address } from "./types.js";
import type { JBChainId } from "../types.js";
import {
  getCurrentRuleset,
  getUpcomingRuleset,
  type JBRulesetWithMetadata,
} from "./rulesets.js";
import {
  getProject721Shop,
  type Project721Shop,
  type Project721Tier,
} from "./nft.js";

// Native read interface and deployment addresses: @ballkidz/defifa@1.0.2,
// DefifaHook/DefifaDeployer; source revision d3c46dd4fe9a093cc46ed5eb2106395d2a19b860.
// Defifa's pay metadata is (address,uint16[]), NOT JB721's (bool,uint16[]).
const defifaReadAbi = parseAbi([
  "function store() view returns (address)",
  "function CODE_ORIGIN() view returns (address)",
  "function projectId() view returns (uint256)",
  "function gamePhaseReporter() view returns (address)",
  "function gamePotReporter() view returns (address)",
  "function pricingCurrency() view returns (uint256)",
  "function contractURI() view returns (string)",
  "function tierNameOf(uint256) view returns (string)",
  "function currentSupplyOfTier(uint256) view returns (uint256)",
  "function currentGamePotOf(uint256,bool) view returns (uint256,address,uint256)",
  "function currentGamePhaseOf(uint256) view returns (uint8)",
]);
const mainnetDefifa = {
  deployer: "0x375afb2a4b1cadae99f8863f96fc1aebcbaf8bde",
  implementation: "0xe2229dd6a7da99ebb8f7d749612edd1b2addafe1",
} as const;
const testnetDefifa = {
  deployer: "0xbfa54a97099485c134f06c9a08a4909c26fd7318",
  implementation: "0x3184783d0e3cbf5a821794b246c71a3d1a0cf312",
} as const;
const defifaDeployments: Partial<
  Record<JBChainId, typeof mainnetDefifa | typeof testnetDefifa>
> = {
  1: mainnetDefifa,
  10: mainnetDefifa,
  8453: mainnetDefifa,
  42161: mainnetDefifa,
  11155111: testnetDefifa,
  11155420: testnetDefifa,
  84532: testnetDefifa,
  421614: testnetDefifa,
};
const defifaStore = "0x69913acf79dbba170d9efafe605ee62b42164f9c";

export interface ProjectDefifaTier extends Project721Tier {
  /** Authoritative onchain range/team name, independent of URI resolution. */
  name: string;
  /** Minted, non-burned NFTs; distinct from the store's remaining supply. */
  currentSupply: bigint;
}

/** Display-only Defifa inventory. Never pass it to generic JB721 shop writers. */
export interface ProjectDefifaInventory {
  protocol: "defifa";
  hook: Address;
  store: Address;
  implementation: Address;
  contractUri: string;
  pricing: { currency: number; decimals: number; token: Address };
  phase: number;
  tiers: ProjectDefifaTier[];
  ruleset: JBRulesetWithMetadata;
  capabilities: {
    genericPay: false;
    genericCashOut: false;
    manageTiers: false;
  };
  /** Inclusive store cursor for the next page, or null when exhausted. */
  nextStartingId: bigint | null;
  blockNumber: bigint;
}

/** JB721 shops retain their existing transaction context; Defifa does not. */
export type ProjectNftInventory =
  | ProjectDefifaInventory
  | (Project721Shop & {
      protocol: "jb721";
      capabilities: {
        genericPay: true;
        genericCashOut: true;
        manageTiers: true;
      };
      nextStartingId: bigint | null;
      blockNumber: bigint;
    });

export interface ProjectNftInventoryArgs {
  chainId: JBChainId;
  projectId: bigint;
  isRevnet?: boolean;
  /** Reuse a previous inventory block across pages; defaults to the current block. */
  blockNumber?: bigint;
  /** 1–128 tiers per page, default 100. */
  tierLimit?: number;
  /** Inclusive tiersOf cursor; use nextStartingId, not last tier ID + 1. */
  startingId?: bigint;
  /** Ascending unique category IDs; stable pagination follows the store ordering. */
  categories?: bigint[];
  /** Opt-in resolver output; large inline images can exceed RPC response limits. */
  includeResolvedUri?: boolean;
}

function sameAddress(left: Address, right: Address): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

/**
 * Discover displayable NFT tiers at one block, including Defifa games before
 * entry starts and after payments stop. Unknown hooks return null; RPC failures
 * throw. Defifa recognition requires the pinned deployer, exact clone runtime,
 * project binding, native implementation/store and both game reporters.
 *
 * This is inventory discovery, not action authorization: JB721 capabilities
 * identify compatible calldata, not account permissions or current pay status.
 * Defifa entries, refunds and settlement require its native lifecycle adapter.
 */
export async function getProjectNftInventory(
  client: PublicClient,
  args: ProjectNftInventoryArgs,
): Promise<ProjectNftInventory | null> {
  const {
    chainId,
    projectId,
    isRevnet = false,
    tierLimit = 100,
    startingId = 0n,
    categories = [],
    includeResolvedUri = false,
  } = args;
  if (!Number.isInteger(tierLimit) || tierLimit < 1 || tierLimit > 128) {
    throw new Error(
      "NFT inventory tierLimit must be an integer between 1 and 128.",
    );
  }
  if (startingId < 0n)
    throw new Error("NFT inventory startingId cannot be negative.");
  if (
    categories.some(
      (category, index) =>
        category < 0n ||
        category > 0xffffffn ||
        (index > 0 && category <= categories[index - 1]!),
    )
  ) {
    throw new Error(
      "NFT inventory categories must be ascending, unique uint24 values for stable pagination.",
    );
  }
  if ((await client.getChainId()) !== chainId)
    throw new Error("NFT inventory client is connected to the wrong chain.");
  if (args.blockNumber !== undefined && args.blockNumber < 0n) {
    throw new Error("NFT inventory blockNumber cannot be negative.");
  }
  const blockNumber = args.blockNumber ?? (await client.getBlockNumber());
  const snapshot = {
    ...client,
    readContract: (parameters: Parameters<PublicClient["readContract"]>[0]) =>
      client.readContract({ ...parameters, blockNumber }),
  } as PublicClient;
  const ruleset = isRevnet
    ? undefined
    : await getCurrentRuleset(snapshot, args);
  const hook = ruleset?.metadata.dataHook as Address | undefined;
  const deployment = defifaDeployments[chainId];
  let owner: Address | undefined;
  // Only project ownership by the native deployer admits a Defifa candidate.
  // This does not probe arbitrary custom hooks as if they were Defifa.
  if (!isRevnet && deployment) {
    owner = await snapshot.readContract({
      address: v6Address("JBProjects", chainId),
      abi: jbProjectsAbi,
      functionName: "ownerOf",
      args: [projectId],
    });
  }
  if (!deployment || !owner || !sameAddress(owner, deployment.deployer)) {
    const shop = await getProject721Shop(snapshot, {
      ...args,
      isRevnet,
      ruleset,
      includeInactiveHook: true,
      tierLimit: tierLimit + 1,
    });
    if (!shop) return null;
    return {
      ...shop,
      protocol: "jb721",
      blockNumber,
      tiers: shop.tiers.slice(0, tierLimit),
      nextStartingId: shop.tiers[tierLimit]
        ? BigInt(shop.tiers[tierLimit]!.id)
        : null,
      capabilities: {
        genericPay: true,
        genericCashOut: true,
        manageTiers: true,
      },
    };
  }
  // Countdown has no active ruleset yet; its first configured hook is queued.
  const hookRuleset =
    !hook || hook === zeroAddress
      ? await getUpcomingRuleset(snapshot, args)
      : ruleset!;
  const defifaHook = hookRuleset.metadata.dataHook as Address;
  if (!defifaHook || defifaHook === zeroAddress) return null;
  const cloneCode = await client.getBytecode({
    address: defifaHook,
    blockNumber,
  });
  const expectedCode = `0x363d3d373d3d3d363d73${deployment.implementation.slice(2)}5af43d82803e903d91602b57fd5bf3`;
  if (cloneCode?.toLowerCase() !== expectedCode)
    throw new Error(
      "Defifa hook clone does not match its pinned implementation.",
    );
  const read = (
    functionName:
      | "store"
      | "CODE_ORIGIN"
      | "projectId"
      | "gamePhaseReporter"
      | "gamePotReporter"
      | "pricingCurrency"
      | "contractURI",
  ) =>
    snapshot.readContract({
      address: defifaHook,
      abi: defifaReadAbi,
      functionName,
    });
  const [
    store,
    implementation,
    hookProjectId,
    phaseReporter,
    potReporter,
    currency,
    contractUri,
  ] = await Promise.all([
    read("store"),
    read("CODE_ORIGIN"),
    read("projectId"),
    read("gamePhaseReporter"),
    read("gamePotReporter"),
    read("pricingCurrency"),
    read("contractURI"),
  ]);
  if (
    !sameAddress(store as Address, defifaStore) ||
    !sameAddress(implementation as Address, deployment.implementation) ||
    hookProjectId !== projectId ||
    !sameAddress(phaseReporter as Address, deployment.deployer) ||
    !sameAddress(potReporter as Address, deployment.deployer)
  ) {
    throw new Error(
      "Defifa hook provenance does not match the project deployment.",
    );
  }
  const [pot, phase, raw] = await Promise.all([
    snapshot.readContract({
      address: deployment.deployer,
      abi: defifaReadAbi,
      functionName: "currentGamePotOf",
      args: [projectId, false],
    }),
    snapshot.readContract({
      address: deployment.deployer,
      abi: defifaReadAbi,
      functionName: "currentGamePhaseOf",
      args: [projectId],
    }),
    snapshot.readContract({
      address: store as Address,
      abi: jb721TiersHookStoreAbi,
      functionName: "tiersOf",
      args: [
        defifaHook,
        categories,
        includeResolvedUri,
        startingId,
        BigInt(tierLimit + 1),
      ],
    }),
  ]);
  if (
    typeof currency !== "bigint" ||
    currency > 0xffffffffn ||
    pot[2] > 255n ||
    pot[1] === zeroAddress ||
    phase > 5
  ) {
    throw new Error("Defifa pricing or phase context is invalid.");
  }
  const visible = raw.filter((tier) => tier.initialSupply > 0);
  const tiers = await Promise.all(
    visible.slice(0, tierLimit).map(async (tier) => {
      const [name, currentSupply] = await Promise.all([
        snapshot.readContract({
          address: defifaHook,
          abi: defifaReadAbi,
          functionName: "tierNameOf",
          args: [BigInt(tier.id)],
        }),
        snapshot.readContract({
          address: defifaHook,
          abi: defifaReadAbi,
          functionName: "currentSupplyOfTier",
          args: [BigInt(tier.id)],
        }),
      ]);
      return { ...tier, name, currentSupply };
    }),
  );
  return {
    protocol: "defifa",
    hook: defifaHook,
    store: store as Address,
    implementation: implementation as Address,
    contractUri: contractUri as string,
    pricing: {
      currency: Number(currency),
      decimals: Number(pot[2]),
      token: pot[1],
    },
    phase,
    tiers,
    ruleset: hookRuleset,
    blockNumber,
    capabilities: {
      genericPay: false,
      genericCashOut: false,
      manageTiers: false,
    },
    nextStartingId: visible[tierLimit] ? BigInt(visible[tierLimit]!.id) : null,
  };
}
