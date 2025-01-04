import { JBDAO_CASHOUT_FEE_PERCENT } from "../constants.js";

export function applyJbDaoCashOutFee(tokenAmountWei: bigint) {
  return (
    (tokenAmountWei * BigInt((1 - JBDAO_CASHOUT_FEE_PERCENT) * 1000)) / 1000n
  );
}
