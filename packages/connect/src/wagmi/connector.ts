import { createConnector, type CreateConnectorFn } from "wagmi";
import { base } from "wagmi/chains";
import type { Address } from "viem";

/** The one chain a Signa passkey account lives on (Base). */
const HOME_CHAIN_ID = 8453;
const HOME_CHAIN_HEX = `0x${HOME_CHAIN_ID.toString(16)}`;

/** The slice of a Signa wallet client the connector needs. Signing never crosses this seam. */
export type CenterAccountWallet = {
  restoreConnection(): {
    address: Address;
    chainId: typeof HOME_CHAIN_ID;
    accountId: string;
    expiresAt: number;
  } | null;
  disconnect(): void;
};
export type CenterAccountConnectorOptions = {
  wallet(): Promise<CenterAccountWallet>;
  read(input: { method: string; params?: unknown[] }): Promise<unknown>;
};

const reads = new Set([
  "eth_call",
  "eth_getBalance",
  "eth_getCode",
  "eth_getStorageAt",
  "eth_getTransactionCount",
  "eth_getTransactionReceipt",
  "eth_getTransactionByHash",
  "eth_getBlockByNumber",
  "eth_getBlockByHash",
  "eth_blockNumber",
  "eth_getLogs",
]);
const unsupported = (chain = false) =>
  Object.assign(
    new Error(
      chain
        ? "This Signa account uses Base. Connect an external wallet for other networks."
        : "This action needs its own review at Signa. Use a payment review, or connect an external wallet.",
    ),
    { code: chain ? 4902 : 4200 },
  );

/** A read-only wagmi connector for a Signa passkey account on Base. The connection's
 * request key cannot sign or send arbitrary operations; payments go through Signa's review flow. */
export function centerAccountConnector(
  options: CenterAccountConnectorOptions,
): CreateConnectorFn {
  return createConnector((config) => {
    const connection = async () => {
      const value = (await options.wallet()).restoreConnection();
      if (
        !value ||
        value.chainId !== HOME_CHAIN_ID ||
        value.accountId !==
          `eip155:${HOME_CHAIN_ID}:` + value.address.toLowerCase() ||
        value.expiresAt <= Math.floor(Date.now() / 1000)
      )
        return null;
      return value;
    };
    const provider = {
      async request(input: { method: string; params?: unknown[] }) {
        const current = await connection();
        if (input.method === "eth_chainId") return HOME_CHAIN_HEX;
        if (
          input.method === "eth_accounts" ||
          input.method === "eth_requestAccounts"
        )
          return current ? [current.address] : [];
        if (input.method === "wallet_switchEthereumChain") {
          const requested = input.params?.[0] as
            | { chainId?: string }
            | undefined;
          if (requested?.chainId !== HOME_CHAIN_HEX) throw unsupported(true);
          return null;
        }
        if (reads.has(input.method)) return options.read(input);
        throw unsupported();
      },
    };
    return {
      id: "juicebox-center",
      name: "Signa account",
      type: "juicebox-center",
      async connect(parameters) {
        if (
          parameters?.chainId !== undefined &&
          parameters.chainId !== HOME_CHAIN_ID
        )
          throw unsupported(true);
        const current = await connection();
        if (!current) throw new Error("Sign in with your Signa account first.");
        const accounts = (
          parameters as { withCapabilities?: boolean } | undefined
        )?.withCapabilities
          ? [{ address: current.address, capabilities: {} }]
          : [current.address];
        return { accounts, chainId: HOME_CHAIN_ID } as never;
      },
      async disconnect() {
        (await options.wallet()).disconnect();
      },
      async getAccounts() {
        const current = await connection();
        return current ? [current.address] : [];
      },
      async getChainId() {
        return HOME_CHAIN_ID;
      },
      async getProvider() {
        return provider;
      },
      async isAuthorized() {
        return !!(await connection());
      },
      async switchChain({ chainId }) {
        if (chainId !== HOME_CHAIN_ID) throw unsupported(true);
        config.emitter.emit("change", { chainId });
        return base;
      },
      onAccountsChanged(accounts) {
        if (!accounts.length) config.emitter.emit("disconnect");
        else config.emitter.emit("change", { accounts: accounts as Address[] });
      },
      onChainChanged(chainId) {
        if (Number(chainId) !== HOME_CHAIN_ID)
          config.emitter.emit("disconnect");
      },
      onDisconnect() {
        config.emitter.emit("disconnect");
      },
    };
  });
}
