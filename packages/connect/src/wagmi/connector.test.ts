import { describe, expect, test, vi } from "vitest";
import { centerAccountConnector } from "./connector";

const address = ("0x" + "ab".repeat(20)) as `0x${string}`;
function setup(
  connection: unknown = {
    address,
    chainId: 8453,
    accountId: "eip155:8453:" + address,
    expiresAt: Math.floor(Date.now() / 1000) + 60,
  },
) {
  const wallet = {
    restoreConnection: vi.fn(() => connection as never),
    disconnect: vi.fn(),
  };
  const read = vi.fn(async () => "0x1");
  const emitter = { emit: vi.fn() };
  const connector = centerAccountConnector({
    wallet: async () => wallet,
    read,
  })({ emitter, chains: [], storage: null } as never);
  return { connector, wallet, read, emitter };
}

describe("centerAccountConnector", () => {
  test("exposes the Base account read-only and names it an account", async () => {
    const { connector, read, wallet } = setup();
    expect(connector.id).toBe("juicebox-center");
    expect(connector.name).toBe("Juicebox account");
    expect(await connector.isAuthorized()).toBe(true);
    expect(await connector.getAccounts()).toEqual([address]);
    expect(await connector.getChainId()).toBe(8453);
    expect(await connector.connect()).toEqual({
      accounts: [address],
      chainId: 8453,
    });
    expect(
      await connector.connect({ withCapabilities: true } as never),
    ).toEqual({ accounts: [{ address, capabilities: {} }], chainId: 8453 });
    const provider = (await connector.getProvider()) as {
      request(input: { method: string; params?: unknown[] }): Promise<unknown>;
    };
    expect(await provider.request({ method: "eth_chainId" })).toBe("0x2105");
    expect(await provider.request({ method: "eth_accounts" })).toEqual([
      address,
    ]);
    expect(await provider.request({ method: "eth_requestAccounts" })).toEqual([
      address,
    ]);
    expect(await provider.request({ method: "eth_call", params: [] })).toBe(
      "0x1",
    );
    expect(read).toHaveBeenCalledWith({ method: "eth_call", params: [] });
    expect(
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x2105" }],
      }),
    ).toBeNull();
    await expect(
      provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x1" }],
      }),
    ).rejects.toMatchObject({ code: 4902 });
    await expect(
      provider.request({ method: "eth_sendTransaction" }),
    ).rejects.toMatchObject({ code: 4200 });
    await expect(
      provider.request({ method: "personal_sign" }),
    ).rejects.toMatchObject({ code: 4200 });
    await connector.disconnect();
    expect(wallet.disconnect).toHaveBeenCalled();
  });
  test("treats a missing, foreign, mismatched or expired connection as signed out", async () => {
    for (const bad of [
      null,
      {
        address,
        chainId: 1,
        accountId: "eip155:1:" + address,
        expiresAt: 9e12,
      },
      {
        address,
        chainId: 8453,
        accountId: "eip155:8453:" + "0x" + "cd".repeat(20),
        expiresAt: 9e12,
      },
      {
        address,
        chainId: 8453,
        accountId: "eip155:8453:" + address,
        expiresAt: 1,
      },
    ]) {
      const { connector } = setup(bad);
      expect(await connector.isAuthorized()).toBe(false);
      expect(await connector.getAccounts()).toEqual([]);
      const provider = (await connector.getProvider()) as {
        request(input: { method: string }): Promise<unknown>;
      };
      expect(await provider.request({ method: "eth_accounts" })).toEqual([]);
      await expect(connector.connect()).rejects.toThrow(
        /Sign in with your Juicebox account/,
      );
    }
    await expect(
      setup().connector.connect({ chainId: 1 }),
    ).rejects.toMatchObject({ code: 4902 });
  });
  test("only Base can be switched to, and events map to wagmi's emitter", async () => {
    const { connector, emitter } = setup();
    expect((await connector.switchChain!({ chainId: 8453 })).id).toBe(8453);
    expect(emitter.emit).toHaveBeenCalledWith("change", { chainId: 8453 });
    await expect(connector.switchChain!({ chainId: 10 })).rejects.toMatchObject(
      { code: 4902 },
    );
    connector.onAccountsChanged([]);
    expect(emitter.emit).toHaveBeenCalledWith("disconnect");
    connector.onAccountsChanged([address]);
    expect(emitter.emit).toHaveBeenCalledWith("change", {
      accounts: [address],
    });
    connector.onChainChanged("0x1");
    connector.onChainChanged("0x2105");
    connector.onDisconnect();
    expect(
      emitter.emit.mock.calls.filter(([name]) => name === "disconnect"),
    ).toHaveLength(3);
  });
});
