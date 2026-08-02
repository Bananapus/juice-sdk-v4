import { decodeAbiParameters, encodeAbiParameters, zeroAddress } from "viem";
import type { Address, Hex, PublicClient } from "viem";
import { describe, expect, test } from "vitest";
import { NATIVE_TOKEN } from "../constants.js";
import {
  NATIVE_SWAP_BY_CHAIN,
  addPermit2SignatureToDirectPaySwap,
  buildDirectPaySwapTx,
  quoteDirectPaySwap,
  type DirectPaySwapQuote,
} from "./directPay.js";
import type { Permit2SignatureAuthorization } from "./permit2.js";

const PROJECT_TOKEN = "0x2222222222222222222222222222222222222222" as Address;
const RECIPIENT = "0x3333333333333333333333333333333333333333" as Address;
const HOOK = "0x4444444444444444444444444444444444444444" as Address;
const SIGNATURE = `0x${"55".repeat(65)}` as Hex;
const MAINNET_CHAIN_IDS = [1, 10, 8453, 42161] as const;

function quoteClient({
  v3Outputs = [70n, 90n, 80n, 60n],
  v4Output = 200n,
}: {
  v3Outputs?: (bigint | null)[];
  v4Output?: bigint;
} = {}): PublicClient {
  let v3Call = 0;
  return {
    call: async ({ to }: { to?: Address }) => {
      if (
        to?.toLowerCase() === NATIVE_SWAP_BY_CHAIN[8453]!.v3Quoter.toLowerCase()
      ) {
        const amountOut = v3Outputs[v3Call++];
        if (amountOut === null || amountOut === undefined) {
          throw new Error("pool missing");
        }
        return {
          data: encodeAbiParameters(
            [
              { type: "uint256" },
              { type: "uint160" },
              { type: "uint32" },
              { type: "uint256" },
            ],
            [amountOut, 0n, 0, 0n],
          ),
        };
      }
      return {
        data: encodeAbiParameters(
          [{ type: "uint256" }, { type: "uint256" }],
          [v4Output, 0n],
        ),
      };
    },
  } as unknown as PublicClient;
}

function fixture(
  inputRoute: DirectPaySwapQuote["inputRoute"] = { kind: "single-v4" },
): DirectPaySwapQuote {
  return {
    kind: "direct-swap",
    poolKey: {
      currency0: NATIVE_SWAP_BY_CHAIN[8453]!.bridgeToken,
      currency1: PROJECT_TOKEN,
      fee: 10_000,
      tickSpacing: 200,
      hooks: HOOK,
    },
    zeroForOne: true,
    quotedTokenCount: 101n,
    minimumTokenCount: 100n,
    beneficiaryTokenCount: 100n,
    reservedTokenCount: 0n,
    inputRoute,
  };
}

