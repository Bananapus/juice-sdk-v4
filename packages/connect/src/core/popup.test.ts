import { describe, expect, test, vi } from "vitest";
import {
  awaitFrameCallback,
  awaitPopupCallback,
  deliverCenterCallback,
  openCenterPopup,
} from "./popup";

/** A window pair: the page and the popup it opened, joined by message events. */
function pair(origin = "https://app.example") {
  const listeners = new Map<object, Set<(event: MessageEvent) => void>>();
  const make = (name: string) => {
    const self: Record<string, unknown> = {
      name,
      closed: false,
      location: { origin },
      close: vi.fn(() => {
        self.closed = true;
      }),
      addEventListener: (
        _type: string,
        listener: (event: MessageEvent) => void,
      ) => {
        listeners.set(self, (listeners.get(self) ?? new Set()).add(listener));
      },
      removeEventListener: (
        _type: string,
        listener: (event: MessageEvent) => void,
      ) => {
        listeners.get(self)?.delete(listener);
      },
    };
    return self;
  };
  const page = make("page"),
    popup = make("popup");
  const deliver = (
    to: object,
    from: object,
    data: unknown,
    eventOrigin = origin,
  ) => {
    for (const listener of listeners.get(to) ?? [])
      listener({
        data,
        origin: eventOrigin,
        source: from,
      } as unknown as MessageEvent);
  };
  page.postMessage = vi.fn((data: unknown, target: string) => {
    if (target === origin) deliver(page, popup, data);
  });
  popup.postMessage = vi.fn((data: unknown, target: string) => {
    if (target === origin) deliver(popup, page, data);
  });
  popup.opener = page;
  page.open = vi.fn(() => popup);
  return {
    page: page as unknown as Window,
    popup: popup as unknown as Window,
    deliver,
  };
}

describe("openCenterPopup", () => {
  test("opens a named, sized window synchronously and reports a blocked one as null", () => {
    const { page, popup } = pair();
    expect(openCenterPopup(page)).toBe(popup);
    const [name, features] = (
      page.open as ReturnType<typeof vi.fn>
    ).mock.calls[0]!.slice(1) as string[];
    expect(name).toBe("juicebox-center");
    expect(features).toMatch(/popup/);
    expect(features).toMatch(/width=/);
    (page.open as ReturnType<typeof vi.fn>).mockReturnValueOnce(null);
    expect(openCenterPopup(page)).toBeNull();
    (page.open as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error("blocked");
    });
    expect(openCenterPopup(page)).toBeNull();
    expect(openCenterPopup(undefined)).toBeNull();
  });
});

