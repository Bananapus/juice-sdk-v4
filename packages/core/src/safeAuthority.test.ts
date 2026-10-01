import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import {
  createPublicClient,
  decodeFunctionData,
  encodeAbiParameters,
  encodeFunctionResult,
  getAddress,
  http,
  keccak256,
  padHex,
  parseAbi,
  toHex,
  zeroAddress,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { mainnet } from "viem/chains";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import fixture from "../../../test/fixtures/safe-1.4.1.json" with { type: "json" };
import creations from "../../../test/fixtures/safe-creations.json" with { type: "json" };
import {
  MAX_SAFE_OWNERS,
  RECOGNIZED_SAFE_RELEASES,
  SAFE_L1_L2_SINGLETON_PAIRS,
  authorityIdentitiesMatch,
  isDeployableSafeAuthority,
  isEip7702DelegatedEoaRuntime,
  isRecognizedSafeDeployment,
  readAuthorityIdentity,
  readBoundedSafeApprovedHash,
  readBoundedSafeNonce,
  readCrossChainHandleAuthority,
  readMatchingAuthorityIdentities,
  safeSingletonsAreEquivalent,
  type AuthorityIdentity,
  type SafeAuthorityIdentity,
  proveSafeCreation,
  type SafeCreation,
} from "./safe.js";

const READS = parseAbi([
  "function masterCopy() view returns (address)",
  "function VERSION() view returns (string)",
  "function getThreshold() view returns (uint256)",
  "function getOwners() view returns (address[])",
  "function getModulesPaginated(address start,uint256 pageSize) view returns (address[],address)",
  "function nonce() view returns (uint256)",
  "function approvedHashes(address owner,bytes32 hash) view returns (uint256)",
]);

const AUTHORITY = "0x1111111111111111111111111111111111111111" as Address;
/** A real Ethereum Safe 1.3.0 and its creation record, which re-derives to its address. */
const creationOf = (
  record: (typeof creations)["safe130Inert"],
): SafeCreation => ({
  factory: record.factory as Address,
  singleton: record.singleton as Address,
  initializer: record.initializer as Hex,
  saltNonce: BigInt(record.saltNonce),
});
const PROVEN = {
  address: creations.safe130Inert.address as Address,
  creation: creationOf(creations.safe130Inert),
};
const ALICE = "0x2222222222222222222222222222222222222222" as Address;
const BOB = "0x3333333333333333333333333333333333333333" as Address;
const FALLBACK = getAddress("0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4");
const OTHER_FALLBACK = "0x5555555555555555555555555555555555555555" as Address;
const MODULE = "0x6666666666666666666666666666666666666666" as Address;
const DELEGATION = getAddress("0x63c0c19a282a1b52b07dd5a65b58948a07dae32b");
const EIP_7702_CODE = `0xef0100${DELEGATION.slice(2)}` as Hex;
const SINGLETON = RECOGNIZED_SAFE_RELEASES[0].singletons[0];
const EIP155_L2_SINGLETON = RECOGNIZED_SAFE_RELEASES[0].singletons[3];
const OTHER_SINGLETON = RECOGNIZED_SAFE_RELEASES[1].singletons[0];
const SENTINEL = "0x0000000000000000000000000000000000000001" as Address;
const SINGLETON_SLOT = `0x${"0".repeat(64)}` as Hex;
const GUARD_SLOT =
  "0x4a204f620c8c5ccdca3fd54d003badd85ba500436a431f0cbda4f558c93c34c8" as Hex;
const FALLBACK_SLOT =
  "0x6c9a6c4a39284e37ed1cf53d337577d14212a4870fb976a4366c693b939918d5" as Hex;
const SINGLETON_CODE = "0x60006000" as Hex;
const FALLBACK_CODE = "0x60016000" as Hex;
// The runtime the canonical Safe 1.3.0 factory deploys: a small fake contract
// must not pass the recognizer in these tests either.
const SAFE_1_3_PROXY =
  "0x608060405273ffffffffffffffffffffffffffffffffffffffff600054167fa619486e0000000000000000000000000000000000000000000000000000000060003514156050578060005260206000f35b3660008037600080366000845af43d6000803e60008114156070573d6000fd5b3d6000f3fea2646970667358221220d1429297349653a4918076d650332de1a1068c5f3e07c5c82360c277770b955264736f6c63430007060033" as Hex;
const SAFE_1_4_PROXY = fixture.contracts.proxy.runtime as Hex;

const word = (address: Address) => padHex(address, { size: 32 });

type SafeClientOptions = {
  safe?: Address;
  owners?: Address[];
  threshold?: bigint;
  modules?: Address[];
  moduleNext?: Address;
  singleton?: Address;
  masterCopy?: Address;
  singletonCode?: Hex;
  version?: string;
  guard?: Address;
  fallbackHandler?: Address;
  fallbackHandlerCode?: unknown;
  proxyCode?: unknown;
  ownerCodes?: Readonly<Record<string, unknown>>;
  responses?: Partial<Record<string, unknown>>;
  rejectRead?: boolean;
  rejectCodeFor?: Address;
};

/** A node holding one Safe at `safe` (AUTHORITY by default); every read answers like the real contracts. */
function safeClient({
  safe = AUTHORITY,
  owners = [ALICE, BOB],
  threshold = 2n,
  modules = [],
  moduleNext = SENTINEL,
  singleton = SINGLETON,
  masterCopy = singleton,
  singletonCode = SINGLETON_CODE,
  version = RECOGNIZED_SAFE_RELEASES.find((release) =>
    release.singletons.some(
      (candidate) => candidate.toLowerCase() === singleton.toLowerCase(),
    ),
  )?.version ?? "1.3.0",
  guard = zeroAddress,
  fallbackHandler = FALLBACK,
  proxyCode = SAFE_1_3_PROXY,
  ownerCodes = {},
  responses = {},
  rejectRead = false,
  rejectCodeFor,
  ...options
}: SafeClientOptions = {}) {
  // Present but undefined means no code: a default would hide that case.
  const fallbackHandlerCode =
    "fallbackHandlerCode" in options
      ? options.fallbackHandlerCode
      : FALLBACK_CODE;
  const getCode = vi.fn(async ({ address }: { address: Address }) => {
    const key = address.toLowerCase();
    if (rejectCodeFor && key === rejectCodeFor.toLowerCase()) {
      throw new Error("RPC unavailable");
    }
    if (key === safe.toLowerCase()) return proxyCode;
    if (key === singleton.toLowerCase()) return singletonCode;
    if (
      key === fallbackHandler.toLowerCase() &&
      fallbackHandler !== zeroAddress
    ) {
      return fallbackHandlerCode;
    }
    return ownerCodes[key];
  });
  const getStorageAt = vi.fn(async ({ slot }: { slot: Hex }) => {
    if (rejectRead) throw new Error("RPC unavailable");
    if (slot === SINGLETON_SLOT) return word(singleton);
    if (slot === GUARD_SLOT) return word(guard);
    if (slot === FALLBACK_SLOT) return word(fallbackHandler);
    throw new Error(`Unexpected slot ${slot}`);
  });
  const request = vi.fn(
    async ({ method, params }: { method: string; params: unknown[] }) => {
      if (rejectRead) throw new Error("RPC unavailable");
      if (method !== "eth_call") throw new Error(`Unexpected ${method}`);
      const { functionName } = decodeFunctionData({
        abi: READS,
        data: (params[0] as { data: Hex }).data,
      });
      if (functionName in responses) return responses[functionName];
      switch (functionName) {
        case "masterCopy":
          return encodeFunctionResult({
            abi: READS,
            functionName,
            result: masterCopy,
          });
        case "VERSION":
          return encodeFunctionResult({
            abi: READS,
            functionName,
            result: version,
          });
        case "getThreshold":
          return encodeFunctionResult({
            abi: READS,
            functionName,
            result: threshold,
          });
        case "getOwners":
          return encodeFunctionResult({
            abi: READS,
            functionName,
            result: owners,
          });
        case "getModulesPaginated":
          return encodeFunctionResult({
            abi: READS,
            functionName,
            result: [modules, moduleNext],
          });
        case "nonce":
          return encodeFunctionResult({ abi: READS, functionName, result: 7n });
        default:
          throw new Error(`Unexpected Safe read ${functionName}`);
      }
    },
  );
  return {
    getCode,
    getStorageAt,
    request,
  } as unknown as PublicClient & {
    getCode: typeof getCode;
    getStorageAt: typeof getStorageAt;
    request: typeof request;
  };
}

function codeClient(code: unknown) {
  return {
    getCode: vi.fn(async () => code),
    getStorageAt: vi.fn(),
    request: vi.fn(),
  } as unknown as PublicClient & {
    getStorageAt: ReturnType<typeof vi.fn>;
    request: ReturnType<typeof vi.fn>;
  };
}

function safeIdentity(
  overrides: Partial<SafeAuthorityIdentity> = {},
): SafeAuthorityIdentity {
  return {
    kind: "safe",
    owners: [ALICE, BOB],
    threshold: 2,
    ownersAreEoas: true,
    hasModules: false,
    modules: [],
    proxyCodeHash: keccak256(SAFE_1_3_PROXY),
    singleton: SINGLETON,
    singletonCodeHash: keccak256(SINGLETON_CODE),
    version: "1.3.0",
    guard: zeroAddress,
    fallbackHandler: FALLBACK,
    fallbackHandlerCodeHash: keccak256(FALLBACK_CODE),
    ...overrides,
  };
}

describe("authority identity", () => {
  it("reads the canonical proxy, implementation, guard, fallback and owner policy", async () => {
    const client = safeClient();
    await expect(readAuthorityIdentity(client, AUTHORITY)).resolves.toEqual(
      safeIdentity(),
    );
    // Nothing delegates through the proxy before slot zero names a known
    // singleton; the first call into it is masterCopy().
    const reads = client.request.mock.calls.map(
      ([{ params }]) =>
        decodeFunctionData({
          abi: READS,
          data: (params[0] as { data: Hex }).data,
        }).functionName,
    );
    expect(reads[0]).toBe("masterCopy");
    expect(client.request).toHaveBeenCalledWith({
      method: "eth_call",
      params: [
        expect.objectContaining({ to: AUTHORITY, gas: toHex(400_000n) }),
        "latest",
      ],
    });
  });

  it("recognizes a Safe 1.4.1 proxy and an EIP-155 Safe 1.3.0 singleton", async () => {
    await expect(
      readAuthorityIdentity(
        safeClient({ proxyCode: SAFE_1_4_PROXY, singleton: OTHER_SINGLETON }),
        AUTHORITY,
      ),
    ).resolves.toMatchObject({ kind: "safe", version: "1.4.1" });
    await expect(
      readAuthorityIdentity(
        safeClient({ singleton: EIP155_L2_SINGLETON }),
        AUTHORITY,
      ),
    ).resolves.toMatchObject({
      kind: "safe",
      singleton: EIP155_L2_SINGLETON,
      version: "1.3.0",
    });
  });

  it("pins every code, storage and call read to one block", async () => {
    const client = safeClient({ ownerCodes: {} });
    await readAuthorityIdentity(client, AUTHORITY, { blockNumber: 99n });
    for (const [args] of client.getCode.mock.calls) {
      expect(args).toMatchObject({ blockNumber: 99n });
    }
    for (const [args] of client.getStorageAt.mock.calls) {
      expect(args).toMatchObject({ blockNumber: 99n });
    }
    for (const [{ params }] of client.request.mock.calls) {
      expect(params[1]).toBe("0x63");
    }
    // masterCopy, getThreshold, getOwners, getModulesPaginated, VERSION.
    expect(client.request).toHaveBeenCalledTimes(5);
  });

  it("bounds owner reads before any per-owner code read", async () => {
    const owners = Array.from({ length: MAX_SAFE_OWNERS + 1 }, (_, index) =>
      getAddress(`0x${(index + 10).toString(16).padStart(40, "0")}`),
    );
    const atLimit = safeClient({
      owners: owners.slice(0, MAX_SAFE_OWNERS),
      threshold: 1n,
    });
    const identity = await readAuthorityIdentity(atLimit, AUTHORITY);
    expect(identity?.kind === "safe" && identity.owners).toHaveLength(
      MAX_SAFE_OWNERS,
    );

    const overLimit = safeClient({ owners, threshold: 1n });
    await expect(readAuthorityIdentity(overLimit, AUTHORITY)).resolves.toEqual({
      kind: "contract",
    });
    // The proxy and its singleton only: no fan-out over 51 owners.
    expect(overLimit.getCode).toHaveBeenCalledTimes(2);
  });

  it("refuses owner, module and version answers that are not exactly canonical", async () => {
    const owners = encodeFunctionResult({
      abi: READS,
      functionName: "getOwners",
      result: [ALICE, BOB],
    });
    // A clean word, then the same address with dirty upper bytes.
    const dirty = `${owners.slice(0, -64)}ff${owners.slice(-62)}` as Hex;
    const modules = encodeFunctionResult({
      abi: READS,
      functionName: "getModulesPaginated",
      result: [[MODULE], SENTINEL],
    });
    for (const responses of [
      { getOwners: "0x1234" },
      { getOwners: dirty },
      { getOwners: `${owners}00` },
      {
        getOwners: encodeFunctionResult({
          abi: READS,
          functionName: "getOwners",
          result: [],
        }),
      },
      {
        getOwners: encodeFunctionResult({
          abi: READS,
          functionName: "getOwners",
          result: [ALICE, ALICE],
        }),
      },
      {
        getOwners: encodeFunctionResult({
          abi: READS,
          functionName: "getOwners",
          result: [ALICE, zeroAddress],
        }),
      },
      { getOwners: `0x${"0".repeat(62)}40${owners.slice(66)}` },
      { getModulesPaginated: `${modules}00` },
      { getModulesPaginated: `0x${"0".repeat(62)}20${modules.slice(66)}` },
      {
        getModulesPaginated: encodeFunctionResult({
          abi: READS,
          functionName: "getModulesPaginated",
          result: [[zeroAddress], SENTINEL],
        }),
      },
      {
        getModulesPaginated: encodeFunctionResult({
          abi: READS,
          functionName: "getModulesPaginated",
          result: [Array.from({ length: 65 }, () => MODULE), SENTINEL],
        }),
      },
      {
        getModulesPaginated: `0x${"0".repeat(62)}40${"ff".repeat(12)}${SENTINEL.slice(2)}${"0".repeat(64)}`,
      },
      { getModulesPaginated: "0x" },
      { VERSION: `${encodeAbiParameters([{ type: "string" }], ["1.3.0"])}00` },
      { VERSION: "0x1234" },
      {
        VERSION: `${encodeAbiParameters([{ type: "string" }], ["1.3.0"]).slice(0, -2)}ff`,
      },
      { VERSION: `0x${"0".repeat(62)}20${"0".repeat(62)}05${"ff".repeat(32)}` },
      { getThreshold: "0x01" },
      { masterCopy: `0x${"ff".repeat(12)}${SINGLETON.slice(2)}` },
      { masterCopy: "0x" },
    ] as Partial<Record<string, unknown>>[]) {
      await expect(
        readAuthorityIdentity(safeClient({ responses }), AUTHORITY),
      ).resolves.toEqual({ kind: "contract" });
    }
  });

  it("refuses a policy or implementation outside the recognized release", async () => {
    for (const options of [
      { threshold: 3n },
      { threshold: 0n },
      { version: "9.9.9" },
      { version: "1.4.1" },
      { masterCopy: OTHER_SINGLETON },
      { singletonCode: "0x" as Hex },
      { singletonCode: "0X60006000" as Hex },
      { guard: `0x${"ff".repeat(20)}` as Address },
    ] as SafeClientOptions[]) {
      const identity = await readAuthorityIdentity(
        safeClient(options),
        AUTHORITY,
      );
      if ("guard" in options) {
        // A guard is policy, not a malformed Safe: it reads as a Safe, but
        // never as a deployable or matching one.
        expect(identity).toMatchObject({
          kind: "safe",
          guard: getAddress(options.guard!),
        });
        expect(isDeployableSafeAuthority(identity!)).toBe(false);
      } else {
        expect(identity).toEqual({ kind: "contract" });
      }
    }
    // A guard or fallback slot whose upper bytes are not zero is malformed.
    for (const dirtySlot of [GUARD_SLOT, FALLBACK_SLOT]) {
      const client = safeClient();
      client.getStorageAt.mockImplementation(async ({ slot }: { slot: Hex }) =>
        slot === SINGLETON_SLOT
          ? word(SINGLETON)
          : slot === dirtySlot
            ? (`0x${"ff".repeat(12)}${FALLBACK.slice(2)}` as Hex)
            : slot === GUARD_SLOT
              ? word(zeroAddress)
              : word(FALLBACK),
      );
      await expect(readAuthorityIdentity(client, AUTHORITY)).resolves.toEqual({
        kind: "contract",
      });
    }
  });

  it("does not recognize a contract that only imitates the Safe owner API", async () => {
    await expect(
      readAuthorityIdentity(safeClient({ proxyCode: "0x1234" }), AUTHORITY),
    ).resolves.toEqual({ kind: "contract" });
    const untrusted = safeClient({ singleton: MODULE });
    await expect(readAuthorityIdentity(untrusted, AUTHORITY)).resolves.toEqual({
      kind: "contract",
    });
    // The claimed implementation is unknown, so nothing calls through it.
    expect(untrusted.request).not.toHaveBeenCalled();
  });

  it("classifies only the exact 23-byte EIP-7702 designator as a delegated EOA", async () => {
    await expect(
      readAuthorityIdentity(codeClient(EIP_7702_CODE), AUTHORITY),
    ).resolves.toEqual({ kind: "delegated-eoa", delegation: DELEGATION });
    await expect(
      readAuthorityIdentity(
        codeClient("0xEF0100aAbBcCdDeEfF0011223344556677889900112233"),
        AUTHORITY,
      ),
    ).resolves.toMatchObject({ kind: "delegated-eoa" });
    for (const code of [
      "0xef0100",
      `${EIP_7702_CODE}00`,
      `0xef0101${EIP_7702_CODE.slice(8)}`,
      `0x00${EIP_7702_CODE.slice(2)}`,
      `0xef0100${"11".repeat(19)}`,
      `0xef0100${"11".repeat(21)}`,
      `0xef0100${"zz".repeat(20)}`,
      `0Xef0100${DELEGATION.slice(2)}`,
      "0x6000",
      "0x600",
      null,
      42,
    ]) {
      const client = codeClient(code);
      await expect(readAuthorityIdentity(client, AUTHORITY)).resolves.toEqual({
        kind: "contract",
      });
      expect(client.getStorageAt).not.toHaveBeenCalled();
      expect(client.request).not.toHaveBeenCalled();
    }
    expect(isEip7702DelegatedEoaRuntime(EIP_7702_CODE)).toBe(true);
    expect(isEip7702DelegatedEoaRuntime(`${EIP_7702_CODE}00`)).toBe(false);
    for (const code of [undefined, "0x"]) {
      await expect(
        readAuthorityIdentity(codeClient(code), AUTHORITY),
      ).resolves.toEqual({ kind: "eoa" });
    }
  });

  it("counts exactly delegated owners as EOAs, and prefix lookalikes or malformed code as contracts", async () => {
    await expect(
      readAuthorityIdentity(
        safeClient({ ownerCodes: { [ALICE.toLowerCase()]: EIP_7702_CODE } }),
        AUTHORITY,
      ),
    ).resolves.toMatchObject({ kind: "safe", ownersAreEoas: true });
    for (const code of [`${EIP_7702_CODE}00`, "0x6002", "not-hex"]) {
      await expect(
        readAuthorityIdentity(
          safeClient({ ownerCodes: { [ALICE.toLowerCase()]: code } }),
          AUTHORITY,
        ),
      ).resolves.toMatchObject({ kind: "safe", ownersAreEoas: false });
    }
  });

  it("refuses a fallback handler that is a delegated EOA, missing or malformed", async () => {
    for (const fallbackHandlerCode of [
      EIP_7702_CODE,
      "0x",
      undefined,
      "0x6",
      "0X60016000",
    ]) {
      const client = safeClient({ fallbackHandlerCode });
      await expect(readAuthorityIdentity(client, AUTHORITY)).resolves.toEqual({
        kind: "contract",
      });
      // The designator's delegate is never followed.
      expect(client.getCode).not.toHaveBeenCalledWith(
        expect.objectContaining({ address: DELEGATION }),
      );
    }
    // A contract that merely starts with the designator stays contract code,
    // compared by its own hash.
    const [source, destination] = await Promise.all([
      readAuthorityIdentity(
        safeClient({ fallbackHandlerCode: `${EIP_7702_CODE}00` }),
        AUTHORITY,
      ),
      readAuthorityIdentity(
        safeClient({ fallbackHandlerCode: `${EIP_7702_CODE}01` }),
        AUTHORITY,
      ),
    ]);
    expect(source).toMatchObject({
      kind: "safe",
      fallbackHandlerCodeHash: keccak256(`${EIP_7702_CODE}00`),
    });
    expect(authorityIdentitiesMatch(source!, destination!)).toBe(false);
    // No fallback handler at all is a plain Safe with no handler code.
    await expect(
      readAuthorityIdentity(
        safeClient({ fallbackHandler: zeroAddress }),
        AUTHORITY,
      ),
    ).resolves.toMatchObject({
      kind: "safe",
      fallbackHandler: zeroAddress,
      fallbackHandlerCodeHash: null,
    });
  });

  it("snapshots one page of modules, and none when there are more", async () => {
    await expect(
      readAuthorityIdentity(safeClient({ modules: [MODULE] }), AUTHORITY),
    ).resolves.toMatchObject({ hasModules: true, modules: [MODULE] });
    await expect(
      readAuthorityIdentity(
        safeClient({ modules: [MODULE], moduleNext: MODULE }),
        AUTHORITY,
      ),
    ).resolves.toMatchObject({ hasModules: true, modules: null });
    // An empty first page that still points onward is not a module-free Safe.
    await expect(
      readAuthorityIdentity(
        safeClient({ modules: [], moduleNext: MODULE }),
        AUTHORITY,
      ),
    ).resolves.toMatchObject({ hasModules: true, modules: null });
  });

  it("treats every failed read as unknown, never as an EOA or a contract", async () => {
    await expect(
      readAuthorityIdentity(
        {
          getCode: vi.fn().mockRejectedValue(new Error("RPC unavailable")),
        } as unknown as PublicClient,
        AUTHORITY,
      ),
    ).resolves.toBeNull();
    await expect(
      readAuthorityIdentity(safeClient({ rejectRead: true }), AUTHORITY),
    ).resolves.toBeNull();
    for (const rejectCodeFor of [SINGLETON, ALICE, FALLBACK]) {
      await expect(
        readAuthorityIdentity(safeClient({ rejectCodeFor }), AUTHORITY),
      ).resolves.toBeNull();
    }
    const policy = safeClient();
    policy.request.mockRejectedValueOnce(new Error("RPC unavailable"));
    await expect(readAuthorityIdentity(policy, AUTHORITY)).resolves.toBeNull();
  });

  it("refuses an authority that is not an address", async () => {
    await expect(
      readAuthorityIdentity(safeClient(), "0x1234" as Address),
    ).rejects.toThrow("Invalid authority address: 0x1234.");
  });
});

describe("bounded Safe reads", () => {
  it("read the nonce and an approval through one raw, gas- and return-bounded call", async () => {
    const hash = `0x${"ab".repeat(32)}` as Hex;
    const request = vi.fn(async () =>
      encodeFunctionResult({ abi: READS, functionName: "nonce", result: 7n }),
    );
    const client = { request } as unknown as PublicClient;
    await expect(readBoundedSafeNonce(client, AUTHORITY)).resolves.toBe(7n);
    await expect(
      readBoundedSafeApprovedHash(client, AUTHORITY, ALICE, hash, {
        blockNumber: 5n,
      }),
    ).resolves.toBe(7n);
    expect(request).toHaveBeenNthCalledWith(1, {
      method: "eth_call",
      params: [
        { to: AUTHORITY, data: "0xaffed0e0", gas: toHex(100_000n) },
        "latest",
      ],
    });
    expect(request).toHaveBeenNthCalledWith(2, {
      method: "eth_call",
      params: [
        {
          to: AUTHORITY,
          data: expect.stringMatching(/^0x7d832974/),
          gas: toHex(100_000n),
        },
        "0x5",
      ],
    });
  });

  it("return null for anything but one word, and refuse bad arguments", async () => {
    for (const answer of ["0x", "0x01", `0x${"00".repeat(33)}`, 7, null]) {
      const client = {
        request: vi.fn(async () => answer),
      } as unknown as PublicClient;
      await expect(readBoundedSafeNonce(client, AUTHORITY)).resolves.toBeNull();
    }
    const client = { request: vi.fn() } as unknown as PublicClient;
    await expect(() => readBoundedSafeNonce(client, "0x12" as Address)).toThrow(
      "Invalid Safe address: 0x12.",
    );
    await expect(() =>
      readBoundedSafeApprovedHash(client, AUTHORITY, ALICE, "0x12"),
    ).toThrow("Invalid Safe transaction hash: 0x12.");
    await expect(() =>
      readBoundedSafeApprovedHash(
        client,
        AUTHORITY,
        "0x12" as Address,
        `0x${"ab".repeat(32)}`,
      ),
    ).toThrow("Invalid Safe owner: 0x12.");
  });
});

describe("authority matching across chains", () => {
  it("matches only EOAs (plain or delegated) or plain Safes with identical policy", () => {
    const eoa: AuthorityIdentity = { kind: "eoa" };
    const delegated: AuthorityIdentity = {
      kind: "delegated-eoa",
      delegation: DELEGATION,
    };
    const safe = safeIdentity();
    for (const [left, right] of [
      [eoa, eoa],
      [eoa, delegated],
      [delegated, eoa],
      [delegated, delegated],
    ]) {
      expect(authorityIdentitiesMatch(left, right)).toBe(true);
    }
    expect(
      authorityIdentitiesMatch(safe, safeIdentity({ owners: [BOB, ALICE] })),
    ).toBe(true);
    for (const other of [
      safeIdentity({ threshold: 1 }),
      safeIdentity({ hasModules: true }),
      safeIdentity({ ownersAreEoas: false }),
      safeIdentity({ guard: ALICE }),
      safeIdentity({ owners: [ALICE, MODULE] }),
      safeIdentity({ owners: [ALICE, ALICE] }),
      safeIdentity({ owners: [ALICE, BOB, MODULE] }),
      safeIdentity({ fallbackHandler: OTHER_FALLBACK }),
      safeIdentity({ fallbackHandlerCodeHash: keccak256("0x6004") }),
      safeIdentity({ proxyCodeHash: keccak256(SAFE_1_4_PROXY) }),
      safeIdentity({ singletonCodeHash: keccak256("0x6003") }),
      safeIdentity({ singleton: OTHER_SINGLETON, version: "1.4.1" }),
      safeIdentity({ version: "1.4.1" }),
      eoa,
      delegated,
      { kind: "contract" } as const,
    ]) {
      expect(authorityIdentitiesMatch(safe, other)).toBe(false);
      expect(authorityIdentitiesMatch(other, safe)).toBe(false);
    }
    expect(authorityIdentitiesMatch({ kind: "contract" }, eoa)).toBe(false);
    expect(
      authorityIdentitiesMatch({ kind: "contract" }, { kind: "contract" }),
    ).toBe(false);
  });

  it("reads both chains, and returns null rather than a mismatch when one cannot be read", async () => {
    await expect(
      readMatchingAuthorityIdentities({
        sourceClient: safeClient({ safe: PROVEN.address }),
        destinationClient: safeClient({
          safe: PROVEN.address,
          owners: [BOB, ALICE],
        }),
        authority: PROVEN.address,
        sourceBlockNumber: 1n,
        destinationBlockNumber: 2n,
        creation: PROVEN.creation,
      }),
    ).resolves.toMatchObject({ matches: true, creationUnproven: false });
    // The same visible policy without a creation proof is not control.
    for (const creation of [undefined, null, PROVEN.creation]) {
      await expect(
        readMatchingAuthorityIdentities({
          sourceClient: safeClient(),
          destinationClient: safeClient({ owners: [BOB, ALICE] }),
          authority: AUTHORITY,
          creation,
        }),
      ).resolves.toMatchObject({ matches: false, creationUnproven: true });
    }
    for (const destinationClient of [
      safeClient({ owners: [ALICE], threshold: 1n }),
      safeClient({ modules: [MODULE] }),
      safeClient({ guard: ALICE }),
      safeClient({ ownerCodes: { [ALICE.toLowerCase()]: "0x6002" } }),
      safeClient({ singletonCode: "0x6003" }),
      safeClient({ singleton: OTHER_SINGLETON }),
      safeClient({ fallbackHandler: zeroAddress }),
      safeClient({ fallbackHandlerCode: "0x6004" }),
      codeClient(EIP_7702_CODE),
    ]) {
      await expect(
        readMatchingAuthorityIdentities({
          sourceClient: safeClient(),
          destinationClient,
          authority: AUTHORITY,
        }),
      ).resolves.toMatchObject({ matches: false });
    }
    await expect(
      readMatchingAuthorityIdentities({
        sourceClient: safeClient(),
        destinationClient: safeClient({ rejectRead: true }),
        authority: AUTHORITY,
      }),
    ).resolves.toBeNull();
    const empty = codeClient(undefined);
    await expect(
      readMatchingAuthorityIdentities({
        sourceClient: empty,
        destinationClient: codeClient(EIP_7702_CODE),
        authority: AUTHORITY,
      }),
    ).resolves.toEqual({
      source: { kind: "eoa" },
      destination: { kind: "delegated-eoa", delegation: DELEGATION },
      matches: true,
      creationUnproven: false,
    });
  });

  it("treats Safe's Ethereum and SafeL2 singletons as one release, not as one runtime", () => {
    const [L1, L2] = SAFE_L1_L2_SINGLETON_PAIRS[0];
    const ethereum = safeIdentity({
      singleton: L1,
      singletonCodeHash: keccak256("0x60106000"),
      version: "1.4.1",
    });
    const l2 = safeIdentity({
      singleton: L2,
      singletonCodeHash: keccak256("0x60116000"),
      version: "1.4.1",
    });
    expect(authorityIdentitiesMatch(l2, ethereum)).toBe(true);
    expect(safeSingletonsAreEquivalent(L1, L2)).toBe(true);
    expect(safeSingletonsAreEquivalent(L2, L1)).toBe(true);
    expect(safeSingletonsAreEquivalent(L1, L1)).toBe(true);
    expect(safeSingletonsAreEquivalent(L1, SINGLETON)).toBe(false);
    expect(
      authorityIdentitiesMatch(ethereum, {
        ...ethereum,
        singletonCodeHash: keccak256("0x60116000"),
      }),
    ).toBe(false);
    expect(authorityIdentitiesMatch(l2, { ...ethereum, threshold: 1 })).toBe(
      false,
    );
    expect(
      authorityIdentitiesMatch(l2, { ...ethereum, singleton: SINGLETON }),
    ).toBe(false);
  });

  it("recognizes a factory only with a singleton of its own release", () => {
    const [v130, v141] = RECOGNIZED_SAFE_RELEASES;
    expect(
      isRecognizedSafeDeployment(v130.factories[1], v130.singletons[2]),
    ).toBe(true);
    expect(
      isRecognizedSafeDeployment(v141.factories[0], v141.singletons[1]),
    ).toBe(true);
    expect(
      isRecognizedSafeDeployment(v141.factories[0], v130.singletons[0]),
    ).toBe(false);
    expect(isRecognizedSafeDeployment(AUTHORITY, v130.singletons[0])).toBe(
      false,
    );
    expect(
      isRecognizedSafeDeployment("0x12" as Address, v130.singletons[0]),
    ).toBe(false);
  });
});

describe("cross-chain handle authority", () => {
  const eoaClient = (
    contracts: readonly Address[] = [],
    code: Hex | undefined = undefined,
  ) =>
    ({
      getCode: vi.fn(async ({ address }: { address: Address }) =>
        contracts.some(
          (candidate) => candidate.toLowerCase() === address.toLowerCase(),
        )
          ? "0x60006000"
          : code,
      ),
    }) as unknown as PublicClient;

  const verdict = (
    sourceClient: PublicClient,
    mainnetClient?: PublicClient,
    sourceChainId = 8453,
    {
      authority = AUTHORITY,
      creation,
    }: { authority?: Address; creation?: SafeCreation | null } = {},
  ) =>
    readCrossChainHandleAuthority({
      sourceChainId,
      sourceClient,
      mainnetClient,
      authority,
      creation,
    });
  const proven = { authority: PROVEN.address, creation: PROVEN.creation };

  it("leaves a live Ethereum authority local, whatever kind it is", async () => {
    for (const client of [eoaClient(), safeClient(), eoaClient([AUTHORITY])]) {
      await expect(verdict(client, undefined, 1)).resolves.toMatchObject({
        status: "valid-local",
        allowed: true,
      });
    }
    await expect(verdict(eoaClient())).resolves.toMatchObject({
      status: "unknown",
      allowed: false,
    });
  });

  it("accepts the same EOA, plain or delegated, and matching plain Safes", async () => {
    for (const [sourceCode, mainnetCode] of [
      [undefined, undefined],
      [EIP_7702_CODE, undefined],
      [undefined, EIP_7702_CODE],
      [EIP_7702_CODE, `0xef0100${OTHER_FALLBACK.slice(2)}` as Hex],
    ] as const) {
      await expect(
        verdict(eoaClient([], sourceCode), eoaClient([], mainnetCode)),
      ).resolves.toMatchObject({ status: "valid-eoa", allowed: true });
    }
    const at = { safe: PROVEN.address };
    await expect(
      verdict(safeClient(at), safeClient(at), 8453, proven),
    ).resolves.toMatchObject({ status: "valid-safe", allowed: true });
    await expect(
      verdict(
        safeClient({
          ...at,
          ownerCodes: { [ALICE.toLowerCase()]: EIP_7702_CODE },
        }),
        safeClient({
          ...at,
          ownerCodes: { [BOB.toLowerCase()]: EIP_7702_CODE },
        }),
        8453,
        proven,
      ),
    ).resolves.toMatchObject({ status: "valid-safe", allowed: true });
    // Matching Safes whose creation is missing or does not prove the address
    // could be a third party's claim on the address: never trusted.
    for (const options of [
      {},
      { creation: null },
      { creation: PROVEN.creation },
      {
        authority: PROVEN.address,
        creation: creationOf(creations.safe130Hooked),
      },
    ]) {
      const safe = options.authority ?? AUTHORITY;
      await expect(
        verdict(safeClient({ safe }), safeClient({ safe }), 8453, options),
      ).resolves.toMatchObject({ status: "unproven-creation", allowed: false });
    }
  });

  it("names a deployable missing Ethereum Safe apart from every refusal", async () => {
    await expect(verdict(safeClient(), eoaClient())).resolves.toMatchObject({
      status: "missing-mainnet-safe",
      allowed: false,
    });
    const cases: [PublicClient, PublicClient, string][] = [
      [
        safeClient(),
        safeClient({ fallbackHandler: OTHER_FALLBACK }),
        "authority-mismatch",
      ],
      [safeClient(), eoaClient([], EIP_7702_CODE), "authority-mismatch"],
      [eoaClient(), safeClient(), "authority-mismatch"],
      [
        safeClient({ modules: [MODULE] }),
        safeClient({ modules: [MODULE] }),
        "unsafe-safe-policy",
      ],
      [safeClient({ guard: ALICE }), safeClient(), "unsafe-safe-policy"],
      [safeClient(), safeClient({ modules: [MODULE] }), "unsafe-safe-policy"],
      [safeClient(), eoaClient([ALICE]), "contract-owner"],
      [
        safeClient({ ownerCodes: { [ALICE.toLowerCase()]: "0x6002" } }),
        safeClient(),
        "contract-owner",
      ],
      [
        safeClient(),
        safeClient({ ownerCodes: { [ALICE.toLowerCase()]: "0x6002" } }),
        "contract-owner",
      ],
      [
        safeClient({
          ownerCodes: { [ALICE.toLowerCase()]: `${EIP_7702_CODE}00` },
        }),
        safeClient(),
        "contract-owner",
      ],
      [
        safeClient({ fallbackHandlerCode: EIP_7702_CODE }),
        safeClient(),
        "source-contract",
      ],
      [
        eoaClient([], `${EIP_7702_CODE}00` as Hex),
        eoaClient(),
        "source-contract",
      ],
      [eoaClient(), eoaClient([AUTHORITY]), "mainnet-contract"],
      [safeClient(), eoaClient([AUTHORITY]), "mainnet-contract"],
      [safeClient(), safeClient({ rejectRead: true }), "unknown"],
    ];
    for (const [sourceClient, mainnetClient, status] of cases) {
      await expect(verdict(sourceClient, mainnetClient)).resolves.toMatchObject(
        {
          status,
          allowed: false,
        },
      );
    }
    const flaky = {
      getCode: vi.fn(async ({ address }: { address: Address }) => {
        if (address.toLowerCase() === AUTHORITY.toLowerCase()) return undefined;
        throw new Error("RPC unavailable");
      }),
    } as unknown as PublicClient;
    await expect(verdict(safeClient(), flaky)).resolves.toMatchObject({
      status: "unknown",
    });
  });
});

// The network guard stubs fetch before every test; this is the real one.
const loopbackFetch = globalThis.fetch;

describe("authority identity over viem's HTTP transport", () => {
  let server: Server;
  let url: string;
  let callError: { code: number; message: string } | null;
  const methods: string[] = [];
  const client = () =>
    createPublicClient({
      chain: mainnet,
      transport: http(url, { retryCount: 0 }),
    });
  const safe = safeClient();

  beforeAll(async () => {
    // A local JSON-RPC node answering like the mocked Safe, except that
    // eth_call can fail with `callError`.
    server = createServer((request, response) => {
      let body = "";
      request.on("data", (chunk) => (body += chunk));
      request.on("end", async () => {
        const answer = async ({
          id,
          method,
          params,
        }: {
          id: number;
          method: string;
          params: unknown[];
        }) => {
          methods.push(method);
          try {
            if (method === "eth_getCode") {
              const code = await safe.getCode({
                address: params[0] as Address,
              });
              return { jsonrpc: "2.0", id, result: code ?? "0x" };
            }
            if (method === "eth_getStorageAt") {
              const slot = padHex(params[1] as Hex, { size: 32 });
              return {
                jsonrpc: "2.0",
                id,
                result: await safe.getStorageAt({ slot }),
              };
            }
            if (method === "eth_call" && callError) {
              return { jsonrpc: "2.0", id, error: callError };
            }
            return {
              jsonrpc: "2.0",
              id,
              result: await safe.request({ method, params }),
            };
          } catch (error) {
            return {
              jsonrpc: "2.0",
              id,
              error: { code: -32000, message: (error as Error).message },
            };
          }
        };
        const message = JSON.parse(body);
        response.setHeader("content-type", "application/json");
        response.end(
          JSON.stringify(
            Array.isArray(message)
              ? await Promise.all(message.map(answer))
              : await answer(message),
          ),
        );
      });
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    callError = null;
    methods.length = 0;
    // Only this suite's loopback node may answer.
    vi.stubGlobal(
      "fetch",
      vi.fn((input: string | URL | Request, init?: RequestInit) =>
        String(input) === url
          ? loopbackFetch(input, init)
          : Promise.reject(new Error(`Unexpected fetch: ${String(input)}`)),
      ),
    );
  });

  it("reads a Safe through a real client, at a pinned block", async () => {
    await expect(
      readAuthorityIdentity(client(), AUTHORITY, { blockNumber: 12n }),
    ).resolves.toEqual(safeIdentity());
    expect(methods).toContain("eth_call");
    expect(methods).not.toContain("eth_chainId");
  });

  it("keeps a reverted, internal-error or unavailable call unknown, not a contract", async () => {
    for (const error of [
      { code: 3, message: "execution reverted" },
      { code: -32603, message: "Internal error" },
      { code: -32000, message: "header not found" },
    ]) {
      callError = error;
      await expect(
        readAuthorityIdentity(client(), AUTHORITY),
      ).resolves.toBeNull();
    }
  });
});

describe("Safe creation proof", () => {
  it("proves real Safes from their creation records, in both releases", () => {
    for (const record of [creations.safe130Inert, creations.safe141Inert]) {
      expect(
        proveSafeCreation(creationOf(record), record.address as Address),
      ).toMatchObject({ valid: true });
    }
    expect(proveSafeCreation(PROVEN.creation, PROVEN.address)).toEqual({
      valid: true,
      owners: [
        getAddress("0x8bE0c31612c22f94fE53f1Fe9BB726Dd196E9579"),
        getAddress("0xe908c2D5613d24D49E376f19715c795DB8E04f81"),
      ],
      threshold: 1,
      fallbackHandler: getAddress("0x017062a1dE2FE6b99BE3d9d37841FeD19F573804"),
    });
  });

  it("refuses a setup hook, another address, and what is not a recognized creation", () => {
    // A real Safe whose setup ran a MultiSend delegatecall: it could have planted
    // an owner or module that no getter shows.
    expect(
      proveSafeCreation(
        creationOf(creations.safe130Hooked),
        creations.safe130Hooked.address as Address,
      ),
    ).toEqual({ valid: false, reason: "unsafe-initializer" });
    for (const [creation, safe] of [
      [
        { ...PROVEN.creation, saltNonce: PROVEN.creation.saltNonce + 1n },
        PROVEN.address,
      ],
      [PROVEN.creation, AUTHORITY],
    ] as const) {
      expect(proveSafeCreation(creation, safe)).toEqual({
        valid: false,
        reason: "address-mismatch",
      });
    }
    expect(
      proveSafeCreation(
        {
          ...PROVEN.creation,
          factory: "0x76E2cFc1F5Fa8F6a5b3fC4c8F4788F0116861F9B",
          singleton: "0x34CfAC646f301356fAa8B21e94227e3583Fe3F5F",
        },
        PROVEN.address,
      ),
    ).toEqual({ valid: false, reason: "unrecognized-deployment" });
    expect(
      proveSafeCreation(
        {
          ...PROVEN.creation,
          initializer: `${PROVEN.creation.initializer}00` as Hex,
        },
        PROVEN.address,
      ),
    ).toEqual({ valid: false, reason: "malformed-initializer" });
    for (const [creation, safe] of [
      [
        { ...PROVEN.creation, saltNonce: 1 as unknown as bigint },
        PROVEN.address,
      ],
      [null as unknown as SafeCreation, PROVEN.address],
      [PROVEN.creation, "0x12" as Address],
    ] as const) {
      expect(proveSafeCreation(creation, safe)).toEqual({
        valid: false,
        reason: "malformed-creation",
      });
    }
  });
});
