import * as held from "@bananapus/nana-sdk-core/review/react";
import { describe, expect, test } from "vitest";
import * as sdk from "./index";

describe("published React SDK surface", () => {
  test("exports every supported provider, read hook, and Relayr boundary", () => {
    const publicFunctions = [
      "NativeTokenValue",
      "JBChainProvider",
      "JBContractProvider",
      "JBDataHookProvider",
      "JBProjectMetadataProvider",
      "JBProjectProvider",
      "JBRulesetProvider",
      "JBTerminalProvider",
      "JBTokenProvider",
      "useJBProject",
      "useJBRuleset",
      "useJBUpcomingRuleset",
      "useResolveDataHook",
      "useNativeTokenSurplus",
      "useSuckersCashOutQuote",
      "useSuckersNativeTokenBalance",
      "useSuckersNativeTokenSurplus",
      "useSuckersTokenCashOutValue",
      "useSuckersUserTokenBalance",
      "useTokenCashOutQuoteEth",
      "useOwnedShopItems",
      "useShopPurchases",
      "useBendystrawQuery",
      "getBendystrawUrl",
      "useGetRelayrTxBundle",
      "useGetRelayrTxQuote",
      "useSendRelayrTx",
      "useHeldWrite",
      "useHeldIntents",
      "useHeldWrites",
      "HeldWritesNotice",
      "useSavedAttempt",
      "useHeldSend",
    ] as const;

    for (const exportName of publicFunctions) {
      expect(sdk[exportName], exportName).toBeTypeOf("function");
    }
  });

  test("re-exports the held-write hooks from their one home in core", () => {
    for (const name of [
      "useHeldWrite",
      "useHeldIntents",
      "useHeldWrites",
      "HeldWritesNotice",
      "useSavedAttempt",
      "useHeldSend",
    ] as const)
      expect(sdk[name], name).toBe(held[name]);
  });
});
