import { jbContractAddress } from "../generated/juicebox.js";
import { describe, expect, test } from "vitest";
import { calcPrepaidFee, getRevnetLoanContract } from "./revnet.js";

describe("calcPrepaidFee", () => {
  test("clamps the contract fee at both boundaries", () => {
    expect(calcPrepaidFee(1)).toEqual(29n);
    expect(calcPrepaidFee(0)).toEqual(25n);
    expect(calcPrepaidFee(-1)).toEqual(25n);
    expect(calcPrepaidFee(121)).toEqual(500n);
  });
});

describe("getRevnetLoanContract", () => {
  test("selects the version-specific canonical loan deployment", () => {
    expect(getRevnetLoanContract(4, 1)).toBe(
      jbContractAddress[4].REVLoans1_1[1],
    );
    expect(getRevnetLoanContract(5, 1)).toBe(jbContractAddress[5].REVLoans[1]);
    expect(getRevnetLoanContract(6, 1)).toBe(jbContractAddress[6].REVLoans[1]);
  });
});
