import { Address, zeroAddress } from "viem";
import { NATIVE_TOKEN, USDC_ADDRESSES } from "../constants.js";
import { readJbDirectoryPrimaryTerminalOf } from "../generated/juicebox.js";
import { JBChainId } from "../types.js";

export async function getProjectTerminalStore(
  config: any, // TODO wagmi config
  chainId: JBChainId,
  projectId: bigint
) {
  const terminal = await getPrimaryNativeTerminal(config, chainId, projectId);

  const terminalStoreData = await fetch(
    `https://juicebox.money/api/juicebox/v4/terminal/${terminal}/jb-terminal-store?chainId=${chainId}`
  ).then((res) => res.json());

  const terminalStore = terminalStoreData.terminalStoreAddress as Address;
  return terminalStore;
}

export async function getPrimaryNativeTerminal(config: any, chainId: JBChainId, projectId: bigint) {
  const primaryNativeTerminal = await readJbDirectoryPrimaryTerminalOf(config, {
    chainId,
    args: [projectId, NATIVE_TOKEN],
  });

  if (primaryNativeTerminal !== zeroAddress) return primaryNativeTerminal;

  return await readJbDirectoryPrimaryTerminalOf(config, {
    chainId,
    args: [projectId, USDC_ADDRESSES[chainId]],
  });
}
