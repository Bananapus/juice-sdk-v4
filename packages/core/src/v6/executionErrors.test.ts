import {
  BaseError,
  UserRejectedRequestError,
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  encodeErrorResult,
  parseAbi,
} from "viem";
import { describe, expect, test } from "vitest";
import { jbMultiTerminalAbi } from "../generated/juicebox.js";
import { decodePayFailure } from "./executionErrors.js";
import { classifyCashOutExecutionError } from "./cashOut.js";

// The V6 contracts' own signatures: a wrong selector in the SDK table fails here.
const abi = parseAbi([
  "error JBMultiTerminal_UnderMin(uint256 value, uint256 min)",
  "error JBBuybackHook_SpecifiedSlippageExceeded(uint256 amount, uint256 minimum)",
  "error JBBuybackHook_DerivedFloorNotMet(uint256 amount, uint256 minimum)",
  "error JBRouterTerminal_SlippageExceeded(uint256 amountOut, uint256 minAmountOut)",
  "error JBBuybackHook_InsufficientPayAmount(uint256 swapAmount, uint256 totalPaid)",
  "error JBRouterTerminal_NoRouteFound(uint256 projectId, address tokenIn)",
  "error JBRouterTerminal_NoPoolFound(address tokenIn, address tokenOut)",
  "error JBMultiTerminal_TokenNotAccepted(address token)",
  "error JBTerminalStore_RulesetPaymentPaused(uint256 projectId, uint256 rulesetId)",
  "error JBTerminalStore_RulesetNotFound(uint256 projectId)",
  "error JBMultiTerminal_PermitAllowanceNotEnough(uint256 amount, uint256 allowance)",
  "error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)",
  "error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)",
  "error InsufficientAllowance(uint256 amount)",
  "error AllowanceExpired(uint256 deadline)",
  "error JBMultiTerminal_NoMsgValueAllowed(uint256 value)",
  "error JBRouterTerminal_PermitAllowanceNotEnough(uint256 amount, uint256 allowance)",
  "error JBRouterTerminalRegistry_PermitAllowanceNotEnough(uint256 amount, uint256 allowanceAmount)",
  "error JBRouterTerminalGateway_PermitAllowanceNotEnough(uint256 amount, uint256 allowance)",
  "error JBRouterTerminal_NoMsgValueAllowed(uint256 value)",
  "error JBRouterTerminalRegistry_NoMsgValueAllowed(uint256 value)",
  "error JBRouterTerminalGateway_NoMsgValueAllowed(uint256 value)",
  "error JB721TiersHookStore_InsufficientSupplyRemaining(uint256 tierId)",
  "error JB721TiersHookStore_TierRemoved(uint256 tierId)",
  "error JB721TiersHookStore_UnrecognizedTier(uint256 tierId)",
  "error JB721TiersHookStore_PriceExceedsAmount(uint256 price, uint256 leftoverAmount)",
  "error JB721TiersHook_Overspending(uint256 leftoverAmount)",
]);
const token = "0x7777777777777777777777777777777777777777" as const;
const revert = (errorName: string, args: readonly unknown[]) =>
  encodeErrorResult({ abi, errorName, args } as never);

