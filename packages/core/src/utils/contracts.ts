import { Address, PublicClient, getContract, zeroAddress } from "viem";
import { NATIVE_TOKEN, USDC_ADDRESSES } from "../constants.js";
import { jbContractAddress, jbDirectoryAbi } from "../generated/juicebox.js";
import { JBChainId } from "../types.js";
import { JBCoreContracts, JBVersion } from "@jbm/wagmi-config/contracts";
import { useConfig } from "wagmi";
import { Contract } from "@jbm/wagmi-config/contracts";

export function getJBContractAddress(contract: Contract, version: JBVersion, chainId: JBChainId) {
  return jbContractAddress[version][contract][chainId];
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
