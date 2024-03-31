import { defineConfig } from "@wagmi/cli";
import { etherscan, react } from "@wagmi/cli/plugins";
import dotenv from "dotenv";
import { Address } from "viem";
import { CHAINS, DEFAULT_CHAIN } from "../../juice.config";
import addresses from "juice-sdk-core/src/generated/addresses.json" assert { type: "json" };

dotenv.config();

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

export default defineConfig([
  {
    out: "src/generated/juicebox.ts",
    plugins: [
      etherscan({
        apiKey: process.env.ETHERSCAN_API_KEY!,
        chainId: DEFAULT_CHAIN,
        contracts: [...juiceboxContracts],
      }),
      react(),
    ],
  },
]);
