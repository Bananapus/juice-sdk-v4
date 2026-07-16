import {
  Address,
  Hex,
  PublicClient,
  getAddress,
  pad,
  sliceHex,
  zeroHash,
} from "viem";
import { jbSuckerRegistryAbi } from "../generated/juicebox.js";
import { JBChainId } from "../types.js";
import { v6Address } from "./types.js";

/**
 * Minimal v6 JBSucker ABI. v6 identifies remote beneficiaries as bytes32 (for cross-VM
 * compatibility) and adds an opaque `metadata` attribution payload to prepared leaves.
 */
export const jbSuckerV6Abi = [
  {
    type: "function",
    name: "prepare",
    inputs: [
      { name: "projectTokenCount", type: "uint256", internalType: "uint256" },
      { name: "beneficiary", type: "bytes32", internalType: "bytes32" },
      { name: "minTokensReclaimed", type: "uint256", internalType: "uint256" },
      { name: "token", type: "address", internalType: "address" },
      { name: "metadata", type: "bytes32", internalType: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "toRemote",
    inputs: [{ name: "token", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "claim",
    inputs: [
      {
        name: "claimData",
        type: "tuple",
        internalType: "struct JBClaim",
        components: [
          { name: "token", type: "address", internalType: "address" },
          {
            name: "leaf",
            type: "tuple",
            internalType: "struct JBLeaf",
            components: [
              { name: "index", type: "uint256", internalType: "uint256" },
              { name: "beneficiary", type: "bytes32", internalType: "bytes32" },
              { name: "projectTokenCount", type: "uint256", internalType: "uint256" },
              { name: "terminalTokenAmount", type: "uint256", internalType: "uint256" },
              { name: "metadata", type: "bytes32", internalType: "bytes32" },
            ],
          },
          { name: "proof", type: "bytes32[32]", internalType: "bytes32[32]" },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

/**
 * A leaf of a v6 sucker's merkle tree, representing tokens bridged for one beneficiary.
 * The beneficiary is a bytes32 (an EVM address left-padded to 32 bytes).
 */
export type JBLeaf = {
  index: bigint;
  beneficiary: Hex;
  projectTokenCount: bigint;
  terminalTokenAmount: bigint;
  metadata: Hex;
};

/**
 * A 32-entry bytes32 merkle inclusion proof, matching the fixed-size `bytes32[32]` the
 * sucker's `claim` function takes.
 */
// prettier-ignore
export type JBLeafProof = readonly [
  Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex,
  Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex,
  Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex,
  Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex,
];

/**
 * A claim against a v6 sucker: the terminal token being claimed, the merkle leaf, and its
 * inclusion proof. The proof must contain exactly 32 bytes32 entries.
 */
export type JBClaim = {
  token: Address;
  leaf: JBLeaf;
  proof: JBLeafProof;
};

/**
 * A v6 sucker pair for a project: the local sucker and its remote counterpart.
 * The registry stores remotes as bytes32; this type carries the unpacked EVM address.
 */
export type JBSuckerPairV6 = {
  local: Address;
  remote: Address;
  remoteChainId: bigint;
};

/**
 * Builds a `prepare` transaction on a v6 sucker, locking project tokens into an outbox
 * leaf destined for the remote chain.
 *
 * The beneficiary is an EVM address; it's left-padded to bytes32 internally (v6 suckers
 * identify beneficiaries as bytes32 for cross-VM compatibility).
 *
 * @param args.chainId The chain the sucker lives on.
 * @param args.sucker The sucker's address.
 * @param args.projectTokenCount The number of project tokens to bridge, as a fixed point
 * number with 18 decimals.
 * @param args.beneficiary The address that will claim the bridged tokens on the remote chain.
 * @param args.minTokensReclaimed The minimum number of terminal tokens to reclaim when the
 * project tokens are cashed out. Defaults to 0.
 * @param args.token The local terminal token being bridged alongside the project tokens.
 * @param args.metadata Opaque bytes32 attribution payload hashed into the leaf. Defaults to
 * zero.
 */
export function buildBridgePrepareTx({
  chainId,
  sucker,
  projectTokenCount,
  beneficiary,
  minTokensReclaimed = 0n,
  token,
  metadata = zeroHash,
}: {
  chainId: JBChainId;
  sucker: Address;
  projectTokenCount: bigint;
  beneficiary: Address;
  minTokensReclaimed?: bigint;
  token: Address;
  metadata?: Hex;
}): {
  chainId: JBChainId;
  address: Address;
  abi: typeof jbSuckerV6Abi;
  functionName: "prepare";
  args: readonly [bigint, Hex, bigint, Address, Hex];
} {
  return {
    chainId,
    address: sucker,
    abi: jbSuckerV6Abi,
    functionName: "prepare",
    args: [
      projectTokenCount,
      // Lowercase so the bytes32 is deterministic regardless of input checksum casing.
      pad(beneficiary.toLowerCase() as Address, { size: 32 }),
      minTokensReclaimed,
      token,
      metadata,
    ],
  };
}

/**
 * Builds a `claim` transaction on a v6 sucker, redeeming an inbox leaf that was bridged
 * from the remote chain.
 *
 * @param args.chainId The chain the sucker lives on.
 * @param args.sucker The sucker's address.
 * @param args.claim The claim: terminal token, leaf (with bytes32 beneficiary), and a
 * 32-entry bytes32 inclusion proof.
 */
export function buildBridgeClaimTx({
  chainId,
  sucker,
  claim,
}: {
  chainId: JBChainId;
  sucker: Address;
  claim: JBClaim;
}): {
  chainId: JBChainId;
  address: Address;
  abi: typeof jbSuckerV6Abi;
  functionName: "claim";
  args: readonly [JBClaim];
} {
  return {
    chainId,
    address: sucker,
    abi: jbSuckerV6Abi,
    functionName: "claim",
    args: [claim],
  };
}

/**
 * Builds a `toRemote` transaction on a v6 sucker, sending the outbox tree for a token to
 * the remote chain.
 *
 * Payable: bridging over CCIP requires a fee to be sent along as `value`. Native-bridge
 * suckers (OP/Base/Arbitrum) take no fee.
 *
 * @param args.chainId The chain the sucker lives on.
 * @param args.sucker The sucker's address.
 * @param args.token The local terminal token whose outbox tree should be bridged.
 * @param args.value The bridge fee to send along. Defaults to 0.
 */
export function buildToRemoteTx({
  chainId,
  sucker,
  token,
  value = 0n,
}: {
  chainId: JBChainId;
  sucker: Address;
  token: Address;
  value?: bigint;
}): {
  chainId: JBChainId;
  address: Address;
  abi: typeof jbSuckerV6Abi;
  functionName: "toRemote";
  args: readonly [Address];
  value: bigint;
} {
  return {
    chainId,
    address: sucker,
    abi: jbSuckerV6Abi,
    functionName: "toRemote",
    args: [token],
    value,
  };
}

/**
 * Reads a project's v6 sucker pairs from the JBSuckerRegistry on the given chain.
 *
 * The v6 registry stores remote suckers as bytes32 (for cross-VM compatibility); for EVM
 * peers the address is in the low 20 bytes, which this unpacks to a checksummed address.
 *
 * @param client A viem PublicClient connected to `chainId`.
 * @param args.chainId The chain to read the registry on.
 * @param args.projectId The project to look up pairs for.
 */
export async function getV6SuckerPairs(
  client: PublicClient,
  { chainId, projectId }: { chainId: JBChainId; projectId: bigint }
): Promise<JBSuckerPairV6[]> {
  const pairs = await client.readContract({
    address: v6Address("JBSuckerRegistry", chainId),
    abi: jbSuckerRegistryAbi,
    functionName: "suckerPairsOf",
    args: [projectId],
  });

  return pairs.map((pair) => ({
    local: pair.local,
    remote: getAddress(sliceHex(pair.remote, 12)),
    remoteChainId: pair.remoteChainId,
  }));
}
