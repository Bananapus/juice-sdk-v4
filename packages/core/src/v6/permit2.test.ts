import {
  decodeAbiParameters,
  erc20Abi,
  type Hex,
  type PublicClient,
} from "viem";
import { describe, expect, test, vi } from "vitest";
import {
  PERMIT2_ADDRESS,
  PERMIT2_PAY_AUTHORIZATION_SECONDS,
  addPermit2PayMetadata,
  needsPermit2Approval,
  permit2AllowanceNeedsRefresh,
  permit2SignatureNeedsOnchainFallback,
  permit2TypedData,
  readPermit2Allowance,
  readPermit2PayAuthorization,
  shouldUsePermit2Signature,
} from "./permit2.js";
import { createHookMetadata, hookMetadataId } from "../utils/hook.js";
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

describe("Permit2 pay authorization", () => {
  const ENTRY = "0x3333333333333333333333333333333333333333" as const;
  const NOW = 1_800_000_000;

  function clientWith({
    direct = 0n,
    permit2Token = 0n,
    nonce = 4,
  }: { direct?: bigint; permit2Token?: bigint; nonce?: number } = {}) {
    const readContract = vi.fn(
      async ({
        abi,
        args,
      }: {
        abi: unknown;
        args: readonly unknown[];
      }) => {
        if (abi !== erc20Abi) return [0n, 0, nonce];
        return args[1] === ENTRY ? direct : permit2Token;
      },
    );
    const getBlock = vi.fn().mockResolvedValue({ timestamp: BigInt(NOW) });
    return {
      client: { readContract, getBlock } as unknown as PublicClient,
      readContract,
    };
  }

  const read = (client: PublicClient, amount = 5_000_000n) =>
    readPermit2PayAuthorization(client, {
      chainId: 8453,
      owner: OWNER,
      token: TOKEN,
      entry: ENTRY,
      amount,
    });

  test("authorizes the exact amount to the entry, expiring from chain time", async () => {
    const { client, readContract } = clientWith();
    await expect(read(client)).resolves.toEqual({
      direct: false,
      needsTokenApproval: true,
      authorization: {
        chainId: 8453,
        token: TOKEN,
        spender: ENTRY,
        amount: 5_000_000n,
        expiration: NOW + PERMIT2_PAY_AUTHORIZATION_SECONDS,
        nonce: 4,
        sigDeadline: BigInt(NOW + PERMIT2_PAY_AUTHORIZATION_SECONDS),
      },
    });
    // The nonce is the entry's own, not the Universal Router's.
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: PERMIT2_ADDRESS,
        args: [OWNER, TOKEN, ENTRY],
      }),
    );
  });

  test("reports a covering direct allowance and a covering Permit2 token allowance", async () => {
    const covered = await read(
      clientWith({ direct: 5_000_000n, permit2Token: 5_000_000n }).client,
    );
    expect(covered.direct).toBe(true);
    expect(covered.needsTokenApproval).toBe(false);
    const short = await read(
      clientWith({ direct: 4_999_999n, permit2Token: 4_999_999n }).client,
    );
    expect(short.direct).toBe(false);
    expect(short.needsTokenApproval).toBe(true);
  });

  test("refuses an amount Permit2 cannot carry", async () => {
    const { client } = clientWith();
    await expect(read(client, 0n)).rejects.toThrow(/uint160/);
    await expect(read(client, 1n << 160n)).rejects.toThrow(/uint160/);
  });

  test("adds one JBSingleAllowance tuple keyed to the entry, after the existing entries", async () => {
    const { authorization } = await read(clientWith().client);
    const signature = `0x${"ab".repeat(65)}` as Hex;
    const existingId = "0x12345678";
    const existing = `0x${"00".repeat(31)}01` as Hex;
    const metadata = addPermit2PayMetadata({
      metadata: createHookMetadata([existingId], [existing]),
      authorization,
      signature,
    });
    // Table: reserved word, then (id, offset) pairs; payloads start at word 2.
    const body = metadata.slice(2);
    expect(body.slice(64, 74)).toBe("1234567802");
    expect(`0x${body.slice(74, 82)}`).toBe(hookMetadataId(ENTRY, "permit2"));
    expect(body.slice(82, 84)).toBe("03");
    expect(`0x${body.slice(128, 192)}`).toBe(existing);
    const [allowance] = decodeAbiParameters(
      [
        {
          type: "tuple",
          components: [
            { name: "sigDeadline", type: "uint256" },
            { name: "amount", type: "uint160" },
            { name: "expiration", type: "uint48" },
            { name: "nonce", type: "uint48" },
            { name: "signature", type: "bytes" },
          ],
        },
      ],
      `0x${body.slice(192)}`,
    );
    expect(allowance).toEqual({
      sigDeadline: authorization.sigDeadline,
      amount: authorization.amount,
      expiration: authorization.expiration,
      nonce: authorization.nonce,
      signature,
    });
    // With no other metadata the allowance is the only entry.
    expect(
      addPermit2PayMetadata({ authorization, signature }).slice(66, 74),
    ).toBe(hookMetadataId(ENTRY, "permit2").slice(2));
  });
});
