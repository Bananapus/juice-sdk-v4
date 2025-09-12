/**
 * IMPORTANT
 *
 * Update JBSuckerAbi.ts whenever it changes
 */

import { mainnet } from "viem/chains";
import { getAllContractNames, getContract, JBCoreContracts } from "./contracts.js";

async function getContractsList() {
  const names = getAllContractNames(4);
  const contracts = await Promise.all(names.map((name) => getContract(name, 4, mainnet.id)));
  return contracts.map(({ name, abi }) => ({ name, abi: parseAbi(name, abi) }));
}

const contracts = await getContractsList();

export default { out: "src/generated.ts", contracts, plugins: [] };

function parseAbi(contractName: string, abi: any) {
  /**
   * @note there are 2 versions of `currentReclaimableSurplusOf` in JBTerminalStore ABI. We only want one of them.
   * Filter out the one we don't want.
   */
  if (contractName === JBCoreContracts.JBTerminalStore) {
    return abi.filter(
      (a: any) => !(a.name === "currentReclaimableSurplusOf" && a.inputs.length === 4)
    );
  }
  return abi;
}
