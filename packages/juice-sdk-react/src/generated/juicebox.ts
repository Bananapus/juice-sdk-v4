import {
  Address,
  useNetwork,
  useChainId,
  useContractRead,
  UseContractReadConfig,
  useContractWrite,
  UseContractWriteConfig,
  usePrepareContractWrite,
  UsePrepareContractWriteConfig,
  useContractEvent,
  UseContractEventConfig,
} from 'wagmi'
import {
  ReadContractResult,
  WriteContractMode,
  PrepareWriteContractResult,
} from 'wagmi/actions'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBAddressRegistry
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x903412238A2A8507D3b202399536E34B404Abb0C)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4fd2e89F2D22b931203f061e65C1180569575299)
 */
export const jbAddressRegistryABI = [
  { stateMutability: 'nonpayable', type: 'constructor', inputs: [] },
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
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [{ name: 'addr', internalType: 'address', type: 'address' }],
    name: 'deployerOf',
    outputs: [{ name: 'deployer', internalType: 'address', type: 'address' }],
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [
      { name: 'deployer', internalType: 'address', type: 'address' },
      { name: 'nonce', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'registerAddress',
    outputs: [],
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [
      { name: 'deployer', internalType: 'address', type: 'address' },
      { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
      { name: 'bytecode', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'registerAddress',
    outputs: [],
  },
] as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x903412238A2A8507D3b202399536E34B404Abb0C)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4fd2e89F2D22b931203f061e65C1180569575299)
 */
export const jbAddressRegistryAddress = {
  11155111: '0x903412238A2A8507D3b202399536E34B404Abb0C',
  11155420: '0x4fd2e89F2D22b931203f061e65C1180569575299',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x903412238A2A8507D3b202399536E34B404Abb0C)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4fd2e89F2D22b931203f061e65C1180569575299)
 */
export const jbAddressRegistryConfig = {
  address: jbAddressRegistryAddress,
  abi: jbAddressRegistryABI,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBController
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export const jbControllerABI = [
  {
    stateMutability: 'nonpayable',
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
  {
    type: 'error',
    inputs: [
      { name: 'x', internalType: 'uint256', type: 'uint256' },
      { name: 'y', internalType: 'uint256', type: 'uint256' },
      { name: 'denominator', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'PRBMath_MulDiv_Overflow',
  },
  { type: 'error', inputs: [], name: 'RULESET_ALREADY_LAUNCHED' },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation',
  },
  { type: 'error', inputs: [], name: 'UNAUTHORIZED' },
  { type: 'error', inputs: [], name: 'ZERO_TOKENS_TO_MINT' },
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
        internalType: 'contract IJBMigratable',
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
    name: 'MigrateController',
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
      { name: 'memo', internalType: 'string', type: 'string', indexed: false },
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
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'DIRECTORY',
    outputs: [
      { name: '', internalType: 'contract IJBDirectory', type: 'address' },
    ],
  },
  {
    stateMutability: 'view',
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
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'PERMISSIONS',
    outputs: [
      { name: '', internalType: 'contract IJBPermissions', type: 'address' },
    ],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'PROJECTS',
    outputs: [
      { name: '', internalType: 'contract IJBProjects', type: 'address' },
    ],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'RULESETS',
    outputs: [
      { name: '', internalType: 'contract IJBRulesets', type: 'address' },
    ],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'SPLITS',
    outputs: [
      { name: '', internalType: 'contract IJBSplits', type: 'address' },
    ],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'TOKENS',
    outputs: [
      { name: '', internalType: 'contract IJBTokens', type: 'address' },
    ],
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [
      { name: 'holder', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'tokenCount', internalType: 'uint256', type: 'uint256' },
      { name: 'memo', internalType: 'string', type: 'string' },
    ],
    name: 'burnTokensOf',
    outputs: [],
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [
      { name: 'holder', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'beneficiary', internalType: 'address', type: 'address' },
    ],
    name: 'claimTokensFor',
    outputs: [],
  },
  {
    stateMutability: 'view',
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
          {
            name: 'allowTerminalMigration',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'allowSetTerminals', internalType: 'bool', type: 'bool' },
          {
            name: 'allowControllerMigration',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'allowSetController', internalType: 'bool', type: 'bool' },
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
  },
  {
    stateMutability: 'nonpayable',
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
  },
  {
    stateMutability: 'view',
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
          {
            name: 'allowTerminalMigration',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'allowSetTerminals', internalType: 'bool', type: 'bool' },
          {
            name: 'allowControllerMigration',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'allowSetController', internalType: 'bool', type: 'bool' },
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
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [{ name: 'forwarder', internalType: 'address', type: 'address' }],
    name: 'isTrustedForwarder',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
  },
  {
    stateMutability: 'view',
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
          {
            name: 'allowTerminalMigration',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'allowSetTerminals', internalType: 'bool', type: 'bool' },
          {
            name: 'allowControllerMigration',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'allowSetController', internalType: 'bool', type: 'bool' },
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
  },
  {
    stateMutability: 'nonpayable',
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
                name: 'allowTerminalMigration',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'allowSetTerminals', internalType: 'bool', type: 'bool' },
              {
                name: 'allowControllerMigration',
                internalType: 'bool',
                type: 'bool',
              },
              {
                name: 'allowSetController',
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
  },
  {
    stateMutability: 'nonpayable',
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
                name: 'allowTerminalMigration',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'allowSetTerminals', internalType: 'bool', type: 'bool' },
              {
                name: 'allowControllerMigration',
                internalType: 'bool',
                type: 'bool',
              },
              {
                name: 'allowSetController',
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
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'to', internalType: 'contract IJBMigratable', type: 'address' },
    ],
    name: 'migrateController',
    outputs: [],
  },
  {
    stateMutability: 'nonpayable',
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
  },
  {
    stateMutability: 'nonpayable',
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
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'pendingReservedTokenBalanceOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
  },
  {
    stateMutability: 'nonpayable',
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
                name: 'allowTerminalMigration',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'allowSetTerminals', internalType: 'bool', type: 'bool' },
              {
                name: 'allowControllerMigration',
                internalType: 'bool',
                type: 'bool',
              },
              {
                name: 'allowSetController',
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
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'contract IERC165', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'receiveMigrationFrom',
    outputs: [],
  },
  {
    stateMutability: 'view',
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
                name: 'allowTerminalMigration',
                internalType: 'bool',
                type: 'bool',
              },
              { name: 'allowSetTerminals', internalType: 'bool', type: 'bool' },
              {
                name: 'allowControllerMigration',
                internalType: 'bool',
                type: 'bool',
              },
              {
                name: 'allowSetController',
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
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'memo', internalType: 'string', type: 'string' },
    ],
    name: 'sendReservedTokensToSplitsOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'setControllerAllowed',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
  },
  {
    stateMutability: 'nonpayable',
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
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'setTerminalsAllowed',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'contract IJBToken', type: 'address' },
    ],
    name: 'setTokenFor',
    outputs: [],
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'metadata', internalType: 'string', type: 'string' },
    ],
    name: 'setUriOf',
    outputs: [],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'totalTokenSupplyWithReservedTokensOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [
      { name: 'holder', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'recipient', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transferCreditsFrom',
    outputs: [],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'trustedForwarder',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
  },
  {
    stateMutability: 'view',
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
          {
            name: 'allowTerminalMigration',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'allowSetTerminals', internalType: 'bool', type: 'bool' },
          {
            name: 'allowControllerMigration',
            internalType: 'bool',
            type: 'bool',
          },
          { name: 'allowSetController', internalType: 'bool', type: 'bool' },
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
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'uriOf',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
  },
] as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export const jbControllerAddress = {
  11155111: '0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355',
  11155420: '0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export const jbControllerConfig = {
  address: jbControllerAddress,
  abi: jbControllerABI,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBDirectory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export const jbDirectoryABI = [
  {
    stateMutability: 'nonpayable',
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
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'PERMISSIONS',
    outputs: [
      { name: '', internalType: 'contract IJBPermissions', type: 'address' },
    ],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'PROJECTS',
    outputs: [
      { name: '', internalType: 'contract IJBProjects', type: 'address' },
    ],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'controllerOf',
    outputs: [{ name: '', internalType: 'contract IERC165', type: 'address' }],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [{ name: 'addr', internalType: 'address', type: 'address' }],
    name: 'isAllowedToSetFirstController',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
  },
  {
    stateMutability: 'view',
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
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
    ],
    name: 'primaryTerminalOf',
    outputs: [
      { name: '', internalType: 'contract IJBTerminal', type: 'address' },
    ],
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'controller', internalType: 'contract IERC165', type: 'address' },
    ],
    name: 'setControllerOf',
    outputs: [],
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [
      { name: 'addr', internalType: 'address', type: 'address' },
      { name: 'flag', internalType: 'bool', type: 'bool' },
    ],
    name: 'setIsAllowedToSetFirstController',
    outputs: [],
  },
  {
    stateMutability: 'nonpayable',
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
  },
  {
    stateMutability: 'nonpayable',
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
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'terminalsOf',
    outputs: [
      { name: '', internalType: 'contract IJBTerminal[]', type: 'address[]' },
    ],
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
  },
] as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export const jbDirectoryAddress = {
  11155111: '0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949',
  11155420: '0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export const jbDirectoryConfig = {
  address: jbDirectoryAddress,
  abi: jbDirectoryABI,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBFundAccessLimits
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 */
export const jbFundAccessLimitsABI = [
  {
    stateMutability: 'nonpayable',
    type: 'constructor',
    inputs: [
      {
        name: 'directory',
        internalType: 'contract IJBDirectory',
        type: 'address',
      },
    ],
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
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'DIRECTORY',
    outputs: [
      { name: '', internalType: 'contract IJBDirectory', type: 'address' },
    ],
  },
  {
    stateMutability: 'view',
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
  },
  {
    stateMutability: 'view',
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
  },
  {
    stateMutability: 'nonpayable',
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
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
  },
  {
    stateMutability: 'view',
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
  },
  {
    stateMutability: 'view',
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
  },
] as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 */
export const jbFundAccessLimitsAddress = {
  11155111: '0xF8eD3763480CA957316974BAB8FE4258d4fD0A17',
  11155420: '0xF8eD3763480CA957316974BAB8FE4258d4fD0A17',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 */
export const jbFundAccessLimitsConfig = {
  address: jbFundAccessLimitsAddress,
  abi: jbFundAccessLimitsABI,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBMultiTerminal
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export const jbMultiTerminalABI = [
  {
    stateMutability: 'nonpayable',
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
  { type: 'error', inputs: [], name: 'INADEQUATE_PAYOUT_AMOUNT' },
  { type: 'error', inputs: [], name: 'INADEQUATE_RECLAIM_AMOUNT' },
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
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'DIRECTORY',
    outputs: [
      { name: '', internalType: 'contract IJBDirectory', type: 'address' },
    ],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'FEE',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
  },
  {
    stateMutability: 'view',
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
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'PERMISSIONS',
    outputs: [
      { name: '', internalType: 'contract IJBPermissions', type: 'address' },
    ],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'PERMIT2',
    outputs: [{ name: '', internalType: 'contract IPermit2', type: 'address' }],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'PROJECTS',
    outputs: [
      { name: '', internalType: 'contract IJBProjects', type: 'address' },
    ],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'SPLITS',
    outputs: [
      { name: '', internalType: 'contract IJBSplits', type: 'address' },
    ],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'STORE',
    outputs: [
      { name: '', internalType: 'contract IJBTerminalStore', type: 'address' },
    ],
  },
  {
    stateMutability: 'view',
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
  },
  {
    stateMutability: 'view',
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
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'tokens', internalType: 'address[]', type: 'address[]' },
    ],
    name: 'addAccountingContextsFor',
    outputs: [],
  },
  {
    stateMutability: 'payable',
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
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'decimals', internalType: 'uint256', type: 'uint256' },
      { name: 'currency', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'currentSurplusOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
  },
  {
    stateMutability: 'nonpayable',
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
  },
  {
    stateMutability: 'nonpayable',
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
  },
  {
    stateMutability: 'view',
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
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [{ name: 'forwarder', internalType: 'address', type: 'address' }],
    name: 'isTrustedForwarder',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'contract IJBTerminal', type: 'address' },
    ],
    name: 'migrateBalanceOf',
    outputs: [{ name: 'balance', internalType: 'uint256', type: 'uint256' }],
  },
  {
    stateMutability: 'payable',
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
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
    ],
    name: 'processHeldFeesOf',
    outputs: [],
  },
  {
    stateMutability: 'nonpayable',
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
  },
  {
    stateMutability: 'nonpayable',
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
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'trustedForwarder',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
  },
  {
    stateMutability: 'nonpayable',
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
  },
] as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export const jbMultiTerminalAddress = {
  11155111: '0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4',
  11155420: '0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export const jbMultiTerminalConfig = {
  address: jbMultiTerminalAddress,
  abi: jbMultiTerminalABI,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBPermissions
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa1Ba58fcA530D0b011646167C9EB81F54d9C9dF6)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xa1Ba58fcA530D0b011646167C9EB81F54d9C9dF6)
 */
export const jbPermissionsABI = [
  { stateMutability: 'nonpayable', type: 'constructor', inputs: [] },
  { type: 'error', inputs: [], name: 'PERMISSION_ID_OUT_OF_BOUNDS' },
  { type: 'error', inputs: [], name: 'UNAUTHORIZED' },
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
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'PERMISSIONS',
    outputs: [
      { name: '', internalType: 'contract IJBPermissions', type: 'address' },
    ],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [
      { name: 'operator', internalType: 'address', type: 'address' },
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'permissionId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'hasPermission',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [
      { name: 'operator', internalType: 'address', type: 'address' },
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'permissionIds', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    name: 'hasPermissions',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [
      { name: 'operator', internalType: 'address', type: 'address' },
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'permissionsOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
  },
  {
    stateMutability: 'nonpayable',
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
  },
] as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa1Ba58fcA530D0b011646167C9EB81F54d9C9dF6)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xa1Ba58fcA530D0b011646167C9EB81F54d9C9dF6)
 */
export const jbPermissionsAddress = {
  11155111: '0xa1Ba58fcA530D0b011646167C9EB81F54d9C9dF6',
  11155420: '0xa1Ba58fcA530D0b011646167C9EB81F54d9C9dF6',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa1Ba58fcA530D0b011646167C9EB81F54d9C9dF6)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xa1Ba58fcA530D0b011646167C9EB81F54d9C9dF6)
 */
export const jbPermissionsConfig = {
  address: jbPermissionsAddress,
  abi: jbPermissionsABI,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBProjects
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export const jbProjectsABI = [
  {
    stateMutability: 'nonpayable',
    type: 'constructor',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
  },
  { type: 'error', inputs: [], name: 'CheckpointUnorderedInsertion' },
  { type: 'error', inputs: [], name: 'ECDSAInvalidSignature' },
  {
    type: 'error',
    inputs: [{ name: 'length', internalType: 'uint256', type: 'uint256' }],
    name: 'ECDSAInvalidSignatureLength',
  },
  {
    type: 'error',
    inputs: [{ name: 's', internalType: 'bytes32', type: 'bytes32' }],
    name: 'ECDSAInvalidSignatureS',
  },
  {
    type: 'error',
    inputs: [
      { name: 'timepoint', internalType: 'uint256', type: 'uint256' },
      { name: 'clock', internalType: 'uint48', type: 'uint48' },
    ],
    name: 'ERC5805FutureLookup',
  },
  { type: 'error', inputs: [], name: 'ERC6372InconsistentClock' },
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
    inputs: [
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'currentNonce', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'InvalidAccountNonce',
  },
  { type: 'error', inputs: [], name: 'InvalidShortString' },
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
      { name: 'bits', internalType: 'uint8', type: 'uint8' },
      { name: 'value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'SafeCastOverflowedUintDowncast',
  },
  {
    type: 'error',
    inputs: [{ name: 'str', internalType: 'string', type: 'string' }],
    name: 'StringTooLong',
  },
  {
    type: 'error',
    inputs: [{ name: 'expiry', internalType: 'uint256', type: 'uint256' }],
    name: 'VotesExpiredSignature',
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
        name: 'delegator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'fromDelegate',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'toDelegate',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'DelegateChanged',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'delegate',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'previousVotes',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'newVotes',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'DelegateVotesChanged',
  },
  { type: 'event', anonymous: false, inputs: [], name: 'EIP712DomainChanged' },
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
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'CLOCK_MODE',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'clock',
    outputs: [{ name: '', internalType: 'uint48', type: 'uint48' }],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'count',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'createFor',
    outputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [{ name: 'delegatee', internalType: 'address', type: 'address' }],
    name: 'delegate',
    outputs: [],
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [
      { name: 'delegatee', internalType: 'address', type: 'address' },
      { name: 'nonce', internalType: 'uint256', type: 'uint256' },
      { name: 'expiry', internalType: 'uint256', type: 'uint256' },
      { name: 'v', internalType: 'uint8', type: 'uint8' },
      { name: 'r', internalType: 'bytes32', type: 'bytes32' },
      { name: 's', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'delegateBySig',
    outputs: [],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'delegates',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
  },
  {
    stateMutability: 'view',
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
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'getApproved',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [{ name: 'timepoint', internalType: 'uint256', type: 'uint256' }],
    name: 'getPastTotalSupply',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'timepoint', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'getPastVotes',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'getVotes',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'operator', internalType: 'address', type: 'address' },
    ],
    name: 'isApprovedForAll',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'name',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'nonces',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'data', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [
      { name: 'operator', internalType: 'address', type: 'address' },
      { name: 'approved', internalType: 'bool', type: 'bool' },
    ],
    name: 'setApprovalForAll',
    outputs: [],
  },
  {
    stateMutability: 'nonpayable',
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
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
  },
  {
    stateMutability: 'view',
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
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [],
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
  },
] as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export const jbProjectsAddress = {
  11155111: '0x45452B26fe78D2b83247279F87c847F4F4A8FCEb',
  11155420: '0x45452B26fe78D2b83247279F87c847F4F4A8FCEb',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export const jbProjectsConfig = {
  address: jbProjectsAddress,
  abi: jbProjectsABI,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBRulesets
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 */
export const jbRulesetsABI = [
  {
    stateMutability: 'nonpayable',
    type: 'constructor',
    inputs: [
      {
        name: 'directory',
        internalType: 'contract IJBDirectory',
        type: 'address',
      },
    ],
  },
  { type: 'error', inputs: [], name: 'BLOCK_ALREADY_CONTAINS_RULESET' },
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
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'DIRECTORY',
    outputs: [
      { name: '', internalType: 'contract IJBDirectory', type: 'address' },
    ],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'currentApprovalStatusForLatestRulesetOf',
    outputs: [
      { name: '', internalType: 'enum JBApprovalStatus', type: 'uint8' },
    ],
  },
  {
    stateMutability: 'view',
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
  },
  {
    stateMutability: 'view',
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
  },
  {
    stateMutability: 'view',
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
        name: 'approvalStatus',
        internalType: 'enum JBApprovalStatus',
        type: 'uint8',
      },
    ],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'latestRulesetIdOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
  },
  {
    stateMutability: 'nonpayable',
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
  },
  {
    stateMutability: 'view',
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
  },
  {
    stateMutability: 'view',
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
    ],
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'updateRulesetWeightCache',
    outputs: [],
  },
] as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 */
export const jbRulesetsAddress = {
  11155111: '0xDef756Ef46098Cb2109128D3458e01bcf58411D1',
  11155420: '0xDef756Ef46098Cb2109128D3458e01bcf58411D1',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 */
export const jbRulesetsConfig = {
  address: jbRulesetsAddress,
  abi: jbRulesetsABI,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBSplits
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x59DD264E125b22Fb1a6a72F943982b132253Dfff)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x59DD264E125b22Fb1a6a72F943982b132253Dfff)
 */
export const jbSplitsABI = [
  {
    stateMutability: 'nonpayable',
    type: 'constructor',
    inputs: [
      {
        name: 'directory',
        internalType: 'contract IJBDirectory',
        type: 'address',
      },
    ],
  },
  { type: 'error', inputs: [], name: 'CONTROLLER_UNAUTHORIZED' },
  { type: 'error', inputs: [], name: 'INVALID_LOCKED_UNTIL' },
  { type: 'error', inputs: [], name: 'INVALID_PROJECT_ID' },
  { type: 'error', inputs: [], name: 'INVALID_SPLIT_PERCENT' },
  { type: 'error', inputs: [], name: 'INVALID_TOTAL_PERCENT' },
  { type: 'error', inputs: [], name: 'PREVIOUS_LOCKED_SPLITS_NOT_INCLUDED' },
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
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'DIRECTORY',
    outputs: [
      { name: '', internalType: 'contract IJBDirectory', type: 'address' },
    ],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'FALLBACK_RULESET_ID',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
  },
  {
    stateMutability: 'nonpayable',
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
  },
  {
    stateMutability: 'view',
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
  },
] as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x59DD264E125b22Fb1a6a72F943982b132253Dfff)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x59DD264E125b22Fb1a6a72F943982b132253Dfff)
 */
