import {
  createWalletClient,
  custom,
  numberToHex,
  toHex,
  type Address,
  type Hex,
  type WalletClient,
} from "viem";
import { optimism } from "viem/chains";
import { describe, expect, it, vi } from "vitest";
import { WalletNotInvokedError } from "./lineError.js";
import { selfReviewingAdapter, viemWalletAdapter } from "./wallet.js";

const ACCOUNT = "0x1111111111111111111111111111111111111111" as Address;
const TARGET = "0x2222222222222222222222222222222222222222" as Address;
const HASH = `0x${"aa".repeat(32)}` as Hex;
const SIGNATURE = `0x${"5e".repeat(65)}` as Hex;
const CHANGED = "Wallet connection changed. Review the transaction again.";

/**
 * A real viem wallet client over a provider that records each request as it
 * reaches it. viem awaits its chain read (`eth_chainId`) before it sends;
 * `onChainId` runs inside that await.
 */
function walletClient(id = "wallet", events: string[] = []) {
  const wallet = {
    chainId: 10,
    onChainId: () => {},
    fail: undefined as unknown,
  };
  const requests: { method: string; params?: unknown }[] = [];
  const request = vi.fn(
    async ({ method, params }: { method: string; params?: unknown }) => {
      requests.push({ method, params });
      if (method === "eth_chainId") {
        wallet.onChainId();
        return numberToHex(wallet.chainId);
      }
      if (wallet.fail) throw wallet.fail;
      events.push(`${method}:${id}`);
      if (method === "eth_sendTransaction") return HASH;
      if (method === "wallet_sendCalls") return { id: "bundle-1" };
      if (method === "eth_signTypedData_v4" || method === "personal_sign")
        return SIGNATURE;
      throw new Error(`Unexpected ${method}`);
    },
  );
  const client = createWalletClient({
    chain: optimism,
    transport: custom({ request }, { retryCount: 0 }),
  }) as WalletClient;
  /** The params of every `method` request the provider received. */
  const sent = (method: string) =>
    requests.filter((r) => r.method === method).map((r) => r.params);
  return { client, wallet, events, sent };
}

function adapterOver(client: WalletClient) {
  const state = { account: ACCOUNT as Address | undefined };
  const switchChain = vi.fn(async () => ({ id: 8453 }));
  const adapter = viemWalletAdapter({
    walletClient: async () => client,
    account: () => state.account,
    chainId: () => 10,
    isSafe: () => false,
    switchChain,
  });
  return { adapter, state, switchChain };
}

const send = (adapter: ReturnType<typeof viemWalletAdapter>) =>
  adapter.sendTransaction({ chainId: 10, to: TARGET, data: "0x", value: 0n });

