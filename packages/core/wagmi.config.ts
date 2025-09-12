import defaultWagmiConfig from "@jbm/wagmi-config";

export default {
  ...defaultWagmiConfig,
  out: "src/generated/juicebox.ts",
  plugins: [
    // actions({
    //   getActionName({ type, contractName, itemName }) {
    //     /**
    //      * Fix a naming conflict.
    //      *
    //      * To read the STORE of a JB721TiersHook, use readJb721TiersHookStoreAddress instead of readJb721TiersHookStore.
    //      *
    //      * We have 2 contracts: JB721TiersHook and JB721TiersHookStore.
    //      * Wagmi CLI tries to generate a readJb721TiersHookStore for JB721TiersHook.store(),
    //      * AND and readJb721TiersHookStore for generic contract reads.
    //      *
    //      */
    //     if (
    //       contractName.toLowerCase() ===
    //         JB721HookContracts.JB721TiersHook.toLowerCase() &&
    //       itemName === "Store"
    //     ) {
    //       return `${type}${contractName}${itemName}Address`;
    //     }
    //     return `${type}${contractName}${itemName ?? ""}${type === "watch" ? "Event" : ""}`;
    //   },
    // }),
  ],
};
