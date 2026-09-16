import { describe, expect, test, vi } from "vitest";
import {
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
  test("a callback page without a listening opener completes on its own", async () => {
    vi.useFakeTimers();
    try {
      const alone = pair();
      (alone.popup as unknown as { opener: unknown }).opener = null;
      await expect(
        deliverCenterCallback(url, { window: alone.popup }),
      ).resolves.toBe(false);
      const silent = pair();
      const attempt = deliverCenterCallback(url, {
        window: silent.popup,
        timeoutMs: 1000,
      });
      await vi.advanceTimersByTimeAsync(1000);
      await expect(attempt).resolves.toBe(false);
      expect(silent.popup.close).not.toHaveBeenCalled();
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
