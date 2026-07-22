import {
  ETH_CURRENCY_ID,
  NATIVE_TOKEN_DECIMALS,
  applyJbDaoCashOutFee,
  jbTerminalStoreAbi,
  jbTerminalStoreV5Abi,
} from "@bananapus/nana-sdk-core";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useTokenCashOutQuoteEth } from "./useTokenCashOutQuoteEth";

const mocks = vi.hoisted(() => ({
  chainId: 10,
  contract: { projectId: 7n, version: 6 },
  readContract: vi.fn(),
  store: "0x1111111111111111111111111111111111111111",
}));

vi.mock("wagmi", () => ({ useReadContract: mocks.readContract }));
vi.mock("../../contexts/JBChainContext/JBChainContext", () => ({
  useJBChainId: () => mocks.chainId,
}));
vi.mock("../../contexts/JBContractContext/JBContractContext", () => ({
  useJBContractContext: () => mocks.contract,
}));
vi.mock("../../contexts/JBTerminalContext/JBTerminalContext", () => ({
  useJBTerminalContext: () => ({ store: { data: mocks.store } }),
}));

describe("useTokenCashOutQuoteEth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.chainId = 10;
    mocks.contract = { projectId: 7n, version: 6 };
    mocks.store = "0x1111111111111111111111111111111111111111";
    mocks.readContract.mockReturnValue({ data: 1n });
  });

  test("builds the canonical V6 reclaimable-surplus read", () => {
    useTokenCashOutQuoteEth(500n, {});

    expect(mocks.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        abi: jbTerminalStoreAbi,
        functionName: "currentReclaimableSurplusOf",
        chainId: 10,
        address: mocks.store,
        args: [
          7n,
          500n,
          [],
          [],
          BigInt(NATIVE_TOKEN_DECIMALS),
          BigInt(ETH_CURRENCY_ID),
        ],
      }),
    );

    const config = mocks.readContract.mock.calls[0][0];
    expect(config.query.select(10_000n)).toBe(applyJbDaoCashOutFee(10_000n));
  });

  test("uses the explicit chain, V5 tuple ABI, and disables incomplete reads", () => {
    mocks.contract = { projectId: 8n, version: 5 };

    useTokenCashOutQuoteEth(undefined, { chainId: 1 });

    expect(mocks.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        abi: jbTerminalStoreV5Abi,
        chainId: 1,
        args: undefined,
      }),
    );
  });
});
