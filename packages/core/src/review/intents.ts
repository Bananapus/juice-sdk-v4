/**
 * The write hold namespaces every web client uses for the same user action,
 * so a retry from any app, tab or deploy is held by the first attempt.
 *
 * The rule: identity plus explicit user choices; never derived, quoted,
 * routed or auto-filled values. Each builder reads only the fields it names,
 * so an amount, memo, quote, route, deadline or fee passed by mistake changes
 * nothing. The trade: a coarse key may make a second action of the same kind
 * wait on an unresolved first one (its explicit exit ends that), but it never
 * sends twice.
 */
import { type Address, type Hex } from "viem";
import { intent, writeIntentKey, type IntentValue } from "./writeIntent.js";

type Id = bigint | number;

/** Every payment to a project: checkout, pay and add to balance alike. No token, amount, memo or cart. */
export function payIntent({
  chainId,
  project,
  beneficiary,
}: {
  chainId: number;
  project: Id;
  beneficiary: Address | string;
}): string {
  return writeIntentKey("pay", {
    chainId,
    project: BigInt(project),
    beneficiary: intent.address(beneficiary),
  });
}

/** Every cash-out of a project's token, whatever the venue. No amount. */
export function cashOutIntent({
  chainId,
  project,
  holder,
  beneficiary,
}: {
  chainId: number;
  project: Id;
  holder: Address | string;
  beneficiary: Address | string;
}): string {
  return writeIntentKey("cash-out", {
    chainId,
    project: BigInt(project),
    holder: intent.address(holder),
    beneficiary: intent.address(beneficiary),
  });
}

/** Repaying or reallocating one loan. */
export function loanIntent({
  chainId,
  loanId,
}: {
  chainId: number;
  loanId: Id;
}): string {
  return writeIntentKey("loan", { chainId, loanId: BigInt(loanId) });
}

/** Borrowing against a project's token. No amount or collateral. */
export function borrowIntent({
  chainId,
  project,
  holder,
}: {
  chainId: number;
  project: Id;
  holder: Address | string;
}): string {
  return writeIntentKey("borrow", {
    chainId,
    project: BigInt(project),
    holder: intent.address(holder),
  });
}

/** Sending, preparing or syncing a bridge through one sucker. No amount or fee. */
export function bridgeIntent({
  chainId,
  sucker,
  token,
  account,
}: {
  chainId: number;
  sucker: Address | string;
  token: Address | string;
  account: Address | string;
}): string {
  return writeIntentKey("bridge", {
    chainId,
    sucker: intent.address(sucker),
    token: intent.address(token),
    account: intent.address(account),
  });
}

/** One approval step of a parent action (its intent key). No amount. */
export function approvalIntent(
  parent: string,
  {
    step,
    token,
    spender,
  }: { step: string; token: Address | string; spender: Address | string },
): string {
  return writeIntentKey("approval", {
    parent,
    step,
    token: intent.address(token),
    spender: intent.address(spender),
  });
}

/** Launching a project from the user's frozen form input. */
export function launchIntent({
  chainId,
  account,
  config,
}: {
  chainId: number;
  account: Address | string;
  /** What the user entered, frozen: tag addresses and hex with {@link intent}. */
  config: IntentValue;
}): string {
  return writeIntentKey("launch", {
    chainId,
    account: intent.address(account),
    config,
  });
}

/** Changing the user's liquidity positions in one pool. No amounts or prices. */
export function liquidityIntent({
  chainId,
  pool,
  positions,
}: {
  chainId: number;
  /** The pool's id or address. */
  pool: Hex | string;
  positions: readonly Id[];
}): string {
  return writeIntentKey("liquidity", {
    chainId,
    pool: intent.hex(pool),
    positions: positions.map((position) => BigInt(position)),
  });
}
