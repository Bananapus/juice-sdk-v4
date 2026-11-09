import { useEffect, useState } from "react";

export type MobileWalletState =
  | "not-mobile"
  | "checking"
  | "injected"
  | "handoff";

/** A phone or tablet, iPadOS included (it reports itself as a Mac with touch). */
export function isMobileDevice(nav: {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
}): boolean {
  return (
    /Android|iPhone|iPad|iPod/i.test(nav.userAgent || "") ||
    (nav.platform === "MacIntel" && (nav.maxTouchPoints ?? 0) > 1)
  );
}

const MOBILE_PROVIDER_WAIT_MS = 3_000;

/**
 * On a phone, whether a wallet's provider is in the page (`injected`) or the
 * page should offer to reopen in a wallet app (`handoff`). MetaMask Mobile
 * injects late and emits `ethereum#initialized`, so it gets the documented
 * three-second window (`checking`).
 */
export function useMobileWallet(): MobileWalletState {
  const [state, setState] = useState<MobileWalletState>("not-mobile");
  useEffect(() => {
    if (!isMobileDevice(navigator)) return;
    const page = window as typeof window & { ethereum?: unknown };
    if (page.ethereum) {
      setState("injected");
      return;
    }
    setState("checking");
    const stop = () => {
      window.clearTimeout(timer);
      window.removeEventListener("ethereum#initialized", ready);
      window.removeEventListener("eip6963:announceProvider", ready);
    };
    const ready = () => {
      stop();
      setState("injected");
    };
    window.addEventListener("ethereum#initialized", ready);
    window.addEventListener("eip6963:announceProvider", ready);
    const timer = window.setTimeout(() => {
      stop();
      setState(page.ethereum ? "injected" : "handoff");
    }, MOBILE_PROVIDER_WAIT_MS);
    return stop;
  }, []);
  return state;
}
