import { describe, expect, test, vi } from "vitest";
import { passkeyOption } from "./passkey";

function wallet(pending: { status: string } | null = null) {
  const launch = vi.fn();
  return {
    launch,
    wallet: {
      prepareConnection: vi.fn(async () => ({ launch })),
      disconnect: vi.fn(),
      payments: () => ({ pendingPayment: () => pending }),
    },
  };
}

describe("passkeyOption", () => {
  test("saves the app's return state, prepares, then launches", async () => {
    const w = wallet();
    const beforeLaunch = vi.fn();
    const option = passkeyOption({ wallet: () => w.wallet, beforeLaunch });
    expect(option).toMatchObject({
      id: "juicebox-center",
      name: "Juicebox account",
    });
    await option.connect({
      signal: new AbortController().signal,
      handoff: () => {},
    });
    expect(beforeLaunch.mock.invocationCallOrder[0]).toBeLessThan(
      w.wallet.prepareConnection.mock.invocationCallOrder[0]!,
    );
    expect(w.launch).toHaveBeenCalledOnce();
  });
  test("a settled payment does not block sign-in, and an expired handoff is disconnected and retried once", async () => {
    const paid = wallet({ status: "paid" });
    await passkeyOption({ wallet: () => paid.wallet }).connect({
      signal: new AbortController().signal,
      handoff: () => {},
    });
    expect(paid.launch).toHaveBeenCalledOnce();
    const stale = wallet();
    stale.wallet.prepareConnection.mockRejectedValueOnce(
      Object.assign(new Error("expired"), { code: "WALLET_HANDOFF_EXPIRED" }),
    );
    await passkeyOption({ wallet: () => stale.wallet }).connect({
      signal: new AbortController().signal,
      handoff: () => {},
    });
    expect(stale.wallet.disconnect).toHaveBeenCalledOnce();
    expect(stale.launch).toHaveBeenCalledOnce();
    const broken = wallet();
    broken.wallet.prepareConnection.mockRejectedValue(
      Object.assign(new Error("down"), { code: "WALLET_UNAVAILABLE" }),
    );
    await expect(
      passkeyOption({ wallet: () => broken.wallet }).connect({
        signal: new AbortController().signal,
        handoff: () => {},
      }),
    ).rejects.toThrow("down");
    expect(broken.wallet.disconnect).not.toHaveBeenCalled();
    const cancelled = new AbortController();
    cancelled.abort();
    const untouched = wallet();
    await expect(
      passkeyOption({ wallet: () => untouched.wallet }).connect({
        signal: cancelled.signal,
        handoff: () => {},
      }),
    ).rejects.toThrow();
    expect(untouched.wallet.prepareConnection).not.toHaveBeenCalled();
  });
  test("refuses while a payment is pending, and never launches after a cancel", async () => {
    const pending = wallet({ status: "reviewing" });
    await expect(
      passkeyOption({ wallet: async () => pending.wallet }).connect({
        signal: new AbortController().signal,
        handoff: () => {},
      }),
    ).rejects.toThrow(/pending Juicebox payment/);
    const w = wallet();
    const abort = new AbortController();
    w.wallet.prepareConnection.mockImplementation(async () => {
      abort.abort();
      return { launch: w.launch };
    });
    await expect(
      passkeyOption({ wallet: () => w.wallet }).connect({
        signal: abort.signal,
        handoff: () => {},
      }),
    ).rejects.toThrow();
    expect(w.launch).not.toHaveBeenCalled();
  });
});
