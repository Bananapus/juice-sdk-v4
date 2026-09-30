// The transaction review's precise decoders. Every decoder must interpret real
// builder output exactly, refuse ambiguity rather than guess, and return null
// (the raw view) for anything it can't fully account for.
import {
  encodeAbiParameters,
  encodeFunctionData,
  erc20Abi,
  getAddress,
  parseAbi,
  zeroAddress,
  type Abi,
  type Address,
  type Hex,
} from "viem";
import { describe, expect, it } from "vitest";
import { USDC_ADDRESSES } from "../constants.js";
import {
  jbBuybackHookAbi,
  jbContractAddress,
  jbContractAddressHistory,
  jbControllerAbi,
  jbDirectoryAbi,
  jbMultiTerminalAbi,
  jbRouterTerminalGatewayAbi,
} from "../generated/juicebox.js";
import { createHookMetadata, hookMetadataId } from "../utils/hook.js";
import {
  build721CashOutMetadata,
  buildBuybackCashOutMetadata,
} from "../v6/cashOut.js";
import {
  addPermit2SignatureToDirectPaySwap,
  buildDirectPaySwapTx,
  NATIVE_SWAP_BY_CHAIN,
  type DirectPaySwapQuote,
} from "../v6/directPay.js";
import { build721PayMetadata } from "../v6/pay.js";
import { stickyDistributorAddress } from "../v6/sticky.js";
import {
  buildUniswapV4ExactInputSwapTx,
  type UniswapV4PoolKey,
} from "../v6/uniswapV4.js";
import {
  UNISWAP_PERMIT2_ADDRESS,
  UNISWAP_V4_UNIVERSAL_ROUTER_ADDRESSES,
} from "../v6/uniswapV4Deployments.js";
import {
  describeJBHookMetadata,
  describePermissionsData,
  describeSafeInitializer,
  describeSafeInnerCall,
  describeSplitGroups,
  describeSuckerClaim,
  describeUniversalRouterExecute,
  describeV4UnlockData,
  functionFromCall,
  knownAddressName,
  namedValue,
  nativeValue,
  readableValue,
  reviewDescription,
  type PrettyStep,
} from "./decode.js";

const BASE = 8453;
const TARGET = "0x4444444444444444444444444444444444444444" as Address;
const HOOK = "0x5555555555555555555555555555555555555555" as Address;
const ALICE = "0x1111111111111111111111111111111111111111" as Address;
const BOB = "0x2222222222222222222222222222222222222222" as Address;
const TOKEN = "0x3333333333333333333333333333333333333333" as Address;

const v6 = jbContractAddress["6"] as unknown as Record<
  string,
  Record<number, Address>
>;
const history = jbContractAddressHistory["6"] as unknown as Record<
  string,
  Record<string, Record<number, Address>>
>;
const CONTROLLER = v6.JBController[BASE];
const TERMINAL = v6.JBMultiTerminal[BASE];
const GATEWAY = v6.JBRouterTerminalGateway[BASE];
const PROJECTS = v6.JBProjects[BASE];
const DIRECTORY = v6.JBDirectory[BASE];
const BUYBACK_HOOK = v6.JBBuybackHook[BASE];
const PREVIOUS_HOOK = history.JBBuybackHook.previous[BASE];
const V1_HOOK = history.JBBuybackHook.v1[BASE];
const PREVIOUS_ROUTER = history.JBRouterTerminal.previous[BASE];
const TERMINAL_STORE = v6.JBTerminalStore[BASE];
const USDC = USDC_ADDRESSES[BASE];

const rowsOf = (steps: PrettyStep[] | null) =>
  (steps ?? []).flatMap((step) =>
    step.rows.map(([label, value]) => `${label}=${value}`),
  );

describe("known addresses", () => {
  it("names deployments, Uniswap, USDC and every generation of a contract", () => {
    expect(knownAddressName(BASE, CONTROLLER)).toBe("JBController");
    expect(
      knownAddressName(BASE, CONTROLLER.toUpperCase().replace("0X", "0x")),
    ).toBe("JBController");
    expect(knownAddressName(BASE, BUYBACK_HOOK)).toBe(
      "JBBuybackHook (current)",
    );
    expect(knownAddressName(BASE, PREVIOUS_HOOK)).toBe(
      "JBBuybackHook (previous)",
    );
    expect(knownAddressName(BASE, V1_HOOK)).toBe("JBBuybackHook (v1)");
    expect(knownAddressName(BASE, PREVIOUS_ROUTER)).toBe(
      "JBRouterTerminal (previous)",
    );
    expect(knownAddressName(BASE, GATEWAY)).toBe("JBRouterTerminalGateway");
    expect(knownAddressName(BASE, USDC)).toBe("USDC");
    expect(
      knownAddressName(BASE, UNISWAP_V4_UNIVERSAL_ROUTER_ADDRESSES[BASE]),
    ).toBe("Uniswap Universal Router");
    // Permit2 has one address on every chain, OP Sepolia included.
    expect(knownAddressName(11155420, UNISWAP_PERMIT2_ADDRESS)).toBe("Permit2");
  });

  it("names an address only on its own chain and refuses non-addresses", () => {
    expect(knownAddressName(BASE, ALICE)).toBeNull();
    expect(knownAddressName(999, CONTROLLER)).toBeNull();
    expect(knownAddressName(BASE, "0x1234")).toBeNull();
    expect(knownAddressName(BASE, 7n)).toBeNull();
  });
});

describe("argument values", () => {
  it("labels known addresses and shortens long bytes", () => {
    expect(readableValue("address", CONTROLLER, BASE)).toBe(
      `JBController | ${CONTROLLER}`,
    );
    expect(readableValue("address", ALICE, BASE)).toBe(ALICE);
    expect(readableValue("address", zeroAddress, BASE)).toBe(zeroAddress);
    const long = `0x${"ab".repeat(40)}`;
    expect(readableValue("bytes", long, BASE)).toBe(
      `${long.slice(0, 22)}…${long.slice(-12)}`,
    );
    expect(readableValue("bytes32", "0x1234", BASE)).toBe("0x1234");
    expect(readableValue("string", "memo", BASE)).toBe("memo");
  });

  it("renders scalars, empty values and structures", () => {
    expect(readableValue("uint256", 12n, BASE)).toBe("12");
    expect(readableValue("bool", true, BASE)).toBe("true");
    expect(readableValue("uint8", 3, BASE)).toBe("3");
    expect(readableValue("uint256", undefined, BASE)).toBe("—");
    expect(readableValue("uint256", null, BASE)).toBe("—");
    expect(readableValue("tuple", { amount: 5n }, BASE)).toBe(
      '{\n  "amount": "5"\n}',
    );
    const loop: Record<string, unknown> = {};
    loop.self = loop;
    expect(readableValue("tuple", loop, BASE)).toBe("[object Object]");
    expect(readableValue("function", Symbol("x"), BASE)).toBe("Symbol(x)");
  });

  it("reads a tuple component by position or name", () => {
    expect(namedValue([1n, 2n], "amount", 1)).toBe(2n);
    expect(namedValue({ amount: 3n }, "amount", 0)).toBe(3n);
    expect(namedValue({ 0: 4n }, "", 0)).toBe(4n);
    expect(namedValue(5n, "amount", 0)).toBeUndefined();
    expect(namedValue(null, "amount", 0)).toBeUndefined();
  });

  it("shows native value in ETH and wei", () => {
    expect(nativeValue()).toBe("0 ETH | 0 wei");
    expect(nativeValue(1_500_000_000_000_000_000n)).toBe(
      "1.5 ETH | 1500000000000000000 wei",
    );
  });
});

