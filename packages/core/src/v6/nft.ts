import { Address, Hex, PublicClient, zeroAddress } from "viem";
import { JBOmnichainDeployerContracts } from "../contracts.js";
import {
  jb721TiersHookAbi,
  jb721TiersHookStoreAbi,
  jbContractAddress,
  jbOmnichainDeployerAbi,
} from "../generated/juicebox.js";
import { JBChainId } from "../types.js";
import { getRevnetTiered721Hook } from "./revnets.js";
import { getCurrentRuleset } from "./rulesets.js";

/**
 * JB721TiersHookStore's `DISCOUNT_DENOMINATOR`: a tier's `discountPercent` is
 * out of 200, so the shopper-facing "% off" is `discountPercent / 2`.
 */
export const DISCOUNT_DENOMINATOR = 200n;

/**
 * A tier's effective (discounted) price, matching the on-chain formula in
 * JB721TiersHookStore: `price - mulDiv(price, discountPercent, 200)` with
 * integer-floor division.
 *
 * @param price The tier's full (undiscounted) price.
 * @param discountPercent The tier's discount, out of 200 (`DISCOUNT_DENOMINATOR`).
 */
export function effectiveTierPrice(
  price: bigint,
  discountPercent: number | bigint,
): bigint {
  let discount = BigInt(discountPercent);
  if (discount <= 0n) return price;
  if (discount > DISCOUNT_DENOMINATOR) discount = DISCOUNT_DENOMINATOR;
  return price - (price * discount) / DISCOUNT_DENOMINATOR;
}

/**
 * A single 721 tier a project sells.
 */
export interface Project721Tier {
  id: number;
  /** Full (undiscounted) price in the shop's pricing terms. */
  price: bigint;
  remainingSupply: number;
  initialSupply: number;
  votingUnits: bigint;
  reserveFrequency: number;
  category: number;
  /** Out of 200 — see {@link DISCOUNT_DENOMINATOR}. */
  discountPercent: number;
  encodedIpfsUri: Hex;
  /** tokenUriResolver output (data URI), or "" if the hook has no resolver. */
  resolvedUri: string;
}

/**
 * A project's resolved 721 tiers hook ("shop"): the hook, its store, the
 * metadata id target for pay/cash-out metadata, the pricing context, and tiers.
 */
export interface Project721Shop {
  /** The project's 721 tiers hook (the ruleset data hook / revnet hook). */
  hook: Address;
  /** The hook's tiers store. */
  store: Address;
  /**
   * The hook's `METADATA_ID_TARGET` (shared implementation address). Pass this
   * to {@link build721PayMetadata} / {@link build721CashOutMetadata}, never the
   * `hook` address.
   */
  metadataIdTarget: Address;
  /** The hook's pricing context: `currency` id and `decimals`. */
  pricing: { currency: number; decimals: number };
  tiers: Project721Tier[];
}

/**
 * Read a JB721 hook's `METADATA_ID_TARGET` — the shared *implementation* address
 * that pay/cash-out metadata ids must key off (a delegatecall clone reports the
 * implementation, not itself). Falls back to `hook` if the read reverts (e.g. an
 * older hook without the getter), which is only correct for a non-clone hook.
 *
 * @param client A viem public client on the given chain.
 * @param args.hook The project's 721 tiers hook (clone) address.
 */
export async function get721MetadataIdTarget(
  client: PublicClient,
  { hook }: { chainId: JBChainId; hook: Address },
): Promise<Address> {
  return client
    .readContract({
      address: hook,
      abi: jb721TiersHookAbi,
      functionName: "METADATA_ID_TARGET",
    })
    .catch(() => hook);
}

/**
 * Resolve a project's 721 tiers hook, its store, metadata id target, pricing
 * context, and tiers in one call.
 *
 * Hook resolution mirrors the app patterns: revnets read
 * `REVOwner.tiered721HookOf`; custom projects read the current ruleset's pay
 * data hook — either the omnichain deployer (the real hook lives in
 * `JBOmnichainDeployer.tiered721HookOf(projectId, rulesetId)`) or the 721 hook
 * itself, verified by probing `STORE()` (a revert means it is not a 721 hook, so
 * the project has no shop).
 *
 * Returns `null` when the project authoritatively has no 721 shop. RPC failures
 * on authoritative reads throw, so a transient error surfaces as an error rather
 * than a false "no shop".
 *
 * @param client A viem public client on the given chain.
 * @param args.projectId The project (or revnet) id.
 * @param args.isRevnet Whether the project is a revnet (changes hook resolution).
 * @param args.tierLimit Max tiers to read from `tiersOf`. Defaults to 100.
 * @param args.categories Tier categories to filter by (empty = all). Defaults to `[]`.
 */
