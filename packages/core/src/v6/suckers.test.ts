import { describe, expect, test, vi } from "vitest";
import {
  PublicClient,
  decodeFunctionData,
  encodeFunctionData,
  pad,
  zeroHash,
} from "viem";
import {
  JBClaim,
  buildBridgeClaimTx,
  buildBridgePrepareTx,
  buildToRemoteTx,
  getV6SuckerPairs,
  jbSuckerV6Abi,
} from "./suckers.js";
import { v6Address } from "./types.js";

const sucker = "0x00000000000000000000000000000000000000aa" as const;
const token = "0x000000000000000000000000000000000000000b" as const;
const beneficiary = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as const;
const paddedBeneficiary =
  "0x000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266" as const;

describe("suckers", () => {
  describe("buildBridgePrepareTx", () => {
    test("left-pads the beneficiary address to bytes32 and encodes", () => {
      const tx = buildBridgePrepareTx({
        chainId: 11155111,
        sucker,
        projectTokenCount: 100n * 10n ** 18n,
        beneficiary,
        token,
      });

      expect(tx.address).toEqual(sucker);
      expect(tx.functionName).toEqual("prepare");
      expect(tx.args[1]).toEqual(paddedBeneficiary);
      // minTokensReclaimed and metadata default to 0.
      expect(tx.args[2]).toEqual(0n);
      expect(tx.args[4]).toEqual(zeroHash);

      const data = encodeFunctionData(tx);
      const decoded = decodeFunctionData({ abi: jbSuckerV6Abi, data });
      expect(decoded.functionName).toEqual("prepare");
      expect(decoded.args).toEqual([
        100n * 10n ** 18n,
        paddedBeneficiary,
        0n,
        token,
        zeroHash,
      ]);
    });

    test("passes explicit minTokensReclaimed and metadata through", () => {
      const metadata = pad("0x1234", { size: 32 });
      const tx = buildBridgePrepareTx({
        chainId: 1,
        sucker,
        projectTokenCount: 1n,
        beneficiary,
        minTokensReclaimed: 42n,
        token,
        metadata,
      });

      expect(tx.args[2]).toEqual(42n);
      expect(tx.args[4]).toEqual(metadata);
      expect(() => encodeFunctionData(tx)).not.toThrow();
    });
  });

  describe("buildBridgeClaimTx", () => {
    const claim: JBClaim = {
      token,
      leaf: {
        index: 3n,
        beneficiary: paddedBeneficiary,
        projectTokenCount: 5n,
        terminalTokenAmount: 7n,
        metadata: zeroHash,
      },
      proof: Array.from({ length: 32 }, () => zeroHash) as unknown as JBClaim["proof"],
    };

    test("encodes a full JBClaim", () => {
      const tx = buildBridgeClaimTx({ chainId: 11155111, sucker, claim });

      expect(tx.address).toEqual(sucker);
      expect(tx.functionName).toEqual("claim");

      const data = encodeFunctionData(tx);
      const decoded = decodeFunctionData({ abi: jbSuckerV6Abi, data });
      expect(decoded.functionName).toEqual("claim");
      expect(decoded.args[0]).toEqual(claim);
    });

    test("rejects proofs that aren't exactly 32 entries", () => {
      const tx = buildBridgeClaimTx({
        chainId: 11155111,
        sucker,
        claim: {
          ...claim,
          proof: claim.proof.slice(0, 31) as unknown as JBClaim["proof"],
        },
      });

      expect(() => encodeFunctionData(tx)).toThrow();
    });
  });

  describe("buildToRemoteTx", () => {
    test("is payable with a default value of 0", () => {
      const tx = buildToRemoteTx({ chainId: 11155111, sucker, token });

      expect(tx.value).toEqual(0n);
      expect(tx.functionName).toEqual("toRemote");
      expect(() => encodeFunctionData(tx)).not.toThrow();
    });

    test("passes an explicit CCIP fee value through", () => {
      const tx = buildToRemoteTx({
        chainId: 11155111,
        sucker,
        token,
        value: 123n,
      });

      expect(tx.value).toEqual(123n);
      expect(tx.args).toEqual([token]);
    });
  });

  describe("getV6SuckerPairs", () => {
    test("reads the registry and unpacks bytes32 remotes to checksummed addresses", async () => {
      const readContract = vi.fn().mockResolvedValue([
        {
          local: sucker,
          remote:
            "0x000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266",
          remoteChainId: 10n,
        },
      ]);
      const client = { readContract } as unknown as PublicClient;

      const pairs = await getV6SuckerPairs(client, {
        chainId: 11155111,
        projectId: 4n,
      });

      expect(readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: v6Address("JBSuckerRegistry", 11155111),
          functionName: "suckerPairsOf",
          args: [4n],
        })
      );
      expect(pairs).toEqual([
        {
          local: sucker,
          remote: beneficiary, // checksummed low-20-bytes of the bytes32 remote
          remoteChainId: 10n,
        },
      ]);
    });
  });
});
