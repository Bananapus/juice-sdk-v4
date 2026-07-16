import { Address, ContractFunctionArgs, zeroAddress } from "viem";
import { SPLITS_TOTAL_PERCENT } from "../constants.js";
import { jbControllerAbi } from "../generated/juicebox.js";
import { JBChainId } from "../types.js";
import { v6Address } from "./types.js";

type SetSplitGroupsArgs = ContractFunctionArgs<
  typeof jbControllerAbi,
  "nonpayable",
  "setSplitGroupsOf"
>;

/**
 * A group of splits sharing a group id (e.g. a payout token's group, or the
 * reserved-token group). The group's split percents must total exactly
 * `SPLITS_TOTAL_PERCENT` (1e9) or `JBSplits` reverts.
 */
export type JBSplitGroup = SetSplitGroupsArgs[2][number];

/**
 * A single split within a `JBSplitGroup`. `percent` is out of
 * `SPLITS_TOTAL_PERCENT` (1e9).
 */
export type JBSplit = JBSplitGroup["splits"][number];

/**
 * The group id for a project's reserved-token splits.
 */
export const RESERVED_TOKEN_SPLIT_GROUP_ID = 1n;

/**
 * The group id for a project's payout splits of the given token:
 * `uint256(uint160(token))`.
 *
 * Use the project's ACCOUNTING token (e.g. USDC for a USDC-accounting
 * project), not the native-token sentinel, or payouts will be looked up
 * under the wrong group.
 */
export function payoutSplitGroupId(token: Address): bigint {
  return BigInt(token);
}

/**
 * Scale integer shares so the group totals EXACTLY `SPLITS_TOTAL_PERCENT`
 * (1e9), assigning the rounding remainder to the largest share (the first
 * one, on ties). Per-row rounding drifts, and `JBSplits` reverts unless the
 * group sums to exactly 1e9 — always run computed percents through this
 * before encoding.
 *
 * @param shares Non-negative integer shares, each already denominated out of
 * `SPLITS_TOTAL_PERCENT` (their sum should be ~1e9; only rounding drift is
 * corrected here).
 * @returns A new array summing to exactly `SPLITS_TOTAL_PERCENT`. An empty
 * input returns an empty array (an empty group is valid).
 * @throws If a share is negative or non-integer, or if the drift is larger
 * than the largest share (the input was not approximately normalized).
 */
export function fillSplitPercents(shares: number[]): number[] {
  if (shares.length === 0) return [];
  for (const share of shares) {
    if (!Number.isInteger(share) || share < 0) {
      throw new Error(
        `Split shares must be non-negative integers, got ${share}`,
      );
    }
  }
  const filled = [...shares];
  const sum = filled.reduce((total, share) => total + share, 0);
  const delta = SPLITS_TOTAL_PERCENT - sum;
  if (delta === 0) return filled;

  let largestIndex = 0;
  for (let i = 1; i < filled.length; i++) {
    if (filled[i] > filled[largestIndex]) largestIndex = i;
  }
  if (filled[largestIndex] + delta < 0) {
    throw new Error(
      `Split shares sum to ${sum}, which exceeds SPLITS_TOTAL_PERCENT (${SPLITS_TOTAL_PERCENT}) by more than the largest share`,
    );
  }
  filled[largestIndex] += delta;
  return filled;
}

/**
 * Build a `JBSplit` with safe defaults: pays a beneficiary wallet directly
 * (`projectId` 0, no hook, `preferAddToBalance` false, unlocked).
 *
 * @param args.beneficiary The address that receives the split.
 * @param args.percent The split's share, out of `SPLITS_TOTAL_PERCENT` (1e9).
 * Run computed groups through {@link fillSplitPercents} first.
 * @param args.projectId Route the split to a project instead of a wallet
 * (the beneficiary then receives that project's tokens). Defaults to 0n.
 * @param args.preferAddToBalance For project-routed splits, use
 * `addToBalanceOf` instead of `pay`. Defaults to false.
 * @param args.lockedUntil Timestamp until which the split cannot be changed.
 * Defaults to 0 (unlocked).
 * @param args.hook A split hook contract to receive the split. Defaults to
 * the zero address (no hook).
 */
export function buildSplit(args: {
  beneficiary: Address;
  percent: number;
  projectId?: bigint;
  preferAddToBalance?: boolean;
  lockedUntil?: number;
  hook?: Address;
}): JBSplit {
  return {
    percent: args.percent,
    projectId: args.projectId ?? 0n,
    beneficiary: args.beneficiary,
    preferAddToBalance: args.preferAddToBalance ?? false,
    lockedUntil: args.lockedUntil ?? 0,
    hook: args.hook ?? zeroAddress,
  };
}

/**
 * Build a `JBController.setSplitGroupsOf` transaction request setting a
 * project's split groups for a given ruleset.
 *
 * The caller must be the project's owner or have the `SET_SPLIT_GROUPS`
 * permission. Each group must total exactly `SPLITS_TOTAL_PERCENT`.
 *
 * @param args.rulesetId The id of the ruleset the split groups apply to.
 * @param args.splitGroups Use {@link RESERVED_TOKEN_SPLIT_GROUP_ID} for the
 * reserved-token group and {@link payoutSplitGroupId} for payout groups.
 */
export function buildSetSplitGroupsTx(args: {
  chainId: JBChainId;
  projectId: bigint;
  rulesetId: bigint;
  splitGroups: readonly JBSplitGroup[];
}) {
  return {
    chainId: args.chainId,
    address: v6Address("JBController", args.chainId),
    abi: jbControllerAbi,
    functionName: "setSplitGroupsOf" as const,
    args: [args.projectId, args.rulesetId, args.splitGroups] as const,
  };
}
