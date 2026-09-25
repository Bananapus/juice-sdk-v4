import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  JBCoreContracts,
  JBBuybackHookContracts,
  JBRouterTerminalContracts,
  StickyContracts,
} from "../src/contracts.js";
import {
  deploymentFilePath,
  getAllContractNames,
  getContractAddress,
  getHistoricalContract,
  isMissingDeployment,
} from "./utils.js";

let root: string;
const address = "0x1111111111111111111111111111111111111111";
function artifact(
  chain: string,
  name: string,
  value: Record<string, unknown> = {},
) {
  const directory = join(root, "deployments", chain);
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    join(directory, `${name}.json`),
    JSON.stringify({
      address,
      abi: [],
      format: "sphinx-sol-ct-artifact-1",
      contractName: name.replace(/_deprecated\d*$/, ""),
      chainId: chain === "ethereum" ? "0x1" : "0xaa36a7",
      receipt: {
        status: "0x1",
        blockNumber: "0x123",
        transactionHash: `0x${"1".repeat(64)}`,
        blockHash: `0x${"2".repeat(64)}`,
        contractAddress: null,
      },
      ...value,
    }),
  );
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "sdk-deployments-"));
  mkdirSync(join(root, "deployments"));
  vi.stubEnv("PROTOCOL_DEPLOYMENTS_DIR", root);
});
afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(root, { recursive: true, force: true });
});

