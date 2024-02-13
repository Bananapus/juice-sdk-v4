import { Address, PublicClient, getContract } from "viem";
import { jbControllerABI, readJbDirectory } from "./generated/juicebox";
import { JBProjectMetadata } from "./types";
import { ipfsGatewayUrl } from "./utils/ipfs";

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
  const JBController = await getContract({
    address: args.jbControllerAddress,
    abi: jbControllerABI,
    publicClient,
  });

  const metadataCid = await JBController.read.uriOf([args.projectId]);

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
  const ipfsUrl = ipfsGatewayUrl(metadataCid, opts?.ipfsGatewayHostname);
  const res = (await fetch(ipfsUrl).then((res) => res.json())) as
    | JBProjectMetadata
    | undefined;

  return res;
};
