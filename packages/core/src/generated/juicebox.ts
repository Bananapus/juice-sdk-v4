//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ERC2771Forwarder
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JB721TiersHookProjectDeployer
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
      { name: 'tokens', internalType: 'contract IJBTokens', type: 'address' },
      { name: 'weth', internalType: 'contract IWETH9', type: 'address' },
      { name: 'factory', internalType: 'address', type: 'address' },
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
    name: 'MAX_TWAP_WINDOW',
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
    name: 'TOKENS',
    outputs: [
      { name: '', internalType: 'contract IJBTokens', type: 'address' },
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
    name: 'UNCERTAIN_TWAP_SLIPPAGE_TOLERANCE',
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
      { name: '', internalType: 'address', type: 'address' },
    ],
    name: 'hasMintPermissionFor',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'pure',
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
      { name: 'twapWindow', internalType: 'uint256', type: 'uint256' },
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
      { name: 'newWindow', internalType: 'uint256', type: 'uint256' },
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
    inputs: [],
    name: 'trustedForwarder',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'twapWindowOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
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
// JBBuybackHookRegistry
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const jbBuybackHookRegistryAbi = [
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
      { name: 'trustedForwarder', internalType: 'address', type: 'address' },
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
    inputs: [
      {
        name: 'hook',
        internalType: 'contract IJBRulesetDataHook',
        type: 'address',
      },
    ],
    name: 'allowHook',
    outputs: [],
    stateMutability: 'nonpayable',
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
    inputs: [],
    name: 'defaultHook',
    outputs: [
      {
        name: '',
        internalType: 'contract IJBRulesetDataHook',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'hook',
        internalType: 'contract IJBRulesetDataHook',
        type: 'address',
      },
    ],
    name: 'disallowHook',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'hasLockedHook',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
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
      { name: 'addr', internalType: 'address', type: 'address' },
    ],
    name: 'hasMintPermissionFor',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'hookOf',
    outputs: [
      {
        name: '',
        internalType: 'contract IJBRulesetDataHook',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'hook',
        internalType: 'contract IJBRulesetDataHook',
        type: 'address',
      },
    ],
    name: 'isHookAllowed',
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
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'lockHookFor',
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
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'hook',
        internalType: 'contract IJBRulesetDataHook',
        type: 'address',
      },
    ],
    name: 'setDefaultHook',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'hook',
        internalType: 'contract IJBRulesetDataHook',
        type: 'address',
      },
    ],
    name: 'setHookFor',
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
        name: 'hook',
        internalType: 'contract IJBRulesetDataHook',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'JBBuybackHookRegistry_AllowHook',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'hook',
        internalType: 'contract IJBRulesetDataHook',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'JBBuybackHookRegistry_DisallowHook',
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
    ],
    name: 'JBBuybackHookRegistry_LockHook',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'hook',
        internalType: 'contract IJBRulesetDataHook',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'JBBuybackHookRegistry_SetDefaultHook',
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
        internalType: 'contract IJBRulesetDataHook',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'JBBuybackHookRegistry_SetHook',
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
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'JBBuybackHookRegistry_HookLocked',
  },
  {
    type: 'error',
    inputs: [
      {
        name: 'hook',
        internalType: 'contract IJBRulesetDataHook',
        type: 'address',
      },
    ],
    name: 'JBBuybackHookRegistry_HookNotAllowed',
  },
  {
    type: 'error',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'JBBuybackHookRegistry_HookNotSet',
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

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBCCIPSuckerDeployer
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const jbccipSuckerDeployerAbi = [
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
      { name: 'tokens', internalType: 'contract IJBTokens', type: 'address' },
      { name: 'configurator', internalType: 'address', type: 'address' },
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
    name: 'LAYER_SPECIFIC_CONFIGURATOR',
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
    name: 'TOKENS',
    outputs: [
      { name: '', internalType: 'contract IJBTokens', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ccipRemoteChainId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ccipRemoteChainSelector',
    outputs: [{ name: '', internalType: 'uint64', type: 'uint64' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ccipRouter',
    outputs: [
      { name: '', internalType: 'contract ICCIPRouter', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_singleton',
        internalType: 'contract JBSucker',
        type: 'address',
      },
    ],
    name: 'configureSingleton',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'localProjectId', internalType: 'uint256', type: 'uint256' },
      { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'createForSender',
    outputs: [
      { name: 'sucker', internalType: 'contract IJBSucker', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'isSucker',
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
    inputs: [
      { name: 'remoteChainId', internalType: 'uint256', type: 'uint256' },
      { name: 'remoteChainSelector', internalType: 'uint64', type: 'uint64' },
      { name: 'router', internalType: 'contract ICCIPRouter', type: 'address' },
    ],
    name: 'setChainSpecificConstants',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'singleton',
    outputs: [{ name: '', internalType: 'contract JBSucker', type: 'address' }],
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
        name: 'ccipRouter',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'ccipRemoteChainId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'ccipRemoteChainSelector',
        internalType: 'uint64',
        type: 'uint64',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'CCIPConstantsSet',
  },
  {
    type: 'error',
    inputs: [{ name: 'router', internalType: 'address', type: 'address' }],
    name: 'JBCCIPSuckerDeployer_InvalidCCIPRouter',
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
  { type: 'error', inputs: [], name: 'JBSuckerDeployer_AlreadyConfigured' },
  {
    type: 'error',
    inputs: [],
    name: 'JBSuckerDeployer_DeployerIsNotConfigured',
  },
  {
    type: 'error',
    inputs: [],
    name: 'JBSuckerDeployer_InvalidLayerSpecificConfiguration',
  },
  {
    type: 'error',
    inputs: [],
    name: 'JBSuckerDeployer_LayerSpecificNotConfigured',
  },
  {
    type: 'error',
    inputs: [
      { name: 'caller', internalType: 'address', type: 'address' },
      { name: 'expected', internalType: 'address', type: 'address' },
    ],
    name: 'JBSuckerDeployer_Unauthorized',
  },
  {
    type: 'error',
    inputs: [],
    name: 'JBSuckerDeployer_ZeroConfiguratorAddress',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBCCIPSuckerDeployer_1
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const jbccipSuckerDeployer_1Abi = [
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
      { name: 'tokens', internalType: 'contract IJBTokens', type: 'address' },
      { name: 'configurator', internalType: 'address', type: 'address' },
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
    name: 'LAYER_SPECIFIC_CONFIGURATOR',
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
    name: 'TOKENS',
    outputs: [
      { name: '', internalType: 'contract IJBTokens', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ccipRemoteChainId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ccipRemoteChainSelector',
    outputs: [{ name: '', internalType: 'uint64', type: 'uint64' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ccipRouter',
    outputs: [
      { name: '', internalType: 'contract ICCIPRouter', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_singleton',
        internalType: 'contract JBSucker',
        type: 'address',
      },
    ],
    name: 'configureSingleton',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'localProjectId', internalType: 'uint256', type: 'uint256' },
      { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'createForSender',
    outputs: [
      { name: 'sucker', internalType: 'contract IJBSucker', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'isSucker',
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
    inputs: [
      { name: 'remoteChainId', internalType: 'uint256', type: 'uint256' },
      { name: 'remoteChainSelector', internalType: 'uint64', type: 'uint64' },
      { name: 'router', internalType: 'contract ICCIPRouter', type: 'address' },
    ],
    name: 'setChainSpecificConstants',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'singleton',
    outputs: [{ name: '', internalType: 'contract JBSucker', type: 'address' }],
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
        name: 'ccipRouter',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'ccipRemoteChainId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'ccipRemoteChainSelector',
        internalType: 'uint64',
        type: 'uint64',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'CCIPConstantsSet',
  },
  {
    type: 'error',
    inputs: [{ name: 'router', internalType: 'address', type: 'address' }],
    name: 'JBCCIPSuckerDeployer_InvalidCCIPRouter',
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
  { type: 'error', inputs: [], name: 'JBSuckerDeployer_AlreadyConfigured' },
  {
    type: 'error',
    inputs: [],
    name: 'JBSuckerDeployer_DeployerIsNotConfigured',
  },
  {
    type: 'error',
    inputs: [],
    name: 'JBSuckerDeployer_InvalidLayerSpecificConfiguration',
  },
  {
    type: 'error',
    inputs: [],
    name: 'JBSuckerDeployer_LayerSpecificNotConfigured',
  },
  {
    type: 'error',
    inputs: [
      { name: 'caller', internalType: 'address', type: 'address' },
      { name: 'expected', internalType: 'address', type: 'address' },
    ],
    name: 'JBSuckerDeployer_Unauthorized',
  },
  {
    type: 'error',
    inputs: [],
    name: 'JBSuckerDeployer_ZeroConfiguratorAddress',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBCCIPSuckerDeployer_2
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const jbccipSuckerDeployer_2Abi = [
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
      { name: 'tokens', internalType: 'contract IJBTokens', type: 'address' },
      { name: 'configurator', internalType: 'address', type: 'address' },
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
    name: 'LAYER_SPECIFIC_CONFIGURATOR',
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
    name: 'TOKENS',
    outputs: [
      { name: '', internalType: 'contract IJBTokens', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ccipRemoteChainId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ccipRemoteChainSelector',
    outputs: [{ name: '', internalType: 'uint64', type: 'uint64' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ccipRouter',
    outputs: [
      { name: '', internalType: 'contract ICCIPRouter', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_singleton',
        internalType: 'contract JBSucker',
        type: 'address',
      },
    ],
    name: 'configureSingleton',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'localProjectId', internalType: 'uint256', type: 'uint256' },
      { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'createForSender',
    outputs: [
      { name: 'sucker', internalType: 'contract IJBSucker', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'isSucker',
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
    inputs: [
      { name: 'remoteChainId', internalType: 'uint256', type: 'uint256' },
      { name: 'remoteChainSelector', internalType: 'uint64', type: 'uint64' },
      { name: 'router', internalType: 'contract ICCIPRouter', type: 'address' },
    ],
    name: 'setChainSpecificConstants',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'singleton',
    outputs: [{ name: '', internalType: 'contract JBSucker', type: 'address' }],
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
        name: 'ccipRouter',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'ccipRemoteChainId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'ccipRemoteChainSelector',
        internalType: 'uint64',
        type: 'uint64',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'CCIPConstantsSet',
  },
  {
    type: 'error',
    inputs: [{ name: 'router', internalType: 'address', type: 'address' }],
    name: 'JBCCIPSuckerDeployer_InvalidCCIPRouter',
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
  { type: 'error', inputs: [], name: 'JBSuckerDeployer_AlreadyConfigured' },
  {
    type: 'error',
    inputs: [],
    name: 'JBSuckerDeployer_DeployerIsNotConfigured',
  },
  {
    type: 'error',
    inputs: [],
    name: 'JBSuckerDeployer_InvalidLayerSpecificConfiguration',
  },
  {
    type: 'error',
    inputs: [],
    name: 'JBSuckerDeployer_LayerSpecificNotConfigured',
  },
  {
    type: 'error',
    inputs: [
      { name: 'caller', internalType: 'address', type: 'address' },
      { name: 'expected', internalType: 'address', type: 'address' },
    ],
    name: 'JBSuckerDeployer_Unauthorized',
  },
  {
    type: 'error',
    inputs: [],
    name: 'JBSuckerDeployer_ZeroConfiguratorAddress',
  },
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
      {
        name: 'omnichainRulesetOperator',
        internalType: 'address',
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
    name: 'OMNICHAIN_RULESET_OPERATOR',
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
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'deployer',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'salt',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: false,
      },
      {
        name: 'saltHash',
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
  {
    type: 'error',
    inputs: [
      {
        name: 'pendingReservedTokenBalance',
        internalType: 'uint256',
        type: 'uint256',
      },
    ],
    name: 'JBController_PendingReservedTokens',
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
// JBController4_1
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const jbController4_1Abi = [
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
      {
        name: 'omnichainRulesetOperator',
        internalType: 'address',
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
    name: 'OMNICHAIN_RULESET_OPERATOR',
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
        name: 'projectId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'deployer',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'salt',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: false,
      },
      {
        name: 'saltHash',
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
// JBOmnichainDeployer
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const jbOmnichainDeployerAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'suckerRegistry',
        internalType: 'contract IJBSuckerRegistry',
        type: 'address',
      },
      {
        name: 'hookDeployer',
        internalType: 'contract IJB721TiersHookDeployer',
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
      { name: 'trustedForwarder', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
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
    name: 'SUCKER_REGISTRY',
    outputs: [
      { name: '', internalType: 'contract IJBSuckerRegistry', type: 'address' },
    ],
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
      { name: '', internalType: 'uint256', type: 'uint256' },
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
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'dataHookOf',
    outputs: [
      { name: 'useDataHookForPay', internalType: 'bool', type: 'bool' },
      { name: 'useDataHookForCashout', internalType: 'bool', type: 'bool' },
      {
        name: 'dataHook',
        internalType: 'contract IJBRulesetDataHook',
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
        name: 'suckerDeploymentConfiguration',
        internalType: 'struct JBSuckerDeploymentConfig',
        type: 'tuple',
        components: [
          {
            name: 'deployerConfigurations',
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
                  {
                    name: 'localToken',
                    internalType: 'address',
                    type: 'address',
                  },
                  { name: 'minGas', internalType: 'uint32', type: 'uint32' },
                  {
                    name: 'remoteToken',
                    internalType: 'address',
                    type: 'address',
                  },
                  {
                    name: 'minBridgeAmount',
                    internalType: 'uint256',
                    type: 'uint256',
                  },
                ],
              },
            ],
          },
          { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
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
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
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
      { name: 'addr', internalType: 'address', type: 'address' },
    ],
    name: 'hasMintPermissionFor',
    outputs: [{ name: 'flag', internalType: 'bool', type: 'bool' }],
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
      { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
      {
        name: 'suckerDeploymentConfiguration',
        internalType: 'struct JBSuckerDeploymentConfig',
        type: 'tuple',
        components: [
          {
            name: 'deployerConfigurations',
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
                  {
                    name: 'localToken',
                    internalType: 'address',
                    type: 'address',
                  },
                  { name: 'minGas', internalType: 'uint32', type: 'uint32' },
                  {
                    name: 'remoteToken',
                    internalType: 'address',
                    type: 'address',
                  },
                  {
                    name: 'minBridgeAmount',
                    internalType: 'uint256',
                    type: 'uint256',
                  },
                ],
              },
            ],
          },
          { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
        ],
      },
      {
        name: 'controller',
        internalType: 'contract IJBController',
        type: 'address',
      },
    ],
    name: 'launch721ProjectFor',
    outputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'hook',
        internalType: 'contract IJB721TiersHook',
        type: 'address',
      },
      { name: 'suckers', internalType: 'address[]', type: 'address[]' },
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
    name: 'launch721RulesetsFor',
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
      {
        name: 'suckerDeploymentConfiguration',
        internalType: 'struct JBSuckerDeploymentConfig',
        type: 'tuple',
        components: [
          {
            name: 'deployerConfigurations',
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
                  {
                    name: 'localToken',
                    internalType: 'address',
                    type: 'address',
                  },
                  { name: 'minGas', internalType: 'uint32', type: 'uint32' },
                  {
                    name: 'remoteToken',
                    internalType: 'address',
                    type: 'address',
                  },
                  {
                    name: 'minBridgeAmount',
                    internalType: 'uint256',
                    type: 'uint256',
                  },
                ],
              },
            ],
          },
          { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
        ],
      },
      {
        name: 'controller',
        internalType: 'contract IJBController',
        type: 'address',
      },
    ],
    name: 'launchProjectFor',
    outputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'suckers', internalType: 'address[]', type: 'address[]' },
    ],
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
      {
        name: 'controller',
        internalType: 'contract IJBController',
        type: 'address',
      },
    ],
    name: 'launchRulesetsFor',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'address', type: 'address' },
      { name: '', internalType: 'address', type: 'address' },
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'onERC721Received',
    outputs: [{ name: '', internalType: 'bytes4', type: 'bytes4' }],
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
    name: 'queue721RulesetsOf',
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
      {
        name: 'controller',
        internalType: 'contract IJBController',
        type: 'address',
      },
    ],
    name: 'queueRulesetsOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
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
  { type: 'error', inputs: [], name: 'JBOmnichainDeployer_InvalidHook' },
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

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBOmnichainDeployer4_1
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const jbOmnichainDeployer4_1Abi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'suckerRegistry',
        internalType: 'contract IJBSuckerRegistry',
        type: 'address',
      },
      {
        name: 'hookDeployer',
        internalType: 'contract IJB721TiersHookDeployer',
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
      { name: 'trustedForwarder', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
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
    name: 'SUCKER_REGISTRY',
    outputs: [
      { name: '', internalType: 'contract IJBSuckerRegistry', type: 'address' },
    ],
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
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'rulesetId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'dataHookOf',
    outputs: [
      { name: 'useDataHookForPay', internalType: 'bool', type: 'bool' },
      { name: 'useDataHookForCashout', internalType: 'bool', type: 'bool' },
      {
        name: 'dataHook',
        internalType: 'contract IJBRulesetDataHook4_1',
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
        name: 'suckerDeploymentConfiguration',
        internalType: 'struct REVSuckerDeploymentConfig',
        type: 'tuple',
        components: [
          {
            name: 'deployerConfigurations',
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
                  {
                    name: 'localToken',
                    internalType: 'address',
                    type: 'address',
                  },
                  { name: 'minGas', internalType: 'uint32', type: 'uint32' },
                  {
                    name: 'remoteToken',
                    internalType: 'address',
                    type: 'address',
                  },
                  {
                    name: 'minBridgeAmount',
                    internalType: 'uint256',
                    type: 'uint256',
                  },
                ],
              },
            ],
          },
          { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
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
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
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
      { name: 'addr', internalType: 'address', type: 'address' },
    ],
    name: 'hasMintPermissionFor',
    outputs: [{ name: 'flag', internalType: 'bool', type: 'bool' }],
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
      { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
      {
        name: 'suckerDeploymentConfiguration',
        internalType: 'struct REVSuckerDeploymentConfig',
        type: 'tuple',
        components: [
          {
            name: 'deployerConfigurations',
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
                  {
                    name: 'localToken',
                    internalType: 'address',
                    type: 'address',
                  },
                  { name: 'minGas', internalType: 'uint32', type: 'uint32' },
                  {
                    name: 'remoteToken',
                    internalType: 'address',
                    type: 'address',
                  },
                  {
                    name: 'minBridgeAmount',
                    internalType: 'uint256',
                    type: 'uint256',
                  },
                ],
              },
            ],
          },
          { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
        ],
      },
      {
        name: 'controller',
        internalType: 'contract IJBController',
        type: 'address',
      },
    ],
    name: 'launch721ProjectFor',
    outputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'hook',
        internalType: 'contract IJB721TiersHook',
        type: 'address',
      },
      { name: 'suckers', internalType: 'address[]', type: 'address[]' },
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
    name: 'launch721RulesetsFor',
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
      {
        name: 'suckerDeploymentConfiguration',
        internalType: 'struct REVSuckerDeploymentConfig',
        type: 'tuple',
        components: [
          {
            name: 'deployerConfigurations',
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
                  {
                    name: 'localToken',
                    internalType: 'address',
                    type: 'address',
                  },
                  { name: 'minGas', internalType: 'uint32', type: 'uint32' },
                  {
                    name: 'remoteToken',
                    internalType: 'address',
                    type: 'address',
                  },
                  {
                    name: 'minBridgeAmount',
                    internalType: 'uint256',
                    type: 'uint256',
                  },
                ],
              },
            ],
          },
          { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
        ],
      },
      {
        name: 'controller',
        internalType: 'contract IJBController',
        type: 'address',
      },
    ],
    name: 'launchProjectFor',
    outputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'suckers', internalType: 'address[]', type: 'address[]' },
    ],
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
      {
        name: 'controller',
        internalType: 'contract IJBController',
        type: 'address',
      },
    ],
    name: 'launchRulesetsFor',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'address', type: 'address' },
      { name: '', internalType: 'address', type: 'address' },
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'onERC721Received',
    outputs: [{ name: '', internalType: 'bytes4', type: 'bytes4' }],
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
    name: 'queue721RulesetsOf',
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
      {
        name: 'controller',
        internalType: 'contract IJBController',
        type: 'address',
      },
    ],
    name: 'queueRulesetsOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
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
  { type: 'error', inputs: [], name: 'JBOmnichainDeployer_InvalidHook' },
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

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBPermissions
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const jbPermissionsAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: 'trustedForwarder', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
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
    inputs: [{ name: 'forwarder', internalType: 'address', type: 'address' }],
    name: 'isTrustedForwarder',
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
      { name: 'trustedForwarder', internalType: 'address', type: 'address' },
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

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBProjects
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const jbProjectsAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'feeProjectOwner', internalType: 'address', type: 'address' },
      { name: 'trustedForwarder', internalType: 'address', type: 'address' },
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
    inputs: [{ name: 'forwarder', internalType: 'address', type: 'address' }],
    name: 'isTrustedForwarder',
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

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBSplits
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBSuckerRegistry
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
    name: 'suckerPairsOf',
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
      { name: 'trustedForwarder', internalType: 'address', type: 'address' },
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
    name: 'UNCERTAIN_SLIPPAGE_TOLERANCE',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
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
    inputs: [],
    name: 'trustedForwarder',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
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
    name: 'twapWindowOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
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
// JBSwapTerminal1_1
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const jbSwapTerminal1_1Abi = [
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
// JBSwapTerminalRegistry
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const jbSwapTerminalRegistryAbi = [
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
      { name: 'permit2', internalType: 'contract IPermit2', type: 'address' },
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'trustedForwarder', internalType: 'address', type: 'address' },
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
      {
        name: 'terminal',
        internalType: 'contract IJBTerminal',
        type: 'address',
      },
    ],
    name: 'allowTerminal',
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
    inputs: [],
    name: 'defaultTerminal',
    outputs: [
      { name: '', internalType: 'contract IJBTerminal', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'terminal',
        internalType: 'contract IJBTerminal',
        type: 'address',
      },
    ],
    name: 'disallowTerminal',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'hasLockedTerminal',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'terminal',
        internalType: 'contract IJBTerminal',
        type: 'address',
      },
    ],
    name: 'isTerminalAllowed',
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
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'lockTerminalFor',
    outputs: [],
    stateMutability: 'nonpayable',
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
    inputs: [
      {
        name: 'terminal',
        internalType: 'contract IJBTerminal',
        type: 'address',
      },
    ],
    name: 'setDefaultTerminal',
    outputs: [],
    stateMutability: 'nonpayable',
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
    name: 'setTerminalFor',
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
    name: 'terminalOf',
    outputs: [
      { name: '', internalType: 'contract IJBTerminal', type: 'address' },
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
        name: 'terminal',
        internalType: 'contract IJBTerminal',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'JBSwapTerminalRegistry_AllowTerminal',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'terminal',
        internalType: 'contract IJBTerminal',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'JBSwapTerminalRegistry_DisallowTerminal',
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
    ],
    name: 'JBSwapTerminalRegistry_LockTerminal',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'terminal',
        internalType: 'contract IJBTerminal',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'JBSwapTerminalRegistry_SetDefaultTerminal',
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
        indexed: false,
      },
    ],
    name: 'JBSwapTerminalRegistry_SetTerminal',
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
    inputs: [{ name: 'value', internalType: 'uint256', type: 'uint256' }],
    name: 'JBSwapTerminalRegistry_NoMsgValueAllowed',
  },
  {
    type: 'error',
    inputs: [
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'allowanceAmount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'JBSwapTerminalRegistry_PermitAllowanceNotEnough',
  },
  {
    type: 'error',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'JBSwapTerminalRegistry_TerminalLocked',
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
    name: 'JBSwapTerminalRegistry_TerminalNotAllowed',
  },
  {
    type: 'error',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'JBSwapTerminalRegistry_TerminalNotSet',
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
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation',
  },
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

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// REVDeployer
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const revDeployerAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'controller',
        internalType: 'contract IJBController',
        type: 'address',
      },
      {
        name: 'suckerRegistry',
        internalType: 'contract IJBSuckerRegistry',
        type: 'address',
      },
      { name: 'feeRevnetId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'hookDeployer',
        internalType: 'contract IJB721TiersHookDeployer',
        type: 'address',
      },
      {
        name: 'publisher',
        internalType: 'contract CTPublisher',
        type: 'address',
      },
      { name: 'trustedForwarder', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'CASH_OUT_DELAY',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
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
    name: 'FEE',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'FEE_REVNET_ID',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
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
    name: 'PUBLISHER',
    outputs: [
      { name: '', internalType: 'contract CTPublisher', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'SUCKER_REGISTRY',
    outputs: [
      { name: '', internalType: 'contract IJBSuckerRegistry', type: 'address' },
    ],
    stateMutability: 'view',
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
      { name: 'revnetId', internalType: 'uint256', type: 'uint256' },
      { name: 'stageId', internalType: 'uint256', type: 'uint256' },
      { name: 'beneficiary', internalType: 'address', type: 'address' },
    ],
    name: 'amountToAutoIssue',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'revnetId', internalType: 'uint256', type: 'uint256' },
      { name: 'stageId', internalType: 'uint256', type: 'uint256' },
      { name: 'beneficiary', internalType: 'address', type: 'address' },
    ],
    name: 'autoIssueFor',
    outputs: [],
    stateMutability: 'nonpayable',
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
    inputs: [{ name: 'revnetId', internalType: 'uint256', type: 'uint256' }],
    name: 'buybackHookOf',
    outputs: [
      {
        name: 'buybackHook',
        internalType: 'contract IJBRulesetDataHook',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'revnetId', internalType: 'uint256', type: 'uint256' }],
    name: 'cashOutDelayOf',
    outputs: [
      { name: 'cashOutDelay', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'revnetId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'configuration',
        internalType: 'struct REVConfig',
        type: 'tuple',
        components: [
          {
            name: 'description',
            internalType: 'struct REVDescription',
            type: 'tuple',
            components: [
              { name: 'name', internalType: 'string', type: 'string' },
              { name: 'ticker', internalType: 'string', type: 'string' },
              { name: 'uri', internalType: 'string', type: 'string' },
              { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
            ],
          },
          { name: 'baseCurrency', internalType: 'uint32', type: 'uint32' },
          { name: 'splitOperator', internalType: 'address', type: 'address' },
          {
            name: 'stageConfigurations',
            internalType: 'struct REVStageConfig[]',
            type: 'tuple[]',
            components: [
              {
                name: 'startsAtOrAfter',
                internalType: 'uint48',
                type: 'uint48',
              },
              {
                name: 'autoIssuances',
                internalType: 'struct REVAutoIssuance[]',
                type: 'tuple[]',
                components: [
                  { name: 'chainId', internalType: 'uint32', type: 'uint32' },
                  { name: 'count', internalType: 'uint104', type: 'uint104' },
                  {
                    name: 'beneficiary',
                    internalType: 'address',
                    type: 'address',
                  },
                ],
              },
              { name: 'splitPercent', internalType: 'uint16', type: 'uint16' },
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
              {
                name: 'initialIssuance',
                internalType: 'uint112',
                type: 'uint112',
              },
              {
                name: 'issuanceCutFrequency',
                internalType: 'uint32',
                type: 'uint32',
              },
              {
                name: 'issuanceCutPercent',
                internalType: 'uint32',
                type: 'uint32',
              },
              {
                name: 'cashOutTaxRate',
                internalType: 'uint16',
                type: 'uint16',
              },
              { name: 'extraMetadata', internalType: 'uint16', type: 'uint16' },
            ],
          },
          {
            name: 'loanSources',
            internalType: 'struct REVLoanSource[]',
            type: 'tuple[]',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              {
                name: 'terminal',
                internalType: 'contract IJBPayoutTerminal',
                type: 'address',
              },
            ],
          },
          { name: 'loans', internalType: 'address', type: 'address' },
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
      {
        name: 'buybackHookConfiguration',
        internalType: 'struct REVBuybackHookConfig',
        type: 'tuple',
        components: [
          {
            name: 'dataHook',
            internalType: 'contract IJBRulesetDataHook',
            type: 'address',
          },
          {
            name: 'hookToConfigure',
            internalType: 'contract IJBBuybackHook',
            type: 'address',
          },
          {
            name: 'poolConfigurations',
            internalType: 'struct REVBuybackPoolConfig[]',
            type: 'tuple[]',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'fee', internalType: 'uint24', type: 'uint24' },
              { name: 'twapWindow', internalType: 'uint32', type: 'uint32' },
            ],
          },
        ],
      },
      {
        name: 'suckerDeploymentConfiguration',
        internalType: 'struct REVSuckerDeploymentConfig',
        type: 'tuple',
        components: [
          {
            name: 'deployerConfigurations',
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
                  {
                    name: 'localToken',
                    internalType: 'address',
                    type: 'address',
                  },
                  { name: 'minGas', internalType: 'uint32', type: 'uint32' },
                  {
                    name: 'remoteToken',
                    internalType: 'address',
                    type: 'address',
                  },
                  {
                    name: 'minBridgeAmount',
                    internalType: 'uint256',
                    type: 'uint256',
                  },
                ],
              },
            ],
          },
          { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
        ],
      },
    ],
    name: 'deployFor',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'revnetId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'suckerDeploymentConfiguration',
        internalType: 'struct REVSuckerDeploymentConfig',
        type: 'tuple',
        components: [
          {
            name: 'deployerConfigurations',
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
                  {
                    name: 'localToken',
                    internalType: 'address',
                    type: 'address',
                  },
                  { name: 'minGas', internalType: 'uint32', type: 'uint32' },
                  {
                    name: 'remoteToken',
                    internalType: 'address',
                    type: 'address',
                  },
                  {
                    name: 'minBridgeAmount',
                    internalType: 'uint256',
                    type: 'uint256',
                  },
                ],
              },
            ],
          },
          { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
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
    inputs: [
      { name: 'revnetId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'configuration',
        internalType: 'struct REVConfig',
        type: 'tuple',
        components: [
          {
            name: 'description',
            internalType: 'struct REVDescription',
            type: 'tuple',
            components: [
              { name: 'name', internalType: 'string', type: 'string' },
              { name: 'ticker', internalType: 'string', type: 'string' },
              { name: 'uri', internalType: 'string', type: 'string' },
              { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
            ],
          },
          { name: 'baseCurrency', internalType: 'uint32', type: 'uint32' },
          { name: 'splitOperator', internalType: 'address', type: 'address' },
          {
            name: 'stageConfigurations',
            internalType: 'struct REVStageConfig[]',
            type: 'tuple[]',
            components: [
              {
                name: 'startsAtOrAfter',
                internalType: 'uint48',
                type: 'uint48',
              },
              {
                name: 'autoIssuances',
                internalType: 'struct REVAutoIssuance[]',
                type: 'tuple[]',
                components: [
                  { name: 'chainId', internalType: 'uint32', type: 'uint32' },
                  { name: 'count', internalType: 'uint104', type: 'uint104' },
                  {
                    name: 'beneficiary',
                    internalType: 'address',
                    type: 'address',
                  },
                ],
              },
              { name: 'splitPercent', internalType: 'uint16', type: 'uint16' },
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
              {
                name: 'initialIssuance',
                internalType: 'uint112',
                type: 'uint112',
              },
              {
                name: 'issuanceCutFrequency',
                internalType: 'uint32',
                type: 'uint32',
              },
              {
                name: 'issuanceCutPercent',
                internalType: 'uint32',
                type: 'uint32',
              },
              {
                name: 'cashOutTaxRate',
                internalType: 'uint16',
                type: 'uint16',
              },
              { name: 'extraMetadata', internalType: 'uint16', type: 'uint16' },
            ],
          },
          {
            name: 'loanSources',
            internalType: 'struct REVLoanSource[]',
            type: 'tuple[]',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              {
                name: 'terminal',
                internalType: 'contract IJBPayoutTerminal',
                type: 'address',
              },
            ],
          },
          { name: 'loans', internalType: 'address', type: 'address' },
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
      {
        name: 'buybackHookConfiguration',
        internalType: 'struct REVBuybackHookConfig',
        type: 'tuple',
        components: [
          {
            name: 'dataHook',
            internalType: 'contract IJBRulesetDataHook',
            type: 'address',
          },
          {
            name: 'hookToConfigure',
            internalType: 'contract IJBBuybackHook',
            type: 'address',
          },
          {
            name: 'poolConfigurations',
            internalType: 'struct REVBuybackPoolConfig[]',
            type: 'tuple[]',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'fee', internalType: 'uint24', type: 'uint24' },
              { name: 'twapWindow', internalType: 'uint32', type: 'uint32' },
            ],
          },
        ],
      },
      {
        name: 'suckerDeploymentConfiguration',
        internalType: 'struct REVSuckerDeploymentConfig',
        type: 'tuple',
        components: [
          {
            name: 'deployerConfigurations',
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
                  {
                    name: 'localToken',
                    internalType: 'address',
                    type: 'address',
                  },
                  { name: 'minGas', internalType: 'uint32', type: 'uint32' },
                  {
                    name: 'remoteToken',
                    internalType: 'address',
                    type: 'address',
                  },
                  {
                    name: 'minBridgeAmount',
                    internalType: 'uint256',
                    type: 'uint256',
                  },
                ],
              },
            ],
          },
          { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
        ],
      },
      {
        name: 'tiered721HookConfiguration',
        internalType: 'struct REVDeploy721TiersHookConfig',
        type: 'tuple',
        components: [
          {
            name: 'baseline721HookConfiguration',
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
                      {
                        name: 'price',
                        internalType: 'uint104',
                        type: 'uint104',
                      },
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
                      {
                        name: 'category',
                        internalType: 'uint24',
                        type: 'uint24',
                      },
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
          {
            name: 'splitOperatorCanAdjustTiers',
            internalType: 'bool',
            type: 'bool',
          },
          {
            name: 'splitOperatorCanUpdateMetadata',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'splitOperatorCanMint', internalType: 'bool', type: 'bool' },
          {
            name: 'splitOperatorCanIncreaseDiscountPercent',
            internalType: 'bool',
            type: 'bool',
          },
        ],
      },
      {
        name: 'allowedPosts',
        internalType: 'struct REVCroptopAllowedPost[]',
        type: 'tuple[]',
        components: [
          { name: 'category', internalType: 'uint24', type: 'uint24' },
          { name: 'minimumPrice', internalType: 'uint104', type: 'uint104' },
          {
            name: 'minimumTotalSupply',
            internalType: 'uint32',
            type: 'uint32',
          },
          {
            name: 'maximumTotalSupply',
            internalType: 'uint32',
            type: 'uint32',
          },
          {
            name: 'allowedAddresses',
            internalType: 'address[]',
            type: 'address[]',
          },
        ],
      },
    ],
    name: 'deployWith721sFor',
    outputs: [
      { name: '', internalType: 'uint256', type: 'uint256' },
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
      { name: 'revnetId', internalType: 'uint256', type: 'uint256' },
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
      { name: 'addr', internalType: 'address', type: 'address' },
    ],
    name: 'hasMintPermissionFor',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'revnetId', internalType: 'uint256', type: 'uint256' }],
    name: 'hashedEncodedConfigurationOf',
    outputs: [
      {
        name: 'hashedEncodedConfiguration',
        internalType: 'bytes32',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'revnetId', internalType: 'uint256', type: 'uint256' },
      { name: 'addr', internalType: 'address', type: 'address' },
    ],
    name: 'isSplitOperatorOf',
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
    inputs: [{ name: 'revnetId', internalType: 'uint256', type: 'uint256' }],
    name: 'loansOf',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'address', type: 'address' },
      { name: '', internalType: 'address', type: 'address' },
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'onERC721Received',
    outputs: [{ name: '', internalType: 'bytes4', type: 'bytes4' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'revnetId', internalType: 'uint256', type: 'uint256' },
      { name: 'newSplitOperator', internalType: 'address', type: 'address' },
    ],
    name: 'setSplitOperatorOf',
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
    inputs: [{ name: 'revnetId', internalType: 'uint256', type: 'uint256' }],
    name: 'tiered721HookOf',
    outputs: [
      {
        name: 'tiered721Hook',
        internalType: 'contract IJB721TiersHook',
        type: 'address',
      },
    ],
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
        name: 'revnetId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'stageId',
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
    name: 'AutoIssue',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'revnetId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'configuration',
        internalType: 'struct REVConfig',
        type: 'tuple',
        components: [
          {
            name: 'description',
            internalType: 'struct REVDescription',
            type: 'tuple',
            components: [
              { name: 'name', internalType: 'string', type: 'string' },
              { name: 'ticker', internalType: 'string', type: 'string' },
              { name: 'uri', internalType: 'string', type: 'string' },
              { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
            ],
          },
          { name: 'baseCurrency', internalType: 'uint32', type: 'uint32' },
          { name: 'splitOperator', internalType: 'address', type: 'address' },
          {
            name: 'stageConfigurations',
            internalType: 'struct REVStageConfig[]',
            type: 'tuple[]',
            components: [
              {
                name: 'startsAtOrAfter',
                internalType: 'uint48',
                type: 'uint48',
              },
              {
                name: 'autoIssuances',
                internalType: 'struct REVAutoIssuance[]',
                type: 'tuple[]',
                components: [
                  { name: 'chainId', internalType: 'uint32', type: 'uint32' },
                  { name: 'count', internalType: 'uint104', type: 'uint104' },
                  {
                    name: 'beneficiary',
                    internalType: 'address',
                    type: 'address',
                  },
                ],
              },
              { name: 'splitPercent', internalType: 'uint16', type: 'uint16' },
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
              {
                name: 'initialIssuance',
                internalType: 'uint112',
                type: 'uint112',
              },
              {
                name: 'issuanceCutFrequency',
                internalType: 'uint32',
                type: 'uint32',
              },
              {
                name: 'issuanceCutPercent',
                internalType: 'uint32',
                type: 'uint32',
              },
              {
                name: 'cashOutTaxRate',
                internalType: 'uint16',
                type: 'uint16',
              },
              { name: 'extraMetadata', internalType: 'uint16', type: 'uint16' },
            ],
          },
          {
            name: 'loanSources',
            internalType: 'struct REVLoanSource[]',
            type: 'tuple[]',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              {
                name: 'terminal',
                internalType: 'contract IJBPayoutTerminal',
                type: 'address',
              },
            ],
          },
          { name: 'loans', internalType: 'address', type: 'address' },
        ],
        indexed: false,
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
        indexed: false,
      },
      {
        name: 'buybackHookConfiguration',
        internalType: 'struct REVBuybackHookConfig',
        type: 'tuple',
        components: [
          {
            name: 'dataHook',
            internalType: 'contract IJBRulesetDataHook',
            type: 'address',
          },
          {
            name: 'hookToConfigure',
            internalType: 'contract IJBBuybackHook',
            type: 'address',
          },
          {
            name: 'poolConfigurations',
            internalType: 'struct REVBuybackPoolConfig[]',
            type: 'tuple[]',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              { name: 'fee', internalType: 'uint24', type: 'uint24' },
              { name: 'twapWindow', internalType: 'uint32', type: 'uint32' },
            ],
          },
        ],
        indexed: false,
      },
      {
        name: 'suckerDeploymentConfiguration',
        internalType: 'struct REVSuckerDeploymentConfig',
        type: 'tuple',
        components: [
          {
            name: 'deployerConfigurations',
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
                  {
                    name: 'localToken',
                    internalType: 'address',
                    type: 'address',
                  },
                  { name: 'minGas', internalType: 'uint32', type: 'uint32' },
                  {
                    name: 'remoteToken',
                    internalType: 'address',
                    type: 'address',
                  },
                  {
                    name: 'minBridgeAmount',
                    internalType: 'uint256',
                    type: 'uint256',
                  },
                ],
              },
            ],
          },
          { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
        ],
        indexed: false,
      },
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
        indexed: false,
      },
      {
        name: 'encodedConfigurationHash',
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
    name: 'DeployRevnet',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'revnetId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'encodedConfigurationHash',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: false,
      },
      {
        name: 'suckerDeploymentConfiguration',
        internalType: 'struct REVSuckerDeploymentConfig',
        type: 'tuple',
        components: [
          {
            name: 'deployerConfigurations',
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
                  {
                    name: 'localToken',
                    internalType: 'address',
                    type: 'address',
                  },
                  { name: 'minGas', internalType: 'uint32', type: 'uint32' },
                  {
                    name: 'remoteToken',
                    internalType: 'address',
                    type: 'address',
                  },
                  {
                    name: 'minBridgeAmount',
                    internalType: 'uint256',
                    type: 'uint256',
                  },
                ],
              },
            ],
          },
          { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
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
    name: 'DeploySuckers',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'revnetId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'newSplitOperator',
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
    name: 'ReplaceSplitOperator',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'revnetId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'additionalOperator',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'permissionIds',
        internalType: 'uint256[]',
        type: 'uint256[]',
        indexed: false,
      },
      {
        name: 'caller',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'SetAdditionalOperator',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'revnetId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'cashOutDelay',
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
    name: 'SetCashOutDelay',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'revnetId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'stageId',
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
    name: 'StoreAutoIssuanceAmount',
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
    inputs: [],
    name: 'REVDeployer_AutoIssuanceBeneficiaryZeroAddress',
  },
  {
    type: 'error',
    inputs: [
      { name: 'cashOutDelay', internalType: 'uint256', type: 'uint256' },
      { name: 'blockTimestamp', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'REVDeployer_CashOutDelayNotFinished',
  },
  {
    type: 'error',
    inputs: [
      { name: 'cashOutTaxRate', internalType: 'uint256', type: 'uint256' },
      { name: 'maxCashOutTaxRate', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'REVDeployer_CashOutsCantBeTurnedOffCompletely',
  },
  {
    type: 'error',
    inputs: [
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'terminal', internalType: 'address', type: 'address' },
    ],
    name: 'REVDeployer_LoanSourceDoesntMatchTerminalConfigurations',
  },
  { type: 'error', inputs: [], name: 'REVDeployer_MustHaveSplits' },
  { type: 'error', inputs: [], name: 'REVDeployer_NothingToAutoIssue' },
  {
    type: 'error',
    inputs: [],
    name: 'REVDeployer_RulesetDoesNotAllowDeployingSuckers',
  },
  {
    type: 'error',
    inputs: [{ name: 'stageId', internalType: 'uint256', type: 'uint256' }],
    name: 'REVDeployer_StageNotStarted',
  },
  { type: 'error', inputs: [], name: 'REVDeployer_StageTimesMustIncrease' },
  { type: 'error', inputs: [], name: 'REVDeployer_StagesRequired' },
  {
    type: 'error',
    inputs: [
      { name: 'revnetId', internalType: 'uint256', type: 'uint256' },
      { name: 'caller', internalType: 'address', type: 'address' },
    ],
    name: 'REVDeployer_Unauthorized',
  },
  {
    type: 'error',
    inputs: [
      { name: 'spender', internalType: 'address', type: 'address' },
      { name: 'currentAllowance', internalType: 'uint256', type: 'uint256' },
      { name: 'requestedDecrease', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'SafeERC20FailedDecreaseAllowance',
  },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// REVLoans
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const revLoansAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'revnets',
        internalType: 'contract IREVDeployer',
        type: 'address',
      },
      { name: 'revId', internalType: 'uint256', type: 'uint256' },
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'permit2', internalType: 'contract IPermit2', type: 'address' },
      { name: 'trustedForwarder', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  { type: 'fallback', stateMutability: 'payable' },
  { type: 'receive', stateMutability: 'payable' },
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
    name: 'LOAN_LIQUIDATION_DURATION',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MAX_PREPAID_FEE_PERCENT',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MIN_PREPAID_FEE_PERCENT',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
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
    name: 'REVNETS',
    outputs: [
      { name: '', internalType: 'contract IREVDeployer', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'REV_ID',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'REV_PREPAID_FEE_PERCENT',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
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
    inputs: [
      { name: 'revnetId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'source',
        internalType: 'struct REVLoanSource',
        type: 'tuple',
        components: [
          { name: 'token', internalType: 'address', type: 'address' },
          {
            name: 'terminal',
            internalType: 'contract IJBPayoutTerminal',
            type: 'address',
          },
        ],
      },
      { name: 'minBorrowAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'collateralCount', internalType: 'uint256', type: 'uint256' },
      { name: 'beneficiary', internalType: 'address payable', type: 'address' },
      { name: 'prepaidFeePercent', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'borrowFrom',
    outputs: [
      { name: 'loanId', internalType: 'uint256', type: 'uint256' },
      {
        name: '',
        internalType: 'struct REVLoan',
        type: 'tuple',
        components: [
          { name: 'amount', internalType: 'uint112', type: 'uint112' },
          { name: 'collateral', internalType: 'uint112', type: 'uint112' },
          { name: 'createdAt', internalType: 'uint48', type: 'uint48' },
          { name: 'prepaidFeePercent', internalType: 'uint16', type: 'uint16' },
          { name: 'prepaidDuration', internalType: 'uint32', type: 'uint32' },
          {
            name: 'source',
            internalType: 'struct REVLoanSource',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              {
                name: 'terminal',
                internalType: 'contract IJBPayoutTerminal',
                type: 'address',
              },
            ],
          },
        ],
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'revnetId', internalType: 'uint256', type: 'uint256' },
      { name: 'collateralCount', internalType: 'uint256', type: 'uint256' },
      { name: 'decimals', internalType: 'uint256', type: 'uint256' },
      { name: 'currency', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'borrowableAmountFrom',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'loan',
        internalType: 'struct REVLoan',
        type: 'tuple',
        components: [
          { name: 'amount', internalType: 'uint112', type: 'uint112' },
          { name: 'collateral', internalType: 'uint112', type: 'uint112' },
          { name: 'createdAt', internalType: 'uint48', type: 'uint48' },
          { name: 'prepaidFeePercent', internalType: 'uint16', type: 'uint16' },
          { name: 'prepaidDuration', internalType: 'uint32', type: 'uint32' },
          {
            name: 'source',
            internalType: 'struct REVLoanSource',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              {
                name: 'terminal',
                internalType: 'contract IJBPayoutTerminal',
                type: 'address',
              },
            ],
          },
        ],
      },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'determineSourceFeeAmount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
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
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'operator', internalType: 'address', type: 'address' },
    ],
    name: 'isApprovedForAll',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'revnetId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'terminal',
        internalType: 'contract IJBPayoutTerminal',
        type: 'address',
      },
      { name: 'token', internalType: 'address', type: 'address' },
    ],
    name: 'isLoanSourceOf',
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
    inputs: [
      { name: 'revnetId', internalType: 'uint256', type: 'uint256' },
      { name: 'startingLoanId', internalType: 'uint256', type: 'uint256' },
      { name: 'count', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'liquidateExpiredLoansFrom',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'loanId', internalType: 'uint256', type: 'uint256' }],
    name: 'loanOf',
    outputs: [
      {
        name: '',
        internalType: 'struct REVLoan',
        type: 'tuple',
        components: [
          { name: 'amount', internalType: 'uint112', type: 'uint112' },
          { name: 'collateral', internalType: 'uint112', type: 'uint112' },
          { name: 'createdAt', internalType: 'uint48', type: 'uint48' },
          { name: 'prepaidFeePercent', internalType: 'uint16', type: 'uint16' },
          { name: 'prepaidDuration', internalType: 'uint32', type: 'uint32' },
          {
            name: 'source',
            internalType: 'struct REVLoanSource',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              {
                name: 'terminal',
                internalType: 'contract IJBPayoutTerminal',
                type: 'address',
              },
            ],
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'revnetId', internalType: 'uint256', type: 'uint256' }],
    name: 'loanSourcesOf',
    outputs: [
      {
        name: '',
        internalType: 'struct REVLoanSource[]',
        type: 'tuple[]',
        components: [
          { name: 'token', internalType: 'address', type: 'address' },
          {
            name: 'terminal',
            internalType: 'contract IJBPayoutTerminal',
            type: 'address',
          },
        ],
      },
    ],
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
    inputs: [{ name: 'revnetId', internalType: 'uint256', type: 'uint256' }],
    name: 'numberOfLoansFor',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
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
    inputs: [
      { name: 'loanId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'collateralCountToTransfer',
        internalType: 'uint256',
        type: 'uint256',
      },
      {
        name: 'source',
        internalType: 'struct REVLoanSource',
        type: 'tuple',
        components: [
          { name: 'token', internalType: 'address', type: 'address' },
          {
            name: 'terminal',
            internalType: 'contract IJBPayoutTerminal',
            type: 'address',
          },
        ],
      },
      { name: 'minBorrowAmount', internalType: 'uint256', type: 'uint256' },
      {
        name: 'collateralCountToAdd',
        internalType: 'uint256',
        type: 'uint256',
      },
      { name: 'beneficiary', internalType: 'address payable', type: 'address' },
      { name: 'prepaidFeePercent', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'reallocateCollateralFromLoan',
    outputs: [
      { name: 'reallocatedLoanId', internalType: 'uint256', type: 'uint256' },
      { name: 'newLoanId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'reallocatedLoan',
        internalType: 'struct REVLoan',
        type: 'tuple',
        components: [
          { name: 'amount', internalType: 'uint112', type: 'uint112' },
          { name: 'collateral', internalType: 'uint112', type: 'uint112' },
          { name: 'createdAt', internalType: 'uint48', type: 'uint48' },
          { name: 'prepaidFeePercent', internalType: 'uint16', type: 'uint16' },
          { name: 'prepaidDuration', internalType: 'uint32', type: 'uint32' },
          {
            name: 'source',
            internalType: 'struct REVLoanSource',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              {
                name: 'terminal',
                internalType: 'contract IJBPayoutTerminal',
                type: 'address',
              },
            ],
          },
        ],
      },
      {
        name: 'newLoan',
        internalType: 'struct REVLoan',
        type: 'tuple',
        components: [
          { name: 'amount', internalType: 'uint112', type: 'uint112' },
          { name: 'collateral', internalType: 'uint112', type: 'uint112' },
          { name: 'createdAt', internalType: 'uint48', type: 'uint48' },
          { name: 'prepaidFeePercent', internalType: 'uint16', type: 'uint16' },
          { name: 'prepaidDuration', internalType: 'uint32', type: 'uint32' },
          {
            name: 'source',
            internalType: 'struct REVLoanSource',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              {
                name: 'terminal',
                internalType: 'contract IJBPayoutTerminal',
                type: 'address',
              },
            ],
          },
        ],
      },
    ],
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
    inputs: [
      { name: 'loanId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'maxRepayBorrowAmount',
        internalType: 'uint256',
        type: 'uint256',
      },
      {
        name: 'collateralCountToReturn',
        internalType: 'uint256',
        type: 'uint256',
      },
      { name: 'beneficiary', internalType: 'address payable', type: 'address' },
      {
        name: 'allowance',
        internalType: 'struct JBSingleAllowance',
        type: 'tuple',
        components: [
          { name: 'sigDeadline', internalType: 'uint256', type: 'uint256' },
          { name: 'amount', internalType: 'uint160', type: 'uint160' },
          { name: 'expiration', internalType: 'uint48', type: 'uint48' },
          { name: 'nonce', internalType: 'uint48', type: 'uint48' },
          { name: 'signature', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    name: 'repayLoan',
    outputs: [
      { name: 'paidOffLoanId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'paidOffloan',
        internalType: 'struct REVLoan',
        type: 'tuple',
        components: [
          { name: 'amount', internalType: 'uint112', type: 'uint112' },
          { name: 'collateral', internalType: 'uint112', type: 'uint112' },
          { name: 'createdAt', internalType: 'uint48', type: 'uint48' },
          { name: 'prepaidFeePercent', internalType: 'uint16', type: 'uint16' },
          { name: 'prepaidDuration', internalType: 'uint32', type: 'uint32' },
          {
            name: 'source',
            internalType: 'struct REVLoanSource',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              {
                name: 'terminal',
                internalType: 'contract IJBPayoutTerminal',
                type: 'address',
              },
            ],
          },
        ],
      },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [{ name: 'loanId', internalType: 'uint256', type: 'uint256' }],
    name: 'revnetIdOfLoanWith',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'pure',
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
    inputs: [{ name: 'loanId', internalType: 'uint256', type: 'uint256' }],
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
      { name: 'revnetId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'terminal',
        internalType: 'contract IJBPayoutTerminal',
        type: 'address',
      },
      { name: 'token', internalType: 'address', type: 'address' },
    ],
    name: 'totalBorrowedFrom',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'revnetId', internalType: 'uint256', type: 'uint256' }],
    name: 'totalCollateralOf',
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
        name: 'loanId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'revnetId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'loan',
        internalType: 'struct REVLoan',
        type: 'tuple',
        components: [
          { name: 'amount', internalType: 'uint112', type: 'uint112' },
          { name: 'collateral', internalType: 'uint112', type: 'uint112' },
          { name: 'createdAt', internalType: 'uint48', type: 'uint48' },
          { name: 'prepaidFeePercent', internalType: 'uint16', type: 'uint16' },
          { name: 'prepaidDuration', internalType: 'uint32', type: 'uint32' },
          {
            name: 'source',
            internalType: 'struct REVLoanSource',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              {
                name: 'terminal',
                internalType: 'contract IJBPayoutTerminal',
                type: 'address',
              },
            ],
          },
        ],
        indexed: false,
      },
      {
        name: 'source',
        internalType: 'struct REVLoanSource',
        type: 'tuple',
        components: [
          { name: 'token', internalType: 'address', type: 'address' },
          {
            name: 'terminal',
            internalType: 'contract IJBPayoutTerminal',
            type: 'address',
          },
        ],
        indexed: false,
      },
      {
        name: 'borrowAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'collateralCount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'sourceFeeAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'beneficiary',
        internalType: 'address payable',
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
    name: 'Borrow',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'loanId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'revnetId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'loan',
        internalType: 'struct REVLoan',
        type: 'tuple',
        components: [
          { name: 'amount', internalType: 'uint112', type: 'uint112' },
          { name: 'collateral', internalType: 'uint112', type: 'uint112' },
          { name: 'createdAt', internalType: 'uint48', type: 'uint48' },
          { name: 'prepaidFeePercent', internalType: 'uint16', type: 'uint16' },
          { name: 'prepaidDuration', internalType: 'uint32', type: 'uint32' },
          {
            name: 'source',
            internalType: 'struct REVLoanSource',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              {
                name: 'terminal',
                internalType: 'contract IJBPayoutTerminal',
                type: 'address',
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
    name: 'Liquidate',
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
        name: 'loanId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'revnetId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'reallocatedLoanId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'reallocatedLoan',
        internalType: 'struct REVLoan',
        type: 'tuple',
        components: [
          { name: 'amount', internalType: 'uint112', type: 'uint112' },
          { name: 'collateral', internalType: 'uint112', type: 'uint112' },
          { name: 'createdAt', internalType: 'uint48', type: 'uint48' },
          { name: 'prepaidFeePercent', internalType: 'uint16', type: 'uint16' },
          { name: 'prepaidDuration', internalType: 'uint32', type: 'uint32' },
          {
            name: 'source',
            internalType: 'struct REVLoanSource',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              {
                name: 'terminal',
                internalType: 'contract IJBPayoutTerminal',
                type: 'address',
              },
            ],
          },
        ],
        indexed: false,
      },
      {
        name: 'removedcollateralCount',
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
    name: 'ReallocateCollateral',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'loanId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'revnetId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'paidOffLoanId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'loan',
        internalType: 'struct REVLoan',
        type: 'tuple',
        components: [
          { name: 'amount', internalType: 'uint112', type: 'uint112' },
          { name: 'collateral', internalType: 'uint112', type: 'uint112' },
          { name: 'createdAt', internalType: 'uint48', type: 'uint48' },
          { name: 'prepaidFeePercent', internalType: 'uint16', type: 'uint16' },
          { name: 'prepaidDuration', internalType: 'uint32', type: 'uint32' },
          {
            name: 'source',
            internalType: 'struct REVLoanSource',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              {
                name: 'terminal',
                internalType: 'contract IJBPayoutTerminal',
                type: 'address',
              },
            ],
          },
        ],
        indexed: false,
      },
      {
        name: 'paidOffLoan',
        internalType: 'struct REVLoan',
        type: 'tuple',
        components: [
          { name: 'amount', internalType: 'uint112', type: 'uint112' },
          { name: 'collateral', internalType: 'uint112', type: 'uint112' },
          { name: 'createdAt', internalType: 'uint48', type: 'uint48' },
          { name: 'prepaidFeePercent', internalType: 'uint16', type: 'uint16' },
          { name: 'prepaidDuration', internalType: 'uint32', type: 'uint32' },
          {
            name: 'source',
            internalType: 'struct REVLoanSource',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              {
                name: 'terminal',
                internalType: 'contract IJBPayoutTerminal',
                type: 'address',
              },
            ],
          },
        ],
        indexed: false,
      },
      {
        name: 'repayBorrowAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'sourceFeeAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'collateralCountToReturn',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'beneficiary',
        internalType: 'address payable',
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
    name: 'RepayLoan',
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
  {
    type: 'error',
    inputs: [
      { name: 'collateralToReturn', internalType: 'uint256', type: 'uint256' },
      { name: 'loanCollateral', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'REVLoans_CollateralExceedsLoan',
  },
  {
    type: 'error',
    inputs: [
      { name: 'prepaidFeePercent', internalType: 'uint256', type: 'uint256' },
      { name: 'min', internalType: 'uint256', type: 'uint256' },
      { name: 'max', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'REVLoans_InvalidPrepaidFeePercent',
  },
  {
    type: 'error',
    inputs: [
      {
        name: 'timeSinceLoanCreated',
        internalType: 'uint256',
        type: 'uint256',
      },
      {
        name: 'loanLiquidationDuration',
        internalType: 'uint256',
        type: 'uint256',
      },
    ],
    name: 'REVLoans_LoanExpired',
  },
  {
    type: 'error',
    inputs: [
      { name: 'newBorrowAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'loanAmount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'REVLoans_NewBorrowAmountGreaterThanLoanAmount',
  },
  { type: 'error', inputs: [], name: 'REVLoans_NoMsgValueAllowed' },
  { type: 'error', inputs: [], name: 'REVLoans_NotEnoughCollateral' },
  {
    type: 'error',
    inputs: [
      {
        name: 'maxRepayBorrowAmount',
        internalType: 'uint256',
        type: 'uint256',
      },
      { name: 'repayBorrowAmount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'REVLoans_OverMaxRepayBorrowAmount',
  },
  {
    type: 'error',
    inputs: [
      { name: 'value', internalType: 'uint256', type: 'uint256' },
      { name: 'limit', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'REVLoans_OverflowAlert',
  },
  {
    type: 'error',
    inputs: [
      { name: 'allowanceAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'requiredAmount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'REVLoans_PermitAllowanceNotEnough',
  },
  {
    type: 'error',
    inputs: [
      { name: 'newBorrowAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'loanAmount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'REVLoans_ReallocatingMoreCollateralThanBorrowedAmountAllows',
  },
  {
    type: 'error',
    inputs: [
      { name: 'revnetOwner', internalType: 'address', type: 'address' },
      { name: 'revnets', internalType: 'address', type: 'address' },
    ],
    name: 'REVLoans_RevnetsMismatch',
  },
  {
    type: 'error',
    inputs: [
      { name: 'caller', internalType: 'address', type: 'address' },
      { name: 'owner', internalType: 'address', type: 'address' },
    ],
    name: 'REVLoans_Unauthorized',
  },
  {
    type: 'error',
    inputs: [
      { name: 'minBorrowAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'borrowAmount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'REVLoans_UnderMinBorrowAmount',
  },
  { type: 'error', inputs: [], name: 'REVLoans_ZeroCollateralLoanIsInvalid' },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// REVLoans1_1
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const revLoans1_1Abi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'revnets',
        internalType: 'contract IREVDeployer',
        type: 'address',
      },
      { name: 'revId', internalType: 'uint256', type: 'uint256' },
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'permit2', internalType: 'contract IPermit2', type: 'address' },
      { name: 'trustedForwarder', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  { type: 'fallback', stateMutability: 'payable' },
  { type: 'receive', stateMutability: 'payable' },
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
    name: 'LOAN_LIQUIDATION_DURATION',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MAX_PREPAID_FEE_PERCENT',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MIN_PREPAID_FEE_PERCENT',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
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
    name: 'REVNETS',
    outputs: [
      { name: '', internalType: 'contract IREVDeployer', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'REV_ID',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'REV_PREPAID_FEE_PERCENT',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
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
    inputs: [
      { name: 'revnetId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'source',
        internalType: 'struct REVLoanSource',
        type: 'tuple',
        components: [
          { name: 'token', internalType: 'address', type: 'address' },
          {
            name: 'terminal',
            internalType: 'contract IJBPayoutTerminal',
            type: 'address',
          },
        ],
      },
      { name: 'minBorrowAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'collateralCount', internalType: 'uint256', type: 'uint256' },
      { name: 'beneficiary', internalType: 'address payable', type: 'address' },
      { name: 'prepaidFeePercent', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'borrowFrom',
    outputs: [
      { name: 'loanId', internalType: 'uint256', type: 'uint256' },
      {
        name: '',
        internalType: 'struct REVLoan',
        type: 'tuple',
        components: [
          { name: 'amount', internalType: 'uint112', type: 'uint112' },
          { name: 'collateral', internalType: 'uint112', type: 'uint112' },
          { name: 'createdAt', internalType: 'uint48', type: 'uint48' },
          { name: 'prepaidFeePercent', internalType: 'uint16', type: 'uint16' },
          { name: 'prepaidDuration', internalType: 'uint32', type: 'uint32' },
          {
            name: 'source',
            internalType: 'struct REVLoanSource',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              {
                name: 'terminal',
                internalType: 'contract IJBPayoutTerminal',
                type: 'address',
              },
            ],
          },
        ],
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'revnetId', internalType: 'uint256', type: 'uint256' },
      { name: 'collateralCount', internalType: 'uint256', type: 'uint256' },
      { name: 'decimals', internalType: 'uint256', type: 'uint256' },
      { name: 'currency', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'borrowableAmountFrom',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'loan',
        internalType: 'struct REVLoan',
        type: 'tuple',
        components: [
          { name: 'amount', internalType: 'uint112', type: 'uint112' },
          { name: 'collateral', internalType: 'uint112', type: 'uint112' },
          { name: 'createdAt', internalType: 'uint48', type: 'uint48' },
          { name: 'prepaidFeePercent', internalType: 'uint16', type: 'uint16' },
          { name: 'prepaidDuration', internalType: 'uint32', type: 'uint32' },
          {
            name: 'source',
            internalType: 'struct REVLoanSource',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              {
                name: 'terminal',
                internalType: 'contract IJBPayoutTerminal',
                type: 'address',
              },
            ],
          },
        ],
      },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'determineSourceFeeAmount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
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
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'operator', internalType: 'address', type: 'address' },
    ],
    name: 'isApprovedForAll',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'revnetId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'terminal',
        internalType: 'contract IJBPayoutTerminal',
        type: 'address',
      },
      { name: 'token', internalType: 'address', type: 'address' },
    ],
    name: 'isLoanSourceOf',
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
    inputs: [
      { name: 'revnetId', internalType: 'uint256', type: 'uint256' },
      { name: 'startingLoanId', internalType: 'uint256', type: 'uint256' },
      { name: 'count', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'liquidateExpiredLoansFrom',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'loanId', internalType: 'uint256', type: 'uint256' }],
    name: 'loanOf',
    outputs: [
      {
        name: '',
        internalType: 'struct REVLoan',
        type: 'tuple',
        components: [
          { name: 'amount', internalType: 'uint112', type: 'uint112' },
          { name: 'collateral', internalType: 'uint112', type: 'uint112' },
          { name: 'createdAt', internalType: 'uint48', type: 'uint48' },
          { name: 'prepaidFeePercent', internalType: 'uint16', type: 'uint16' },
          { name: 'prepaidDuration', internalType: 'uint32', type: 'uint32' },
          {
            name: 'source',
            internalType: 'struct REVLoanSource',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              {
                name: 'terminal',
                internalType: 'contract IJBPayoutTerminal',
                type: 'address',
              },
            ],
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'revnetId', internalType: 'uint256', type: 'uint256' }],
    name: 'loanSourcesOf',
    outputs: [
      {
        name: '',
        internalType: 'struct REVLoanSource[]',
        type: 'tuple[]',
        components: [
          { name: 'token', internalType: 'address', type: 'address' },
          {
            name: 'terminal',
            internalType: 'contract IJBPayoutTerminal',
            type: 'address',
          },
        ],
      },
    ],
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
    inputs: [{ name: 'revnetId', internalType: 'uint256', type: 'uint256' }],
    name: 'numberOfLoansFor',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
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
    inputs: [
      { name: 'loanId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'collateralCountToTransfer',
        internalType: 'uint256',
        type: 'uint256',
      },
      {
        name: 'source',
        internalType: 'struct REVLoanSource',
        type: 'tuple',
        components: [
          { name: 'token', internalType: 'address', type: 'address' },
          {
            name: 'terminal',
            internalType: 'contract IJBPayoutTerminal',
            type: 'address',
          },
        ],
      },
      { name: 'minBorrowAmount', internalType: 'uint256', type: 'uint256' },
      {
        name: 'collateralCountToAdd',
        internalType: 'uint256',
        type: 'uint256',
      },
      { name: 'beneficiary', internalType: 'address payable', type: 'address' },
      { name: 'prepaidFeePercent', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'reallocateCollateralFromLoan',
    outputs: [
      { name: 'reallocatedLoanId', internalType: 'uint256', type: 'uint256' },
      { name: 'newLoanId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'reallocatedLoan',
        internalType: 'struct REVLoan',
        type: 'tuple',
        components: [
          { name: 'amount', internalType: 'uint112', type: 'uint112' },
          { name: 'collateral', internalType: 'uint112', type: 'uint112' },
          { name: 'createdAt', internalType: 'uint48', type: 'uint48' },
          { name: 'prepaidFeePercent', internalType: 'uint16', type: 'uint16' },
          { name: 'prepaidDuration', internalType: 'uint32', type: 'uint32' },
          {
            name: 'source',
            internalType: 'struct REVLoanSource',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              {
                name: 'terminal',
                internalType: 'contract IJBPayoutTerminal',
                type: 'address',
              },
            ],
          },
        ],
      },
      {
        name: 'newLoan',
        internalType: 'struct REVLoan',
        type: 'tuple',
        components: [
          { name: 'amount', internalType: 'uint112', type: 'uint112' },
          { name: 'collateral', internalType: 'uint112', type: 'uint112' },
          { name: 'createdAt', internalType: 'uint48', type: 'uint48' },
          { name: 'prepaidFeePercent', internalType: 'uint16', type: 'uint16' },
          { name: 'prepaidDuration', internalType: 'uint32', type: 'uint32' },
          {
            name: 'source',
            internalType: 'struct REVLoanSource',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              {
                name: 'terminal',
                internalType: 'contract IJBPayoutTerminal',
                type: 'address',
              },
            ],
          },
        ],
      },
    ],
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
    inputs: [
      { name: 'loanId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'maxRepayBorrowAmount',
        internalType: 'uint256',
        type: 'uint256',
      },
      {
        name: 'collateralCountToReturn',
        internalType: 'uint256',
        type: 'uint256',
      },
      { name: 'beneficiary', internalType: 'address payable', type: 'address' },
      {
        name: 'allowance',
        internalType: 'struct JBSingleAllowance',
        type: 'tuple',
        components: [
          { name: 'sigDeadline', internalType: 'uint256', type: 'uint256' },
          { name: 'amount', internalType: 'uint160', type: 'uint160' },
          { name: 'expiration', internalType: 'uint48', type: 'uint48' },
          { name: 'nonce', internalType: 'uint48', type: 'uint48' },
          { name: 'signature', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    name: 'repayLoan',
    outputs: [
      { name: 'paidOffLoanId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'paidOffloan',
        internalType: 'struct REVLoan',
        type: 'tuple',
        components: [
          { name: 'amount', internalType: 'uint112', type: 'uint112' },
          { name: 'collateral', internalType: 'uint112', type: 'uint112' },
          { name: 'createdAt', internalType: 'uint48', type: 'uint48' },
          { name: 'prepaidFeePercent', internalType: 'uint16', type: 'uint16' },
          { name: 'prepaidDuration', internalType: 'uint32', type: 'uint32' },
          {
            name: 'source',
            internalType: 'struct REVLoanSource',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              {
                name: 'terminal',
                internalType: 'contract IJBPayoutTerminal',
                type: 'address',
              },
            ],
          },
        ],
      },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [{ name: 'loanId', internalType: 'uint256', type: 'uint256' }],
    name: 'revnetIdOfLoanWith',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'pure',
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
    inputs: [{ name: 'loanId', internalType: 'uint256', type: 'uint256' }],
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
      { name: 'revnetId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'terminal',
        internalType: 'contract IJBPayoutTerminal',
        type: 'address',
      },
      { name: 'token', internalType: 'address', type: 'address' },
    ],
    name: 'totalBorrowedFrom',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'revnetId', internalType: 'uint256', type: 'uint256' }],
    name: 'totalCollateralOf',
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
        name: 'loanId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'revnetId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'loan',
        internalType: 'struct REVLoan',
        type: 'tuple',
        components: [
          { name: 'amount', internalType: 'uint112', type: 'uint112' },
          { name: 'collateral', internalType: 'uint112', type: 'uint112' },
          { name: 'createdAt', internalType: 'uint48', type: 'uint48' },
          { name: 'prepaidFeePercent', internalType: 'uint16', type: 'uint16' },
          { name: 'prepaidDuration', internalType: 'uint32', type: 'uint32' },
          {
            name: 'source',
            internalType: 'struct REVLoanSource',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              {
                name: 'terminal',
                internalType: 'contract IJBPayoutTerminal',
                type: 'address',
              },
            ],
          },
        ],
        indexed: false,
      },
      {
        name: 'source',
        internalType: 'struct REVLoanSource',
        type: 'tuple',
        components: [
          { name: 'token', internalType: 'address', type: 'address' },
          {
            name: 'terminal',
            internalType: 'contract IJBPayoutTerminal',
            type: 'address',
          },
        ],
        indexed: false,
      },
      {
        name: 'borrowAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'collateralCount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'sourceFeeAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'beneficiary',
        internalType: 'address payable',
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
    name: 'Borrow',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'loanId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'revnetId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'loan',
        internalType: 'struct REVLoan',
        type: 'tuple',
        components: [
          { name: 'amount', internalType: 'uint112', type: 'uint112' },
          { name: 'collateral', internalType: 'uint112', type: 'uint112' },
          { name: 'createdAt', internalType: 'uint48', type: 'uint48' },
          { name: 'prepaidFeePercent', internalType: 'uint16', type: 'uint16' },
          { name: 'prepaidDuration', internalType: 'uint32', type: 'uint32' },
          {
            name: 'source',
            internalType: 'struct REVLoanSource',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              {
                name: 'terminal',
                internalType: 'contract IJBPayoutTerminal',
                type: 'address',
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
    name: 'Liquidate',
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
        name: 'loanId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'revnetId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'reallocatedLoanId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'reallocatedLoan',
        internalType: 'struct REVLoan',
        type: 'tuple',
        components: [
          { name: 'amount', internalType: 'uint112', type: 'uint112' },
          { name: 'collateral', internalType: 'uint112', type: 'uint112' },
          { name: 'createdAt', internalType: 'uint48', type: 'uint48' },
          { name: 'prepaidFeePercent', internalType: 'uint16', type: 'uint16' },
          { name: 'prepaidDuration', internalType: 'uint32', type: 'uint32' },
          {
            name: 'source',
            internalType: 'struct REVLoanSource',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              {
                name: 'terminal',
                internalType: 'contract IJBPayoutTerminal',
                type: 'address',
              },
            ],
          },
        ],
        indexed: false,
      },
      {
        name: 'removedcollateralCount',
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
    name: 'ReallocateCollateral',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'loanId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'revnetId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'paidOffLoanId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'loan',
        internalType: 'struct REVLoan',
        type: 'tuple',
        components: [
          { name: 'amount', internalType: 'uint112', type: 'uint112' },
          { name: 'collateral', internalType: 'uint112', type: 'uint112' },
          { name: 'createdAt', internalType: 'uint48', type: 'uint48' },
          { name: 'prepaidFeePercent', internalType: 'uint16', type: 'uint16' },
          { name: 'prepaidDuration', internalType: 'uint32', type: 'uint32' },
          {
            name: 'source',
            internalType: 'struct REVLoanSource',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              {
                name: 'terminal',
                internalType: 'contract IJBPayoutTerminal',
                type: 'address',
              },
            ],
          },
        ],
        indexed: false,
      },
      {
        name: 'paidOffLoan',
        internalType: 'struct REVLoan',
        type: 'tuple',
        components: [
          { name: 'amount', internalType: 'uint112', type: 'uint112' },
          { name: 'collateral', internalType: 'uint112', type: 'uint112' },
          { name: 'createdAt', internalType: 'uint48', type: 'uint48' },
          { name: 'prepaidFeePercent', internalType: 'uint16', type: 'uint16' },
          { name: 'prepaidDuration', internalType: 'uint32', type: 'uint32' },
          {
            name: 'source',
            internalType: 'struct REVLoanSource',
            type: 'tuple',
            components: [
              { name: 'token', internalType: 'address', type: 'address' },
              {
                name: 'terminal',
                internalType: 'contract IJBPayoutTerminal',
                type: 'address',
              },
            ],
          },
        ],
        indexed: false,
      },
      {
        name: 'repayBorrowAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'sourceFeeAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'collateralCountToReturn',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'beneficiary',
        internalType: 'address payable',
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
    name: 'RepayLoan',
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
  {
    type: 'error',
    inputs: [
      { name: 'collateralToReturn', internalType: 'uint256', type: 'uint256' },
      { name: 'loanCollateral', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'REVLoans_CollateralExceedsLoan',
  },
  {
    type: 'error',
    inputs: [
      { name: 'prepaidFeePercent', internalType: 'uint256', type: 'uint256' },
      { name: 'min', internalType: 'uint256', type: 'uint256' },
      { name: 'max', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'REVLoans_InvalidPrepaidFeePercent',
  },
  {
    type: 'error',
    inputs: [
      {
        name: 'timeSinceLoanCreated',
        internalType: 'uint256',
        type: 'uint256',
      },
      {
        name: 'loanLiquidationDuration',
        internalType: 'uint256',
        type: 'uint256',
      },
    ],
    name: 'REVLoans_LoanExpired',
  },
  {
    type: 'error',
    inputs: [
      { name: 'newBorrowAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'loanAmount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'REVLoans_NewBorrowAmountGreaterThanLoanAmount',
  },
  { type: 'error', inputs: [], name: 'REVLoans_NoMsgValueAllowed' },
  { type: 'error', inputs: [], name: 'REVLoans_NotEnoughCollateral' },
  {
    type: 'error',
    inputs: [
      {
        name: 'maxRepayBorrowAmount',
        internalType: 'uint256',
        type: 'uint256',
      },
      { name: 'repayBorrowAmount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'REVLoans_OverMaxRepayBorrowAmount',
  },
  {
    type: 'error',
    inputs: [
      { name: 'value', internalType: 'uint256', type: 'uint256' },
      { name: 'limit', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'REVLoans_OverflowAlert',
  },
  {
    type: 'error',
    inputs: [
      { name: 'allowanceAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'requiredAmount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'REVLoans_PermitAllowanceNotEnough',
  },
  {
    type: 'error',
    inputs: [
      { name: 'newBorrowAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'loanAmount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'REVLoans_ReallocatingMoreCollateralThanBorrowedAmountAllows',
  },
  {
    type: 'error',
    inputs: [
      { name: 'revnetOwner', internalType: 'address', type: 'address' },
      { name: 'revnets', internalType: 'address', type: 'address' },
    ],
    name: 'REVLoans_RevnetsMismatch',
  },
  {
    type: 'error',
    inputs: [
      { name: 'caller', internalType: 'address', type: 'address' },
      { name: 'owner', internalType: 'address', type: 'address' },
    ],
    name: 'REVLoans_Unauthorized',
  },
  {
    type: 'error',
    inputs: [
      { name: 'minBorrowAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'borrowAmount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'REVLoans_UnderMinBorrowAmount',
  },
  { type: 'error', inputs: [], name: 'REVLoans_ZeroCollateralLoanIsInvalid' },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation',
  },
] as const

  /**
   * Addresses to use in JB project deployments.
   */
  export const jbContractAddress = {
  "4": {
    "JBController": {
      "1": "0xb291844f213047eb9e1621ae555b1eae6700d553",
      "10": "0xb291844f213047eb9e1621ae555b1eae6700d553",
      "8453": "0xb291844f213047eb9e1621ae555b1eae6700d553",
      "42161": "0xb291844f213047eb9e1621ae555b1eae6700d553",
      "84532": "0xb291844f213047eb9e1621ae555b1eae6700d553",
      "421614": "0xb291844f213047eb9e1621ae555b1eae6700d553",
      "11155111": "0xb291844f213047eb9e1621ae555b1eae6700d553",
      "11155420": "0xb291844f213047eb9e1621ae555b1eae6700d553"
    },
    "JBController4_1": {
      "1": "0xd1c436eb62e1d23e66842701b09e3d65aa8522e8",
      "10": "0xd1c436eb62e1d23e66842701b09e3d65aa8522e8",
      "8453": "0xd1c436eb62e1d23e66842701b09e3d65aa8522e8",
      "42161": "0xd1c436eb62e1d23e66842701b09e3d65aa8522e8",
      "84532": "0xd1c436eb62e1d23e66842701b09e3d65aa8522e8",
      "421614": "0xd1c436eb62e1d23e66842701b09e3d65aa8522e8",
      "11155111": "0xd1c436eb62e1d23e66842701b09e3d65aa8522e8",
      "11155420": "0xd1c436eb62e1d23e66842701b09e3d65aa8522e8"
    },
    "JBDirectory": {
      "1": "0x0bc9f153dee4d3d474ce0903775b9b2aaae9aa41",
      "10": "0x0bc9f153dee4d3d474ce0903775b9b2aaae9aa41",
      "8453": "0x0bc9f153dee4d3d474ce0903775b9b2aaae9aa41",
      "42161": "0x0bc9f153dee4d3d474ce0903775b9b2aaae9aa41",
      "84532": "0x0bc9f153dee4d3d474ce0903775b9b2aaae9aa41",
      "421614": "0x0bc9f153dee4d3d474ce0903775b9b2aaae9aa41",
      "11155111": "0x0bc9f153dee4d3d474ce0903775b9b2aaae9aa41",
      "11155420": "0x0bc9f153dee4d3d474ce0903775b9b2aaae9aa41"
    },
    "JBMultiTerminal": {
      "1": "0xdb9644369c79c3633cde70d2df50d827d7dc7dbc",
      "10": "0xdb9644369c79c3633cde70d2df50d827d7dc7dbc",
      "8453": "0xdb9644369c79c3633cde70d2df50d827d7dc7dbc",
      "42161": "0xdb9644369c79c3633cde70d2df50d827d7dc7dbc",
      "84532": "0xdb9644369c79c3633cde70d2df50d827d7dc7dbc",
      "421614": "0xdb9644369c79c3633cde70d2df50d827d7dc7dbc",
      "11155111": "0xdb9644369c79c3633cde70d2df50d827d7dc7dbc",
      "11155420": "0xdb9644369c79c3633cde70d2df50d827d7dc7dbc"
    },
    "JBRulesets": {
      "1": "0xda86eedb67c6c9fb3e58fe83efa28674d7c89826",
      "10": "0xda86eedb67c6c9fb3e58fe83efa28674d7c89826",
      "8453": "0xda86eedb67c6c9fb3e58fe83efa28674d7c89826",
      "42161": "0xda86eedb67c6c9fb3e58fe83efa28674d7c89826",
      "84532": "0xda86eedb67c6c9fb3e58fe83efa28674d7c89826",
      "421614": "0xda86eedb67c6c9fb3e58fe83efa28674d7c89826",
      "11155111": "0xda86eedb67c6c9fb3e58fe83efa28674d7c89826",
      "11155420": "0xda86eedb67c6c9fb3e58fe83efa28674d7c89826"
    },
    "JBPermissions": {
      "1": "0xf5ca295dc286a176e35ebb7833031fd95550eb14",
      "10": "0xf5ca295dc286a176e35ebb7833031fd95550eb14",
      "8453": "0xf5ca295dc286a176e35ebb7833031fd95550eb14",
      "42161": "0xf5ca295dc286a176e35ebb7833031fd95550eb14",
      "84532": "0xf5ca295dc286a176e35ebb7833031fd95550eb14",
      "421614": "0xf5ca295dc286a176e35ebb7833031fd95550eb14",
      "11155111": "0xf5ca295dc286a176e35ebb7833031fd95550eb14",
      "11155420": "0xf5ca295dc286a176e35ebb7833031fd95550eb14"
    },
    "JBProjects": {
      "1": "0x0b538a02610d7d3cc91ce2870f423e0a34d646ad",
      "10": "0x0b538a02610d7d3cc91ce2870f423e0a34d646ad",
      "8453": "0x0b538a02610d7d3cc91ce2870f423e0a34d646ad",
      "42161": "0x0b538a02610d7d3cc91ce2870f423e0a34d646ad",
      "84532": "0x0b538a02610d7d3cc91ce2870f423e0a34d646ad",
      "421614": "0x0b538a02610d7d3cc91ce2870f423e0a34d646ad",
      "11155111": "0x0b538a02610d7d3cc91ce2870f423e0a34d646ad",
      "11155420": "0x0b538a02610d7d3cc91ce2870f423e0a34d646ad"
    },
    "JBSplits": {
      "1": "0x9e834f2ae0970f8746e25fba6d42fd90bb96630c",
      "10": "0x9e834f2ae0970f8746e25fba6d42fd90bb96630c",
      "8453": "0x9e834f2ae0970f8746e25fba6d42fd90bb96630c",
      "42161": "0x9e834f2ae0970f8746e25fba6d42fd90bb96630c",
      "84532": "0x9e834f2ae0970f8746e25fba6d42fd90bb96630c",
      "421614": "0x9e834f2ae0970f8746e25fba6d42fd90bb96630c",
      "11155111": "0x9e834f2ae0970f8746e25fba6d42fd90bb96630c",
      "11155420": "0x9e834f2ae0970f8746e25fba6d42fd90bb96630c"
    },
    "JBTokens": {
      "1": "0xa59e9f424901fb9dbd8913a9a32a081f9425bf36",
      "10": "0xa59e9f424901fb9dbd8913a9a32a081f9425bf36",
      "8453": "0xa59e9f424901fb9dbd8913a9a32a081f9425bf36",
      "42161": "0xa59e9f424901fb9dbd8913a9a32a081f9425bf36",
      "84532": "0xa59e9f424901fb9dbd8913a9a32a081f9425bf36",
      "421614": "0xa59e9f424901fb9dbd8913a9a32a081f9425bf36",
      "11155111": "0xa59e9f424901fb9dbd8913a9a32a081f9425bf36",
      "11155420": "0xa59e9f424901fb9dbd8913a9a32a081f9425bf36"
    },
    "JBTerminalStore": {
      "1": "0x6f6740dda12033ca9fbaa56693194e38cfd36827",
      "10": "0x6f6740dda12033ca9fbaa56693194e38cfd36827",
      "8453": "0x6f6740dda12033ca9fbaa56693194e38cfd36827",
      "42161": "0x6f6740dda12033ca9fbaa56693194e38cfd36827",
      "84532": "0x6f6740dda12033ca9fbaa56693194e38cfd36827",
      "421614": "0x6f6740dda12033ca9fbaa56693194e38cfd36827",
      "11155111": "0x6f6740dda12033ca9fbaa56693194e38cfd36827",
      "11155420": "0x6f6740dda12033ca9fbaa56693194e38cfd36827"
    },
    "JBFundAccessLimits": {
      "1": "0xf1e1df5bba779e977a27ccc273847ab1346fceb8",
      "10": "0xf1e1df5bba779e977a27ccc273847ab1346fceb8",
      "8453": "0xf1e1df5bba779e977a27ccc273847ab1346fceb8",
      "42161": "0xf1e1df5bba779e977a27ccc273847ab1346fceb8",
      "84532": "0xf1e1df5bba779e977a27ccc273847ab1346fceb8",
      "421614": "0xf1e1df5bba779e977a27ccc273847ab1346fceb8",
      "11155111": "0xf1e1df5bba779e977a27ccc273847ab1346fceb8",
      "11155420": "0xf1e1df5bba779e977a27ccc273847ab1346fceb8"
    },
    "JBPrices": {
      "1": "0xe712d14b04f1a1fe464be930e3ea72b9b0a141d7",
      "10": "0xe712d14b04f1a1fe464be930e3ea72b9b0a141d7",
      "8453": "0xe712d14b04f1a1fe464be930e3ea72b9b0a141d7",
      "42161": "0xe712d14b04f1a1fe464be930e3ea72b9b0a141d7",
      "84532": "0xe712d14b04f1a1fe464be930e3ea72b9b0a141d7",
      "421614": "0xe712d14b04f1a1fe464be930e3ea72b9b0a141d7",
      "11155111": "0xe712d14b04f1a1fe464be930e3ea72b9b0a141d7",
      "11155420": "0xe712d14b04f1a1fe464be930e3ea72b9b0a141d7"
    },
    "ERC2771Forwarder": {
      "1": "0x8a5ba591ed2bed5691a378c65611ed492500f887",
      "10": "0x8a5ba591ed2bed5691a378c65611ed492500f887",
      "8453": "0x8a5ba591ed2bed5691a378c65611ed492500f887",
      "42161": "0x8a5ba591ed2bed5691a378c65611ed492500f887",
      "84532": "0x8a5ba591ed2bed5691a378c65611ed492500f887",
      "421614": "0x8a5ba591ed2bed5691a378c65611ed492500f887",
      "11155111": "0x8a5ba591ed2bed5691a378c65611ed492500f887",
      "11155420": "0x8a5ba591ed2bed5691a378c65611ed492500f887"
    },
    "JB721TiersHookDeployer": {
      "1": "0xdefb489d101bf74bbf8f60eec6ff2f078c9d5206",
      "10": "0xdefb489d101bf74bbf8f60eec6ff2f078c9d5206",
      "8453": "0xdefb489d101bf74bbf8f60eec6ff2f078c9d5206",
      "42161": "0xdefb489d101bf74bbf8f60eec6ff2f078c9d5206",
      "84532": "0xdefb489d101bf74bbf8f60eec6ff2f078c9d5206",
      "421614": "0xdefb489d101bf74bbf8f60eec6ff2f078c9d5206",
      "11155111": "0xdefb489d101bf74bbf8f60eec6ff2f078c9d5206",
      "11155420": "0xdefb489d101bf74bbf8f60eec6ff2f078c9d5206"
    },
    "JB721TiersHookProjectDeployer": {
      "1": "0xedb83eb473b008a2246488df1f85174d26d86af2",
      "10": "0xedb83eb473b008a2246488df1f85174d26d86af2",
      "8453": "0xedb83eb473b008a2246488df1f85174d26d86af2",
      "42161": "0xedb83eb473b008a2246488df1f85174d26d86af2",
      "84532": "0xedb83eb473b008a2246488df1f85174d26d86af2",
      "421614": "0xedb83eb473b008a2246488df1f85174d26d86af2",
      "11155111": "0xedb83eb473b008a2246488df1f85174d26d86af2",
      "11155420": "0xedb83eb473b008a2246488df1f85174d26d86af2"
    },
    "JB721TiersHook": {
      "1": "0x82f3aa5e0278c7fa7c95c314e2e875965e1d8d6a",
      "10": "0x82f3aa5e0278c7fa7c95c314e2e875965e1d8d6a",
      "8453": "0x82f3aa5e0278c7fa7c95c314e2e875965e1d8d6a",
      "42161": "0x82f3aa5e0278c7fa7c95c314e2e875965e1d8d6a",
      "84532": "0x82f3aa5e0278c7fa7c95c314e2e875965e1d8d6a",
      "421614": "0x82f3aa5e0278c7fa7c95c314e2e875965e1d8d6a",
      "11155111": "0x82f3aa5e0278c7fa7c95c314e2e875965e1d8d6a",
      "11155420": "0x82f3aa5e0278c7fa7c95c314e2e875965e1d8d6a"
    },
    "JB721TiersHookStore": {
      "1": "0xdc162a8a6decc7f27fd4cff58d69b9cc0c7c2ea1",
      "10": "0xdc162a8a6decc7f27fd4cff58d69b9cc0c7c2ea1",
      "8453": "0xdc162a8a6decc7f27fd4cff58d69b9cc0c7c2ea1",
      "42161": "0xdc162a8a6decc7f27fd4cff58d69b9cc0c7c2ea1",
      "84532": "0xdc162a8a6decc7f27fd4cff58d69b9cc0c7c2ea1",
      "421614": "0xdc162a8a6decc7f27fd4cff58d69b9cc0c7c2ea1",
      "11155111": "0xdc162a8a6decc7f27fd4cff58d69b9cc0c7c2ea1",
      "11155420": "0xdc162a8a6decc7f27fd4cff58d69b9cc0c7c2ea1"
    },
    "JBAddressRegistry": {
      "1": "0x2d9b78cb37ca724cfb9b32cd8e9a5dc1c88bc7bb",
      "10": "0x2d9b78cb37ca724cfb9b32cd8e9a5dc1c88bc7bb",
      "8453": "0x2d9b78cb37ca724cfb9b32cd8e9a5dc1c88bc7bb",
      "42161": "0x2d9b78cb37ca724cfb9b32cd8e9a5dc1c88bc7bb",
      "84532": "0x2d9b78cb37ca724cfb9b32cd8e9a5dc1c88bc7bb",
      "421614": "0x2d9b78cb37ca724cfb9b32cd8e9a5dc1c88bc7bb",
      "11155111": "0x2d9b78cb37ca724cfb9b32cd8e9a5dc1c88bc7bb",
      "11155420": "0x2d9b78cb37ca724cfb9b32cd8e9a5dc1c88bc7bb"
    },
    "JBSuckerRegistry": {
      "1": "0x696c7e9b37d28edbefa3fce06e26041b7197c1a5",
      "10": "0x696c7e9b37d28edbefa3fce06e26041b7197c1a5",
      "8453": "0x696c7e9b37d28edbefa3fce06e26041b7197c1a5",
      "42161": "0x696c7e9b37d28edbefa3fce06e26041b7197c1a5",
      "84532": "0x696c7e9b37d28edbefa3fce06e26041b7197c1a5",
      "421614": "0x696c7e9b37d28edbefa3fce06e26041b7197c1a5",
      "11155111": "0x696c7e9b37d28edbefa3fce06e26041b7197c1a5",
      "11155420": "0x696c7e9b37d28edbefa3fce06e26041b7197c1a5"
    },
    "JBCCIPSuckerDeployer": {
      "1": "0x34b40205b249e5733cf93d86b7c9783b015dd3e7",
      "10": "0x34b40205b249e5733cf93d86b7c9783b015dd3e7",
      "8453": "0xde901ebafc70d545f9d43034308c136ce8c94a5c",
      "42161": "0x9d4858cc9d3552507eeabce722787afef64c615e",
      "84532": "0xde901ebafc70d545f9d43034308c136ce8c94a5c",
      "421614": "0x9d4858cc9d3552507eeabce722787afef64c615e",
      "11155111": "0x34b40205b249e5733cf93d86b7c9783b015dd3e7",
      "11155420": "0x34b40205b249e5733cf93d86b7c9783b015dd3e7"
    },
    "JBCCIPSuckerDeployer_1": {
      "1": "0xde901ebafc70d545f9d43034308c136ce8c94a5c",
      "10": "0x39132ea75b9eae5cbff7ba1997c804302a7ff413",
      "8453": "0xb825f2f6995966eb6dd772a8707d4a547028ac26",
      "42161": "0x39132ea75b9eae5cbff7ba1997c804302a7ff413",
      "84532": "0xb825f2f6995966eb6dd772a8707d4a547028ac26",
      "421614": "0x39132ea75b9eae5cbff7ba1997c804302a7ff413",
      "11155111": "0xde901ebafc70d545f9d43034308c136ce8c94a5c",
      "11155420": "0x39132ea75b9eae5cbff7ba1997c804302a7ff413"
    },
    "JBCCIPSuckerDeployer_2": {
      "1": "0x9d4858cc9d3552507eeabce722787afef64c615e",
      "10": "0xb825f2f6995966eb6dd772a8707d4a547028ac26",
      "8453": "0x3d7fb0aa325ad5d2349274f9ef33d4424135d963",
      "42161": "0x3d7fb0aa325ad5d2349274f9ef33d4424135d963",
      "84532": "0x3d7fb0aa325ad5d2349274f9ef33d4424135d963",
      "421614": "0x3d7fb0aa325ad5d2349274f9ef33d4424135d963",
      "11155111": "0x9d4858cc9d3552507eeabce722787afef64c615e",
      "11155420": "0xb825f2f6995966eb6dd772a8707d4a547028ac26"
    },
    "JBSwapTerminal": {
      "1": "0xdd98b25631aa9372a8cf09912b803d2ad80db161",
      "10": "0xf7002a2df9bebf629b6093c8a60e28beed4f7b48",
      "8453": "0x9b82f7f43a956f5e83faaf1d46382cba19ce71ab",
      "42161": "0xcf50c6f3f366817815fe7ba69b4518356ba6033b",
      "84532": "0xb940f0bb31376cad3a0fae7c78995ae899160a52",
      "421614": "0xcf5f58ebb455678005b7dc6e506a7ec9a3438d0e",
      "11155111": "0x94c5431808ab538d398c6354d1972a0cb8c0b18b",
      "11155420": "0xb940f0bb31376cad3a0fae7c78995ae899160a52"
    },
    "JBSwapTerminal1_1": {
      "1": "0x64834ff3c2c18a715c635dd022227a9a8d9e8b73",
      "10": "0x817b87ab3cad4f84f8dc9c98b8f219404dca9927",
      "8453": "0xe4036d0cd05951689e1bb8667f5364874dc2fbfb",
      "42161": "0x21e6d82921fce3798a96134eddc2e7cd67c12769",
      "84532": "0xae33d0b3a5e1f2d52f50cd589458c84e2f1ea916",
      "421614": "0x97e7430c4e1ee242a604d8529195ae06b121cbc6",
      "11155111": "0x4b75f7c7e9bd65807cbc56419641155c2660b65c",
      "11155420": "0x6c5debbdb7365c9ed1ef4529823c3113d47e1842"
    },
    "JBBuybackHook": {
      "1": "0x7dcf35dad9b30ffcb7f35f51279252b884921927",
      "10": "0x09d97e2b8b2f143335c2344947a79d1a3a4c2946",
      "8453": "0x47d1b88af8ee0ed0a772a7c98430894141b9ac8b",
      "42161": "0xb9dce56d7f64b8c456157ded0c76241d0c23f578",
      "84532": "0x5401183c25750cbec8c3a9dd7e425829b0b1411d",
      "421614": "0xc32b873d25230bcbeb4f9d9d9bf10eaf4d77dddf",
      "11155111": "0x085b2fd0560ef5b6acd0f98b2f0e079cfa936f58",
      "11155420": "0x5401183c25750cbec8c3a9dd7e425829b0b1411d"
    },
    "JBOmnichainDeployer": {
      "1": "0x29f83557ca30d4283c1eb8b6118d1b4808eaa190",
      "10": "0x29f83557ca30d4283c1eb8b6118d1b4808eaa190",
      "8453": "0x29f83557ca30d4283c1eb8b6118d1b4808eaa190",
      "42161": "0x29f83557ca30d4283c1eb8b6118d1b4808eaa190",
      "84532": "0x29f83557ca30d4283c1eb8b6118d1b4808eaa190",
      "421614": "0x29f83557ca30d4283c1eb8b6118d1b4808eaa190",
      "11155111": "0x29f83557ca30d4283c1eb8b6118d1b4808eaa190",
      "11155420": "0x29f83557ca30d4283c1eb8b6118d1b4808eaa190"
    },
    "JBOmnichainDeployer4_1": {
      "1": "0xa7e0cbcfb2c6df7db07cc4ca05df681f1307cedd",
      "10": "0xa7e0cbcfb2c6df7db07cc4ca05df681f1307cedd",
      "8453": "0xa7e0cbcfb2c6df7db07cc4ca05df681f1307cedd",
      "42161": "0xa7e0cbcfb2c6df7db07cc4ca05df681f1307cedd",
      "84532": "0xa7e0cbcfb2c6df7db07cc4ca05df681f1307cedd",
      "421614": "0xa7e0cbcfb2c6df7db07cc4ca05df681f1307cedd",
      "11155111": "0xa7e0cbcfb2c6df7db07cc4ca05df681f1307cedd",
      "11155420": "0xa7e0cbcfb2c6df7db07cc4ca05df681f1307cedd"
    },
    "REVDeployer": {
      "1": "0x027f1684c6d31066c3f2468117f2508e8134fdfc",
      "10": "0x027f1684c6d31066c3f2468117f2508e8134fdfc",
      "8453": "0x027f1684c6d31066c3f2468117f2508e8134fdfc",
      "42161": "0x027f1684c6d31066c3f2468117f2508e8134fdfc",
      "84532": "0x027f1684c6d31066c3f2468117f2508e8134fdfc",
      "421614": "0x027f1684c6d31066c3f2468117f2508e8134fdfc",
      "11155111": "0x027f1684c6d31066c3f2468117f2508e8134fdfc",
      "11155420": "0x027f1684c6d31066c3f2468117f2508e8134fdfc"
    },
    "REVLoans": {
      "1": "0x03de624feb08c0edeff779ca5702aef4b85d7f06",
      "10": "0x03de624feb08c0edeff779ca5702aef4b85d7f06",
      "8453": "0x03de624feb08c0edeff779ca5702aef4b85d7f06",
      "42161": "0x03de624feb08c0edeff779ca5702aef4b85d7f06",
      "84532": "0x03de624feb08c0edeff779ca5702aef4b85d7f06",
      "421614": "0x03de624feb08c0edeff779ca5702aef4b85d7f06",
      "11155111": "0x03de624feb08c0edeff779ca5702aef4b85d7f06",
      "11155420": "0x03de624feb08c0edeff779ca5702aef4b85d7f06"
    },
    "REVLoans1_1": {
      "1": "0xde1e70faf22024559e7d94ab814abd7e42ca849b",
      "10": "0xde1e70faf22024559e7d94ab814abd7e42ca849b",
      "8453": "0xde1e70faf22024559e7d94ab814abd7e42ca849b",
      "42161": "0xde1e70faf22024559e7d94ab814abd7e42ca849b",
      "84532": "0xde1e70faf22024559e7d94ab814abd7e42ca849b",
      "421614": "0xde1e70faf22024559e7d94ab814abd7e42ca849b",
      "11155111": "0xde1e70faf22024559e7d94ab814abd7e42ca849b",
      "11155420": "0xde1e70faf22024559e7d94ab814abd7e42ca849b"
    }
  },
  "5": {
    "JBController": {
      "1": "0x27da30646502e2f642be5281322ae8c394f7668a",
      "10": "0x27da30646502e2f642be5281322ae8c394f7668a",
      "8453": "0x27da30646502e2f642be5281322ae8c394f7668a",
      "42161": "0x27da30646502e2f642be5281322ae8c394f7668a",
      "84532": "0x27da30646502e2f642be5281322ae8c394f7668a",
      "421614": "0x27da30646502e2f642be5281322ae8c394f7668a",
      "11155111": "0x27da30646502e2f642be5281322ae8c394f7668a",
      "11155420": "0x27da30646502e2f642be5281322ae8c394f7668a"
    },
    "JBDirectory": {
      "1": "0x0061e516886a0540f63157f112c0588ee0651dcf",
      "10": "0x0061e516886a0540f63157f112c0588ee0651dcf",
      "8453": "0x0061e516886a0540f63157f112c0588ee0651dcf",
      "42161": "0x0061e516886a0540f63157f112c0588ee0651dcf",
      "84532": "0x0061e516886a0540f63157f112c0588ee0651dcf",
      "421614": "0x0061e516886a0540f63157f112c0588ee0651dcf",
      "11155111": "0x0061e516886a0540f63157f112c0588ee0651dcf",
      "11155420": "0x0061e516886a0540f63157f112c0588ee0651dcf"
    },
    "JBMultiTerminal": {
      "1": "0x2db6d704058e552defe415753465df8df0361846",
      "10": "0x2db6d704058e552defe415753465df8df0361846",
      "8453": "0x2db6d704058e552defe415753465df8df0361846",
      "42161": "0x2db6d704058e552defe415753465df8df0361846",
      "84532": "0x2db6d704058e552defe415753465df8df0361846",
      "421614": "0x2db6d704058e552defe415753465df8df0361846",
      "11155111": "0x2db6d704058e552defe415753465df8df0361846",
      "11155420": "0x2db6d704058e552defe415753465df8df0361846"
    },
    "JBRulesets": {
      "1": "0x6292281d69c3593fcf6ea074e5797341476ab428",
      "10": "0x6292281d69c3593fcf6ea074e5797341476ab428",
      "8453": "0x6292281d69c3593fcf6ea074e5797341476ab428",
      "42161": "0x6292281d69c3593fcf6ea074e5797341476ab428",
      "84532": "0x6292281d69c3593fcf6ea074e5797341476ab428",
      "421614": "0x6292281d69c3593fcf6ea074e5797341476ab428",
      "11155111": "0x6292281d69c3593fcf6ea074e5797341476ab428",
      "11155420": "0x6292281d69c3593fcf6ea074e5797341476ab428"
    },
    "JBPermissions": {
      "1": "0x04fd6913d6c32d8c216e153a43c04b1857a7793d",
      "10": "0x04fd6913d6c32d8c216e153a43c04b1857a7793d",
      "8453": "0x04fd6913d6c32d8c216e153a43c04b1857a7793d",
      "42161": "0x04fd6913d6c32d8c216e153a43c04b1857a7793d",
      "84532": "0x04fd6913d6c32d8c216e153a43c04b1857a7793d",
      "421614": "0x04fd6913d6c32d8c216e153a43c04b1857a7793d",
      "11155111": "0x04fd6913d6c32d8c216e153a43c04b1857a7793d",
      "11155420": "0x04fd6913d6c32d8c216e153a43c04b1857a7793d"
    },
    "JBProjects": {
      "1": "0x885f707efa18d2cb12f05a3a8eba6b4b26c8c1d4",
      "10": "0x885f707efa18d2cb12f05a3a8eba6b4b26c8c1d4",
      "8453": "0x885f707efa18d2cb12f05a3a8eba6b4b26c8c1d4",
      "42161": "0x885f707efa18d2cb12f05a3a8eba6b4b26c8c1d4",
      "84532": "0x885f707efa18d2cb12f05a3a8eba6b4b26c8c1d4",
      "421614": "0x885f707efa18d2cb12f05a3a8eba6b4b26c8c1d4",
      "11155111": "0x885f707efa18d2cb12f05a3a8eba6b4b26c8c1d4",
      "11155420": "0x885f707efa18d2cb12f05a3a8eba6b4b26c8c1d4"
    },
    "JBSplits": {
      "1": "0x7160a322fea44945a6ef9adfd65c322258df3c5e",
      "10": "0x7160a322fea44945a6ef9adfd65c322258df3c5e",
      "8453": "0x7160a322fea44945a6ef9adfd65c322258df3c5e",
      "42161": "0x7160a322fea44945a6ef9adfd65c322258df3c5e",
      "84532": "0x7160a322fea44945a6ef9adfd65c322258df3c5e",
      "421614": "0x7160a322fea44945a6ef9adfd65c322258df3c5e",
      "11155111": "0x7160a322fea44945a6ef9adfd65c322258df3c5e",
      "11155420": "0x7160a322fea44945a6ef9adfd65c322258df3c5e"
    },
    "JBTokens": {
      "1": "0x4d0edd347fb1fa21589c1e109b3474924be87636",
      "10": "0x4d0edd347fb1fa21589c1e109b3474924be87636",
      "8453": "0x4d0edd347fb1fa21589c1e109b3474924be87636",
      "42161": "0x4d0edd347fb1fa21589c1e109b3474924be87636",
      "84532": "0x4d0edd347fb1fa21589c1e109b3474924be87636",
      "421614": "0x4d0edd347fb1fa21589c1e109b3474924be87636",
      "11155111": "0x4d0edd347fb1fa21589c1e109b3474924be87636",
      "11155420": "0x4d0edd347fb1fa21589c1e109b3474924be87636"
    },
    "JBTerminalStore": {
      "1": "0xfe33b439ec53748c87dcedacb83f05add5014744",
      "10": "0xfe33b439ec53748c87dcedacb83f05add5014744",
      "8453": "0xfe33b439ec53748c87dcedacb83f05add5014744",
      "42161": "0xfe33b439ec53748c87dcedacb83f05add5014744",
      "84532": "0xfe33b439ec53748c87dcedacb83f05add5014744",
      "421614": "0xfe33b439ec53748c87dcedacb83f05add5014744",
      "11155111": "0xfe33b439ec53748c87dcedacb83f05add5014744",
      "11155420": "0xfe33b439ec53748c87dcedacb83f05add5014744"
    },
    "JBFundAccessLimits": {
      "1": "0x3a46b21720c8b70184b0434a2293b2fdcc497ce7",
      "10": "0x3a46b21720c8b70184b0434a2293b2fdcc497ce7",
      "8453": "0x3a46b21720c8b70184b0434a2293b2fdcc497ce7",
      "42161": "0x3a46b21720c8b70184b0434a2293b2fdcc497ce7",
      "84532": "0x3a46b21720c8b70184b0434a2293b2fdcc497ce7",
      "421614": "0x3a46b21720c8b70184b0434a2293b2fdcc497ce7",
      "11155111": "0x3a46b21720c8b70184b0434a2293b2fdcc497ce7",
      "11155420": "0x3a46b21720c8b70184b0434a2293b2fdcc497ce7"
    },
    "JBPrices": {
      "1": "0x9b90e507cf6b7eb681a506b111f6f50245e614c4",
      "10": "0x9b90e507cf6b7eb681a506b111f6f50245e614c4",
      "8453": "0x9b90e507cf6b7eb681a506b111f6f50245e614c4",
      "42161": "0x9b90e507cf6b7eb681a506b111f6f50245e614c4",
      "84532": "0x9b90e507cf6b7eb681a506b111f6f50245e614c4",
      "421614": "0x9b90e507cf6b7eb681a506b111f6f50245e614c4",
      "11155111": "0x9b90e507cf6b7eb681a506b111f6f50245e614c4",
      "11155420": "0x9b90e507cf6b7eb681a506b111f6f50245e614c4"
    },
    "ERC2771Forwarder": {
      "1": "0xc29d6995ab3b0df4650ad643adeac55e7acbb566",
      "10": "0xc29d6995ab3b0df4650ad643adeac55e7acbb566",
      "8453": "0xc29d6995ab3b0df4650ad643adeac55e7acbb566",
      "42161": "0xc29d6995ab3b0df4650ad643adeac55e7acbb566",
      "84532": "0xc29d6995ab3b0df4650ad643adeac55e7acbb566",
      "421614": "0xc29d6995ab3b0df4650ad643adeac55e7acbb566",
      "11155111": "0xc29d6995ab3b0df4650ad643adeac55e7acbb566",
      "11155420": "0xc29d6995ab3b0df4650ad643adeac55e7acbb566"
    },
    "JB721TiersHookDeployer": {
      "1": "0xef60878d00378ac5f93d209f4616450ee8d41ca7",
      "10": "0xef60878d00378ac5f93d209f4616450ee8d41ca7",
      "8453": "0xef60878d00378ac5f93d209f4616450ee8d41ca7",
      "42161": "0xef60878d00378ac5f93d209f4616450ee8d41ca7",
      "84532": "0xef60878d00378ac5f93d209f4616450ee8d41ca7",
      "421614": "0xef60878d00378ac5f93d209f4616450ee8d41ca7",
      "11155111": "0xef60878d00378ac5f93d209f4616450ee8d41ca7",
      "11155420": "0xef60878d00378ac5f93d209f4616450ee8d41ca7"
    },
    "JB721TiersHookProjectDeployer": {
      "1": "0x048626e715a194fc38dd9be12f516b54b10e725a",
      "10": "0x048626e715a194fc38dd9be12f516b54b10e725a",
      "8453": "0x048626e715a194fc38dd9be12f516b54b10e725a",
      "42161": "0x048626e715a194fc38dd9be12f516b54b10e725a",
      "84532": "0x048626e715a194fc38dd9be12f516b54b10e725a",
      "421614": "0x048626e715a194fc38dd9be12f516b54b10e725a",
      "11155111": "0x048626e715a194fc38dd9be12f516b54b10e725a",
      "11155420": "0x048626e715a194fc38dd9be12f516b54b10e725a"
    },
    "JB721TiersHook": {
      "1": "0xe9485c121082d3beb57d6eac267b04a0f59d1760",
      "10": "0xe9485c121082d3beb57d6eac267b04a0f59d1760",
      "8453": "0xe9485c121082d3beb57d6eac267b04a0f59d1760",
      "42161": "0xe9485c121082d3beb57d6eac267b04a0f59d1760",
      "84532": "0xe9485c121082d3beb57d6eac267b04a0f59d1760",
      "421614": "0xe9485c121082d3beb57d6eac267b04a0f59d1760",
      "11155111": "0xe9485c121082d3beb57d6eac267b04a0f59d1760",
      "11155420": "0xe9485c121082d3beb57d6eac267b04a0f59d1760"
    },
    "JB721TiersHookStore": {
      "1": "0x2bc696b0af74042b30b2687ab5817cc824eba8ee",
      "10": "0x2bc696b0af74042b30b2687ab5817cc824eba8ee",
      "8453": "0x2bc696b0af74042b30b2687ab5817cc824eba8ee",
      "42161": "0x2bc696b0af74042b30b2687ab5817cc824eba8ee",
      "84532": "0x2bc696b0af74042b30b2687ab5817cc824eba8ee",
      "421614": "0x2bc696b0af74042b30b2687ab5817cc824eba8ee",
      "11155111": "0x2bc696b0af74042b30b2687ab5817cc824eba8ee",
      "11155420": "0x2bc696b0af74042b30b2687ab5817cc824eba8ee"
    },
    "JBAddressRegistry": {
      "1": "0x2d9b78cb37ca724cfb9b32cd8e9a5dc1c88bc7bb",
      "10": "0x2d9b78cb37ca724cfb9b32cd8e9a5dc1c88bc7bb",
      "8453": "0x2d9b78cb37ca724cfb9b32cd8e9a5dc1c88bc7bb",
      "42161": "0x2d9b78cb37ca724cfb9b32cd8e9a5dc1c88bc7bb",
      "84532": "0x2d9b78cb37ca724cfb9b32cd8e9a5dc1c88bc7bb",
      "421614": "0x2d9b78cb37ca724cfb9b32cd8e9a5dc1c88bc7bb",
      "11155111": "0x2d9b78cb37ca724cfb9b32cd8e9a5dc1c88bc7bb",
      "11155420": "0x2d9b78cb37ca724cfb9b32cd8e9a5dc1c88bc7bb"
    },
    "JBSuckerRegistry": {
      "1": "0x07c8c5bf08f0361883728a8a5f8824ba5724ece3",
      "10": "0x07c8c5bf08f0361883728a8a5f8824ba5724ece3",
      "8453": "0x07c8c5bf08f0361883728a8a5f8824ba5724ece3",
      "42161": "0x07c8c5bf08f0361883728a8a5f8824ba5724ece3",
      "84532": "0x07c8c5bf08f0361883728a8a5f8824ba5724ece3",
      "421614": "0x07c8c5bf08f0361883728a8a5f8824ba5724ece3",
      "11155111": "0x07c8c5bf08f0361883728a8a5f8824ba5724ece3",
      "11155420": "0x07c8c5bf08f0361883728a8a5f8824ba5724ece3"
    },
    "JBCCIPSuckerDeployer": {
      "1": "0x172ad9b3df724ee0422ea85b7799a3f7ca761816",
      "10": "0x172ad9b3df724ee0422ea85b7799a3f7ca761816",
      "8453": "0x195b4dce646eba3c3e9ae56708558b1a96f88814",
      "42161": "0xf816d238aef247f86cc73593961cb8fb55ca4bcf",
      "84532": "0x195b4dce646eba3c3e9ae56708558b1a96f88814",
      "421614": "0xf816d238aef247f86cc73593961cb8fb55ca4bcf",
      "11155111": "0x172ad9b3df724ee0422ea85b7799a3f7ca761816",
      "11155420": "0x172ad9b3df724ee0422ea85b7799a3f7ca761816"
    },
    "JBCCIPSuckerDeployer_1": {
      "1": "0x195b4dce646eba3c3e9ae56708558b1a96f88814",
      "10": "0xaa0dbdf6354dd238d289c359c74f998ddec8bcd1",
      "8453": "0x58683931b146697d094c660aec1f4a8f564a3d7d",
      "42161": "0xaa0dbdf6354dd238d289c359c74f998ddec8bcd1",
      "84532": "0x58683931b146697d094c660aec1f4a8f564a3d7d",
      "421614": "0xaa0dbdf6354dd238d289c359c74f998ddec8bcd1",
      "11155111": "0x195b4dce646eba3c3e9ae56708558b1a96f88814",
      "11155420": "0xaa0dbdf6354dd238d289c359c74f998ddec8bcd1"
    },
    "JBCCIPSuckerDeployer_2": {
      "1": "0xf816d238aef247f86cc73593961cb8fb55ca4bcf",
      "10": "0x58683931b146697d094c660aec1f4a8f564a3d7d",
      "8453": "0xc295a8926f1ed0a6e3b6cbdb1d28b9d6b388c8a7",
      "42161": "0xc295a8926f1ed0a6e3b6cbdb1d28b9d6b388c8a7",
      "84532": "0xc295a8926f1ed0a6e3b6cbdb1d28b9d6b388c8a7",
      "421614": "0xc295a8926f1ed0a6e3b6cbdb1d28b9d6b388c8a7",
      "11155111": "0xf816d238aef247f86cc73593961cb8fb55ca4bcf",
      "11155420": "0x58683931b146697d094c660aec1f4a8f564a3d7d"
    },
    "JBSwapTerminal": {
      "1": "0x259385b97dfbd5576bd717dc7b25967ec8b145dd",
      "10": "0x73d04584bde126242c36c2c7b219cbdec7aad774",
      "8453": "0x4fd73d8b285e82471f08a4ef9861d6248b832edd",
      "42161": "0x483c9b12c5bd2da73133aae30642ce0008c752ad",
      "84532": "0xc7369f75bd678e1a9a46b82e2512e84489d4d32d",
      "421614": "0x5f820a86d63eb1b98c562728719dc1e30967c41c",
      "11155111": "0xca3f2cc5a35c0412e8147746602b76ba4ac29fc5",
      "11155420": "0xc7369f75bd678e1a9a46b82e2512e84489d4d32d"
    },
    "JBSwapTerminalRegistry": {
      "1": "0x60b4f5595ee509c4c22921c7b7999f1616e6a4f6",
      "10": "0x60b4f5595ee509c4c22921c7b7999f1616e6a4f6",
      "8453": "0x60b4f5595ee509c4c22921c7b7999f1616e6a4f6",
      "42161": "0x60b4f5595ee509c4c22921c7b7999f1616e6a4f6",
      "84532": "0x60b4f5595ee509c4c22921c7b7999f1616e6a4f6",
      "421614": "0x60b4f5595ee509c4c22921c7b7999f1616e6a4f6",
      "11155111": "0x60b4f5595ee509c4c22921c7b7999f1616e6a4f6",
      "11155420": "0x60b4f5595ee509c4c22921c7b7999f1616e6a4f6"
    },
    "JBBuybackHook": {
      "1": "0xd342490ec41d5982c23951253a74a1c940fe0f9b",
      "10": "0x318f8aa6a95cb83419985c0d797c762f5a7824f3",
      "8453": "0xb6133a222315f8e9d25e7c77bac5ddeb3451d088",
      "42161": "0x4ac3e20edd1d398def0dfb44d3adb9fc244f0320",
      "84532": "0x79e5ca5ebe4f110965248afad88b8e539e1aa8fd",
      "421614": "0xb35ab801c008a64d8f3eea0a8a6209b0d176f2df",
      "11155111": "0xf082e3218a690ea6386506bed338f6878d21815f",
      "11155420": "0x79e5ca5ebe4f110965248afad88b8e539e1aa8fd"
    },
    "JBBuybackHookRegistry": {
      "1": "0x9e1e0fb70bc4661f2cc2d5eddd87a9d582a12b1a",
      "10": "0x9e1e0fb70bc4661f2cc2d5eddd87a9d582a12b1a",
      "8453": "0x9e1e0fb70bc4661f2cc2d5eddd87a9d582a12b1a",
      "42161": "0x9e1e0fb70bc4661f2cc2d5eddd87a9d582a12b1a",
      "84532": "0x9e1e0fb70bc4661f2cc2d5eddd87a9d582a12b1a",
      "421614": "0x9e1e0fb70bc4661f2cc2d5eddd87a9d582a12b1a",
      "11155111": "0x9e1e0fb70bc4661f2cc2d5eddd87a9d582a12b1a",
      "11155420": "0x9e1e0fb70bc4661f2cc2d5eddd87a9d582a12b1a"
    },
    "JBOmnichainDeployer": {
      "1": "0x8f5ded85c40b50d223269c1f922a056e72101590",
      "10": "0x8f5ded85c40b50d223269c1f922a056e72101590",
      "8453": "0x8f5ded85c40b50d223269c1f922a056e72101590",
      "42161": "0x8f5ded85c40b50d223269c1f922a056e72101590",
      "84532": "0x8f5ded85c40b50d223269c1f922a056e72101590",
      "421614": "0x8f5ded85c40b50d223269c1f922a056e72101590",
      "11155111": "0x8f5ded85c40b50d223269c1f922a056e72101590",
      "11155420": "0x8f5ded85c40b50d223269c1f922a056e72101590"
    },
    "REVDeployer": {
      "1": "0x2ca27bde7e7d33e353b44c27acfcf6c78dde251d",
      "10": "0x2ca27bde7e7d33e353b44c27acfcf6c78dde251d",
      "8453": "0x2ca27bde7e7d33e353b44c27acfcf6c78dde251d",
      "42161": "0x2ca27bde7e7d33e353b44c27acfcf6c78dde251d",
      "84532": "0x2ca27bde7e7d33e353b44c27acfcf6c78dde251d",
      "421614": "0x2ca27bde7e7d33e353b44c27acfcf6c78dde251d",
      "11155111": "0x2ca27bde7e7d33e353b44c27acfcf6c78dde251d",
      "11155420": "0x2ca27bde7e7d33e353b44c27acfcf6c78dde251d"
    },
    "REVLoans": {
      "1": "0x1880d832aa283d05b8eab68877717e25fbd550bb",
      "10": "0x1880d832aa283d05b8eab68877717e25fbd550bb",
      "8453": "0x1880d832aa283d05b8eab68877717e25fbd550bb",
      "42161": "0x1880d832aa283d05b8eab68877717e25fbd550bb",
      "84532": "0x1880d832aa283d05b8eab68877717e25fbd550bb",
      "421614": "0x1880d832aa283d05b8eab68877717e25fbd550bb",
      "11155111": "0x1880d832aa283d05b8eab68877717e25fbd550bb",
      "11155420": "0x1880d832aa283d05b8eab68877717e25fbd550bb"
    }
  }
} as const;