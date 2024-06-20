import {
  Address,
  PublicClient,
  getContract,
  isAddressEqual,
  zeroAddress,
} from "viem";
import { jbControllerAbi } from "../generated/juicebox.js";
import { JBProjectMetadata } from "../types.js";
import { ipfsGatewayUrl } from "../utils/ipfs.js";

/**
 * Fetch the onchain metadata CID for the given project, using the given JBController contract.
 */
const getMetadataCid = async (
  publicClient: PublicClient,
  args: {
    jbControllerAddress: Address;
    projectId: bigint;
  }
) => {
  if (isAddressEqual(args.jbControllerAddress, zeroAddress)) {
    return;
  }

  const JBController = await getContract({
    address: args.jbControllerAddress,
    abi: jbControllerAbi,
    client: publicClient,
  });

  // ipfs://cid or https://cid, probably
  const metadataUri = await JBController.read.uriOf([args.projectId]);

  const metadataCid = metadataUri.split("/").pop();

  return metadataCid;
};

/**
 * Fetch the project metadata for the given [projectId]
 * @param publicClient - The Viem Public Client to use for fetching on-chain data.
 * @link https://viem.sh/docs/clients/public.html
 * @param opts.ipfsGatewayHostname - The hostname of the IPFS gateway to use. Defaults to "ipfs.io"
 *
 */
export const getProjectMetadata = async (
  publicClient: PublicClient,
  args: {
    jbControllerAddress: Address;
    projectId: bigint;
  },
  opts?: {
    ipfsGatewayHostname?: string;
  }
): Promise<JBProjectMetadata | undefined> => {
  const metadataCid = await getMetadataCid(publicClient, args);
  if (!metadataCid) {
    return;
  }
  const ipfsUrl = ipfsGatewayUrl(metadataCid, opts?.ipfsGatewayHostname);
  const res = (await fetch(ipfsUrl).then((res) => res.json())) as
    | JBProjectMetadata
    | undefined;

  return res;
};
