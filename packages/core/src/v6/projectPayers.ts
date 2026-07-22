import { decodeEventLog, isAddressEqual, type Address, type Hex } from "viem";
import type { JBChainId } from "../types.js";

/**
 * Canonical JBProjectPayerDeployer address. The v6 deployment uses the same
 * CREATE2 address on every chain supported by the SDK.
 */
export const JB_PROJECT_PAYER_DEPLOYER =
  "0x7321740fd0dcf73dd3e2aa8fc060454abfce9517" as Address;

/** JBProjectPayerDeployer surface needed by web clients. */
export const jbProjectPayerDeployerAbi = [
  {
    type: "function",
    name: "deployProjectPayer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "defaultProjectId", type: "uint256" },
      { name: "defaultBeneficiary", type: "address" },
      { name: "defaultMemo", type: "string" },
      { name: "defaultMetadata", type: "bytes" },
      { name: "defaultAddToBalance", type: "bool" },
      { name: "owner", type: "address" },
    ],
    outputs: [{ name: "projectPayer", type: "address" }],
  },
  {
    type: "event",
    name: "DeployProjectPayer",
    anonymous: false,
    inputs: [
      { name: "projectPayer", type: "address", indexed: true },
      { name: "defaultProjectId", type: "uint256", indexed: false },
      { name: "defaultBeneficiary", type: "address", indexed: false },
      { name: "defaultMemo", type: "string", indexed: false },
      { name: "defaultMetadata", type: "bytes", indexed: false },
      { name: "defaultAddToBalance", type: "bool", indexed: false },
      { name: "directory", type: "address", indexed: false },
      { name: "owner", type: "address", indexed: false },
      { name: "caller", type: "address", indexed: false },
    ],
  },
] as const;

/** Validate and normalize metadata bytes forwarded by a project payer. */
export function normalizeProjectPayerMetadata(value?: string): Hex {
  const metadata = value?.trim() || "0x";
  if (!/^0x(?:[0-9a-fA-F]{2})*$/.test(metadata)) {
    throw new Error("Project payer metadata must be whole hex bytes.");
  }
  return metadata as Hex;
}

/** Build a JBProjectPayerDeployer.deployProjectPayer transaction request. */
export function buildDeployProjectPayerTx(args: {
  chainId: JBChainId;
  projectId: bigint;
  beneficiary: Address;
  memo?: string;
  metadata?: string;
  addToBalance?: boolean;
  owner: Address;
}) {
  if (args.projectId <= 0n) {
    throw new Error("A project payer requires a positive project ID.");
  }

  return {
    chainId: args.chainId,
    address: JB_PROJECT_PAYER_DEPLOYER,
    abi: jbProjectPayerDeployerAbi,
    functionName: "deployProjectPayer" as const,
    args: [
      args.projectId,
      args.beneficiary,
      args.memo ?? "",
      normalizeProjectPayerMetadata(args.metadata),
      args.addToBalance ?? false,
      args.owner,
    ] as const,
  };
}

/** Minimal receipt-log shape needed to decode a project-payer deployment. */
export interface ProjectPayerDeployLog {
  address: Address;
  data: Hex;
  topics: readonly Hex[];
}

/**
 * Decode the payer address from a canonical JBProjectPayerDeployer event.
 * Emitter verification prevents an unrelated same-signature log from being
 * mistaken for the newly deployed payer.
 */
export function decodeDeployedProjectPayer(
  log: ProjectPayerDeployLog,
): Address | null {
  if (!isAddressEqual(log.address, JB_PROJECT_PAYER_DEPLOYER)) return null;

  try {
    const decoded = decodeEventLog({
      abi: jbProjectPayerDeployerAbi,
      eventName: "DeployProjectPayer",
      data: log.data,
      topics: log.topics as [Hex, ...Hex[]],
      strict: true,
    });
    return decoded.eventName === "DeployProjectPayer"
      ? decoded.args.projectPayer
      : null;
  } catch {
    return null;
  }
}

/** Return the first canonical project-payer deployment found in a receipt. */
export function projectPayerFromDeployLogs(
  logs: readonly ProjectPayerDeployLog[],
): Address | null {
  for (const log of logs) {
    const payer = decodeDeployedProjectPayer(log);
    if (payer) return payer;
  }
  return null;
}
