import { JB_CHAINS } from "@bananapus/nana-sdk-core";
import { describe, expect, test } from "vitest";
import {
  arbitrum,
  arbitrumSepolia,
  base,
  baseSepolia,
  mainnet,
  optimism,
  optimismSepolia,
  sepolia,
} from "viem/chains";
import { getBendystrawUrl } from "./getBendystrawUrl";

describe("getBendystrawUrl", () => {
  test.each([mainnet.id, optimism.id, base.id, arbitrum.id])(
    "uses the production indexer only for mainnet chain %s",
    (chainId) => {
      expect(getBendystrawUrl(chainId, { apiKey: "key" })).toBe(
        "https://bendystraw.xyz/key",
      );
    },
  );

  test.each([
    sepolia.id,
    optimismSepolia.id,
    baseSepolia.id,
    arbitrumSepolia.id,
    0,
    999999,
  ])("fails unknown/test chain %s over to the testnet indexer", (chainId) => {
    expect(getBendystrawUrl(chainId, { apiKey: "key" })).toBe(
      "https://testnet.bendystraw.xyz/key",
    );
  });

  test("does not put an empty API-key segment in the public URL", () => {
    expect(getBendystrawUrl(mainnet.id, { apiKey: "" })).toBe(
      "https://bendystraw.xyz",
    );
    expect(getBendystrawUrl(sepolia.id, { apiKey: "" })).toBe(
      "https://testnet.bendystraw.xyz",
    );
  });

  test("honors an explicit indexer origin", () => {
    expect(
      getBendystrawUrl(mainnet.id, {
        url: "https://indexer.example",
        apiKey: "secret",
      }),
    ).toBe("https://indexer.example/secret");
  });

  test("leaves no empty key segment on an explicit origin", () => {
    // Callers append `/graphql`, so a trailing slash here becomes `//graphql`.
    expect(
      getBendystrawUrl(mainnet.id, {
        url: "https://indexer.example",
        apiKey: "",
      }),
    ).toBe("https://indexer.example");
  });

  test("routes every supported production chain to the production indexer", () => {
    for (const [chainId, { chain }] of Object.entries(JB_CHAINS)) {
      expect(getBendystrawUrl(Number(chainId), { apiKey: "key" })).toBe(
        chain.testnet
          ? "https://testnet.bendystraw.xyz/key"
          : "https://bendystraw.xyz/key",
      );
    }
  });
});
