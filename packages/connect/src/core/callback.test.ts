import { describe, expect, test, vi } from "vitest";
import { completeCenterCallback } from "./callback";

function wallet() {
  const payments = {
    completePayment: vi.fn(async () => "paid"),
    refreshPayment: vi.fn(async () => "refreshed"),
  };
  return {
    completeConnection: vi.fn(async () => "connected"),
    retryConnection: vi.fn(async () => "retried"),
    payments: () => payments,
    calls: payments,
  };
}

describe("completeCenterCallback", () => {
  test("routes a payment review, a connection code, a bare state and no parameters", async () => {
    const w = wallet();
    const base = "https://app.example/center/callback";
    expect(
      await completeCenterCallback(w, base + "?review=r&state=s&iss=i"),
    ).toEqual({ kind: "payment", status: "paid" });
    expect(
      await completeCenterCallback(w, base + "?code=c&state=s&iss=i"),
    ).toEqual({ kind: "connection", connection: "connected" });
    expect(await completeCenterCallback(w, base + "?state=s")).toEqual({
      kind: "payment",
      status: "refreshed",
    });
    expect(await completeCenterCallback(w, base)).toEqual({
      kind: "connection",
      connection: "retried",
    });
    expect(w.calls.completePayment).toHaveBeenCalledWith(
      base + "?review=r&state=s&iss=i",
    );
    expect(w.completeConnection).toHaveBeenCalledWith(
      base + "?code=c&state=s&iss=i",
    );
  });
});