describe("wallet adapters", () => {
  it("viemWalletAdapter offers ready only when the site gives one", async () => {
    const { adapter } = adapterOver(walletClient().client);
    expect(adapter.ready).toBeUndefined();
    const ready = vi.fn(async () => "settled");
    const withReady = viemWalletAdapter({
      walletClient: async () => walletClient().client,
      account: () => ACCOUNT,
      chainId: () => 10,
      isSafe: () => false,
      switchChain: async () => {},
      ready,
    });
    await expect(withReady.ready!()).resolves.toBeUndefined();
    expect(ready).toHaveBeenCalledTimes(1);
  });

  it("viemWalletAdapter passes chain, account, gas exactly", async () => {
    const { client, wallet, sent } = walletClient();
    const { adapter, state, switchChain } = adapterOver(client);
    expect(adapter.kind).toBe("wallet");
    expect(adapter.account()).toBe(ACCOUNT);
    expect(adapter.chainId()).toBe(10);
    expect(adapter.isSafe()).toBe(false);

    await expect(
      adapter.sendTransaction({
        chainId: 10,
        to: TARGET,
        data: "0x12345678",
        value: 3n,
        gas: 90_000n,
      }),
    ).resolves.toBe(HASH);
    expect(sent("eth_sendTransaction").slice(-1)[0]).toMatchObject([
      {
        from: ACCOUNT,
        to: TARGET,
        data: "0x12345678",
        value: "0x3",
        gas: numberToHex(90_000n),
      },
    ]);

    // Another chain is named by its id, so viem refuses a wallet elsewhere.
    await expect(
      adapter.sendTransaction({
        chainId: 8453,
        to: TARGET,
        data: "0x",
        value: 0n,
      }),
    ).rejects.toThrow();
    expect(sent("eth_sendTransaction")).toHaveLength(1);
    // No gas leaves it to the wallet.
    wallet.chainId = 8453;
    await adapter.sendTransaction({
      chainId: 8453,
      to: TARGET,
      data: "0x",
      value: 0n,
    });
    expect(sent("eth_sendTransaction").slice(-1)[0]).toEqual([
      expect.not.objectContaining({ gas: expect.anything() }),
    ]);
    wallet.chainId = 10;

    // A Safe's 0 gas is sent as 0.
    await adapter.sendTransaction({
      chainId: 10,
      to: TARGET,
      data: "0x",
      value: 0n,
      gas: 0n,
    });
    expect(sent("eth_sendTransaction").slice(-1)[0]).toMatchObject([
      { gas: "0x0" },
    ]);

    const typedData = {
      domain: { name: "Test", chainId: 10 },
      types: { Note: [{ name: "text", type: "string" }] },
      primaryType: "Note",
      message: { text: "hi" },
    } as const;
    await expect(adapter.signTypedData(typedData)).resolves.toBe(SIGNATURE);
    expect(sent("eth_signTypedData_v4")).toEqual([
      [ACCOUNT, expect.stringContaining('"primaryType":"Note"')],
    ]);
    // Typed data for another chain than the wallet's is refused.
    await expect(
      adapter.signTypedData({
        ...typedData,
        domain: { ...typedData.domain, chainId: 8453 },
      }),
    ).rejects.toThrow("Your wallet changed networks");
    expect(sent("eth_signTypedData_v4")).toHaveLength(1);
    await expect(adapter.signMessage("Sign in")).resolves.toBe(SIGNATURE);
    expect(sent("personal_sign")).toEqual([[toHex("Sign in"), ACCOUNT]]);
    await expect(
      adapter.sendCalls!(10, [{ to: TARGET, data: "0x01", value: 1n }]),
    ).resolves.toBe("bundle-1");
    expect(sent("wallet_sendCalls")).toMatchObject([
      [
        {
          from: ACCOUNT,
          chainId: "0xa",
          calls: [{ to: TARGET, data: "0x01", value: "0x1" }],
        },
      ],
    ]);

    await adapter.switchChain(8453);
    expect(switchChain).toHaveBeenCalledWith(8453);

    // Without a connected account nothing reaches the wallet.
    state.account = undefined;
    const sends = sent("eth_sendTransaction").length;
    await expect(send(adapter)).rejects.toThrow("Connect a wallet first.");
    await expect(adapter.signMessage("x")).rejects.toThrow(
      "Connect a wallet first.",
    );
    await expect(adapter.signTypedData(typedData)).rejects.toThrow(
      "Connect a wallet first.",
    );
    await expect(adapter.sendCalls!(10, [])).rejects.toThrow(
      "Connect a wallet first.",
    );
    expect(sent("eth_sendTransaction")).toHaveLength(sends);
  });

  it("viemWalletAdapter refuses to sign once the account moved after connecting", async () => {
    const { client, events } = walletClient();
    for (const sign of [
      (adapter: ReturnType<typeof viemWalletAdapter>) =>
        adapter.signMessage("hi"),
      (adapter: ReturnType<typeof viemWalletAdapter>) =>
        adapter.signTypedData({
          domain: { chainId: 10 },
          types: { Note: [{ name: "text", type: "string" }] },
          primaryType: "Note",
          message: { text: "hi" },
        }),
    ]) {
      let reads = 0;
      const adapter = viemWalletAdapter({
        walletClient: async () => client,
        // The connection's two reads see ACCOUNT; the next sees another.
        account: () => (reads++ < 2 ? ACCOUNT : TARGET),
        chainId: () => 10,
        isSafe: () => false,
        switchChain: async () => undefined,
      });
      await expect(sign(adapter)).rejects.toThrow(
        "The connected account changed",
      );
    }

    // So does a wallet that turned into a Safe connection meanwhile.
    let reads = 0;
    const adapter = viemWalletAdapter({
      walletClient: async () => client,
      account: () => ACCOUNT,
      chainId: () => 10,
      isSafe: () => reads++ >= 2,
      switchChain: async () => undefined,
    });
    await expect(adapter.signMessage("hi")).rejects.toThrow(
      "Wallet connection changed",
    );
    expect(events).toEqual([]);
  });

  it("selfReviewingAdapter refuses every other method with 4200", async () => {
    const submit = vi.fn(async () => HASH);
    const adapter = selfReviewingAdapter({ account: () => ACCOUNT, submit });
    expect(adapter.kind).toBe("self-reviewing");
    expect(adapter.account()).toBe(ACCOUNT);
    expect(adapter.sendCalls).toBeUndefined();
    const refused = {
      code: 4200,
      message: "This wallet request is not supported.",
    };
    expect(() => adapter.chainId()).toThrow(expect.objectContaining(refused));
    expect(() => adapter.isSafe()).toThrow(expect.objectContaining(refused));
    for (const call of [
      () => adapter.switchChain(10),
      () =>
        adapter.sendTransaction({
          chainId: 10,
          to: TARGET,
          data: "0x",
          value: 0n,
        }),
      () =>
        adapter.signTypedData({
          types: {},
          primaryType: "EIP712Domain",
          message: {},
        } as never),
      () => adapter.signMessage("x"),
    ]) {
      await expect(call()).rejects.toMatchObject(refused);
    }
    const request = {
      account: ACCOUNT,
      calls: [{ chainId: 10, to: TARGET, data: "0x01" as Hex, value: 0n }],
    };
    await expect(adapter.submitToReviewer!(request)).resolves.toBe(HASH);
    expect(submit).toHaveBeenCalledWith(request);
  });

  it("viemWalletAdapter refuses an account switch while the wallet client loads", async () => {
    const { client, events } = walletClient();
    let account: Address = ACCOUNT;
    const adapter = viemWalletAdapter({
      walletClient: async () => {
        account = "0x3333333333333333333333333333333333333333";
        return client;
      },
      account: () => account,
      chainId: () => 10,
      isSafe: () => false,
      switchChain: async () => undefined,
    });
    await expect(send(adapter)).rejects.toThrow(
      "The connected account changed. Review again.",
    );
    expect(events).toEqual([]);
  });

  it("viemWalletAdapter refuses a Safe or chain switch while the wallet client loads", async () => {
    const { client, events } = walletClient();
    const state = { safe: false, chainId: 10 };
    const adapter = viemWalletAdapter({
      walletClient: async () => {
        state.safe = true;
        return client;
      },
      account: () => ACCOUNT,
      chainId: () => state.chainId,
      isSafe: () => state.safe,
      switchChain: async () => undefined,
    });
    await expect(send(adapter)).rejects.toThrow(CHANGED);
    state.safe = false;
    const moving = viemWalletAdapter({
      walletClient: async () => {
        state.chainId = 8453;
        return client;
      },
      account: () => ACCOUNT,
      chainId: () => state.chainId,
      isSafe: () => false,
      switchChain: async () => undefined,
    });
    await expect(moving.signMessage("x")).rejects.toThrow(CHANGED);
    expect(events).toEqual([]);
  });

  it("viemWalletAdapter's refusal when the wallet client can't be fetched says nothing was sent", async () => {
    const adapter = viemWalletAdapter({
      walletClient: async () => {
        throw new Error("Connector not connected.");
      },
      account: () => ACCOUNT,
      chainId: () => 10,
      isSafe: () => false,
      switchChain: async () => undefined,
    });
    const refused = await send(adapter).catch((error: unknown) => error);
    expect(refused).toBeInstanceOf(WalletNotInvokedError);
    expect(refused).toMatchObject({
      message: "Your wallet could not be reached. Nothing was sent; try again.",
    });
  });

  describe("viemWalletAdapter's connector", () => {
    /** Two connectors on one account, each with its own wallet client. */
    function connectors() {
      const state = { current: "old" };
      const events: string[] = [];
      const wallets = {
        old: walletClient("old", events),
        current: walletClient("current", events),
      };
      return { state, events, wallets };
    }

    it("fetches the wallet again when the connector changes while it loads, never invoking the old one", async () => {
      const { state, events, wallets } = connectors();
      let fetches = 0;
      const adapter = viemWalletAdapter({
        walletClient: async () => {
          fetches += 1;
          const { client } = wallets[state.current as "old" | "current"];
          // Same account, same chain: only the connector moves, right after the fetch returns.
          if (fetches === 1)
            queueMicrotask(() => {
              state.current = "current";
              events.push("connector-switch:current");
            });
          return client;
        },
        account: () => ACCOUNT,
        chainId: () => 10,
        isSafe: () => false,
        switchChain: async () => undefined,
        connector: () => state.current,
      });
      await expect(send(adapter)).resolves.toBe(HASH);
      expect(events).toEqual([
        "connector-switch:current",
        "eth_sendTransaction:current",
      ]);
    });

    it("refuses after three fetches that each saw the connector change", async () => {
      const { state, events, wallets } = connectors();
      const fetch = vi.fn(async () => {
        const { client } = wallets[state.current as "old" | "current"];
        state.current = state.current === "old" ? "current" : "old";
        return client;
      });
      const adapter = viemWalletAdapter({
        walletClient: fetch,
        account: () => ACCOUNT,
        chainId: () => 10,
        isSafe: () => false,
        switchChain: async () => undefined,
        connector: () => state.current,
      });
      await expect(send(adapter)).rejects.toThrow(CHANGED);
      expect(fetch).toHaveBeenCalledTimes(3);
      expect(events).toEqual([]);
    });
  });

  describe("viemWalletAdapter at the provider request", () => {
    /** An adapter whose connection reads come from `state`, over one recorded wallet. */
    function connected() {
      const wallet = walletClient();
      const state = {
        account: ACCOUNT as Address,
        chainId: 10,
        safe: false,
        connector: "old",
        viewAs: false,
      };
      const adapter = viemWalletAdapter({
        walletClient: async () => wallet.client,
        account: () => state.account,
        chainId: () => state.chainId,
        isSafe: () => state.safe,
        switchChain: async () => undefined,
        connector: () => state.connector,
        check: () => {
          if (state.viewAs)
            throw new Error("You are viewing as another account.");
        },
      });
      return { wallet, state, adapter };
    }

    it.each([
      [
        "connector",
        (s: ReturnType<typeof connected>["state"]) =>
          void (s.connector = "current"),
        CHANGED,
      ],
      [
        "account",
        (s: ReturnType<typeof connected>["state"]) => void (s.account = TARGET),
        "The connected account changed. Review again.",
      ],
      [
        "chain",
        (s: ReturnType<typeof connected>["state"]) => void (s.chainId = 8453),
        CHANGED,
      ],
      [
        "Safe mode",
        (s: ReturnType<typeof connected>["state"]) => void (s.safe = true),
        CHANGED,
      ],
      [
        "site's own check",
        (s: ReturnType<typeof connected>["state"]) => void (s.viewAs = true),
        "You are viewing as another account.",
      ],
    ])(
      "refuses as unsent when the %s changes while viem awaits its chain read, before eth_sendTransaction",
      async (_, change, line) => {
        const { wallet, state, adapter } = connected();
        // Inside viem's own await, after every check before the viem call.
        wallet.wallet.onChainId = () => change(state);
        const refused = await send(adapter).catch((error: unknown) => error);
        expect(wallet.sent("eth_chainId")).toHaveLength(1);
        expect(wallet.sent("eth_sendTransaction")).toEqual([]);
        expect(refused).toBeInstanceOf(WalletNotInvokedError);
        expect(refused).toMatchObject({ message: line });
      },
    );

    it("checks again as each signature or batch request is forwarded", async () => {
      const wallet = walletClient();
      let checks = 0;
      const adapter = viemWalletAdapter({
        walletClient: async () => wallet.client,
        account: () => ACCOUNT,
        chainId: () => 10,
        isSafe: () => false,
        switchChain: async () => undefined,
        // Passes before the fetch and after it; refuses as the request is forwarded.
        check: () => {
          checks += 1;
          if (checks % 3 === 0)
            throw new Error("You are viewing as another account.");
        },
      });
      for (const request of [
        () => adapter.signMessage("hi"),
        () =>
          adapter.signTypedData({
            domain: { chainId: 10 },
            types: { Note: [{ name: "text", type: "string" }] },
            primaryType: "Note",
            message: { text: "hi" },
          }),
        () => adapter.sendCalls!(10, [{ to: TARGET, data: "0x", value: 0n }]),
      ])
        await expect(request()).rejects.toBeInstanceOf(WalletNotInvokedError);
      expect(checks).toBe(9);
      expect(wallet.events).toEqual([]);
    });

    it("never takes a wallet's own error for an unsent refusal", async () => {
      const { wallet, adapter } = connected();
      // Even the class itself, thrown by the wallet once the request reached it.
      wallet.wallet.fail = new WalletNotInvokedError(CHANGED);
      const failed = await send(adapter).catch((error: unknown) => error);
      expect(wallet.sent("eth_sendTransaction")).toHaveLength(1);
      expect(failed).not.toBeInstanceOf(WalletNotInvokedError);
    });
  });
});
