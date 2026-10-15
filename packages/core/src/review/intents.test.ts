import { describe, expect, it } from "vitest";
import {
  allowanceIntent,
  approvalIntent,
  borrowIntent,
  bridgeIntent,
  burnIntent,
  cashOutIntent,
  launchIntent,
  liquidityIntent,
  loanIntent,
  payIntent,
  redeemIntent,
  safeBatchIntent,
  syncIntent,
} from "./intents.js";
import { intent, type IntentValue } from "./writeIntent.js";

const A = "0x1111111111111111111111111111111111111111";
const B = "0x2222222222222222222222222222222222222222";
const C = "0x3333333333333333333333333333333333333333";

describe("shared write intents", () => {
  it("keys a payment by chain, project and beneficiary only, case-blind", () => {
    const key = payIntent({ chainId: 1, project: 4n, beneficiary: A });
    expect(key).toMatch(/^intent:pay:[0-9a-f]{40}$/);
    // The same identity in another case, from any checkout path.
    expect(
      payIntent({
        chainId: 1,
        project: 4n,
        beneficiary: A.toUpperCase().replace("0X", "0x"),
      }),
    ).toBe(key);
    for (const other of [
      payIntent({ chainId: 10, project: 4n, beneficiary: A }),
      payIntent({ chainId: 1, project: 5n, beneficiary: A }),
      payIntent({ chainId: 1, project: 4n, beneficiary: B }),
    ])
      expect(other).not.toBe(key);
  });

  it("ignores derived values a caller passes by mistake", () => {
    const loose = payIntent as unknown as (input: object) => string;
    const key = payIntent({ chainId: 1, project: 4n, beneficiary: A });
    expect(
      loose({
        chainId: 1,
        project: 4n,
        beneficiary: A,
        amount: 5n,
        memo: "hi",
        minReturned: 3n,
      }),
    ).toBe(key);
  });

  it("keys a cash-out by its project, holder and beneficiary, whatever the venue or amount", () => {
    const key = cashOutIntent({
      chainId: 1,
      project: 4n,
      holder: A,
      beneficiary: A,
    });
    expect(
      (cashOutIntent as unknown as (input: object) => string)({
        chainId: 1,
        project: 4n,
        holder: A,
        beneficiary: A,
        venue: "pool",
        amount: 9n,
      }),
    ).toBe(key);
    expect(
      cashOutIntent({ chainId: 1, project: 4n, holder: A, beneficiary: B }),
    ).not.toBe(key);
    expect(
      cashOutIntent({ chainId: 1, project: 4n, holder: B, beneficiary: A }),
    ).not.toBe(key);
  });

  it("keys loans by loan id, borrowing by project and holder", () => {
    expect(loanIntent({ chainId: 1, loanId: 7n })).toBe(
      loanIntent({ chainId: 1, loanId: 7n }),
    );
    expect(loanIntent({ chainId: 1, loanId: 7n })).not.toBe(
      loanIntent({ chainId: 1, loanId: 8n }),
    );
    const borrow = borrowIntent({ chainId: 1, project: 4n, holder: A });
    expect(borrowIntent({ chainId: 1, project: 4n, holder: B })).not.toBe(
      borrow,
    );
    expect(borrow).not.toBe(loanIntent({ chainId: 1, loanId: 4n }));
  });

  it("keys a bridge by its sucker, token and account, with no fee", () => {
    const key = bridgeIntent({ chainId: 1, sucker: A, token: B, account: C });
    expect(
      (bridgeIntent as unknown as (input: object) => string)({
        chainId: 1,
        sucker: A,
        token: B,
        account: C,
        fee: 10n,
      }),
    ).toBe(key);
    expect(
      bridgeIntent({ chainId: 1, sucker: A, token: C, account: C }),
    ).not.toBe(key);
  });

  it("keys an approval under its parent action, by step, token and spender", () => {
    const parent = payIntent({ chainId: 1, project: 4n, beneficiary: A });
    const key = approvalIntent(parent, {
      step: "permit2",
      token: B,
      spender: C,
    });
    expect(key).toMatch(/^intent:approval:/);
    expect(
      approvalIntent(parent, { step: "permit2", token: B, spender: C }),
    ).toBe(key);
    for (const other of [
      approvalIntent(parent, { step: "erc20", token: B, spender: C }),
      approvalIntent(parent, { step: "permit2", token: C, spender: C }),
      approvalIntent(parent, { step: "permit2", token: B, spender: A }),
      approvalIntent(payIntent({ chainId: 1, project: 5n, beneficiary: A }), {
        step: "permit2",
        token: B,
        spender: C,
      }),
    ])
      expect(other).not.toBe(key);
  });

  it("keys a launch by the user's frozen form input, and liquidity by pool and positions", () => {
    const config = {
      name: "Banny",
      reserved: 1000,
      splits: [{ to: A, percent: 50n }],
    };
    const key = launchIntent({ chainId: 1, account: A, config });
    expect(
      launchIntent({ chainId: 1, account: A, config: { ...config } }),
    ).toBe(key);
    expect(
      launchIntent({
        chainId: 1,
        account: A,
        config: { ...config, name: "banny" },
      }),
    ).not.toBe(key);
    const pool = `0x${"ab".repeat(32)}`;
    const lp = liquidityIntent({ chainId: 1, pool, positions: [1n, 2n] });
    expect(
      liquidityIntent({
        chainId: 1,
        pool: pool.toUpperCase().replace("0X", "0x"),
        positions: [1n, 2n],
      }),
    ).toBe(lp);
    // Positions are a set: order and repeats never change the key.
    expect(liquidityIntent({ chainId: 1, pool, positions: [2n, 1n] })).toBe(lp);
    expect(liquidityIntent({ chainId: 1, pool, positions: [2, 1n, 1n] })).toBe(
      lp,
    );
    expect(liquidityIntent({ chainId: 1, pool, positions: [1n] })).not.toBe(lp);
  });

  it("keys a launch config the same whatever integer type or tagged hex case it holds", () => {
    const upper = (value: string) => value.toUpperCase().replace("0X", "0x");
    const typed = {
      name: "Banny",
      reserved: 1000,
      owner: intent.address(upper(A)),
      salt: intent.hex("0xABCDEF"),
      splits: [{ percent: 50, beneficiary: intent.address(B) }],
    };
    const key = launchIntent({ chainId: 1, account: A, config: typed });
    expect(
      launchIntent({
        chainId: 1,
        account: A,
        config: {
          name: "Banny",
          reserved: 1000n,
          owner: intent.address(A),
          salt: intent.hex("0xabcdef"),
          splits: [{ percent: 50n, beneficiary: intent.address(upper(B)) }],
          memo: undefined,
        },
      }),
    ).toBe(key);
    expect(
      launchIntent({
        chainId: 1,
        account: A,
        config: { ...typed, owner: null },
      }),
    ).not.toBe(key);
    // A non-integer number is refused, as everywhere.
    expect(() =>
      launchIntent({
        chainId: 1,
        account: A,
        config: { ...typed, reserved: 0.5 },
      }),
    ).toThrow("safe integer");
  });

  it("never infers anything from a plain string's shape", () => {
    // Names that differ only by case are different names, hex-looking or not.
    const named = (name: string) =>
      launchIntent({ chainId: 1, account: A, config: { name } });
    expect(named("0xABCD")).not.toBe(named("0xabcd"));
    expect(named("Banny")).not.toBe(named("banny"));
    // A value that is both bytes and an address keys by the builder's
    // declared tag, whatever case it comes in.
    const lower = liquidityIntent({ chainId: 1, pool: A, positions: [1n] });
    expect(
      liquidityIntent({
        chainId: 1,
        pool: A.toUpperCase().replace("0X", "0x"),
        positions: [1n],
      }),
    ).toBe(lower);
    // In a config, the tag the app declares decides, the same way each time.
    const tagged = (value: IntentValue) =>
      launchIntent({ chainId: 1, account: A, config: { target: value } });
    expect(tagged(intent.hex(A))).toBe(
      tagged(intent.hex(A.toUpperCase().replace("0X", "0x"))),
    );
    expect(tagged(intent.address(A))).toBe(
      tagged(intent.address(A.toUpperCase().replace("0X", "0x"))),
    );
  });

  it("keys a shop redemption by its collection, token id set and holder", () => {
    const key = redeemIntent({
      chainId: 1,
      project: 4n,
      hook: A,
      tokenIds: [3n, 1n, 3n],
      holder: B,
    });
    expect(
      (redeemIntent as unknown as (input: object) => string)({
        chainId: 1,
        project: 4,
        hook: A.toUpperCase().replace("0X", "0x"),
        tokenIds: [1, 3],
        holder: B,
        terminal: C,
        minReclaimed: 9n,
      }),
    ).toBe(key);
    for (const other of [
      redeemIntent({
        chainId: 1,
        project: 4n,
        hook: A,
        tokenIds: [1n],
        holder: B,
      }),
      redeemIntent({
        chainId: 1,
        project: 4n,
        hook: C,
        tokenIds: [1n, 3n],
        holder: B,
      }),
      redeemIntent({
        chainId: 1,
        project: 4n,
        hook: A,
        tokenIds: [1n, 3n],
        holder: A,
      }),
    ])
      expect(other).not.toBe(key);
  });

  it("keys a surplus allowance payout by its line and beneficiary, with no amount", () => {
    const input = {
      chainId: 1,
      project: 4n,
      terminal: A,
      token: B,
      currency: 1n,
      beneficiary: C,
    };
    const key = allowanceIntent(input);
    expect(
      (allowanceIntent as unknown as (input: object) => string)({
        ...input,
        amount: 5n,
        minTokensPaidOut: 4n,
        memo: "x",
      }),
    ).toBe(key);
    for (const other of [
      allowanceIntent({ ...input, token: A }),
      allowanceIntent({ ...input, currency: 2n }),
      allowanceIntent({ ...input, beneficiary: A }),
    ])
      expect(other).not.toBe(key);
  });

  it("keys a burn by its project and holder, with no amount", () => {
    const key = burnIntent({ chainId: 1, project: 4n, holder: A });
    expect(
      (burnIntent as unknown as (input: object) => string)({
        chainId: 1,
        project: 4n,
        holder: A,
        amount: 7n,
      }),
    ).toBe(key);
    expect(burnIntent({ chainId: 1, project: 4n, holder: B })).not.toBe(key);
    expect(key).not.toBe(
      cashOutIntent({ chainId: 1, project: 4n, holder: A, beneficiary: A }),
    );
  });

  it("keys a Safe batch by its Safe and its exact calls, in order", () => {
    const calls = [
      { to: A, data: "0xabcd", value: 0n },
      { to: B, data: "0x01" },
    ];
    const key = safeBatchIntent({ chainId: 1, safe: C, calls });
    expect(
      safeBatchIntent({
        chainId: 1,
        safe: C.toUpperCase().replace("0X", "0x"),
        calls: [
          { to: A, data: "0xABCD", value: 0n },
          { to: B, data: "0x01", value: 0n },
        ],
      }),
    ).toBe(key);
    for (const other of [
      safeBatchIntent({ chainId: 1, safe: C, calls: [...calls].reverse() }),
      safeBatchIntent({
        chainId: 1,
        safe: C,
        calls: [{ ...calls[0], value: 1n }, calls[1]],
      }),
      safeBatchIntent({ chainId: 1, safe: A, calls }),
    ])
      expect(other).not.toBe(key);
  });

  it("keys a bridge sync by its sucker and account, with no fee", () => {
    const key = syncIntent({ chainId: 1, sucker: A, account: B });
    expect(
      (syncIntent as unknown as (input: object) => string)({
        chainId: 1,
        sucker: A,
        account: B,
        fee: 3n,
      }),
    ).toBe(key);
    expect(syncIntent({ chainId: 1, sucker: A, account: C })).not.toBe(key);
    expect(key).not.toBe(
      bridgeIntent({ chainId: 1, sucker: A, token: B, account: B }),
    );
  });

  it("refuses an identity it can't key", () => {
    expect(() =>
      payIntent({ chainId: 1, project: 4n, beneficiary: "0x12" }),
    ).toThrow();
    expect(() => loanIntent({ chainId: 1.5, loanId: 7n })).toThrow();
  });
});
