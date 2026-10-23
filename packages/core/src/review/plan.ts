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
 * account is not known before Relayr quotes.
 */
// ponytail: an empty sender, so a call that moves value simulates as failing; read Relayr's executor when one needs value.
export function relayrStandInSender(): Address {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(20)));
}

/** Each plan core minted, and which of its calls are spent. */
const spent = /* @__PURE__ */ new WeakMap<ReviewedPlan, boolean[]>();

/** A plan over `calls`, confirmed by `account` now. */
export function mintPlan(
  account: Address,
  calls: readonly ReviewedPlanCall[],
): ReviewedPlan {
  const plan: ReviewedPlan = Object.freeze({
    account,
    calls: Object.freeze(
      calls.map(({ chainId, from, to, data, value }) =>
        Object.freeze({ chainId, from, to, data, value }),
      ),
    ),
    expiresAt: Date.now() + REVIEWED_PLAN_TTL_MS,
  });
  spent.set(
    plan,
    calls.map(() => false),
  );
  return plan;
}

const keyOf = ({ chainId, from, to, data, value }: ReviewedPlanCall) =>
  `${chainId}:${from.toLowerCase()}:${to.toLowerCase()}:${data.toLowerCase()}:${value}`;

/**
 * Spends one unspent call of `plan` for each of `calls`, all or none. Refuses
 * a plan core did not mint, another account's, an expired one, and any call
 * that is not exactly an unspent plan call.
 */
export function spendPlan(
  plan: ReviewedPlan,
  account: Address,
  calls: readonly ReviewedPlanCall[],
): void {
  const used = spent.get(plan);
  if (
    !used ||
    !calls.length ||
    plan.account.toLowerCase() !== account.toLowerCase()
  )
    throw new ReviewLineError(REVIEWED_PLAN_REFUSED_LINE);
  if (Date.now() > plan.expiresAt)
    throw new ReviewLineError(REVIEWED_PLAN_EXPIRED_LINE);
  const taken = [...used];
  for (const call of calls) {
    const key = keyOf(call);
    const at = plan.calls.findIndex(
      (planned, index) => !taken[index] && keyOf(planned) === key,
    );
    if (at < 0) throw new ReviewLineError(REVIEWED_PLAN_REFUSED_LINE);
    taken[at] = true;
  }
  spent.set(plan, taken);
}
