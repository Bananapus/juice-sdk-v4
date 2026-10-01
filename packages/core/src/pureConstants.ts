import type { Address } from "viem";
import type { JBChainId } from "./types.js";

// Constants that run nothing on import. constants.ts re-exports them; modules
// an app loads first import them from here, so they don't load the chain
// definitions too (moduleLoad.test.ts).

/**
 * The 100% representation for a ruleset's Splits.
 *
 * The sum of all Splits should total this value.
 *
 * @link JBConstants.sol
 */
export const SPLITS_TOTAL_PERCENT = 1_000_000_000;

/**
 * USDC contract addresses on supported chains.
 */
export const USDC_ADDRESSES: Record<JBChainId, Address> = {
  11155111: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Sepolia
  1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // Ethereum
  11155420: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7", // OP Sepolia
  10: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // OP Mainnet
  84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base
  421614: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // Arbitrum Sepolia
  42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // Arbitrum One
};
