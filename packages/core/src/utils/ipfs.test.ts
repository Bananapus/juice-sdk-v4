import { describe, expect, test } from 'vitest';
import { ipfsGatewayUrl, encodeIpfsUri, decodeEncodedIpfsUri } from './ipfs';
import bs58 from "bs58";

const cid = 'QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR'
const cidCorrespondingHex = 'c3c4733ec8affd06cf9e9ff50ffc6bcd2ec85a6170004bb709669c31de94391a'

describe("IPFS utilities", () => {
  
  test("generates IPFS gateway URL correctly", () => {
    expect(ipfsGatewayUrl(cid)).toEqual(`https://ipfs.io/ipfs/${cid}`);
    expect(ipfsGatewayUrl(cid, "another-gateway.com")).toEqual(`https://another-gateway.com/ipfs/${cid}`);
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
});
