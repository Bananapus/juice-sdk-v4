import { ReviewLineError, WalletNotInvokedError } from "./lineError.js";
import type {
  Address,
  Chain,
  Hex,
  TypedDataDefinition,
  WalletClient,
} from "viem";
import { timeout } from "../pause.js";

/** The raw calls a self-reviewing wallet (Signa) decodes and confirms on its own page. */
export type SelfReviewedRequest = {
  account: Address;
  calls: readonly {
    chainId: number;
    to: Address;
    data: Hex;
    value: bigint;
    /** The exact gas limit the app fixed for the call, when it did. */
    gas?: bigint;
  }[];
};

/**
 * The wallet as core sees it. This file is the only core code that calls a
 * wallet; `sendReviewed` reaches it only through an adapter, after the review
 * is confirmed. A `self-reviewing` adapter shows its own review and takes raw
 * calls through `submitToReviewer` only.
 */
export type WalletAdapter = {
  /**
   * Settles once `kind` and `isSafe` can be trusted (Safe{Wallet} over
   * WalletConnect is known only once its peer metadata settles). Core awaits
   * it, bounded, before reading them; a rejection or timeout sends nothing.
   * It may be called more than once.
   */
  ready?(): Promise<void>;
  kind: "wallet" | "self-reviewing";
  account(): Address | undefined;
  chainId(): number | undefined;
  isSafe(): boolean;
  switchChain(chainId: number): Promise<void>;
  sendTransaction(tx: {
    chainId: number;
    to: Address;
    data: Hex;
    value: bigint;
    gas?: bigint;
  }): Promise<Hex>;
  signTypedData(typedData: TypedDataDefinition): Promise<Hex>;
  signMessage(message: string): Promise<Hex>;
  sendCalls?(
    chainId: number,
    calls: readonly { to: Address; data: Hex; value: bigint }[],
  ): Promise<string>;
  /** Self-reviewing adapters only. */
  submitToReviewer?(request: SelfReviewedRequest): Promise<Hex>;
};

/** How long a wallet's `ready` may take before nothing is sent. */
const WALLET_READY_MS = 10_000;

export const WALLET_NOT_READY_LINE =
  "Your wallet's connection could not be confirmed. Nothing was sent; try again.";

/**
 * Awaits `adapter.ready`, at most {@link WALLET_READY_MS}. A rejection or
 * timeout throws {@link WALLET_NOT_READY_LINE}: the wallet is never taken
 * for a plain one it may not be.
 */
export async function walletReady(adapter: WalletAdapter): Promise<void> {
  if (!adapter.ready) return;
  try {
    await timeout(
      Promise.resolve().then(() => adapter.ready!()),
      WALLET_READY_MS,
    );
  } catch (error) {
    throw Object.assign(new ReviewLineError(WALLET_NOT_READY_LINE), {
      cause: error,
    });
  }
}

const CONNECTION_CHANGED =
  "Wallet connection changed. Review the transaction again.";

/**
 * Calls `invoke` with the client once the account, chain, Safe mode and
 * connector read the same after its fetch as before (a new connector is
 * fetched again, three times at most), in the same continuation as that check.
 */
async function withConnection<T>(
  options: Parameters<typeof viemWalletAdapter>[0],
  invoke: (connected: {
    account: Address;
    client: WalletClient;
    safe: boolean;
  }) => Promise<T>,
): Promise<T> {
  const asked = options.account();
  if (!asked) throw new WalletNotInvokedError("Connect a wallet first.");
  const chainId = options.chainId();
  const safe = options.isSafe();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const connector = options.connector?.();
    const client = await options.walletClient();
    if (options.account()?.toLowerCase() !== asked.toLowerCase()) {
      throw new WalletNotInvokedError(
        "The connected account changed. Review again.",
      );
    }
    if (options.chainId() !== chainId || options.isSafe() !== safe) {
      throw new WalletNotInvokedError(CONNECTION_CHANGED);
    }
    if (options.connector?.() !== connector) continue;
    return invoke({ account: asked, client, safe });
  }
  throw new WalletNotInvokedError(CONNECTION_CHANGED);
}

