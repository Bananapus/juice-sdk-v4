import { describe, expect, test, vi } from "vitest";
import { passkeyOption } from "./passkey";

function wallet(pending: { status: string } | null = null) {
  const launch = vi.fn();
  return {
    launch,
    wallet: {
      prepareConnection: vi.fn(async () => ({ launch })),
      completeConnection: vi.fn(async (url: string) => ({ url })),
      retryConnection: vi.fn(async () => ({ retried: true })),
      restoreConnection: vi.fn((): unknown => null),
      disconnect: vi.fn(),
      payments: () => ({ pendingPayment: () => pending }),
    },
  };
}
/** A page whose window.open yields a popup that answers the launch with a callback message. */
function page(popupOpens = true) {
  const listeners = new Set<(event: MessageEvent) => void>();
  const popup = { closed: false, close: vi.fn(), postMessage: vi.fn() };
  const win = {
    location: { origin: "https://app.example" },
    open: vi.fn(() => (popupOpens ? popup : null)),
    addEventListener: (
      _type: string,
      listener: (event: MessageEvent) => void,
    ) => listeners.add(listener),
    removeEventListener: (
      _type: string,
      listener: (event: MessageEvent) => void,
    ) => listeners.delete(listener),
  };
  const callback = (url: string) => {
    for (const listener of listeners)
      listener({
        data: { type: "juicebox-center:callback", url },
        origin: win.location.origin,
        source: popup,
      } as unknown as MessageEvent);
  };
  return { win: win as unknown as Window, popup, callback };
}
const url = "https://app.example/center/callback?code=c&state=s&iss=i";

