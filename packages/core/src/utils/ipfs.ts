import bs58 from "bs58";

const PUBLIC_IPFS_GATEWAY_HOSTNAME = "ipfs.io";

export function ipfsGatewayUrl(
  cid: string | undefined,
  gatewayHostname?: string
): string {
  return `https://${
    gatewayHostname ?? PUBLIC_IPFS_GATEWAY_HOSTNAME
  }/ipfs/${cid}`;
}

/**
 * Return a hex-encoded CID to store on-chain.
 * Hex-encoded CIDs are used to store some CIDs on-chain because they are more gas-efficient.
 */
export function encodeIpfsUri(cid: string) {
  return "0x" + Buffer.from(bs58.decode(cid).slice(2)).toString("hex");
}

/**
 * Return the IPFS CID from a given hex-endoded string.
 * Hex-encoded CIDs are used to store some CIDs on-chain because they are more gas-efficient.
 */
export function decodeEncodedIpfsUri(hex: string) {
  // Add default ipfs values for first 2 bytes:
  // - function:0x12=sha2, size:0x20=256 bits
  // - also cut off leading "0x"
  const hashHex = "1220" + hex.slice(2);
  const hashBytes = Buffer.from(hashHex, "hex");
  const hashStr = bs58.encode(hashBytes);
  return hashStr;
}
