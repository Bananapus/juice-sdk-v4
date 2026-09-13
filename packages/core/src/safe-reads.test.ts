import { describe, expect, it, vi } from "vitest";
import {
  decodeFunctionData,
  encodeFunctionData,
  encodeFunctionResult,
  getAddress,
  keccak256,
  parseAbi,
  toHex,
  zeroAddress,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import fixture from "../../../test/fixtures/safe-1.4.1.json" with { type: "json" };
import {
  CREATE_BATCH_ABI,
  SAFE_CREATE_ABI,
  SAFE_FACTORY,
  SAFE_FALLBACK,
  SAFE_SINGLETON,
  checkSafeDeployments,
  predictSafeAddress,
  readSafeCreationCode,
  resolveSafeAddress,
  verifySafeDeployments,
  verifySafeLaunchSimulation,
  type SafeAddressInput,
  type SafeDeploymentPlan,
} from "./safe.js";

const READ_ABI = parseAbi([
  "function masterCopy() view returns (address)",
  "function VERSION() view returns (string)",
  "function getThreshold() view returns (uint256)",
  "function getOwners() view returns (address[])",
  "function getModulesPaginated(address start,uint256 pageSize) view returns (address[],address)",
]);
const SENTINEL = "0x0000000000000000000000000000000000000001" as const;
const GUARD_SLOT =
  "0x4a204f620c8c5ccdca3fd54d003badd85ba500436a431f0cbda4f558c93c34c8";
const FALLBACK_SLOT =
  "0x6c9a6c4a39284e37ed1cf53d337577d14212a4870fb976a4366c693b939918d5";
const owners = [2n, 3n, 4n].map((value) =>
  getAddress(toHex(value, { size: 20 })),
);
const policy = {
  owners,
  threshold: 2,
  saltNonce: toHex(11n, { size: 32 }),
  proxyCreationCode: fixture.contracts.proxy.creationCode as Hex,
};
const plan: SafeDeploymentPlan = {
  ...policy,
  address: predictSafeAddress(policy),
};
const createInput: SafeAddressInput = {
  kind: "create",
  owners,
  threshold: 2,
  saltNonce: policy.saltNonce,
};

function mockClient() {
  const codes = new Map<string, Hex | undefined>([
    [SAFE_FACTORY, fixture.contracts.factory.runtime as Hex],
    [SAFE_SINGLETON, fixture.contracts.singleton.runtime as Hex],
    [SAFE_FALLBACK, fixture.contracts.fallback.runtime as Hex],
    [plan.address, fixture.contracts.proxy.runtime as Hex],
  ]);
  const storage = new Map<string, Hex | undefined>([
    [toHex(0n, { size: 32 }), toHex(BigInt(SAFE_SINGLETON), { size: 32 })],
    [GUARD_SLOT, toHex(0n, { size: 32 })],
    [FALLBACK_SLOT, toHex(BigInt(SAFE_FALLBACK), { size: 32 })],
  ]);
  const responses: Record<string, unknown> = {
    masterCopy: encodeFunctionResult({
      abi: READ_ABI,
      functionName: "masterCopy",
      result: SAFE_SINGLETON,
    }),
    VERSION: encodeFunctionResult({
      abi: READ_ABI,
      functionName: "VERSION",
      result: "1.4.1",
    }),
    getThreshold: encodeFunctionResult({
      abi: READ_ABI,
      functionName: "getThreshold",
      result: 2n,
    }),
    getOwners: encodeFunctionResult({
      abi: READ_ABI,
      functionName: "getOwners",
      result: owners,
    }),
    getModulesPaginated: encodeFunctionResult({
      abi: READ_ABI,
      functionName: "getModulesPaginated",
      result: [[], SENTINEL],
    }),
  };
  const getCode = vi.fn(async ({ address }: { address: Address }) =>
    codes.get(address),
  );
  const getStorageAt = vi.fn(async ({ slot }: { slot: Hex }) =>
    storage.get(slot),
  );
  const request = vi.fn(
    async ({ params }: { params: readonly [{ data: Hex }, string] }) => {
      const { functionName } = decodeFunctionData({
        abi: READ_ABI,
        data: params[0].data,
      });
      return responses[functionName];
    },
  );
  const readContract = vi.fn(async () => policy.proxyCreationCode);
  return {
    codes,
    storage,
    responses,
    getCode,
    getStorageAt,
    request,
    readContract,
    client: {
      getCode,
      getStorageAt,
      request,
      readContract,
    } as unknown as PublicClient,
  };
}

describe("canonical Safe creation reads and address resolution", () => {
  it("pins runtimes to the official 1.4.1 compiler artifacts, including the proxy", async () => {
    expect(fixture.source).toMatchObject({
      package: "@safe-global/safe-contracts",
      version: "1.4.1",
    });
    expect(
      Object.values(fixture.contracts).map((contract) =>
        keccak256(contract.runtime as Hex),
      ),
    ).toEqual([
      "0x50c3cdc4074750a7a974204a716c999edd37482f907608d960b2b025ee0b3317",
      "0x1fe2df852ba3299d6534ef416eefa406e56ced995bca886ab7a553e6d0c5e1c4",
      "0x7c6007a5d711cea8dfd5d91f5940ec29c7f200fe511eb1fc1397b367af3c42f9",
      "0xd7d408ebcd99b2b70be43e20253d6d92a8ea8fab29bd3be7f55b10032331fb4c",
    ]);
    const rpc = mockClient();
    await expect(readSafeCreationCode(rpc.client)).resolves.toBe(
      policy.proxyCreationCode,
    );
    expect(rpc.getCode.mock.calls.map(([args]) => args.address)).toEqual([
      SAFE_FACTORY,
      SAFE_SINGLETON,
      SAFE_FALLBACK,
    ]);
    expect(rpc.readContract).toHaveBeenCalledWith({
      address: SAFE_FACTORY,
      abi: SAFE_CREATE_ABI,
      functionName: "proxyCreationCode",
    });
  });

  it.each([SAFE_FACTORY, SAFE_SINGLETON, SAFE_FALLBACK])(
    "rejects modified canonical runtime at %s before querying its factory",
    async (address) => {
      const rpc = mockClient();
      rpc.codes.set(address, "0x6000");
      await expect(readSafeCreationCode(rpc.client)).rejects.toThrow(
        "canonical Safe 1.4.1",
      );
      expect(rpc.readContract).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, "0x", "0x1", "bad", `0x${"00".repeat(24577)}`])(
    "rejects absent or malformed canonical runtime %#",
    async (code) => {
      const rpc = mockClient();
      rpc.codes.set(SAFE_SINGLETON, code as Hex | undefined);
      await expect(readSafeCreationCode(rpc.client)).rejects.toThrow(
        "canonical",
      );
    },
  );

  it.each(["0x", "0x1", "not hex", `0x${"00".repeat(2049)}`])(
    "bounds factory creation code %#",
    async (code) => {
      const rpc = mockClient();
      rpc.readContract.mockResolvedValue(code as Hex);
      await expect(readSafeCreationCode(rpc.client)).rejects.toThrow(
        "proxy creation code",
      );
    },
  );

  it("propagates unavailable RPCs and factory reads", async () => {
    const codeRpc = mockClient();
    codeRpc.getCode.mockRejectedValue(new Error("RPC offline"));
    await expect(readSafeCreationCode(codeRpc.client)).rejects.toThrow(
      "RPC offline",
    );
    const callRpc = mockClient();
    callRpc.readContract.mockRejectedValue(new Error("factory read failed"));
    await expect(readSafeCreationCode(callRpc.client)).rejects.toThrow(
      "factory read failed",
    );
  });

  it("resolves existing addresses without a client or a Safe certification", async () => {
    const address = "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa" as Address;
    await expect(
      resolveSafeAddress(
        { kind: "existing", address: address.toLowerCase() as Address },
        [],
      ),
    ).resolves.toEqual({ address });
    for (const invalid of [zeroAddress, SENTINEL, "bad"]) {
      await expect(
        resolveSafeAddress(
          { kind: "existing", address: invalid as Address },
          [],
        ),
      ).rejects.toThrow("existing Safe address");
    }
  });

  it("resolves identical chain plans without changing the owners or salt", async () => {
    const first = mockClient();
    const second = mockClient();
    second.readContract.mockResolvedValue(
      `0x${policy.proxyCreationCode.slice(2).toUpperCase()}`,
    );
    await expect(
      resolveSafeAddress(createInput, [first.client, second.client]),
    ).resolves.toEqual({ address: plan.address, plan });
    expect(first.readContract).toHaveBeenCalledTimes(1);
    expect(second.readContract).toHaveBeenCalledTimes(1);
    expect(createInput).toEqual({
      kind: "create",
      owners,
      threshold: 2,
      saltNonce: policy.saltNonce,
    });
  });

  it("rejects incompatible chains and validates all local inputs before RPC", async () => {
    const first = mockClient();
    const second = mockClient();
    second.readContract.mockResolvedValue("0x6000");
    await expect(
      resolveSafeAddress(createInput, [first.client, second.client]),
    ).rejects.toThrow("differs across");
    const rpc = mockClient();
    for (const input of [
      { ...createInput, kind: "unknown" },
      { ...createInput, owners: [] },
      { ...createInput, saltNonce: "0x01" },
    ]) {
      await expect(
        resolveSafeAddress(input as SafeAddressInput, [rpc.client]),
      ).rejects.toThrow();
    }
    await expect(resolveSafeAddress(createInput, [])).rejects.toThrow(
      "at least one network",
    );
    expect(rpc.getCode).not.toHaveBeenCalled();
  });
});

describe("Safe deployment policy verification", () => {
  it("accepts the exact profile and pins every bounded policy, code, and storage read to the receipt block", async () => {
    const rpc = mockClient();
    await expect(
      verifySafeDeployments(rpc.client, [plan], { blockNumber: 123n }),
    ).resolves.toBe(true);
    for (const [args] of rpc.getCode.mock.calls)
      expect(args).toHaveProperty("blockNumber", 123n);
    for (const [args] of rpc.getStorageAt.mock.calls)
      expect(args).toHaveProperty("blockNumber", 123n);
    for (const [args] of rpc.request.mock.calls)
      expect(args.params[1]).toBe("0x7b");
    expect(rpc.request).toHaveBeenCalledWith({
      method: "eth_call",
      params: [
        {
          to: plan.address,
          gas: toHex(500_000n),
          data: encodeFunctionData({
            abi: READ_ABI,
            functionName: "getModulesPaginated",
            args: [SENTINEL, 1n],
          }),
        },
        "0x7b",
      ],
    });
    expect(rpc.request).toHaveBeenCalledWith({
      method: "eth_call",
      params: [
        {
          to: plan.address,
          gas: toHex(400_000n),
          data: encodeFunctionData({
            abi: READ_ABI,
            functionName: "getOwners",
          }),
        },
        "0x7b",
      ],
    });
    expect(rpc.readContract).not.toHaveBeenCalled();
  });

  it("uses latest by default and compares policy membership independently of owner order", async () => {
    const rpc = mockClient();
    rpc.responses.getOwners = encodeFunctionResult({
      abi: READ_ABI,
      functionName: "getOwners",
      result: [...owners].reverse(),
    });
    await expect(verifySafeDeployments(rpc.client, [plan])).resolves.toBe(true);
    expect(
      rpc.request.mock.calls.every(([args]) => args.params[1] === "latest"),
    ).toBe(true);
    await expect(
      verifySafeDeployments(rpc.client, [], { blockNumber: -1n }),
    ).rejects.toThrow("verification block");
    await expect(verifySafeDeployments({} as PublicClient, [])).resolves.toBe(
      true,
    );
  });

  it.each([undefined, "0x"])(
    "distinguishes missing code %# from verification success",
    async (code) => {
      const rpc = mockClient();
      rpc.codes.set(plan.address, code as Hex | undefined);
      await expect(
        verifySafeDeployments(rpc.client, [plan], { allowMissing: true }),
      ).resolves.toBe(false);
      await expect(verifySafeDeployments(rpc.client, [plan])).rejects.toThrow(
        "reviewed owners and policy",
      );
      expect(rpc.request).not.toHaveBeenCalled();
    },
  );

  it("does not classify a code RPC failure as an undeployed Safe", async () => {
    const rpc = mockClient();
    rpc.getCode.mockRejectedValue(new Error("RPC unavailable"));
    await expect(
      verifySafeDeployments(rpc.client, [plan], { allowMissing: true }),
    ).rejects.toThrow("RPC unavailable");
  });

  it.each(["0x6000", "0x1", "no code", `0xef0100${SAFE_SINGLETON.slice(2)}`])(
    "rejects unrelated or delegated code %#",
    async (code) => {
      const rpc = mockClient();
      rpc.codes.set(plan.address, code as Hex);
      await expect(
        verifySafeDeployments(rpc.client, [plan], { allowMissing: true }),
      ).rejects.toThrow("policy");
      expect(rpc.request).not.toHaveBeenCalled();
    },
  );

  it.each([
    undefined,
    "0x",
    toHex(BigInt(owners[0]), { size: 32 }),
    `0x01${"00".repeat(31)}`,
  ])("rejects malformed or substituted singleton storage %#", async (word) => {
    const rpc = mockClient();
    rpc.storage.set(toHex(0n, { size: 32 }), word as Hex | undefined);
    await expect(verifySafeDeployments(rpc.client, [plan])).rejects.toThrow(
      "policy",
    );
    expect(rpc.request).not.toHaveBeenCalled();
  });

  it.each([SAFE_SINGLETON, SAFE_FALLBACK])(
    "checks exact dependency runtime again at receipt block: %s",
    async (address) => {
      const rpc = mockClient();
      rpc.codes.set(address, "0x6000");
      await expect(
        verifySafeDeployments(rpc.client, [plan], { blockNumber: 123n }),
      ).rejects.toThrow("policy");
      expect(rpc.request).not.toHaveBeenCalled();
    },
  );

  it.each([
    "masterCopy",
    "VERSION",
    "getThreshold",
    "getOwners",
    "getModulesPaginated",
  ])("rejects absent %s response", async (method) => {
    const rpc = mockClient();
    rpc.responses[method] = "0x";
    await expect(verifySafeDeployments(rpc.client, [plan])).rejects.toThrow(
      "policy",
    );
  });

  it.each([null, "not hex", "0x1", `0x${"00".repeat(33)}`])(
    "bounds malformed scalar returndata %#",
    async (response) => {
      const rpc = mockClient();
      rpc.responses.getThreshold = response;
      await expect(verifySafeDeployments(rpc.client, [plan])).rejects.toThrow(
        "Invalid or oversized",
      );
    },
  );

  it.each([
    ["masterCopy", toHex(BigInt(owners[0]), { size: 32 })],
    [
      "VERSION",
      encodeFunctionResult({
        abi: READ_ABI,
        functionName: "VERSION",
        result: "1.3.0",
      }),
    ],
    ["getThreshold", toHex(1n, { size: 32 })],
    [
      "getModulesPaginated",
      encodeFunctionResult({
        abi: READ_ABI,
        functionName: "getModulesPaginated",
        result: [[owners[0]], SENTINEL],
      }),
    ],
    [
      "getModulesPaginated",
      encodeFunctionResult({
        abi: READ_ABI,
        functionName: "getModulesPaginated",
        result: [[], owners[0]],
      }),
    ],
    [
      "getOwners",
      encodeFunctionResult({
        abi: READ_ABI,
        functionName: "getOwners",
        result: [owners[0]],
      }),
    ],
    [
      "getOwners",
      encodeFunctionResult({
        abi: READ_ABI,
        functionName: "getOwners",
        result: [owners[0], owners[0], owners[2]],
      }),
    ],
    [
      "getOwners",
      encodeFunctionResult({
        abi: READ_ABI,
        functionName: "getOwners",
        result: [owners[0], owners[1], SAFE_FACTORY],
      }),
    ],
  ])("rejects changed %s policy %#", async (method, response) => {
    const rpc = mockClient();
    rpc.responses[method] = response;
    await expect(verifySafeDeployments(rpc.client, [plan])).rejects.toThrow(
      "policy",
    );
  });

  it("bounds and validates array offsets and declared owner count before decoding", async () => {
    for (const response of [
      `0x${"00".repeat(64 + 51 * 32)}`,
      `${toHex(64n, { size: 32 })}${toHex(3n, { size: 32 }).slice(2)}${"00".repeat(96)}`,
      `${toHex(32n, { size: 32 })}${toHex(2n ** 255n, { size: 32 }).slice(2)}${"00".repeat(96)}`,
    ]) {
      const rpc = mockClient();
      rpc.responses.getOwners = response;
      await expect(verifySafeDeployments(rpc.client, [plan])).rejects.toThrow();
    }
  });

  it.each([GUARD_SLOT, FALLBACK_SLOT])(
    "rejects missing, malformed or changed policy storage %s",
    async (slot) => {
      for (const word of [
        undefined,
        "0x01",
        toHex(BigInt(owners[0]), { size: 32 }),
      ]) {
        const rpc = mockClient();
        rpc.storage.set(slot, word as Hex | undefined);
        await expect(verifySafeDeployments(rpc.client, [plan])).rejects.toThrow(
          "policy",
        );
      }
    },
  );

  it("propagates storage and raw-call failures, without attempting OffchainLookup transport", async () => {
    const storageRpc = mockClient();
    storageRpc.getStorageAt.mockRejectedValue(new Error("storage offline"));
    await expect(
      verifySafeDeployments(storageRpc.client, [plan]),
    ).rejects.toThrow("storage offline");
    const callRpc = mockClient();
    callRpc.request.mockRejectedValue(
      new Error("OffchainLookup: https://untrusted.invalid"),
    );
    await expect(verifySafeDeployments(callRpc.client, [plan])).rejects.toThrow(
      "OffchainLookup",
    );
    expect(callRpc.readContract).not.toHaveBeenCalled();
  });

  it("preflights both new and already deployed Safes but rejects saved creation-code drift", async () => {
    await expect(
      checkSafeDeployments({} as PublicClient),
    ).resolves.toBeUndefined();
    const rpc = mockClient();
    await expect(
      checkSafeDeployments(rpc.client, [plan]),
    ).resolves.toBeUndefined();
    rpc.codes.delete(plan.address);
    await expect(
      checkSafeDeployments(rpc.client, [plan]),
    ).resolves.toBeUndefined();
    const changed = { ...policy, proxyCreationCode: "0x6000" as Hex };
    await expect(
      checkSafeDeployments(rpc.client, [
        { ...changed, address: predictSafeAddress(changed) },
      ]),
    ).rejects.toThrow("creation code changed");
    rpc.codes.set(plan.address, fixture.contracts.proxy.runtime as Hex);
    rpc.responses.getThreshold = toHex(1n, { size: 32 });
    await expect(checkSafeDeployments(rpc.client, [plan])).rejects.toThrow(
      "policy",
    );
  });

  it("accepts a failed factory simulation only when the exact reviewed Safe is already deployed", async () => {
    const data = encodeFunctionResult({
      abi: CREATE_BATCH_ABI,
      functionName: "aggregate3Value",
      result: [
        { success: false, returnData: "0x" },
        { success: true, returnData: "0x" },
      ],
    });
    const rpc = mockClient();
    await expect(
      verifySafeLaunchSimulation(rpc.client, [plan], data),
    ).resolves.toBeUndefined();
    rpc.codes.delete(plan.address);
    await expect(
      verifySafeLaunchSimulation(rpc.client, [plan], data),
    ).rejects.toThrow("policy");
    rpc.getCode.mockRejectedValue(new Error("unknown deployment state"));
    await expect(
      verifySafeLaunchSimulation(rpc.client, [plan], data),
    ).rejects.toThrow("unknown deployment state");
  });
});