describe("the reviewed function", () => {
  const abi = parseAbi([
    "function pay(uint256 projectId)",
    "function pay(uint256 projectId, address beneficiary)",
    "function burn(uint256 amount)",
    "function sync()",
  ]);
  const payOne = encodeFunctionData({
    abi,
    functionName: "pay",
    args: [1n],
  });
  const payTwo = encodeFunctionData({
    abi,
    functionName: "pay",
    args: [1n, ALICE],
  });

  it("matches the overload whose selector and arguments the calldata carries", () => {
    expect(
      functionFromCall({ abi, functionName: "pay", args: [1n], data: payOne }),
    ).toBe(abi[0]);
    expect(
      functionFromCall({
        abi,
        functionName: "pay",
        args: [1n, ALICE],
        data: payTwo,
      }),
    ).toBe(abi[1]);
    expect(
      functionFromCall({
        abi,
        functionName: "pay",
        args: [1n, ALICE],
        data: payTwo.toUpperCase().replace("0X", "0x") as Hex,
      }),
    ).toBe(abi[1]);
    const sync = encodeFunctionData({ abi, functionName: "sync" });
    expect(functionFromCall({ abi, functionName: "sync", data: sync })).toBe(
      abi[3],
    );
  });

  it("never matches by name alone", () => {
    // Calldata shorter than a selector, or another function's selector, is not this call.
    expect(
      functionFromCall({ abi, functionName: "pay", args: [1n], data: "0x" }),
    ).toBeNull();
    expect(
      functionFromCall({ abi, functionName: "burn", args: [1n], data: payOne }),
    ).toBeNull();
    expect(functionFromCall({ abi, args: [1n], data: payOne })).toBeNull();
    expect(
      functionFromCall({ functionName: "pay", args: [1n], data: payOne }),
    ).toBeNull();
  });

  it("never renders arguments the calldata does not carry", () => {
    // The dialog shows `args`; a raw review's `data` is what the wallet signs.
    expect(
      functionFromCall({ abi, functionName: "pay", args: [2n], data: payOne }),
    ).toBeNull();
    expect(
      functionFromCall({
        abi,
        functionName: "pay",
        args: [1n],
        data: `${payOne}00`,
      }),
    ).toBeNull();
    expect(
      functionFromCall({ abi, functionName: "pay", data: payOne }),
    ).toBeNull();
    expect(
      functionFromCall({
        abi,
        functionName: "pay",
        args: ["not a number"],
        data: payOne,
      }),
    ).toBeNull();
  });
});

describe("the review description", () => {
  const call = { chainId: BASE, to: TARGET, data: "0x" as Hex };

  it("keeps a caller's description and falls back when it is blank", () => {
    expect(
      reviewDescription({ calls: [call], description: "  Pay project 4.\n" }),
    ).toBe("Pay project 4.");
    for (const description of [undefined, "", " \n "]) {
      expect(reviewDescription({ calls: [call], description })).toBe(
        "This is the exact destination, native value, and calldata the app will ask your wallet to send. Your wallet shows the gas limit and network fees before you send.",
      );
    }
  });

  it("says who sets gas, and what an authorization commits to", () => {
    expect(
      reviewDescription({
        calls: [
          { ...call, gas: 21_000n },
          { ...call, safeTxGas: 0n },
        ],
      }),
    ).toBe(
      "This is the exact destination, native value, and calldata the app will ask your wallet to send. Your wallet adds the nonce and network fees.",
    );
    expect(
      reviewDescription({
        calls: [call],
        kind: "authorization",
        description: " ",
      }),
    ).toBe(
      "This authorization commits to the exact destination, native value, and calldata below. A Safe or relayer can submit that call onchain after you continue.",
    );
  });
});

describe("Uniswap V4 position plans", () => {
  const plan = (actions: Hex, params: Hex[]) =>
    encodeAbiParameters(
      [{ type: "bytes" }, { type: "bytes[]" }],
      [actions, params],
    );
  const modify = (
    tokenId: bigint,
    liquidity: bigint,
    amount0: bigint,
    amount1: bigint,
    hookData: Hex = "0x",
  ) =>
    encodeAbiParameters(
      [
        { type: "uint256" },
        { type: "uint256" },
        { type: "uint128" },
        { type: "uint128" },
        { type: "bytes" },
      ],
      [tokenId, liquidity, amount0, amount1, hookData],
    );
  const mint = (hookData: Hex = "0x") =>
    encodeAbiParameters(
      [
        {
          type: "tuple",
          components: [
            { type: "address" },
            { type: "address" },
            { type: "uint24" },
            { type: "int24" },
            { type: "address" },
          ],
        },
        { type: "int24" },
        { type: "int24" },
        { type: "uint256" },
        { type: "uint128" },
        { type: "uint128" },
        { type: "address" },
        { type: "bytes" },
      ],
      [
        [zeroAddress, TOKEN, 10_000, 200, HOOK],
        -69_200,
        -64_400,
        777n,
        11n,
        22n,
        ALICE,
        hookData,
      ],
    );
  const burn = (hookData: Hex = "0x") =>
    encodeAbiParameters(
      [
        { type: "uint256" },
        { type: "uint128" },
        { type: "uint128" },
        { type: "bytes" },
      ],
      [42n, 100n, 200n, hookData],
    );
  const addresses = (...values: Address[]) =>
    encodeAbiParameters(
      values.map(() => ({ type: "address" as const })),
      values,
    );

  it("reads every action the apps build", () => {
    const steps = describeV4UnlockData(
      plan("0x0001021103121214", [
        modify(7n, 500n, 11n, 22n),
        modify(7n, 0n, 1n, 2n),
        mint(),
        addresses(zeroAddress, TOKEN, ALICE),
        burn(),
        addresses(zeroAddress),
        addresses(TOKEN),
        addresses(zeroAddress, ALICE),
      ]),
    );
    expect(steps).toEqual([
      {
        action: "INCREASE_LIQUIDITY",
        position: "#7",
        liquidity: 500n,
        maximumIn: { currency0: 11n, currency1: 22n },
      },
      {
        action: "DECREASE_LIQUIDITY",
        position: "#7",
        liquidity: 0n,
        minimumOut: { currency0: 1n, currency1: 2n },
      },
      {
        action: "MINT_POSITION",
        owner: ALICE,
        pool: {
          currency0: zeroAddress,
          currency1: TOKEN,
          fee: 10_000,
          tickSpacing: 200,
          hook: HOOK,
        },
        ticks: { lower: -69_200, upper: -64_400 },
        liquidity: 777n,
        maximumIn: { currency0: 11n, currency1: 22n },
      },
      {
        action: "TAKE_PAIR",
        currency0: zeroAddress,
        currency1: TOKEN,
        recipient: ALICE,
      },
      {
        action: "BURN_POSITION",
        position: "#42",
        minimumOut: { currency0: 100n, currency1: 200n },
      },
      { action: "CLOSE_CURRENCY", currency: zeroAddress },
      { action: "CLOSE_CURRENCY", currency: TOKEN },
      { action: "SWEEP", currency: zeroAddress, recipient: ALICE },
    ]);
  });

  it("refuses hook data it would not show", () => {
    expect(
      describeV4UnlockData(plan("0x00", [modify(7n, 1n, 1n, 1n, "0x01")])),
    ).toBeNull();
    expect(
      describeV4UnlockData(plan("0x01", [modify(7n, 1n, 1n, 1n, "0x01")])),
    ).toBeNull();
    expect(describeV4UnlockData(plan("0x02", [mint("0x01")]))).toBeNull();
    expect(describeV4UnlockData(plan("0x03", [burn("0x01")]))).toBeNull();
  });

  it("refuses encodings that are not byte for byte canonical", () => {
    // A dirty zero address decodes as zero; a trailing word decodes as nothing.
    const dirtyZero = `0x${"ff".repeat(12)}${"00".repeat(20)}` as Hex;
    const trailing = `${addresses(TOKEN)}${"00".repeat(32)}` as Hex;
    expect(describeV4UnlockData(plan("0x12", [addresses(TOKEN)]))).toEqual([
      { action: "CLOSE_CURRENCY", currency: TOKEN },
    ]);
    expect(describeV4UnlockData(plan("0x12", [dirtyZero]))).toBeNull();
    expect(describeV4UnlockData(plan("0x12", [trailing]))).toBeNull();
    expect(
      describeV4UnlockData(
        `${plan("0x12", [addresses(TOKEN)])}${"00".repeat(32)}`,
      ),
    ).toBeNull();
  });

  it("refuses unknown actions and malformed plans", () => {
    expect(describeV4UnlockData(plan("0x15", [addresses(TOKEN)]))).toBeNull();
    expect(describeV4UnlockData(plan("0x1212", [addresses(TOKEN)]))).toBeNull();
    expect(describeV4UnlockData(plan("0x", []))).toBeNull();
    expect(describeV4UnlockData(plan("0x12", ["0x"]))).toBeNull();
    expect(describeV4UnlockData("0xdead")).toBeNull();
    expect(describeV4UnlockData("dead")).toBeNull();
    expect(describeV4UnlockData(7n)).toBeNull();
  });
});

