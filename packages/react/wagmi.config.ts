import defaultWagmiConfig, { JB721HookContracts } from "@jbm/wagmi-config";
import { react } from "@wagmi/cli/plugins";
import { pascalCase } from "change-case";

const config = {
  ...defaultWagmiConfig,
  out: "src/generated/juicebox.ts",
  plugins: [
    react({
      getHookName({ type, contractName, itemName }) {
        /**
         * Fix a naming conflict.
         *
         * To read the STORE of a JB721TiersHook, use useReadJb721TiersHookStoreAddress instead of useReadJb721TiersHookStore.
         *
         * We have 2 contracts: JB721TiersHook and JB721TiersHookStore.
         * Wagmi CLI tries to generate a readJb721TiersHookStore for JB721TiersHook.store(),
         * AND and readJb721TiersHookStore for generic contract reads.
         *
         */
        if (
          contractName.toLowerCase() ===
            JB721HookContracts.JB721TiersHook.toLowerCase() &&
          itemName === "Store"
        ) {
          return `use${pascalCase(type)}${contractName}${itemName}Address`;
        }

        return `use${pascalCase(type)}${contractName}${itemName ?? ""}${type === "watch" ? "Event" : ""}`;
      },
    }),
  ],
};

export default config;
