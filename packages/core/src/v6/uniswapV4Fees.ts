import {
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  keccak256,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { UNISWAP_V4_STATE_VIEW_ADDRESSES } from "./uniswapV4Deployments.js";
import type { JBChainId } from "../types.js";

const UINT256_MAX = (1n << 256n) - 1n;
const Q128 = 1n << 128n;

const STATE_VIEW_ABI = [
  {
    type: "function",
    name: "getFeeGrowthInside",
    stateMutability: "view",
    inputs: [
      { name: "poolId", type: "bytes32" },
      { name: "tickLower", type: "int24" },
      { name: "tickUpper", type: "int24" },
    ],
    outputs: [
      { name: "feeGrowthInside0X128", type: "uint256" },
      { name: "feeGrowthInside1X128", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getPositionInfo",
    stateMutability: "view",
    inputs: [
      { name: "poolId", type: "bytes32" },
      { name: "positionId", type: "bytes32" },
    ],
    outputs: [
      { name: "liquidity", type: "uint128" },
      { name: "feeGrowthInside0LastX128", type: "uint256" },
      { name: "feeGrowthInside1LastX128", type: "uint256" },
    ],
  },
] as const;

const POSITION_MANAGER_ABI = [
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
] as const;

/** v4-periphery `Actions.DECREASE_LIQUIDITY`. */
const ACTION_DECREASE_LIQUIDITY = 0x01;
/** v4-periphery `Actions.TAKE_PAIR`. */
const ACTION_TAKE_PAIR = 0x11;

/**
 * The PoolManager position key: `keccak256(abi.encodePacked(owner, tickLower,
 * tickUpper, salt))`. For a PositionManager-held position the owner is the
 * PositionManager and the salt is the position's token id.
 */
export function uniswapV4PositionId({
  owner,
  tickLower,
  tickUpper,
  salt,
}: {
  owner: Address;
  tickLower: number;
  tickUpper: number;
  salt: bigint;
}): Hex {
  return keccak256(
    encodePacked(
      ["address", "int24", "int24", "bytes32"],
      [
        owner,
        tickLower,
        tickUpper,
        `0x${salt.toString(16).padStart(64, "0")}` as Hex,
      ],
    ),
  );
}

/**
 * Fees a position has accrued since its last checkpoint, from the pool's fee
 * growth accumulators.
 *
 * @remarks Fee growth accumulators are unchecked `uint256` in the pool and are
 * expected to wrap; the difference is therefore taken modulo 2^256, exactly as
 * Solidity computes it. A checked subtraction would read a wrapped accumulator
 * as a negative (or enormous) balance.
 */
export function uniswapV4FeesOwed({
  liquidity,
  feeGrowthInsideLastX128,
  feeGrowthInsideX128,
}: {
  liquidity: bigint;
  feeGrowthInsideLastX128: bigint;
  feeGrowthInsideX128: bigint;
}): bigint {
  if (liquidity <= 0n) return 0n;
  const delta = (feeGrowthInsideX128 - feeGrowthInsideLastX128) & UINT256_MAX;
  return (delta * liquidity) / Q128;
}

export interface UniswapV4PositionFees {
  /** Unclaimed currency0 fees, in currency0's own decimals. */
  amount0: bigint;
  /** Unclaimed currency1 fees, in currency1's own decimals. */
  amount1: bigint;
  /** The position's live liquidity, as the pool records it. */
  liquidity: bigint;
}

/**
 * Read a position's unclaimed fees through StateView.
 *
 * This is the fees CLAIMABLE NOW, not the position's lifetime earnings: the
 * pool rewrites `feeGrowthInsideLast` on every collect, so anything already
 * taken is no longer visible here. Reconstructing lifetime earnings means
 * replaying the position's `ModifyLiquidity` events against archive state.
 */
export async function readUniswapV4PositionFees(
  client: Pick<PublicClient, "readContract">,
  {
    chainId,
    stateView,
    poolId,
    positionManager,
    tokenId,
    tickLower,
    tickUpper,
  }: {
    chainId?: JBChainId;
    /** Overrides the chain's canonical StateView deployment. */
    stateView?: Address;
    poolId: Hex;
    positionManager: Address;
    tokenId: bigint;
    tickLower: number;
    tickUpper: number;
  },
): Promise<UniswapV4PositionFees> {
  const lens =
    stateView ??
    (chainId
      ? (
          UNISWAP_V4_STATE_VIEW_ADDRESSES as Readonly<
            Partial<Record<number, Address>>
          >
        )[chainId]
      : undefined);
  if (!lens) {
    throw new Error(
      `No Uniswap V4 StateView deployment for chain ${chainId ?? "unknown"}.`,
    );
  }

  const positionId = uniswapV4PositionId({
    owner: positionManager,
    tickLower,
    tickUpper,
    salt: tokenId,
  });

  const [position, inside] = await Promise.all([
    client.readContract({
      address: lens,
      abi: STATE_VIEW_ABI,
      functionName: "getPositionInfo",
      args: [poolId, positionId],
    }),
    client.readContract({
      address: lens,
      abi: STATE_VIEW_ABI,
      functionName: "getFeeGrowthInside",
      args: [poolId, tickLower, tickUpper],
    }),
  ]);

  const [liquidity, feeGrowthInside0Last, feeGrowthInside1Last] = position;
  const [feeGrowthInside0, feeGrowthInside1] = inside;

  return {
    liquidity,
    amount0: uniswapV4FeesOwed({
      liquidity,
      feeGrowthInsideLastX128: feeGrowthInside0Last,
      feeGrowthInsideX128: feeGrowthInside0,
    }),
    amount1: uniswapV4FeesOwed({
      liquidity,
      feeGrowthInsideLastX128: feeGrowthInside1Last,
      feeGrowthInsideX128: feeGrowthInside1,
    }),
  };
}

export interface UniswapV4CollectFeesTxRequest {
  to: Address;
  data: Hex;
  value: bigint;
}

/**
 * Collect a position's fees without touching its liquidity.
 *
 * A V4 "collect" is a zero-liquidity decrease: the pool settles the accrued
 * fees into the position's delta, and TAKE_PAIR pays both currencies out. The
 * minimum-out parameters are 0 because nothing is swapped — the amounts are
 * whatever the pool has already accrued, so a floor could only make a valid
 * claim revert.
 */
export function buildCollectUniswapV4FeesTx({
  positionManager,
  tokenId,
  currency0,
  currency1,
  recipient,
  deadline,
}: {
  positionManager: Address;
  tokenId: bigint;
  currency0: Address;
  currency1: Address;
  recipient: Address;
  deadline: bigint;
}): UniswapV4CollectFeesTxRequest {
  const decreaseParams = encodeAbiParameters(
    [
      { type: "uint256" },
      { type: "uint128" },
      { type: "uint128" },
      { type: "uint128" },
      { type: "bytes" },
    ],
    [tokenId, 0n, 0n, 0n, "0x"],
  );
  const takeParams = encodeAbiParameters(
    [{ type: "address" }, { type: "address" }, { type: "address" }],
    [currency0, currency1, recipient],
  );
  const actions = encodePacked(
    ["uint8", "uint8"],
    [ACTION_DECREASE_LIQUIDITY, ACTION_TAKE_PAIR],
  );
  const unlockData = encodeAbiParameters(
    [{ type: "bytes" }, { type: "bytes[]" }],
    [actions, [decreaseParams, takeParams]],
  );

  return {
    to: positionManager,
    data: encodeFunctionData({
      abi: POSITION_MANAGER_ABI,
      functionName: "modifyLiquidities",
      args: [unlockData, deadline],
    }),
    value: 0n,
  };
}
