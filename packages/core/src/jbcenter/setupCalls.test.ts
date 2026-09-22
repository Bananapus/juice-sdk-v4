import { encodeFunctionData, zeroAddress, type Address } from "viem";
import { describe, expect, test } from "vitest";
import {
  SAFE_CREATE_ABI,
  SAFE_FACTORY,
  SAFE_SINGLETON,
  buildSafeInitializer,
} from "../safe.js";
import type { JBCenterDeploymentCall } from "../jbcenter.js";
import { groupDeploymentCalls, isValidDeploymentCalls } from "./setupCalls.js";

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