describe("Universal Router execute decoding", () => {
  const KEY = {
    currency0: zeroAddress,
    currency1: TOKEN,
    fee: 10_000,
    tickSpacing: 200,
    hooks: HOOK,
  } as const;
  const quote = (
    inputRoute: DirectPaySwapQuote["inputRoute"],
    poolKey: UniswapV4PoolKey = KEY,
  ): DirectPaySwapQuote => ({
    kind: "direct-swap",
    poolKey: { ...poolKey },
    zeroForOne: true,
    quotedTokenCount: 10n,
    minimumTokenCount: 9n,
    beneficiaryTokenCount: 9n,
    reservedTokenCount: 0n,
    inputRoute,
  });
  const titles = (steps: PrettyStep[] | null) =>
    (steps ?? []).map((step) => step.title);

  it("renders the single-V4 swap plan as readable steps", () => {
    const tx = buildUniswapV4ExactInputSwapTx({
      chainId: BASE,
      poolKey: KEY,
      zeroForOne: true,
      amountIn: 1_000_000n,
      minimumAmountOut: 5n,
      recipient: ALICE,
      deadline: 1_800_000_000n,
    });
    const steps = describeUniversalRouterExecute(BASE, tx.args)!;
    expect(titles(steps)).toEqual([
      "Swap in the project's V4 pool (exact input)",
      "Pay the pool everything owed",
      "Take the swap output",
    ]);
    expect(steps[0].rows).toEqual([
      ["Sell", `native ETH | ${zeroAddress}`],
      ["Buy", TOKEN],
      ["Amount in", "1000000"],
      ["Minimum out", "5 — reverts below this"],
      ["Fee", "10000 (1%) | tick spacing 200"],
      ["Hook", HOOK],
    ]);
    expect(steps[1].rows).toContainEqual(["At most", "1000000"]);
    expect(steps[2].rows).toEqual([
      ["Currency", TOKEN],
      ["Recipient", ALICE],
      ["Amount", "0 (the open amount from the previous step)"],
    ]);
    // The other direction sells the token for native ETH.
    const reverse = buildUniswapV4ExactInputSwapTx({
      chainId: BASE,
      poolKey: KEY,
      zeroForOne: false,
      amountIn: 7n,
      minimumAmountOut: 5n,
      recipient: ALICE,
      deadline: 1_800_000_000n,
    });
    expect(
      describeUniversalRouterExecute(BASE, reverse.args)![0].rows.slice(0, 2),
    ).toEqual([
      ["Sell", TOKEN],
      ["Buy", `native ETH | ${zeroAddress}`],
    ]);
  });

  it("decodes the native bridge route: wrap, V3 hop, then the V4 swap from the router's balance", () => {
    const config = NATIVE_SWAP_BY_CHAIN[BASE]!;
    const tx = buildDirectPaySwapTx({
      chainId: BASE,
      quote: quote(
        {
          kind: "native-v3-v4",
          wrappedNative: config.wrappedNative,
          bridgeToken: config.bridgeToken,
          bridgeTokenSymbol: "USDC",
          bridgeTokenDecimals: 6,
          v3Fee: 500,
          quotedBridgeAmount: 25_000_000n,
        },
        { ...KEY, currency0: config.bridgeToken },
      ),
      amount: 10n ** 16n,
      recipient: ALICE,
      deadline: 1_800_000_000n,
    });
    const steps = describeUniversalRouterExecute(BASE, tx.args)!;
    expect(titles(steps)).toEqual([
      "Wrap ETH into WETH",
      "Swap through a V3 pool (exact input)",
      "Pay the pool",
      "Swap in the project's V4 pool (exact input)",
      "Take the swap output",
    ]);
    const rows = rowsOf(steps);
    expect(rows).toContain("Recipient=the router (kept for the next step)");
    // A packed V3 path carries its token addresses without a checksum.
    expect(rows).toContain(
      `Route=${config.wrappedNative} -0.05%→ USDC | ${config.bridgeToken.toLowerCase()}`,
    );
    expect(rows).toContain(
      "Minimum out=0 — the final V4 minimum below is the real floor",
    );
    expect(rows).toContain("Paid by=the router's balance");
    expect(rows).toContain(
      "Amount=the router's entire balance from the previous step",
    );
    expect(rows).toContain(`Currency=USDC | ${config.bridgeToken}`);
  });

  it("decodes the ERC-20 route with its Permit2 authorization folded in", () => {
    const config = NATIVE_SWAP_BY_CHAIN[BASE]!;
    const tx = buildDirectPaySwapTx({
      chainId: BASE,
      quote: quote({
        kind: "erc20-v3-native-v4",
        inputToken: config.bridgeToken,
        wrappedNative: config.wrappedNative,
        bridgeTokenSymbol: "ETH",
        bridgeTokenDecimals: 18,
        v3Fee: 500,
        quotedBridgeAmount: 10n ** 16n,
      }),
      amount: 25_000_000n,
      recipient: ALICE,
      deadline: 1_800_000_000n,
    });
    const folded = addPermit2SignatureToDirectPaySwap(
      tx,
      {
        chainId: BASE,
        token: config.bridgeToken,
        amount: 25_000_000n,
        expiration: 1_900_000_000,
        nonce: 0,
        spender: tx.address,
        sigDeadline: 1_800_000_000n,
      },
      `0x${"11".repeat(65)}`,
    );
    const steps = describeUniversalRouterExecute(BASE, folded.args)!;
    expect(titles(steps)).toEqual([
      "Apply your signed Permit2 authorization",
      "Swap through a V3 pool (exact input)",
      "Unwrap WETH back to ETH",
      "Pay the pool",
      "Swap in the project's V4 pool (exact input)",
      "Take the swap output",
    ]);
    expect(steps[0].rows).toEqual([
      ["Token", `USDC | ${config.bridgeToken}`],
      ["Amount", "25000000"],
      ["Spender", `Uniswap Universal Router | ${getAddress(tx.address)}`],
      ["Expires", "2030-03-17 17:46:40 UTC (1900000000)"],
      ["Signature deadline", "2027-01-15 08:00:00 UTC (1800000000)"],
    ]);
    expect(rowsOf(steps)).toContain("Paid by=you (via Permit2)");
    // UNWRAP_WETH's amount is a minimum, and 0 sets none.
    expect(rowsOf(steps)).toContain("Minimum=0 (no minimum)");
  });

  it("shows who pays the pool", () => {
    const settle = (payerIsUser: boolean) =>
      encodeAbiParameters(
        [{ type: "address" }, { type: "uint256" }, { type: "bool" }],
        [TOKEN, 5n, payerIsUser],
      );
    const pay = (payerIsUser: boolean) =>
      describeUniversalRouterExecute(BASE, [
        "0x10",
        [
          encodeAbiParameters(
            [{ type: "bytes" }, { type: "bytes[]" }],
            ["0x0b", [settle(payerIsUser)]],
          ),
        ],
        0n,
      ]);
    expect(pay(true)).toEqual([
      {
        title: "Pay the pool",
        rows: [
          ["Currency", TOKEN],
          ["Amount", "5"],
          ["Paid by", "you (via Permit2)"],
        ],
      },
    ]);
    expect(pay(false)![0].rows).toContainEqual([
      "Paid by",
      "the router's balance",
    ]);
  });

  it("reads each amount the way its own command does", () => {
    const BALANCE = 1n << 255n;
    const v3 = (amountIn: bigint) =>
      encodeAbiParameters(
        [
          { type: "address" },
          { type: "uint256" },
          { type: "uint256" },
          { type: "bytes" },
          { type: "bool" },
        ],
        [
          ALICE,
          amountIn,
          1n,
          `0x${TOKEN.slice(2)}0001f4${ALICE.slice(2)}`,
          false,
        ],
      );
    const wrap = (amount: bigint) =>
      encodeAbiParameters(
        [{ type: "address" }, { type: "uint256" }],
        [ALICE, amount],
      );
    const rows = (commands: Hex, inputs: Hex[]) =>
      rowsOf(describeUniversalRouterExecute(BASE, [commands, inputs, 0n]));
    // Router commands read only the contract-balance sentinel; 0 is 0.
    expect(rows("0x000b", [v3(0n), wrap(0n)])).toEqual(
      expect.arrayContaining(["Amount in=0", "Amount=0"]),
    );
    expect(rows("0x000b", [v3(BALANCE), wrap(BALANCE)])).toEqual(
      expect.arrayContaining([
        "Amount in=the router's entire balance from the previous step",
        "Amount=the router's entire balance from the previous step",
      ]),
    );
    // UNWRAP_WETH's amount is a floor.
    expect(rows("0x0c", [wrap(7n)])).toContain("Minimum=7");
    // V4 swaps and takes read 0 as the open delta, but not the sentinel.
    const swap = encodeAbiParameters(
      [
        {
          type: "tuple",
          components: [
            {
              type: "tuple",
              components: [
                { type: "address" },
                { type: "address" },
                { type: "uint24" },
                { type: "int24" },
                { type: "address" },
              ],
            },
            { type: "bool" },
            { type: "uint128" },
            { type: "uint128" },
            { type: "bytes" },
          ],
        },
      ],
      [
        [
          [zeroAddress, TOKEN, 10_000, 200, HOOK],
          true,
          (1n << 128n) - 1n,
          1n,
          "0x",
        ],
      ],
    );
    const take = encodeAbiParameters(
      [{ type: "address" }, { type: "address" }, { type: "uint256" }],
      [TOKEN, ALICE, BALANCE],
    );
    const v4 = encodeAbiParameters(
      [{ type: "bytes" }, { type: "bytes[]" }],
      ["0x060e", [swap, take]],
    );
    expect(rows("0x10", [v4])).toEqual(
      expect.arrayContaining([
        `Amount in=${(1n << 128n) - 1n}`,
        `Amount=${BALANCE}`,
      ]),
    );
  });

  it("shows Permit2 times in UTC, whatever their size", () => {
    const permit = (expiration: number, sigDeadline: bigint) =>
      encodeAbiParameters(
        [
          {
            type: "tuple",
            components: [
              {
                type: "tuple",
                components: [
                  { type: "address" },
                  { type: "uint160" },
                  { type: "uint48" },
                  { type: "uint48" },
                ],
              },
              { type: "address" },
              { type: "uint256" },
            ],
          },
          { type: "bytes" },
        ],
        [[[TOKEN, 5n, expiration, 0], ALICE, sigDeadline], "0x"],
      );
    const times = (expiration: number, sigDeadline: bigint) =>
      rowsOf(
        describeUniversalRouterExecute(BASE, [
          "0x0a",
          [permit(expiration, sigDeadline)],
          0n,
        ]),
      ).slice(3);
    expect(times(2 ** 48 - 1, 2n ** 256n - 1n)).toEqual([
      "Expires=281474976710655 (after year 275760)",
      `Signature deadline=${2n ** 256n - 1n} (after year 275760)`,
    ]);
    // Permit2 stores an expiration of 0 as the block's own timestamp.
    expect(times(0, 1n)).toEqual([
      "Expires=0 (this block only)",
      "Signature deadline=1970-01-01 00:00:01 UTC (1)",
    ]);
  });

  it("shows an explicit V3 minimum and a msg.sender recipient", () => {
    const v3 = encodeAbiParameters(
      [
        { type: "address" },
        { type: "uint256" },
        { type: "uint256" },
        { type: "bytes" },
        { type: "bool" },
      ],
      [
        "0x0000000000000000000000000000000000000001",
        5n,
        4n,
        `0x${TOKEN.slice(2)}0001f4${ALICE.slice(2)}`,
        true,
      ],
    );
    expect(
      rowsOf(describeUniversalRouterExecute(BASE, ["0x00", [v3], 0n])),
    ).toEqual([
      `Route=${TOKEN} -0.05%→ ${ALICE}`,
      "Amount in=5",
      "Minimum out=4",
      "Paid by=you (via Permit2)",
      "Recipient=you (msg.sender)",
    ]);
  });

  it("refuses unknown commands, hook data and malformed inputs", () => {
    const single = buildUniswapV4ExactInputSwapTx({
      chainId: BASE,
      poolKey: KEY,
      zeroForOne: true,
      amountIn: 7n,
      minimumAmountOut: 5n,
      recipient: ALICE,
      deadline: 1_800_000_000n,
      hookData: "0x01",
    });
    expect(describeUniversalRouterExecute(BASE, single.args)).toBeNull();
    const v4 = (actions: Hex, params: Hex[]) =>
      encodeAbiParameters(
        [{ type: "bytes" }, { type: "bytes[]" }],
        [actions, params],
      );
    const settle = encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }],
      [TOKEN, 1n],
    );
    expect(
      describeUniversalRouterExecute(BASE, [
        "0x10",
        [v4("0x0f", [settle])],
        0n,
      ]),
    ).toBeNull();
    expect(
      describeUniversalRouterExecute(BASE, [
        "0x10",
        [v4("0x0c0c", [settle])],
        0n,
      ]),
    ).toBeNull();
    expect(
      describeUniversalRouterExecute(BASE, ["0x10", [v4("0x", [])], 0n]),
    ).toBeNull();
    expect(
      describeUniversalRouterExecute(BASE, ["0x10", ["0xdead"], 0n]),
    ).toBeNull();
    // An input with a trailing word is not what the router reads.
    const wrap = encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }],
      [ALICE, 5n],
    );
    expect(
      describeUniversalRouterExecute(BASE, ["0x0b", [wrap], 0n]),
    ).not.toBeNull();
    expect(
      describeUniversalRouterExecute(BASE, [
        "0x0b",
        [`${wrap}${"00".repeat(32)}`],
        0n,
      ]),
    ).toBeNull();
    // A V3 path must be token, (fee, token)+.
    const shortPath = encodeAbiParameters(
      [
        { type: "address" },
        { type: "uint256" },
        { type: "uint256" },
        { type: "bytes" },
        { type: "bool" },
      ],
      [ALICE, 1n, 1n, `0x${TOKEN.slice(2)}0001f4`, true],
    );
    expect(
      describeUniversalRouterExecute(BASE, ["0x00", [shortPath], 0n]),
    ).toBeNull();
    expect(
      describeUniversalRouterExecute(BASE, ["0xff", ["0x"], 0n]),
    ).toBeNull();
    expect(
      describeUniversalRouterExecute(BASE, ["0x0b0b", ["0x"], 0n]),
    ).toBeNull();
    expect(describeUniversalRouterExecute(BASE, ["0x", [], 0n])).toBeNull();
    expect(describeUniversalRouterExecute(BASE, ["0x0b", "0x", 0n])).toBeNull();
    expect(describeUniversalRouterExecute(BASE, ["0b", ["0x"], 0n])).toBeNull();
    expect(describeUniversalRouterExecute(BASE, [1n, ["0x"], 0n])).toBeNull();
    expect(describeUniversalRouterExecute(BASE, ["0x0b"])).toBeNull();
    expect(describeUniversalRouterExecute(BASE, undefined)).toBeNull();
  });
});

