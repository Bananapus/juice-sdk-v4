import {
  createUseReadContract,
  createUseWriteContract,
  createUseSimulateContract,
  createUseWatchContractEvent,
} from 'wagmi/codegen'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JB721TiersHook
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**

*/
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
          { name: 'allowOwnerMint', internalType: 'bool', type: 'bool' },
          {
            name: 'useReserveBeneficiaryAsDefault',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'transfersPausable', internalType: 'bool', type: 'bool' },
          { name: 'useVotingUnits', internalType: 'bool', type: 'bool' },
          { name: 'cannotBeRemoved', internalType: 'bool', type: 'bool' },
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
              { name: 'value', internalType: 'uint256', type: 'uint256' },
              { name: 'decimals', internalType: 'uint256', type: 'uint256' },
              { name: 'currency', internalType: 'uint256', type: 'uint256' },
            ],
          },
          {
            name: 'forwardedAmount',
            internalType: 'struct JBTokenAmount',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
              { name: 'decimals', internalType: 'uint256', type: 'uint256' },
              { name: 'currency', internalType: 'uint256', type: 'uint256' },
            ],
          },
          { name: 'weight', internalType: 'uint256', type: 'uint256' },
          {
            name: 'projectTokenCount',
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
        internalType: 'struct JBAfterRedeemRecordedContext',
        type: 'tuple',
        components: [
          { name: 'holder', internalType: 'address', type: 'address' },
          { name: 'projectId', internalType: 'uint256', type: 'uint256' },
          { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
          { name: 'redeemCount', internalType: 'uint256', type: 'uint256' },
          {
            name: 'reclaimedAmount',
            internalType: 'struct JBTokenAmount',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
              { name: 'decimals', internalType: 'uint256', type: 'uint256' },
              { name: 'currency', internalType: 'uint256', type: 'uint256' },
            ],
          },
          {
            name: 'forwardedAmount',
            internalType: 'struct JBTokenAmount',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
              { name: 'decimals', internalType: 'uint256', type: 'uint256' },
              { name: 'currency', internalType: 'uint256', type: 'uint256' },
            ],
          },
          { name: 'redemptionRate', internalType: 'uint256', type: 'uint256' },
          {
            name: 'beneficiary',
            internalType: 'address payable',
            type: 'address',
          },
          { name: 'hookMetadata', internalType: 'bytes', type: 'bytes' },
          { name: 'redeemerMetadata', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    name: 'afterRedeemRecordedWith',
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
              { name: 'value', internalType: 'uint256', type: 'uint256' },
              { name: 'decimals', internalType: 'uint256', type: 'uint256' },
              { name: 'currency', internalType: 'uint256', type: 'uint256' },
            ],
          },
          { name: 'projectId', internalType: 'uint256', type: 'uint256' },
          { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
          { name: 'beneficiary', internalType: 'address', type: 'address' },
          { name: 'weight', internalType: 'uint256', type: 'uint256' },
          { name: 'reservedRate', internalType: 'uint256', type: 'uint256' },
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
      {
        name: 'context',
        internalType: 'struct JBBeforeRedeemRecordedContext',
        type: 'tuple',
        components: [
          { name: 'terminal', internalType: 'address', type: 'address' },
          { name: 'holder', internalType: 'address', type: 'address' },
          { name: 'projectId', internalType: 'uint256', type: 'uint256' },
          { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
          { name: 'redeemCount', internalType: 'uint256', type: 'uint256' },
          { name: 'totalSupply', internalType: 'uint256', type: 'uint256' },
          {
            name: 'surplus',
            internalType: 'struct JBTokenAmount',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
              { name: 'decimals', internalType: 'uint256', type: 'uint256' },
              { name: 'currency', internalType: 'uint256', type: 'uint256' },
            ],
          },
          { name: 'useTotalSurplus', internalType: 'bool', type: 'bool' },
          { name: 'redemptionRate', internalType: 'uint256', type: 'uint256' },
          { name: 'metadata', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    name: 'beforeRedeemRecordedWith',
    outputs: [
      { name: 'redemptionRate', internalType: 'uint256', type: 'uint256' },
      { name: 'redeemCount', internalType: 'uint256', type: 'uint256' },
      { name: 'totalSupply', internalType: 'uint256', type: 'uint256' },
      {
        name: 'hookSpecifications',
        internalType: 'struct JBRedeemHookSpecification[]',
        type: 'tuple[]',
        components: [
          {
            name: 'hook',
            internalType: 'contract IJBRedeemHook',
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
      {
        name: 'rulesets',
        internalType: 'contract IJBRulesets',
        type: 'address',
      },
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
              { name: 'allowOwnerMint', internalType: 'bool', type: 'bool' },
              {
                name: 'useReserveBeneficiaryAsDefault',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'transfersPausable', internalType: 'bool', type: 'bool' },
              { name: 'useVotingUnits', internalType: 'bool', type: 'bool' },
              { name: 'cannotBeRemoved', internalType: 'bool', type: 'bool' },
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
        name: 'store',
        internalType: 'contract IJB721TiersHookStore',
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
      {
        name: 'reserveMintConfigs',
        internalType: 'struct JB721TiersMintReservesConfig[]',
        type: 'tuple[]',
        components: [
          { name: 'tierId', internalType: 'uint256', type: 'uint256' },
          { name: 'count', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    name: 'mintPendingReservesFor',
    outputs: [],
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
    inputs: [
      { name: 'tokenIds', internalType: 'uint256[]', type: 'uint256[]' },
      {
        name: '',
        internalType: 'struct JBBeforeRedeemRecordedContext',
        type: 'tuple',
        components: [
          { name: 'terminal', internalType: 'address', type: 'address' },
          { name: 'holder', internalType: 'address', type: 'address' },
          { name: 'projectId', internalType: 'uint256', type: 'uint256' },
          { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
          { name: 'redeemCount', internalType: 'uint256', type: 'uint256' },
          { name: 'totalSupply', internalType: 'uint256', type: 'uint256' },
          {
            name: 'surplus',
            internalType: 'struct JBTokenAmount',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
              { name: 'decimals', internalType: 'uint256', type: 'uint256' },
              { name: 'currency', internalType: 'uint256', type: 'uint256' },
            ],
          },
          { name: 'useTotalSurplus', internalType: 'bool', type: 'bool' },
          { name: 'redemptionRate', internalType: 'uint256', type: 'uint256' },
          { name: 'metadata', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    name: 'redemptionWeightOf',
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
        internalType: 'struct JBBeforeRedeemRecordedContext',
        type: 'tuple',
        components: [
          { name: 'terminal', internalType: 'address', type: 'address' },
          { name: 'holder', internalType: 'address', type: 'address' },
          { name: 'projectId', internalType: 'uint256', type: 'uint256' },
          { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
          { name: 'redeemCount', internalType: 'uint256', type: 'uint256' },
          { name: 'totalSupply', internalType: 'uint256', type: 'uint256' },
          {
            name: 'surplus',
            internalType: 'struct JBTokenAmount',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
              { name: 'decimals', internalType: 'uint256', type: 'uint256' },
              { name: 'currency', internalType: 'uint256', type: 'uint256' },
            ],
          },
          { name: 'useTotalSurplus', internalType: 'bool', type: 'bool' },
          { name: 'redemptionRate', internalType: 'uint256', type: 'uint256' },
          { name: 'metadata', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    name: 'totalRedemptionWeight',
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
          { name: 'allowOwnerMint', internalType: 'bool', type: 'bool' },
          {
            name: 'useReserveBeneficiaryAsDefault',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'transfersPausable', internalType: 'bool', type: 'bool' },
          { name: 'useVotingUnits', internalType: 'bool', type: 'bool' },
          { name: 'cannotBeRemoved', internalType: 'bool', type: 'bool' },
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
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'newIndex',
        internalType: 'uint8',
        type: 'uint8',
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
      {
        name: 'contractUri',
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
        name: 'encodedIPFSUri',
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
        name: 'newResolver',
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
  { type: 'error', inputs: [], name: 'INVALID_NEW_OWNER' },
  { type: 'error', inputs: [], name: 'INVALID_PAY' },
  { type: 'error', inputs: [], name: 'INVALID_REDEEM' },
  { type: 'error', inputs: [], name: 'MINT_RESERVE_NFTS_PAUSED' },
  { type: 'error', inputs: [], name: 'OVERSPENDING' },
  {
    type: 'error',
    inputs: [
      { name: 'x', internalType: 'uint256', type: 'uint256' },
      { name: 'y', internalType: 'uint256', type: 'uint256' },
      { name: 'denominator', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'PRBMath_MulDiv_Overflow',
  },
  { type: 'error', inputs: [], name: 'TIER_TRANSFERS_PAUSED' },
  { type: 'error', inputs: [], name: 'UNAUTHORIZED' },
  {
    type: 'error',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'UNAUTHORIZED_TOKEN',
  },
  { type: 'error', inputs: [], name: 'UNEXPECTED_TOKEN_REDEEMED' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JB721TiersHookDeployer
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x554CE80D78f5438c73a9759D8BBb52a382138A59)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x554CE80D78f5438c73a9759D8BBb52a382138A59)
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
          {
            name: 'rulesets',
            internalType: 'contract IJBRulesets',
            type: 'address',
          },
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
        name: 'newHook',
        internalType: 'contract IJB721TiersHook',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'HookDeployed',
  },
  { type: 'error', inputs: [], name: 'ERC1167FailedCreateClone' },
] as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x554CE80D78f5438c73a9759D8BBb52a382138A59)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x554CE80D78f5438c73a9759D8BBb52a382138A59)
 */
export const jb721TiersHookDeployerAddress = {
  11155111: '0x554CE80D78f5438c73a9759D8BBb52a382138A59',
  11155420: '0x554CE80D78f5438c73a9759D8BBb52a382138A59',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x554CE80D78f5438c73a9759D8BBb52a382138A59)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x554CE80D78f5438c73a9759D8BBb52a382138A59)
 */
export const jb721TiersHookDeployerConfig = {
  address: jb721TiersHookDeployerAddress,
  abi: jb721TiersHookDeployerAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBAddressRegistry
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x989566Bf9fF4CffA55a98ADa7dc3E58b2a0a19c6)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x989566Bf9fF4CffA55a98ADa7dc3E58b2a0a19c6)
 */
export const jbAddressRegistryAbi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
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
    ],
    name: 'AddressRegistered',
  },
] as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x989566Bf9fF4CffA55a98ADa7dc3E58b2a0a19c6)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x989566Bf9fF4CffA55a98ADa7dc3E58b2a0a19c6)
 */
export const jbAddressRegistryAddress = {
  11155111: '0x989566Bf9fF4CffA55a98ADa7dc3E58b2a0a19c6',
  11155420: '0x989566Bf9fF4CffA55a98ADa7dc3E58b2a0a19c6',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x989566Bf9fF4CffA55a98ADa7dc3E58b2a0a19c6)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x989566Bf9fF4CffA55a98ADa7dc3E58b2a0a19c6)
 */
export const jbAddressRegistryConfig = {
  address: jbAddressRegistryAddress,
  abi: jbAddressRegistryAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBController
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const jbControllerAbi = [
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
      {
        name: 'directory',
        internalType: 'contract IJBDirectory',
        type: 'address',
      },
      {
        name: 'rulesets',
        internalType: 'contract IJBRulesets',
        type: 'address',
      },
      { name: 'tokens', internalType: 'contract IJBTokens', type: 'address' },
      { name: 'splits', internalType: 'contract IJBSplits', type: 'address' },
      {
        name: 'fundAccessLimits',
        internalType: 'contract IJBFundAccessLimits',
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
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
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
          { name: 'cycleNumber', internalType: 'uint256', type: 'uint256' },
          { name: 'id', internalType: 'uint256', type: 'uint256' },
          { name: 'basedOnId', internalType: 'uint256', type: 'uint256' },
          { name: 'start', internalType: 'uint256', type: 'uint256' },
          { name: 'duration', internalType: 'uint256', type: 'uint256' },
          { name: 'weight', internalType: 'uint256', type: 'uint256' },
          { name: 'decayRate', internalType: 'uint256', type: 'uint256' },
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
          { name: 'reservedRate', internalType: 'uint256', type: 'uint256' },
          { name: 'redemptionRate', internalType: 'uint256', type: 'uint256' },
          { name: 'baseCurrency', internalType: 'uint256', type: 'uint256' },
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
          { name: 'ownerMustSendPayouts', internalType: 'bool', type: 'bool' },
          { name: 'holdFees', internalType: 'bool', type: 'bool' },
          {
            name: 'useTotalSurplusForRedemptions',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'useDataHookForPay', internalType: 'bool', type: 'bool' },
          { name: 'useDataHookForRedeem', internalType: 'bool', type: 'bool' },
          { name: 'dataHook', internalType: 'address', type: 'address' },
          { name: 'metadata', internalType: 'uint256', type: 'uint256' },
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
          { name: 'cycleNumber', internalType: 'uint256', type: 'uint256' },
          { name: 'id', internalType: 'uint256', type: 'uint256' },
          { name: 'basedOnId', internalType: 'uint256', type: 'uint256' },
          { name: 'start', internalType: 'uint256', type: 'uint256' },
          { name: 'duration', internalType: 'uint256', type: 'uint256' },
          { name: 'weight', internalType: 'uint256', type: 'uint256' },
          { name: 'decayRate', internalType: 'uint256', type: 'uint256' },
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
          { name: 'reservedRate', internalType: 'uint256', type: 'uint256' },
          { name: 'redemptionRate', internalType: 'uint256', type: 'uint256' },
          { name: 'baseCurrency', internalType: 'uint256', type: 'uint256' },
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
          { name: 'ownerMustSendPayouts', internalType: 'bool', type: 'bool' },
          { name: 'holdFees', internalType: 'bool', type: 'bool' },
          {
            name: 'useTotalSurplusForRedemptions',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'useDataHookForPay', internalType: 'bool', type: 'bool' },
          { name: 'useDataHookForRedeem', internalType: 'bool', type: 'bool' },
          { name: 'dataHook', internalType: 'address', type: 'address' },
          { name: 'metadata', internalType: 'uint256', type: 'uint256' },
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
          { name: 'cycleNumber', internalType: 'uint256', type: 'uint256' },
          { name: 'id', internalType: 'uint256', type: 'uint256' },
          { name: 'basedOnId', internalType: 'uint256', type: 'uint256' },
          { name: 'start', internalType: 'uint256', type: 'uint256' },
          { name: 'duration', internalType: 'uint256', type: 'uint256' },
          { name: 'weight', internalType: 'uint256', type: 'uint256' },
          { name: 'decayRate', internalType: 'uint256', type: 'uint256' },
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
          { name: 'reservedRate', internalType: 'uint256', type: 'uint256' },
          { name: 'redemptionRate', internalType: 'uint256', type: 'uint256' },
          { name: 'baseCurrency', internalType: 'uint256', type: 'uint256' },
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
          { name: 'ownerMustSendPayouts', internalType: 'bool', type: 'bool' },
          { name: 'holdFees', internalType: 'bool', type: 'bool' },
          {
            name: 'useTotalSurplusForRedemptions',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'useDataHookForPay', internalType: 'bool', type: 'bool' },
          { name: 'useDataHookForRedeem', internalType: 'bool', type: 'bool' },
          { name: 'dataHook', internalType: 'address', type: 'address' },
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
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'duration', internalType: 'uint256', type: 'uint256' },
          { name: 'weight', internalType: 'uint256', type: 'uint256' },
          { name: 'decayRate', internalType: 'uint256', type: 'uint256' },
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
                name: 'reservedRate',
                internalType: 'uint256',
                type: 'uint256',
              },
              {
                name: 'redemptionRate',
                internalType: 'uint256',
                type: 'uint256',
              },
              {
                name: 'baseCurrency',
                internalType: 'uint256',
                type: 'uint256',
              },
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
                name: 'ownerMustSendPayouts',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'holdFees', internalType: 'bool', type: 'bool' },
              {
                name: 'useTotalSurplusForRedemptions',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'useDataHookForPay', internalType: 'bool', type: 'bool' },
              {
                name: 'useDataHookForRedeem',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'dataHook', internalType: 'address', type: 'address' },
              { name: 'metadata', internalType: 'uint256', type: 'uint256' },
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
                    name: 'preferAddToBalance',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  { name: 'percent', internalType: 'uint256', type: 'uint256' },
                  {
                    name: 'projectId',
                    internalType: 'uint256',
                    type: 'uint256',
                  },
                  {
                    name: 'beneficiary',
                    internalType: 'address payable',
                    type: 'address',
                  },
                  {
                    name: 'lockedUntil',
                    internalType: 'uint256',
                    type: 'uint256',
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
                  { name: 'amount', internalType: 'uint256', type: 'uint256' },
                  {
                    name: 'currency',
                    internalType: 'uint256',
                    type: 'uint256',
                  },
                ],
              },
              {
                name: 'surplusAllowances',
                internalType: 'struct JBCurrencyAmount[]',
                type: 'tuple[]',
                components: [
                  { name: 'amount', internalType: 'uint256', type: 'uint256' },
                  {
                    name: 'currency',
                    internalType: 'uint256',
                    type: 'uint256',
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
            name: 'tokensToAccept',
            internalType: 'address[]',
            type: 'address[]',
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
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'duration', internalType: 'uint256', type: 'uint256' },
          { name: 'weight', internalType: 'uint256', type: 'uint256' },
          { name: 'decayRate', internalType: 'uint256', type: 'uint256' },
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
                name: 'reservedRate',
                internalType: 'uint256',
                type: 'uint256',
              },
              {
                name: 'redemptionRate',
                internalType: 'uint256',
                type: 'uint256',
              },
              {
                name: 'baseCurrency',
                internalType: 'uint256',
                type: 'uint256',
              },
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
                name: 'ownerMustSendPayouts',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'holdFees', internalType: 'bool', type: 'bool' },
              {
                name: 'useTotalSurplusForRedemptions',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'useDataHookForPay', internalType: 'bool', type: 'bool' },
              {
                name: 'useDataHookForRedeem',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'dataHook', internalType: 'address', type: 'address' },
              { name: 'metadata', internalType: 'uint256', type: 'uint256' },
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
                    name: 'preferAddToBalance',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  { name: 'percent', internalType: 'uint256', type: 'uint256' },
                  {
                    name: 'projectId',
                    internalType: 'uint256',
                    type: 'uint256',
                  },
                  {
                    name: 'beneficiary',
                    internalType: 'address payable',
                    type: 'address',
                  },
                  {
                    name: 'lockedUntil',
                    internalType: 'uint256',
                    type: 'uint256',
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
                  { name: 'amount', internalType: 'uint256', type: 'uint256' },
                  {
                    name: 'currency',
                    internalType: 'uint256',
                    type: 'uint256',
                  },
                ],
              },
              {
                name: 'surplusAllowances',
                internalType: 'struct JBCurrencyAmount[]',
                type: 'tuple[]',
                components: [
                  { name: 'amount', internalType: 'uint256', type: 'uint256' },
                  {
                    name: 'currency',
                    internalType: 'uint256',
                    type: 'uint256',
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
            name: 'tokensToAccept',
            internalType: 'address[]',
            type: 'address[]',
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
      { name: 'useReservedRate', internalType: 'bool', type: 'bool' },
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
    inputs: [
      {
        name: 'terminal',
        internalType: 'contract IJBTerminal',
        type: 'address',
      },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'contract IJBToken', type: 'address' },
      { name: 'splitAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'beneficiary', internalType: 'address', type: 'address' },
      { name: 'metadata', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'payReservedTokenToTerminal',
    outputs: [],
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
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'duration', internalType: 'uint256', type: 'uint256' },
          { name: 'weight', internalType: 'uint256', type: 'uint256' },
          { name: 'decayRate', internalType: 'uint256', type: 'uint256' },
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
                name: 'reservedRate',
                internalType: 'uint256',
                type: 'uint256',
              },
              {
                name: 'redemptionRate',
                internalType: 'uint256',
                type: 'uint256',
              },
              {
                name: 'baseCurrency',
                internalType: 'uint256',
                type: 'uint256',
              },
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
                name: 'ownerMustSendPayouts',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'holdFees', internalType: 'bool', type: 'bool' },
              {
                name: 'useTotalSurplusForRedemptions',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'useDataHookForPay', internalType: 'bool', type: 'bool' },
              {
                name: 'useDataHookForRedeem',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'dataHook', internalType: 'address', type: 'address' },
              { name: 'metadata', internalType: 'uint256', type: 'uint256' },
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
                    name: 'preferAddToBalance',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  { name: 'percent', internalType: 'uint256', type: 'uint256' },
                  {
                    name: 'projectId',
                    internalType: 'uint256',
                    type: 'uint256',
                  },
                  {
                    name: 'beneficiary',
                    internalType: 'address payable',
                    type: 'address',
                  },
                  {
                    name: 'lockedUntil',
                    internalType: 'uint256',
                    type: 'uint256',
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
                  { name: 'amount', internalType: 'uint256', type: 'uint256' },
                  {
                    name: 'currency',
                    internalType: 'uint256',
                    type: 'uint256',
                  },
                ],
              },
              {
                name: 'surplusAllowances',
                internalType: 'struct JBCurrencyAmount[]',
                type: 'tuple[]',
                components: [
                  { name: 'amount', internalType: 'uint256', type: 'uint256' },
                  {
                    name: 'currency',
                    internalType: 'uint256',
                    type: 'uint256',
                  },
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
    inputs: [
      { name: 'from', internalType: 'contract IERC165', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'receiveMigrationFrom',
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
    name: 'rulesetsOf',
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
              { name: 'cycleNumber', internalType: 'uint256', type: 'uint256' },
              { name: 'id', internalType: 'uint256', type: 'uint256' },
              { name: 'basedOnId', internalType: 'uint256', type: 'uint256' },
              { name: 'start', internalType: 'uint256', type: 'uint256' },
              { name: 'duration', internalType: 'uint256', type: 'uint256' },
              { name: 'weight', internalType: 'uint256', type: 'uint256' },
              { name: 'decayRate', internalType: 'uint256', type: 'uint256' },
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
                name: 'reservedRate',
                internalType: 'uint256',
                type: 'uint256',
              },
              {
                name: 'redemptionRate',
                internalType: 'uint256',
                type: 'uint256',
              },
              {
                name: 'baseCurrency',
                internalType: 'uint256',
                type: 'uint256',
              },
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
                name: 'ownerMustSendPayouts',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'holdFees', internalType: 'bool', type: 'bool' },
              {
                name: 'useTotalSurplusForRedemptions',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'useDataHookForPay', internalType: 'bool', type: 'bool' },
              {
                name: 'useDataHookForRedeem',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'dataHook', internalType: 'address', type: 'address' },
              { name: 'metadata', internalType: 'uint256', type: 'uint256' },
            ],
          },
        ],
      },
    ],
    stateMutability: 'view',
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
              {
                name: 'preferAddToBalance',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'percent', internalType: 'uint256', type: 'uint256' },
              { name: 'projectId', internalType: 'uint256', type: 'uint256' },
              {
                name: 'beneficiary',
                internalType: 'address payable',
                type: 'address',
              },
              { name: 'lockedUntil', internalType: 'uint256', type: 'uint256' },
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
      { name: 'metadata', internalType: 'string', type: 'string' },
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
    stateMutability: 'view',
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
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
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
          { name: 'cycleNumber', internalType: 'uint256', type: 'uint256' },
          { name: 'id', internalType: 'uint256', type: 'uint256' },
          { name: 'basedOnId', internalType: 'uint256', type: 'uint256' },
          { name: 'start', internalType: 'uint256', type: 'uint256' },
          { name: 'duration', internalType: 'uint256', type: 'uint256' },
          { name: 'weight', internalType: 'uint256', type: 'uint256' },
          { name: 'decayRate', internalType: 'uint256', type: 'uint256' },
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
          { name: 'reservedRate', internalType: 'uint256', type: 'uint256' },
          { name: 'redemptionRate', internalType: 'uint256', type: 'uint256' },
          { name: 'baseCurrency', internalType: 'uint256', type: 'uint256' },
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
          { name: 'ownerMustSendPayouts', internalType: 'bool', type: 'bool' },
          { name: 'holdFees', internalType: 'bool', type: 'bool' },
          {
            name: 'useTotalSurplusForRedemptions',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'useDataHookForPay', internalType: 'bool', type: 'bool' },
          { name: 'useDataHookForRedeem', internalType: 'bool', type: 'bool' },
          { name: 'dataHook', internalType: 'address', type: 'address' },
          { name: 'metadata', internalType: 'uint256', type: 'uint256' },
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
        name: 'metadata',
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
        name: 'reservedRate',
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
          { name: 'preferAddToBalance', internalType: 'bool', type: 'bool' },
          { name: 'percent', internalType: 'uint256', type: 'uint256' },
          { name: 'projectId', internalType: 'uint256', type: 'uint256' },
          {
            name: 'beneficiary',
            internalType: 'address payable',
            type: 'address',
          },
          { name: 'lockedUntil', internalType: 'uint256', type: 'uint256' },
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
          { name: 'preferAddToBalance', internalType: 'bool', type: 'bool' },
          { name: 'percent', internalType: 'uint256', type: 'uint256' },
          { name: 'projectId', internalType: 'uint256', type: 'uint256' },
          {
            name: 'beneficiary',
            internalType: 'address payable',
            type: 'address',
          },
          { name: 'lockedUntil', internalType: 'uint256', type: 'uint256' },
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
        name: 'beneficiary',
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
        name: 'beneficiaryTokenCount',
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
      {
        name: 'metadata',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'SetMetadata',
  },
  {
    type: 'error',
    inputs: [{ name: 'target', internalType: 'address', type: 'address' }],
    name: 'AddressEmptyCode',
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'AddressInsufficientBalance',
  },
  { type: 'error', inputs: [], name: 'CONTROLLER_MIGRATION_NOT_ALLOWED' },
  { type: 'error', inputs: [], name: 'CREDIT_TRANSFERS_PAUSED' },
  { type: 'error', inputs: [], name: 'FailedInnerCall' },
  { type: 'error', inputs: [], name: 'INVALID_BASE_CURRENCY' },
  { type: 'error', inputs: [], name: 'INVALID_REDEMPTION_RATE' },
  { type: 'error', inputs: [], name: 'INVALID_RESERVED_RATE' },
  {
    type: 'error',
    inputs: [],
    name: 'MINT_NOT_ALLOWED_AND_NOT_TERMINAL_OR_HOOK',
  },
  { type: 'error', inputs: [], name: 'NO_BURNABLE_TOKENS' },
  { type: 'error', inputs: [], name: 'NO_RESERVED_TOKENS' },
  {
    type: 'error',
    inputs: [
      { name: 'x', internalType: 'uint256', type: 'uint256' },
      { name: 'y', internalType: 'uint256', type: 'uint256' },
      { name: 'denominator', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'PRBMath_MulDiv_Overflow',
  },
  { type: 'error', inputs: [], name: 'RULESETS_ALREADY_LAUNCHED' },
  { type: 'error', inputs: [], name: 'RULESETS_ARRAY_EMPTY' },
  { type: 'error', inputs: [], name: 'RULESET_SET_TOKEN_DISABLED' },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation',
  },
  { type: 'error', inputs: [], name: 'UNAUTHORIZED' },
  { type: 'error', inputs: [], name: 'ZERO_TOKENS_TO_MINT' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBDirectory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
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
      { name: 'flag', internalType: 'bool', type: 'bool', indexed: true },
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
  { type: 'error', inputs: [], name: 'DUPLICATE_TERMINALS' },
  { type: 'error', inputs: [], name: 'INVALID_PROJECT_ID_IN_DIRECTORY' },
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
  { type: 'error', inputs: [], name: 'SET_CONTROLLER_NOT_ALLOWED' },
  { type: 'error', inputs: [], name: 'SET_TERMINALS_NOT_ALLOWED' },
  { type: 'error', inputs: [], name: 'TOKEN_NOT_ACCEPTED' },
  { type: 'error', inputs: [], name: 'UNAUTHORIZED' },
] as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const jbDirectoryAddress = {
  11155111: '0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc',
  11155420: '0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
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
          { name: 'amount', internalType: 'uint256', type: 'uint256' },
          { name: 'currency', internalType: 'uint256', type: 'uint256' },
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
        name: 'fundAccessLimitGroup',
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
              { name: 'amount', internalType: 'uint256', type: 'uint256' },
              { name: 'currency', internalType: 'uint256', type: 'uint256' },
            ],
          },
          {
            name: 'surplusAllowances',
            internalType: 'struct JBCurrencyAmount[]',
            type: 'tuple[]',
            components: [
              { name: 'amount', internalType: 'uint256', type: 'uint256' },
              { name: 'currency', internalType: 'uint256', type: 'uint256' },
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
          { name: 'amount', internalType: 'uint256', type: 'uint256' },
          { name: 'currency', internalType: 'uint256', type: 'uint256' },
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
        name: 'limits',
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
              { name: 'amount', internalType: 'uint256', type: 'uint256' },
              { name: 'currency', internalType: 'uint256', type: 'uint256' },
            ],
          },
          {
            name: 'surplusAllowances',
            internalType: 'struct JBCurrencyAmount[]',
            type: 'tuple[]',
            components: [
              { name: 'amount', internalType: 'uint256', type: 'uint256' },
              { name: 'currency', internalType: 'uint256', type: 'uint256' },
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
  { type: 'error', inputs: [], name: 'CONTROLLER_UNAUTHORIZED' },
  { type: 'error', inputs: [], name: 'INVALID_PAYOUT_LIMIT' },
  { type: 'error', inputs: [], name: 'INVALID_PAYOUT_LIMIT_CURRENCY' },
  { type: 'error', inputs: [], name: 'INVALID_PAYOUT_LIMIT_CURRENCY_ORDERING' },
  { type: 'error', inputs: [], name: 'INVALID_SURPLUS_ALLOWANCE' },
  { type: 'error', inputs: [], name: 'INVALID_SURPLUS_ALLOWANCE_CURRENCY' },
  {
    type: 'error',
    inputs: [],
    name: 'INVALID_SURPLUS_ALLOWANCE_CURRENCY_ORDERING',
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
        name: 'permissions',
        internalType: 'contract IJBPermissions',
        type: 'address',
      },
      {
        name: 'projects',
        internalType: 'contract IJBProjects',
        type: 'address',
      },
      {
        name: 'directory',
        internalType: 'contract IJBDirectory',
        type: 'address',
      },
      { name: 'splits', internalType: 'contract IJBSplits', type: 'address' },
      {
        name: 'store',
        internalType: 'contract IJBTerminalStore',
        type: 'address',
      },
      {
        name: 'feelessAddresses',
        internalType: 'contract IJBFeelessAddresses',
        type: 'address',
      },
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
      { name: 'tokens', internalType: 'address[]', type: 'address[]' },
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
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
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
          { name: 'preferAddToBalance', internalType: 'bool', type: 'bool' },
          { name: 'percent', internalType: 'uint256', type: 'uint256' },
          { name: 'projectId', internalType: 'uint256', type: 'uint256' },
          {
            name: 'beneficiary',
            internalType: 'address payable',
            type: 'address',
          },
          { name: 'lockedUntil', internalType: 'uint256', type: 'uint256' },
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
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
    ],
    name: 'heldFeesOf',
    outputs: [
      {
        name: '',
        internalType: 'struct JBFee[]',
        type: 'tuple[]',
        components: [
          { name: 'amount', internalType: 'uint256', type: 'uint256' },
          { name: 'beneficiary', internalType: 'address', type: 'address' },
          { name: 'unlockTimestamp', internalType: 'uint256', type: 'uint256' },
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
    ],
    name: 'processHeldFeesOf',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'holder', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'tokenToReclaim', internalType: 'address', type: 'address' },
      { name: 'redeemCount', internalType: 'uint256', type: 'uint256' },
      { name: 'minTokensReclaimed', internalType: 'uint256', type: 'uint256' },
      { name: 'beneficiary', internalType: 'address payable', type: 'address' },
      { name: 'metadata', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'redeemTokensOf',
    outputs: [
      { name: 'reclaimAmount', internalType: 'uint256', type: 'uint256' },
    ],
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
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'currency', internalType: 'uint256', type: 'uint256' },
      { name: 'minTokensPaidOut', internalType: 'uint256', type: 'uint256' },
      { name: 'beneficiary', internalType: 'address payable', type: 'address' },
      { name: 'memo', internalType: 'string', type: 'string' },
    ],
    name: 'useAllowanceOf',
    outputs: [
      { name: 'amountPaidOut', internalType: 'uint256', type: 'uint256' },
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
        name: 'unlockedFees',
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
              { name: 'value', internalType: 'uint256', type: 'uint256' },
              { name: 'decimals', internalType: 'uint256', type: 'uint256' },
              { name: 'currency', internalType: 'uint256', type: 'uint256' },
            ],
          },
          {
            name: 'forwardedAmount',
            internalType: 'struct JBTokenAmount',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
              { name: 'decimals', internalType: 'uint256', type: 'uint256' },
              { name: 'currency', internalType: 'uint256', type: 'uint256' },
            ],
          },
          { name: 'weight', internalType: 'uint256', type: 'uint256' },
          {
            name: 'projectTokenCount',
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
        name: 'hook',
        internalType: 'contract IJBRedeemHook',
        type: 'address',
        indexed: true,
      },
      {
        name: 'context',
        internalType: 'struct JBAfterRedeemRecordedContext',
        type: 'tuple',
        components: [
          { name: 'holder', internalType: 'address', type: 'address' },
          { name: 'projectId', internalType: 'uint256', type: 'uint256' },
          { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
          { name: 'redeemCount', internalType: 'uint256', type: 'uint256' },
          {
            name: 'reclaimedAmount',
            internalType: 'struct JBTokenAmount',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
              { name: 'decimals', internalType: 'uint256', type: 'uint256' },
              { name: 'currency', internalType: 'uint256', type: 'uint256' },
            ],
          },
          {
            name: 'forwardedAmount',
            internalType: 'struct JBTokenAmount',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
              { name: 'decimals', internalType: 'uint256', type: 'uint256' },
              { name: 'currency', internalType: 'uint256', type: 'uint256' },
            ],
          },
          { name: 'redemptionRate', internalType: 'uint256', type: 'uint256' },
          {
            name: 'beneficiary',
            internalType: 'address payable',
            type: 'address',
          },
          { name: 'hookMetadata', internalType: 'bytes', type: 'bytes' },
          { name: 'redeemerMetadata', internalType: 'bytes', type: 'bytes' },
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
    name: 'HookAfterRecordRedeem',
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
        name: 'beneficiaryTokenCount',
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
          { name: 'preferAddToBalance', internalType: 'bool', type: 'bool' },
          { name: 'percent', internalType: 'uint256', type: 'uint256' },
          { name: 'projectId', internalType: 'uint256', type: 'uint256' },
          {
            name: 'beneficiary',
            internalType: 'address payable',
            type: 'address',
          },
          { name: 'lockedUntil', internalType: 'uint256', type: 'uint256' },
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
        name: 'tokenCount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'redemptionRate',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'reclaimedAmount',
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
    name: 'RedeemTokens',
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
          { name: 'preferAddToBalance', internalType: 'bool', type: 'bool' },
          { name: 'percent', internalType: 'uint256', type: 'uint256' },
          { name: 'projectId', internalType: 'uint256', type: 'uint256' },
          {
            name: 'beneficiary',
            internalType: 'address payable',
            type: 'address',
          },
          { name: 'lockedUntil', internalType: 'uint256', type: 'uint256' },
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
        name: 'amountPaidOut',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      { name: 'fee', internalType: 'uint256', type: 'uint256', indexed: false },
      {
        name: 'beneficiaryDistributionAmount',
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
        name: 'token',
        internalType: 'address',
        type: 'address',
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
  { type: 'error', inputs: [], name: 'ACCOUNTING_CONTEXT_ALREADY_SET' },
  {
    type: 'error',
    inputs: [{ name: 'target', internalType: 'address', type: 'address' }],
    name: 'AddressEmptyCode',
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'AddressInsufficientBalance',
  },
  { type: 'error', inputs: [], name: 'FailedInnerCall' },
  { type: 'error', inputs: [], name: 'NO_MSG_VALUE_ALLOWED' },
  { type: 'error', inputs: [], name: 'OVERFLOW_ALERT' },
  { type: 'error', inputs: [], name: 'PERMIT_ALLOWANCE_NOT_ENOUGH' },
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
  { type: 'error', inputs: [], name: 'TERMINAL_TOKENS_INCOMPATIBLE' },
  { type: 'error', inputs: [], name: 'TOKEN_NOT_ACCEPTED' },
  { type: 'error', inputs: [], name: 'UNAUTHORIZED' },
  { type: 'error', inputs: [], name: 'UNDER_MIN_RETURNED_TOKENS' },
  { type: 'error', inputs: [], name: 'UNDER_MIN_TOKENS_PAID_OUT' },
  { type: 'error', inputs: [], name: 'UNDER_MIN_TOKENS_RECLAIMED' },
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
          { name: 'projectId', internalType: 'uint256', type: 'uint256' },
          {
            name: 'permissionIds',
            internalType: 'uint256[]',
            type: 'uint256[]',
          },
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
        internalType: 'uint256[]',
        type: 'uint256[]',
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
  { type: 'error', inputs: [], name: 'PERMISSION_ID_OUT_OF_BOUNDS' },
  { type: 'error', inputs: [], name: 'UNAUTHORIZED' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBProjects
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
        name: 'newResolver',
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

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBRulesets
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
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
          { name: 'cycleNumber', internalType: 'uint256', type: 'uint256' },
          { name: 'id', internalType: 'uint256', type: 'uint256' },
          { name: 'basedOnId', internalType: 'uint256', type: 'uint256' },
          { name: 'start', internalType: 'uint256', type: 'uint256' },
          { name: 'duration', internalType: 'uint256', type: 'uint256' },
          { name: 'weight', internalType: 'uint256', type: 'uint256' },
          { name: 'decayRate', internalType: 'uint256', type: 'uint256' },
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
          { name: 'cycleNumber', internalType: 'uint256', type: 'uint256' },
          { name: 'id', internalType: 'uint256', type: 'uint256' },
          { name: 'basedOnId', internalType: 'uint256', type: 'uint256' },
          { name: 'start', internalType: 'uint256', type: 'uint256' },
          { name: 'duration', internalType: 'uint256', type: 'uint256' },
          { name: 'weight', internalType: 'uint256', type: 'uint256' },
          { name: 'decayRate', internalType: 'uint256', type: 'uint256' },
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
          { name: 'cycleNumber', internalType: 'uint256', type: 'uint256' },
          { name: 'id', internalType: 'uint256', type: 'uint256' },
          { name: 'basedOnId', internalType: 'uint256', type: 'uint256' },
          { name: 'start', internalType: 'uint256', type: 'uint256' },
          { name: 'duration', internalType: 'uint256', type: 'uint256' },
          { name: 'weight', internalType: 'uint256', type: 'uint256' },
          { name: 'decayRate', internalType: 'uint256', type: 'uint256' },
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
      { name: 'decayRate', internalType: 'uint256', type: 'uint256' },
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
          { name: 'cycleNumber', internalType: 'uint256', type: 'uint256' },
          { name: 'id', internalType: 'uint256', type: 'uint256' },
          { name: 'basedOnId', internalType: 'uint256', type: 'uint256' },
          { name: 'start', internalType: 'uint256', type: 'uint256' },
          { name: 'duration', internalType: 'uint256', type: 'uint256' },
          { name: 'weight', internalType: 'uint256', type: 'uint256' },
          { name: 'decayRate', internalType: 'uint256', type: 'uint256' },
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
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'startingId', internalType: 'uint256', type: 'uint256' },
      { name: 'size', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'rulesetsOf',
    outputs: [
      {
        name: 'rulesets',
        internalType: 'struct JBRuleset[]',
        type: 'tuple[]',
        components: [
          { name: 'cycleNumber', internalType: 'uint256', type: 'uint256' },
          { name: 'id', internalType: 'uint256', type: 'uint256' },
          { name: 'basedOnId', internalType: 'uint256', type: 'uint256' },
          { name: 'start', internalType: 'uint256', type: 'uint256' },
          { name: 'duration', internalType: 'uint256', type: 'uint256' },
          { name: 'weight', internalType: 'uint256', type: 'uint256' },
          { name: 'decayRate', internalType: 'uint256', type: 'uint256' },
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
    name: 'upcomingOf',
    outputs: [
      {
        name: 'ruleset',
        internalType: 'struct JBRuleset',
        type: 'tuple',
        components: [
          { name: 'cycleNumber', internalType: 'uint256', type: 'uint256' },
          { name: 'id', internalType: 'uint256', type: 'uint256' },
          { name: 'basedOnId', internalType: 'uint256', type: 'uint256' },
          { name: 'start', internalType: 'uint256', type: 'uint256' },
          { name: 'duration', internalType: 'uint256', type: 'uint256' },
          { name: 'weight', internalType: 'uint256', type: 'uint256' },
          { name: 'decayRate', internalType: 'uint256', type: 'uint256' },
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
        name: 'decayRate',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'hook',
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
  { type: 'error', inputs: [], name: 'CONTROLLER_UNAUTHORIZED' },
  { type: 'error', inputs: [], name: 'INVALID_DECAY_RATE' },
  { type: 'error', inputs: [], name: 'INVALID_RULESET_APPROVAL_HOOK' },
  { type: 'error', inputs: [], name: 'INVALID_RULESET_DURATION' },
  { type: 'error', inputs: [], name: 'INVALID_RULESET_END_TIME' },
  { type: 'error', inputs: [], name: 'INVALID_WEIGHT' },
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 */
export const jbRulesetsAddress = {
  11155111: '0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C',
  11155420: '0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 */
export const jbRulesetsConfig = {
  address: jbRulesetsAddress,
  abi: jbRulesetsAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBSplits
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x20d892d9296A4d69E94C202f5C41a299Da72B117)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x20d892d9296A4d69E94C202f5C41a299Da72B117)
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
              {
                name: 'preferAddToBalance',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'percent', internalType: 'uint256', type: 'uint256' },
              { name: 'projectId', internalType: 'uint256', type: 'uint256' },
              {
                name: 'beneficiary',
                internalType: 'address payable',
                type: 'address',
              },
              { name: 'lockedUntil', internalType: 'uint256', type: 'uint256' },
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
          { name: 'preferAddToBalance', internalType: 'bool', type: 'bool' },
          { name: 'percent', internalType: 'uint256', type: 'uint256' },
          { name: 'projectId', internalType: 'uint256', type: 'uint256' },
          {
            name: 'beneficiary',
            internalType: 'address payable',
            type: 'address',
          },
          { name: 'lockedUntil', internalType: 'uint256', type: 'uint256' },
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
          { name: 'preferAddToBalance', internalType: 'bool', type: 'bool' },
          { name: 'percent', internalType: 'uint256', type: 'uint256' },
          { name: 'projectId', internalType: 'uint256', type: 'uint256' },
          {
            name: 'beneficiary',
            internalType: 'address payable',
            type: 'address',
          },
          { name: 'lockedUntil', internalType: 'uint256', type: 'uint256' },
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
  { type: 'error', inputs: [], name: 'CONTROLLER_UNAUTHORIZED' },
  { type: 'error', inputs: [], name: 'INVALID_LOCKED_UNTIL' },
  { type: 'error', inputs: [], name: 'INVALID_PROJECT_ID' },
  { type: 'error', inputs: [], name: 'INVALID_SPLIT_PERCENT' },
  { type: 'error', inputs: [], name: 'INVALID_TOTAL_PERCENT' },
  { type: 'error', inputs: [], name: 'PREVIOUS_LOCKED_SPLITS_NOT_INCLUDED' },
] as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x20d892d9296A4d69E94C202f5C41a299Da72B117)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x20d892d9296A4d69E94C202f5C41a299Da72B117)
 */
export const jbSplitsAddress = {
  11155111: '0x20d892d9296A4d69E94C202f5C41a299Da72B117',
  11155420: '0x20d892d9296A4d69E94C202f5C41a299Da72B117',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x20d892d9296A4d69E94C202f5C41a299Da72B117)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x20d892d9296A4d69E94C202f5C41a299Da72B117)
 */
export const jbSplitsConfig = {
  address: jbSplitsAddress,
  abi: jbSplitsAbi,
} as const

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
      {
        name: 'rulesets',
        internalType: 'contract IJBRulesets',
        type: 'address',
      },
      { name: 'prices', internalType: 'contract IJBPrices', type: 'address' },
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
      { name: 'tokenCount', internalType: 'uint256', type: 'uint256' },
      { name: 'useTotalSurplus', internalType: 'bool', type: 'bool' },
    ],
    name: 'currentReclaimableSurplusOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'tokenCount', internalType: 'uint256', type: 'uint256' },
      { name: 'totalSupply', internalType: 'uint256', type: 'uint256' },
      { name: 'surplus', internalType: 'uint256', type: 'uint256' },
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
      { name: 'payer', internalType: 'address', type: 'address' },
      {
        name: 'amount',
        internalType: 'struct JBTokenAmount',
        type: 'tuple',
        components: [
          { name: 'token', internalType: 'address', type: 'address' },
          { name: 'value', internalType: 'uint256', type: 'uint256' },
          { name: 'decimals', internalType: 'uint256', type: 'uint256' },
          { name: 'currency', internalType: 'uint256', type: 'uint256' },
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
          { name: 'cycleNumber', internalType: 'uint256', type: 'uint256' },
          { name: 'id', internalType: 'uint256', type: 'uint256' },
          { name: 'basedOnId', internalType: 'uint256', type: 'uint256' },
          { name: 'start', internalType: 'uint256', type: 'uint256' },
          { name: 'duration', internalType: 'uint256', type: 'uint256' },
          { name: 'weight', internalType: 'uint256', type: 'uint256' },
          { name: 'decayRate', internalType: 'uint256', type: 'uint256' },
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
          { name: 'cycleNumber', internalType: 'uint256', type: 'uint256' },
          { name: 'id', internalType: 'uint256', type: 'uint256' },
          { name: 'basedOnId', internalType: 'uint256', type: 'uint256' },
          { name: 'start', internalType: 'uint256', type: 'uint256' },
          { name: 'duration', internalType: 'uint256', type: 'uint256' },
          { name: 'weight', internalType: 'uint256', type: 'uint256' },
          { name: 'decayRate', internalType: 'uint256', type: 'uint256' },
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
      { name: 'holder', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'redeemCount', internalType: 'uint256', type: 'uint256' },
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
    name: 'recordRedemptionFor',
    outputs: [
      {
        name: 'ruleset',
        internalType: 'struct JBRuleset',
        type: 'tuple',
        components: [
          { name: 'cycleNumber', internalType: 'uint256', type: 'uint256' },
          { name: 'id', internalType: 'uint256', type: 'uint256' },
          { name: 'basedOnId', internalType: 'uint256', type: 'uint256' },
          { name: 'start', internalType: 'uint256', type: 'uint256' },
          { name: 'duration', internalType: 'uint256', type: 'uint256' },
          { name: 'weight', internalType: 'uint256', type: 'uint256' },
          { name: 'decayRate', internalType: 'uint256', type: 'uint256' },
          {
            name: 'approvalHook',
            internalType: 'contract IJBRulesetApprovalHook',
            type: 'address',
          },
          { name: 'metadata', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'reclaimAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'redemptionRate', internalType: 'uint256', type: 'uint256' },
      {
        name: 'hookSpecifications',
        internalType: 'struct JBRedeemHookSpecification[]',
        type: 'tuple[]',
        components: [
          {
            name: 'hook',
            internalType: 'contract IJBRedeemHook',
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
          { name: 'cycleNumber', internalType: 'uint256', type: 'uint256' },
          { name: 'id', internalType: 'uint256', type: 'uint256' },
          { name: 'basedOnId', internalType: 'uint256', type: 'uint256' },
          { name: 'start', internalType: 'uint256', type: 'uint256' },
          { name: 'duration', internalType: 'uint256', type: 'uint256' },
          { name: 'weight', internalType: 'uint256', type: 'uint256' },
          { name: 'decayRate', internalType: 'uint256', type: 'uint256' },
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
  { type: 'error', inputs: [], name: 'INADEQUATE_CONTROLLER_ALLOWANCE' },
  { type: 'error', inputs: [], name: 'INADEQUATE_TERMINAL_STORE_BALANCE' },
  { type: 'error', inputs: [], name: 'INSUFFICIENT_TOKENS' },
  { type: 'error', inputs: [], name: 'INVALID_AMOUNT_TO_SEND_HOOK' },
  { type: 'error', inputs: [], name: 'INVALID_RULESET' },
  { type: 'error', inputs: [], name: 'PAYOUT_LIMIT_EXCEEDED' },
  {
    type: 'error',
    inputs: [
      { name: 'x', internalType: 'uint256', type: 'uint256' },
      { name: 'y', internalType: 'uint256', type: 'uint256' },
      { name: 'denominator', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'PRBMath_MulDiv_Overflow',
  },
  { type: 'error', inputs: [], name: 'RULESET_PAYMENT_PAUSED' },
  { type: 'error', inputs: [], name: 'ReentrancyGuardReentrantCall' },
  { type: 'error', inputs: [], name: 'TERMINAL_MIGRATION_NOT_ALLOWED' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBTokens
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
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
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
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
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
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
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'mintFor',
    outputs: [],
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
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
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
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'initialCreditBalance',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'initialTokenBalance',
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
        name: 'initialCreditBalance',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'amount',
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
        name: 'amount',
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
        name: 'newToken',
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
    name: 'TransferCredits',
  },
  { type: 'error', inputs: [], name: 'CONTROLLER_UNAUTHORIZED' },
  { type: 'error', inputs: [], name: 'EMPTY_NAME' },
  { type: 'error', inputs: [], name: 'EMPTY_SYMBOL' },
  { type: 'error', inputs: [], name: 'EMPTY_TOKEN' },
  { type: 'error', inputs: [], name: 'ERC1167FailedCreateClone' },
  { type: 'error', inputs: [], name: 'INSUFFICIENT_CREDITS' },
  { type: 'error', inputs: [], name: 'INSUFFICIENT_FUNDS' },
  { type: 'error', inputs: [], name: 'OVERFLOW_ALERT' },
  { type: 'error', inputs: [], name: 'PROJECT_ALREADY_HAS_TOKEN' },
  { type: 'error', inputs: [], name: 'RECIPIENT_ZERO_ADDRESS' },
  { type: 'error', inputs: [], name: 'TOKENS_MUST_HAVE_18_DECIMALS' },
  { type: 'error', inputs: [], name: 'TOKEN_ALREADY_SET' },
  { type: 'error', inputs: [], name: 'TOKEN_NOT_FOUND' },
] as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const jbTokensAddress = {
  11155111: '0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD',
  11155420: '0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const jbTokensConfig = {
  address: jbTokensAddress,
  abi: jbTokensAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// React
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookAbi}__
 */
export const useReadJb721TiersHook = /*#__PURE__*/ createUseReadContract({
  abi: jb721TiersHookAbi,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"DIRECTORY"`
 */
export const useReadJb721TiersHookDirectory =
  /*#__PURE__*/ createUseReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'DIRECTORY',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"METADATA_ID_TARGET"`
 */
export const useReadJb721TiersHookMetadataIdTarget =
  /*#__PURE__*/ createUseReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'METADATA_ID_TARGET',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"PERMISSIONS"`
 */
export const useReadJb721TiersHookPermissions =
  /*#__PURE__*/ createUseReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'PERMISSIONS',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"PROJECTS"`
 */
export const useReadJb721TiersHookProjects =
  /*#__PURE__*/ createUseReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'PROJECTS',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"PROJECT_ID"`
 */
export const useReadJb721TiersHookProjectId =
  /*#__PURE__*/ createUseReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'PROJECT_ID',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"RULESETS"`
 */
export const useReadJb721TiersHookRulesets =
  /*#__PURE__*/ createUseReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'RULESETS',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"STORE"`
 */
export const useReadJb721TiersHookStore = /*#__PURE__*/ createUseReadContract({
  abi: jb721TiersHookAbi,
  functionName: 'STORE',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"balanceOf"`
 */
export const useReadJb721TiersHookBalanceOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'balanceOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"baseURI"`
 */
export const useReadJb721TiersHookBaseUri = /*#__PURE__*/ createUseReadContract(
  { abi: jb721TiersHookAbi, functionName: 'baseURI' },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"beforePayRecordedWith"`
 */
export const useReadJb721TiersHookBeforePayRecordedWith =
  /*#__PURE__*/ createUseReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'beforePayRecordedWith',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"beforeRedeemRecordedWith"`
 */
export const useReadJb721TiersHookBeforeRedeemRecordedWith =
  /*#__PURE__*/ createUseReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'beforeRedeemRecordedWith',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"contractURI"`
 */
export const useReadJb721TiersHookContractUri =
  /*#__PURE__*/ createUseReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'contractURI',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"firstOwnerOf"`
 */
export const useReadJb721TiersHookFirstOwnerOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'firstOwnerOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"getApproved"`
 */
export const useReadJb721TiersHookGetApproved =
  /*#__PURE__*/ createUseReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'getApproved',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"hasMintPermissionFor"`
 */
export const useReadJb721TiersHookHasMintPermissionFor =
  /*#__PURE__*/ createUseReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'hasMintPermissionFor',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"isApprovedForAll"`
 */
export const useReadJb721TiersHookIsApprovedForAll =
  /*#__PURE__*/ createUseReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'isApprovedForAll',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"isTrustedForwarder"`
 */
export const useReadJb721TiersHookIsTrustedForwarder =
  /*#__PURE__*/ createUseReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'isTrustedForwarder',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"jbOwner"`
 */
export const useReadJb721TiersHookJbOwner = /*#__PURE__*/ createUseReadContract(
  { abi: jb721TiersHookAbi, functionName: 'jbOwner' },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"name"`
 */
export const useReadJb721TiersHookName = /*#__PURE__*/ createUseReadContract({
  abi: jb721TiersHookAbi,
  functionName: 'name',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"owner"`
 */
export const useReadJb721TiersHookOwner = /*#__PURE__*/ createUseReadContract({
  abi: jb721TiersHookAbi,
  functionName: 'owner',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"ownerOf"`
 */
export const useReadJb721TiersHookOwnerOf = /*#__PURE__*/ createUseReadContract(
  { abi: jb721TiersHookAbi, functionName: 'ownerOf' },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"payCreditsOf"`
 */
export const useReadJb721TiersHookPayCreditsOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'payCreditsOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"pricingContext"`
 */
export const useReadJb721TiersHookPricingContext =
  /*#__PURE__*/ createUseReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'pricingContext',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"redemptionWeightOf"`
 */
export const useReadJb721TiersHookRedemptionWeightOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'redemptionWeightOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"supportsInterface"`
 */
export const useReadJb721TiersHookSupportsInterface =
  /*#__PURE__*/ createUseReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'supportsInterface',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"symbol"`
 */
export const useReadJb721TiersHookSymbol = /*#__PURE__*/ createUseReadContract({
  abi: jb721TiersHookAbi,
  functionName: 'symbol',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"tokenURI"`
 */
export const useReadJb721TiersHookTokenUri =
  /*#__PURE__*/ createUseReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'tokenURI',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"totalRedemptionWeight"`
 */
export const useReadJb721TiersHookTotalRedemptionWeight =
  /*#__PURE__*/ createUseReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'totalRedemptionWeight',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"trustedForwarder"`
 */
export const useReadJb721TiersHookTrustedForwarder =
  /*#__PURE__*/ createUseReadContract({
    abi: jb721TiersHookAbi,
    functionName: 'trustedForwarder',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jb721TiersHookAbi}__
 */
export const useWriteJb721TiersHook = /*#__PURE__*/ createUseWriteContract({
  abi: jb721TiersHookAbi,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"adjustTiers"`
 */
export const useWriteJb721TiersHookAdjustTiers =
  /*#__PURE__*/ createUseWriteContract({
    abi: jb721TiersHookAbi,
    functionName: 'adjustTiers',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"afterPayRecordedWith"`
 */
export const useWriteJb721TiersHookAfterPayRecordedWith =
  /*#__PURE__*/ createUseWriteContract({
    abi: jb721TiersHookAbi,
    functionName: 'afterPayRecordedWith',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"afterRedeemRecordedWith"`
 */
export const useWriteJb721TiersHookAfterRedeemRecordedWith =
  /*#__PURE__*/ createUseWriteContract({
    abi: jb721TiersHookAbi,
    functionName: 'afterRedeemRecordedWith',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"approve"`
 */
export const useWriteJb721TiersHookApprove =
  /*#__PURE__*/ createUseWriteContract({
    abi: jb721TiersHookAbi,
    functionName: 'approve',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"initialize"`
 */
export const useWriteJb721TiersHookInitialize =
  /*#__PURE__*/ createUseWriteContract({
    abi: jb721TiersHookAbi,
    functionName: 'initialize',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"mintFor"`
 */
export const useWriteJb721TiersHookMintFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: jb721TiersHookAbi,
    functionName: 'mintFor',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"mintPendingReservesFor"`
 */
export const useWriteJb721TiersHookMintPendingReservesFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: jb721TiersHookAbi,
    functionName: 'mintPendingReservesFor',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"renounceOwnership"`
 */
export const useWriteJb721TiersHookRenounceOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: jb721TiersHookAbi,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"safeTransferFrom"`
 */
export const useWriteJb721TiersHookSafeTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: jb721TiersHookAbi,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"setApprovalForAll"`
 */
export const useWriteJb721TiersHookSetApprovalForAll =
  /*#__PURE__*/ createUseWriteContract({
    abi: jb721TiersHookAbi,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"setMetadata"`
 */
export const useWriteJb721TiersHookSetMetadata =
  /*#__PURE__*/ createUseWriteContract({
    abi: jb721TiersHookAbi,
    functionName: 'setMetadata',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"setPermissionId"`
 */
export const useWriteJb721TiersHookSetPermissionId =
  /*#__PURE__*/ createUseWriteContract({
    abi: jb721TiersHookAbi,
    functionName: 'setPermissionId',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"transferFrom"`
 */
export const useWriteJb721TiersHookTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: jb721TiersHookAbi,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"transferOwnership"`
 */
export const useWriteJb721TiersHookTransferOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: jb721TiersHookAbi,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"transferOwnershipToProject"`
 */
export const useWriteJb721TiersHookTransferOwnershipToProject =
  /*#__PURE__*/ createUseWriteContract({
    abi: jb721TiersHookAbi,
    functionName: 'transferOwnershipToProject',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__
 */
export const useSimulateJb721TiersHook =
  /*#__PURE__*/ createUseSimulateContract({ abi: jb721TiersHookAbi })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"adjustTiers"`
 */
export const useSimulateJb721TiersHookAdjustTiers =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'adjustTiers',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"afterPayRecordedWith"`
 */
export const useSimulateJb721TiersHookAfterPayRecordedWith =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'afterPayRecordedWith',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"afterRedeemRecordedWith"`
 */
export const useSimulateJb721TiersHookAfterRedeemRecordedWith =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'afterRedeemRecordedWith',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"approve"`
 */
export const useSimulateJb721TiersHookApprove =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'approve',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"initialize"`
 */
export const useSimulateJb721TiersHookInitialize =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'initialize',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"mintFor"`
 */
export const useSimulateJb721TiersHookMintFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'mintFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"mintPendingReservesFor"`
 */
export const useSimulateJb721TiersHookMintPendingReservesFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'mintPendingReservesFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"renounceOwnership"`
 */
export const useSimulateJb721TiersHookRenounceOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"safeTransferFrom"`
 */
export const useSimulateJb721TiersHookSafeTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"setApprovalForAll"`
 */
export const useSimulateJb721TiersHookSetApprovalForAll =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"setMetadata"`
 */
export const useSimulateJb721TiersHookSetMetadata =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'setMetadata',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"setPermissionId"`
 */
export const useSimulateJb721TiersHookSetPermissionId =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'setPermissionId',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"transferFrom"`
 */
export const useSimulateJb721TiersHookTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"transferOwnership"`
 */
export const useSimulateJb721TiersHookTransferOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `functionName` set to `"transferOwnershipToProject"`
 */
export const useSimulateJb721TiersHookTransferOwnershipToProject =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jb721TiersHookAbi,
    functionName: 'transferOwnershipToProject',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__
 */
export const useWatchJb721TiersHookEvent =
  /*#__PURE__*/ createUseWatchContractEvent({ abi: jb721TiersHookAbi })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"AddPayCredits"`
 */
export const useWatchJb721TiersHookAddPayCreditsEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'AddPayCredits',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"AddTier"`
 */
export const useWatchJb721TiersHookAddTierEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'AddTier',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"Approval"`
 */
export const useWatchJb721TiersHookApprovalEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'Approval',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"ApprovalForAll"`
 */
export const useWatchJb721TiersHookApprovalForAllEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'ApprovalForAll',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"Mint"`
 */
export const useWatchJb721TiersHookMintEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'Mint',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"MintReservedNft"`
 */
export const useWatchJb721TiersHookMintReservedNftEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'MintReservedNft',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"OwnershipTransferred"`
 */
export const useWatchJb721TiersHookOwnershipTransferredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"PermissionIdChanged"`
 */
export const useWatchJb721TiersHookPermissionIdChangedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'PermissionIdChanged',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"RemoveTier"`
 */
export const useWatchJb721TiersHookRemoveTierEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'RemoveTier',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"SetBaseUri"`
 */
export const useWatchJb721TiersHookSetBaseUriEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'SetBaseUri',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"SetContractUri"`
 */
export const useWatchJb721TiersHookSetContractUriEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'SetContractUri',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"SetEncodedIPFSUri"`
 */
export const useWatchJb721TiersHookSetEncodedIpfsUriEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'SetEncodedIPFSUri',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"SetTokenUriResolver"`
 */
export const useWatchJb721TiersHookSetTokenUriResolverEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'SetTokenUriResolver',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"Transfer"`
 */
export const useWatchJb721TiersHookTransferEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'Transfer',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jb721TiersHookAbi}__ and `eventName` set to `"UsePayCredits"`
 */
export const useWatchJb721TiersHookUsePayCreditsEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jb721TiersHookAbi,
    eventName: 'UsePayCredits',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookDeployerAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x554CE80D78f5438c73a9759D8BBb52a382138A59)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x554CE80D78f5438c73a9759D8BBb52a382138A59)
 */
export const useReadJb721TiersHookDeployer =
  /*#__PURE__*/ createUseReadContract({
    abi: jb721TiersHookDeployerAbi,
    address: jb721TiersHookDeployerAddress,
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookDeployerAbi}__ and `functionName` set to `"ADDRESS_REGISTRY"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x554CE80D78f5438c73a9759D8BBb52a382138A59)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x554CE80D78f5438c73a9759D8BBb52a382138A59)
 */
export const useReadJb721TiersHookDeployerAddressRegistry =
  /*#__PURE__*/ createUseReadContract({
    abi: jb721TiersHookDeployerAbi,
    address: jb721TiersHookDeployerAddress,
    functionName: 'ADDRESS_REGISTRY',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookDeployerAbi}__ and `functionName` set to `"HOOK"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x554CE80D78f5438c73a9759D8BBb52a382138A59)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x554CE80D78f5438c73a9759D8BBb52a382138A59)
 */
export const useReadJb721TiersHookDeployerHook =
  /*#__PURE__*/ createUseReadContract({
    abi: jb721TiersHookDeployerAbi,
    address: jb721TiersHookDeployerAddress,
    functionName: 'HOOK',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookDeployerAbi}__ and `functionName` set to `"STORE"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x554CE80D78f5438c73a9759D8BBb52a382138A59)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x554CE80D78f5438c73a9759D8BBb52a382138A59)
 */
export const useReadJb721TiersHookDeployerStore =
  /*#__PURE__*/ createUseReadContract({
    abi: jb721TiersHookDeployerAbi,
    address: jb721TiersHookDeployerAddress,
    functionName: 'STORE',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookDeployerAbi}__ and `functionName` set to `"isTrustedForwarder"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x554CE80D78f5438c73a9759D8BBb52a382138A59)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x554CE80D78f5438c73a9759D8BBb52a382138A59)
 */
export const useReadJb721TiersHookDeployerIsTrustedForwarder =
  /*#__PURE__*/ createUseReadContract({
    abi: jb721TiersHookDeployerAbi,
    address: jb721TiersHookDeployerAddress,
    functionName: 'isTrustedForwarder',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jb721TiersHookDeployerAbi}__ and `functionName` set to `"trustedForwarder"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x554CE80D78f5438c73a9759D8BBb52a382138A59)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x554CE80D78f5438c73a9759D8BBb52a382138A59)
 */
export const useReadJb721TiersHookDeployerTrustedForwarder =
  /*#__PURE__*/ createUseReadContract({
    abi: jb721TiersHookDeployerAbi,
    address: jb721TiersHookDeployerAddress,
    functionName: 'trustedForwarder',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jb721TiersHookDeployerAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x554CE80D78f5438c73a9759D8BBb52a382138A59)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x554CE80D78f5438c73a9759D8BBb52a382138A59)
 */
export const useWriteJb721TiersHookDeployer =
  /*#__PURE__*/ createUseWriteContract({
    abi: jb721TiersHookDeployerAbi,
    address: jb721TiersHookDeployerAddress,
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jb721TiersHookDeployerAbi}__ and `functionName` set to `"deployHookFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x554CE80D78f5438c73a9759D8BBb52a382138A59)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x554CE80D78f5438c73a9759D8BBb52a382138A59)
 */
export const useWriteJb721TiersHookDeployerDeployHookFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: jb721TiersHookDeployerAbi,
    address: jb721TiersHookDeployerAddress,
    functionName: 'deployHookFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jb721TiersHookDeployerAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x554CE80D78f5438c73a9759D8BBb52a382138A59)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x554CE80D78f5438c73a9759D8BBb52a382138A59)
 */
export const useSimulateJb721TiersHookDeployer =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jb721TiersHookDeployerAbi,
    address: jb721TiersHookDeployerAddress,
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jb721TiersHookDeployerAbi}__ and `functionName` set to `"deployHookFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x554CE80D78f5438c73a9759D8BBb52a382138A59)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x554CE80D78f5438c73a9759D8BBb52a382138A59)
 */
export const useSimulateJb721TiersHookDeployerDeployHookFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jb721TiersHookDeployerAbi,
    address: jb721TiersHookDeployerAddress,
    functionName: 'deployHookFor',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jb721TiersHookDeployerAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x554CE80D78f5438c73a9759D8BBb52a382138A59)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x554CE80D78f5438c73a9759D8BBb52a382138A59)
 */
export const useWatchJb721TiersHookDeployerEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jb721TiersHookDeployerAbi,
    address: jb721TiersHookDeployerAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jb721TiersHookDeployerAbi}__ and `eventName` set to `"HookDeployed"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x554CE80D78f5438c73a9759D8BBb52a382138A59)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x554CE80D78f5438c73a9759D8BBb52a382138A59)
 */
export const useWatchJb721TiersHookDeployerHookDeployedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jb721TiersHookDeployerAbi,
    address: jb721TiersHookDeployerAddress,
    eventName: 'HookDeployed',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbAddressRegistryAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x989566Bf9fF4CffA55a98ADa7dc3E58b2a0a19c6)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x989566Bf9fF4CffA55a98ADa7dc3E58b2a0a19c6)
 */
export const useReadJbAddressRegistry = /*#__PURE__*/ createUseReadContract({
  abi: jbAddressRegistryAbi,
  address: jbAddressRegistryAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbAddressRegistryAbi}__ and `functionName` set to `"deployerOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x989566Bf9fF4CffA55a98ADa7dc3E58b2a0a19c6)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x989566Bf9fF4CffA55a98ADa7dc3E58b2a0a19c6)
 */
export const useReadJbAddressRegistryDeployerOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbAddressRegistryAbi,
    address: jbAddressRegistryAddress,
    functionName: 'deployerOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbAddressRegistryAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x989566Bf9fF4CffA55a98ADa7dc3E58b2a0a19c6)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x989566Bf9fF4CffA55a98ADa7dc3E58b2a0a19c6)
 */
export const useWriteJbAddressRegistry = /*#__PURE__*/ createUseWriteContract({
  abi: jbAddressRegistryAbi,
  address: jbAddressRegistryAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbAddressRegistryAbi}__ and `functionName` set to `"registerAddress"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x989566Bf9fF4CffA55a98ADa7dc3E58b2a0a19c6)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x989566Bf9fF4CffA55a98ADa7dc3E58b2a0a19c6)
 */
export const useWriteJbAddressRegistryRegisterAddress =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbAddressRegistryAbi,
    address: jbAddressRegistryAddress,
    functionName: 'registerAddress',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbAddressRegistryAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x989566Bf9fF4CffA55a98ADa7dc3E58b2a0a19c6)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x989566Bf9fF4CffA55a98ADa7dc3E58b2a0a19c6)
 */
export const useSimulateJbAddressRegistry =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbAddressRegistryAbi,
    address: jbAddressRegistryAddress,
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbAddressRegistryAbi}__ and `functionName` set to `"registerAddress"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x989566Bf9fF4CffA55a98ADa7dc3E58b2a0a19c6)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x989566Bf9fF4CffA55a98ADa7dc3E58b2a0a19c6)
 */
export const useSimulateJbAddressRegistryRegisterAddress =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbAddressRegistryAbi,
    address: jbAddressRegistryAddress,
    functionName: 'registerAddress',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbAddressRegistryAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x989566Bf9fF4CffA55a98ADa7dc3E58b2a0a19c6)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x989566Bf9fF4CffA55a98ADa7dc3E58b2a0a19c6)
 */
export const useWatchJbAddressRegistryEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbAddressRegistryAbi,
    address: jbAddressRegistryAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbAddressRegistryAbi}__ and `eventName` set to `"AddressRegistered"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x989566Bf9fF4CffA55a98ADa7dc3E58b2a0a19c6)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x989566Bf9fF4CffA55a98ADa7dc3E58b2a0a19c6)
 */
export const useWatchJbAddressRegistryAddressRegisteredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbAddressRegistryAbi,
    address: jbAddressRegistryAddress,
    eventName: 'AddressRegistered',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__
 */
export const useReadJbController = /*#__PURE__*/ createUseReadContract({
  abi: jbControllerAbi,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"DIRECTORY"`
 */
export const useReadJbControllerDirectory = /*#__PURE__*/ createUseReadContract(
  { abi: jbControllerAbi, functionName: 'DIRECTORY' },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"FUND_ACCESS_LIMITS"`
 */
export const useReadJbControllerFundAccessLimits =
  /*#__PURE__*/ createUseReadContract({
    abi: jbControllerAbi,
    functionName: 'FUND_ACCESS_LIMITS',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"PERMISSIONS"`
 */
export const useReadJbControllerPermissions =
  /*#__PURE__*/ createUseReadContract({
    abi: jbControllerAbi,
    functionName: 'PERMISSIONS',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"PROJECTS"`
 */
export const useReadJbControllerProjects = /*#__PURE__*/ createUseReadContract({
  abi: jbControllerAbi,
  functionName: 'PROJECTS',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"RULESETS"`
 */
export const useReadJbControllerRulesets = /*#__PURE__*/ createUseReadContract({
  abi: jbControllerAbi,
  functionName: 'RULESETS',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"SPLITS"`
 */
export const useReadJbControllerSplits = /*#__PURE__*/ createUseReadContract({
  abi: jbControllerAbi,
  functionName: 'SPLITS',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"TOKENS"`
 */
export const useReadJbControllerTokens = /*#__PURE__*/ createUseReadContract({
  abi: jbControllerAbi,
  functionName: 'TOKENS',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"currentRulesetOf"`
 */
export const useReadJbControllerCurrentRulesetOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbControllerAbi,
    functionName: 'currentRulesetOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"getRulesetOf"`
 */
export const useReadJbControllerGetRulesetOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbControllerAbi,
    functionName: 'getRulesetOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"isTrustedForwarder"`
 */
export const useReadJbControllerIsTrustedForwarder =
  /*#__PURE__*/ createUseReadContract({
    abi: jbControllerAbi,
    functionName: 'isTrustedForwarder',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"latestQueuedRulesetOf"`
 */
export const useReadJbControllerLatestQueuedRulesetOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbControllerAbi,
    functionName: 'latestQueuedRulesetOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"pendingReservedTokenBalanceOf"`
 */
export const useReadJbControllerPendingReservedTokenBalanceOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbControllerAbi,
    functionName: 'pendingReservedTokenBalanceOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"rulesetsOf"`
 */
export const useReadJbControllerRulesetsOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbControllerAbi,
    functionName: 'rulesetsOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"setControllerAllowed"`
 */
export const useReadJbControllerSetControllerAllowed =
  /*#__PURE__*/ createUseReadContract({
    abi: jbControllerAbi,
    functionName: 'setControllerAllowed',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"setTerminalsAllowed"`
 */
export const useReadJbControllerSetTerminalsAllowed =
  /*#__PURE__*/ createUseReadContract({
    abi: jbControllerAbi,
    functionName: 'setTerminalsAllowed',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"supportsInterface"`
 */
export const useReadJbControllerSupportsInterface =
  /*#__PURE__*/ createUseReadContract({
    abi: jbControllerAbi,
    functionName: 'supportsInterface',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"totalTokenSupplyWithReservedTokensOf"`
 */
export const useReadJbControllerTotalTokenSupplyWithReservedTokensOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbControllerAbi,
    functionName: 'totalTokenSupplyWithReservedTokensOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"trustedForwarder"`
 */
export const useReadJbControllerTrustedForwarder =
  /*#__PURE__*/ createUseReadContract({
    abi: jbControllerAbi,
    functionName: 'trustedForwarder',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"upcomingRulesetOf"`
 */
export const useReadJbControllerUpcomingRulesetOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbControllerAbi,
    functionName: 'upcomingRulesetOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"uriOf"`
 */
export const useReadJbControllerUriOf = /*#__PURE__*/ createUseReadContract({
  abi: jbControllerAbi,
  functionName: 'uriOf',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__
 */
export const useWriteJbController = /*#__PURE__*/ createUseWriteContract({
  abi: jbControllerAbi,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"burnTokensOf"`
 */
export const useWriteJbControllerBurnTokensOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbControllerAbi,
    functionName: 'burnTokensOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"claimTokensFor"`
 */
export const useWriteJbControllerClaimTokensFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbControllerAbi,
    functionName: 'claimTokensFor',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"deployERC20For"`
 */
export const useWriteJbControllerDeployErc20For =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbControllerAbi,
    functionName: 'deployERC20For',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"launchProjectFor"`
 */
export const useWriteJbControllerLaunchProjectFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbControllerAbi,
    functionName: 'launchProjectFor',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"launchRulesetsFor"`
 */
export const useWriteJbControllerLaunchRulesetsFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbControllerAbi,
    functionName: 'launchRulesetsFor',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"migrate"`
 */
export const useWriteJbControllerMigrate = /*#__PURE__*/ createUseWriteContract(
  { abi: jbControllerAbi, functionName: 'migrate' },
)

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"mintTokensOf"`
 */
export const useWriteJbControllerMintTokensOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbControllerAbi,
    functionName: 'mintTokensOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"payReservedTokenToTerminal"`
 */
export const useWriteJbControllerPayReservedTokenToTerminal =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbControllerAbi,
    functionName: 'payReservedTokenToTerminal',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"queueRulesetsOf"`
 */
export const useWriteJbControllerQueueRulesetsOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbControllerAbi,
    functionName: 'queueRulesetsOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"receiveMigrationFrom"`
 */
export const useWriteJbControllerReceiveMigrationFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbControllerAbi,
    functionName: 'receiveMigrationFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"sendReservedTokensToSplitsOf"`
 */
export const useWriteJbControllerSendReservedTokensToSplitsOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbControllerAbi,
    functionName: 'sendReservedTokensToSplitsOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"setSplitGroupsOf"`
 */
export const useWriteJbControllerSetSplitGroupsOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbControllerAbi,
    functionName: 'setSplitGroupsOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"setTokenFor"`
 */
export const useWriteJbControllerSetTokenFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbControllerAbi,
    functionName: 'setTokenFor',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"setUriOf"`
 */
export const useWriteJbControllerSetUriOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbControllerAbi,
    functionName: 'setUriOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"transferCreditsFrom"`
 */
export const useWriteJbControllerTransferCreditsFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbControllerAbi,
    functionName: 'transferCreditsFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__
 */
export const useSimulateJbController = /*#__PURE__*/ createUseSimulateContract({
  abi: jbControllerAbi,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"burnTokensOf"`
 */
export const useSimulateJbControllerBurnTokensOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbControllerAbi,
    functionName: 'burnTokensOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"claimTokensFor"`
 */
export const useSimulateJbControllerClaimTokensFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbControllerAbi,
    functionName: 'claimTokensFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"deployERC20For"`
 */
export const useSimulateJbControllerDeployErc20For =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbControllerAbi,
    functionName: 'deployERC20For',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"launchProjectFor"`
 */
export const useSimulateJbControllerLaunchProjectFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbControllerAbi,
    functionName: 'launchProjectFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"launchRulesetsFor"`
 */
export const useSimulateJbControllerLaunchRulesetsFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbControllerAbi,
    functionName: 'launchRulesetsFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"migrate"`
 */
export const useSimulateJbControllerMigrate =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbControllerAbi,
    functionName: 'migrate',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"mintTokensOf"`
 */
export const useSimulateJbControllerMintTokensOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbControllerAbi,
    functionName: 'mintTokensOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"payReservedTokenToTerminal"`
 */
export const useSimulateJbControllerPayReservedTokenToTerminal =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbControllerAbi,
    functionName: 'payReservedTokenToTerminal',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"queueRulesetsOf"`
 */
export const useSimulateJbControllerQueueRulesetsOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbControllerAbi,
    functionName: 'queueRulesetsOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"receiveMigrationFrom"`
 */
export const useSimulateJbControllerReceiveMigrationFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbControllerAbi,
    functionName: 'receiveMigrationFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"sendReservedTokensToSplitsOf"`
 */
export const useSimulateJbControllerSendReservedTokensToSplitsOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbControllerAbi,
    functionName: 'sendReservedTokensToSplitsOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"setSplitGroupsOf"`
 */
export const useSimulateJbControllerSetSplitGroupsOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbControllerAbi,
    functionName: 'setSplitGroupsOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"setTokenFor"`
 */
export const useSimulateJbControllerSetTokenFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbControllerAbi,
    functionName: 'setTokenFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"setUriOf"`
 */
export const useSimulateJbControllerSetUriOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbControllerAbi,
    functionName: 'setUriOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"transferCreditsFrom"`
 */
export const useSimulateJbControllerTransferCreditsFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbControllerAbi,
    functionName: 'transferCreditsFrom',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__
 */
export const useWatchJbControllerEvent =
  /*#__PURE__*/ createUseWatchContractEvent({ abi: jbControllerAbi })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"BurnTokens"`
 */
export const useWatchJbControllerBurnTokensEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbControllerAbi,
    eventName: 'BurnTokens',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"LaunchProject"`
 */
export const useWatchJbControllerLaunchProjectEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbControllerAbi,
    eventName: 'LaunchProject',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"LaunchRulesets"`
 */
export const useWatchJbControllerLaunchRulesetsEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbControllerAbi,
    eventName: 'LaunchRulesets',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"Migrate"`
 */
export const useWatchJbControllerMigrateEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbControllerAbi,
    eventName: 'Migrate',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"MintTokens"`
 */
export const useWatchJbControllerMintTokensEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbControllerAbi,
    eventName: 'MintTokens',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"PrepMigration"`
 */
export const useWatchJbControllerPrepMigrationEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbControllerAbi,
    eventName: 'PrepMigration',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"QueueRulesets"`
 */
export const useWatchJbControllerQueueRulesetsEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbControllerAbi,
    eventName: 'QueueRulesets',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"ReservedDistributionReverted"`
 */
export const useWatchJbControllerReservedDistributionRevertedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbControllerAbi,
    eventName: 'ReservedDistributionReverted',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"SendReservedTokensToSplit"`
 */
export const useWatchJbControllerSendReservedTokensToSplitEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbControllerAbi,
    eventName: 'SendReservedTokensToSplit',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"SendReservedTokensToSplits"`
 */
export const useWatchJbControllerSendReservedTokensToSplitsEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbControllerAbi,
    eventName: 'SendReservedTokensToSplits',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"SetMetadata"`
 */
export const useWatchJbControllerSetMetadataEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbControllerAbi,
    eventName: 'SetMetadata',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbDirectoryAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const useReadJbDirectory = /*#__PURE__*/ createUseReadContract({
  abi: jbDirectoryAbi,
  address: jbDirectoryAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"PERMISSIONS"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const useReadJbDirectoryPermissions =
  /*#__PURE__*/ createUseReadContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'PERMISSIONS',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"PROJECTS"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const useReadJbDirectoryProjects = /*#__PURE__*/ createUseReadContract({
  abi: jbDirectoryAbi,
  address: jbDirectoryAddress,
  functionName: 'PROJECTS',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"controllerOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const useReadJbDirectoryControllerOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'controllerOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"isAllowedToSetFirstController"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const useReadJbDirectoryIsAllowedToSetFirstController =
  /*#__PURE__*/ createUseReadContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'isAllowedToSetFirstController',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"isTerminalOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const useReadJbDirectoryIsTerminalOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'isTerminalOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"owner"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const useReadJbDirectoryOwner = /*#__PURE__*/ createUseReadContract({
  abi: jbDirectoryAbi,
  address: jbDirectoryAddress,
  functionName: 'owner',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"primaryTerminalOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const useReadJbDirectoryPrimaryTerminalOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'primaryTerminalOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"terminalsOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const useReadJbDirectoryTerminalsOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'terminalsOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbDirectoryAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const useWriteJbDirectory = /*#__PURE__*/ createUseWriteContract({
  abi: jbDirectoryAbi,
  address: jbDirectoryAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const useWriteJbDirectoryRenounceOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"setControllerOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const useWriteJbDirectorySetControllerOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'setControllerOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"setIsAllowedToSetFirstController"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const useWriteJbDirectorySetIsAllowedToSetFirstController =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'setIsAllowedToSetFirstController',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"setPrimaryTerminalOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const useWriteJbDirectorySetPrimaryTerminalOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'setPrimaryTerminalOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"setTerminalsOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const useWriteJbDirectorySetTerminalsOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'setTerminalsOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const useWriteJbDirectoryTransferOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbDirectoryAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const useSimulateJbDirectory = /*#__PURE__*/ createUseSimulateContract({
  abi: jbDirectoryAbi,
  address: jbDirectoryAddress,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const useSimulateJbDirectoryRenounceOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"setControllerOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const useSimulateJbDirectorySetControllerOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'setControllerOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"setIsAllowedToSetFirstController"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const useSimulateJbDirectorySetIsAllowedToSetFirstController =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'setIsAllowedToSetFirstController',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"setPrimaryTerminalOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const useSimulateJbDirectorySetPrimaryTerminalOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'setPrimaryTerminalOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"setTerminalsOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const useSimulateJbDirectorySetTerminalsOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'setTerminalsOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const useSimulateJbDirectoryTransferOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbDirectoryAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const useWatchJbDirectoryEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbDirectoryAbi}__ and `eventName` set to `"AddTerminal"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const useWatchJbDirectoryAddTerminalEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    eventName: 'AddTerminal',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbDirectoryAbi}__ and `eventName` set to `"OwnershipTransferred"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const useWatchJbDirectoryOwnershipTransferredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbDirectoryAbi}__ and `eventName` set to `"SetController"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const useWatchJbDirectorySetControllerEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    eventName: 'SetController',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbDirectoryAbi}__ and `eventName` set to `"SetIsAllowedToSetFirstController"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const useWatchJbDirectorySetIsAllowedToSetFirstControllerEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    eventName: 'SetIsAllowedToSetFirstController',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbDirectoryAbi}__ and `eventName` set to `"SetPrimaryTerminal"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const useWatchJbDirectorySetPrimaryTerminalEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    eventName: 'SetPrimaryTerminal',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbDirectoryAbi}__ and `eventName` set to `"SetTerminals"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x317E962828ddBb27576f6F0cA89Adc3cd56Ed8Cc)
 */
export const useWatchJbDirectorySetTerminalsEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    eventName: 'SetTerminals',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbFundAccessLimitsAbi}__
 */
export const useReadJbFundAccessLimits = /*#__PURE__*/ createUseReadContract({
  abi: jbFundAccessLimitsAbi,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbFundAccessLimitsAbi}__ and `functionName` set to `"DIRECTORY"`
 */
export const useReadJbFundAccessLimitsDirectory =
  /*#__PURE__*/ createUseReadContract({
    abi: jbFundAccessLimitsAbi,
    functionName: 'DIRECTORY',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbFundAccessLimitsAbi}__ and `functionName` set to `"payoutLimitOf"`
 */
export const useReadJbFundAccessLimitsPayoutLimitOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbFundAccessLimitsAbi,
    functionName: 'payoutLimitOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbFundAccessLimitsAbi}__ and `functionName` set to `"payoutLimitsOf"`
 */
export const useReadJbFundAccessLimitsPayoutLimitsOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbFundAccessLimitsAbi,
    functionName: 'payoutLimitsOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbFundAccessLimitsAbi}__ and `functionName` set to `"surplusAllowanceOf"`
 */
export const useReadJbFundAccessLimitsSurplusAllowanceOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbFundAccessLimitsAbi,
    functionName: 'surplusAllowanceOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbFundAccessLimitsAbi}__ and `functionName` set to `"surplusAllowancesOf"`
 */
export const useReadJbFundAccessLimitsSurplusAllowancesOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbFundAccessLimitsAbi,
    functionName: 'surplusAllowancesOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbFundAccessLimitsAbi}__
 */
export const useWriteJbFundAccessLimits = /*#__PURE__*/ createUseWriteContract({
  abi: jbFundAccessLimitsAbi,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbFundAccessLimitsAbi}__ and `functionName` set to `"setFundAccessLimitsFor"`
 */
export const useWriteJbFundAccessLimitsSetFundAccessLimitsFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbFundAccessLimitsAbi,
    functionName: 'setFundAccessLimitsFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbFundAccessLimitsAbi}__
 */
export const useSimulateJbFundAccessLimits =
  /*#__PURE__*/ createUseSimulateContract({ abi: jbFundAccessLimitsAbi })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbFundAccessLimitsAbi}__ and `functionName` set to `"setFundAccessLimitsFor"`
 */
export const useSimulateJbFundAccessLimitsSetFundAccessLimitsFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbFundAccessLimitsAbi,
    functionName: 'setFundAccessLimitsFor',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbFundAccessLimitsAbi}__
 */
export const useWatchJbFundAccessLimitsEvent =
  /*#__PURE__*/ createUseWatchContractEvent({ abi: jbFundAccessLimitsAbi })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbFundAccessLimitsAbi}__ and `eventName` set to `"SetFundAccessLimits"`
 */
export const useWatchJbFundAccessLimitsSetFundAccessLimitsEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbFundAccessLimitsAbi,
    eventName: 'SetFundAccessLimits',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__
 */
export const useReadJbMultiTerminal = /*#__PURE__*/ createUseReadContract({
  abi: jbMultiTerminalAbi,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"DIRECTORY"`
 */
export const useReadJbMultiTerminalDirectory =
  /*#__PURE__*/ createUseReadContract({
    abi: jbMultiTerminalAbi,
    functionName: 'DIRECTORY',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"FEE"`
 */
export const useReadJbMultiTerminalFee = /*#__PURE__*/ createUseReadContract({
  abi: jbMultiTerminalAbi,
  functionName: 'FEE',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"FEELESS_ADDRESSES"`
 */
export const useReadJbMultiTerminalFeelessAddresses =
  /*#__PURE__*/ createUseReadContract({
    abi: jbMultiTerminalAbi,
    functionName: 'FEELESS_ADDRESSES',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"PERMISSIONS"`
 */
export const useReadJbMultiTerminalPermissions =
  /*#__PURE__*/ createUseReadContract({
    abi: jbMultiTerminalAbi,
    functionName: 'PERMISSIONS',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"PERMIT2"`
 */
export const useReadJbMultiTerminalPermit2 =
  /*#__PURE__*/ createUseReadContract({
    abi: jbMultiTerminalAbi,
    functionName: 'PERMIT2',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"PROJECTS"`
 */
export const useReadJbMultiTerminalProjects =
  /*#__PURE__*/ createUseReadContract({
    abi: jbMultiTerminalAbi,
    functionName: 'PROJECTS',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"SPLITS"`
 */
export const useReadJbMultiTerminalSplits = /*#__PURE__*/ createUseReadContract(
  { abi: jbMultiTerminalAbi, functionName: 'SPLITS' },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"STORE"`
 */
export const useReadJbMultiTerminalStore = /*#__PURE__*/ createUseReadContract({
  abi: jbMultiTerminalAbi,
  functionName: 'STORE',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"accountingContextForTokenOf"`
 */
export const useReadJbMultiTerminalAccountingContextForTokenOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbMultiTerminalAbi,
    functionName: 'accountingContextForTokenOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"accountingContextsOf"`
 */
export const useReadJbMultiTerminalAccountingContextsOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbMultiTerminalAbi,
    functionName: 'accountingContextsOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"currentSurplusOf"`
 */
export const useReadJbMultiTerminalCurrentSurplusOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbMultiTerminalAbi,
    functionName: 'currentSurplusOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"heldFeesOf"`
 */
export const useReadJbMultiTerminalHeldFeesOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbMultiTerminalAbi,
    functionName: 'heldFeesOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"isTrustedForwarder"`
 */
export const useReadJbMultiTerminalIsTrustedForwarder =
  /*#__PURE__*/ createUseReadContract({
    abi: jbMultiTerminalAbi,
    functionName: 'isTrustedForwarder',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"supportsInterface"`
 */
export const useReadJbMultiTerminalSupportsInterface =
  /*#__PURE__*/ createUseReadContract({
    abi: jbMultiTerminalAbi,
    functionName: 'supportsInterface',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"trustedForwarder"`
 */
export const useReadJbMultiTerminalTrustedForwarder =
  /*#__PURE__*/ createUseReadContract({
    abi: jbMultiTerminalAbi,
    functionName: 'trustedForwarder',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__
 */
export const useWriteJbMultiTerminal = /*#__PURE__*/ createUseWriteContract({
  abi: jbMultiTerminalAbi,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"addAccountingContextsFor"`
 */
export const useWriteJbMultiTerminalAddAccountingContextsFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbMultiTerminalAbi,
    functionName: 'addAccountingContextsFor',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"addToBalanceOf"`
 */
export const useWriteJbMultiTerminalAddToBalanceOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbMultiTerminalAbi,
    functionName: 'addToBalanceOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"executePayout"`
 */
export const useWriteJbMultiTerminalExecutePayout =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbMultiTerminalAbi,
    functionName: 'executePayout',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"executeProcessFee"`
 */
export const useWriteJbMultiTerminalExecuteProcessFee =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbMultiTerminalAbi,
    functionName: 'executeProcessFee',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"migrateBalanceOf"`
 */
export const useWriteJbMultiTerminalMigrateBalanceOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbMultiTerminalAbi,
    functionName: 'migrateBalanceOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"pay"`
 */
export const useWriteJbMultiTerminalPay = /*#__PURE__*/ createUseWriteContract({
  abi: jbMultiTerminalAbi,
  functionName: 'pay',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"processHeldFeesOf"`
 */
export const useWriteJbMultiTerminalProcessHeldFeesOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbMultiTerminalAbi,
    functionName: 'processHeldFeesOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"redeemTokensOf"`
 */
export const useWriteJbMultiTerminalRedeemTokensOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbMultiTerminalAbi,
    functionName: 'redeemTokensOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"sendPayoutsOf"`
 */
export const useWriteJbMultiTerminalSendPayoutsOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbMultiTerminalAbi,
    functionName: 'sendPayoutsOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"useAllowanceOf"`
 */
export const useWriteJbMultiTerminalUseAllowanceOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbMultiTerminalAbi,
    functionName: 'useAllowanceOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__
 */
export const useSimulateJbMultiTerminal =
  /*#__PURE__*/ createUseSimulateContract({ abi: jbMultiTerminalAbi })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"addAccountingContextsFor"`
 */
export const useSimulateJbMultiTerminalAddAccountingContextsFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbMultiTerminalAbi,
    functionName: 'addAccountingContextsFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"addToBalanceOf"`
 */
export const useSimulateJbMultiTerminalAddToBalanceOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbMultiTerminalAbi,
    functionName: 'addToBalanceOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"executePayout"`
 */
export const useSimulateJbMultiTerminalExecutePayout =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbMultiTerminalAbi,
    functionName: 'executePayout',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"executeProcessFee"`
 */
export const useSimulateJbMultiTerminalExecuteProcessFee =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbMultiTerminalAbi,
    functionName: 'executeProcessFee',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"migrateBalanceOf"`
 */
export const useSimulateJbMultiTerminalMigrateBalanceOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbMultiTerminalAbi,
    functionName: 'migrateBalanceOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"pay"`
 */
export const useSimulateJbMultiTerminalPay =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbMultiTerminalAbi,
    functionName: 'pay',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"processHeldFeesOf"`
 */
export const useSimulateJbMultiTerminalProcessHeldFeesOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbMultiTerminalAbi,
    functionName: 'processHeldFeesOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"redeemTokensOf"`
 */
export const useSimulateJbMultiTerminalRedeemTokensOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbMultiTerminalAbi,
    functionName: 'redeemTokensOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"sendPayoutsOf"`
 */
export const useSimulateJbMultiTerminalSendPayoutsOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbMultiTerminalAbi,
    functionName: 'sendPayoutsOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"useAllowanceOf"`
 */
export const useSimulateJbMultiTerminalUseAllowanceOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbMultiTerminalAbi,
    functionName: 'useAllowanceOf',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__
 */
export const useWatchJbMultiTerminalEvent =
  /*#__PURE__*/ createUseWatchContractEvent({ abi: jbMultiTerminalAbi })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"AddToBalance"`
 */
export const useWatchJbMultiTerminalAddToBalanceEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'AddToBalance',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"FeeReverted"`
 */
export const useWatchJbMultiTerminalFeeRevertedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'FeeReverted',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"HoldFee"`
 */
export const useWatchJbMultiTerminalHoldFeeEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'HoldFee',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"HookAfterRecordPay"`
 */
export const useWatchJbMultiTerminalHookAfterRecordPayEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'HookAfterRecordPay',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"HookAfterRecordRedeem"`
 */
export const useWatchJbMultiTerminalHookAfterRecordRedeemEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'HookAfterRecordRedeem',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"MigrateTerminal"`
 */
export const useWatchJbMultiTerminalMigrateTerminalEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'MigrateTerminal',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"Pay"`
 */
export const useWatchJbMultiTerminalPayEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'Pay',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"PayoutReverted"`
 */
export const useWatchJbMultiTerminalPayoutRevertedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'PayoutReverted',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"ProcessFee"`
 */
export const useWatchJbMultiTerminalProcessFeeEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'ProcessFee',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"RedeemTokens"`
 */
export const useWatchJbMultiTerminalRedeemTokensEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'RedeemTokens',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"ReturnHeldFees"`
 */
export const useWatchJbMultiTerminalReturnHeldFeesEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'ReturnHeldFees',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"SendPayoutToSplit"`
 */
export const useWatchJbMultiTerminalSendPayoutToSplitEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'SendPayoutToSplit',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"SendPayouts"`
 */
export const useWatchJbMultiTerminalSendPayoutsEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'SendPayouts',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"SetAccountingContext"`
 */
export const useWatchJbMultiTerminalSetAccountingContextEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'SetAccountingContext',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"UseAllowance"`
 */
export const useWatchJbMultiTerminalUseAllowanceEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    eventName: 'UseAllowance',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbPermissionsAbi}__
 */
export const useReadJbPermissions = /*#__PURE__*/ createUseReadContract({
  abi: jbPermissionsAbi,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbPermissionsAbi}__ and `functionName` set to `"WILDCARD_PROJECT_ID"`
 */
export const useReadJbPermissionsWildcardProjectId =
  /*#__PURE__*/ createUseReadContract({
    abi: jbPermissionsAbi,
    functionName: 'WILDCARD_PROJECT_ID',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbPermissionsAbi}__ and `functionName` set to `"hasPermission"`
 */
export const useReadJbPermissionsHasPermission =
  /*#__PURE__*/ createUseReadContract({
    abi: jbPermissionsAbi,
    functionName: 'hasPermission',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbPermissionsAbi}__ and `functionName` set to `"hasPermissions"`
 */
export const useReadJbPermissionsHasPermissions =
  /*#__PURE__*/ createUseReadContract({
    abi: jbPermissionsAbi,
    functionName: 'hasPermissions',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbPermissionsAbi}__ and `functionName` set to `"permissionsOf"`
 */
export const useReadJbPermissionsPermissionsOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbPermissionsAbi,
    functionName: 'permissionsOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbPermissionsAbi}__
 */
export const useWriteJbPermissions = /*#__PURE__*/ createUseWriteContract({
  abi: jbPermissionsAbi,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbPermissionsAbi}__ and `functionName` set to `"setPermissionsFor"`
 */
export const useWriteJbPermissionsSetPermissionsFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbPermissionsAbi,
    functionName: 'setPermissionsFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbPermissionsAbi}__
 */
export const useSimulateJbPermissions = /*#__PURE__*/ createUseSimulateContract(
  { abi: jbPermissionsAbi },
)

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbPermissionsAbi}__ and `functionName` set to `"setPermissionsFor"`
 */
export const useSimulateJbPermissionsSetPermissionsFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbPermissionsAbi,
    functionName: 'setPermissionsFor',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbPermissionsAbi}__
 */
export const useWatchJbPermissionsEvent =
  /*#__PURE__*/ createUseWatchContractEvent({ abi: jbPermissionsAbi })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbPermissionsAbi}__ and `eventName` set to `"OperatorPermissionsSet"`
 */
export const useWatchJbPermissionsOperatorPermissionsSetEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbPermissionsAbi,
    eventName: 'OperatorPermissionsSet',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__
 */
export const useReadJbProjects = /*#__PURE__*/ createUseReadContract({
  abi: jbProjectsAbi,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"balanceOf"`
 */
export const useReadJbProjectsBalanceOf = /*#__PURE__*/ createUseReadContract({
  abi: jbProjectsAbi,
  functionName: 'balanceOf',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"count"`
 */
export const useReadJbProjectsCount = /*#__PURE__*/ createUseReadContract({
  abi: jbProjectsAbi,
  functionName: 'count',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"getApproved"`
 */
export const useReadJbProjectsGetApproved = /*#__PURE__*/ createUseReadContract(
  { abi: jbProjectsAbi, functionName: 'getApproved' },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"isApprovedForAll"`
 */
export const useReadJbProjectsIsApprovedForAll =
  /*#__PURE__*/ createUseReadContract({
    abi: jbProjectsAbi,
    functionName: 'isApprovedForAll',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"name"`
 */
export const useReadJbProjectsName = /*#__PURE__*/ createUseReadContract({
  abi: jbProjectsAbi,
  functionName: 'name',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"owner"`
 */
export const useReadJbProjectsOwner = /*#__PURE__*/ createUseReadContract({
  abi: jbProjectsAbi,
  functionName: 'owner',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"ownerOf"`
 */
export const useReadJbProjectsOwnerOf = /*#__PURE__*/ createUseReadContract({
  abi: jbProjectsAbi,
  functionName: 'ownerOf',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"supportsInterface"`
 */
export const useReadJbProjectsSupportsInterface =
  /*#__PURE__*/ createUseReadContract({
    abi: jbProjectsAbi,
    functionName: 'supportsInterface',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"symbol"`
 */
export const useReadJbProjectsSymbol = /*#__PURE__*/ createUseReadContract({
  abi: jbProjectsAbi,
  functionName: 'symbol',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"tokenURI"`
 */
export const useReadJbProjectsTokenUri = /*#__PURE__*/ createUseReadContract({
  abi: jbProjectsAbi,
  functionName: 'tokenURI',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"tokenUriResolver"`
 */
export const useReadJbProjectsTokenUriResolver =
  /*#__PURE__*/ createUseReadContract({
    abi: jbProjectsAbi,
    functionName: 'tokenUriResolver',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbProjectsAbi}__
 */
export const useWriteJbProjects = /*#__PURE__*/ createUseWriteContract({
  abi: jbProjectsAbi,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"approve"`
 */
export const useWriteJbProjectsApprove = /*#__PURE__*/ createUseWriteContract({
  abi: jbProjectsAbi,
  functionName: 'approve',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"createFor"`
 */
export const useWriteJbProjectsCreateFor = /*#__PURE__*/ createUseWriteContract(
  { abi: jbProjectsAbi, functionName: 'createFor' },
)

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"renounceOwnership"`
 */
export const useWriteJbProjectsRenounceOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbProjectsAbi,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"safeTransferFrom"`
 */
export const useWriteJbProjectsSafeTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbProjectsAbi,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"setApprovalForAll"`
 */
export const useWriteJbProjectsSetApprovalForAll =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbProjectsAbi,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"setTokenUriResolver"`
 */
export const useWriteJbProjectsSetTokenUriResolver =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbProjectsAbi,
    functionName: 'setTokenUriResolver',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"transferFrom"`
 */
export const useWriteJbProjectsTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbProjectsAbi,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"transferOwnership"`
 */
export const useWriteJbProjectsTransferOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbProjectsAbi,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbProjectsAbi}__
 */
export const useSimulateJbProjects = /*#__PURE__*/ createUseSimulateContract({
  abi: jbProjectsAbi,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"approve"`
 */
export const useSimulateJbProjectsApprove =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbProjectsAbi,
    functionName: 'approve',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"createFor"`
 */
export const useSimulateJbProjectsCreateFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbProjectsAbi,
    functionName: 'createFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"renounceOwnership"`
 */
export const useSimulateJbProjectsRenounceOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbProjectsAbi,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"safeTransferFrom"`
 */
export const useSimulateJbProjectsSafeTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbProjectsAbi,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"setApprovalForAll"`
 */
export const useSimulateJbProjectsSetApprovalForAll =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbProjectsAbi,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"setTokenUriResolver"`
 */
export const useSimulateJbProjectsSetTokenUriResolver =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbProjectsAbi,
    functionName: 'setTokenUriResolver',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"transferFrom"`
 */
export const useSimulateJbProjectsTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbProjectsAbi,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"transferOwnership"`
 */
export const useSimulateJbProjectsTransferOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbProjectsAbi,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbProjectsAbi}__
 */
export const useWatchJbProjectsEvent =
  /*#__PURE__*/ createUseWatchContractEvent({ abi: jbProjectsAbi })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbProjectsAbi}__ and `eventName` set to `"Approval"`
 */
export const useWatchJbProjectsApprovalEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbProjectsAbi,
    eventName: 'Approval',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbProjectsAbi}__ and `eventName` set to `"ApprovalForAll"`
 */
export const useWatchJbProjectsApprovalForAllEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbProjectsAbi,
    eventName: 'ApprovalForAll',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbProjectsAbi}__ and `eventName` set to `"Create"`
 */
export const useWatchJbProjectsCreateEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbProjectsAbi,
    eventName: 'Create',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbProjectsAbi}__ and `eventName` set to `"OwnershipTransferred"`
 */
export const useWatchJbProjectsOwnershipTransferredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbProjectsAbi,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbProjectsAbi}__ and `eventName` set to `"SetTokenUriResolver"`
 */
export const useWatchJbProjectsSetTokenUriResolverEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbProjectsAbi,
    eventName: 'SetTokenUriResolver',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbProjectsAbi}__ and `eventName` set to `"Transfer"`
 */
export const useWatchJbProjectsTransferEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbProjectsAbi,
    eventName: 'Transfer',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbRulesetsAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 */
export const useReadJbRulesets = /*#__PURE__*/ createUseReadContract({
  abi: jbRulesetsAbi,
  address: jbRulesetsAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"DIRECTORY"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 */
export const useReadJbRulesetsDirectory = /*#__PURE__*/ createUseReadContract({
  abi: jbRulesetsAbi,
  address: jbRulesetsAddress,
  functionName: 'DIRECTORY',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"currentApprovalStatusForLatestRulesetOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 */
export const useReadJbRulesetsCurrentApprovalStatusForLatestRulesetOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbRulesetsAbi,
    address: jbRulesetsAddress,
    functionName: 'currentApprovalStatusForLatestRulesetOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"currentOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 */
export const useReadJbRulesetsCurrentOf = /*#__PURE__*/ createUseReadContract({
  abi: jbRulesetsAbi,
  address: jbRulesetsAddress,
  functionName: 'currentOf',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"getRulesetOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 */
export const useReadJbRulesetsGetRulesetOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbRulesetsAbi,
    address: jbRulesetsAddress,
    functionName: 'getRulesetOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"latestQueuedOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 */
export const useReadJbRulesetsLatestQueuedOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbRulesetsAbi,
    address: jbRulesetsAddress,
    functionName: 'latestQueuedOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"latestRulesetIdOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 */
export const useReadJbRulesetsLatestRulesetIdOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbRulesetsAbi,
    address: jbRulesetsAddress,
    functionName: 'latestRulesetIdOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"rulesetsOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 */
export const useReadJbRulesetsRulesetsOf = /*#__PURE__*/ createUseReadContract({
  abi: jbRulesetsAbi,
  address: jbRulesetsAddress,
  functionName: 'rulesetsOf',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"upcomingOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 */
export const useReadJbRulesetsUpcomingOf = /*#__PURE__*/ createUseReadContract({
  abi: jbRulesetsAbi,
  address: jbRulesetsAddress,
  functionName: 'upcomingOf',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbRulesetsAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 */
export const useWriteJbRulesets = /*#__PURE__*/ createUseWriteContract({
  abi: jbRulesetsAbi,
  address: jbRulesetsAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"queueFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 */
export const useWriteJbRulesetsQueueFor = /*#__PURE__*/ createUseWriteContract({
  abi: jbRulesetsAbi,
  address: jbRulesetsAddress,
  functionName: 'queueFor',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"updateRulesetWeightCache"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 */
export const useWriteJbRulesetsUpdateRulesetWeightCache =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbRulesetsAbi,
    address: jbRulesetsAddress,
    functionName: 'updateRulesetWeightCache',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbRulesetsAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 */
export const useSimulateJbRulesets = /*#__PURE__*/ createUseSimulateContract({
  abi: jbRulesetsAbi,
  address: jbRulesetsAddress,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"queueFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 */
export const useSimulateJbRulesetsQueueFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbRulesetsAbi,
    address: jbRulesetsAddress,
    functionName: 'queueFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"updateRulesetWeightCache"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 */
export const useSimulateJbRulesetsUpdateRulesetWeightCache =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbRulesetsAbi,
    address: jbRulesetsAddress,
    functionName: 'updateRulesetWeightCache',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbRulesetsAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 */
export const useWatchJbRulesetsEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbRulesetsAbi,
    address: jbRulesetsAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbRulesetsAbi}__ and `eventName` set to `"RulesetInitialized"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 */
export const useWatchJbRulesetsRulesetInitializedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbRulesetsAbi,
    address: jbRulesetsAddress,
    eventName: 'RulesetInitialized',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbRulesetsAbi}__ and `eventName` set to `"RulesetQueued"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x8e4B8F9eAf7dd02f87e30D4F0A4a5f06d1553e2C)
 */
export const useWatchJbRulesetsRulesetQueuedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbRulesetsAbi,
    address: jbRulesetsAddress,
    eventName: 'RulesetQueued',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbSplitsAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x20d892d9296A4d69E94C202f5C41a299Da72B117)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x20d892d9296A4d69E94C202f5C41a299Da72B117)
 */
export const useReadJbSplits = /*#__PURE__*/ createUseReadContract({
  abi: jbSplitsAbi,
  address: jbSplitsAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbSplitsAbi}__ and `functionName` set to `"DIRECTORY"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x20d892d9296A4d69E94C202f5C41a299Da72B117)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x20d892d9296A4d69E94C202f5C41a299Da72B117)
 */
export const useReadJbSplitsDirectory = /*#__PURE__*/ createUseReadContract({
  abi: jbSplitsAbi,
  address: jbSplitsAddress,
  functionName: 'DIRECTORY',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbSplitsAbi}__ and `functionName` set to `"FALLBACK_RULESET_ID"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x20d892d9296A4d69E94C202f5C41a299Da72B117)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x20d892d9296A4d69E94C202f5C41a299Da72B117)
 */
export const useReadJbSplitsFallbackRulesetId =
  /*#__PURE__*/ createUseReadContract({
    abi: jbSplitsAbi,
    address: jbSplitsAddress,
    functionName: 'FALLBACK_RULESET_ID',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbSplitsAbi}__ and `functionName` set to `"splitsOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x20d892d9296A4d69E94C202f5C41a299Da72B117)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x20d892d9296A4d69E94C202f5C41a299Da72B117)
 */
export const useReadJbSplitsSplitsOf = /*#__PURE__*/ createUseReadContract({
  abi: jbSplitsAbi,
  address: jbSplitsAddress,
  functionName: 'splitsOf',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbSplitsAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x20d892d9296A4d69E94C202f5C41a299Da72B117)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x20d892d9296A4d69E94C202f5C41a299Da72B117)
 */
export const useWriteJbSplits = /*#__PURE__*/ createUseWriteContract({
  abi: jbSplitsAbi,
  address: jbSplitsAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbSplitsAbi}__ and `functionName` set to `"setSplitGroupsOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x20d892d9296A4d69E94C202f5C41a299Da72B117)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x20d892d9296A4d69E94C202f5C41a299Da72B117)
 */
export const useWriteJbSplitsSetSplitGroupsOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbSplitsAbi,
    address: jbSplitsAddress,
    functionName: 'setSplitGroupsOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbSplitsAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x20d892d9296A4d69E94C202f5C41a299Da72B117)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x20d892d9296A4d69E94C202f5C41a299Da72B117)
 */
export const useSimulateJbSplits = /*#__PURE__*/ createUseSimulateContract({
  abi: jbSplitsAbi,
  address: jbSplitsAddress,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbSplitsAbi}__ and `functionName` set to `"setSplitGroupsOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x20d892d9296A4d69E94C202f5C41a299Da72B117)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x20d892d9296A4d69E94C202f5C41a299Da72B117)
 */
export const useSimulateJbSplitsSetSplitGroupsOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbSplitsAbi,
    address: jbSplitsAddress,
    functionName: 'setSplitGroupsOf',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbSplitsAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x20d892d9296A4d69E94C202f5C41a299Da72B117)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x20d892d9296A4d69E94C202f5C41a299Da72B117)
 */
export const useWatchJbSplitsEvent = /*#__PURE__*/ createUseWatchContractEvent({
  abi: jbSplitsAbi,
  address: jbSplitsAddress,
})

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbSplitsAbi}__ and `eventName` set to `"SetSplit"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x20d892d9296A4d69E94C202f5C41a299Da72B117)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x20d892d9296A4d69E94C202f5C41a299Da72B117)
 */
export const useWatchJbSplitsSetSplitEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbSplitsAbi,
    address: jbSplitsAddress,
    eventName: 'SetSplit',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__
 */
export const useReadJbTerminalStore = /*#__PURE__*/ createUseReadContract({
  abi: jbTerminalStoreAbi,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"DIRECTORY"`
 */
export const useReadJbTerminalStoreDirectory =
  /*#__PURE__*/ createUseReadContract({
    abi: jbTerminalStoreAbi,
    functionName: 'DIRECTORY',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"PRICES"`
 */
export const useReadJbTerminalStorePrices = /*#__PURE__*/ createUseReadContract(
  { abi: jbTerminalStoreAbi, functionName: 'PRICES' },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"RULESETS"`
 */
export const useReadJbTerminalStoreRulesets =
  /*#__PURE__*/ createUseReadContract({
    abi: jbTerminalStoreAbi,
    functionName: 'RULESETS',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"balanceOf"`
 */
export const useReadJbTerminalStoreBalanceOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbTerminalStoreAbi,
    functionName: 'balanceOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"currentReclaimableSurplusOf"`
 */
export const useReadJbTerminalStoreCurrentReclaimableSurplusOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbTerminalStoreAbi,
    functionName: 'currentReclaimableSurplusOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"currentSurplusOf"`
 */
export const useReadJbTerminalStoreCurrentSurplusOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbTerminalStoreAbi,
    functionName: 'currentSurplusOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"currentTotalSurplusOf"`
 */
export const useReadJbTerminalStoreCurrentTotalSurplusOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbTerminalStoreAbi,
    functionName: 'currentTotalSurplusOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"usedPayoutLimitOf"`
 */
export const useReadJbTerminalStoreUsedPayoutLimitOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbTerminalStoreAbi,
    functionName: 'usedPayoutLimitOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"usedSurplusAllowanceOf"`
 */
export const useReadJbTerminalStoreUsedSurplusAllowanceOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbTerminalStoreAbi,
    functionName: 'usedSurplusAllowanceOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__
 */
export const useWriteJbTerminalStore = /*#__PURE__*/ createUseWriteContract({
  abi: jbTerminalStoreAbi,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordAddedBalanceFor"`
 */
export const useWriteJbTerminalStoreRecordAddedBalanceFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbTerminalStoreAbi,
    functionName: 'recordAddedBalanceFor',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordPaymentFrom"`
 */
export const useWriteJbTerminalStoreRecordPaymentFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbTerminalStoreAbi,
    functionName: 'recordPaymentFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordPayoutFor"`
 */
export const useWriteJbTerminalStoreRecordPayoutFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbTerminalStoreAbi,
    functionName: 'recordPayoutFor',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordRedemptionFor"`
 */
export const useWriteJbTerminalStoreRecordRedemptionFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbTerminalStoreAbi,
    functionName: 'recordRedemptionFor',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordTerminalMigration"`
 */
export const useWriteJbTerminalStoreRecordTerminalMigration =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbTerminalStoreAbi,
    functionName: 'recordTerminalMigration',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordUsedAllowanceOf"`
 */
export const useWriteJbTerminalStoreRecordUsedAllowanceOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbTerminalStoreAbi,
    functionName: 'recordUsedAllowanceOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__
 */
export const useSimulateJbTerminalStore =
  /*#__PURE__*/ createUseSimulateContract({ abi: jbTerminalStoreAbi })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordAddedBalanceFor"`
 */
export const useSimulateJbTerminalStoreRecordAddedBalanceFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbTerminalStoreAbi,
    functionName: 'recordAddedBalanceFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordPaymentFrom"`
 */
export const useSimulateJbTerminalStoreRecordPaymentFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbTerminalStoreAbi,
    functionName: 'recordPaymentFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordPayoutFor"`
 */
export const useSimulateJbTerminalStoreRecordPayoutFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbTerminalStoreAbi,
    functionName: 'recordPayoutFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordRedemptionFor"`
 */
export const useSimulateJbTerminalStoreRecordRedemptionFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbTerminalStoreAbi,
    functionName: 'recordRedemptionFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordTerminalMigration"`
 */
export const useSimulateJbTerminalStoreRecordTerminalMigration =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbTerminalStoreAbi,
    functionName: 'recordTerminalMigration',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordUsedAllowanceOf"`
 */
export const useSimulateJbTerminalStoreRecordUsedAllowanceOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbTerminalStoreAbi,
    functionName: 'recordUsedAllowanceOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTokensAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const useReadJbTokens = /*#__PURE__*/ createUseReadContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"DIRECTORY"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const useReadJbTokensDirectory = /*#__PURE__*/ createUseReadContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
  functionName: 'DIRECTORY',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"TOKEN"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const useReadJbTokensToken = /*#__PURE__*/ createUseReadContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
  functionName: 'TOKEN',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"creditBalanceOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const useReadJbTokensCreditBalanceOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbTokensAbi,
    address: jbTokensAddress,
    functionName: 'creditBalanceOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"projectIdOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const useReadJbTokensProjectIdOf = /*#__PURE__*/ createUseReadContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
  functionName: 'projectIdOf',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"tokenOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const useReadJbTokensTokenOf = /*#__PURE__*/ createUseReadContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
  functionName: 'tokenOf',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"totalBalanceOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const useReadJbTokensTotalBalanceOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbTokensAbi,
    address: jbTokensAddress,
    functionName: 'totalBalanceOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"totalCreditSupplyOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const useReadJbTokensTotalCreditSupplyOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbTokensAbi,
    address: jbTokensAddress,
    functionName: 'totalCreditSupplyOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"totalSupplyOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const useReadJbTokensTotalSupplyOf = /*#__PURE__*/ createUseReadContract(
  { abi: jbTokensAbi, address: jbTokensAddress, functionName: 'totalSupplyOf' },
)

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbTokensAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const useWriteJbTokens = /*#__PURE__*/ createUseWriteContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"burnFrom"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const useWriteJbTokensBurnFrom = /*#__PURE__*/ createUseWriteContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
  functionName: 'burnFrom',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"claimTokensFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const useWriteJbTokensClaimTokensFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbTokensAbi,
    address: jbTokensAddress,
    functionName: 'claimTokensFor',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"deployERC20For"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const useWriteJbTokensDeployErc20For =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbTokensAbi,
    address: jbTokensAddress,
    functionName: 'deployERC20For',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"mintFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const useWriteJbTokensMintFor = /*#__PURE__*/ createUseWriteContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
  functionName: 'mintFor',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"setTokenFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const useWriteJbTokensSetTokenFor = /*#__PURE__*/ createUseWriteContract(
  { abi: jbTokensAbi, address: jbTokensAddress, functionName: 'setTokenFor' },
)

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"transferCreditsFrom"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const useWriteJbTokensTransferCreditsFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbTokensAbi,
    address: jbTokensAddress,
    functionName: 'transferCreditsFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbTokensAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const useSimulateJbTokens = /*#__PURE__*/ createUseSimulateContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"burnFrom"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const useSimulateJbTokensBurnFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbTokensAbi,
    address: jbTokensAddress,
    functionName: 'burnFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"claimTokensFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const useSimulateJbTokensClaimTokensFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbTokensAbi,
    address: jbTokensAddress,
    functionName: 'claimTokensFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"deployERC20For"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const useSimulateJbTokensDeployErc20For =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbTokensAbi,
    address: jbTokensAddress,
    functionName: 'deployERC20For',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"mintFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const useSimulateJbTokensMintFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbTokensAbi,
    address: jbTokensAddress,
    functionName: 'mintFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"setTokenFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const useSimulateJbTokensSetTokenFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbTokensAbi,
    address: jbTokensAddress,
    functionName: 'setTokenFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"transferCreditsFrom"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const useSimulateJbTokensTransferCreditsFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbTokensAbi,
    address: jbTokensAddress,
    functionName: 'transferCreditsFrom',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbTokensAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const useWatchJbTokensEvent = /*#__PURE__*/ createUseWatchContractEvent({
  abi: jbTokensAbi,
  address: jbTokensAddress,
})

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbTokensAbi}__ and `eventName` set to `"Burn"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const useWatchJbTokensBurnEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbTokensAbi,
    address: jbTokensAddress,
    eventName: 'Burn',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbTokensAbi}__ and `eventName` set to `"ClaimTokens"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const useWatchJbTokensClaimTokensEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbTokensAbi,
    address: jbTokensAddress,
    eventName: 'ClaimTokens',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbTokensAbi}__ and `eventName` set to `"DeployERC20"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const useWatchJbTokensDeployErc20Event =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbTokensAbi,
    address: jbTokensAddress,
    eventName: 'DeployERC20',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbTokensAbi}__ and `eventName` set to `"Mint"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const useWatchJbTokensMintEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbTokensAbi,
    address: jbTokensAddress,
    eventName: 'Mint',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbTokensAbi}__ and `eventName` set to `"SetToken"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const useWatchJbTokensSetTokenEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbTokensAbi,
    address: jbTokensAddress,
    eventName: 'SetToken',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbTokensAbi}__ and `eventName` set to `"TransferCredits"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4AB442694fBA157Eae62BCa398A4A3dC2e36dCcD)
 */
export const useWatchJbTokensTransferCreditsEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbTokensAbi,
    address: jbTokensAddress,
    eventName: 'TransferCredits',
  })
