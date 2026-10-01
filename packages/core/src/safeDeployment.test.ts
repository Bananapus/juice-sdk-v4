import {
  decodeFunctionData,
  encodeFunctionData,
  encodeFunctionResult,
  getAddress,
  keccak256,
  padHex,
  parseAbi,
  toFunctionSelector,
  zeroAddress,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { describe, expect, it, vi } from "vitest";
import {
  MULTI_SEND_ABI,
  MULTI_SEND_CALL_ONLY,
  RECOGNIZED_SAFE_RELEASES,
  SAFE_CANONICAL_PAYMENT_RECEIVER,
  SAFE_CREATE_ABI,
  SAFE_L1_L2_SINGLETON_PAIRS,
  SAFE_SETUP_ABI,
  SAFE_TO_L2_SETUP_ABI,
  SAFE_TO_L2_SETUP_ADDRESS,
  SAFE_TO_L2_SETUP_CODE_HASH,
  buildSafeProxyFactoryCall,
  decodeMultiSend,
  encodeMultiSend,
  isDeployableSafeAuthority,
  multiSendCallsOf,
  packMultiSend,
  prepareSafeSameAddressDeployment,
  validateSafeCreationForCurrentPolicy,
  type SafeAuthorityIdentity,
  type SafeCreation,
} from "./safe.js";

const READS = parseAbi([
  "function masterCopy() view returns (address)",
  "function VERSION() view returns (string)",
  "function getThreshold() view returns (uint256)",
  "function getOwners() view returns (address[])",
  "function getModulesPaginated(address start,uint256 pageSize) view returns (address[],address)",
]);

const SAFE = "0x1111111111111111111111111111111111111111" as Address;
const OWNER_A = "0x2222222222222222222222222222222222222222" as Address;
const OWNER_B = "0x3333333333333333333333333333333333333333" as Address;
const FALLBACK = "0x4444444444444444444444444444444444444444" as Address;
const OTHER = "0x5555555555555555555555555555555555555555" as Address;
const SENDER = "0x6666666666666666666666666666666666666666" as Address;
const SINGLETON = RECOGNIZED_SAFE_RELEASES[0].singletons[0];
const FACTORY = RECOGNIZED_SAFE_RELEASES[0].factories[0];
const [L1_SINGLETON, L2_SINGLETON] = SAFE_L1_L2_SINGLETON_PAIRS[0];
const L1_FACTORY = RECOGNIZED_SAFE_RELEASES[1].factories[0];
const PROXY_RUNTIME =
  "0x608060405273ffffffffffffffffffffffffffffffffffffffff600054167fa619486e0000000000000000000000000000000000000000000000000000000060003514156050578060005260206000f35b3660008037600080366000845af43d6000803e60008114156070573d6000fd5b3d6000f3fea2646970667358221220d1429297349653a4918076d650332de1a1068c5f3e07c5c82360c277770b955264736f6c63430007060033" as Hex;
const SINGLETON_CODE = "0x60006000" as Hex;
const L2_SINGLETON_CODE = "0x60116000" as Hex;
const FALLBACK_CODE = "0x60016000" as Hex;
const FACTORY_CODE = "0x60026000" as Hex;
// Never fetched: the SafeToL2Setup hash is checked against this stand-in.
const SETUP_LIBRARY_CODE = "0x60036000" as Hex;
const DELEGATED_EOA_CODE = `0xef0100${OTHER.slice(2)}` as Hex;
const PREFIXED_CONTRACT_CODE = `${DELEGATED_EOA_CODE}00` as Hex;
const GUARD_SLOT =
  "0x4a204f620c8c5ccdca3fd54d003badd85ba500436a431f0cbda4f558c93c34c8" as Hex;
const FALLBACK_SLOT =
  "0x6c9a6c4a39284e37ed1cf53d337577d14212a4870fb976a4366c693b939918d5" as Hex;

function initializer({
  owners = [OWNER_A, OWNER_B],
  threshold = 2n,
  to = zeroAddress,
  data = "0x" as Hex,
  fallbackHandler = FALLBACK,
  paymentToken = zeroAddress,
  payment = 0n,
  paymentReceiver = zeroAddress,
}: {
  owners?: Address[];
  threshold?: bigint;
  to?: Address;
  data?: Hex;
  fallbackHandler?: Address;
  paymentToken?: Address;
  payment?: bigint;
  paymentReceiver?: Address;
} = {}): Hex {
  return encodeFunctionData({
    abi: SAFE_SETUP_ABI,
    functionName: "setup",
    args: [
      owners,
      threshold,
      to,
      data,
      fallbackHandler,
      paymentToken,
      payment,
      paymentReceiver,
    ],
  });
}

function creation(overrides: Partial<SafeCreation> = {}): SafeCreation {
  return {
    factory: FACTORY,
    singleton: SINGLETON,
    initializer: initializer(),
    saltNonce: 42n,
    ...overrides,
  };
}

function currentSafe(
  overrides: Partial<SafeAuthorityIdentity> = {},
): SafeAuthorityIdentity {
  return {
    kind: "safe",
    proxyCodeHash: keccak256(PROXY_RUNTIME),
    singleton: SINGLETON,
    singletonCodeHash: keccak256(SINGLETON_CODE),
    version: "1.3.0",
    owners: [OWNER_A, OWNER_B],
    threshold: 2,
    fallbackHandler: FALLBACK,
    fallbackHandlerCodeHash: keccak256(FALLBACK_CODE),
    guard: zeroAddress,
    hasModules: false,
    modules: [],
    ownersAreEoas: true,
    ...overrides,
  };
}

function setupToL2(l2Singleton: Address = L2_SINGLETON): Hex {
  return encodeFunctionData({
    abi: SAFE_TO_L2_SETUP_ABI,
    functionName: "setupToL2",
    args: [l2Singleton],
  });
}

describe("Safe creation policy validation", () => {
  it("accepts only an initializer for the exact live policy", () => {
    expect(
      validateSafeCreationForCurrentPolicy(creation(), currentSafe()),
    ).toEqual({
      valid: true,
      owners: [OWNER_A, OWNER_B],
      threshold: 2,
      fallbackHandler: FALLBACK,
    });
    for (const changed of [
      { owners: [OWNER_A], threshold: 1n },
      { owners: [OWNER_A, OTHER] },
      { threshold: 1n },
      { fallbackHandler: OTHER },
    ]) {
      expect(
        validateSafeCreationForCurrentPolicy(
          creation({ initializer: initializer(changed) }),
          currentSafe(),
        ),
      ).toEqual({ valid: false, reason: "initializer-policy-mismatch" });
    }
  });

  it("refuses setup hooks, payments, and a live Safe that is not plain", () => {
    for (const unsafe of [
      { to: OTHER, data: "0x1234" as Hex },
      { to: OTHER },
      { data: "0x1234" as Hex },
      { paymentToken: OTHER, payment: 1n },
      { paymentToken: OTHER },
      { payment: 1n },
      { paymentReceiver: OTHER },
    ]) {
      expect(
        validateSafeCreationForCurrentPolicy(
          creation({ initializer: initializer(unsafe) }),
          currentSafe(),
        ),
      ).toEqual({ valid: false, reason: "unsafe-initializer" });
    }
    for (const policy of [
      currentSafe({ guard: OTHER }),
      currentSafe({ hasModules: true }),
      currentSafe({ ownersAreEoas: false }),
      currentSafe({ proxyCodeHash: keccak256("0x6000") }),
      currentSafe({ version: "1.4.1" }),
      currentSafe({ fallbackHandlerCodeHash: null }),
      currentSafe({ fallbackHandler: zeroAddress }),
    ]) {
      expect(validateSafeCreationForCurrentPolicy(creation(), policy)).toEqual({
        valid: false,
        reason: "unsafe-current-policy",
      });
    }
  });

  it("refuses malformed, noncanonical and unrecognized creations", () => {
    for (const initializerBytes of [
      "0x1234",
      `${initializer()}00`,
      initializer({ owners: [OWNER_A, OWNER_A] }),
      initializer({ owners: [], threshold: 0n }),
      initializer({ threshold: 3n }),
      initializer({ threshold: 0n }),
      encodeFunctionData({
        abi: SAFE_CREATE_ABI,
        functionName: "createProxyWithNonce",
        args: [SINGLETON, "0x", 1n],
      }),
    ] as Hex[]) {
      expect(
        validateSafeCreationForCurrentPolicy(
          creation({ initializer: initializerBytes }),
          currentSafe(),
        ),
      ).toEqual({ valid: false, reason: "malformed-initializer" });
    }
    for (const malformed of [
      { factory: "0x12" as Address },
      { singleton: "0x12" as Address },
      { initializer: "0x123" as Hex },
      { saltNonce: -1n },
      { saltNonce: 1n << 256n },
      { saltNonce: 1 as unknown as bigint },
    ]) {
      expect(
        validateSafeCreationForCurrentPolicy(
          creation(malformed),
          currentSafe(),
        ),
      ).toEqual({ valid: false, reason: "malformed-creation" });
    }
    expect(
      validateSafeCreationForCurrentPolicy(
        null as unknown as SafeCreation,
        currentSafe(),
      ),
    ).toEqual({ valid: false, reason: "malformed-creation" });
    for (const unrecognized of [
      { factory: OTHER },
      { factory: L1_FACTORY },
      { singleton: OTHER },
    ]) {
      expect(
        validateSafeCreationForCurrentPolicy(
          creation(unrecognized),
          currentSafe(),
        ),
      ).toEqual({ valid: false, reason: "unrecognized-deployment" });
    }
  });

  it("accepts the SafeToL2Setup initializer the Safe interface deploys on an L2", () => {
    const l2Safe = currentSafe({
      singleton: L2_SINGLETON,
      singletonCodeHash: keccak256(L2_SINGLETON_CODE),
      version: "1.4.1",
    });
    const l2Creation = (
      data = setupToL2(),
      overrides: Parameters<typeof initializer>[0] = {},
    ) =>
      creation({
        factory: L1_FACTORY,
        singleton: L1_SINGLETON,
        initializer: initializer({
          to: SAFE_TO_L2_SETUP_ADDRESS,
          data,
          paymentReceiver: SAFE_CANONICAL_PAYMENT_RECEIVER,
          ...overrides,
        }),
      });
    expect(
      validateSafeCreationForCurrentPolicy(l2Creation(), l2Safe),
    ).toMatchObject({
      valid: true,
    });
    for (const data of [
      setupToL2(OTHER),
      setupToL2(L1_SINGLETON),
      "0x" as Hex,
      `${setupToL2()}00` as Hex,
      `0xdeadbeef${setupToL2().slice(10)}` as Hex,
    ]) {
      expect(
        validateSafeCreationForCurrentPolicy(l2Creation(data), l2Safe),
      ).toEqual({
        valid: false,
        reason: "unsafe-initializer",
      });
    }
    expect(
      validateSafeCreationForCurrentPolicy(
        l2Creation(setupToL2(), { to: OTHER }),
        l2Safe,
      ),
    ).toEqual({ valid: false, reason: "unsafe-initializer" });
    expect(
      validateSafeCreationForCurrentPolicy(
        l2Creation(setupToL2(), { payment: 1n }),
        l2Safe,
      ),
    ).toEqual({ valid: false, reason: "unsafe-initializer" });
    // A singleton outside the creation's own release.
    expect(
      validateSafeCreationForCurrentPolicy(l2Creation(), currentSafe()),
    ).toEqual({
      valid: false,
      reason: "initializer-policy-mismatch",
    });
    // A SafeToL2Setup hook on a release without an L2 pair is never exact.
    expect(
      validateSafeCreationForCurrentPolicy(
        creation({
          initializer: initializer({
            to: SAFE_TO_L2_SETUP_ADDRESS,
            data: setupToL2(),
          }),
        }),
        currentSafe(),
      ),
    ).toEqual({ valid: false, reason: "unsafe-initializer" });
    expect(isDeployableSafeAuthority(l2Safe)).toBe(true);
  });

  it("builds the exact createProxyWithNonce call, and only for a recognized release", () => {
    const call = buildSafeProxyFactoryCall(creation());
    expect(call.target).toBe(FACTORY);
    expect(
      decodeFunctionData({ abi: SAFE_CREATE_ABI, data: call.data }),
    ).toEqual({
      functionName: "createProxyWithNonce",
      args: [SINGLETON, initializer(), 42n],
    });
    expect(() =>
      buildSafeProxyFactoryCall(creation({ factory: OTHER })),
    ).toThrow(
      `Factory ${OTHER} and singleton ${SINGLETON} are not one recognized Safe release.`,
    );
  });
});

type ChainOptions = {
  codes?: Record<string, unknown>;
  rejectCode?: boolean;
  simulation?: Hex | Error;
};

/** One chain's node: code by address, and the factory's raw simulation. */
function chain({ codes = {}, rejectCode = false, simulation }: ChainOptions) {
  const getCode = vi.fn(async ({ address }: { address: Address }) => {
    if (rejectCode) throw new Error("RPC unavailable");
    return codes[address.toLowerCase()];
  });
  const getStorageAt = vi.fn();
  const request = vi.fn(async ({ method }: { method: string }) => {
    if (method !== "eth_call") throw new Error(`Unexpected ${method}`);
    if (simulation instanceof Error) throw simulation;
    return simulation;
  });
  return { getCode, getStorageAt, request } as unknown as PublicClient & {
    getCode: typeof getCode;
    request: typeof request;
  };
}

/** The source chain, where SAFE is a plain Safe; its policy reads answer like the real contracts. */
function sourceChain({
  singleton = SINGLETON,
  singletonCode = SINGLETON_CODE,
  fallbackHandler = FALLBACK,
  extraCodes = {},
}: {
  singleton?: Address;
  singletonCode?: Hex;
  fallbackHandler?: Address;
  extraCodes?: Record<string, unknown>;
} = {}) {
  const version = singleton === SINGLETON ? "1.3.0" : "1.4.1";
  const codes: Record<string, unknown> = {
    [SAFE.toLowerCase()]: PROXY_RUNTIME,
    [singleton.toLowerCase()]: singletonCode,
    [FALLBACK.toLowerCase()]: FALLBACK_CODE,
    [FACTORY.toLowerCase()]: FACTORY_CODE,
    [L1_FACTORY.toLowerCase()]: FACTORY_CODE,
    [L1_SINGLETON.toLowerCase()]: SINGLETON_CODE,
    ...extraCodes,
  };
  const getCode = vi.fn(
    async ({ address }: { address: Address }) => codes[address.toLowerCase()],
  );
  const getStorageAt = vi.fn(async ({ slot }: { slot: Hex }) =>
    padHex(
      slot === GUARD_SLOT
        ? zeroAddress
        : slot === FALLBACK_SLOT
          ? fallbackHandler
          : singleton,
      {
        size: 32,
      },
    ),
  );
  const request = vi.fn(async ({ params }: { params: [{ data: Hex }] }) => {
    const { functionName } = decodeFunctionData({
      abi: READS,
      data: params[0].data,
    });
    const results = {
      masterCopy: singleton,
      VERSION: version,
      getThreshold: 2n,
      getOwners: [OWNER_A, OWNER_B],
      getModulesPaginated: [[], "0x0000000000000000000000000000000000000001"],
    } as const;
    return encodeFunctionResult({
      abi: READS,
      functionName,
      result: results[functionName] as never,
    });
  });
  return { getCode, getStorageAt, request } as unknown as PublicClient;
}

/** A destination where SAFE is free and the canonical contracts are deployed. */
function destination(
  overrides: ChainOptions & { extraCodes?: Record<string, unknown> } = {},
) {
  return chain({
    simulation: padHex(SAFE, { size: 32 }),
    ...overrides,
    codes: {
      [FACTORY.toLowerCase()]: FACTORY_CODE,
      [SINGLETON.toLowerCase()]: SINGLETON_CODE,
      [FALLBACK.toLowerCase()]: FALLBACK_CODE,
      [L1_FACTORY.toLowerCase()]: FACTORY_CODE,
      [L1_SINGLETON.toLowerCase()]: SINGLETON_CODE,
      [SAFE_TO_L2_SETUP_ADDRESS.toLowerCase()]: SETUP_LIBRARY_CODE,
      ...overrides.extraCodes,
      ...overrides.codes,
    },
  });
}

const prepare = (
  destinationClient: PublicClient,
  sourceClient: PublicClient = sourceChain(),
  safeCreation: SafeCreation = creation(),
) =>
  prepareSafeSameAddressDeployment({
    sourceClient,
    destinationClient,
    creation: safeCreation,
    safe: SAFE,
    from: SENDER,
  });

describe("same-address Safe deployment", () => {
  it("simulates the exact factory call and requires the Safe's own address", async () => {
    const client = destination();
    const result = await prepare(client);
    expect(result).toMatchObject({
      valid: true,
      call: {
        target: FACTORY,
        data: buildSafeProxyFactoryCall(creation()).data,
      },
      source: { kind: "safe", owners: [OWNER_A, OWNER_B] },
    });
    expect(client.request).toHaveBeenCalledWith({
      method: "eth_call",
      params: [
        expect.objectContaining({
          from: SENDER,
          to: FACTORY,
          data: buildSafeProxyFactoryCall(creation()).data,
          gas: "0x2dc6c0",
        }),
        "latest",
      ],
    });
    await expect(
      prepare(destination({ simulation: padHex(OTHER, { size: 32 }) })),
    ).resolves.toEqual({ valid: false, reason: "unexpected-address" });
    await expect(
      prepare(
        destination({
          simulation: `0x${"ff".repeat(12)}${SAFE.slice(2)}` as Hex,
        }),
      ),
    ).resolves.toEqual({ valid: false, reason: "unexpected-address" });
    await expect(
      prepare(destination({ simulation: new Error("execution reverted") })),
    ).resolves.toEqual({ valid: false, reason: "simulation-failed" });
    await expect(prepare(destination({ simulation: "0x" }))).resolves.toEqual({
      valid: false,
      reason: "unexpected-address",
    });
  });

  it("refuses an occupied address, a delegated EOA there included", async () => {
    for (const code of [PROXY_RUNTIME, DELEGATED_EOA_CODE, "0x6000"]) {
      const client = destination({ codes: { [SAFE.toLowerCase()]: code } });
      await expect(prepare(client)).resolves.toEqual({
        valid: false,
        reason: "address-occupied",
      });
      expect(client.request).not.toHaveBeenCalled();
    }
  });

  it("requires every owner to be an EOA there, an exact EIP-7702 designator included", async () => {
    await expect(
      prepare(
        destination({ codes: { [OWNER_A.toLowerCase()]: DELEGATED_EOA_CODE } }),
      ),
    ).resolves.toMatchObject({ valid: true });
    for (const code of [PREFIXED_CONTRACT_CODE, "0x6000"]) {
      await expect(
        prepare(destination({ codes: { [OWNER_A.toLowerCase()]: code } })),
      ).resolves.toEqual({ valid: false, reason: "contract-owner" });
    }
  });

  it("requires the source chain's factory and singleton code, and the Safe's own singleton runtime", async () => {
    await expect(
      prepare(destination({ codes: { [FACTORY.toLowerCase()]: undefined } })),
    ).resolves.toEqual({ valid: false, reason: "factory-unavailable" });
    await expect(
      prepare(destination({ codes: { [FACTORY.toLowerCase()]: "0x6009" } })),
    ).resolves.toEqual({ valid: false, reason: "factory-mismatch" });
    await expect(
      prepare(destination({ codes: { [SINGLETON.toLowerCase()]: "0x" } })),
    ).resolves.toEqual({ valid: false, reason: "singleton-unavailable" });
    await expect(
      prepare(destination({ codes: { [SINGLETON.toLowerCase()]: "0x6009" } })),
    ).resolves.toEqual({ valid: false, reason: "singleton-mismatch" });
    // The source chain answers the singleton's code differently after the
    // identity read: same code on both chains now, but not the Safe's runtime.
    const drifting = sourceChain();
    const read = drifting.getCode as unknown as ReturnType<typeof vi.fn>;
    const original = read.getMockImplementation()!;
    let singletonReads = 0;
    read.mockImplementation(async (args: { address: Address }) =>
      args.address.toLowerCase() === SINGLETON.toLowerCase() &&
      ++singletonReads > 1
        ? "0x6009"
        : original(args),
    );
    await expect(
      prepare(
        destination({ codes: { [SINGLETON.toLowerCase()]: "0x6009" } }),
        drifting,
      ),
    ).resolves.toEqual({ valid: false, reason: "singleton-mismatch" });
  });

  it("requires the fallback handler's exact contract code, never a delegated EOA", async () => {
    await expect(
      prepare(destination({ codes: { [FALLBACK.toLowerCase()]: undefined } })),
    ).resolves.toEqual({
      valid: false,
      reason: "fallback-handler-unavailable",
    });
    const delegated = destination({
      codes: { [FALLBACK.toLowerCase()]: DELEGATED_EOA_CODE },
    });
    await expect(prepare(delegated)).resolves.toEqual({
      valid: false,
      reason: "delegated-fallback-handler",
    });
    expect(delegated.request).not.toHaveBeenCalled();
    await expect(
      prepare(destination({ codes: { [FALLBACK.toLowerCase()]: "0x6009" } })),
    ).resolves.toEqual({ valid: false, reason: "fallback-handler-mismatch" });
    // No fallback handler at all reads no handler code.
    const noHandler = creation({
      initializer: initializer({ fallbackHandler: zeroAddress }),
    });
    await expect(
      prepare(
        destination(),
        sourceChain({ fallbackHandler: zeroAddress }),
        noHandler,
      ),
    ).resolves.toMatchObject({ valid: true });
  });

  it("requires the canonical SafeToL2Setup runtime when the creation delegatecalls it", async () => {
    const l2Creation = creation({
      factory: L1_FACTORY,
      singleton: L1_SINGLETON,
      initializer: initializer({
        to: SAFE_TO_L2_SETUP_ADDRESS,
        data: setupToL2(),
        paymentReceiver: SAFE_CANONICAL_PAYMENT_RECEIVER,
      }),
    });
    const l2Source = sourceChain({
      singleton: L2_SINGLETON,
      singletonCode: L2_SINGLETON_CODE,
    });
    // The creation names the Ethereum singleton, not the Safe's own SafeL2
    // one: only the source chain's code at that address can vouch for it.
    await expect(
      prepare(
        destination({ codes: { [L1_SINGLETON.toLowerCase()]: "0x6009" } }),
        l2Source,
        l2Creation,
      ),
    ).resolves.toEqual({ valid: false, reason: "singleton-mismatch" });
    expect(keccak256(SETUP_LIBRARY_CODE)).not.toBe(SAFE_TO_L2_SETUP_CODE_HASH);
    await expect(prepare(destination(), l2Source, l2Creation)).resolves.toEqual(
      {
        valid: false,
        reason: "setup-library-mismatch",
      },
    );
    await expect(
      prepare(
        destination({
          codes: { [SAFE_TO_L2_SETUP_ADDRESS.toLowerCase()]: undefined },
        }),
        l2Source,
        l2Creation,
      ),
    ).resolves.toEqual({ valid: false, reason: "setup-library-mismatch" });
  });

  it("refuses an unreadable or malformed chain, a source that is not a plain Safe, and a stale creation", async () => {
    await expect(prepare(destination({ rejectCode: true }))).resolves.toEqual({
      valid: false,
      reason: "rpc-error",
    });
    const malformedFactory = destination({
      codes: { [FACTORY.toLowerCase()]: "not-hex" },
    });
    await expect(prepare(malformedFactory)).resolves.toEqual({
      valid: false,
      reason: "rpc-error",
    });
    // The destination's identity read succeeds, then its code reads fail.
    const flaky = destination();
    flaky.getCode.mockImplementation(
      async ({ address }: { address: Address }) => {
        if (address.toLowerCase() === SAFE.toLowerCase()) return undefined;
        throw new Error("RPC unavailable");
      },
    );
    await expect(prepare(flaky)).resolves.toEqual({
      valid: false,
      reason: "rpc-error",
    });
    await expect(prepare(destination(), chain({}))).resolves.toEqual({
      valid: false,
      reason: "not-a-safe",
    });
    await expect(
      prepare(
        destination(),
        sourceChain(),
        creation({ initializer: initializer({ threshold: 1n }) }),
      ),
    ).resolves.toEqual({ valid: false, reason: "initializer-policy-mismatch" });
    await expect(
      prepareSafeSameAddressDeployment({
        sourceClient: sourceChain(),
        destinationClient: destination(),
        creation: creation(),
        safe: SAFE,
        from: "0x12" as Address,
      }),
    ).rejects.toThrow("Invalid deployment sender: 0x12.");
  });
});

describe("MultiSend", () => {
  const REGISTRY = "0x72F55a54CD53410a5Ff175508a5A384227081788" as Address;
  const ROUTER_REGISTRY =
    "0xe0427F250fdb0379c8E98e884Ee4570521208CbC" as Address;
  const calls = [
    { to: REGISTRY, data: "0x779b0290aa" as Hex, value: 0n },
    { to: ROUTER_REGISTRY, data: "0xf3e37d01bb" as Hex, value: 7n },
    { to: REGISTRY, data: "0x" as Hex, value: 0n },
  ];

  it("packs op ‖ to ‖ value ‖ length ‖ data behind multiSend(bytes), and round-trips", () => {
    expect(MULTI_SEND_CALL_ONLY).toBe(
      "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D",
    );
    expect(MULTI_SEND_ABI).toEqual(
      parseAbi(["function multiSend(bytes transactions) payable"]),
    );
    const encoded = encodeMultiSend(calls);
    expect(encoded.slice(0, 10)).toBe(
      toFunctionSelector("function multiSend(bytes)"),
    );
    let packed = packMultiSend(calls).slice(2);
    for (const call of calls) {
      const length = (call.data.length - 2) / 2;
      expect(packed.slice(0, 2)).toBe("00");
      expect(packed.slice(2, 42)).toBe(call.to.slice(2).toLowerCase());
      expect(BigInt(`0x${packed.slice(42, 106)}`)).toBe(call.value);
      expect(BigInt(`0x${packed.slice(106, 170)}`)).toBe(BigInt(length));
      expect(packed.slice(170, 170 + length * 2)).toBe(call.data.slice(2));
      packed = packed.slice(170 + length * 2);
    }
    expect(packed).toBe("");
    expect(decodeMultiSend(encoded)).toEqual(calls);
    expect(encodeMultiSend([{ to: REGISTRY, data: "0x01" }])).toBe(
      encodeMultiSend([{ to: REGISTRY, data: "0x01", value: 0n }]),
    );
  });

  it("decodes only a canonical batch of whole CALL entries", () => {
    const packed = packMultiSend(calls.slice(0, 1));
    const wrap = (bytes: Hex) =>
      encodeFunctionData({
        abi: MULTI_SEND_ABI,
        functionName: "multiSend",
        args: [bytes],
      });
    for (const data of [
      wrap(`0x01${packed.slice(4)}`),
      wrap(packed.slice(0, -8) as Hex),
      wrap(`${packed}00`),
      wrap("0x"),
      `${encodeMultiSend(calls)}00`,
      "0x779b0290",
      `0x8d80ff0a${"00".repeat(64)}`,
      "0x8d80ff0",
      null,
      42,
    ]) {
      expect(decodeMultiSend(data)).toBeNull();
    }
  });

  it("refuses to pack an empty batch or a call it cannot encode", () => {
    expect(() => encodeMultiSend([])).toThrow(
      "A batch needs at least one call.",
    );
    for (const bad of [
      { to: "0x12" as Address, data: "0x" as Hex },
      { to: REGISTRY, data: "0x1" as Hex },
      { to: REGISTRY, data: "0x" as Hex, value: -1n },
    ]) {
      expect(() => packMultiSend([calls[0], bad])).toThrow(
        "Batch call 2 is not a valid call.",
      );
    }
  });

  it("reads the calls of a queued Safe batch only from a DELEGATECALL to MultiSendCallOnly", () => {
    const data = encodeMultiSend(calls);
    expect(
      multiSendCallsOf({ to: MULTI_SEND_CALL_ONLY, data, operation: 1 }),
    ).toEqual(calls);
    expect(
      multiSendCallsOf({
        to: getAddress(MULTI_SEND_CALL_ONLY.toLowerCase()),
        data,
        operation: "1",
      }),
    ).toEqual(calls);
    for (const tx of [
      { to: MULTI_SEND_CALL_ONLY, data, operation: 0 },
      { to: REGISTRY, data, operation: 1 },
      { to: "0x12", data, operation: 1 },
      { to: MULTI_SEND_CALL_ONLY, data: "0x", operation: 1 },
    ]) {
      expect(multiSendCallsOf(tx)).toBeNull();
    }
  });
});
