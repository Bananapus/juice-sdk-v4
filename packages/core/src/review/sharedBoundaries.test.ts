import { parseAbi, type Address, type PublicClient } from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";
import { submitReviewedContractWrite } from "./contractWrite.js";
import { gasWithinCap } from "./gas.js";
import {
  buildTransactionDebugPrompt,
  buildTransactionReviewPrompt,
  registerFundingChainSelectionHandler,
  registerTransactionReviewHandler,
  requireContractTransactionReview,
  requireFundingChainSelection,
  requireTransactionReview,
  requestContractTransactionReview,
  transactionReviewJson,
} from "./transactionReview.js";

const TARGET = "0x3333333333333333333333333333333333333333" as Address;
const ALICE = "0x1111111111111111111111111111111111111111" as Address;
const abi = parseAbi(["function pay(uint256 projectId, uint256 amount)"]);

afterEach(() => vi.unstubAllGlobals());

describe("funding chain selection", () => {
  const options = [
    { chainId: 10, label: "OP Mainnet, 0.001 ETH" },
    { chainId: 8453, label: "Base, 0.002 ETH" },
  ];

  it("refuses empty, duplicate or unlabeled choices", async () => {
    await expect(requireFundingChainSelection([])).rejects.toThrow(
      "No valid funding chain",
    );
    await expect(
      requireFundingChainSelection([options[0], options[0]]),
    ).rejects.toThrow("No valid funding chain");
    await expect(
      requireFundingChainSelection([{ chainId: 10, label: " " }]),
    ).rejects.toThrow("No valid funding chain");
    await expect(
      requireFundingChainSelection([{ chainId: 0, label: "Zero" }]),
    ).rejects.toThrow("No valid funding chain");
  });

  it("requires a mounted chooser and an explicit choice among the quoted chains", async () => {
    await expect(requireFundingChainSelection(options)).rejects.toThrow(
      "selection is unavailable",
    );
    const choose =
      vi.fn<
        (choices: readonly { chainId: number }[]) => Promise<number | null>
      >();
    const unregister = registerFundingChainSelectionHandler(choose);
    choose.mockResolvedValueOnce(null);
    await expect(requireFundingChainSelection(options)).rejects.toThrow(
      "cancelled",
    );
    choose.mockResolvedValueOnce(1);
    await expect(requireFundingChainSelection(options)).rejects.toThrow(
      "not available in this quote",
    );
    choose.mockResolvedValueOnce(8453);
    await expect(requireFundingChainSelection(options)).resolves.toBe(8453);
    expect(choose.mock.calls[0][0]).toEqual(options);
    unregister();
    unregister();
    await expect(requireFundingChainSelection(options)).rejects.toThrow(
      "selection is unavailable",
    );
  });
});

describe("contract call review", () => {
  it("approves the exact encoded call, refuses one changed after review, and cancels on a closed review", async () => {
    const call = {
      chainId: 10,
      address: TARGET,
      abi,
      functionName: "pay",
      args: [7n, 1n] as const,
      account: ALICE,
    };
    const review = vi.fn<
      Parameters<typeof registerTransactionReviewHandler>[0]
    >(async () => true);
    const unregister = registerTransactionReviewHandler(review);
    try {
      await expect(
        requestContractTransactionReview(call, {
          label: "Pay",
          contractName: "Terminal",
        }),
      ).resolves.toBe(true);
      expect(review.mock.calls[0][0].calls[0]).toMatchObject({
        to: TARGET,
        label: "Pay",
        contractName: "Terminal",
        from: ALICE,
      });

      const mutable = { ...call, args: [7n, 1n] as readonly [bigint, bigint] };
      review.mockImplementationOnce(async () => {
        mutable.args = [7n, 2n];
        return true;
      });
      await expect(requestContractTransactionReview(mutable)).rejects.toThrow(
        "changed after review",
      );

      review.mockResolvedValueOnce(false);
      await expect(requestContractTransactionReview(call)).resolves.toBe(false);
      review.mockResolvedValueOnce(false);
      await expect(requireContractTransactionReview(call)).rejects.toThrow(
        "Review closed",
      );
      await expect(
        requireContractTransactionReview(call),
      ).resolves.toBeUndefined();
    } finally {
      unregister();
    }
  });
});

