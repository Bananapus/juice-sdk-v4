import { ReviewLineError, WalletNotInvokedError } from "./lineError.js";
import {
  BaseError,
  ChainMismatchError,
  createWalletClient,
  custom,
  type Address,
  type Chain,
  type Hex,
  type TypedDataDefinition,
  type WalletClient,
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
    /**
     * The run's end: once it aborts, the send is refused, unsent, at the
     * adapter's last check before the wallet ({@link WalletNotInvokedError}).
     */
    signal?: AbortSignal;
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
const NETWORK_CHANGED = "Your wallet changed networks. Review again.";
const UNREACHABLE =
  "Your wallet could not be reached. Nothing was sent; try again.";
const RUN_ENDED = "This action was closed. Nothing more was sent.";

/** The provider requests that send or sign: each is checked again as it is forwarded. */
const DISPATCHED = new Set([
  "eth_sendTransaction",
  "wallet_sendTransaction",
  "eth_sendRawTransaction",
  "wallet_sendCalls",
  "eth_signTypedData_v4",
  "personal_sign",
]);

/**
 * Calls `invoke` with a client over the connected wallet whose every sending
 * or signing request first checks, synchronously, that the account, chain,
 * Safe mode, connector and the site's `check` read as they did when asked:
 * viem awaits its own reads before it sends, so no earlier check is the last.
 * A refusal before any such request went out is a {@link WalletNotInvokedError}.
 * A connector that changes while the client loads is fetched again, three
 * times at most.
 */
async function withConnection<T>(
  options: Parameters<typeof viemWalletAdapter>[0],
  invoke: (connected: { account: Address; client: WalletClient }) => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  const account = options.account();
  if (!account) throw new WalletNotInvokedError("Connect a wallet first.");
  const chainId = options.chainId();
  const safe = options.isSafe();
  const current = () => {
    if (signal?.aborted) throw new WalletNotInvokedError(RUN_ENDED);
    if (options.account()?.toLowerCase() !== account.toLowerCase()) {
      throw new WalletNotInvokedError(
        "The connected account changed. Review again.",
      );
    }
    if (options.chainId() !== chainId || options.isSafe() !== safe) {
      throw new WalletNotInvokedError(CONNECTION_CHANGED);
    }
    try {
      options.check?.();
    } catch (error) {
      throw Object.assign(
        new WalletNotInvokedError(
          error instanceof Error ? error.message : CONNECTION_CHANGED,
        ),
        { cause: error },
      );
    }
    return options.connector?.();
  };
  let wallet: WalletClient | undefined;
  let connector: unknown;
  for (let attempt = 0; attempt < 3 && !wallet; attempt += 1) {
    connector = current();
    let fetched: WalletClient;
    try {
      fetched = await options.walletClient();
    } catch (error) {
      throw Object.assign(new WalletNotInvokedError(UNREACHABLE), {
        cause: error,
      });
    }
    if (current() === connector) wallet = fetched;
  }
  if (!wallet) throw new WalletNotInvokedError(CONNECTION_CHANGED);
  // A composite transport (viem's fallback) can pass one send to a second
  // provider, so a later 4001 would not prove the first never sent it.
  if (!ONE_PROVIDER.has(wallet.transport.type))
    throw new WalletNotInvokedError(COMPOSITE);
  const inner = wallet;
  let forwarded = false;
  let refusal: unknown;
  const client = createWalletClient({
    account: inner.account,
    chain: inner.chain,
    transport: custom(
      {
        request: (args: { method: string; params?: unknown }) => {
          const forwardedNow = DISPATCHED.has(args.method);
          if (forwardedNow) {
            try {
              if (current() !== connector)
                throw new WalletNotInvokedError(CONNECTION_CHANGED);
            } catch (error) {
              // Unsent only while none of this call's requests went out.
              if (forwarded)
                return Promise.reject(new ReviewLineError(CONNECTION_CHANGED));
              refusal = error;
              return Promise.reject(error);
            }
            forwarded = true;
          }
          // A send or signature reaches the wallet once, never retried past this check.
          return forwardedNow
            ? inner.request(args as never, { retryCount: 0 })
            : inner.request(args as never);
        },
      },
      { retryCount: 0 },
    ),
  }) as WalletClient;
  try {
    return await invoke({ account, client });
  } catch (error) {
    // viem wraps what its transport threw; the refusal is this one, by identity.
    if (refusal) throw refusal;
    // viem failed before asking the wallet anything (a chain read, another chain).
    if (!forwarded)
      throw Object.assign(
        new WalletNotInvokedError(
          error instanceof BaseError &&
          error.walk((e) => e instanceof ChainMismatchError)
            ? NETWORK_CHANGED
            : UNREACHABLE,
        ),
        { cause: error },
      );
    throw error;
  }
}

/** viem transports that hand each request to exactly one provider. */
const ONE_PROVIDER = new Set(["custom", "http", "webSocket", "ipc"]);
const COMPOSITE =
  "This wallet connection uses more than one provider. Connect through one wallet provider; nothing was sent.";

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
  /**
   * The site's own synchronous check (view-as, say), run with the others as
   * each request is forwarded to the wallet. Its throw refuses, unsent, with
   * its message.
   */
  check?: () => void;
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
    sendTransaction: ({ chainId, to, data, value, gas, signal }) =>
      withConnection(
        options,
        ({ account, client }) =>
          client.sendTransaction({
            account,
            chain: chainOf(client, chainId),
            to,
            data,
            value,
            ...(gas === undefined ? {} : { gas }),
          }),
        signal,
      ),
    signTypedData: async (typedData) => {
      // viem does not check the wallet's chain against the domain's.
      const chainId = typedData.domain?.chainId;
      if (chainId !== undefined && options.chainId() !== Number(chainId)) {
        throw new WalletNotInvokedError(NETWORK_CHANGED);
      }
      return withConnection(options, ({ account, client }) =>
        client.signTypedData({ ...typedData, account }),
      );
    },
    signMessage: (message) =>
      withConnection(options, ({ account, client }) =>
        client.signMessage({ account, message }),
      ),
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
