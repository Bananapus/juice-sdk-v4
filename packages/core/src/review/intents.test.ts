import { describe, expect, it } from "vitest";
import {
  approvalIntent,
  borrowIntent,
  bridgeIntent,
  cashOutIntent,
  launchIntent,
  liquidityIntent,
  loanIntent,
  payIntent,
} from "./intents.js";
import { intent } from "./writeIntent.js";

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

  it("keys a launch config the same whatever integer type or hex case it holds", () => {
    const typed = {
      name: "Banny",
      reserved: 1000,
      owner: A.toUpperCase().replace("0X", "0x"),
      salt: "0xABCDEF",
      splits: [{ percent: 50, beneficiary: B }],
    };
    const key = launchIntent({ chainId: 1, account: A, config: typed });
    expect(
      launchIntent({
        chainId: 1,
        account: A,
        config: {
          name: "Banny",
          reserved: 1000n,
          owner: A,
          salt: "0xabcdef",
          splits: [
            { percent: 50n, beneficiary: B.toUpperCase().replace("0X", "0x") },
          ],
        },
      }),
    ).toBe(key);
    // Already tagged, left out, or null: the same canonical form.
    expect(
      launchIntent({
        chainId: 1,
        account: A,
        config: { ...typed, owner: intent.address(A), memo: undefined },
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
    // Strings stay as typed.
    expect(
      launchIntent({
        chainId: 1,
        account: A,
        config: { ...typed, name: "banny" },
      }),
    ).not.toBe(key);
  });

  it("refuses an identity it can't key", () => {
    expect(() =>
      payIntent({ chainId: 1, project: 4n, beneficiary: "0x12" }),
    ).toThrow();
    expect(() => loanIntent({ chainId: 1.5, loanId: 7n })).toThrow();
  });
});
