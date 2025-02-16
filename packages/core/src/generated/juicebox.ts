import {
  createReadContract,
  createWriteContract,
  createSimulateContract,
  createWatchContractEvent,
} from 'wagmi/codegen'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ERC2771Forwarder
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 */
export const erc2771ForwarderAbi = [
  {
    type: 'constructor',
    inputs: [{ name: 'name', internalType: 'string', type: 'string' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'eip712Domain',
    outputs: [
      { name: 'fields', internalType: 'bytes1', type: 'bytes1' },
      { name: 'name', internalType: 'string', type: 'string' },
      { name: 'version', internalType: 'string', type: 'string' },
      { name: 'chainId', internalType: 'uint256', type: 'uint256' },
      { name: 'verifyingContract', internalType: 'address', type: 'address' },
      { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
      { name: 'extensions', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'request',
        internalType: 'struct ERC2771Forwarder.ForwardRequestData',
        type: 'tuple',
        components: [
          { name: 'from', internalType: 'address', type: 'address' },
          { name: 'to', internalType: 'address', type: 'address' },
          { name: 'value', internalType: 'uint256', type: 'uint256' },
          { name: 'gas', internalType: 'uint256', type: 'uint256' },
          { name: 'deadline', internalType: 'uint48', type: 'uint48' },
          { name: 'data', internalType: 'bytes', type: 'bytes' },
          { name: 'signature', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    name: 'execute',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'requests',
        internalType: 'struct ERC2771Forwarder.ForwardRequestData[]',
        type: 'tuple[]',
        components: [
          { name: 'from', internalType: 'address', type: 'address' },
          { name: 'to', internalType: 'address', type: 'address' },
          { name: 'value', internalType: 'uint256', type: 'uint256' },
          { name: 'gas', internalType: 'uint256', type: 'uint256' },
          { name: 'deadline', internalType: 'uint48', type: 'uint48' },
          { name: 'data', internalType: 'bytes', type: 'bytes' },
          { name: 'signature', internalType: 'bytes', type: 'bytes' },
        ],
      },
      {
        name: 'refundReceiver',
        internalType: 'address payable',
        type: 'address',
      },
    ],
    name: 'executeBatch',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'nonces',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'request',
        internalType: 'struct ERC2771Forwarder.ForwardRequestData',
        type: 'tuple',
        components: [
          { name: 'from', internalType: 'address', type: 'address' },
          { name: 'to', internalType: 'address', type: 'address' },
          { name: 'value', internalType: 'uint256', type: 'uint256' },
          { name: 'gas', internalType: 'uint256', type: 'uint256' },
          { name: 'deadline', internalType: 'uint48', type: 'uint48' },
          { name: 'data', internalType: 'bytes', type: 'bytes' },
          { name: 'signature', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    name: 'verify',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  { type: 'event', anonymous: false, inputs: [], name: 'EIP712DomainChanged' },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'signer',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'nonce',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      { name: 'success', internalType: 'bool', type: 'bool', indexed: false },
    ],
    name: 'ExecutedForwardRequest',
  },
  {
    type: 'error',
    inputs: [{ name: 'deadline', internalType: 'uint48', type: 'uint48' }],
    name: 'ERC2771ForwarderExpiredRequest',
  },
  {
    type: 'error',
    inputs: [
      { name: 'signer', internalType: 'address', type: 'address' },
      { name: 'from', internalType: 'address', type: 'address' },
    ],
    name: 'ERC2771ForwarderInvalidSigner',
  },
  {
    type: 'error',
    inputs: [
      { name: 'requestedValue', internalType: 'uint256', type: 'uint256' },
      { name: 'msgValue', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'ERC2771ForwarderMismatchedValue',
  },
  {
    type: 'error',
    inputs: [
      { name: 'target', internalType: 'address', type: 'address' },
      { name: 'forwarder', internalType: 'address', type: 'address' },
    ],
    name: 'ERC2771UntrustfulTarget',
  },
  { type: 'error', inputs: [], name: 'FailedCall' },
  {
    type: 'error',
    inputs: [
      { name: 'balance', internalType: 'uint256', type: 'uint256' },
      { name: 'needed', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'InsufficientBalance',
  },
  {
    type: 'error',
    inputs: [
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'currentNonce', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'InvalidAccountNonce',
  },
  { type: 'error', inputs: [], name: 'InvalidShortString' },
  {
    type: 'error',
    inputs: [{ name: 'str', internalType: 'string', type: 'string' }],
    name: 'StringTooLong',
  },
] as const

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 */
export const erc2771ForwarderAddress = {
  84532: '0x460d4DE0c26057303628101C9f1F6D8def482d8B',
  421614: '0x460d4DE0c26057303628101C9f1F6D8def482d8B',
  11155111: '0x460d4DE0c26057303628101C9f1F6D8def482d8B',
  11155420: '0x460d4DE0c26057303628101C9f1F6D8def482d8B',
} as const

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 */
export const erc2771ForwarderConfig = {
  address: erc2771ForwarderAddress,
  abi: erc2771ForwarderAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JB721TiersHook
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const jb721TiersHookAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'directory',
        internalType: 'contract IJBDirectory',
        type: 'address',
      },
      {
        name: 'permissions',
        internalType: 'contract IJBPermissions',
        type: 'address',
      },
      {
        name: 'rulesets',
        internalType: 'contract IJBRulesets',
        type: 'address',
      },
      {
        name: 'store',
        internalType: 'contract IJB721TiersHookStore',
        type: 'address',
      },
      { name: 'trustedForwarder', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DIRECTORY',
    outputs: [
      { name: '', internalType: 'contract IJBDirectory', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'METADATA_ID_TARGET',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PERMISSIONS',
    outputs: [
      { name: '', internalType: 'contract IJBPermissions', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PROJECTS',
    outputs: [
      { name: '', internalType: 'contract IJBProjects', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PROJECT_ID',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'RULESETS',
    outputs: [
      { name: '', internalType: 'contract IJBRulesets', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'STORE',
    outputs: [
      {
        name: '',
        internalType: 'contract IJB721TiersHookStore',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'tiersToAdd',
        internalType: 'struct JB721TierConfig[]',
        type: 'tuple[]',
        components: [
          { name: 'price', internalType: 'uint104', type: 'uint104' },
          { name: 'initialSupply', internalType: 'uint32', type: 'uint32' },
          { name: 'votingUnits', internalType: 'uint32', type: 'uint32' },
          { name: 'reserveFrequency', internalType: 'uint16', type: 'uint16' },
          {
            name: 'reserveBeneficiary',
            internalType: 'address',
            type: 'address',
          },
          { name: 'encodedIPFSUri', internalType: 'bytes32', type: 'bytes32' },
          { name: 'category', internalType: 'uint24', type: 'uint24' },
          { name: 'discountPercent', internalType: 'uint8', type: 'uint8' },
          { name: 'allowOwnerMint', internalType: 'bool', type: 'bool' },
          {
            name: 'useReserveBeneficiaryAsDefault',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'transfersPausable', internalType: 'bool', type: 'bool' },
          { name: 'useVotingUnits', internalType: 'bool', type: 'bool' },
          { name: 'cannotBeRemoved', internalType: 'bool', type: 'bool' },
          {
            name: 'cannotIncreaseDiscountPercent',
            internalType: 'bool',
            type: 'bool',
          },
        ],
      },
      { name: 'tierIdsToRemove', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    name: 'adjustTiers',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'context',
        internalType: 'struct JBAfterCashOutRecordedContext',
        type: 'tuple',
        components: [
          { name: 'holder', internalType: 'address', type: 'address' },
          { name: 'projectId', internalType: 'uint256', type: 'uint256' },
          { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
          { name: 'cashOutCount', internalType: 'uint256', type: 'uint256' },
          {
            name: 'reclaimedAmount',
            internalType: 'struct JBTokenAmount',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'decimals', internalType: 'uint8', type: 'uint8' },
              { name: 'currency', internalType: 'uint32', type: 'uint32' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
            ],
          },
          {
            name: 'forwardedAmount',
            internalType: 'struct JBTokenAmount',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'decimals', internalType: 'uint8', type: 'uint8' },
              { name: 'currency', internalType: 'uint32', type: 'uint32' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
            ],
          },
          { name: 'cashOutTaxRate', internalType: 'uint256', type: 'uint256' },
          {
            name: 'beneficiary',
            internalType: 'address payable',
            type: 'address',
          },
          { name: 'hookMetadata', internalType: 'bytes', type: 'bytes' },
          { name: 'cashOutMetadata', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    name: 'afterCashOutRecordedWith',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'context',
        internalType: 'struct JBAfterPayRecordedContext',
        type: 'tuple',
        components: [
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'projectId', internalType: 'uint256', type: 'uint256' },
          { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
          {
            name: 'amount',
            internalType: 'struct JBTokenAmount',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'decimals', internalType: 'uint8', type: 'uint8' },
              { name: 'currency', internalType: 'uint32', type: 'uint32' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
            ],
          },
          {
            name: 'forwardedAmount',
            internalType: 'struct JBTokenAmount',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'decimals', internalType: 'uint8', type: 'uint8' },
              { name: 'currency', internalType: 'uint32', type: 'uint32' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
            ],
          },
          { name: 'weight', internalType: 'uint256', type: 'uint256' },
          {
            name: 'newlyIssuedTokenCount',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'beneficiary', internalType: 'address', type: 'address' },
          { name: 'hookMetadata', internalType: 'bytes', type: 'bytes' },
          { name: 'payerMetadata', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    name: 'afterPayRecordedWith',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'baseURI',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'context',
        internalType: 'struct JBBeforeCashOutRecordedContext',
        type: 'tuple',
        components: [
          { name: 'terminal', internalType: 'address', type: 'address' },
          { name: 'holder', internalType: 'address', type: 'address' },
          { name: 'projectId', internalType: 'uint256', type: 'uint256' },
          { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
          { name: 'cashOutCount', internalType: 'uint256', type: 'uint256' },
          { name: 'totalSupply', internalType: 'uint256', type: 'uint256' },
          {
            name: 'surplus',
            internalType: 'struct JBTokenAmount',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'decimals', internalType: 'uint8', type: 'uint8' },
              { name: 'currency', internalType: 'uint32', type: 'uint32' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
            ],
          },
          { name: 'useTotalSurplus', internalType: 'bool', type: 'bool' },
          { name: 'cashOutTaxRate', internalType: 'uint256', type: 'uint256' },
          { name: 'metadata', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    name: 'beforeCashOutRecordedWith',
    outputs: [
      { name: 'cashOutTaxRate', internalType: 'uint256', type: 'uint256' },
      { name: 'cashOutCount', internalType: 'uint256', type: 'uint256' },
      { name: 'totalSupply', internalType: 'uint256', type: 'uint256' },
      {
        name: 'hookSpecifications',
        internalType: 'struct JBCashOutHookSpecification[]',
        type: 'tuple[]',
        components: [
          {
            name: 'hook',
            internalType: 'contract IJBCashOutHook',
            type: 'address',
          },
          { name: 'amount', internalType: 'uint256', type: 'uint256' },
          { name: 'metadata', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'context',
        internalType: 'struct JBBeforePayRecordedContext',
        type: 'tuple',
        components: [
          { name: 'terminal', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          {
            name: 'amount',
            internalType: 'struct JBTokenAmount',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'decimals', internalType: 'uint8', type: 'uint8' },
              { name: 'currency', internalType: 'uint32', type: 'uint32' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
            ],
          },
          { name: 'projectId', internalType: 'uint256', type: 'uint256' },
          { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
          { name: 'beneficiary', internalType: 'address', type: 'address' },
          { name: 'weight', internalType: 'uint256', type: 'uint256' },
          { name: 'reservedPercent', internalType: 'uint256', type: 'uint256' },
          { name: 'metadata', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    name: 'beforePayRecordedWith',
    outputs: [
      { name: 'weight', internalType: 'uint256', type: 'uint256' },
      {
        name: 'hookSpecifications',
        internalType: 'struct JBPayHookSpecification[]',
        type: 'tuple[]',
        components: [
          {
            name: 'hook',
            internalType: 'contract IJBPayHook',
            type: 'address',
          },
          { name: 'amount', internalType: 'uint256', type: 'uint256' },
          { name: 'metadata', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'tokenIds', internalType: 'uint256[]', type: 'uint256[]' },
      {
        name: '',
        internalType: 'struct JBBeforeCashOutRecordedContext',
        type: 'tuple',
        components: [
          { name: 'terminal', internalType: 'address', type: 'address' },
          { name: 'holder', internalType: 'address', type: 'address' },
          { name: 'projectId', internalType: 'uint256', type: 'uint256' },
          { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
          { name: 'cashOutCount', internalType: 'uint256', type: 'uint256' },
          { name: 'totalSupply', internalType: 'uint256', type: 'uint256' },
          {
            name: 'surplus',
            internalType: 'struct JBTokenAmount',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'decimals', internalType: 'uint8', type: 'uint8' },
              { name: 'currency', internalType: 'uint32', type: 'uint32' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
            ],
          },
          { name: 'useTotalSurplus', internalType: 'bool', type: 'bool' },
          { name: 'cashOutTaxRate', internalType: 'uint256', type: 'uint256' },
          { name: 'metadata', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    name: 'cashOutWeightOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'contractURI',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'firstOwnerOf',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'getApproved',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'address', type: 'address' },
    ],
    name: 'hasMintPermissionFor',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'name', internalType: 'string', type: 'string' },
      { name: 'symbol', internalType: 'string', type: 'string' },
      { name: 'baseUri', internalType: 'string', type: 'string' },
      {
        name: 'tokenUriResolver',
        internalType: 'contract IJB721TokenUriResolver',
        type: 'address',
      },
      { name: 'contractUri', internalType: 'string', type: 'string' },
      {
        name: 'tiersConfig',
        internalType: 'struct JB721InitTiersConfig',
        type: 'tuple',
        components: [
          {
            name: 'tiers',
            internalType: 'struct JB721TierConfig[]',
            type: 'tuple[]',
            components: [
              { name: 'price', internalType: 'uint104', type: 'uint104' },
              { name: 'initialSupply', internalType: 'uint32', type: 'uint32' },
              { name: 'votingUnits', internalType: 'uint32', type: 'uint32' },
              {
                name: 'reserveFrequency',
                internalType: 'uint16',
                type: 'uint16',
              },
              {
                name: 'reserveBeneficiary',
                internalType: 'address',
                type: 'address',
              },
              {
                name: 'encodedIPFSUri',
                internalType: 'bytes32',
                type: 'bytes32',
              },
              { name: 'category', internalType: 'uint24', type: 'uint24' },
              { name: 'discountPercent', internalType: 'uint8', type: 'uint8' },
              { name: 'allowOwnerMint', internalType: 'bool', type: 'bool' },
              {
                name: 'useReserveBeneficiaryAsDefault',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'transfersPausable', internalType: 'bool', type: 'bool' },
              { name: 'useVotingUnits', internalType: 'bool', type: 'bool' },
              { name: 'cannotBeRemoved', internalType: 'bool', type: 'bool' },
              {
                name: 'cannotIncreaseDiscountPercent',
                internalType: 'bool',
                type: 'bool',
              },
            ],
          },
          { name: 'currency', internalType: 'uint32', type: 'uint32' },
          { name: 'decimals', internalType: 'uint8', type: 'uint8' },
          {
            name: 'prices',
            internalType: 'contract IJBPrices',
            type: 'address',
          },
        ],
      },
      {
        name: 'flags',
        internalType: 'struct JB721TiersHookFlags',
        type: 'tuple',
        components: [
          {
            name: 'noNewTiersWithReserves',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'noNewTiersWithVotes', internalType: 'bool', type: 'bool' },
          {
            name: 'noNewTiersWithOwnerMinting',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'preventOverspending', internalType: 'bool', type: 'bool' },
        ],
      },
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'operator', internalType: 'address', type: 'address' },
    ],
    name: 'isApprovedForAll',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'forwarder', internalType: 'address', type: 'address' }],
    name: 'isTrustedForwarder',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'jbOwner',
    outputs: [
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint88', type: 'uint88' },
      { name: 'permissionId', internalType: 'uint8', type: 'uint8' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'tierIds', internalType: 'uint16[]', type: 'uint16[]' },
      { name: 'beneficiary', internalType: 'address', type: 'address' },
    ],
    name: 'mintFor',
    outputs: [
      { name: 'tokenIds', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'tierId', internalType: 'uint256', type: 'uint256' },
      { name: 'count', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'mintPendingReservesFor',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'reserveMintConfigs',
        internalType: 'struct JB721TiersMintReservesConfig[]',
        type: 'tuple[]',
        components: [
          { name: 'tierId', internalType: 'uint32', type: 'uint32' },
          { name: 'count', internalType: 'uint16', type: 'uint16' },
        ],
      },
    ],
    name: 'mintPendingReservesFor',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'name',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'addr', internalType: 'address', type: 'address' }],
    name: 'payCreditsOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'pricingContext',
    outputs: [
      { name: 'currency', internalType: 'uint256', type: 'uint256' },
      { name: 'decimals', internalType: 'uint256', type: 'uint256' },
      { name: 'prices', internalType: 'contract IJBPrices', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'data', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'operator', internalType: 'address', type: 'address' },
      { name: 'approved', internalType: 'bool', type: 'bool' },
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'tierId', internalType: 'uint256', type: 'uint256' },
      { name: 'discountPercent', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'setDiscountPercentOf',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'configs',
        internalType: 'struct JB721TiersSetDiscountPercentConfig[]',
        type: 'tuple[]',
        components: [
          { name: 'tierId', internalType: 'uint32', type: 'uint32' },
          { name: 'discountPercent', internalType: 'uint16', type: 'uint16' },
        ],
      },
    ],
    name: 'setDiscountPercentsOf',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'baseUri', internalType: 'string', type: 'string' },
      { name: 'contractUri', internalType: 'string', type: 'string' },
      {
        name: 'tokenUriResolver',
        internalType: 'contract IJB721TokenUriResolver',
        type: 'address',
      },
      {
        name: 'encodedIPFSTUriTierId',
        internalType: 'uint256',
        type: 'uint256',
      },
      { name: 'encodedIPFSUri', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'setMetadata',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'permissionId', internalType: 'uint8', type: 'uint8' }],
    name: 'setPermissionId',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '',
        internalType: 'struct JBBeforeCashOutRecordedContext',
        type: 'tuple',
        components: [
          { name: 'terminal', internalType: 'address', type: 'address' },
          { name: 'holder', internalType: 'address', type: 'address' },
          { name: 'projectId', internalType: 'uint256', type: 'uint256' },
          { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
          { name: 'cashOutCount', internalType: 'uint256', type: 'uint256' },
          { name: 'totalSupply', internalType: 'uint256', type: 'uint256' },
          {
            name: 'surplus',
            internalType: 'struct JBTokenAmount',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'decimals', internalType: 'uint8', type: 'uint8' },
              { name: 'currency', internalType: 'uint32', type: 'uint32' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
            ],
          },
          { name: 'useTotalSurplus', internalType: 'bool', type: 'bool' },
          { name: 'cashOutTaxRate', internalType: 'uint256', type: 'uint256' },
          { name: 'metadata', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    name: 'totalCashOutWeight',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'transferOwnershipToProject',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'trustedForwarder',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'newTotalCredits',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'AddPayCredits',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tierId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'tier',
        internalType: 'struct JB721TierConfig',
        type: 'tuple',
        components: [
          { name: 'price', internalType: 'uint104', type: 'uint104' },
          { name: 'initialSupply', internalType: 'uint32', type: 'uint32' },
          { name: 'votingUnits', internalType: 'uint32', type: 'uint32' },
          { name: 'reserveFrequency', internalType: 'uint16', type: 'uint16' },
          {
            name: 'reserveBeneficiary',
            internalType: 'address',
            type: 'address',
          },
          { name: 'encodedIPFSUri', internalType: 'bytes32', type: 'bytes32' },
          { name: 'category', internalType: 'uint24', type: 'uint24' },
          { name: 'discountPercent', internalType: 'uint8', type: 'uint8' },
          { name: 'allowOwnerMint', internalType: 'bool', type: 'bool' },
          {
            name: 'useReserveBeneficiaryAsDefault',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'transfersPausable', internalType: 'bool', type: 'bool' },
          { name: 'useVotingUnits', internalType: 'bool', type: 'bool' },
          { name: 'cannotBeRemoved', internalType: 'bool', type: 'bool' },
          {
            name: 'cannotIncreaseDiscountPercent',
            internalType: 'bool',
            type: 'bool',
          },
        ],
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'AddTier',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'approved',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'Approval',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'operator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      { name: 'approved', internalType: 'bool', type: 'bool', indexed: false },
    ],
    name: 'ApprovalForAll',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'tierId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'beneficiary',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'totalAmountPaid',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Mint',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'tierId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'beneficiary',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'MintReservedNft',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'newId', internalType: 'uint8', type: 'uint8', indexed: false },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'PermissionIdChanged',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tierId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'RemoveTier',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'baseUri',
        internalType: 'string',
        type: 'string',
        indexed: true,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'SetBaseUri',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'uri', internalType: 'string', type: 'string', indexed: true },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'SetContractUri',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tierId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'discountPercent',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'SetDiscountPercent',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tierId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'encodedUri',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'SetEncodedIPFSUri',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'resolver',
        internalType: 'contract IJB721TokenUriResolver',
        type: 'address',
        indexed: true,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'SetTokenUriResolver',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'from', internalType: 'address', type: 'address', indexed: true },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'Transfer',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'newTotalCredits',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'UsePayCredits',
  },
  {
    type: 'error',
    inputs: [
      { name: 'sender', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'owner', internalType: 'address', type: 'address' },
    ],
    name: 'ERC721IncorrectOwner',
  },
  {
    type: 'error',
    inputs: [
      { name: 'operator', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'ERC721InsufficientApproval',
  },
  {
    type: 'error',
    inputs: [{ name: 'approver', internalType: 'address', type: 'address' }],
    name: 'ERC721InvalidApprover',
  },
  {
    type: 'error',
    inputs: [{ name: 'operator', internalType: 'address', type: 'address' }],
    name: 'ERC721InvalidOperator',
  },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'ERC721InvalidOwner',
  },
  {
    type: 'error',
    inputs: [{ name: 'receiver', internalType: 'address', type: 'address' }],
    name: 'ERC721InvalidReceiver',
  },
  {
    type: 'error',
    inputs: [{ name: 'sender', internalType: 'address', type: 'address' }],
    name: 'ERC721InvalidSender',
  },
  {
    type: 'error',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'ERC721NonexistentToken',
  },
  { type: 'error', inputs: [], name: 'JB721Hook_InvalidCashOut' },
  { type: 'error', inputs: [], name: 'JB721Hook_InvalidPay' },
  {
    type: 'error',
    inputs: [
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'holder', internalType: 'address', type: 'address' },
    ],
    name: 'JB721Hook_UnauthorizedToken',
  },
  { type: 'error', inputs: [], name: 'JB721Hook_UnexpectedTokenCashedOut' },
  {
    type: 'error',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'JB721TiersHook_AlreadyInitialized',
  },
  { type: 'error', inputs: [], name: 'JB721TiersHook_MintReserveNftsPaused' },
  { type: 'error', inputs: [], name: 'JB721TiersHook_NoProjectId' },
  {
    type: 'error',
    inputs: [
      { name: 'leftoverAmount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JB721TiersHook_Overspending',
  },
  { type: 'error', inputs: [], name: 'JB721TiersHook_TierTransfersPaused' },
  { type: 'error', inputs: [], name: 'JBOwnableOverrides_InvalidNewOwner' },
  {
    type: 'error',
    inputs: [
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'sender', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'permissionId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBPermissioned_Unauthorized',
  },
  {
    type: 'error',
    inputs: [
      { name: 'x', internalType: 'uint256', type: 'uint256' },
      { name: 'y', internalType: 'uint256', type: 'uint256' },
      { name: 'denominator', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'PRBMath_MulDiv_Overflow',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JB721TiersHookDeployer
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 */
export const jb721TiersHookDeployerAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'hook',
        internalType: 'contract JB721TiersHook',
        type: 'address',
      },
      {
        name: 'store',
        internalType: 'contract IJB721TiersHookStore',
        type: 'address',
      },
      {
        name: 'addressRegistry',
        internalType: 'contract IJBAddressRegistry',
        type: 'address',
      },
      { name: 'trustedForwarder', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ADDRESS_REGISTRY',
    outputs: [
      {
        name: '',
        internalType: 'contract IJBAddressRegistry',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'HOOK',
    outputs: [
      { name: '', internalType: 'contract JB721TiersHook', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'STORE',
    outputs: [
      {
        name: '',
        internalType: 'contract IJB721TiersHookStore',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'deployTiersHookConfig',
        internalType: 'struct JBDeploy721TiersHookConfig',
        type: 'tuple',
        components: [
          { name: 'name', internalType: 'string', type: 'string' },
          { name: 'symbol', internalType: 'string', type: 'string' },
          { name: 'baseUri', internalType: 'string', type: 'string' },
          {
            name: 'tokenUriResolver',
            internalType: 'contract IJB721TokenUriResolver',
            type: 'address',
          },
          { name: 'contractUri', internalType: 'string', type: 'string' },
          {
            name: 'tiersConfig',
            internalType: 'struct JB721InitTiersConfig',
            type: 'tuple',
            components: [
              {
                name: 'tiers',
                internalType: 'struct JB721TierConfig[]',
                type: 'tuple[]',
                components: [
                  { name: 'price', internalType: 'uint104', type: 'uint104' },
                  {
                    name: 'initialSupply',
                    internalType: 'uint32',
                    type: 'uint32',
                  },
                  {
                    name: 'votingUnits',
                    internalType: 'uint32',
                    type: 'uint32',
                  },
                  {
                    name: 'reserveFrequency',
                    internalType: 'uint16',
                    type: 'uint16',
                  },
                  {
                    name: 'reserveBeneficiary',
                    internalType: 'address',
                    type: 'address',
                  },
                  {
                    name: 'encodedIPFSUri',
                    internalType: 'bytes32',
                    type: 'bytes32',
                  },
                  { name: 'category', internalType: 'uint24', type: 'uint24' },
                  {
                    name: 'discountPercent',
                    internalType: 'uint8',
                    type: 'uint8',
                  },
                  {
                    name: 'allowOwnerMint',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'useReserveBeneficiaryAsDefault',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'transfersPausable',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'useVotingUnits',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'cannotBeRemoved',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'cannotIncreaseDiscountPercent',
                    internalType: 'bool',
                    type: 'bool',
                  },
                ],
              },
              { name: 'currency', internalType: 'uint32', type: 'uint32' },
              { name: 'decimals', internalType: 'uint8', type: 'uint8' },
              {
                name: 'prices',
                internalType: 'contract IJBPrices',
                type: 'address',
              },
            ],
          },
          {
            name: 'reserveBeneficiary',
            internalType: 'address',
            type: 'address',
          },
          {
            name: 'flags',
            internalType: 'struct JB721TiersHookFlags',
            type: 'tuple',
            components: [
              {
                name: 'noNewTiersWithReserves',
                internalType: 'bool',
                type: 'bool',
              },
              {
                name: 'noNewTiersWithVotes',
                internalType: 'bool',
                type: 'bool',
              },
              {
                name: 'noNewTiersWithOwnerMinting',
                internalType: 'bool',
                type: 'bool',
              },
              {
                name: 'preventOverspending',
                internalType: 'bool',
                type: 'bool',
              },
            ],
          },
        ],
      },
      { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'deployHookFor',
    outputs: [
      {
        name: 'newHook',
        internalType: 'contract IJB721TiersHook',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'forwarder', internalType: 'address', type: 'address' }],
    name: 'isTrustedForwarder',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'trustedForwarder',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'hook',
        internalType: 'contract IJB721TiersHook',
        type: 'address',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'HookDeployed',
  },
] as const

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 */
export const jb721TiersHookDeployerAddress = {
  84532: '0x9549A7B078a31F3eD8B418797c330cf9015dBe18',
  421614: '0x9549A7B078a31F3eD8B418797c330cf9015dBe18',
  11155111: '0x9549A7B078a31F3eD8B418797c330cf9015dBe18',
  11155420: '0x9549A7B078a31F3eD8B418797c330cf9015dBe18',
} as const

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 */
export const jb721TiersHookDeployerConfig = {
  address: jb721TiersHookDeployerAddress,
  abi: jb721TiersHookDeployerAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JB721TiersHookProjectDeployer
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 */
export const jb721TiersHookProjectDeployerAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'directory',
        internalType: 'contract IJBDirectory',
        type: 'address',
      },
      {
        name: 'permissions',
        internalType: 'contract IJBPermissions',
        type: 'address',
      },
      {
        name: 'hookDeployer',
        internalType: 'contract IJB721TiersHookDeployer',
        type: 'address',
      },
      { name: 'trustedForwarder', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DIRECTORY',
    outputs: [
      { name: '', internalType: 'contract IJBDirectory', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'HOOK_DEPLOYER',
    outputs: [
      {
        name: '',
        internalType: 'contract IJB721TiersHookDeployer',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PERMISSIONS',
    outputs: [
      { name: '', internalType: 'contract IJBPermissions', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'forwarder', internalType: 'address', type: 'address' }],
    name: 'isTrustedForwarder',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'owner', internalType: 'address', type: 'address' },
      {
        name: 'deployTiersHookConfig',
        internalType: 'struct JBDeploy721TiersHookConfig',
        type: 'tuple',
        components: [
          { name: 'name', internalType: 'string', type: 'string' },
          { name: 'symbol', internalType: 'string', type: 'string' },
          { name: 'baseUri', internalType: 'string', type: 'string' },
          {
            name: 'tokenUriResolver',
            internalType: 'contract IJB721TokenUriResolver',
            type: 'address',
          },
          { name: 'contractUri', internalType: 'string', type: 'string' },
          {
            name: 'tiersConfig',
            internalType: 'struct JB721InitTiersConfig',
            type: 'tuple',
            components: [
              {
                name: 'tiers',
                internalType: 'struct JB721TierConfig[]',
                type: 'tuple[]',
                components: [
                  { name: 'price', internalType: 'uint104', type: 'uint104' },
                  {
                    name: 'initialSupply',
                    internalType: 'uint32',
                    type: 'uint32',
                  },
                  {
                    name: 'votingUnits',
                    internalType: 'uint32',
                    type: 'uint32',
                  },
                  {
                    name: 'reserveFrequency',
                    internalType: 'uint16',
                    type: 'uint16',
                  },
                  {
                    name: 'reserveBeneficiary',
                    internalType: 'address',
                    type: 'address',
                  },
                  {
                    name: 'encodedIPFSUri',
                    internalType: 'bytes32',
                    type: 'bytes32',
                  },
                  { name: 'category', internalType: 'uint24', type: 'uint24' },
                  {
                    name: 'discountPercent',
                    internalType: 'uint8',
                    type: 'uint8',
                  },
                  {
                    name: 'allowOwnerMint',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'useReserveBeneficiaryAsDefault',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'transfersPausable',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'useVotingUnits',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'cannotBeRemoved',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'cannotIncreaseDiscountPercent',
                    internalType: 'bool',
                    type: 'bool',
                  },
                ],
              },
              { name: 'currency', internalType: 'uint32', type: 'uint32' },
              { name: 'decimals', internalType: 'uint8', type: 'uint8' },
              {
                name: 'prices',
                internalType: 'contract IJBPrices',
                type: 'address',
              },
            ],
          },
          {
            name: 'reserveBeneficiary',
            internalType: 'address',
            type: 'address',
          },
          {
            name: 'flags',
            internalType: 'struct JB721TiersHookFlags',
            type: 'tuple',
            components: [
              {
                name: 'noNewTiersWithReserves',
                internalType: 'bool',
                type: 'bool',
              },
              {
                name: 'noNewTiersWithVotes',
                internalType: 'bool',
                type: 'bool',
              },
              {
                name: 'noNewTiersWithOwnerMinting',
                internalType: 'bool',
                type: 'bool',
              },
              {
                name: 'preventOverspending',
                internalType: 'bool',
                type: 'bool',
              },
            ],
          },
        ],
      },
      {
        name: 'launchProjectConfig',
        internalType: 'struct JBLaunchProjectConfig',
        type: 'tuple',
        components: [
          { name: 'projectUri', internalType: 'string', type: 'string' },
          {
            name: 'rulesetConfigurations',
            internalType: 'struct JBPayDataHookRulesetConfig[]',
            type: 'tuple[]',
            components: [
              {
                name: 'mustStartAtOrAfter',
                internalType: 'uint48',
                type: 'uint48',
              },
              { name: 'duration', internalType: 'uint32', type: 'uint32' },
              { name: 'weight', internalType: 'uint112', type: 'uint112' },
              {
                name: 'weightCutPercent',
                internalType: 'uint32',
                type: 'uint32',
              },
              {
                name: 'approvalHook',
                internalType: 'contract IJBRulesetApprovalHook',
                type: 'address',
              },
              {
                name: 'metadata',
                internalType: 'struct JBPayDataHookRulesetMetadata',
                type: 'tuple',
                components: [
                  {
                    name: 'reservedPercent',
                    internalType: 'uint16',
                    type: 'uint16',
                  },
                  {
                    name: 'cashOutTaxRate',
                    internalType: 'uint16',
                    type: 'uint16',
                  },
                  {
                    name: 'baseCurrency',
                    internalType: 'uint32',
                    type: 'uint32',
                  },
                  { name: 'pausePay', internalType: 'bool', type: 'bool' },
                  {
                    name: 'pauseCreditTransfers',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'allowOwnerMinting',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'allowTerminalMigration',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'allowSetTerminals',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'allowSetController',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'allowAddAccountingContext',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'allowAddPriceFeed',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'ownerMustSendPayouts',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  { name: 'holdFees', internalType: 'bool', type: 'bool' },
                  {
                    name: 'useTotalSurplusForCashOuts',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'useDataHookForCashOut',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  { name: 'metadata', internalType: 'uint16', type: 'uint16' },
                ],
              },
              {
                name: 'splitGroups',
                internalType: 'struct JBSplitGroup[]',
                type: 'tuple[]',
                components: [
                  { name: 'groupId', internalType: 'uint256', type: 'uint256' },
                  {
                    name: 'splits',
                    internalType: 'struct JBSplit[]',
                    type: 'tuple[]',
                    components: [
                      {
                        name: 'percent',
                        internalType: 'uint32',
                        type: 'uint32',
                      },
                      {
                        name: 'projectId',
                        internalType: 'uint64',
                        type: 'uint64',
                      },
                      {
                        name: 'beneficiary',
                        internalType: 'address payable',
                        type: 'address',
                      },
                      {
                        name: 'preferAddToBalance',
                        internalType: 'bool',
                        type: 'bool',
                      },
                      {
                        name: 'lockedUntil',
                        internalType: 'uint48',
                        type: 'uint48',
                      },
                      {
                        name: 'hook',
                        internalType: 'contract IJBSplitHook',
                        type: 'address',
                      },
                    ],
                  },
                ],
              },
              {
                name: 'fundAccessLimitGroups',
                internalType: 'struct JBFundAccessLimitGroup[]',
                type: 'tuple[]',
                components: [
                  {
                    name: 'terminal',
                    internalType: 'address',
                    type: 'address',
                  },
                  { name: 'token', internalType: 'address', type: 'address' },
                  {
                    name: 'payoutLimits',
                    internalType: 'struct JBCurrencyAmount[]',
                    type: 'tuple[]',
                    components: [
                      {
                        name: 'amount',
                        internalType: 'uint224',
                        type: 'uint224',
                      },
                      {
                        name: 'currency',
                        internalType: 'uint32',
                        type: 'uint32',
                      },
                    ],
                  },
                  {
                    name: 'surplusAllowances',
                    internalType: 'struct JBCurrencyAmount[]',
                    type: 'tuple[]',
                    components: [
                      {
                        name: 'amount',
                        internalType: 'uint224',
                        type: 'uint224',
                      },
                      {
                        name: 'currency',
                        internalType: 'uint32',
                        type: 'uint32',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            name: 'terminalConfigurations',
            internalType: 'struct JBTerminalConfig[]',
            type: 'tuple[]',
            components: [
              {
                name: 'terminal',
                internalType: 'contract IJBTerminal',
                type: 'address',
              },
              {
                name: 'accountingContextsToAccept',
                internalType: 'struct JBAccountingContext[]',
                type: 'tuple[]',
                components: [
                  { name: 'token', internalType: 'address', type: 'address' },
                  { name: 'decimals', internalType: 'uint8', type: 'uint8' },
                  { name: 'currency', internalType: 'uint32', type: 'uint32' },
                ],
              },
            ],
          },
          { name: 'memo', internalType: 'string', type: 'string' },
        ],
      },
      {
        name: 'controller',
        internalType: 'contract IJBController',
        type: 'address',
      },
      { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'launchProjectFor',
    outputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'hook',
        internalType: 'contract IJB721TiersHook',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'deployTiersHookConfig',
        internalType: 'struct JBDeploy721TiersHookConfig',
        type: 'tuple',
        components: [
          { name: 'name', internalType: 'string', type: 'string' },
          { name: 'symbol', internalType: 'string', type: 'string' },
          { name: 'baseUri', internalType: 'string', type: 'string' },
          {
            name: 'tokenUriResolver',
            internalType: 'contract IJB721TokenUriResolver',
            type: 'address',
          },
          { name: 'contractUri', internalType: 'string', type: 'string' },
          {
            name: 'tiersConfig',
            internalType: 'struct JB721InitTiersConfig',
            type: 'tuple',
            components: [
              {
                name: 'tiers',
                internalType: 'struct JB721TierConfig[]',
                type: 'tuple[]',
                components: [
                  { name: 'price', internalType: 'uint104', type: 'uint104' },
                  {
                    name: 'initialSupply',
                    internalType: 'uint32',
                    type: 'uint32',
                  },
                  {
                    name: 'votingUnits',
                    internalType: 'uint32',
                    type: 'uint32',
                  },
                  {
                    name: 'reserveFrequency',
                    internalType: 'uint16',
                    type: 'uint16',
                  },
                  {
                    name: 'reserveBeneficiary',
                    internalType: 'address',
                    type: 'address',
                  },
                  {
                    name: 'encodedIPFSUri',
                    internalType: 'bytes32',
                    type: 'bytes32',
                  },
                  { name: 'category', internalType: 'uint24', type: 'uint24' },
                  {
                    name: 'discountPercent',
                    internalType: 'uint8',
                    type: 'uint8',
                  },
                  {
                    name: 'allowOwnerMint',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'useReserveBeneficiaryAsDefault',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'transfersPausable',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'useVotingUnits',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'cannotBeRemoved',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'cannotIncreaseDiscountPercent',
                    internalType: 'bool',
                    type: 'bool',
                  },
                ],
              },
              { name: 'currency', internalType: 'uint32', type: 'uint32' },
              { name: 'decimals', internalType: 'uint8', type: 'uint8' },
              {
                name: 'prices',
                internalType: 'contract IJBPrices',
                type: 'address',
              },
            ],
          },
          {
            name: 'reserveBeneficiary',
            internalType: 'address',
            type: 'address',
          },
          {
            name: 'flags',
            internalType: 'struct JB721TiersHookFlags',
            type: 'tuple',
            components: [
              {
                name: 'noNewTiersWithReserves',
                internalType: 'bool',
                type: 'bool',
              },
              {
                name: 'noNewTiersWithVotes',
                internalType: 'bool',
                type: 'bool',
              },
              {
                name: 'noNewTiersWithOwnerMinting',
                internalType: 'bool',
                type: 'bool',
              },
              {
                name: 'preventOverspending',
                internalType: 'bool',
                type: 'bool',
              },
            ],
          },
        ],
      },
      {
        name: 'launchRulesetsConfig',
        internalType: 'struct JBLaunchRulesetsConfig',
        type: 'tuple',
        components: [
          { name: 'projectId', internalType: 'uint56', type: 'uint56' },
          {
            name: 'rulesetConfigurations',
            internalType: 'struct JBPayDataHookRulesetConfig[]',
            type: 'tuple[]',
            components: [
              {
                name: 'mustStartAtOrAfter',
                internalType: 'uint48',
                type: 'uint48',
              },
              { name: 'duration', internalType: 'uint32', type: 'uint32' },
              { name: 'weight', internalType: 'uint112', type: 'uint112' },
              {
                name: 'weightCutPercent',
                internalType: 'uint32',
                type: 'uint32',
              },
              {
                name: 'approvalHook',
                internalType: 'contract IJBRulesetApprovalHook',
                type: 'address',
              },
              {
                name: 'metadata',
                internalType: 'struct JBPayDataHookRulesetMetadata',
                type: 'tuple',
                components: [
                  {
                    name: 'reservedPercent',
                    internalType: 'uint16',
                    type: 'uint16',
                  },
                  {
                    name: 'cashOutTaxRate',
                    internalType: 'uint16',
                    type: 'uint16',
                  },
                  {
                    name: 'baseCurrency',
                    internalType: 'uint32',
                    type: 'uint32',
                  },
                  { name: 'pausePay', internalType: 'bool', type: 'bool' },
                  {
                    name: 'pauseCreditTransfers',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'allowOwnerMinting',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'allowTerminalMigration',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'allowSetTerminals',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'allowSetController',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'allowAddAccountingContext',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'allowAddPriceFeed',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'ownerMustSendPayouts',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  { name: 'holdFees', internalType: 'bool', type: 'bool' },
                  {
                    name: 'useTotalSurplusForCashOuts',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'useDataHookForCashOut',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  { name: 'metadata', internalType: 'uint16', type: 'uint16' },
                ],
              },
              {
                name: 'splitGroups',
                internalType: 'struct JBSplitGroup[]',
                type: 'tuple[]',
                components: [
                  { name: 'groupId', internalType: 'uint256', type: 'uint256' },
                  {
                    name: 'splits',
                    internalType: 'struct JBSplit[]',
                    type: 'tuple[]',
                    components: [
                      {
                        name: 'percent',
                        internalType: 'uint32',
                        type: 'uint32',
                      },
                      {
                        name: 'projectId',
                        internalType: 'uint64',
                        type: 'uint64',
                      },
                      {
                        name: 'beneficiary',
                        internalType: 'address payable',
                        type: 'address',
                      },
                      {
                        name: 'preferAddToBalance',
                        internalType: 'bool',
                        type: 'bool',
                      },
                      {
                        name: 'lockedUntil',
                        internalType: 'uint48',
                        type: 'uint48',
                      },
                      {
                        name: 'hook',
                        internalType: 'contract IJBSplitHook',
                        type: 'address',
                      },
                    ],
                  },
                ],
              },
              {
                name: 'fundAccessLimitGroups',
                internalType: 'struct JBFundAccessLimitGroup[]',
                type: 'tuple[]',
                components: [
                  {
                    name: 'terminal',
                    internalType: 'address',
                    type: 'address',
                  },
                  { name: 'token', internalType: 'address', type: 'address' },
                  {
                    name: 'payoutLimits',
                    internalType: 'struct JBCurrencyAmount[]',
                    type: 'tuple[]',
                    components: [
                      {
                        name: 'amount',
                        internalType: 'uint224',
                        type: 'uint224',
                      },
                      {
                        name: 'currency',
                        internalType: 'uint32',
                        type: 'uint32',
                      },
                    ],
                  },
                  {
                    name: 'surplusAllowances',
                    internalType: 'struct JBCurrencyAmount[]',
                    type: 'tuple[]',
                    components: [
                      {
                        name: 'amount',
                        internalType: 'uint224',
                        type: 'uint224',
                      },
                      {
                        name: 'currency',
                        internalType: 'uint32',
                        type: 'uint32',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            name: 'terminalConfigurations',
            internalType: 'struct JBTerminalConfig[]',
            type: 'tuple[]',
            components: [
              {
                name: 'terminal',
                internalType: 'contract IJBTerminal',
                type: 'address',
              },
              {
                name: 'accountingContextsToAccept',
                internalType: 'struct JBAccountingContext[]',
                type: 'tuple[]',
                components: [
                  { name: 'token', internalType: 'address', type: 'address' },
                  { name: 'decimals', internalType: 'uint8', type: 'uint8' },
                  { name: 'currency', internalType: 'uint32', type: 'uint32' },
                ],
              },
            ],
          },
          { name: 'memo', internalType: 'string', type: 'string' },
        ],
      },
      {
        name: 'controller',
        internalType: 'contract IJBController',
        type: 'address',
      },
      { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'launchRulesetsFor',
    outputs: [
      { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'hook',
        internalType: 'contract IJB721TiersHook',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'deployTiersHookConfig',
        internalType: 'struct JBDeploy721TiersHookConfig',
        type: 'tuple',
        components: [
          { name: 'name', internalType: 'string', type: 'string' },
          { name: 'symbol', internalType: 'string', type: 'string' },
          { name: 'baseUri', internalType: 'string', type: 'string' },
          {
            name: 'tokenUriResolver',
            internalType: 'contract IJB721TokenUriResolver',
            type: 'address',
          },
          { name: 'contractUri', internalType: 'string', type: 'string' },
          {
            name: 'tiersConfig',
            internalType: 'struct JB721InitTiersConfig',
            type: 'tuple',
            components: [
              {
                name: 'tiers',
                internalType: 'struct JB721TierConfig[]',
                type: 'tuple[]',
                components: [
                  { name: 'price', internalType: 'uint104', type: 'uint104' },
                  {
                    name: 'initialSupply',
                    internalType: 'uint32',
                    type: 'uint32',
                  },
                  {
                    name: 'votingUnits',
                    internalType: 'uint32',
                    type: 'uint32',
                  },
                  {
                    name: 'reserveFrequency',
                    internalType: 'uint16',
                    type: 'uint16',
                  },
                  {
                    name: 'reserveBeneficiary',
                    internalType: 'address',
                    type: 'address',
                  },
                  {
                    name: 'encodedIPFSUri',
                    internalType: 'bytes32',
                    type: 'bytes32',
                  },
                  { name: 'category', internalType: 'uint24', type: 'uint24' },
                  {
                    name: 'discountPercent',
                    internalType: 'uint8',
                    type: 'uint8',
                  },
                  {
                    name: 'allowOwnerMint',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'useReserveBeneficiaryAsDefault',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'transfersPausable',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'useVotingUnits',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'cannotBeRemoved',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'cannotIncreaseDiscountPercent',
                    internalType: 'bool',
                    type: 'bool',
                  },
                ],
              },
              { name: 'currency', internalType: 'uint32', type: 'uint32' },
              { name: 'decimals', internalType: 'uint8', type: 'uint8' },
              {
                name: 'prices',
                internalType: 'contract IJBPrices',
                type: 'address',
              },
            ],
          },
          {
            name: 'reserveBeneficiary',
            internalType: 'address',
            type: 'address',
          },
          {
            name: 'flags',
            internalType: 'struct JB721TiersHookFlags',
            type: 'tuple',
            components: [
              {
                name: 'noNewTiersWithReserves',
                internalType: 'bool',
                type: 'bool',
              },
              {
                name: 'noNewTiersWithVotes',
                internalType: 'bool',
                type: 'bool',
              },
              {
                name: 'noNewTiersWithOwnerMinting',
                internalType: 'bool',
                type: 'bool',
              },
              {
                name: 'preventOverspending',
                internalType: 'bool',
                type: 'bool',
              },
            ],
          },
        ],
      },
      {
        name: 'queueRulesetsConfig',
        internalType: 'struct JBQueueRulesetsConfig',
        type: 'tuple',
        components: [
          { name: 'projectId', internalType: 'uint56', type: 'uint56' },
          {
            name: 'rulesetConfigurations',
            internalType: 'struct JBPayDataHookRulesetConfig[]',
            type: 'tuple[]',
            components: [
              {
                name: 'mustStartAtOrAfter',
                internalType: 'uint48',
                type: 'uint48',
              },
              { name: 'duration', internalType: 'uint32', type: 'uint32' },
              { name: 'weight', internalType: 'uint112', type: 'uint112' },
              {
                name: 'weightCutPercent',
                internalType: 'uint32',
                type: 'uint32',
              },
              {
                name: 'approvalHook',
                internalType: 'contract IJBRulesetApprovalHook',
                type: 'address',
              },
              {
                name: 'metadata',
                internalType: 'struct JBPayDataHookRulesetMetadata',
                type: 'tuple',
                components: [
                  {
                    name: 'reservedPercent',
                    internalType: 'uint16',
                    type: 'uint16',
                  },
                  {
                    name: 'cashOutTaxRate',
                    internalType: 'uint16',
                    type: 'uint16',
                  },
                  {
                    name: 'baseCurrency',
                    internalType: 'uint32',
                    type: 'uint32',
                  },
                  { name: 'pausePay', internalType: 'bool', type: 'bool' },
                  {
                    name: 'pauseCreditTransfers',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'allowOwnerMinting',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'allowTerminalMigration',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'allowSetTerminals',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'allowSetController',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'allowAddAccountingContext',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'allowAddPriceFeed',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'ownerMustSendPayouts',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  { name: 'holdFees', internalType: 'bool', type: 'bool' },
                  {
                    name: 'useTotalSurplusForCashOuts',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'useDataHookForCashOut',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  { name: 'metadata', internalType: 'uint16', type: 'uint16' },
                ],
              },
              {
                name: 'splitGroups',
                internalType: 'struct JBSplitGroup[]',
                type: 'tuple[]',
                components: [
                  { name: 'groupId', internalType: 'uint256', type: 'uint256' },
                  {
                    name: 'splits',
                    internalType: 'struct JBSplit[]',
                    type: 'tuple[]',
                    components: [
                      {
                        name: 'percent',
                        internalType: 'uint32',
                        type: 'uint32',
                      },
                      {
                        name: 'projectId',
                        internalType: 'uint64',
                        type: 'uint64',
                      },
                      {
                        name: 'beneficiary',
                        internalType: 'address payable',
                        type: 'address',
                      },
                      {
                        name: 'preferAddToBalance',
                        internalType: 'bool',
                        type: 'bool',
                      },
                      {
                        name: 'lockedUntil',
                        internalType: 'uint48',
                        type: 'uint48',
                      },
                      {
                        name: 'hook',
                        internalType: 'contract IJBSplitHook',
                        type: 'address',
                      },
                    ],
                  },
                ],
              },
              {
                name: 'fundAccessLimitGroups',
                internalType: 'struct JBFundAccessLimitGroup[]',
                type: 'tuple[]',
                components: [
                  {
                    name: 'terminal',
                    internalType: 'address',
                    type: 'address',
                  },
                  { name: 'token', internalType: 'address', type: 'address' },
                  {
                    name: 'payoutLimits',
                    internalType: 'struct JBCurrencyAmount[]',
                    type: 'tuple[]',
                    components: [
                      {
                        name: 'amount',
                        internalType: 'uint224',
                        type: 'uint224',
                      },
                      {
                        name: 'currency',
                        internalType: 'uint32',
                        type: 'uint32',
                      },
                    ],
                  },
                  {
                    name: 'surplusAllowances',
                    internalType: 'struct JBCurrencyAmount[]',
                    type: 'tuple[]',
                    components: [
                      {
                        name: 'amount',
                        internalType: 'uint224',
                        type: 'uint224',
                      },
                      {
                        name: 'currency',
                        internalType: 'uint32',
                        type: 'uint32',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          { name: 'memo', internalType: 'string', type: 'string' },
        ],
      },
      {
        name: 'controller',
        internalType: 'contract IJBController',
        type: 'address',
      },
      { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'queueRulesetsOf',
    outputs: [
      { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'hook',
        internalType: 'contract IJB721TiersHook',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'trustedForwarder',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'error',
    inputs: [
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'sender', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'permissionId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBPermissioned_Unauthorized',
  },
] as const

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 */
export const jb721TiersHookProjectDeployerAddress = {
  84532: '0x36ce554D42f58775Cc7294BA842c880dfCf5aCD2',
  421614: '0x36ce554D42f58775Cc7294BA842c880dfCf5aCD2',
  11155111: '0x36ce554D42f58775Cc7294BA842c880dfCf5aCD2',
  11155420: '0x36ce554D42f58775Cc7294BA842c880dfCf5aCD2',
} as const

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 */
export const jb721TiersHookProjectDeployerConfig = {
  address: jb721TiersHookProjectDeployerAddress,
  abi: jb721TiersHookProjectDeployerAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JB721TiersHookStore
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const jb721TiersHookStoreAbi = [
  {
    type: 'function',
    inputs: [
      { name: 'hook', internalType: 'address', type: 'address' },
      { name: 'owner', internalType: 'address', type: 'address' },
    ],
    name: 'balanceOf',
    outputs: [{ name: 'balance', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'hook', internalType: 'address', type: 'address' },
      { name: 'tokenIds', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    name: 'cashOutWeightOf',
    outputs: [{ name: 'weight', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'hook', internalType: 'address', type: 'address' }],
    name: 'cleanTiers',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'hook', internalType: 'address', type: 'address' }],
    name: 'defaultReserveBeneficiaryOf',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'hook', internalType: 'address', type: 'address' },
      { name: 'tierId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'encodedIPFSUriOf',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'hook', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'encodedTierIPFSUriOf',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'hook', internalType: 'address', type: 'address' }],
    name: 'flagsOf',
    outputs: [
      {
        name: '',
        internalType: 'struct JB721TiersHookFlags',
        type: 'tuple',
        components: [
          {
            name: 'noNewTiersWithReserves',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'noNewTiersWithVotes', internalType: 'bool', type: 'bool' },
          {
            name: 'noNewTiersWithOwnerMinting',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'preventOverspending', internalType: 'bool', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'hook', internalType: 'address', type: 'address' },
      { name: 'tierId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'isTierRemoved',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'hook', internalType: 'address', type: 'address' }],
    name: 'maxTierIdOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'hook', internalType: 'address', type: 'address' },
      { name: 'tierId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'numberOfBurnedFor',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'hook', internalType: 'address', type: 'address' },
      { name: 'tierId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'numberOfPendingReservesFor',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'hook', internalType: 'address', type: 'address' },
      { name: 'tierId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'numberOfReservesMintedFor',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'tiersToAdd',
        internalType: 'struct JB721TierConfig[]',
        type: 'tuple[]',
        components: [
          { name: 'price', internalType: 'uint104', type: 'uint104' },
          { name: 'initialSupply', internalType: 'uint32', type: 'uint32' },
          { name: 'votingUnits', internalType: 'uint32', type: 'uint32' },
          { name: 'reserveFrequency', internalType: 'uint16', type: 'uint16' },
          {
            name: 'reserveBeneficiary',
            internalType: 'address',
            type: 'address',
          },
          { name: 'encodedIPFSUri', internalType: 'bytes32', type: 'bytes32' },
          { name: 'category', internalType: 'uint24', type: 'uint24' },
          { name: 'discountPercent', internalType: 'uint8', type: 'uint8' },
          { name: 'allowOwnerMint', internalType: 'bool', type: 'bool' },
          {
            name: 'useReserveBeneficiaryAsDefault',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'transfersPausable', internalType: 'bool', type: 'bool' },
          { name: 'useVotingUnits', internalType: 'bool', type: 'bool' },
          { name: 'cannotBeRemoved', internalType: 'bool', type: 'bool' },
          {
            name: 'cannotIncreaseDiscountPercent',
            internalType: 'bool',
            type: 'bool',
          },
        ],
      },
    ],
    name: 'recordAddTiers',
    outputs: [
      { name: 'tierIds', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'tokenIds', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    name: 'recordBurn',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'flags',
        internalType: 'struct JB721TiersHookFlags',
        type: 'tuple',
        components: [
          {
            name: 'noNewTiersWithReserves',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'noNewTiersWithVotes', internalType: 'bool', type: 'bool' },
          {
            name: 'noNewTiersWithOwnerMinting',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'preventOverspending', internalType: 'bool', type: 'bool' },
        ],
      },
    ],
    name: 'recordFlags',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'tierIds', internalType: 'uint16[]', type: 'uint16[]' },
      { name: 'isOwnerMint', internalType: 'bool', type: 'bool' },
    ],
    name: 'recordMint',
    outputs: [
      { name: 'tokenIds', internalType: 'uint256[]', type: 'uint256[]' },
      { name: 'leftoverAmount', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'tierId', internalType: 'uint256', type: 'uint256' },
      { name: 'count', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'recordMintReservesFor',
    outputs: [
      { name: 'tokenIds', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'tierIds', internalType: 'uint256[]', type: 'uint256[]' }],
    name: 'recordRemoveTierIds',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'tierId', internalType: 'uint256', type: 'uint256' },
      { name: 'discountPercent', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'recordSetDiscountPercentOf',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'tierId', internalType: 'uint256', type: 'uint256' },
      { name: 'encodedIPFSUri', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'recordSetEncodedIPFSUriOf',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'resolver',
        internalType: 'contract IJB721TokenUriResolver',
        type: 'address',
      },
    ],
    name: 'recordSetTokenUriResolver',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'tierId', internalType: 'uint256', type: 'uint256' },
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
    ],
    name: 'recordTransferForTier',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'hook', internalType: 'address', type: 'address' },
      { name: 'tierId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'reserveBeneficiaryOf',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'hook', internalType: 'address', type: 'address' },
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'tierId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'tierBalanceOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'tierIdOfToken',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [
      { name: 'hook', internalType: 'address', type: 'address' },
      { name: 'id', internalType: 'uint256', type: 'uint256' },
      { name: 'includeResolvedUri', internalType: 'bool', type: 'bool' },
    ],
    name: 'tierOf',
    outputs: [
      {
        name: '',
        internalType: 'struct JB721Tier',
        type: 'tuple',
        components: [
          { name: 'id', internalType: 'uint32', type: 'uint32' },
          { name: 'price', internalType: 'uint104', type: 'uint104' },
          { name: 'remainingSupply', internalType: 'uint32', type: 'uint32' },
          { name: 'initialSupply', internalType: 'uint32', type: 'uint32' },
          { name: 'votingUnits', internalType: 'uint104', type: 'uint104' },
          { name: 'reserveFrequency', internalType: 'uint16', type: 'uint16' },
          {
            name: 'reserveBeneficiary',
            internalType: 'address',
            type: 'address',
          },
          { name: 'encodedIPFSUri', internalType: 'bytes32', type: 'bytes32' },
          { name: 'category', internalType: 'uint24', type: 'uint24' },
          { name: 'discountPercent', internalType: 'uint8', type: 'uint8' },
          { name: 'allowOwnerMint', internalType: 'bool', type: 'bool' },
          { name: 'transfersPausable', internalType: 'bool', type: 'bool' },
          { name: 'cannotBeRemoved', internalType: 'bool', type: 'bool' },
          {
            name: 'cannotIncreaseDiscountPercent',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'resolvedUri', internalType: 'string', type: 'string' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'hook', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'includeResolvedUri', internalType: 'bool', type: 'bool' },
    ],
    name: 'tierOfTokenId',
    outputs: [
      {
        name: '',
        internalType: 'struct JB721Tier',
        type: 'tuple',
        components: [
          { name: 'id', internalType: 'uint32', type: 'uint32' },
          { name: 'price', internalType: 'uint104', type: 'uint104' },
          { name: 'remainingSupply', internalType: 'uint32', type: 'uint32' },
          { name: 'initialSupply', internalType: 'uint32', type: 'uint32' },
          { name: 'votingUnits', internalType: 'uint104', type: 'uint104' },
          { name: 'reserveFrequency', internalType: 'uint16', type: 'uint16' },
          {
            name: 'reserveBeneficiary',
            internalType: 'address',
            type: 'address',
          },
          { name: 'encodedIPFSUri', internalType: 'bytes32', type: 'bytes32' },
          { name: 'category', internalType: 'uint24', type: 'uint24' },
          { name: 'discountPercent', internalType: 'uint8', type: 'uint8' },
          { name: 'allowOwnerMint', internalType: 'bool', type: 'bool' },
          { name: 'transfersPausable', internalType: 'bool', type: 'bool' },
          { name: 'cannotBeRemoved', internalType: 'bool', type: 'bool' },
          {
            name: 'cannotIncreaseDiscountPercent',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'resolvedUri', internalType: 'string', type: 'string' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'hook', internalType: 'address', type: 'address' },
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'tierId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'tierVotingUnitsOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'hook', internalType: 'address', type: 'address' },
      { name: 'categories', internalType: 'uint256[]', type: 'uint256[]' },
      { name: 'includeResolvedUri', internalType: 'bool', type: 'bool' },
      { name: 'startingId', internalType: 'uint256', type: 'uint256' },
      { name: 'size', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'tiersOf',
    outputs: [
      {
        name: 'tiers',
        internalType: 'struct JB721Tier[]',
        type: 'tuple[]',
        components: [
          { name: 'id', internalType: 'uint32', type: 'uint32' },
          { name: 'price', internalType: 'uint104', type: 'uint104' },
          { name: 'remainingSupply', internalType: 'uint32', type: 'uint32' },
          { name: 'initialSupply', internalType: 'uint32', type: 'uint32' },
          { name: 'votingUnits', internalType: 'uint104', type: 'uint104' },
          { name: 'reserveFrequency', internalType: 'uint16', type: 'uint16' },
          {
            name: 'reserveBeneficiary',
            internalType: 'address',
            type: 'address',
          },
          { name: 'encodedIPFSUri', internalType: 'bytes32', type: 'bytes32' },
          { name: 'category', internalType: 'uint24', type: 'uint24' },
          { name: 'discountPercent', internalType: 'uint8', type: 'uint8' },
          { name: 'allowOwnerMint', internalType: 'bool', type: 'bool' },
          { name: 'transfersPausable', internalType: 'bool', type: 'bool' },
          { name: 'cannotBeRemoved', internalType: 'bool', type: 'bool' },
          {
            name: 'cannotIncreaseDiscountPercent',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'resolvedUri', internalType: 'string', type: 'string' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'hook', internalType: 'address', type: 'address' }],
    name: 'tokenUriResolverOf',
    outputs: [
      {
        name: '',
        internalType: 'contract IJB721TokenUriResolver',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'hook', internalType: 'address', type: 'address' }],
    name: 'totalCashOutWeight',
    outputs: [{ name: 'weight', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'hook', internalType: 'address', type: 'address' }],
    name: 'totalSupplyOf',
    outputs: [{ name: 'supply', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'hook', internalType: 'address', type: 'address' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'votingUnitsOf',
    outputs: [{ name: 'units', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'hook', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'CleanTiers',
  },
  { type: 'error', inputs: [], name: 'JB721TiersHookStore_CantMintManually' },
  { type: 'error', inputs: [], name: 'JB721TiersHookStore_CantRemoveTier' },
  {
    type: 'error',
    inputs: [
      { name: 'percent', internalType: 'uint256', type: 'uint256' },
      { name: 'limit', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JB721TiersHookStore_DiscountPercentExceedsBounds',
  },
  {
    type: 'error',
    inputs: [
      { name: 'percent', internalType: 'uint256', type: 'uint256' },
      { name: 'storedPercent', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JB721TiersHookStore_DiscountPercentIncreaseNotAllowed',
  },
  {
    type: 'error',
    inputs: [
      { name: 'count', internalType: 'uint256', type: 'uint256' },
      {
        name: 'numberOfPendingReserves',
        internalType: 'uint256',
        type: 'uint256',
      },
    ],
    name: 'JB721TiersHookStore_InsufficientPendingReserves',
  },
  {
    type: 'error',
    inputs: [],
    name: 'JB721TiersHookStore_InsufficientSupplyRemaining',
  },
  {
    type: 'error',
    inputs: [
      { name: 'tierCategory', internalType: 'uint256', type: 'uint256' },
      {
        name: 'previousTierCategory',
        internalType: 'uint256',
        type: 'uint256',
      },
    ],
    name: 'JB721TiersHookStore_InvalidCategorySortOrder',
  },
  {
    type: 'error',
    inputs: [
      { name: 'quantity', internalType: 'uint256', type: 'uint256' },
      { name: 'limit', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JB721TiersHookStore_InvalidQuantity',
  },
  {
    type: 'error',
    inputs: [],
    name: 'JB721TiersHookStore_ManualMintingNotAllowed',
  },
  {
    type: 'error',
    inputs: [
      { name: 'numberOfTiers', internalType: 'uint256', type: 'uint256' },
      { name: 'limit', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JB721TiersHookStore_MaxTiersExceeded',
  },
  {
    type: 'error',
    inputs: [
      { name: 'price', internalType: 'uint256', type: 'uint256' },
      { name: 'leftoverAmount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JB721TiersHookStore_PriceExceedsAmount',
  },
  {
    type: 'error',
    inputs: [],
    name: 'JB721TiersHookStore_ReserveFrequencyNotAllowed',
  },
  {
    type: 'error',
    inputs: [{ name: 'tierId', internalType: 'uint256', type: 'uint256' }],
    name: 'JB721TiersHookStore_TierRemoved',
  },
  { type: 'error', inputs: [], name: 'JB721TiersHookStore_UnrecognizedTier' },
  {
    type: 'error',
    inputs: [],
    name: 'JB721TiersHookStore_VotingUnitsNotAllowed',
  },
  { type: 'error', inputs: [], name: 'JB721TiersHookStore_ZeroInitialSupply' },
  {
    type: 'error',
    inputs: [
      { name: 'x', internalType: 'uint256', type: 'uint256' },
      { name: 'y', internalType: 'uint256', type: 'uint256' },
      { name: 'denominator', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'PRBMath_MulDiv_Overflow',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBAddressRegistry
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 */
export const jbAddressRegistryAbi = [
  {
    type: 'function',
    inputs: [{ name: 'addr', internalType: 'address', type: 'address' }],
    name: 'deployerOf',
    outputs: [{ name: 'deployer', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'deployer', internalType: 'address', type: 'address' },
      { name: 'nonce', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'registerAddress',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'deployer', internalType: 'address', type: 'address' },
      { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
      { name: 'bytecode', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'registerAddress',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'addr', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'deployer',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'AddressRegistered',
  },
] as const

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 */
export const jbAddressRegistryAddress = {
  84532: '0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C',
  421614: '0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C',
  11155111: '0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C',
  11155420: '0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C',
} as const

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 */
export const jbAddressRegistryConfig = {
  address: jbAddressRegistryAddress,
  abi: jbAddressRegistryAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBBuybackHook
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const jbBuybackHookAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'directory',
        internalType: 'contract IJBDirectory',
        type: 'address',
      },
      {
        name: 'controller',
        internalType: 'contract IJBController',
        type: 'address',
      },
      { name: 'prices', internalType: 'contract IJBPrices', type: 'address' },
      { name: 'weth', internalType: 'contract IWETH9', type: 'address' },
      { name: 'factory', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'CONTROLLER',
    outputs: [
      { name: '', internalType: 'contract IJBController', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DIRECTORY',
    outputs: [
      { name: '', internalType: 'contract IJBDirectory', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MAX_TWAP_SLIPPAGE_TOLERANCE',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MAX_TWAP_WINDOW',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MIN_TWAP_SLIPPAGE_TOLERANCE',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MIN_TWAP_WINDOW',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PERMISSIONS',
    outputs: [
      { name: '', internalType: 'contract IJBPermissions', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PRICES',
    outputs: [
      { name: '', internalType: 'contract IJBPrices', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PROJECTS',
    outputs: [
      { name: '', internalType: 'contract IJBProjects', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'TWAP_SLIPPAGE_DENOMINATOR',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'UNISWAP_V3_FACTORY',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'WETH',
    outputs: [{ name: '', internalType: 'contract IWETH9', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'context',
        internalType: 'struct JBAfterPayRecordedContext',
        type: 'tuple',
        components: [
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'projectId', internalType: 'uint256', type: 'uint256' },
          { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
          {
            name: 'amount',
            internalType: 'struct JBTokenAmount',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'decimals', internalType: 'uint8', type: 'uint8' },
              { name: 'currency', internalType: 'uint32', type: 'uint32' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
            ],
          },
          {
            name: 'forwardedAmount',
            internalType: 'struct JBTokenAmount',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'decimals', internalType: 'uint8', type: 'uint8' },
              { name: 'currency', internalType: 'uint32', type: 'uint32' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
            ],
          },
          { name: 'weight', internalType: 'uint256', type: 'uint256' },
          {
            name: 'newlyIssuedTokenCount',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'beneficiary', internalType: 'address', type: 'address' },
          { name: 'hookMetadata', internalType: 'bytes', type: 'bytes' },
          { name: 'payerMetadata', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    name: 'afterPayRecordedWith',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'context',
        internalType: 'struct JBBeforeCashOutRecordedContext',
        type: 'tuple',
        components: [
          { name: 'terminal', internalType: 'address', type: 'address' },
          { name: 'holder', internalType: 'address', type: 'address' },
          { name: 'projectId', internalType: 'uint256', type: 'uint256' },
          { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
          { name: 'cashOutCount', internalType: 'uint256', type: 'uint256' },
          { name: 'totalSupply', internalType: 'uint256', type: 'uint256' },
          {
            name: 'surplus',
            internalType: 'struct JBTokenAmount',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'decimals', internalType: 'uint8', type: 'uint8' },
              { name: 'currency', internalType: 'uint32', type: 'uint32' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
            ],
          },
          { name: 'useTotalSurplus', internalType: 'bool', type: 'bool' },
          { name: 'cashOutTaxRate', internalType: 'uint256', type: 'uint256' },
          { name: 'metadata', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    name: 'beforeCashOutRecordedWith',
    outputs: [
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'uint256', type: 'uint256' },
      {
        name: 'hookSpecifications',
        internalType: 'struct JBCashOutHookSpecification[]',
        type: 'tuple[]',
        components: [
          {
            name: 'hook',
            internalType: 'contract IJBCashOutHook',
            type: 'address',
          },
          { name: 'amount', internalType: 'uint256', type: 'uint256' },
          { name: 'metadata', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'context',
        internalType: 'struct JBBeforePayRecordedContext',
        type: 'tuple',
        components: [
          { name: 'terminal', internalType: 'address', type: 'address' },
          { name: 'payer', internalType: 'address', type: 'address' },
          {
            name: 'amount',
            internalType: 'struct JBTokenAmount',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'decimals', internalType: 'uint8', type: 'uint8' },
              { name: 'currency', internalType: 'uint32', type: 'uint32' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
            ],
          },
          { name: 'projectId', internalType: 'uint256', type: 'uint256' },
          { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
          { name: 'beneficiary', internalType: 'address', type: 'address' },
          { name: 'weight', internalType: 'uint256', type: 'uint256' },
          { name: 'reservedPercent', internalType: 'uint256', type: 'uint256' },
          { name: 'metadata', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    name: 'beforePayRecordedWith',
    outputs: [
      { name: 'weight', internalType: 'uint256', type: 'uint256' },
      {
        name: 'hookSpecifications',
        internalType: 'struct JBPayHookSpecification[]',
        type: 'tuple[]',
        components: [
          {
            name: 'hook',
            internalType: 'contract IJBPayHook',
            type: 'address',
          },
          { name: 'amount', internalType: 'uint256', type: 'uint256' },
          { name: 'metadata', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'address', type: 'address' },
    ],
    name: 'hasMintPermissionFor',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'terminalToken', internalType: 'address', type: 'address' },
    ],
    name: 'poolOf',
    outputs: [
      { name: '', internalType: 'contract IUniswapV3Pool', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'projectTokenOf',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'fee', internalType: 'uint24', type: 'uint24' },
      { name: 'twapWindow', internalType: 'uint32', type: 'uint32' },
      {
        name: 'twapSlippageTolerance',
        internalType: 'uint256',
        type: 'uint256',
      },
      { name: 'terminalToken', internalType: 'address', type: 'address' },
    ],
    name: 'setPoolFor',
    outputs: [
      {
        name: 'newPool',
        internalType: 'contract IUniswapV3Pool',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'newSlippageTolerance',
        internalType: 'uint256',
        type: 'uint256',
      },
    ],
    name: 'setTwapSlippageToleranceOf',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'newWindow', internalType: 'uint32', type: 'uint32' },
    ],
    name: 'setTwapWindowOf',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'twapSlippageToleranceOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'twapWindowOf',
    outputs: [{ name: '', internalType: 'uint32', type: 'uint32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'amount0Delta', internalType: 'int256', type: 'int256' },
      { name: 'amount1Delta', internalType: 'int256', type: 'int256' },
      { name: 'data', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'uniswapV3SwapCallback',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'leftoverAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'tokenCount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Mint',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'terminalToken',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'pool',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'PoolAdded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'amountToSwapWith',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'pool',
        internalType: 'contract IUniswapV3Pool',
        type: 'address',
        indexed: false,
      },
      {
        name: 'amountReceived',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Swap',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'oldTolerance',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'newTolerance',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'TwapSlippageToleranceChanged',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'oldWindow',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'newWindow',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'TwapWindowChanged',
  },
  {
    type: 'error',
    inputs: [{ name: 'caller', internalType: 'address', type: 'address' }],
    name: 'JBBuybackHook_CallerNotPool',
  },
  {
    type: 'error',
    inputs: [
      { name: 'swapAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'totalPaid', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBBuybackHook_InsufficientPayAmount',
  },
  {
    type: 'error',
    inputs: [
      { name: 'value', internalType: 'uint256', type: 'uint256' },
      { name: 'min', internalType: 'uint256', type: 'uint256' },
      { name: 'max', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBBuybackHook_InvalidTwapSlippageTolerance',
  },
  {
    type: 'error',
    inputs: [
      { name: 'value', internalType: 'uint256', type: 'uint256' },
      { name: 'min', internalType: 'uint256', type: 'uint256' },
      { name: 'max', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBBuybackHook_InvalidTwapWindow',
  },
  {
    type: 'error',
    inputs: [
      {
        name: 'pool',
        internalType: 'contract IUniswapV3Pool',
        type: 'address',
      },
    ],
    name: 'JBBuybackHook_PoolAlreadySet',
  },
  {
    type: 'error',
    inputs: [
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'minimum', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBBuybackHook_SpecifiedSlippageExceeded',
  },
  {
    type: 'error',
    inputs: [
      { name: 'terminalToken', internalType: 'address', type: 'address' },
      { name: 'projectToken', internalType: 'address', type: 'address' },
    ],
    name: 'JBBuybackHook_TerminalTokenIsProjectToken',
  },
  {
    type: 'error',
    inputs: [{ name: 'caller', internalType: 'address', type: 'address' }],
    name: 'JBBuybackHook_Unauthorized',
  },
  { type: 'error', inputs: [], name: 'JBBuybackHook_ZeroProjectToken' },
  { type: 'error', inputs: [], name: 'JBBuybackHook_ZeroTerminalToken' },
  {
    type: 'error',
    inputs: [
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'sender', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'permissionId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBPermissioned_Unauthorized',
  },
  {
    type: 'error',
    inputs: [
      { name: 'x', internalType: 'uint256', type: 'uint256' },
      { name: 'y', internalType: 'uint256', type: 'uint256' },
      { name: 'denominator', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'PRBMath_MulDiv_Overflow',
  },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation',
  },
  { type: 'error', inputs: [], name: 'T' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBController
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const jbControllerAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'directory',
        internalType: 'contract IJBDirectory',
        type: 'address',
      },
      {
        name: 'fundAccessLimits',
        internalType: 'contract IJBFundAccessLimits',
        type: 'address',
      },
      {
        name: 'permissions',
        internalType: 'contract IJBPermissions',
        type: 'address',
      },
      { name: 'prices', internalType: 'contract IJBPrices', type: 'address' },
      {
        name: 'projects',
        internalType: 'contract IJBProjects',
        type: 'address',
      },
      {
        name: 'rulesets',
        internalType: 'contract IJBRulesets',
        type: 'address',
      },
      { name: 'splits', internalType: 'contract IJBSplits', type: 'address' },
      { name: 'tokens', internalType: 'contract IJBTokens', type: 'address' },
      { name: 'trustedForwarder', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DIRECTORY',
    outputs: [
      { name: '', internalType: 'contract IJBDirectory', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'FUND_ACCESS_LIMITS',
    outputs: [
      {
        name: '',
        internalType: 'contract IJBFundAccessLimits',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PERMISSIONS',
    outputs: [
      { name: '', internalType: 'contract IJBPermissions', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PRICES',
    outputs: [
      { name: '', internalType: 'contract IJBPrices', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PROJECTS',
    outputs: [
      { name: '', internalType: 'contract IJBProjects', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'RULESETS',
    outputs: [
      { name: '', internalType: 'contract IJBRulesets', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'SPLITS',
    outputs: [
      { name: '', internalType: 'contract IJBSplits', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'TOKENS',
    outputs: [
      { name: '', internalType: 'contract IJBTokens', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'pricingCurrency', internalType: 'uint256', type: 'uint256' },
      { name: 'unitCurrency', internalType: 'uint256', type: 'uint256' },
      { name: 'feed', internalType: 'contract IJBPriceFeed', type: 'address' },
    ],
    name: 'addPriceFeed',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'startingId', internalType: 'uint256', type: 'uint256' },
      { name: 'size', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'allRulesetsOf',
    outputs: [
      {
        name: 'rulesets',
        internalType: 'struct JBRulesetWithMetadata[]',
        type: 'tuple[]',
        components: [
          {
            name: 'ruleset',
            internalType: 'struct JBRuleset',
            type: 'tuple',
            components: [
              { name: 'cycleNumber', internalType: 'uint48', type: 'uint48' },
              { name: 'id', internalType: 'uint48', type: 'uint48' },
              { name: 'basedOnId', internalType: 'uint48', type: 'uint48' },
              { name: 'start', internalType: 'uint48', type: 'uint48' },
              { name: 'duration', internalType: 'uint32', type: 'uint32' },
              { name: 'weight', internalType: 'uint112', type: 'uint112' },
              {
                name: 'weightCutPercent',
                internalType: 'uint32',
                type: 'uint32',
              },
              {
                name: 'approvalHook',
                internalType: 'contract IJBRulesetApprovalHook',
                type: 'address',
              },
              { name: 'metadata', internalType: 'uint256', type: 'uint256' },
            ],
          },
          {
            name: 'metadata',
            internalType: 'struct JBRulesetMetadata',
            type: 'tuple',
            components: [
              {
                name: 'reservedPercent',
                internalType: 'uint16',
                type: 'uint16',
              },
              {
                name: 'cashOutTaxRate',
                internalType: 'uint16',
                type: 'uint16',
              },
              { name: 'baseCurrency', internalType: 'uint32', type: 'uint32' },
              { name: 'pausePay', internalType: 'bool', type: 'bool' },
              {
                name: 'pauseCreditTransfers',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'allowOwnerMinting', internalType: 'bool', type: 'bool' },
              {
                name: 'allowSetCustomToken',
                internalType: 'bool',
                type: 'bool',
              },
              {
                name: 'allowTerminalMigration',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'allowSetTerminals', internalType: 'bool', type: 'bool' },
              {
                name: 'allowSetController',
                internalType: 'bool',
                type: 'bool',
              },
              {
                name: 'allowAddAccountingContext',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'allowAddPriceFeed', internalType: 'bool', type: 'bool' },
              {
                name: 'ownerMustSendPayouts',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'holdFees', internalType: 'bool', type: 'bool' },
              {
                name: 'useTotalSurplusForCashOuts',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'useDataHookForPay', internalType: 'bool', type: 'bool' },
              {
                name: 'useDataHookForCashOut',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'dataHook', internalType: 'address', type: 'address' },
              { name: 'metadata', internalType: 'uint16', type: 'uint16' },
            ],
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'contract IERC165', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'beforeReceiveMigrationFrom',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'holder', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'tokenCount', internalType: 'uint256', type: 'uint256' },
      { name: 'memo', internalType: 'string', type: 'string' },
    ],
    name: 'burnTokensOf',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'holder', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'tokenCount', internalType: 'uint256', type: 'uint256' },
      { name: 'beneficiary', internalType: 'address', type: 'address' },
    ],
    name: 'claimTokensFor',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'currentRulesetOf',
    outputs: [
      {
        name: 'ruleset',
        internalType: 'struct JBRuleset',
        type: 'tuple',
        components: [
          { name: 'cycleNumber', internalType: 'uint48', type: 'uint48' },
          { name: 'id', internalType: 'uint48', type: 'uint48' },
          { name: 'basedOnId', internalType: 'uint48', type: 'uint48' },
          { name: 'start', internalType: 'uint48', type: 'uint48' },
          { name: 'duration', internalType: 'uint32', type: 'uint32' },
          { name: 'weight', internalType: 'uint112', type: 'uint112' },
          { name: 'weightCutPercent', internalType: 'uint32', type: 'uint32' },
          {
            name: 'approvalHook',
            internalType: 'contract IJBRulesetApprovalHook',
            type: 'address',
          },
          { name: 'metadata', internalType: 'uint256', type: 'uint256' },
        ],
      },
      {
        name: 'metadata',
        internalType: 'struct JBRulesetMetadata',
        type: 'tuple',
        components: [
          { name: 'reservedPercent', internalType: 'uint16', type: 'uint16' },
          { name: 'cashOutTaxRate', internalType: 'uint16', type: 'uint16' },
          { name: 'baseCurrency', internalType: 'uint32', type: 'uint32' },
          { name: 'pausePay', internalType: 'bool', type: 'bool' },
          { name: 'pauseCreditTransfers', internalType: 'bool', type: 'bool' },
          { name: 'allowOwnerMinting', internalType: 'bool', type: 'bool' },
          { name: 'allowSetCustomToken', internalType: 'bool', type: 'bool' },
          {
            name: 'allowTerminalMigration',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'allowSetTerminals', internalType: 'bool', type: 'bool' },
          { name: 'allowSetController', internalType: 'bool', type: 'bool' },
          {
            name: 'allowAddAccountingContext',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'allowAddPriceFeed', internalType: 'bool', type: 'bool' },
          { name: 'ownerMustSendPayouts', internalType: 'bool', type: 'bool' },
          { name: 'holdFees', internalType: 'bool', type: 'bool' },
          {
            name: 'useTotalSurplusForCashOuts',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'useDataHookForPay', internalType: 'bool', type: 'bool' },
          { name: 'useDataHookForCashOut', internalType: 'bool', type: 'bool' },
          { name: 'dataHook', internalType: 'address', type: 'address' },
          { name: 'metadata', internalType: 'uint16', type: 'uint16' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'name', internalType: 'string', type: 'string' },
      { name: 'symbol', internalType: 'string', type: 'string' },
      { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'deployERC20For',
    outputs: [
      { name: 'token', internalType: 'contract IJBToken', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'terminal',
        internalType: 'contract IJBTerminal',
        type: 'address',
      },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'contract IJBToken', type: 'address' },
      { name: 'splitTokenCount', internalType: 'uint256', type: 'uint256' },
      { name: 'beneficiary', internalType: 'address', type: 'address' },
      { name: 'metadata', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'executePayReservedTokenToTerminal',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'getRulesetOf',
    outputs: [
      {
        name: 'ruleset',
        internalType: 'struct JBRuleset',
        type: 'tuple',
        components: [
          { name: 'cycleNumber', internalType: 'uint48', type: 'uint48' },
          { name: 'id', internalType: 'uint48', type: 'uint48' },
          { name: 'basedOnId', internalType: 'uint48', type: 'uint48' },
          { name: 'start', internalType: 'uint48', type: 'uint48' },
          { name: 'duration', internalType: 'uint32', type: 'uint32' },
          { name: 'weight', internalType: 'uint112', type: 'uint112' },
          { name: 'weightCutPercent', internalType: 'uint32', type: 'uint32' },
          {
            name: 'approvalHook',
            internalType: 'contract IJBRulesetApprovalHook',
            type: 'address',
          },
          { name: 'metadata', internalType: 'uint256', type: 'uint256' },
        ],
      },
      {
        name: 'metadata',
        internalType: 'struct JBRulesetMetadata',
        type: 'tuple',
        components: [
          { name: 'reservedPercent', internalType: 'uint16', type: 'uint16' },
          { name: 'cashOutTaxRate', internalType: 'uint16', type: 'uint16' },
          { name: 'baseCurrency', internalType: 'uint32', type: 'uint32' },
          { name: 'pausePay', internalType: 'bool', type: 'bool' },
          { name: 'pauseCreditTransfers', internalType: 'bool', type: 'bool' },
          { name: 'allowOwnerMinting', internalType: 'bool', type: 'bool' },
          { name: 'allowSetCustomToken', internalType: 'bool', type: 'bool' },
          {
            name: 'allowTerminalMigration',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'allowSetTerminals', internalType: 'bool', type: 'bool' },
          { name: 'allowSetController', internalType: 'bool', type: 'bool' },
          {
            name: 'allowAddAccountingContext',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'allowAddPriceFeed', internalType: 'bool', type: 'bool' },
          { name: 'ownerMustSendPayouts', internalType: 'bool', type: 'bool' },
          { name: 'holdFees', internalType: 'bool', type: 'bool' },
          {
            name: 'useTotalSurplusForCashOuts',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'useDataHookForPay', internalType: 'bool', type: 'bool' },
          { name: 'useDataHookForCashOut', internalType: 'bool', type: 'bool' },
          { name: 'dataHook', internalType: 'address', type: 'address' },
          { name: 'metadata', internalType: 'uint16', type: 'uint16' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'forwarder', internalType: 'address', type: 'address' }],
    name: 'isTrustedForwarder',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'latestQueuedRulesetOf',
    outputs: [
      {
        name: 'ruleset',
        internalType: 'struct JBRuleset',
        type: 'tuple',
        components: [
          { name: 'cycleNumber', internalType: 'uint48', type: 'uint48' },
          { name: 'id', internalType: 'uint48', type: 'uint48' },
          { name: 'basedOnId', internalType: 'uint48', type: 'uint48' },
          { name: 'start', internalType: 'uint48', type: 'uint48' },
          { name: 'duration', internalType: 'uint32', type: 'uint32' },
          { name: 'weight', internalType: 'uint112', type: 'uint112' },
          { name: 'weightCutPercent', internalType: 'uint32', type: 'uint32' },
          {
            name: 'approvalHook',
            internalType: 'contract IJBRulesetApprovalHook',
            type: 'address',
          },
          { name: 'metadata', internalType: 'uint256', type: 'uint256' },
        ],
      },
      {
        name: 'metadata',
        internalType: 'struct JBRulesetMetadata',
        type: 'tuple',
        components: [
          { name: 'reservedPercent', internalType: 'uint16', type: 'uint16' },
          { name: 'cashOutTaxRate', internalType: 'uint16', type: 'uint16' },
          { name: 'baseCurrency', internalType: 'uint32', type: 'uint32' },
          { name: 'pausePay', internalType: 'bool', type: 'bool' },
          { name: 'pauseCreditTransfers', internalType: 'bool', type: 'bool' },
          { name: 'allowOwnerMinting', internalType: 'bool', type: 'bool' },
          { name: 'allowSetCustomToken', internalType: 'bool', type: 'bool' },
          {
            name: 'allowTerminalMigration',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'allowSetTerminals', internalType: 'bool', type: 'bool' },
          { name: 'allowSetController', internalType: 'bool', type: 'bool' },
          {
            name: 'allowAddAccountingContext',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'allowAddPriceFeed', internalType: 'bool', type: 'bool' },
          { name: 'ownerMustSendPayouts', internalType: 'bool', type: 'bool' },
          { name: 'holdFees', internalType: 'bool', type: 'bool' },
          {
            name: 'useTotalSurplusForCashOuts',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'useDataHookForPay', internalType: 'bool', type: 'bool' },
          { name: 'useDataHookForCashOut', internalType: 'bool', type: 'bool' },
          { name: 'dataHook', internalType: 'address', type: 'address' },
          { name: 'metadata', internalType: 'uint16', type: 'uint16' },
        ],
      },
      {
        name: 'approvalStatus',
        internalType: 'enum JBApprovalStatus',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'projectUri', internalType: 'string', type: 'string' },
      {
        name: 'rulesetConfigurations',
        internalType: 'struct JBRulesetConfig[]',
        type: 'tuple[]',
        components: [
          {
            name: 'mustStartAtOrAfter',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'duration', internalType: 'uint32', type: 'uint32' },
          { name: 'weight', internalType: 'uint112', type: 'uint112' },
          { name: 'weightCutPercent', internalType: 'uint32', type: 'uint32' },
          {
            name: 'approvalHook',
            internalType: 'contract IJBRulesetApprovalHook',
            type: 'address',
          },
          {
            name: 'metadata',
            internalType: 'struct JBRulesetMetadata',
            type: 'tuple',
            components: [
              {
                name: 'reservedPercent',
                internalType: 'uint16',
                type: 'uint16',
              },
              {
                name: 'cashOutTaxRate',
                internalType: 'uint16',
                type: 'uint16',
              },
              { name: 'baseCurrency', internalType: 'uint32', type: 'uint32' },
              { name: 'pausePay', internalType: 'bool', type: 'bool' },
              {
                name: 'pauseCreditTransfers',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'allowOwnerMinting', internalType: 'bool', type: 'bool' },
              {
                name: 'allowSetCustomToken',
                internalType: 'bool',
                type: 'bool',
              },
              {
                name: 'allowTerminalMigration',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'allowSetTerminals', internalType: 'bool', type: 'bool' },
              {
                name: 'allowSetController',
                internalType: 'bool',
                type: 'bool',
              },
              {
                name: 'allowAddAccountingContext',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'allowAddPriceFeed', internalType: 'bool', type: 'bool' },
              {
                name: 'ownerMustSendPayouts',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'holdFees', internalType: 'bool', type: 'bool' },
              {
                name: 'useTotalSurplusForCashOuts',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'useDataHookForPay', internalType: 'bool', type: 'bool' },
              {
                name: 'useDataHookForCashOut',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'dataHook', internalType: 'address', type: 'address' },
              { name: 'metadata', internalType: 'uint16', type: 'uint16' },
            ],
          },
          {
            name: 'splitGroups',
            internalType: 'struct JBSplitGroup[]',
            type: 'tuple[]',
            components: [
              { name: 'groupId', internalType: 'uint256', type: 'uint256' },
              {
                name: 'splits',
                internalType: 'struct JBSplit[]',
                type: 'tuple[]',
                components: [
                  { name: 'percent', internalType: 'uint32', type: 'uint32' },
                  { name: 'projectId', internalType: 'uint64', type: 'uint64' },
                  {
                    name: 'beneficiary',
                    internalType: 'address payable',
                    type: 'address',
                  },
                  {
                    name: 'preferAddToBalance',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'lockedUntil',
                    internalType: 'uint48',
                    type: 'uint48',
                  },
                  {
                    name: 'hook',
                    internalType: 'contract IJBSplitHook',
                    type: 'address',
                  },
                ],
              },
            ],
          },
          {
            name: 'fundAccessLimitGroups',
            internalType: 'struct JBFundAccessLimitGroup[]',
            type: 'tuple[]',
            components: [
              { name: 'terminal', internalType: 'address', type: 'address' },
              { name: 'token', internalType: 'address', type: 'address' },
              {
                name: 'payoutLimits',
                internalType: 'struct JBCurrencyAmount[]',
                type: 'tuple[]',
                components: [
                  { name: 'amount', internalType: 'uint224', type: 'uint224' },
                  { name: 'currency', internalType: 'uint32', type: 'uint32' },
                ],
              },
              {
                name: 'surplusAllowances',
                internalType: 'struct JBCurrencyAmount[]',
                type: 'tuple[]',
                components: [
                  { name: 'amount', internalType: 'uint224', type: 'uint224' },
                  { name: 'currency', internalType: 'uint32', type: 'uint32' },
                ],
              },
            ],
          },
        ],
      },
      {
        name: 'terminalConfigurations',
        internalType: 'struct JBTerminalConfig[]',
        type: 'tuple[]',
        components: [
          {
            name: 'terminal',
            internalType: 'contract IJBTerminal',
            type: 'address',
          },
          {
            name: 'accountingContextsToAccept',
            internalType: 'struct JBAccountingContext[]',
            type: 'tuple[]',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'decimals', internalType: 'uint8', type: 'uint8' },
              { name: 'currency', internalType: 'uint32', type: 'uint32' },
            ],
          },
        ],
      },
      { name: 'memo', internalType: 'string', type: 'string' },
    ],
    name: 'launchProjectFor',
    outputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'rulesetConfigurations',
        internalType: 'struct JBRulesetConfig[]',
        type: 'tuple[]',
        components: [
          {
            name: 'mustStartAtOrAfter',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'duration', internalType: 'uint32', type: 'uint32' },
          { name: 'weight', internalType: 'uint112', type: 'uint112' },
          { name: 'weightCutPercent', internalType: 'uint32', type: 'uint32' },
          {
            name: 'approvalHook',
            internalType: 'contract IJBRulesetApprovalHook',
            type: 'address',
          },
          {
            name: 'metadata',
            internalType: 'struct JBRulesetMetadata',
            type: 'tuple',
            components: [
              {
                name: 'reservedPercent',
                internalType: 'uint16',
                type: 'uint16',
              },
              {
                name: 'cashOutTaxRate',
                internalType: 'uint16',
                type: 'uint16',
              },
              { name: 'baseCurrency', internalType: 'uint32', type: 'uint32' },
              { name: 'pausePay', internalType: 'bool', type: 'bool' },
              {
                name: 'pauseCreditTransfers',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'allowOwnerMinting', internalType: 'bool', type: 'bool' },
              {
                name: 'allowSetCustomToken',
                internalType: 'bool',
                type: 'bool',
              },
              {
                name: 'allowTerminalMigration',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'allowSetTerminals', internalType: 'bool', type: 'bool' },
              {
                name: 'allowSetController',
                internalType: 'bool',
                type: 'bool',
              },
              {
                name: 'allowAddAccountingContext',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'allowAddPriceFeed', internalType: 'bool', type: 'bool' },
              {
                name: 'ownerMustSendPayouts',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'holdFees', internalType: 'bool', type: 'bool' },
              {
                name: 'useTotalSurplusForCashOuts',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'useDataHookForPay', internalType: 'bool', type: 'bool' },
              {
                name: 'useDataHookForCashOut',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'dataHook', internalType: 'address', type: 'address' },
              { name: 'metadata', internalType: 'uint16', type: 'uint16' },
            ],
          },
          {
            name: 'splitGroups',
            internalType: 'struct JBSplitGroup[]',
            type: 'tuple[]',
            components: [
              { name: 'groupId', internalType: 'uint256', type: 'uint256' },
              {
                name: 'splits',
                internalType: 'struct JBSplit[]',
                type: 'tuple[]',
                components: [
                  { name: 'percent', internalType: 'uint32', type: 'uint32' },
                  { name: 'projectId', internalType: 'uint64', type: 'uint64' },
                  {
                    name: 'beneficiary',
                    internalType: 'address payable',
                    type: 'address',
                  },
                  {
                    name: 'preferAddToBalance',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'lockedUntil',
                    internalType: 'uint48',
                    type: 'uint48',
                  },
                  {
                    name: 'hook',
                    internalType: 'contract IJBSplitHook',
                    type: 'address',
                  },
                ],
              },
            ],
          },
          {
            name: 'fundAccessLimitGroups',
            internalType: 'struct JBFundAccessLimitGroup[]',
            type: 'tuple[]',
            components: [
              { name: 'terminal', internalType: 'address', type: 'address' },
              { name: 'token', internalType: 'address', type: 'address' },
              {
                name: 'payoutLimits',
                internalType: 'struct JBCurrencyAmount[]',
                type: 'tuple[]',
                components: [
                  { name: 'amount', internalType: 'uint224', type: 'uint224' },
                  { name: 'currency', internalType: 'uint32', type: 'uint32' },
                ],
              },
              {
                name: 'surplusAllowances',
                internalType: 'struct JBCurrencyAmount[]',
                type: 'tuple[]',
                components: [
                  { name: 'amount', internalType: 'uint224', type: 'uint224' },
                  { name: 'currency', internalType: 'uint32', type: 'uint32' },
                ],
              },
            ],
          },
        ],
      },
      {
        name: 'terminalConfigurations',
        internalType: 'struct JBTerminalConfig[]',
        type: 'tuple[]',
        components: [
          {
            name: 'terminal',
            internalType: 'contract IJBTerminal',
            type: 'address',
          },
          {
            name: 'accountingContextsToAccept',
            internalType: 'struct JBAccountingContext[]',
            type: 'tuple[]',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'decimals', internalType: 'uint8', type: 'uint8' },
              { name: 'currency', internalType: 'uint32', type: 'uint32' },
            ],
          },
        ],
      },
      { name: 'memo', internalType: 'string', type: 'string' },
    ],
    name: 'launchRulesetsFor',
    outputs: [{ name: 'rulesetId', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'to', internalType: 'contract IERC165', type: 'address' },
    ],
    name: 'migrate',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'tokenCount', internalType: 'uint256', type: 'uint256' },
      { name: 'beneficiary', internalType: 'address', type: 'address' },
      { name: 'memo', internalType: 'string', type: 'string' },
      { name: 'useReservedPercent', internalType: 'bool', type: 'bool' },
    ],
    name: 'mintTokensOf',
    outputs: [
      {
        name: 'beneficiaryTokenCount',
        internalType: 'uint256',
        type: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'pendingReservedTokenBalanceOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'rulesetConfigurations',
        internalType: 'struct JBRulesetConfig[]',
        type: 'tuple[]',
        components: [
          {
            name: 'mustStartAtOrAfter',
            internalType: 'uint48',
            type: 'uint48',
          },
          { name: 'duration', internalType: 'uint32', type: 'uint32' },
          { name: 'weight', internalType: 'uint112', type: 'uint112' },
          { name: 'weightCutPercent', internalType: 'uint32', type: 'uint32' },
          {
            name: 'approvalHook',
            internalType: 'contract IJBRulesetApprovalHook',
            type: 'address',
          },
          {
            name: 'metadata',
            internalType: 'struct JBRulesetMetadata',
            type: 'tuple',
            components: [
              {
                name: 'reservedPercent',
                internalType: 'uint16',
                type: 'uint16',
              },
              {
                name: 'cashOutTaxRate',
                internalType: 'uint16',
                type: 'uint16',
              },
              { name: 'baseCurrency', internalType: 'uint32', type: 'uint32' },
              { name: 'pausePay', internalType: 'bool', type: 'bool' },
              {
                name: 'pauseCreditTransfers',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'allowOwnerMinting', internalType: 'bool', type: 'bool' },
              {
                name: 'allowSetCustomToken',
                internalType: 'bool',
                type: 'bool',
              },
              {
                name: 'allowTerminalMigration',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'allowSetTerminals', internalType: 'bool', type: 'bool' },
              {
                name: 'allowSetController',
                internalType: 'bool',
                type: 'bool',
              },
              {
                name: 'allowAddAccountingContext',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'allowAddPriceFeed', internalType: 'bool', type: 'bool' },
              {
                name: 'ownerMustSendPayouts',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'holdFees', internalType: 'bool', type: 'bool' },
              {
                name: 'useTotalSurplusForCashOuts',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'useDataHookForPay', internalType: 'bool', type: 'bool' },
              {
                name: 'useDataHookForCashOut',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'dataHook', internalType: 'address', type: 'address' },
              { name: 'metadata', internalType: 'uint16', type: 'uint16' },
            ],
          },
          {
            name: 'splitGroups',
            internalType: 'struct JBSplitGroup[]',
            type: 'tuple[]',
            components: [
              { name: 'groupId', internalType: 'uint256', type: 'uint256' },
              {
                name: 'splits',
                internalType: 'struct JBSplit[]',
                type: 'tuple[]',
                components: [
                  { name: 'percent', internalType: 'uint32', type: 'uint32' },
                  { name: 'projectId', internalType: 'uint64', type: 'uint64' },
                  {
                    name: 'beneficiary',
                    internalType: 'address payable',
                    type: 'address',
                  },
                  {
                    name: 'preferAddToBalance',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  {
                    name: 'lockedUntil',
                    internalType: 'uint48',
                    type: 'uint48',
                  },
                  {
                    name: 'hook',
                    internalType: 'contract IJBSplitHook',
                    type: 'address',
                  },
                ],
              },
            ],
          },
          {
            name: 'fundAccessLimitGroups',
            internalType: 'struct JBFundAccessLimitGroup[]',
            type: 'tuple[]',
            components: [
              { name: 'terminal', internalType: 'address', type: 'address' },
              { name: 'token', internalType: 'address', type: 'address' },
              {
                name: 'payoutLimits',
                internalType: 'struct JBCurrencyAmount[]',
                type: 'tuple[]',
                components: [
                  { name: 'amount', internalType: 'uint224', type: 'uint224' },
                  { name: 'currency', internalType: 'uint32', type: 'uint32' },
                ],
              },
              {
                name: 'surplusAllowances',
                internalType: 'struct JBCurrencyAmount[]',
                type: 'tuple[]',
                components: [
                  { name: 'amount', internalType: 'uint224', type: 'uint224' },
                  { name: 'currency', internalType: 'uint32', type: 'uint32' },
                ],
              },
            ],
          },
        ],
      },
      { name: 'memo', internalType: 'string', type: 'string' },
    ],
    name: 'queueRulesetsOf',
    outputs: [{ name: 'rulesetId', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'sendReservedTokensToSplitsOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'setControllerAllowed',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'splitGroups',
        internalType: 'struct JBSplitGroup[]',
        type: 'tuple[]',
        components: [
          { name: 'groupId', internalType: 'uint256', type: 'uint256' },
          {
            name: 'splits',
            internalType: 'struct JBSplit[]',
            type: 'tuple[]',
            components: [
              { name: 'percent', internalType: 'uint32', type: 'uint32' },
              { name: 'projectId', internalType: 'uint64', type: 'uint64' },
              {
                name: 'beneficiary',
                internalType: 'address payable',
                type: 'address',
              },
              {
                name: 'preferAddToBalance',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'lockedUntil', internalType: 'uint48', type: 'uint48' },
              {
                name: 'hook',
                internalType: 'contract IJBSplitHook',
                type: 'address',
              },
            ],
          },
        ],
      },
    ],
    name: 'setSplitGroupsOf',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'setTerminalsAllowed',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'contract IJBToken', type: 'address' },
    ],
    name: 'setTokenFor',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'uri', internalType: 'string', type: 'string' },
    ],
    name: 'setUriOf',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'totalTokenSupplyWithReservedTokensOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'holder', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'recipient', internalType: 'address', type: 'address' },
      { name: 'creditCount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transferCreditsFrom',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'trustedForwarder',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'upcomingRulesetOf',
    outputs: [
      {
        name: 'ruleset',
        internalType: 'struct JBRuleset',
        type: 'tuple',
        components: [
          { name: 'cycleNumber', internalType: 'uint48', type: 'uint48' },
          { name: 'id', internalType: 'uint48', type: 'uint48' },
          { name: 'basedOnId', internalType: 'uint48', type: 'uint48' },
          { name: 'start', internalType: 'uint48', type: 'uint48' },
          { name: 'duration', internalType: 'uint32', type: 'uint32' },
          { name: 'weight', internalType: 'uint112', type: 'uint112' },
          { name: 'weightCutPercent', internalType: 'uint32', type: 'uint32' },
          {
            name: 'approvalHook',
            internalType: 'contract IJBRulesetApprovalHook',
            type: 'address',
          },
          { name: 'metadata', internalType: 'uint256', type: 'uint256' },
        ],
      },
      {
        name: 'metadata',
        internalType: 'struct JBRulesetMetadata',
        type: 'tuple',
        components: [
          { name: 'reservedPercent', internalType: 'uint16', type: 'uint16' },
          { name: 'cashOutTaxRate', internalType: 'uint16', type: 'uint16' },
          { name: 'baseCurrency', internalType: 'uint32', type: 'uint32' },
          { name: 'pausePay', internalType: 'bool', type: 'bool' },
          { name: 'pauseCreditTransfers', internalType: 'bool', type: 'bool' },
          { name: 'allowOwnerMinting', internalType: 'bool', type: 'bool' },
          { name: 'allowSetCustomToken', internalType: 'bool', type: 'bool' },
          {
            name: 'allowTerminalMigration',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'allowSetTerminals', internalType: 'bool', type: 'bool' },
          { name: 'allowSetController', internalType: 'bool', type: 'bool' },
          {
            name: 'allowAddAccountingContext',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'allowAddPriceFeed', internalType: 'bool', type: 'bool' },
          { name: 'ownerMustSendPayouts', internalType: 'bool', type: 'bool' },
          { name: 'holdFees', internalType: 'bool', type: 'bool' },
          {
            name: 'useTotalSurplusForCashOuts',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'useDataHookForPay', internalType: 'bool', type: 'bool' },
          { name: 'useDataHookForCashOut', internalType: 'bool', type: 'bool' },
          { name: 'dataHook', internalType: 'address', type: 'address' },
          { name: 'metadata', internalType: 'uint16', type: 'uint16' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'uriOf',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'holder',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'tokenCount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      { name: 'memo', internalType: 'string', type: 'string', indexed: false },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'BurnTokens',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'rulesetId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'projectUri',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
      { name: 'memo', internalType: 'string', type: 'string', indexed: false },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'LaunchProject',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'rulesetId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      { name: 'memo', internalType: 'string', type: 'string', indexed: false },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'LaunchRulesets',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'to',
        internalType: 'contract IERC165',
        type: 'address',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Migrate',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'beneficiary',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'tokenCount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'beneficiaryTokenCount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      { name: 'memo', internalType: 'string', type: 'string', indexed: false },
      {
        name: 'reservedPercent',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'MintTokens',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'from',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'PrepMigration',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'rulesetId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      { name: 'memo', internalType: 'string', type: 'string', indexed: false },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'QueueRulesets',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'split',
        internalType: 'struct JBSplit',
        type: 'tuple',
        components: [
          { name: 'percent', internalType: 'uint32', type: 'uint32' },
          { name: 'projectId', internalType: 'uint64', type: 'uint64' },
          {
            name: 'beneficiary',
            internalType: 'address payable',
            type: 'address',
          },
          { name: 'preferAddToBalance', internalType: 'bool', type: 'bool' },
          { name: 'lockedUntil', internalType: 'uint48', type: 'uint48' },
          {
            name: 'hook',
            internalType: 'contract IJBSplitHook',
            type: 'address',
          },
        ],
        indexed: false,
      },
      {
        name: 'tokenCount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      { name: 'reason', internalType: 'bytes', type: 'bytes', indexed: false },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'ReservedDistributionReverted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'rulesetId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'groupId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'split',
        internalType: 'struct JBSplit',
        type: 'tuple',
        components: [
          { name: 'percent', internalType: 'uint32', type: 'uint32' },
          { name: 'projectId', internalType: 'uint64', type: 'uint64' },
          {
            name: 'beneficiary',
            internalType: 'address payable',
            type: 'address',
          },
          { name: 'preferAddToBalance', internalType: 'bool', type: 'bool' },
          { name: 'lockedUntil', internalType: 'uint48', type: 'uint48' },
          {
            name: 'hook',
            internalType: 'contract IJBSplitHook',
            type: 'address',
          },
        ],
        indexed: false,
      },
      {
        name: 'tokenCount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'SendReservedTokensToSplit',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'rulesetId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'rulesetCycleNumber',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'tokenCount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'leftoverAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'SendReservedTokensToSplits',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      { name: 'uri', internalType: 'string', type: 'string', indexed: false },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'SetUri',
  },
  { type: 'error', inputs: [], name: 'JBController_AddingPriceFeedNotAllowed' },
  { type: 'error', inputs: [], name: 'JBController_CreditTransfersPaused' },
  {
    type: 'error',
    inputs: [
      { name: 'rate', internalType: 'uint256', type: 'uint256' },
      { name: 'limit', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBController_InvalidCashOutTaxRate',
  },
  {
    type: 'error',
    inputs: [
      { name: 'percent', internalType: 'uint256', type: 'uint256' },
      { name: 'limit', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBController_InvalidReservedPercent',
  },
  {
    type: 'error',
    inputs: [],
    name: 'JBController_MintNotAllowedAndNotTerminalOrHook',
  },
  { type: 'error', inputs: [], name: 'JBController_NoReservedTokens' },
  {
    type: 'error',
    inputs: [
      { name: 'sender', internalType: 'address', type: 'address' },
      {
        name: 'directory',
        internalType: 'contract IJBDirectory',
        type: 'address',
      },
    ],
    name: 'JBController_OnlyDirectory',
  },
  { type: 'error', inputs: [], name: 'JBController_RulesetSetTokenNotAllowed' },
  { type: 'error', inputs: [], name: 'JBController_RulesetsAlreadyLaunched' },
  { type: 'error', inputs: [], name: 'JBController_RulesetsArrayEmpty' },
  { type: 'error', inputs: [], name: 'JBController_ZeroTokensToBurn' },
  { type: 'error', inputs: [], name: 'JBController_ZeroTokensToMint' },
  {
    type: 'error',
    inputs: [
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'sender', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'permissionId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBPermissioned_Unauthorized',
  },
  {
    type: 'error',
    inputs: [
      { name: 'x', internalType: 'uint256', type: 'uint256' },
      { name: 'y', internalType: 'uint256', type: 'uint256' },
      { name: 'denominator', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'PRBMath_MulDiv_Overflow',
  },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBDirectory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const jbDirectoryAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'permissions',
        internalType: 'contract IJBPermissions',
        type: 'address',
      },
      {
        name: 'projects',
        internalType: 'contract IJBProjects',
        type: 'address',
      },
      { name: 'owner', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PERMISSIONS',
    outputs: [
      { name: '', internalType: 'contract IJBPermissions', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PROJECTS',
    outputs: [
      { name: '', internalType: 'contract IJBProjects', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'controllerOf',
    outputs: [{ name: '', internalType: 'contract IERC165', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'addr', internalType: 'address', type: 'address' }],
    name: 'isAllowedToSetFirstController',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'terminal',
        internalType: 'contract IJBTerminal',
        type: 'address',
      },
    ],
    name: 'isTerminalOf',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
    ],
    name: 'primaryTerminalOf',
    outputs: [
      { name: '', internalType: 'contract IJBTerminal', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'controller', internalType: 'contract IERC165', type: 'address' },
    ],
    name: 'setControllerOf',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'addr', internalType: 'address', type: 'address' },
      { name: 'flag', internalType: 'bool', type: 'bool' },
    ],
    name: 'setIsAllowedToSetFirstController',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
      {
        name: 'terminal',
        internalType: 'contract IJBTerminal',
        type: 'address',
      },
    ],
    name: 'setPrimaryTerminalOf',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'terminals',
        internalType: 'contract IJBTerminal[]',
        type: 'address[]',
      },
    ],
    name: 'setTerminalsOf',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'terminalsOf',
    outputs: [
      { name: '', internalType: 'contract IJBTerminal[]', type: 'address[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'terminal',
        internalType: 'contract IJBTerminal',
        type: 'address',
        indexed: true,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'AddTerminal',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'controller',
        internalType: 'contract IERC165',
        type: 'address',
        indexed: true,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'SetController',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'addr', internalType: 'address', type: 'address', indexed: true },
      { name: 'isAllowed', internalType: 'bool', type: 'bool', indexed: true },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'SetIsAllowedToSetFirstController',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'terminal',
        internalType: 'contract IJBTerminal',
        type: 'address',
        indexed: true,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'SetPrimaryTerminal',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'terminals',
        internalType: 'contract IJBTerminal[]',
        type: 'address[]',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'SetTerminals',
  },
  {
    type: 'error',
    inputs: [
      {
        name: 'terminal',
        internalType: 'contract IJBTerminal',
        type: 'address',
      },
    ],
    name: 'JBDirectory_DuplicateTerminals',
  },
  {
    type: 'error',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'limit', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBDirectory_InvalidProjectIdInDirectory',
  },
  { type: 'error', inputs: [], name: 'JBDirectory_SetControllerNotAllowed' },
  { type: 'error', inputs: [], name: 'JBDirectory_SetTerminalsNotAllowed' },
  {
    type: 'error',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
      {
        name: 'terminal',
        internalType: 'contract IJBTerminal',
        type: 'address',
      },
    ],
    name: 'JBDirectory_TokenNotAccepted',
  },
  {
    type: 'error',
    inputs: [
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'sender', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'permissionId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBPermissioned_Unauthorized',
  },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'OwnableInvalidOwner',
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'OwnableUnauthorizedAccount',
  },
] as const

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const jbDirectoryAddress = {
  84532: '0x9B3F76DB6D7B3E6b286A3c176bA084ea3e8AFD16',
  421614: '0x9B3F76DB6D7B3E6b286A3c176bA084ea3e8AFD16',
  11155111: '0x9B3F76DB6D7B3E6b286A3c176bA084ea3e8AFD16',
  11155420: '0x9B3F76DB6D7B3E6b286A3c176bA084ea3e8AFD16',
} as const

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const jbDirectoryConfig = {
  address: jbDirectoryAddress,
  abi: jbDirectoryAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBFundAccessLimits
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const jbFundAccessLimitsAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'directory',
        internalType: 'contract IJBDirectory',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DIRECTORY',
    outputs: [
      { name: '', internalType: 'contract IJBDirectory', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
      { name: 'terminal', internalType: 'address', type: 'address' },
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'currency', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'payoutLimitOf',
    outputs: [
      { name: 'payoutLimit', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
      { name: 'terminal', internalType: 'address', type: 'address' },
      { name: 'token', internalType: 'address', type: 'address' },
    ],
    name: 'payoutLimitsOf',
    outputs: [
      {
        name: 'payoutLimits',
        internalType: 'struct JBCurrencyAmount[]',
        type: 'tuple[]',
        components: [
          { name: 'amount', internalType: 'uint224', type: 'uint224' },
          { name: 'currency', internalType: 'uint32', type: 'uint32' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'fundAccessLimitGroups',
        internalType: 'struct JBFundAccessLimitGroup[]',
        type: 'tuple[]',
        components: [
          { name: 'terminal', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          {
            name: 'payoutLimits',
            internalType: 'struct JBCurrencyAmount[]',
            type: 'tuple[]',
            components: [
              { name: 'amount', internalType: 'uint224', type: 'uint224' },
              { name: 'currency', internalType: 'uint32', type: 'uint32' },
            ],
          },
          {
            name: 'surplusAllowances',
            internalType: 'struct JBCurrencyAmount[]',
            type: 'tuple[]',
            components: [
              { name: 'amount', internalType: 'uint224', type: 'uint224' },
              { name: 'currency', internalType: 'uint32', type: 'uint32' },
            ],
          },
        ],
      },
    ],
    name: 'setFundAccessLimitsFor',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
      { name: 'terminal', internalType: 'address', type: 'address' },
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'currency', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'surplusAllowanceOf',
    outputs: [
      { name: 'surplusAllowance', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
      { name: 'terminal', internalType: 'address', type: 'address' },
      { name: 'token', internalType: 'address', type: 'address' },
    ],
    name: 'surplusAllowancesOf',
    outputs: [
      {
        name: 'surplusAllowances',
        internalType: 'struct JBCurrencyAmount[]',
        type: 'tuple[]',
        components: [
          { name: 'amount', internalType: 'uint224', type: 'uint224' },
          { name: 'currency', internalType: 'uint32', type: 'uint32' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'rulesetId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'fundAccessLimitGroup',
        internalType: 'struct JBFundAccessLimitGroup',
        type: 'tuple',
        components: [
          { name: 'terminal', internalType: 'address', type: 'address' },
          { name: 'token', internalType: 'address', type: 'address' },
          {
            name: 'payoutLimits',
            internalType: 'struct JBCurrencyAmount[]',
            type: 'tuple[]',
            components: [
              { name: 'amount', internalType: 'uint224', type: 'uint224' },
              { name: 'currency', internalType: 'uint32', type: 'uint32' },
            ],
          },
          {
            name: 'surplusAllowances',
            internalType: 'struct JBCurrencyAmount[]',
            type: 'tuple[]',
            components: [
              { name: 'amount', internalType: 'uint224', type: 'uint224' },
              { name: 'currency', internalType: 'uint32', type: 'uint32' },
            ],
          },
        ],
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'SetFundAccessLimits',
  },
  {
    type: 'error',
    inputs: [{ name: 'controller', internalType: 'address', type: 'address' }],
    name: 'JBControlled_ControllerUnauthorized',
  },
  {
    type: 'error',
    inputs: [],
    name: 'JBFundAccessLimits_InvalidPayoutLimitCurrencyOrdering',
  },
  {
    type: 'error',
    inputs: [],
    name: 'JBFundAccessLimits_InvalidSurplusAllowanceCurrencyOrdering',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBMultiTerminal
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const jbMultiTerminalAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'feelessAddresses',
        internalType: 'contract IJBFeelessAddresses',
        type: 'address',
      },
      {
        name: 'permissions',
        internalType: 'contract IJBPermissions',
        type: 'address',
      },
      {
        name: 'projects',
        internalType: 'contract IJBProjects',
        type: 'address',
      },
      { name: 'splits', internalType: 'contract IJBSplits', type: 'address' },
      {
        name: 'store',
        internalType: 'contract IJBTerminalStore',
        type: 'address',
      },
      { name: 'tokens', internalType: 'contract IJBTokens', type: 'address' },
      { name: 'permit2', internalType: 'contract IPermit2', type: 'address' },
      { name: 'trustedForwarder', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DIRECTORY',
    outputs: [
      { name: '', internalType: 'contract IJBDirectory', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'FEE',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'FEELESS_ADDRESSES',
    outputs: [
      {
        name: '',
        internalType: 'contract IJBFeelessAddresses',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PERMISSIONS',
    outputs: [
      { name: '', internalType: 'contract IJBPermissions', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PERMIT2',
    outputs: [{ name: '', internalType: 'contract IPermit2', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PROJECTS',
    outputs: [
      { name: '', internalType: 'contract IJBProjects', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'RULESETS',
    outputs: [
      { name: '', internalType: 'contract IJBRulesets', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'SPLITS',
    outputs: [
      { name: '', internalType: 'contract IJBSplits', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'STORE',
    outputs: [
      { name: '', internalType: 'contract IJBTerminalStore', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'TOKENS',
    outputs: [
      { name: '', internalType: 'contract IJBTokens', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
    ],
    name: 'accountingContextForTokenOf',
    outputs: [
      {
        name: '',
        internalType: 'struct JBAccountingContext',
        type: 'tuple',
        components: [
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'decimals', internalType: 'uint8', type: 'uint8' },
          { name: 'currency', internalType: 'uint32', type: 'uint32' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'accountingContextsOf',
    outputs: [
      {
        name: '',
        internalType: 'struct JBAccountingContext[]',
        type: 'tuple[]',
        components: [
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'decimals', internalType: 'uint8', type: 'uint8' },
          { name: 'currency', internalType: 'uint32', type: 'uint32' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'accountingContexts',
        internalType: 'struct JBAccountingContext[]',
        type: 'tuple[]',
        components: [
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'decimals', internalType: 'uint8', type: 'uint8' },
          { name: 'currency', internalType: 'uint32', type: 'uint32' },
        ],
      },
    ],
    name: 'addAccountingContextsFor',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'shouldReturnHeldFees', internalType: 'bool', type: 'bool' },
      { name: 'memo', internalType: 'string', type: 'string' },
      { name: 'metadata', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'addToBalanceOf',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'holder', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'cashOutCount', internalType: 'uint256', type: 'uint256' },
      { name: 'tokenToReclaim', internalType: 'address', type: 'address' },
      { name: 'minTokensReclaimed', internalType: 'uint256', type: 'uint256' },
      { name: 'beneficiary', internalType: 'address payable', type: 'address' },
      { name: 'metadata', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'cashOutTokensOf',
    outputs: [
      { name: 'reclaimAmount', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'accountingContexts',
        internalType: 'struct JBAccountingContext[]',
        type: 'tuple[]',
        components: [
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'decimals', internalType: 'uint8', type: 'uint8' },
          { name: 'currency', internalType: 'uint32', type: 'uint32' },
        ],
      },
      { name: 'decimals', internalType: 'uint256', type: 'uint256' },
      { name: 'currency', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'currentSurplusOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'split',
        internalType: 'struct JBSplit',
        type: 'tuple',
        components: [
          { name: 'percent', internalType: 'uint32', type: 'uint32' },
          { name: 'projectId', internalType: 'uint64', type: 'uint64' },
          {
            name: 'beneficiary',
            internalType: 'address payable',
            type: 'address',
          },
          { name: 'preferAddToBalance', internalType: 'bool', type: 'bool' },
          { name: 'lockedUntil', internalType: 'uint48', type: 'uint48' },
          {
            name: 'hook',
            internalType: 'contract IJBSplitHook',
            type: 'address',
          },
        ],
      },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      {
        name: 'originalMessageSender',
        internalType: 'address',
        type: 'address',
      },
    ],
    name: 'executePayout',
    outputs: [
      { name: 'netPayoutAmount', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'beneficiary', internalType: 'address', type: 'address' },
      {
        name: 'feeTerminal',
        internalType: 'contract IJBTerminal',
        type: 'address',
      },
    ],
    name: 'executeProcessFee',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'addr', internalType: 'address payable', type: 'address' },
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'executeTransferTo',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'count', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'heldFeesOf',
    outputs: [
      {
        name: 'heldFees',
        internalType: 'struct JBFee[]',
        type: 'tuple[]',
        components: [
          { name: 'amount', internalType: 'uint256', type: 'uint256' },
          { name: 'beneficiary', internalType: 'address', type: 'address' },
          { name: 'unlockTimestamp', internalType: 'uint48', type: 'uint48' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'forwarder', internalType: 'address', type: 'address' }],
    name: 'isTrustedForwarder',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'contract IJBTerminal', type: 'address' },
    ],
    name: 'migrateBalanceOf',
    outputs: [{ name: 'balance', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'beneficiary', internalType: 'address', type: 'address' },
      { name: 'minReturnedTokens', internalType: 'uint256', type: 'uint256' },
      { name: 'memo', internalType: 'string', type: 'string' },
      { name: 'metadata', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'pay',
    outputs: [
      {
        name: 'beneficiaryTokenCount',
        internalType: 'uint256',
        type: 'uint256',
      },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'count', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'processHeldFeesOf',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'currency', internalType: 'uint256', type: 'uint256' },
      { name: 'minTokensPaidOut', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'sendPayoutsOf',
    outputs: [
      { name: 'amountPaidOut', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [],
    name: 'trustedForwarder',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'currency', internalType: 'uint256', type: 'uint256' },
      { name: 'minTokensPaidOut', internalType: 'uint256', type: 'uint256' },
      { name: 'beneficiary', internalType: 'address payable', type: 'address' },
      {
        name: 'feeBeneficiary',
        internalType: 'address payable',
        type: 'address',
      },
      { name: 'memo', internalType: 'string', type: 'string' },
    ],
    name: 'useAllowanceOf',
    outputs: [
      { name: 'netAmountPaidOut', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'returnedFees',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      { name: 'memo', internalType: 'string', type: 'string', indexed: false },
      {
        name: 'metadata',
        internalType: 'bytes',
        type: 'bytes',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'AddToBalance',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'rulesetId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'rulesetCycleNumber',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'holder',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'beneficiary',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'cashOutCount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'cashOutTaxRate',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'reclaimAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'metadata',
        internalType: 'bytes',
        type: 'bytes',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'CashOutTokens',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'feeProjectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      { name: 'reason', internalType: 'bytes', type: 'bytes', indexed: false },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'FeeReverted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      { name: 'fee', internalType: 'uint256', type: 'uint256', indexed: false },
      {
        name: 'beneficiary',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'HoldFee',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'hook',
        internalType: 'contract IJBCashOutHook',
        type: 'address',
        indexed: true,
      },
      {
        name: 'context',
        internalType: 'struct JBAfterCashOutRecordedContext',
        type: 'tuple',
        components: [
          { name: 'holder', internalType: 'address', type: 'address' },
          { name: 'projectId', internalType: 'uint256', type: 'uint256' },
          { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
          { name: 'cashOutCount', internalType: 'uint256', type: 'uint256' },
          {
            name: 'reclaimedAmount',
            internalType: 'struct JBTokenAmount',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'decimals', internalType: 'uint8', type: 'uint8' },
              { name: 'currency', internalType: 'uint32', type: 'uint32' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
            ],
          },
          {
            name: 'forwardedAmount',
            internalType: 'struct JBTokenAmount',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'decimals', internalType: 'uint8', type: 'uint8' },
              { name: 'currency', internalType: 'uint32', type: 'uint32' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
            ],
          },
          { name: 'cashOutTaxRate', internalType: 'uint256', type: 'uint256' },
          {
            name: 'beneficiary',
            internalType: 'address payable',
            type: 'address',
          },
          { name: 'hookMetadata', internalType: 'bytes', type: 'bytes' },
          { name: 'cashOutMetadata', internalType: 'bytes', type: 'bytes' },
        ],
        indexed: false,
      },
      {
        name: 'specificationAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      { name: 'fee', internalType: 'uint256', type: 'uint256', indexed: false },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'HookAfterRecordCashOut',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'hook',
        internalType: 'contract IJBPayHook',
        type: 'address',
        indexed: true,
      },
      {
        name: 'context',
        internalType: 'struct JBAfterPayRecordedContext',
        type: 'tuple',
        components: [
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'projectId', internalType: 'uint256', type: 'uint256' },
          { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
          {
            name: 'amount',
            internalType: 'struct JBTokenAmount',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'decimals', internalType: 'uint8', type: 'uint8' },
              { name: 'currency', internalType: 'uint32', type: 'uint32' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
            ],
          },
          {
            name: 'forwardedAmount',
            internalType: 'struct JBTokenAmount',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'decimals', internalType: 'uint8', type: 'uint8' },
              { name: 'currency', internalType: 'uint32', type: 'uint32' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
            ],
          },
          { name: 'weight', internalType: 'uint256', type: 'uint256' },
          {
            name: 'newlyIssuedTokenCount',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'beneficiary', internalType: 'address', type: 'address' },
          { name: 'hookMetadata', internalType: 'bytes', type: 'bytes' },
          { name: 'payerMetadata', internalType: 'bytes', type: 'bytes' },
        ],
        indexed: false,
      },
      {
        name: 'specificationAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'HookAfterRecordPay',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'to',
        internalType: 'contract IJBTerminal',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'MigrateTerminal',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'rulesetId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'rulesetCycleNumber',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'payer',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'beneficiary',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'newlyIssuedTokenCount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      { name: 'memo', internalType: 'string', type: 'string', indexed: false },
      {
        name: 'metadata',
        internalType: 'bytes',
        type: 'bytes',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Pay',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'split',
        internalType: 'struct JBSplit',
        type: 'tuple',
        components: [
          { name: 'percent', internalType: 'uint32', type: 'uint32' },
          { name: 'projectId', internalType: 'uint64', type: 'uint64' },
          {
            name: 'beneficiary',
            internalType: 'address payable',
            type: 'address',
          },
          { name: 'preferAddToBalance', internalType: 'bool', type: 'bool' },
          { name: 'lockedUntil', internalType: 'uint48', type: 'uint48' },
          {
            name: 'hook',
            internalType: 'contract IJBSplitHook',
            type: 'address',
          },
        ],
        indexed: false,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      { name: 'reason', internalType: 'bytes', type: 'bytes', indexed: false },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'PayoutReverted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'addr',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      { name: 'fee', internalType: 'uint256', type: 'uint256', indexed: false },
      { name: 'reason', internalType: 'bytes', type: 'bytes', indexed: false },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'PayoutTransferReverted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      { name: 'wasHeld', internalType: 'bool', type: 'bool', indexed: false },
      {
        name: 'beneficiary',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'ProcessFee',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'returnedFees',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'leftoverAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'ReturnHeldFees',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'rulesetId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'group',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'split',
        internalType: 'struct JBSplit',
        type: 'tuple',
        components: [
          { name: 'percent', internalType: 'uint32', type: 'uint32' },
          { name: 'projectId', internalType: 'uint64', type: 'uint64' },
          {
            name: 'beneficiary',
            internalType: 'address payable',
            type: 'address',
          },
          { name: 'preferAddToBalance', internalType: 'bool', type: 'bool' },
          { name: 'lockedUntil', internalType: 'uint48', type: 'uint48' },
          {
            name: 'hook',
            internalType: 'contract IJBSplitHook',
            type: 'address',
          },
        ],
        indexed: false,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'netAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'SendPayoutToSplit',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'rulesetId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'rulesetCycleNumber',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'projectOwner',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'amountPaidOut',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      { name: 'fee', internalType: 'uint256', type: 'uint256', indexed: false },
      {
        name: 'netLeftoverPayoutAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'SendPayouts',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'context',
        internalType: 'struct JBAccountingContext',
        type: 'tuple',
        components: [
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'decimals', internalType: 'uint8', type: 'uint8' },
          { name: 'currency', internalType: 'uint32', type: 'uint32' },
        ],
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'SetAccountingContext',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'rulesetId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'rulesetCycleNumber',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'beneficiary',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'feeBeneficiary',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'amountPaidOut',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'netAmountPaidOut',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      { name: 'memo', internalType: 'string', type: 'string', indexed: false },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'UseAllowance',
  },
  { type: 'error', inputs: [], name: 'FailedCall' },
  {
    type: 'error',
    inputs: [
      { name: 'balance', internalType: 'uint256', type: 'uint256' },
      { name: 'needed', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'InsufficientBalance',
  },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'JBMultiTerminal_AccountingContextAlreadySet',
  },
  {
    type: 'error',
    inputs: [],
    name: 'JBMultiTerminal_AddingAccountingContextNotAllowed',
  },
  { type: 'error', inputs: [], name: 'JBMultiTerminal_FeeTerminalNotFound' },
  {
    type: 'error',
    inputs: [{ name: 'value', internalType: 'uint256', type: 'uint256' }],
    name: 'JBMultiTerminal_NoMsgValueAllowed',
  },
  {
    type: 'error',
    inputs: [
      { name: 'value', internalType: 'uint256', type: 'uint256' },
      { name: 'limit', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBMultiTerminal_OverflowAlert',
  },
  {
    type: 'error',
    inputs: [
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'allowance', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBMultiTerminal_PermitAllowanceNotEnough',
  },
  {
    type: 'error',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
    ],
    name: 'JBMultiTerminal_RecipientProjectTerminalNotFound',
  },
  {
    type: 'error',
    inputs: [
      { name: 'hook', internalType: 'contract IJBSplitHook', type: 'address' },
    ],
    name: 'JBMultiTerminal_SplitHookInvalid',
  },
  {
    type: 'error',
    inputs: [],
    name: 'JBMultiTerminal_TerminalTokensIncompatible',
  },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'JBMultiTerminal_TokenNotAccepted',
  },
  {
    type: 'error',
    inputs: [
      { name: 'count', internalType: 'uint256', type: 'uint256' },
      { name: 'min', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBMultiTerminal_UnderMinReturnedTokens',
  },
  {
    type: 'error',
    inputs: [
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'min', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBMultiTerminal_UnderMinTokensPaidOut',
  },
  {
    type: 'error',
    inputs: [
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'min', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBMultiTerminal_UnderMinTokensReclaimed',
  },
  {
    type: 'error',
    inputs: [],
    name: 'JBMultiTerminal_ZeroAccountingContextCurrency',
  },
  {
    type: 'error',
    inputs: [],
    name: 'JBMultiTerminal_ZeroAccountingContextDecimals',
  },
  {
    type: 'error',
    inputs: [
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'sender', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'permissionId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBPermissioned_Unauthorized',
  },
  {
    type: 'error',
    inputs: [
      { name: 'x', internalType: 'uint256', type: 'uint256' },
      { name: 'y', internalType: 'uint256', type: 'uint256' },
      { name: 'denominator', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'PRBMath_MulDiv_Overflow',
  },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBPermissions
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const jbPermissionsAbi = [
  {
    type: 'function',
    inputs: [],
    name: 'WILDCARD_PROJECT_ID',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'operator', internalType: 'address', type: 'address' },
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'permissionId', internalType: 'uint256', type: 'uint256' },
      { name: 'includeRoot', internalType: 'bool', type: 'bool' },
      { name: 'includeWildcardProjectId', internalType: 'bool', type: 'bool' },
    ],
    name: 'hasPermission',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'operator', internalType: 'address', type: 'address' },
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'permissionIds', internalType: 'uint256[]', type: 'uint256[]' },
      { name: 'includeRoot', internalType: 'bool', type: 'bool' },
      { name: 'includeWildcardProjectId', internalType: 'bool', type: 'bool' },
    ],
    name: 'hasPermissions',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'operator', internalType: 'address', type: 'address' },
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'permissionsOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'account', internalType: 'address', type: 'address' },
      {
        name: 'permissionsData',
        internalType: 'struct JBPermissionsData',
        type: 'tuple',
        components: [
          { name: 'operator', internalType: 'address', type: 'address' },
          { name: 'projectId', internalType: 'uint64', type: 'uint64' },
          { name: 'permissionIds', internalType: 'uint8[]', type: 'uint8[]' },
        ],
      },
    ],
    name: 'setPermissionsFor',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'operator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'permissionIds',
        internalType: 'uint8[]',
        type: 'uint8[]',
        indexed: false,
      },
      {
        name: 'packed',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'OperatorPermissionsSet',
  },
  {
    type: 'error',
    inputs: [],
    name: 'JBPermissions_CantSetRootPermissionForWildcardProject',
  },
  { type: 'error', inputs: [], name: 'JBPermissions_NoZeroPermission' },
  {
    type: 'error',
    inputs: [
      { name: 'permissionId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBPermissions_PermissionIdOutOfBounds',
  },
  { type: 'error', inputs: [], name: 'JBPermissions_Unauthorized' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBPrices
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 */
export const jbPricesAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'directory',
        internalType: 'contract IJBDirectory',
        type: 'address',
      },
      {
        name: 'permissions',
        internalType: 'contract IJBPermissions',
        type: 'address',
      },
      {
        name: 'projects',
        internalType: 'contract IJBProjects',
        type: 'address',
      },
      { name: 'owner', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DEFAULT_PROJECT_ID',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DIRECTORY',
    outputs: [
      { name: '', internalType: 'contract IJBDirectory', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PERMISSIONS',
    outputs: [
      { name: '', internalType: 'contract IJBPermissions', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PROJECTS',
    outputs: [
      { name: '', internalType: 'contract IJBProjects', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'pricingCurrency', internalType: 'uint256', type: 'uint256' },
      { name: 'unitCurrency', internalType: 'uint256', type: 'uint256' },
      { name: 'feed', internalType: 'contract IJBPriceFeed', type: 'address' },
    ],
    name: 'addPriceFeedFor',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'pricingCurrency', internalType: 'uint256', type: 'uint256' },
      { name: 'unitCurrency', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'priceFeedFor',
    outputs: [
      { name: '', internalType: 'contract IJBPriceFeed', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'pricingCurrency', internalType: 'uint256', type: 'uint256' },
      { name: 'unitCurrency', internalType: 'uint256', type: 'uint256' },
      { name: 'decimals', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'pricePerUnitOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'pricingCurrency',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'unitCurrency',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'feed',
        internalType: 'contract IJBPriceFeed',
        type: 'address',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'AddPriceFeed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'error',
    inputs: [{ name: 'controller', internalType: 'address', type: 'address' }],
    name: 'JBControlled_ControllerUnauthorized',
  },
  {
    type: 'error',
    inputs: [
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'sender', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'permissionId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBPermissioned_Unauthorized',
  },
  {
    type: 'error',
    inputs: [
      { name: 'feed', internalType: 'contract IJBPriceFeed', type: 'address' },
    ],
    name: 'JBPrices_PriceFeedAlreadyExists',
  },
  { type: 'error', inputs: [], name: 'JBPrices_PriceFeedNotFound' },
  { type: 'error', inputs: [], name: 'JBPrices_ZeroPricingCurrency' },
  { type: 'error', inputs: [], name: 'JBPrices_ZeroUnitCurrency' },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'OwnableInvalidOwner',
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'OwnableUnauthorizedAccount',
  },
  {
    type: 'error',
    inputs: [
      { name: 'x', internalType: 'uint256', type: 'uint256' },
      { name: 'y', internalType: 'uint256', type: 'uint256' },
      { name: 'denominator', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'PRBMath_MulDiv_Overflow',
  },
] as const

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 */
export const jbPricesAddress = {
  84532: '0x5E2c77b57Fa4206bE44cD9e7933aAebFE2B3FA8d',
  421614: '0x5E2c77b57Fa4206bE44cD9e7933aAebFE2B3FA8d',
  11155111: '0x5E2c77b57Fa4206bE44cD9e7933aAebFE2B3FA8d',
  11155420: '0x5E2c77b57Fa4206bE44cD9e7933aAebFE2B3FA8d',
} as const

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 */
export const jbPricesConfig = {
  address: jbPricesAddress,
  abi: jbPricesAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBProjects
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const jbProjectsAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'feeProjectOwner', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'count',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'createFor',
    outputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'getApproved',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'operator', internalType: 'address', type: 'address' },
    ],
    name: 'isApprovedForAll',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'name',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'data', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'operator', internalType: 'address', type: 'address' },
      { name: 'approved', internalType: 'bool', type: 'bool' },
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'resolver',
        internalType: 'contract IJBTokenUriResolver',
        type: 'address',
      },
    ],
    name: 'setTokenUriResolver',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'tokenUriResolver',
    outputs: [
      {
        name: '',
        internalType: 'contract IJBTokenUriResolver',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'approved',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'Approval',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'operator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      { name: 'approved', internalType: 'bool', type: 'bool', indexed: false },
    ],
    name: 'ApprovalForAll',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Create',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'resolver',
        internalType: 'contract IJBTokenUriResolver',
        type: 'address',
        indexed: true,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'SetTokenUriResolver',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'from', internalType: 'address', type: 'address', indexed: true },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'Transfer',
  },
  {
    type: 'error',
    inputs: [
      { name: 'sender', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'owner', internalType: 'address', type: 'address' },
    ],
    name: 'ERC721IncorrectOwner',
  },
  {
    type: 'error',
    inputs: [
      { name: 'operator', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'ERC721InsufficientApproval',
  },
  {
    type: 'error',
    inputs: [{ name: 'approver', internalType: 'address', type: 'address' }],
    name: 'ERC721InvalidApprover',
  },
  {
    type: 'error',
    inputs: [{ name: 'operator', internalType: 'address', type: 'address' }],
    name: 'ERC721InvalidOperator',
  },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'ERC721InvalidOwner',
  },
  {
    type: 'error',
    inputs: [{ name: 'receiver', internalType: 'address', type: 'address' }],
    name: 'ERC721InvalidReceiver',
  },
  {
    type: 'error',
    inputs: [{ name: 'sender', internalType: 'address', type: 'address' }],
    name: 'ERC721InvalidSender',
  },
  {
    type: 'error',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'ERC721NonexistentToken',
  },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'OwnableInvalidOwner',
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'OwnableUnauthorizedAccount',
  },
] as const

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const jbProjectsAddress = {
  84532: '0x38eCaaEc685c21F77712f569b071309A2143FF58',
  421614: '0x38eCaaEc685c21F77712f569b071309A2143FF58',
  11155111: '0x38eCaaEc685c21F77712f569b071309A2143FF58',
  11155420: '0x38eCaaEc685c21F77712f569b071309A2143FF58',
} as const

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const jbProjectsConfig = {
  address: jbProjectsAddress,
  abi: jbProjectsAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBRulesets
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 */
export const jbRulesetsAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'directory',
        internalType: 'contract IJBDirectory',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DIRECTORY',
    outputs: [
      { name: '', internalType: 'contract IJBDirectory', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'startingId', internalType: 'uint256', type: 'uint256' },
      { name: 'size', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'allOf',
    outputs: [
      {
        name: 'rulesets',
        internalType: 'struct JBRuleset[]',
        type: 'tuple[]',
        components: [
          { name: 'cycleNumber', internalType: 'uint48', type: 'uint48' },
          { name: 'id', internalType: 'uint48', type: 'uint48' },
          { name: 'basedOnId', internalType: 'uint48', type: 'uint48' },
          { name: 'start', internalType: 'uint48', type: 'uint48' },
          { name: 'duration', internalType: 'uint32', type: 'uint32' },
          { name: 'weight', internalType: 'uint112', type: 'uint112' },
          { name: 'weightCutPercent', internalType: 'uint32', type: 'uint32' },
          {
            name: 'approvalHook',
            internalType: 'contract IJBRulesetApprovalHook',
            type: 'address',
          },
          { name: 'metadata', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'currentApprovalStatusForLatestRulesetOf',
    outputs: [
      { name: '', internalType: 'enum JBApprovalStatus', type: 'uint8' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'currentOf',
    outputs: [
      {
        name: 'ruleset',
        internalType: 'struct JBRuleset',
        type: 'tuple',
        components: [
          { name: 'cycleNumber', internalType: 'uint48', type: 'uint48' },
          { name: 'id', internalType: 'uint48', type: 'uint48' },
          { name: 'basedOnId', internalType: 'uint48', type: 'uint48' },
          { name: 'start', internalType: 'uint48', type: 'uint48' },
          { name: 'duration', internalType: 'uint32', type: 'uint32' },
          { name: 'weight', internalType: 'uint112', type: 'uint112' },
          { name: 'weightCutPercent', internalType: 'uint32', type: 'uint32' },
          {
            name: 'approvalHook',
            internalType: 'contract IJBRulesetApprovalHook',
            type: 'address',
          },
          { name: 'metadata', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'baseRulesetCycleNumber',
        internalType: 'uint256',
        type: 'uint256',
      },
      { name: 'baseRulesetStart', internalType: 'uint256', type: 'uint256' },
      { name: 'baseRulesetDuration', internalType: 'uint256', type: 'uint256' },
      { name: 'start', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'deriveCycleNumberFrom',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [
      { name: 'baseRulesetStart', internalType: 'uint256', type: 'uint256' },
      { name: 'baseRulesetDuration', internalType: 'uint256', type: 'uint256' },
      { name: 'mustStartAtOrAfter', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'deriveStartFrom',
    outputs: [{ name: 'start', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'baseRulesetStart', internalType: 'uint256', type: 'uint256' },
      { name: 'baseRulesetDuration', internalType: 'uint256', type: 'uint256' },
      { name: 'baseRulesetWeight', internalType: 'uint256', type: 'uint256' },
      {
        name: 'baseRulesetWeightCutPercent',
        internalType: 'uint256',
        type: 'uint256',
      },
      { name: 'baseRulesetCacheId', internalType: 'uint256', type: 'uint256' },
      { name: 'start', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'deriveWeightFrom',
    outputs: [{ name: 'weight', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'getRulesetOf',
    outputs: [
      {
        name: 'ruleset',
        internalType: 'struct JBRuleset',
        type: 'tuple',
        components: [
          { name: 'cycleNumber', internalType: 'uint48', type: 'uint48' },
          { name: 'id', internalType: 'uint48', type: 'uint48' },
          { name: 'basedOnId', internalType: 'uint48', type: 'uint48' },
          { name: 'start', internalType: 'uint48', type: 'uint48' },
          { name: 'duration', internalType: 'uint32', type: 'uint32' },
          { name: 'weight', internalType: 'uint112', type: 'uint112' },
          { name: 'weightCutPercent', internalType: 'uint32', type: 'uint32' },
          {
            name: 'approvalHook',
            internalType: 'contract IJBRulesetApprovalHook',
            type: 'address',
          },
          { name: 'metadata', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'latestQueuedOf',
    outputs: [
      {
        name: 'ruleset',
        internalType: 'struct JBRuleset',
        type: 'tuple',
        components: [
          { name: 'cycleNumber', internalType: 'uint48', type: 'uint48' },
          { name: 'id', internalType: 'uint48', type: 'uint48' },
          { name: 'basedOnId', internalType: 'uint48', type: 'uint48' },
          { name: 'start', internalType: 'uint48', type: 'uint48' },
          { name: 'duration', internalType: 'uint32', type: 'uint32' },
          { name: 'weight', internalType: 'uint112', type: 'uint112' },
          { name: 'weightCutPercent', internalType: 'uint32', type: 'uint32' },
          {
            name: 'approvalHook',
            internalType: 'contract IJBRulesetApprovalHook',
            type: 'address',
          },
          { name: 'metadata', internalType: 'uint256', type: 'uint256' },
        ],
      },
      {
        name: 'approvalStatus',
        internalType: 'enum JBApprovalStatus',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'latestRulesetIdOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'duration', internalType: 'uint256', type: 'uint256' },
      { name: 'weight', internalType: 'uint256', type: 'uint256' },
      { name: 'weightCutPercent', internalType: 'uint256', type: 'uint256' },
      {
        name: 'approvalHook',
        internalType: 'contract IJBRulesetApprovalHook',
        type: 'address',
      },
      { name: 'metadata', internalType: 'uint256', type: 'uint256' },
      { name: 'mustStartAtOrAfter', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'queueFor',
    outputs: [
      {
        name: '',
        internalType: 'struct JBRuleset',
        type: 'tuple',
        components: [
          { name: 'cycleNumber', internalType: 'uint48', type: 'uint48' },
          { name: 'id', internalType: 'uint48', type: 'uint48' },
          { name: 'basedOnId', internalType: 'uint48', type: 'uint48' },
          { name: 'start', internalType: 'uint48', type: 'uint48' },
          { name: 'duration', internalType: 'uint32', type: 'uint32' },
          { name: 'weight', internalType: 'uint112', type: 'uint112' },
          { name: 'weightCutPercent', internalType: 'uint32', type: 'uint32' },
          {
            name: 'approvalHook',
            internalType: 'contract IJBRulesetApprovalHook',
            type: 'address',
          },
          { name: 'metadata', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'upcomingOf',
    outputs: [
      {
        name: 'ruleset',
        internalType: 'struct JBRuleset',
        type: 'tuple',
        components: [
          { name: 'cycleNumber', internalType: 'uint48', type: 'uint48' },
          { name: 'id', internalType: 'uint48', type: 'uint48' },
          { name: 'basedOnId', internalType: 'uint48', type: 'uint48' },
          { name: 'start', internalType: 'uint48', type: 'uint48' },
          { name: 'duration', internalType: 'uint32', type: 'uint32' },
          { name: 'weight', internalType: 'uint112', type: 'uint112' },
          { name: 'weightCutPercent', internalType: 'uint32', type: 'uint32' },
          {
            name: 'approvalHook',
            internalType: 'contract IJBRulesetApprovalHook',
            type: 'address',
          },
          { name: 'metadata', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'updateRulesetWeightCache',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'rulesetId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'basedOnId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'RulesetInitialized',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'rulesetId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'duration',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'weight',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'weightCutPercent',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'approvalHook',
        internalType: 'contract IJBRulesetApprovalHook',
        type: 'address',
        indexed: false,
      },
      {
        name: 'metadata',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'mustStartAtOrAfter',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'RulesetQueued',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'weight',
        internalType: 'uint112',
        type: 'uint112',
        indexed: false,
      },
      {
        name: 'weightCutMultiple',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'WeightCacheUpdated',
  },
  {
    type: 'error',
    inputs: [{ name: 'controller', internalType: 'address', type: 'address' }],
    name: 'JBControlled_ControllerUnauthorized',
  },
  {
    type: 'error',
    inputs: [
      {
        name: 'hook',
        internalType: 'contract IJBRulesetApprovalHook',
        type: 'address',
      },
    ],
    name: 'JBRulesets_InvalidRulesetApprovalHook',
  },
  {
    type: 'error',
    inputs: [
      { name: 'duration', internalType: 'uint256', type: 'uint256' },
      { name: 'limit', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBRulesets_InvalidRulesetDuration',
  },
  {
    type: 'error',
    inputs: [
      { name: 'timestamp', internalType: 'uint256', type: 'uint256' },
      { name: 'limit', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBRulesets_InvalidRulesetEndTime',
  },
  {
    type: 'error',
    inputs: [
      { name: 'weight', internalType: 'uint256', type: 'uint256' },
      { name: 'limit', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBRulesets_InvalidWeight',
  },
  {
    type: 'error',
    inputs: [{ name: 'percent', internalType: 'uint256', type: 'uint256' }],
    name: 'JBRulesets_InvalidWeightCutPercent',
  },
  {
    type: 'error',
    inputs: [
      { name: 'x', internalType: 'uint256', type: 'uint256' },
      { name: 'y', internalType: 'uint256', type: 'uint256' },
      { name: 'denominator', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'PRBMath_MulDiv_Overflow',
  },
] as const

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 */
export const jbRulesetsAddress = {
  84532: '0x117aA863C690A871523715E0eA42A49121F10Cfd',
  421614: '0x117aA863C690A871523715E0eA42A49121F10Cfd',
  11155111: '0x117aA863C690A871523715E0eA42A49121F10Cfd',
  11155420: '0x117aA863C690A871523715E0eA42A49121F10Cfd',
} as const

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 */
export const jbRulesetsConfig = {
  address: jbRulesetsAddress,
  abi: jbRulesetsAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBSplits
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 */
export const jbSplitsAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'directory',
        internalType: 'contract IJBDirectory',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DIRECTORY',
    outputs: [
      { name: '', internalType: 'contract IJBDirectory', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'FALLBACK_RULESET_ID',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'splitGroups',
        internalType: 'struct JBSplitGroup[]',
        type: 'tuple[]',
        components: [
          { name: 'groupId', internalType: 'uint256', type: 'uint256' },
          {
            name: 'splits',
            internalType: 'struct JBSplit[]',
            type: 'tuple[]',
            components: [
              { name: 'percent', internalType: 'uint32', type: 'uint32' },
              { name: 'projectId', internalType: 'uint64', type: 'uint64' },
              {
                name: 'beneficiary',
                internalType: 'address payable',
                type: 'address',
              },
              {
                name: 'preferAddToBalance',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'lockedUntil', internalType: 'uint48', type: 'uint48' },
              {
                name: 'hook',
                internalType: 'contract IJBSplitHook',
                type: 'address',
              },
            ],
          },
        ],
      },
    ],
    name: 'setSplitGroupsOf',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
      { name: 'groupId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'splitsOf',
    outputs: [
      {
        name: 'splits',
        internalType: 'struct JBSplit[]',
        type: 'tuple[]',
        components: [
          { name: 'percent', internalType: 'uint32', type: 'uint32' },
          { name: 'projectId', internalType: 'uint64', type: 'uint64' },
          {
            name: 'beneficiary',
            internalType: 'address payable',
            type: 'address',
          },
          { name: 'preferAddToBalance', internalType: 'bool', type: 'bool' },
          { name: 'lockedUntil', internalType: 'uint48', type: 'uint48' },
          {
            name: 'hook',
            internalType: 'contract IJBSplitHook',
            type: 'address',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'rulesetId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'groupId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'split',
        internalType: 'struct JBSplit',
        type: 'tuple',
        components: [
          { name: 'percent', internalType: 'uint32', type: 'uint32' },
          { name: 'projectId', internalType: 'uint64', type: 'uint64' },
          {
            name: 'beneficiary',
            internalType: 'address payable',
            type: 'address',
          },
          { name: 'preferAddToBalance', internalType: 'bool', type: 'bool' },
          { name: 'lockedUntil', internalType: 'uint48', type: 'uint48' },
          {
            name: 'hook',
            internalType: 'contract IJBSplitHook',
            type: 'address',
          },
        ],
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'SetSplit',
  },
  {
    type: 'error',
    inputs: [{ name: 'controller', internalType: 'address', type: 'address' }],
    name: 'JBControlled_ControllerUnauthorized',
  },
  {
    type: 'error',
    inputs: [],
    name: 'JBSplits_PreviousLockedSplitsNotIncluded',
  },
  { type: 'error', inputs: [], name: 'JBSplits_TotalPercentExceeds100' },
  { type: 'error', inputs: [], name: 'JBSplits_ZeroSplitPercent' },
] as const

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 */
export const jbSplitsAddress = {
  84532: '0x3792121047C75d0808A230EB4E67157d93Fafcba',
  421614: '0x3792121047C75d0808A230EB4E67157d93Fafcba',
  11155111: '0x3792121047C75d0808A230EB4E67157d93Fafcba',
  11155420: '0x3792121047C75d0808A230EB4E67157d93Fafcba',
} as const

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 */
export const jbSplitsConfig = {
  address: jbSplitsAddress,
  abi: jbSplitsAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBSuckerRegistry
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const jbSuckerRegistryAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'directory',
        internalType: 'contract IJBDirectory',
        type: 'address',
      },
      {
        name: 'permissions',
        internalType: 'contract IJBPermissions',
        type: 'address',
      },
      { name: 'initialOwner', internalType: 'address', type: 'address' },
      { name: 'trusted_forwarder', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DIRECTORY',
    outputs: [
      { name: '', internalType: 'contract IJBDirectory', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PERMISSIONS',
    outputs: [
      { name: '', internalType: 'contract IJBPermissions', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PROJECTS',
    outputs: [
      { name: '', internalType: 'contract IJBProjects', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'deployer', internalType: 'address', type: 'address' }],
    name: 'allowSuckerDeployer',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'deployers', internalType: 'address[]', type: 'address[]' },
    ],
    name: 'allowSuckerDeployers',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
      {
        name: 'configurations',
        internalType: 'struct JBSuckerDeployerConfig[]',
        type: 'tuple[]',
        components: [
          {
            name: 'deployer',
            internalType: 'contract IJBSuckerDeployer',
            type: 'address',
          },
          {
            name: 'mappings',
            internalType: 'struct JBTokenMapping[]',
            type: 'tuple[]',
            components: [
              { name: 'localToken', internalType: 'address', type: 'address' },
              { name: 'minGas', internalType: 'uint32', type: 'uint32' },
              { name: 'remoteToken', internalType: 'address', type: 'address' },
              {
                name: 'minBridgeAmount',
                internalType: 'uint256',
                type: 'uint256',
              },
            ],
          },
        ],
      },
    ],
    name: 'deploySuckersFor',
    outputs: [
      { name: 'suckers', internalType: 'address[]', type: 'address[]' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'getSuckerPairsOf',
    outputs: [
      {
        name: 'pairs',
        internalType: 'struct JBSuckersPair[]',
        type: 'tuple[]',
        components: [
          { name: 'local', internalType: 'address', type: 'address' },
          { name: 'remote', internalType: 'address', type: 'address' },
          { name: 'remoteChainId', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'addr', internalType: 'address', type: 'address' },
    ],
    name: 'isSuckerOf',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'forwarder', internalType: 'address', type: 'address' }],
    name: 'isTrustedForwarder',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'sucker', internalType: 'address', type: 'address' },
    ],
    name: 'removeDeprecatedSucker',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'deployer', internalType: 'address', type: 'address' }],
    name: 'removeSuckerDeployer',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'deployer', internalType: 'address', type: 'address' }],
    name: 'suckerDeployerIsAllowed',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'suckersOf',
    outputs: [{ name: '', internalType: 'address[]', type: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'trustedForwarder',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'sucker',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'configuration',
        internalType: 'struct JBSuckerDeployerConfig',
        type: 'tuple',
        components: [
          {
            name: 'deployer',
            internalType: 'contract IJBSuckerDeployer',
            type: 'address',
          },
          {
            name: 'mappings',
            internalType: 'struct JBTokenMapping[]',
            type: 'tuple[]',
            components: [
              { name: 'localToken', internalType: 'address', type: 'address' },
              { name: 'minGas', internalType: 'uint32', type: 'uint32' },
              { name: 'remoteToken', internalType: 'address', type: 'address' },
              {
                name: 'minBridgeAmount',
                internalType: 'uint256',
                type: 'uint256',
              },
            ],
          },
        ],
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'SuckerDeployedFor',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'deployer',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'SuckerDeployerAllowed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'deployer',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'SuckerDeployerRemoved',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'sucker',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'SuckerDeprecated',
  },
  {
    type: 'error',
    inputs: [
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'sender', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'permissionId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBPermissioned_Unauthorized',
  },
  {
    type: 'error',
    inputs: [
      {
        name: 'deployer',
        internalType: 'contract IJBSuckerDeployer',
        type: 'address',
      },
    ],
    name: 'JBSuckerRegistry_InvalidDeployer',
  },
  {
    type: 'error',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'JBSuckerRegistry_RulesetDoesNotAllowAddingSucker',
  },
  {
    type: 'error',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'sucker', internalType: 'address', type: 'address' },
    ],
    name: 'JBSuckerRegistry_SuckerDoesNotBelongToProject',
  },
  {
    type: 'error',
    inputs: [
      { name: 'sucker', internalType: 'address', type: 'address' },
      {
        name: 'suckerState',
        internalType: 'enum JBSuckerState',
        type: 'uint8',
      },
    ],
    name: 'JBSuckerRegistry_SuckerIsNotDeprecated',
  },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'OwnableInvalidOwner',
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'OwnableUnauthorizedAccount',
  },
] as const

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const jbSuckerRegistryAddress = {
  84532: '0x54c6a82C83449293f3FCAd1735dCEC1E31257A9E',
  421614: '0x54c6a82C83449293f3FCAd1735dCEC1E31257A9E',
  11155111: '0x54c6a82C83449293f3FCAd1735dCEC1E31257A9E',
  11155420: '0x54c6a82C83449293f3FCAd1735dCEC1E31257A9E',
} as const

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const jbSuckerRegistryConfig = {
  address: jbSuckerRegistryAddress,
  abi: jbSuckerRegistryAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBSwapTerminal
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const jbSwapTerminalAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'directory',
        internalType: 'contract IJBDirectory',
        type: 'address',
      },
      {
        name: 'permissions',
        internalType: 'contract IJBPermissions',
        type: 'address',
      },
      {
        name: 'projects',
        internalType: 'contract IJBProjects',
        type: 'address',
      },
      { name: 'permit2', internalType: 'contract IPermit2', type: 'address' },
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'weth', internalType: 'contract IWETH9', type: 'address' },
      { name: 'tokenOut', internalType: 'address', type: 'address' },
      {
        name: 'factory',
        internalType: 'contract IUniswapV3Factory',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  { type: 'receive', stateMutability: 'payable' },
  {
    type: 'function',
    inputs: [],
    name: 'DEFAULT_PROJECT_ID',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DIRECTORY',
    outputs: [
      { name: '', internalType: 'contract IJBDirectory', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'FACTORY',
    outputs: [
      { name: '', internalType: 'contract IUniswapV3Factory', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MAX_TWAP_SLIPPAGE_TOLERANCE',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MAX_TWAP_WINDOW',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MIN_DEFAULT_POOL_CARDINALITY',
    outputs: [{ name: '', internalType: 'uint16', type: 'uint16' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MIN_TWAP_SLIPPAGE_TOLERANCE',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MIN_TWAP_WINDOW',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PERMISSIONS',
    outputs: [
      { name: '', internalType: 'contract IJBPermissions', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PERMIT2',
    outputs: [{ name: '', internalType: 'contract IPermit2', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PROJECTS',
    outputs: [
      { name: '', internalType: 'contract IJBProjects', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'SLIPPAGE_DENOMINATOR',
    outputs: [{ name: '', internalType: 'uint160', type: 'uint160' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'TOKEN_OUT',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'WETH',
    outputs: [{ name: '', internalType: 'contract IWETH9', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
    ],
    name: 'accountingContextForTokenOf',
    outputs: [
      {
        name: 'context',
        internalType: 'struct JBAccountingContext',
        type: 'tuple',
        components: [
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'decimals', internalType: 'uint8', type: 'uint8' },
          { name: 'currency', internalType: 'uint32', type: 'uint32' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'accountingContextsOf',
    outputs: [
      {
        name: 'contexts',
        internalType: 'struct JBAccountingContext[]',
        type: 'tuple[]',
        components: [
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'decimals', internalType: 'uint8', type: 'uint8' },
          { name: 'currency', internalType: 'uint32', type: 'uint32' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'accountingContexts',
        internalType: 'struct JBAccountingContext[]',
        type: 'tuple[]',
        components: [
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'decimals', internalType: 'uint8', type: 'uint8' },
          { name: 'currency', internalType: 'uint32', type: 'uint32' },
        ],
      },
    ],
    name: 'addAccountingContextsFor',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
      {
        name: 'pool',
        internalType: 'contract IUniswapV3Pool',
        type: 'address',
      },
    ],
    name: 'addDefaultPool',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'shouldReturnHeldFees', internalType: 'bool', type: 'bool' },
      { name: 'memo', internalType: 'string', type: 'string' },
      { name: 'metadata', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'addToBalanceOf',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'pool',
        internalType: 'contract IUniswapV3Pool',
        type: 'address',
      },
      { name: 'twapWindow', internalType: 'uint256', type: 'uint256' },
      { name: 'slippageTolerance', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'addTwapParamsFor',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'accountingContexts',
        internalType: 'struct JBAccountingContext[]',
        type: 'tuple[]',
        components: [
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'decimals', internalType: 'uint8', type: 'uint8' },
          { name: 'currency', internalType: 'uint32', type: 'uint32' },
        ],
      },
      { name: 'decimals', internalType: 'uint256', type: 'uint256' },
      { name: 'currency', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'currentSurplusOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'tokenIn', internalType: 'address', type: 'address' },
    ],
    name: 'getPoolFor',
    outputs: [
      {
        name: 'pool',
        internalType: 'contract IUniswapV3Pool',
        type: 'address',
      },
      { name: 'zeroForOne', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'contract IJBTerminal', type: 'address' },
    ],
    name: 'migrateBalanceOf',
    outputs: [{ name: 'balance', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'beneficiary', internalType: 'address', type: 'address' },
      { name: 'minReturnedTokens', internalType: 'uint256', type: 'uint256' },
      { name: 'memo', internalType: 'string', type: 'string' },
      { name: 'metadata', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'pay',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'pool',
        internalType: 'contract IUniswapV3Pool',
        type: 'address',
      },
    ],
    name: 'twapParamsOf',
    outputs: [
      { name: '', internalType: 'uint32', type: 'uint32' },
      { name: '', internalType: 'uint160', type: 'uint160' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'amount0Delta', internalType: 'int256', type: 'int256' },
      { name: 'amount1Delta', internalType: 'int256', type: 'int256' },
      { name: 'data', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'uniswapV3SwapCallback',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'returnedFees',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      { name: 'memo', internalType: 'string', type: 'string', indexed: false },
      {
        name: 'metadata',
        internalType: 'bytes',
        type: 'bytes',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'AddToBalance',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'hook',
        internalType: 'contract IJBPayHook',
        type: 'address',
        indexed: true,
      },
      {
        name: 'context',
        internalType: 'struct JBAfterPayRecordedContext',
        type: 'tuple',
        components: [
          { name: 'payer', internalType: 'address', type: 'address' },
          { name: 'projectId', internalType: 'uint256', type: 'uint256' },
          { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
          {
            name: 'amount',
            internalType: 'struct JBTokenAmount',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'decimals', internalType: 'uint8', type: 'uint8' },
              { name: 'currency', internalType: 'uint32', type: 'uint32' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
            ],
          },
          {
            name: 'forwardedAmount',
            internalType: 'struct JBTokenAmount',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'decimals', internalType: 'uint8', type: 'uint8' },
              { name: 'currency', internalType: 'uint32', type: 'uint32' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
            ],
          },
          { name: 'weight', internalType: 'uint256', type: 'uint256' },
          {
            name: 'newlyIssuedTokenCount',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'beneficiary', internalType: 'address', type: 'address' },
          { name: 'hookMetadata', internalType: 'bytes', type: 'bytes' },
          { name: 'payerMetadata', internalType: 'bytes', type: 'bytes' },
        ],
        indexed: false,
      },
      {
        name: 'specificationAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'HookAfterRecordPay',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'to',
        internalType: 'contract IJBTerminal',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'MigrateTerminal',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'rulesetId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'rulesetCycleNumber',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'payer',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'beneficiary',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'newlyIssuedTokenCount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      { name: 'memo', internalType: 'string', type: 'string', indexed: false },
      {
        name: 'metadata',
        internalType: 'bytes',
        type: 'bytes',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Pay',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'context',
        internalType: 'struct JBAccountingContext',
        type: 'tuple',
        components: [
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'decimals', internalType: 'uint8', type: 'uint8' },
          { name: 'currency', internalType: 'uint32', type: 'uint32' },
        ],
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'SetAccountingContext',
  },
  { type: 'error', inputs: [], name: 'FailedCall' },
  {
    type: 'error',
    inputs: [
      { name: 'balance', internalType: 'uint256', type: 'uint256' },
      { name: 'needed', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'InsufficientBalance',
  },
  {
    type: 'error',
    inputs: [
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'sender', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'permissionId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBPermissioned_Unauthorized',
  },
  {
    type: 'error',
    inputs: [{ name: 'caller', internalType: 'address', type: 'address' }],
    name: 'JBSwapTerminal_CallerNotPool',
  },
  {
    type: 'error',
    inputs: [
      { name: 'slippageTolerance', internalType: 'uint256', type: 'uint256' },
      {
        name: 'minSlippageTolerance',
        internalType: 'uint256',
        type: 'uint256',
      },
      {
        name: 'maxSlippageTolerance',
        internalType: 'uint256',
        type: 'uint256',
      },
    ],
    name: 'JBSwapTerminal_InvalidTwapSlippageTolerance',
  },
  {
    type: 'error',
    inputs: [
      { name: 'window', internalType: 'uint256', type: 'uint256' },
      { name: 'minWindow', internalType: 'uint256', type: 'uint256' },
      { name: 'maxWindow', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBSwapTerminal_InvalidTwapWindow',
  },
  {
    type: 'error',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
    ],
    name: 'JBSwapTerminal_NoDefaultPoolDefined',
  },
  {
    type: 'error',
    inputs: [{ name: 'value', internalType: 'uint256', type: 'uint256' }],
    name: 'JBSwapTerminal_NoMsgValueAllowed',
  },
  {
    type: 'error',
    inputs: [
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'allowance', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBSwapTerminal_PermitAllowanceNotEnough',
  },
  {
    type: 'error',
    inputs: [
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'minimum', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBSwapTerminal_SpecifiedSlippageExceeded',
  },
  {
    type: 'error',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
    ],
    name: 'JBSwapTerminal_TokenNotAccepted',
  },
  {
    type: 'error',
    inputs: [{ name: 'caller', internalType: 'address', type: 'address' }],
    name: 'JBSwapTerminal_UnexpectedCall',
  },
  {
    type: 'error',
    inputs: [
      { name: 'pool', internalType: 'address', type: 'address' },
      { name: 'expectedPool', internalType: 'address', type: 'address' },
    ],
    name: 'JBSwapTerminal_WrongPool',
  },
  { type: 'error', inputs: [], name: 'JBSwapTerminal_ZeroToken' },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'OwnableInvalidOwner',
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'OwnableUnauthorizedAccount',
  },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation',
  },
  { type: 'error', inputs: [], name: 'T' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBTerminalStore
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const jbTerminalStoreAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'directory',
        internalType: 'contract IJBDirectory',
        type: 'address',
      },
      { name: 'prices', internalType: 'contract IJBPrices', type: 'address' },
      {
        name: 'rulesets',
        internalType: 'contract IJBRulesets',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DIRECTORY',
    outputs: [
      { name: '', internalType: 'contract IJBDirectory', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PRICES',
    outputs: [
      { name: '', internalType: 'contract IJBPrices', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'RULESETS',
    outputs: [
      { name: '', internalType: 'contract IJBRulesets', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'terminal', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
    ],
    name: 'balanceOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'cashOutCount', internalType: 'uint256', type: 'uint256' },
      {
        name: 'terminals',
        internalType: 'contract IJBTerminal[]',
        type: 'address[]',
      },
      {
        name: 'accountingContexts',
        internalType: 'struct JBAccountingContext[]',
        type: 'tuple[]',
        components: [
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'decimals', internalType: 'uint8', type: 'uint8' },
          { name: 'currency', internalType: 'uint32', type: 'uint32' },
        ],
      },
      { name: 'decimals', internalType: 'uint256', type: 'uint256' },
      { name: 'currency', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'currentReclaimableSurplusOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'terminal', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'accountingContexts',
        internalType: 'struct JBAccountingContext[]',
        type: 'tuple[]',
        components: [
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'decimals', internalType: 'uint8', type: 'uint8' },
          { name: 'currency', internalType: 'uint32', type: 'uint32' },
        ],
      },
      { name: 'decimals', internalType: 'uint256', type: 'uint256' },
      { name: 'currency', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'currentSurplusOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'decimals', internalType: 'uint256', type: 'uint256' },
      { name: 'currency', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'currentTotalSurplusOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'recordAddedBalanceFor',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'holder', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'cashOutCount', internalType: 'uint256', type: 'uint256' },
      {
        name: 'accountingContext',
        internalType: 'struct JBAccountingContext',
        type: 'tuple',
        components: [
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'decimals', internalType: 'uint8', type: 'uint8' },
          { name: 'currency', internalType: 'uint32', type: 'uint32' },
        ],
      },
      {
        name: 'balanceAccountingContexts',
        internalType: 'struct JBAccountingContext[]',
        type: 'tuple[]',
        components: [
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'decimals', internalType: 'uint8', type: 'uint8' },
          { name: 'currency', internalType: 'uint32', type: 'uint32' },
        ],
      },
      { name: 'metadata', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'recordCashOutFor',
    outputs: [
      {
        name: 'ruleset',
        internalType: 'struct JBRuleset',
        type: 'tuple',
        components: [
          { name: 'cycleNumber', internalType: 'uint48', type: 'uint48' },
          { name: 'id', internalType: 'uint48', type: 'uint48' },
          { name: 'basedOnId', internalType: 'uint48', type: 'uint48' },
          { name: 'start', internalType: 'uint48', type: 'uint48' },
          { name: 'duration', internalType: 'uint32', type: 'uint32' },
          { name: 'weight', internalType: 'uint112', type: 'uint112' },
          { name: 'weightCutPercent', internalType: 'uint32', type: 'uint32' },
          {
            name: 'approvalHook',
            internalType: 'contract IJBRulesetApprovalHook',
            type: 'address',
          },
          { name: 'metadata', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'reclaimAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'cashOutTaxRate', internalType: 'uint256', type: 'uint256' },
      {
        name: 'hookSpecifications',
        internalType: 'struct JBCashOutHookSpecification[]',
        type: 'tuple[]',
        components: [
          {
            name: 'hook',
            internalType: 'contract IJBCashOutHook',
            type: 'address',
          },
          { name: 'amount', internalType: 'uint256', type: 'uint256' },
          { name: 'metadata', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'payer', internalType: 'address', type: 'address' },
      {
        name: 'amount',
        internalType: 'struct JBTokenAmount',
        type: 'tuple',
        components: [
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'decimals', internalType: 'uint8', type: 'uint8' },
          { name: 'currency', internalType: 'uint32', type: 'uint32' },
          { name: 'value', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'beneficiary', internalType: 'address', type: 'address' },
      { name: 'metadata', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'recordPaymentFrom',
    outputs: [
      {
        name: 'ruleset',
        internalType: 'struct JBRuleset',
        type: 'tuple',
        components: [
          { name: 'cycleNumber', internalType: 'uint48', type: 'uint48' },
          { name: 'id', internalType: 'uint48', type: 'uint48' },
          { name: 'basedOnId', internalType: 'uint48', type: 'uint48' },
          { name: 'start', internalType: 'uint48', type: 'uint48' },
          { name: 'duration', internalType: 'uint32', type: 'uint32' },
          { name: 'weight', internalType: 'uint112', type: 'uint112' },
          { name: 'weightCutPercent', internalType: 'uint32', type: 'uint32' },
          {
            name: 'approvalHook',
            internalType: 'contract IJBRulesetApprovalHook',
            type: 'address',
          },
          { name: 'metadata', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'tokenCount', internalType: 'uint256', type: 'uint256' },
      {
        name: 'hookSpecifications',
        internalType: 'struct JBPayHookSpecification[]',
        type: 'tuple[]',
        components: [
          {
            name: 'hook',
            internalType: 'contract IJBPayHook',
            type: 'address',
          },
          { name: 'amount', internalType: 'uint256', type: 'uint256' },
          { name: 'metadata', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'accountingContext',
        internalType: 'struct JBAccountingContext',
        type: 'tuple',
        components: [
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'decimals', internalType: 'uint8', type: 'uint8' },
          { name: 'currency', internalType: 'uint32', type: 'uint32' },
        ],
      },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'currency', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'recordPayoutFor',
    outputs: [
      {
        name: 'ruleset',
        internalType: 'struct JBRuleset',
        type: 'tuple',
        components: [
          { name: 'cycleNumber', internalType: 'uint48', type: 'uint48' },
          { name: 'id', internalType: 'uint48', type: 'uint48' },
          { name: 'basedOnId', internalType: 'uint48', type: 'uint48' },
          { name: 'start', internalType: 'uint48', type: 'uint48' },
          { name: 'duration', internalType: 'uint32', type: 'uint32' },
          { name: 'weight', internalType: 'uint112', type: 'uint112' },
          { name: 'weightCutPercent', internalType: 'uint32', type: 'uint32' },
          {
            name: 'approvalHook',
            internalType: 'contract IJBRulesetApprovalHook',
            type: 'address',
          },
          { name: 'metadata', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'amountPaidOut', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
    ],
    name: 'recordTerminalMigration',
    outputs: [{ name: 'balance', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'accountingContext',
        internalType: 'struct JBAccountingContext',
        type: 'tuple',
        components: [
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'decimals', internalType: 'uint8', type: 'uint8' },
          { name: 'currency', internalType: 'uint32', type: 'uint32' },
        ],
      },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'currency', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'recordUsedAllowanceOf',
    outputs: [
      {
        name: 'ruleset',
        internalType: 'struct JBRuleset',
        type: 'tuple',
        components: [
          { name: 'cycleNumber', internalType: 'uint48', type: 'uint48' },
          { name: 'id', internalType: 'uint48', type: 'uint48' },
          { name: 'basedOnId', internalType: 'uint48', type: 'uint48' },
          { name: 'start', internalType: 'uint48', type: 'uint48' },
          { name: 'duration', internalType: 'uint32', type: 'uint32' },
          { name: 'weight', internalType: 'uint112', type: 'uint112' },
          { name: 'weightCutPercent', internalType: 'uint32', type: 'uint32' },
          {
            name: 'approvalHook',
            internalType: 'contract IJBRulesetApprovalHook',
            type: 'address',
          },
          { name: 'metadata', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'usedAmount', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'terminal', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'rulesetCycleNumber', internalType: 'uint256', type: 'uint256' },
      { name: 'currency', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'usedPayoutLimitOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'terminal', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
      { name: 'currency', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'usedSurplusAllowanceOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'error',
    inputs: [
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'allowance', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBTerminalStore_InadequateControllerAllowance',
  },
  {
    type: 'error',
    inputs: [
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'limit', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBTerminalStore_InadequateControllerPayoutLimit',
  },
  {
    type: 'error',
    inputs: [
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'balance', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBTerminalStore_InadequateTerminalStoreBalance',
  },
  {
    type: 'error',
    inputs: [
      { name: 'count', internalType: 'uint256', type: 'uint256' },
      { name: 'totalSupply', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBTerminalStore_InsufficientTokens',
  },
  {
    type: 'error',
    inputs: [
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'paidAmount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBTerminalStore_InvalidAmountToForwardHook',
  },
  { type: 'error', inputs: [], name: 'JBTerminalStore_RulesetNotFound' },
  { type: 'error', inputs: [], name: 'JBTerminalStore_RulesetPaymentPaused' },
  {
    type: 'error',
    inputs: [],
    name: 'JBTerminalStore_TerminalMigrationNotAllowed',
  },
  {
    type: 'error',
    inputs: [
      { name: 'x', internalType: 'uint256', type: 'uint256' },
      { name: 'y', internalType: 'uint256', type: 'uint256' },
      { name: 'denominator', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'PRBMath_MulDiv_Overflow',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBTokens
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const jbTokensAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'directory',
        internalType: 'contract IJBDirectory',
        type: 'address',
      },
      { name: 'token', internalType: 'contract IJBToken', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DIRECTORY',
    outputs: [
      { name: '', internalType: 'contract IJBDirectory', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'TOKEN',
    outputs: [{ name: '', internalType: 'contract IJBToken', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'holder', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'count', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'burnFrom',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'holder', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'count', internalType: 'uint256', type: 'uint256' },
      { name: 'beneficiary', internalType: 'address', type: 'address' },
    ],
    name: 'claimTokensFor',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'holder', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'creditBalanceOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'name', internalType: 'string', type: 'string' },
      { name: 'symbol', internalType: 'string', type: 'string' },
      { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'deployERC20For',
    outputs: [
      { name: 'token', internalType: 'contract IJBToken', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'holder', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'count', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'mintFor',
    outputs: [
      { name: 'token', internalType: 'contract IJBToken', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'contract IJBToken', type: 'address' },
    ],
    name: 'projectIdOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'contract IJBToken', type: 'address' },
    ],
    name: 'setTokenFor',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'tokenOf',
    outputs: [{ name: '', internalType: 'contract IJBToken', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'holder', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'totalBalanceOf',
    outputs: [{ name: 'balance', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'totalCreditSupplyOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'totalSupplyOf',
    outputs: [
      { name: 'totalSupply', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'holder', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'recipient', internalType: 'address', type: 'address' },
      { name: 'count', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transferCreditsFrom',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'holder',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'count',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'creditBalance',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'tokenBalance',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Burn',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'holder',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'creditBalance',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'count',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'beneficiary',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'ClaimTokens',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'token',
        internalType: 'contract IJBToken',
        type: 'address',
        indexed: true,
      },
      { name: 'name', internalType: 'string', type: 'string', indexed: false },
      {
        name: 'symbol',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
      {
        name: 'salt',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'DeployERC20',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'holder',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'count',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'tokensWereClaimed',
        internalType: 'bool',
        type: 'bool',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Mint',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'token',
        internalType: 'contract IJBToken',
        type: 'address',
        indexed: true,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'SetToken',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'holder',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'recipient',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'count',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'TransferCredits',
  },
  { type: 'error', inputs: [], name: 'FailedDeployment' },
  {
    type: 'error',
    inputs: [
      { name: 'balance', internalType: 'uint256', type: 'uint256' },
      { name: 'needed', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'InsufficientBalance',
  },
  {
    type: 'error',
    inputs: [{ name: 'controller', internalType: 'address', type: 'address' }],
    name: 'JBControlled_ControllerUnauthorized',
  },
  { type: 'error', inputs: [], name: 'JBTokens_EmptyName' },
  { type: 'error', inputs: [], name: 'JBTokens_EmptySymbol' },
  { type: 'error', inputs: [], name: 'JBTokens_EmptyToken' },
  {
    type: 'error',
    inputs: [
      { name: 'count', internalType: 'uint256', type: 'uint256' },
      { name: 'creditBalance', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBTokens_InsufficientCredits',
  },
  {
    type: 'error',
    inputs: [
      { name: 'count', internalType: 'uint256', type: 'uint256' },
      { name: 'tokenBalance', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBTokens_InsufficientTokensToBurn',
  },
  {
    type: 'error',
    inputs: [
      { name: 'value', internalType: 'uint256', type: 'uint256' },
      { name: 'limit', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBTokens_OverflowAlert',
  },
  {
    type: 'error',
    inputs: [
      { name: 'token', internalType: 'contract IJBToken', type: 'address' },
    ],
    name: 'JBTokens_ProjectAlreadyHasToken',
  },
  {
    type: 'error',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'JBTokens_TokenAlreadyBeingUsed',
  },
  {
    type: 'error',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'JBTokens_TokenCantBeAdded',
  },
  { type: 'error', inputs: [], name: 'JBTokens_TokenNotFound' },
  {
    type: 'error',
    inputs: [{ name: 'decimals', internalType: 'uint256', type: 'uint256' }],
    name: 'JBTokens_TokensMustHave18Decimals',
  },
] as const

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const jbTokensAddress = {
  84532: '0xb4a4D8Ad7636E36d6ff3c7c664f9F797A532BBB2',
  421614: '0xb4a4D8Ad7636E36d6ff3c7c664f9F797A532BBB2',
  11155111: '0xb4a4D8Ad7636E36d6ff3c7c664f9F797A532BBB2',
  11155420: '0xb4a4D8Ad7636E36d6ff3c7c664f9F797A532BBB2',
} as const

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const jbTokensConfig = {
  address: jbTokensAddress,
  abi: jbTokensAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Action
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link erc2771ForwarderAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 */
export const readErc2771Forwarder = /*#__PURE__*/ createReadContract({
  abi: erc2771ForwarderAbi,
  address: erc2771ForwarderAddress,
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link erc2771ForwarderAbi}__ and `functionName` set to `"eip712Domain"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 */
export const readErc2771ForwarderEip712Domain =
  /*#__PURE__*/ createReadContract({
    abi: erc2771ForwarderAbi,
    address: erc2771ForwarderAddress,
    functionName: 'eip712Domain',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link erc2771ForwarderAbi}__ and `functionName` set to `"nonces"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 */
export const readErc2771ForwarderNonces = /*#__PURE__*/ createReadContract({
  abi: erc2771ForwarderAbi,
  address: erc2771ForwarderAddress,
  functionName: 'nonces',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link erc2771ForwarderAbi}__ and `functionName` set to `"verify"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 */
export const readErc2771ForwarderVerify = /*#__PURE__*/ createReadContract({
  abi: erc2771ForwarderAbi,
  address: erc2771ForwarderAddress,
  functionName: 'verify',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link erc2771ForwarderAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 */
export const writeErc2771Forwarder = /*#__PURE__*/ createWriteContract({
  abi: erc2771ForwarderAbi,
  address: erc2771ForwarderAddress,
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link erc2771ForwarderAbi}__ and `functionName` set to `"execute"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 */
export const writeErc2771ForwarderExecute = /*#__PURE__*/ createWriteContract({
  abi: erc2771ForwarderAbi,
  address: erc2771ForwarderAddress,
  functionName: 'execute',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link erc2771ForwarderAbi}__ and `functionName` set to `"executeBatch"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 */
export const writeErc2771ForwarderExecuteBatch =
  /*#__PURE__*/ createWriteContract({
    abi: erc2771ForwarderAbi,
    address: erc2771ForwarderAddress,
    functionName: 'executeBatch',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link erc2771ForwarderAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 */
export const simulateErc2771Forwarder = /*#__PURE__*/ createSimulateContract({
  abi: erc2771ForwarderAbi,
  address: erc2771ForwarderAddress,
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link erc2771ForwarderAbi}__ and `functionName` set to `"execute"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 */
export const simulateErc2771ForwarderExecute =
  /*#__PURE__*/ createSimulateContract({
    abi: erc2771ForwarderAbi,
    address: erc2771ForwarderAddress,
    functionName: 'execute',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link erc2771ForwarderAbi}__ and `functionName` set to `"executeBatch"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 */
export const simulateErc2771ForwarderExecuteBatch =
  /*#__PURE__*/ createSimulateContract({
    abi: erc2771ForwarderAbi,
    address: erc2771ForwarderAddress,
    functionName: 'executeBatch',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link erc2771ForwarderAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 */
export const watchErc2771ForwarderEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: erc2771ForwarderAbi,
    address: erc2771ForwarderAddress,
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link erc2771ForwarderAbi}__ and `eventName` set to `"EIP712DomainChanged"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 */
export const watchErc2771ForwarderEip712DomainChangedEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: erc2771ForwarderAbi,
    address: erc2771ForwarderAddress,
    eventName: 'EIP712DomainChanged',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link erc2771ForwarderAbi}__ and `eventName` set to `"ExecutedForwardRequest"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x460d4de0c26057303628101c9f1f6d8def482d8b)
 */
export const watchErc2771ForwarderExecutedForwardRequestEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: erc2771ForwarderAbi,
    address: erc2771ForwarderAddress,
    eventName: 'ExecutedForwardRequest',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookAbi}__
 */
export const readJb721TiersHook = /*#__PURE__*/ createReadContract({
  abi: jb721TiersHookAbi,
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"DIRECTORY"`
 */
export const readJb721TiersHookDirectory = /*#__PURE__*/ createReadContract({
  abi: jb721TiersHookAbi,
  functionName: 'DIRECTORY',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"METADATA_ID_TARGET"`
 */
export const readJb721TiersHookMetadataIdTarget =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'METADATA_ID_TARGET',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"PERMISSIONS"`
 */
export const readJb721TiersHookPermissions = /*#__PURE__*/ createReadContract({
  abi: jb721TiersHookAbi,
  functionName: 'PERMISSIONS',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"PROJECTS"`
 */
export const readJb721TiersHookProjects = /*#__PURE__*/ createReadContract({
  abi: jb721TiersHookAbi,
  functionName: 'PROJECTS',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"PROJECT_ID"`
 */
export const readJb721TiersHookProjectId = /*#__PURE__*/ createReadContract({
  abi: jb721TiersHookAbi,
  functionName: 'PROJECT_ID',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"RULESETS"`
 */
export const readJb721TiersHookRulesets = /*#__PURE__*/ createReadContract({
  abi: jb721TiersHookAbi,
  functionName: 'RULESETS',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"STORE"`
 */
export const readJb721TiersHookStoreAddress = /*#__PURE__*/ createReadContract({
  abi: jb721TiersHookAbi,
  functionName: 'STORE',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"balanceOf"`
 */
export const readJb721TiersHookBalanceOf = /*#__PURE__*/ createReadContract({
  abi: jb721TiersHookAbi,
  functionName: 'balanceOf',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"baseURI"`
 */
export const readJb721TiersHookBaseUri = /*#__PURE__*/ createReadContract({
  abi: jb721TiersHookAbi,
  functionName: 'baseURI',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"beforeCashOutRecordedWith"`
 */
export const readJb721TiersHookBeforeCashOutRecordedWith =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'beforeCashOutRecordedWith',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"beforePayRecordedWith"`
 */
export const readJb721TiersHookBeforePayRecordedWith =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'beforePayRecordedWith',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"cashOutWeightOf"`
 */
export const readJb721TiersHookCashOutWeightOf =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'cashOutWeightOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"contractURI"`
 */
export const readJb721TiersHookContractUri = /*#__PURE__*/ createReadContract({
  abi: jb721TiersHookAbi,
  functionName: 'contractURI',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"firstOwnerOf"`
 */
export const readJb721TiersHookFirstOwnerOf = /*#__PURE__*/ createReadContract({
  abi: jb721TiersHookAbi,
  functionName: 'firstOwnerOf',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"getApproved"`
 */
export const readJb721TiersHookGetApproved = /*#__PURE__*/ createReadContract({
  abi: jb721TiersHookAbi,
  functionName: 'getApproved',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"hasMintPermissionFor"`
 */
export const readJb721TiersHookHasMintPermissionFor =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'hasMintPermissionFor',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"isApprovedForAll"`
 */
export const readJb721TiersHookIsApprovedForAll =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'isApprovedForAll',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"isTrustedForwarder"`
 */
export const readJb721TiersHookIsTrustedForwarder =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'isTrustedForwarder',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"jbOwner"`
 */
export const readJb721TiersHookJbOwner = /*#__PURE__*/ createReadContract({
  abi: jb721TiersHookAbi,
  functionName: 'jbOwner',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"name"`
 */
export const readJb721TiersHookName = /*#__PURE__*/ createReadContract({
  abi: jb721TiersHookAbi,
  functionName: 'name',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"owner"`
 */
export const readJb721TiersHookOwner = /*#__PURE__*/ createReadContract({
  abi: jb721TiersHookAbi,
  functionName: 'owner',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"ownerOf"`
 */
export const readJb721TiersHookOwnerOf = /*#__PURE__*/ createReadContract({
  abi: jb721TiersHookAbi,
  functionName: 'ownerOf',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"payCreditsOf"`
 */
export const readJb721TiersHookPayCreditsOf = /*#__PURE__*/ createReadContract({
  abi: jb721TiersHookAbi,
  functionName: 'payCreditsOf',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"pricingContext"`
 */
export const readJb721TiersHookPricingContext =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'pricingContext',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"supportsInterface"`
 */
export const readJb721TiersHookSupportsInterface =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'supportsInterface',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"symbol"`
 */
export const readJb721TiersHookSymbol = /*#__PURE__*/ createReadContract({
  abi: jb721TiersHookAbi,
  functionName: 'symbol',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"tokenURI"`
 */
export const readJb721TiersHookTokenUri = /*#__PURE__*/ createReadContract({
  abi: jb721TiersHookAbi,
  functionName: 'tokenURI',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"totalCashOutWeight"`
 */
export const readJb721TiersHookTotalCashOutWeight =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'totalCashOutWeight',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"trustedForwarder"`
 */
export const readJb721TiersHookTrustedForwarder =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'trustedForwarder',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookAbi}__
 */
export const writeJb721TiersHook = /*#__PURE__*/ createWriteContract({
  abi: jb721TiersHookAbi,
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"adjustTiers"`
 */
export const writeJb721TiersHookAdjustTiers = /*#__PURE__*/ createWriteContract(
  { abi: jb721TiersHookAbi, functionName: 'adjustTiers' },
)

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"afterCashOutRecordedWith"`
 */
export const writeJb721TiersHookAfterCashOutRecordedWith =
  /*#__PURE__*/ createWriteContract({
    abi: jb721TiersHookAbi,
    functionName: 'afterCashOutRecordedWith',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"afterPayRecordedWith"`
 */
export const writeJb721TiersHookAfterPayRecordedWith =
  /*#__PURE__*/ createWriteContract({
    abi: jb721TiersHookAbi,
    functionName: 'afterPayRecordedWith',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"approve"`
 */
export const writeJb721TiersHookApprove = /*#__PURE__*/ createWriteContract({
  abi: jb721TiersHookAbi,
  functionName: 'approve',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"initialize"`
 */
export const writeJb721TiersHookInitialize = /*#__PURE__*/ createWriteContract({
  abi: jb721TiersHookAbi,
  functionName: 'initialize',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"mintFor"`
 */
export const writeJb721TiersHookMintFor = /*#__PURE__*/ createWriteContract({
  abi: jb721TiersHookAbi,
  functionName: 'mintFor',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"mintPendingReservesFor"`
 */
export const writeJb721TiersHookMintPendingReservesFor =
  /*#__PURE__*/ createWriteContract({
    abi: jb721TiersHookAbi,
    functionName: 'mintPendingReservesFor',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"renounceOwnership"`
 */
export const writeJb721TiersHookRenounceOwnership =
  /*#__PURE__*/ createWriteContract({
    abi: jb721TiersHookAbi,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"safeTransferFrom"`
 */
export const writeJb721TiersHookSafeTransferFrom =
  /*#__PURE__*/ createWriteContract({
    abi: jb721TiersHookAbi,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"setApprovalForAll"`
 */
export const writeJb721TiersHookSetApprovalForAll =
  /*#__PURE__*/ createWriteContract({
    abi: jb721TiersHookAbi,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"setDiscountPercentOf"`
 */
export const writeJb721TiersHookSetDiscountPercentOf =
  /*#__PURE__*/ createWriteContract({
    abi: jb721TiersHookAbi,
    functionName: 'setDiscountPercentOf',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"setDiscountPercentsOf"`
 */
export const writeJb721TiersHookSetDiscountPercentsOf =
  /*#__PURE__*/ createWriteContract({
    abi: jb721TiersHookAbi,
    functionName: 'setDiscountPercentsOf',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"setMetadata"`
 */
export const writeJb721TiersHookSetMetadata = /*#__PURE__*/ createWriteContract(
  { abi: jb721TiersHookAbi, functionName: 'setMetadata' },
)

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"setPermissionId"`
 */
export const writeJb721TiersHookSetPermissionId =
  /*#__PURE__*/ createWriteContract({
    abi: jb721TiersHookAbi,
    functionName: 'setPermissionId',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"transferFrom"`
 */
export const writeJb721TiersHookTransferFrom =
  /*#__PURE__*/ createWriteContract({
    abi: jb721TiersHookAbi,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"transferOwnership"`
 */
export const writeJb721TiersHookTransferOwnership =
  /*#__PURE__*/ createWriteContract({
    abi: jb721TiersHookAbi,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"transferOwnershipToProject"`
 */
export const writeJb721TiersHookTransferOwnershipToProject =
  /*#__PURE__*/ createWriteContract({
    abi: jb721TiersHookAbi,
    functionName: 'transferOwnershipToProject',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__
 */
export const simulateJb721TiersHook = /*#__PURE__*/ createSimulateContract({
  abi: jb721TiersHookAbi,
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"adjustTiers"`
 */
export const simulateJb721TiersHookAdjustTiers =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'adjustTiers',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"afterCashOutRecordedWith"`
 */
export const simulateJb721TiersHookAfterCashOutRecordedWith =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'afterCashOutRecordedWith',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"afterPayRecordedWith"`
 */
export const simulateJb721TiersHookAfterPayRecordedWith =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'afterPayRecordedWith',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"approve"`
 */
export const simulateJb721TiersHookApprove =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'approve',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"initialize"`
 */
export const simulateJb721TiersHookInitialize =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'initialize',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"mintFor"`
 */
export const simulateJb721TiersHookMintFor =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'mintFor',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"mintPendingReservesFor"`
 */
export const simulateJb721TiersHookMintPendingReservesFor =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'mintPendingReservesFor',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"renounceOwnership"`
 */
export const simulateJb721TiersHookRenounceOwnership =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"safeTransferFrom"`
 */
export const simulateJb721TiersHookSafeTransferFrom =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"setApprovalForAll"`
 */
export const simulateJb721TiersHookSetApprovalForAll =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"setDiscountPercentOf"`
 */
export const simulateJb721TiersHookSetDiscountPercentOf =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'setDiscountPercentOf',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"setDiscountPercentsOf"`
 */
export const simulateJb721TiersHookSetDiscountPercentsOf =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'setDiscountPercentsOf',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"setMetadata"`
 */
export const simulateJb721TiersHookSetMetadata =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'setMetadata',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"setPermissionId"`
 */
export const simulateJb721TiersHookSetPermissionId =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'setPermissionId',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"transferFrom"`
 */
export const simulateJb721TiersHookTransferFrom =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"transferOwnership"`
 */
export const simulateJb721TiersHookTransferOwnership =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"transferOwnershipToProject"`
 */
export const simulateJb721TiersHookTransferOwnershipToProject =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'transferOwnershipToProject',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__
 */
export const watchJb721TiersHookEvent = /*#__PURE__*/ createWatchContractEvent({
  abi: jb721TiersHookAbi,
})

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"AddPayCredits"`
 */
export const watchJb721TiersHookAddPayCreditsEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'AddPayCredits',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"AddTier"`
 */
export const watchJb721TiersHookAddTierEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'AddTier',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"Approval"`
 */
export const watchJb721TiersHookApprovalEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'Approval',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"ApprovalForAll"`
 */
export const watchJb721TiersHookApprovalForAllEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'ApprovalForAll',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"Mint"`
 */
export const watchJb721TiersHookMintEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'Mint',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"MintReservedNft"`
 */
export const watchJb721TiersHookMintReservedNftEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'MintReservedNft',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"OwnershipTransferred"`
 */
export const watchJb721TiersHookOwnershipTransferredEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"PermissionIdChanged"`
 */
export const watchJb721TiersHookPermissionIdChangedEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'PermissionIdChanged',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"RemoveTier"`
 */
export const watchJb721TiersHookRemoveTierEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'RemoveTier',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"SetBaseUri"`
 */
export const watchJb721TiersHookSetBaseUriEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'SetBaseUri',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"SetContractUri"`
 */
export const watchJb721TiersHookSetContractUriEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'SetContractUri',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"SetDiscountPercent"`
 */
export const watchJb721TiersHookSetDiscountPercentEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'SetDiscountPercent',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"SetEncodedIPFSUri"`
 */
export const watchJb721TiersHookSetEncodedIpfsUriEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'SetEncodedIPFSUri',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"SetTokenUriResolver"`
 */
export const watchJb721TiersHookSetTokenUriResolverEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'SetTokenUriResolver',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"Transfer"`
 */
export const watchJb721TiersHookTransferEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'Transfer',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"UsePayCredits"`
 */
export const watchJb721TiersHookUsePayCreditsEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'UsePayCredits',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookDeployerAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 */
export const readJb721TiersHookDeployer = /*#__PURE__*/ createReadContract({
  abi: jb721TiersHookDeployerAbi,
  address: jb721TiersHookDeployerAddress,
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookDeployerAbi}__ and `functionName` set to `"ADDRESS_REGISTRY"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 */
export const readJb721TiersHookDeployerAddressRegistry =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookDeployerAbi,
    address: jb721TiersHookDeployerAddress,
    functionName: 'ADDRESS_REGISTRY',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookDeployerAbi}__ and `functionName` set to `"HOOK"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 */
export const readJb721TiersHookDeployerHook = /*#__PURE__*/ createReadContract({
  abi: jb721TiersHookDeployerAbi,
  address: jb721TiersHookDeployerAddress,
  functionName: 'HOOK',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookDeployerAbi}__ and `functionName` set to `"STORE"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 */
export const readJb721TiersHookDeployerStore = /*#__PURE__*/ createReadContract(
  {
    abi: jb721TiersHookDeployerAbi,
    address: jb721TiersHookDeployerAddress,
    functionName: 'STORE',
  },
)

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookDeployerAbi}__ and `functionName` set to `"isTrustedForwarder"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 */
export const readJb721TiersHookDeployerIsTrustedForwarder =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookDeployerAbi,
    address: jb721TiersHookDeployerAddress,
    functionName: 'isTrustedForwarder',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookDeployerAbi}__ and `functionName` set to `"trustedForwarder"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 */
export const readJb721TiersHookDeployerTrustedForwarder =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookDeployerAbi,
    address: jb721TiersHookDeployerAddress,
    functionName: 'trustedForwarder',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookDeployerAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 */
export const writeJb721TiersHookDeployer = /*#__PURE__*/ createWriteContract({
  abi: jb721TiersHookDeployerAbi,
  address: jb721TiersHookDeployerAddress,
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookDeployerAbi}__ and `functionName` set to `"deployHookFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 */
export const writeJb721TiersHookDeployerDeployHookFor =
  /*#__PURE__*/ createWriteContract({
    abi: jb721TiersHookDeployerAbi,
    address: jb721TiersHookDeployerAddress,
    functionName: 'deployHookFor',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookDeployerAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 */
export const simulateJb721TiersHookDeployer =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookDeployerAbi,
    address: jb721TiersHookDeployerAddress,
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookDeployerAbi}__ and `functionName` set to `"deployHookFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 */
export const simulateJb721TiersHookDeployerDeployHookFor =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookDeployerAbi,
    address: jb721TiersHookDeployerAddress,
    functionName: 'deployHookFor',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jb721TiersHookDeployerAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 */
export const watchJb721TiersHookDeployerEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jb721TiersHookDeployerAbi,
    address: jb721TiersHookDeployerAddress,
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jb721TiersHookDeployerAbi}__ and `eventName` set to `"HookDeployed"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9549a7b078a31f3ed8b418797c330cf9015dbe18)
 */
export const watchJb721TiersHookDeployerHookDeployedEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jb721TiersHookDeployerAbi,
    address: jb721TiersHookDeployerAddress,
    eventName: 'HookDeployed',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookProjectDeployerAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 */
export const readJb721TiersHookProjectDeployer =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookProjectDeployerAbi,
    address: jb721TiersHookProjectDeployerAddress,
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookProjectDeployerAbi}__ and `functionName` set to `"DIRECTORY"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 */
export const readJb721TiersHookProjectDeployerDirectory =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookProjectDeployerAbi,
    address: jb721TiersHookProjectDeployerAddress,
    functionName: 'DIRECTORY',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookProjectDeployerAbi}__ and `functionName` set to `"HOOK_DEPLOYER"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 */
export const readJb721TiersHookProjectDeployerHookDeployer =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookProjectDeployerAbi,
    address: jb721TiersHookProjectDeployerAddress,
    functionName: 'HOOK_DEPLOYER',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookProjectDeployerAbi}__ and `functionName` set to `"PERMISSIONS"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 */
export const readJb721TiersHookProjectDeployerPermissions =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookProjectDeployerAbi,
    address: jb721TiersHookProjectDeployerAddress,
    functionName: 'PERMISSIONS',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookProjectDeployerAbi}__ and `functionName` set to `"isTrustedForwarder"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 */
export const readJb721TiersHookProjectDeployerIsTrustedForwarder =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookProjectDeployerAbi,
    address: jb721TiersHookProjectDeployerAddress,
    functionName: 'isTrustedForwarder',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookProjectDeployerAbi}__ and `functionName` set to `"trustedForwarder"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 */
export const readJb721TiersHookProjectDeployerTrustedForwarder =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookProjectDeployerAbi,
    address: jb721TiersHookProjectDeployerAddress,
    functionName: 'trustedForwarder',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookProjectDeployerAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 */
export const writeJb721TiersHookProjectDeployer =
  /*#__PURE__*/ createWriteContract({
    abi: jb721TiersHookProjectDeployerAbi,
    address: jb721TiersHookProjectDeployerAddress,
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookProjectDeployerAbi}__ and `functionName` set to `"launchProjectFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 */
export const writeJb721TiersHookProjectDeployerLaunchProjectFor =
  /*#__PURE__*/ createWriteContract({
    abi: jb721TiersHookProjectDeployerAbi,
    address: jb721TiersHookProjectDeployerAddress,
    functionName: 'launchProjectFor',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookProjectDeployerAbi}__ and `functionName` set to `"launchRulesetsFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 */
export const writeJb721TiersHookProjectDeployerLaunchRulesetsFor =
  /*#__PURE__*/ createWriteContract({
    abi: jb721TiersHookProjectDeployerAbi,
    address: jb721TiersHookProjectDeployerAddress,
    functionName: 'launchRulesetsFor',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookProjectDeployerAbi}__ and `functionName` set to `"queueRulesetsOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 */
export const writeJb721TiersHookProjectDeployerQueueRulesetsOf =
  /*#__PURE__*/ createWriteContract({
    abi: jb721TiersHookProjectDeployerAbi,
    address: jb721TiersHookProjectDeployerAddress,
    functionName: 'queueRulesetsOf',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookProjectDeployerAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 */
export const simulateJb721TiersHookProjectDeployer =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookProjectDeployerAbi,
    address: jb721TiersHookProjectDeployerAddress,
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookProjectDeployerAbi}__ and `functionName` set to `"launchProjectFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 */
export const simulateJb721TiersHookProjectDeployerLaunchProjectFor =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookProjectDeployerAbi,
    address: jb721TiersHookProjectDeployerAddress,
    functionName: 'launchProjectFor',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookProjectDeployerAbi}__ and `functionName` set to `"launchRulesetsFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 */
export const simulateJb721TiersHookProjectDeployerLaunchRulesetsFor =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookProjectDeployerAbi,
    address: jb721TiersHookProjectDeployerAddress,
    functionName: 'launchRulesetsFor',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookProjectDeployerAbi}__ and `functionName` set to `"queueRulesetsOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x36ce554d42f58775cc7294ba842c880dfcf5acd2)
 */
export const simulateJb721TiersHookProjectDeployerQueueRulesetsOf =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookProjectDeployerAbi,
    address: jb721TiersHookProjectDeployerAddress,
    functionName: 'queueRulesetsOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__
 */
export const readJb721TiersHookStore = /*#__PURE__*/ createReadContract({
  abi: jb721TiersHookStoreAbi,
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"balanceOf"`
 */
export const readJb721TiersHookStoreBalanceOf =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'balanceOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"cashOutWeightOf"`
 */
export const readJb721TiersHookStoreCashOutWeightOf =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'cashOutWeightOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"defaultReserveBeneficiaryOf"`
 */
export const readJb721TiersHookStoreDefaultReserveBeneficiaryOf =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'defaultReserveBeneficiaryOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"encodedIPFSUriOf"`
 */
export const readJb721TiersHookStoreEncodedIpfsUriOf =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'encodedIPFSUriOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"encodedTierIPFSUriOf"`
 */
export const readJb721TiersHookStoreEncodedTierIpfsUriOf =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'encodedTierIPFSUriOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"flagsOf"`
 */
export const readJb721TiersHookStoreFlagsOf = /*#__PURE__*/ createReadContract({
  abi: jb721TiersHookStoreAbi,
  functionName: 'flagsOf',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"isTierRemoved"`
 */
export const readJb721TiersHookStoreIsTierRemoved =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'isTierRemoved',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"maxTierIdOf"`
 */
export const readJb721TiersHookStoreMaxTierIdOf =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'maxTierIdOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"numberOfBurnedFor"`
 */
export const readJb721TiersHookStoreNumberOfBurnedFor =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'numberOfBurnedFor',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"numberOfPendingReservesFor"`
 */
export const readJb721TiersHookStoreNumberOfPendingReservesFor =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'numberOfPendingReservesFor',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"numberOfReservesMintedFor"`
 */
export const readJb721TiersHookStoreNumberOfReservesMintedFor =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'numberOfReservesMintedFor',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"reserveBeneficiaryOf"`
 */
export const readJb721TiersHookStoreReserveBeneficiaryOf =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'reserveBeneficiaryOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"tierBalanceOf"`
 */
export const readJb721TiersHookStoreTierBalanceOf =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'tierBalanceOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"tierIdOfToken"`
 */
export const readJb721TiersHookStoreTierIdOfToken =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'tierIdOfToken',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"tierOf"`
 */
export const readJb721TiersHookStoreTierOf = /*#__PURE__*/ createReadContract({
  abi: jb721TiersHookStoreAbi,
  functionName: 'tierOf',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"tierOfTokenId"`
 */
export const readJb721TiersHookStoreTierOfTokenId =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'tierOfTokenId',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"tierVotingUnitsOf"`
 */
export const readJb721TiersHookStoreTierVotingUnitsOf =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'tierVotingUnitsOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"tiersOf"`
 */
export const readJb721TiersHookStoreTiersOf = /*#__PURE__*/ createReadContract({
  abi: jb721TiersHookStoreAbi,
  functionName: 'tiersOf',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"tokenUriResolverOf"`
 */
export const readJb721TiersHookStoreTokenUriResolverOf =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'tokenUriResolverOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"totalCashOutWeight"`
 */
export const readJb721TiersHookStoreTotalCashOutWeight =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'totalCashOutWeight',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"totalSupplyOf"`
 */
export const readJb721TiersHookStoreTotalSupplyOf =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'totalSupplyOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"votingUnitsOf"`
 */
export const readJb721TiersHookStoreVotingUnitsOf =
  /*#__PURE__*/ createReadContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'votingUnitsOf',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__
 */
export const writeJb721TiersHookStore = /*#__PURE__*/ createWriteContract({
  abi: jb721TiersHookStoreAbi,
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"cleanTiers"`
 */
export const writeJb721TiersHookStoreCleanTiers =
  /*#__PURE__*/ createWriteContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'cleanTiers',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"recordAddTiers"`
 */
export const writeJb721TiersHookStoreRecordAddTiers =
  /*#__PURE__*/ createWriteContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'recordAddTiers',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"recordBurn"`
 */
export const writeJb721TiersHookStoreRecordBurn =
  /*#__PURE__*/ createWriteContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'recordBurn',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"recordFlags"`
 */
export const writeJb721TiersHookStoreRecordFlags =
  /*#__PURE__*/ createWriteContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'recordFlags',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"recordMint"`
 */
export const writeJb721TiersHookStoreRecordMint =
  /*#__PURE__*/ createWriteContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'recordMint',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"recordMintReservesFor"`
 */
export const writeJb721TiersHookStoreRecordMintReservesFor =
  /*#__PURE__*/ createWriteContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'recordMintReservesFor',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"recordRemoveTierIds"`
 */
export const writeJb721TiersHookStoreRecordRemoveTierIds =
  /*#__PURE__*/ createWriteContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'recordRemoveTierIds',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"recordSetDiscountPercentOf"`
 */
export const writeJb721TiersHookStoreRecordSetDiscountPercentOf =
  /*#__PURE__*/ createWriteContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'recordSetDiscountPercentOf',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"recordSetEncodedIPFSUriOf"`
 */
export const writeJb721TiersHookStoreRecordSetEncodedIpfsUriOf =
  /*#__PURE__*/ createWriteContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'recordSetEncodedIPFSUriOf',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"recordSetTokenUriResolver"`
 */
export const writeJb721TiersHookStoreRecordSetTokenUriResolver =
  /*#__PURE__*/ createWriteContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'recordSetTokenUriResolver',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"recordTransferForTier"`
 */
export const writeJb721TiersHookStoreRecordTransferForTier =
  /*#__PURE__*/ createWriteContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'recordTransferForTier',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__
 */
export const simulateJb721TiersHookStore = /*#__PURE__*/ createSimulateContract(
  { abi: jb721TiersHookStoreAbi },
)

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"cleanTiers"`
 */
export const simulateJb721TiersHookStoreCleanTiers =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'cleanTiers',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"recordAddTiers"`
 */
export const simulateJb721TiersHookStoreRecordAddTiers =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'recordAddTiers',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"recordBurn"`
 */
export const simulateJb721TiersHookStoreRecordBurn =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'recordBurn',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"recordFlags"`
 */
export const simulateJb721TiersHookStoreRecordFlags =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'recordFlags',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"recordMint"`
 */
export const simulateJb721TiersHookStoreRecordMint =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'recordMint',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"recordMintReservesFor"`
 */
export const simulateJb721TiersHookStoreRecordMintReservesFor =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'recordMintReservesFor',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"recordRemoveTierIds"`
 */
export const simulateJb721TiersHookStoreRecordRemoveTierIds =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'recordRemoveTierIds',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"recordSetDiscountPercentOf"`
 */
export const simulateJb721TiersHookStoreRecordSetDiscountPercentOf =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'recordSetDiscountPercentOf',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"recordSetEncodedIPFSUriOf"`
 */
export const simulateJb721TiersHookStoreRecordSetEncodedIpfsUriOf =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'recordSetEncodedIPFSUriOf',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"recordSetTokenUriResolver"`
 */
export const simulateJb721TiersHookStoreRecordSetTokenUriResolver =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'recordSetTokenUriResolver',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `functionName` set to `"recordTransferForTier"`
 */
export const simulateJb721TiersHookStoreRecordTransferForTier =
  /*#__PURE__*/ createSimulateContract({
    abi: jb721TiersHookStoreAbi,
    functionName: 'recordTransferForTier',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__
 */
export const watchJb721TiersHookStoreEvent =
  /*#__PURE__*/ createWatchContractEvent({ abi: jb721TiersHookStoreAbi })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jb721TiersHookStoreAbi}__ and `eventName` set to `"CleanTiers"`
 */
export const watchJb721TiersHookStoreCleanTiersEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jb721TiersHookStoreAbi,
    eventName: 'CleanTiers',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbAddressRegistryAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 */
export const readJbAddressRegistry = /*#__PURE__*/ createReadContract({
  abi: jbAddressRegistryAbi,
  address: jbAddressRegistryAddress,
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbAddressRegistryAbi}__ and `functionName` set to `"deployerOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 */
export const readJbAddressRegistryDeployerOf = /*#__PURE__*/ createReadContract(
  {
    abi: jbAddressRegistryAbi,
    address: jbAddressRegistryAddress,
    functionName: 'deployerOf',
  },
)

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbAddressRegistryAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 */
export const writeJbAddressRegistry = /*#__PURE__*/ createWriteContract({
  abi: jbAddressRegistryAbi,
  address: jbAddressRegistryAddress,
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbAddressRegistryAbi}__ and `functionName` set to `"registerAddress"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 */
export const writeJbAddressRegistryRegisterAddress =
  /*#__PURE__*/ createWriteContract({
    abi: jbAddressRegistryAbi,
    address: jbAddressRegistryAddress,
    functionName: 'registerAddress',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbAddressRegistryAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 */
export const simulateJbAddressRegistry = /*#__PURE__*/ createSimulateContract({
  abi: jbAddressRegistryAbi,
  address: jbAddressRegistryAddress,
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbAddressRegistryAbi}__ and `functionName` set to `"registerAddress"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 */
export const simulateJbAddressRegistryRegisterAddress =
  /*#__PURE__*/ createSimulateContract({
    abi: jbAddressRegistryAbi,
    address: jbAddressRegistryAddress,
    functionName: 'registerAddress',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbAddressRegistryAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 */
export const watchJbAddressRegistryEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbAddressRegistryAbi,
    address: jbAddressRegistryAddress,
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbAddressRegistryAbi}__ and `eventName` set to `"AddressRegistered"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x529FDff2bC7fbdaeA7b86901FDa9e6905b61E54C)
 */
export const watchJbAddressRegistryAddressRegisteredEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbAddressRegistryAbi,
    address: jbAddressRegistryAddress,
    eventName: 'AddressRegistered',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbBuybackHookAbi}__
 */
export const readJbBuybackHook = /*#__PURE__*/ createReadContract({
  abi: jbBuybackHookAbi,
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `functionName` set to `"CONTROLLER"`
 */
export const readJbBuybackHookController = /*#__PURE__*/ createReadContract({
  abi: jbBuybackHookAbi,
  functionName: 'CONTROLLER',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `functionName` set to `"DIRECTORY"`
 */
export const readJbBuybackHookDirectory = /*#__PURE__*/ createReadContract({
  abi: jbBuybackHookAbi,
  functionName: 'DIRECTORY',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `functionName` set to `"MAX_TWAP_SLIPPAGE_TOLERANCE"`
 */
export const readJbBuybackHookMaxTwapSlippageTolerance =
  /*#__PURE__*/ createReadContract({
    abi: jbBuybackHookAbi,
    functionName: 'MAX_TWAP_SLIPPAGE_TOLERANCE',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `functionName` set to `"MAX_TWAP_WINDOW"`
 */
export const readJbBuybackHookMaxTwapWindow = /*#__PURE__*/ createReadContract({
  abi: jbBuybackHookAbi,
  functionName: 'MAX_TWAP_WINDOW',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `functionName` set to `"MIN_TWAP_SLIPPAGE_TOLERANCE"`
 */
export const readJbBuybackHookMinTwapSlippageTolerance =
  /*#__PURE__*/ createReadContract({
    abi: jbBuybackHookAbi,
    functionName: 'MIN_TWAP_SLIPPAGE_TOLERANCE',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `functionName` set to `"MIN_TWAP_WINDOW"`
 */
export const readJbBuybackHookMinTwapWindow = /*#__PURE__*/ createReadContract({
  abi: jbBuybackHookAbi,
  functionName: 'MIN_TWAP_WINDOW',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `functionName` set to `"PERMISSIONS"`
 */
export const readJbBuybackHookPermissions = /*#__PURE__*/ createReadContract({
  abi: jbBuybackHookAbi,
  functionName: 'PERMISSIONS',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `functionName` set to `"PRICES"`
 */
export const readJbBuybackHookPrices = /*#__PURE__*/ createReadContract({
  abi: jbBuybackHookAbi,
  functionName: 'PRICES',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `functionName` set to `"PROJECTS"`
 */
export const readJbBuybackHookProjects = /*#__PURE__*/ createReadContract({
  abi: jbBuybackHookAbi,
  functionName: 'PROJECTS',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `functionName` set to `"TWAP_SLIPPAGE_DENOMINATOR"`
 */
export const readJbBuybackHookTwapSlippageDenominator =
  /*#__PURE__*/ createReadContract({
    abi: jbBuybackHookAbi,
    functionName: 'TWAP_SLIPPAGE_DENOMINATOR',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `functionName` set to `"UNISWAP_V3_FACTORY"`
 */
export const readJbBuybackHookUniswapV3Factory =
  /*#__PURE__*/ createReadContract({
    abi: jbBuybackHookAbi,
    functionName: 'UNISWAP_V3_FACTORY',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `functionName` set to `"WETH"`
 */
export const readJbBuybackHookWeth = /*#__PURE__*/ createReadContract({
  abi: jbBuybackHookAbi,
  functionName: 'WETH',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `functionName` set to `"beforeCashOutRecordedWith"`
 */
export const readJbBuybackHookBeforeCashOutRecordedWith =
  /*#__PURE__*/ createReadContract({
    abi: jbBuybackHookAbi,
    functionName: 'beforeCashOutRecordedWith',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `functionName` set to `"beforePayRecordedWith"`
 */
export const readJbBuybackHookBeforePayRecordedWith =
  /*#__PURE__*/ createReadContract({
    abi: jbBuybackHookAbi,
    functionName: 'beforePayRecordedWith',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `functionName` set to `"hasMintPermissionFor"`
 */
export const readJbBuybackHookHasMintPermissionFor =
  /*#__PURE__*/ createReadContract({
    abi: jbBuybackHookAbi,
    functionName: 'hasMintPermissionFor',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `functionName` set to `"poolOf"`
 */
export const readJbBuybackHookPoolOf = /*#__PURE__*/ createReadContract({
  abi: jbBuybackHookAbi,
  functionName: 'poolOf',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `functionName` set to `"projectTokenOf"`
 */
export const readJbBuybackHookProjectTokenOf = /*#__PURE__*/ createReadContract(
  { abi: jbBuybackHookAbi, functionName: 'projectTokenOf' },
)

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `functionName` set to `"supportsInterface"`
 */
export const readJbBuybackHookSupportsInterface =
  /*#__PURE__*/ createReadContract({
    abi: jbBuybackHookAbi,
    functionName: 'supportsInterface',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `functionName` set to `"twapSlippageToleranceOf"`
 */
export const readJbBuybackHookTwapSlippageToleranceOf =
  /*#__PURE__*/ createReadContract({
    abi: jbBuybackHookAbi,
    functionName: 'twapSlippageToleranceOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `functionName` set to `"twapWindowOf"`
 */
export const readJbBuybackHookTwapWindowOf = /*#__PURE__*/ createReadContract({
  abi: jbBuybackHookAbi,
  functionName: 'twapWindowOf',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbBuybackHookAbi}__
 */
export const writeJbBuybackHook = /*#__PURE__*/ createWriteContract({
  abi: jbBuybackHookAbi,
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `functionName` set to `"afterPayRecordedWith"`
 */
export const writeJbBuybackHookAfterPayRecordedWith =
  /*#__PURE__*/ createWriteContract({
    abi: jbBuybackHookAbi,
    functionName: 'afterPayRecordedWith',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `functionName` set to `"setPoolFor"`
 */
export const writeJbBuybackHookSetPoolFor = /*#__PURE__*/ createWriteContract({
  abi: jbBuybackHookAbi,
  functionName: 'setPoolFor',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `functionName` set to `"setTwapSlippageToleranceOf"`
 */
export const writeJbBuybackHookSetTwapSlippageToleranceOf =
  /*#__PURE__*/ createWriteContract({
    abi: jbBuybackHookAbi,
    functionName: 'setTwapSlippageToleranceOf',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `functionName` set to `"setTwapWindowOf"`
 */
export const writeJbBuybackHookSetTwapWindowOf =
  /*#__PURE__*/ createWriteContract({
    abi: jbBuybackHookAbi,
    functionName: 'setTwapWindowOf',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `functionName` set to `"uniswapV3SwapCallback"`
 */
export const writeJbBuybackHookUniswapV3SwapCallback =
  /*#__PURE__*/ createWriteContract({
    abi: jbBuybackHookAbi,
    functionName: 'uniswapV3SwapCallback',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbBuybackHookAbi}__
 */
export const simulateJbBuybackHook = /*#__PURE__*/ createSimulateContract({
  abi: jbBuybackHookAbi,
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `functionName` set to `"afterPayRecordedWith"`
 */
export const simulateJbBuybackHookAfterPayRecordedWith =
  /*#__PURE__*/ createSimulateContract({
    abi: jbBuybackHookAbi,
    functionName: 'afterPayRecordedWith',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `functionName` set to `"setPoolFor"`
 */
export const simulateJbBuybackHookSetPoolFor =
  /*#__PURE__*/ createSimulateContract({
    abi: jbBuybackHookAbi,
    functionName: 'setPoolFor',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `functionName` set to `"setTwapSlippageToleranceOf"`
 */
export const simulateJbBuybackHookSetTwapSlippageToleranceOf =
  /*#__PURE__*/ createSimulateContract({
    abi: jbBuybackHookAbi,
    functionName: 'setTwapSlippageToleranceOf',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `functionName` set to `"setTwapWindowOf"`
 */
export const simulateJbBuybackHookSetTwapWindowOf =
  /*#__PURE__*/ createSimulateContract({
    abi: jbBuybackHookAbi,
    functionName: 'setTwapWindowOf',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `functionName` set to `"uniswapV3SwapCallback"`
 */
export const simulateJbBuybackHookUniswapV3SwapCallback =
  /*#__PURE__*/ createSimulateContract({
    abi: jbBuybackHookAbi,
    functionName: 'uniswapV3SwapCallback',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbBuybackHookAbi}__
 */
export const watchJbBuybackHookEvent = /*#__PURE__*/ createWatchContractEvent({
  abi: jbBuybackHookAbi,
})

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `eventName` set to `"Mint"`
 */
export const watchJbBuybackHookMintEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbBuybackHookAbi,
    eventName: 'Mint',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `eventName` set to `"PoolAdded"`
 */
export const watchJbBuybackHookPoolAddedEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbBuybackHookAbi,
    eventName: 'PoolAdded',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `eventName` set to `"Swap"`
 */
export const watchJbBuybackHookSwapEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbBuybackHookAbi,
    eventName: 'Swap',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `eventName` set to `"TwapSlippageToleranceChanged"`
 */
export const watchJbBuybackHookTwapSlippageToleranceChangedEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbBuybackHookAbi,
    eventName: 'TwapSlippageToleranceChanged',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbBuybackHookAbi}__ and `eventName` set to `"TwapWindowChanged"`
 */
export const watchJbBuybackHookTwapWindowChangedEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbBuybackHookAbi,
    eventName: 'TwapWindowChanged',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbControllerAbi}__
 */
export const readJbController = /*#__PURE__*/ createReadContract({
  abi: jbControllerAbi,
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"DIRECTORY"`
 */
export const readJbControllerDirectory = /*#__PURE__*/ createReadContract({
  abi: jbControllerAbi,
  functionName: 'DIRECTORY',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"FUND_ACCESS_LIMITS"`
 */
export const readJbControllerFundAccessLimits =
  /*#__PURE__*/ createReadContract({
    abi: jbControllerAbi,
    functionName: 'FUND_ACCESS_LIMITS',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"PERMISSIONS"`
 */
export const readJbControllerPermissions = /*#__PURE__*/ createReadContract({
  abi: jbControllerAbi,
  functionName: 'PERMISSIONS',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"PRICES"`
 */
export const readJbControllerPrices = /*#__PURE__*/ createReadContract({
  abi: jbControllerAbi,
  functionName: 'PRICES',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"PROJECTS"`
 */
export const readJbControllerProjects = /*#__PURE__*/ createReadContract({
  abi: jbControllerAbi,
  functionName: 'PROJECTS',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"RULESETS"`
 */
export const readJbControllerRulesets = /*#__PURE__*/ createReadContract({
  abi: jbControllerAbi,
  functionName: 'RULESETS',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"SPLITS"`
 */
export const readJbControllerSplits = /*#__PURE__*/ createReadContract({
  abi: jbControllerAbi,
  functionName: 'SPLITS',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"TOKENS"`
 */
export const readJbControllerTokens = /*#__PURE__*/ createReadContract({
  abi: jbControllerAbi,
  functionName: 'TOKENS',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"allRulesetsOf"`
 */
export const readJbControllerAllRulesetsOf = /*#__PURE__*/ createReadContract({
  abi: jbControllerAbi,
  functionName: 'allRulesetsOf',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"currentRulesetOf"`
 */
export const readJbControllerCurrentRulesetOf =
  /*#__PURE__*/ createReadContract({
    abi: jbControllerAbi,
    functionName: 'currentRulesetOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"getRulesetOf"`
 */
export const readJbControllerGetRulesetOf = /*#__PURE__*/ createReadContract({
  abi: jbControllerAbi,
  functionName: 'getRulesetOf',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"isTrustedForwarder"`
 */
export const readJbControllerIsTrustedForwarder =
  /*#__PURE__*/ createReadContract({
    abi: jbControllerAbi,
    functionName: 'isTrustedForwarder',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"latestQueuedRulesetOf"`
 */
export const readJbControllerLatestQueuedRulesetOf =
  /*#__PURE__*/ createReadContract({
    abi: jbControllerAbi,
    functionName: 'latestQueuedRulesetOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"pendingReservedTokenBalanceOf"`
 */
export const readJbControllerPendingReservedTokenBalanceOf =
  /*#__PURE__*/ createReadContract({
    abi: jbControllerAbi,
    functionName: 'pendingReservedTokenBalanceOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"setControllerAllowed"`
 */
export const readJbControllerSetControllerAllowed =
  /*#__PURE__*/ createReadContract({
    abi: jbControllerAbi,
    functionName: 'setControllerAllowed',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"setTerminalsAllowed"`
 */
export const readJbControllerSetTerminalsAllowed =
  /*#__PURE__*/ createReadContract({
    abi: jbControllerAbi,
    functionName: 'setTerminalsAllowed',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"supportsInterface"`
 */
export const readJbControllerSupportsInterface =
  /*#__PURE__*/ createReadContract({
    abi: jbControllerAbi,
    functionName: 'supportsInterface',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"totalTokenSupplyWithReservedTokensOf"`
 */
export const readJbControllerTotalTokenSupplyWithReservedTokensOf =
  /*#__PURE__*/ createReadContract({
    abi: jbControllerAbi,
    functionName: 'totalTokenSupplyWithReservedTokensOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"trustedForwarder"`
 */
export const readJbControllerTrustedForwarder =
  /*#__PURE__*/ createReadContract({
    abi: jbControllerAbi,
    functionName: 'trustedForwarder',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"upcomingRulesetOf"`
 */
export const readJbControllerUpcomingRulesetOf =
  /*#__PURE__*/ createReadContract({
    abi: jbControllerAbi,
    functionName: 'upcomingRulesetOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"uriOf"`
 */
export const readJbControllerUriOf = /*#__PURE__*/ createReadContract({
  abi: jbControllerAbi,
  functionName: 'uriOf',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbControllerAbi}__
 */
export const writeJbController = /*#__PURE__*/ createWriteContract({
  abi: jbControllerAbi,
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"addPriceFeed"`
 */
export const writeJbControllerAddPriceFeed = /*#__PURE__*/ createWriteContract({
  abi: jbControllerAbi,
  functionName: 'addPriceFeed',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"beforeReceiveMigrationFrom"`
 */
export const writeJbControllerBeforeReceiveMigrationFrom =
  /*#__PURE__*/ createWriteContract({
    abi: jbControllerAbi,
    functionName: 'beforeReceiveMigrationFrom',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"burnTokensOf"`
 */
export const writeJbControllerBurnTokensOf = /*#__PURE__*/ createWriteContract({
  abi: jbControllerAbi,
  functionName: 'burnTokensOf',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"claimTokensFor"`
 */
export const writeJbControllerClaimTokensFor =
  /*#__PURE__*/ createWriteContract({
    abi: jbControllerAbi,
    functionName: 'claimTokensFor',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"deployERC20For"`
 */
export const writeJbControllerDeployErc20For =
  /*#__PURE__*/ createWriteContract({
    abi: jbControllerAbi,
    functionName: 'deployERC20For',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"executePayReservedTokenToTerminal"`
 */
export const writeJbControllerExecutePayReservedTokenToTerminal =
  /*#__PURE__*/ createWriteContract({
    abi: jbControllerAbi,
    functionName: 'executePayReservedTokenToTerminal',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"launchProjectFor"`
 */
export const writeJbControllerLaunchProjectFor =
  /*#__PURE__*/ createWriteContract({
    abi: jbControllerAbi,
    functionName: 'launchProjectFor',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"launchRulesetsFor"`
 */
export const writeJbControllerLaunchRulesetsFor =
  /*#__PURE__*/ createWriteContract({
    abi: jbControllerAbi,
    functionName: 'launchRulesetsFor',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"migrate"`
 */
export const writeJbControllerMigrate = /*#__PURE__*/ createWriteContract({
  abi: jbControllerAbi,
  functionName: 'migrate',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"mintTokensOf"`
 */
export const writeJbControllerMintTokensOf = /*#__PURE__*/ createWriteContract({
  abi: jbControllerAbi,
  functionName: 'mintTokensOf',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"queueRulesetsOf"`
 */
export const writeJbControllerQueueRulesetsOf =
  /*#__PURE__*/ createWriteContract({
    abi: jbControllerAbi,
    functionName: 'queueRulesetsOf',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"sendReservedTokensToSplitsOf"`
 */
export const writeJbControllerSendReservedTokensToSplitsOf =
  /*#__PURE__*/ createWriteContract({
    abi: jbControllerAbi,
    functionName: 'sendReservedTokensToSplitsOf',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"setSplitGroupsOf"`
 */
export const writeJbControllerSetSplitGroupsOf =
  /*#__PURE__*/ createWriteContract({
    abi: jbControllerAbi,
    functionName: 'setSplitGroupsOf',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"setTokenFor"`
 */
export const writeJbControllerSetTokenFor = /*#__PURE__*/ createWriteContract({
  abi: jbControllerAbi,
  functionName: 'setTokenFor',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"setUriOf"`
 */
export const writeJbControllerSetUriOf = /*#__PURE__*/ createWriteContract({
  abi: jbControllerAbi,
  functionName: 'setUriOf',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"transferCreditsFrom"`
 */
export const writeJbControllerTransferCreditsFrom =
  /*#__PURE__*/ createWriteContract({
    abi: jbControllerAbi,
    functionName: 'transferCreditsFrom',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbControllerAbi}__
 */
export const simulateJbController = /*#__PURE__*/ createSimulateContract({
  abi: jbControllerAbi,
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"addPriceFeed"`
 */
export const simulateJbControllerAddPriceFeed =
  /*#__PURE__*/ createSimulateContract({
    abi: jbControllerAbi,
    functionName: 'addPriceFeed',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"beforeReceiveMigrationFrom"`
 */
export const simulateJbControllerBeforeReceiveMigrationFrom =
  /*#__PURE__*/ createSimulateContract({
    abi: jbControllerAbi,
    functionName: 'beforeReceiveMigrationFrom',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"burnTokensOf"`
 */
export const simulateJbControllerBurnTokensOf =
  /*#__PURE__*/ createSimulateContract({
    abi: jbControllerAbi,
    functionName: 'burnTokensOf',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"claimTokensFor"`
 */
export const simulateJbControllerClaimTokensFor =
  /*#__PURE__*/ createSimulateContract({
    abi: jbControllerAbi,
    functionName: 'claimTokensFor',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"deployERC20For"`
 */
export const simulateJbControllerDeployErc20For =
  /*#__PURE__*/ createSimulateContract({
    abi: jbControllerAbi,
    functionName: 'deployERC20For',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"executePayReservedTokenToTerminal"`
 */
export const simulateJbControllerExecutePayReservedTokenToTerminal =
  /*#__PURE__*/ createSimulateContract({
    abi: jbControllerAbi,
    functionName: 'executePayReservedTokenToTerminal',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"launchProjectFor"`
 */
export const simulateJbControllerLaunchProjectFor =
  /*#__PURE__*/ createSimulateContract({
    abi: jbControllerAbi,
    functionName: 'launchProjectFor',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"launchRulesetsFor"`
 */
export const simulateJbControllerLaunchRulesetsFor =
  /*#__PURE__*/ createSimulateContract({
    abi: jbControllerAbi,
    functionName: 'launchRulesetsFor',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"migrate"`
 */
export const simulateJbControllerMigrate = /*#__PURE__*/ createSimulateContract(
  { abi: jbControllerAbi, functionName: 'migrate' },
)

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"mintTokensOf"`
 */
export const simulateJbControllerMintTokensOf =
  /*#__PURE__*/ createSimulateContract({
    abi: jbControllerAbi,
    functionName: 'mintTokensOf',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"queueRulesetsOf"`
 */
export const simulateJbControllerQueueRulesetsOf =
  /*#__PURE__*/ createSimulateContract({
    abi: jbControllerAbi,
    functionName: 'queueRulesetsOf',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"sendReservedTokensToSplitsOf"`
 */
export const simulateJbControllerSendReservedTokensToSplitsOf =
  /*#__PURE__*/ createSimulateContract({
    abi: jbControllerAbi,
    functionName: 'sendReservedTokensToSplitsOf',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"setSplitGroupsOf"`
 */
export const simulateJbControllerSetSplitGroupsOf =
  /*#__PURE__*/ createSimulateContract({
    abi: jbControllerAbi,
    functionName: 'setSplitGroupsOf',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"setTokenFor"`
 */
export const simulateJbControllerSetTokenFor =
  /*#__PURE__*/ createSimulateContract({
    abi: jbControllerAbi,
    functionName: 'setTokenFor',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"setUriOf"`
 */
export const simulateJbControllerSetUriOf =
  /*#__PURE__*/ createSimulateContract({
    abi: jbControllerAbi,
    functionName: 'setUriOf',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"transferCreditsFrom"`
 */
export const simulateJbControllerTransferCreditsFrom =
  /*#__PURE__*/ createSimulateContract({
    abi: jbControllerAbi,
    functionName: 'transferCreditsFrom',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__
 */
export const watchJbControllerEvent = /*#__PURE__*/ createWatchContractEvent({
  abi: jbControllerAbi,
})

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"BurnTokens"`
 */
export const watchJbControllerBurnTokensEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbControllerAbi,
    eventName: 'BurnTokens',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"LaunchProject"`
 */
export const watchJbControllerLaunchProjectEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbControllerAbi,
    eventName: 'LaunchProject',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"LaunchRulesets"`
 */
export const watchJbControllerLaunchRulesetsEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbControllerAbi,
    eventName: 'LaunchRulesets',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"Migrate"`
 */
export const watchJbControllerMigrateEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbControllerAbi,
    eventName: 'Migrate',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"MintTokens"`
 */
export const watchJbControllerMintTokensEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbControllerAbi,
    eventName: 'MintTokens',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"PrepMigration"`
 */
export const watchJbControllerPrepMigrationEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbControllerAbi,
    eventName: 'PrepMigration',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"QueueRulesets"`
 */
export const watchJbControllerQueueRulesetsEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbControllerAbi,
    eventName: 'QueueRulesets',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"ReservedDistributionReverted"`
 */
export const watchJbControllerReservedDistributionRevertedEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbControllerAbi,
    eventName: 'ReservedDistributionReverted',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"SendReservedTokensToSplit"`
 */
export const watchJbControllerSendReservedTokensToSplitEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbControllerAbi,
    eventName: 'SendReservedTokensToSplit',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"SendReservedTokensToSplits"`
 */
export const watchJbControllerSendReservedTokensToSplitsEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbControllerAbi,
    eventName: 'SendReservedTokensToSplits',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"SetUri"`
 */
export const watchJbControllerSetUriEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbControllerAbi,
    eventName: 'SetUri',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbDirectoryAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const readJbDirectory = /*#__PURE__*/ createReadContract({
  abi: jbDirectoryAbi,
  address: jbDirectoryAddress,
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"PERMISSIONS"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const readJbDirectoryPermissions = /*#__PURE__*/ createReadContract({
  abi: jbDirectoryAbi,
  address: jbDirectoryAddress,
  functionName: 'PERMISSIONS',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"PROJECTS"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const readJbDirectoryProjects = /*#__PURE__*/ createReadContract({
  abi: jbDirectoryAbi,
  address: jbDirectoryAddress,
  functionName: 'PROJECTS',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"controllerOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const readJbDirectoryControllerOf = /*#__PURE__*/ createReadContract({
  abi: jbDirectoryAbi,
  address: jbDirectoryAddress,
  functionName: 'controllerOf',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"isAllowedToSetFirstController"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const readJbDirectoryIsAllowedToSetFirstController =
  /*#__PURE__*/ createReadContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'isAllowedToSetFirstController',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"isTerminalOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const readJbDirectoryIsTerminalOf = /*#__PURE__*/ createReadContract({
  abi: jbDirectoryAbi,
  address: jbDirectoryAddress,
  functionName: 'isTerminalOf',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"owner"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const readJbDirectoryOwner = /*#__PURE__*/ createReadContract({
  abi: jbDirectoryAbi,
  address: jbDirectoryAddress,
  functionName: 'owner',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"primaryTerminalOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const readJbDirectoryPrimaryTerminalOf =
  /*#__PURE__*/ createReadContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'primaryTerminalOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"terminalsOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const readJbDirectoryTerminalsOf = /*#__PURE__*/ createReadContract({
  abi: jbDirectoryAbi,
  address: jbDirectoryAddress,
  functionName: 'terminalsOf',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbDirectoryAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const writeJbDirectory = /*#__PURE__*/ createWriteContract({
  abi: jbDirectoryAbi,
  address: jbDirectoryAddress,
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const writeJbDirectoryRenounceOwnership =
  /*#__PURE__*/ createWriteContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"setControllerOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const writeJbDirectorySetControllerOf =
  /*#__PURE__*/ createWriteContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'setControllerOf',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"setIsAllowedToSetFirstController"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const writeJbDirectorySetIsAllowedToSetFirstController =
  /*#__PURE__*/ createWriteContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'setIsAllowedToSetFirstController',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"setPrimaryTerminalOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const writeJbDirectorySetPrimaryTerminalOf =
  /*#__PURE__*/ createWriteContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'setPrimaryTerminalOf',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"setTerminalsOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const writeJbDirectorySetTerminalsOf = /*#__PURE__*/ createWriteContract(
  {
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'setTerminalsOf',
  },
)

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const writeJbDirectoryTransferOwnership =
  /*#__PURE__*/ createWriteContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbDirectoryAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const simulateJbDirectory = /*#__PURE__*/ createSimulateContract({
  abi: jbDirectoryAbi,
  address: jbDirectoryAddress,
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const simulateJbDirectoryRenounceOwnership =
  /*#__PURE__*/ createSimulateContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"setControllerOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const simulateJbDirectorySetControllerOf =
  /*#__PURE__*/ createSimulateContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'setControllerOf',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"setIsAllowedToSetFirstController"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const simulateJbDirectorySetIsAllowedToSetFirstController =
  /*#__PURE__*/ createSimulateContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'setIsAllowedToSetFirstController',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"setPrimaryTerminalOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const simulateJbDirectorySetPrimaryTerminalOf =
  /*#__PURE__*/ createSimulateContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'setPrimaryTerminalOf',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"setTerminalsOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const simulateJbDirectorySetTerminalsOf =
  /*#__PURE__*/ createSimulateContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'setTerminalsOf',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const simulateJbDirectoryTransferOwnership =
  /*#__PURE__*/ createSimulateContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbDirectoryAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const watchJbDirectoryEvent = /*#__PURE__*/ createWatchContractEvent({
  abi: jbDirectoryAbi,
  address: jbDirectoryAddress,
})

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbDirectoryAbi}__ and `eventName` set to `"AddTerminal"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const watchJbDirectoryAddTerminalEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    eventName: 'AddTerminal',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbDirectoryAbi}__ and `eventName` set to `"OwnershipTransferred"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const watchJbDirectoryOwnershipTransferredEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbDirectoryAbi}__ and `eventName` set to `"SetController"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const watchJbDirectorySetControllerEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    eventName: 'SetController',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbDirectoryAbi}__ and `eventName` set to `"SetIsAllowedToSetFirstController"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const watchJbDirectorySetIsAllowedToSetFirstControllerEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    eventName: 'SetIsAllowedToSetFirstController',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbDirectoryAbi}__ and `eventName` set to `"SetPrimaryTerminal"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const watchJbDirectorySetPrimaryTerminalEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    eventName: 'SetPrimaryTerminal',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbDirectoryAbi}__ and `eventName` set to `"SetTerminals"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9b3f76db6d7b3e6b286a3c176ba084ea3e8afd16)
 */
export const watchJbDirectorySetTerminalsEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    eventName: 'SetTerminals',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbFundAccessLimitsAbi}__
 */
export const readJbFundAccessLimits = /*#__PURE__*/ createReadContract({
  abi: jbFundAccessLimitsAbi,
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbFundAccessLimitsAbi}__ and `functionName` set to `"DIRECTORY"`
 */
export const readJbFundAccessLimitsDirectory = /*#__PURE__*/ createReadContract(
  { abi: jbFundAccessLimitsAbi, functionName: 'DIRECTORY' },
)

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbFundAccessLimitsAbi}__ and `functionName` set to `"payoutLimitOf"`
 */
export const readJbFundAccessLimitsPayoutLimitOf =
  /*#__PURE__*/ createReadContract({
    abi: jbFundAccessLimitsAbi,
    functionName: 'payoutLimitOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbFundAccessLimitsAbi}__ and `functionName` set to `"payoutLimitsOf"`
 */
export const readJbFundAccessLimitsPayoutLimitsOf =
  /*#__PURE__*/ createReadContract({
    abi: jbFundAccessLimitsAbi,
    functionName: 'payoutLimitsOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbFundAccessLimitsAbi}__ and `functionName` set to `"surplusAllowanceOf"`
 */
export const readJbFundAccessLimitsSurplusAllowanceOf =
  /*#__PURE__*/ createReadContract({
    abi: jbFundAccessLimitsAbi,
    functionName: 'surplusAllowanceOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbFundAccessLimitsAbi}__ and `functionName` set to `"surplusAllowancesOf"`
 */
export const readJbFundAccessLimitsSurplusAllowancesOf =
  /*#__PURE__*/ createReadContract({
    abi: jbFundAccessLimitsAbi,
    functionName: 'surplusAllowancesOf',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbFundAccessLimitsAbi}__
 */
export const writeJbFundAccessLimits = /*#__PURE__*/ createWriteContract({
  abi: jbFundAccessLimitsAbi,
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbFundAccessLimitsAbi}__ and `functionName` set to `"setFundAccessLimitsFor"`
 */
export const writeJbFundAccessLimitsSetFundAccessLimitsFor =
  /*#__PURE__*/ createWriteContract({
    abi: jbFundAccessLimitsAbi,
    functionName: 'setFundAccessLimitsFor',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbFundAccessLimitsAbi}__
 */
export const simulateJbFundAccessLimits = /*#__PURE__*/ createSimulateContract({
  abi: jbFundAccessLimitsAbi,
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbFundAccessLimitsAbi}__ and `functionName` set to `"setFundAccessLimitsFor"`
 */
export const simulateJbFundAccessLimitsSetFundAccessLimitsFor =
  /*#__PURE__*/ createSimulateContract({
    abi: jbFundAccessLimitsAbi,
    functionName: 'setFundAccessLimitsFor',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbFundAccessLimitsAbi}__
 */
export const watchJbFundAccessLimitsEvent =
  /*#__PURE__*/ createWatchContractEvent({ abi: jbFundAccessLimitsAbi })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbFundAccessLimitsAbi}__ and `eventName` set to `"SetFundAccessLimits"`
 */
export const watchJbFundAccessLimitsSetFundAccessLimitsEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbFundAccessLimitsAbi,
    eventName: 'SetFundAccessLimits',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__
 */
export const readJbMultiTerminal = /*#__PURE__*/ createReadContract({
  abi: jbMultiTerminalAbi,
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"DIRECTORY"`
 */
export const readJbMultiTerminalDirectory = /*#__PURE__*/ createReadContract({
  abi: jbMultiTerminalAbi,
  functionName: 'DIRECTORY',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"FEE"`
 */
export const readJbMultiTerminalFee = /*#__PURE__*/ createReadContract({
  abi: jbMultiTerminalAbi,
  functionName: 'FEE',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"FEELESS_ADDRESSES"`
 */
export const readJbMultiTerminalFeelessAddresses =
  /*#__PURE__*/ createReadContract({
    abi: jbMultiTerminalAbi,
    functionName: 'FEELESS_ADDRESSES',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"PERMISSIONS"`
 */
export const readJbMultiTerminalPermissions = /*#__PURE__*/ createReadContract({
  abi: jbMultiTerminalAbi,
  functionName: 'PERMISSIONS',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"PERMIT2"`
 */
export const readJbMultiTerminalPermit2 = /*#__PURE__*/ createReadContract({
  abi: jbMultiTerminalAbi,
  functionName: 'PERMIT2',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"PROJECTS"`
 */
export const readJbMultiTerminalProjects = /*#__PURE__*/ createReadContract({
  abi: jbMultiTerminalAbi,
  functionName: 'PROJECTS',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"RULESETS"`
 */
export const readJbMultiTerminalRulesets = /*#__PURE__*/ createReadContract({
  abi: jbMultiTerminalAbi,
  functionName: 'RULESETS',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"SPLITS"`
 */
export const readJbMultiTerminalSplits = /*#__PURE__*/ createReadContract({
  abi: jbMultiTerminalAbi,
  functionName: 'SPLITS',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"STORE"`
 */
export const readJbMultiTerminalStore = /*#__PURE__*/ createReadContract({
  abi: jbMultiTerminalAbi,
  functionName: 'STORE',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"TOKENS"`
 */
export const readJbMultiTerminalTokens = /*#__PURE__*/ createReadContract({
  abi: jbMultiTerminalAbi,
  functionName: 'TOKENS',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"accountingContextForTokenOf"`
 */
export const readJbMultiTerminalAccountingContextForTokenOf =
  /*#__PURE__*/ createReadContract({
    abi: jbMultiTerminalAbi,
    functionName: 'accountingContextForTokenOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"accountingContextsOf"`
 */
export const readJbMultiTerminalAccountingContextsOf =
  /*#__PURE__*/ createReadContract({
    abi: jbMultiTerminalAbi,
    functionName: 'accountingContextsOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"currentSurplusOf"`
 */
export const readJbMultiTerminalCurrentSurplusOf =
  /*#__PURE__*/ createReadContract({
    abi: jbMultiTerminalAbi,
    functionName: 'currentSurplusOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"heldFeesOf"`
 */
export const readJbMultiTerminalHeldFeesOf = /*#__PURE__*/ createReadContract({
  abi: jbMultiTerminalAbi,
  functionName: 'heldFeesOf',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"isTrustedForwarder"`
 */
export const readJbMultiTerminalIsTrustedForwarder =
  /*#__PURE__*/ createReadContract({
    abi: jbMultiTerminalAbi,
    functionName: 'isTrustedForwarder',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"supportsInterface"`
 */
export const readJbMultiTerminalSupportsInterface =
  /*#__PURE__*/ createReadContract({
    abi: jbMultiTerminalAbi,
    functionName: 'supportsInterface',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"trustedForwarder"`
 */
export const readJbMultiTerminalTrustedForwarder =
  /*#__PURE__*/ createReadContract({
    abi: jbMultiTerminalAbi,
    functionName: 'trustedForwarder',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__
 */
export const writeJbMultiTerminal = /*#__PURE__*/ createWriteContract({
  abi: jbMultiTerminalAbi,
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"addAccountingContextsFor"`
 */
export const writeJbMultiTerminalAddAccountingContextsFor =
  /*#__PURE__*/ createWriteContract({
    abi: jbMultiTerminalAbi,
    functionName: 'addAccountingContextsFor',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"addToBalanceOf"`
 */
export const writeJbMultiTerminalAddToBalanceOf =
  /*#__PURE__*/ createWriteContract({
    abi: jbMultiTerminalAbi,
    functionName: 'addToBalanceOf',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"cashOutTokensOf"`
 */
export const writeJbMultiTerminalCashOutTokensOf =
  /*#__PURE__*/ createWriteContract({
    abi: jbMultiTerminalAbi,
    functionName: 'cashOutTokensOf',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"executePayout"`
 */
export const writeJbMultiTerminalExecutePayout =
  /*#__PURE__*/ createWriteContract({
    abi: jbMultiTerminalAbi,
    functionName: 'executePayout',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"executeProcessFee"`
 */
export const writeJbMultiTerminalExecuteProcessFee =
  /*#__PURE__*/ createWriteContract({
    abi: jbMultiTerminalAbi,
    functionName: 'executeProcessFee',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"executeTransferTo"`
 */
export const writeJbMultiTerminalExecuteTransferTo =
  /*#__PURE__*/ createWriteContract({
    abi: jbMultiTerminalAbi,
    functionName: 'executeTransferTo',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"migrateBalanceOf"`
 */
export const writeJbMultiTerminalMigrateBalanceOf =
  /*#__PURE__*/ createWriteContract({
    abi: jbMultiTerminalAbi,
    functionName: 'migrateBalanceOf',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"pay"`
 */
export const writeJbMultiTerminalPay = /*#__PURE__*/ createWriteContract({
  abi: jbMultiTerminalAbi,
  functionName: 'pay',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"processHeldFeesOf"`
 */
export const writeJbMultiTerminalProcessHeldFeesOf =
  /*#__PURE__*/ createWriteContract({
    abi: jbMultiTerminalAbi,
    functionName: 'processHeldFeesOf',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"sendPayoutsOf"`
 */
export const writeJbMultiTerminalSendPayoutsOf =
  /*#__PURE__*/ createWriteContract({
    abi: jbMultiTerminalAbi,
    functionName: 'sendPayoutsOf',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"useAllowanceOf"`
 */
export const writeJbMultiTerminalUseAllowanceOf =
  /*#__PURE__*/ createWriteContract({
    abi: jbMultiTerminalAbi,
    functionName: 'useAllowanceOf',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__
 */
export const simulateJbMultiTerminal = /*#__PURE__*/ createSimulateContract({
  abi: jbMultiTerminalAbi,
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"addAccountingContextsFor"`
 */
export const simulateJbMultiTerminalAddAccountingContextsFor =
  /*#__PURE__*/ createSimulateContract({
    abi: jbMultiTerminalAbi,
    functionName: 'addAccountingContextsFor',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"addToBalanceOf"`
 */
export const simulateJbMultiTerminalAddToBalanceOf =
  /*#__PURE__*/ createSimulateContract({
    abi: jbMultiTerminalAbi,
    functionName: 'addToBalanceOf',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"cashOutTokensOf"`
 */
export const simulateJbMultiTerminalCashOutTokensOf =
  /*#__PURE__*/ createSimulateContract({
    abi: jbMultiTerminalAbi,
    functionName: 'cashOutTokensOf',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"executePayout"`
 */
export const simulateJbMultiTerminalExecutePayout =
  /*#__PURE__*/ createSimulateContract({
    abi: jbMultiTerminalAbi,
    functionName: 'executePayout',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"executeProcessFee"`
 */
export const simulateJbMultiTerminalExecuteProcessFee =
  /*#__PURE__*/ createSimulateContract({
    abi: jbMultiTerminalAbi,
    functionName: 'executeProcessFee',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"executeTransferTo"`
 */
export const simulateJbMultiTerminalExecuteTransferTo =
  /*#__PURE__*/ createSimulateContract({
    abi: jbMultiTerminalAbi,
    functionName: 'executeTransferTo',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"migrateBalanceOf"`
 */
export const simulateJbMultiTerminalMigrateBalanceOf =
  /*#__PURE__*/ createSimulateContract({
    abi: jbMultiTerminalAbi,
    functionName: 'migrateBalanceOf',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"pay"`
 */
export const simulateJbMultiTerminalPay = /*#__PURE__*/ createSimulateContract({
  abi: jbMultiTerminalAbi,
  functionName: 'pay',
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"processHeldFeesOf"`
 */
export const simulateJbMultiTerminalProcessHeldFeesOf =
  /*#__PURE__*/ createSimulateContract({
    abi: jbMultiTerminalAbi,
    functionName: 'processHeldFeesOf',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"sendPayoutsOf"`
 */
export const simulateJbMultiTerminalSendPayoutsOf =
  /*#__PURE__*/ createSimulateContract({
    abi: jbMultiTerminalAbi,
    functionName: 'sendPayoutsOf',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"useAllowanceOf"`
 */
export const simulateJbMultiTerminalUseAllowanceOf =
  /*#__PURE__*/ createSimulateContract({
    abi: jbMultiTerminalAbi,
    functionName: 'useAllowanceOf',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__
 */
export const watchJbMultiTerminalEvent = /*#__PURE__*/ createWatchContractEvent(
  { abi: jbMultiTerminalAbi },
)

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"AddToBalance"`
 */
export const watchJbMultiTerminalAddToBalanceEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'AddToBalance',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"CashOutTokens"`
 */
export const watchJbMultiTerminalCashOutTokensEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'CashOutTokens',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"FeeReverted"`
 */
export const watchJbMultiTerminalFeeRevertedEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'FeeReverted',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"HoldFee"`
 */
export const watchJbMultiTerminalHoldFeeEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'HoldFee',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"HookAfterRecordCashOut"`
 */
export const watchJbMultiTerminalHookAfterRecordCashOutEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'HookAfterRecordCashOut',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"HookAfterRecordPay"`
 */
export const watchJbMultiTerminalHookAfterRecordPayEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'HookAfterRecordPay',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"MigrateTerminal"`
 */
export const watchJbMultiTerminalMigrateTerminalEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'MigrateTerminal',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"Pay"`
 */
export const watchJbMultiTerminalPayEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'Pay',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"PayoutReverted"`
 */
export const watchJbMultiTerminalPayoutRevertedEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'PayoutReverted',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"PayoutTransferReverted"`
 */
export const watchJbMultiTerminalPayoutTransferRevertedEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'PayoutTransferReverted',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"ProcessFee"`
 */
export const watchJbMultiTerminalProcessFeeEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'ProcessFee',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"ReturnHeldFees"`
 */
export const watchJbMultiTerminalReturnHeldFeesEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'ReturnHeldFees',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"SendPayoutToSplit"`
 */
export const watchJbMultiTerminalSendPayoutToSplitEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'SendPayoutToSplit',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"SendPayouts"`
 */
export const watchJbMultiTerminalSendPayoutsEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'SendPayouts',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"SetAccountingContext"`
 */
export const watchJbMultiTerminalSetAccountingContextEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'SetAccountingContext',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"UseAllowance"`
 */
export const watchJbMultiTerminalUseAllowanceEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'UseAllowance',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbPermissionsAbi}__
 */
export const readJbPermissions = /*#__PURE__*/ createReadContract({
  abi: jbPermissionsAbi,
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbPermissionsAbi}__ and `functionName` set to `"WILDCARD_PROJECT_ID"`
 */
export const readJbPermissionsWildcardProjectId =
  /*#__PURE__*/ createReadContract({
    abi: jbPermissionsAbi,
    functionName: 'WILDCARD_PROJECT_ID',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbPermissionsAbi}__ and `functionName` set to `"hasPermission"`
 */
export const readJbPermissionsHasPermission = /*#__PURE__*/ createReadContract({
  abi: jbPermissionsAbi,
  functionName: 'hasPermission',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbPermissionsAbi}__ and `functionName` set to `"hasPermissions"`
 */
export const readJbPermissionsHasPermissions = /*#__PURE__*/ createReadContract(
  { abi: jbPermissionsAbi, functionName: 'hasPermissions' },
)

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbPermissionsAbi}__ and `functionName` set to `"permissionsOf"`
 */
export const readJbPermissionsPermissionsOf = /*#__PURE__*/ createReadContract({
  abi: jbPermissionsAbi,
  functionName: 'permissionsOf',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbPermissionsAbi}__
 */
export const writeJbPermissions = /*#__PURE__*/ createWriteContract({
  abi: jbPermissionsAbi,
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbPermissionsAbi}__ and `functionName` set to `"setPermissionsFor"`
 */
export const writeJbPermissionsSetPermissionsFor =
  /*#__PURE__*/ createWriteContract({
    abi: jbPermissionsAbi,
    functionName: 'setPermissionsFor',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbPermissionsAbi}__
 */
export const simulateJbPermissions = /*#__PURE__*/ createSimulateContract({
  abi: jbPermissionsAbi,
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbPermissionsAbi}__ and `functionName` set to `"setPermissionsFor"`
 */
export const simulateJbPermissionsSetPermissionsFor =
  /*#__PURE__*/ createSimulateContract({
    abi: jbPermissionsAbi,
    functionName: 'setPermissionsFor',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbPermissionsAbi}__
 */
export const watchJbPermissionsEvent = /*#__PURE__*/ createWatchContractEvent({
  abi: jbPermissionsAbi,
})

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbPermissionsAbi}__ and `eventName` set to `"OperatorPermissionsSet"`
 */
export const watchJbPermissionsOperatorPermissionsSetEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbPermissionsAbi,
    eventName: 'OperatorPermissionsSet',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbPricesAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 */
export const readJbPrices = /*#__PURE__*/ createReadContract({
  abi: jbPricesAbi,
  address: jbPricesAddress,
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbPricesAbi}__ and `functionName` set to `"DEFAULT_PROJECT_ID"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 */
export const readJbPricesDefaultProjectId = /*#__PURE__*/ createReadContract({
  abi: jbPricesAbi,
  address: jbPricesAddress,
  functionName: 'DEFAULT_PROJECT_ID',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbPricesAbi}__ and `functionName` set to `"DIRECTORY"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 */
export const readJbPricesDirectory = /*#__PURE__*/ createReadContract({
  abi: jbPricesAbi,
  address: jbPricesAddress,
  functionName: 'DIRECTORY',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbPricesAbi}__ and `functionName` set to `"PERMISSIONS"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 */
export const readJbPricesPermissions = /*#__PURE__*/ createReadContract({
  abi: jbPricesAbi,
  address: jbPricesAddress,
  functionName: 'PERMISSIONS',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbPricesAbi}__ and `functionName` set to `"PROJECTS"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 */
export const readJbPricesProjects = /*#__PURE__*/ createReadContract({
  abi: jbPricesAbi,
  address: jbPricesAddress,
  functionName: 'PROJECTS',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbPricesAbi}__ and `functionName` set to `"owner"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 */
export const readJbPricesOwner = /*#__PURE__*/ createReadContract({
  abi: jbPricesAbi,
  address: jbPricesAddress,
  functionName: 'owner',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbPricesAbi}__ and `functionName` set to `"priceFeedFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 */
export const readJbPricesPriceFeedFor = /*#__PURE__*/ createReadContract({
  abi: jbPricesAbi,
  address: jbPricesAddress,
  functionName: 'priceFeedFor',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbPricesAbi}__ and `functionName` set to `"pricePerUnitOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 */
export const readJbPricesPricePerUnitOf = /*#__PURE__*/ createReadContract({
  abi: jbPricesAbi,
  address: jbPricesAddress,
  functionName: 'pricePerUnitOf',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbPricesAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 */
export const writeJbPrices = /*#__PURE__*/ createWriteContract({
  abi: jbPricesAbi,
  address: jbPricesAddress,
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbPricesAbi}__ and `functionName` set to `"addPriceFeedFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 */
export const writeJbPricesAddPriceFeedFor = /*#__PURE__*/ createWriteContract({
  abi: jbPricesAbi,
  address: jbPricesAddress,
  functionName: 'addPriceFeedFor',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbPricesAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 */
export const writeJbPricesRenounceOwnership = /*#__PURE__*/ createWriteContract(
  {
    abi: jbPricesAbi,
    address: jbPricesAddress,
    functionName: 'renounceOwnership',
  },
)

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbPricesAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 */
export const writeJbPricesTransferOwnership = /*#__PURE__*/ createWriteContract(
  {
    abi: jbPricesAbi,
    address: jbPricesAddress,
    functionName: 'transferOwnership',
  },
)

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbPricesAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 */
export const simulateJbPrices = /*#__PURE__*/ createSimulateContract({
  abi: jbPricesAbi,
  address: jbPricesAddress,
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbPricesAbi}__ and `functionName` set to `"addPriceFeedFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 */
export const simulateJbPricesAddPriceFeedFor =
  /*#__PURE__*/ createSimulateContract({
    abi: jbPricesAbi,
    address: jbPricesAddress,
    functionName: 'addPriceFeedFor',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbPricesAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 */
export const simulateJbPricesRenounceOwnership =
  /*#__PURE__*/ createSimulateContract({
    abi: jbPricesAbi,
    address: jbPricesAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbPricesAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 */
export const simulateJbPricesTransferOwnership =
  /*#__PURE__*/ createSimulateContract({
    abi: jbPricesAbi,
    address: jbPricesAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbPricesAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 */
export const watchJbPricesEvent = /*#__PURE__*/ createWatchContractEvent({
  abi: jbPricesAbi,
  address: jbPricesAddress,
})

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbPricesAbi}__ and `eventName` set to `"AddPriceFeed"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 */
export const watchJbPricesAddPriceFeedEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbPricesAbi,
    address: jbPricesAddress,
    eventName: 'AddPriceFeed',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbPricesAbi}__ and `eventName` set to `"OwnershipTransferred"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x5e2c77b57fa4206be44cd9e7933aaebfe2b3fa8d)
 */
export const watchJbPricesOwnershipTransferredEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbPricesAbi,
    address: jbPricesAddress,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbProjectsAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const readJbProjects = /*#__PURE__*/ createReadContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"balanceOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const readJbProjectsBalanceOf = /*#__PURE__*/ createReadContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
  functionName: 'balanceOf',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"count"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const readJbProjectsCount = /*#__PURE__*/ createReadContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
  functionName: 'count',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"getApproved"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const readJbProjectsGetApproved = /*#__PURE__*/ createReadContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
  functionName: 'getApproved',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"isApprovedForAll"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const readJbProjectsIsApprovedForAll = /*#__PURE__*/ createReadContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
  functionName: 'isApprovedForAll',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"name"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const readJbProjectsName = /*#__PURE__*/ createReadContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
  functionName: 'name',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"owner"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const readJbProjectsOwner = /*#__PURE__*/ createReadContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
  functionName: 'owner',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"ownerOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const readJbProjectsOwnerOf = /*#__PURE__*/ createReadContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
  functionName: 'ownerOf',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"supportsInterface"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const readJbProjectsSupportsInterface = /*#__PURE__*/ createReadContract(
  {
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'supportsInterface',
  },
)

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"symbol"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const readJbProjectsSymbol = /*#__PURE__*/ createReadContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
  functionName: 'symbol',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"tokenURI"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const readJbProjectsTokenUri = /*#__PURE__*/ createReadContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
  functionName: 'tokenURI',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"tokenUriResolver"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const readJbProjectsTokenUriResolver = /*#__PURE__*/ createReadContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
  functionName: 'tokenUriResolver',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbProjectsAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const writeJbProjects = /*#__PURE__*/ createWriteContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"approve"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const writeJbProjectsApprove = /*#__PURE__*/ createWriteContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
  functionName: 'approve',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"createFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const writeJbProjectsCreateFor = /*#__PURE__*/ createWriteContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
  functionName: 'createFor',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const writeJbProjectsRenounceOwnership =
  /*#__PURE__*/ createWriteContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"safeTransferFrom"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const writeJbProjectsSafeTransferFrom =
  /*#__PURE__*/ createWriteContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"setApprovalForAll"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const writeJbProjectsSetApprovalForAll =
  /*#__PURE__*/ createWriteContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"setTokenUriResolver"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const writeJbProjectsSetTokenUriResolver =
  /*#__PURE__*/ createWriteContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'setTokenUriResolver',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"transferFrom"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const writeJbProjectsTransferFrom = /*#__PURE__*/ createWriteContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
  functionName: 'transferFrom',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const writeJbProjectsTransferOwnership =
  /*#__PURE__*/ createWriteContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbProjectsAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const simulateJbProjects = /*#__PURE__*/ createSimulateContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"approve"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const simulateJbProjectsApprove = /*#__PURE__*/ createSimulateContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
  functionName: 'approve',
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"createFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const simulateJbProjectsCreateFor = /*#__PURE__*/ createSimulateContract(
  { abi: jbProjectsAbi, address: jbProjectsAddress, functionName: 'createFor' },
)

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const simulateJbProjectsRenounceOwnership =
  /*#__PURE__*/ createSimulateContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"safeTransferFrom"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const simulateJbProjectsSafeTransferFrom =
  /*#__PURE__*/ createSimulateContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"setApprovalForAll"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const simulateJbProjectsSetApprovalForAll =
  /*#__PURE__*/ createSimulateContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"setTokenUriResolver"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const simulateJbProjectsSetTokenUriResolver =
  /*#__PURE__*/ createSimulateContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'setTokenUriResolver',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"transferFrom"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const simulateJbProjectsTransferFrom =
  /*#__PURE__*/ createSimulateContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const simulateJbProjectsTransferOwnership =
  /*#__PURE__*/ createSimulateContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbProjectsAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const watchJbProjectsEvent = /*#__PURE__*/ createWatchContractEvent({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
})

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbProjectsAbi}__ and `eventName` set to `"Approval"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const watchJbProjectsApprovalEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    eventName: 'Approval',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbProjectsAbi}__ and `eventName` set to `"ApprovalForAll"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const watchJbProjectsApprovalForAllEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    eventName: 'ApprovalForAll',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbProjectsAbi}__ and `eventName` set to `"Create"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const watchJbProjectsCreateEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    eventName: 'Create',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbProjectsAbi}__ and `eventName` set to `"OwnershipTransferred"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const watchJbProjectsOwnershipTransferredEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbProjectsAbi}__ and `eventName` set to `"SetTokenUriResolver"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const watchJbProjectsSetTokenUriResolverEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    eventName: 'SetTokenUriResolver',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbProjectsAbi}__ and `eventName` set to `"Transfer"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x38ecaaec685c21f77712f569b071309a2143ff58)
 */
export const watchJbProjectsTransferEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    eventName: 'Transfer',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbRulesetsAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 */
export const readJbRulesets = /*#__PURE__*/ createReadContract({
  abi: jbRulesetsAbi,
  address: jbRulesetsAddress,
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"DIRECTORY"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 */
export const readJbRulesetsDirectory = /*#__PURE__*/ createReadContract({
  abi: jbRulesetsAbi,
  address: jbRulesetsAddress,
  functionName: 'DIRECTORY',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"allOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 */
export const readJbRulesetsAllOf = /*#__PURE__*/ createReadContract({
  abi: jbRulesetsAbi,
  address: jbRulesetsAddress,
  functionName: 'allOf',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"currentApprovalStatusForLatestRulesetOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 */
export const readJbRulesetsCurrentApprovalStatusForLatestRulesetOf =
  /*#__PURE__*/ createReadContract({
    abi: jbRulesetsAbi,
    address: jbRulesetsAddress,
    functionName: 'currentApprovalStatusForLatestRulesetOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"currentOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 */
export const readJbRulesetsCurrentOf = /*#__PURE__*/ createReadContract({
  abi: jbRulesetsAbi,
  address: jbRulesetsAddress,
  functionName: 'currentOf',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"deriveCycleNumberFrom"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 */
export const readJbRulesetsDeriveCycleNumberFrom =
  /*#__PURE__*/ createReadContract({
    abi: jbRulesetsAbi,
    address: jbRulesetsAddress,
    functionName: 'deriveCycleNumberFrom',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"deriveStartFrom"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 */
export const readJbRulesetsDeriveStartFrom = /*#__PURE__*/ createReadContract({
  abi: jbRulesetsAbi,
  address: jbRulesetsAddress,
  functionName: 'deriveStartFrom',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"deriveWeightFrom"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 */
export const readJbRulesetsDeriveWeightFrom = /*#__PURE__*/ createReadContract({
  abi: jbRulesetsAbi,
  address: jbRulesetsAddress,
  functionName: 'deriveWeightFrom',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"getRulesetOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 */
export const readJbRulesetsGetRulesetOf = /*#__PURE__*/ createReadContract({
  abi: jbRulesetsAbi,
  address: jbRulesetsAddress,
  functionName: 'getRulesetOf',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"latestQueuedOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 */
export const readJbRulesetsLatestQueuedOf = /*#__PURE__*/ createReadContract({
  abi: jbRulesetsAbi,
  address: jbRulesetsAddress,
  functionName: 'latestQueuedOf',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"latestRulesetIdOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 */
export const readJbRulesetsLatestRulesetIdOf = /*#__PURE__*/ createReadContract(
  {
    abi: jbRulesetsAbi,
    address: jbRulesetsAddress,
    functionName: 'latestRulesetIdOf',
  },
)

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"upcomingOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 */
export const readJbRulesetsUpcomingOf = /*#__PURE__*/ createReadContract({
  abi: jbRulesetsAbi,
  address: jbRulesetsAddress,
  functionName: 'upcomingOf',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbRulesetsAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 */
export const writeJbRulesets = /*#__PURE__*/ createWriteContract({
  abi: jbRulesetsAbi,
  address: jbRulesetsAddress,
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"queueFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 */
export const writeJbRulesetsQueueFor = /*#__PURE__*/ createWriteContract({
  abi: jbRulesetsAbi,
  address: jbRulesetsAddress,
  functionName: 'queueFor',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"updateRulesetWeightCache"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 */
export const writeJbRulesetsUpdateRulesetWeightCache =
  /*#__PURE__*/ createWriteContract({
    abi: jbRulesetsAbi,
    address: jbRulesetsAddress,
    functionName: 'updateRulesetWeightCache',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbRulesetsAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 */
export const simulateJbRulesets = /*#__PURE__*/ createSimulateContract({
  abi: jbRulesetsAbi,
  address: jbRulesetsAddress,
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"queueFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 */
export const simulateJbRulesetsQueueFor = /*#__PURE__*/ createSimulateContract({
  abi: jbRulesetsAbi,
  address: jbRulesetsAddress,
  functionName: 'queueFor',
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"updateRulesetWeightCache"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 */
export const simulateJbRulesetsUpdateRulesetWeightCache =
  /*#__PURE__*/ createSimulateContract({
    abi: jbRulesetsAbi,
    address: jbRulesetsAddress,
    functionName: 'updateRulesetWeightCache',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbRulesetsAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 */
export const watchJbRulesetsEvent = /*#__PURE__*/ createWatchContractEvent({
  abi: jbRulesetsAbi,
  address: jbRulesetsAddress,
})

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbRulesetsAbi}__ and `eventName` set to `"RulesetInitialized"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 */
export const watchJbRulesetsRulesetInitializedEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbRulesetsAbi,
    address: jbRulesetsAddress,
    eventName: 'RulesetInitialized',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbRulesetsAbi}__ and `eventName` set to `"RulesetQueued"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 */
export const watchJbRulesetsRulesetQueuedEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbRulesetsAbi,
    address: jbRulesetsAddress,
    eventName: 'RulesetQueued',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbRulesetsAbi}__ and `eventName` set to `"WeightCacheUpdated"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x117aa863c690a871523715e0ea42a49121f10cfd)
 */
export const watchJbRulesetsWeightCacheUpdatedEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbRulesetsAbi,
    address: jbRulesetsAddress,
    eventName: 'WeightCacheUpdated',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSplitsAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 */
export const readJbSplits = /*#__PURE__*/ createReadContract({
  abi: jbSplitsAbi,
  address: jbSplitsAddress,
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSplitsAbi}__ and `functionName` set to `"DIRECTORY"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 */
export const readJbSplitsDirectory = /*#__PURE__*/ createReadContract({
  abi: jbSplitsAbi,
  address: jbSplitsAddress,
  functionName: 'DIRECTORY',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSplitsAbi}__ and `functionName` set to `"FALLBACK_RULESET_ID"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 */
export const readJbSplitsFallbackRulesetId = /*#__PURE__*/ createReadContract({
  abi: jbSplitsAbi,
  address: jbSplitsAddress,
  functionName: 'FALLBACK_RULESET_ID',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSplitsAbi}__ and `functionName` set to `"splitsOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 */
export const readJbSplitsSplitsOf = /*#__PURE__*/ createReadContract({
  abi: jbSplitsAbi,
  address: jbSplitsAddress,
  functionName: 'splitsOf',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbSplitsAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 */
export const writeJbSplits = /*#__PURE__*/ createWriteContract({
  abi: jbSplitsAbi,
  address: jbSplitsAddress,
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbSplitsAbi}__ and `functionName` set to `"setSplitGroupsOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 */
export const writeJbSplitsSetSplitGroupsOf = /*#__PURE__*/ createWriteContract({
  abi: jbSplitsAbi,
  address: jbSplitsAddress,
  functionName: 'setSplitGroupsOf',
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbSplitsAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 */
export const simulateJbSplits = /*#__PURE__*/ createSimulateContract({
  abi: jbSplitsAbi,
  address: jbSplitsAddress,
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbSplitsAbi}__ and `functionName` set to `"setSplitGroupsOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 */
export const simulateJbSplitsSetSplitGroupsOf =
  /*#__PURE__*/ createSimulateContract({
    abi: jbSplitsAbi,
    address: jbSplitsAddress,
    functionName: 'setSplitGroupsOf',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbSplitsAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 */
export const watchJbSplitsEvent = /*#__PURE__*/ createWatchContractEvent({
  abi: jbSplitsAbi,
  address: jbSplitsAddress,
})

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbSplitsAbi}__ and `eventName` set to `"SetSplit"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x3792121047c75d0808a230eb4e67157d93fafcba)
 */
export const watchJbSplitsSetSplitEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbSplitsAbi,
    address: jbSplitsAddress,
    eventName: 'SetSplit',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSuckerRegistryAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const readJbSuckerRegistry = /*#__PURE__*/ createReadContract({
  abi: jbSuckerRegistryAbi,
  address: jbSuckerRegistryAddress,
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSuckerRegistryAbi}__ and `functionName` set to `"DIRECTORY"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const readJbSuckerRegistryDirectory = /*#__PURE__*/ createReadContract({
  abi: jbSuckerRegistryAbi,
  address: jbSuckerRegistryAddress,
  functionName: 'DIRECTORY',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSuckerRegistryAbi}__ and `functionName` set to `"PERMISSIONS"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const readJbSuckerRegistryPermissions = /*#__PURE__*/ createReadContract(
  {
    abi: jbSuckerRegistryAbi,
    address: jbSuckerRegistryAddress,
    functionName: 'PERMISSIONS',
  },
)

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSuckerRegistryAbi}__ and `functionName` set to `"PROJECTS"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const readJbSuckerRegistryProjects = /*#__PURE__*/ createReadContract({
  abi: jbSuckerRegistryAbi,
  address: jbSuckerRegistryAddress,
  functionName: 'PROJECTS',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSuckerRegistryAbi}__ and `functionName` set to `"getSuckerPairsOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const readJbSuckerRegistryGetSuckerPairsOf =
  /*#__PURE__*/ createReadContract({
    abi: jbSuckerRegistryAbi,
    address: jbSuckerRegistryAddress,
    functionName: 'getSuckerPairsOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSuckerRegistryAbi}__ and `functionName` set to `"isSuckerOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const readJbSuckerRegistryIsSuckerOf = /*#__PURE__*/ createReadContract({
  abi: jbSuckerRegistryAbi,
  address: jbSuckerRegistryAddress,
  functionName: 'isSuckerOf',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSuckerRegistryAbi}__ and `functionName` set to `"isTrustedForwarder"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const readJbSuckerRegistryIsTrustedForwarder =
  /*#__PURE__*/ createReadContract({
    abi: jbSuckerRegistryAbi,
    address: jbSuckerRegistryAddress,
    functionName: 'isTrustedForwarder',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSuckerRegistryAbi}__ and `functionName` set to `"owner"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const readJbSuckerRegistryOwner = /*#__PURE__*/ createReadContract({
  abi: jbSuckerRegistryAbi,
  address: jbSuckerRegistryAddress,
  functionName: 'owner',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSuckerRegistryAbi}__ and `functionName` set to `"suckerDeployerIsAllowed"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const readJbSuckerRegistrySuckerDeployerIsAllowed =
  /*#__PURE__*/ createReadContract({
    abi: jbSuckerRegistryAbi,
    address: jbSuckerRegistryAddress,
    functionName: 'suckerDeployerIsAllowed',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSuckerRegistryAbi}__ and `functionName` set to `"suckersOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const readJbSuckerRegistrySuckersOf = /*#__PURE__*/ createReadContract({
  abi: jbSuckerRegistryAbi,
  address: jbSuckerRegistryAddress,
  functionName: 'suckersOf',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSuckerRegistryAbi}__ and `functionName` set to `"trustedForwarder"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const readJbSuckerRegistryTrustedForwarder =
  /*#__PURE__*/ createReadContract({
    abi: jbSuckerRegistryAbi,
    address: jbSuckerRegistryAddress,
    functionName: 'trustedForwarder',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbSuckerRegistryAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const writeJbSuckerRegistry = /*#__PURE__*/ createWriteContract({
  abi: jbSuckerRegistryAbi,
  address: jbSuckerRegistryAddress,
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbSuckerRegistryAbi}__ and `functionName` set to `"allowSuckerDeployer"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const writeJbSuckerRegistryAllowSuckerDeployer =
  /*#__PURE__*/ createWriteContract({
    abi: jbSuckerRegistryAbi,
    address: jbSuckerRegistryAddress,
    functionName: 'allowSuckerDeployer',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbSuckerRegistryAbi}__ and `functionName` set to `"allowSuckerDeployers"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const writeJbSuckerRegistryAllowSuckerDeployers =
  /*#__PURE__*/ createWriteContract({
    abi: jbSuckerRegistryAbi,
    address: jbSuckerRegistryAddress,
    functionName: 'allowSuckerDeployers',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbSuckerRegistryAbi}__ and `functionName` set to `"deploySuckersFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const writeJbSuckerRegistryDeploySuckersFor =
  /*#__PURE__*/ createWriteContract({
    abi: jbSuckerRegistryAbi,
    address: jbSuckerRegistryAddress,
    functionName: 'deploySuckersFor',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbSuckerRegistryAbi}__ and `functionName` set to `"removeDeprecatedSucker"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const writeJbSuckerRegistryRemoveDeprecatedSucker =
  /*#__PURE__*/ createWriteContract({
    abi: jbSuckerRegistryAbi,
    address: jbSuckerRegistryAddress,
    functionName: 'removeDeprecatedSucker',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbSuckerRegistryAbi}__ and `functionName` set to `"removeSuckerDeployer"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const writeJbSuckerRegistryRemoveSuckerDeployer =
  /*#__PURE__*/ createWriteContract({
    abi: jbSuckerRegistryAbi,
    address: jbSuckerRegistryAddress,
    functionName: 'removeSuckerDeployer',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbSuckerRegistryAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const writeJbSuckerRegistryRenounceOwnership =
  /*#__PURE__*/ createWriteContract({
    abi: jbSuckerRegistryAbi,
    address: jbSuckerRegistryAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbSuckerRegistryAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const writeJbSuckerRegistryTransferOwnership =
  /*#__PURE__*/ createWriteContract({
    abi: jbSuckerRegistryAbi,
    address: jbSuckerRegistryAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbSuckerRegistryAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const simulateJbSuckerRegistry = /*#__PURE__*/ createSimulateContract({
  abi: jbSuckerRegistryAbi,
  address: jbSuckerRegistryAddress,
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbSuckerRegistryAbi}__ and `functionName` set to `"allowSuckerDeployer"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const simulateJbSuckerRegistryAllowSuckerDeployer =
  /*#__PURE__*/ createSimulateContract({
    abi: jbSuckerRegistryAbi,
    address: jbSuckerRegistryAddress,
    functionName: 'allowSuckerDeployer',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbSuckerRegistryAbi}__ and `functionName` set to `"allowSuckerDeployers"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const simulateJbSuckerRegistryAllowSuckerDeployers =
  /*#__PURE__*/ createSimulateContract({
    abi: jbSuckerRegistryAbi,
    address: jbSuckerRegistryAddress,
    functionName: 'allowSuckerDeployers',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbSuckerRegistryAbi}__ and `functionName` set to `"deploySuckersFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const simulateJbSuckerRegistryDeploySuckersFor =
  /*#__PURE__*/ createSimulateContract({
    abi: jbSuckerRegistryAbi,
    address: jbSuckerRegistryAddress,
    functionName: 'deploySuckersFor',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbSuckerRegistryAbi}__ and `functionName` set to `"removeDeprecatedSucker"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const simulateJbSuckerRegistryRemoveDeprecatedSucker =
  /*#__PURE__*/ createSimulateContract({
    abi: jbSuckerRegistryAbi,
    address: jbSuckerRegistryAddress,
    functionName: 'removeDeprecatedSucker',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbSuckerRegistryAbi}__ and `functionName` set to `"removeSuckerDeployer"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const simulateJbSuckerRegistryRemoveSuckerDeployer =
  /*#__PURE__*/ createSimulateContract({
    abi: jbSuckerRegistryAbi,
    address: jbSuckerRegistryAddress,
    functionName: 'removeSuckerDeployer',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbSuckerRegistryAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const simulateJbSuckerRegistryRenounceOwnership =
  /*#__PURE__*/ createSimulateContract({
    abi: jbSuckerRegistryAbi,
    address: jbSuckerRegistryAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbSuckerRegistryAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const simulateJbSuckerRegistryTransferOwnership =
  /*#__PURE__*/ createSimulateContract({
    abi: jbSuckerRegistryAbi,
    address: jbSuckerRegistryAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbSuckerRegistryAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const watchJbSuckerRegistryEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbSuckerRegistryAbi,
    address: jbSuckerRegistryAddress,
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbSuckerRegistryAbi}__ and `eventName` set to `"OwnershipTransferred"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const watchJbSuckerRegistryOwnershipTransferredEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbSuckerRegistryAbi,
    address: jbSuckerRegistryAddress,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbSuckerRegistryAbi}__ and `eventName` set to `"SuckerDeployedFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const watchJbSuckerRegistrySuckerDeployedForEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbSuckerRegistryAbi,
    address: jbSuckerRegistryAddress,
    eventName: 'SuckerDeployedFor',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbSuckerRegistryAbi}__ and `eventName` set to `"SuckerDeployerAllowed"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const watchJbSuckerRegistrySuckerDeployerAllowedEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbSuckerRegistryAbi,
    address: jbSuckerRegistryAddress,
    eventName: 'SuckerDeployerAllowed',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbSuckerRegistryAbi}__ and `eventName` set to `"SuckerDeployerRemoved"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const watchJbSuckerRegistrySuckerDeployerRemovedEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbSuckerRegistryAbi,
    address: jbSuckerRegistryAddress,
    eventName: 'SuckerDeployerRemoved',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbSuckerRegistryAbi}__ and `eventName` set to `"SuckerDeprecated"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x54c6a82c83449293f3fcad1735dcec1e31257a9e)
 */
export const watchJbSuckerRegistrySuckerDeprecatedEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbSuckerRegistryAbi,
    address: jbSuckerRegistryAddress,
    eventName: 'SuckerDeprecated',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__
 */
export const readJbSwapTerminal = /*#__PURE__*/ createReadContract({
  abi: jbSwapTerminalAbi,
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"DEFAULT_PROJECT_ID"`
 */
export const readJbSwapTerminalDefaultProjectId =
  /*#__PURE__*/ createReadContract({
    abi: jbSwapTerminalAbi,
    functionName: 'DEFAULT_PROJECT_ID',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"DIRECTORY"`
 */
export const readJbSwapTerminalDirectory = /*#__PURE__*/ createReadContract({
  abi: jbSwapTerminalAbi,
  functionName: 'DIRECTORY',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"FACTORY"`
 */
export const readJbSwapTerminalFactory = /*#__PURE__*/ createReadContract({
  abi: jbSwapTerminalAbi,
  functionName: 'FACTORY',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"MAX_TWAP_SLIPPAGE_TOLERANCE"`
 */
export const readJbSwapTerminalMaxTwapSlippageTolerance =
  /*#__PURE__*/ createReadContract({
    abi: jbSwapTerminalAbi,
    functionName: 'MAX_TWAP_SLIPPAGE_TOLERANCE',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"MAX_TWAP_WINDOW"`
 */
export const readJbSwapTerminalMaxTwapWindow = /*#__PURE__*/ createReadContract(
  { abi: jbSwapTerminalAbi, functionName: 'MAX_TWAP_WINDOW' },
)

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"MIN_DEFAULT_POOL_CARDINALITY"`
 */
export const readJbSwapTerminalMinDefaultPoolCardinality =
  /*#__PURE__*/ createReadContract({
    abi: jbSwapTerminalAbi,
    functionName: 'MIN_DEFAULT_POOL_CARDINALITY',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"MIN_TWAP_SLIPPAGE_TOLERANCE"`
 */
export const readJbSwapTerminalMinTwapSlippageTolerance =
  /*#__PURE__*/ createReadContract({
    abi: jbSwapTerminalAbi,
    functionName: 'MIN_TWAP_SLIPPAGE_TOLERANCE',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"MIN_TWAP_WINDOW"`
 */
export const readJbSwapTerminalMinTwapWindow = /*#__PURE__*/ createReadContract(
  { abi: jbSwapTerminalAbi, functionName: 'MIN_TWAP_WINDOW' },
)

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"PERMISSIONS"`
 */
export const readJbSwapTerminalPermissions = /*#__PURE__*/ createReadContract({
  abi: jbSwapTerminalAbi,
  functionName: 'PERMISSIONS',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"PERMIT2"`
 */
export const readJbSwapTerminalPermit2 = /*#__PURE__*/ createReadContract({
  abi: jbSwapTerminalAbi,
  functionName: 'PERMIT2',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"PROJECTS"`
 */
export const readJbSwapTerminalProjects = /*#__PURE__*/ createReadContract({
  abi: jbSwapTerminalAbi,
  functionName: 'PROJECTS',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"SLIPPAGE_DENOMINATOR"`
 */
export const readJbSwapTerminalSlippageDenominator =
  /*#__PURE__*/ createReadContract({
    abi: jbSwapTerminalAbi,
    functionName: 'SLIPPAGE_DENOMINATOR',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"TOKEN_OUT"`
 */
export const readJbSwapTerminalTokenOut = /*#__PURE__*/ createReadContract({
  abi: jbSwapTerminalAbi,
  functionName: 'TOKEN_OUT',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"WETH"`
 */
export const readJbSwapTerminalWeth = /*#__PURE__*/ createReadContract({
  abi: jbSwapTerminalAbi,
  functionName: 'WETH',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"accountingContextForTokenOf"`
 */
export const readJbSwapTerminalAccountingContextForTokenOf =
  /*#__PURE__*/ createReadContract({
    abi: jbSwapTerminalAbi,
    functionName: 'accountingContextForTokenOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"accountingContextsOf"`
 */
export const readJbSwapTerminalAccountingContextsOf =
  /*#__PURE__*/ createReadContract({
    abi: jbSwapTerminalAbi,
    functionName: 'accountingContextsOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"currentSurplusOf"`
 */
export const readJbSwapTerminalCurrentSurplusOf =
  /*#__PURE__*/ createReadContract({
    abi: jbSwapTerminalAbi,
    functionName: 'currentSurplusOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"getPoolFor"`
 */
export const readJbSwapTerminalGetPoolFor = /*#__PURE__*/ createReadContract({
  abi: jbSwapTerminalAbi,
  functionName: 'getPoolFor',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"owner"`
 */
export const readJbSwapTerminalOwner = /*#__PURE__*/ createReadContract({
  abi: jbSwapTerminalAbi,
  functionName: 'owner',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"supportsInterface"`
 */
export const readJbSwapTerminalSupportsInterface =
  /*#__PURE__*/ createReadContract({
    abi: jbSwapTerminalAbi,
    functionName: 'supportsInterface',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"twapParamsOf"`
 */
export const readJbSwapTerminalTwapParamsOf = /*#__PURE__*/ createReadContract({
  abi: jbSwapTerminalAbi,
  functionName: 'twapParamsOf',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__
 */
export const writeJbSwapTerminal = /*#__PURE__*/ createWriteContract({
  abi: jbSwapTerminalAbi,
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"addAccountingContextsFor"`
 */
export const writeJbSwapTerminalAddAccountingContextsFor =
  /*#__PURE__*/ createWriteContract({
    abi: jbSwapTerminalAbi,
    functionName: 'addAccountingContextsFor',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"addDefaultPool"`
 */
export const writeJbSwapTerminalAddDefaultPool =
  /*#__PURE__*/ createWriteContract({
    abi: jbSwapTerminalAbi,
    functionName: 'addDefaultPool',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"addToBalanceOf"`
 */
export const writeJbSwapTerminalAddToBalanceOf =
  /*#__PURE__*/ createWriteContract({
    abi: jbSwapTerminalAbi,
    functionName: 'addToBalanceOf',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"addTwapParamsFor"`
 */
export const writeJbSwapTerminalAddTwapParamsFor =
  /*#__PURE__*/ createWriteContract({
    abi: jbSwapTerminalAbi,
    functionName: 'addTwapParamsFor',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"migrateBalanceOf"`
 */
export const writeJbSwapTerminalMigrateBalanceOf =
  /*#__PURE__*/ createWriteContract({
    abi: jbSwapTerminalAbi,
    functionName: 'migrateBalanceOf',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"pay"`
 */
export const writeJbSwapTerminalPay = /*#__PURE__*/ createWriteContract({
  abi: jbSwapTerminalAbi,
  functionName: 'pay',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"renounceOwnership"`
 */
export const writeJbSwapTerminalRenounceOwnership =
  /*#__PURE__*/ createWriteContract({
    abi: jbSwapTerminalAbi,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"transferOwnership"`
 */
export const writeJbSwapTerminalTransferOwnership =
  /*#__PURE__*/ createWriteContract({
    abi: jbSwapTerminalAbi,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"uniswapV3SwapCallback"`
 */
export const writeJbSwapTerminalUniswapV3SwapCallback =
  /*#__PURE__*/ createWriteContract({
    abi: jbSwapTerminalAbi,
    functionName: 'uniswapV3SwapCallback',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__
 */
export const simulateJbSwapTerminal = /*#__PURE__*/ createSimulateContract({
  abi: jbSwapTerminalAbi,
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"addAccountingContextsFor"`
 */
export const simulateJbSwapTerminalAddAccountingContextsFor =
  /*#__PURE__*/ createSimulateContract({
    abi: jbSwapTerminalAbi,
    functionName: 'addAccountingContextsFor',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"addDefaultPool"`
 */
export const simulateJbSwapTerminalAddDefaultPool =
  /*#__PURE__*/ createSimulateContract({
    abi: jbSwapTerminalAbi,
    functionName: 'addDefaultPool',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"addToBalanceOf"`
 */
export const simulateJbSwapTerminalAddToBalanceOf =
  /*#__PURE__*/ createSimulateContract({
    abi: jbSwapTerminalAbi,
    functionName: 'addToBalanceOf',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"addTwapParamsFor"`
 */
export const simulateJbSwapTerminalAddTwapParamsFor =
  /*#__PURE__*/ createSimulateContract({
    abi: jbSwapTerminalAbi,
    functionName: 'addTwapParamsFor',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"migrateBalanceOf"`
 */
export const simulateJbSwapTerminalMigrateBalanceOf =
  /*#__PURE__*/ createSimulateContract({
    abi: jbSwapTerminalAbi,
    functionName: 'migrateBalanceOf',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"pay"`
 */
export const simulateJbSwapTerminalPay = /*#__PURE__*/ createSimulateContract({
  abi: jbSwapTerminalAbi,
  functionName: 'pay',
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"renounceOwnership"`
 */
export const simulateJbSwapTerminalRenounceOwnership =
  /*#__PURE__*/ createSimulateContract({
    abi: jbSwapTerminalAbi,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"transferOwnership"`
 */
export const simulateJbSwapTerminalTransferOwnership =
  /*#__PURE__*/ createSimulateContract({
    abi: jbSwapTerminalAbi,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `functionName` set to `"uniswapV3SwapCallback"`
 */
export const simulateJbSwapTerminalUniswapV3SwapCallback =
  /*#__PURE__*/ createSimulateContract({
    abi: jbSwapTerminalAbi,
    functionName: 'uniswapV3SwapCallback',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbSwapTerminalAbi}__
 */
export const watchJbSwapTerminalEvent = /*#__PURE__*/ createWatchContractEvent({
  abi: jbSwapTerminalAbi,
})

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `eventName` set to `"AddToBalance"`
 */
export const watchJbSwapTerminalAddToBalanceEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbSwapTerminalAbi,
    eventName: 'AddToBalance',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `eventName` set to `"HookAfterRecordPay"`
 */
export const watchJbSwapTerminalHookAfterRecordPayEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbSwapTerminalAbi,
    eventName: 'HookAfterRecordPay',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `eventName` set to `"MigrateTerminal"`
 */
export const watchJbSwapTerminalMigrateTerminalEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbSwapTerminalAbi,
    eventName: 'MigrateTerminal',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `eventName` set to `"OwnershipTransferred"`
 */
export const watchJbSwapTerminalOwnershipTransferredEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbSwapTerminalAbi,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `eventName` set to `"Pay"`
 */
export const watchJbSwapTerminalPayEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbSwapTerminalAbi,
    eventName: 'Pay',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbSwapTerminalAbi}__ and `eventName` set to `"SetAccountingContext"`
 */
export const watchJbSwapTerminalSetAccountingContextEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbSwapTerminalAbi,
    eventName: 'SetAccountingContext',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__
 */
export const readJbTerminalStore = /*#__PURE__*/ createReadContract({
  abi: jbTerminalStoreAbi,
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"DIRECTORY"`
 */
export const readJbTerminalStoreDirectory = /*#__PURE__*/ createReadContract({
  abi: jbTerminalStoreAbi,
  functionName: 'DIRECTORY',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"PRICES"`
 */
export const readJbTerminalStorePrices = /*#__PURE__*/ createReadContract({
  abi: jbTerminalStoreAbi,
  functionName: 'PRICES',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"RULESETS"`
 */
export const readJbTerminalStoreRulesets = /*#__PURE__*/ createReadContract({
  abi: jbTerminalStoreAbi,
  functionName: 'RULESETS',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"balanceOf"`
 */
export const readJbTerminalStoreBalanceOf = /*#__PURE__*/ createReadContract({
  abi: jbTerminalStoreAbi,
  functionName: 'balanceOf',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"currentReclaimableSurplusOf"`
 */
export const readJbTerminalStoreCurrentReclaimableSurplusOf =
  /*#__PURE__*/ createReadContract({
    abi: jbTerminalStoreAbi,
    functionName: 'currentReclaimableSurplusOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"currentSurplusOf"`
 */
export const readJbTerminalStoreCurrentSurplusOf =
  /*#__PURE__*/ createReadContract({
    abi: jbTerminalStoreAbi,
    functionName: 'currentSurplusOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"currentTotalSurplusOf"`
 */
export const readJbTerminalStoreCurrentTotalSurplusOf =
  /*#__PURE__*/ createReadContract({
    abi: jbTerminalStoreAbi,
    functionName: 'currentTotalSurplusOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"usedPayoutLimitOf"`
 */
export const readJbTerminalStoreUsedPayoutLimitOf =
  /*#__PURE__*/ createReadContract({
    abi: jbTerminalStoreAbi,
    functionName: 'usedPayoutLimitOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"usedSurplusAllowanceOf"`
 */
export const readJbTerminalStoreUsedSurplusAllowanceOf =
  /*#__PURE__*/ createReadContract({
    abi: jbTerminalStoreAbi,
    functionName: 'usedSurplusAllowanceOf',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__
 */
export const writeJbTerminalStore = /*#__PURE__*/ createWriteContract({
  abi: jbTerminalStoreAbi,
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordAddedBalanceFor"`
 */
export const writeJbTerminalStoreRecordAddedBalanceFor =
  /*#__PURE__*/ createWriteContract({
    abi: jbTerminalStoreAbi,
    functionName: 'recordAddedBalanceFor',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordCashOutFor"`
 */
export const writeJbTerminalStoreRecordCashOutFor =
  /*#__PURE__*/ createWriteContract({
    abi: jbTerminalStoreAbi,
    functionName: 'recordCashOutFor',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordPaymentFrom"`
 */
export const writeJbTerminalStoreRecordPaymentFrom =
  /*#__PURE__*/ createWriteContract({
    abi: jbTerminalStoreAbi,
    functionName: 'recordPaymentFrom',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordPayoutFor"`
 */
export const writeJbTerminalStoreRecordPayoutFor =
  /*#__PURE__*/ createWriteContract({
    abi: jbTerminalStoreAbi,
    functionName: 'recordPayoutFor',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordTerminalMigration"`
 */
export const writeJbTerminalStoreRecordTerminalMigration =
  /*#__PURE__*/ createWriteContract({
    abi: jbTerminalStoreAbi,
    functionName: 'recordTerminalMigration',
  })

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordUsedAllowanceOf"`
 */
export const writeJbTerminalStoreRecordUsedAllowanceOf =
  /*#__PURE__*/ createWriteContract({
    abi: jbTerminalStoreAbi,
    functionName: 'recordUsedAllowanceOf',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__
 */
export const simulateJbTerminalStore = /*#__PURE__*/ createSimulateContract({
  abi: jbTerminalStoreAbi,
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordAddedBalanceFor"`
 */
export const simulateJbTerminalStoreRecordAddedBalanceFor =
  /*#__PURE__*/ createSimulateContract({
    abi: jbTerminalStoreAbi,
    functionName: 'recordAddedBalanceFor',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordCashOutFor"`
 */
export const simulateJbTerminalStoreRecordCashOutFor =
  /*#__PURE__*/ createSimulateContract({
    abi: jbTerminalStoreAbi,
    functionName: 'recordCashOutFor',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordPaymentFrom"`
 */
export const simulateJbTerminalStoreRecordPaymentFrom =
  /*#__PURE__*/ createSimulateContract({
    abi: jbTerminalStoreAbi,
    functionName: 'recordPaymentFrom',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordPayoutFor"`
 */
export const simulateJbTerminalStoreRecordPayoutFor =
  /*#__PURE__*/ createSimulateContract({
    abi: jbTerminalStoreAbi,
    functionName: 'recordPayoutFor',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordTerminalMigration"`
 */
export const simulateJbTerminalStoreRecordTerminalMigration =
  /*#__PURE__*/ createSimulateContract({
    abi: jbTerminalStoreAbi,
    functionName: 'recordTerminalMigration',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordUsedAllowanceOf"`
 */
export const simulateJbTerminalStoreRecordUsedAllowanceOf =
  /*#__PURE__*/ createSimulateContract({
    abi: jbTerminalStoreAbi,
    functionName: 'recordUsedAllowanceOf',
  })

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbTokensAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const readJbTokens = /*#__PURE__*/ createReadContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"DIRECTORY"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const readJbTokensDirectory = /*#__PURE__*/ createReadContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
  functionName: 'DIRECTORY',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"TOKEN"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const readJbTokensToken = /*#__PURE__*/ createReadContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
  functionName: 'TOKEN',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"creditBalanceOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const readJbTokensCreditBalanceOf = /*#__PURE__*/ createReadContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
  functionName: 'creditBalanceOf',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"projectIdOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const readJbTokensProjectIdOf = /*#__PURE__*/ createReadContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
  functionName: 'projectIdOf',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"tokenOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const readJbTokensTokenOf = /*#__PURE__*/ createReadContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
  functionName: 'tokenOf',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"totalBalanceOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const readJbTokensTotalBalanceOf = /*#__PURE__*/ createReadContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
  functionName: 'totalBalanceOf',
})

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"totalCreditSupplyOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const readJbTokensTotalCreditSupplyOf = /*#__PURE__*/ createReadContract(
  {
    abi: jbTokensAbi,
    address: jbTokensAddress,
    functionName: 'totalCreditSupplyOf',
  },
)

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"totalSupplyOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const readJbTokensTotalSupplyOf = /*#__PURE__*/ createReadContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
  functionName: 'totalSupplyOf',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbTokensAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const writeJbTokens = /*#__PURE__*/ createWriteContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"burnFrom"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const writeJbTokensBurnFrom = /*#__PURE__*/ createWriteContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
  functionName: 'burnFrom',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"claimTokensFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const writeJbTokensClaimTokensFor = /*#__PURE__*/ createWriteContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
  functionName: 'claimTokensFor',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"deployERC20For"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const writeJbTokensDeployErc20For = /*#__PURE__*/ createWriteContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
  functionName: 'deployERC20For',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"mintFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const writeJbTokensMintFor = /*#__PURE__*/ createWriteContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
  functionName: 'mintFor',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"setTokenFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const writeJbTokensSetTokenFor = /*#__PURE__*/ createWriteContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
  functionName: 'setTokenFor',
})

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"transferCreditsFrom"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const writeJbTokensTransferCreditsFrom =
  /*#__PURE__*/ createWriteContract({
    abi: jbTokensAbi,
    address: jbTokensAddress,
    functionName: 'transferCreditsFrom',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbTokensAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const simulateJbTokens = /*#__PURE__*/ createSimulateContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"burnFrom"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const simulateJbTokensBurnFrom = /*#__PURE__*/ createSimulateContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
  functionName: 'burnFrom',
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"claimTokensFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const simulateJbTokensClaimTokensFor =
  /*#__PURE__*/ createSimulateContract({
    abi: jbTokensAbi,
    address: jbTokensAddress,
    functionName: 'claimTokensFor',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"deployERC20For"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const simulateJbTokensDeployErc20For =
  /*#__PURE__*/ createSimulateContract({
    abi: jbTokensAbi,
    address: jbTokensAddress,
    functionName: 'deployERC20For',
  })

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"mintFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const simulateJbTokensMintFor = /*#__PURE__*/ createSimulateContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
  functionName: 'mintFor',
})

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"setTokenFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const simulateJbTokensSetTokenFor = /*#__PURE__*/ createSimulateContract(
  { abi: jbTokensAbi, address: jbTokensAddress, functionName: 'setTokenFor' },
)

/**
 * Wraps __{@link simulateContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"transferCreditsFrom"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const simulateJbTokensTransferCreditsFrom =
  /*#__PURE__*/ createSimulateContract({
    abi: jbTokensAbi,
    address: jbTokensAddress,
    functionName: 'transferCreditsFrom',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbTokensAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const watchJbTokensEvent = /*#__PURE__*/ createWatchContractEvent({
  abi: jbTokensAbi,
  address: jbTokensAddress,
})

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbTokensAbi}__ and `eventName` set to `"Burn"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const watchJbTokensBurnEvent = /*#__PURE__*/ createWatchContractEvent({
  abi: jbTokensAbi,
  address: jbTokensAddress,
  eventName: 'Burn',
})

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbTokensAbi}__ and `eventName` set to `"ClaimTokens"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const watchJbTokensClaimTokensEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbTokensAbi,
    address: jbTokensAddress,
    eventName: 'ClaimTokens',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbTokensAbi}__ and `eventName` set to `"DeployERC20"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const watchJbTokensDeployErc20Event =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbTokensAbi,
    address: jbTokensAddress,
    eventName: 'DeployERC20',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbTokensAbi}__ and `eventName` set to `"Mint"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const watchJbTokensMintEvent = /*#__PURE__*/ createWatchContractEvent({
  abi: jbTokensAbi,
  address: jbTokensAddress,
  eventName: 'Mint',
})

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbTokensAbi}__ and `eventName` set to `"SetToken"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const watchJbTokensSetTokenEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbTokensAbi,
    address: jbTokensAddress,
    eventName: 'SetToken',
  })

/**
 * Wraps __{@link watchContractEvent}__ with `abi` set to __{@link jbTokensAbi}__ and `eventName` set to `"TransferCredits"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xb4a4d8ad7636e36d6ff3c7c664f9f797a532bbb2)
 */
export const watchJbTokensTransferCreditsEvent =
  /*#__PURE__*/ createWatchContractEvent({
    abi: jbTokensAbi,
    address: jbTokensAddress,
    eventName: 'TransferCredits',
  })

  /**
   * Addresses to use in JB project deployments.
   */
  export const jbProjectDeploymentAddresses = {
  "JBMultiTerminal": {
    "84532": "0x50fe7b6720901b74026ad714d9b393eda7e39974",
    "421614": "0x50fe7b6720901b74026ad714d9b393eda7e39974",
    "11155111": "0x50fe7b6720901b74026ad714d9b393eda7e39974",
    "11155420": "0x50fe7b6720901b74026ad714d9b393eda7e39974"
  },
  "JBController": {
    "84532": "0xd1f037efebf187a59520bcce9d1dabe5ccfab2c3",
    "421614": "0xd1f037efebf187a59520bcce9d1dabe5ccfab2c3",
    "11155111": "0xd1f037efebf187a59520bcce9d1dabe5ccfab2c3",
    "11155420": "0xd1f037efebf187a59520bcce9d1dabe5ccfab2c3"
  },
  "JB721TiersHookStore": {
    "84532": "0xdc162a8a6decc7f27fd4cff58d69b9cc0c7c2ea1",
    "421614": "0xdc162a8a6decc7f27fd4cff58d69b9cc0c7c2ea1",
    "11155111": "0xdc162a8a6decc7f27fd4cff58d69b9cc0c7c2ea1",
    "11155420": "0xdc162a8a6decc7f27fd4cff58d69b9cc0c7c2ea1"
  },
  "JBBuybackHook": {
    "84532": "0x5efb0f2d288b47a4e74ad26b8d6c8f1dffa406af",
    "421614": "0x41a44e107eba275f8a1d06b8c69584213f58a16c",
    "11155111": "0x06b57674d0cab6744385afad69f79489cc75557d",
    "11155420": "0x5efb0f2d288b47a4e74ad26b8d6c8f1dffa406af"
  },
  "JBSwapTerminal": {
    "84532": "0x11b23acbbdd734e1e6edf567463ea2cdbea07c7d",
    "421614": "0xd5e24f5ce6d10177241aecb6eff426db455d6de5",
    "11155111": "0xddfbea6f25e06a55bf48c9d68d20ba06097b9db5",
    "11155420": "0x11b23acbbdd734e1e6edf567463ea2cdbea07c7d"
  }
};