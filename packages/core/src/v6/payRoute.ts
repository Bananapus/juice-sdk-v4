import type { Address, PublicClient } from "viem";
import type { JBChainId } from "../types.js";
import {
  PaySwapQuoteFailedError,
  prepareUserPay,
  type PreparedUserPay,
  type UserPayTiers,
} from "./pay.js";

/**
 * A terminal a payment can go to. `multi` is a JBMultiTerminal, called with
 * its own `pay`; `router` is a router registry, gateway or router terminal.
 */
export type PayRouteCandidate = { terminal: Address; type: "multi" | "router" };

/** The prepared payment of the winning candidate. */
export type BestUserPay = PreparedUserPay & PayRouteCandidate;

function isBetter(candidate: BestUserPay, current: BestUserPay): boolean {
  const ours = candidate.preview.beneficiaryTokenCount;
  const theirs = current.preview.beneficiaryTokenCount;
  if (ours !== theirs) return ours > theirs;
  // Equal previews can hide unequal fallbacks: the same market estimate over different
  // mint entitlements. The larger floor is the larger guaranteed delivery.
  if (candidate.minReturnedTokens !== current.minReturnedTokens)
    return candidate.minReturnedTokens > current.minReturnedTokens;
  const ourTotal = ours + candidate.preview.reservedTokenCount;
  const theirTotal = theirs + current.preview.reservedTokenCount;
  if (ourTotal !== theirTotal) return ourTotal > theirTotal;
  // A tie goes to the direct terminal over a router.
  return candidate.type === "multi" && current.type !== "multi";
}

/**
 * Prepare one payment on every candidate terminal with {@link prepareUserPay}
 * and keep the one that gives the beneficiary the most project tokens. A tie
 * goes to the larger guaranteed minimum, then the larger total issuance, then
 * the direct terminal.
 *
 * The caller names the candidates: only terminals the project's directory
 * actually lists, since a quote from an unlisted terminal is not a route. A
 * candidate whose preparation fails (no accounting context for the token, no
 * route) is skipped, so the result always carries a live quote. Returns null
 * when none survives, unless a swap quote failed, which is thrown so the payer
 * can retry it instead of reading "no route".
 *
 * Send the payment to the returned `terminal`, with the ABI its `type` names.
 */
export async function prepareBestUserPay(
  client: PublicClient,
  {
    candidates,
    ...args
  }: {
    chainId: JBChainId;
    projectId: bigint;
    token: Address;
    amount: bigint;
    beneficiary: Address;
    candidates: readonly PayRouteCandidate[];
    tiers?: UserPayTiers;
    slippageBps?: bigint;
    skipSplits?: boolean;
  },
): Promise<BestUserPay | null> {
  let swapQuoteFailure: PaySwapQuoteFailedError | undefined;
  const prepared = await Promise.all(
    candidates.map(async (candidate): Promise<BestUserPay | null> => {
      try {
        return {
          ...candidate,
          ...(await prepareUserPay(client, {
            ...args,
            terminal: candidate.terminal,
          })),
        };
      } catch (error) {
        if (error instanceof PaySwapQuoteFailedError) swapQuoteFailure = error;
        return null;
      }
    }),
  );
  let best: BestUserPay | null = null;
  for (const route of prepared) {
    if (route && (!best || isBetter(route, best))) best = route;
  }
  if (!best && swapQuoteFailure) throw swapQuoteFailure;
  return best;
}
