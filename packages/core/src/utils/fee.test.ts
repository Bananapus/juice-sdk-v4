import { ONE_ETHER } from "../constants.js";
import { describe, expect, test } from "vitest";
import { applyJbDaoCashOutFee } from "./fee.js";

describe("fee", () => {
  test("applyJbDaoCashOutFee", () => {
    expect(applyJbDaoCashOutFee(ONE_ETHER)).toEqual(975000000000000000n);
  });
});
