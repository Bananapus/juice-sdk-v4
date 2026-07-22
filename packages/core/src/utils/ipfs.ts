import bs58 from "bs58";
import type { Hex } from "viem";

const PUBLIC_IPFS_GATEWAY_HOSTNAME = "ipfs.io";
const IPFS_URI_PREFIX = "ipfs://";
const SHA2_256_MULTIHASH_PREFIX = new Uint8Array([0x12, 0x20]);
const BASE32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";

function validatedIpfsAssetPath(value: string): string | null {
  const cid = value.split("/")[0];
  return cid && isIpfsCid(cid) ? value : null;
}

export function ipfsGatewayUrl(
  cid: string | undefined,
  gatewayHostname?: string,
): string {
  return `https://${
    gatewayHostname ?? PUBLIC_IPFS_GATEWAY_HOSTNAME
  }/ipfs/${cid}`;
}

/** Return an `ipfs://` URI for a CID and optional path. */
export function ipfsUri(cid: string, path?: string): string {
  const suffix = path ? `/${path.replace(/^\/+/, "")}` : "";
  return `${IPFS_URI_PREFIX}${cid}${suffix}`;
}

/** Whether a value uses the native `ipfs://` URI scheme. */
export function isIpfsUri(value: string): boolean {
  return value.startsWith(IPFS_URI_PREFIX);
}

/**
 * Extract the immutable `<cid>[/path]` part of an IPFS URI or HTTP gateway URL.
 *
 * Both path gateways (`https://host/ipfs/<cid>`) and CID subdomain gateways
 * (`https://<cid>.ipfs.host/path`) are recognized. Returns `null` for ordinary
 * HTTP URLs and malformed values.
 */
export function ipfsAssetPath(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith(IPFS_URI_PREFIX)) {
    const path = trimmed.slice(IPFS_URI_PREFIX.length);
    return validatedIpfsAssetPath(path);
  }

  try {
    const url = new URL(trimmed);
    const pathMatch = /^\/ipfs\/([^/]+)(\/.*)?$/i.exec(url.pathname);
    if (pathMatch) {
      return validatedIpfsAssetPath(`${pathMatch[1]}${pathMatch[2] ?? ""}`);
    }

    const [subdomain, marker] = url.hostname.split(".");
    if (marker === "ipfs" && isIpfsCid(subdomain)) {
      return `${subdomain}${url.pathname === "/" ? "" : url.pathname}`;
    }
  } catch {
    return null;
  }

  return null;
}

/** Return the CID (without a path) from an IPFS URI or gateway URL. */
export function cidFromIpfsUri(value: string): string | null {
  const path = ipfsAssetPath(value);
  return path?.split("/")[0] || null;
}

/** A lightweight CIDv0 / base32 CIDv1 shape check. */
export function isIpfsCid(value: string): boolean {
  return (
    /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(value) ||
    /^b[a-z2-7]{20,120}$/.test(value.toLowerCase())
  );
}

