import { Address, PublicClient, getContract, zeroAddress } from "viem";
import { getDeploymentAddress } from "../address.js";
import { NATIVE_TOKEN, USDC_ADDRESSES } from "../constants.js";
import { jbDirectoryAbi } from "../generated/juicebox.js";
import { JBChainId } from "../types.js";
import { JBVersion } from "../version.js";
import { useConfig } from "wagmi";

export async function getProjectTerminalStore(
  config: ReturnType<typeof useConfig>,
  chainId: JBChainId,
  projectId: bigint,
  version: JBVersion = 4
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

  const directoryAddress = await getDeploymentAddress({
    family: "core",
    contractName: "JBDirectory",
    chainId,
    version,
  });

  const directory = getContract({ address: directoryAddress, abi: jbDirectoryAbi, client });

  const primaryNativeTerminal = await directory.read.primaryTerminalOf([projectId, NATIVE_TOKEN]);
  if (primaryNativeTerminal !== zeroAddress) return primaryNativeTerminal;

  return await directory.read.primaryTerminalOf([projectId, USDC_ADDRESSES[chainId]]);
}
