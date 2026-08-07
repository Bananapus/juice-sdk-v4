import {
  Address,
  PublicClient,
  getContract,
  isAddressEqual,
  zeroAddress,
} from "viem";
import { jbControllerAbi } from "../generated/juicebox.js";
import { JBProjectMetadata } from "../types.js";
import { ipfsAssetPath, ipfsGatewayUrl, isIpfsCid } from "../utils/ipfs.js";

/**
 * Fetch the onchain metadata URI for the given project via the given
 * JBController contract, and resolve it to a validated IPFS asset path
 * (`<cid>[/path]`). `ipfs://` URIs, HTTP gateway URLs, and bare CIDs are all
 * recognized; anything else (including path-less garbage such as a plain file
 * name) resolves to `undefined` rather than a bogus gateway fetch.
 */
const getMetadataAssetPath = async (
  publicClient: PublicClient,
  args: {
    jbControllerAddress: Address;
    projectId: bigint;
  },
) => {
  if (isAddressEqual(args.jbControllerAddress, zeroAddress)) {
    return;
  }

  const JBController = getContract({
    address: args.jbControllerAddress,
    abi: jbControllerAbi,
    client: publicClient,
  });

  // ipfs://<cid>[/path], an HTTP gateway URL, or a bare CID.
  const metadataUri = (await JBController.read.uriOf([args.projectId])).trim();

  return (
    ipfsAssetPath(metadataUri) ??
    (isIpfsCid(metadataUri) ? metadataUri : undefined)
  );
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
  },
): Promise<JBProjectMetadata | undefined> => {
  const metadataAssetPath = await getMetadataAssetPath(publicClient, args);
  const ipfsUrl = metadataAssetPath
    ? ipfsGatewayUrl(metadataAssetPath, opts?.ipfsGatewayHostname)
    : null;
  if (!ipfsUrl) {
    return;
  }
  const res = (await fetch(ipfsUrl).then((res) => res.json())) as
    | JBProjectMetadata
    | undefined;

  return res;
};
