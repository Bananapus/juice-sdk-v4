import {
  jbContractAddress,
  jbOmnichainDeployer4_1Abi,
  jbOmnichainDeployerAbi,
  jbOmnichainDeployerV5Abi,
} from "@bananapus/nana-sdk-core";
import { isAddressEqual, zeroAddress } from "viem";
import { mainnet } from "viem/chains";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useResolveDataHook } from "./useResolveDataHook";

const mocks = vi.hoisted(() => ({
  version: 6,
  readContract: vi.fn(),
}));

vi.mock("wagmi", () => ({ useReadContract: mocks.readContract }));
vi.mock("../../contexts/JBContractContext/JBContractContext", () => ({
  useJBContractContext: () => ({ version: mocks.version }),
}));

const tieredHook = "0x1111111111111111111111111111111111111111" as const;
const extraHook = "0x2222222222222222222222222222222222222222" as const;
const ordinaryHook = "0x3333333333333333333333333333333333333333" as const;

function v6Deployer() {
  return jbContractAddress[6].JBOmnichainDeployer[mainnet.id];
}

function legacyDeployer(version: 4 | 5) {
  return version === 4
    ? jbContractAddress[4].JBOmnichainDeployer4_1[mainnet.id]
    : jbContractAddress[5].JBOmnichainDeployer[mainnet.id];
}

describe("useResolveDataHook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.version = 6;
    mocks.readContract.mockReturnValue({ data: undefined, isLoading: false });
  });

  test("returns zero for an absent hook and leaves all resolution reads disabled", () => {
    const result = useResolveDataHook({
      dataHookAddress: undefined,
      projectId: undefined,
      chainId: undefined,
      rulesetId: undefined,
    });

    expect(result).toEqual({
      resolvedDataHook: zeroAddress,
      dataHookIsOmnichainDeployer: false,
      isLoading: false,
      error: undefined,
    });
    expect(mocks.readContract).toHaveBeenCalledTimes(3);
    expect(
      mocks.readContract.mock.calls.every(
        ([config]) => config.query.enabled === false,
      ),
    ).toBe(true);
  });

  test("uses the V6 tiered hook before the optional extra hook", () => {
    mocks.readContract
      .mockReturnValueOnce({ data: undefined, isLoading: false })
      .mockReturnValueOnce({ data: [tieredHook], isLoading: false })
      .mockReturnValueOnce({
        data: { dataHook: extraHook },
        isLoading: false,
      });

    const result = useResolveDataHook({
      dataHookAddress: v6Deployer(),
      projectId: 7n,
      chainId: 10,
      rulesetId: 9n,
    });

    expect(result.resolvedDataHook).toBe(tieredHook);
    expect(result.dataHookIsOmnichainDeployer).toBe(true);
    expect(mocks.readContract.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        abi: jbOmnichainDeployerV5Abi,
        args: [7n, 9n],
      }),
    );
    expect(mocks.readContract.mock.calls[0][0].query.enabled).toBe(false);
    expect(mocks.readContract.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        abi: jbOmnichainDeployerAbi,
        functionName: "tiered721HookOf",
        args: [7n, 9n],
      }),
    );
    expect(mocks.readContract.mock.calls[1][0].query.enabled).toBe(true);
    expect(mocks.readContract.mock.calls[2][0].query.enabled).toBe(true);
  });

  test("falls back to the V6 extra hook and preserves the first query error", () => {
    const error = new Error("tier lookup failed");
    mocks.readContract
      .mockReturnValueOnce({ data: undefined, isLoading: false })
      .mockReturnValueOnce({ data: [zeroAddress], isLoading: true, error })
      .mockReturnValueOnce({
        data: { dataHook: extraHook },
        isLoading: false,
      });

    const result = useResolveDataHook({
      dataHookAddress: v6Deployer(),
      projectId: 7n,
      chainId: 1,
      rulesetId: 9n,
    });

    expect(result.resolvedDataHook).toBe(extraHook);
    expect(result.isLoading).toBe(true);
    expect(result.error).toBe(error);
  });

  test.each([4, 5] as const)(
    "uses the V%s single-hook tuple and version-specific ABI",
    (version) => {
      mocks.version = version;
      mocks.readContract
        .mockReturnValueOnce({
          data: [zeroAddress, false, ordinaryHook],
          isLoading: false,
        })
        .mockReturnValueOnce({ data: undefined, isLoading: false })
        .mockReturnValueOnce({ data: undefined, isLoading: false });

      const result = useResolveDataHook({
        dataHookAddress: legacyDeployer(version),
        projectId: 8n,
        chainId: 1,
        rulesetId: 10n,
      });

      expect(result.resolvedDataHook).toBe(ordinaryHook);
      expect(mocks.readContract.mock.calls[0][0].abi).toBe(
        version === 4 ? jbOmnichainDeployer4_1Abi : jbOmnichainDeployerV5Abi,
      );
      expect(mocks.readContract.mock.calls[0][0].query.enabled).toBe(true);
      expect(mocks.readContract.mock.calls[1][0].query.enabled).toBe(false);
      expect(mocks.readContract.mock.calls[2][0].query.enabled).toBe(false);
    },
  );

  test("does not rewrite an ordinary hook", () => {
    const result = useResolveDataHook({
      dataHookAddress: ordinaryHook,
      projectId: 7n,
      chainId: 10,
      rulesetId: 9n,
    });

    expect(result.resolvedDataHook).toBe(ordinaryHook);
    expect(result.dataHookIsOmnichainDeployer).toBe(false);
    expect(isAddressEqual(result.resolvedDataHook, ordinaryHook)).toBe(true);
  });
});
