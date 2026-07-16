import { Address, Hex, PublicClient } from "viem";
import {
  jbMultiTerminalAbi,
  jbTerminalStoreAbi,
} from "../generated/juicebox.js";
import { JBChainId } from "../types.js";
import { applyJbDaoCashOutFee } from "../utils/fee.js";
import { NATIVE_TOKEN_CURRENCY_ID } from "./currency.js";
import { v6Address } from "./types.js";

/**
 * A prepared `cashOutTokensOf` transaction request, accepted as-is by viem's
 * `walletClient.writeContract` and wagmi's `writeContract`.
 */
export interface V6CashOutTxRequest {
  chainId: JBChainId;
  address: Address;
  abi: typeof jbMultiTerminalAbi;
  functionName: "cashOutTokensOf";
  args: readonly [Address, bigint, bigint, Address, bigint, Address, Hex];
}

/**
 * Build a `cashOutTokensOf(holder, projectId, cashOutCount, tokenToReclaim,
 * minTokensReclaimed, beneficiary, metadata)` transaction request for a v6 terminal.
 *
 * @param args.chainId The chain to cash out on.
 * @param args.terminal The terminal holding the project's `tokenToReclaim` balance.
 * @param args.holder The address whose project tokens are being cashed out.
 * @param args.projectId The project's id.
 * @param args.cashOutCount The number of project tokens to cash out, as a fixed point
 * number with 18 decimals.
 * @param args.tokenToReclaim The terminal token to reclaim from the project's surplus.
 * @param args.minTokensReclaimed The minimum `tokenToReclaim` amount that must be
 * reclaimed, else the transaction reverts. Defaults to 0.
 * @param args.beneficiary The address that receives the reclaimed tokens.
 * @param args.metadata Hook metadata. Defaults to "0x".
 * @returns The transaction request.
 */
export function buildCashOutTx({
  chainId,
  terminal,
  holder,
  projectId,
  cashOutCount,
  tokenToReclaim,
  minTokensReclaimed = 0n,
  beneficiary,
  metadata = "0x",
}: {
  chainId: JBChainId;
  terminal: Address;
  holder: Address;
  projectId: bigint;
  cashOutCount: bigint;
  tokenToReclaim: Address;
  minTokensReclaimed?: bigint;
  beneficiary: Address;
  metadata?: Hex;
}): V6CashOutTxRequest {
  return {
    chainId,
    address: terminal,
    abi: jbMultiTerminalAbi,
    functionName: "cashOutTokensOf",
    args: [
      holder,
      projectId,
      cashOutCount,
      tokenToReclaim,
      minTokensReclaimed,
      beneficiary,
      metadata,
    ],
  };
}

/**
 * A cash out quote.
 */
export interface CashOutQuote {
  /**
   * The reclaimable surplus for the cash out count, before the protocol fee.
   */
  reclaimAmount: bigint;
  /**
   * The reclaim amount net of the 2.5% protocol cash out fee.
   *
   * The fee only applies when the ruleset's cash out tax rate is non-zero — for
   * zero-tax rulesets the full {@link CashOutQuote.reclaimAmount} is paid out.
   */
  reclaimAmountAfterFee: bigint;
}

/**
 * Quote the surplus reclaimed by cashing out `cashOutCount` project tokens, via
 * `JBTerminalStore.currentReclaimableSurplusOf(projectId, cashOutCount, [], [],
 * decimals, currency)`. Passing empty terminal/token arrays uses all of the project's
 * terminals and tokens.
 *
 * @param client A viem public client on the given chain.
 * @param args.chainId The chain to quote on.
 * @param args.projectId The project's id.
 * @param args.cashOutCount The number of project tokens to cash out, as a fixed point
 * number with 18 decimals.
 * @param args.decimals The decimals to quote the reclaim amount in. Defaults to 18.
 * @param args.currency The currency to quote the reclaim amount in (an
 * accounting-context currency, `uint32(uint160(token))`). Defaults to the native
 * token's currency (61166).
 * @returns The raw reclaim amount and the amount net of the 2.5% protocol fee.
 */
export async function getCashOutQuote(
  client: PublicClient,
  {
    chainId,
    projectId,
    cashOutCount,
    decimals = 18n,
    currency = BigInt(NATIVE_TOKEN_CURRENCY_ID),
  }: {
    chainId: JBChainId;
    projectId: bigint;
    cashOutCount: bigint;
    decimals?: bigint;
    currency?: bigint;
  },
): Promise<CashOutQuote> {
  const reclaimAmount = await client.readContract({
    address: v6Address("JBTerminalStore", chainId),
    abi: jbTerminalStoreAbi,
    functionName: "currentReclaimableSurplusOf",
    args: [projectId, cashOutCount, [], [], decimals, currency],
  });

  return {
    reclaimAmount,
    reclaimAmountAfterFee: applyJbDaoCashOutFee(reclaimAmount),
  };
}
