import { zeroAddress } from "viem";
import { mainnet } from "viem/chains";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { NATIVE_TOKEN, USDC_ADDRESSES } from "../constants.js";
import {
  JBCoreContracts,
  StickyContracts,
  SUPPORTED_CHAINS,
} from "../contracts.js";
import { jbContractAddress } from "../generated/juicebox.js";
import type { JBChainId } from "../types.js";
import {
  getJBContractAddress,
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

  test("returns the generated deployment for the requested version and chain", () => {
    expect(getJBContractAddress(JBCoreContracts.JBController, 6, 1)).toBe(
      jbContractAddress["6"].JBController["1"],
    );
  });

  test.each([
    [
      StickyContracts.StickyDeployer,
      "0x78d3809db6221b41f72375eb7361b2a43d29b27a",
    ],
    [StickyContracts.StickyHook, "0x57bb7161afce10a12b1761483bfc61dfcb2c4df5"],
    [
      StickyContracts.StickyDistributor,
      "0x489d011dc34983eb2e219a5010806caa418cb46b",
    ],
    [
      StickyContracts.StickyRewardReceiverFactory,
      "0xe7ffa07476f2ca35cee3548538541b335ef3a2b7",
    ],
    [
      StickyContracts.StickyAutoStick,
      "0x866e6f89964afb151eb6f91fc7eb53483689e89c",
    ],
  ])("registers %s at %s on every supported chain", (contract, address) => {
    const chainIds = Object.keys(SUPPORTED_CHAINS);
    expect(Object.keys(jbContractAddress["6"][contract]).sort()).toEqual(
      chainIds.sort(),
    );
    for (const chainId of chainIds.map(Number) as JBChainId[]) {
      expect(getJBContractAddress(contract, 6, chainId)).toBe(
        address.toLowerCase(),
      );
    }
  });

  test("fails clearly when a generated deployment is missing", () => {
    expect(() =>
      getJBContractAddress(
        JBCoreContracts.JBController,
        6,
        99_999 as JBChainId,
      ),
    ).toThrowError(
      "No JBController deployment for Juicebox V6 on chain 99999.",
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
