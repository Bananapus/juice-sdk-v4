import { Address, isAddressEqual } from "viem";
import { JBChainId } from "../types.js";
import { JBSplit } from "./splits.js";
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
