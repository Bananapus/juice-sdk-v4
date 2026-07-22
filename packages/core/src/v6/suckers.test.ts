import { describe, expect, test, vi } from "vitest";
import {
  PublicClient,
  decodeFunctionData,
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  pad,
  zeroHash,
  type Hex,
} from "viem";
import {
  CCIP_SUCKER_TRANSPORT_VALUES,
  JBClaim,
  SUCKER_EMPTY_TREE_ROOT,
  assertSuckerTransportValue,
  buildBridgeClaimTx,
  buildBridgePrepareTx,
  buildSyncAccountingDataTx,
  buildToRemoteTx,
  claimFromSuckerMovement,
  classifySuckerMovement,
  classifySuckerTransport,
  findSuckerTransportValue,
  getAllV6SuckerPairs,
  getSuckerMovements,
  relativeSuckerDrift,
  suckerBytes32ToAddress,
  suckerBranchRoot,
  suckerHashPair,
  suckerLeafHash,
  suckerLeafProof,
  suckerTimestampSeconds,
  suckerZeroHashes,
  getV6SuckerPairs,
  jbSuckerV6Abi,
} from "./suckers.js";
import { v6Address } from "./types.js";

const sucker = "0x00000000000000000000000000000000000000aa" as const;
const token = "0x000000000000000000000000000000000000000b" as const;
const beneficiary = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as const;
const paddedBeneficiary =
  "0x000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266" as const;
const remoteToken = "0x000000000000000000000000000000000000000c" as const;
const paddedRemoteToken = pad(remoteToken, { size: 32 });
const LEAVES: Hex[] = [
  "0x5fe7f977e71dba2ea1a68e21057beebb9be2ac30c6410aa38d4f3fbe41dcffd2",
  "0xf2ee15ea639b73fa3db9b34a245bdfa015c260c598b211bf05a1ecc4b3e3b4f2",
  "0x69c322e3248a5dfc29d73c5b0553b0185a35cd5bb6386747517ef7e53b15e287",
  "0xf343681465b9efe82c933c3e8748c70cb8aa06539c361de20f72eac04e766393",
  "0xdbb8d0f4c497851a5043c6363657698cb1387682cac2f786c731f8936109d795",
];
const ROOTS: Record<number, Hex> = {
  1: "0x72386aacefe2e6817d40eb1136c21c0d2dee0c641e150dce1c6aa8cfb7426635",
  2: "0xa4b82827a5b0628832c675ceed1498459188bda440bd094e75f236bda4f24478",
  3: "0xb98f04c3f907d54091ebdc4672c4f699f02971e123334f68a6d3d1cb3eca0831",
  5: "0x44b54e9715ad5f57d221f2f5ac1f1f8a82ef0e1892fa2ad3a026d1ceef240379",
};

const MOVEMENT_LEAVES = Array.from({ length: 3 }, (_, index) =>
  suckerLeafHash({
    beneficiary: paddedBeneficiary,
    projectTokenCount: BigInt(index + 1) * 100n,
    terminalTokenAmount: BigInt(index + 1) * 10n,
    metadata: zeroHash,
  }),
);

function movementRoot(count: number): Hex {
  const leaves = MOVEMENT_LEAVES.slice(0, count);
  return suckerBranchRoot(
    leaves[count - 1],
    suckerLeafProof(leaves, count - 1),
    count - 1,
  );
}

