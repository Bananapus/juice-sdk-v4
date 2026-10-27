import type { Address, Hex, WalletClient } from "viem";
import { describe, expect, it, vi } from "vitest";
import { selfReviewingAdapter, viemWalletAdapter } from "./wallet.js";

const ACCOUNT = "0x1111111111111111111111111111111111111111" as Address;
const TARGET = "0x2222222222222222222222222222222222222222" as Address;
const HASH = `0x${"aa".repeat(32)}` as Hex;
const SIGNATURE = `0x${"5e".repeat(65)}` as Hex;
const OPTIMISM = { id: 10, name: "OP Mainnet" };

function walletClient() {
  return {
    chain: OPTIMISM,
    sendTransaction: vi.fn(async () => HASH),
    signTypedData: vi.fn(async () => SIGNATURE),
    signMessage: vi.fn(async () => SIGNATURE),
    sendCalls: vi.fn(async () => ({ id: "bundle-1" })),
  };
}

function adapterOver(client: ReturnType<typeof walletClient>) {
  const state = { account: ACCOUNT as Address | undefined };
  const switchChain = vi.fn(async () => ({ id: 8453 }));
  const adapter = viemWalletAdapter({
    walletClient: async () => client as unknown as WalletClient,
    account: () => state.account,
    chainId: () => 10,
    isSafe: () => false,
    switchChain,
  });
  return { adapter, state, switchChain };
}

