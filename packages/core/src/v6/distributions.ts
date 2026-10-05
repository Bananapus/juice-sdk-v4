import {
  decodeEventLog,
  getAddress,
  isAddress,
  isAddressEqual,
  zeroAddress,
  type Address,
} from "viem";
import { SPLITS_TOTAL_PERCENT } from "../pureConstants.js";
import { jbControllerAbi } from "../generated/abi/jbControllerAbi.js";
import { jbMultiTerminalAbi } from "../generated/abi/jbMultiTerminalAbi.js";
import { jbTokensAbi } from "../generated/abi/jbTokensAbi.js";
import { uint256 } from "../untrusted.js";
import { RESERVED_TOKEN_SPLIT_GROUP_ID, payoutSplitGroupId } from "./splits.js";

// A successful distribution receipt can still hide a failed recipient: the
// terminal and controller catch a reverting split, and a split hook can take
// less than it was offered. These verifiers prove from the receipt's events
// that every reviewed split received exactly its share.

/** A reviewed split, as the ruleset held it when the distribution was reviewed. */
export type ExpectedDistributionSplit = {
  percent: number | bigint | string;
  projectId: number | bigint | string;
  beneficiary: Address;
  preferAddToBalance: boolean;
  lockedUntil: number | bigint | string;
  hook: Address;
  /**
   * Payouts only: true when the terminal pays this split without its fee, so
   * its net must equal its gross. Leave it unset when unknown.
   */
  feeless?: boolean;
};

/** What a reviewed `sendPayoutsOf` must have done. Numbers may be any uint256 form. */
export type ExpectedPayoutReceipt = {
  terminal: Address;
  projectId: number | bigint | string;
  rulesetId: number | bigint | string;
  cycleNumber: number | bigint | string;
  token: Address;
  /** The project owner, who receives what the splits leave. */
  owner: Address;
  /** The account that sent the distribution. */
  caller: Address;
  /** The amount `sendPayoutsOf` was called with, in its currency. */
  amount: number | bigint | string;
  /** The least `amountPaidOut` the review allowed, in the token. */
  minimum: number | bigint | string;
  splits: readonly ExpectedDistributionSplit[];
};

/** What a reviewed `sendReservedTokensToSplitsOf` must have done. */
export type ExpectedReservedReceipt = {
  controller: Address;
  /** JBTokens, which logs the controller's burns. */
  tokens: Address;
  projectId: number | bigint | string;
  rulesetId: number | bigint | string;
  cycleNumber: number | bigint | string;
  /** The project owner, who receives what the splits leave. */
  owner: Address;
  caller: Address;
  /**
   * The pending reserved tokens the review saw, above 0: the reviewed minimum.
   * Reserved tokens accrue until the distribution runs, so the receipt may
   * distribute more.
   */
  tokenCount: number | bigint | string;
  splits: readonly ExpectedDistributionSplit[];
};

type Receipt = { status?: unknown; logs: readonly unknown[] };

type Split = {
  percent: bigint;
  projectId: bigint;
  beneficiary: Address;
  preferAddToBalance: boolean;
  lockedUntil: bigint;
  hook: Address;
  feeless?: boolean;
};

const BURN_BENEFICIARY: Address = "0x000000000000000000000000000000000000dEaD";

function invalid(name: string, value: unknown): Error {
  return new Error(
    `Invalid distribution expectation ${name}: ${String(value)}.`,
  );
}

function readUint(name: string, value: unknown): bigint {
  const parsed = uint256(value);
  if (parsed === null) throw invalid(name, value);
  return parsed;
}

function readAddress(name: string, value: unknown): Address {
  if (typeof value !== "string" || !isAddress(value))
    throw invalid(name, value);
  return getAddress(value);
}

