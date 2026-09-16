import { describe, expect, test } from "vitest";
import * as core from "./core/index";
import * as wagmi from "./wagmi/index";
import * as react from "./react/index";

describe("published connect SDK surface", () => {
  test("exports the controller, the passkey option, the callback helper, the connector and the modal", () => {
    expect(Object.keys(core).sort()).toEqual([
      "RestClientError",
      "assertReviewedOperation",
      "completeCenterCallback",
      "createCenterWalletClient",
      "createConnectController",
      "deliverCenterCallback",
      "ownerOperationSignature",
      "ownerOperationSigning",
      "passkeyOption",
      "userOperationMaximumCost",
    ]);
    expect(Object.keys(wagmi)).toEqual(["centerAccountConnector"]);
    expect(Object.keys(react).sort()).toEqual([
      "JBConnectModal",
      "connectModalCss",
      "passkeyLabel",
    ]);
    for (const value of [
      ...Object.values(core),
      ...Object.values(wagmi),
      react.JBConnectModal,
    ])
      expect(value).toBeTypeOf("function");
  });
});