describe("JB hook metadata decoding", () => {
  it("reads 721 mint instructions from the real builder's bytes", () => {
    const metadata = build721PayMetadata({
      metadataIdTarget: TARGET,
      tierIdsToMint: [4n, 4n, 7n],
      allowOverspending: false,
    });
    const steps = describeJBHookMetadata("pay", metadata)!;
    expect(steps).toHaveLength(1);
    expect(steps[0].title).toBe("721 shop mint instructions");
    expect(rowsOf(steps)).toContain(
      `Hook lookup id=${hookMetadataId(TARGET, "pay")}`,
    );
    expect(rowsOf(steps)).toContain("Tier IDs to mint=2× #4, #7");
    expect(rowsOf(steps)).toContain(
      "Allow overspending=no — any excess reverts",
    );
    expect(
      rowsOf(
        describeJBHookMetadata(
          "pay",
          build721PayMetadata({
            metadataIdTarget: TARGET,
            tierIdsToMint: [9n],
          }),
        ),
      ),
    ).toContain("Allow overspending=yes — excess becomes pay credits");
  });

  it("decodes every word of the current buyback pay quote", () => {
    const quote = (skip: boolean) =>
      createHookMetadata(
        [hookMetadataId(HOOK, "pay")],
        [
          encodeAbiParameters(
            [{ type: "uint256" }, { type: "uint256" }, { type: "bool" }],
            [123n, 456n, skip],
          ),
        ],
      );
    const steps = describeJBHookMetadata("pay", quote(true))!;
    expect(steps).toHaveLength(1);
    expect(steps[0].title).toBe("Buyback hook swap instructions");
    expect(rowsOf(steps)).toEqual([
      `Hook lookup id=${hookMetadataId(HOOK, "pay")}`,
      "Amount to swap=123",
      "Minimum swap output=456 — reverts below this",
      "Skip splits on swapped tokens=yes",
    ]);
    expect(rowsOf(describeJBHookMetadata("pay", quote(false)))).toContain(
      "Skip splits on swapped tokens=no",
    );
  });

  it("reports a degenerate payload as ambiguous instead of picking a reading", () => {
    // An empty tier list byte-matches both the 721 mint shape and the
    // 3-word buyback swap shape; the decoder must refuse to choose.
    const metadata = build721PayMetadata({
      metadataIdTarget: TARGET,
      tierIdsToMint: [],
    });
    const steps = describeJBHookMetadata("pay", metadata)!;
    expect(steps).toHaveLength(1);
    expect(steps[0].title).toContain("matches multiple known shapes");
    expect(rowsOf(steps)).toContain(
      "Reading 1=721 shop mint instructions: tier ids to mint: none (credits only); allow overspending: yes — excess becomes pay credits",
    );
    // An empty redeem list is also a valid 2-word cash-out routing.
    const empty = createHookMetadata(
      [hookMetadataId(TARGET, "cashOut")],
      [encodeAbiParameters([{ type: "uint256[]" }], [[]])],
    );
    expect(describeJBHookMetadata("cashOut", empty)![0].title).toContain(
      "matches multiple known shapes",
    );
  });

  it("reads buyback cash-out routing and 721 redeems, including both in one envelope", () => {
    const buyback = describeJBHookMetadata(
      "cashOut",
      buildBuybackCashOutMetadata({
        hook: HOOK,
        minimumSwapAmountOut: 123n,
        skip: true,
      }),
    )!;
    expect(buyback).toHaveLength(1);
    expect(buyback[0].title).toBe("Buyback hook cash-out routing");
    expect(rowsOf(buyback)).toContain("Minimum swap output=123");
    expect(rowsOf(buyback)).toContain(
      "Force the direct terminal path=yes — never route through the pool",
    );
    expect(
      rowsOf(
        describeJBHookMetadata(
          "cashOut",
          buildBuybackCashOutMetadata({ hook: HOOK, minimumSwapAmountOut: 1n }),
        ),
      ),
    ).toContain("Force the direct terminal path=no");

    const redeem = describeJBHookMetadata(
      "cashOut",
      build721CashOutMetadata({
        metadataIdTarget: TARGET,
        tokenIds: [9n, 12n],
      }),
    )!;
    expect(redeem).toHaveLength(1);
    expect(redeem[0].title).toBe("721 shop items to redeem");
    expect(rowsOf(redeem)).toContain("Token IDs=#9, #12");

    const combined = describeJBHookMetadata(
      "cashOut",
      createHookMetadata(
        [hookMetadataId(HOOK, "cashOut"), hookMetadataId(TARGET, "cashOut")],
        [
          encodeAbiParameters(
            [{ type: "uint256" }, { type: "bool" }],
            [5n, false],
          ),
          encodeAbiParameters([{ type: "uint256[]" }], [[3n]]),
        ],
      ),
    )!;
    expect(combined.map((step) => step.title)).toEqual([
      "Buyback hook cash-out routing",
      "721 shop items to redeem",
    ]);
  });

  it("shows unrecognized payloads and a nonzero reserved word as they are", () => {
    const oneWord = `0x${"77".repeat(32)}` as Hex;
    // Three words that are neither a mint list nor a buyback quote.
    const threeWords = `0x${"00".repeat(64)}${"77".repeat(32)}` as Hex;
    const metadata = createHookMetadata(
      [
        hookMetadataId(HOOK, "pay"),
        hookMetadataId(TARGET, "pay"),
        hookMetadataId(ALICE, "pay"),
      ],
      [oneWord, `0x${"66".repeat(64)}`, threeWords],
    );
    const steps = describeJBHookMetadata("pay", metadata)!;
    expect(steps.map((step) => step.title)).toEqual([
      "Unrecognized hook payload (1 word)",
      "Unrecognized hook payload (2 words)",
      "Unrecognized hook payload (3 words)",
    ]);
    expect(rowsOf(steps)).toContain(`Payload=${oneWord}`);
    const reserved = `0x${"00".repeat(31)}01${metadata.slice(66)}`;
    const withReserved = describeJBHookMetadata("cashOut", reserved)!;
    expect(withReserved[0]).toEqual({
      title: "Protocol-reserved word (nonzero)",
      rows: [["Value", `0x${"00".repeat(31)}01`]],
    });
  });

  it("reads a lookup table filled to its last whole entry", () => {
    // Six entries fill 30 of the table word's 32 bytes.
    const targets = [ALICE, BOB, TOKEN, TARGET, HOOK, CONTROLLER];
    const steps = describeJBHookMetadata(
      "pay",
      createHookMetadata(
        targets.map((target) => hookMetadataId(target, "pay")),
        targets.map(() => `0x${"77".repeat(32)}`),
      ),
    )!;
    expect(steps).toHaveLength(6);
    expect(rowsOf(steps)).toContain(
      `Hook lookup id=${hookMetadataId(CONTROLLER, "pay")}`,
    );
  });

  it("refuses a repeated lookup id, whose later entries the hook never reads", () => {
    const id = hookMetadataId(HOOK, "pay");
    const mint = (tierIds: number[]) =>
      encodeAbiParameters(
        [{ type: "bool" }, { type: "uint16[]" }],
        [false, tierIds],
      );
    expect(
      describeJBHookMetadata(
        "pay",
        createHookMetadata([id, id], [mint([4]), mint([7, 8])]),
      ),
    ).toBeNull();
    expect(
      describeJBHookMetadata(
        "pay",
        createHookMetadata(
          [id, hookMetadataId(TARGET, "pay")],
          [mint([4]), mint([7, 8])],
        ),
      ),
    ).toHaveLength(2);
  });

  it("rejects malformed or truncated envelopes", () => {
    const valid = build721PayMetadata({
      metadataIdTarget: TARGET,
      tierIdsToMint: [4n],
    });
    const word = (hex: string) => hex.padEnd(64, "0");
    const zeros = "00".repeat(32);
    const envelope = (...words: string[]) => `0x${words.join("")}`;
    for (const value of [
      7n,
      "0x",
      "0xdead",
      `0x${"00".repeat(64)}`,
      valid.slice(0, -2),
      `0x${"00".repeat(33)}`,
      // Only a reserved and a table word.
      envelope(zeros, word("aaaaaaaa02")),
      // A first offset of 1 leaves no table.
      envelope(zeros, word("aaaaaaaa01"), zeros),
      // A first offset past the end.
      envelope(zeros, word("aaaaaaaa05"), zeros),
      // A zero id with a nonzero offset.
      envelope(zeros, word("0000000002"), zeros),
      // Nonzero bytes after the table's last entry.
      envelope(zeros, word("aaaaaaaa0200000000000001"), zeros),
      // A two-word table for one entry.
      envelope(zeros, word("aaaaaaaa03"), zeros, zeros),
      // A later offset past the end.
      envelope(zeros, word("aaaaaaaa02bbbbbbbb09"), zeros, zeros),
      // Offsets that do not ascend.
      envelope(zeros, word("aaaaaaaa02bbbbbbbb02"), zeros, zeros),
    ]) {
      expect(describeJBHookMetadata("pay", value), String(value)).toBeNull();
    }
  });
});

