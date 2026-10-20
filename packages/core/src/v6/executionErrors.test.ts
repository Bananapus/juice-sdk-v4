import {
  BaseError,
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  encodeErrorResult,
  parseAbi,
} from "viem";
import { describe, expect, test } from "vitest";
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
  "error JBMultiTerminal_NoMsgValueAllowed(uint256 value)",
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
    ["JBMultiTerminal_NoMsgValueAllowed", [1n], "UNEXPECTED_ETH"],
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
