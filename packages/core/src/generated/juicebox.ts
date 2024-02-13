import {
  getContract,
  GetContractArgs,
  readContract,
  ReadContractConfig,
  writeContract,
  WriteContractMode,
  WriteContractArgs,
  WriteContractPreparedArgs,
  WriteContractUnpreparedArgs,
  prepareWriteContract,
  PrepareWriteContractConfig,
} from 'wagmi/actions'
import { Address } from 'wagmi'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBController
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074C1FCe99D705aFb8E5F1e7e4078D6585F1dce3)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xfB74D49104a97Ded6730a3A3a40D4fFEE55DecC7)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074C1FCe99D705aFb8E5F1e7e4078D6585F1dce3)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xfB74D49104a97Ded6730a3A3a40D4fFEE55DecC7)
 */
export const jbControllerAddress = {
  11155111: '0x074C1FCe99D705aFb8E5F1e7e4078D6585F1dce3',
  11155420: '0xfB74D49104a97Ded6730a3A3a40D4fFEE55DecC7',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074C1FCe99D705aFb8E5F1e7e4078D6585F1dce3)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xfB74D49104a97Ded6730a3A3a40D4fFEE55DecC7)
 */
export const jbControllerConfig = {
  address: jbControllerAddress,
  abi: jbControllerABI,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBDirectory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2377a7f672dB76Cf42b591d16C68480f0fc54B14)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xCD62D579077Ba9B37052527AbB4cB6CbE349fAba)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2377a7f672dB76Cf42b591d16C68480f0fc54B14)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xCD62D579077Ba9B37052527AbB4cB6CbE349fAba)
 */
export const jbDirectoryAddress = {
  11155111: '0x2377a7f672dB76Cf42b591d16C68480f0fc54B14',
  11155420: '0xCD62D579077Ba9B37052527AbB4cB6CbE349fAba',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2377a7f672dB76Cf42b591d16C68480f0fc54B14)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xCD62D579077Ba9B37052527AbB4cB6CbE349fAba)
 */
export const jbDirectoryConfig = {
  address: jbDirectoryAddress,
  abi: jbDirectoryABI,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBMultiTerminal
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x330A3F894468AA56DE6461d3f22474259EBF3AB7)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4cBc881Ac97371e4706F3b5eD1216744FC774D5f)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x330A3F894468AA56DE6461d3f22474259EBF3AB7)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4cBc881Ac97371e4706F3b5eD1216744FC774D5f)
 */
export const jbMultiTerminalAddress = {
  11155111: '0x330A3F894468AA56DE6461d3f22474259EBF3AB7',
  11155420: '0x4cBc881Ac97371e4706F3b5eD1216744FC774D5f',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x330A3F894468AA56DE6461d3f22474259EBF3AB7)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4cBc881Ac97371e4706F3b5eD1216744FC774D5f)
 */
export const jbMultiTerminalConfig = {
  address: jbMultiTerminalAddress,
  abi: jbMultiTerminalABI,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBPermissions
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x98EB970eF079F21710807d9f95a5bB35C0D5a1Ca)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xB1909b590571259c4F34EfADC3452bBde7aE3D16)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x98EB970eF079F21710807d9f95a5bB35C0D5a1Ca)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xB1909b590571259c4F34EfADC3452bBde7aE3D16)
 */
export const jbPermissionsAddress = {
  11155111: '0x98EB970eF079F21710807d9f95a5bB35C0D5a1Ca',
  11155420: '0xB1909b590571259c4F34EfADC3452bBde7aE3D16',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x98EB970eF079F21710807d9f95a5bB35C0D5a1Ca)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xB1909b590571259c4F34EfADC3452bBde7aE3D16)
 */
export const jbPermissionsConfig = {
  address: jbPermissionsAddress,
  abi: jbPermissionsABI,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBProjects
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xB47F8983a87b96aE8c7891F71765E4Ff1c3301c2)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x1eACeBE7F961DACB2E9CC6ed27a915b632dfa3a8)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xB47F8983a87b96aE8c7891F71765E4Ff1c3301c2)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x1eACeBE7F961DACB2E9CC6ed27a915b632dfa3a8)
 */
export const jbProjectsAddress = {
  11155111: '0xB47F8983a87b96aE8c7891F71765E4Ff1c3301c2',
  11155420: '0x1eACeBE7F961DACB2E9CC6ed27a915b632dfa3a8',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xB47F8983a87b96aE8c7891F71765E4Ff1c3301c2)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x1eACeBE7F961DACB2E9CC6ed27a915b632dfa3a8)
 */
export const jbProjectsConfig = {
  address: jbProjectsAddress,
  abi: jbProjectsABI,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBRulesets
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x48998A39021a4b8Ff30634a898cB86FE0a50325d)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x10dBc107999ea550D3268635cB447D9F2Aa15CD8)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x48998A39021a4b8Ff30634a898cB86FE0a50325d)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x10dBc107999ea550D3268635cB447D9F2Aa15CD8)
 */
