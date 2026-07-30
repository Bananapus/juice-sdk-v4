import { describe, expect, test } from "vitest";
import * as sdk from "./index.js";
import * as v6 from "./v6/index.js";

describe("published core SDK surfaces", () => {
  test("exports the framework-free utility and V6 transaction boundaries", () => {
    expect(sdk.getTokenAToBQuote).toBeTypeOf("function");
    expect(sdk.getProjectTerminalStore).toBeTypeOf("function");
    expect(sdk.downsampleTimeSeries).toBeTypeOf("function");
    expect(sdk.requestBendystraw).toBeTypeOf("function");
    expect(sdk.bendystrawProjectRefsFilter).toBeTypeOf("function");
    expect(sdk.bendystrawProjectRefsFilters).toBeTypeOf("function");
    expect(v6.buildDeployRevnetTx).toBeTypeOf("function");
    expect(v6.buildAutoIssueTx).toBeTypeOf("function");
  });
});
