/**
 * The slice of `IJBSucker` that pair resolution reads.
 *
 * `peer()` is declared `bytes32` because that is what v6 returns
 * (`nana-suckers-v6/src/interfaces/IJBSucker.sol` — "as bytes32 for cross-VM
 * compatibility"). V5 declares it `address`, but an ABI-encoded `address` and
 * `bytes32` are byte-identical on the wire for an EVM address, so the same
 * entry decodes both versions; `suckerBytes32ToAddress` unpacks and validates
 * the low 20 bytes for either.
 */
export const JBSuckerAbi = [
  {
    type: "function",
    name: "peer",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "projectId",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "peerChainId",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
] as const;
