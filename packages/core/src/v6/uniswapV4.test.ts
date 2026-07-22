import { encodeAbiParameters, pad, zeroAddress, zeroHash } from "viem";
import { describe, expect, test } from "vitest";
import {
  UNISWAP_V4_MAX_TICK,
  UNISWAP_V4_MODIFY_LIQUIDITY_TOPIC,
  UNISWAP_V4_POOL_MANAGER_ADDRESSES,
  UNISWAP_V4_POSITION_MANAGER_ADDRESSES,
  UNISWAP_V4_Q96,
  UNISWAP_V4_QUOTER_ADDRESSES,
  isUniswapV4PoolManager,
  uniswapV4AlignTickDown,
  uniswapV4AlignTickUp,
  uniswapV4AmountsForLiquidity,
  uniswapV4CounterpartAmount,
  uniswapV4DefaultPriceRange,
  uniswapV4Deployment,
  uniswapV4LiquidityForAmounts,
  uniswapV4PoolId,
  uniswapV4PoolStateSlot,
  uniswapV4PositionTicks,
  uniswapV4PositionTokenIdFromLog,
  uniswapV4PriceFromSqrtPriceX96,
  uniswapV4SqrtPriceX96AtTick,
  uniswapV4SqrtPriceX96FromSlot0,
} from "./uniswapV4.js";

const TOKEN = "0x00000000000000000000000000000000000000aa" as const;
const HOOK = "0x00000000000000000000000000000000000000cc" as const;

describe("Uniswap V4 pool primitives", () => {
  test("derives stable pool ids and storage slots", () => {
    const poolId = uniswapV4PoolId({
      currency0: zeroAddress,
      currency1: TOKEN,
      fee: 10_000,
      tickSpacing: 200,
      hooks: HOOK,
    });
    expect(poolId).toMatch(/^0x[0-9a-f]{64}$/);
    expect(uniswapV4PoolStateSlot(poolId)).toMatch(/^0x[0-9a-f]{64}$/);
    expect(
      uniswapV4PoolId({
        currency0: zeroAddress,
        currency1: TOKEN,
        fee: 10_000,
        tickSpacing: 200,
        hooks: HOOK,
      }),
    ).toBe(poolId);
  });

  test("extracts slot0's low 160-bit sqrt price", () => {
    const highBits = 123n << 160n;
    const slot =
      `0x${(highBits | UNISWAP_V4_Q96).toString(16).padStart(64, "0")}` as const;
    expect(uniswapV4SqrtPriceX96FromSlot0(slot)).toBe(UNISWAP_V4_Q96);
    expect(uniswapV4PriceFromSqrtPriceX96(UNISWAP_V4_Q96, false, 18)).toBe(1);
    expect(uniswapV4PriceFromSqrtPriceX96(0n, false, 18)).toBeNull();
  });

  test("fails closed on Optimism Sepolia's unsupported V4 stack", () => {
    expect(Object.keys(UNISWAP_V4_POOL_MANAGER_ADDRESSES)).toHaveLength(7);
    expect(UNISWAP_V4_POOL_MANAGER_ADDRESSES[11155420]).toBeUndefined();
    expect(UNISWAP_V4_POSITION_MANAGER_ADDRESSES[11155420]).toBeUndefined();
    expect(UNISWAP_V4_QUOTER_ADDRESSES[11155420]).toBeUndefined();
    expect(uniswapV4Deployment(11155420)).toBeNull();
    expect(uniswapV4Deployment(1)).toMatchObject({
      poolManager: UNISWAP_V4_POOL_MANAGER_ADDRESSES[1],
      positionManager: UNISWAP_V4_POSITION_MANAGER_ADDRESSES[1],
      quoter: UNISWAP_V4_QUOTER_ADDRESSES[1],
    });
    expect(isUniswapV4PoolManager(UNISWAP_V4_POOL_MANAGER_ADDRESSES[1]!)).toBe(
      true,
    );
    expect(isUniswapV4PoolManager(TOKEN)).toBe(false);
  });
});