describe("sucker claim decoding", () => {
  const claim = {
    token: zeroAddress,
    leaf: {
      index: 7n,
      beneficiary: `0x000000000000000000000000${ALICE.slice(2)}`,
      projectTokenCount: 1_000n,
      terminalTokenAmount: 25n,
      metadata: `0x${"00".repeat(32)}`,
    },
    proof: Array.from(
      { length: 32 },
      (_, i) => `0x${String(i).padStart(2, "0").repeat(32)}`,
    ),
  };

  it("renders the leaf and summarizes the proof", () => {
    const steps = describeSuckerClaim(1, claim)!;
    expect(steps).toHaveLength(1);
    const rows = rowsOf(steps);
    expect(rows).toContain(`Terminal token=${zeroAddress}`);
    expect(rows).toContain("Leaf index=7");
    expect(rows).toContain(`Beneficiary=${ALICE}`);
    expect(rows).toContain("Project tokens=1000");
    expect(rows).toContain("Terminal token amount=25");
    expect(rows).toContain(
      "Merkle proof=32 hashes — exact bytes in the raw payload below",
    );
    expect(rows.some((row) => row.startsWith("Leaf metadata"))).toBe(false);
  });

  it("shows leaf metadata and a beneficiary that is not a padded address", () => {
    const beneficiary = `0x${"ab".repeat(32)}`;
    const rows = rowsOf(
      describeSuckerClaim(BASE, {
        ...claim,
        token: USDC,
        leaf: { ...claim.leaf, beneficiary, metadata: "0x1234" },
      }),
    );
    expect(rows).toContain(`Terminal token=USDC | ${USDC}`);
    expect(rows).toContain(`Beneficiary=${beneficiary}`);
    expect(rows).toContain("Leaf metadata=0x1234");
  });

  it("rejects any claim it cannot read in full", () => {
    for (const value of [
      null,
      { ...claim, token: 1n },
      { ...claim, leaf: undefined },
      { ...claim, leaf: { ...claim.leaf, beneficiary: 1n } },
      { ...claim, leaf: { ...claim.leaf, index: 7 } },
      { ...claim, leaf: { ...claim.leaf, projectTokenCount: "1000" } },
      { ...claim, leaf: { ...claim.leaf, terminalTokenAmount: 25 } },
      { ...claim, proof: "0x" },
      { ...claim, proof: claim.proof.slice(0, 31) },
      { ...claim, proof: [...claim.proof.slice(0, 31), "0x1234"] },
    ]) {
      expect(describeSuckerClaim(1, value)).toBeNull();
    }
  });
});