function readSplits(splits: unknown): Split[] {
  if (!Array.isArray(splits)) throw invalid("splits", splits);
  let total = 0n;
  return splits.map((split, index) => {
    const name = `split ${index + 1}`;
    if (!split || typeof split !== "object") throw invalid(name, split);
    const value = split as ExpectedDistributionSplit;
    const percent = readUint(`${name} percent`, value.percent);
    total += percent;
    if (total > BigInt(SPLITS_TOTAL_PERCENT)) {
      throw invalid("split percents", `a total above ${SPLITS_TOTAL_PERCENT}`);
    }
    if (typeof value.preferAddToBalance !== "boolean") {
      throw invalid(`${name} preferAddToBalance`, value.preferAddToBalance);
    }
    if (value.feeless !== undefined && typeof value.feeless !== "boolean") {
      throw invalid(`${name} feeless`, value.feeless);
    }
    return {
      percent,
      projectId: readUint(`${name} projectId`, value.projectId),
      beneficiary: readAddress(`${name} beneficiary`, value.beneficiary),
      preferAddToBalance: value.preferAddToBalance,
      lockedUntil: readUint(`${name} lockedUntil`, value.lockedUntil),
      hook: readAddress(`${name} hook`, value.hook),
      feeless: value.feeless,
    };
  });
}

function sameSplit(
  actual: {
    percent: number;
    projectId: bigint;
    beneficiary: Address;
    preferAddToBalance: boolean;
    lockedUntil: number;
    hook: Address;
  },
  expected: Split,
): boolean {
  return (
    BigInt(actual.percent) === expected.percent &&
    actual.projectId === expected.projectId &&
    isAddressEqual(actual.beneficiary, expected.beneficiary) &&
    actual.preferAddToBalance === expected.preferAddToBalance &&
    BigInt(actual.lockedUntil) === expected.lockedUntil &&
    isAddressEqual(actual.hook, expected.hook)
  );
}

/**
 * The receipt's events from `emitter`, decoded with `abi`, the contract's full
 * ABI. A log of `emitter` that does not decode is refused, not skipped: a
 * skipped PayoutTransferReverted, for one, would let a failed transfer pass.
 */
function eventsFrom<const abi extends readonly unknown[]>(
  receipt: Receipt,
  emitter: Address,
  abi: abi,
) {
  if (receipt?.status !== undefined && receipt.status !== "success") {
    throw new Error("The distribution transaction did not succeed.");
  }
  if (!Array.isArray(receipt?.logs)) {
    throw new Error("The distribution receipt has no logs.");
  }
  return receipt.logs.flatMap((log) => {
    const { address, data, topics } = (log ?? {}) as {
      address?: unknown;
      data?: unknown;
      topics?: unknown;
    };
    if (
      typeof address !== "string" ||
      address.toLowerCase() !== emitter.toLowerCase()
    ) {
      return [];
    }
    try {
      return [
        decodeEventLog({
          abi: abi as never,
          data: data as never,
          topics: topics as never,
          strict: true,
        }) as unknown as { eventName: string; args: Record<string, unknown> },
      ];
    } catch {
      throw new Error(
        `The distribution receipt has a log from ${emitter} that its ABI cannot read, so the receipt proves nothing.`,
      );
    }
  });
}

/** The fee the terminal takes from a gross amount: 2.5%, rounded down. */
function feeOf(amount: bigint): bigint {
  return amount / 40n;
}

function format(amount: bigint): string {
  return amount.toLocaleString("en-US");
}

/**
 * Prove that a `sendPayoutsOf` receipt paid every reviewed split in full.
 *
 * The terminal must log, for the project, no `PayoutReverted` or
 * `PayoutTransferReverted`; exactly one `SendPayouts` from the reviewed
 * caller, in the reviewed ruleset and cycle, to the reviewed owner, for the
 * reviewed amount, paying out at least the reviewed minimum with a fee within
 * 2.5%; and one `SendPayoutToSplit` per reviewed split, in order, naming that
 * exact split. Each split's gross is the terminal's successive remainder
 * (`remaining × percent / remaining percent`). Its net must be the gross, or
 * the gross less its 2.5% fee, and the gross alone for a split marked
 * feeless: anything else is a hook that took only part of its share. The
 * owner's net leftover follows the same rule.
 *
 * Throws, naming the first event that differs. A refusal means the receipt
 * cannot show the payouts completed: keep the transaction, and do not send
 * the same payouts again.
 */