describe("awaitPopupCallback and deliverCenterCallback", () => {
  const url = "https://app.example/center/callback?code=c&state=s&iss=i";
  test("the popup hands its callback URL to the page, gets an acknowledgement, and closes", async () => {
    const { page, popup } = pair();
    const waiting = awaitPopupCallback(
      page,
      popup,
      new AbortController().signal,
    );
    await expect(deliverCenterCallback(url, { window: popup })).resolves.toBe(
      true,
    );
    await expect(waiting).resolves.toBe(url);
    expect(popup.close).toHaveBeenCalled();
  });
  test("the page ignores messages from other sources, other origins and other shapes", async () => {
    const { page, popup, deliver } = pair();
    const waiting = awaitPopupCallback(
      page,
      popup,
      new AbortController().signal,
    );
    deliver(page, {}, { type: "juicebox-center:callback", url });
    deliver(
      page,
      popup,
      { type: "juicebox-center:callback", url },
      "https://evil.example",
    );
    deliver(page, popup, { type: "juicebox-center:callback", url: 5 });
    deliver(page, popup, { type: "other", url });
    deliver(page, popup, null);
    expect(page.postMessage).not.toHaveBeenCalled();
    deliver(page, popup, { type: "juicebox-center:callback", url });
    await expect(waiting).resolves.toBe(url);
  });
  test("closing the popup or aborting cancels without an error message; aborting closes the popup", async () => {
    vi.useFakeTimers();
    try {
      const closed = pair();
      const waiting = awaitPopupCallback(
        closed.page,
        closed.popup,
        new AbortController().signal,
      );
      waiting.catch(() => {});
      (closed.popup as unknown as { closed: boolean }).closed = true;
      await vi.advanceTimersByTimeAsync(500);
      await expect(waiting).rejects.toMatchObject({ name: "AbortError" });
      const aborted = pair(),
        controller = new AbortController();
      const pending = awaitPopupCallback(
        aborted.page,
        aborted.popup,
        controller.signal,
      );
      controller.abort();
      await expect(pending).rejects.toMatchObject({ name: "AbortError" });
      expect(aborted.popup.close).toHaveBeenCalled();
      // A late message after the abort changes nothing.
      aborted.deliver(aborted.page, aborted.popup, {
        type: "juicebox-center:callback",
        url,
      });
      expect(aborted.page.postMessage).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
  test("a callback page keeps offering the callback while a same-origin opener is alive, and completes on its own only without one", async () => {
    vi.useFakeTimers();
    try {
      const alone = pair();
      (alone.popup as unknown as { opener: unknown }).opener = null;
      await expect(
        deliverCenterCallback(url, { window: alone.popup }),
      ).resolves.toBe(false);
      // A cross-origin opener (the app tab itself was opened from elsewhere) is not ours.
      const foreign = pair();
      Object.defineProperty(foreign.page, "location", {
        get() {
          throw new DOMException("Blocked", "SecurityError");
        },
      });
      await expect(
        deliverCenterCallback(url, { window: foreign.popup }),
      ).resolves.toBe(false);
      // A slow opener gets the offer again every retryMs; the third one is acknowledged.
      const slow = pair();
      let offers = 0;
      (slow.page.postMessage as ReturnType<typeof vi.fn>).mockImplementation(
        (_data: unknown, target: string) => {
          if (++offers === 3 && target === slow.page.location.origin)
            slow.deliver(slow.popup, slow.page, {
              type: "juicebox-center:received",
            });
        },
      );
      const late = deliverCenterCallback(url, {
        window: slow.popup,
        retryMs: 1000,
      });
      await vi.advanceTimersByTimeAsync(2500);
      await expect(late).resolves.toBe(true);
      expect(offers).toBe(3);
      expect(slow.popup.close).toHaveBeenCalled();
      // An opener that closes ends the offers; the page then completes on its own.
      const gone = pair();
      const orphaned = deliverCenterCallback(url, {
        window: gone.popup,
        retryMs: 1000,
      });
      (gone.page as unknown as { closed: boolean }).closed = true;
      await vi.advanceTimersByTimeAsync(1000);
      await expect(orphaned).resolves.toBe(false);
      expect(gone.popup.close).not.toHaveBeenCalled();
      // A silent opener is given up on at the cap; a late acknowledgement still closes the window.
      const silent = pair();
      const attempt = deliverCenterCallback(url, {
        window: silent.popup,
        timeoutMs: 5000,
        retryMs: 1000,
      });
      await vi.advanceTimersByTimeAsync(5000);
      await expect(attempt).resolves.toBe(false);
      // The first offer plus one per second until the cap.
      expect(silent.page.postMessage).toHaveBeenCalledTimes(6);
      expect(silent.popup.close).not.toHaveBeenCalled();
      silent.deliver(silent.popup, silent.page, {
        type: "juicebox-center:received",
      });
      expect(silent.popup.close).toHaveBeenCalled();
      const wrong = pair();
      const rejected = deliverCenterCallback(url, {
        window: wrong.popup,
        timeoutMs: 1000,
      });
      wrong.deliver(wrong.popup, {}, { type: "juicebox-center:received" });
      wrong.deliver(
        wrong.popup,
        wrong.page,
        { type: "juicebox-center:received" },
        "https://evil.example",
      );
      wrong.deliver(wrong.popup, wrong.page, { type: "nope" });
      await vi.advanceTimersByTimeAsync(1000);
      await expect(rejected).resolves.toBe(false);
      await expect(
        deliverCenterCallback(url, { window: undefined }),
      ).resolves.toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("awaitFrameCallback and a framed deliverCenterCallback", () => {
  const url = "https://app.example/center/callback?code=c&state=s&iss=i";
  /** A page framing the callback page: the frame's window is the popup stand-in, with the page as its parent. */
  function framed(origin = "https://app.example", parentOrigin = origin) {
    const { page, popup, deliver } = pair(origin);
    const inner = popup as unknown as Record<string, unknown>;
    inner.parent =
      parentOrigin === origin
        ? page
        : { location: { origin: parentOrigin }, postMessage: vi.fn() };
    inner.opener = null;
    const frame = { contentWindow: popup } as unknown as HTMLIFrameElement;
    return { page, inner: popup, frame, deliver };
  }
  test("the callback page inside the frame hands its URL to the framing page, which acknowledges", async () => {
    const { page, inner, frame } = framed();
    const waiting = awaitFrameCallback(
      page,
      frame,
      new AbortController().signal,
    );
    await expect(deliverCenterCallback(url, { window: inner })).resolves.toBe(
      true,
    );
    await expect(waiting).resolves.toBe(url);
    expect(
      (inner as unknown as { close: ReturnType<typeof vi.fn> }).close,
    ).not.toHaveBeenCalled();
  });
  test("the framing page hears only its own frame, and a foreign parent is never told", async () => {
    const { page, inner, frame, deliver } = framed();
    const waiting = awaitFrameCallback(
      page,
      frame,
      new AbortController().signal,
    );
    deliver(page, {}, { type: "juicebox-center:callback", url });
    deliver(
      page,
      inner,
      { type: "juicebox-center:callback", url },
      "https://evil.example",
    );
    deliver(page, inner, { type: "juicebox-center:callback", url: 5 });
    expect(
      (page as unknown as { postMessage: ReturnType<typeof vi.fn> })
        .postMessage,
    ).not.toHaveBeenCalled();
    deliver(page, inner, { type: "juicebox-center:callback", url });
    await expect(waiting).resolves.toBe(url);
    const foreign = framed("https://app.example", "https://evil.example");
    await expect(
      deliverCenterCallback(url, { window: foreign.inner }),
    ).resolves.toBe(false);
    expect(
      (
        foreign.inner as unknown as {
          parent: { postMessage: ReturnType<typeof vi.fn> };
        }
      ).parent.postMessage,
    ).not.toHaveBeenCalled();
  });
  test("aborting the framed wait rejects with an AbortError", async () => {
    const { page, frame } = framed();
    const controller = new AbortController();
    const waiting = awaitFrameCallback(page, frame, controller.signal);
    controller.abort();
    await expect(waiting).rejects.toMatchObject({ name: "AbortError" });
  });
});
