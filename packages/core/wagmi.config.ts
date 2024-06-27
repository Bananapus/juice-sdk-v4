import defaultWagmiConfig from "@jbm/wagmi-config";
import { actions } from "@wagmi/cli/plugins";

export default {
  ...defaultWagmiConfig,
  out: "src/generated/juicebox.ts",
  plugins: [actions()],
};
