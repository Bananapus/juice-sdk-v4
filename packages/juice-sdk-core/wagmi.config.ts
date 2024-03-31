import { defineConfig } from "@wagmi/cli";
import { etherscan } from "@wagmi/cli/plugins";
import dotenv from "dotenv";
import { Address } from "viem";
import { CHAINS, DEFAULT_CHAIN } from "../../juice.config";
import addresses from "./src/generated/addresses.json";

dotenv.config({ path: "../../.env" });

const juiceboxContracts = Object.keys(addresses).map((name) => {
  return {
    name,
    address: CHAINS.reduce((acc, chainId) => {
      return {
        ...acc,
        [chainId]: (addresses as any)[name][chainId] as Address,
      };
    }, {}) as Record<typeof DEFAULT_CHAIN, Address> &
      Partial<Record<keyof typeof CHAINS, Address>>,
  };
});

console.log(juiceboxContracts)

export default defineConfig([
  {
    out: "src/generated/juicebox.ts",
    plugins: [
      etherscan({
        apiKey: process.env.ETHERSCAN_API_KEY!,
        chainId: DEFAULT_CHAIN, // the default chain. Shouldn't actually be used because we define the chainId+address for each contract.
        contracts: [...juiceboxContracts],
      }),
      // actions({
      //   watchContractEvent: false,
      // }),
      // TODO this imports wagmi/actions, which is an esm-only module. we need it to be a cjs. it should be using viem/actions under the hood, but its not.
    ],
  },
]);
