import { describe, expect, it } from "vitest";
import { gasWithHeadroom } from "./gas.js";

describe("gasWithHeadroom", () => {
  it("sets an explicit 2x limit without rounding loss", () => {
    expect(gasWithHeadroom(1_119_186n)).toBe(2_238_372n);
  });
});
