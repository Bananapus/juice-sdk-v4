import type { ConnectOption } from "./controller.js";

/** The wallet client surface the passkey option needs (`createCenterWalletClient` satisfies it). */
export type PasskeyWallet = {
  prepareConnection(): Promise<{ launch(): void }>;
  disconnect(): void;
  payments(): { pendingPayment(): { status: string } | null };
};
const settled = new Set(["paid", "reverted", "cancelled"]);

/** The built-in way in: a passkey account at Juicebox Center. Connecting is a full-page
 * redirect, so `beforeLaunch` is where the app saves what it needs to come back to. */
export function passkeyOption(input: {
  wallet(): Promise<PasskeyWallet> | PasskeyWallet;
  beforeLaunch?(): void;
}): ConnectOption {
  return {
    id: "juicebox-center",
    name: "Juicebox account",
    async connect({ signal }) {
      signal.throwIfAborted();
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
          // An abandoned handoff lives in session storage until it is disconnected.
          if (
            (error as { code?: string } | null)?.code !==
            "WALLET_HANDOFF_EXPIRED"
          )
            throw error;
          wallet.disconnect();
          return wallet.prepareConnection();
        });
      // Closing the dialog while preparing must never cause a delayed redirect.
      signal.throwIfAborted();
      prepared.launch();
    },
  };
}
