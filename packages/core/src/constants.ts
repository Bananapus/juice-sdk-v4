import { parseEther } from "viem";

/**
 * Representation of one ether.
 */
export const ONE_ETHER = parseEther("1");

/**
 * Default value for `memo` arguments in Juicebox transactions.
 */
export const DEFAULT_MEMO = "";

/**
 * Default value for `metadata` arguments in Juicebox transactions.
 */
export const DEFAULT_METADATA = "0x0";
export const DEFAULT_MIN_RETURNED_TOKENS = 0n;
export const DEFAULT_ALLOW_OVERSPENDING = true;
