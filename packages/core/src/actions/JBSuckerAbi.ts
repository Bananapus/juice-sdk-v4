export const JBSuckerAbi = [
  {
    type: "function",
    name: "peer",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract IJBSucker",
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
