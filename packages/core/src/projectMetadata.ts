import { Address, PublicClient, getContract } from "viem";
import { jbControllerABI } from "./generated/juicebox";
import { JBProjectMetadata } from "./types";
import { ipfsGatewayUrl } from "./utils/ipfs";

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

  const metadataCid = (await JBController.read.metadataOf([
    args.projectId,
  ])) as string;

  return metadataCid;
};

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
  // TODO: Use juiceFetch here.
  const res = (await fetch(ipfsUrl).then((res) => res.json())) as
    | JBProjectMetadata
    | undefined;

  return res;
};