function outboxLogs(count = 3) {
  return MOVEMENT_LEAVES.slice(0, count).map((hashed, index) => ({
    blockNumber: BigInt(10 + index),
    args: {
      beneficiary: paddedBeneficiary,
      token,
      hashed,
      index: BigInt(index),
      root: movementRoot(index + 1),
      projectTokenCount: BigInt(index + 1) * 100n,
      terminalTokenAmount: BigInt(index + 1) * 10n,
      metadata: zeroHash,
      caller: beneficiary,
    },
  }));
}

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
      proof: Array.from(
        { length: 32 },
        () => zeroHash,
      ) as unknown as JBClaim["proof"],
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
        }),
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

  describe("Merkle proofs and movement state", () => {
    test("matches the contract leaf preimage order and rejects non-EVM words", () => {
      expect(
        suckerLeafHash({
          beneficiary: paddedBeneficiary,
          projectTokenCount: 100n,
          terminalTokenAmount: 10n,
          metadata: zeroHash,
        }),
      ).toBe(
        keccak256(
          encodeAbiParameters(
            [
              { type: "uint256" },
              { type: "uint256" },
              { type: "bytes32" },
              { type: "bytes32" },
            ],
            [100n, 10n, paddedBeneficiary, zeroHash],
          ),
        ),
      );
      expect(suckerBytes32ToAddress(paddedRemoteToken).toLowerCase()).toBe(
        remoteToken,
      );
      expect(() =>
        suckerBytes32ToAddress(`0x01${"00".repeat(31)}` as Hex),
      ).toThrow(/not an EVM address/);
    });

    test("reproduces pinned MerkleLib roots for dense outboxes", () => {
      expect(
        LEAVES.map((_, index) => keccak256(`0x0${index + 1}` as Hex)),
      ).toEqual(LEAVES);
      expect(suckerZeroHashes()).toHaveLength(33);
      expect(suckerZeroHashes()[32]).toBe(SUCKER_EMPTY_TREE_ROOT);
      expect(suckerHashPair(LEAVES[0], LEAVES[1])).not.toBe(
        suckerHashPair(LEAVES[1], LEAVES[0]),
      );
      for (const count of [1, 2, 3, 5]) {
        const set = LEAVES.slice(0, count);
        for (let index = 0; index < count; index++) {
          const proof = suckerLeafProof(set, index);
          expect(proof).toHaveLength(32);
          expect(suckerBranchRoot(set[index], proof, index)).toBe(ROOTS[count]);
        }
      }
      expect(() => suckerLeafProof(LEAVES, 5)).toThrow(/outside/);
    });

    test("reconstructs verified claimed, claimable, and pending movements", async () => {
      const sourceClient = {
        readContract: vi.fn(
          async ({ functionName }: { functionName: string }) => {
            if (functionName === "outboxOf") {
              return { numberOfClaimsSent: 2n, tree: { count: 3n } };
            }
            if (functionName === "remoteTokenFor") {
              return {
                enabled: true,
                emergencyHatch: false,
                minGas: 0,
                addr: paddedRemoteToken,
              };
            }
            throw new Error(`unexpected source read ${functionName}`);
          },
        ),
        getLogs: vi.fn(async () => outboxLogs()),
      } as unknown as PublicClient;
      const destinationClient = {
        readContract: vi.fn(
          async ({
            functionName,
            args,
          }: {
            functionName: string;
            args: readonly unknown[];
          }) => {
            if (functionName === "inboxOf")
              return { nonce: 1n, root: movementRoot(2) };
            if (functionName === "executedLeafHashOf") {
              return args[1] === 0n ? MOVEMENT_LEAVES[0] : zeroHash;
            }
            throw new Error(`unexpected destination read ${functionName}`);
          },
        ),
      } as unknown as PublicClient;

      const movements = await getSuckerMovements(
        sourceClient,
        destinationClient,
        {
          sourceSucker: sucker,
          destinationSucker: beneficiary,
          sourceToken: token,
          toBlock: 99n,
        },
      );
      expect(
        movements.map(({ status, canExecute }) => ({ status, canExecute })),
      ).toEqual([
        { status: "claimed", canExecute: false },
        { status: "claimable", canExecute: false },
        { status: "pending", canExecute: true },
      ]);
      expect(movements[1].proof).toHaveLength(32);
      expect(suckerBranchRoot(MOVEMENT_LEAVES[1], movements[1].proof!, 1)).toBe(
        movementRoot(2),
      );
      const claim = claimFromSuckerMovement(movements[1]);
      expect(claim.token.toLowerCase()).toBe(remoteToken);
      expect(claim.leaf.index).toBe(1n);
      expect(() => claimFromSuckerMovement(movements[2])).toThrow(/claimable/);
    });

    test("supports an explicitly verified historical token mapping", async () => {
      const sourceClient = {
        readContract: vi.fn(
          async ({ functionName }: { functionName: string }) =>
            functionName === "outboxOf"
              ? { numberOfClaimsSent: 1n, tree: { count: 1n } }
              : {
                  enabled: false,
                  emergencyHatch: true,
                  minGas: 0,
                  addr: zeroHash,
                },
        ),
        getLogs: vi.fn(async () => outboxLogs(1)),
      } as unknown as PublicClient;
      const destinationClient = {
        readContract: vi.fn(
          async ({ functionName }: { functionName: string }) =>
            functionName === "inboxOf"
              ? { nonce: 1n, root: movementRoot(1) }
              : zeroHash,
        ),
      } as unknown as PublicClient;

      await expect(
        getSuckerMovements(sourceClient, destinationClient, {
          sourceSucker: sucker,
          destinationSucker: beneficiary,
          sourceToken: token,
          remoteToken,
          toBlock: 99n,
        }),
      ).resolves.toMatchObject([{ remoteToken, status: "claimable" }]);
    });

    test("classifies lifecycle counters without conflating sent and delivered", () => {
      expect(
        classifySuckerMovement({
          executed: true,
          index: 0,
          deliveredCount: 2,
          sentCount: 2,
        }),
      ).toEqual({ status: "claimed", canExecute: false });
      expect(
        classifySuckerMovement({
          executed: false,
          index: 1,
          deliveredCount: 2,
          sentCount: 2,
        }),
      ).toEqual({ status: "claimable", canExecute: false });
      expect(
        classifySuckerMovement({
          executed: false,
          index: 2,
          deliveredCount: 1,
          sentCount: 2,
        }),
      ).toEqual({ status: "pending", canExecute: true });
    });
  });

  describe("transport helpers", () => {
    test("finds the first successful fee and guards CCIP zero transport", async () => {
      const simulate = vi.fn(async (value: bigint) => {
        if (value < 20n) throw new Error("insufficient fee");
      });
      await expect(
        findSuckerTransportValue([1n, 5n, 20n, 50n], simulate),
      ).resolves.toBe(20n);
      expect(simulate).toHaveBeenCalledTimes(3);
      expect(CCIP_SUCKER_TRANSPORT_VALUES.every((value) => value > 0n)).toBe(
        true,
      );
      expect(() => assertSuckerTransportValue("ccip", 100n, 100n)).toThrow(
        /positive native/,
      );
      expect(() => assertSuckerTransportValue("native", 0n)).not.toThrow();
      expect(() => assertSuckerTransportValue("unknown", 1n)).toThrow(
        /could not be verified/,
      );
    });

    test("positively probes CCIP and native families and otherwise fails closed", async () => {
      const ccip = {
        readContract: vi.fn(async () => beneficiary),
      } as unknown as PublicClient;
      await expect(classifySuckerTransport(ccip, sucker)).resolves.toBe("ccip");

      const native = {
        readContract: vi.fn(
          async ({ functionName }: { functionName: string }) => {
            if (functionName === "CCIP_ROUTER") throw new Error("not CCIP");
            if (functionName === "OPMESSENGER") return beneficiary;
            throw new Error("not this family");
          },
        ),
      } as unknown as PublicClient;
      await expect(classifySuckerTransport(native, sucker)).resolves.toBe(
        "native",
      );

      const unknown = {
        readContract: vi.fn(async () => {
          throw new Error("RPC unavailable");
        }),
      } as unknown as PublicClient;
      await expect(classifySuckerTransport(unknown, sucker)).resolves.toBe(
        "unknown",
      );
    });

    test("builds sync calldata and shares neutral accounting math", () => {
      const tx = buildSyncAccountingDataTx({
        chainId: 11155111,
        sucker,
        value: 123n,
      });
      expect(tx.value).toBe(123n);
      expect(
        decodeFunctionData({ abi: jbSuckerV6Abi, data: encodeFunctionData(tx) })
          .functionName,
      ).toBe("syncAccountingData");
      expect(relativeSuckerDrift(95n, 100n)).toBeCloseTo(0.05);
      expect(relativeSuckerDrift(0n, 0n)).toBe(0);
      expect(suckerTimestampSeconds((1_752_600_000n << 128n) | 42n)).toBe(
        1_752_600_000,
      );
    });
  });

  test("getAllV6SuckerPairs includes deprecated registry entries", async () => {
    const readContract = vi.fn(
      async ({ functionName }: { functionName: string }) => {
        if (functionName === "allSuckersOf") return [sucker];
        if (functionName === "peer") return paddedBeneficiary;
        if (functionName === "peerChainId") return 10n;
        throw new Error(`unexpected read ${functionName}`);
      },
    );
    const client = { readContract } as unknown as PublicClient;
    await expect(
      getAllV6SuckerPairs(client, { chainId: 11155111, projectId: 4n }),
    ).resolves.toEqual([
      { local: sucker, remote: beneficiary, remoteChainId: 10n },
    ]);
  });
});