describe("Safe inner call decoding", () => {
  const pay = (abi: Abi) =>
    encodeFunctionData({
      abi,
      functionName: "pay",
      args: [4n, TOKEN, 5n, ALICE, 0n, "", "0x"],
    });
  const approve = encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: [BOB, 5n],
  });
  const transfer = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [BOB, 5n],
  });

  it("decodes a queued JB call with its target's ABI", () => {
    const data = encodeFunctionData({
      abi: jbControllerAbi,
      functionName: "sendReservedTokensToSplitsOf",
      args: [41n],
    });
    const steps = describeSafeInnerCall(BASE, CONTROLLER, data)!;
    expect(steps[0].title).toBe(
      "Queued call — JBController.sendReservedTokensToSplitsOf(…)",
    );
    expect(rowsOf(steps)).toEqual(['projectId="41"']);
  });

  it("names the target, not another contract that shares the selector", () => {
    // JBMultiTerminal, the router registry and the gateway share `pay`.
    expect(
      describeSafeInnerCall(BASE, GATEWAY, pay(jbRouterTerminalGatewayAbi))![0]
        .title,
    ).toBe("Queued call — JBRouterTerminalGateway.pay(…)");
    expect(
      describeSafeInnerCall(BASE, TERMINAL, pay(jbMultiTerminalAbi))![0].title,
    ).toBe("Queued call — JBMultiTerminal.pay(…)");
    // JBProjects and ERC-20 share `approve`, with different arguments.
    const projects = describeSafeInnerCall(BASE, PROJECTS, approve)!;
    expect(projects[0].title).toBe("Queued call — JBProjects.approve(…)");
    expect(rowsOf(projects)).toEqual([`to="${BOB}"`, 'tokenId="5"']);
    const usdc = describeSafeInnerCall(BASE, USDC, approve)!;
    expect(usdc[0].title).toBe("Queued call — USDC.approve(…)");
    expect(rowsOf(usdc)).toEqual([`spender="${BOB}"`, 'amount="5"']);
  });

  it("never claims a token standard for an unknown target", () => {
    const erc721 = parseAbi([
      "function transferFrom(address from, address to, uint256 tokenId)",
    ]);
    // An ERC-721 transfer and approval carry the ERC-20 selectors, with a
    // token ID where ERC-20 has an amount.
    const nftTransfer = encodeFunctionData({
      abi: erc721,
      functionName: "transferFrom",
      args: [ALICE, BOB, 4_000_000_001n],
    });
    expect(describeSafeInnerCall(BASE, TOKEN, nftTransfer)).toBeNull();
    expect(describeSafeInnerCall(BASE, TOKEN, approve)).toBeNull();
    // A known ERC-20 reads them as amounts.
    expect(describeSafeInnerCall(BASE, USDC, nftTransfer)![0].title).toBe(
      "Queued call — USDC.transferFrom(…)",
    );
    // Other ERC-20 calls are read as ERC-20, and say so.
    expect(describeSafeInnerCall(BASE, TOKEN, transfer)).toEqual([
      {
        title:
          "Queued call — transfer(…) on an unrecognized contract, read as ERC-20",
        rows: [
          ["recipient", `"${BOB}"`],
          ["amount", '"5"'],
        ],
      },
    ]);
  });

  it("reads a retired generation with its contract's ABI and names the generation", () => {
    const data = encodeFunctionData({
      abi: jbBuybackHookAbi,
      functionName: "setTwapWindowOf",
      args: [4n, TOKEN, 600n],
    });
    expect(describeSafeInnerCall(BASE, PREVIOUS_HOOK, data)![0].title).toBe(
      "Queued call — JBBuybackHook (previous).setTwapWindowOf(…)",
    );
    expect(describeSafeInnerCall(BASE, BUYBACK_HOOK, data)![0].title).toBe(
      "Queued call — JBBuybackHook (current).setTwapWindowOf(…)",
    );
  });

  it("lists arguments with no name by position, and says when there are none", () => {
    const data = encodeFunctionData({
      abi: jbBuybackHookAbi,
      functionName: "hasMintPermissionFor",
      args: [
        4n,
        {
          cycleNumber: 1,
          id: 2,
          basedOnId: 0,
          start: 3,
          duration: 0,
          weight: 5n,
          weightCutPercent: 0,
          approvalHook: zeroAddress,
          metadata: 0n,
        },
        ALICE,
      ],
    });
    expect(
      rowsOf(describeSafeInnerCall(BASE, BUYBACK_HOOK, data)).map(
        (row) => row.split("=")[0],
      ),
    ).toEqual(["argument 1", "argument 2", "argument 3"]);
    const renounce = encodeFunctionData({
      abi: jbDirectoryAbi,
      functionName: "renounceOwnership",
    });
    expect(describeSafeInnerCall(BASE, DIRECTORY, renounce)).toEqual([
      {
        title: "Queued call — JBDirectory.renounceOwnership(…)",
        rows: [["Arguments", "none"]],
      },
    ]);
  });

  it("returns null for other targets, unknown selectors and noncanonical bytes", () => {
    // Known contracts outside the candidate ABIs.
    expect(describeSafeInnerCall(BASE, TERMINAL_STORE, approve)).toBeNull();
    expect(
      describeSafeInnerCall(BASE, UNISWAP_PERMIT2_ADDRESS, approve),
    ).toBeNull();
    // A selector the target's ABI lacks.
    expect(describeSafeInnerCall(BASE, DIRECTORY, approve)).toBeNull();
    expect(describeSafeInnerCall(BASE, TOKEN, "0xdeadbeef")).toBeNull();
    // Trailing bytes, and arguments cut short.
    expect(describeSafeInnerCall(BASE, TOKEN, `${transfer}00`)).toBeNull();
    expect(describeSafeInnerCall(BASE, USDC, `${approve}00`)).toBeNull();
    expect(
      describeSafeInnerCall(BASE, TOKEN, transfer.slice(0, 40)),
    ).toBeNull();
    expect(describeSafeInnerCall(BASE, TOKEN, "0xa9059c")).toBeNull();
    expect(describeSafeInnerCall(BASE, TOKEN, `${transfer}0`)).toBeNull();
    expect(describeSafeInnerCall(BASE, TOKEN, 5n)).toBeNull();
    expect(describeSafeInnerCall(BASE, "0x1234", transfer)).toBeNull();
    expect(describeSafeInnerCall(BASE, undefined, transfer)).toBeNull();
  });
});

