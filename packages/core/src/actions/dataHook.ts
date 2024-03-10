import {
  Address,
  PublicClient,
  getContract,
  isAddressEqual,
  zeroAddress,
} from "viem";
import {
  jbAddressRegistryABI,
  jbAddressRegistryAddress,
} from "../generated/juicebox";

// TODO add
const JB_721_HOOK_DEPLOYER_ADDRESSES = {
  11155111: "0xA5C0cddE627E8A864a6da439ecB59E7fc285dE5c",
  11155420: "0xf4065f2C14EC4728779c8bAb6c693A632F394681",
};

const DATA_HOOK_ABI = [
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

export async function getHookSpecifications(
  publicClient: PublicClient,
  args: {
    dataHookAddress: Address;
    projectId: bigint;
    rulesetId: bigint;
  }
) {
  const dataHook = getContract({
    address: args.dataHookAddress,
    abi: DATA_HOOK_ABI,
    publicClient,
  });

  const [_, hookSpecifications] = await dataHook.read.beforePayRecordedWith([
    {
      projectId: args.projectId,
      rulesetId: args.rulesetId,
      terminal: zeroAddress,
      beneficiary: zeroAddress,
      amount: {
        token: zeroAddress,
        value: 0n,
        decimals: 0n,
        currency: 0n,
      },
      payer: zeroAddress,
      weight: 0n,
      reservedRate: 0n,
      metadata: zeroAddress,
    },
  ]);

  return hookSpecifications;
}

/**
 * Find the 721 data hook for a given project and ruleset.
 *
 * NOTE this is an expensive call. Best to run it server-side and cache it.
 */
export async function find721DataHook(
  publicClient: PublicClient,
  args: {
    dataHookAddress: Address;
    projectId: bigint;
    rulesetId: bigint;
  }
) {
  const hookSpecs = await getHookSpecifications(publicClient, {
    dataHookAddress: args.dataHookAddress,
    projectId: args.projectId,
    rulesetId: args.rulesetId,
  });

  const chainId = publicClient.chain?.id;
  if (!chainId) {
    throw new Error("[juice-sdk-core] No chain ID on public client.");
  }

  const deployerAddress =
    JB_721_HOOK_DEPLOYER_ADDRESSES[
      chainId as keyof typeof JB_721_HOOK_DEPLOYER_ADDRESSES
    ];

  const registerAddress =
    jbAddressRegistryAddress[chainId as keyof typeof jbAddressRegistryAddress];

  if (!registerAddress) {
    throw new Error(
      `[juice-sdk-core] No JBAddressRegistry address for chain ${chainId}.`
    );
  }

  const registry = getContract({
    address: registerAddress,
    abi: jbAddressRegistryABI,
    publicClient,
  });

  const res = await Promise.all(
    hookSpecs.map(async (h) => {
      const deployerOf = await registry.read.deployerOf([h.hook]);
      return isAddressEqual(deployerOf, deployerAddress as Address);
    })
  );

  const index = res.findIndex((r) => r);
  if (index === -1) {
    return null;
  }

  return hookSpecs[index].hook;
}
