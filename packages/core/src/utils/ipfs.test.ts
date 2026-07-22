import bs58 from "bs58";
import { describe, expect, test } from "vitest";
import {
  bytes32ToCidV0,
  cidFromIpfsUri,
  decodeEncodedIpfsUri,
  decodeEncodedIpfsUriCandidates,
  encodeIpfsUri,
  ipfsAssetPath,
  ipfsGatewayUrl,
  ipfsUri,
  isIpfsCid,
} from "./ipfs.js";

const cid = "QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR";
const cidCorrespondingHex =
  "c3c4733ec8affd06cf9e9ff50ffc6bcd2ec85a6170004bb709669c31de94391a";
const digest =
  "0xbdb815453bdd29f5af61a541e6382e7aace86076a9ba3ca3f6b3bdf7c58aa27f";
const cidV0 = "Qmb7EZvTHUeVTDi6YmwDFQvKEfCR4UGciUka24coJcNJzS";
const dagPbCidV1 =
  "bafybeif5xakuko65fh226ynfihtdqlt2vtuga5vjxi6kh5vtxx34lcvcp4";
const rawCidV1 = "bafkreif5xakuko65fh226ynfihtdqlt2vtuga5vjxi6kh5vtxx34lcvcp4";

describe("IPFS utilities", () => {
  test("generates IPFS gateway URL correctly", () => {
    expect(ipfsGatewayUrl(cid)).toEqual(`https://ipfs.io/ipfs/${cid}`);
    expect(ipfsGatewayUrl(cid, "another-gateway.com")).toEqual(
      `https://another-gateway.com/ipfs/${cid}`,
    );
    expect(ipfsGatewayUrl(undefined)).toEqual("https://ipfs.io/ipfs/undefined");
  });

  test("encodes IPFS CID correctly", () => {
    const hexEncoded = encodeIpfsUri(cid);
    expect(hexEncoded).toEqual("0x" + cidCorrespondingHex);
  });

  test("decodes hex-encoded IPFS CID correctly", () => {
    const hexEncoded = "0x" + cidCorrespondingHex;
    const decodedCid = decodeEncodedIpfsUri(hexEncoded);
    expect(decodedCid).toEqual(cid);
  });

  test("encodes and then decodes IPFS CID correctly", () => {
    const expectedHex = Buffer.from(bs58.decode(cid).slice(2)).toString("hex");
    const hexEncoded = "0x" + expectedHex;
    const decodedCid = decodeEncodedIpfsUri(hexEncoded);
    expect(decodedCid).toEqual(cid);
  });

  test("normalizes native, path-gateway, and subdomain-gateway locations", () => {
    expect(ipfsUri(cid, "/metadata.json")).toBe(`ipfs://${cid}/metadata.json`);
    expect(ipfsAssetPath(`ipfs://${cid}/metadata.json`)).toBe(
      `${cid}/metadata.json`,
    );
    expect(
      ipfsAssetPath(`https://gateway.example/ipfs/${cid}/metadata.json`),
    ).toBe(`${cid}/metadata.json`);
    expect(
      ipfsAssetPath(`https://${dagPbCidV1}.ipfs.example/metadata.json`),
    ).toBe(`${dagPbCidV1}/metadata.json`);
    expect(cidFromIpfsUri(`ipfs://${cid}/metadata.json`)).toBe(cid);
    expect(ipfsAssetPath("https://example.com/metadata.json")).toBeNull();
    expect(ipfsAssetPath("ipfs://not-a-cid/metadata.json")).toBeNull();
    expect(
      ipfsAssetPath("https://gateway.example/ipfs/not-a-cid/metadata.json"),
    ).toBeNull();
  });

  test("encodes equivalent CIDv0 and DAG-PB CIDv1 values identically", () => {
    expect(encodeIpfsUri(`ipfs://${cidV0}`)).toBe(digest);
    expect(encodeIpfsUri(`ipfs://${dagPbCidV1}`)).toBe(digest);
    expect(() => encodeIpfsUri(`ipfs://${rawCidV1}`)).toThrow(/DAG-PB/);
    expect(() => encodeIpfsUri(`ipfs://${cidV0}/metadata.json`)).toThrow(
      /cannot include a path/,
    );
  });

  test("reconstructs CIDv0 and raw CIDv1 candidates from a stored digest", () => {
    expect(decodeEncodedIpfsUriCandidates(digest)).toEqual([
      `ipfs://${cidV0}`,
      `ipfs://${rawCidV1}`,
    ]);
    expect(bytes32ToCidV0(digest)).toBe(cidV0);
    expect(bytes32ToCidV0(`0x${"0".repeat(64)}`)).toBeNull();
    expect(decodeEncodedIpfsUriCandidates("0x1234")).toBeNull();
  });

  test("recognizes supported CID shapes", () => {
    expect(isIpfsCid(cidV0)).toBe(true);
    expect(isIpfsCid(dagPbCidV1)).toBe(true);
    expect(isIpfsCid("not-a-cid")).toBe(false);
  });
});
