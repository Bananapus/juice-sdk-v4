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
    ] as const;

    for (const exportName of publicFunctions) {
      expect(sdk[exportName], exportName).toBeTypeOf("function");
    }
  });
});
