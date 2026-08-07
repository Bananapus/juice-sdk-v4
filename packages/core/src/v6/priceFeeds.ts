import { PublicClient } from "viem";
import { jbPricesAbi } from "../generated/juicebox.js";
import { JBChainId } from "../types.js";
import { isContractRevertError } from "../utils/errors.js";
import { JBAccountingContext } from "./terminals.js";
import { v6Address } from "./types.js";

/**
 * One `JBPrices.pricePerUnitOf` lookup a project's configuration depends on at
 * runtime. Pairs are unordered — JBPrices falls back to the inverse feed
 * itself, so reachability is symmetric.
 */
export interface JBFeedPair {
  pricingCurrency: number;
  unitCurrency: number;
  /**
   * The decimals the terminal itself passes: the context's decimals on the
   * pay path, 18 (the store's max fixed-point fidelity) on the cross-context
   * cash-out/surplus path.
   */
  decimals: number;
}

/**
 * Every `JBPrices` pair the terminal will resolve at runtime for a project
 * accepting the given accounting contexts (the exact structs
 * `buildAccountingContext` emits) with the given ruleset `baseCurrency`:
 *
 * - each `context.currency` ↔ `baseCurrency` (the pay/issuance conversion;
 *   skipped when equal — the terminal short-circuits), and
 * - each `context.currency` ↔ each other `context.currency` (cash-out and
 *   surplus views convert every OTHER context's balance into the reclaimed
 *   context's currency, NOT the base currency; skipped for single-context
 *   projects).
 *
 * Pairs are deduped without direction. Feeds resolve direct or inverse only —
 * never transitively through an intermediate currency — so every returned pair
 * must be individually served by a feed or the project's payments and/or cash
 * outs revert on-chain. Accounting contexts are immutable once set, so an
 * unreachable pair must be caught BEFORE launch (see
 * {@link probeFeedReachability}).
 */
export function requiredFeedPairs(
  accountingContexts: readonly JBAccountingContext[],
  baseCurrency: number,
): JBFeedPair[] {
  const pairs: JBFeedPair[] = [];
  const seen = new Set<string>();
  const add = (
    pricingCurrency: number,
    unitCurrency: number,
    decimals: number,
  ) => {
    if (pricingCurrency === unitCurrency) return;
    const key = `${Math.min(pricingCurrency, unitCurrency)}:${Math.max(
      pricingCurrency,
      unitCurrency,
    )}`;
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push({ pricingCurrency, unitCurrency, decimals });
  };
  for (const context of accountingContexts) {
    add(context.currency, baseCurrency, context.decimals);
  }
  for (let i = 0; i < accountingContexts.length; i++) {
    for (let j = i + 1; j < accountingContexts.length; j++) {
      add(accountingContexts[i].currency, accountingContexts[j].currency, 18);
    }
  }
  return pairs;
}

/**
 * A feed-reachability verdict. Anything other than `ok` should block a launch:
 * `missing` because the chain ANSWERED that a required pair has no feed, and
 * `unavailable` because at least one probe could not be completed — an RPC
 * failure is not proof of a missing feed, but it is not proof of a present one
 * either, so it fails closed WITHOUT being reported as `missing`.
 */
export type FeedReachability =
  | { status: "ok" }
  | { status: "missing"; missing: JBFeedPair[] }
  | { status: "unavailable" };

/**
 * Probe on-chain that every given `JBPrices` pair resolves, via the same
 * `pricePerUnitOf` read the terminal performs at runtime. The default
 * `projectId` 0 gives exactly the protocol-default-feed semantics a freshly
 * launched project starts with — and, because the probe is on-chain, a later
 * protocol-side default-feed registration unblocks the combination with no
 * client release.
 *
 * A revert (as opposed to a transport failure) means the chain answered, so a
 * pair is only ever reported `missing` on a proven
 * `ContractFunctionRevertedError`; every other failure — timeouts, HTTP
 * errors, a chain with no known `JBPrices` deployment — yields `unavailable`.
 *
 * @param client A viem public client on the given chain.
 * @param args.chainId The chain to probe on.
 * @param args.pairs The pairs to probe (see {@link requiredFeedPairs}).
 * @param args.projectId The project id to resolve feeds for. Defaults to 0n
 * (the protocol default feeds).
 */
export async function probeFeedReachability(
  client: PublicClient,
  {
    chainId,
    pairs,
    projectId = 0n,
  }: {
    chainId: JBChainId;
    pairs: readonly JBFeedPair[];
    projectId?: bigint;
  },
): Promise<FeedReachability> {
  if (pairs.length === 0) return { status: "ok" };

  let prices;
  try {
    prices = v6Address("JBPrices", chainId);
  } catch {
    return { status: "unavailable" };
  }

  let unverified = false;
  const missing: JBFeedPair[] = [];
  await Promise.all(
    pairs.map(async (pair) => {
      try {
        await client.readContract({
          address: prices,
          abi: jbPricesAbi,
          functionName: "pricePerUnitOf",
          args: [
            projectId,
            BigInt(pair.pricingCurrency),
            BigInt(pair.unitCurrency),
            BigInt(pair.decimals),
          ],
        });
      } catch (error) {
        if (isContractRevertError(error)) {
          missing.push(pair);
        } else {
          unverified = true;
        }
      }
    }),
  );

  if (missing.length > 0) return { status: "missing", missing };
  if (unverified) return { status: "unavailable" };
  return { status: "ok" };
}