export async function getProject721Shop(
  client: PublicClient,
  {
    chainId,
    projectId,
    isRevnet,
    tierLimit = 100,
    categories = [],
  }: {
    chainId: JBChainId;
    projectId: bigint;
    isRevnet: boolean;
    tierLimit?: number;
    categories?: bigint[];
  },
): Promise<Project721Shop | null> {
  // 1. Resolve the 721 hook.
  let hook: Address | null = null;
  // A non-authoritative candidate is the ruleset data hook, which might be some
  // other kind of hook; the STORE() probe below decides.
  let authoritative = true;

  if (isRevnet) {
    const revnetHook = await getRevnetTiered721Hook(client, {
      chainId,
      revnetId: projectId,
    });
    hook = revnetHook !== zeroAddress ? revnetHook : null;
  } else {
    const { ruleset, metadata } = await getCurrentRuleset(client, {
      chainId,
      projectId,
    });
    const dataHook = metadata.dataHook as Address;
    if (metadata.useDataHookForPay && dataHook && dataHook !== zeroAddress) {
      const omni = jbContractAddress["6"][
        JBOmnichainDeployerContracts.JBOmnichainDeployer
      ]?.[chainId] as Address | undefined;
      if (omni && dataHook.toLowerCase() === omni.toLowerCase()) {
        // Omnichain project: the real 721 hook lives in the deployer's
        // per-ruleset mapping.
        const [omniHook] = await client.readContract({
          address: omni,
          abi: jbOmnichainDeployerAbi,
          functionName: "tiered721HookOf",
          args: [projectId, BigInt(ruleset.id)],
        });
        hook = omniHook !== zeroAddress ? omniHook : null;
      } else {
        // Single-chain custom project: the data hook may be the 721 hook itself.
        hook = dataHook;
        authoritative = false;
      }
    }
  }
  if (!hook) return null;

  // 2. The hook's store. For a non-authoritative candidate a revert means "not a
  // 721 hook" (no shop); for an authoritative one, let failures throw.
  const readStore = () =>
    client.readContract({
      address: hook!,
      abi: jb721TiersHookAbi,
      functionName: "STORE",
    });
  const store = authoritative
    ? await readStore()
    : await readStore().catch(() => null);
  if (!store) return null;

  // 3. Metadata id target + pricing context. Pricing is meaningless without the
  // hook's exact currency + decimals, so a failure here is an error, not a
  // fallback.
  const [metadataIdTarget, pricingRaw] = await Promise.all([
    get721MetadataIdTarget(client, { chainId, hook }),
    client.readContract({
      address: hook,
      abi: jb721TiersHookAbi,
      functionName: "pricingContext",
    }),
  ]);

  // 4. The tiers, with resolver URIs included so callers can name tiers without
  // a per-tier resolver read.
  const raw = await client.readContract({
    address: store,
    abi: jb721TiersHookStoreAbi,
    functionName: "tiersOf",
    args: [hook, categories, true, 0n, BigInt(tierLimit)],
  });

  const tiers: Project721Tier[] = raw
    .filter((tier) => tier.initialSupply > 0)
    .map((tier) => ({
      id: tier.id,
      price: tier.price,
      remainingSupply: tier.remainingSupply,
      initialSupply: tier.initialSupply,
      votingUnits: tier.votingUnits,
      reserveFrequency: tier.reserveFrequency,
      category: tier.category,
      discountPercent: tier.discountPercent,
      encodedIpfsUri: tier.encodedIpfsUri,
      resolvedUri: tier.resolvedUri ?? "",
    }));

  return {
    hook,
    store,
    metadataIdTarget,
    pricing: { currency: Number(pricingRaw[0]), decimals: Number(pricingRaw[1]) },
    tiers,
  };
}