export const jbSplitsAddress = {
  11155111: '0x59DD264E125b22Fb1a6a72F943982b132253Dfff',
  11155420: '0x59DD264E125b22Fb1a6a72F943982b132253Dfff',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x59DD264E125b22Fb1a6a72F943982b132253Dfff)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x59DD264E125b22Fb1a6a72F943982b132253Dfff)
 */
export const jbSplitsConfig = {
  address: jbSplitsAddress,
  abi: jbSplitsABI,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBTerminalStore
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 */
export const jbTerminalStoreABI = [
  {
    stateMutability: 'nonpayable',
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
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'DIRECTORY',
    outputs: [
      { name: '', internalType: 'contract IJBDirectory', type: 'address' },
    ],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'PRICES',
    outputs: [
      { name: '', internalType: 'contract IJBPrices', type: 'address' },
    ],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'RULESETS',
    outputs: [
      { name: '', internalType: 'contract IJBRulesets', type: 'address' },
    ],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [
      { name: 'terminal', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
    ],
    name: 'balanceOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
  },
  {
    stateMutability: 'view',
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
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'tokenCount', internalType: 'uint256', type: 'uint256' },
      { name: 'totalSupply', internalType: 'uint256', type: 'uint256' },
      { name: 'surplus', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'currentReclaimableSurplusOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
  },
  {
    stateMutability: 'view',
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
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'decimals', internalType: 'uint256', type: 'uint256' },
      { name: 'currency', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'currentTotalSurplusOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'recordAddedBalanceFor',
    outputs: [],
  },
  {
    stateMutability: 'nonpayable',
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
  },
  {
    stateMutability: 'nonpayable',
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
  },
  {
    stateMutability: 'nonpayable',
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
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'address', type: 'address' },
    ],
    name: 'recordTerminalMigration',
    outputs: [{ name: 'balance', internalType: 'uint256', type: 'uint256' }],
  },
  {
    stateMutability: 'nonpayable',
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
  },
  {
    stateMutability: 'view',
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
  },
  {
    stateMutability: 'view',
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
  },
] as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 */
export const jbTerminalStoreAddress = {
  11155111: '0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f',
  11155420: '0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 */
export const jbTerminalStoreConfig = {
  address: jbTerminalStoreAddress,
  abi: jbTerminalStoreABI,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBTokens
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export const jbTokensABI = [
  {
    stateMutability: 'nonpayable',
    type: 'constructor',
    inputs: [
      {
        name: 'directory',
        internalType: 'contract IJBDirectory',
        type: 'address',
      },
    ],
  },
  { type: 'error', inputs: [], name: 'CONTROLLER_UNAUTHORIZED' },
  { type: 'error', inputs: [], name: 'EMPTY_NAME' },
  { type: 'error', inputs: [], name: 'EMPTY_SYMBOL' },
  { type: 'error', inputs: [], name: 'EMPTY_TOKEN' },
  { type: 'error', inputs: [], name: 'INSUFFICIENT_CREDITS' },
  { type: 'error', inputs: [], name: 'INSUFFICIENT_FUNDS' },
  { type: 'error', inputs: [], name: 'OVERFLOW_ALERT' },
  { type: 'error', inputs: [], name: 'PROJECT_ALREADY_HAS_TOKEN' },
  { type: 'error', inputs: [], name: 'RECIPIENT_ZERO_ADDRESS' },
  { type: 'error', inputs: [], name: 'TOKENS_MUST_HAVE_18_DECIMALS' },
  { type: 'error', inputs: [], name: 'TOKEN_ALREADY_SET' },
  { type: 'error', inputs: [], name: 'TOKEN_NOT_FOUND' },
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
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [],
    name: 'DIRECTORY',
    outputs: [
      { name: '', internalType: 'contract IJBDirectory', type: 'address' },
    ],
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [
      { name: 'holder', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'burnFrom',
    outputs: [],
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [
      { name: 'holder', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'beneficiary', internalType: 'address', type: 'address' },
    ],
    name: 'claimTokensFor',
    outputs: [],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [
      { name: 'holder', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'creditBalanceOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
  },
  {
    stateMutability: 'nonpayable',
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
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [
      { name: 'holder', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'mintFor',
    outputs: [],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'contract IJBToken', type: 'address' },
    ],
    name: 'projectIdOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'contract IJBToken', type: 'address' },
    ],
    name: 'setTokenFor',
    outputs: [],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'tokenOf',
    outputs: [{ name: '', internalType: 'contract IJBToken', type: 'address' }],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [
      { name: 'holder', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'totalBalanceOf',
    outputs: [{ name: 'balance', internalType: 'uint256', type: 'uint256' }],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'totalCreditSupplyOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
  },
  {
    stateMutability: 'view',
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'totalSupplyOf',
    outputs: [
      { name: 'totalSupply', internalType: 'uint256', type: 'uint256' },
    ],
  },
  {
    stateMutability: 'nonpayable',
    type: 'function',
    inputs: [
      { name: 'holder', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'recipient', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transferCreditsFrom',
    outputs: [],
  },
] as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export const jbTokensAddress = {
  11155111: '0x266b64c59E45CCCAEEa8d34758c495A0517139f0',
  11155420: '0x266b64c59E45CCCAEEa8d34758c495A0517139f0',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export const jbTokensConfig = {
  address: jbTokensAddress,
  abi: jbTokensABI,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// React
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbAddressRegistryABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x903412238A2A8507D3b202399536E34B404Abb0C)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4fd2e89F2D22b931203f061e65C1180569575299)
 */
export function useJbAddressRegistryRead<
  TFunctionName extends string,
  TSelectData = ReadContractResult<typeof jbAddressRegistryABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbAddressRegistryABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address'
  > & {
    chainId?: keyof typeof jbAddressRegistryAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbAddressRegistryABI,
    address:
      jbAddressRegistryAddress[
        chainId as keyof typeof jbAddressRegistryAddress
      ],
    ...config,
  } as UseContractReadConfig<
    typeof jbAddressRegistryABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbAddressRegistryABI}__ and `functionName` set to `"deployerOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x903412238A2A8507D3b202399536E34B404Abb0C)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4fd2e89F2D22b931203f061e65C1180569575299)
 */
export function useJbAddressRegistryDeployerOf<
  TFunctionName extends 'deployerOf',
  TSelectData = ReadContractResult<typeof jbAddressRegistryABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbAddressRegistryABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbAddressRegistryAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbAddressRegistryABI,
    address:
      jbAddressRegistryAddress[
        chainId as keyof typeof jbAddressRegistryAddress
      ],
    functionName: 'deployerOf',
    ...config,
  } as UseContractReadConfig<
    typeof jbAddressRegistryABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbAddressRegistryABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x903412238A2A8507D3b202399536E34B404Abb0C)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4fd2e89F2D22b931203f061e65C1180569575299)
 */
export function useJbAddressRegistryWrite<
  TFunctionName extends string,
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbAddressRegistryAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbAddressRegistryABI,
          string
        >['request']['abi'],
        TFunctionName,
        TMode
      > & { address?: Address; chainId?: TChainId }
    : UseContractWriteConfig<
        typeof jbAddressRegistryABI,
        TFunctionName,
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbAddressRegistryABI, TFunctionName, TMode>({
    abi: jbAddressRegistryABI,
    address:
      jbAddressRegistryAddress[
        chainId as keyof typeof jbAddressRegistryAddress
      ],
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbAddressRegistryABI}__ and `functionName` set to `"registerAddress"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x903412238A2A8507D3b202399536E34B404Abb0C)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4fd2e89F2D22b931203f061e65C1180569575299)
 */
export function useJbAddressRegistryRegisterAddress<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbAddressRegistryAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbAddressRegistryABI,
          'registerAddress'
        >['request']['abi'],
        'registerAddress',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'registerAddress'
      }
    : UseContractWriteConfig<
        typeof jbAddressRegistryABI,
        'registerAddress',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'registerAddress'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<
    typeof jbAddressRegistryABI,
    'registerAddress',
    TMode
  >({
    abi: jbAddressRegistryABI,
    address:
      jbAddressRegistryAddress[
        chainId as keyof typeof jbAddressRegistryAddress
      ],
    functionName: 'registerAddress',
    ...config,
  } as any)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbAddressRegistryABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x903412238A2A8507D3b202399536E34B404Abb0C)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4fd2e89F2D22b931203f061e65C1180569575299)
 */
export function usePrepareJbAddressRegistryWrite<TFunctionName extends string>(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbAddressRegistryABI, TFunctionName>,
    'abi' | 'address'
  > & {
    chainId?: keyof typeof jbAddressRegistryAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbAddressRegistryABI,
    address:
      jbAddressRegistryAddress[
        chainId as keyof typeof jbAddressRegistryAddress
      ],
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbAddressRegistryABI,
    TFunctionName
  >)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbAddressRegistryABI}__ and `functionName` set to `"registerAddress"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x903412238A2A8507D3b202399536E34B404Abb0C)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4fd2e89F2D22b931203f061e65C1180569575299)
 */
export function usePrepareJbAddressRegistryRegisterAddress(
  config: Omit<
    UsePrepareContractWriteConfig<
      typeof jbAddressRegistryABI,
      'registerAddress'
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbAddressRegistryAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbAddressRegistryABI,
    address:
      jbAddressRegistryAddress[
        chainId as keyof typeof jbAddressRegistryAddress
      ],
    functionName: 'registerAddress',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbAddressRegistryABI,
    'registerAddress'
  >)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbAddressRegistryABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x903412238A2A8507D3b202399536E34B404Abb0C)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4fd2e89F2D22b931203f061e65C1180569575299)
 */
export function useJbAddressRegistryEvent<TEventName extends string>(
  config: Omit<
    UseContractEventConfig<typeof jbAddressRegistryABI, TEventName>,
    'abi' | 'address'
  > & {
    chainId?: keyof typeof jbAddressRegistryAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbAddressRegistryABI,
    address:
      jbAddressRegistryAddress[
        chainId as keyof typeof jbAddressRegistryAddress
      ],
    ...config,
  } as UseContractEventConfig<typeof jbAddressRegistryABI, TEventName>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbAddressRegistryABI}__ and `eventName` set to `"AddressRegistered"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x903412238A2A8507D3b202399536E34B404Abb0C)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4fd2e89F2D22b931203f061e65C1180569575299)
 */
