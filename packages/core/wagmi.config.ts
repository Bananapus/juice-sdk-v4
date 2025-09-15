import { getContractsList } from "./scripts/utils.js";

export default {
  contracts: await getContractsList(),
  out: "src/generated/juicebox.ts",
  plugins: [],
};
