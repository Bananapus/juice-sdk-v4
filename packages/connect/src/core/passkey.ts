import type { ConnectOption } from "./controller.js";
import {
  awaitFrameCallback,
  awaitPopupCallback,
  frameName,
  openCenterPopup,
  popupName,
} from "./popup.js";

/** The wallet client surface the passkey option needs (`createCenterWalletClient` satisfies it). */
export type PasskeyWallet = {
  prepareConnection(): Promise<{
    /** Where the launch lands: its origin is what a frame delegates passkeys to. */
    authorizationUrl: string;
    launch(options?: { target?: string }): void;
  }>;
  completeConnection(url: string): Promise<unknown>;
  retryConnection(): Promise<unknown>;
  /** The current connection, when one is already held in this tab. */
  restoreConnection?(): unknown;
  disconnect(): void;
  payments(): { pendingPayment(): { status: string } | null };
};
const settled = new Set(["paid", "reverted", "cancelled", "expired"]);

/** The built-in way in: a passkey account at Juicebox Center. By default Center opens in a popup
 * and the page stays; the callback comes back by message and the exchange finishes here, then
 * `connected` runs. With `frame: true` Center opens in a frame the app shows instead (the modal
 * renders it under the name the option asks for); Center serves the sign-in framed only for apps
 * its operator admits, and the page inside offers "Open as a page" when it cannot continue there.
 * When the popup is blocked, or with `popup: false`, connecting is a full-page redirect, so
 * `beforeLaunch` is where the app saves what it needs to come back to. */
export function passkeyOption(input: {
  wallet(): Promise<PasskeyWallet> | PasskeyWallet;
  beforeLaunch?(): void;
  popup?: boolean;
  frame?: boolean;
  /** After a popup sign-in completes in this page: connect the app's wallet layer. */
  connected?(connection: unknown): Promise<void> | void;
  /** Defaults to the global window. */
  window?: Window;
}): ConnectOption {
  return {
    id: "juicebox-center",
    name: "Juicebox account",
    async connect({ signal, frame }) {
      signal.throwIfAborted();
      const win = input.window ?? globalThis.window;
      // Before any await: browsers only allow the window inside the click itself.
      const popup =
        input.frame || input.popup === false ? null : openCenterPopup(win);
      try {
        const wallet = await input.wallet();
        const payment = wallet.payments().pendingPayment();
        if (payment && !settled.has(payment.status))
          throw new Error(
            "Finish your pending Juicebox payment before signing in again.",
          );
        input.beforeLaunch?.();
        let prepared = await wallet
          .prepareConnection()
          .catch(async (error: unknown) => {
            const code = (error as { code?: string } | null)?.code;
            // A callback already delivered whose exchange did not complete is finished here,
            // popup or not: the page that received it may never run again (a hand-back that
            // failed on the way in), and a retry only replays Center's receipt. A tab that is
            // already connected (a `connected` hook that failed last time) only needs telling again.
            if (
              code === "WALLET_HANDOFF_PENDING" ||
              (code === "WALLET_ALREADY_CONNECTED" &&
                wallet.restoreConnection?.())
            )
              return null;
            // The tab's saved connection state moved between two steps (another attempt
            // settling); it is settled now, so prepare once more before reporting anything.
            if (code === "WALLET_HANDOFF_CHANGED")
              return wallet.prepareConnection();
            // A record this tap cannot use — an abandoned handoff, a connection whose grant has
            // run out, a record an older client wrote — is dropped and a fresh sign-in prepared.
            if (
              code !== "WALLET_HANDOFF_EXPIRED" &&
              code !== "WALLET_ALREADY_CONNECTED" &&
              code !== "WALLET_STORAGE_INVALID"
            )
              throw error;
            wallet.disconnect();
            return wallet.prepareConnection();
          });
        if (!prepared) {
          const restored = wallet.restoreConnection?.();
          if (restored) {
            await input.connected?.(restored);
            return;
          }
          let connection: unknown;
          try {
            // Evaluated before the optional hook call, which would otherwise skip it.
            connection = await wallet.retryConnection();
          } catch (error) {
            const code = (error as { code?: string } | null)?.code;
            // Another tab finished the same exchange first; its connection is this tab's too.
            const raced =
              code === "WALLET_HANDOFF_CHANGED"
                ? wallet.restoreConnection?.()
                : null;
            if (raced) {
              await input.connected?.(raced);
              return;
            }
            if (code !== "WALLET_REQUEST_REJECTED") throw error;
            // Center refused the replay (its window closed, or policy changed): the record can
            // never finish, so this same tap drops it and signs in afresh.
            wallet.disconnect();
            prepared = await wallet.prepareConnection();
          }
          if (!prepared) {
            await input.connected?.(connection);
            return;
          }
        }
        // Closing the dialog while preparing must never cause a delayed redirect.
        signal.throwIfAborted();
        if (input.frame) {
          frame(frameName, new URL(prepared.authorizationUrl).origin);
          const element = await frameElement(win!, signal);
          prepared.launch({ target: frameName });
          const url = await awaitFrameCallback(win!, element, signal);
          const connection = await wallet.completeConnection(url);
          await input.connected?.(connection);
          return;
        }
        if (!popup) {
          prepared.launch();
          return;
        }
        // The window the form targets must still exist, or the browser opens a new one.
        if (popup.closed)
          throw new DOMException(
            "The sign-in window was closed.",
            "AbortError",
          );
        prepared.launch({ target: popupName });
        const url = await awaitPopupCallback(win!, popup, signal);
        const connection = await wallet.completeConnection(url);
        await input.connected?.(connection);
      } finally {
        popup?.close();
      }
    },
  };
}

/** The frame the app renders once asked for; the app's render is a tick or two away. */
function frameElement(
  win: Window,
  signal: AbortSignal,
): Promise<HTMLIFrameElement> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const look = () => {
      if (signal.aborted)
        return reject(
          new DOMException("The sign-in was closed.", "AbortError"),
        );
      const element = win.document?.querySelector<HTMLIFrameElement>(
        `iframe[name="${frameName}"]`,
      );
      if (element) return resolve(element);
      if (Date.now() - started > 5000)
        return reject(new Error("The sign-in frame did not appear."));
      setTimeout(look, 20);
    };
    look();
  });
}