describe("passkeyOption", () => {
  test("opens the popup in the click, launches into it, completes the delivered callback in the page, then tells the app", async () => {
    const w = wallet(),
      p = page(),
      connected = vi.fn();
    const option = passkeyOption({
      wallet: () => w.wallet,
      connected,
      window: p.win,
    });
    const connecting = option.connect({
      signal: new AbortController().signal,
      handoff: () => {},
    });
    // The window opens synchronously, before the wallet loads.
    expect(p.win.open).toHaveBeenCalledOnce();
    await vi.waitFor(() =>
      expect(w.launch).toHaveBeenCalledWith({ target: "juicebox-center" }),
    );
    p.callback(url);
    await connecting;
    expect(w.wallet.completeConnection).toHaveBeenCalledWith(url);
    expect(connected).toHaveBeenCalledWith({ url });
    expect(p.popup.close).toHaveBeenCalled();
  });
  test("a blocked popup, or popup: false, falls back to the full-page redirect", async () => {
    const blocked = wallet(),
      p = page(false),
      connected = vi.fn();
    await passkeyOption({
      wallet: () => blocked.wallet,
      connected,
      window: p.win,
    }).connect({ signal: new AbortController().signal, handoff: () => {} });
    expect(blocked.launch).toHaveBeenCalledWith();
    expect(connected).not.toHaveBeenCalled();
    const off = wallet(),
      q = page();
    await passkeyOption({
      wallet: () => off.wallet,
      popup: false,
      window: q.win,
    }).connect({ signal: new AbortController().signal, handoff: () => {} });
    expect(q.win.open).not.toHaveBeenCalled();
    expect(off.launch).toHaveBeenCalledWith();
  });
  test("an exchange still pending from an earlier attempt is retried in the page, without a launch", async () => {
    const w = wallet(),
      p = page(),
      connected = vi.fn();
    w.wallet.prepareConnection.mockRejectedValue(
      Object.assign(new Error("pending"), { code: "WALLET_HANDOFF_PENDING" }),
    );
    await passkeyOption({
      wallet: () => w.wallet,
      connected,
      window: p.win,
    }).connect({ signal: new AbortController().signal, handoff: () => {} });
    expect(w.wallet.retryConnection).toHaveBeenCalledOnce();
    expect(w.launch).not.toHaveBeenCalled();
    expect(connected).toHaveBeenCalledWith({ retried: true });
    expect(p.popup.close).toHaveBeenCalled();
    // Without a popup the pending exchange is retried in place as well: the callback page that
    // received it may already have run and failed, leaving no page that would ever retry.
    const redirected = wallet(),
      reported = vi.fn();
    redirected.wallet.prepareConnection.mockRejectedValue(
      Object.assign(new Error("pending"), { code: "WALLET_HANDOFF_PENDING" }),
    );
    await passkeyOption({
      wallet: () => redirected.wallet,
      popup: false,
      connected: reported,
    }).connect({ signal: new AbortController().signal, handoff: () => {} });
    expect(redirected.wallet.retryConnection).toHaveBeenCalledOnce();
    expect(redirected.launch).not.toHaveBeenCalled();
    expect(reported).toHaveBeenCalledWith({ retried: true });
    // A replay Center refuses drops the record so the next attempt starts clean; another tab
    // finishing the same exchange first hands over its connection.
    const refused = wallet();
    refused.wallet.prepareConnection.mockRejectedValueOnce(
      Object.assign(new Error("pending"), { code: "WALLET_HANDOFF_PENDING" }),
    );
    refused.wallet.retryConnection.mockRejectedValue(
      Object.assign(new Error("refused"), { code: "WALLET_REQUEST_REJECTED" }),
    );
    await passkeyOption({ wallet: () => refused.wallet, popup: false }).connect(
      {
        signal: new AbortController().signal,
        handoff: () => {},
      },
    );
    expect(refused.wallet.disconnect).toHaveBeenCalledOnce();
    expect(refused.wallet.prepareConnection).toHaveBeenCalledTimes(2);
    expect(refused.launch).toHaveBeenCalledOnce();
    // Without a `connected` hook the retry still runs (an optional call must not skip its argument).
    const silent = wallet();
    silent.wallet.prepareConnection.mockRejectedValueOnce(
      Object.assign(new Error("pending"), { code: "WALLET_HANDOFF_PENDING" }),
    );
    await passkeyOption({ wallet: () => silent.wallet, popup: false }).connect({
      signal: new AbortController().signal,
      handoff: () => {},
    });
    expect(silent.wallet.retryConnection).toHaveBeenCalledOnce();
    expect(silent.launch).not.toHaveBeenCalled();
    // With a popup the same recovery launches the fresh sign-in into the tap's own window.
    const popped = wallet(),
      pp = page();
    popped.wallet.prepareConnection.mockRejectedValueOnce(
      Object.assign(new Error("pending"), { code: "WALLET_HANDOFF_PENDING" }),
    );
    popped.wallet.retryConnection.mockRejectedValue(
      Object.assign(new Error("refused"), { code: "WALLET_REQUEST_REJECTED" }),
    );
    const told = vi.fn();
    const popupRun = passkeyOption({
      wallet: () => popped.wallet,
      window: pp.win,
      connected: told,
    }).connect({ signal: new AbortController().signal, handoff: () => {} });
    await vi.waitFor(() =>
      expect(popped.launch).toHaveBeenCalledWith({
        target: expect.any(String),
      }),
    );
    pp.callback(url);
    await popupRun;
    expect(popped.wallet.disconnect).toHaveBeenCalledOnce();
    expect(popped.wallet.completeConnection).toHaveBeenCalledWith(url);
    expect(told).toHaveBeenCalledWith({ url });
    expect(pp.popup.close).toHaveBeenCalled();
    const raced = wallet(),
      handed = vi.fn();
    raced.wallet.prepareConnection.mockRejectedValue(
      Object.assign(new Error("pending"), { code: "WALLET_HANDOFF_PENDING" }),
    );
    raced.wallet.retryConnection.mockRejectedValue(
      Object.assign(new Error("changed"), { code: "WALLET_HANDOFF_CHANGED" }),
    );
    raced.wallet.restoreConnection
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({ restored: true });
    await passkeyOption({
      wallet: () => raced.wallet,
      popup: false,
      connected: handed,
    }).connect({ signal: new AbortController().signal, handoff: () => {} });
    expect(handed).toHaveBeenCalledWith({ restored: true });
  });
  test.each(["WALLET_ALREADY_CONNECTED", "WALLET_STORAGE_INVALID"])(
    "a stored record this tap cannot use (%s) is dropped and a fresh sign-in launched",
    async (code) => {
      const w = wallet();
      w.wallet.prepareConnection.mockRejectedValueOnce(
        Object.assign(new Error(code), { code }),
      );
      await passkeyOption({ wallet: () => w.wallet, popup: false }).connect({
        signal: new AbortController().signal,
        handoff: () => {},
      });
      expect(w.wallet.disconnect).toHaveBeenCalledOnce();
      expect(w.launch).toHaveBeenCalledOnce();
    },
  );
  test("a popup closed while preparing ends the attempt quietly, and an already connected wallet just reports it", async () => {
    const w = wallet(),
      p = page(),
      connected = vi.fn();
    w.wallet.prepareConnection.mockImplementation(async () => {
      p.popup.closed = true;
      return { launch: w.launch };
    });
    await expect(
      passkeyOption({
        wallet: () => w.wallet,
        connected,
        window: p.win,
      }).connect({ signal: new AbortController().signal, handoff: () => {} }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(w.launch).not.toHaveBeenCalled();
    const done = wallet(),
      q = page(),
      told = vi.fn();
    done.wallet.prepareConnection.mockRejectedValue(
      Object.assign(new Error("connected"), {
        code: "WALLET_ALREADY_CONNECTED",
      }),
    );
    (done.wallet as { restoreConnection?: () => unknown }).restoreConnection =
      vi.fn(() => ({ address: "0xabc" }));
    await passkeyOption({
      wallet: () => done.wallet,
      connected: told,
      window: q.win,
    }).connect({ signal: new AbortController().signal, handoff: () => {} });
    expect(told).toHaveBeenCalledWith({ address: "0xabc" });
    expect(done.launch).not.toHaveBeenCalled();
    expect(q.popup.close).toHaveBeenCalled();
  });
  test("a connection state that changed underneath preparing is prepared once more, quietly", async () => {
    const w = wallet(),
      p = page();
    w.wallet.prepareConnection
      .mockRejectedValueOnce(
        Object.assign(new Error("changed"), { code: "WALLET_HANDOFF_CHANGED" }),
      )
      .mockResolvedValueOnce({ launch: w.launch });
    const connecting = passkeyOption({
      wallet: () => w.wallet,
      window: p.win,
    }).connect({ signal: new AbortController().signal, handoff: () => {} });
    await vi.waitFor(() =>
      expect(w.launch).toHaveBeenCalledWith({ target: "juicebox-center" }),
    );
    p.callback(url);
    await connecting;
    expect(w.wallet.prepareConnection).toHaveBeenCalledTimes(2);
    // A second change in a row is still reported.
    const twice = wallet();
    twice.wallet.prepareConnection.mockRejectedValue(
      Object.assign(new Error("changed"), { code: "WALLET_HANDOFF_CHANGED" }),
    );
    await expect(
      passkeyOption({ wallet: () => twice.wallet, popup: false }).connect({
        signal: new AbortController().signal,
        handoff: () => {},
      }),
    ).rejects.toThrow("changed");
    expect(twice.wallet.prepareConnection).toHaveBeenCalledTimes(2);
  });
  test("closes the popup when preparing fails or the connection is cancelled", async () => {
    const broken = wallet(),
      p = page();
    broken.wallet.prepareConnection.mockRejectedValue(new Error("down"));
    await expect(
      passkeyOption({ wallet: () => broken.wallet, window: p.win }).connect({
        signal: new AbortController().signal,
        handoff: () => {},
      }),
    ).rejects.toThrow("down");
    expect(p.popup.close).toHaveBeenCalled();
    const w = wallet(),
      q = page(),
      controller = new AbortController();
    const connecting = passkeyOption({
      wallet: () => w.wallet,
      window: q.win,
    }).connect({ signal: controller.signal, handoff: () => {} });
    await vi.waitFor(() => expect(w.launch).toHaveBeenCalled());
    controller.abort();
    await expect(connecting).rejects.toMatchObject({ name: "AbortError" });
    expect(q.popup.close).toHaveBeenCalled();
    expect(w.wallet.completeConnection).not.toHaveBeenCalled();
  });
  test("saves the app's return state, prepares, then launches", async () => {
    const w = wallet();
    const beforeLaunch = vi.fn();
    const option = passkeyOption({
      wallet: () => w.wallet,
      beforeLaunch,
      popup: false,
    });
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
    for (const status of ["paid", "reverted", "cancelled", "expired"]) {
      const settled = wallet({ status });
      await passkeyOption({ wallet: () => settled.wallet }).connect({
        signal: new AbortController().signal,
        handoff: () => {},
      });
      expect(settled.launch).toHaveBeenCalledOnce();
    }
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
