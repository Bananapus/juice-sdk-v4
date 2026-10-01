import type { Hex } from "viem";

// Readers for values that came from a service, an RPC or storage. Each returns
// null, or false, for anything outside the exact shape, never a guess.

const MAX_UINT256 = (1n << 256n) - 1n;

/** A uint256 given as decimal or 0x-hex digits, a safe integer or a bigint. */
export function uint256(value: unknown): bigint | null {
  let parsed: bigint;
  if (typeof value === "bigint") parsed = value;
  else if (typeof value === "number" && Number.isSafeInteger(value)) {
    parsed = BigInt(value);
  } else if (
    typeof value === "string" &&
    /^(?:0x[0-9a-f]+|\d+)$/iu.test(value)
  ) {
    parsed = BigInt(value);
  } else return null;
  return parsed >= 0n && parsed <= MAX_UINT256 ? parsed : null;
}

/** Whole bytes of hex, "0x" included. */
export function isHexBytes(value: unknown): value is Hex {
  return typeof value === "string" && /^0x(?:[0-9a-f]{2})*$/iu.test(value);
}

/** Exactly 32 bytes of hex: a transaction, block or Safe transaction hash. */
export function isBytes32(value: unknown): value is Hex {
  return typeof value === "string" && /^0x[0-9a-f]{64}$/iu.test(value);
}