describe("Uniswap V4 tick and liquidity math", () => {
  test("matches TickMath boundaries and is monotonic", () => {
    expect(uniswapV4SqrtPriceX96AtTick(0)).toBe(UNISWAP_V4_Q96);
    expect(uniswapV4SqrtPriceX96AtTick(-UNISWAP_V4_MAX_TICK)).toBe(
      4_295_128_739n,
    );
    expect(uniswapV4SqrtPriceX96AtTick(UNISWAP_V4_MAX_TICK)).toBe(
      1_461_446_703_485_210_103_287_273_052_203_988_822_378_723_970_342n,
    );
    expect(uniswapV4SqrtPriceX96AtTick(-200)).toBeLessThan(
      uniswapV4SqrtPriceX96AtTick(200),
    );
    expect(() => uniswapV4SqrtPriceX96AtTick(UNISWAP_V4_MAX_TICK + 1)).toThrow(
      /outside/,
    );
  });

  test("derived liquidity never consumes more than the supplied amounts", () => {
    const current = uniswapV4SqrtPriceX96AtTick(0);
    const lower = uniswapV4SqrtPriceX96AtTick(-6_000);
    const upper = uniswapV4SqrtPriceX96AtTick(6_000);
    const amount0 = 10n ** 18n;
    const amount1 = 10n ** 18n;
    const liquidity = uniswapV4LiquidityForAmounts(
      current,
      lower,
      upper,
      amount0,
      amount1,
    );
    const needed = uniswapV4AmountsForLiquidity(
      current,
      lower,
      upper,
      liquidity,
    );
    expect(liquidity).toBeGreaterThan(0n);
    expect(needed.amount0).toBeLessThanOrEqual(amount0);
    expect(needed.amount1).toBeLessThanOrEqual(amount1);
    expect(
      uniswapV4AmountsForLiquidity(current, upper, lower, liquidity),
    ).toEqual(needed);
    expect(() =>
      uniswapV4AmountsForLiquidity(current, lower, lower, liquidity),
    ).toThrow(/range/);
  });

  test("aligns positive and negative ticks in the correct direction", () => {
    expect(uniswapV4AlignTickDown(250, 200)).toBe(200);
    expect(uniswapV4AlignTickDown(-250, 200)).toBe(-400);
    expect(uniswapV4AlignTickUp(250, 200)).toBe(400);
    expect(uniswapV4AlignTickUp(-250, 200)).toBe(-200);
    expect(() => uniswapV4AlignTickDown(1.5, 200)).toThrow(/integer/);
  });

  test("unpacks signed lower and upper position ticks", () => {
    const lower = -600n & 0xffffffn;
    const upper = 1_200n;
    expect(uniswapV4PositionTicks((upper << 32n) | (lower << 8n))).toEqual({
      lower: -600,
      upper: 1_200,
    });
  });
});

describe("Uniswap V4 form projections and logs", () => {
  test("counterpart amounts round-trip inside a range", () => {
    const counterpart = uniswapV4CounterpartAmount(3, true, 1, 0.5, 2);
    expect(counterpart).not.toBeNull();
    expect(
      uniswapV4CounterpartAmount(counterpart!, false, 1, 0.5, 2),
    ).toBeCloseTo(3);
    expect(uniswapV4CounterpartAmount(3, true, 2, 0.5, 2)).toBe(0);
    expect(uniswapV4CounterpartAmount(3, false, 2, 0.5, 2)).toBeNull();
  });

  test("prefers an economic corridor only when it brackets spot", () => {
    expect(uniswapV4DefaultPriceRange(1, 0.5, 2)).toEqual({
      min: 0.5,
      max: 2,
      economic: true,
    });
    expect(uniswapV4DefaultPriceRange(3, 0.5, 2)).toEqual({
      min: 1.5,
      max: 6,
      economic: false,
    });
  });

  test("extracts only PositionManager-issued position salts", () => {
    const positionManager = UNISWAP_V4_POSITION_MANAGER_ADDRESSES[1]!;
    const data = encodeAbiParameters(
      [
        { type: "int24" },
        { type: "int24" },
        { type: "int256" },
        { type: "bytes32" },
      ],
      [-200, 200, 1n, pad("0x2a", { size: 32 })],
    );
    const log = {
      topics: [
        UNISWAP_V4_MODIFY_LIQUIDITY_TOPIC,
        zeroHash,
        pad(positionManager, { size: 32 }),
      ],
      data,
    };
    expect(uniswapV4PositionTokenIdFromLog(log, positionManager)).toBe(42n);
    expect(uniswapV4PositionTokenIdFromLog(log, TOKEN)).toBeNull();
    expect(
      uniswapV4PositionTokenIdFromLog(
        { ...log, topics: [zeroHash, ...log.topics.slice(1)] },
        positionManager,
      ),
    ).toBeNull();
  });
});
