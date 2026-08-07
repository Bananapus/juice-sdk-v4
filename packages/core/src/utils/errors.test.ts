import {
  BaseError,
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  ContractFunctionZeroDataError,
  HttpRequestError,
} from "viem";
import { describe, expect, test } from "vitest";
import { jbPricesAbi } from "../generated/juicebox.js";
import {
  isContractRevertError,
  isMissingContractFunctionError,
} from "./errors.js";

const wrap = (cause: BaseError) =>
  new ContractFunctionExecutionError(cause, {
    abi: jbPricesAbi,
    args: [],
    contractAddress: "0x0000000000000000000000000000000000000001",
    functionName: "pricePerUnitOf",
  });

const revert = new ContractFunctionRevertedError({
  abi: jbPricesAbi,
  functionName: "pricePerUnitOf",
});
const zeroData = new ContractFunctionZeroDataError({
  functionName: "pricePerUnitOf",
});
const transport = new HttpRequestError({
  url: "https://rpc.example",
  details: "fetch failed",
});

describe("isContractRevertError", () => {
  test("finds a revert anywhere in the cause chain", () => {
    expect(isContractRevertError(revert)).toBe(true);
    expect(isContractRevertError(wrap(revert))).toBe(true);
  });

  test("never treats transport failures or empty data as a revert", () => {
    expect(isContractRevertError(wrap(transport))).toBe(false);
    expect(isContractRevertError(transport)).toBe(false);
    expect(isContractRevertError(wrap(zeroData))).toBe(false);
    expect(isContractRevertError(new Error("socket hang up"))).toBe(false);
    expect(isContractRevertError(undefined)).toBe(false);
  });
});

describe("isMissingContractFunctionError", () => {
  test("accepts both shapes a missing getter produces", () => {
    expect(isMissingContractFunctionError(wrap(revert))).toBe(true);
    expect(isMissingContractFunctionError(wrap(zeroData))).toBe(true);
    expect(isMissingContractFunctionError(zeroData)).toBe(true);
  });

  test("rejects transport failures and non-viem errors", () => {
    expect(isMissingContractFunctionError(wrap(transport))).toBe(false);
    expect(isMissingContractFunctionError(new Error("timeout"))).toBe(false);
    expect(isMissingContractFunctionError(null)).toBe(false);
  });
});
