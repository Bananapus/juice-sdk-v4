import { formatUnits, NATIVE_TOKEN_DECIMALS } from "@bananapus/nana-sdk-core";
import { describe, expect, test, vi } from "vitest";
import { NativeTokenValue } from "./NativeTokenValue";

vi.mock("../hooks/token/useNativeTokenSymbol", () => ({
  useNativeTokenSymbol: () => "ETH",
}));

describe("NativeTokenValue", () => {
  test("formats native units with the requested precision and symbol", () => {
    const wei = 1_234_567_890_000_000_000n;
    const element = NativeTokenValue({ wei, decimals: 3 }) as unknown as {
      props: { children: unknown[] };
    };

    expect(element.props.children).toEqual([
      formatUnits(wei, NATIVE_TOKEN_DECIMALS, { fractionDigits: 3 }),
      " ",
      "ETH",
    ]);
  });

  test("uses four fraction digits by default", () => {
    const element = NativeTokenValue({
      wei: 1_000_000_000_000_000_000n,
    }) as unknown as {
      props: { children: unknown[] };
    };
    expect(element.props.children[0]).toBe("1");
  });
});
