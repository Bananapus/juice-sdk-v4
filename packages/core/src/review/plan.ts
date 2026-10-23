import { bytesToHex, type Address, type Hex } from "viem";
import { ReviewLineError } from "./lineError.js";

/**
 * One call a plan's review showed, as it must go out: from `from`, or, with
 * "relayr", run by Relayr's own account.
 */
export type ReviewedPlanCall = Readonly<{
  chainId: number;
  from: Address | "relayr";
  to: Address;
  data: Hex;
  value: bigint;
  /** The exact gas limit reviewed, when the call fixes one; it must be sent as it is. */
  gas?: bigint;
}>;

/**
 * Calls the person reviewed once, for an app that sends them one by one
 * (`reviewPlan`). Each call is spent once, by the first send that matches it.
 */
export type ReviewedPlan = Readonly<{
  account: Address;
  calls: readonly ReviewedPlanCall[];
  /** When the review stops covering the plan's unsent calls (ms since epoch). */
  expiresAt: number;
}>;

/** How long a plan's review covers its calls after confirm. */
export const REVIEWED_PLAN_TTL_MS = 15 * 60_000;
export const REVIEWED_PLAN_REFUSED_LINE =
  "This is not what you reviewed. Nothing was sent; review it again.";
export const REVIEWED_PLAN_EXPIRED_LINE =
  "Your review of these transactions expired. Nothing was sent; review them again.";

/**
 * A fresh address to simulate a call Relayr's own account runs: that
 * account is not known before Relayr quotes. It holds no ETH, so such a
 * call carries none.
 */
export function relayrStandInSender(): Address {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(20)));
}

/** A Relayr round's fee bound, as the plan's review showed it. */
export type PlannedRelayrFee = { chainId: number; cap: bigint };

/** Each plan core minted: which calls are spent, each call's Relayr round, and each round's fee bound. */
const minted = /* @__PURE__ */ new WeakMap<
  ReviewedPlan,
  {
    used: boolean[];
    rounds: readonly (string | undefined)[];
    fees: Map<string, PlannedRelayrFee & { used: boolean }>;
  }
>();

/** A plan over `calls`, confirmed by `account` now, with each Relayr round's reviewed fee bound. */
export function mintPlan(
  account: Address,
  calls: readonly (ReviewedPlanCall & { relayrRound?: string })[],
  fees: ReadonlyMap<string, PlannedRelayrFee> = new Map(),
): ReviewedPlan {
  const plan: ReviewedPlan = Object.freeze({
    account,
    calls: Object.freeze(
      calls.map(({ chainId, from, to, data, value, gas }) =>
        Object.freeze({
          chainId,
          from,
          to,
          data,
          value,
          ...(gas === undefined ? {} : { gas }),
        }),
      ),
    ),
    expiresAt: Date.now() + REVIEWED_PLAN_TTL_MS,
  });
  minted.set(plan, {
    used: calls.map(() => false),
    rounds: calls.map(({ relayrRound }) => relayrRound),
    fees: new Map(
      [...fees].map(([round, fee]) => [round, { ...fee, used: false }]),
    ),
  });
  return plan;
}

const keyOf = ({ chainId, from, to, data, value, gas }: ReviewedPlanCall) =>
  `${chainId}:${from.toLowerCase()}:${to.toLowerCase()}:${data.toLowerCase()}:${value}:${gas ?? ""}`;

/**
 * The unspent plan call matching each of `calls`, or null for one with none.
 */
function match(
  plan: ReviewedPlan,
  used: readonly boolean[],
  calls: readonly ReviewedPlanCall[],
): number[] | null {
  const taken = [...used];
  const at: number[] = [];
  for (const call of calls) {
    const key = keyOf(call);
    const index = plan.calls.findIndex(
      (planned, index) => !taken[index] && keyOf(planned) === key,
    );
    if (index < 0) return null;
    taken[index] = true;
    at.push(index);
  }
  return at;
}

/** The unused fee bound of the Relayr round every one of `calls` belongs to, if any; nothing is spent. */
export function plannedRelayrFee(
  plan: ReviewedPlan,
  calls: readonly ReviewedPlanCall[],
): PlannedRelayrFee | undefined {
  const state = minted.get(plan);
  const at = state && match(plan, state.used, calls);
  const round = at?.length ? state!.rounds[at[0]] : undefined;
  const fee = round === undefined ? undefined : state!.fees.get(round);
  return fee &&
    !fee.used &&
    at!.every((index) => state!.rounds[index] === round)
    ? { chainId: fee.chainId, cap: fee.cap }
    : undefined;
}

/**
 * Spends one unspent call of `plan` for each of `calls`, all or none. Refuses
 * a plan core did not mint, another account's, an expired one, and any call
 * that is not exactly an unspent plan call. Returns the fee bound reviewed for
 * paying on `feeChainId`, spent with them, when every call is of one Relayr
 * round whose bound is unused; else 0.
 */
export function spendPlan(
  plan: ReviewedPlan,
  account: Address,
  calls: readonly ReviewedPlanCall[],
  feeChainId?: number,
): bigint {
  const state = minted.get(plan);
  if (
    !state ||
    !calls.length ||
    plan.account.toLowerCase() !== account.toLowerCase()
  )
    throw new ReviewLineError(REVIEWED_PLAN_REFUSED_LINE);
  if (Date.now() > plan.expiresAt)
    throw new ReviewLineError(REVIEWED_PLAN_EXPIRED_LINE);
  const fee = plannedRelayrFee(plan, calls);
  const at = match(plan, state.used, calls);
  if (!at) throw new ReviewLineError(REVIEWED_PLAN_REFUSED_LINE);
  for (const index of at) state.used[index] = true;
  if (!fee || fee.chainId !== feeChainId) return 0n;
  state.fees.get(state.rounds[at[0]]!)!.used = true;
  return fee.cap;
}