function bytesToHex(bytes: Uint8Array): Hex {
  return `0x${Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;
}

function hexToBytes(value: string): Uint8Array {
  const hex = value.startsWith("0x") ? value.slice(2) : value;
  if (!/^[0-9a-fA-F]*$/.test(hex) || hex.length % 2 !== 0) {
    throw new Error("Expected an even-length hexadecimal value.");
  }
  return Uint8Array.from({ length: hex.length / 2 }, (_, index) =>
    Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16),
  );
}

function cidV0Digest(cid: string): Uint8Array {
  const decoded = bs58.decode(cid);
  if (
    decoded.length !== 34 ||
    decoded[0] !== SHA2_256_MULTIHASH_PREFIX[0] ||
    decoded[1] !== SHA2_256_MULTIHASH_PREFIX[1]
  ) {
    throw new Error("Expected a CIDv0 using a 32-byte sha2-256 multihash.");
  }
  return decoded.slice(2);
}

function base32Encode(bytes: Uint8Array): string {
  let result = "";
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += BASE32_ALPHABET[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
      buffer &= bits === 0 ? 0 : (1 << bits) - 1;
    }
  }
  if (bits > 0) result += BASE32_ALPHABET[(buffer << (5 - bits)) & 31];
  return result;
}

function base32Decode(value: string): Uint8Array {
  const input = value.trim().toLowerCase().replace(/^b/, "").replace(/=+$/, "");
  const output: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const character of input) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index < 0) throw new Error(`Invalid base32 character: ${character}.`);
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((buffer >>> (bits - 8)) & 0xff);
      bits -= 8;
      buffer &= bits === 0 ? 0 : (1 << bits) - 1;
    }
  }
  return Uint8Array.from(output);
}

function readVarint(
  bytes: Uint8Array,
  offset: number,
): { value: number; offset: number } {
  let value = 0;
  let shift = 0;
  for (let index = offset; index < bytes.length; index++) {
    const byte = bytes[index];
    value += (byte & 0x7f) * 2 ** shift;
    if ((byte & 0x80) === 0) return { value, offset: index + 1 };
    shift += 7;
    if (shift > 49) throw new Error("The CID varint is too large.");
  }
  throw new Error("The CID varint is truncated.");
}

function cidV1Digest(cid: string): Uint8Array {
  if (!cid.toLowerCase().startsWith("b")) {
    throw new Error("Expected a base32 CIDv1.");
  }
  const bytes = base32Decode(cid);
  const version = readVarint(bytes, 0);
  const codec = readVarint(bytes, version.offset);
  const hashCode = readVarint(bytes, codec.offset);
  const hashLength = readVarint(bytes, hashCode.offset);
  if (version.value !== 1) throw new Error("Expected a CIDv1.");
  if (codec.value !== 0x70) {
    throw new Error(
      "Only DAG-PB CIDv1 metadata can be stored in a bytes32 IPFS slot.",
    );
  }
  if (hashCode.value !== 0x12 || hashLength.value !== 32) {
    throw new Error("Expected a CID using a 32-byte sha2-256 multihash.");
  }
  const digest = bytes.slice(hashLength.offset);
  if (digest.length !== hashLength.value) {
    throw new Error("The CID multihash length is invalid.");
  }
  return digest;
}

/**
 * Return a hex-encoded CID to store on-chain.
 * Hex-encoded CIDs are used to store some CIDs on-chain because they are more gas-efficient.
 */
export function encodeIpfsUri(cid: string) {
  const assetPath = ipfsAssetPath(cid);
  if (assetPath?.includes("/")) {
    throw new Error("A bytes32 IPFS digest cannot include a path.");
  }
  const candidate = assetPath ?? cid;
  return bytesToHex(
    candidate.toLowerCase().startsWith("b")
      ? cidV1Digest(candidate)
      : cidV0Digest(candidate),
  );
}

/**
 * Return the IPFS CID from a given hex-endoded string.
 * Hex-encoded CIDs are used to store some CIDs on-chain because they are more gas-efficient.
 */
export function decodeEncodedIpfsUri(hex: string) {
  const digest = hexToBytes(hex);
  if (digest.length !== 32) {
    throw new Error("Expected a bytes32 IPFS digest.");
  }
  if (digest.every((byte) => byte === 0)) {
    throw new Error("The zero bytes32 value does not contain an IPFS CID.");
  }
  return bs58.encode(new Uint8Array([...SHA2_256_MULTIHASH_PREFIX, ...digest]));
}

/** Strict alias describing the on-chain representation more explicitly. */
export const cidV0ToBytes32 = encodeIpfsUri;

/**
 * Decode a bytes32 sha2-256 digest into a CIDv0, returning `null` for the zero
 * value or malformed input instead of throwing.
 */
export function bytes32ToCidV0(value: string): string | null {
  try {
    return decodeEncodedIpfsUri(value);
  } catch {
    return null;
  }
}

/**
 * Decode a stored tier metadata digest into equivalent immutable URI forms.
 *
 * The first candidate is the conventional DAG-PB CIDv0 used by Juicebox 721
 * metadata. The second is a raw-codec CIDv1 over the same multihash, retained
 * as a fallback for content that was pinned with a raw block codec. Legacy
 * 33-byte values with a leading version marker are accepted as well.
 */
export function decodeEncodedIpfsUriCandidates(
  value: string | undefined | null,
): readonly [string, string] | null {
  if (!value) return null;
  let hex = value.startsWith("0x") ? value.slice(2) : value;
  if (hex.length === 66) hex = hex.slice(2);
  const cidV0 = bytes32ToCidV0(hex);
  if (!cidV0) return null;

  const multihash = new Uint8Array([
    ...SHA2_256_MULTIHASH_PREFIX,
    ...hexToBytes(hex),
  ]);
  // CIDv1 (0x01), raw codec (0x55), then the same sha2-256 multihash.
  const rawCidV1 = `b${base32Encode(
    new Uint8Array([0x01, 0x55, ...multihash]),
  )}`;
  return [ipfsUri(cidV0), ipfsUri(rawCidV1)];
}
