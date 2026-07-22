import { jbContractAddress } from "@bananapus/nana-sdk-core";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  type ERC2771ForwardRequestData,
  useSignErc2771ForwardRequest,
} from "./useSignErc2771ForwardRequest";

const mocks = vi.hoisted(() => ({
  address: undefined as string | undefined,
  contextVersion: 6,
  encodeFunctionData: vi.fn(),
  getClient: vi.fn(),
  getContract: vi.fn(),
  nonce: vi.fn(),
  signTypedDataAsync: vi.fn(),
  switchChainAsync: vi.fn(),
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: mocks.address }),
  useConfig: () => ({ getClient: mocks.getClient }),
  useSignTypedData: () => ({ signTypedDataAsync: mocks.signTypedDataAsync }),
  useSwitchChain: () => ({ switchChainAsync: mocks.switchChainAsync }),
}));

vi.mock("../../../contexts/JBContractContext/JBContractContext", () => ({
  useJBContractContext: () => ({ version: mocks.contextVersion }),
}));

vi.mock("viem", async () => {
  const actual = await vi.importActual<typeof import("viem")>("viem");
  return {
    ...actual,
    encodeFunctionData: mocks.encodeFunctionData,
    getContract: mocks.getContract,
  };
});

const signer = "0x1111111111111111111111111111111111111111";
const request: ERC2771ForwardRequestData = {
  from: signer,
  to: "0x2222222222222222222222222222222222222222",
  value: 3n,
  gas: 400_000n,
  data: "0xabcdef" as const,
};

describe("useSignErc2771ForwardRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mocks.address = signer;
    mocks.contextVersion = 6;
    mocks.switchChainAsync.mockResolvedValue(undefined);
    mocks.getClient.mockReturnValue({ chain: { id: 1 } });
    mocks.nonce.mockResolvedValue(9n);
    mocks.getContract.mockReturnValue({ read: { nonces: mocks.nonce } });
    mocks.encodeFunctionData.mockReturnValue("0xencoded");
  });

  test("fails before changing chains when no wallet account is connected", async () => {
    mocks.address = undefined;

    await expect(
      useSignErc2771ForwardRequest().sign(request, 1),
    ).rejects.toThrow("Wallet account is not connected");
    expect(mocks.switchChainAsync).not.toHaveBeenCalled();
  });

  test("refuses to authorize another account's forward request", async () => {
    await expect(
      useSignErc2771ForwardRequest().sign(
        { ...request, from: "0x3333333333333333333333333333333333333333" },
        1,
      ),
    ).rejects.toThrow("does not match the connected account");
    expect(mocks.switchChainAsync).not.toHaveBeenCalled();
  });

  test("propagates a forwarder nonce read failure instead of hanging", async () => {
    mocks.nonce.mockRejectedValue(new Error("RPC unavailable"));

    await expect(
      useSignErc2771ForwardRequest().sign(request, 1),
    ).rejects.toThrow("RPC unavailable");
  });

  test("signs the canonical forwarder payload and encodes execute", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    mocks.signTypedDataAsync.mockResolvedValue("0xsigned");

    await expect(useSignErc2771ForwardRequest().sign(request, 1)).resolves.toBe(
      "0xencoded",
    );

    expect(mocks.switchChainAsync).toHaveBeenCalledWith({ chainId: 1 });
    expect(mocks.getContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: jbContractAddress[6].ERC2771Forwarder[1],
      }),
    );
    expect(mocks.nonce).toHaveBeenCalledWith([signer]);
    expect(mocks.signTypedDataAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        account: signer,
        domain: {
          name: "Juicebox",
          chainId: 1,
          verifyingContract: jbContractAddress[6].ERC2771Forwarder[1],
          version: "1",
        },
        primaryType: "ForwardRequest",
        message: { ...request, deadline: 1767398400, nonce: 9n },
      }),
    );
    expect(mocks.encodeFunctionData).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "execute",
        args: [{ ...request, deadline: 1767398400, signature: "0xsigned" }],
      }),
    );
  });

  test("propagates a rejected wallet signature", async () => {
    mocks.signTypedDataAsync.mockRejectedValue(new Error("User rejected"));

    await expect(
      useSignErc2771ForwardRequest().sign(request, 1, 5),
    ).rejects.toThrow("User rejected");
    expect(mocks.getContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: jbContractAddress[5].ERC2771Forwarder[1],
      }),
    );
  });

  test("propagates execute encoding failures instead of hanging", async () => {
    mocks.signTypedDataAsync.mockResolvedValue("0xsigned");
    mocks.encodeFunctionData.mockImplementation(() => {
      throw new Error("Invalid execute arguments");
    });

    await expect(
      useSignErc2771ForwardRequest().sign(request, 1),
    ).rejects.toThrow("Invalid execute arguments");
  });
});
