// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import {
  isMobileDevice,
  useMobileWallet,
  type MobileWalletState,
} from "./useMobileWallet.js";

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});
let root: Root | undefined;
const page = window as typeof window & { ethereum?: unknown };
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  delete page.ethereum;
  vi.restoreAllMocks();
  vi.useRealTimers();
});
const seen: { current?: MobileWalletState } = {};
function Probe() {
  seen.current = useMobileWallet();
  return null;
}
const mount = (agent: string) => {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(agent);
  root = createRoot(document.createElement("div"));
  return act(() => root!.render(<Probe />));
};
const phone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)";

describe("useMobileWallet", () => {
  test("detects phones and touch Macs", () => {
    expect(isMobileDevice({ userAgent: "Android 14" })).toBe(true);
    expect(isMobileDevice({ platform: "MacIntel", maxTouchPoints: 5 })).toBe(
      true,
    );
    expect(isMobileDevice({ platform: "MacIntel" })).toBe(false);
    expect(isMobileDevice({})).toBe(false);
  });

  test("stays not-mobile on a desktop", async () => {
    await mount("Mozilla/5.0 (X11; Linux x86_64)");
    expect(seen.current).toBe("not-mobile");
  });

  test("is injected at once when a provider is in the page", async () => {
    page.ethereum = {};
    await mount(phone);
    expect(seen.current).toBe("injected");
  });

  test.each(["ethereum#initialized", "eip6963:announceProvider"])(
    "waits, then is injected on %s",
    async (event) => {
      await mount(phone);
      expect(seen.current).toBe("checking");
      await act(async () => void window.dispatchEvent(new Event(event)));
      expect(seen.current).toBe("injected");
    },
  );

  test("asks for providers, so a wallet that announced before mount is injected", async () => {
    const announce = () =>
      window.dispatchEvent(new Event("eip6963:announceProvider"));
    window.addEventListener("eip6963:requestProvider", announce);
    try {
      await mount(phone);
      expect(seen.current).toBe("injected");
    } finally {
      window.removeEventListener("eip6963:requestProvider", announce);
    }
  });

  test.each([
    [false, "handoff"],
    [true, "injected"],
  ] as const)(
    "after the wait, with a provider %s, is %s",
    async (provider, expected) => {
      vi.useFakeTimers();
      await mount(phone);
      if (provider) page.ethereum = {};
      await act(async () => void vi.advanceTimersByTime(3_000));
      expect(seen.current).toBe(expected);
    },
  );
});