export const jbRulesetsAddress = {
  11155111: '0x48998A39021a4b8Ff30634a898cB86FE0a50325d',
  11155420: '0x10dBc107999ea550D3268635cB447D9F2Aa15CD8',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x48998A39021a4b8Ff30634a898cB86FE0a50325d)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x10dBc107999ea550D3268635cB447D9F2Aa15CD8)
 */
export const jbRulesetsConfig = {
  address: jbRulesetsAddress,
  abi: jbRulesetsABI,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBSplits
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x50dbc20f9690Ce1b4201AAFE1e9b74062d66600e)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9e8157a8B3f17d8267c7656C97d2fe934e8b5270)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x50dbc20f9690Ce1b4201AAFE1e9b74062d66600e)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9e8157a8B3f17d8267c7656C97d2fe934e8b5270)
 */
export const jbSplitsAddress = {
  11155111: '0x50dbc20f9690Ce1b4201AAFE1e9b74062d66600e',
  11155420: '0x9e8157a8B3f17d8267c7656C97d2fe934e8b5270',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x50dbc20f9690Ce1b4201AAFE1e9b74062d66600e)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9e8157a8B3f17d8267c7656C97d2fe934e8b5270)
 */
export const jbSplitsConfig = {
  address: jbSplitsAddress,
  abi: jbSplitsABI,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBTerminalStore
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xbea0F4aDB40FAcfAd36cc88D4d1D04721024BDfd)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x79fa97B78eaDFB6765Ef058ef25E9D5Ce3aF37fA)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xbea0F4aDB40FAcfAd36cc88D4d1D04721024BDfd)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x79fa97B78eaDFB6765Ef058ef25E9D5Ce3aF37fA)
 */
export const jbTerminalStoreAddress = {
  11155111: '0xbea0F4aDB40FAcfAd36cc88D4d1D04721024BDfd',
  11155420: '0x79fa97B78eaDFB6765Ef058ef25E9D5Ce3aF37fA',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xbea0F4aDB40FAcfAd36cc88D4d1D04721024BDfd)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x79fa97B78eaDFB6765Ef058ef25E9D5Ce3aF37fA)
 */
export const jbTerminalStoreConfig = {
  address: jbTerminalStoreAddress,
  abi: jbTerminalStoreABI,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBTokens
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD4e232E56119784CC7D8C7999932fE99EB01153a)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xCb969234d03BeeC1925763b14D1066C530Cdc156)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD4e232E56119784CC7D8C7999932fE99EB01153a)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xCb969234d03BeeC1925763b14D1066C530Cdc156)
 */
export const jbTokensAddress = {
  11155111: '0xD4e232E56119784CC7D8C7999932fE99EB01153a',
  11155420: '0xCb969234d03BeeC1925763b14D1066C530Cdc156',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD4e232E56119784CC7D8C7999932fE99EB01153a)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xCb969234d03BeeC1925763b14D1066C530Cdc156)
 */
export const jbTokensConfig = {
  address: jbTokensAddress,
  abi: jbTokensABI,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Core
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wraps __{@link getContract}__ with `abi` set to __{@link jbControllerABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074C1FCe99D705aFb8E5F1e7e4078D6585F1dce3)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xfB74D49104a97Ded6730a3A3a40D4fFEE55DecC7)
 */
export function getJbController(
  config: Omit<GetContractArgs, 'abi' | 'address'> & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  },
) {
  return getContract({
    abi: jbControllerABI,
    address:
      jbControllerAddress[config.chainId as keyof typeof jbControllerAddress],
    ...config,
  })
}

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbControllerABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074C1FCe99D705aFb8E5F1e7e4078D6585F1dce3)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xfB74D49104a97Ded6730a3A3a40D4fFEE55DecC7)
 */
export function readJbController<
  TAbi extends readonly unknown[] = typeof jbControllerABI,
  TFunctionName extends string = string,
>(
  config: Omit<ReadContractConfig<TAbi, TFunctionName>, 'abi' | 'address'> & {
    chainId?: keyof typeof jbControllerAddress
    address?: Address
  },
) {
  return readContract({
    abi: jbControllerABI,
    address:
      jbControllerAddress[config.chainId as keyof typeof jbControllerAddress],
    ...config,
  } as unknown as ReadContractConfig<TAbi, TFunctionName>)
}

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbControllerABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074C1FCe99D705aFb8E5F1e7e4078D6585F1dce3)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xfB74D49104a97Ded6730a3A3a40D4fFEE55DecC7)
 */
export function writeJbController<
  TFunctionName extends string,
  TMode extends WriteContractMode,
  TChainId extends number = keyof typeof jbControllerAddress,