export function useJbAddressRegistryAddressRegisteredEvent(
  config: Omit<
    UseContractEventConfig<typeof jbAddressRegistryABI, 'AddressRegistered'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbAddressRegistryAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbAddressRegistryABI,
    address:
      jbAddressRegistryAddress[
        chainId as keyof typeof jbAddressRegistryAddress
      ],
    eventName: 'AddressRegistered',
    ...config,
  } as UseContractEventConfig<typeof jbAddressRegistryABI, 'AddressRegistered'>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbControllerABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerRead<
  TFunctionName extends string,
  TSelectData = ReadContractResult<typeof jbControllerABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbControllerABI, TFunctionName, TSelectData>,
    'abi' | 'address'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    ...config,
  } as UseContractReadConfig<
    typeof jbControllerABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"DIRECTORY"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerDirectory<
  TFunctionName extends 'DIRECTORY',
  TSelectData = ReadContractResult<typeof jbControllerABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbControllerABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'DIRECTORY',
    ...config,
  } as UseContractReadConfig<
    typeof jbControllerABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"FUND_ACCESS_LIMITS"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerFundAccessLimits<
  TFunctionName extends 'FUND_ACCESS_LIMITS',
  TSelectData = ReadContractResult<typeof jbControllerABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbControllerABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'FUND_ACCESS_LIMITS',
    ...config,
  } as UseContractReadConfig<
    typeof jbControllerABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"PERMISSIONS"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerPermissions<
  TFunctionName extends 'PERMISSIONS',
  TSelectData = ReadContractResult<typeof jbControllerABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbControllerABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'PERMISSIONS',
    ...config,
  } as UseContractReadConfig<
    typeof jbControllerABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"PROJECTS"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerProjects<
  TFunctionName extends 'PROJECTS',
  TSelectData = ReadContractResult<typeof jbControllerABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbControllerABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'PROJECTS',
    ...config,
  } as UseContractReadConfig<
    typeof jbControllerABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"RULESETS"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerRulesets<
  TFunctionName extends 'RULESETS',
  TSelectData = ReadContractResult<typeof jbControllerABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbControllerABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'RULESETS',
    ...config,
  } as UseContractReadConfig<
    typeof jbControllerABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"SPLITS"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerSplits<
  TFunctionName extends 'SPLITS',
  TSelectData = ReadContractResult<typeof jbControllerABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbControllerABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'SPLITS',
    ...config,
  } as UseContractReadConfig<
    typeof jbControllerABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"TOKENS"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerTokens<
  TFunctionName extends 'TOKENS',
  TSelectData = ReadContractResult<typeof jbControllerABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbControllerABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'TOKENS',
    ...config,
  } as UseContractReadConfig<
    typeof jbControllerABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"currentRulesetOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerCurrentRulesetOf<
  TFunctionName extends 'currentRulesetOf',
  TSelectData = ReadContractResult<typeof jbControllerABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbControllerABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'currentRulesetOf',
    ...config,
  } as UseContractReadConfig<
    typeof jbControllerABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"getRulesetOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerGetRulesetOf<
  TFunctionName extends 'getRulesetOf',
  TSelectData = ReadContractResult<typeof jbControllerABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbControllerABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'getRulesetOf',
    ...config,
  } as UseContractReadConfig<
    typeof jbControllerABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"isTrustedForwarder"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerIsTrustedForwarder<
  TFunctionName extends 'isTrustedForwarder',
  TSelectData = ReadContractResult<typeof jbControllerABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbControllerABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'isTrustedForwarder',
    ...config,
  } as UseContractReadConfig<
    typeof jbControllerABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"latestQueuedRulesetOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerLatestQueuedRulesetOf<
  TFunctionName extends 'latestQueuedRulesetOf',
  TSelectData = ReadContractResult<typeof jbControllerABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbControllerABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'latestQueuedRulesetOf',
    ...config,
  } as UseContractReadConfig<
    typeof jbControllerABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"pendingReservedTokenBalanceOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerPendingReservedTokenBalanceOf<
  TFunctionName extends 'pendingReservedTokenBalanceOf',
  TSelectData = ReadContractResult<typeof jbControllerABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbControllerABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'pendingReservedTokenBalanceOf',
    ...config,
  } as UseContractReadConfig<
    typeof jbControllerABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"rulesetsOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerRulesetsOf<
  TFunctionName extends 'rulesetsOf',
  TSelectData = ReadContractResult<typeof jbControllerABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbControllerABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'rulesetsOf',
    ...config,
  } as UseContractReadConfig<
    typeof jbControllerABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"setControllerAllowed"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerSetControllerAllowed<
  TFunctionName extends 'setControllerAllowed',
  TSelectData = ReadContractResult<typeof jbControllerABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbControllerABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'setControllerAllowed',
    ...config,
  } as UseContractReadConfig<
    typeof jbControllerABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"setTerminalsAllowed"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerSetTerminalsAllowed<
  TFunctionName extends 'setTerminalsAllowed',
  TSelectData = ReadContractResult<typeof jbControllerABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbControllerABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'setTerminalsAllowed',
    ...config,
  } as UseContractReadConfig<
    typeof jbControllerABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"supportsInterface"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerSupportsInterface<
  TFunctionName extends 'supportsInterface',
  TSelectData = ReadContractResult<typeof jbControllerABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbControllerABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'supportsInterface',
    ...config,
  } as UseContractReadConfig<
    typeof jbControllerABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"totalTokenSupplyWithReservedTokensOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerTotalTokenSupplyWithReservedTokensOf<
  TFunctionName extends 'totalTokenSupplyWithReservedTokensOf',
  TSelectData = ReadContractResult<typeof jbControllerABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbControllerABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'totalTokenSupplyWithReservedTokensOf',
    ...config,
  } as UseContractReadConfig<
    typeof jbControllerABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"trustedForwarder"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerTrustedForwarder<
  TFunctionName extends 'trustedForwarder',
  TSelectData = ReadContractResult<typeof jbControllerABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbControllerABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'trustedForwarder',
    ...config,
  } as UseContractReadConfig<
    typeof jbControllerABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"upcomingRulesetOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerUpcomingRulesetOf<
  TFunctionName extends 'upcomingRulesetOf',
  TSelectData = ReadContractResult<typeof jbControllerABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbControllerABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'upcomingRulesetOf',
    ...config,
  } as UseContractReadConfig<
    typeof jbControllerABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"uriOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerUriOf<
  TFunctionName extends 'uriOf',
  TSelectData = ReadContractResult<typeof jbControllerABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbControllerABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'uriOf',
    ...config,
  } as UseContractReadConfig<
    typeof jbControllerABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbControllerABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerWrite<
  TFunctionName extends string,
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbControllerAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbControllerABI,
          string
        >['request']['abi'],
        TFunctionName,
        TMode
      > & { address?: Address; chainId?: TChainId }
    : UseContractWriteConfig<typeof jbControllerABI, TFunctionName, TMode> & {
        abi?: never
        address?: never
        chainId?: TChainId
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbControllerABI, TFunctionName, TMode>({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"burnTokensOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerBurnTokensOf<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbControllerAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbControllerABI,
          'burnTokensOf'
        >['request']['abi'],
        'burnTokensOf',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'burnTokensOf'
      }
    : UseContractWriteConfig<typeof jbControllerABI, 'burnTokensOf', TMode> & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'burnTokensOf'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbControllerABI, 'burnTokensOf', TMode>({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'burnTokensOf',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"claimTokensFor"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerClaimTokensFor<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbControllerAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbControllerABI,
          'claimTokensFor'
        >['request']['abi'],
        'claimTokensFor',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'claimTokensFor'
      }
    : UseContractWriteConfig<
        typeof jbControllerABI,
        'claimTokensFor',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'claimTokensFor'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbControllerABI, 'claimTokensFor', TMode>({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'claimTokensFor',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"deployERC20For"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerDeployErc20For<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbControllerAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbControllerABI,
          'deployERC20For'
        >['request']['abi'],
        'deployERC20For',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'deployERC20For'
      }
    : UseContractWriteConfig<
        typeof jbControllerABI,
        'deployERC20For',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'deployERC20For'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbControllerABI, 'deployERC20For', TMode>({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'deployERC20For',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"launchProjectFor"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerLaunchProjectFor<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbControllerAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbControllerABI,
          'launchProjectFor'
        >['request']['abi'],
        'launchProjectFor',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'launchProjectFor'
      }
    : UseContractWriteConfig<
        typeof jbControllerABI,
        'launchProjectFor',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'launchProjectFor'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbControllerABI, 'launchProjectFor', TMode>({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'launchProjectFor',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"launchRulesetsFor"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerLaunchRulesetsFor<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbControllerAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbControllerABI,
          'launchRulesetsFor'
        >['request']['abi'],
        'launchRulesetsFor',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'launchRulesetsFor'
      }
    : UseContractWriteConfig<
        typeof jbControllerABI,
        'launchRulesetsFor',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'launchRulesetsFor'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbControllerABI, 'launchRulesetsFor', TMode>({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'launchRulesetsFor',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"migrateController"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerMigrateController<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbControllerAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbControllerABI,
          'migrateController'
        >['request']['abi'],
        'migrateController',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'migrateController'
      }
    : UseContractWriteConfig<
        typeof jbControllerABI,
        'migrateController',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'migrateController'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbControllerABI, 'migrateController', TMode>({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'migrateController',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"mintTokensOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerMintTokensOf<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbControllerAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbControllerABI,
          'mintTokensOf'
        >['request']['abi'],
        'mintTokensOf',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'mintTokensOf'
      }
    : UseContractWriteConfig<typeof jbControllerABI, 'mintTokensOf', TMode> & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'mintTokensOf'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbControllerABI, 'mintTokensOf', TMode>({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'mintTokensOf',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"payReservedTokenToTerminal"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerPayReservedTokenToTerminal<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbControllerAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbControllerABI,
          'payReservedTokenToTerminal'
        >['request']['abi'],
        'payReservedTokenToTerminal',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'payReservedTokenToTerminal'
      }
    : UseContractWriteConfig<
        typeof jbControllerABI,
        'payReservedTokenToTerminal',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'payReservedTokenToTerminal'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<
    typeof jbControllerABI,
    'payReservedTokenToTerminal',
    TMode
  >({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'payReservedTokenToTerminal',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"queueRulesetsOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerQueueRulesetsOf<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbControllerAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbControllerABI,
          'queueRulesetsOf'
        >['request']['abi'],
        'queueRulesetsOf',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'queueRulesetsOf'
      }
    : UseContractWriteConfig<
        typeof jbControllerABI,
        'queueRulesetsOf',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'queueRulesetsOf'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbControllerABI, 'queueRulesetsOf', TMode>({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'queueRulesetsOf',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"receiveMigrationFrom"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerReceiveMigrationFrom<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbControllerAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbControllerABI,
          'receiveMigrationFrom'
        >['request']['abi'],
        'receiveMigrationFrom',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'receiveMigrationFrom'
      }
    : UseContractWriteConfig<
        typeof jbControllerABI,
        'receiveMigrationFrom',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'receiveMigrationFrom'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<
    typeof jbControllerABI,
    'receiveMigrationFrom',
    TMode
  >({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'receiveMigrationFrom',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"sendReservedTokensToSplitsOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerSendReservedTokensToSplitsOf<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbControllerAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbControllerABI,
          'sendReservedTokensToSplitsOf'
        >['request']['abi'],
        'sendReservedTokensToSplitsOf',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'sendReservedTokensToSplitsOf'
      }
    : UseContractWriteConfig<
        typeof jbControllerABI,
        'sendReservedTokensToSplitsOf',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'sendReservedTokensToSplitsOf'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<
    typeof jbControllerABI,
    'sendReservedTokensToSplitsOf',
    TMode
  >({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'sendReservedTokensToSplitsOf',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"setSplitGroupsOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerSetSplitGroupsOf<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbControllerAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbControllerABI,
          'setSplitGroupsOf'
        >['request']['abi'],
        'setSplitGroupsOf',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'setSplitGroupsOf'
      }
    : UseContractWriteConfig<
        typeof jbControllerABI,
        'setSplitGroupsOf',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'setSplitGroupsOf'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbControllerABI, 'setSplitGroupsOf', TMode>({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'setSplitGroupsOf',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"setTokenFor"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerSetTokenFor<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbControllerAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbControllerABI,
          'setTokenFor'
        >['request']['abi'],
        'setTokenFor',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'setTokenFor'
      }
    : UseContractWriteConfig<typeof jbControllerABI, 'setTokenFor', TMode> & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'setTokenFor'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbControllerABI, 'setTokenFor', TMode>({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'setTokenFor',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"setUriOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerSetUriOf<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbControllerAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbControllerABI,
          'setUriOf'
        >['request']['abi'],
        'setUriOf',
        TMode
      > & { address?: Address; chainId?: TChainId; functionName?: 'setUriOf' }
    : UseContractWriteConfig<typeof jbControllerABI, 'setUriOf', TMode> & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'setUriOf'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbControllerABI, 'setUriOf', TMode>({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'setUriOf',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"transferCreditsFrom"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerTransferCreditsFrom<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbControllerAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbControllerABI,
          'transferCreditsFrom'
        >['request']['abi'],
        'transferCreditsFrom',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'transferCreditsFrom'
      }
    : UseContractWriteConfig<
        typeof jbControllerABI,
        'transferCreditsFrom',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'transferCreditsFrom'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbControllerABI, 'transferCreditsFrom', TMode>(
    {
      abi: jbControllerABI,
      address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
      functionName: 'transferCreditsFrom',
      ...config,
    } as any,
  )
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbControllerABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function usePrepareJbControllerWrite<TFunctionName extends string>(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbControllerABI, TFunctionName>,
    'abi' | 'address'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbControllerABI, TFunctionName>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"burnTokensOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function usePrepareJbControllerBurnTokensOf(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbControllerABI, 'burnTokensOf'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'burnTokensOf',
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbControllerABI, 'burnTokensOf'>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"claimTokensFor"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function usePrepareJbControllerClaimTokensFor(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbControllerABI, 'claimTokensFor'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'claimTokensFor',
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbControllerABI, 'claimTokensFor'>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"deployERC20For"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function usePrepareJbControllerDeployErc20For(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbControllerABI, 'deployERC20For'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'deployERC20For',
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbControllerABI, 'deployERC20For'>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"launchProjectFor"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function usePrepareJbControllerLaunchProjectFor(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbControllerABI, 'launchProjectFor'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'launchProjectFor',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbControllerABI,
    'launchProjectFor'
  >)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"launchRulesetsFor"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function usePrepareJbControllerLaunchRulesetsFor(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbControllerABI, 'launchRulesetsFor'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'launchRulesetsFor',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbControllerABI,
    'launchRulesetsFor'
  >)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"migrateController"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function usePrepareJbControllerMigrateController(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbControllerABI, 'migrateController'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'migrateController',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbControllerABI,
    'migrateController'
  >)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"mintTokensOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function usePrepareJbControllerMintTokensOf(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbControllerABI, 'mintTokensOf'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'mintTokensOf',
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbControllerABI, 'mintTokensOf'>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"payReservedTokenToTerminal"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function usePrepareJbControllerPayReservedTokenToTerminal(
  config: Omit<
    UsePrepareContractWriteConfig<
      typeof jbControllerABI,
      'payReservedTokenToTerminal'
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'payReservedTokenToTerminal',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbControllerABI,
    'payReservedTokenToTerminal'
  >)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"queueRulesetsOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function usePrepareJbControllerQueueRulesetsOf(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbControllerABI, 'queueRulesetsOf'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'queueRulesetsOf',
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbControllerABI, 'queueRulesetsOf'>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"receiveMigrationFrom"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function usePrepareJbControllerReceiveMigrationFrom(
  config: Omit<
    UsePrepareContractWriteConfig<
      typeof jbControllerABI,
      'receiveMigrationFrom'
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'receiveMigrationFrom',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbControllerABI,
    'receiveMigrationFrom'
  >)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"sendReservedTokensToSplitsOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function usePrepareJbControllerSendReservedTokensToSplitsOf(
  config: Omit<
    UsePrepareContractWriteConfig<
      typeof jbControllerABI,
      'sendReservedTokensToSplitsOf'
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'sendReservedTokensToSplitsOf',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbControllerABI,
    'sendReservedTokensToSplitsOf'
  >)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"setSplitGroupsOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function usePrepareJbControllerSetSplitGroupsOf(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbControllerABI, 'setSplitGroupsOf'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'setSplitGroupsOf',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbControllerABI,
    'setSplitGroupsOf'
  >)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"setTokenFor"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function usePrepareJbControllerSetTokenFor(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbControllerABI, 'setTokenFor'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'setTokenFor',
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbControllerABI, 'setTokenFor'>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"setUriOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function usePrepareJbControllerSetUriOf(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbControllerABI, 'setUriOf'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'setUriOf',
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbControllerABI, 'setUriOf'>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbControllerABI}__ and `functionName` set to `"transferCreditsFrom"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function usePrepareJbControllerTransferCreditsFrom(
  config: Omit<
    UsePrepareContractWriteConfig<
      typeof jbControllerABI,
      'transferCreditsFrom'
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    functionName: 'transferCreditsFrom',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbControllerABI,
    'transferCreditsFrom'
  >)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbControllerABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerEvent<TEventName extends string>(
  config: Omit<
    UseContractEventConfig<typeof jbControllerABI, TEventName>,
    'abi' | 'address'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    ...config,
  } as UseContractEventConfig<typeof jbControllerABI, TEventName>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbControllerABI}__ and `eventName` set to `"BurnTokens"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerBurnTokensEvent(
  config: Omit<
    UseContractEventConfig<typeof jbControllerABI, 'BurnTokens'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    eventName: 'BurnTokens',
    ...config,
  } as UseContractEventConfig<typeof jbControllerABI, 'BurnTokens'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbControllerABI}__ and `eventName` set to `"LaunchProject"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerLaunchProjectEvent(
  config: Omit<
    UseContractEventConfig<typeof jbControllerABI, 'LaunchProject'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    eventName: 'LaunchProject',
    ...config,
  } as UseContractEventConfig<typeof jbControllerABI, 'LaunchProject'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbControllerABI}__ and `eventName` set to `"LaunchRulesets"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerLaunchRulesetsEvent(
  config: Omit<
    UseContractEventConfig<typeof jbControllerABI, 'LaunchRulesets'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    eventName: 'LaunchRulesets',
    ...config,
  } as UseContractEventConfig<typeof jbControllerABI, 'LaunchRulesets'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbControllerABI}__ and `eventName` set to `"MigrateController"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerMigrateControllerEvent(
  config: Omit<
    UseContractEventConfig<typeof jbControllerABI, 'MigrateController'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    eventName: 'MigrateController',
    ...config,
  } as UseContractEventConfig<typeof jbControllerABI, 'MigrateController'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbControllerABI}__ and `eventName` set to `"MintTokens"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerMintTokensEvent(
  config: Omit<
    UseContractEventConfig<typeof jbControllerABI, 'MintTokens'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    eventName: 'MintTokens',
    ...config,
  } as UseContractEventConfig<typeof jbControllerABI, 'MintTokens'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbControllerABI}__ and `eventName` set to `"PrepMigration"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerPrepMigrationEvent(
  config: Omit<
    UseContractEventConfig<typeof jbControllerABI, 'PrepMigration'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    eventName: 'PrepMigration',
    ...config,
  } as UseContractEventConfig<typeof jbControllerABI, 'PrepMigration'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbControllerABI}__ and `eventName` set to `"QueueRulesets"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerQueueRulesetsEvent(
  config: Omit<
    UseContractEventConfig<typeof jbControllerABI, 'QueueRulesets'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    eventName: 'QueueRulesets',
    ...config,
  } as UseContractEventConfig<typeof jbControllerABI, 'QueueRulesets'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbControllerABI}__ and `eventName` set to `"ReservedDistributionReverted"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerReservedDistributionRevertedEvent(
  config: Omit<
    UseContractEventConfig<
      typeof jbControllerABI,
      'ReservedDistributionReverted'
    >,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    eventName: 'ReservedDistributionReverted',
    ...config,
  } as UseContractEventConfig<
    typeof jbControllerABI,
    'ReservedDistributionReverted'
  >)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbControllerABI}__ and `eventName` set to `"SendReservedTokensToSplit"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerSendReservedTokensToSplitEvent(
  config: Omit<
    UseContractEventConfig<typeof jbControllerABI, 'SendReservedTokensToSplit'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    eventName: 'SendReservedTokensToSplit',
    ...config,
  } as UseContractEventConfig<
    typeof jbControllerABI,
    'SendReservedTokensToSplit'
  >)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbControllerABI}__ and `eventName` set to `"SendReservedTokensToSplits"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerSendReservedTokensToSplitsEvent(
  config: Omit<
    UseContractEventConfig<
      typeof jbControllerABI,
      'SendReservedTokensToSplits'
    >,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    eventName: 'SendReservedTokensToSplits',
    ...config,
  } as UseContractEventConfig<
    typeof jbControllerABI,
    'SendReservedTokensToSplits'
  >)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbControllerABI}__ and `eventName` set to `"SetMetadata"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x698d26DF9F8d5CF0Fd359D26aDD623602a2bC355)
 */
export function useJbControllerSetMetadataEvent(
  config: Omit<
    UseContractEventConfig<typeof jbControllerABI, 'SetMetadata'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbControllerABI,
    address: jbControllerAddress[chainId as keyof typeof jbControllerAddress],
    eventName: 'SetMetadata',
    ...config,
  } as UseContractEventConfig<typeof jbControllerABI, 'SetMetadata'>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbDirectoryABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export function useJbDirectoryRead<
  TFunctionName extends string,
  TSelectData = ReadContractResult<typeof jbDirectoryABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbDirectoryABI, TFunctionName, TSelectData>,
    'abi' | 'address'
  > & {
    chainId?: keyof typeof jbDirectoryAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbDirectoryABI,
    address: jbDirectoryAddress[chainId as keyof typeof jbDirectoryAddress],
    ...config,
  } as UseContractReadConfig<typeof jbDirectoryABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbDirectoryABI}__ and `functionName` set to `"PERMISSIONS"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export function useJbDirectoryPermissions<
  TFunctionName extends 'PERMISSIONS',
  TSelectData = ReadContractResult<typeof jbDirectoryABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbDirectoryABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbDirectoryAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbDirectoryABI,
    address: jbDirectoryAddress[chainId as keyof typeof jbDirectoryAddress],
    functionName: 'PERMISSIONS',
    ...config,
  } as UseContractReadConfig<typeof jbDirectoryABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbDirectoryABI}__ and `functionName` set to `"PROJECTS"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export function useJbDirectoryProjects<
  TFunctionName extends 'PROJECTS',
  TSelectData = ReadContractResult<typeof jbDirectoryABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbDirectoryABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbDirectoryAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbDirectoryABI,
    address: jbDirectoryAddress[chainId as keyof typeof jbDirectoryAddress],
    functionName: 'PROJECTS',
    ...config,
  } as UseContractReadConfig<typeof jbDirectoryABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbDirectoryABI}__ and `functionName` set to `"controllerOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export function useJbDirectoryControllerOf<
  TFunctionName extends 'controllerOf',
  TSelectData = ReadContractResult<typeof jbDirectoryABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbDirectoryABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbDirectoryAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbDirectoryABI,
    address: jbDirectoryAddress[chainId as keyof typeof jbDirectoryAddress],
    functionName: 'controllerOf',
    ...config,
  } as UseContractReadConfig<typeof jbDirectoryABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbDirectoryABI}__ and `functionName` set to `"isAllowedToSetFirstController"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export function useJbDirectoryIsAllowedToSetFirstController<
  TFunctionName extends 'isAllowedToSetFirstController',
  TSelectData = ReadContractResult<typeof jbDirectoryABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbDirectoryABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbDirectoryAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbDirectoryABI,
    address: jbDirectoryAddress[chainId as keyof typeof jbDirectoryAddress],
    functionName: 'isAllowedToSetFirstController',
    ...config,
  } as UseContractReadConfig<typeof jbDirectoryABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbDirectoryABI}__ and `functionName` set to `"isTerminalOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export function useJbDirectoryIsTerminalOf<
  TFunctionName extends 'isTerminalOf',
  TSelectData = ReadContractResult<typeof jbDirectoryABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbDirectoryABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbDirectoryAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbDirectoryABI,
    address: jbDirectoryAddress[chainId as keyof typeof jbDirectoryAddress],
    functionName: 'isTerminalOf',
    ...config,
  } as UseContractReadConfig<typeof jbDirectoryABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbDirectoryABI}__ and `functionName` set to `"owner"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export function useJbDirectoryOwner<
  TFunctionName extends 'owner',
  TSelectData = ReadContractResult<typeof jbDirectoryABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbDirectoryABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbDirectoryAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbDirectoryABI,
    address: jbDirectoryAddress[chainId as keyof typeof jbDirectoryAddress],
    functionName: 'owner',
    ...config,
  } as UseContractReadConfig<typeof jbDirectoryABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbDirectoryABI}__ and `functionName` set to `"primaryTerminalOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export function useJbDirectoryPrimaryTerminalOf<
  TFunctionName extends 'primaryTerminalOf',
  TSelectData = ReadContractResult<typeof jbDirectoryABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbDirectoryABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbDirectoryAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbDirectoryABI,
    address: jbDirectoryAddress[chainId as keyof typeof jbDirectoryAddress],
    functionName: 'primaryTerminalOf',
    ...config,
  } as UseContractReadConfig<typeof jbDirectoryABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbDirectoryABI}__ and `functionName` set to `"terminalsOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export function useJbDirectoryTerminalsOf<
  TFunctionName extends 'terminalsOf',
  TSelectData = ReadContractResult<typeof jbDirectoryABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbDirectoryABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbDirectoryAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbDirectoryABI,
    address: jbDirectoryAddress[chainId as keyof typeof jbDirectoryAddress],
    functionName: 'terminalsOf',
    ...config,
  } as UseContractReadConfig<typeof jbDirectoryABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbDirectoryABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export function useJbDirectoryWrite<
  TFunctionName extends string,
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbDirectoryAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbDirectoryABI,
          string
        >['request']['abi'],
        TFunctionName,
        TMode
      > & { address?: Address; chainId?: TChainId }
    : UseContractWriteConfig<typeof jbDirectoryABI, TFunctionName, TMode> & {
        abi?: never
        address?: never
        chainId?: TChainId
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbDirectoryABI, TFunctionName, TMode>({
    abi: jbDirectoryABI,
    address: jbDirectoryAddress[chainId as keyof typeof jbDirectoryAddress],
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbDirectoryABI}__ and `functionName` set to `"renounceOwnership"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export function useJbDirectoryRenounceOwnership<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbDirectoryAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbDirectoryABI,
          'renounceOwnership'
        >['request']['abi'],
        'renounceOwnership',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'renounceOwnership'
      }
    : UseContractWriteConfig<
        typeof jbDirectoryABI,
        'renounceOwnership',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'renounceOwnership'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbDirectoryABI, 'renounceOwnership', TMode>({
    abi: jbDirectoryABI,
    address: jbDirectoryAddress[chainId as keyof typeof jbDirectoryAddress],
    functionName: 'renounceOwnership',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbDirectoryABI}__ and `functionName` set to `"setControllerOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export function useJbDirectorySetControllerOf<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbDirectoryAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbDirectoryABI,
          'setControllerOf'
        >['request']['abi'],
        'setControllerOf',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'setControllerOf'
      }
    : UseContractWriteConfig<
        typeof jbDirectoryABI,
        'setControllerOf',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'setControllerOf'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbDirectoryABI, 'setControllerOf', TMode>({
    abi: jbDirectoryABI,
    address: jbDirectoryAddress[chainId as keyof typeof jbDirectoryAddress],
    functionName: 'setControllerOf',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbDirectoryABI}__ and `functionName` set to `"setIsAllowedToSetFirstController"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export function useJbDirectorySetIsAllowedToSetFirstController<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbDirectoryAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbDirectoryABI,
          'setIsAllowedToSetFirstController'
        >['request']['abi'],
        'setIsAllowedToSetFirstController',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'setIsAllowedToSetFirstController'
      }
    : UseContractWriteConfig<
        typeof jbDirectoryABI,
        'setIsAllowedToSetFirstController',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'setIsAllowedToSetFirstController'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<
    typeof jbDirectoryABI,
    'setIsAllowedToSetFirstController',
    TMode
  >({
    abi: jbDirectoryABI,
    address: jbDirectoryAddress[chainId as keyof typeof jbDirectoryAddress],
    functionName: 'setIsAllowedToSetFirstController',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbDirectoryABI}__ and `functionName` set to `"setPrimaryTerminalOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export function useJbDirectorySetPrimaryTerminalOf<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbDirectoryAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbDirectoryABI,
          'setPrimaryTerminalOf'
        >['request']['abi'],
        'setPrimaryTerminalOf',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'setPrimaryTerminalOf'
      }
    : UseContractWriteConfig<
        typeof jbDirectoryABI,
        'setPrimaryTerminalOf',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'setPrimaryTerminalOf'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbDirectoryABI, 'setPrimaryTerminalOf', TMode>(
    {
      abi: jbDirectoryABI,
      address: jbDirectoryAddress[chainId as keyof typeof jbDirectoryAddress],
      functionName: 'setPrimaryTerminalOf',
      ...config,
    } as any,
  )
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbDirectoryABI}__ and `functionName` set to `"setTerminalsOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export function useJbDirectorySetTerminalsOf<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbDirectoryAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbDirectoryABI,
          'setTerminalsOf'
        >['request']['abi'],
        'setTerminalsOf',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'setTerminalsOf'
      }
    : UseContractWriteConfig<typeof jbDirectoryABI, 'setTerminalsOf', TMode> & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'setTerminalsOf'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbDirectoryABI, 'setTerminalsOf', TMode>({
    abi: jbDirectoryABI,
    address: jbDirectoryAddress[chainId as keyof typeof jbDirectoryAddress],
    functionName: 'setTerminalsOf',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbDirectoryABI}__ and `functionName` set to `"transferOwnership"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export function useJbDirectoryTransferOwnership<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbDirectoryAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbDirectoryABI,
          'transferOwnership'
        >['request']['abi'],
        'transferOwnership',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'transferOwnership'
      }
    : UseContractWriteConfig<
        typeof jbDirectoryABI,
        'transferOwnership',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'transferOwnership'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbDirectoryABI, 'transferOwnership', TMode>({
    abi: jbDirectoryABI,
    address: jbDirectoryAddress[chainId as keyof typeof jbDirectoryAddress],
    functionName: 'transferOwnership',
    ...config,
  } as any)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbDirectoryABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export function usePrepareJbDirectoryWrite<TFunctionName extends string>(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbDirectoryABI, TFunctionName>,
    'abi' | 'address'
  > & {
    chainId?: keyof typeof jbDirectoryAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbDirectoryABI,
    address: jbDirectoryAddress[chainId as keyof typeof jbDirectoryAddress],
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbDirectoryABI, TFunctionName>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbDirectoryABI}__ and `functionName` set to `"renounceOwnership"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export function usePrepareJbDirectoryRenounceOwnership(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbDirectoryABI, 'renounceOwnership'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbDirectoryAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbDirectoryABI,
    address: jbDirectoryAddress[chainId as keyof typeof jbDirectoryAddress],
    functionName: 'renounceOwnership',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbDirectoryABI,
    'renounceOwnership'
  >)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbDirectoryABI}__ and `functionName` set to `"setControllerOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export function usePrepareJbDirectorySetControllerOf(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbDirectoryABI, 'setControllerOf'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbDirectoryAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbDirectoryABI,
    address: jbDirectoryAddress[chainId as keyof typeof jbDirectoryAddress],
    functionName: 'setControllerOf',
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbDirectoryABI, 'setControllerOf'>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbDirectoryABI}__ and `functionName` set to `"setIsAllowedToSetFirstController"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export function usePrepareJbDirectorySetIsAllowedToSetFirstController(
  config: Omit<
    UsePrepareContractWriteConfig<
      typeof jbDirectoryABI,
      'setIsAllowedToSetFirstController'
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbDirectoryAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbDirectoryABI,
    address: jbDirectoryAddress[chainId as keyof typeof jbDirectoryAddress],
    functionName: 'setIsAllowedToSetFirstController',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbDirectoryABI,
    'setIsAllowedToSetFirstController'
  >)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbDirectoryABI}__ and `functionName` set to `"setPrimaryTerminalOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export function usePrepareJbDirectorySetPrimaryTerminalOf(
  config: Omit<
    UsePrepareContractWriteConfig<
      typeof jbDirectoryABI,
      'setPrimaryTerminalOf'
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbDirectoryAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbDirectoryABI,
    address: jbDirectoryAddress[chainId as keyof typeof jbDirectoryAddress],
    functionName: 'setPrimaryTerminalOf',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbDirectoryABI,
    'setPrimaryTerminalOf'
  >)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbDirectoryABI}__ and `functionName` set to `"setTerminalsOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export function usePrepareJbDirectorySetTerminalsOf(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbDirectoryABI, 'setTerminalsOf'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbDirectoryAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbDirectoryABI,
    address: jbDirectoryAddress[chainId as keyof typeof jbDirectoryAddress],
    functionName: 'setTerminalsOf',
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbDirectoryABI, 'setTerminalsOf'>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbDirectoryABI}__ and `functionName` set to `"transferOwnership"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export function usePrepareJbDirectoryTransferOwnership(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbDirectoryABI, 'transferOwnership'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbDirectoryAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbDirectoryABI,
    address: jbDirectoryAddress[chainId as keyof typeof jbDirectoryAddress],
    functionName: 'transferOwnership',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbDirectoryABI,
    'transferOwnership'
  >)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbDirectoryABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export function useJbDirectoryEvent<TEventName extends string>(
  config: Omit<
    UseContractEventConfig<typeof jbDirectoryABI, TEventName>,
    'abi' | 'address'
  > & {
    chainId?: keyof typeof jbDirectoryAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbDirectoryABI,
    address: jbDirectoryAddress[chainId as keyof typeof jbDirectoryAddress],
    ...config,
  } as UseContractEventConfig<typeof jbDirectoryABI, TEventName>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbDirectoryABI}__ and `eventName` set to `"AddTerminal"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export function useJbDirectoryAddTerminalEvent(
  config: Omit<
    UseContractEventConfig<typeof jbDirectoryABI, 'AddTerminal'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbDirectoryAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbDirectoryABI,
    address: jbDirectoryAddress[chainId as keyof typeof jbDirectoryAddress],
    eventName: 'AddTerminal',
    ...config,
  } as UseContractEventConfig<typeof jbDirectoryABI, 'AddTerminal'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbDirectoryABI}__ and `eventName` set to `"OwnershipTransferred"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export function useJbDirectoryOwnershipTransferredEvent(
  config: Omit<
    UseContractEventConfig<typeof jbDirectoryABI, 'OwnershipTransferred'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbDirectoryAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbDirectoryABI,
    address: jbDirectoryAddress[chainId as keyof typeof jbDirectoryAddress],
    eventName: 'OwnershipTransferred',
    ...config,
  } as UseContractEventConfig<typeof jbDirectoryABI, 'OwnershipTransferred'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbDirectoryABI}__ and `eventName` set to `"SetController"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export function useJbDirectorySetControllerEvent(
  config: Omit<
    UseContractEventConfig<typeof jbDirectoryABI, 'SetController'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbDirectoryAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbDirectoryABI,
    address: jbDirectoryAddress[chainId as keyof typeof jbDirectoryAddress],
    eventName: 'SetController',
    ...config,
  } as UseContractEventConfig<typeof jbDirectoryABI, 'SetController'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbDirectoryABI}__ and `eventName` set to `"SetIsAllowedToSetFirstController"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export function useJbDirectorySetIsAllowedToSetFirstControllerEvent(
  config: Omit<
    UseContractEventConfig<
      typeof jbDirectoryABI,
      'SetIsAllowedToSetFirstController'
    >,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbDirectoryAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbDirectoryABI,
    address: jbDirectoryAddress[chainId as keyof typeof jbDirectoryAddress],
    eventName: 'SetIsAllowedToSetFirstController',
    ...config,
  } as UseContractEventConfig<
    typeof jbDirectoryABI,
    'SetIsAllowedToSetFirstController'
  >)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbDirectoryABI}__ and `eventName` set to `"SetPrimaryTerminal"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export function useJbDirectorySetPrimaryTerminalEvent(
  config: Omit<
    UseContractEventConfig<typeof jbDirectoryABI, 'SetPrimaryTerminal'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbDirectoryAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbDirectoryABI,
    address: jbDirectoryAddress[chainId as keyof typeof jbDirectoryAddress],
    eventName: 'SetPrimaryTerminal',
    ...config,
  } as UseContractEventConfig<typeof jbDirectoryABI, 'SetPrimaryTerminal'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbDirectoryABI}__ and `eventName` set to `"SetTerminals"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x6A6988E79a621Fc7Ea74D67a31E9cefCcC98e949)
 */
