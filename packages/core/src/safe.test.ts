import {
  concatHex,
  decodeFunctionData,
  encodeFunctionData,
  encodeFunctionResult,
  getAddress,
  keccak256,
  toHex,
  zeroAddress,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { describe, expect, test, vi } from "vitest";
import {
  CREATE_BATCH_ABI,
  MULTICALL3,
  SAFE_CREATE_ABI,
  SAFE_FACTORY,
  SAFE_FALLBACK,
  SAFE_SINGLETON,
  buildSafeDeploymentCalls,
  buildSafeDeploymentTx,
  buildSafeInitializer,
  bundleSafeLaunch,
  predictSafeAddress,
  unbundleSafeLaunch,
  validateSafeDeploymentPlan,
  verifySafeLaunchSimulation,
  type SafeCall,
  type SafeDeploymentPlan,
} from "./safe.js";

const OWNERS: Address[] = [
  "0x0000000000000000000000000000000000000002",
  "0x0000000000000000000000000000000000000003",
  "0x0000000000000000000000000000000000000004",
];
const POLICY = {
  owners: OWNERS,
  threshold: 2,
  saltNonce: toHex(42n, { size: 32 }),
  proxyCreationCode: "0x6001600055" as Hex,
};
const PLAN: SafeDeploymentPlan = {
  ...POLICY,
  address: predictSafeAddress(POLICY),
};
const SECOND_PLAN: SafeDeploymentPlan = {
  ...POLICY,
  threshold: 3,
  address: predictSafeAddress({ ...POLICY, threshold: 3 }),
};
const LAUNCH: SafeCall = {
  to: "0x0000000000000000000000000000000000000005",
  data: "0xabcdef",
  value: 123456789n,
};

describe("buildSafeInitializer", () => {
  test("encodes the ordered signing policy without setup delegatecalls, modules, or payment", () => {
    const decoded = decodeFunctionData({
      abi: SAFE_CREATE_ABI,
      data: buildSafeInitializer(POLICY),
    });
    expect(decoded.functionName).toBe("setup");
    expect(decoded.args).toEqual([
      OWNERS,
      2n,
      zeroAddress,
      "0x",
      SAFE_FALLBACK,
      zeroAddress,
      0n,
      zeroAddress,
    ]);
    expect(POLICY.owners).toEqual(OWNERS);
    expect(
      buildSafeInitializer({ ...POLICY, owners: [...OWNERS].reverse() }),
    ).not.toBe(buildSafeInitializer(POLICY));
  });

  test.each([1, 50])("accepts %i owners and an all-owner policy", (count) => {
    const owners = Array.from({ length: count }, (_, index) =>
      getAddress(toHex(index + 2, { size: 20 })),
    );
    const decoded = decodeFunctionData({
      abi: SAFE_CREATE_ABI,
      data: buildSafeInitializer({ owners, threshold: count }),
    });
    expect(decoded.args?.[0]).toEqual(owners);
    expect(decoded.args?.[1]).toBe(BigInt(count));
  });

  test.each(
    [
      null,
      [],
      Array.from({ length: 51 }, (_, index) => toHex(index + 2, { size: 20 })),
      ["invalid"],
      [zeroAddress],
      [toHex(1, { size: 20 })],
      [OWNERS[0], OWNERS[0]],
      [
        "0x000000000000000000000000000000000000dEaD",
        "0x000000000000000000000000000000000000dead",
      ],
    ].map((owners) => ({ owners })),
  )("rejects invalid or duplicate owner sets: %j", ({ owners }) => {
    expect(() =>
      buildSafeInitializer({
        owners: owners as unknown as Address[],
        threshold: 1,
      }),
    ).toThrow();
  });

  test.each([0, -1, 4, 1.5, NaN, Infinity])(
    "rejects invalid approval thresholds: %s",
    (threshold) => {
      expect(() =>
        buildSafeInitializer({ owners: OWNERS, threshold }),
      ).toThrow();
    },
  );
});

describe("Safe CREATE2 prediction and validation", () => {
  test("matches the canonical factory CREATE2 preimage with a 32-byte singleton suffix", () => {
    const initializer = buildSafeInitializer(POLICY);
    const salt = keccak256(
      concatHex([keccak256(initializer), POLICY.saltNonce]),
    );
    const initCodeHash = keccak256(
      concatHex([
        POLICY.proxyCreationCode,
        toHex(BigInt(SAFE_SINGLETON), { size: 32 }),
      ]),
    );
    const hash = keccak256(
      concatHex(["0xff", SAFE_FACTORY, salt, initCodeHash]),
    );
    expect(PLAN.address).toBe(getAddress(`0x${hash.slice(-40)}`));
    expect(PLAN.address).toBe("0xF0CBF9d51dEe3F870E12f3b4dC36cB5f9a3e4132");
    expect(predictSafeAddress({ ...POLICY })).toBe(PLAN.address);
    expect(predictSafeAddress({ ...POLICY, threshold: 3 })).not.toBe(
      PLAN.address,
    );
    expect(
      predictSafeAddress({ ...POLICY, saltNonce: toHex(43n, { size: 32 }) }),
    ).not.toBe(PLAN.address);
  });

  test.each(["0x", "0x01", `0x${"aa".repeat(33)}`, `0x${"gg".repeat(32)}`])(
    "rejects an invalid deployment nonce: %s",
    (saltNonce) => {
      expect(() =>
        predictSafeAddress({ ...POLICY, saltNonce: saltNonce as Hex }),
      ).toThrow();
    },
  );

  test.each(["0x", "0x1", "0xgg", `0x${"aa".repeat(2049)}`])(
    "rejects malformed or oversized proxy creation code",
    (proxyCreationCode) => {
      expect(() =>
        predictSafeAddress({
          ...POLICY,
          proxyCreationCode: proxyCreationCode as Hex,
        }),
      ).toThrow();
    },
  );

  test("validates the saved address against every policy field", () => {
    expect(() => validateSafeDeploymentPlan(PLAN)).not.toThrow();
    expect(() =>
      validateSafeDeploymentPlan({
        ...PLAN,
        address: PLAN.address.toLowerCase() as Address,
      }),
    ).not.toThrow();
    for (const changed of [
      { address: OWNERS[0] },
      { address: zeroAddress },
      { address: "invalid" as Address },
      { threshold: 1 },
      { owners: [...OWNERS].reverse() },
      { saltNonce: toHex(43n, { size: 32 }) },
      { proxyCreationCode: "0x6000600055" as Hex },
    ]) {
      expect(() =>
        validateSafeDeploymentPlan({ ...PLAN, ...changed }),
      ).toThrow();
    }
  });
});

describe("Safe deployment request builders", () => {
  test("prepares optional zero-value factory calls in the requested order", () => {
    const plans = [PLAN, SECOND_PLAN];
    const calls = buildSafeDeploymentCalls(plans);
    expect(calls).toHaveLength(2);
    calls.forEach((call, index) => {
      expect(call.target).toBe(SAFE_FACTORY);
      expect(call.allowFailure).toBe(true);
      expect(call.value).toBe(0n);
      const decoded = decodeFunctionData({
        abi: SAFE_CREATE_ABI,
        data: call.callData,
      });
      expect(decoded.functionName).toBe("createProxyWithNonce");
      expect(decoded.args).toEqual([
        SAFE_SINGLETON,
        buildSafeInitializer(plans[index]),
        BigInt(plans[index].saltNonce),
      ]);
    });
    expect(buildSafeDeploymentCalls([])).toEqual([]);
    expect(() =>
      buildSafeDeploymentCalls([{ ...PLAN, address: OWNERS[0] }]),
    ).toThrow();
    expect(() =>
      buildSafeDeploymentCalls(null as unknown as SafeDeploymentPlan[]),
    ).toThrow();
    expect(() => buildSafeDeploymentCalls([PLAN, PLAN])).toThrow(/Duplicate/);
    expect(() =>
      buildSafeDeploymentCalls([
        PLAN,
        { ...PLAN, address: PLAN.address.toLowerCase() as Address },
      ]),
    ).toThrow(/Duplicate/);
  });

  test("returns a chain-specific zero-value Multicall3 contract request", () => {
    const request = buildSafeDeploymentTx(8453, [PLAN]);
    expect(request).toMatchObject({
      chainId: 8453,
      address: MULTICALL3,
      abi: CREATE_BATCH_ABI,
      functionName: "aggregate3Value",
      value: 0n,
    });
    const decoded = decodeFunctionData({
      abi: CREATE_BATCH_ABI,
      data: encodeFunctionData(request),
    });
    expect(decoded.args).toEqual([buildSafeDeploymentCalls([PLAN])]);
  });

  test.each([0, -1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid destination chain ids: %s",
    (chainId) => {
      expect(() => buildSafeDeploymentTx(chainId, [PLAN])).toThrow();
    },
  );
});

describe("Safe launch composition", () => {
  test("leaves an unbatched launch untouched when no deployment is required", () => {
    expect(bundleSafeLaunch(LAUNCH, [])).toBe(LAUNCH);
    expect(unbundleSafeLaunch(LAUNCH, [])).toBe(LAUNCH);
    expect(bundleSafeLaunch(LAUNCH)).toBe(LAUNCH);
    expect(unbundleSafeLaunch(LAUNCH)).toBe(LAUNCH);
  });

  test.each([
    { to: zeroAddress },
    { to: toHex(1, { size: 20 }) },
    { to: "invalid" as Address },
    { data: "0x1" as Hex },
    { data: "0xgg" as Hex },
    { value: -1n },
    { value: 1 as unknown as bigint },
  ])("rejects malformed launch request %#", (changed) => {
    expect(() => bundleSafeLaunch({ ...LAUNCH, ...changed }, [PLAN])).toThrow();
  });

  test("supports a zero-value call with empty calldata", () => {
    const call = { ...LAUNCH, value: 0n, data: "0x" as Hex };
    expect(unbundleSafeLaunch(bundleSafeLaunch(call, [PLAN]), [PLAN])).toEqual(
      call,
    );
  });

  test("puts deployment before the required launch and preserves its full payable value", () => {
    const bundled = bundleSafeLaunch(LAUNCH, [PLAN, SECOND_PLAN]);
    expect(bundled.to).toBe(MULTICALL3);
    expect(bundled.value).toBe(LAUNCH.value);
    const decoded = decodeFunctionData({
      abi: CREATE_BATCH_ABI,
      data: bundled.data,
    });
    expect(decoded.args[0]).toEqual([
      ...buildSafeDeploymentCalls([PLAN, SECOND_PLAN]),
      {
        target: LAUNCH.to,
        allowFailure: false,
        value: LAUNCH.value,
        callData: LAUNCH.data,
      },
    ]);
    expect(unbundleSafeLaunch(bundled, [PLAN, SECOND_PLAN])).toEqual(LAUNCH);
  });

  test("rejects a non-batch target and an empty batch", () => {
    expect(() => unbundleSafeLaunch(LAUNCH, [PLAN])).toThrow();
    expect(() =>
      unbundleSafeLaunch(
        {
          ...LAUNCH,
          to: MULTICALL3,
          data: encodeFunctionData({
            abi: CREATE_BATCH_ABI,
            functionName: "aggregate3Value",
            args: [[]],
          }),
        },
        [PLAN],
      ),
    ).toThrow();
  });

  test("rejects changed deployment calls, order, failure policy, and value", () => {
    const bundled = bundleSafeLaunch(LAUNCH, [PLAN, SECOND_PLAN]);
    const { args } = decodeFunctionData({
      abi: CREATE_BATCH_ABI,
      data: bundled.data,
    });
    const original = args[0];
    const variants = [
      original.slice(1),
      [original[1], original[0], original[2]],
      [{ ...original[0], allowFailure: false }, ...original.slice(1)],
      [{ ...original[0], target: OWNERS[0] }, ...original.slice(1)],
      [{ ...original[0], callData: "0x" as Hex }, ...original.slice(1)],
      [...original.slice(0, -1), { ...original[2], allowFailure: true }],
      [...original.slice(0, -1), { ...original[2], value: LAUNCH.value + 1n }],
      [...original, original[2]],
    ];
    for (const calls of variants) {
      const data = encodeFunctionData({
        abi: CREATE_BATCH_ABI,
        functionName: "aggregate3Value",
        args: [calls],
      });
      expect(() =>
        unbundleSafeLaunch({ ...bundled, data }, [PLAN, SECOND_PLAN]),
      ).toThrow();
    }
    expect(() =>
      unbundleSafeLaunch({ ...bundled, value: 0n }, [PLAN, SECOND_PLAN]),
    ).toThrow();
  });
});

describe("Safe launch simulation", () => {
  const getCode = vi.fn();
  const readContract = vi.fn();
  const client = { getCode, readContract } as unknown as PublicClient;
  const successfulFactory = {
    success: true,
    returnData: toHex(BigInt(PLAN.address), { size: 32 }),
  };
  const successfulLaunch = { success: true, returnData: "0x" as Hex };
  const encodeResults = (
    result: readonly { success: boolean; returnData: Hex }[],
  ) =>
    encodeFunctionResult({
      abi: CREATE_BATCH_ABI,
      functionName: "aggregate3Value",
      result,
    });

  test("needs no results or chain reads when no Safe is created", async () => {
    await expect(verifySafeLaunchSimulation(client)).resolves.toBeUndefined();
    await expect(
      verifySafeLaunchSimulation(client, []),
    ).resolves.toBeUndefined();
    expect(getCode).not.toHaveBeenCalled();
    expect(readContract).not.toHaveBeenCalled();
  });

  test("accepts the exact predicted factory result followed by a successful launch", async () => {
    await expect(
      verifySafeLaunchSimulation(
        client,
        [PLAN],
        encodeResults([successfulFactory, successfulLaunch]),
      ),
    ).resolves.toBeUndefined();
    expect(getCode).not.toHaveBeenCalled();
    expect(readContract).not.toHaveBeenCalled();
  });

  test("rejects missing or malformed ABI results", async () => {
    await expect(verifySafeLaunchSimulation(client, [PLAN])).rejects.toThrow();
    await expect(
      verifySafeLaunchSimulation(client, [PLAN], "0x"),
    ).rejects.toThrow();
  });

  test.each(
    [
      [],
      [successfulFactory],
      [successfulFactory, successfulLaunch, successfulLaunch],
      [successfulFactory, { success: false, returnData: "0x" as Hex }],
    ].map((results) => ({ results })),
  )("rejects incomplete or failed launch results: %j", async ({ results }) => {
    await expect(
      verifySafeLaunchSimulation(client, [PLAN], encodeResults(results)),
    ).rejects.toThrow();
  });

  test.each([
    "0x" as Hex,
    PLAN.address,
    toHex(BigInt(OWNERS[0]), { size: 32 }),
    concatHex([toHex(BigInt(PLAN.address), { size: 32 }), "0x00"]),
  ])("rejects an invalid factory address result", async (returnData) => {
    await expect(
      verifySafeLaunchSimulation(
        client,
        [PLAN],
        encodeResults([{ success: true, returnData }, successfulLaunch]),
      ),
    ).rejects.toThrow();
  });
});
