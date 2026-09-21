import { describe, expect, test } from "vitest";
import { JBCenterRequestError } from "../jbcenter.js";
import { describeCenterRefusal } from "./refusal.js";

describe("describeCenterRefusal", () => {
  test("names the exhausted daily sponsored-deploy quota", () => {
    expect(
      describeCenterRefusal(
        new JBCenterRequestError("Quota", 429, "sponsor_quota"),
      ),
    ).toEqual({
      code: "sponsor_quota",
      message:
        "Center's daily sponsored-deploy quota is used up. Try again tomorrow.",
    });
  });

  test("names the spent daily sponsorship budget", () => {
    expect(
      describeCenterRefusal(
        new JBCenterRequestError("Budget", 429, "sponsor_budget"),
      ),
    ).toEqual({
      code: "sponsor_budget",
      message:
        "Center's daily sponsorship budget is spent. Try again tomorrow.",
    });
  });

  test("names paused sponsorship", () => {
    expect(
      describeCenterRefusal(
        new JBCenterRequestError("Paused", 503, "unavailable"),
      ),
    ).toEqual({
      code: "unavailable",
      message: "Sponsored deploys are paused right now. Try again shortly.",
    });
  });

  test("reads a known code whatever status carries it", () => {
    expect(
      describeCenterRefusal(
        new JBCenterRequestError("Not sponsorable", 400, "sponsor_budget"),
      ),
    ).toEqual({
      code: "sponsor_budget",
      message:
        "Center's daily sponsorship budget is spent. Try again tomorrow.",
    });
  });

  test("falls back to rate limiting on a 429 with no code", () => {
    expect(
      describeCenterRefusal(new JBCenterRequestError("Slow down", 429)),
    ).toEqual({
      code: "rate_limited",
      message: "Center is rate limiting sponsored deploys. Try again shortly.",
    });
  });

  test("falls back to unavailable on a 503 with no code", () => {
    expect(
      describeCenterRefusal(new JBCenterRequestError("Down", 503)),
    ).toEqual({
      code: "unavailable",
      message: "Sponsored deploys are paused right now. Try again shortly.",
    });
  });

  test("falls back to rate limiting on a 429 carrying an unknown code", () => {
    expect(
      describeCenterRefusal(
        new JBCenterRequestError("Slow down", 429, "rate_limit"),
      ),
    ).toEqual({
      code: "rate_limited",
      message: "Center is rate limiting sponsored deploys. Try again shortly.",
    });
  });

  test("returns null for a Center error this wording does not cover", () => {
    expect(
      describeCenterRefusal(
        new JBCenterRequestError("Bad request", 400, "invalid_envelope"),
      ),
    ).toBeNull();
  });

  test("returns null for anything that is not a Center request error", () => {
    expect(describeCenterRefusal(new Error("boom"))).toBeNull();
    expect(describeCenterRefusal("boom")).toBeNull();
    expect(describeCenterRefusal(null)).toBeNull();
  });
});