export function useJbDirectorySetTerminalsEvent(
  config: Omit<
    UseContractEventConfig<typeof jbDirectoryABI, 'SetTerminals'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbDirectoryAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbDirectoryABI,
    address: jbDirectoryAddress[chainId as keyof typeof jbDirectoryAddress],
    eventName: 'SetTerminals',
    ...config,
  } as UseContractEventConfig<typeof jbDirectoryABI, 'SetTerminals'>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbFundAccessLimitsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 */
export function useJbFundAccessLimitsRead<
  TFunctionName extends string,
  TSelectData = ReadContractResult<typeof jbFundAccessLimitsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbFundAccessLimitsABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address'
  > & {
    chainId?: keyof typeof jbFundAccessLimitsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbFundAccessLimitsABI,
    address:
      jbFundAccessLimitsAddress[
        chainId as keyof typeof jbFundAccessLimitsAddress
      ],
    ...config,
  } as UseContractReadConfig<
    typeof jbFundAccessLimitsABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbFundAccessLimitsABI}__ and `functionName` set to `"DIRECTORY"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 */
export function useJbFundAccessLimitsDirectory<
  TFunctionName extends 'DIRECTORY',
  TSelectData = ReadContractResult<typeof jbFundAccessLimitsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbFundAccessLimitsABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbFundAccessLimitsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbFundAccessLimitsABI,
    address:
      jbFundAccessLimitsAddress[
        chainId as keyof typeof jbFundAccessLimitsAddress
      ],
    functionName: 'DIRECTORY',
    ...config,
  } as UseContractReadConfig<
    typeof jbFundAccessLimitsABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbFundAccessLimitsABI}__ and `functionName` set to `"payoutLimitOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 */
export function useJbFundAccessLimitsPayoutLimitOf<
  TFunctionName extends 'payoutLimitOf',
  TSelectData = ReadContractResult<typeof jbFundAccessLimitsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbFundAccessLimitsABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbFundAccessLimitsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbFundAccessLimitsABI,
    address:
      jbFundAccessLimitsAddress[
        chainId as keyof typeof jbFundAccessLimitsAddress
      ],
    functionName: 'payoutLimitOf',
    ...config,
  } as UseContractReadConfig<
    typeof jbFundAccessLimitsABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbFundAccessLimitsABI}__ and `functionName` set to `"payoutLimitsOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 */
export function useJbFundAccessLimitsPayoutLimitsOf<
  TFunctionName extends 'payoutLimitsOf',
  TSelectData = ReadContractResult<typeof jbFundAccessLimitsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbFundAccessLimitsABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbFundAccessLimitsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbFundAccessLimitsABI,
    address:
      jbFundAccessLimitsAddress[
        chainId as keyof typeof jbFundAccessLimitsAddress
      ],
    functionName: 'payoutLimitsOf',
    ...config,
  } as UseContractReadConfig<
    typeof jbFundAccessLimitsABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbFundAccessLimitsABI}__ and `functionName` set to `"supportsInterface"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 */
export function useJbFundAccessLimitsSupportsInterface<
  TFunctionName extends 'supportsInterface',
  TSelectData = ReadContractResult<typeof jbFundAccessLimitsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbFundAccessLimitsABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbFundAccessLimitsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbFundAccessLimitsABI,
    address:
      jbFundAccessLimitsAddress[
        chainId as keyof typeof jbFundAccessLimitsAddress
      ],
    functionName: 'supportsInterface',
    ...config,
  } as UseContractReadConfig<
    typeof jbFundAccessLimitsABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbFundAccessLimitsABI}__ and `functionName` set to `"surplusAllowanceOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 */
export function useJbFundAccessLimitsSurplusAllowanceOf<
  TFunctionName extends 'surplusAllowanceOf',
  TSelectData = ReadContractResult<typeof jbFundAccessLimitsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbFundAccessLimitsABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbFundAccessLimitsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbFundAccessLimitsABI,
    address:
      jbFundAccessLimitsAddress[
        chainId as keyof typeof jbFundAccessLimitsAddress
      ],
    functionName: 'surplusAllowanceOf',
    ...config,
  } as UseContractReadConfig<
    typeof jbFundAccessLimitsABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbFundAccessLimitsABI}__ and `functionName` set to `"surplusAllowancesOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 */
export function useJbFundAccessLimitsSurplusAllowancesOf<
  TFunctionName extends 'surplusAllowancesOf',
  TSelectData = ReadContractResult<typeof jbFundAccessLimitsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbFundAccessLimitsABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbFundAccessLimitsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbFundAccessLimitsABI,
    address:
      jbFundAccessLimitsAddress[
        chainId as keyof typeof jbFundAccessLimitsAddress
      ],
    functionName: 'surplusAllowancesOf',
    ...config,
  } as UseContractReadConfig<
    typeof jbFundAccessLimitsABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbFundAccessLimitsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 */