describe("cross-currency direct-pay transactions", () => {
  test("quotes direct and both bridged payment directions", async () => {
    const base = NATIVE_SWAP_BY_CHAIN[8453]!;
    const payPreview = {
      beneficiaryTokenCount: 100n,
      reservedTokenCount: 10n,
    };
    const direct = await quoteDirectPaySwap({
      client: quoteClient(),
      chainId: 8453,
      poolKey: fixture().poolKey,
      pairIsCurrency0: true,
      paymentToken: base.bridgeToken,
      amount: 25_000_000n,
      payPreview,
    });
    expect(direct).toMatchObject({
      kind: "direct-swap",
      quotedTokenCount: 200n,
      minimumTokenCount: 198n,
      beneficiaryTokenCount: 198n,
      reservedTokenCount: 0n,
      inputRoute: { kind: "single-v4" },
    });

    const native = await quoteDirectPaySwap({
      client: quoteClient(),
      chainId: 8453,
      poolKey: fixture().poolKey,
      pairIsCurrency0: true,
      paymentToken: NATIVE_TOKEN,
      amount: 10n ** 16n,
      payPreview,
    });
    expect(native?.inputRoute).toMatchObject({
      kind: "native-v3-v4",
      v3Fee: 500,
      quotedBridgeAmount: 90n,
    });

    const usdcToNative = await quoteDirectPaySwap({
      client: quoteClient(),
      chainId: 8453,
      poolKey: { ...fixture().poolKey, currency0: zeroAddress },
      pairIsCurrency0: true,
      paymentToken: base.bridgeToken,
      amount: 25_000_000n,
      payPreview,
      paySettlement: "swap",
    });
    expect(usdcToNative?.inputRoute).toMatchObject({
      kind: "erc20-v3-native-v4",
      inputToken: base.bridgeToken,
      v3Fee: 500,
      quotedBridgeAmount: 90n,
    });
  });

  test("fails closed when no executable direct route beats terminal pay", async () => {
    const base = NATIVE_SWAP_BY_CHAIN[8453]!;
    const common = {
      client: quoteClient({ v4Output: 100n }),
      chainId: 8453 as const,
      poolKey: fixture().poolKey,
      pairIsCurrency0: true,
      paymentToken: base.bridgeToken,
      payPreview: { beneficiaryTokenCount: 100n, reservedTokenCount: 0n },
    };
    await expect(
      quoteDirectPaySwap({ ...common, amount: 25_000_000n }),
    ).resolves.toBeNull();
    await expect(
      quoteDirectPaySwap({ ...common, amount: 0n }),
    ).resolves.toBeNull();
    await expect(
      quoteDirectPaySwap({
        ...common,
        paymentToken: HOOK,
        amount: 25_000_000n,
      }),
    ).resolves.toBeNull();
    await expect(
      quoteDirectPaySwap({
        ...common,
        client: quoteClient({ v3Outputs: [null, null, null, null] }),
        paymentToken: NATIVE_TOKEN,
        amount: 10n ** 16n,
      }),
    ).resolves.toBeNull();
  });

  test("builds both bridge directions on every supported mainnet", () => {
    for (const chainId of MAINNET_CHAIN_IDS) {
      const config = NATIVE_SWAP_BY_CHAIN[chainId];
      expect(
        config,
        `missing bridge config for chain ${chainId}`,
      ).toBeDefined();
      if (!config) continue;

      const nativeRequest = buildDirectPaySwapTx({
        chainId,
        quote: {
          ...fixture(),
          poolKey: {
            ...fixture().poolKey,
            currency0: config.bridgeToken,
          },
          inputRoute: {
            kind: "native-v3-v4",
            wrappedNative: config.wrappedNative,
            bridgeToken: config.bridgeToken,
            bridgeTokenSymbol: "USDC",
            bridgeTokenDecimals: 6,
            v3Fee: 500,
            quotedBridgeAmount: 25_000_000n,
          },
        },
        amount: 10_000_000_000_000_000n,
        recipient: RECIPIENT,
        deadline: 1_800_000_000n,
      });
      expect(nativeRequest.chainId).toBe(chainId);
      expect(nativeRequest.args[0]).toBe("0x0b0010");
      expect(nativeRequest.value).toBe(10_000_000_000_000_000n);
      const [nativeActions] = decodeAbiParameters(
        [{ type: "bytes" }, { type: "bytes[]" }],
        nativeRequest.args[1][2],
      );
      expect(nativeActions).toBe("0x0b060e");

      const erc20Request = buildDirectPaySwapTx({
        chainId,
        quote: {
          ...fixture(),
          poolKey: {
            ...fixture().poolKey,
            currency0: zeroAddress,
          },
          inputRoute: {
            kind: "erc20-v3-native-v4",
            inputToken: config.bridgeToken,
            wrappedNative: config.wrappedNative,
            bridgeTokenSymbol: "ETH",
            bridgeTokenDecimals: 18,
            v3Fee: 500,
            quotedBridgeAmount: 10_000_000_000_000_000n,
          },
        },
        amount: 25_000_000n,
        recipient: RECIPIENT,
        deadline: 1_800_000_000n,
      });
      expect(erc20Request.chainId).toBe(chainId);
      expect(erc20Request.args[0]).toBe("0x000c10");
      expect(erc20Request.value).toBe(0n);
      const [erc20Actions] = decodeAbiParameters(
        [{ type: "bytes" }, { type: "bytes[]" }],
        erc20Request.args[1][2],
      );
      expect(erc20Actions).toBe("0x0b060e");
    }
  });

  test("prepends a PermitSingle to ERC-20 direct swaps", () => {
    const request = buildDirectPaySwapTx({
      chainId: 8453,
      quote: fixture(),
      amount: 25_000_000n,
      recipient: RECIPIENT,
      deadline: 1_800_000_000n,
    });
    const authorization: Permit2SignatureAuthorization = {
      chainId: 8453,
      token: NATIVE_SWAP_BY_CHAIN[8453]!.bridgeToken,
      spender: request.address,
      amount: 25_000_000n,
      expiration: 1_799_999_900,
      nonce: 7,
      sigDeadline: 1_799_999_900n,
    };
    const signed = addPermit2SignatureToDirectPaySwap(
      request,
      authorization,
      SIGNATURE,
    );
    expect(signed.args[0]).toBe("0x0a10");
    expect(signed.args[1]).toHaveLength(2);
    expect(signed.args[1][0].toLowerCase()).toContain(
      SIGNATURE.slice(2).toLowerCase(),
    );

    expect(() =>
      addPermit2SignatureToDirectPaySwap(
        request,
        { ...authorization, spender: zeroAddress },
        SIGNATURE,
      ),
    ).toThrow(/does not match/);
  });

  test("rejects invalid bridge requests and non-ERC-20 permit shapes", () => {
    const base = NATIVE_SWAP_BY_CHAIN[8453]!;
    const nativeQuote: DirectPaySwapQuote = {
      ...fixture(),
      inputRoute: {
        kind: "native-v3-v4",
        wrappedNative: base.wrappedNative,
        bridgeToken: base.bridgeToken,
        bridgeTokenSymbol: "USDC",
        bridgeTokenDecimals: 6,
        v3Fee: 500,
        quotedBridgeAmount: 25_000_000n,
      },
    };
    expect(() =>
      buildDirectPaySwapTx({
        chainId: 8453,
        quote: nativeQuote,
        amount: 0n,
        recipient: RECIPIENT,
        deadline: 1n,
      }),
    ).toThrow(/outside the supported range/);
    expect(() =>
      buildDirectPaySwapTx({
        chainId: 84532,
        quote: nativeQuote,
        amount: 1n,
        recipient: RECIPIENT,
        deadline: 1n,
      }),
    ).toThrow(/No supported native bridge route/);
    expect(() =>
      buildDirectPaySwapTx({
        chainId: 8453,
        quote: {
          ...nativeQuote,
          inputRoute: {
            kind: "native-v3-v4",
            wrappedNative: base.wrappedNative,
            bridgeToken: HOOK,
            bridgeTokenSymbol: "USDC",
            bridgeTokenDecimals: 6,
            v3Fee: 500,
            quotedBridgeAmount: 25_000_000n,
          },
        },
        amount: 1n,
        recipient: RECIPIENT,
        deadline: 1n,
      }),
    ).toThrow(/native bridge route is not supported/);

    const erc20Quote: DirectPaySwapQuote = {
      ...fixture(),
      poolKey: { ...fixture().poolKey, currency0: zeroAddress },
      inputRoute: {
        kind: "erc20-v3-native-v4",
        inputToken: HOOK,
        wrappedNative: base.wrappedNative,
        bridgeTokenSymbol: "ETH",
        bridgeTokenDecimals: 18,
        v3Fee: 500,
        quotedBridgeAmount: 1n,
      },
    };
    expect(() =>
      buildDirectPaySwapTx({
        chainId: 8453,
        quote: erc20Quote,
        amount: 1n,
        recipient: RECIPIENT,
        deadline: 1n,
      }),
    ).toThrow(/ERC-20 bridge route is not supported/);

    const nativeRequest = buildDirectPaySwapTx({
      chainId: 8453,
      quote: nativeQuote,
      amount: 1n,
      recipient: RECIPIENT,
      deadline: 1n,
    });
    expect(() =>
      addPermit2SignatureToDirectPaySwap(
        nativeRequest,
        {
          chainId: 8453,
          token: NATIVE_TOKEN,
          spender: nativeRequest.address,
          amount: 1n,
          expiration: 2,
          nonce: 0,
          sigDeadline: 2n,
        },
        SIGNATURE,
      ),
    ).toThrow(/unsupported Universal Router shape/);
  });
});
