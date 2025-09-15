import { Address, PublicClient, getContract, zeroAddress } from "viem";
import { useConfig } from "wagmi";
import { NATIVE_TOKEN, USDC_ADDRESSES } from "../constants.js";
import { JBCoreContracts, JBVersion } from "../contracts.js";
import { jbContractAddress, jbDirectoryAbi } from "../generated/juicebox.js";
import { JBChainId } from "../types.js";

// Type that maps version to its available contracts
type ContractsForVersion<V extends JBVersion> = V extends 4
  ? keyof (typeof jbContractAddress)["4"]
  : V extends 5
    ? keyof (typeof jbContractAddress)["5"]
    : never;

export function getJBContractAddress<V extends JBVersion>(
  contract: ContractsForVersion<V>,
  version: V,
  chainId: JBChainId
): `0x${string}` {
  const versionKey = version.toString() as keyof typeof jbContractAddress;
  const chainKey = chainId.toString();

  return (jbContractAddress[versionKey] as any)?.[contract]?.[chainKey];
}

export async function getProjectTerminalStore(
  config: ReturnType<typeof useConfig>,
  chainId: JBChainId,
  projectId: bigint,
  version: JBVersion
) {
  const terminal = await getPrimaryNativeTerminal(config, chainId, projectId, version);

  const data = await fetch(
    `https://juicebox.money/api/juicebox/v4/terminal/${terminal}/jb-terminal-store?chainId=${chainId}`
  ).then((res) => res.json());

  return data.terminalStoreAddress as Address;
}

export async function getPrimaryNativeTerminal(
  config: ReturnType<typeof useConfig>,
  chainId: JBChainId,
  projectId: bigint,
  version: JBVersion
) {
  const client = config.getClient({ chainId: Number(chainId) }) as PublicClient;

  const address = getJBContractAddress(JBCoreContracts.JBDirectory, version, chainId);
  const directory = getContract({ address, abi: jbDirectoryAbi, client });

  const primaryNativeTerminal = await directory.read.primaryTerminalOf([projectId, NATIVE_TOKEN]);
  if (primaryNativeTerminal !== zeroAddress) return primaryNativeTerminal;

  return await directory.read.primaryTerminalOf([projectId, USDC_ADDRESSES[chainId]]);
}
