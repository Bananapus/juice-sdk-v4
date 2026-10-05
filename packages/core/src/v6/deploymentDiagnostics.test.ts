import { describe, expect, test, vi } from "vitest";
import {
  ContractFunctionZeroDataError,
  PublicClient,
  zeroAddress,
  zeroHash,
} from "viem";
import {
  getProjectDeploymentDiagnostics,
  describeProjectDataStatus,
} from "./deploymentDiagnostics.js";
import { v6Address } from "./types.js";

const chainId = 84532;
const projectId = 45n;
const hook = "0x0000000000000000000000000000000000000045" as const;
const owner = "0x0000000000000000000000000000000000000099" as const;
const address = (name: Parameters<typeof v6Address>[0]) =>
  v6Address(name, chainId);
type Read = {
  address: string;
  functionName: string;
  args?: readonly unknown[];
  blockNumber?: bigint;
};
function fixture(overrides: Record<string, unknown> = {}, revnet = true) {
  const values: Record<string, unknown> = {
    ownerOf: revnet ? address("REVOwner") : owner,
    controllerOf: address("JBController"),
    hashedEncodedConfigurationOf: `0x${"1".repeat(64)}`,
    currentRulesetOf: [
      { id: 1 },
      {
        dataHook: revnet ? address("REVOwner") : hook,
        useDataHookForPay: true,
        useDataHookForCashOut: true,
      },
    ],
    tiered721HookOf: hook,
    STORE: owner,
    maxTierIdOf: 0n,
    PERMISSIONS: address("JBPermissions"),
    projectId,
    DIRECTORY: address("JBDirectory"),
    owner: revnet ? address("REVOwner") : owner,
    deployerOf: address("JB721TiersHookDeployer"),
    pricingContext: [2n, 18n],
    hasPermissions: false,
    ...overrides,
  };
  const readContract = vi.fn(async (call: Read) => {
    const value = values[call.functionName];
    if (value instanceof Error) throw value;
    if (value === undefined)
      throw new Error(`Unexpected read ${call.functionName}`);
    return value;
  });
  const getChainId = vi.fn(async () => chainId);
  const getBlockNumber = vi.fn(async () => 123n);
  return {
    client: {
      readContract,
      getChainId,
      getBlockNumber,
    } as unknown as PublicClient,
    readContract,
    getChainId,
    getBlockNumber,
  };
}
const check = (
  report: Awaited<ReturnType<typeof getProjectDeploymentDiagnostics>>,
  id: string,
) => report.checks.find((item) => item.id === id);

