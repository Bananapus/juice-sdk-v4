import type {
  Address,
  Chain,
  Hex,
  TypedDataDefinition,
  WalletClient,
} from "viem";

/** The raw calls a self-reviewing wallet (Signa) decodes and confirms on its own page. */
export type SelfReviewedRequest = {
  account: Address;
  calls: readonly { chainId: number; to: Address; data: Hex; value: bigint }[];
};

/**
 * The wallet as core sees it. This file is the only core code that calls a
 * wallet; `sendReviewed` reaches it only through an adapter, after the review
 * is confirmed. A `self-reviewing` adapter shows its own review and takes raw
 * calls through `submitToReviewer` only.
 */
export type WalletAdapter = {
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

/**
 * The connected account and the wallet client. The account, chain and Safe
 * mode are read before the client is fetched and again after, so a wallet
 * that switched in between is refused instead of signing in the new one.
 */
async function connection(options: {
  walletClient: () => Promise<WalletClient>;
  account: () => Address | undefined;
  chainId: () => number | undefined;
  isSafe: () => boolean;
}): Promise<{ account: Address; client: WalletClient }> {
  const asked = options.account();
  if (!asked) throw new Error("Connect a wallet first.");
  const chainId = options.chainId();
  const safe = options.isSafe();
  const client = await options.walletClient();
  if (options.account()?.toLowerCase() !== asked.toLowerCase()) {
    throw new Error("The connected account changed. Review again.");
  }
  if (options.chainId() !== chainId || options.isSafe() !== safe) {
    throw new Error("Wallet connection changed. Review the transaction again.");
  }
  return { account: asked, client };
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
}): WalletAdapter {
  return {
    kind: "wallet",
    account: options.account,
    chainId: options.chainId,
    isSafe: options.isSafe,
    switchChain: async (chainId) => {
      await options.switchChain(chainId);
    },
    async sendTransaction({ chainId, to, data, value, gas }) {
      const { account, client } = await connection(options);
      return client.sendTransaction({
        account,
        chain: chainOf(client, chainId),
        to,
        data,
        value,
        ...(gas === undefined ? {} : { gas }),
      });
    },
    async signTypedData(typedData) {
      const { account, client } = await connection(options);
      return client.signTypedData({ ...typedData, account });
    },
    async signMessage(message) {
      const { account, client } = await connection(options);
      return client.signMessage({ account, message });
    },
    async sendCalls(chainId, calls) {
      const { account, client } = await connection(options);
      const { id } = await client.sendCalls({
        account,
        chain: chainOf(client, chainId),
        calls: calls.map(({ to, data, value }) => ({ to, data, value })),
      });
      return id;
    },
  };
}

/** EIP-1193 4200, as Signa's connector refuses a request it does not take. */
export function unsupportedWalletRequest(): Error {
  return Object.assign(new Error("This wallet request is not supported."), {
    code: 4200,
  });
}

/**
 * A {@link WalletAdapter} for a wallet that reviews on its own page (Signa).
 * It takes raw calls through `submit` only; every other method is refused
 * with EIP-1193 4200.
 */
export function selfReviewingAdapter(options: {
  account: () => Address | undefined;
  submit: (request: SelfReviewedRequest) => Promise<Hex>;
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
    signTypedData: reject,
    signMessage: reject,
    submitToReviewer: (request) => options.submit(request),
  };
}