describe("raw review", () => {
  it("cancels when the reviewer closes it and serializes an authorization on its own", async () => {
    const unregister = registerTransactionReviewHandler(async () => false);
    try {
      await expect(
        requireTransactionReview({
          calls: [{ chainId: 10, to: TARGET, data: "0x" }],
        }),
      ).rejects.toThrow("Review closed");
    } finally {
      unregister();
    }
    expect(
      JSON.parse(
        transactionReviewJson({
          calls: [],
          authorization: { kind: "message", nonce: 1n },
        }),
      ),
    ).toEqual({ authorization: { kind: "message", nonce: "1" } });
  });
});

describe("review prompts", () => {
  const display = {
    chainName: (chainId: number) =>
      chainId === 10 ? "OP Mainnet" : `Chain ${chainId}`,
    explorerOrigin: (chainId: number) =>
      chainId === 10 ? "https://optimistic.etherscan.io" : null,
  };
  const request = {
    calls: [
      { chainId: 10, to: TARGET, data: "0x" as const },
      { chainId: 999, to: TARGET, data: "0x" as const, value: 5n },
    ],
  };

  it("names chains and explorers with the app's display", () => {
    const standard = buildTransactionReviewPrompt(request, display);
    expect(standard).toContain(
      `- Transaction 1 onchain: https://optimistic.etherscan.io/address/${TARGET}`,
    );
    expect(standard).toContain(`- Transaction 2: chain 999, address ${TARGET}`);
    expect(standard).not.toContain("Audit the app build I am using");

    const custom = buildTransactionReviewPrompt(
      { calls: [request.calls[0]] },
      { explorerOrigin: () => "https://explorer.example" },
    );
    expect(custom).toContain(
      `- Target onchain: https://explorer.example/address/${TARGET}`,
    );

    const debug = buildTransactionDebugPrompt(
      [
        { chainId: 10, txHash: "0xabc" },
        { chainId: 999, txHash: "0xdef" },
      ],
      display,
    );
    expect(debug).toContain(
      "- OP Mainnet (chain 10): https://optimistic.etherscan.io/tx/0xabc",
    );
    expect(debug).toContain("- Chain 999 (chain 999): 0xdef");
    const named = buildTransactionDebugPrompt(
      [{ chainId: 10, txHash: "0xabc" }],
      { chainName: () => "Optimism", explorerOrigin: () => null },
    );
    expect(named).toContain("- Optimism (chain 10): 0xabc");
  });

  it("asks for an audit of the page in a browser", () => {
    vi.stubGlobal("window", { location: { href: "https://app.example/p/1" } });
    expect(buildTransactionReviewPrompt(request, display)).toContain(
      "- Page: https://app.example/p/1",
    );
  });

  it("serializes several calls as one transaction list", () => {
    expect(JSON.parse(transactionReviewJson(request))).toMatchObject({
      transactions: [{ chainId: 10 }, { chainId: 999, value: "0x5" }],
    });
  });
});

describe("gas limits for capped calls", () => {
  it("doubles the measured estimate, never exceeds the cap, and keeps the cap when the node cannot measure", async () => {
    const tx = { account: ALICE, to: TARGET, data: "0x" as const };
    const estimateGas = vi.fn(async () => 100n);
    const client = { estimateGas } as unknown as PublicClient;
    await expect(gasWithinCap(client, tx)).resolves.toBe(200n);
    expect(estimateGas).toHaveBeenLastCalledWith(tx);
    await expect(gasWithinCap(client, tx, 150n)).resolves.toBe(150n);
    expect(estimateGas).toHaveBeenLastCalledWith({ ...tx, gas: 150n });
    await expect(gasWithinCap(client, tx, 500n)).resolves.toBe(200n);
    estimateGas.mockRejectedValueOnce(new Error("execution reverted"));
    await expect(gasWithinCap(client, tx, 150n)).resolves.toBe(150n);
    estimateGas.mockRejectedValueOnce(new Error("execution reverted"));
    await expect(gasWithinCap(client, tx)).resolves.toBeUndefined();
  });
});

describe("app guard", () => {
  it("stops a reviewed write before review when the app refuses writes", async () => {
    const review = vi.fn();
    await expect(
      submitReviewedContractWrite({
        request: { chainId: 10 },
        expectedAccount: ALICE,
        review,
        switchChain: vi.fn(),
        currentAccount: () => ALICE,
        simulate: vi.fn(),
        write: vi.fn(),
        guard: () => {
          throw new Error(
            "Writes are unavailable while viewing another account.",
          );
        },
      }),
    ).rejects.toThrow("viewing another account");
    expect(review).not.toHaveBeenCalled();
  });
});
