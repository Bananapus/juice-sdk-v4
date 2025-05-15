import { NATIVE_TOKEN } from "../constants.js";
import { readJbDirectoryPrimaryTerminalOf } from "../generated/juicebox.js";
import { JBChainId } from "../types.js";
import { Address } from "viem";

export async function getProjectTerminalStore(
  config: any, // TODO wagmi config
  chainId: JBChainId,
  projectId: bigint
) {
  const primaryNativeTerminal = await readJbDirectoryPrimaryTerminalOf(config, {
    chainId: Number(chainId) as JBChainId,
    args: [projectId, NATIVE_TOKEN],
  });
  const terminalStoreData = await fetch(
    `https://juicebox.money/api/juicebox/v4/terminal/${primaryNativeTerminal}/jb-terminal-store?chainId=${chainId}`
  ).then((res) => res.json());
  const terminalStore = terminalStoreData.terminalStoreAddress as Address;

  return terminalStore;
}