describe("Safe initializer decoding", () => {
  const SAFE_TO_L2_SETUP =
    "0xBD89A1CE4DDe368FFAB0eC35506eEcE0b1fFdc54" as Address;
  const setupAbi = parseAbi([
    "function setup(address[] _owners,uint256 _threshold,address to,bytes data,address fallbackHandler,address paymentToken,uint256 payment,address paymentReceiver)",
    "function setupToL2(address l2Singleton)",
  ]);
  const setup = (
    owners: Address[],
    to: Address,
    data: Hex,
    paymentToken: Address = zeroAddress,
    payment = 0n,
  ) =>
    encodeFunctionData({
      abi: setupAbi,
      functionName: "setup",
      args: [
        owners,
        BigInt(owners.length),
        to,
        data,
        HOOK,
        paymentToken,
        payment,
        zeroAddress,
      ],
    });
  const toL2 = encodeFunctionData({
    abi: setupAbi,
    functionName: "setupToL2",
    args: [TARGET],
  });

  it("decodes a canonical Safe initializer, including the SafeToL2Setup hook", () => {
    const rows = rowsOf(
      describeSafeInitializer(1, setup([ALICE, BOB], zeroAddress, "0x")),
    );
    expect(rows).toEqual([
      `Owners=${ALICE}, ${BOB}`,
      "Threshold=2 of 2",
      `Fallback handler=${HOOK}`,
      "Setup hook=none",
    ]);
    expect(
      rowsOf(
        describeSafeInitializer(1, setup([ALICE], SAFE_TO_L2_SETUP, toL2)),
      ),
    ).toContain(
      `Setup hook=SafeToL2Setup.setupToL2(${TARGET}) via ${SAFE_TO_L2_SETUP}`,
    );
  });

  it("warns on any other setup delegatecall and on deployment payments", () => {
    // Only the canonical SafeToL2Setup is known to run setupToL2; any other
    // target could run anything under the same calldata.
    for (const [to, data] of [
      [BOB, toL2],
      [BOB, "0x1234"],
      [SAFE_TO_L2_SETUP, "0x1234"],
      [SAFE_TO_L2_SETUP, `${toL2}00`],
    ] as const) {
      expect(
        rowsOf(describeSafeInitializer(1, setup([ALICE], to, data))),
      ).toContain(
        `Setup hook=DELEGATECALL to ${to} — data in the raw payload below`,
      );
    }
    // With no `to`, Safe never runs the setup data.
    expect(
      rowsOf(describeSafeInitializer(1, setup([ALICE], zeroAddress, toL2))),
    ).toContain(
      "Setup hook=none — Safe ignores the setup data when `to` is zero",
    );
    expect(
      rowsOf(
        describeSafeInitializer(
          BASE,
          setup([], zeroAddress, "0x", zeroAddress, 5n),
        ),
      ),
    ).toEqual([
      "Owners=none",
      "Threshold=0 of 0",
      `Fallback handler=${HOOK}`,
      "Setup hook=none",
      `Deployment payment=5 of native ETH | ${zeroAddress} to ${zeroAddress} — unusual, verify`,
    ]);
    expect(
      rowsOf(
        describeSafeInitializer(BASE, setup([ALICE], zeroAddress, "0x", USDC)),
      ),
    ).toContain(
      `Deployment payment=0 of USDC | ${USDC} to ${zeroAddress} — unusual, verify`,
    );
  });

  it("returns null for anything but canonical setup calldata", () => {
    const plain = setup([ALICE], zeroAddress, "0x");
    expect(describeSafeInitializer(1, `${plain}00`)).toBeNull();
    expect(describeSafeInitializer(1, "0xdeadbeef")).toBeNull();
    expect(describeSafeInitializer(1, plain.slice(2))).toBeNull();
    expect(describeSafeInitializer(1, 7n)).toBeNull();
  });
});