export function useJbFundAccessLimitsWrite<
  TFunctionName extends string,
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbFundAccessLimitsAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbFundAccessLimitsABI,
          string
        >['request']['abi'],
        TFunctionName,
        TMode
      > & { address?: Address; chainId?: TChainId }
    : UseContractWriteConfig<
        typeof jbFundAccessLimitsABI,
        TFunctionName,
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbFundAccessLimitsABI, TFunctionName, TMode>({
    abi: jbFundAccessLimitsABI,
    address:
      jbFundAccessLimitsAddress[
        chainId as keyof typeof jbFundAccessLimitsAddress
      ],
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbFundAccessLimitsABI}__ and `functionName` set to `"setFundAccessLimitsFor"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 */
export function useJbFundAccessLimitsSetFundAccessLimitsFor<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbFundAccessLimitsAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbFundAccessLimitsABI,
          'setFundAccessLimitsFor'
        >['request']['abi'],
        'setFundAccessLimitsFor',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'setFundAccessLimitsFor'
      }
    : UseContractWriteConfig<
        typeof jbFundAccessLimitsABI,
        'setFundAccessLimitsFor',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'setFundAccessLimitsFor'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<
    typeof jbFundAccessLimitsABI,
    'setFundAccessLimitsFor',
    TMode
  >({
    abi: jbFundAccessLimitsABI,
    address:
      jbFundAccessLimitsAddress[
        chainId as keyof typeof jbFundAccessLimitsAddress
      ],
    functionName: 'setFundAccessLimitsFor',
    ...config,
  } as any)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbFundAccessLimitsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 */
export function usePrepareJbFundAccessLimitsWrite<TFunctionName extends string>(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbFundAccessLimitsABI, TFunctionName>,
    'abi' | 'address'
  > & {
    chainId?: keyof typeof jbFundAccessLimitsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbFundAccessLimitsABI,
    address:
      jbFundAccessLimitsAddress[
        chainId as keyof typeof jbFundAccessLimitsAddress
      ],
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbFundAccessLimitsABI,
    TFunctionName
  >)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbFundAccessLimitsABI}__ and `functionName` set to `"setFundAccessLimitsFor"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 */
export function usePrepareJbFundAccessLimitsSetFundAccessLimitsFor(
  config: Omit<
    UsePrepareContractWriteConfig<
      typeof jbFundAccessLimitsABI,
      'setFundAccessLimitsFor'
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbFundAccessLimitsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbFundAccessLimitsABI,
    address:
      jbFundAccessLimitsAddress[
        chainId as keyof typeof jbFundAccessLimitsAddress
      ],
    functionName: 'setFundAccessLimitsFor',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbFundAccessLimitsABI,
    'setFundAccessLimitsFor'
  >)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbFundAccessLimitsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 */
export function useJbFundAccessLimitsEvent<TEventName extends string>(
  config: Omit<
    UseContractEventConfig<typeof jbFundAccessLimitsABI, TEventName>,
    'abi' | 'address'
  > & {
    chainId?: keyof typeof jbFundAccessLimitsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbFundAccessLimitsABI,
    address:
      jbFundAccessLimitsAddress[
        chainId as keyof typeof jbFundAccessLimitsAddress
      ],
    ...config,
  } as UseContractEventConfig<typeof jbFundAccessLimitsABI, TEventName>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbFundAccessLimitsABI}__ and `eventName` set to `"SetFundAccessLimits"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xF8eD3763480CA957316974BAB8FE4258d4fD0A17)
 */
export function useJbFundAccessLimitsSetFundAccessLimitsEvent(
  config: Omit<
    UseContractEventConfig<typeof jbFundAccessLimitsABI, 'SetFundAccessLimits'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbFundAccessLimitsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbFundAccessLimitsABI,
    address:
      jbFundAccessLimitsAddress[
        chainId as keyof typeof jbFundAccessLimitsAddress
      ],
    eventName: 'SetFundAccessLimits',
    ...config,
  } as UseContractEventConfig<
    typeof jbFundAccessLimitsABI,
    'SetFundAccessLimits'
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbMultiTerminalABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalRead<
  TFunctionName extends string,
  TSelectData = ReadContractResult<typeof jbMultiTerminalABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbMultiTerminalABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    ...config,
  } as UseContractReadConfig<
    typeof jbMultiTerminalABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"DIRECTORY"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalDirectory<
  TFunctionName extends 'DIRECTORY',
  TSelectData = ReadContractResult<typeof jbMultiTerminalABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbMultiTerminalABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'DIRECTORY',
    ...config,
  } as UseContractReadConfig<
    typeof jbMultiTerminalABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"FEE"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalFee<
  TFunctionName extends 'FEE',
  TSelectData = ReadContractResult<typeof jbMultiTerminalABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbMultiTerminalABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'FEE',
    ...config,
  } as UseContractReadConfig<
    typeof jbMultiTerminalABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"FEELESS_ADDRESSES"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalFeelessAddresses<
  TFunctionName extends 'FEELESS_ADDRESSES',
  TSelectData = ReadContractResult<typeof jbMultiTerminalABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbMultiTerminalABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'FEELESS_ADDRESSES',
    ...config,
  } as UseContractReadConfig<
    typeof jbMultiTerminalABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"PERMISSIONS"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalPermissions<
  TFunctionName extends 'PERMISSIONS',
  TSelectData = ReadContractResult<typeof jbMultiTerminalABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbMultiTerminalABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'PERMISSIONS',
    ...config,
  } as UseContractReadConfig<
    typeof jbMultiTerminalABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"PERMIT2"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalPermit2<
  TFunctionName extends 'PERMIT2',
  TSelectData = ReadContractResult<typeof jbMultiTerminalABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbMultiTerminalABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'PERMIT2',
    ...config,
  } as UseContractReadConfig<
    typeof jbMultiTerminalABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"PROJECTS"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalProjects<
  TFunctionName extends 'PROJECTS',
  TSelectData = ReadContractResult<typeof jbMultiTerminalABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbMultiTerminalABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'PROJECTS',
    ...config,
  } as UseContractReadConfig<
    typeof jbMultiTerminalABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"SPLITS"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalSplits<
  TFunctionName extends 'SPLITS',
  TSelectData = ReadContractResult<typeof jbMultiTerminalABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbMultiTerminalABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'SPLITS',
    ...config,
  } as UseContractReadConfig<
    typeof jbMultiTerminalABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"STORE"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalStore<
  TFunctionName extends 'STORE',
  TSelectData = ReadContractResult<typeof jbMultiTerminalABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbMultiTerminalABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'STORE',
    ...config,
  } as UseContractReadConfig<
    typeof jbMultiTerminalABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"accountingContextForTokenOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalAccountingContextForTokenOf<
  TFunctionName extends 'accountingContextForTokenOf',
  TSelectData = ReadContractResult<typeof jbMultiTerminalABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbMultiTerminalABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'accountingContextForTokenOf',
    ...config,
  } as UseContractReadConfig<
    typeof jbMultiTerminalABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"accountingContextsOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalAccountingContextsOf<
  TFunctionName extends 'accountingContextsOf',
  TSelectData = ReadContractResult<typeof jbMultiTerminalABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbMultiTerminalABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'accountingContextsOf',
    ...config,
  } as UseContractReadConfig<
    typeof jbMultiTerminalABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"currentSurplusOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalCurrentSurplusOf<
  TFunctionName extends 'currentSurplusOf',
  TSelectData = ReadContractResult<typeof jbMultiTerminalABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbMultiTerminalABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'currentSurplusOf',
    ...config,
  } as UseContractReadConfig<
    typeof jbMultiTerminalABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"heldFeesOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalHeldFeesOf<
  TFunctionName extends 'heldFeesOf',
  TSelectData = ReadContractResult<typeof jbMultiTerminalABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbMultiTerminalABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'heldFeesOf',
    ...config,
  } as UseContractReadConfig<
    typeof jbMultiTerminalABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"isTrustedForwarder"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalIsTrustedForwarder<
  TFunctionName extends 'isTrustedForwarder',
  TSelectData = ReadContractResult<typeof jbMultiTerminalABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbMultiTerminalABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'isTrustedForwarder',
    ...config,
  } as UseContractReadConfig<
    typeof jbMultiTerminalABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"supportsInterface"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalSupportsInterface<
  TFunctionName extends 'supportsInterface',
  TSelectData = ReadContractResult<typeof jbMultiTerminalABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbMultiTerminalABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'supportsInterface',
    ...config,
  } as UseContractReadConfig<
    typeof jbMultiTerminalABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"trustedForwarder"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalTrustedForwarder<
  TFunctionName extends 'trustedForwarder',
  TSelectData = ReadContractResult<typeof jbMultiTerminalABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbMultiTerminalABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'trustedForwarder',
    ...config,
  } as UseContractReadConfig<
    typeof jbMultiTerminalABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbMultiTerminalABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalWrite<
  TFunctionName extends string,
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbMultiTerminalAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbMultiTerminalABI,
          string
        >['request']['abi'],
        TFunctionName,
        TMode
      > & { address?: Address; chainId?: TChainId }
    : UseContractWriteConfig<
        typeof jbMultiTerminalABI,
        TFunctionName,
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbMultiTerminalABI, TFunctionName, TMode>({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"addAccountingContextsFor"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalAddAccountingContextsFor<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbMultiTerminalAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbMultiTerminalABI,
          'addAccountingContextsFor'
        >['request']['abi'],
        'addAccountingContextsFor',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'addAccountingContextsFor'
      }
    : UseContractWriteConfig<
        typeof jbMultiTerminalABI,
        'addAccountingContextsFor',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'addAccountingContextsFor'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<
    typeof jbMultiTerminalABI,
    'addAccountingContextsFor',
    TMode
  >({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'addAccountingContextsFor',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"addToBalanceOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalAddToBalanceOf<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbMultiTerminalAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbMultiTerminalABI,
          'addToBalanceOf'
        >['request']['abi'],
        'addToBalanceOf',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'addToBalanceOf'
      }
    : UseContractWriteConfig<
        typeof jbMultiTerminalABI,
        'addToBalanceOf',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'addToBalanceOf'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbMultiTerminalABI, 'addToBalanceOf', TMode>({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'addToBalanceOf',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"executePayout"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalExecutePayout<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbMultiTerminalAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbMultiTerminalABI,
          'executePayout'
        >['request']['abi'],
        'executePayout',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'executePayout'
      }
    : UseContractWriteConfig<
        typeof jbMultiTerminalABI,
        'executePayout',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'executePayout'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbMultiTerminalABI, 'executePayout', TMode>({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'executePayout',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"executeProcessFee"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalExecuteProcessFee<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbMultiTerminalAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbMultiTerminalABI,
          'executeProcessFee'
        >['request']['abi'],
        'executeProcessFee',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'executeProcessFee'
      }
    : UseContractWriteConfig<
        typeof jbMultiTerminalABI,
        'executeProcessFee',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'executeProcessFee'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<
    typeof jbMultiTerminalABI,
    'executeProcessFee',
    TMode
  >({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'executeProcessFee',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"migrateBalanceOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalMigrateBalanceOf<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbMultiTerminalAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbMultiTerminalABI,
          'migrateBalanceOf'
        >['request']['abi'],
        'migrateBalanceOf',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'migrateBalanceOf'
      }
    : UseContractWriteConfig<
        typeof jbMultiTerminalABI,
        'migrateBalanceOf',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'migrateBalanceOf'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbMultiTerminalABI, 'migrateBalanceOf', TMode>(
    {
      abi: jbMultiTerminalABI,
      address:
        jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
      functionName: 'migrateBalanceOf',
      ...config,
    } as any,
  )
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"pay"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalPay<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbMultiTerminalAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbMultiTerminalABI,
          'pay'
        >['request']['abi'],
        'pay',
        TMode
      > & { address?: Address; chainId?: TChainId; functionName?: 'pay' }
    : UseContractWriteConfig<typeof jbMultiTerminalABI, 'pay', TMode> & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'pay'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbMultiTerminalABI, 'pay', TMode>({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'pay',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"processHeldFeesOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalProcessHeldFeesOf<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbMultiTerminalAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbMultiTerminalABI,
          'processHeldFeesOf'
        >['request']['abi'],
        'processHeldFeesOf',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'processHeldFeesOf'
      }
    : UseContractWriteConfig<
        typeof jbMultiTerminalABI,
        'processHeldFeesOf',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'processHeldFeesOf'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<
    typeof jbMultiTerminalABI,
    'processHeldFeesOf',
    TMode
  >({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'processHeldFeesOf',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"redeemTokensOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalRedeemTokensOf<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbMultiTerminalAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbMultiTerminalABI,
          'redeemTokensOf'
        >['request']['abi'],
        'redeemTokensOf',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'redeemTokensOf'
      }
    : UseContractWriteConfig<
        typeof jbMultiTerminalABI,
        'redeemTokensOf',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'redeemTokensOf'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbMultiTerminalABI, 'redeemTokensOf', TMode>({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'redeemTokensOf',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"sendPayoutsOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalSendPayoutsOf<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbMultiTerminalAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbMultiTerminalABI,
          'sendPayoutsOf'
        >['request']['abi'],
        'sendPayoutsOf',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'sendPayoutsOf'
      }
    : UseContractWriteConfig<
        typeof jbMultiTerminalABI,
        'sendPayoutsOf',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'sendPayoutsOf'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbMultiTerminalABI, 'sendPayoutsOf', TMode>({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'sendPayoutsOf',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"useAllowanceOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalUseAllowanceOf<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbMultiTerminalAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbMultiTerminalABI,
          'useAllowanceOf'
        >['request']['abi'],
        'useAllowanceOf',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'useAllowanceOf'
      }
    : UseContractWriteConfig<
        typeof jbMultiTerminalABI,
        'useAllowanceOf',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'useAllowanceOf'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbMultiTerminalABI, 'useAllowanceOf', TMode>({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'useAllowanceOf',
    ...config,
  } as any)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbMultiTerminalABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function usePrepareJbMultiTerminalWrite<TFunctionName extends string>(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbMultiTerminalABI, TFunctionName>,
    'abi' | 'address'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbMultiTerminalABI, TFunctionName>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"addAccountingContextsFor"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function usePrepareJbMultiTerminalAddAccountingContextsFor(
  config: Omit<
    UsePrepareContractWriteConfig<
      typeof jbMultiTerminalABI,
      'addAccountingContextsFor'
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'addAccountingContextsFor',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbMultiTerminalABI,
    'addAccountingContextsFor'
  >)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"addToBalanceOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function usePrepareJbMultiTerminalAddToBalanceOf(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbMultiTerminalABI, 'addToBalanceOf'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'addToBalanceOf',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbMultiTerminalABI,
    'addToBalanceOf'
  >)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"executePayout"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function usePrepareJbMultiTerminalExecutePayout(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbMultiTerminalABI, 'executePayout'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'executePayout',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbMultiTerminalABI,
    'executePayout'
  >)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"executeProcessFee"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function usePrepareJbMultiTerminalExecuteProcessFee(
  config: Omit<
    UsePrepareContractWriteConfig<
      typeof jbMultiTerminalABI,
      'executeProcessFee'
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'executeProcessFee',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbMultiTerminalABI,
    'executeProcessFee'
  >)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"migrateBalanceOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function usePrepareJbMultiTerminalMigrateBalanceOf(
  config: Omit<
    UsePrepareContractWriteConfig<
      typeof jbMultiTerminalABI,
      'migrateBalanceOf'
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'migrateBalanceOf',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbMultiTerminalABI,
    'migrateBalanceOf'
  >)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"pay"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function usePrepareJbMultiTerminalPay(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbMultiTerminalABI, 'pay'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'pay',
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbMultiTerminalABI, 'pay'>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"processHeldFeesOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function usePrepareJbMultiTerminalProcessHeldFeesOf(
  config: Omit<
    UsePrepareContractWriteConfig<
      typeof jbMultiTerminalABI,
      'processHeldFeesOf'
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'processHeldFeesOf',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbMultiTerminalABI,
    'processHeldFeesOf'
  >)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"redeemTokensOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function usePrepareJbMultiTerminalRedeemTokensOf(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbMultiTerminalABI, 'redeemTokensOf'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'redeemTokensOf',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbMultiTerminalABI,
    'redeemTokensOf'
  >)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"sendPayoutsOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function usePrepareJbMultiTerminalSendPayoutsOf(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbMultiTerminalABI, 'sendPayoutsOf'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'sendPayoutsOf',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbMultiTerminalABI,
    'sendPayoutsOf'
  >)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `functionName` set to `"useAllowanceOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function usePrepareJbMultiTerminalUseAllowanceOf(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbMultiTerminalABI, 'useAllowanceOf'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    functionName: 'useAllowanceOf',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbMultiTerminalABI,
    'useAllowanceOf'
  >)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbMultiTerminalABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalEvent<TEventName extends string>(
  config: Omit<
    UseContractEventConfig<typeof jbMultiTerminalABI, TEventName>,
    'abi' | 'address'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    ...config,
  } as UseContractEventConfig<typeof jbMultiTerminalABI, TEventName>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `eventName` set to `"AddToBalance"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalAddToBalanceEvent(
  config: Omit<
    UseContractEventConfig<typeof jbMultiTerminalABI, 'AddToBalance'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    eventName: 'AddToBalance',
    ...config,
  } as UseContractEventConfig<typeof jbMultiTerminalABI, 'AddToBalance'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `eventName` set to `"FeeReverted"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalFeeRevertedEvent(
  config: Omit<
    UseContractEventConfig<typeof jbMultiTerminalABI, 'FeeReverted'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    eventName: 'FeeReverted',
    ...config,
  } as UseContractEventConfig<typeof jbMultiTerminalABI, 'FeeReverted'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `eventName` set to `"HoldFee"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalHoldFeeEvent(
  config: Omit<
    UseContractEventConfig<typeof jbMultiTerminalABI, 'HoldFee'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    eventName: 'HoldFee',
    ...config,
  } as UseContractEventConfig<typeof jbMultiTerminalABI, 'HoldFee'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `eventName` set to `"HookAfterRecordPay"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalHookAfterRecordPayEvent(
  config: Omit<
    UseContractEventConfig<typeof jbMultiTerminalABI, 'HookAfterRecordPay'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    eventName: 'HookAfterRecordPay',
    ...config,
  } as UseContractEventConfig<typeof jbMultiTerminalABI, 'HookAfterRecordPay'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `eventName` set to `"HookAfterRecordRedeem"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalHookAfterRecordRedeemEvent(
  config: Omit<
    UseContractEventConfig<typeof jbMultiTerminalABI, 'HookAfterRecordRedeem'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    eventName: 'HookAfterRecordRedeem',
    ...config,
  } as UseContractEventConfig<
    typeof jbMultiTerminalABI,
    'HookAfterRecordRedeem'
  >)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `eventName` set to `"MigrateTerminal"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalMigrateTerminalEvent(
  config: Omit<
    UseContractEventConfig<typeof jbMultiTerminalABI, 'MigrateTerminal'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    eventName: 'MigrateTerminal',
    ...config,
  } as UseContractEventConfig<typeof jbMultiTerminalABI, 'MigrateTerminal'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `eventName` set to `"Pay"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalPayEvent(
  config: Omit<
    UseContractEventConfig<typeof jbMultiTerminalABI, 'Pay'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    eventName: 'Pay',
    ...config,
  } as UseContractEventConfig<typeof jbMultiTerminalABI, 'Pay'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `eventName` set to `"PayoutReverted"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalPayoutRevertedEvent(
  config: Omit<
    UseContractEventConfig<typeof jbMultiTerminalABI, 'PayoutReverted'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    eventName: 'PayoutReverted',
    ...config,
  } as UseContractEventConfig<typeof jbMultiTerminalABI, 'PayoutReverted'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `eventName` set to `"ProcessFee"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalProcessFeeEvent(
  config: Omit<
    UseContractEventConfig<typeof jbMultiTerminalABI, 'ProcessFee'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    eventName: 'ProcessFee',
    ...config,
  } as UseContractEventConfig<typeof jbMultiTerminalABI, 'ProcessFee'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `eventName` set to `"RedeemTokens"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalRedeemTokensEvent(
  config: Omit<
    UseContractEventConfig<typeof jbMultiTerminalABI, 'RedeemTokens'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    eventName: 'RedeemTokens',
    ...config,
  } as UseContractEventConfig<typeof jbMultiTerminalABI, 'RedeemTokens'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `eventName` set to `"ReturnHeldFees"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalReturnHeldFeesEvent(
  config: Omit<
    UseContractEventConfig<typeof jbMultiTerminalABI, 'ReturnHeldFees'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    eventName: 'ReturnHeldFees',
    ...config,
  } as UseContractEventConfig<typeof jbMultiTerminalABI, 'ReturnHeldFees'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `eventName` set to `"SendPayoutToSplit"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalSendPayoutToSplitEvent(
  config: Omit<
    UseContractEventConfig<typeof jbMultiTerminalABI, 'SendPayoutToSplit'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    eventName: 'SendPayoutToSplit',
    ...config,
  } as UseContractEventConfig<typeof jbMultiTerminalABI, 'SendPayoutToSplit'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `eventName` set to `"SendPayouts"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalSendPayoutsEvent(
  config: Omit<
    UseContractEventConfig<typeof jbMultiTerminalABI, 'SendPayouts'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    eventName: 'SendPayouts',
    ...config,
  } as UseContractEventConfig<typeof jbMultiTerminalABI, 'SendPayouts'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `eventName` set to `"SetAccountingContext"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalSetAccountingContextEvent(
  config: Omit<
    UseContractEventConfig<typeof jbMultiTerminalABI, 'SetAccountingContext'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    eventName: 'SetAccountingContext',
    ...config,
  } as UseContractEventConfig<
    typeof jbMultiTerminalABI,
    'SetAccountingContext'
  >)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbMultiTerminalABI}__ and `eventName` set to `"UseAllowance"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xd2e70177143C40d1CC657Dc2516B95b7FFF0dEe4)
 */
export function useJbMultiTerminalUseAllowanceEvent(
  config: Omit<
    UseContractEventConfig<typeof jbMultiTerminalABI, 'UseAllowance'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[chainId as keyof typeof jbMultiTerminalAddress],
    eventName: 'UseAllowance',
    ...config,
  } as UseContractEventConfig<typeof jbMultiTerminalABI, 'UseAllowance'>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbPermissionsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa1Ba58fcA530D0b011646167C9EB81F54d9C9dF6)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xa1Ba58fcA530D0b011646167C9EB81F54d9C9dF6)
 */
export function useJbPermissionsRead<
  TFunctionName extends string,
  TSelectData = ReadContractResult<typeof jbPermissionsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbPermissionsABI, TFunctionName, TSelectData>,
    'abi' | 'address'
  > & {
    chainId?: keyof typeof jbPermissionsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbPermissionsABI,
    address: jbPermissionsAddress[chainId as keyof typeof jbPermissionsAddress],
    ...config,
  } as UseContractReadConfig<
    typeof jbPermissionsABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbPermissionsABI}__ and `functionName` set to `"PERMISSIONS"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa1Ba58fcA530D0b011646167C9EB81F54d9C9dF6)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xa1Ba58fcA530D0b011646167C9EB81F54d9C9dF6)
 */
export function useJbPermissionsPermissions<
  TFunctionName extends 'PERMISSIONS',
  TSelectData = ReadContractResult<typeof jbPermissionsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbPermissionsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbPermissionsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbPermissionsABI,
    address: jbPermissionsAddress[chainId as keyof typeof jbPermissionsAddress],
    functionName: 'PERMISSIONS',
    ...config,
  } as UseContractReadConfig<
    typeof jbPermissionsABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbPermissionsABI}__ and `functionName` set to `"hasPermission"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa1Ba58fcA530D0b011646167C9EB81F54d9C9dF6)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xa1Ba58fcA530D0b011646167C9EB81F54d9C9dF6)
 */
export function useJbPermissionsHasPermission<
  TFunctionName extends 'hasPermission',
  TSelectData = ReadContractResult<typeof jbPermissionsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbPermissionsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbPermissionsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbPermissionsABI,
    address: jbPermissionsAddress[chainId as keyof typeof jbPermissionsAddress],
    functionName: 'hasPermission',
    ...config,
  } as UseContractReadConfig<
    typeof jbPermissionsABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbPermissionsABI}__ and `functionName` set to `"hasPermissions"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa1Ba58fcA530D0b011646167C9EB81F54d9C9dF6)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xa1Ba58fcA530D0b011646167C9EB81F54d9C9dF6)
 */
export function useJbPermissionsHasPermissions<
  TFunctionName extends 'hasPermissions',
  TSelectData = ReadContractResult<typeof jbPermissionsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbPermissionsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbPermissionsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbPermissionsABI,
    address: jbPermissionsAddress[chainId as keyof typeof jbPermissionsAddress],
    functionName: 'hasPermissions',
    ...config,
  } as UseContractReadConfig<
    typeof jbPermissionsABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbPermissionsABI}__ and `functionName` set to `"permissionsOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa1Ba58fcA530D0b011646167C9EB81F54d9C9dF6)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xa1Ba58fcA530D0b011646167C9EB81F54d9C9dF6)
 */
export function useJbPermissionsPermissionsOf<
  TFunctionName extends 'permissionsOf',
  TSelectData = ReadContractResult<typeof jbPermissionsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbPermissionsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbPermissionsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbPermissionsABI,
    address: jbPermissionsAddress[chainId as keyof typeof jbPermissionsAddress],
    functionName: 'permissionsOf',
    ...config,
  } as UseContractReadConfig<
    typeof jbPermissionsABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbPermissionsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa1Ba58fcA530D0b011646167C9EB81F54d9C9dF6)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xa1Ba58fcA530D0b011646167C9EB81F54d9C9dF6)
 */
export function useJbPermissionsWrite<
  TFunctionName extends string,
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbPermissionsAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbPermissionsABI,
          string
        >['request']['abi'],
        TFunctionName,
        TMode
      > & { address?: Address; chainId?: TChainId }
    : UseContractWriteConfig<typeof jbPermissionsABI, TFunctionName, TMode> & {
        abi?: never
        address?: never
        chainId?: TChainId
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbPermissionsABI, TFunctionName, TMode>({
    abi: jbPermissionsABI,
    address: jbPermissionsAddress[chainId as keyof typeof jbPermissionsAddress],
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbPermissionsABI}__ and `functionName` set to `"setPermissionsFor"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa1Ba58fcA530D0b011646167C9EB81F54d9C9dF6)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xa1Ba58fcA530D0b011646167C9EB81F54d9C9dF6)
 */
export function useJbPermissionsSetPermissionsFor<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbPermissionsAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbPermissionsABI,
          'setPermissionsFor'
        >['request']['abi'],
        'setPermissionsFor',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'setPermissionsFor'
      }
    : UseContractWriteConfig<
        typeof jbPermissionsABI,
        'setPermissionsFor',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'setPermissionsFor'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbPermissionsABI, 'setPermissionsFor', TMode>({
    abi: jbPermissionsABI,
    address: jbPermissionsAddress[chainId as keyof typeof jbPermissionsAddress],
    functionName: 'setPermissionsFor',
    ...config,
  } as any)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbPermissionsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa1Ba58fcA530D0b011646167C9EB81F54d9C9dF6)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xa1Ba58fcA530D0b011646167C9EB81F54d9C9dF6)
 */
export function usePrepareJbPermissionsWrite<TFunctionName extends string>(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbPermissionsABI, TFunctionName>,
    'abi' | 'address'
  > & {
    chainId?: keyof typeof jbPermissionsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbPermissionsABI,
    address: jbPermissionsAddress[chainId as keyof typeof jbPermissionsAddress],
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbPermissionsABI, TFunctionName>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbPermissionsABI}__ and `functionName` set to `"setPermissionsFor"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa1Ba58fcA530D0b011646167C9EB81F54d9C9dF6)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xa1Ba58fcA530D0b011646167C9EB81F54d9C9dF6)
 */
export function usePrepareJbPermissionsSetPermissionsFor(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbPermissionsABI, 'setPermissionsFor'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbPermissionsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbPermissionsABI,
    address: jbPermissionsAddress[chainId as keyof typeof jbPermissionsAddress],
    functionName: 'setPermissionsFor',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbPermissionsABI,
    'setPermissionsFor'
  >)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbPermissionsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa1Ba58fcA530D0b011646167C9EB81F54d9C9dF6)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xa1Ba58fcA530D0b011646167C9EB81F54d9C9dF6)
 */
export function useJbPermissionsEvent<TEventName extends string>(
  config: Omit<
    UseContractEventConfig<typeof jbPermissionsABI, TEventName>,
    'abi' | 'address'
  > & {
    chainId?: keyof typeof jbPermissionsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbPermissionsABI,
    address: jbPermissionsAddress[chainId as keyof typeof jbPermissionsAddress],
    ...config,
  } as UseContractEventConfig<typeof jbPermissionsABI, TEventName>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbPermissionsABI}__ and `eventName` set to `"OperatorPermissionsSet"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa1Ba58fcA530D0b011646167C9EB81F54d9C9dF6)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xa1Ba58fcA530D0b011646167C9EB81F54d9C9dF6)
 */
