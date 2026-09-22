import { encodeFunctionData, zeroAddress, type Address } from "viem";
import { describe, expect, test } from "vitest";
import {
  SAFE_CREATE_ABI,
  SAFE_FACTORY,
  SAFE_FALLBACK,
  SAFE_SINGLETON,
  buildSafeInitializer,
} from "../safe.js";
import type { JBCenterDeploymentCall } from "../jbcenter.js";
import {
  groupDeploymentCalls,
  intentCalls,
  isValidDeploymentCalls,
} from "./setupCalls.js";

const OWNERS: readonly Address[] = [
  "0x0000000000000000000000000000000000000002",
  "0x0000000000000000000000000000000000000003",
];
const LAUNCH_TARGET = "0x000000000000000000000000000000000000dEaD" as const;

function setupCall(chainId: number, saltNonce: bigint): JBCenterDeploymentCall {
  return {
    chainId,
    to: SAFE_FACTORY,
    data: encodeFunctionData({
      abi: SAFE_CREATE_ABI,
      functionName: "createProxyWithNonce",
      args: [
        SAFE_SINGLETON,
        buildSafeInitializer({ owners: OWNERS, threshold: 2 }),
        saltNonce,
      ],
    }),
  };
}

function launchCall(chainId: number): JBCenterDeploymentCall {
  return { chainId, to: LAUNCH_TARGET, data: "0x12345678" };
}

describe("groupDeploymentCalls", () => {
  test("keeps each chain's calls in the order the array carries them", () => {
    const calls = [
      setupCall(8453, 1n),
      launchCall(10),
      launchCall(8453),
      setupCall(10, 2n),
    ];

    expect([...groupDeploymentCalls(calls)]).toEqual([
      [8453, [calls[0], calls[2]]],
      [10, [calls[1], calls[3]]],
    ]);
  });

  test("is empty for no calls", () => {
    expect(groupDeploymentCalls([]).size).toBe(0);
  });
});

describe("isValidDeploymentCalls", () => {
  test("accepts one launch per chain", () => {
    expect(isValidDeploymentCalls([launchCall(8453), launchCall(10)])).toBe(
      true,
    );
  });

  test("accepts one, two and three setup calls before a launch", () => {
    for (const count of [1, 2, 3]) {
      const setups = Array.from({ length: count }, (_, index) =>
        setupCall(8453, BigInt(index + 1)),
      );
      expect(isValidDeploymentCalls([...setups, launchCall(8453)])).toBe(true);
    }
  });

  test("refuses a fifth call on a chain", () => {
    expect(
      isValidDeploymentCalls([
        setupCall(8453, 1n),
        setupCall(8453, 2n),
        setupCall(8453, 3n),
        setupCall(8453, 4n),
        launchCall(8453),
      ]),
    ).toBe(false);
  });

  test("refuses a setup call to another target", () => {
    expect(
      isValidDeploymentCalls([
        { chainId: 8453, to: LAUNCH_TARGET, data: "0x12345678" },
        launchCall(8453),
      ]),
    ).toBe(false);
  });

  test("refuses a setup call with another singleton", () => {
    expect(
      isValidDeploymentCalls([
        {
          chainId: 8453,
          to: SAFE_FACTORY,
          data: encodeFunctionData({
            abi: SAFE_CREATE_ABI,
            functionName: "createProxyWithNonce",
            args: [
              zeroAddress,
              buildSafeInitializer({ owners: OWNERS, threshold: 2 }),
              1n,
            ],
          }),
        },
        launchCall(8453),
      ]),
    ).toBe(false);
  });

  test("refuses a setup call after the launch position", () => {
    expect(
      isValidDeploymentCalls([launchCall(8453), setupCall(8453, 1n)]),
    ).toBe(false);
    expect(
      isValidDeploymentCalls([
        setupCall(8453, 1n),
        launchCall(8453),
        launchCall(8453),
      ]),
    ).toBe(false);
  });

  test("checks every chain, not only the first", () => {
    expect(
      isValidDeploymentCalls([
        setupCall(8453, 1n),
        launchCall(8453),
        { chainId: 10, to: LAUNCH_TARGET, data: "0x12345678" },
        launchCall(10),
      ]),
    ).toBe(false);
  });

  test("accepts no calls at all, which the envelope check refuses on its own", () => {
    expect(isValidDeploymentCalls([])).toBe(true);
  });
});

function intentWith(calls: JBCenterDeploymentCall[]) {
  return {
    id: "31b158fc-6ac5-4a4d-9039-882b7eb0ef4b",
    status: "undeployed" as const,
    contentHash: `0x${"12".repeat(32)}` as const,
    envelope: {
      format: "juicebox.money/v1",
      deploymentVersion: "6",
      chainIds: [...new Set(calls.map((call) => call.chainId))],
      deploymentCalls: calls,
      jb: {},
    },
    publisher: "0x0000000000000000000000000000000000000002" as const,
    signature: `0x${"34".repeat(65)}` as const,
    createdAt: "2026-09-22T00:00:00.000Z",
    deployments: [],
    deploys: [],
    name: "Example",
    description: null,
    tagline: null,
    tags: [],
    logoUri: null,
    owner: null,
  };
}

describe("intentCalls", () => {
  test("separates each chain's setup calls from its launch", () => {
    const setup = setupCall(8453, 42n);
    const launch = launchCall(8453);
    const result = intentCalls(intentWith([setup, launch, launchCall(10)]));

    expect([...result.keys()]).toEqual([8453, 10]);
    expect(result.get(8453)?.setup).toEqual([
      {
        ...setup,
        decoded: {
          flavor: "safe-create",
          to: SAFE_FACTORY,
          singleton: SAFE_SINGLETON,
          saltNonce: `0x${(42).toString(16).padStart(64, "0")}`,
          owners: [...OWNERS],
          threshold: 2,
          fallbackHandler: SAFE_FALLBACK,
          address: "0x53a62fb237E097DEa3714015Bced94790fE5c3BB",
        },
      },
    ]);
    expect(result.get(8453)?.launch).toEqual({
      ...launch,
      decoded: { flavor: "unknown", to: LAUNCH_TARGET, selector: "0x12345678" },
    });
    expect(result.get(10)?.setup).toEqual([]);
    expect(result.get(10)?.launch.chainId).toBe(10);
  });

  test("is empty for an intent with no calls", () => {
    expect(intentCalls(intentWith([])).size).toBe(0);
  });
});
