import type { Address, Hex, PublicClient } from "viem";

/**
 * Wallet gas limits are deliberately twice the latest RPC estimate.
 *
 * Some Juicebox terminal calls catch a failed internal fee payment and keep
 * going. An RPC can therefore return an estimate for that cheaper recovery
 * path even though the intended fee route needs more gas. Unused gas is not
 * spent, so a 2x limit is a cheap guard against that under-estimation.
 */
export function gasWithHeadroom(estimate: bigint): bigint {
  return estimate * 2n;
}

/**
 * The gas limit to send for a call that carries a reviewed cap.
 *
 * A cap bounds an `eth_call` against a target-controlled contract; it is not
 * what the call costs. Wallets reject a transaction whose `gas * maxFeePerGas`
 * exceeds the balance, so sending the cap itself turns a 1M-gas mainnet cap
 * into a ~0.003 ETH balance requirement for a call that burns a tenth of that.
 *
 * Measurement stays bounded by the cap, and the cap survives when the node
 * cannot measure.
 */
export async function gasWithinCap(
  client: PublicClient,
  tx: { account: Address; to: Address; data: Hex; value?: bigint },
  cap?: bigint,
): Promise<bigint | undefined> {
  try {
    const estimate = await client.estimateGas({
      ...tx,
      ...(cap === undefined ? {} : { gas: cap }),
    });
    const measured = gasWithHeadroom(estimate);
    return cap !== undefined && cap < measured ? cap : measured;
  } catch {
    return cap;
  }
}
