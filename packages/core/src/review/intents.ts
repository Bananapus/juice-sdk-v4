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

/**
 * The one canonical form of what a builder keys: a safe integer becomes a
 * bigint (1000 and 1000n are one value), an address or other 0x hex string
 * is tagged to compare case-blind, and every other string stays as typed.
 * Arrays and records are normalized throughout; anything else is left for
 * {@link writeIntentKey} to accept or refuse.
 */
function canonicalValue(value: IntentValue): IntentValue {
  if (typeof value === "number")
    return Number.isSafeInteger(value) ? BigInt(value) : value;
  if (typeof value === "string")
    return /^0x[0-9a-fA-F]*$/.test(value)
      ? value.length === 42
        ? intent.address(value)
        : intent.hex(value)
      : value;
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object" && !isTagged(value))
    return Object.fromEntries(
      Object.entries(value).map(([name, field]) => [
        name,
        field === undefined ? field : canonicalValue(field),
      ]),
    );
  return value;
}

/** An address or hex already tagged with {@link intent}. */
function isTagged(value: object): boolean {
  return Object.getOwnPropertySymbols(value).length > 0;
}

/** One id in its canonical form. */
const id = (value: Id) => canonicalValue(value) as bigint;

/**
 * A list of ids as a set: sorted ascending and without repeats, so every app
 * keys the same set the same way, whatever order it holds them in.
 */
function canonicalIds(ids: readonly Id[]): bigint[] {
  return [...new Set(ids.map(id))].sort(
    // Unique after the Set: never equal.
    (a, b) => (a < b ? -1 : 1),
  );
}

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
    project: id(project),
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
    project: id(project),
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
  return writeIntentKey("loan", { chainId, loanId: id(loanId) });
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
    project: id(project),
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
    config: canonicalValue(config),
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
  /** A set: order and repeats don't change the key. */
  positions: readonly Id[];
}): string {
  return writeIntentKey("liquidity", {
    chainId,
    pool: intent.hex(pool),
    positions: canonicalIds(positions),
  });
}
