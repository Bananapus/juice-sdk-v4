import { zeroAddress } from "viem";
import { mainnet } from "viem/chains";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { NATIVE_TOKEN, USDC_ADDRESSES } from "../constants.js";
import {
  getPrimaryNativeTerminal,
  getProjectTerminalStore,
} from "./contracts.js";

const mocks = vi.hoisted(() => ({
  primaryTerminalOf: vi.fn(),
}));

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    getContract: vi.fn(() => ({
      read: {
        primaryTerminalOf: mocks.primaryTerminalOf,
      },
    })),
  };
});

describe("contract helpers", () => {
  beforeEach(() => {
    mocks.primaryTerminalOf.mockReset();
  });

  test("returns the configured V6 terminal store", () => {
    expect(getProjectTerminalStore(mainnet.id, 6)).toMatch(
      /^0x[0-9a-f]{40}$/iu,
    );
  });

  test("returns the native primary terminal without a fallback read", async () => {
    const terminal = "0x0000000000000000000000000000000000000001";
    mocks.primaryTerminalOf.mockResolvedValueOnce(terminal);

    await expect(
      getPrimaryNativeTerminal(
        { getClient: vi.fn(() => ({})) } as never,
        mainnet.id,
        1n,
        6,
      ),
    ).resolves.toBe(terminal);
    expect(mocks.primaryTerminalOf).toHaveBeenCalledOnce();
    expect(mocks.primaryTerminalOf).toHaveBeenCalledWith([1n, NATIVE_TOKEN]);
  });

  test("falls back to the chain USDC terminal when native is unavailable", async () => {
    const terminal = "0x0000000000000000000000000000000000000002";
    mocks.primaryTerminalOf
      .mockResolvedValueOnce(zeroAddress)
      .mockResolvedValueOnce(terminal);

    await expect(
      getPrimaryNativeTerminal(
        { getClient: vi.fn(() => ({})) } as never,
        mainnet.id,
        2n,
        6,
      ),
    ).resolves.toBe(terminal);
    expect(mocks.primaryTerminalOf).toHaveBeenNthCalledWith(1, [
      2n,
      NATIVE_TOKEN,
    ]);
    expect(mocks.primaryTerminalOf).toHaveBeenNthCalledWith(2, [
      2n,
      USDC_ADDRESSES[mainnet.id],
    ]);
  });
});
