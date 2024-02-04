import { defineConfig } from "@wagmi/cli";
import { etherscan, react } from "@wagmi/cli/plugins";
import dotenv from "dotenv";
import { mainnet } from "wagmi/chains";
import { CHAINS } from "../../juice.config";
import addresses from "./addresses.json";

dotenv.config();

const juiceboxContracts = Object.keys(addresses).map((name) => {
  return {
    name,
    address: CHAINS.reduce((acc, chainId) => {
      return {
        ...acc,
        [chainId]: (addresses as any)[name][chainId] as `0x${string}`,
      };
    }, {}) as Record<keyof typeof CHAINS, `0x${string}`>,
  };
});

export default defineConfig([
  {
    out: "src/generated/juicebox.ts",
    plugins: [
      etherscan({
        apiKey: process.env.ETHERSCAN_API_KEY!,
        chainId: mainnet.id,
        contracts: [...juiceboxContracts],
      }),
      react(),
    ],
  },
]);
