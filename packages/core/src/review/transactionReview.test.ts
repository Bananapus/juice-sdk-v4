import { encodeFunctionData, parseAbi, type Address } from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildTransactionReviewPrompt,
  registerTransactionReviewHandler,
  requestContractTransactionReview,
  requireContractTransactionReview,
  requireTransactionReview,
  transactionReviewJson,
  type TransactionReviewRequest,
} from "./transactionReview.js";

const TARGET = "0x1111111111111111111111111111111111111111" as Address;
const RECIPIENT = "0x2222222222222222222222222222222222222222" as Address;
const ABI = parseAbi(["function transfer(address recipient, uint256 amount)"]);

let unregister: (() => void) | undefined;

function handle(
  handler: Parameters<typeof registerTransactionReviewHandler>[0],
) {
  unregister = registerTransactionReviewHandler(handler);
}

afterEach(() => {
  unregister?.();
  unregister = undefined;
});

describe("mandatory transaction review boundary", () => {
  it("refuses calls when the review UI is unavailable", async () => {
    await expect(
      requireContractTransactionReview({
        chainId: 1,
        address: TARGET,
        abi: ABI,
        functionName: "transfer",
        args: [RECIPIENT, 5n],
      }),
    ).rejects.toThrow(/review is unavailable/i);
  });

  it("shows the exact encoded call and returns the reviewer decision", async () => {
    const reviewed = vi.fn().mockResolvedValue(true);
    handle(reviewed);

    await expect(
      requestContractTransactionReview(
        {
          chainId: 10,
          address: TARGET,
          abi: ABI,
          functionName: "transfer",
          args: [RECIPIENT, 5n],
          value: 7n,
        },
        { label: "Transfer credits", contractName: "Example token" },
      ),
    ).resolves.toBe(true);

    const request = reviewed.mock.calls[0][0] as TransactionReviewRequest;
    expect(request.calls).toEqual([
      expect.objectContaining({
        chainId: 10,
        to: TARGET,
        value: 7n,
        data: encodeFunctionData({
          abi: ABI,
          functionName: "transfer",
          args: [RECIPIENT, 5n],
        }),
        label: "Transfer credits",
        contractName: "Example token",
      }),
    ]);
  });

  it("detects argument mutation while the user is reviewing", async () => {
    const args: [Address, bigint] = [RECIPIENT, 5n];
    handle(async () => {
      args[1] = 500n;
      return true;
    });

    await expect(
      requestContractTransactionReview({
        chainId: 1,
        address: TARGET,
        abi: ABI,
        functionName: "transfer",
        args,
      }),
    ).rejects.toThrow(/changed after review/i);
  });

  it("turns a closed review into a cancellation and sends nothing", async () => {
    handle(async () => false);

    await expect(
      requireContractTransactionReview({
        chainId: 1,
        address: TARGET,
        abi: ABI,
        functionName: "transfer",
        args: [RECIPIENT, 5n],
      }),
    ).rejects.toThrow("Review closed. Nothing was sent.");
  });

  it("rejects empty raw review bundles", async () => {
    handle(async () => true);
    await expect(requireTransactionReview({ calls: [] })).rejects.toThrow(
      /no transaction to review/i,
    );
  });
});

describe("review serialization", () => {
  const request: TransactionReviewRequest = {
    title: "Review bundle",
    authorization: { nonce: 4n },
    calls: [
      {
        chainId: 1,
        from: RECIPIENT,
        to: TARGET,
        value: 15n,
        data: "0x1234",
      },
      {
        chainId: 10,
        to: RECIPIENT,
        data: "0xabcd",
      },
    ],
  };

  it("serializes bigint authorization and exact RPC fields without loss", () => {
    expect(JSON.parse(transactionReviewJson(request))).toEqual({
      authorization: { nonce: "4" },
      resultingCall: {
        transactions: [
          {
            chainId: 1,
            from: RECIPIENT,
            to: TARGET,
            value: "0xf",
            data: "0x1234",
          },
          {
            chainId: 10,
            to: RECIPIENT,
            value: "0x0",
            data: "0xabcd",
          },
        ],
      },
    });
  });

  it("builds a v6-specific audit prompt containing every onchain target", () => {
    const prompt = buildTransactionReviewPrompt(request);

    expect(prompt).toContain("nana V6 / revnet V6");
    expect(prompt).toContain(`https://etherscan.io/address/${TARGET}`);
    expect(prompt).toContain(
      `https://optimistic.etherscan.io/address/${RECIPIENT}`,
    );
    expect(prompt).toContain("SAFE TO SIGN / DO NOT SIGN / NEEDS MORE INFO");
  });
});

import { buildTransactionDebugPrompt as buildDebugPrompt } from "./transactionReview.js";

describe("buildTransactionDebugPrompt", () => {
  it("links each tx on its own explorer and points at the Etherscan debugger skill", () => {
    const prompt = buildDebugPrompt([
      { chainId: 1, txHash: "0xabc" },
      { chainId: 8453, txHash: "0xdef" },
    ]);
    expect(prompt).toContain("https://etherscan.io/tx/0xabc");
    expect(prompt).toContain("https://basescan.org/tx/0xdef");
    expect(prompt).toContain("etherscan-transaction-debugger");
    expect(prompt).toContain("Bananapus/version-6");
  });
});
