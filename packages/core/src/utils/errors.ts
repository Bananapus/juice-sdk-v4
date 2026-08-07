import {
  BaseError,
  ContractFunctionRevertedError,
  ContractFunctionZeroDataError,
} from "viem";

/**
 * Whether an error proves the CONTRACT answered by reverting the call
 * (`ContractFunctionRevertedError` anywhere in the cause chain). A revert is a
 * fact about on-chain state; transport failures, timeouts, and wrong-chain
 * errors return false — they prove nothing and must not be interpreted as an
 * on-chain answer. (viem wraps every `readContract` failure — including HTTP
 * errors — in `ContractFunctionExecutionError`, so the wrapper type alone
 * cannot make this distinction; the cause chain can.)
 */
export function isContractRevertError(error: unknown): boolean {
  return (
    error instanceof BaseError &&
    error.walk((cause) => cause instanceof ContractFunctionRevertedError) !==
      null
  );
}

/**
 * Whether a read failed because the contract reverted OR returned no data —
 * the two shapes produced by calling a getter the target contract does not
 * implement. Use this to gate "older contract without the function" fallbacks;
 * transport failures return false and should be rethrown, never treated as
 * "the function does not exist".
 */
export function isMissingContractFunctionError(error: unknown): boolean {
  return (
    error instanceof BaseError &&
    error.walk(
      (cause) =>
        cause instanceof ContractFunctionRevertedError ||
        cause instanceof ContractFunctionZeroDataError,
    ) !== null
  );
}
