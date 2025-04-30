import { describe, expect, test } from "vitest";
import { calcPrepaidFee } from "./calcPrepaidFee.js";

describe("calcPrepaidFee", () => {
  test("calcPrepaidFee", () => {
    expect(calcPrepaidFee(1)).toEqual(29n);
    expect(calcPrepaidFee(0)).toEqual(25n);
    expect(calcPrepaidFee(121)).toEqual(500n);
  });
});