>(
  config:
    | (Omit<
        WriteContractPreparedArgs<typeof jbControllerABI, TFunctionName>,
        'abi' | 'address'
      > & {
        mode: TMode
        chainId?: TMode extends 'prepared'
          ? TChainId
          : keyof typeof jbControllerAddress
      })
    | (Omit<
        WriteContractUnpreparedArgs<typeof jbControllerABI, TFunctionName>,
        'abi' | 'address'
      > & {
        mode: TMode
        chainId?: TMode extends 'prepared'
          ? TChainId
          : keyof typeof jbControllerAddress
      }),
) {
  return writeContract({
    abi: jbControllerABI,
    address:
      jbControllerAddress[config.chainId as keyof typeof jbControllerAddress],
    ...config,
  } as unknown as WriteContractArgs<typeof jbControllerABI, TFunctionName>)
}

/**
 * Wraps __{@link prepareWriteContract}__ with `abi` set to __{@link jbControllerABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074C1FCe99D705aFb8E5F1e7e4078D6585F1dce3)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xfB74D49104a97Ded6730a3A3a40D4fFEE55DecC7)
 */
export function prepareWriteJbController<
  TAbi extends readonly unknown[] = typeof jbControllerABI,
  TFunctionName extends string = string,
>(
  config: Omit<
    PrepareWriteContractConfig<TAbi, TFunctionName>,
    'abi' | 'address'
  > & { chainId?: keyof typeof jbControllerAddress; address?: Address },
) {
  return prepareWriteContract({
    abi: jbControllerABI,
    address:
      jbControllerAddress[config.chainId as keyof typeof jbControllerAddress],
    ...config,
  } as unknown as PrepareWriteContractConfig<TAbi, TFunctionName>)
}

/**
 * Wraps __{@link getContract}__ with `abi` set to __{@link jbDirectoryABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2377a7f672dB76Cf42b591d16C68480f0fc54B14)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xCD62D579077Ba9B37052527AbB4cB6CbE349fAba)
 */
export function getJbDirectory(
  config: Omit<GetContractArgs, 'abi' | 'address'> & {
    chainId?: keyof typeof jbDirectoryAddress
    address?: Address
  },
) {
  return getContract({
    abi: jbDirectoryABI,
    address:
      jbDirectoryAddress[config.chainId as keyof typeof jbDirectoryAddress],
    ...config,
  })
}

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbDirectoryABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2377a7f672dB76Cf42b591d16C68480f0fc54B14)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xCD62D579077Ba9B37052527AbB4cB6CbE349fAba)
 */
export function readJbDirectory<
  TAbi extends readonly unknown[] = typeof jbDirectoryABI,
  TFunctionName extends string = string,
>(
  config: Omit<ReadContractConfig<TAbi, TFunctionName>, 'abi' | 'address'> & {
    chainId?: keyof typeof jbDirectoryAddress
    address?: Address
  },
) {
  return readContract({
    abi: jbDirectoryABI,
    address:
      jbDirectoryAddress[config.chainId as keyof typeof jbDirectoryAddress],
    ...config,
  } as unknown as ReadContractConfig<TAbi, TFunctionName>)
}

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbDirectoryABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2377a7f672dB76Cf42b591d16C68480f0fc54B14)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xCD62D579077Ba9B37052527AbB4cB6CbE349fAba)
 */
export function writeJbDirectory<
  TFunctionName extends string,
  TMode extends WriteContractMode,
  TChainId extends number = keyof typeof jbDirectoryAddress,
>(
  config:
    | (Omit<
        WriteContractPreparedArgs<typeof jbDirectoryABI, TFunctionName>,
        'abi' | 'address'
      > & {
        mode: TMode
        chainId?: TMode extends 'prepared'
          ? TChainId
          : keyof typeof jbDirectoryAddress
      })
    | (Omit<
        WriteContractUnpreparedArgs<typeof jbDirectoryABI, TFunctionName>,
        'abi' | 'address'
      > & {
        mode: TMode
        chainId?: TMode extends 'prepared'
          ? TChainId
          : keyof typeof jbDirectoryAddress
      }),
) {
  return writeContract({
    abi: jbDirectoryABI,
    address:
      jbDirectoryAddress[config.chainId as keyof typeof jbDirectoryAddress],
    ...config,
  } as unknown as WriteContractArgs<typeof jbDirectoryABI, TFunctionName>)
}

/**
 * Wraps __{@link prepareWriteContract}__ with `abi` set to __{@link jbDirectoryABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2377a7f672dB76Cf42b591d16C68480f0fc54B14)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xCD62D579077Ba9B37052527AbB4cB6CbE349fAba)
 */
export function prepareWriteJbDirectory<
  TAbi extends readonly unknown[] = typeof jbDirectoryABI,
  TFunctionName extends string = string,
>(
  config: Omit<
    PrepareWriteContractConfig<TAbi, TFunctionName>,
    'abi' | 'address'
  > & { chainId?: keyof typeof jbDirectoryAddress; address?: Address },
) {
  return prepareWriteContract({
    abi: jbDirectoryABI,
    address:
      jbDirectoryAddress[config.chainId as keyof typeof jbDirectoryAddress],
    ...config,
  } as unknown as PrepareWriteContractConfig<TAbi, TFunctionName>)
}