describe("deployment diagnostics", () => {
  test("pins every read, verifies canonical wiring, and serializes without bigint or endpoints", async () => {
    const { client, readContract } = fixture();
    const report = await getProjectDeploymentDiagnostics(client, {
      chainId,
      projectId,
    });
    expect(report.kind).toBe("revnet");
    expect(report.checkedBlock).toBe("123");
    expect(check(report, "hook.projectId")?.status).toBe("passed");
    expect(check(report, "hook.owner")?.status).toBe("passed");
    expect(report.checks.some((item) => item.status === "mismatch")).toBe(
      false,
    );
    expect(
      readContract.mock.calls.every(([call]) => call.blockNumber === 123n),
    ).toBe(true);
    expect(() => JSON.stringify(report)).not.toThrow();
  });
  test("rejects wrong-chain clients before any project read", async () => {
    const f = fixture();
    f.getChainId.mockResolvedValue(1 as typeof chainId);
    const report = await getProjectDeploymentDiagnostics(f.client, {
      chainId,
      projectId,
    });
    expect(check(report, "network")?.status).toBe("unavailable");
    expect(f.readContract).not.toHaveBeenCalled();
  });
  test("does not turn an RPC error into a mismatch or expose raw URL secrets", async () => {
    const { client } = fixture({
      DIRECTORY: new Error(
        "https://secret:key@rpc.invalid/private?apiKey=secret",
      ),
    });
    const report = await getProjectDeploymentDiagnostics(client, {
      chainId,
      projectId,
    });
    expect(check(report, "hook.directory")?.status).toBe("unavailable");
    expect(JSON.stringify(report)).not.toContain("secret");
    expect(check(report, "hook.projectId")?.status).toBe("passed");
  });
  test("reports actual and expected binding mismatch", async () => {
    const { client } = fixture({ projectId: 99n, DIRECTORY: owner, owner });
    const report = await getProjectDeploymentDiagnostics(client, {
      chainId,
      projectId,
    });
    expect(check(report, "hook.projectId")).toMatchObject({
      status: "mismatch",
      actual: "99",
      expected: "45",
    });
    expect(check(report, "hook.directory")?.status).toBe("mismatch");
    expect(check(report, "hook.owner")?.status).toBe("mismatch");
  });
  test("reports unusual USD precision as information unless explicit expectations differ", async () => {
    const { client } = fixture();
    expect(
      check(
        await getProjectDeploymentDiagnostics(client, { chainId, projectId }),
        "shop.pricing",
      )?.status,
    ).toBe("info");
    expect(
      check(
        await getProjectDeploymentDiagnostics(client, {
          chainId,
          projectId,
          expectedPricing: { currency: 2, decimals: 6 },
        }),
        "shop.pricing",
      )?.status,
    ).toBe("mismatch");
  });
  test("preserves wiring evidence when pricing is unavailable", async () => {
    const { client } = fixture({ pricingContext: new Error("network") });
    const report = await getProjectDeploymentDiagnostics(client, {
      chainId,
      projectId,
    });
    expect(check(report, "shop.pricing")?.status).toBe("unavailable");
    expect(check(report, "hook.projectId")?.status).toBe("passed");
  });
  test("ordinary projects without shops are valid", async () => {
    const { client } = fixture(
      {
        currentRulesetOf: [
          { id: 1 },
          {
            dataHook: zeroAddress,
            useDataHookForPay: false,
            useDataHookForCashOut: false,
          },
        ],
      },
      false,
    );
    const report = await getProjectDeploymentDiagnostics(client, {
      chainId,
      projectId,
    });
    expect(report.kind).toBe("juicebox");
    expect(check(report, "hook.shop")?.status).toBe("info");
    expect(report.checks.some((item) => item.status === "mismatch")).toBe(
      false,
    );
  });
  test("direct shops may deliberately use a separate owner", async () => {
    const { client } = fixture({ owner: hook }, false);
    const report = await getProjectDeploymentDiagnostics(client, {
      chainId,
      projectId,
    });
    expect(check(report, "hook.owner")).toMatchObject({
      status: "info",
      actual: hook,
    });
  });
  test("custom controllers are unsupported without probing canonical project data", async () => {
    const { client, readContract } = fixture({ controllerOf: hook }, false);
    const report = await getProjectDeploymentDiagnostics(client, {
      chainId,
      projectId,
    });
    expect(report.kind).toBe("custom");
    expect(check(report, "project.controller")?.status).toBe("unsupported");
    expect(
      readContract.mock.calls.some(
        ([call]) => call.functionName === "currentRulesetOf",
      ),
    ).toBe(false);
  });
  test("unregistered factory does not make a custom hook invalid", async () => {
    const { client } = fixture({ deployerOf: zeroAddress }, false);
    const report = await getProjectDeploymentDiagnostics(client, {
      chainId,
      projectId,
    });
    expect(check(report, "hook.provenance")?.status).toBe("unsupported");
    expect(report.checks.some((item) => item.status === "mismatch")).toBe(
      false,
    );
  });
  test("custom non-721 hook is unsupported, while transport failure remains unavailable", async () => {
    for (const [error, status] of [
      [
        new ContractFunctionZeroDataError({ functionName: "STORE" }),
        "unsupported",
      ],
      [new Error("fetch failed"), "unavailable"],
    ] as const) {
      const { client } = fixture({ STORE: error }, false);
      const report = await getProjectDeploymentDiagnostics(client, {
        chainId,
        projectId,
      });
      expect(check(report, "hook.shop")?.status).toBe(status);
    }
  });
  test("resolves omnichain wrapper and its project-bound shop authority", async () => {
    const { client } = fixture(
      {
        currentRulesetOf: [
          { id: 1 },
          {
            dataHook: address("JBOmnichainDeployer"),
            useDataHookForPay: true,
            useDataHookForCashOut: true,
          },
        ],
        tiered721HookOf: [hook, false],
      },
      false,
    );
    const report = await getProjectDeploymentDiagnostics(client, {
      chainId,
      projectId,
    });
    expect(check(report, "hook.shop")).toMatchObject({
      status: "passed",
      actual: hook,
    });
    expect(check(report, "hook.owner")?.status).toBe("info");
  });
  test("disabled direct hook is still inspected without assuming disabled means wrong", async () => {
    const { client } = fixture(
      {
        currentRulesetOf: [
          { id: 1 },
          {
            dataHook: hook,
            useDataHookForPay: false,
            useDataHookForCashOut: false,
          },
        ],
      },
      false,
    );
    const report = await getProjectDeploymentDiagnostics(client, {
      chainId,
      projectId,
    });
    expect(check(report, "hook.shop")?.status).toBe("passed");
    expect(check(report, "hook.flags")?.status).toBe("info");
  });
  test("canonical revnet flag or missing shop mismatches are explicit", async () => {
    const { client } = fixture({
      currentRulesetOf: [
        { id: 1 },
        {
          dataHook: address("REVOwner"),
          useDataHookForPay: false,
          useDataHookForCashOut: true,
        },
      ],
      tiered721HookOf: zeroAddress,
    });
    const report = await getProjectDeploymentDiagnostics(client, {
      chainId,
      projectId,
    });
    expect(check(report, "hook.flags")?.status).toBe("mismatch");
    expect(check(report, "hook.shop")?.status).toBe("mismatch");
  });
  test("ownership alone does not prove canonical configuration", async () => {
    const { client } = fixture({
      hashedEncodedConfigurationOf: zeroHash,
      tiered721HookOf: zeroAddress,
    });
    const report = await getProjectDeploymentDiagnostics(client, {
      chainId,
      projectId,
    });
    expect(check(report, "project.provenance")?.status).toBe("unsupported");
    expect(check(report, "hook.shop")?.status).not.toBe("mismatch");
  });
  test("reads every requested operator capability against the hook owner; denied is informational", async () => {
    const { client, readContract } = fixture();
    const report = await getProjectDeploymentDiagnostics(client, {
      chainId,
      projectId,
      operator: owner,
    });
    const permissions = readContract.mock.calls.filter(
      ([call]) => call.functionName === "hasPermissions",
    );
    expect(permissions).toHaveLength(4);
    for (const [call] of permissions)
      expect(call.args).toEqual([
        owner,
        address("REVOwner"),
        projectId,
        expect.any(Array),
        true,
        true,
      ]);
    expect(check(report, "shop.permission.24")).toMatchObject({
      status: "info",
      actual: "Not allowed",
    });
  });
  test("owner authority does not need an operator grant", async () => {
    const { client, readContract } = fixture({}, false);
    const report = await getProjectDeploymentDiagnostics(client, {
      chainId,
      projectId,
      operator: owner,
    });
    expect(check(report, "shop.permission.24")?.actual).toBe("Allowed");
    expect(
      readContract.mock.calls.some(
        ([call]) => call.functionName === "hasPermissions",
      ),
    ).toBe(false);
  });
  test("no active ruleset is incomplete, not invalid", async () => {
    const { client } = fixture({ currentRulesetOf: [{ id: 0 }, {}] }, false);
    const report = await getProjectDeploymentDiagnostics(client, {
      chainId,
      projectId,
    });
    expect(check(report, "project.ruleset")?.status).toBe("info");
  });
  test("uninitialized or unreadable stores never pass capability verification", async () => {
    for (const [overrides, status] of [
      [{ STORE: zeroAddress }, "mismatch"],
      [{ maxTierIdOf: new Error("RPC unavailable") }, "unavailable"],
    ] as const) {
      const { client } = fixture(overrides);
      const report = await getProjectDeploymentDiagnostics(client, {
        chainId,
        projectId,
      });
      expect(check(report, "hook.store")?.status).toBe(status);
    }
  });
  test("custom permission registry and misbound project do not infer operator capability", async () => {
    for (const overrides of [{ PERMISSIONS: owner }, { projectId: 99n }]) {
      const { client, readContract } = fixture(overrides);
      const report = await getProjectDeploymentDiagnostics(client, {
        chainId,
        projectId,
        operator: owner,
      });
      expect(check(report, "shop.permissions")?.status).toBe("unsupported");
      expect(
        readContract.mock.calls.some(
          ([call]) => call.functionName === "hasPermissions",
        ),
      ).toBe(false);
    }
  });
  test("zero operator cannot gain authority from a renounced hook", async () => {
    const { client } = fixture({ owner: zeroAddress }, false);
    const report = await getProjectDeploymentDiagnostics(client, {
      chainId,
      projectId,
      operator: zeroAddress,
    });
    expect(check(report, "shop.permissions")?.status).toBe("unsupported");
  });
  test("dependent permission reads remain unavailable during RPC outages", async () => {
    for (const key of ["PERMISSIONS", "projectId", "owner"]) {
      const { client } = fixture({ [key]: new Error("network") });
      const report = await getProjectDeploymentDiagnostics(client, {
        chainId,
        projectId,
        operator: owner,
      });
      expect(check(report, "shop.permissions")?.status).toBe("unavailable");
      expect(check(report, "shop.permissions")?.message).toContain(
        "remain unknown",
      );
    }
  });
  test("fresh revnets still inspect independent hook bindings before their first stage", async () => {
    for (const currentRulesetOf of [[{ id: 0 }, {}], new Error("network")]) {
      const { client } = fixture({ currentRulesetOf });
      const report = await getProjectDeploymentDiagnostics(client, {
        chainId,
        projectId,
      });
      expect(check(report, "hook.projectId")?.status).toBe("passed");
      expect(check(report, "shop.pricing")?.status).toBe("info");
      expect(check(report, "hook.routing")).toBeUndefined();
    }
  });
  test("indexer failure wording never claims that indexing is behind", () => {
    expect(describeProjectDataStatus("unavailable")).toContain("unknown");
    expect(describeProjectDataStatus("missing")).toContain(
      "does not establish why",
    );
  });
});