describe("executed v6 deployment sources", () => {
  test("resolves the flat tree and explicit deployments directory", async () => {
    artifact("sepolia", "JBRatioPriceFeed");
    expect(
      await getContractAddress(JBCoreContracts.JBRatioPriceFeed, 6, 11155111),
    ).toBe(address);
    vi.stubEnv("PROTOCOL_DEPLOYMENTS_DIR", join(root, "deployments"));
    expect(
      deploymentFilePath(
        "@bananapus/core-v6/deployments/sepolia/JBRatioPriceFeed.json",
      ),
    ).toBe(join(root, "deployments/sepolia/JBRatioPriceFeed.json"));
  });
  test("a synthetic absent chain record cannot fall back to a published npm address", async () => {
    await expect(
      getContractAddress(JBBuybackHookContracts.JBBuybackHook, 6, 1),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
  test("a malformed artifact fails instead of pretending the chain is absent", async () => {
    artifact("sepolia", "JBRatioPriceFeed", { address: "invalid", abi: [] });
    await expect(
      getContractAddress(JBCoreContracts.JBRatioPriceFeed, 6, 11155111),
    ).rejects.toThrow("Invalid deployment artifact");
    expect(isMissingDeployment(new SyntaxError("invalid JSON"))).toBe(false);
  });
  test("preserves the previous generation on a synthetic chain that still records it as canonical", async () => {
    artifact("sepolia", "JBBuybackHook_deprecated1");
    artifact("ethereum", "JBBuybackHook");
    expect(
      (
        await getHistoricalContract(
          JBBuybackHookContracts.JBBuybackHook,
          "previous",
          1,
        )
      ).address,
    ).toBe(address);
  });
  test("a mismatched canonical address is not assigned to a historical generation", async () => {
    artifact("sepolia", "JBBuybackHook_deprecated1");
    artifact("ethereum", "JBBuybackHook", {
      address: "0x2222222222222222222222222222222222222222",
      abi: [],
    });
    await expect(
      getHistoricalContract(
        JBBuybackHookContracts.JBBuybackHook,
        "previous",
        1,
      ),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
});

describe("rollout receipt evidence", () => {
  const validReceipt = {
    status: "0x1",
    blockNumber: "0x123",
    transactionHash: `0x${"1".repeat(64)}`,
    blockHash: `0x${"2".repeat(64)}`,
  };
  test.each([
    ["missing receipt", { receipt: undefined }],
    ["failed receipt", { receipt: { ...validReceipt, status: "0x0" } }],
    ["missing status", { receipt: { ...validReceipt, status: undefined } }],
    ["unmined block", { receipt: { ...validReceipt, blockNumber: "0x0" } }],
    [
      "invalid transaction",
      { receipt: { ...validReceipt, transactionHash: "0x1234" } },
    ],
    [
      "missing block hash",
      { receipt: { ...validReceipt, blockHash: undefined } },
    ],
    [
      "placeholder block hash",
      { receipt: { ...validReceipt, blockHash: `0x${"0".repeat(64)}` } },
    ],
    ["wrong chain", { chainId: "0x1" }],
    ["wrong identity", { contractName: "JBRouterTerminal" }],
    ["unknown format", { format: "proposal" }],
  ])("rejects a canonical gateway with %s", async (_, invalid) => {
    artifact("sepolia", "JBRouterTerminalGateway", invalid);
    await expect(
      getContractAddress(
        JBRouterTerminalContracts.JBRouterTerminalGateway,
        6,
        11155111,
      ),
    ).rejects.toThrow("Invalid executed rollout artifact");
  });
  test.each([
    JBBuybackHookContracts.JBBuybackHook,
    JBRouterTerminalContracts.JBRouterTerminal,
    JBCoreContracts.JBRatioPriceFeed,
  ])("requires execution evidence for %s too", async (name) => {
    artifact("sepolia", name, { receipt: undefined });
    await expect(getContractAddress(name, 6, 11155111)).rejects.toThrow(
      "Invalid executed rollout artifact",
    );
  });
  test("a retired filename cannot bypass receipt validation", async () => {
    artifact("sepolia", "JBBuybackHook_deprecated1", {
      receipt: { ...validReceipt, status: "0x0" },
    });
    await expect(
      getHistoricalContract(
        JBBuybackHookContracts.JBBuybackHook,
        "previous",
        11155111,
      ),
    ).rejects.toThrow("Invalid executed rollout artifact");
  });
  test("accepts successful numeric receipts and CREATE2 contractAddress=null", async () => {
    artifact("sepolia", "JBRouterTerminalGateway", {
      chainId: 11155111,
      receipt: {
        ...validReceipt,
        status: 1,
        blockNumber: 291,
        contractAddress: null,
      },
    });
    expect(
      await getContractAddress(
        JBRouterTerminalContracts.JBRouterTerminalGateway,
        6,
        11155111,
      ),
    ).toBe(address);
  });
});

describe("Sticky deployment source", () => {
  test("reads Sticky from its own checkout, never from deploy-all-v6", async () => {
    artifact("base", "StickyDeployer");
    const sticky = mkdtempSync(join(tmpdir(), "sdk-sticky-"));
    try {
      mkdirSync(join(sticky, "deployments", "base"), { recursive: true });
      const stickyAddress = "0x2d31dd23aeeb021669e18070a46af34d856b2e29";
      writeFileSync(
        join(sticky, "deployments", "base", "StickyDeployer.json"),
        JSON.stringify({ address: stickyAddress, abi: [] }),
      );
      vi.stubEnv("STICKY_DEPLOYMENTS_DIR", sticky);
      expect(
        await getContractAddress(StickyContracts.StickyDeployer, 6, 8453),
      ).toBe(stickyAddress);
      expect(
        deploymentFilePath(
          "@bananapus/sticky-v6/deployments/base/StickyDeployer.json",
        ),
      ).toBe(join(sticky, "deployments/base/StickyDeployer.json"));
    } finally {
      rmSync(sticky, { recursive: true, force: true });
    }
  });
  test("has no v4 or v5 deployment", () => {
    for (const version of [4, 5] as const)
      expect(getAllContractNames(version)).not.toContain(
        StickyContracts.StickyDeployer,
      );
    expect(getAllContractNames(6)).toEqual(
      expect.arrayContaining(Object.values(StickyContracts)),
    );
  });
});