/**
 * Wraps __{@link getContract}__ with `abi` set to __{@link jbMultiTerminalABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x330A3F894468AA56DE6461d3f22474259EBF3AB7)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4cBc881Ac97371e4706F3b5eD1216744FC774D5f)
 */
export function getJbMultiTerminal(
  config: Omit<GetContractArgs, 'abi' | 'address'> & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  },
) {
  return getContract({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[
        config.chainId as keyof typeof jbMultiTerminalAddress
      ],
    ...config,
  })
}

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbMultiTerminalABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x330A3F894468AA56DE6461d3f22474259EBF3AB7)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4cBc881Ac97371e4706F3b5eD1216744FC774D5f)
 */
export function readJbMultiTerminal<
  TAbi extends readonly unknown[] = typeof jbMultiTerminalABI,
  TFunctionName extends string = string,
>(
  config: Omit<ReadContractConfig<TAbi, TFunctionName>, 'abi' | 'address'> & {
    chainId?: keyof typeof jbMultiTerminalAddress
    address?: Address
  },
) {
  return readContract({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[
        config.chainId as keyof typeof jbMultiTerminalAddress
      ],
    ...config,
  } as unknown as ReadContractConfig<TAbi, TFunctionName>)
}

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbMultiTerminalABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x330A3F894468AA56DE6461d3f22474259EBF3AB7)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4cBc881Ac97371e4706F3b5eD1216744FC774D5f)
 */
export function writeJbMultiTerminal<
  TFunctionName extends string,
  TMode extends WriteContractMode,
  TChainId extends number = keyof typeof jbMultiTerminalAddress,
>(
  config:
    | (Omit<
        WriteContractPreparedArgs<typeof jbMultiTerminalABI, TFunctionName>,
        'abi' | 'address'
      > & {
        mode: TMode
        chainId?: TMode extends 'prepared'
          ? TChainId
          : keyof typeof jbMultiTerminalAddress
      })
    | (Omit<
        WriteContractUnpreparedArgs<typeof jbMultiTerminalABI, TFunctionName>,
        'abi' | 'address'
      > & {
        mode: TMode
        chainId?: TMode extends 'prepared'
          ? TChainId
          : keyof typeof jbMultiTerminalAddress
      }),
) {
  return writeContract({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[
        config.chainId as keyof typeof jbMultiTerminalAddress
      ],
    ...config,
  } as unknown as WriteContractArgs<typeof jbMultiTerminalABI, TFunctionName>)
}

/**
 * Wraps __{@link prepareWriteContract}__ with `abi` set to __{@link jbMultiTerminalABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x330A3F894468AA56DE6461d3f22474259EBF3AB7)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4cBc881Ac97371e4706F3b5eD1216744FC774D5f)
 */
export function prepareWriteJbMultiTerminal<
  TAbi extends readonly unknown[] = typeof jbMultiTerminalABI,
  TFunctionName extends string = string,
>(
  config: Omit<
    PrepareWriteContractConfig<TAbi, TFunctionName>,
    'abi' | 'address'
  > & { chainId?: keyof typeof jbMultiTerminalAddress; address?: Address },
) {
  return prepareWriteContract({
    abi: jbMultiTerminalABI,
    address:
      jbMultiTerminalAddress[
        config.chainId as keyof typeof jbMultiTerminalAddress
      ],
    ...config,
  } as unknown as PrepareWriteContractConfig<TAbi, TFunctionName>)
}

/**
 * Wraps __{@link getContract}__ with `abi` set to __{@link jbPermissionsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x98EB970eF079F21710807d9f95a5bB35C0D5a1Ca)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xB1909b590571259c4F34EfADC3452bBde7aE3D16)
 */
export function getJbPermissions(
  config: Omit<GetContractArgs, 'abi' | 'address'> & {
    chainId?: keyof typeof jbPermissionsAddress
    address?: Address
  },
) {
  return getContract({
    abi: jbPermissionsABI,
    address:
      jbPermissionsAddress[config.chainId as keyof typeof jbPermissionsAddress],
    ...config,
  })
}

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbPermissionsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x98EB970eF079F21710807d9f95a5bB35C0D5a1Ca)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xB1909b590571259c4F34EfADC3452bBde7aE3D16)
 */
export function readJbPermissions<
  TAbi extends readonly unknown[] = typeof jbPermissionsABI,
  TFunctionName extends string = string,
>(
  config: Omit<ReadContractConfig<TAbi, TFunctionName>, 'abi' | 'address'> & {
    chainId?: keyof typeof jbPermissionsAddress
    address?: Address
  },
) {
  return readContract({
    abi: jbPermissionsABI,
    address:
      jbPermissionsAddress[config.chainId as keyof typeof jbPermissionsAddress],
    ...config,
  } as unknown as ReadContractConfig<TAbi, TFunctionName>)
}

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbPermissionsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x98EB970eF079F21710807d9f95a5bB35C0D5a1Ca)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xB1909b590571259c4F34EfADC3452bBde7aE3D16)
 */
