import {
  BaseError,
  UserRejectedRequestError,
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  decodeErrorResult,
  encodeErrorResult,
  keccak256,
  parseAbi,
  slice,
} from "viem";
import { describe, expect, test } from "vitest";
import { jbMultiTerminalAbi } from "../generated/juicebox.js";
import {
  PAY_MAX_SLIPPAGE_BPS,
  decodePayFailure,
  payRetrySlippageBps,
  type PayFailure,
} from "./executionErrors.js";
import { PAY_DEFAULT_SLIPPAGE_BPS } from "./pay.js";
import { slippageFloor } from "./cashOut.js";
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
/** What viem's decoder makes of revert data: the error typed against its ABI item. */
const typed = (errorName: string, args: readonly unknown[]) =>
  decodeErrorResult({ abi, data: revert(errorName, args) });
/** A viem simulation error for revert data. */
const simulated = (data: `0x${string}`) =>
  new ContractFunctionExecutionError(
    new ContractFunctionRevertedError({ abi: [], data, functionName: "pay" }),
    { abi: [], functionName: "pay" },
  );
const errorString = (reason: string) =>
  encodeErrorResult({
    abi: parseAbi(["error Error(string)"]),
    errorName: "Error",
    args: [reason],
  });

describe("decodePayFailure", () => {
  test.each([
    ["JBMultiTerminal_UnderMin", "TERMINAL_UNDER_MIN", "minimum"],
    [
      "JBBuybackHook_SpecifiedSlippageExceeded",
      "BUYBACK_SLIPPAGE_EXCEEDED",
      "minimum",
    ],
    ["JBBuybackHook_DerivedFloorNotMet", "BUYBACK_DERIVED_FLOOR_NOT_MET"],
    ["JBRouterTerminal_SlippageExceeded", "ROUTER_SLIPPAGE_EXCEEDED"],
  ] as const)(
    "%s carries what settled, the minimum it missed, and only a setting that fixes it",
    (name, reason, adjustable?: "minimum") => {
      const failure = decodePayFailure(revert(name, [7_000n, 9_900n]));
      expect(failure).toEqual({
        reason,
        received: 7_000n,
        minimum: 9_900n,
        zeroFill: false,
        ...(adjustable ? { adjustable } : {}),
        message: expect.stringMatching(/^[A-Z][^.]*\.$/),
      });
      // The message suggests lowering the minimum only when that is the fix,
      // and never a slippage setting the router may not read.
      expect(failure!.message.includes("lower your minimum")).toBe(
        !!adjustable,
      );
      expect(failure!.message).not.toMatch(/slippage/i);
    },
  );

  test("a buyback shortfall that settles nothing does not claim the whole payment returns nothing", () => {
    // The hook checks only the part it swaps; the rest can still mint.
    const failure = decodePayFailure(
      revert("JBBuybackHook_SpecifiedSlippageExceeded", [0n, 1n]),
    );
    expect(failure).toMatchObject({ received: 0n, zeroFill: true });
    expect(failure).not.toHaveProperty("adjustable");
    expect(failure!.message).not.toMatch(/no tokens|nothing|minimum|slippage/);
  });

  test.each([
    ["JBMultiTerminal_UnderMin", "TERMINAL_UNDER_MIN"],
    ["JBRouterTerminal_SlippageExceeded", "ROUTER_SLIPPAGE_EXCEEDED"],
  ])("%s that settles nothing suggests no setting", (name, reason) => {
    const failure = decodePayFailure(revert(name, [0n, 9_900n]));
    expect(failure).toEqual({
      reason,
      received: 0n,
      minimum: 9_900n,
      zeroFill: true,
      message: expect.stringMatching(/^[A-Z][^.]*\.$/),
    });
    expect(failure!.message).toMatch(/no tokens|nothing/);
    expect(failure!.message).not.toMatch(/minimum|slippage|try again/i);
  });

  test("a terminal shortfall that settles nothing says the payment returns no tokens", () => {
    expect(
      decodePayFailure(revert("JBMultiTerminal_UnderMin", [0n, 1n]))?.message,
    ).toBe("This payment would return no tokens.");
  });

  test.each([
    "JBMultiTerminal_UnderMin",
    "JBBuybackHook_SpecifiedSlippageExceeded",
    "JBBuybackHook_DerivedFloorNotMet",
    "JBRouterTerminal_SlippageExceeded",
  ])("%s at or above its minimum is not that revert", (name) => {
    for (const args of [
      [9_900n, 9_900n],
      [9_901n, 9_900n],
      [0n, 0n],
    ] as const) {
      expect(decodePayFailure(revert(name, args))).toBeNull();
      expect(decodePayFailure({ cause: typed(name, args) })).toBeNull();
    }
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
    for (const failure of [
      decodePayFailure(revert(name, args)),
      decodePayFailure({ cause: typed(name, args) }),
    ]) {
      expect(failure).toEqual({
        reason,
        message: expect.stringMatching(/^[A-Z][^.]*\.$/),
      });
    }
  });

  test("permit failures ask for a new signature, Permit2 failures for a Permit2 approval", () => {
    const message = (name: string, args: readonly unknown[]) =>
      decodePayFailure(revert(name, args))?.message;
    for (const name of [
      "JBMultiTerminal_PermitAllowanceNotEnough",
      "JBRouterTerminal_PermitAllowanceNotEnough",
      "JBRouterTerminalRegistry_PermitAllowanceNotEnough",
      "JBRouterTerminalGateway_PermitAllowanceNotEnough",
    ]) {
      expect(message(name, [2n, 1n])).toMatch(/permit.*sign it again/);
    }
    expect(message("InsufficientAllowance", [2n])).toMatch(/Permit2 allowance/);
    expect(message("AllowanceExpired", [1n])).toMatch(/Permit2 approval/);
    expect(message("ERC20InsufficientAllowance", [token, 1n, 2n])).toMatch(
      /token approval/,
    );
  });

  test("reads the revert data from a viem simulation error", () => {
    const data = revert("JBBuybackHook_SpecifiedSlippageExceeded", [1n, 2n]);
    expect(decodePayFailure(simulated(data))).toMatchObject({
      reason: "BUYBACK_SLIPPAGE_EXCEEDED",
      received: 1n,
      minimum: 2n,
      adjustable: "minimum",
    });
  });

  test("reads revert data a wallet nests in its error", () => {
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
    expect(
      decodePayFailure({
        message: `eth_call failed for ${revert("JBBuybackHook_SpecifiedSlippageExceeded", [1n, 2n])}`,
        cause: { data },
      }),
    ).toMatchObject({ reason: "TERMINAL_UNDER_MIN" });
  });

  test("text is never a revert, whatever it quotes", () => {
    const underMin = revert("JBMultiTerminal_UnderMin", [3n, 4n]);
    for (const error of [
      "execution reverted: JBTerminalStore_RulesetPaymentPaused",
      "execution reverted: jbmultiterminal_undermin",
      new Error("JBMultiTerminal_UnderMin"),
      new Error(underMin),
      { message: `execution reverted: ${underMin}` },
      { shortMessage: `reverted with the following reason:\n${underMin}` },
      new BaseError("reverted", {
        details: "reverted with signature 0xe2d708a9",
      }),
      {
        shortMessage: "User rejected the request.",
        details: `Request body: {\n"to":"0xe2d708a900000000000000000000000000000000",\n"data":"${underMin}"}`,
      },
      {
        shortMessage: "Execution reverted for an unknown reason.",
        message: `Raw Call Arguments:\n  to:    ${token}\n  data:  ${underMin}`,
      },
    ]) {
      expect(decodePayFailure(error)).toBeNull();
      expect(classifyCashOutExecutionError(error)).toBeNull();
    }
  });

  test("an Error(string) reason that spells a known revert is not one", () => {
    for (const reason of [
      "JBMultiTerminal_UnderMin",
      "0x6b2bb382",
      revert("JBMultiTerminal_UnderMin", [3n, 4n]),
    ]) {
      const error = simulated(errorString(reason));
      expect(decodePayFailure(error)).toBeNull();
      expect(classifyCashOutExecutionError(error)).toBeNull();
    }
  });

  test("revert data must be a known selector and exactly its arguments", () => {
    const underMin = revert("JBMultiTerminal_UnderMin", [3n, 4n]);
    for (const value of [
      "0x6b2bb382",
      "0x42b9988e",
      underMin.slice(0, -64),
      `${underMin}${"0".repeat(64)}`,
      `${underMin}00`,
      "0xe2d708a900000000000000000000000000000000",
      "0x08c379a0",
      // An address word with nonzero padding.
      `0xecb6c1d6${"ff".repeat(12)}${"77".repeat(20)}`,
      `0xfb8f41b2${"01".repeat(12)}${"77".repeat(20)}${revert("JBMultiTerminal_UnderMin", [1n, 2n]).slice(10)}`,
    ]) {
      expect(decodePayFailure(value)).toBeNull();
      expect(decodePayFailure({ cause: { data: value } })).toBeNull();
    }
  });

  test("revert data of any length, even short of a selector, rules out a typed copy", () => {
    const data = typed("JBMultiTerminal_UnderMin", [935n, 1_000n]);
    expect(decodePayFailure({ data })).toMatchObject({
      adjustable: "minimum",
    });
    for (const raw of ["0x12", "0x1234", "0x123456", "0xdeadbeef"]) {
      expect(decodePayFailure({ raw, data })).toBeNull();
      expect(classifyCashOutExecutionError({ raw, data })).toBeNull();
    }
  });

  test("a viem error typed from noncanonical revert data is not that revert", () => {
    const wrapped = (data: `0x${string}`) =>
      new ContractFunctionExecutionError(
        new ContractFunctionRevertedError({ abi, data, functionName: "pay" }),
        { abi, functionName: "pay" },
      );
    const underMin = revert("JBMultiTerminal_UnderMin", [935n, 1_000n]);
    expect(decodePayFailure(wrapped(underMin))).toMatchObject({
      reason: "TERMINAL_UNDER_MIN",
      adjustable: "minimum",
    });
    for (const data of [
      `${underMin}${"0".repeat(64)}`,
      `${underMin}00`,
      `${underMin}${"0".repeat(62)}`,
      `0xecb6c1d6${"ff".repeat(12)}${"77".repeat(20)}`,
    ] as const) {
      expect(decodePayFailure(wrapped(data))).toBeNull();
      expect(classifyCashOutExecutionError(wrapped(data))).toBeNull();
    }
  });

  test("the router gateway's RouteFailed names the reason its hash fingerprints, without amounts", () => {
    const gateway = parseAbi([
      "error JBRouterTerminalGateway_RouteFailed(bytes32 errorHash)",
    ]);
    // The gateway hashes only the first four bytes of the inner revert.
    const routeFailed = (inner: `0x${string}`) =>
      encodeErrorResult({
        abi: gateway,
        errorName: "JBRouterTerminalGateway_RouteFailed",
        args: [keccak256(slice(inner, 0, 4))],
      });
    for (const [name, args, reason, message] of [
      [
        "JBMultiTerminal_UnderMin",
        [3n, 4n],
        "TERMINAL_UNDER_MIN",
        /^This payment would get fewer tokens than its minimum, so try again\.$/,
      ],
      [
        "JBBuybackHook_SpecifiedSlippageExceeded",
        [3n, 4n],
        "BUYBACK_SLIPPAGE_EXCEEDED",
        /^This payment would get fewer tokens than its minimum, so try again\.$/,
      ],
      [
        "JBRouterTerminal_SlippageExceeded",
        [3n, 4n],
        "ROUTER_SLIPPAGE_EXCEEDED",
        /converting/,
      ],
      [
        "JBMultiTerminal_TokenNotAccepted",
        [token],
        "TOKEN_NOT_ACCEPTED",
        /does not accept/,
      ],
    ] as const) {
      const failure = decodePayFailure(
        simulated(routeFailed(revert(name, args))),
      );
      expect(failure).toEqual({ reason, message: expect.any(String) });
      expect(failure!.message).toMatch(message);
      expect(payRetrySlippageBps(failure, 100n)).toBeNull();
    }
    // Unknown inner errors, gas exhaustion's empty hash and malformed words are not known.
    for (const data of [
      routeFailed("0xdeadbeef"),
      encodeErrorResult({
        abi: gateway,
        errorName: "JBRouterTerminalGateway_RouteFailed",
        args: [keccak256("0x")],
      }),
      `${routeFailed(revert("JBMultiTerminal_UnderMin", [3n, 4n]))}00`,
    ] as const) {
      expect(decodePayFailure(data)).toBeNull();
    }
    expect(
      classifyCashOutExecutionError(
        routeFailed(revert("JBMultiTerminal_UnderMin", [3n, 4n])),
      ),
    ).toEqual({ code: "TERMINAL_UNDER_MIN", selector: "0x6b2bb382" });
  });

  test("a typed error keeps its amounts", () => {
    expect(
      decodePayFailure({ cause: typed("JBMultiTerminal_UnderMin", [5n, 6n]) }),
    ).toMatchObject({
      reason: "TERMINAL_UNDER_MIN",
      received: 5n,
      minimum: 6n,
      adjustable: "minimum",
    });
  });

  test("a decoded-looking error counts only when typed against the ABI item with valid arguments", () => {
    const valid = typed("JBMultiTerminal_UnderMin", [5n, 6n]);
    const url = "https://example.com/claim";
    for (const data of [
      // No ABI item: a name and arguments anyone can write.
      { errorName: valid.errorName, args: [url, url] },
      { errorName: valid.errorName, args: [5n, 6n] },
      // ABI inputs with holes, whose types were never given.
      {
        ...valid,
        abiItem: { ...valid.abiItem, inputs: new Array(2) },
      },
      {
        ...valid,
        abiItem: { ...valid.abiItem, inputs: [valid.abiItem.inputs[0], ,] },
      },
      // The name disagrees with the ABI item, or the item is another error.
      { ...valid, errorName: "JBMultiTerminal_UnderMinimum" },
      { ...valid, abiItem: { ...valid.abiItem, name: "Other" } },
      { ...valid, abiItem: { ...valid.abiItem, type: "function" } },
      {
        ...valid,
        abiItem: {
          ...valid.abiItem,
          inputs: valid.abiItem.inputs.map((input) => ({
            ...input,
            type: "string",
          })),
        },
        args: [url, url],
      },
      // Arguments that are not two uint256 values.
      ...[
        [url, url],
        [5n],
        [5n, 6n, 7n],
        [-1n, 6n],
        [5n, 2n ** 256n],
        [5, 6],
        undefined,
      ].map((args) => ({ ...valid, args })),
      // An address argument must be an address.
      {
        ...typed("ERC20InsufficientAllowance", [token, 1n, 2n]),
        args: [url, 1n, 2n],
      },
    ]) {
      expect(decodePayFailure({ data })).toBeNull();
      expect(classifyCashOutExecutionError({ data })).toBeNull();
    }
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
    for (const memo of [
      "0xe2d708a9",
      "JBMultiTerminal_UnderMin",
      "Hello\n\n0x6b2bb382",
      revert("JBMultiTerminal_UnderMin", [3n, 4n]),
    ]) {
      expect(decodePayFailure(rejected(memo))).toBeNull();
      expect(classifyCashOutExecutionError(rejected(memo))).toBeNull();
    }
  });

  test("anything else is unknown", () => {
    expect(
      decodePayFailure(new Error("User rejected the request.")),
    ).toBeNull();
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
        typed("JBMultiTerminal_UnderMin", [3n, 4n]),
      ),
    ).toEqual({ code: "TERMINAL_UNDER_MIN", selector: "0x6b2bb382" });
    expect(
      classifyCashOutExecutionError(
        revert("JBTerminalStore_RulesetPaymentPaused", [5n, 9n]),
      ),
    ).toBeNull();
  });
});

