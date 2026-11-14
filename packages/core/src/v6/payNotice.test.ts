import { describe, expect, it } from "vitest";
import { payNoticeView } from "./payNotice.js";

describe("payNoticeView", () => {
  it("shows the paid chain's notice and the chains that read differently, in the site's order", () => {
    const order = [1, 8453, 42161, 10];
    expect(
      payNoticeView(
        8453,
        { 10: "Other terms", 1: "Terms", 8453: "Terms", 42161: "", 137: null },
        (a, b) => order.indexOf(a) - order.indexOf(b),
      ),
    ).toEqual({
      notice: "Terms",
      failed: false,
      others: [
        { chainId: 42161, notice: "" },
        { chainId: 10, notice: "Other terms" },
      ],
    });
  });

  it("marks a failed read and compares nothing to it", () => {
    expect(payNoticeView(1, { 1: null, 10: "Terms" })).toEqual({
      notice: "",
      failed: true,
      others: [],
    });
    expect(payNoticeView(1, { 10: "Terms" }).failed).toBe(true);
  });

  it("treats no notice as a notice: an empty one is not a failure", () => {
    expect(payNoticeView(1, { 1: "", 10: "" })).toEqual({
      notice: "",
      failed: false,
      others: [],
    });
  });
});