export function writeJbPermissions<
  TFunctionName extends string,
  TMode extends WriteContractMode,
  TChainId extends number = keyof typeof jbPermissionsAddress,
>(
  config:
    | (Omit<
        WriteContractPreparedArgs<typeof jbPermissionsABI, TFunctionName>,
        'abi' | 'address'
      > & {
        mode: TMode
        chainId?: TMode extends 'prepared'
          ? TChainId
          : keyof typeof jbPermissionsAddress
      })
    | (Omit<
        WriteContractUnpreparedArgs<typeof jbPermissionsABI, TFunctionName>,
        'abi' | 'address'
      > & {
        mode: TMode
        chainId?: TMode extends 'prepared'
          ? TChainId
          : keyof typeof jbPermissionsAddress
      }),
) {
  return writeContract({
    abi: jbPermissionsABI,
    address:
      jbPermissionsAddress[config.chainId as keyof typeof jbPermissionsAddress],
    ...config,
  } as unknown as WriteContractArgs<typeof jbPermissionsABI, TFunctionName>)
}

/**
 * Wraps __{@link prepareWriteContract}__ with `abi` set to __{@link jbPermissionsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x98EB970eF079F21710807d9f95a5bB35C0D5a1Ca)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xB1909b590571259c4F34EfADC3452bBde7aE3D16)
 */
export function prepareWriteJbPermissions<
  TAbi extends readonly unknown[] = typeof jbPermissionsABI,
  TFunctionName extends string = string,
>(
  config: Omit<
    PrepareWriteContractConfig<TAbi, TFunctionName>,
    'abi' | 'address'
  > & { chainId?: keyof typeof jbPermissionsAddress; address?: Address },
) {
  return prepareWriteContract({
    abi: jbPermissionsABI,
    address:
      jbPermissionsAddress[config.chainId as keyof typeof jbPermissionsAddress],
    ...config,
  } as unknown as PrepareWriteContractConfig<TAbi, TFunctionName>)
}

/**
 * Wraps __{@link getContract}__ with `abi` set to __{@link jbProjectsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xB47F8983a87b96aE8c7891F71765E4Ff1c3301c2)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x1eACeBE7F961DACB2E9CC6ed27a915b632dfa3a8)
 */
export function getJbProjects(
  config: Omit<GetContractArgs, 'abi' | 'address'> & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  },
) {
  return getContract({
    abi: jbProjectsABI,
    address:
      jbProjectsAddress[config.chainId as keyof typeof jbProjectsAddress],
    ...config,
  })
}

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbProjectsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xB47F8983a87b96aE8c7891F71765E4Ff1c3301c2)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x1eACeBE7F961DACB2E9CC6ed27a915b632dfa3a8)
 */
export function readJbProjects<
  TAbi extends readonly unknown[] = typeof jbProjectsABI,
  TFunctionName extends string = string,
>(
  config: Omit<ReadContractConfig<TAbi, TFunctionName>, 'abi' | 'address'> & {
    chainId?: keyof typeof jbProjectsAddress
    address?: Address
  },
) {
  return readContract({
    abi: jbProjectsABI,
    address:
      jbProjectsAddress[config.chainId as keyof typeof jbProjectsAddress],
    ...config,
  } as unknown as ReadContractConfig<TAbi, TFunctionName>)
}

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbProjectsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xB47F8983a87b96aE8c7891F71765E4Ff1c3301c2)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x1eACeBE7F961DACB2E9CC6ed27a915b632dfa3a8)
 */
export function writeJbProjects<
  TFunctionName extends string,
  TMode extends WriteContractMode,
  TChainId extends number = keyof typeof jbProjectsAddress,
>(
  config:
    | (Omit<
        WriteContractPreparedArgs<typeof jbProjectsABI, TFunctionName>,
        'abi' | 'address'
      > & {
        mode: TMode
        chainId?: TMode extends 'prepared'
          ? TChainId
          : keyof typeof jbProjectsAddress
      })
    | (Omit<
        WriteContractUnpreparedArgs<typeof jbProjectsABI, TFunctionName>,
        'abi' | 'address'
      > & {
        mode: TMode
        chainId?: TMode extends 'prepared'
          ? TChainId
          : keyof typeof jbProjectsAddress
      }),
) {
  return writeContract({
    abi: jbProjectsABI,
    address:
      jbProjectsAddress[config.chainId as keyof typeof jbProjectsAddress],
    ...config,
  } as unknown as WriteContractArgs<typeof jbProjectsABI, TFunctionName>)
}

/**
 * Wraps __{@link prepareWriteContract}__ with `abi` set to __{@link jbProjectsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xB47F8983a87b96aE8c7891F71765E4Ff1c3301c2)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x1eACeBE7F961DACB2E9CC6ed27a915b632dfa3a8)
 */
export function prepareWriteJbProjects<
  TAbi extends readonly unknown[] = typeof jbProjectsABI,
  TFunctionName extends string = string,
