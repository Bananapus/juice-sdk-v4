import type { ConnectOption } from "./controller.js";
import { awaitPopupCallback, openCenterPopup, popupName } from "./popup.js";

/** The wallet client surface the passkey option needs (`createCenterWalletClient` satisfies it). */
export type PasskeyWallet = {
  prepareConnection(): Promise<{ launch(options?: { target?: string }): void }>;
  completeConnection(url: string): Promise<unknown>;
  retryConnection(): Promise<unknown>;
  /** The current connection, when one is already held in this tab. */
  restoreConnection?(): unknown;
  disconnect(): void;
  payments(): { pendingPayment(): { status: string } | null };
};
const settled = new Set(["paid", "reverted", "cancelled"]);

/** The built-in way in: a passkey account at Juicebox Center. By default Center opens in a popup
 * and the page stays; the callback comes back by message and the exchange finishes here, then
 * `connected` runs. When the popup is blocked, or with `popup: false`, connecting is a full-page
 * redirect, so `beforeLaunch` is where the app saves what it needs to come back to. */
export function passkeyOption(input: {
  wallet(): Promise<PasskeyWallet> | PasskeyWallet;
  beforeLaunch?(): void;
  popup?: boolean;
  /** After a popup sign-in completes in this page: connect the app's wallet layer. */
  connected?(connection: unknown): Promise<void> | void;
  /** Defaults to the global window. */
  window?: Window;
}): ConnectOption {
  return {
    id: "juicebox-center",
    name: "Juicebox account",
    async connect({ signal }) {
      signal.throwIfAborted();
      const win = input.window ?? globalThis.window;
      // Before any await: browsers only allow the window inside the click itself.
      const popup = input.popup === false ? null : openCenterPopup(win);
      try {
        const wallet = await input.wallet();
        const payment = wallet.payments().pendingPayment();
        if (payment && !settled.has(payment.status))
          throw new Error(
            "Finish your pending Juicebox payment before signing in again.",
          );
        input.beforeLaunch?.();
        const prepared = await wallet
          .prepareConnection()
          .catch(async (error: unknown) => {
            const code = (error as { code?: string } | null)?.code;
            // A callback already delivered to this page whose exchange did not complete is
            // finished here; no new launch is needed. A tab that is already connected (a
            // `connected` hook that failed last time) only needs telling again.
            if (
              popup &&
              (code === "WALLET_HANDOFF_PENDING" ||
                (code === "WALLET_ALREADY_CONNECTED" &&
                  wallet.restoreConnection?.()))
            )
              return null;
            // An abandoned handoff lives in session storage until it is disconnected.
            if (code !== "WALLET_HANDOFF_EXPIRED") throw error;
            wallet.disconnect();
            return wallet.prepareConnection();
          });
        // Closing the dialog while preparing must never cause a delayed redirect.
        signal.throwIfAborted();
        if (!popup) {
          prepared!.launch();
          return;
        }
        let connection: unknown;
        if (prepared) {
          // The window the form targets must still exist, or the browser opens a new one.
          if (popup.closed)
            throw new DOMException(
              "The sign-in window was closed.",
              "AbortError",
            );
          prepared.launch({ target: popupName });
          const url = await awaitPopupCallback(win!, popup, signal);
          connection = await wallet.completeConnection(url);
        } else
          connection =
            wallet.restoreConnection?.() ?? (await wallet.retryConnection());
        await input.connected?.(connection);
      } finally {
        popup?.close();
      }
    },
  };
}
