import {
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  HttpRequestError,
  PublicClient,
} from "viem";
import { describe, expect, test } from "vitest";
import { USDC_ADDRESSES } from "../constants.js";
import { jbPricesAbi } from "../generated/juicebox.js";
import {
  BASE_CURRENCY_ETH,
  BASE_CURRENCY_USD,
  NATIVE_TOKEN_CURRENCY_ID,
  tokenCurrencyId,
} from "./currency.js";
import { buildAccountingContext } from "./launch.js";
import {
  JBFeedPair,
  probeFeedReachability,
  requiredFeedPairs,
} from "./priceFeeds.js";
import { v6Address } from "./types.js";

const chainId = 11155111;
const usdc = USDC_ADDRESSES[chainId];
const usdcCurrency = tokenCurrencyId(usdc);

const ethContext = buildAccountingContext();
const usdcContext = buildAccountingContext(usdc, 6);

describe("requiredFeedPairs", () => {
  test("derives context->base and context<->context pairs from accounting contexts", () => {
    const pairs = requiredFeedPairs(
      [ethContext, usdcContext],
      BASE_CURRENCY_ETH,
    );
    expect(pairs).toEqual([
      // Pay path: each context against the base, at the context's decimals.
      {
        pricingCurrency: NATIVE_TOKEN_CURRENCY_ID,
        unitCurrency: BASE_CURRENCY_ETH,
        decimals: 18,
      },
      {
        pricingCurrency: usdcCurrency,
        unitCurrency: BASE_CURRENCY_ETH,
        decimals: 6,
      },
      // Cash-out/surplus path: contexts against each other, at 18 decimals.
      {
        pricingCurrency: NATIVE_TOKEN_CURRENCY_ID,
        unitCurrency: usdcCurrency,
        decimals: 18,
      },
    ]);
  });

  test("skips the base pair when a context already uses the base currency", () => {
    const pairs = requiredFeedPairs(
      [buildAccountingContext(undefined, undefined, BASE_CURRENCY_ETH)],
      BASE_CURRENCY_ETH,
    );
    expect(pairs).toEqual([]);
  });

  test("dedupes pairs without direction", () => {
    // A USD-based project accepting a context whose currency IS USD's inverse
    // partner: the context->base pair and base->context pair collapse to one.
    const pairs = requiredFeedPairs(
      [
        buildAccountingContext(undefined, undefined, BASE_CURRENCY_USD),
        buildAccountingContext(usdc, 6, BASE_CURRENCY_ETH),
      ],
      BASE_CURRENCY_ETH,
    );
    expect(pairs).toEqual([
      {
        pricingCurrency: BASE_CURRENCY_USD,
        unitCurrency: BASE_CURRENCY_ETH,
        decimals: 18,
      },
    ]);
  });

  test("single-context projects need no cross-context pair", () => {
    const pairs = requiredFeedPairs([usdcContext], BASE_CURRENCY_USD);
    expect(pairs).toEqual([
      {
        pricingCurrency: usdcCurrency,
        unitCurrency: BASE_CURRENCY_USD,
        decimals: 6,
      },
    ]);
  });
});

const PAIRS: JBFeedPair[] = [
  {
    pricingCurrency: NATIVE_TOKEN_CURRENCY_ID,
    unitCurrency: BASE_CURRENCY_ETH,
    decimals: 18,
  },
  {
    pricingCurrency: usdcCurrency,
    unitCurrency: BASE_CURRENCY_ETH,
    decimals: 6,
  },
];

const feedNotFound = new ContractFunctionExecutionError(
  new ContractFunctionRevertedError({
    abi: jbPricesAbi,
    functionName: "pricePerUnitOf",
  }),
  {
    abi: jbPricesAbi,
    args: [],
    contractAddress: v6Address("JBPrices", chainId),
    functionName: "pricePerUnitOf",
  },
);
const transportFailure = new ContractFunctionExecutionError(
  new HttpRequestError({ url: "https://rpc.example", details: "timeout" }),
  {
    abi: jbPricesAbi,
    args: [],
    contractAddress: v6Address("JBPrices", chainId),
    functionName: "pricePerUnitOf",
  },
);

function stubClient(
  respond: (args: readonly unknown[]) => bigint,
  calls: unknown[] = [],
) {
  const client = {
    readContract: async (params: { args: readonly unknown[] }) => {
      calls.push(params);
      return respond(params.args);
    },
  } as unknown as PublicClient;
  return { client, calls };
}

describe("probeFeedReachability", () => {
  test("probes JBPrices with project-0 default-feed semantics and reports ok", async () => {
    const { client, calls } = stubClient(() => 1n);
    const verdict = await probeFeedReachability(client, {
      chainId,
      pairs: PAIRS,
    });
    expect(verdict).toEqual({ status: "ok" });
    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({
      address: v6Address("JBPrices", chainId),
      functionName: "pricePerUnitOf",
      args: [
        0n,
        BigInt(NATIVE_TOKEN_CURRENCY_ID),
        BigInt(BASE_CURRENCY_ETH),
        18n,
      ],
    });
    expect(calls[1]).toMatchObject({
      args: [0n, BigInt(usdcCurrency), BigInt(BASE_CURRENCY_ETH), 6n],
    });
  });

  test("passes an explicit projectId through", async () => {
    const { client, calls } = stubClient(() => 1n);
    await probeFeedReachability(client, {
      chainId,
      pairs: [PAIRS[0]],
      projectId: 5n,
    });
    expect(calls[0]).toMatchObject({
      args: [
        5n,
        BigInt(NATIVE_TOKEN_CURRENCY_ID),
        BigInt(BASE_CURRENCY_ETH),
        18n,
      ],
    });
  });

  test("no pairs means nothing to verify", async () => {
    const { client, calls } = stubClient(() => 1n);
    const verdict = await probeFeedReachability(client, {
      chainId,
      pairs: [],
    });
    expect(verdict).toEqual({ status: "ok" });
    expect(calls).toHaveLength(0);
  });

  test("a proven revert reports the pair as missing", async () => {
    const { client } = stubClient((args) => {
      if (args[1] === BigInt(usdcCurrency)) throw feedNotFound;
      return 1n;
    });
    const verdict = await probeFeedReachability(client, {
      chainId,
      pairs: PAIRS,
    });
    expect(verdict).toEqual({ status: "missing", missing: [PAIRS[1]] });
  });

  test("an RPC failure is NEVER reported as missing — it fails closed as unavailable", async () => {
    const { client } = stubClient(() => {
      throw transportFailure;
    });
    const verdict = await probeFeedReachability(client, {
      chainId,
      pairs: PAIRS,
    });
    expect(verdict).toEqual({ status: "unavailable" });
  });

  test("a proven missing feed outranks a concurrent RPC failure", async () => {
    const { client } = stubClient((args) => {
      if (args[1] === BigInt(usdcCurrency)) throw feedNotFound;
      throw transportFailure;
    });
    const verdict = await probeFeedReachability(client, {
      chainId,
      pairs: PAIRS,
    });
    expect(verdict).toEqual({ status: "missing", missing: [PAIRS[1]] });
  });

  test("a chain without a JBPrices deployment is unavailable, not ok", async () => {
    const { client, calls } = stubClient(() => 1n);
    const verdict = await probeFeedReachability(client, {
      chainId: 999999 as never,
      pairs: PAIRS,
    });
    expect(verdict).toEqual({ status: "unavailable" });
    expect(calls).toHaveLength(0);
  });
});
