import {
  BaseError,
  ContractFunctionRevertedError,
  type Address,
  type PublicClient,
} from "viem";
import { NATIVE_TOKEN } from "../constants.js";
import type { JBChainId } from "../types.js";
import {
  buildPayTx,
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
export type BestUserPay = PreparedUserPay &
  PayRouteCandidate & {
    /**
     * The project tokens the beneficiary received when this exact payment was
     * run as a call from `simulateFrom`. Set only when every surviving
     * candidate could be run, so the choice was made on these figures.
     */
    simulatedTokenCount?: bigint;
  };

/** A candidate's run: the tokens delivered, a revert, or null when it could not be run. */
type Run = bigint | "reverted" | null;

/**
 * Run one prepared native-token payment as a call from `payer`, with its own
 * metadata and minimum, funded for the call only. A terminal's preview is an
 * estimate (a pool may not fill the order at the previewed price); the call
 * returns what the payment would deliver in this block.
 */
/**
 * Did the node run the call and have it revert? viem also words a node's own
 * failure (JSON-RPC -32603 "Internal error", no revert data) as a contract
 * revert and drops the node's error code, so a route is dropped only for
 * revert data or a message that says the execution reverted.
 */
export function isExecutionRevert(error: unknown): boolean {
  if (!(error instanceof BaseError)) return false;
  const revert = error.walk(
    (cause) => cause instanceof ContractFunctionRevertedError,
  ) as ContractFunctionRevertedError | null;
  if (!revert) return false;
  if (revert.raw !== undefined || revert.signature !== undefined) return true;
  return /revert/i.test(revert.reason ?? "");
}

async function runPay(
  client: PublicClient,
  args: {
    chainId: JBChainId;
    projectId: bigint;
    token: Address;
    amount: bigint;
    beneficiary: Address;
  },
  route: BestUserPay,
  payer: Address,
): Promise<Run> {
  try {
    const { result } = await client.simulateContract({
      ...buildPayTx({
        ...args,
        terminal: route.terminal,
        minReturnedTokens: route.minReturnedTokens,
        metadata: route.metadata,
      }),
      account: payer,
      // The payer may not hold the amount yet: the balance is lent to this call alone.
      stateOverride: [
        { address: payer, balance: args.amount * 2n + 10n ** 18n },
      ],
    });
    return typeof result === "bigint" ? result : null;
  } catch (error) {
    return isExecutionRevert(error) ? "reverted" : null;
  }
}

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
 *
 * With `simulateFrom` on a native-token payment, each prepared candidate is
 * also run as a call from that account. A candidate whose call reverts is
 * dropped while another is left; when every one reverts there is nothing better
 * to pick, the previews decide, and sending the payment reports the revert.
 * When every remaining candidate ran, the one
 * delivering the most tokens wins and carries `simulatedTokenCount`; when one
 * could not be run (an RPC without call overrides), the previews decide as
 * before. ERC-20 payments are not run: they need the payer's approval first.
 */
export async function prepareBestUserPay(
  client: PublicClient,
  {
    candidates,
    simulateFrom,
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
    simulateFrom?: Address;
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
  let routes = prepared.filter((route): route is BestUserPay => !!route);
  if (
    simulateFrom &&
    routes.length > 1 &&
    args.token.toLowerCase() === NATIVE_TOKEN.toLowerCase()
  ) {
    const runs = await Promise.all(
      routes.map((route) => runPay(client, args, route, simulateFrom)),
    );
    const count = new Map(routes.map((route, index) => [route, runs[index]]));
    const live = routes.filter((route) => count.get(route) !== "reverted");
    // A reverting route is dropped while another is left. Exact figures decide
    // only when every route left has one.
    if (live.length)
      routes = live.every((route) => typeof count.get(route) === "bigint")
        ? live.map((route) => ({
            ...route,
            simulatedTokenCount: count.get(route) as bigint,
          }))
        : live;
  }
  let best: BestUserPay | null = null;
  for (const route of routes) {
    if (!best) best = route;
    else if (
      route.simulatedTokenCount !== undefined &&
      best.simulatedTokenCount !== undefined &&
      route.simulatedTokenCount !== best.simulatedTokenCount
    ) {
      if (route.simulatedTokenCount > best.simulatedTokenCount) best = route;
    } else if (isBetter(route, best)) best = route;
  }
  if (!best && swapQuoteFailure) throw swapQuoteFailure;
  return best;
}