>(
  config: Omit<
    PrepareWriteContractConfig<TAbi, TFunctionName>,
    'abi' | 'address'
  > & { chainId?: keyof typeof jbProjectsAddress; address?: Address },
) {
  return prepareWriteContract({
    abi: jbProjectsABI,
    address:
      jbProjectsAddress[config.chainId as keyof typeof jbProjectsAddress],
    ...config,
  } as unknown as PrepareWriteContractConfig<TAbi, TFunctionName>)
}

/**
 * Wraps __{@link getContract}__ with `abi` set to __{@link jbRulesetsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x48998A39021a4b8Ff30634a898cB86FE0a50325d)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x10dBc107999ea550D3268635cB447D9F2Aa15CD8)
 */
export function getJbRulesets(
  config: Omit<GetContractArgs, 'abi' | 'address'> & {
    chainId?: keyof typeof jbRulesetsAddress
    address?: Address
  },
) {
  return getContract({
    abi: jbRulesetsABI,
    address:
      jbRulesetsAddress[config.chainId as keyof typeof jbRulesetsAddress],
    ...config,
  })
}

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbRulesetsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x48998A39021a4b8Ff30634a898cB86FE0a50325d)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x10dBc107999ea550D3268635cB447D9F2Aa15CD8)
 */
export function readJbRulesets<
  TAbi extends readonly unknown[] = typeof jbRulesetsABI,
  TFunctionName extends string = string,
>(
  config: Omit<ReadContractConfig<TAbi, TFunctionName>, 'abi' | 'address'> & {
    chainId?: keyof typeof jbRulesetsAddress
    address?: Address
  },
) {
  return readContract({
    abi: jbRulesetsABI,
    address:
      jbRulesetsAddress[config.chainId as keyof typeof jbRulesetsAddress],
    ...config,
  } as unknown as ReadContractConfig<TAbi, TFunctionName>)
}

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbRulesetsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x48998A39021a4b8Ff30634a898cB86FE0a50325d)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x10dBc107999ea550D3268635cB447D9F2Aa15CD8)
 */
export function writeJbRulesets<
  TFunctionName extends string,
  TMode extends WriteContractMode,
  TChainId extends number = keyof typeof jbRulesetsAddress,
>(
  config:
    | (Omit<
        WriteContractPreparedArgs<typeof jbRulesetsABI, TFunctionName>,
        'abi' | 'address'
      > & {
        mode: TMode
        chainId?: TMode extends 'prepared'
          ? TChainId
          : keyof typeof jbRulesetsAddress
      })
    | (Omit<
        WriteContractUnpreparedArgs<typeof jbRulesetsABI, TFunctionName>,
        'abi' | 'address'
      > & {
        mode: TMode
        chainId?: TMode extends 'prepared'
          ? TChainId
          : keyof typeof jbRulesetsAddress
      }),
) {
  return writeContract({
    abi: jbRulesetsABI,
    address:
      jbRulesetsAddress[config.chainId as keyof typeof jbRulesetsAddress],
    ...config,
  } as unknown as WriteContractArgs<typeof jbRulesetsABI, TFunctionName>)
}

/**
 * Wraps __{@link prepareWriteContract}__ with `abi` set to __{@link jbRulesetsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x48998A39021a4b8Ff30634a898cB86FE0a50325d)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x10dBc107999ea550D3268635cB447D9F2Aa15CD8)
 */
export function prepareWriteJbRulesets<
  TAbi extends readonly unknown[] = typeof jbRulesetsABI,
  TFunctionName extends string = string,
>(
  config: Omit<
    PrepareWriteContractConfig<TAbi, TFunctionName>,
    'abi' | 'address'
  > & { chainId?: keyof typeof jbRulesetsAddress; address?: Address },
) {
  return prepareWriteContract({
    abi: jbRulesetsABI,
    address:
      jbRulesetsAddress[config.chainId as keyof typeof jbRulesetsAddress],
    ...config,
  } as unknown as PrepareWriteContractConfig<TAbi, TFunctionName>)
}

/**
 * Wraps __{@link getContract}__ with `abi` set to __{@link jbSplitsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x50dbc20f9690Ce1b4201AAFE1e9b74062d66600e)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9e8157a8B3f17d8267c7656C97d2fe934e8b5270)
 */
export function getJbSplits(
  config: Omit<GetContractArgs, 'abi' | 'address'> & {
    chainId?: keyof typeof jbSplitsAddress
    address?: Address
  },
) {
  return getContract({
    abi: jbSplitsABI,
    address: jbSplitsAddress[config.chainId as keyof typeof jbSplitsAddress],
    ...config,
  })
}

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbSplitsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x50dbc20f9690Ce1b4201AAFE1e9b74062d66600e)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9e8157a8B3f17d8267c7656C97d2fe934e8b5270)
 */
export function readJbSplits<
  TAbi extends readonly unknown[] = typeof jbSplitsABI,
  TFunctionName extends string = string,