describe("decodePayFailure", () => {
  test.each([
    ["JBMultiTerminal_UnderMin", "TERMINAL_UNDER_MIN"],
    ["JBBuybackHook_SpecifiedSlippageExceeded", "BUYBACK_SLIPPAGE_EXCEEDED"],
    ["JBBuybackHook_DerivedFloorNotMet", "BUYBACK_DERIVED_FLOOR_NOT_MET"],
    ["JBRouterTerminal_SlippageExceeded", "ROUTER_SLIPPAGE_EXCEEDED"],
  ])("%s carries what settled and the minimum it missed", (name, reason) => {
    const failure = decodePayFailure(revert(name, [7_000n, 9_900n]));
    expect(failure).toMatchObject({
      reason,
      received: 7_000n,
      minimum: 9_900n,
    });
    expect(failure!.message).toMatch(/^[A-Z][^.]*\.$/);
  });

  test.each([
    [
      "JBBuybackHook_InsufficientPayAmount",
      [2n, 1n],
      "BUYBACK_SWAP_AMOUNT_TOO_HIGH",
    ],
    ["JBRouterTerminal_NoRouteFound", [5n, token], "ROUTER_NO_ROUTE"],
    ["JBRouterTerminal_NoPoolFound", [token, token], "ROUTER_NO_ROUTE"],
    ["JBMultiTerminal_TokenNotAccepted", [token], "TOKEN_NOT_ACCEPTED"],
    ["JBTerminalStore_RulesetPaymentPaused", [5n, 9n], "PAYMENTS_PAUSED"],
    ["JBTerminalStore_RulesetNotFound", [5n], "NO_RULESET"],
    ["JBMultiTerminal_PermitAllowanceNotEnough", [2n, 1n], "ALLOWANCE_TOO_LOW"],
    ["ERC20InsufficientAllowance", [token, 1n, 2n], "ALLOWANCE_TOO_LOW"],
    ["ERC20InsufficientBalance", [token, 1n, 2n], "BALANCE_TOO_LOW"],
    ["InsufficientAllowance", [2n], "ALLOWANCE_TOO_LOW"],
    ["AllowanceExpired", [1n], "ALLOWANCE_EXPIRED"],
    ["JBMultiTerminal_NoMsgValueAllowed", [1n], "UNEXPECTED_ETH"],
    [
      "JBRouterTerminal_PermitAllowanceNotEnough",
      [2n, 1n],
      "ALLOWANCE_TOO_LOW",
    ],
    [
      "JBRouterTerminalRegistry_PermitAllowanceNotEnough",
      [2n, 1n],
      "ALLOWANCE_TOO_LOW",
    ],
    [
      "JBRouterTerminalGateway_PermitAllowanceNotEnough",
      [2n, 1n],
      "ALLOWANCE_TOO_LOW",
    ],
    ["JBRouterTerminal_NoMsgValueAllowed", [1n], "UNEXPECTED_ETH"],
    ["JBRouterTerminalRegistry_NoMsgValueAllowed", [1n], "UNEXPECTED_ETH"],
    ["JBRouterTerminalGateway_NoMsgValueAllowed", [1n], "UNEXPECTED_ETH"],
    ["JB721TiersHookStore_InsufficientSupplyRemaining", [3n], "NFT_SOLD_OUT"],
    ["JB721TiersHookStore_TierRemoved", [3n], "NFT_UNAVAILABLE"],
    ["JB721TiersHookStore_UnrecognizedTier", [3n], "NFT_UNAVAILABLE"],
    [
      "JB721TiersHookStore_PriceExceedsAmount",
      [2n, 1n],
      "NFT_PRICE_ABOVE_PAYMENT",
    ],
    ["JB721TiersHook_Overspending", [1n], "NFT_OVERSPENDING"],
  ] as const)("%s has no minimum to lower", (name, args, reason) => {
    const failure = decodePayFailure(revert(name, args));
    expect(failure?.reason).toBe(reason);
    expect(failure).not.toHaveProperty("minimum");
    expect(failure!.message).toMatch(/^[A-Z][^.]*\.$/);
  });

  test("reads the revert data from a viem simulation error", () => {
    const data = revert("JBBuybackHook_SpecifiedSlippageExceeded", [1n, 2n]);
    const error = new ContractFunctionExecutionError(
      new ContractFunctionRevertedError({ abi: [], data, functionName: "pay" }),
      { abi: [], functionName: "pay" },
    );
    expect(decodePayFailure(error)).toMatchObject({
      reason: "BUYBACK_SLIPPAGE_EXCEEDED",
      received: 1n,
      minimum: 2n,
    });
  });

  test("reads revert data a wallet nests in its error, after unrelated hex", () => {
    const data = revert("JBMultiTerminal_UnderMin", [3n, 4n]);
    expect(
      decodePayFailure({
        message: "execution reverted for 0xdeadbeef",
        error: { data },
      }),
    ).toMatchObject({
      reason: "TERMINAL_UNDER_MIN",
      received: 3n,
      minimum: 4n,
    });
  });

  test("names the reason from a selector or error name alone, without amounts", () => {
    expect(
      decodePayFailure(
        new BaseError("reverted", {
          details: "reverted with signature 0xe2d708a9",
        }),
      ),
    ).toEqual({
      reason: "BUYBACK_SLIPPAGE_EXCEEDED",
      message: expect.any(String),
    });
    expect(
      decodePayFailure({ cause: { errorName: "JBMultiTerminal_UnderMin" } }),
    ).toEqual({ reason: "TERMINAL_UNDER_MIN", message: expect.any(String) });
  });

  test("hex the request quotes is not a revert", () => {
    const request = revert("JBBuybackHook_SpecifiedSlippageExceeded", [1n, 2n]);
    // A rejected request whose address and calldata start with a known selector.
    expect(
      decodePayFailure({
        shortMessage: "User rejected the request.",
        details: `Request body: {"to":"0xe2d708a900000000000000000000000000000000","data":"${request}"}`,
      }),
    ).toBeNull();
    // The revert the error carries wins over revert-shaped hex in its text.
    expect(
      decodePayFailure({
        message: `eth_call failed for ${request}`,
        cause: { data: revert("JBMultiTerminal_UnderMin", [3n, 4n]) },
      }),
    ).toMatchObject({
      reason: "TERMINAL_UNDER_MIN",
      received: 3n,
      minimum: 4n,
    });
  });

  test("a decoded error keeps its amounts, and a bare selector or name in text still counts", () => {
    expect(
      decodePayFailure({
        cause: { errorName: "JBMultiTerminal_UnderMin", args: [5n, 6n] },
      }),
    ).toMatchObject({
      reason: "TERMINAL_UNDER_MIN",
      received: 5n,
      minimum: 6n,
    });
    expect(decodePayFailure("0x42b9988e")?.reason).toBe("NFT_OVERSPENDING");
    expect(
      decodePayFailure(
        "execution reverted: JBTerminalStore_RulesetPaymentPaused",
      )?.reason,
    ).toBe("PAYMENTS_PAUSED");
    expect(
      decodePayFailure("reverted: JBTerminalStore_RulesetPaymentPausedForever"),
    ).toBeNull();
  });

  test("a value that only starts with a selector is not a revert", () => {
    const address = "0xe2d708a900000000000000000000000000000000";
    expect(decodePayFailure(address)).toBeNull();
    expect(decodePayFailure({ cause: { data: address } })).toBeNull();
    expect(
      decodePayFailure(`${revert("JBMultiTerminal_UnderMin", [3n, 4n])}00`),
    ).toBeNull();
    expect(
      classifyCashOutExecutionError({ error: { data: address } }),
    ).toBeNull();
  });

  test("revert data quoted in a message decodes, but the request viem quotes does not", () => {
    const underMin = revert("JBMultiTerminal_UnderMin", [3n, 4n]);
    expect(
      decodePayFailure({ message: `execution reverted: ${underMin}` }),
    ).toMatchObject({
      reason: "TERMINAL_UNDER_MIN",
      received: 3n,
      minimum: 4n,
    });
    expect(
      classifyCashOutExecutionError({
        message: `execution reverted: ${underMin}`,
      }),
    ).toEqual({ code: "TERMINAL_UNDER_MIN", selector: "0x6b2bb382" });
    expect(
      decodePayFailure({
        shortMessage: "Execution reverted for an unknown reason.",
        message: `Raw Call Arguments:\n  to:    ${token}\n  data:  ${underMin}`,
      }),
    ).toBeNull();
    expect(
      decodePayFailure("execution reverted: jbmultiterminal_undermin")?.reason,
    ).toBe("TERMINAL_UNDER_MIN");
  });

  test("a call's arguments that look like a revert are not one", () => {
    const rejected = (memo: string) =>
      new ContractFunctionExecutionError(
        new UserRejectedRequestError(new Error("rejected")),
        {
          abi: jbMultiTerminalAbi,
          functionName: "pay",
          args: [3n, token, 1_000n, token, 0n, memo, "0x"],
          contractAddress: token,
        },
      );
    expect(decodePayFailure(rejected("0xe2d708a9"))).toBeNull();
    expect(decodePayFailure(rejected("JBMultiTerminal_UnderMin"))).toBeNull();
    expect(classifyCashOutExecutionError(rejected("0x6b2bb382"))).toBeNull();
  });

  test("a decoded error's name matches in any case", () => {
    expect(
      classifyCashOutExecutionError({ errorName: "jbmultiterminal_undermin" }),
    ).toEqual({ code: "TERMINAL_UNDER_MIN", selector: "0x6b2bb382" });
  });

  test("anything else is unknown", () => {
    expect(
      decodePayFailure(new Error("User rejected the request.")),
    ).toBeNull();
    expect(decodePayFailure("0x08c379a0")).toBeNull();
    expect(decodePayFailure(undefined)).toBeNull();
    expect(decodePayFailure({})).toBeNull();
  });

  test("cash-out classification reads the same table, and only its two minimums", () => {
    const data = revert("JBMultiTerminal_UnderMin", [3n, 4n]);
    expect(classifyCashOutExecutionError({ error: { data } })).toEqual({
      code: "TERMINAL_UNDER_MIN",
      selector: "0x6b2bb382",
    });
    expect(
      classifyCashOutExecutionError(
        revert("JBTerminalStore_RulesetPaymentPaused", [5n, 9n]),
      ),
    ).toBeNull();
  });
});
