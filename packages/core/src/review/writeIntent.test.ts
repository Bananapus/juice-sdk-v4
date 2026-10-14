import { describe, expect, it } from "vitest";
import { intent, writeIntentKey } from "./writeIntent.js";
import { createBrowserWriteRecovery } from "./writeRecovery.js";

const TOKEN = "0x1111111111111111111111111111111111111111";
const NAMESPACE = /^[a-z0-9][a-z0-9:._/-]{0,127}$/;

describe("writeIntentKey", () => {
  it("keeps plain strings case-sensitive: memos ABC and abc are different intents", () => {
    expect(writeIntentKey("pay", { memo: "ABC" })).not.toBe(
      writeIntentKey("pay", { memo: "abc" }),
    );
    expect(writeIntentKey("pay", { memo: "ABC" })).toBe(
      writeIntentKey("pay", { memo: "ABC" }),
    );
  });

  it("normalizes tagged addresses and hex only", () => {
    expect(
      writeIntentKey("pay", {
        token: intent.address(TOKEN.toUpperCase().replace("0X", "0x")),
      }),
    ).toBe(writeIntentKey("pay", { token: intent.address(TOKEN) }));
    expect(writeIntentKey("pay", { data: intent.hex("0xABCD") })).toBe(
      writeIntentKey("pay", { data: intent.hex("0xabcd") }),
    );
    // A tagged address is not the same as its plain string.
    expect(writeIntentKey("pay", { token: intent.address(TOKEN) })).not.toBe(
      writeIntentKey("pay", { token: TOKEN }),
    );
    expect(() => intent.address("0x12")).toThrow("address");
    expect(() => intent.hex("0xzz")).toThrow("hex");
  });

  it("encodes canonically: sorted keys, decimal integers, nested values", () => {
    expect(writeIntentKey("pay", { a: 1, b: 2n })).toBe(
      writeIntentKey("pay", { b: 2n, a: 1 }),
    );
    const nested = {
      ids: [1n, 2n],
      split: { beneficiary: intent.address(TOKEN), percent: 5 },
      on: true,
      none: null,
      skipped: undefined,
    };
    expect(writeIntentKey("pay", nested)).toBe(
      writeIntentKey("pay", {
        none: null,
        on: true,
        split: { percent: 5, beneficiary: intent.address(TOKEN) },
        ids: [1n, 2n],
      }),
    );
    // Order in an array matters; booleans, null and strings never alias.
    for (const [x, y] of [
      [{ ids: [1, 2] }, { ids: [2, 1] }],
      [{ v: true }, { v: "true" }],
      [{ v: null }, { v: "null" }],
      [{ v: 1 }, { v: "1" }],
      [{ v: [] }, { v: {} }],
      [{ v: false }, { v: true }],
    ] as const)
      expect(writeIntentKey("pay", x)).not.toBe(writeIntentKey("pay", y));
  });

  it("never aliases a number with a bigint, or a sparse array with an empty one", () => {
    expect(writeIntentKey("pay", { v: 1 })).not.toBe(
      writeIntentKey("pay", { v: 1n }),
    );
    // eslint-disable-next-line no-sparse-arrays
    expect(() => writeIntentKey("pay", { v: new Array(1) as never })).toThrow(
      "sparse",
    );
  });

  it("refuses ambiguous values", () => {
    for (const value of [
      1.5,
      Number.NaN,
      Number.MAX_SAFE_INTEGER + 1,
      Infinity,
    ])
      expect(() => writeIntentKey("pay", { value })).toThrow("integer");
    expect(() => writeIntentKey("pay", { list: [undefined] as never })).toThrow(
      "value",
    );
    expect(() => writeIntentKey("pay", { fn: (() => 1) as never })).toThrow(
      "value",
    );
    expect(() => writeIntentKey("", {})).toThrow("action");
    expect(() => writeIntentKey("!!!", {})).toThrow("action");
  });

  it("is a hold namespace with a readable action prefix", () => {
    const key = writeIntentKey("Pay project", { projectId: 4n });
    expect(key).toMatch(/^intent:pay-project:[0-9a-f]{40}$/);
    expect(key).toMatch(NAMESPACE);
    const long = writeIntentKey("a".repeat(200), {});
    expect(long).toMatch(NAMESPACE);
    expect(long.length).toBeLessThanOrEqual(128);
    // The action is part of the intent, case included.
    expect(writeIntentKey("pay", {})).not.toBe(writeIntentKey("Pay", {}));
    expect(() =>
      createBrowserWriteRecovery(
        {
          chainId: 10,
          account: TOKEN,
          safe: false,
          namespace: key,
          call: { to: TOKEN, data: "0x" },
        },
        {
          storage: {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          },
        },
      ),
    ).not.toThrow();
  });
});