>(
  config: Omit<ReadContractConfig<TAbi, TFunctionName>, 'abi' | 'address'> & {
    chainId?: keyof typeof jbSplitsAddress
    address?: Address
  },
) {
  return readContract({
    abi: jbSplitsABI,
    address: jbSplitsAddress[config.chainId as keyof typeof jbSplitsAddress],
    ...config,
  } as unknown as ReadContractConfig<TAbi, TFunctionName>)
}

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbSplitsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x50dbc20f9690Ce1b4201AAFE1e9b74062d66600e)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9e8157a8B3f17d8267c7656C97d2fe934e8b5270)
 */
export function writeJbSplits<
  TFunctionName extends string,
  TMode extends WriteContractMode,
  TChainId extends number = keyof typeof jbSplitsAddress,
>(
  config:
    | (Omit<
        WriteContractPreparedArgs<typeof jbSplitsABI, TFunctionName>,
        'abi' | 'address'
      > & {
        mode: TMode
        chainId?: TMode extends 'prepared'
          ? TChainId
          : keyof typeof jbSplitsAddress
      })
    | (Omit<
        WriteContractUnpreparedArgs<typeof jbSplitsABI, TFunctionName>,
        'abi' | 'address'
      > & {
        mode: TMode
        chainId?: TMode extends 'prepared'
          ? TChainId
          : keyof typeof jbSplitsAddress
      }),
) {
  return writeContract({
    abi: jbSplitsABI,
    address: jbSplitsAddress[config.chainId as keyof typeof jbSplitsAddress],
    ...config,
  } as unknown as WriteContractArgs<typeof jbSplitsABI, TFunctionName>)
}

/**
 * Wraps __{@link prepareWriteContract}__ with `abi` set to __{@link jbSplitsABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x50dbc20f9690Ce1b4201AAFE1e9b74062d66600e)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9e8157a8B3f17d8267c7656C97d2fe934e8b5270)
 */
export function prepareWriteJbSplits<
  TAbi extends readonly unknown[] = typeof jbSplitsABI,
  TFunctionName extends string = string,
>(
  config: Omit<
    PrepareWriteContractConfig<TAbi, TFunctionName>,
    'abi' | 'address'
  > & { chainId?: keyof typeof jbSplitsAddress; address?: Address },
) {
  return prepareWriteContract({
    abi: jbSplitsABI,
    address: jbSplitsAddress[config.chainId as keyof typeof jbSplitsAddress],
    ...config,
  } as unknown as PrepareWriteContractConfig<TAbi, TFunctionName>)
}

/**
 * Wraps __{@link getContract}__ with `abi` set to __{@link jbTerminalStoreABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xbea0F4aDB40FAcfAd36cc88D4d1D04721024BDfd)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x79fa97B78eaDFB6765Ef058ef25E9D5Ce3aF37fA)
 */
export function getJbTerminalStore(
  config: Omit<GetContractArgs, 'abi' | 'address'> & {
    chainId?: keyof typeof jbTerminalStoreAddress
    address?: Address
  },
) {
  return getContract({
    abi: jbTerminalStoreABI,
    address:
      jbTerminalStoreAddress[
        config.chainId as keyof typeof jbTerminalStoreAddress
      ],
    ...config,
  })
}

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbTerminalStoreABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xbea0F4aDB40FAcfAd36cc88D4d1D04721024BDfd)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x79fa97B78eaDFB6765Ef058ef25E9D5Ce3aF37fA)
 */
export function readJbTerminalStore<
  TAbi extends readonly unknown[] = typeof jbTerminalStoreABI,
  TFunctionName extends string = string,
>(
  config: Omit<ReadContractConfig<TAbi, TFunctionName>, 'abi' | 'address'> & {
    chainId?: keyof typeof jbTerminalStoreAddress
    address?: Address
  },
) {
  return readContract({
    abi: jbTerminalStoreABI,
    address:
      jbTerminalStoreAddress[
        config.chainId as keyof typeof jbTerminalStoreAddress
      ],
    ...config,
  } as unknown as ReadContractConfig<TAbi, TFunctionName>)
}

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbTerminalStoreABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xbea0F4aDB40FAcfAd36cc88D4d1D04721024BDfd)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x79fa97B78eaDFB6765Ef058ef25E9D5Ce3aF37fA)
 */
export function writeJbTerminalStore<
  TFunctionName extends string,
  TMode extends WriteContractMode,
  TChainId extends number = keyof typeof jbTerminalStoreAddress,
>(
  config:
    | (Omit<
        WriteContractPreparedArgs<typeof jbTerminalStoreABI, TFunctionName>,
        'abi' | 'address'
      > & {
        mode: TMode
        chainId?: TMode extends 'prepared'
          ? TChainId
          : keyof typeof jbTerminalStoreAddress
      })
    | (Omit<
        WriteContractUnpreparedArgs<typeof jbTerminalStoreABI, TFunctionName>,
        'abi' | 'address'
      > & {
        mode: TMode
        chainId?: TMode extends 'prepared'
          ? TChainId
          : keyof typeof jbTerminalStoreAddress
      }),
) {
  return writeContract({
    abi: jbTerminalStoreABI,
    address:
      jbTerminalStoreAddress[
        config.chainId as keyof typeof jbTerminalStoreAddress
      ],
    ...config,
  } as unknown as WriteContractArgs<typeof jbTerminalStoreABI, TFunctionName>)
}