describe("permissions decoding", () => {
  it("names permission ids from the SDK catalog and flags ROOT and the all-projects scope", () => {
    const steps = describePermissionsData(BASE, {
      operator: CONTROLLER,
      projectId: 0n,
      permissionIds: [1, 2, 200],
    })!;
    expect(steps[0].title).toBe("Set operator permissions");
    const rows = rowsOf(steps).join("\n");
    expect(rows).toContain(`Operator=JBController | ${CONTROLLER}`);
    expect(rows).toContain("ROOT (1)");
    expect(rows).toContain("QUEUE_RULESETS (2)");
    expect(rows).toContain("UNKNOWN PERMISSION (200)");
    expect(rows).toContain("EVERY project");
    expect(rows).toContain("Warning=ROOT grants every permission");
    const none = rowsOf(
      describePermissionsData(1, {
        operator: BOB,
        projectId: 3,
        permissionIds: [],
      }),
    );
    expect(none).toContain("Scope=project #3");
    expect(none).toContain(
      "Permissions=none — revokes everything previously granted",
    );
    expect(none.some((row) => row.startsWith("Warning"))).toBe(false);
  });

  it("rejects grants it cannot read in full", () => {
    const grant = { operator: BOB, projectId: 3n, permissionIds: [2] };
    for (const value of [
      null,
      { ...grant, operator: 1n },
      { ...grant, projectId: "3" },
      { ...grant, permissionIds: 2 },
      { ...grant, permissionIds: [2.5] },
      { ...grant, permissionIds: [2n] },
    ]) {
      expect(describePermissionsData(1, value)).toBeNull();
    }
  });
});

describe("split group decoding", () => {
  const split = {
    percent: 500_000_000,
    projectId: 0n,
    beneficiary: ALICE,
    preferAddToBalance: false,
    lockedUntil: 0,
    hook: zeroAddress,
  };

  it("renders split percents as percentages with an honest total", () => {
    const steps = describeSplitGroups(1, [
      {
        groupId: 1n,
        splits: [
          split,
          { ...split, percent: 250_000_000, projectId: 3n, beneficiary: BOB },
        ],
      },
    ])!;
    expect(steps[0].title).toBe("Reserved tokens");
    const rows = rowsOf(steps).join("\n");
    expect(rows).toContain(`Split 1 — 50%=${ALICE}`);
    expect(rows).toContain(`Split 2 — 25%=project #3 (beneficiary ${BOB})`);
    expect(rows).toContain(
      "Total=75% — the remainder follows the ruleset's default",
    );
  });

  it("names payout groups, hooks, locks and add-to-balance", () => {
    const lockedUntil = 1_900_000_000;
    const steps = describeSplitGroups(BASE, [
      {
        groupId: BigInt(USDC),
        splits: [
          { ...split, hook: HOOK, preferAddToBalance: true, lockedUntil },
          { ...split, beneficiary: CONTROLLER, hook: undefined },
        ],
      },
      { groupId: 1n << 160n, splits: [] },
    ])!;
    expect(steps.map((step) => step.title)).toEqual([
      `Payouts of USDC | ${USDC.toLowerCase()}`,
      `Group ${1n << 160n}`,
    ]);
    expect(rowsOf([steps[0]])).toEqual([
      `Split 1 — 50%=${ALICE} | via hook ${HOOK} | prefers add-to-balance | locked until 2030-03-17 17:46:40 UTC (1900000000)`,
      `Split 2 — 50%=JBController | ${CONTROLLER}`,
      "Total=100%",
    ]);
    expect(steps[1].rows).toEqual([["Splits", "none"]]);
    // A lock past the last calendar date still shows its exact value.
    expect(
      rowsOf(
        describeSplitGroups(BASE, [
          { groupId: 1n, splits: [{ ...split, lockedUntil: 2 ** 48 - 1 }] },
        ]),
      )[0],
    ).toBe(
      `Split 1 — 50%=${ALICE} | locked until 281474976710655 (after year 275760)`,
    );
  });

  it("names the holder group a Sticky split pays", () => {
    const chainId = 84532;
    const distributor = stickyDistributorAddress(chainId);
    const stickyToken = "0x5ca15ca15ca15ca15ca15ca15ca15ca15ca15ca1";
    const rows = rowsOf(
      describeSplitGroups(chainId, [
        {
          groupId: 1n,
          splits: [
            { ...split, beneficiary: stickyToken, hook: distributor },
            {
              ...split,
              percent: 250_000_000,
              projectId: 4052n,
              beneficiary: stickyToken,
              hook: distributor,
            },
            { ...split, percent: 250_000_000, hook: "0x1234" },
          ],
        },
      ]),
    );
    expect(rows[0]).toBe(
      `Split 1 — 50%=Sticky group 0 (all holders by voting power) → Sticky token ${stickyToken} | via StickyDistributor ${distributor}`,
    );
    // A tenure group's projectId is the group, never a project.
    expect(rows[1]).toBe(
      `Split 2 — 25%=Sticky holders stuck 4 to 52 weeks → Sticky token ${stickyToken} | via StickyDistributor ${distributor}`,
    );
    expect(rows[2]).toBe(`Split 3 — 25%=${ALICE} | via hook 0x1234`);
    // A chain without Sticky reads the distributor's address as any other hook.
    expect(
      rowsOf(
        describeSplitGroups(1337, [
          { groupId: 1n, splits: [{ ...split, hook: distributor }] },
        ]),
      )[0],
    ).toBe(`Split 1 — 50%=${ALICE} | via hook ${distributor}`);
  });

  it("rejects groups it cannot read in full", () => {
    for (const value of [
      "0x",
      [],
      [null],
      [{ groupId: 1, splits: [] }],
      [{ groupId: 1n, splits: {} }],
      [{ groupId: 1n, splits: [null] }],
      [{ groupId: 1n, splits: [{ ...split, percent: 5n }] }],
      [{ groupId: 1n, splits: [{ ...split, beneficiary: 1n }] }],
      [{ groupId: 1n, splits: [{ ...split, projectId: 0 }] }],
      [{ groupId: 1n, splits: [{ ...split, lockedUntil: 1.5 }] }],
      [{ groupId: 1n, splits: [{ ...split, lockedUntil: "1" }] }],
    ]) {
      expect(describeSplitGroups(1, value)).toBeNull();
    }
  });
});
