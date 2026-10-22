import { encodeFunctionData, parseAbi, type Address } from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildTransactionReviewPrompt,
  transactionReviewJson,
  type TransactionReviewRequest,
} from "./transactionReview.js";

const TARGET = "0x1111111111111111111111111111111111111111" as Address;
const RECIPIENT = "0x2222222222222222222222222222222222222222" as Address;
const ABI = parseAbi(["function transfer(address recipient, uint256 amount)"]);

const EXPLORERS: Record<number, string> = {
  1: "https://etherscan.io",
  10: "https://optimistic.etherscan.io",
  8453: "https://basescan.org",
};
const display = {
  chainName: (chainId: number) => `Chain ${chainId}`,
  explorerOrigin: (chainId: number) => EXPLORERS[chainId] ?? null,
};

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

  it("shows both the signatures and the authorization a request carries", () => {
    const both: TransactionReviewRequest = {
      authorization: { nonce: 4n },
      signatures: [{ kind: "message", chainId: 1, message: "hello" }],
      calls: [{ chainId: 1, to: TARGET, data: "0x1234" }],
    };
    expect(JSON.parse(transactionReviewJson(both))).toEqual({
      signatures: [{ message: "hello" }],
      authorization: { nonce: "4" },
      calls: { chainId: 1, to: TARGET, value: "0x0", data: "0x1234" },
    });
    expect(JSON.parse(transactionReviewJson({ ...both, calls: [] }))).toEqual({
      signatures: [{ message: "hello" }],
      authorization: { nonce: "4" },
    });
  });

  it("builds a v6-specific audit prompt containing every onchain target", () => {
    const prompt = buildTransactionReviewPrompt(request, display);

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
    const prompt = buildDebugPrompt(
      [
        { chainId: 1, txHash: "0xabc" },
        { chainId: 8453, txHash: "0xdef" },
      ],
      display,
    );
    expect(prompt).toContain("https://etherscan.io/tx/0xabc");
    expect(prompt).toContain("https://basescan.org/tx/0xdef");
    expect(prompt).toContain("etherscan-transaction-debugger");
    expect(prompt).toContain("Bananapus/version-6");
  });
});
