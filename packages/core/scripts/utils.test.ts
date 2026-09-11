import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { JBCoreContracts, JBBuybackHookContracts } from "../src/contracts.js";
import {
  deploymentFilePath,
  getContractAddress,
  getHistoricalContract,
  isMissingDeployment,
} from "./utils.js";

let root: string;
const address = "0x1111111111111111111111111111111111111111";
function artifact(
  chain: string,
  name: string,
  value: unknown = { address, abi: [] },
) {
  const directory = join(root, "deployments", chain);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, `${name}.json`), JSON.stringify(value));
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
  test("an absent local mainnet record cannot fall back to a published npm address", async () => {
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
  test("preserves the previous generation while mainnet still records it as canonical", async () => {
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
