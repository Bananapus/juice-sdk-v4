import defaultWagmiConfig from "@jbm/wagmi-config";
import { react } from "@wagmi/cli/plugins";

const config = {
  ...defaultWagmiConfig,
  out: 'src/generated/juicebox.ts',
  plugins: [react()],
};

export default config;
