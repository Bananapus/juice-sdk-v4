import { PublicClient, zeroAddress } from "viem";
import { describe, expect, test } from "vitest";
import {
  DISCOUNT_DENOMINATOR,
  effectiveTierPrice,
  get721MetadataIdTarget,
  getProject721Shop,
} from "./nft.js";

const chainId = 11155111;
const hook = "0x1111111111111111111111111111111111111111" as const;
const impl = "0x2222222222222222222222222222222222222222" as const;
const store = "0x3333333333333333333333333333333333333333" as const;

describe("effectiveTierPrice", () => {
  test("floors like on-chain mulDiv(price, discountPercent, 200)", () => {
    // 100 - floor(100 * 25 / 200) = 100 - 12 = 88.
    expect(effectiveTierPrice(100n, 25)).toEqual(88n);
  });

  test("no discount returns the full price", () => {
    expect(effectiveTierPrice(1000n, 0)).toEqual(1000n);
  });

  test("full discount (denominator) is free", () => {
    expect(effectiveTierPrice(1000n, Number(DISCOUNT_DENOMINATOR))).toEqual(0n);
  });

  test("clamps discounts above the denominator to free", () => {
    expect(effectiveTierPrice(1000n, 500)).toEqual(0n);
  });
});

describe("get721MetadataIdTarget", () => {
  test("returns METADATA_ID_TARGET (the implementation, not the clone)", async () => {
    const client = {
      readContract: async () => impl,
    } as unknown as PublicClient;

    expect(await get721MetadataIdTarget(client, { chainId, hook })).toEqual(impl);
  });

  test("falls back to the hook address if the getter reverts", async () => {
    const client = {
      readContract: async () => {
        throw new Error("no such function");
      },
    } as unknown as PublicClient;

    expect(await get721MetadataIdTarget(client, { chainId, hook })).toEqual(hook);
  });
});

describe("getProject721Shop", () => {
  test("returns null when a revnet has no 721 hook", async () => {
    const client = {
      // getRevnetTiered721Hook -> zero address.
      readContract: async () => zeroAddress,
    } as unknown as PublicClient;

    expect(
      await getProject721Shop(client, {
        chainId,
        projectId: 1n,
        isRevnet: true,
      }),
    ).toBeNull();
  });

  test("resolves a revnet shop: hook, store, target, pricing, tiers", async () => {
    const client = {
      readContract: async ({
        address,
        functionName,
      }: {
        address: string;
        functionName: string;
      }) => {
        if (functionName === "tiered721HookOf") return hook; // REVOwner
        if (address === hook && functionName === "STORE") return store;
        if (functionName === "METADATA_ID_TARGET") return impl;
        if (functionName === "pricingContext") return [61166n, 18n];
        if (functionName === "tiersOf") {
          return [
            {
              id: 1,
              price: 1000n,
              remainingSupply: 5,
              initialSupply: 10,
              votingUnits: 0n,
              reserveFrequency: 0,
              reserveBeneficiary: zeroAddress,
              encodedIpfsUri: `0x${"11".repeat(32)}`,
              category: 0,
              discountPercent: 0,
              flags: {},
              splitPercent: 0,
              resolvedUri: "",
            },
            // Filtered out: initialSupply 0.
            {
              id: 2,
              price: 0n,
              remainingSupply: 0,
              initialSupply: 0,
              votingUnits: 0n,
              reserveFrequency: 0,
              reserveBeneficiary: zeroAddress,
              encodedIpfsUri: `0x${"00".repeat(32)}`,
              category: 0,
              discountPercent: 0,
              flags: {},
              splitPercent: 0,
              resolvedUri: "",
            },
          ];
        }
        throw new Error(`unexpected read ${functionName}`);
      },
    } as unknown as PublicClient;

    const shop = await getProject721Shop(client, {
      chainId,
      projectId: 1n,
      isRevnet: true,
    });

    expect(shop).not.toBeNull();
    expect(shop!.hook).toEqual(hook);
    expect(shop!.store).toEqual(store);
    expect(shop!.metadataIdTarget).toEqual(impl);
    expect(shop!.pricing).toEqual({ currency: 61166, decimals: 18 });
    expect(shop!.tiers).toHaveLength(1);
    expect(shop!.tiers[0]).toMatchObject({ id: 1, price: 1000n });
  });
});
