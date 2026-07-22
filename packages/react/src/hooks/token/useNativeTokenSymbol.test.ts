import {
  DEFAULT_NATIVE_TOKEN_SYMBOL,
  JB_CHAINS,
} from "@bananapus/nana-sdk-core";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useNativeTokenSymbol } from "./useNativeTokenSymbol";

const mocks = vi.hoisted(() => ({ chainId: undefined as number | undefined }));

vi.mock("../../contexts/JBChainContext/JBChainContext", () => ({
  useJBChainId: () => mocks.chainId,
}));

describe("useNativeTokenSymbol", () => {
  beforeEach(() => {
    mocks.chainId = undefined;
  });

  test("fails closed to the default symbol without a chain", () => {
    expect(useNativeTokenSymbol()).toBe(DEFAULT_NATIVE_TOKEN_SYMBOL);
  });

  test("uses an explicit chain before context and falls back for unknown chains", () => {
    const supported = Object.entries(JB_CHAINS).find(
      ([, chain]) => chain.nativeTokenSymbol,
    );
    expect(supported).toBeDefined();
    const [chainId, chain] = supported!;

    mocks.chainId = 999_999;
    expect(useNativeTokenSymbol(Number(chainId) as never)).toBe(
      chain.nativeTokenSymbol,
    );
    expect(useNativeTokenSymbol()).toBe(DEFAULT_NATIVE_TOKEN_SYMBOL);
  });
});
