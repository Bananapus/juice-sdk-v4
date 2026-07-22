import {
  decodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionData,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";
import { sepolia } from "viem/chains";
import { describe, expect, test } from "vitest";
import {
  JB_PROJECT_PAYER_DEPLOYER,
  buildDeployProjectPayerTx,
  decodeDeployedProjectPayer,
  jbProjectPayerDeployerAbi,
  normalizeProjectPayerMetadata,
  projectPayerFromDeployLogs,
  type ProjectPayerDeployLog,
} from "./projectPayers.js";

const PAYER = "0x1111111111111111111111111111111111111111" as Address;

function deploymentLog(
  address = JB_PROJECT_PAYER_DEPLOYER,
): ProjectPayerDeployLog {
  const topics = encodeEventTopics({
    abi: jbProjectPayerDeployerAbi,
    eventName: "DeployProjectPayer",
    args: { projectPayer: PAYER },
  });
  const data = encodeAbiParameters(
    [
      { type: "uint256" },
      { type: "address" },
      { type: "string" },
      { type: "bytes" },
      { type: "bool" },
      { type: "address" },
      { type: "address" },
      { type: "address" },
    ],
    [
      7n,
      zeroAddress,
      "hello",
      "0x1234",
      false,
      zeroAddress,
      zeroAddress,
      zeroAddress,
    ],
  );
  return { address, data, topics: topics as readonly Hex[] };
}

describe("project payer deployment", () => {
  test("builds canonical deploy calldata", () => {
    const tx = buildDeployProjectPayerTx({
      chainId: sepolia.id,
      projectId: 7n,
      beneficiary: PAYER,
      memo: "hello",
      metadata: "0x1234",
      addToBalance: true,
      owner: zeroAddress,
    });
    expect(tx.address).toBe(JB_PROJECT_PAYER_DEPLOYER);
    const decoded = decodeFunctionData({
      abi: jbProjectPayerDeployerAbi,
      data: encodeFunctionData(tx),
    });
    expect(decoded.functionName).toBe("deployProjectPayer");
    expect(decoded.args).toEqual([
      7n,
      PAYER,
      "hello",
      "0x1234",
      true,
      zeroAddress,
    ]);
  });

  test("uses safe defaults and rejects invalid values", () => {
    const tx = buildDeployProjectPayerTx({
      chainId: sepolia.id,
      projectId: 1n,
      beneficiary: zeroAddress,
      owner: zeroAddress,
    });
    expect(tx.args.slice(2)).toEqual(["", "0x", false, zeroAddress]);
    expect(normalizeProjectPayerMetadata(" 0x12ab ")).toBe("0x12ab");
    expect(() => normalizeProjectPayerMetadata("0x123")).toThrow();
    expect(() =>
      buildDeployProjectPayerTx({
        chainId: sepolia.id,
        projectId: 0n,
        beneficiary: zeroAddress,
        owner: zeroAddress,
      }),
    ).toThrow(/positive project ID/);
  });

  test("only decodes events from the canonical deployer", () => {
    const log = deploymentLog();
    expect(decodeDeployedProjectPayer(log)).toBe(PAYER);
    expect(projectPayerFromDeployLogs([log])).toBe(PAYER);
    expect(
      decodeDeployedProjectPayer(
        deploymentLog("0x2222222222222222222222222222222222222222"),
      ),
    ).toBeNull();
  });
});
