import { describe, expect, test, vi } from "vitest";
import { zeroAddress, type Address, type PublicClient } from "viem";
import { verifySuckerDestinationMint } from "./suckers.js";
import { v6Address } from "./types.js";

const address = (id: number) =>
  `0x${id.toString(16).padStart(40, "0")}` as Address;
const args = {
  chainId: 1 as const,
  projectId: 30n,
  sucker: address(2),
  beneficiary: address(3),
  tokenCount: 123n,
};
function fixture() {
  const client = {
    getChainId: vi.fn(async () => 1),
    readContract: vi.fn(async () => address(1)),
    getCode: vi.fn(async () => "0x6000"),
    simulateContract: vi.fn(async () => ({ result: args.tokenCount })),
  };
  return { client, publicClient: client as unknown as PublicClient };
}

describe("destination sucker mint readiness", () => {
  test("uses the canonical current controller and exact peer, beneficiary and count", async () => {
    const { client, publicClient } = fixture();
    await verifySuckerDestinationMint(publicClient, args);
    expect(client.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: v6Address("JBDirectory", 1),
        functionName: "controllerOf",
        args: [30n],
      }),
    );
    expect(client.simulateContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: address(1),
        account: args.sucker,
        functionName: "mintTokensOf",
        args: [30n, 123n, args.beneficiary, "", false],
      }),
    );
    client.readContract.mockResolvedValue(address(9));
    await verifySuckerDestinationMint(publicClient, args);
    expect(client.simulateContract).toHaveBeenLastCalledWith(
      expect.objectContaining({ address: address(9) }),
    );
  });
  test("refuses revoked mint authority even for an already registered peer", async () => {
    const { client, publicClient } = fixture();
    client.simulateContract.mockRejectedValue(
      new Error("JBController_MintNotAllowedAndNotTerminalOrHook"),
    );
    await expect(
      verifySuckerDestinationMint(publicClient, args),
    ).rejects.toThrow("MintNotAllowed");
  });
  test("never probes a wrong chain or missing current controller", async () => {
    const { client, publicClient } = fixture();
    client.getChainId.mockResolvedValue(10);
    await expect(
      verifySuckerDestinationMint(publicClient, args),
    ).rejects.toThrow("wrong chain");
    expect(client.readContract).not.toHaveBeenCalled();
    client.getChainId.mockResolvedValue(1);
    client.readContract.mockResolvedValue(zeroAddress);
    await expect(
      verifySuckerDestinationMint(publicClient, args),
    ).rejects.toThrow("deployed current controller");
    expect(client.getCode).not.toHaveBeenCalled();
    client.readContract.mockResolvedValue(address(1));
    client.getCode.mockResolvedValue("0x");
    await expect(
      verifySuckerDestinationMint(publicClient, args),
    ).rejects.toThrow("deployed current controller");
    expect(client.simulateContract).not.toHaveBeenCalled();
  });
  test.each([
    { projectId: 0n },
    { tokenCount: 0n },
    { sucker: zeroAddress },
    { beneficiary: zeroAddress },
  ])("rejects an invalid destination mint: %s", async (invalid) => {
    const { client, publicClient } = fixture();
    await expect(
      verifySuckerDestinationMint(publicClient, { ...args, ...invalid }),
    ).rejects.toThrow("positive and nonzero");
    expect(client.getChainId).not.toHaveBeenCalled();
  });
});