export function useJbPermissionsOperatorPermissionsSetEvent(
  config: Omit<
    UseContractEventConfig<typeof jbPermissionsABI, 'OperatorPermissionsSet'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbPermissionsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbPermissionsABI,
    address: jbPermissionsAddress[chainId as keyof typeof jbPermissionsAddress],
    eventName: 'OperatorPermissionsSet',
    ...config,
  } as UseContractEventConfig<
    typeof jbPermissionsABI,
    'OperatorPermissionsSet'
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbProjectsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsRead<
  TFunctionName extends string,
  TSelectData = ReadContractResult<typeof jbProjectsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>,
    'abi' | 'address'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    ...config,
  } as UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"CLOCK_MODE"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsClockMode<
  TFunctionName extends 'CLOCK_MODE',
  TSelectData = ReadContractResult<typeof jbProjectsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'CLOCK_MODE',
    ...config,
  } as UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"balanceOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsBalanceOf<
  TFunctionName extends 'balanceOf',
  TSelectData = ReadContractResult<typeof jbProjectsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'balanceOf',
    ...config,
  } as UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"clock"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsClock<
  TFunctionName extends 'clock',
  TSelectData = ReadContractResult<typeof jbProjectsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'clock',
    ...config,
  } as UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"count"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsCount<
  TFunctionName extends 'count',
  TSelectData = ReadContractResult<typeof jbProjectsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'count',
    ...config,
  } as UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"delegates"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsDelegates<
  TFunctionName extends 'delegates',
  TSelectData = ReadContractResult<typeof jbProjectsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'delegates',
    ...config,
  } as UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"eip712Domain"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsEip712Domain<
  TFunctionName extends 'eip712Domain',
  TSelectData = ReadContractResult<typeof jbProjectsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'eip712Domain',
    ...config,
  } as UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"getApproved"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsGetApproved<
  TFunctionName extends 'getApproved',
  TSelectData = ReadContractResult<typeof jbProjectsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'getApproved',
    ...config,
  } as UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"getPastTotalSupply"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsGetPastTotalSupply<
  TFunctionName extends 'getPastTotalSupply',
  TSelectData = ReadContractResult<typeof jbProjectsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'getPastTotalSupply',
    ...config,
  } as UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"getPastVotes"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsGetPastVotes<
  TFunctionName extends 'getPastVotes',
  TSelectData = ReadContractResult<typeof jbProjectsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'getPastVotes',
    ...config,
  } as UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"getVotes"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsGetVotes<
  TFunctionName extends 'getVotes',
  TSelectData = ReadContractResult<typeof jbProjectsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'getVotes',
    ...config,
  } as UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"isApprovedForAll"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsIsApprovedForAll<
  TFunctionName extends 'isApprovedForAll',
  TSelectData = ReadContractResult<typeof jbProjectsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'isApprovedForAll',
    ...config,
  } as UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"name"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsName<
  TFunctionName extends 'name',
  TSelectData = ReadContractResult<typeof jbProjectsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'name',
    ...config,
  } as UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"nonces"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsNonces<
  TFunctionName extends 'nonces',
  TSelectData = ReadContractResult<typeof jbProjectsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'nonces',
    ...config,
  } as UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"owner"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsOwner<
  TFunctionName extends 'owner',
  TSelectData = ReadContractResult<typeof jbProjectsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'owner',
    ...config,
  } as UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"ownerOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsOwnerOf<
  TFunctionName extends 'ownerOf',
  TSelectData = ReadContractResult<typeof jbProjectsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'ownerOf',
    ...config,
  } as UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"supportsInterface"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsSupportsInterface<
  TFunctionName extends 'supportsInterface',
  TSelectData = ReadContractResult<typeof jbProjectsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'supportsInterface',
    ...config,
  } as UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"symbol"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsSymbol<
  TFunctionName extends 'symbol',
  TSelectData = ReadContractResult<typeof jbProjectsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'symbol',
    ...config,
  } as UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"tokenURI"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsTokenUri<
  TFunctionName extends 'tokenURI',
  TSelectData = ReadContractResult<typeof jbProjectsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'tokenURI',
    ...config,
  } as UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"tokenUriResolver"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsTokenUriResolver<
  TFunctionName extends 'tokenUriResolver',
  TSelectData = ReadContractResult<typeof jbProjectsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'tokenUriResolver',
    ...config,
  } as UseContractReadConfig<typeof jbProjectsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbProjectsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsWrite<
  TFunctionName extends string,
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbProjectsAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbProjectsABI,
          string
        >['request']['abi'],
        TFunctionName,
        TMode
      > & { address?: Address; chainId?: TChainId }
    : UseContractWriteConfig<typeof jbProjectsABI, TFunctionName, TMode> & {
        abi?: never
        address?: never
        chainId?: TChainId
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbProjectsABI, TFunctionName, TMode>({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"approve"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsApprove<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbProjectsAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbProjectsABI,
          'approve'
        >['request']['abi'],
        'approve',
        TMode
      > & { address?: Address; chainId?: TChainId; functionName?: 'approve' }
    : UseContractWriteConfig<typeof jbProjectsABI, 'approve', TMode> & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'approve'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbProjectsABI, 'approve', TMode>({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'approve',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"createFor"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsCreateFor<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbProjectsAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbProjectsABI,
          'createFor'
        >['request']['abi'],
        'createFor',
        TMode
      > & { address?: Address; chainId?: TChainId; functionName?: 'createFor' }
    : UseContractWriteConfig<typeof jbProjectsABI, 'createFor', TMode> & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'createFor'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbProjectsABI, 'createFor', TMode>({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'createFor',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"delegate"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsDelegate<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbProjectsAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbProjectsABI,
          'delegate'
        >['request']['abi'],
        'delegate',
        TMode
      > & { address?: Address; chainId?: TChainId; functionName?: 'delegate' }
    : UseContractWriteConfig<typeof jbProjectsABI, 'delegate', TMode> & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'delegate'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbProjectsABI, 'delegate', TMode>({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'delegate',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"delegateBySig"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsDelegateBySig<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbProjectsAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbProjectsABI,
          'delegateBySig'
        >['request']['abi'],
        'delegateBySig',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'delegateBySig'
      }
    : UseContractWriteConfig<typeof jbProjectsABI, 'delegateBySig', TMode> & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'delegateBySig'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbProjectsABI, 'delegateBySig', TMode>({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'delegateBySig',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"renounceOwnership"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsRenounceOwnership<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbProjectsAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbProjectsABI,
          'renounceOwnership'
        >['request']['abi'],
        'renounceOwnership',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'renounceOwnership'
      }
    : UseContractWriteConfig<
        typeof jbProjectsABI,
        'renounceOwnership',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'renounceOwnership'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbProjectsABI, 'renounceOwnership', TMode>({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'renounceOwnership',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"safeTransferFrom"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsSafeTransferFrom<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbProjectsAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbProjectsABI,
          'safeTransferFrom'
        >['request']['abi'],
        'safeTransferFrom',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'safeTransferFrom'
      }
    : UseContractWriteConfig<
        typeof jbProjectsABI,
        'safeTransferFrom',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'safeTransferFrom'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbProjectsABI, 'safeTransferFrom', TMode>({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'safeTransferFrom',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"setApprovalForAll"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsSetApprovalForAll<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbProjectsAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbProjectsABI,
          'setApprovalForAll'
        >['request']['abi'],
        'setApprovalForAll',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'setApprovalForAll'
      }
    : UseContractWriteConfig<
        typeof jbProjectsABI,
        'setApprovalForAll',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'setApprovalForAll'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbProjectsABI, 'setApprovalForAll', TMode>({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'setApprovalForAll',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"setTokenUriResolver"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsSetTokenUriResolver<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbProjectsAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbProjectsABI,
          'setTokenUriResolver'
        >['request']['abi'],
        'setTokenUriResolver',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'setTokenUriResolver'
      }
    : UseContractWriteConfig<
        typeof jbProjectsABI,
        'setTokenUriResolver',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'setTokenUriResolver'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbProjectsABI, 'setTokenUriResolver', TMode>({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'setTokenUriResolver',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"transferFrom"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsTransferFrom<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbProjectsAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbProjectsABI,
          'transferFrom'
        >['request']['abi'],
        'transferFrom',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'transferFrom'
      }
    : UseContractWriteConfig<typeof jbProjectsABI, 'transferFrom', TMode> & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'transferFrom'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbProjectsABI, 'transferFrom', TMode>({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'transferFrom',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"transferOwnership"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsTransferOwnership<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbProjectsAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbProjectsABI,
          'transferOwnership'
        >['request']['abi'],
        'transferOwnership',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'transferOwnership'
      }
    : UseContractWriteConfig<
        typeof jbProjectsABI,
        'transferOwnership',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'transferOwnership'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbProjectsABI, 'transferOwnership', TMode>({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'transferOwnership',
    ...config,
  } as any)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbProjectsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function usePrepareJbProjectsWrite<TFunctionName extends string>(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbProjectsABI, TFunctionName>,
    'abi' | 'address'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbProjectsABI, TFunctionName>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"approve"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function usePrepareJbProjectsApprove(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbProjectsABI, 'approve'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'approve',
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbProjectsABI, 'approve'>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"createFor"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function usePrepareJbProjectsCreateFor(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbProjectsABI, 'createFor'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'createFor',
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbProjectsABI, 'createFor'>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"delegate"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function usePrepareJbProjectsDelegate(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbProjectsABI, 'delegate'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'delegate',
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbProjectsABI, 'delegate'>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"delegateBySig"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function usePrepareJbProjectsDelegateBySig(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbProjectsABI, 'delegateBySig'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'delegateBySig',
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbProjectsABI, 'delegateBySig'>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"renounceOwnership"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function usePrepareJbProjectsRenounceOwnership(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbProjectsABI, 'renounceOwnership'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'renounceOwnership',
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbProjectsABI, 'renounceOwnership'>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"safeTransferFrom"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function usePrepareJbProjectsSafeTransferFrom(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbProjectsABI, 'safeTransferFrom'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'safeTransferFrom',
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbProjectsABI, 'safeTransferFrom'>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"setApprovalForAll"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function usePrepareJbProjectsSetApprovalForAll(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbProjectsABI, 'setApprovalForAll'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'setApprovalForAll',
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbProjectsABI, 'setApprovalForAll'>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"setTokenUriResolver"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function usePrepareJbProjectsSetTokenUriResolver(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbProjectsABI, 'setTokenUriResolver'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'setTokenUriResolver',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbProjectsABI,
    'setTokenUriResolver'
  >)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"transferFrom"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function usePrepareJbProjectsTransferFrom(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbProjectsABI, 'transferFrom'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'transferFrom',
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbProjectsABI, 'transferFrom'>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbProjectsABI}__ and `functionName` set to `"transferOwnership"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function usePrepareJbProjectsTransferOwnership(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbProjectsABI, 'transferOwnership'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    functionName: 'transferOwnership',
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbProjectsABI, 'transferOwnership'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbProjectsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsEvent<TEventName extends string>(
  config: Omit<
    UseContractEventConfig<typeof jbProjectsABI, TEventName>,
    'abi' | 'address'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    ...config,
  } as UseContractEventConfig<typeof jbProjectsABI, TEventName>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbProjectsABI}__ and `eventName` set to `"Approval"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsApprovalEvent(
  config: Omit<
    UseContractEventConfig<typeof jbProjectsABI, 'Approval'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    eventName: 'Approval',
    ...config,
  } as UseContractEventConfig<typeof jbProjectsABI, 'Approval'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbProjectsABI}__ and `eventName` set to `"ApprovalForAll"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsApprovalForAllEvent(
  config: Omit<
    UseContractEventConfig<typeof jbProjectsABI, 'ApprovalForAll'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    eventName: 'ApprovalForAll',
    ...config,
  } as UseContractEventConfig<typeof jbProjectsABI, 'ApprovalForAll'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbProjectsABI}__ and `eventName` set to `"Create"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsCreateEvent(
  config: Omit<
    UseContractEventConfig<typeof jbProjectsABI, 'Create'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    eventName: 'Create',
    ...config,
  } as UseContractEventConfig<typeof jbProjectsABI, 'Create'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbProjectsABI}__ and `eventName` set to `"DelegateChanged"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsDelegateChangedEvent(
  config: Omit<
    UseContractEventConfig<typeof jbProjectsABI, 'DelegateChanged'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    eventName: 'DelegateChanged',
    ...config,
  } as UseContractEventConfig<typeof jbProjectsABI, 'DelegateChanged'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbProjectsABI}__ and `eventName` set to `"DelegateVotesChanged"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsDelegateVotesChangedEvent(
  config: Omit<
    UseContractEventConfig<typeof jbProjectsABI, 'DelegateVotesChanged'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    eventName: 'DelegateVotesChanged',
    ...config,
  } as UseContractEventConfig<typeof jbProjectsABI, 'DelegateVotesChanged'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbProjectsABI}__ and `eventName` set to `"EIP712DomainChanged"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsEip712DomainChangedEvent(
  config: Omit<
    UseContractEventConfig<typeof jbProjectsABI, 'EIP712DomainChanged'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    eventName: 'EIP712DomainChanged',
    ...config,
  } as UseContractEventConfig<typeof jbProjectsABI, 'EIP712DomainChanged'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbProjectsABI}__ and `eventName` set to `"OwnershipTransferred"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsOwnershipTransferredEvent(
  config: Omit<
    UseContractEventConfig<typeof jbProjectsABI, 'OwnershipTransferred'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    eventName: 'OwnershipTransferred',
    ...config,
  } as UseContractEventConfig<typeof jbProjectsABI, 'OwnershipTransferred'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbProjectsABI}__ and `eventName` set to `"SetTokenUriResolver"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsSetTokenUriResolverEvent(
  config: Omit<
    UseContractEventConfig<typeof jbProjectsABI, 'SetTokenUriResolver'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    eventName: 'SetTokenUriResolver',
    ...config,
  } as UseContractEventConfig<typeof jbProjectsABI, 'SetTokenUriResolver'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbProjectsABI}__ and `eventName` set to `"Transfer"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x45452B26fe78D2b83247279F87c847F4F4A8FCEb)
 */
export function useJbProjectsTransferEvent(
  config: Omit<
    UseContractEventConfig<typeof jbProjectsABI, 'Transfer'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbProjectsABI,
    address: jbProjectsAddress[chainId as keyof typeof jbProjectsAddress],
    eventName: 'Transfer',
    ...config,
  } as UseContractEventConfig<typeof jbProjectsABI, 'Transfer'>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbRulesetsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 */
export function useJbRulesetsRead<
  TFunctionName extends string,
  TSelectData = ReadContractResult<typeof jbRulesetsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbRulesetsABI, TFunctionName, TSelectData>,
    'abi' | 'address'
  > & {
    chainId?: keyof typeof jbRulesetsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbRulesetsABI,
    address: jbRulesetsAddress[chainId as keyof typeof jbRulesetsAddress],
    ...config,
  } as UseContractReadConfig<typeof jbRulesetsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbRulesetsABI}__ and `functionName` set to `"DIRECTORY"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 */
export function useJbRulesetsDirectory<
  TFunctionName extends 'DIRECTORY',
  TSelectData = ReadContractResult<typeof jbRulesetsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbRulesetsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbRulesetsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbRulesetsABI,
    address: jbRulesetsAddress[chainId as keyof typeof jbRulesetsAddress],
    functionName: 'DIRECTORY',
    ...config,
  } as UseContractReadConfig<typeof jbRulesetsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbRulesetsABI}__ and `functionName` set to `"currentApprovalStatusForLatestRulesetOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 */
export function useJbRulesetsCurrentApprovalStatusForLatestRulesetOf<
  TFunctionName extends 'currentApprovalStatusForLatestRulesetOf',
  TSelectData = ReadContractResult<typeof jbRulesetsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbRulesetsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbRulesetsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbRulesetsABI,
    address: jbRulesetsAddress[chainId as keyof typeof jbRulesetsAddress],
    functionName: 'currentApprovalStatusForLatestRulesetOf',
    ...config,
  } as UseContractReadConfig<typeof jbRulesetsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbRulesetsABI}__ and `functionName` set to `"currentOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 */
export function useJbRulesetsCurrentOf<
  TFunctionName extends 'currentOf',
  TSelectData = ReadContractResult<typeof jbRulesetsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbRulesetsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbRulesetsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbRulesetsABI,
    address: jbRulesetsAddress[chainId as keyof typeof jbRulesetsAddress],
    functionName: 'currentOf',
    ...config,
  } as UseContractReadConfig<typeof jbRulesetsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbRulesetsABI}__ and `functionName` set to `"getRulesetOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 */
export function useJbRulesetsGetRulesetOf<
  TFunctionName extends 'getRulesetOf',
  TSelectData = ReadContractResult<typeof jbRulesetsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbRulesetsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbRulesetsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbRulesetsABI,
    address: jbRulesetsAddress[chainId as keyof typeof jbRulesetsAddress],
    functionName: 'getRulesetOf',
    ...config,
  } as UseContractReadConfig<typeof jbRulesetsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbRulesetsABI}__ and `functionName` set to `"latestQueuedRulesetOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 */
export function useJbRulesetsLatestQueuedRulesetOf<
  TFunctionName extends 'latestQueuedRulesetOf',
  TSelectData = ReadContractResult<typeof jbRulesetsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbRulesetsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbRulesetsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbRulesetsABI,
    address: jbRulesetsAddress[chainId as keyof typeof jbRulesetsAddress],
    functionName: 'latestQueuedRulesetOf',
    ...config,
  } as UseContractReadConfig<typeof jbRulesetsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbRulesetsABI}__ and `functionName` set to `"latestRulesetIdOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 */
export function useJbRulesetsLatestRulesetIdOf<
  TFunctionName extends 'latestRulesetIdOf',
  TSelectData = ReadContractResult<typeof jbRulesetsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbRulesetsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbRulesetsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbRulesetsABI,
    address: jbRulesetsAddress[chainId as keyof typeof jbRulesetsAddress],
    functionName: 'latestRulesetIdOf',
    ...config,
  } as UseContractReadConfig<typeof jbRulesetsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbRulesetsABI}__ and `functionName` set to `"rulesetsOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 */
export function useJbRulesetsRulesetsOf<
  TFunctionName extends 'rulesetsOf',
  TSelectData = ReadContractResult<typeof jbRulesetsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbRulesetsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbRulesetsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbRulesetsABI,
    address: jbRulesetsAddress[chainId as keyof typeof jbRulesetsAddress],
    functionName: 'rulesetsOf',
    ...config,
  } as UseContractReadConfig<typeof jbRulesetsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbRulesetsABI}__ and `functionName` set to `"upcomingRulesetOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 */
export function useJbRulesetsUpcomingRulesetOf<
  TFunctionName extends 'upcomingRulesetOf',
  TSelectData = ReadContractResult<typeof jbRulesetsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbRulesetsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbRulesetsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbRulesetsABI,
    address: jbRulesetsAddress[chainId as keyof typeof jbRulesetsAddress],
    functionName: 'upcomingRulesetOf',
    ...config,
  } as UseContractReadConfig<typeof jbRulesetsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbRulesetsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 */
export function useJbRulesetsWrite<
  TFunctionName extends string,
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbRulesetsAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbRulesetsABI,
          string
        >['request']['abi'],
        TFunctionName,
        TMode
      > & { address?: Address; chainId?: TChainId }
    : UseContractWriteConfig<typeof jbRulesetsABI, TFunctionName, TMode> & {
        abi?: never
        address?: never
        chainId?: TChainId
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbRulesetsABI, TFunctionName, TMode>({
    abi: jbRulesetsABI,
    address: jbRulesetsAddress[chainId as keyof typeof jbRulesetsAddress],
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbRulesetsABI}__ and `functionName` set to `"queueFor"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 */
export function useJbRulesetsQueueFor<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbRulesetsAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbRulesetsABI,
          'queueFor'
        >['request']['abi'],
        'queueFor',
        TMode
      > & { address?: Address; chainId?: TChainId; functionName?: 'queueFor' }
    : UseContractWriteConfig<typeof jbRulesetsABI, 'queueFor', TMode> & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'queueFor'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbRulesetsABI, 'queueFor', TMode>({
    abi: jbRulesetsABI,
    address: jbRulesetsAddress[chainId as keyof typeof jbRulesetsAddress],
    functionName: 'queueFor',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbRulesetsABI}__ and `functionName` set to `"updateRulesetWeightCache"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 */
export function useJbRulesetsUpdateRulesetWeightCache<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbRulesetsAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbRulesetsABI,
          'updateRulesetWeightCache'
        >['request']['abi'],
        'updateRulesetWeightCache',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'updateRulesetWeightCache'
      }
    : UseContractWriteConfig<
        typeof jbRulesetsABI,
        'updateRulesetWeightCache',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'updateRulesetWeightCache'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<
    typeof jbRulesetsABI,
    'updateRulesetWeightCache',
    TMode
  >({
    abi: jbRulesetsABI,
    address: jbRulesetsAddress[chainId as keyof typeof jbRulesetsAddress],
    functionName: 'updateRulesetWeightCache',
    ...config,
  } as any)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbRulesetsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 */
export function usePrepareJbRulesetsWrite<TFunctionName extends string>(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbRulesetsABI, TFunctionName>,
    'abi' | 'address'
  > & {
    chainId?: keyof typeof jbRulesetsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbRulesetsABI,
    address: jbRulesetsAddress[chainId as keyof typeof jbRulesetsAddress],
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbRulesetsABI, TFunctionName>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbRulesetsABI}__ and `functionName` set to `"queueFor"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 */
export function usePrepareJbRulesetsQueueFor(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbRulesetsABI, 'queueFor'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbRulesetsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbRulesetsABI,
    address: jbRulesetsAddress[chainId as keyof typeof jbRulesetsAddress],
    functionName: 'queueFor',
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbRulesetsABI, 'queueFor'>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbRulesetsABI}__ and `functionName` set to `"updateRulesetWeightCache"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 */
export function usePrepareJbRulesetsUpdateRulesetWeightCache(
  config: Omit<
    UsePrepareContractWriteConfig<
      typeof jbRulesetsABI,
      'updateRulesetWeightCache'
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbRulesetsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbRulesetsABI,
    address: jbRulesetsAddress[chainId as keyof typeof jbRulesetsAddress],
    functionName: 'updateRulesetWeightCache',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbRulesetsABI,
    'updateRulesetWeightCache'
  >)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbRulesetsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 */
export function useJbRulesetsEvent<TEventName extends string>(
  config: Omit<
    UseContractEventConfig<typeof jbRulesetsABI, TEventName>,
    'abi' | 'address'
  > & {
    chainId?: keyof typeof jbRulesetsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbRulesetsABI,
    address: jbRulesetsAddress[chainId as keyof typeof jbRulesetsAddress],
    ...config,
  } as UseContractEventConfig<typeof jbRulesetsABI, TEventName>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbRulesetsABI}__ and `eventName` set to `"RulesetInitialized"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 */
export function useJbRulesetsRulesetInitializedEvent(
  config: Omit<
    UseContractEventConfig<typeof jbRulesetsABI, 'RulesetInitialized'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbRulesetsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbRulesetsABI,
    address: jbRulesetsAddress[chainId as keyof typeof jbRulesetsAddress],
    eventName: 'RulesetInitialized',
    ...config,
  } as UseContractEventConfig<typeof jbRulesetsABI, 'RulesetInitialized'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbRulesetsABI}__ and `eventName` set to `"RulesetQueued"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xDef756Ef46098Cb2109128D3458e01bcf58411D1)
 */
export function useJbRulesetsRulesetQueuedEvent(
  config: Omit<
    UseContractEventConfig<typeof jbRulesetsABI, 'RulesetQueued'>,
    'abi' | 'address' | 'eventName'
  > & {
    chainId?: keyof typeof jbRulesetsAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbRulesetsABI,
    address: jbRulesetsAddress[chainId as keyof typeof jbRulesetsAddress],
    eventName: 'RulesetQueued',
    ...config,
  } as UseContractEventConfig<typeof jbRulesetsABI, 'RulesetQueued'>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbSplitsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x59DD264E125b22Fb1a6a72F943982b132253Dfff)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x59DD264E125b22Fb1a6a72F943982b132253Dfff)
 */
export function useJbSplitsRead<
  TFunctionName extends string,
  TSelectData = ReadContractResult<typeof jbSplitsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbSplitsABI, TFunctionName, TSelectData>,
    'abi' | 'address'
  > & { chainId?: keyof typeof jbSplitsAddress; address?: Address } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbSplitsABI,
    address: jbSplitsAddress[chainId as keyof typeof jbSplitsAddress],
    ...config,
  } as UseContractReadConfig<typeof jbSplitsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbSplitsABI}__ and `functionName` set to `"DIRECTORY"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x59DD264E125b22Fb1a6a72F943982b132253Dfff)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x59DD264E125b22Fb1a6a72F943982b132253Dfff)
 */
export function useJbSplitsDirectory<
  TFunctionName extends 'DIRECTORY',
  TSelectData = ReadContractResult<typeof jbSplitsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbSplitsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & { chainId?: keyof typeof jbSplitsAddress; address?: Address } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbSplitsABI,
    address: jbSplitsAddress[chainId as keyof typeof jbSplitsAddress],
    functionName: 'DIRECTORY',
    ...config,
  } as UseContractReadConfig<typeof jbSplitsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbSplitsABI}__ and `functionName` set to `"FALLBACK_RULESET_ID"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x59DD264E125b22Fb1a6a72F943982b132253Dfff)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x59DD264E125b22Fb1a6a72F943982b132253Dfff)
 */
export function useJbSplitsFallbackRulesetId<
  TFunctionName extends 'FALLBACK_RULESET_ID',
  TSelectData = ReadContractResult<typeof jbSplitsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbSplitsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & { chainId?: keyof typeof jbSplitsAddress; address?: Address } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbSplitsABI,
    address: jbSplitsAddress[chainId as keyof typeof jbSplitsAddress],
    functionName: 'FALLBACK_RULESET_ID',
    ...config,
  } as UseContractReadConfig<typeof jbSplitsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbSplitsABI}__ and `functionName` set to `"splitsOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x59DD264E125b22Fb1a6a72F943982b132253Dfff)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x59DD264E125b22Fb1a6a72F943982b132253Dfff)
 */
export function useJbSplitsSplitsOf<
  TFunctionName extends 'splitsOf',
  TSelectData = ReadContractResult<typeof jbSplitsABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbSplitsABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & { chainId?: keyof typeof jbSplitsAddress; address?: Address } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbSplitsABI,
    address: jbSplitsAddress[chainId as keyof typeof jbSplitsAddress],
    functionName: 'splitsOf',
    ...config,
  } as UseContractReadConfig<typeof jbSplitsABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbSplitsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x59DD264E125b22Fb1a6a72F943982b132253Dfff)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x59DD264E125b22Fb1a6a72F943982b132253Dfff)
 */
export function useJbSplitsWrite<
  TFunctionName extends string,
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbSplitsAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbSplitsABI,
          string
        >['request']['abi'],
        TFunctionName,
        TMode
      > & { address?: Address; chainId?: TChainId }
    : UseContractWriteConfig<typeof jbSplitsABI, TFunctionName, TMode> & {
        abi?: never
        address?: never
        chainId?: TChainId
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbSplitsABI, TFunctionName, TMode>({
    abi: jbSplitsABI,
    address: jbSplitsAddress[chainId as keyof typeof jbSplitsAddress],
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbSplitsABI}__ and `functionName` set to `"setSplitGroupsOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x59DD264E125b22Fb1a6a72F943982b132253Dfff)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x59DD264E125b22Fb1a6a72F943982b132253Dfff)
 */
export function useJbSplitsSetSplitGroupsOf<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbSplitsAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbSplitsABI,
          'setSplitGroupsOf'
        >['request']['abi'],
        'setSplitGroupsOf',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'setSplitGroupsOf'
      }
    : UseContractWriteConfig<typeof jbSplitsABI, 'setSplitGroupsOf', TMode> & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'setSplitGroupsOf'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbSplitsABI, 'setSplitGroupsOf', TMode>({
    abi: jbSplitsABI,
    address: jbSplitsAddress[chainId as keyof typeof jbSplitsAddress],
    functionName: 'setSplitGroupsOf',
    ...config,
  } as any)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbSplitsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x59DD264E125b22Fb1a6a72F943982b132253Dfff)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x59DD264E125b22Fb1a6a72F943982b132253Dfff)
 */