/** Refuses a signature once the account or Safe mode has changed since `withConnection` read them. */
function unchanged(
  options: { account: () => Address | undefined; isSafe: () => boolean },
  { account, safe }: { account: Address; safe: boolean },
): void {
  if (options.account()?.toLowerCase() !== account.toLowerCase()) {
    throw new WalletNotInvokedError(
      "The connected account changed. Review again.",
    );
  }
  if (options.isSafe() !== safe) {
    throw new WalletNotInvokedError(CONNECTION_CHANGED);
  }
}

/**
 * The chain a write is sent on: the client's own when it is that chain, so
 * its formatters apply. viem checks the wallet is on it before sending.
 */
function chainOf(client: WalletClient, chainId: number): Chain {
  return client.chain?.id === chainId
    ? client.chain
    : ({ id: chainId } as Chain);
}

/**
 * A {@link WalletAdapter} over a viem wallet client (wagmi's, say). Every
 * write and signature names the connected account read when it is asked,
 * and every send names its chain, so a wallet that moved refuses it.
 */
export function viemWalletAdapter(options: {
  walletClient: () => Promise<WalletClient>;
  account: () => Address | undefined;
  chainId: () => number | undefined;
  isSafe: () => boolean;
  switchChain: (chainId: number) => Promise<unknown>;
  /** Settles once `isSafe` is known (see {@link WalletAdapter.ready}). */
  ready?: () => Promise<unknown>;
  /** The connector's identity (wagmi's `connector?.uid`): a change fetches the client again. */
  connector?: () => unknown;
}): WalletAdapter {
  const { ready } = options;
  return {
    ...(ready
      ? {
          ready: async () => {
            await ready();
          },
        }
      : {}),
    kind: "wallet",
    account: options.account,
    chainId: options.chainId,
    isSafe: options.isSafe,
    switchChain: async (chainId) => {
      await options.switchChain(chainId);
    },
    sendTransaction: ({ chainId, to, data, value, gas }) =>
      withConnection(options, ({ account, client }) =>
        client.sendTransaction({
          account,
          chain: chainOf(client, chainId),
          to,
          data,
          value,
          ...(gas === undefined ? {} : { gas }),
        }),
      ),
    signTypedData: (typedData) =>
      withConnection(options, (connected) => {
        unchanged(options, connected);
        const { account, client } = connected;
        // viem does not check the wallet's chain against the domain's.
        const chainId = typedData.domain?.chainId;
        if (chainId !== undefined && options.chainId() !== Number(chainId)) {
          throw new WalletNotInvokedError(
            "Your wallet changed networks. Review again.",
          );
        }
        return client.signTypedData({ ...typedData, account });
      }),
    signMessage: (message) =>
      withConnection(options, (connected) => {
        unchanged(options, connected);
        const { account, client } = connected;
        return client.signMessage({ account, message });
      }),
    sendCalls: (chainId, calls) =>
      withConnection(options, async ({ account, client }) => {
        const { id } = await client.sendCalls({
          account,
          chain: chainOf(client, chainId),
          calls: calls.map(({ to, data, value }) => ({ to, data, value })),
        });
        return id;
      }),
  };
}

/** EIP-1193 4200, as Signa's connector refuses a request it does not take. */
export function unsupportedWalletRequest(): Error {
  return Object.assign(
    new ReviewLineError("This wallet request is not supported."),
    {
      code: 4200,
    },
  );
}

/**
 * A {@link WalletAdapter} for a wallet that reviews on its own page (Signa).
 * It takes raw calls through `submit`, and raw typed data or text through
 * `signTypedData` and `signMessage` when given; anything else is refused
 * with EIP-1193 4200.
 */
export function selfReviewingAdapter(options: {
  account: () => Address | undefined;
  submit: (request: SelfReviewedRequest) => Promise<Hex>;
  signTypedData?: (typedData: TypedDataDefinition) => Promise<Hex>;
  signMessage?: (message: string) => Promise<Hex>;
}): WalletAdapter {
  const refuse = () => {
    throw unsupportedWalletRequest();
  };
  const reject = () => Promise.reject(unsupportedWalletRequest());
  return {
    kind: "self-reviewing",
    account: options.account,
    chainId: refuse,
    isSafe: refuse,
    switchChain: reject,
    sendTransaction: reject,
    signTypedData: options.signTypedData ?? reject,
    signMessage: options.signMessage ?? reject,
    submitToReviewer: (request) => options.submit(request),
  };
}