describe("wallet adapters", () => {
  it("viemWalletAdapter offers ready only when the site gives one", async () => {
    const { adapter } = adapterOver(walletClient());
    expect(adapter.ready).toBeUndefined();
    const ready = vi.fn(async () => "settled");
    const withReady = viemWalletAdapter({
      walletClient: async () => walletClient() as unknown as WalletClient,
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
    const client = walletClient();
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
    expect(client.sendTransaction).toHaveBeenLastCalledWith({
      account: ACCOUNT,
      chain: OPTIMISM,
      to: TARGET,
      data: "0x12345678",
      value: 3n,
      gas: 90_000n,
    });

    // Another chain is named by its id, so viem refuses a wallet elsewhere; no gas leaves it to the wallet.
    await adapter.sendTransaction({
      chainId: 8453,
      to: TARGET,
      data: "0x",
      value: 0n,
    });
    expect(client.sendTransaction).toHaveBeenLastCalledWith({
      account: ACCOUNT,
      chain: { id: 8453 },
      to: TARGET,
      data: "0x",
      value: 0n,
    });

    // A Safe's 0 gas is sent as 0.
    await adapter.sendTransaction({
      chainId: 10,
      to: TARGET,
      data: "0x",
      value: 0n,
      gas: 0n,
    });
    expect(client.sendTransaction).toHaveBeenLastCalledWith(
      expect.objectContaining({ gas: 0n }),
    );

    const typedData = {
      domain: { name: "Test", chainId: 10 },
      types: { Note: [{ name: "text", type: "string" }] },
      primaryType: "Note",
      message: { text: "hi" },
    } as const;
    await expect(adapter.signTypedData(typedData)).resolves.toBe(SIGNATURE);
    expect(client.signTypedData).toHaveBeenLastCalledWith({
      ...typedData,
      account: ACCOUNT,
    });
    // Typed data for another chain than the wallet's is refused.
    await expect(
      adapter.signTypedData({
        ...typedData,
        domain: { ...typedData.domain, chainId: 8453 },
      }),
    ).rejects.toThrow("Your wallet changed networks");
    expect(client.signTypedData).toHaveBeenCalledTimes(1);
    await expect(adapter.signMessage("Sign in")).resolves.toBe(SIGNATURE);
    expect(client.signMessage).toHaveBeenLastCalledWith({
      account: ACCOUNT,
      message: "Sign in",
    });
    await expect(
      adapter.sendCalls!(10, [{ to: TARGET, data: "0x01", value: 1n }]),
    ).resolves.toBe("bundle-1");
    expect(client.sendCalls).toHaveBeenLastCalledWith({
      account: ACCOUNT,
      chain: OPTIMISM,
      calls: [{ to: TARGET, data: "0x01", value: 1n }],
    });

    await adapter.switchChain(8453);
    expect(switchChain).toHaveBeenCalledWith(8453);

    // Without a connected account nothing reaches the wallet.
    state.account = undefined;
    const sends = client.sendTransaction.mock.calls.length;
    await expect(
      adapter.sendTransaction({
        chainId: 10,
        to: TARGET,
        data: "0x",
        value: 0n,
      }),
    ).rejects.toThrow("Connect a wallet first.");
    await expect(adapter.signMessage("x")).rejects.toThrow(
      "Connect a wallet first.",
    );
    await expect(adapter.signTypedData(typedData)).rejects.toThrow(
      "Connect a wallet first.",
    );
    await expect(adapter.sendCalls!(10, [])).rejects.toThrow(
      "Connect a wallet first.",
    );
    expect(client.sendTransaction.mock.calls.length).toBe(sends);
  });

  it("viemWalletAdapter refuses to sign once the account moved after connecting", async () => {
    const client = walletClient();
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
        walletClient: async () => client as unknown as WalletClient,
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
    expect(client.signMessage).not.toHaveBeenCalled();
    expect(client.signTypedData).not.toHaveBeenCalled();

    // So does a wallet that turned into a Safe connection meanwhile.
    let reads = 0;
    const adapter = viemWalletAdapter({
      walletClient: async () => client as unknown as WalletClient,
      account: () => ACCOUNT,
      chainId: () => 10,
      isSafe: () => reads++ >= 2,
      switchChain: async () => undefined,
    });
    await expect(adapter.signMessage("hi")).rejects.toThrow(
      "Wallet connection changed",
    );
    expect(client.signMessage).not.toHaveBeenCalled();
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
    const client = walletClient();
    let account: Address = ACCOUNT;
    const adapter = viemWalletAdapter({
      walletClient: async () => {
        account = "0x3333333333333333333333333333333333333333";
        return client as unknown as WalletClient;
      },
      account: () => account,
      chainId: () => 10,
      isSafe: () => false,
      switchChain: async () => undefined,
    });
    await expect(
      adapter.sendTransaction({
        chainId: 10,
        to: TARGET,
        data: "0x",
        value: 0n,
      }),
    ).rejects.toThrow("The connected account changed. Review again.");
    expect(client.sendTransaction).not.toHaveBeenCalled();
  });

  it("viemWalletAdapter refuses a Safe or chain switch while the wallet client loads", async () => {
    const client = walletClient();
    const state = { safe: false, chainId: 10 };
    const adapter = viemWalletAdapter({
      walletClient: async () => {
        state.safe = true;
        return client as unknown as WalletClient;
      },
      account: () => ACCOUNT,
      chainId: () => state.chainId,
      isSafe: () => state.safe,
      switchChain: async () => undefined,
    });
    await expect(
      adapter.sendTransaction({
        chainId: 10,
        to: TARGET,
        data: "0x",
        value: 0n,
      }),
    ).rejects.toThrow(
      "Wallet connection changed. Review the transaction again.",
    );
    state.safe = false;
    const moving = viemWalletAdapter({
      walletClient: async () => {
        state.chainId = 8453;
        return client as unknown as WalletClient;
      },
      account: () => ACCOUNT,
      chainId: () => state.chainId,
      isSafe: () => false,
      switchChain: async () => undefined,
    });
    await expect(moving.signMessage("x")).rejects.toThrow(
      "Wallet connection changed. Review the transaction again.",
    );
    expect(client.sendTransaction).not.toHaveBeenCalled();
    expect(client.signMessage).not.toHaveBeenCalled();
  });

  describe("viemWalletAdapter's connector", () => {
    /** Two connectors on one account, each with its own wallet client. */
    function connectors() {
      const state = { current: "old" };
      const events: string[] = [];
      const clients = Object.fromEntries(
        ["old", "current"].map((id) => [
          id,
          {
            ...walletClient(),
            sendTransaction: vi.fn(async () => {
              events.push(`invoked:${id}`);
              return HASH;
            }),
          },
        ]),
      );
      return { state, events, clients };
    }
    const send = (adapter: ReturnType<typeof viemWalletAdapter>) =>
      adapter.sendTransaction({
        chainId: 10,
        to: TARGET,
        data: "0x",
        value: 0n,
      });

    it("fetches the wallet again when the connector changes while it loads, never invoking the old one", async () => {
      const { state, events, clients } = connectors();
      let fetches = 0;
      const adapter = viemWalletAdapter({
        walletClient: async () => {
          fetches += 1;
          const client = clients[state.current];
          // Same account, same chain: only the connector moves, right after the fetch returns.
          if (fetches === 1)
            queueMicrotask(() => {
              state.current = "current";
              events.push("connector-switch:current");
            });
          return client as unknown as WalletClient;
        },
        account: () => ACCOUNT,
        chainId: () => 10,
        isSafe: () => false,
        switchChain: async () => undefined,
        connector: () => state.current,
      });
      await expect(send(adapter)).resolves.toBe(HASH);
      expect(events).toEqual(["connector-switch:current", "invoked:current"]);
      expect(clients.old.sendTransaction).not.toHaveBeenCalled();
    });

    it("refuses after three fetches that each saw the connector change", async () => {
      const { state, clients } = connectors();
      const walletClient = vi.fn(async () => {
        const client = clients[state.current];
        state.current = state.current === "old" ? "current" : "old";
        return client as unknown as WalletClient;
      });
      const adapter = viemWalletAdapter({
        walletClient,
        account: () => ACCOUNT,
        chainId: () => 10,
        isSafe: () => false,
        switchChain: async () => undefined,
        connector: () => state.current,
      });
      await expect(send(adapter)).rejects.toThrow(
        "Wallet connection changed. Review the transaction again.",
      );
      expect(walletClient).toHaveBeenCalledTimes(3);
      expect(clients.old.sendTransaction).not.toHaveBeenCalled();
      expect(clients.current.sendTransaction).not.toHaveBeenCalled();
    });

    it("invokes the wallet in the same continuation as its last check", async () => {
      const { state, events, clients } = connectors();
      let checked = false;
      const adapter = viemWalletAdapter({
        walletClient: async () => {
          checked = true;
          return clients.old as unknown as WalletClient;
        },
        // The check after the fetch queues a connector switch: it must land after the wallet call.
        account: () => {
          if (checked)
            queueMicrotask(() => {
              state.current = "current";
              events.push("connector-switch:current");
            });
          return ACCOUNT;
        },
        chainId: () => 10,
        isSafe: () => false,
        switchChain: async () => undefined,
        connector: () => state.current,
      });
      await expect(send(adapter)).resolves.toBe(HASH);
      expect(events[0]).toBe("invoked:old");
    });
  });
});
