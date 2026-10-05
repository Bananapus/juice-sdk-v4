import { Address, Hex, zeroAddress } from "viem";
import {
  BASE_CURRENCY_ETH,
  BASE_CURRENCY_USD,
  NATIVE_TOKEN_CURRENCY_ID,
} from "./currency.js";
import type { REVDeploy721TiersHookConfig } from "./revnets.js";
import type { JBAccountingContext } from "./terminals.js";

/** Explicit shop powers; withholding a power is a deliberate deployment policy. */
export interface Revnet721OperatorPermissions {
  canAdjustTiers: boolean;
  canUpdateMetadata: boolean;
  canMint: boolean;
  canIncreaseDiscountPercent: boolean;
}

/** Choose conventional units for new prices, preserving explicitly supplied units.
 * USD uses 6 decimals; ETH uses 18; token currencies use their accounting context.
 * Onchain shops may legitimately use any precision from 0 through 18. This helper
 * cannot determine how existing integer tier prices were intended to be scaled.
 */
export function resolve721PricingContext({
  currency,
  accountingContexts = [],
  decimals,
}: {
  currency: number;
  accountingContexts?: readonly JBAccountingContext[];
  decimals?: number;
}): { currency: number; decimals: number } {
  if (!Number.isInteger(currency) || currency < 0 || currency > 0xffffffff) {
    throw new Error("A shop currency must fit in uint32.");
  }
  if (decimals === undefined) {
    if (currency === BASE_CURRENCY_USD) decimals = 6;
    else if (
      currency === BASE_CURRENCY_ETH ||
      currency === NATIVE_TOKEN_CURRENCY_ID
    )
      decimals = 18;
    else {
      const candidates = new Set(
        accountingContexts
          .filter((context) => context.currency === currency)
          .map((context) => context.decimals),
      );
      if (candidates.size === 1) decimals = [...candidates][0];
    }
  }
  if (decimals === undefined)
    throw new Error(
      "Supply explicit pricing decimals for this custom or ambiguous currency.",
    );
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new Error(
      "Shop pricing decimals must be an integer between 0 and 18.",
    );
  }
  return { currency, decimals };
}

/** Build the explicit shop configuration accepted by REVDeployer's six-argument
 * overload. Always encode tier prices using the returned pricing precision.
 */
export function buildRevnet721Config(args: {
  name: string;
  symbol: string;
  contractUri: string;
  salt: Hex;
  pricing: { currency: number; decimals: number };
  tiers?: REVDeploy721TiersHookConfig["baseline721HookConfiguration"]["tiersConfig"]["tiers"];
  flags?: REVDeploy721TiersHookConfig["baseline721HookConfiguration"]["flags"];
  operatorPermissions: Revnet721OperatorPermissions;
  baseUri?: string;
  tokenUriResolver?: Address;
}): REVDeploy721TiersHookConfig {
  const pricing = resolve721PricingContext(args.pricing);
  const permissions = args.operatorPermissions;
  if (
    !permissions ||
    [
      permissions.canAdjustTiers,
      permissions.canUpdateMetadata,
      permissions.canMint,
      permissions.canIncreaseDiscountPercent,
    ].some((value) => typeof value !== "boolean")
  ) {
    throw new Error("Choose all four shop operator permissions explicitly.");
  }
  return {
    baseline721HookConfiguration: {
      name: args.name,
      symbol: args.symbol,
      baseUri: args.baseUri ?? "ipfs://",
      tokenUriResolver: args.tokenUriResolver ?? zeroAddress,
      contractUri: args.contractUri,
      tiersConfig: { tiers: args.tiers ?? [], ...pricing },
      flags: args.flags ?? {
        noNewTiersWithReserves: false,
        noNewTiersWithVotes: false,
        noNewTiersWithOwnerMinting: false,
        preventOverspending: false,
      },
    },
    salt: args.salt,
    preventOperatorAdjustingTiers: !permissions.canAdjustTiers,
    preventOperatorUpdatingMetadata: !permissions.canUpdateMetadata,
    preventOperatorMinting: !permissions.canMint,
    preventOperatorIncreasingDiscountPercent:
      !permissions.canIncreaseDiscountPercent,
  };
}