export function usePrepareJbSplitsWrite<TFunctionName extends string>(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbSplitsABI, TFunctionName>,
    'abi' | 'address'
  > & { chainId?: keyof typeof jbSplitsAddress; address?: Address } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbSplitsABI,
    address: jbSplitsAddress[chainId as keyof typeof jbSplitsAddress],
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbSplitsABI, TFunctionName>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbSplitsABI}__ and `functionName` set to `"setSplitGroupsOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x59DD264E125b22Fb1a6a72F943982b132253Dfff)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x59DD264E125b22Fb1a6a72F943982b132253Dfff)
 */
export function usePrepareJbSplitsSetSplitGroupsOf(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbSplitsABI, 'setSplitGroupsOf'>,
    'abi' | 'address' | 'functionName'
  > & { chainId?: keyof typeof jbSplitsAddress; address?: Address } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbSplitsABI,
    address: jbSplitsAddress[chainId as keyof typeof jbSplitsAddress],
    functionName: 'setSplitGroupsOf',
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbSplitsABI, 'setSplitGroupsOf'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbSplitsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x59DD264E125b22Fb1a6a72F943982b132253Dfff)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x59DD264E125b22Fb1a6a72F943982b132253Dfff)
 */
export function useJbSplitsEvent<TEventName extends string>(
  config: Omit<
    UseContractEventConfig<typeof jbSplitsABI, TEventName>,
    'abi' | 'address'
  > & { chainId?: keyof typeof jbSplitsAddress; address?: Address } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbSplitsABI,
    address: jbSplitsAddress[chainId as keyof typeof jbSplitsAddress],
    ...config,
  } as UseContractEventConfig<typeof jbSplitsABI, TEventName>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbSplitsABI}__ and `eventName` set to `"SetSplit"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x59DD264E125b22Fb1a6a72F943982b132253Dfff)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x59DD264E125b22Fb1a6a72F943982b132253Dfff)
 */
export function useJbSplitsSetSplitEvent(
  config: Omit<
    UseContractEventConfig<typeof jbSplitsABI, 'SetSplit'>,
    'abi' | 'address' | 'eventName'
  > & { chainId?: keyof typeof jbSplitsAddress; address?: Address } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbSplitsABI,
    address: jbSplitsAddress[chainId as keyof typeof jbSplitsAddress],
    eventName: 'SetSplit',
    ...config,
  } as UseContractEventConfig<typeof jbSplitsABI, 'SetSplit'>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbTerminalStoreABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 */
export function useJbTerminalStoreRead<
  TFunctionName extends string,
  TSelectData = ReadContractResult<typeof jbTerminalStoreABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbTerminalStoreABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address'
  > & {
    chainId?: keyof typeof jbTerminalStoreAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbTerminalStoreABI,
    address:
      jbTerminalStoreAddress[chainId as keyof typeof jbTerminalStoreAddress],
    ...config,
  } as UseContractReadConfig<
    typeof jbTerminalStoreABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbTerminalStoreABI}__ and `functionName` set to `"DIRECTORY"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 */
export function useJbTerminalStoreDirectory<
  TFunctionName extends 'DIRECTORY',
  TSelectData = ReadContractResult<typeof jbTerminalStoreABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbTerminalStoreABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbTerminalStoreAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbTerminalStoreABI,
    address:
      jbTerminalStoreAddress[chainId as keyof typeof jbTerminalStoreAddress],
    functionName: 'DIRECTORY',
    ...config,
  } as UseContractReadConfig<
    typeof jbTerminalStoreABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbTerminalStoreABI}__ and `functionName` set to `"PRICES"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 */
export function useJbTerminalStorePrices<
  TFunctionName extends 'PRICES',
  TSelectData = ReadContractResult<typeof jbTerminalStoreABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbTerminalStoreABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbTerminalStoreAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbTerminalStoreABI,
    address:
      jbTerminalStoreAddress[chainId as keyof typeof jbTerminalStoreAddress],
    functionName: 'PRICES',
    ...config,
  } as UseContractReadConfig<
    typeof jbTerminalStoreABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbTerminalStoreABI}__ and `functionName` set to `"RULESETS"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 */
export function useJbTerminalStoreRulesets<
  TFunctionName extends 'RULESETS',
  TSelectData = ReadContractResult<typeof jbTerminalStoreABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbTerminalStoreABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbTerminalStoreAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbTerminalStoreABI,
    address:
      jbTerminalStoreAddress[chainId as keyof typeof jbTerminalStoreAddress],
    functionName: 'RULESETS',
    ...config,
  } as UseContractReadConfig<
    typeof jbTerminalStoreABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbTerminalStoreABI}__ and `functionName` set to `"balanceOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 */
export function useJbTerminalStoreBalanceOf<
  TFunctionName extends 'balanceOf',
  TSelectData = ReadContractResult<typeof jbTerminalStoreABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbTerminalStoreABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbTerminalStoreAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbTerminalStoreABI,
    address:
      jbTerminalStoreAddress[chainId as keyof typeof jbTerminalStoreAddress],
    functionName: 'balanceOf',
    ...config,
  } as UseContractReadConfig<
    typeof jbTerminalStoreABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbTerminalStoreABI}__ and `functionName` set to `"currentReclaimableSurplusOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 */
export function useJbTerminalStoreCurrentReclaimableSurplusOf<
  TFunctionName extends 'currentReclaimableSurplusOf',
  TSelectData = ReadContractResult<typeof jbTerminalStoreABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbTerminalStoreABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbTerminalStoreAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbTerminalStoreABI,
    address:
      jbTerminalStoreAddress[chainId as keyof typeof jbTerminalStoreAddress],
    functionName: 'currentReclaimableSurplusOf',
    ...config,
  } as UseContractReadConfig<
    typeof jbTerminalStoreABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbTerminalStoreABI}__ and `functionName` set to `"currentSurplusOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 */
export function useJbTerminalStoreCurrentSurplusOf<
  TFunctionName extends 'currentSurplusOf',
  TSelectData = ReadContractResult<typeof jbTerminalStoreABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbTerminalStoreABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbTerminalStoreAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbTerminalStoreABI,
    address:
      jbTerminalStoreAddress[chainId as keyof typeof jbTerminalStoreAddress],
    functionName: 'currentSurplusOf',
    ...config,
  } as UseContractReadConfig<
    typeof jbTerminalStoreABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbTerminalStoreABI}__ and `functionName` set to `"currentTotalSurplusOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 */
export function useJbTerminalStoreCurrentTotalSurplusOf<
  TFunctionName extends 'currentTotalSurplusOf',
  TSelectData = ReadContractResult<typeof jbTerminalStoreABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbTerminalStoreABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbTerminalStoreAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbTerminalStoreABI,
    address:
      jbTerminalStoreAddress[chainId as keyof typeof jbTerminalStoreAddress],
    functionName: 'currentTotalSurplusOf',
    ...config,
  } as UseContractReadConfig<
    typeof jbTerminalStoreABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbTerminalStoreABI}__ and `functionName` set to `"usedPayoutLimitOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 */
export function useJbTerminalStoreUsedPayoutLimitOf<
  TFunctionName extends 'usedPayoutLimitOf',
  TSelectData = ReadContractResult<typeof jbTerminalStoreABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbTerminalStoreABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbTerminalStoreAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbTerminalStoreABI,
    address:
      jbTerminalStoreAddress[chainId as keyof typeof jbTerminalStoreAddress],
    functionName: 'usedPayoutLimitOf',
    ...config,
  } as UseContractReadConfig<
    typeof jbTerminalStoreABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbTerminalStoreABI}__ and `functionName` set to `"usedSurplusAllowanceOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 */
export function useJbTerminalStoreUsedSurplusAllowanceOf<
  TFunctionName extends 'usedSurplusAllowanceOf',
  TSelectData = ReadContractResult<typeof jbTerminalStoreABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<
      typeof jbTerminalStoreABI,
      TFunctionName,
      TSelectData
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbTerminalStoreAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbTerminalStoreABI,
    address:
      jbTerminalStoreAddress[chainId as keyof typeof jbTerminalStoreAddress],
    functionName: 'usedSurplusAllowanceOf',
    ...config,
  } as UseContractReadConfig<
    typeof jbTerminalStoreABI,
    TFunctionName,
    TSelectData
  >)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbTerminalStoreABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 */
export function useJbTerminalStoreWrite<
  TFunctionName extends string,
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbTerminalStoreAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbTerminalStoreABI,
          string
        >['request']['abi'],
        TFunctionName,
        TMode
      > & { address?: Address; chainId?: TChainId }
    : UseContractWriteConfig<
        typeof jbTerminalStoreABI,
        TFunctionName,
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbTerminalStoreABI, TFunctionName, TMode>({
    abi: jbTerminalStoreABI,
    address:
      jbTerminalStoreAddress[chainId as keyof typeof jbTerminalStoreAddress],
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbTerminalStoreABI}__ and `functionName` set to `"recordAddedBalanceFor"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 */
export function useJbTerminalStoreRecordAddedBalanceFor<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbTerminalStoreAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbTerminalStoreABI,
          'recordAddedBalanceFor'
        >['request']['abi'],
        'recordAddedBalanceFor',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'recordAddedBalanceFor'
      }
    : UseContractWriteConfig<
        typeof jbTerminalStoreABI,
        'recordAddedBalanceFor',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'recordAddedBalanceFor'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<
    typeof jbTerminalStoreABI,
    'recordAddedBalanceFor',
    TMode
  >({
    abi: jbTerminalStoreABI,
    address:
      jbTerminalStoreAddress[chainId as keyof typeof jbTerminalStoreAddress],
    functionName: 'recordAddedBalanceFor',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbTerminalStoreABI}__ and `functionName` set to `"recordPaymentFrom"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 */
export function useJbTerminalStoreRecordPaymentFrom<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbTerminalStoreAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbTerminalStoreABI,
          'recordPaymentFrom'
        >['request']['abi'],
        'recordPaymentFrom',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'recordPaymentFrom'
      }
    : UseContractWriteConfig<
        typeof jbTerminalStoreABI,
        'recordPaymentFrom',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'recordPaymentFrom'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<
    typeof jbTerminalStoreABI,
    'recordPaymentFrom',
    TMode
  >({
    abi: jbTerminalStoreABI,
    address:
      jbTerminalStoreAddress[chainId as keyof typeof jbTerminalStoreAddress],
    functionName: 'recordPaymentFrom',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbTerminalStoreABI}__ and `functionName` set to `"recordPayoutFor"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 */
export function useJbTerminalStoreRecordPayoutFor<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbTerminalStoreAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbTerminalStoreABI,
          'recordPayoutFor'
        >['request']['abi'],
        'recordPayoutFor',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'recordPayoutFor'
      }
    : UseContractWriteConfig<
        typeof jbTerminalStoreABI,
        'recordPayoutFor',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'recordPayoutFor'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbTerminalStoreABI, 'recordPayoutFor', TMode>({
    abi: jbTerminalStoreABI,
    address:
      jbTerminalStoreAddress[chainId as keyof typeof jbTerminalStoreAddress],
    functionName: 'recordPayoutFor',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbTerminalStoreABI}__ and `functionName` set to `"recordRedemptionFor"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 */
export function useJbTerminalStoreRecordRedemptionFor<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbTerminalStoreAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbTerminalStoreABI,
          'recordRedemptionFor'
        >['request']['abi'],
        'recordRedemptionFor',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'recordRedemptionFor'
      }
    : UseContractWriteConfig<
        typeof jbTerminalStoreABI,
        'recordRedemptionFor',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'recordRedemptionFor'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<
    typeof jbTerminalStoreABI,
    'recordRedemptionFor',
    TMode
  >({
    abi: jbTerminalStoreABI,
    address:
      jbTerminalStoreAddress[chainId as keyof typeof jbTerminalStoreAddress],
    functionName: 'recordRedemptionFor',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbTerminalStoreABI}__ and `functionName` set to `"recordTerminalMigration"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 */
export function useJbTerminalStoreRecordTerminalMigration<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbTerminalStoreAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbTerminalStoreABI,
          'recordTerminalMigration'
        >['request']['abi'],
        'recordTerminalMigration',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'recordTerminalMigration'
      }
    : UseContractWriteConfig<
        typeof jbTerminalStoreABI,
        'recordTerminalMigration',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'recordTerminalMigration'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<
    typeof jbTerminalStoreABI,
    'recordTerminalMigration',
    TMode
  >({
    abi: jbTerminalStoreABI,
    address:
      jbTerminalStoreAddress[chainId as keyof typeof jbTerminalStoreAddress],
    functionName: 'recordTerminalMigration',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbTerminalStoreABI}__ and `functionName` set to `"recordUsedAllowanceOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 */
export function useJbTerminalStoreRecordUsedAllowanceOf<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbTerminalStoreAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbTerminalStoreABI,
          'recordUsedAllowanceOf'
        >['request']['abi'],
        'recordUsedAllowanceOf',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'recordUsedAllowanceOf'
      }
    : UseContractWriteConfig<
        typeof jbTerminalStoreABI,
        'recordUsedAllowanceOf',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'recordUsedAllowanceOf'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<
    typeof jbTerminalStoreABI,
    'recordUsedAllowanceOf',
    TMode
  >({
    abi: jbTerminalStoreABI,
    address:
      jbTerminalStoreAddress[chainId as keyof typeof jbTerminalStoreAddress],
    functionName: 'recordUsedAllowanceOf',
    ...config,
  } as any)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbTerminalStoreABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 */
export function usePrepareJbTerminalStoreWrite<TFunctionName extends string>(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbTerminalStoreABI, TFunctionName>,
    'abi' | 'address'
  > & {
    chainId?: keyof typeof jbTerminalStoreAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbTerminalStoreABI,
    address:
      jbTerminalStoreAddress[chainId as keyof typeof jbTerminalStoreAddress],
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbTerminalStoreABI, TFunctionName>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbTerminalStoreABI}__ and `functionName` set to `"recordAddedBalanceFor"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 */
export function usePrepareJbTerminalStoreRecordAddedBalanceFor(
  config: Omit<
    UsePrepareContractWriteConfig<
      typeof jbTerminalStoreABI,
      'recordAddedBalanceFor'
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbTerminalStoreAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbTerminalStoreABI,
    address:
      jbTerminalStoreAddress[chainId as keyof typeof jbTerminalStoreAddress],
    functionName: 'recordAddedBalanceFor',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbTerminalStoreABI,
    'recordAddedBalanceFor'
  >)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbTerminalStoreABI}__ and `functionName` set to `"recordPaymentFrom"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 */
export function usePrepareJbTerminalStoreRecordPaymentFrom(
  config: Omit<
    UsePrepareContractWriteConfig<
      typeof jbTerminalStoreABI,
      'recordPaymentFrom'
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbTerminalStoreAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbTerminalStoreABI,
    address:
      jbTerminalStoreAddress[chainId as keyof typeof jbTerminalStoreAddress],
    functionName: 'recordPaymentFrom',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbTerminalStoreABI,
    'recordPaymentFrom'
  >)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbTerminalStoreABI}__ and `functionName` set to `"recordPayoutFor"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 */
