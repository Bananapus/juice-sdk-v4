import { decodeAbiParameters, decodeFunctionData } from "viem";
import { describe, expect, test } from "vitest";
import {
  buildCollectUniswapV4FeesTx,
  readUniswapV4PositionFees,
  uniswapV4FeesOwed,
  uniswapV4PositionId,
} from "./uniswapV4Fees.js";
import { UNISWAP_V4_STATE_VIEW_ADDRESSES } from "./uniswapV4Deployments.js";

// The ART/USDC pool on Base, read at block 49458950. Keeping a real position
// here pins the whole chain of math against state that actually existed.
const ART_USDC_POOL =
  "0x760dee01ca4afcf02e6aaa16a59d809c08e16895652b01c4306f5536760bb77d" as const;
const BASE_POSITION_MANAGER =
  "0x7c5f5a4bbd8fd63184577525326123b519429bdc" as const;
const ART = "0x44c4516768e47cd97cff2561b81a74699f23f8ec" as const;
const USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913" as const;
const TOKEN_ID = 2864727n;
const TICK_LOWER = -392200;
const TICK_UPPER = -340600;
const LIQUIDITY = 143800072655163317n;
const FEE_GROWTH_INSIDE_1 = 32541020662148266151501820090n;

describe("uniswapV4PositionId", () => {
  test("matches the pool's key for a live PositionManager position", () => {
    // Verified against StateView.getPositionInfo on Base: this id returns the
    // position's real liquidity, so the packing (address, int24, int24, bytes32)
    // is right — a wrong key silently reads an empty position instead.
    expect(
      uniswapV4PositionId({
        owner: BASE_POSITION_MANAGER,
        tickLower: TICK_LOWER,
        tickUpper: TICK_UPPER,
        salt: TOKEN_ID,
      }),
    ).toBe(
      "0x34bf69524209147fed65f9af6b1b20091647aff24618aeb98279c5b48767e734",
    );
  });
});

describe("uniswapV4FeesOwed", () => {
  test("computes the live position's unclaimed fees", () => {
    expect(
      uniswapV4FeesOwed({
        liquidity: LIQUIDITY,
        feeGrowthInsideLastX128: 0n,
        feeGrowthInsideX128: FEE_GROWTH_INSIDE_1,
      }),
    ).toBe(13751523n); // 13.751523 USDC
  });

  test("treats a wrapped accumulator as forward progress", () => {
    // Pool fee growth is unchecked uint256 and is expected to wrap. A checked
    // subtraction would read this as a colossal negative and either throw or
    // report a nonsense balance.
    const max = (1n << 256n) - 1n;
    expect(
      uniswapV4FeesOwed({
        liquidity: 1n << 128n,
        feeGrowthInsideLastX128: max - 3n,
        feeGrowthInsideX128: 4n,
      }),
    ).toBe(8n);
  });

  test("reports nothing for a closed position", () => {
    expect(
      uniswapV4FeesOwed({
        liquidity: 0n,
        feeGrowthInsideLastX128: 0n,
        feeGrowthInsideX128: FEE_GROWTH_INSIDE_1,
      }),
    ).toBe(0n);
  });

  test("reports nothing when no growth has accrued since the checkpoint", () => {
    expect(
      uniswapV4FeesOwed({
        liquidity: LIQUIDITY,
        feeGrowthInsideLastX128: FEE_GROWTH_INSIDE_1,
        feeGrowthInsideX128: FEE_GROWTH_INSIDE_1,
      }),
    ).toBe(0n);
  });
});

describe("readUniswapV4PositionFees", () => {
  test("resolves the chain's StateView and pairs both currencies", async () => {
    const calls: { address: string; functionName: string }[] = [];
    const client = {
      readContract: async ({
        address,
        functionName,
      }: {
        address: string;
        functionName: string;
      }) => {
        calls.push({ address, functionName });
        if (functionName === "getPositionInfo") {
          return [LIQUIDITY, 0n, 0n];
        }
        return [0n, FEE_GROWTH_INSIDE_1];
      },
    } as never;

    const fees = await readUniswapV4PositionFees(client, {
      chainId: 8453,
      poolId: ART_USDC_POOL,
      positionManager: BASE_POSITION_MANAGER,
      tokenId: TOKEN_ID,
      tickLower: TICK_LOWER,
      tickUpper: TICK_UPPER,
    });

    expect(fees).toEqual({
      liquidity: LIQUIDITY,
      amount0: 0n,
      amount1: 13751523n,
    });
    expect(
      calls.every(
        (call) => call.address === UNISWAP_V4_STATE_VIEW_ADDRESSES[8453],
      ),
    ).toBe(true);
  });

  test("fails closed on a chain with no StateView deployment", async () => {
    const client = { readContract: async () => [] } as never;
    await expect(
      readUniswapV4PositionFees(client, {
        chainId: 11155420 as never,
        poolId: ART_USDC_POOL,
        positionManager: BASE_POSITION_MANAGER,
        tokenId: TOKEN_ID,
        tickLower: TICK_LOWER,
        tickUpper: TICK_UPPER,
      }),
    ).rejects.toThrow(/StateView/);
  });
});

describe("buildCollectUniswapV4FeesTx", () => {
  test("encodes a zero-liquidity decrease paired with a take", () => {
    const tx = buildCollectUniswapV4FeesTx({
      positionManager: BASE_POSITION_MANAGER,
      tokenId: TOKEN_ID,
      currency0: ART,
      currency1: USDC,
      recipient: "0x63d2dfea64b3433f4071a98665bcd7ca14d93496",
      deadline: 1_800_000_000n,
    });

    expect(tx.to).toBe(BASE_POSITION_MANAGER);
    expect(tx.value).toBe(0n);

    const call = decodeFunctionData({
      abi: [
        {
          type: "function",
          name: "modifyLiquidities",
          stateMutability: "payable",
          inputs: [
            { name: "unlockData", type: "bytes" },
            { name: "deadline", type: "uint256" },
          ],
          outputs: [],
        },
      ] as const,
      data: tx.data,
    });
    expect(call.args[1]).toBe(1_800_000_000n);

    const [actions, params] = decodeAbiParameters(
      [{ type: "bytes" }, { type: "bytes[]" }],
      call.args[0],
    );
    // DECREASE_LIQUIDITY (0x01) then TAKE_PAIR (0x11). Any other opcode pair
    // would move liquidity instead of only sweeping fees.
    expect(actions).toBe("0x0111");
    expect(params).toHaveLength(2);

    const [decodedTokenId, liquidity, amount0Min, amount1Min] =
      decodeAbiParameters(
        [
          { type: "uint256" },
          { type: "uint128" },
          { type: "uint128" },
          { type: "uint128" },
          { type: "bytes" },
        ],
        params[0],
      );
    expect(decodedTokenId).toBe(TOKEN_ID);
    expect(liquidity).toBe(0n);
    expect(amount0Min).toBe(0n);
    expect(amount1Min).toBe(0n);

    expect(
      decodeAbiParameters(
        [{ type: "address" }, { type: "address" }, { type: "address" }],
        params[1],
      ),
    ).toEqual([
      "0x44c4516768e47cd97cfF2561B81a74699F23f8Ec",
      "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "0x63D2DfEA64b3433F4071A98665bcD7Ca14d93496",
    ]);
  });
});