describe("payRetrySlippageBps", () => {
  const message = "m";
  const shortfall = (received: bigint, minimum: bigint): PayFailure => ({
    reason: "TERMINAL_UNDER_MIN",
    received,
    minimum,
    zeroFill: received === 0n,
    adjustable: "minimum",
    message,
  });

  test("adds the shortfall to the tolerance, rounded up to a half percent", () => {
    expect(payRetrySlippageBps(shortfall(935n, 1_000n), 100n)).toBe(750n);
    expect(payRetrySlippageBps(shortfall(999n, 1_000n), 100n)).toBe(150n);
    expect(
      payRetrySlippageBps(
        decodePayFailure(
          revert("JBBuybackHook_SpecifiedSlippageExceeded", [999n, 1_000n]),
        ),
        100n,
      ),
    ).toBe(150n);
    expect(payRetrySlippageBps(shortfall(999n, 1_000n), 0n)).toBe(50n);
  });

  test("below the cap, the candidate floors the failed quote at or below what settled", () => {
    for (const quote of [1n, 7n, 1_000n, 123_456_789n, 10n ** 24n + 7n]) {
      for (const currentBps of [0n, 1n, 50n, 100n, 333n, 900n]) {
        const minimum = slippageFloor(quote, currentBps);
        for (const received of [1n, minimum / 2n, minimum - 1n]) {
          if (received <= 0n || received >= minimum) continue;
          const next = payRetrySlippageBps(
            shortfall(received, minimum),
            currentBps,
          );
          expect(next).not.toBeNull();
          if (next! < PAY_MAX_SLIPPAGE_BPS) {
            expect(slippageFloor(quote, next!)).toBeLessThanOrEqual(received);
          }
        }
      }
    }
  });

  test("reads the decoded failure end to end", () => {
    const failure = decodePayFailure(
      revert("JBMultiTerminal_UnderMin", [935n, 1_000n]),
    );
    expect(payRetrySlippageBps(failure, PAY_DEFAULT_SLIPPAGE_BPS)).toBe(750n);
  });

  test("stops at the 49.5% cap, and offers nothing more there", () => {
    expect(PAY_MAX_SLIPPAGE_BPS).toBe(4_950n);
    expect(payRetrySlippageBps(shortfall(1n, 1_000n), 100n)).toBe(4_950n);
    // 1,000 + 6,500 needed: capped.
    expect(payRetrySlippageBps(shortfall(350n, 1_000n), 1_000n)).toBe(4_950n);
    // Just under the cap: rounded up to it, never past it.
    expect(payRetrySlippageBps(shortfall(999n, 1_000n), 4_900n)).toBe(4_950n);
    // Below the cap, the shortfall is added as usual.
    expect(payRetrySlippageBps(shortfall(800n, 1_000n), 2_000n)).toBe(4_000n);
    expect(payRetrySlippageBps(shortfall(1n, 1_000n), 4_950n)).toBeNull();
    expect(payRetrySlippageBps(shortfall(999n, 1_000n), 5_000n)).toBeNull();
  });

  test("offers nothing a lower minimum cannot fix", () => {
    for (const name of [
      "JBBuybackHook_DerivedFloorNotMet",
      "JBRouterTerminal_SlippageExceeded",
    ]) {
      expect(
        payRetrySlippageBps(decodePayFailure(revert(name, [1n, 2n])), 100n),
      ).toBeNull();
    }
    expect(
      payRetrySlippageBps(
        decodePayFailure(revert("JBMultiTerminal_UnderMin", [0n, 2n])),
        100n,
      ),
    ).toBeNull();
    expect(payRetrySlippageBps(null, 100n)).toBeNull();
    const { adjustable: _, ...unadjustable } = shortfall(1n, 2n);
    expect(payRetrySlippageBps(unadjustable, 100n)).toBeNull();
    for (const failure of [
      shortfall(0n, 1_000n),
      shortfall(1_000n, 1_000n),
      shortfall(0 as unknown as bigint, 1_000n),
      { reason: "TERMINAL_UNDER_MIN", adjustable: "minimum", message } as const,
    ]) {
      expect(payRetrySlippageBps(failure, 100n)).toBeNull();
    }
    expect(payRetrySlippageBps(shortfall(1n, 2n), -1n)).toBeNull();
  });
});
