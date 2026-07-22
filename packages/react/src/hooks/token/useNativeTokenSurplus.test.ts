import {
  ETH_CURRENCY_ID,
  NATIVE_TOKEN,
  NATIVE_TOKEN_DECIMALS,
  jbMultiTerminalAbi,
  jbMultiTerminalV5Abi,
} from "@bananapus/nana-sdk-core";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useNativeTokenSurplus } from "./useNativeTokenSurplus";

const mocks = vi.hoisted(() => ({
  chainId: 10 as number | undefined,
  contract: {
    projectId: 7n,
    version: 6,
    contracts: {
      primaryNativeTerminal: {
        data: "0x1111111111111111111111111111111111111111",
      },
    },
  },
  readContract: vi.fn(),
}));

vi.mock("wagmi", () => ({ useReadContract: mocks.readContract }));
vi.mock("../../contexts/JBChainContext/JBChainContext", () => ({
  useJBChainId: () => mocks.chainId,
}));
vi.mock("../../contexts/JBContractContext/JBContractContext", () => ({
  useJBContractContext: () => mocks.contract,
}));

describe("useNativeTokenSurplus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.chainId = 10;
    mocks.contract.version = 6;
    mocks.readContract
      .mockReturnValueOnce({ data: 600n, source: "v6" })
      .mockReturnValueOnce({ data: 500n, source: "legacy" });
  });

  test("selects the canonical V6 token-address overload", () => {
    expect(useNativeTokenSurplus()).toEqual({ data: 600n, source: "v6" });

    expect(mocks.readContract).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        chainId: 10,
        abi: jbMultiTerminalAbi,
        functionName: "currentSurplusOf",
        address: mocks.contract.contracts.primaryNativeTerminal.data,
        args: [
          7n,
          [NATIVE_TOKEN],
          BigInt(NATIVE_TOKEN_DECIMALS),
          BigInt(ETH_CURRENCY_ID),
        ],
        query: { enabled: true },
      }),
    );
    expect(mocks.readContract.mock.calls[1][0].query.enabled).toBe(false);
  });

  test("selects the legacy accounting-context overload on V5", () => {
    mocks.contract.version = 5;

    expect(useNativeTokenSurplus({ chainId: 1 })).toEqual({
      data: 500n,
      source: "legacy",
    });

    expect(mocks.readContract).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        chainId: 1,
        abi: jbMultiTerminalV5Abi,
        args: [
          7n,
          [
            {
              token: NATIVE_TOKEN,
              decimals: NATIVE_TOKEN_DECIMALS,
              currency: ETH_CURRENCY_ID,
            },
          ],
          BigInt(NATIVE_TOKEN_DECIMALS),
          BigInt(ETH_CURRENCY_ID),
        ],
        query: { enabled: true },
      }),
    );
    expect(mocks.readContract.mock.calls[0][0].query.enabled).toBe(false);
  });
});