export function verifyPayoutReceipt(
  receipt: Receipt,
  expected: ExpectedPayoutReceipt,
): void {
  const terminal = readAddress("terminal", expected?.terminal);
  const projectId = readUint("projectId", expected.projectId);
  const rulesetId = readUint("rulesetId", expected.rulesetId);
  const cycleNumber = readUint("cycleNumber", expected.cycleNumber);
  const group = payoutSplitGroupId(readAddress("token", expected.token));
  const owner = readAddress("owner", expected.owner);
  const caller = readAddress("caller", expected.caller);
  const amount = readUint("amount", expected.amount);
  const minimum = readUint("minimum", expected.minimum);
  const splits = readSplits(expected.splits);
  const subject = `Project ${projectId}'s payouts from ${terminal}`;
  const refuse = (problem: string) =>
    new Error(
      `${subject}: ${problem}. Keep this transaction, and do not send these payouts again.`,
    );

  const events = eventsFrom(receipt, terminal, jbMultiTerminalAbi).filter(
    (event) => event.args.projectId === projectId,
  );
  const failure = events.find(
    (event) =>
      event.eventName === "PayoutReverted" ||
      event.eventName === "PayoutTransferReverted",
  );
  if (failure) throw refuse(`a recipient failed (${failure.eventName})`);
  const payouts = events.filter((event) => event.eventName === "SendPayouts");
  if (payouts.length !== 1) {
    throw refuse(`the receipt has ${payouts.length} SendPayouts events, not 1`);
  }
  const payout = payouts[0].args as {
    rulesetId: bigint;
    rulesetCycleNumber: bigint;
    projectOwner: Address;
    amount: bigint;
    amountPaidOut: bigint;
    fee: bigint;
    netLeftoverPayoutAmount: bigint;
    caller: Address;
  };
  if (!isAddressEqual(payout.caller, caller)) {
    throw refuse(`they were sent by ${payout.caller}, not ${caller}`);
  }
  if (
    payout.rulesetId !== rulesetId ||
    payout.rulesetCycleNumber !== cycleNumber
  ) {
    throw refuse(
      `they ran in ruleset ${payout.rulesetId} cycle ${payout.rulesetCycleNumber}, not ruleset ${rulesetId} cycle ${cycleNumber}`,
    );
  }
  if (!isAddressEqual(payout.projectOwner, owner)) {
    throw refuse(`the owner was ${payout.projectOwner}, not ${owner}`);
  }
  if (payout.amount !== amount) {
    throw refuse(
      `they were for ${format(payout.amount)}, not ${format(amount)}`,
    );
  }
  if (payout.amountPaidOut <= 0n || payout.amountPaidOut < minimum) {
    throw refuse(
      `they paid out ${format(payout.amountPaidOut)}, below the reviewed ${format(minimum)}`,
    );
  }
  if (payout.fee > feeOf(payout.amountPaidOut)) {
    throw refuse(
      `the fee ${format(payout.fee)} exceeds 2.5% of ${format(payout.amountPaidOut)}`,
    );
  }

  const paid = events.filter(
    (event) => event.eventName === "SendPayoutToSplit",
  );
  if (paid.length !== splits.length) {
    throw refuse(
      `the receipt pays ${paid.length} splits, not the reviewed ${splits.length}`,
    );
  }
  let remainingAmount = payout.amountPaidOut;
  let remainingPercent = BigInt(SPLITS_TOTAL_PERCENT);
  for (const [index, split] of splits.entries()) {
    const event = paid[index].args as {
      rulesetId: bigint;
      group: bigint;
      split: Parameters<typeof sameSplit>[0];
      amount: bigint;
      netAmount: bigint;
      caller: Address;
    };
    const gross = (remainingAmount * split.percent) / remainingPercent;
    const name = `split ${index + 1} (${split.beneficiary})`;
    if (
      !isAddressEqual(event.caller, caller) ||
      event.rulesetId !== rulesetId ||
      event.group !== group ||
      !sameSplit(event.split, split)
    ) {
      throw refuse(`${name} is not the reviewed split`);
    }
    if (event.amount !== gross) {
      throw refuse(
        `${name} was allotted ${format(event.amount)}, not ${format(gross)}`,
      );
    }
    const allowed =
      split.feeless === true ? [gross] : [gross, gross - feeOf(gross)];
    if (!allowed.includes(event.netAmount)) {
      throw refuse(
        `${name} received ${format(event.netAmount)} of its ${format(gross)}`,
      );
    }
    remainingAmount -= gross;
    remainingPercent -= split.percent;
  }
  if (
    payout.netLeftoverPayoutAmount !== remainingAmount &&
    payout.netLeftoverPayoutAmount !== remainingAmount - feeOf(remainingAmount)
  ) {
    throw refuse(
      `the owner received ${format(payout.netLeftoverPayoutAmount)} of the ${format(remainingAmount)} left`,
    );
  }
}