/**
 * Wraps __{@link prepareWriteContract}__ with `abi` set to __{@link jbTerminalStoreABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xbea0F4aDB40FAcfAd36cc88D4d1D04721024BDfd)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x79fa97B78eaDFB6765Ef058ef25E9D5Ce3aF37fA)
 */
export function prepareWriteJbTerminalStore<
  TAbi extends readonly unknown[] = typeof jbTerminalStoreABI,
  TFunctionName extends string = string,
>(
  config: Omit<
    PrepareWriteContractConfig<TAbi, TFunctionName>,
    'abi' | 'address'
  > & { chainId?: keyof typeof jbTerminalStoreAddress; address?: Address },
) {
  return prepareWriteContract({
    abi: jbTerminalStoreABI,
    address:
      jbTerminalStoreAddress[
        config.chainId as keyof typeof jbTerminalStoreAddress
      ],
    ...config,
  } as unknown as PrepareWriteContractConfig<TAbi, TFunctionName>)
}

/**
 * Wraps __{@link getContract}__ with `abi` set to __{@link jbTokensABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD4e232E56119784CC7D8C7999932fE99EB01153a)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xCb969234d03BeeC1925763b14D1066C530Cdc156)
 */
export function getJbTokens(
  config: Omit<GetContractArgs, 'abi' | 'address'> & {
    chainId?: keyof typeof jbTokensAddress
    address?: Address
  },
) {
  return getContract({
    abi: jbTokensABI,
    address: jbTokensAddress[config.chainId as keyof typeof jbTokensAddress],
    ...config,
  })
}

/**
 * Wraps __{@link readContract}__ with `abi` set to __{@link jbTokensABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD4e232E56119784CC7D8C7999932fE99EB01153a)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xCb969234d03BeeC1925763b14D1066C530Cdc156)
 */
export function readJbTokens<
  TAbi extends readonly unknown[] = typeof jbTokensABI,
  TFunctionName extends string = string,
>(
  config: Omit<ReadContractConfig<TAbi, TFunctionName>, 'abi' | 'address'> & {
    chainId?: keyof typeof jbTokensAddress
    address?: Address
  },
) {
  return readContract({
    abi: jbTokensABI,
    address: jbTokensAddress[config.chainId as keyof typeof jbTokensAddress],
    ...config,
  } as unknown as ReadContractConfig<TAbi, TFunctionName>)
}

/**
 * Wraps __{@link writeContract}__ with `abi` set to __{@link jbTokensABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD4e232E56119784CC7D8C7999932fE99EB01153a)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xCb969234d03BeeC1925763b14D1066C530Cdc156)
 */
export function writeJbTokens<
  TFunctionName extends string,
  TMode extends WriteContractMode,
  TChainId extends number = keyof typeof jbTokensAddress,
>(
  config:
    | (Omit<
        WriteContractPreparedArgs<typeof jbTokensABI, TFunctionName>,
        'abi' | 'address'
      > & {
        mode: TMode
        chainId?: TMode extends 'prepared'
          ? TChainId
          : keyof typeof jbTokensAddress
      })
    | (Omit<
        WriteContractUnpreparedArgs<typeof jbTokensABI, TFunctionName>,
        'abi' | 'address'
      > & {
        mode: TMode
        chainId?: TMode extends 'prepared'
          ? TChainId
          : keyof typeof jbTokensAddress
      }),
) {
  return writeContract({
    abi: jbTokensABI,
    address: jbTokensAddress[config.chainId as keyof typeof jbTokensAddress],
    ...config,
  } as unknown as WriteContractArgs<typeof jbTokensABI, TFunctionName>)
}

/**
 * Wraps __{@link prepareWriteContract}__ with `abi` set to __{@link jbTokensABI}__.
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD4e232E56119784CC7D8C7999932fE99EB01153a)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xCb969234d03BeeC1925763b14D1066C530Cdc156)
 */
export function prepareWriteJbTokens<
  TAbi extends readonly unknown[] = typeof jbTokensABI,
  TFunctionName extends string = string,
>(
  config: Omit<
    PrepareWriteContractConfig<TAbi, TFunctionName>,
    'abi' | 'address'
  > & { chainId?: keyof typeof jbTokensAddress; address?: Address },
) {
  return prepareWriteContract({
    abi: jbTokensABI,
    address: jbTokensAddress[config.chainId as keyof typeof jbTokensAddress],
    ...config,
  } as unknown as PrepareWriteContractConfig<TAbi, TFunctionName>)
}