export function usePrepareJbTerminalStoreRecordPayoutFor(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbTerminalStoreABI, 'recordPayoutFor'>,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbTerminalStoreAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbTerminalStoreABI,
    address:
      jbTerminalStoreAddress[chainId as keyof typeof jbTerminalStoreAddress],
    functionName: 'recordPayoutFor',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbTerminalStoreABI,
    'recordPayoutFor'
  >)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbTerminalStoreABI}__ and `functionName` set to `"recordRedemptionFor"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 */
export function usePrepareJbTerminalStoreRecordRedemptionFor(
  config: Omit<
    UsePrepareContractWriteConfig<
      typeof jbTerminalStoreABI,
      'recordRedemptionFor'
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbTerminalStoreAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbTerminalStoreABI,
    address:
      jbTerminalStoreAddress[chainId as keyof typeof jbTerminalStoreAddress],
    functionName: 'recordRedemptionFor',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbTerminalStoreABI,
    'recordRedemptionFor'
  >)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbTerminalStoreABI}__ and `functionName` set to `"recordTerminalMigration"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 */
export function usePrepareJbTerminalStoreRecordTerminalMigration(
  config: Omit<
    UsePrepareContractWriteConfig<
      typeof jbTerminalStoreABI,
      'recordTerminalMigration'
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbTerminalStoreAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbTerminalStoreABI,
    address:
      jbTerminalStoreAddress[chainId as keyof typeof jbTerminalStoreAddress],
    functionName: 'recordTerminalMigration',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbTerminalStoreABI,
    'recordTerminalMigration'
  >)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbTerminalStoreABI}__ and `functionName` set to `"recordUsedAllowanceOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4A13af5BbE0a9F8A7d4280f34d09638D2087eb0f)
 */
export function usePrepareJbTerminalStoreRecordUsedAllowanceOf(
  config: Omit<
    UsePrepareContractWriteConfig<
      typeof jbTerminalStoreABI,
      'recordUsedAllowanceOf'
    >,
    'abi' | 'address' | 'functionName'
  > & {
    chainId?: keyof typeof jbTerminalStoreAddress
    address?: Address
  } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbTerminalStoreABI,
    address:
      jbTerminalStoreAddress[chainId as keyof typeof jbTerminalStoreAddress],
    functionName: 'recordUsedAllowanceOf',
    ...config,
  } as UsePrepareContractWriteConfig<
    typeof jbTerminalStoreABI,
    'recordUsedAllowanceOf'
  >)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbTokensABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export function useJbTokensRead<
  TFunctionName extends string,
  TSelectData = ReadContractResult<typeof jbTokensABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbTokensABI, TFunctionName, TSelectData>,
    'abi' | 'address'
  > & { chainId?: keyof typeof jbTokensAddress; address?: Address } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbTokensABI,
    address: jbTokensAddress[chainId as keyof typeof jbTokensAddress],
    ...config,
  } as UseContractReadConfig<typeof jbTokensABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbTokensABI}__ and `functionName` set to `"DIRECTORY"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export function useJbTokensDirectory<
  TFunctionName extends 'DIRECTORY',
  TSelectData = ReadContractResult<typeof jbTokensABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbTokensABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & { chainId?: keyof typeof jbTokensAddress; address?: Address } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbTokensABI,
    address: jbTokensAddress[chainId as keyof typeof jbTokensAddress],
    functionName: 'DIRECTORY',
    ...config,
  } as UseContractReadConfig<typeof jbTokensABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbTokensABI}__ and `functionName` set to `"creditBalanceOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export function useJbTokensCreditBalanceOf<
  TFunctionName extends 'creditBalanceOf',
  TSelectData = ReadContractResult<typeof jbTokensABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbTokensABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & { chainId?: keyof typeof jbTokensAddress; address?: Address } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbTokensABI,
    address: jbTokensAddress[chainId as keyof typeof jbTokensAddress],
    functionName: 'creditBalanceOf',
    ...config,
  } as UseContractReadConfig<typeof jbTokensABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbTokensABI}__ and `functionName` set to `"projectIdOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export function useJbTokensProjectIdOf<
  TFunctionName extends 'projectIdOf',
  TSelectData = ReadContractResult<typeof jbTokensABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbTokensABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & { chainId?: keyof typeof jbTokensAddress; address?: Address } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbTokensABI,
    address: jbTokensAddress[chainId as keyof typeof jbTokensAddress],
    functionName: 'projectIdOf',
    ...config,
  } as UseContractReadConfig<typeof jbTokensABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbTokensABI}__ and `functionName` set to `"tokenOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export function useJbTokensTokenOf<
  TFunctionName extends 'tokenOf',
  TSelectData = ReadContractResult<typeof jbTokensABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbTokensABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & { chainId?: keyof typeof jbTokensAddress; address?: Address } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbTokensABI,
    address: jbTokensAddress[chainId as keyof typeof jbTokensAddress],
    functionName: 'tokenOf',
    ...config,
  } as UseContractReadConfig<typeof jbTokensABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbTokensABI}__ and `functionName` set to `"totalBalanceOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export function useJbTokensTotalBalanceOf<
  TFunctionName extends 'totalBalanceOf',
  TSelectData = ReadContractResult<typeof jbTokensABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbTokensABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & { chainId?: keyof typeof jbTokensAddress; address?: Address } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbTokensABI,
    address: jbTokensAddress[chainId as keyof typeof jbTokensAddress],
    functionName: 'totalBalanceOf',
    ...config,
  } as UseContractReadConfig<typeof jbTokensABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbTokensABI}__ and `functionName` set to `"totalCreditSupplyOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export function useJbTokensTotalCreditSupplyOf<
  TFunctionName extends 'totalCreditSupplyOf',
  TSelectData = ReadContractResult<typeof jbTokensABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbTokensABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & { chainId?: keyof typeof jbTokensAddress; address?: Address } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbTokensABI,
    address: jbTokensAddress[chainId as keyof typeof jbTokensAddress],
    functionName: 'totalCreditSupplyOf',
    ...config,
  } as UseContractReadConfig<typeof jbTokensABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractRead}__ with `abi` set to __{@link jbTokensABI}__ and `functionName` set to `"totalSupplyOf"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export function useJbTokensTotalSupplyOf<
  TFunctionName extends 'totalSupplyOf',
  TSelectData = ReadContractResult<typeof jbTokensABI, TFunctionName>,
>(
  config: Omit<
    UseContractReadConfig<typeof jbTokensABI, TFunctionName, TSelectData>,
    'abi' | 'address' | 'functionName'
  > & { chainId?: keyof typeof jbTokensAddress; address?: Address } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractRead({
    abi: jbTokensABI,
    address: jbTokensAddress[chainId as keyof typeof jbTokensAddress],
    functionName: 'totalSupplyOf',
    ...config,
  } as UseContractReadConfig<typeof jbTokensABI, TFunctionName, TSelectData>)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbTokensABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export function useJbTokensWrite<
  TFunctionName extends string,
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbTokensAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbTokensABI,
          string
        >['request']['abi'],
        TFunctionName,
        TMode
      > & { address?: Address; chainId?: TChainId }
    : UseContractWriteConfig<typeof jbTokensABI, TFunctionName, TMode> & {
        abi?: never
        address?: never
        chainId?: TChainId
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbTokensABI, TFunctionName, TMode>({
    abi: jbTokensABI,
    address: jbTokensAddress[chainId as keyof typeof jbTokensAddress],
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbTokensABI}__ and `functionName` set to `"burnFrom"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export function useJbTokensBurnFrom<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbTokensAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbTokensABI,
          'burnFrom'
        >['request']['abi'],
        'burnFrom',
        TMode
      > & { address?: Address; chainId?: TChainId; functionName?: 'burnFrom' }
    : UseContractWriteConfig<typeof jbTokensABI, 'burnFrom', TMode> & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'burnFrom'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbTokensABI, 'burnFrom', TMode>({
    abi: jbTokensABI,
    address: jbTokensAddress[chainId as keyof typeof jbTokensAddress],
    functionName: 'burnFrom',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbTokensABI}__ and `functionName` set to `"claimTokensFor"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export function useJbTokensClaimTokensFor<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbTokensAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbTokensABI,
          'claimTokensFor'
        >['request']['abi'],
        'claimTokensFor',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'claimTokensFor'
      }
    : UseContractWriteConfig<typeof jbTokensABI, 'claimTokensFor', TMode> & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'claimTokensFor'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbTokensABI, 'claimTokensFor', TMode>({
    abi: jbTokensABI,
    address: jbTokensAddress[chainId as keyof typeof jbTokensAddress],
    functionName: 'claimTokensFor',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbTokensABI}__ and `functionName` set to `"deployERC20For"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export function useJbTokensDeployErc20For<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbTokensAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbTokensABI,
          'deployERC20For'
        >['request']['abi'],
        'deployERC20For',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'deployERC20For'
      }
    : UseContractWriteConfig<typeof jbTokensABI, 'deployERC20For', TMode> & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'deployERC20For'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbTokensABI, 'deployERC20For', TMode>({
    abi: jbTokensABI,
    address: jbTokensAddress[chainId as keyof typeof jbTokensAddress],
    functionName: 'deployERC20For',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbTokensABI}__ and `functionName` set to `"mintFor"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export function useJbTokensMintFor<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbTokensAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbTokensABI,
          'mintFor'
        >['request']['abi'],
        'mintFor',
        TMode
      > & { address?: Address; chainId?: TChainId; functionName?: 'mintFor' }
    : UseContractWriteConfig<typeof jbTokensABI, 'mintFor', TMode> & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'mintFor'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbTokensABI, 'mintFor', TMode>({
    abi: jbTokensABI,
    address: jbTokensAddress[chainId as keyof typeof jbTokensAddress],
    functionName: 'mintFor',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbTokensABI}__ and `functionName` set to `"setTokenFor"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export function useJbTokensSetTokenFor<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbTokensAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbTokensABI,
          'setTokenFor'
        >['request']['abi'],
        'setTokenFor',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'setTokenFor'
      }
    : UseContractWriteConfig<typeof jbTokensABI, 'setTokenFor', TMode> & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'setTokenFor'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbTokensABI, 'setTokenFor', TMode>({
    abi: jbTokensABI,
    address: jbTokensAddress[chainId as keyof typeof jbTokensAddress],
    functionName: 'setTokenFor',
    ...config,
  } as any)
}

/**
 * Wraps __{@link useContractWrite}__ with `abi` set to __{@link jbTokensABI}__ and `functionName` set to `"transferCreditsFrom"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export function useJbTokensTransferCreditsFrom<
  TMode extends WriteContractMode = undefined,
  TChainId extends number = keyof typeof jbTokensAddress,
>(
  config: TMode extends 'prepared'
    ? UseContractWriteConfig<
        PrepareWriteContractResult<
          typeof jbTokensABI,
          'transferCreditsFrom'
        >['request']['abi'],
        'transferCreditsFrom',
        TMode
      > & {
        address?: Address
        chainId?: TChainId
        functionName?: 'transferCreditsFrom'
      }
    : UseContractWriteConfig<
        typeof jbTokensABI,
        'transferCreditsFrom',
        TMode
      > & {
        abi?: never
        address?: never
        chainId?: TChainId
        functionName?: 'transferCreditsFrom'
      } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractWrite<typeof jbTokensABI, 'transferCreditsFrom', TMode>({
    abi: jbTokensABI,
    address: jbTokensAddress[chainId as keyof typeof jbTokensAddress],
    functionName: 'transferCreditsFrom',
    ...config,
  } as any)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbTokensABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export function usePrepareJbTokensWrite<TFunctionName extends string>(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbTokensABI, TFunctionName>,
    'abi' | 'address'
  > & { chainId?: keyof typeof jbTokensAddress; address?: Address } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbTokensABI,
    address: jbTokensAddress[chainId as keyof typeof jbTokensAddress],
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbTokensABI, TFunctionName>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbTokensABI}__ and `functionName` set to `"burnFrom"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export function usePrepareJbTokensBurnFrom(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbTokensABI, 'burnFrom'>,
    'abi' | 'address' | 'functionName'
  > & { chainId?: keyof typeof jbTokensAddress; address?: Address } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbTokensABI,
    address: jbTokensAddress[chainId as keyof typeof jbTokensAddress],
    functionName: 'burnFrom',
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbTokensABI, 'burnFrom'>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbTokensABI}__ and `functionName` set to `"claimTokensFor"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export function usePrepareJbTokensClaimTokensFor(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbTokensABI, 'claimTokensFor'>,
    'abi' | 'address' | 'functionName'
  > & { chainId?: keyof typeof jbTokensAddress; address?: Address } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbTokensABI,
    address: jbTokensAddress[chainId as keyof typeof jbTokensAddress],
    functionName: 'claimTokensFor',
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbTokensABI, 'claimTokensFor'>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbTokensABI}__ and `functionName` set to `"deployERC20For"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export function usePrepareJbTokensDeployErc20For(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbTokensABI, 'deployERC20For'>,
    'abi' | 'address' | 'functionName'
  > & { chainId?: keyof typeof jbTokensAddress; address?: Address } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbTokensABI,
    address: jbTokensAddress[chainId as keyof typeof jbTokensAddress],
    functionName: 'deployERC20For',
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbTokensABI, 'deployERC20For'>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbTokensABI}__ and `functionName` set to `"mintFor"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export function usePrepareJbTokensMintFor(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbTokensABI, 'mintFor'>,
    'abi' | 'address' | 'functionName'
  > & { chainId?: keyof typeof jbTokensAddress; address?: Address } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbTokensABI,
    address: jbTokensAddress[chainId as keyof typeof jbTokensAddress],
    functionName: 'mintFor',
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbTokensABI, 'mintFor'>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbTokensABI}__ and `functionName` set to `"setTokenFor"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export function usePrepareJbTokensSetTokenFor(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbTokensABI, 'setTokenFor'>,
    'abi' | 'address' | 'functionName'
  > & { chainId?: keyof typeof jbTokensAddress; address?: Address } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbTokensABI,
    address: jbTokensAddress[chainId as keyof typeof jbTokensAddress],
    functionName: 'setTokenFor',
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbTokensABI, 'setTokenFor'>)
}

/**
 * Wraps __{@link usePrepareContractWrite}__ with `abi` set to __{@link jbTokensABI}__ and `functionName` set to `"transferCreditsFrom"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export function usePrepareJbTokensTransferCreditsFrom(
  config: Omit<
    UsePrepareContractWriteConfig<typeof jbTokensABI, 'transferCreditsFrom'>,
    'abi' | 'address' | 'functionName'
  > & { chainId?: keyof typeof jbTokensAddress; address?: Address } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return usePrepareContractWrite({
    abi: jbTokensABI,
    address: jbTokensAddress[chainId as keyof typeof jbTokensAddress],
    functionName: 'transferCreditsFrom',
    ...config,
  } as UsePrepareContractWriteConfig<typeof jbTokensABI, 'transferCreditsFrom'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbTokensABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export function useJbTokensEvent<TEventName extends string>(
  config: Omit<
    UseContractEventConfig<typeof jbTokensABI, TEventName>,
    'abi' | 'address'
  > & { chainId?: keyof typeof jbTokensAddress; address?: Address } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbTokensABI,
    address: jbTokensAddress[chainId as keyof typeof jbTokensAddress],
    ...config,
  } as UseContractEventConfig<typeof jbTokensABI, TEventName>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbTokensABI}__ and `eventName` set to `"Burn"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export function useJbTokensBurnEvent(
  config: Omit<
    UseContractEventConfig<typeof jbTokensABI, 'Burn'>,
    'abi' | 'address' | 'eventName'
  > & { chainId?: keyof typeof jbTokensAddress; address?: Address } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbTokensABI,
    address: jbTokensAddress[chainId as keyof typeof jbTokensAddress],
    eventName: 'Burn',
    ...config,
  } as UseContractEventConfig<typeof jbTokensABI, 'Burn'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbTokensABI}__ and `eventName` set to `"ClaimTokens"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export function useJbTokensClaimTokensEvent(
  config: Omit<
    UseContractEventConfig<typeof jbTokensABI, 'ClaimTokens'>,
    'abi' | 'address' | 'eventName'
  > & { chainId?: keyof typeof jbTokensAddress; address?: Address } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbTokensABI,
    address: jbTokensAddress[chainId as keyof typeof jbTokensAddress],
    eventName: 'ClaimTokens',
    ...config,
  } as UseContractEventConfig<typeof jbTokensABI, 'ClaimTokens'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbTokensABI}__ and `eventName` set to `"DeployERC20"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export function useJbTokensDeployErc20Event(
  config: Omit<
    UseContractEventConfig<typeof jbTokensABI, 'DeployERC20'>,
    'abi' | 'address' | 'eventName'
  > & { chainId?: keyof typeof jbTokensAddress; address?: Address } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbTokensABI,
    address: jbTokensAddress[chainId as keyof typeof jbTokensAddress],
    eventName: 'DeployERC20',
    ...config,
  } as UseContractEventConfig<typeof jbTokensABI, 'DeployERC20'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbTokensABI}__ and `eventName` set to `"Mint"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export function useJbTokensMintEvent(
  config: Omit<
    UseContractEventConfig<typeof jbTokensABI, 'Mint'>,
    'abi' | 'address' | 'eventName'
  > & { chainId?: keyof typeof jbTokensAddress; address?: Address } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbTokensABI,
    address: jbTokensAddress[chainId as keyof typeof jbTokensAddress],
    eventName: 'Mint',
    ...config,
  } as UseContractEventConfig<typeof jbTokensABI, 'Mint'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbTokensABI}__ and `eventName` set to `"SetToken"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export function useJbTokensSetTokenEvent(
  config: Omit<
    UseContractEventConfig<typeof jbTokensABI, 'SetToken'>,
    'abi' | 'address' | 'eventName'
  > & { chainId?: keyof typeof jbTokensAddress; address?: Address } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbTokensABI,
    address: jbTokensAddress[chainId as keyof typeof jbTokensAddress],
    eventName: 'SetToken',
    ...config,
  } as UseContractEventConfig<typeof jbTokensABI, 'SetToken'>)
}

/**
 * Wraps __{@link useContractEvent}__ with `abi` set to __{@link jbTokensABI}__ and `eventName` set to `"TransferCredits"`.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x266b64c59E45CCCAEEa8d34758c495A0517139f0)
 */
export function useJbTokensTransferCreditsEvent(
  config: Omit<
    UseContractEventConfig<typeof jbTokensABI, 'TransferCredits'>,
    'abi' | 'address' | 'eventName'
  > & { chainId?: keyof typeof jbTokensAddress; address?: Address } = {} as any,
) {
  const { chain } = useNetwork()
  const defaultChainId = useChainId()
  const chainId = config.chainId ?? chain?.id ?? defaultChainId
  return useContractEvent({
    abi: jbTokensABI,
    address: jbTokensAddress[chainId as keyof typeof jbTokensAddress],
    eventName: 'TransferCredits',
    ...config,
  } as UseContractEventConfig<typeof jbTokensABI, 'TransferCredits'>)
}