/**
 * Prove that a `sendReservedTokensToSplitsOf` receipt sent every reviewed
 * split its reserved tokens.
 *
 * The controller must log, for the project, no `ReservedDistributionReverted`
 * or `SplitHookReverted`; exactly one `SendReservedTokensToSplits` from the
 * reviewed caller, in the reviewed ruleset and cycle, to the reviewed owner,
 * for at least the reviewed token count, leaving what the splits do not take;
 * and one `SendReservedTokensToSplit` per reviewed split, in order, naming that
 * exact split with its share of the count distributed,
 * `tokenCount × percent / 100%`. JBTokens must log burns from the controller of
 * exactly the shares sent to 0x…dEaD: any other burn is tokens a hook did not
 * take.
 *
 * Returns the token count the receipt distributed. Throws, naming the first
 * event that differs. A refusal means the receipt cannot show the distribution
 * completed: keep the transaction, and do not distribute the same reserved
 * tokens again.
 */
export function verifyReservedDistributionReceipt(
  receipt: Receipt,
  expected: ExpectedReservedReceipt,
): { tokenCount: bigint } {
  const controller = readAddress("controller", expected?.controller);
  const tokens = readAddress("tokens", expected.tokens);
  const projectId = readUint("projectId", expected.projectId);
  const rulesetId = readUint("rulesetId", expected.rulesetId);
  const cycleNumber = readUint("cycleNumber", expected.cycleNumber);
  const owner = readAddress("owner", expected.owner);
  const caller = readAddress("caller", expected.caller);
  const reviewed = readUint("tokenCount", expected.tokenCount);
  // No honest review has 0: the controller reverts at 0 pending reserves
  // (JBController_NoReservedTokens). A failed pending read defaulted to 0
  // would otherwise make the minimum below accept any count.
  if (reviewed === 0n) throw invalid("tokenCount", expected.tokenCount);
  const splits = readSplits(expected.splits);
  const subject = `Project ${projectId}'s reserved tokens from ${controller}`;
  const refuse = (problem: string) =>
    new Error(
      `${subject}: ${problem}. Keep this transaction, and do not distribute these reserved tokens again.`,
    );

  const events = eventsFrom(receipt, controller, jbControllerAbi).filter(
    (event) => event.args.projectId === projectId,
  );
  const failure = events.find(
    (event) =>
      event.eventName === "ReservedDistributionReverted" ||
      event.eventName === "SplitHookReverted",
  );
  if (failure) throw refuse(`a recipient failed (${failure.eventName})`);
  const totals = events.filter(
    (event) => event.eventName === "SendReservedTokensToSplits",
  );
  if (totals.length !== 1) {
    throw refuse(
      `the receipt has ${totals.length} SendReservedTokensToSplits events, not 1`,
    );
  }
  const total = totals[0].args as {
    rulesetId: bigint;
    rulesetCycleNumber: bigint;
    owner: Address;
    tokenCount: bigint;
    leftoverAmount: bigint;
    caller: Address;
  };
  if (!isAddressEqual(total.caller, caller)) {
    throw refuse(`they were sent by ${total.caller}, not ${caller}`);
  }
  if (
    total.rulesetId !== rulesetId ||
    total.rulesetCycleNumber !== cycleNumber
  ) {
    throw refuse(
      `they ran in ruleset ${total.rulesetId} cycle ${total.rulesetCycleNumber}, not ruleset ${rulesetId} cycle ${cycleNumber}`,
    );
  }
  if (!isAddressEqual(total.owner, owner)) {
    throw refuse(`the owner was ${total.owner}, not ${owner}`);
  }
  // Reserved tokens accrue until the distribution runs, so a receipt may
  // distribute more than was reviewed (a Safe can execute days later).
  // jango, 2026-10-05: any amount at or above the reviewed count is fine.
  if (total.tokenCount < reviewed) {
    throw refuse(
      `${format(total.tokenCount)} tokens were distributed, fewer than the reviewed ${format(reviewed)}; another distribution ran first or the review was stale`,
    );
  }
  // The controller splits the count it distributed, so every share, the
  // leftover and the planned burns follow that count.
  const tokenCount = total.tokenCount;

  const sent = events.filter(
    (event) => event.eventName === "SendReservedTokensToSplit",
  );
  if (sent.length !== splits.length) {
    throw refuse(
      `the receipt sends to ${sent.length} splits, not the reviewed ${splits.length}`,
    );
  }
  let leftover = tokenCount;
  let burnShare = 0n;
  for (const [index, split] of splits.entries()) {
    const event = sent[index].args as {
      rulesetId: bigint;
      groupId: bigint;
      split: Parameters<typeof sameSplit>[0];
      tokenCount: bigint;
      caller: Address;
    };
    const share = (tokenCount * split.percent) / BigInt(SPLITS_TOTAL_PERCENT);
    const name = `split ${index + 1} (${split.beneficiary})`;
    if (
      !isAddressEqual(event.caller, caller) ||
      event.rulesetId !== rulesetId ||
      event.groupId !== RESERVED_TOKEN_SPLIT_GROUP_ID ||
      !sameSplit(event.split, split)
    ) {
      throw refuse(`${name} is not the reviewed split`);
    }
    if (event.tokenCount !== share) {
      throw refuse(
        `${name} was sent ${format(event.tokenCount)} tokens, not ${format(share)}`,
      );
    }
    leftover -= share;
    if (
      split.projectId === 0n &&
      isAddressEqual(split.hook, zeroAddress) &&
      isAddressEqual(split.beneficiary, BURN_BENEFICIARY)
    ) {
      burnShare += share;
    }
  }
  if (total.leftoverAmount !== leftover) {
    throw refuse(
      `${format(total.leftoverAmount)} tokens were left to the owner, not ${format(leftover)}`,
    );
  }
  const burned = eventsFrom(receipt, tokens, jbTokensAbi)
    .filter(
      (event) =>
        event.eventName === "Burn" &&
        event.args.projectId === projectId &&
        isAddressEqual(event.args.holder as Address, controller),
    )
    .reduce((sum, event) => sum + (event.args.count as bigint), 0n);
  if (burned !== burnShare) {
    throw refuse(
      `the controller burned ${format(burned)} tokens, not the ${format(burnShare)} sent to ${BURN_BENEFICIARY}; a hook did not take its share`,
    );
  }
  return { tokenCount };
}
