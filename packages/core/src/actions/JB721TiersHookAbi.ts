export const DATA_HOOK_Abi = [
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "terminal", type: "address" },
          { internalType: "address", name: "payer", type: "address" },
          {
            components: [
              { internalType: "address", name: "token", type: "address" },
              { internalType: "uint256", name: "value", type: "uint256" },
              {
                internalType: "uint256",
                name: "decimals",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "currency",
                type: "uint256",
              },
            ],
            internalType: "struct JBTokenAmount",
            name: "amount",
            type: "tuple",
          },
          { internalType: "uint256", name: "projectId", type: "uint256" },
          { internalType: "uint256", name: "rulesetId", type: "uint256" },
          { internalType: "address", name: "beneficiary", type: "address" },
          { internalType: "uint256", name: "weight", type: "uint256" },
          {
            internalType: "uint256",
            name: "reservedRate",
            type: "uint256",
          },
          { internalType: "bytes", name: "metadata", type: "bytes" },
        ],
        internalType: "struct JBBeforePayRecordedContext",
        name: "context",
        type: "tuple",
      },
    ],
    name: "beforePayRecordedWith",
    outputs: [
      { internalType: "uint256", name: "weight", type: "uint256" },
      {
        components: [
          {
            internalType: "contract IJBPayHook",
            name: "hook",
            type: "address",
          },
          { internalType: "uint256", name: "amount", type: "uint256" },
          { internalType: "bytes", name: "metadata", type: "bytes" },
        ],
        internalType: "struct JBPayHookSpecification[]",
        name: "hookSpecifications",
        type: "tuple[]",
      },
    ],

    stateMutability: "view",
    type: "function",
  } as const,
];
