import { describe, expect, test } from "vitest";
import * as sdk from "./index.js";
import * as v6 from "./v6/index.js";

describe("published core SDK surfaces", () => {
  test("exports the framework-free utility and V6 transaction boundaries", () => {
    expect(sdk.getTokenAToBQuote).toBeTypeOf("function");
    expect(sdk.getProjectTerminalStore).toBeTypeOf("function");
    expect(sdk.downsampleTimeSeries).toBeTypeOf("function");
    expect(sdk.requestBendystraw).toBeTypeOf("function");
    expect(sdk.resolveBendystrawNetwork).toBeTypeOf("function");
    expect(sdk.selectBendystrawEndpoint).toBeTypeOf("function");
    expect(sdk.bendystrawDataHasFields).toBeTypeOf("function");
    expect(sdk.bendystrawCacheTtl).toBeTypeOf("function");
    expect(sdk.bendystrawProjectRefsFilter).toBeTypeOf("function");
    expect(sdk.bendystrawProjectRefsFilters).toBeTypeOf("function");
    expect(v6.buildDeployRevnetTx).toBeTypeOf("function");
    expect(v6.buildAutoIssueTx).toBeTypeOf("function");
    expect(v6.quoteDirectPaySwap).toBeTypeOf("function");
    expect(v6.buildDirectPaySwapTx).toBeTypeOf("function");
    expect(v6.permit2TypedData).toBeTypeOf("function");
    expect(v6.netLoanProceeds).toBeTypeOf("function");
    expect(v6.build721RulesetMetadata).toBeTypeOf("function");
    expect(v6.decode721RulesetMetadata).toBeTypeOf("function");
    expect(sdk.isContractRevertError).toBeTypeOf("function");
    expect(sdk.isMissingContractFunctionError).toBeTypeOf("function");
    expect(v6.requiredFeedPairs).toBeTypeOf("function");
    expect(v6.probeFeedReachability).toBeTypeOf("function");
    expect(v6.REV_METADATA_ALLOW_SUCKER_DEPLOYMENT).toBe(1 << 2);
    expect(v6.REVLOANS_BURN_PERMISSION_ID).toBe(11);
  });
});
