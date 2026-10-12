import type { JBChainId } from "../types.js";

// @ballkidz/defifa 1.0.2, revision d3c46dd4fe9a093cc46ed5eb2106395d2a19b860.
// Shared by native inventory authentication and metadata interpretation.
const mainnetDefifa = {
  deployer: "0x375afb2a4b1cadae99f8863f96fc1aebcbaf8bde",
  implementation: "0xe2229dd6a7da99ebb8f7d749612edd1b2addafe1",
} as const;
const testnetDefifa = {
  deployer: "0xbfa54a97099485c134f06c9a08a4909c26fd7318",
  implementation: "0x3184783d0e3cbf5a821794b246c71a3d1a0cf312",
} as const;
export const defifaDeployments: Partial<
  Record<JBChainId, typeof mainnetDefifa | typeof testnetDefifa>
> = {
  1: mainnetDefifa,
  10: mainnetDefifa,
  8453: mainnetDefifa,
  42161: mainnetDefifa,
  11155111: testnetDefifa,
  11155420: testnetDefifa,
  84532: testnetDefifa,
  421614: testnetDefifa,
};
export const defifaStore = "0x69913acf79dbba170d9efafe605ee62b42164f9c";
