import { toHex } from "viem";

/**
 * A fresh 32-byte salt.
 *
 * Uses the platform CSPRNG and fills all 32 bytes. The previous implementation
 * hexed `Math.random()` and right-padded it to 32 bytes, which put ~52 bits of
 * non-cryptographic entropy in the HIGH bytes and left the rest zero — and
 * these salts seed the deterministic addresses of omnichain suckers and project
 * ERC-20s, where a collision or a prediction is not recoverable.
 */
export function createSalt() {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}
