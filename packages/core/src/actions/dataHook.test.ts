import type { Address, PublicClient } from "viem";
import { zeroAddress } from "viem";
import { describe, expect, test, vi } from "vitest";
import {
  jb721TiersHookAbi,
  jb721TiersHookV5Abi,
  jbAddressRegistryAbi,
  jbContractAddress,
} from "../generated/juicebox.js";
import { find721DataHook, getHookSpecifications } from "./dataHook.js";

const dataHook = "0x1000000000000000000000000000000000000001" as Address;
const firstHook = "0x2000000000000000000000000000000000000002" as Address;
const secondHook = "0x3000000000000000000000000000000000000003" as Address;
const otherDeployer = "0x4000000000000000000000000000000000000004" as Address;

function client(
  readContract: (request: any) => unknown | Promise<unknown>,
  chainId: number | null = 1,
) {
  const read = vi.fn(readContract);
  return {
    client: {
      ...(chainId === null ? {} : { chain: { id: chainId } }),
      readContract: read,
    } as unknown as PublicClient,
    read,
  };
}

function hookSpecification(hook: Address, version: 5 | 6) {
  return {
    hook,
    amount: 0n,
    metadata: "0x",
    ...(version === 6 ? { noop: false } : {}),
  };
}

describe("getHookSpecifications", () => {
  test.each([
    [6, jb721TiersHookAbi],
    [5, jb721TiersHookV5Abi],
  ] as const)(
    "uses the exact v%s hook ABI and canonical before-pay context",
    async (version, abi) => {
      const specifications = [hookSpecification(firstHook, version)];
      const { client: publicClient, read } = client(async () => [
        { weight: 0n },
        specifications,
      ]);

      await expect(
        getHookSpecifications(publicClient, {
          dataHookAddress: dataHook,
          projectId: 17n,
          rulesetId: 23,
          version,
        }),
      ).resolves.toBe(specifications);

      expect(read).toHaveBeenCalledOnce();
      expect(read.mock.calls[0][0].abi).toBe(abi);
      expect(read.mock.calls[0][0]).toMatchObject({
        address: dataHook,
        functionName: "beforePayRecordedWith",
        args: [
          {
            projectId: 17n,
            rulesetId: 23n,
            terminal: zeroAddress,
            beneficiary: zeroAddress,
            amount: {
              token: zeroAddress,
              value: 0n,
              decimals: 0,
              currency: 0,
            },
            payer: zeroAddress,
            weight: 0n,
            reservedPercent: 0n,
            metadata: zeroAddress,
          },
        ],
      });
    },
  );

  test("propagates an onchain read error without inventing specifications", async () => {
    const failure = new Error("hook reverted");
    const { client: publicClient } = client(async () => {
      throw failure;
    });

    await expect(
      getHookSpecifications(publicClient, {
        dataHookAddress: dataHook,
        projectId: 1n,
        rulesetId: 2,
        version: 6,
      }),
    ).rejects.toBe(failure);
  });
});

describe("find721DataHook", () => {
  test.each([5, 6] as const)(
    "returns the original matching hook identity for v%s",
    async (version) => {
      const specifications = [
        hookSpecification(firstHook, version),
        hookSpecification(secondHook, version),
      ];
      const expectedDeployer =
        jbContractAddress[String(version) as "5" | "6"]
          .JB721TiersHookDeployer[1];
      const { client: publicClient, read } = client(async (request) => {
        if (request.functionName === "beforePayRecordedWith") {
          return [{ weight: 0n }, specifications];
        }
        if (request.functionName === "deployerOf") {
          return request.args[0] === secondHook
            ? expectedDeployer
            : otherDeployer;
        }
        throw new Error(`Unexpected read ${request.functionName}`);
      });

      await expect(
        find721DataHook(publicClient, {
          dataHookAddress: dataHook,
          projectId: 7n,
          rulesetId: 11,
          version,
        }),
      ).resolves.toBe(secondHook);

      const registryReads = read.mock.calls
        .map(([request]) => request)
        .filter((request) => request.functionName === "deployerOf");
      expect(registryReads).toHaveLength(2);
      expect(registryReads[0].abi).toBe(jbAddressRegistryAbi);
      expect(registryReads[0].address.toLowerCase()).toBe(
        jbContractAddress[
          String(version) as "5" | "6"
        ].JBAddressRegistry[1].toLowerCase(),
      );
      expect(registryReads.map((request) => request.args)).toEqual([
        [firstHook],
        [secondHook],
      ]);
    },
  );

  test("returns null when no hook was deployed by the canonical deployer", async () => {
    const { client: publicClient } = client(async (request) => {
      if (request.functionName === "beforePayRecordedWith") {
        return [{ weight: 0n }, [hookSpecification(firstHook, 6)]];
      }
      return otherDeployer;
    });

    await expect(
      find721DataHook(publicClient, {
        dataHookAddress: dataHook,
        projectId: 7n,
        rulesetId: 11,
        version: 6,
      }),
    ).resolves.toBeNull();
  });

  test("fails before reading when the client has no chain identity", async () => {
    const { client: publicClient, read } = client(async () => [], null);

    await expect(
      find721DataHook(publicClient, {
        dataHookAddress: dataHook,
        projectId: 7n,
        rulesetId: 11,
        version: 6,
      }),
    ).rejects.toThrow("No chain ID on public client");
    expect(read).not.toHaveBeenCalled();
  });

  test("fails closed when the chain has no canonical registry", async () => {
    const { client: publicClient, read } = client(async () => [], 99_999);

    await expect(
      find721DataHook(publicClient, {
        dataHookAddress: dataHook,
        projectId: 7n,
        rulesetId: 11,
        version: 6,
      }),
    ).rejects.toThrow("No JBAddressRegistry address for chain 99999");
    expect(read).not.toHaveBeenCalled();
  });
});
