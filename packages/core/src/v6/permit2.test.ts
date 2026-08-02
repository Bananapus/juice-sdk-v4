import type { Hex, PublicClient } from "viem";
import { describe, expect, test, vi } from "vitest";
import {
  PERMIT2_ADDRESS,
  needsPermit2Approval,
  permit2AllowanceNeedsRefresh,
  permit2SignatureNeedsOnchainFallback,
  permit2TypedData,
  readPermit2Allowance,
  shouldUsePermit2Signature,
} from "./permit2.js";
import { UNISWAP_V4_UNIVERSAL_ROUTER_ADDRESSES } from "./uniswapV4.js";

const OWNER = "0x1111111111111111111111111111111111111111" as const;
const TOKEN = "0x2222222222222222222222222222222222222222" as const;

describe("Permit2 helpers", () => {
  test("builds canonical PermitSingle typed data", () => {
    const typedData = permit2TypedData({
      chainId: 8453,
      token: TOKEN,
      spender: UNISWAP_V4_UNIVERSAL_ROUTER_ADDRESSES[8453]!,
      amount: 25_000_000n,
      expiration: 2_000_000_000,
      nonce: 7,
      sigDeadline: 2_000_000_000n,
    });
    expect(typedData.domain.verifyingContract).toBe(PERMIT2_ADDRESS);
    expect(typedData.primaryType).toBe("PermitSingle");
    expect(typedData.message.details.nonce).toBe(7);
  });

  test("reads allowance and applies amount and expiration safety", async () => {
    const readContract = vi
      .fn()
      .mockResolvedValue([30_000_000n, 2_000_000_000, 9]);
    const client = { readContract } as unknown as PublicClient;
    await expect(
      readPermit2Allowance(client, {
        chainId: 8453,
        owner: OWNER,
        token: TOKEN,
      }),
    ).resolves.toEqual({
      amount: 30_000_000n,
      expiration: 2_000_000_000,
      nonce: 9,
    });
    await expect(
      needsPermit2Approval({
        client,
        chainId: 8453,
        owner: OWNER,
        token: TOKEN,
        amount: 25_000_000n,
        now: 1_900_000_000,
      }),
    ).resolves.toBe(false);
    expect(
      permit2AllowanceNeedsRefresh({
        allowance: { amount: 1n, expiration: 2_000_000_000 },
        amount: 2n,
        now: 1_900_000_000,
      }),
    ).toBe(true);
  });

  test("uses signatures for EOAs and never falls back after rejection", () => {
    expect(
      shouldUsePermit2Signature({
        needsApproval: true,
        walletLookupSettled: true,
        walletBytecode: "0x" as Hex,
        isSafe: false,
      }),
    ).toBe(true);
    expect(
      shouldUsePermit2Signature({
        needsApproval: true,
        walletLookupSettled: true,
        walletBytecode: "0x1234",
        isSafe: false,
      }),
    ).toBe(false);
    expect(
      permit2SignatureNeedsOnchainFallback({
        code: 4001,
        message: "User rejected the request",
      }),
    ).toBe(false);
    expect(
      permit2SignatureNeedsOnchainFallback({
        code: -32602,
        message: "Invalid parameters",
      }),
    ).toBe(true);
  });
});
