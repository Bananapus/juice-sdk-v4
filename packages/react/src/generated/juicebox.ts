import {
  createUseReadContract,
  createUseWriteContract,
  createUseSimulateContract,
  createUseWatchContractEvent,
} from 'wagmi/codegen'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBController
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
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
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'to', internalType: 'contract IJBMigratable', type: 'address' },
    ],
    name: 'migrateController',
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
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'memo', internalType: 'string', type: 'string' },
    ],
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
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'uriOf',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
] as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const jbControllerAddress = {
  11155111: '0x02AF7F7E55459592C93DBD25A55f110149DdfaeC',
  11155420: '0x221f338f8a909D6daFAE553567b03968bFf79Be5',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const jbControllerConfig = {
  address: jbControllerAddress,
  abi: jbControllerAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBDirectory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
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
] as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
 */
export const jbDirectoryAddress = {
  11155111: '0x4a0E06016e11d15C34B9902ECca70f7582A174A9',
  11155420: '0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
 */
export const jbDirectoryConfig = {
  address: jbDirectoryAddress,
  abi: jbDirectoryAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBMultiTerminal
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
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
] as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const jbMultiTerminalAddress = {
  11155111: '0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc',
  11155420: '0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const jbMultiTerminalConfig = {
  address: jbMultiTerminalAddress,
  abi: jbMultiTerminalAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBPermissions
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x7f6318AbD7A6533E7deCeF89FE10Cd7985dbcd20)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4B24983d4546699Aa42EBa1eaBf189c08E6e8541)
 */
export const jbPermissionsAbi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
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
    inputs: [
      { name: 'operator', internalType: 'address', type: 'address' },
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'projectId', internalType: 'uint256', type: 'uint256' },
      { name: 'permissionId', internalType: 'uint256', type: 'uint256' },
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
] as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x7f6318AbD7A6533E7deCeF89FE10Cd7985dbcd20)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4B24983d4546699Aa42EBa1eaBf189c08E6e8541)
 */
export const jbPermissionsAddress = {
  11155111: '0x7f6318AbD7A6533E7deCeF89FE10Cd7985dbcd20',
  11155420: '0x4B24983d4546699Aa42EBa1eaBf189c08E6e8541',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x7f6318AbD7A6533E7deCeF89FE10Cd7985dbcd20)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4B24983d4546699Aa42EBa1eaBf189c08E6e8541)
 */
export const jbPermissionsConfig = {
  address: jbPermissionsAddress,
  abi: jbPermissionsAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBProjects
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const jbProjectsAbi = [
  {
    type: 'constructor',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    stateMutability: 'nonpayable',
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
    type: 'function',
    inputs: [],
    name: 'CLOCK_MODE',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
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
    inputs: [],
    name: 'clock',
    outputs: [{ name: '', internalType: 'uint48', type: 'uint48' }],
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
    inputs: [{ name: 'delegatee', internalType: 'address', type: 'address' }],
    name: 'delegate',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
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
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'delegates',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
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
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'getApproved',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'timepoint', internalType: 'uint256', type: 'uint256' }],
    name: 'getPastTotalSupply',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'timepoint', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'getPastVotes',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'getVotes',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
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
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'nonces',
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
] as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const jbProjectsAddress = {
  11155111: '0xA2344fc40695cc7626904CCD4ef919487AffC184',
  11155420: '0x65b25F762123CB4a2A950a45d820D9d4050E1a97',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const jbProjectsConfig = {
  address: jbProjectsAddress,
  abi: jbProjectsAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBRulesets
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x378B37147261Cb4ee39F1deadbdB1EfCfE467bD2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x82Ef92b555a12187aa319097f1ca419CD27160d1)
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
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'projectId', internalType: 'uint256', type: 'uint256' }],
    name: 'updateRulesetWeightCache',
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x378B37147261Cb4ee39F1deadbdB1EfCfE467bD2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x82Ef92b555a12187aa319097f1ca419CD27160d1)
 */
export const jbRulesetsAddress = {
  11155111: '0x378B37147261Cb4ee39F1deadbdB1EfCfE467bD2',
  11155420: '0x82Ef92b555a12187aa319097f1ca419CD27160d1',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x378B37147261Cb4ee39F1deadbdB1EfCfE467bD2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x82Ef92b555a12187aa319097f1ca419CD27160d1)
 */
export const jbRulesetsConfig = {
  address: jbRulesetsAddress,
  abi: jbRulesetsAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBSplits
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2C55541689Be91d8912f383749A4Fd3C267A63f4)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x0dA1172F3a30710Af4943EB3E783c25B6562e60F)
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
] as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2C55541689Be91d8912f383749A4Fd3C267A63f4)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x0dA1172F3a30710Af4943EB3E783c25B6562e60F)
 */
export const jbSplitsAddress = {
  11155111: '0x2C55541689Be91d8912f383749A4Fd3C267A63f4',
  11155420: '0x0dA1172F3a30710Af4943EB3E783c25B6562e60F',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2C55541689Be91d8912f383749A4Fd3C267A63f4)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x0dA1172F3a30710Af4943EB3E783c25B6562e60F)
 */
export const jbSplitsConfig = {
  address: jbSplitsAddress,
  abi: jbSplitsAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBTerminalStore
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6Fb249E55C472fF83dF6F3cDF09A0f414ea9635b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xe9DD4eA90e996d065A3d1082Dbd2adB69B3Ce5A1)
 */
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
] as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6Fb249E55C472fF83dF6F3cDF09A0f414ea9635b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xe9DD4eA90e996d065A3d1082Dbd2adB69B3Ce5A1)
 */
export const jbTerminalStoreAddress = {
  11155111: '0x6Fb249E55C472fF83dF6F3cDF09A0f414ea9635b',
  11155420: '0xe9DD4eA90e996d065A3d1082Dbd2adB69B3Ce5A1',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6Fb249E55C472fF83dF6F3cDF09A0f414ea9635b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xe9DD4eA90e996d065A3d1082Dbd2adB69B3Ce5A1)
 */
export const jbTerminalStoreConfig = {
  address: jbTerminalStoreAddress,
  abi: jbTerminalStoreAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBTokens
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
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
    ],
    stateMutability: 'nonpayable',
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
] as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
 */
export const jbTokensAddress = {
  11155111: '0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709',
  11155420: '0x52E1280E04618d2579d4800d8ad457C5068d0cd4',
} as const

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
 */
export const jbTokensConfig = {
  address: jbTokensAddress,
  abi: jbTokensAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// React
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useReadJbController = /*#__PURE__*/ createUseReadContract({
  abi: jbControllerAbi,
  address: jbControllerAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"DIRECTORY"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useReadJbControllerDirectory = /*#__PURE__*/ createUseReadContract(
  {
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'DIRECTORY',
  },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"FUND_ACCESS_LIMITS"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useReadJbControllerFundAccessLimits =
  /*#__PURE__*/ createUseReadContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'FUND_ACCESS_LIMITS',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"PERMISSIONS"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useReadJbControllerPermissions =
  /*#__PURE__*/ createUseReadContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'PERMISSIONS',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"PROJECTS"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useReadJbControllerProjects = /*#__PURE__*/ createUseReadContract({
  abi: jbControllerAbi,
  address: jbControllerAddress,
  functionName: 'PROJECTS',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"RULESETS"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useReadJbControllerRulesets = /*#__PURE__*/ createUseReadContract({
  abi: jbControllerAbi,
  address: jbControllerAddress,
  functionName: 'RULESETS',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"SPLITS"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useReadJbControllerSplits = /*#__PURE__*/ createUseReadContract({
  abi: jbControllerAbi,
  address: jbControllerAddress,
  functionName: 'SPLITS',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"TOKENS"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useReadJbControllerTokens = /*#__PURE__*/ createUseReadContract({
  abi: jbControllerAbi,
  address: jbControllerAddress,
  functionName: 'TOKENS',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"currentRulesetOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useReadJbControllerCurrentRulesetOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'currentRulesetOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"getRulesetOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useReadJbControllerGetRulesetOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'getRulesetOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"isTrustedForwarder"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useReadJbControllerIsTrustedForwarder =
  /*#__PURE__*/ createUseReadContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'isTrustedForwarder',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"latestQueuedRulesetOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useReadJbControllerLatestQueuedRulesetOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'latestQueuedRulesetOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"pendingReservedTokenBalanceOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useReadJbControllerPendingReservedTokenBalanceOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'pendingReservedTokenBalanceOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"rulesetsOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useReadJbControllerRulesetsOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'rulesetsOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"setControllerAllowed"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useReadJbControllerSetControllerAllowed =
  /*#__PURE__*/ createUseReadContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'setControllerAllowed',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"setTerminalsAllowed"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useReadJbControllerSetTerminalsAllowed =
  /*#__PURE__*/ createUseReadContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'setTerminalsAllowed',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"supportsInterface"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useReadJbControllerSupportsInterface =
  /*#__PURE__*/ createUseReadContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'supportsInterface',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"totalTokenSupplyWithReservedTokensOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useReadJbControllerTotalTokenSupplyWithReservedTokensOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'totalTokenSupplyWithReservedTokensOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"trustedForwarder"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useReadJbControllerTrustedForwarder =
  /*#__PURE__*/ createUseReadContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'trustedForwarder',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"upcomingRulesetOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useReadJbControllerUpcomingRulesetOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'upcomingRulesetOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"uriOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useReadJbControllerUriOf = /*#__PURE__*/ createUseReadContract({
  abi: jbControllerAbi,
  address: jbControllerAddress,
  functionName: 'uriOf',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useWriteJbController = /*#__PURE__*/ createUseWriteContract({
  abi: jbControllerAbi,
  address: jbControllerAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"burnTokensOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useWriteJbControllerBurnTokensOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'burnTokensOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"claimTokensFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useWriteJbControllerClaimTokensFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'claimTokensFor',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"deployERC20For"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useWriteJbControllerDeployErc20For =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'deployERC20For',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"launchProjectFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useWriteJbControllerLaunchProjectFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'launchProjectFor',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"launchRulesetsFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useWriteJbControllerLaunchRulesetsFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'launchRulesetsFor',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"migrateController"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useWriteJbControllerMigrateController =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'migrateController',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"mintTokensOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useWriteJbControllerMintTokensOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'mintTokensOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"payReservedTokenToTerminal"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useWriteJbControllerPayReservedTokenToTerminal =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'payReservedTokenToTerminal',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"queueRulesetsOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useWriteJbControllerQueueRulesetsOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'queueRulesetsOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"receiveMigrationFrom"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useWriteJbControllerReceiveMigrationFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'receiveMigrationFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"sendReservedTokensToSplitsOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useWriteJbControllerSendReservedTokensToSplitsOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'sendReservedTokensToSplitsOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"setSplitGroupsOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useWriteJbControllerSetSplitGroupsOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'setSplitGroupsOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"setTokenFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useWriteJbControllerSetTokenFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'setTokenFor',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"setUriOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useWriteJbControllerSetUriOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'setUriOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"transferCreditsFrom"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useWriteJbControllerTransferCreditsFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'transferCreditsFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useSimulateJbController = /*#__PURE__*/ createUseSimulateContract({
  abi: jbControllerAbi,
  address: jbControllerAddress,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"burnTokensOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useSimulateJbControllerBurnTokensOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'burnTokensOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"claimTokensFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useSimulateJbControllerClaimTokensFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'claimTokensFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"deployERC20For"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useSimulateJbControllerDeployErc20For =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'deployERC20For',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"launchProjectFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useSimulateJbControllerLaunchProjectFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'launchProjectFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"launchRulesetsFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useSimulateJbControllerLaunchRulesetsFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'launchRulesetsFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"migrateController"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useSimulateJbControllerMigrateController =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'migrateController',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"mintTokensOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useSimulateJbControllerMintTokensOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'mintTokensOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"payReservedTokenToTerminal"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useSimulateJbControllerPayReservedTokenToTerminal =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'payReservedTokenToTerminal',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"queueRulesetsOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useSimulateJbControllerQueueRulesetsOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'queueRulesetsOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"receiveMigrationFrom"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useSimulateJbControllerReceiveMigrationFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'receiveMigrationFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"sendReservedTokensToSplitsOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useSimulateJbControllerSendReservedTokensToSplitsOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'sendReservedTokensToSplitsOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"setSplitGroupsOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useSimulateJbControllerSetSplitGroupsOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'setSplitGroupsOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"setTokenFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useSimulateJbControllerSetTokenFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'setTokenFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"setUriOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useSimulateJbControllerSetUriOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'setUriOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbControllerAbi}__ and `functionName` set to `"transferCreditsFrom"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useSimulateJbControllerTransferCreditsFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    functionName: 'transferCreditsFrom',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useWatchJbControllerEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbControllerAbi,
    address: jbControllerAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"BurnTokens"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useWatchJbControllerBurnTokensEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    eventName: 'BurnTokens',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"LaunchProject"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useWatchJbControllerLaunchProjectEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    eventName: 'LaunchProject',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"LaunchRulesets"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useWatchJbControllerLaunchRulesetsEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    eventName: 'LaunchRulesets',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"MigrateController"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useWatchJbControllerMigrateControllerEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    eventName: 'MigrateController',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"MintTokens"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useWatchJbControllerMintTokensEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    eventName: 'MintTokens',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"PrepMigration"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useWatchJbControllerPrepMigrationEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    eventName: 'PrepMigration',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"QueueRulesets"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useWatchJbControllerQueueRulesetsEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    eventName: 'QueueRulesets',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"ReservedDistributionReverted"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useWatchJbControllerReservedDistributionRevertedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    eventName: 'ReservedDistributionReverted',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"SendReservedTokensToSplit"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useWatchJbControllerSendReservedTokensToSplitEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    eventName: 'SendReservedTokensToSplit',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"SendReservedTokensToSplits"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useWatchJbControllerSendReservedTokensToSplitsEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    eventName: 'SendReservedTokensToSplits',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbControllerAbi}__ and `eventName` set to `"SetMetadata"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x02AF7F7E55459592C93DBD25A55f110149DdfaeC)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x221f338f8a909D6daFAE553567b03968bFf79Be5)
 */
export const useWatchJbControllerSetMetadataEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbControllerAbi,
    address: jbControllerAddress,
    eventName: 'SetMetadata',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbDirectoryAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
 */
export const useReadJbDirectory = /*#__PURE__*/ createUseReadContract({
  abi: jbDirectoryAbi,
  address: jbDirectoryAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"PERMISSIONS"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
 */
export const useReadJbDirectoryProjects = /*#__PURE__*/ createUseReadContract({
  abi: jbDirectoryAbi,
  address: jbDirectoryAddress,
  functionName: 'PROJECTS',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"controllerOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
 */
export const useReadJbDirectoryOwner = /*#__PURE__*/ createUseReadContract({
  abi: jbDirectoryAbi,
  address: jbDirectoryAddress,
  functionName: 'owner',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"primaryTerminalOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
 */
export const useWriteJbDirectory = /*#__PURE__*/ createUseWriteContract({
  abi: jbDirectoryAbi,
  address: jbDirectoryAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
 */
export const useSimulateJbDirectory = /*#__PURE__*/ createUseSimulateContract({
  abi: jbDirectoryAbi,
  address: jbDirectoryAddress,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbDirectoryAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
 */
export const useWatchJbDirectoryEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbDirectoryAbi}__ and `eventName` set to `"AddTerminal"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4a0E06016e11d15C34B9902ECca70f7582A174A9)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xba2B0B3e9f930d0b8e5879487e33303438d3aa7c)
 */
export const useWatchJbDirectorySetTerminalsEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbDirectoryAbi,
    address: jbDirectoryAddress,
    eventName: 'SetTerminals',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useReadJbMultiTerminal = /*#__PURE__*/ createUseReadContract({
  abi: jbMultiTerminalAbi,
  address: jbMultiTerminalAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"DIRECTORY"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useReadJbMultiTerminalDirectory =
  /*#__PURE__*/ createUseReadContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'DIRECTORY',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"FEE"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useReadJbMultiTerminalFee = /*#__PURE__*/ createUseReadContract({
  abi: jbMultiTerminalAbi,
  address: jbMultiTerminalAddress,
  functionName: 'FEE',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"FEELESS_ADDRESSES"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useReadJbMultiTerminalFeelessAddresses =
  /*#__PURE__*/ createUseReadContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'FEELESS_ADDRESSES',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"PERMISSIONS"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useReadJbMultiTerminalPermissions =
  /*#__PURE__*/ createUseReadContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'PERMISSIONS',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"PERMIT2"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useReadJbMultiTerminalPermit2 =
  /*#__PURE__*/ createUseReadContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'PERMIT2',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"PROJECTS"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useReadJbMultiTerminalProjects =
  /*#__PURE__*/ createUseReadContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'PROJECTS',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"SPLITS"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useReadJbMultiTerminalSplits = /*#__PURE__*/ createUseReadContract(
  {
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'SPLITS',
  },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"STORE"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useReadJbMultiTerminalStore = /*#__PURE__*/ createUseReadContract({
  abi: jbMultiTerminalAbi,
  address: jbMultiTerminalAddress,
  functionName: 'STORE',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"accountingContextForTokenOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useReadJbMultiTerminalAccountingContextForTokenOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'accountingContextForTokenOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"accountingContextsOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useReadJbMultiTerminalAccountingContextsOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'accountingContextsOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"currentSurplusOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useReadJbMultiTerminalCurrentSurplusOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'currentSurplusOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"heldFeesOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useReadJbMultiTerminalHeldFeesOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'heldFeesOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"isTrustedForwarder"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useReadJbMultiTerminalIsTrustedForwarder =
  /*#__PURE__*/ createUseReadContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'isTrustedForwarder',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"supportsInterface"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useReadJbMultiTerminalSupportsInterface =
  /*#__PURE__*/ createUseReadContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'supportsInterface',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"trustedForwarder"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useReadJbMultiTerminalTrustedForwarder =
  /*#__PURE__*/ createUseReadContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'trustedForwarder',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useWriteJbMultiTerminal = /*#__PURE__*/ createUseWriteContract({
  abi: jbMultiTerminalAbi,
  address: jbMultiTerminalAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"addAccountingContextsFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useWriteJbMultiTerminalAddAccountingContextsFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'addAccountingContextsFor',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"addToBalanceOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useWriteJbMultiTerminalAddToBalanceOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'addToBalanceOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"executePayout"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useWriteJbMultiTerminalExecutePayout =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'executePayout',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"executeProcessFee"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useWriteJbMultiTerminalExecuteProcessFee =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'executeProcessFee',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"migrateBalanceOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useWriteJbMultiTerminalMigrateBalanceOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'migrateBalanceOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"pay"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useWriteJbMultiTerminalPay = /*#__PURE__*/ createUseWriteContract({
  abi: jbMultiTerminalAbi,
  address: jbMultiTerminalAddress,
  functionName: 'pay',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"processHeldFeesOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useWriteJbMultiTerminalProcessHeldFeesOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'processHeldFeesOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"redeemTokensOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useWriteJbMultiTerminalRedeemTokensOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'redeemTokensOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"sendPayoutsOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useWriteJbMultiTerminalSendPayoutsOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'sendPayoutsOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"useAllowanceOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useWriteJbMultiTerminalUseAllowanceOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'useAllowanceOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useSimulateJbMultiTerminal =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"addAccountingContextsFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useSimulateJbMultiTerminalAddAccountingContextsFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'addAccountingContextsFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"addToBalanceOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useSimulateJbMultiTerminalAddToBalanceOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'addToBalanceOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"executePayout"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useSimulateJbMultiTerminalExecutePayout =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'executePayout',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"executeProcessFee"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useSimulateJbMultiTerminalExecuteProcessFee =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'executeProcessFee',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"migrateBalanceOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useSimulateJbMultiTerminalMigrateBalanceOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'migrateBalanceOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"pay"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useSimulateJbMultiTerminalPay =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'pay',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"processHeldFeesOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useSimulateJbMultiTerminalProcessHeldFeesOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'processHeldFeesOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"redeemTokensOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useSimulateJbMultiTerminalRedeemTokensOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'redeemTokensOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"sendPayoutsOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useSimulateJbMultiTerminalSendPayoutsOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'sendPayoutsOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `functionName` set to `"useAllowanceOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useSimulateJbMultiTerminalUseAllowanceOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    functionName: 'useAllowanceOf',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useWatchJbMultiTerminalEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"AddToBalance"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useWatchJbMultiTerminalAddToBalanceEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    eventName: 'AddToBalance',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"FeeReverted"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useWatchJbMultiTerminalFeeRevertedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    eventName: 'FeeReverted',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"HoldFee"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useWatchJbMultiTerminalHoldFeeEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    eventName: 'HoldFee',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"HookAfterRecordPay"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useWatchJbMultiTerminalHookAfterRecordPayEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    eventName: 'HookAfterRecordPay',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"HookAfterRecordRedeem"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useWatchJbMultiTerminalHookAfterRecordRedeemEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    eventName: 'HookAfterRecordRedeem',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"MigrateTerminal"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useWatchJbMultiTerminalMigrateTerminalEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    eventName: 'MigrateTerminal',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"Pay"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useWatchJbMultiTerminalPayEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    eventName: 'Pay',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"PayoutReverted"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useWatchJbMultiTerminalPayoutRevertedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    eventName: 'PayoutReverted',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"ProcessFee"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useWatchJbMultiTerminalProcessFeeEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    eventName: 'ProcessFee',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"RedeemTokens"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useWatchJbMultiTerminalRedeemTokensEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    eventName: 'RedeemTokens',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"ReturnHeldFees"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useWatchJbMultiTerminalReturnHeldFeesEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    eventName: 'ReturnHeldFees',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"SendPayoutToSplit"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useWatchJbMultiTerminalSendPayoutToSplitEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    eventName: 'SendPayoutToSplit',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"SendPayouts"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useWatchJbMultiTerminalSendPayoutsEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    eventName: 'SendPayouts',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"SetAccountingContext"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useWatchJbMultiTerminalSetAccountingContextEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    eventName: 'SetAccountingContext',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbMultiTerminalAbi}__ and `eventName` set to `"UseAllowance"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3980ae5F6C10aF7628cbf9246932333d6927d7Dc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xcdF0B010fa61ac8D1fe567d1a81bCaC971802866)
 */
export const useWatchJbMultiTerminalUseAllowanceEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbMultiTerminalAbi,
    address: jbMultiTerminalAddress,
    eventName: 'UseAllowance',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbPermissionsAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x7f6318AbD7A6533E7deCeF89FE10Cd7985dbcd20)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4B24983d4546699Aa42EBa1eaBf189c08E6e8541)
 */
export const useReadJbPermissions = /*#__PURE__*/ createUseReadContract({
  abi: jbPermissionsAbi,
  address: jbPermissionsAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbPermissionsAbi}__ and `functionName` set to `"PERMISSIONS"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x7f6318AbD7A6533E7deCeF89FE10Cd7985dbcd20)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4B24983d4546699Aa42EBa1eaBf189c08E6e8541)
 */
export const useReadJbPermissionsPermissions =
  /*#__PURE__*/ createUseReadContract({
    abi: jbPermissionsAbi,
    address: jbPermissionsAddress,
    functionName: 'PERMISSIONS',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbPermissionsAbi}__ and `functionName` set to `"hasPermission"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x7f6318AbD7A6533E7deCeF89FE10Cd7985dbcd20)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4B24983d4546699Aa42EBa1eaBf189c08E6e8541)
 */
export const useReadJbPermissionsHasPermission =
  /*#__PURE__*/ createUseReadContract({
    abi: jbPermissionsAbi,
    address: jbPermissionsAddress,
    functionName: 'hasPermission',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbPermissionsAbi}__ and `functionName` set to `"hasPermissions"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x7f6318AbD7A6533E7deCeF89FE10Cd7985dbcd20)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4B24983d4546699Aa42EBa1eaBf189c08E6e8541)
 */
export const useReadJbPermissionsHasPermissions =
  /*#__PURE__*/ createUseReadContract({
    abi: jbPermissionsAbi,
    address: jbPermissionsAddress,
    functionName: 'hasPermissions',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbPermissionsAbi}__ and `functionName` set to `"permissionsOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x7f6318AbD7A6533E7deCeF89FE10Cd7985dbcd20)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4B24983d4546699Aa42EBa1eaBf189c08E6e8541)
 */
export const useReadJbPermissionsPermissionsOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbPermissionsAbi,
    address: jbPermissionsAddress,
    functionName: 'permissionsOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbPermissionsAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x7f6318AbD7A6533E7deCeF89FE10Cd7985dbcd20)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4B24983d4546699Aa42EBa1eaBf189c08E6e8541)
 */
export const useWriteJbPermissions = /*#__PURE__*/ createUseWriteContract({
  abi: jbPermissionsAbi,
  address: jbPermissionsAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbPermissionsAbi}__ and `functionName` set to `"setPermissionsFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x7f6318AbD7A6533E7deCeF89FE10Cd7985dbcd20)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4B24983d4546699Aa42EBa1eaBf189c08E6e8541)
 */
export const useWriteJbPermissionsSetPermissionsFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbPermissionsAbi,
    address: jbPermissionsAddress,
    functionName: 'setPermissionsFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbPermissionsAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x7f6318AbD7A6533E7deCeF89FE10Cd7985dbcd20)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4B24983d4546699Aa42EBa1eaBf189c08E6e8541)
 */
export const useSimulateJbPermissions = /*#__PURE__*/ createUseSimulateContract(
  { abi: jbPermissionsAbi, address: jbPermissionsAddress },
)

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbPermissionsAbi}__ and `functionName` set to `"setPermissionsFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x7f6318AbD7A6533E7deCeF89FE10Cd7985dbcd20)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4B24983d4546699Aa42EBa1eaBf189c08E6e8541)
 */
export const useSimulateJbPermissionsSetPermissionsFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbPermissionsAbi,
    address: jbPermissionsAddress,
    functionName: 'setPermissionsFor',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbPermissionsAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x7f6318AbD7A6533E7deCeF89FE10Cd7985dbcd20)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4B24983d4546699Aa42EBa1eaBf189c08E6e8541)
 */
export const useWatchJbPermissionsEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbPermissionsAbi,
    address: jbPermissionsAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbPermissionsAbi}__ and `eventName` set to `"OperatorPermissionsSet"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x7f6318AbD7A6533E7deCeF89FE10Cd7985dbcd20)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x4B24983d4546699Aa42EBa1eaBf189c08E6e8541)
 */
export const useWatchJbPermissionsOperatorPermissionsSetEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbPermissionsAbi,
    address: jbPermissionsAddress,
    eventName: 'OperatorPermissionsSet',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useReadJbProjects = /*#__PURE__*/ createUseReadContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"CLOCK_MODE"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useReadJbProjectsClockMode = /*#__PURE__*/ createUseReadContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
  functionName: 'CLOCK_MODE',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"balanceOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useReadJbProjectsBalanceOf = /*#__PURE__*/ createUseReadContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
  functionName: 'balanceOf',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"clock"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useReadJbProjectsClock = /*#__PURE__*/ createUseReadContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
  functionName: 'clock',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"count"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useReadJbProjectsCount = /*#__PURE__*/ createUseReadContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
  functionName: 'count',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"delegates"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useReadJbProjectsDelegates = /*#__PURE__*/ createUseReadContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
  functionName: 'delegates',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"eip712Domain"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useReadJbProjectsEip712Domain =
  /*#__PURE__*/ createUseReadContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'eip712Domain',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"getApproved"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useReadJbProjectsGetApproved = /*#__PURE__*/ createUseReadContract(
  {
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'getApproved',
  },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"getPastTotalSupply"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useReadJbProjectsGetPastTotalSupply =
  /*#__PURE__*/ createUseReadContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'getPastTotalSupply',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"getPastVotes"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useReadJbProjectsGetPastVotes =
  /*#__PURE__*/ createUseReadContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'getPastVotes',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"getVotes"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useReadJbProjectsGetVotes = /*#__PURE__*/ createUseReadContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
  functionName: 'getVotes',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"isApprovedForAll"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useReadJbProjectsIsApprovedForAll =
  /*#__PURE__*/ createUseReadContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'isApprovedForAll',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"name"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useReadJbProjectsName = /*#__PURE__*/ createUseReadContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
  functionName: 'name',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"nonces"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useReadJbProjectsNonces = /*#__PURE__*/ createUseReadContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
  functionName: 'nonces',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"owner"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useReadJbProjectsOwner = /*#__PURE__*/ createUseReadContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
  functionName: 'owner',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"ownerOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useReadJbProjectsOwnerOf = /*#__PURE__*/ createUseReadContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
  functionName: 'ownerOf',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"supportsInterface"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useReadJbProjectsSupportsInterface =
  /*#__PURE__*/ createUseReadContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'supportsInterface',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"symbol"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useReadJbProjectsSymbol = /*#__PURE__*/ createUseReadContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
  functionName: 'symbol',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"tokenURI"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useReadJbProjectsTokenUri = /*#__PURE__*/ createUseReadContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
  functionName: 'tokenURI',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"tokenUriResolver"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useReadJbProjectsTokenUriResolver =
  /*#__PURE__*/ createUseReadContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'tokenUriResolver',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbProjectsAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useWriteJbProjects = /*#__PURE__*/ createUseWriteContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"approve"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useWriteJbProjectsApprove = /*#__PURE__*/ createUseWriteContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
  functionName: 'approve',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"createFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useWriteJbProjectsCreateFor = /*#__PURE__*/ createUseWriteContract(
  { abi: jbProjectsAbi, address: jbProjectsAddress, functionName: 'createFor' },
)

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"delegate"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useWriteJbProjectsDelegate = /*#__PURE__*/ createUseWriteContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
  functionName: 'delegate',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"delegateBySig"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useWriteJbProjectsDelegateBySig =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'delegateBySig',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useWriteJbProjectsRenounceOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"safeTransferFrom"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useWriteJbProjectsSafeTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"setApprovalForAll"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useWriteJbProjectsSetApprovalForAll =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"setTokenUriResolver"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useWriteJbProjectsSetTokenUriResolver =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'setTokenUriResolver',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"transferFrom"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useWriteJbProjectsTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useWriteJbProjectsTransferOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbProjectsAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useSimulateJbProjects = /*#__PURE__*/ createUseSimulateContract({
  abi: jbProjectsAbi,
  address: jbProjectsAddress,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"approve"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useSimulateJbProjectsApprove =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'approve',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"createFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useSimulateJbProjectsCreateFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'createFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"delegate"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useSimulateJbProjectsDelegate =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'delegate',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"delegateBySig"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useSimulateJbProjectsDelegateBySig =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'delegateBySig',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useSimulateJbProjectsRenounceOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"safeTransferFrom"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useSimulateJbProjectsSafeTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"setApprovalForAll"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useSimulateJbProjectsSetApprovalForAll =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"setTokenUriResolver"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useSimulateJbProjectsSetTokenUriResolver =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'setTokenUriResolver',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"transferFrom"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useSimulateJbProjectsTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbProjectsAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useSimulateJbProjectsTransferOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbProjectsAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useWatchJbProjectsEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbProjectsAbi}__ and `eventName` set to `"Approval"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useWatchJbProjectsApprovalEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    eventName: 'Approval',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbProjectsAbi}__ and `eventName` set to `"ApprovalForAll"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useWatchJbProjectsApprovalForAllEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    eventName: 'ApprovalForAll',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbProjectsAbi}__ and `eventName` set to `"Create"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useWatchJbProjectsCreateEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    eventName: 'Create',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbProjectsAbi}__ and `eventName` set to `"DelegateChanged"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useWatchJbProjectsDelegateChangedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    eventName: 'DelegateChanged',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbProjectsAbi}__ and `eventName` set to `"DelegateVotesChanged"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useWatchJbProjectsDelegateVotesChangedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    eventName: 'DelegateVotesChanged',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbProjectsAbi}__ and `eventName` set to `"EIP712DomainChanged"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useWatchJbProjectsEip712DomainChangedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    eventName: 'EIP712DomainChanged',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbProjectsAbi}__ and `eventName` set to `"OwnershipTransferred"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useWatchJbProjectsOwnershipTransferredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbProjectsAbi}__ and `eventName` set to `"SetTokenUriResolver"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useWatchJbProjectsSetTokenUriResolverEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    eventName: 'SetTokenUriResolver',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbProjectsAbi}__ and `eventName` set to `"Transfer"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xA2344fc40695cc7626904CCD4ef919487AffC184)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x65b25F762123CB4a2A950a45d820D9d4050E1a97)
 */
export const useWatchJbProjectsTransferEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbProjectsAbi,
    address: jbProjectsAddress,
    eventName: 'Transfer',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbRulesetsAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x378B37147261Cb4ee39F1deadbdB1EfCfE467bD2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x82Ef92b555a12187aa319097f1ca419CD27160d1)
 */
export const useReadJbRulesets = /*#__PURE__*/ createUseReadContract({
  abi: jbRulesetsAbi,
  address: jbRulesetsAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"DIRECTORY"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x378B37147261Cb4ee39F1deadbdB1EfCfE467bD2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x82Ef92b555a12187aa319097f1ca419CD27160d1)
 */
export const useReadJbRulesetsDirectory = /*#__PURE__*/ createUseReadContract({
  abi: jbRulesetsAbi,
  address: jbRulesetsAddress,
  functionName: 'DIRECTORY',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"currentApprovalStatusForLatestRulesetOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x378B37147261Cb4ee39F1deadbdB1EfCfE467bD2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x82Ef92b555a12187aa319097f1ca419CD27160d1)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x378B37147261Cb4ee39F1deadbdB1EfCfE467bD2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x82Ef92b555a12187aa319097f1ca419CD27160d1)
 */
export const useReadJbRulesetsCurrentOf = /*#__PURE__*/ createUseReadContract({
  abi: jbRulesetsAbi,
  address: jbRulesetsAddress,
  functionName: 'currentOf',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"getRulesetOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x378B37147261Cb4ee39F1deadbdB1EfCfE467bD2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x82Ef92b555a12187aa319097f1ca419CD27160d1)
 */
export const useReadJbRulesetsGetRulesetOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbRulesetsAbi,
    address: jbRulesetsAddress,
    functionName: 'getRulesetOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"latestQueuedRulesetOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x378B37147261Cb4ee39F1deadbdB1EfCfE467bD2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x82Ef92b555a12187aa319097f1ca419CD27160d1)
 */
export const useReadJbRulesetsLatestQueuedRulesetOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbRulesetsAbi,
    address: jbRulesetsAddress,
    functionName: 'latestQueuedRulesetOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"latestRulesetIdOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x378B37147261Cb4ee39F1deadbdB1EfCfE467bD2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x82Ef92b555a12187aa319097f1ca419CD27160d1)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x378B37147261Cb4ee39F1deadbdB1EfCfE467bD2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x82Ef92b555a12187aa319097f1ca419CD27160d1)
 */
export const useReadJbRulesetsRulesetsOf = /*#__PURE__*/ createUseReadContract({
  abi: jbRulesetsAbi,
  address: jbRulesetsAddress,
  functionName: 'rulesetsOf',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"upcomingRulesetOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x378B37147261Cb4ee39F1deadbdB1EfCfE467bD2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x82Ef92b555a12187aa319097f1ca419CD27160d1)
 */
export const useReadJbRulesetsUpcomingRulesetOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbRulesetsAbi,
    address: jbRulesetsAddress,
    functionName: 'upcomingRulesetOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbRulesetsAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x378B37147261Cb4ee39F1deadbdB1EfCfE467bD2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x82Ef92b555a12187aa319097f1ca419CD27160d1)
 */
export const useWriteJbRulesets = /*#__PURE__*/ createUseWriteContract({
  abi: jbRulesetsAbi,
  address: jbRulesetsAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"queueFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x378B37147261Cb4ee39F1deadbdB1EfCfE467bD2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x82Ef92b555a12187aa319097f1ca419CD27160d1)
 */
export const useWriteJbRulesetsQueueFor = /*#__PURE__*/ createUseWriteContract({
  abi: jbRulesetsAbi,
  address: jbRulesetsAddress,
  functionName: 'queueFor',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"updateRulesetWeightCache"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x378B37147261Cb4ee39F1deadbdB1EfCfE467bD2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x82Ef92b555a12187aa319097f1ca419CD27160d1)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x378B37147261Cb4ee39F1deadbdB1EfCfE467bD2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x82Ef92b555a12187aa319097f1ca419CD27160d1)
 */
export const useSimulateJbRulesets = /*#__PURE__*/ createUseSimulateContract({
  abi: jbRulesetsAbi,
  address: jbRulesetsAddress,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbRulesetsAbi}__ and `functionName` set to `"queueFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x378B37147261Cb4ee39F1deadbdB1EfCfE467bD2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x82Ef92b555a12187aa319097f1ca419CD27160d1)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x378B37147261Cb4ee39F1deadbdB1EfCfE467bD2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x82Ef92b555a12187aa319097f1ca419CD27160d1)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x378B37147261Cb4ee39F1deadbdB1EfCfE467bD2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x82Ef92b555a12187aa319097f1ca419CD27160d1)
 */
export const useWatchJbRulesetsEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbRulesetsAbi,
    address: jbRulesetsAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbRulesetsAbi}__ and `eventName` set to `"RulesetInitialized"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x378B37147261Cb4ee39F1deadbdB1EfCfE467bD2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x82Ef92b555a12187aa319097f1ca419CD27160d1)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x378B37147261Cb4ee39F1deadbdB1EfCfE467bD2)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x82Ef92b555a12187aa319097f1ca419CD27160d1)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2C55541689Be91d8912f383749A4Fd3C267A63f4)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x0dA1172F3a30710Af4943EB3E783c25B6562e60F)
 */
export const useReadJbSplits = /*#__PURE__*/ createUseReadContract({
  abi: jbSplitsAbi,
  address: jbSplitsAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbSplitsAbi}__ and `functionName` set to `"DIRECTORY"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2C55541689Be91d8912f383749A4Fd3C267A63f4)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x0dA1172F3a30710Af4943EB3E783c25B6562e60F)
 */
export const useReadJbSplitsDirectory = /*#__PURE__*/ createUseReadContract({
  abi: jbSplitsAbi,
  address: jbSplitsAddress,
  functionName: 'DIRECTORY',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbSplitsAbi}__ and `functionName` set to `"FALLBACK_RULESET_ID"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2C55541689Be91d8912f383749A4Fd3C267A63f4)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x0dA1172F3a30710Af4943EB3E783c25B6562e60F)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2C55541689Be91d8912f383749A4Fd3C267A63f4)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x0dA1172F3a30710Af4943EB3E783c25B6562e60F)
 */
export const useReadJbSplitsSplitsOf = /*#__PURE__*/ createUseReadContract({
  abi: jbSplitsAbi,
  address: jbSplitsAddress,
  functionName: 'splitsOf',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbSplitsAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2C55541689Be91d8912f383749A4Fd3C267A63f4)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x0dA1172F3a30710Af4943EB3E783c25B6562e60F)
 */
export const useWriteJbSplits = /*#__PURE__*/ createUseWriteContract({
  abi: jbSplitsAbi,
  address: jbSplitsAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbSplitsAbi}__ and `functionName` set to `"setSplitGroupsOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2C55541689Be91d8912f383749A4Fd3C267A63f4)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x0dA1172F3a30710Af4943EB3E783c25B6562e60F)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2C55541689Be91d8912f383749A4Fd3C267A63f4)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x0dA1172F3a30710Af4943EB3E783c25B6562e60F)
 */
export const useSimulateJbSplits = /*#__PURE__*/ createUseSimulateContract({
  abi: jbSplitsAbi,
  address: jbSplitsAddress,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbSplitsAbi}__ and `functionName` set to `"setSplitGroupsOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2C55541689Be91d8912f383749A4Fd3C267A63f4)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x0dA1172F3a30710Af4943EB3E783c25B6562e60F)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2C55541689Be91d8912f383749A4Fd3C267A63f4)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x0dA1172F3a30710Af4943EB3E783c25B6562e60F)
 */
export const useWatchJbSplitsEvent = /*#__PURE__*/ createUseWatchContractEvent({
  abi: jbSplitsAbi,
  address: jbSplitsAddress,
})

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbSplitsAbi}__ and `eventName` set to `"SetSplit"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2C55541689Be91d8912f383749A4Fd3C267A63f4)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x0dA1172F3a30710Af4943EB3E783c25B6562e60F)
 */
export const useWatchJbSplitsSetSplitEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbSplitsAbi,
    address: jbSplitsAddress,
    eventName: 'SetSplit',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6Fb249E55C472fF83dF6F3cDF09A0f414ea9635b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xe9DD4eA90e996d065A3d1082Dbd2adB69B3Ce5A1)
 */
export const useReadJbTerminalStore = /*#__PURE__*/ createUseReadContract({
  abi: jbTerminalStoreAbi,
  address: jbTerminalStoreAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"DIRECTORY"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6Fb249E55C472fF83dF6F3cDF09A0f414ea9635b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xe9DD4eA90e996d065A3d1082Dbd2adB69B3Ce5A1)
 */
export const useReadJbTerminalStoreDirectory =
  /*#__PURE__*/ createUseReadContract({
    abi: jbTerminalStoreAbi,
    address: jbTerminalStoreAddress,
    functionName: 'DIRECTORY',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"PRICES"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6Fb249E55C472fF83dF6F3cDF09A0f414ea9635b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xe9DD4eA90e996d065A3d1082Dbd2adB69B3Ce5A1)
 */
export const useReadJbTerminalStorePrices = /*#__PURE__*/ createUseReadContract(
  {
    abi: jbTerminalStoreAbi,
    address: jbTerminalStoreAddress,
    functionName: 'PRICES',
  },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"RULESETS"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6Fb249E55C472fF83dF6F3cDF09A0f414ea9635b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xe9DD4eA90e996d065A3d1082Dbd2adB69B3Ce5A1)
 */
export const useReadJbTerminalStoreRulesets =
  /*#__PURE__*/ createUseReadContract({
    abi: jbTerminalStoreAbi,
    address: jbTerminalStoreAddress,
    functionName: 'RULESETS',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"balanceOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6Fb249E55C472fF83dF6F3cDF09A0f414ea9635b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xe9DD4eA90e996d065A3d1082Dbd2adB69B3Ce5A1)
 */
export const useReadJbTerminalStoreBalanceOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbTerminalStoreAbi,
    address: jbTerminalStoreAddress,
    functionName: 'balanceOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"currentReclaimableSurplusOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6Fb249E55C472fF83dF6F3cDF09A0f414ea9635b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xe9DD4eA90e996d065A3d1082Dbd2adB69B3Ce5A1)
 */
export const useReadJbTerminalStoreCurrentReclaimableSurplusOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbTerminalStoreAbi,
    address: jbTerminalStoreAddress,
    functionName: 'currentReclaimableSurplusOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"currentSurplusOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6Fb249E55C472fF83dF6F3cDF09A0f414ea9635b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xe9DD4eA90e996d065A3d1082Dbd2adB69B3Ce5A1)
 */
export const useReadJbTerminalStoreCurrentSurplusOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbTerminalStoreAbi,
    address: jbTerminalStoreAddress,
    functionName: 'currentSurplusOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"currentTotalSurplusOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6Fb249E55C472fF83dF6F3cDF09A0f414ea9635b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xe9DD4eA90e996d065A3d1082Dbd2adB69B3Ce5A1)
 */
export const useReadJbTerminalStoreCurrentTotalSurplusOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbTerminalStoreAbi,
    address: jbTerminalStoreAddress,
    functionName: 'currentTotalSurplusOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"usedPayoutLimitOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6Fb249E55C472fF83dF6F3cDF09A0f414ea9635b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xe9DD4eA90e996d065A3d1082Dbd2adB69B3Ce5A1)
 */
export const useReadJbTerminalStoreUsedPayoutLimitOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbTerminalStoreAbi,
    address: jbTerminalStoreAddress,
    functionName: 'usedPayoutLimitOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"usedSurplusAllowanceOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6Fb249E55C472fF83dF6F3cDF09A0f414ea9635b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xe9DD4eA90e996d065A3d1082Dbd2adB69B3Ce5A1)
 */
export const useReadJbTerminalStoreUsedSurplusAllowanceOf =
  /*#__PURE__*/ createUseReadContract({
    abi: jbTerminalStoreAbi,
    address: jbTerminalStoreAddress,
    functionName: 'usedSurplusAllowanceOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6Fb249E55C472fF83dF6F3cDF09A0f414ea9635b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xe9DD4eA90e996d065A3d1082Dbd2adB69B3Ce5A1)
 */
export const useWriteJbTerminalStore = /*#__PURE__*/ createUseWriteContract({
  abi: jbTerminalStoreAbi,
  address: jbTerminalStoreAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordAddedBalanceFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6Fb249E55C472fF83dF6F3cDF09A0f414ea9635b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xe9DD4eA90e996d065A3d1082Dbd2adB69B3Ce5A1)
 */
export const useWriteJbTerminalStoreRecordAddedBalanceFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbTerminalStoreAbi,
    address: jbTerminalStoreAddress,
    functionName: 'recordAddedBalanceFor',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordPaymentFrom"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6Fb249E55C472fF83dF6F3cDF09A0f414ea9635b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xe9DD4eA90e996d065A3d1082Dbd2adB69B3Ce5A1)
 */
export const useWriteJbTerminalStoreRecordPaymentFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbTerminalStoreAbi,
    address: jbTerminalStoreAddress,
    functionName: 'recordPaymentFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordPayoutFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6Fb249E55C472fF83dF6F3cDF09A0f414ea9635b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xe9DD4eA90e996d065A3d1082Dbd2adB69B3Ce5A1)
 */
export const useWriteJbTerminalStoreRecordPayoutFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbTerminalStoreAbi,
    address: jbTerminalStoreAddress,
    functionName: 'recordPayoutFor',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordRedemptionFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6Fb249E55C472fF83dF6F3cDF09A0f414ea9635b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xe9DD4eA90e996d065A3d1082Dbd2adB69B3Ce5A1)
 */
export const useWriteJbTerminalStoreRecordRedemptionFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbTerminalStoreAbi,
    address: jbTerminalStoreAddress,
    functionName: 'recordRedemptionFor',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordTerminalMigration"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6Fb249E55C472fF83dF6F3cDF09A0f414ea9635b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xe9DD4eA90e996d065A3d1082Dbd2adB69B3Ce5A1)
 */
export const useWriteJbTerminalStoreRecordTerminalMigration =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbTerminalStoreAbi,
    address: jbTerminalStoreAddress,
    functionName: 'recordTerminalMigration',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordUsedAllowanceOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6Fb249E55C472fF83dF6F3cDF09A0f414ea9635b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xe9DD4eA90e996d065A3d1082Dbd2adB69B3Ce5A1)
 */
export const useWriteJbTerminalStoreRecordUsedAllowanceOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: jbTerminalStoreAbi,
    address: jbTerminalStoreAddress,
    functionName: 'recordUsedAllowanceOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6Fb249E55C472fF83dF6F3cDF09A0f414ea9635b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xe9DD4eA90e996d065A3d1082Dbd2adB69B3Ce5A1)
 */
export const useSimulateJbTerminalStore =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbTerminalStoreAbi,
    address: jbTerminalStoreAddress,
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordAddedBalanceFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6Fb249E55C472fF83dF6F3cDF09A0f414ea9635b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xe9DD4eA90e996d065A3d1082Dbd2adB69B3Ce5A1)
 */
export const useSimulateJbTerminalStoreRecordAddedBalanceFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbTerminalStoreAbi,
    address: jbTerminalStoreAddress,
    functionName: 'recordAddedBalanceFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordPaymentFrom"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6Fb249E55C472fF83dF6F3cDF09A0f414ea9635b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xe9DD4eA90e996d065A3d1082Dbd2adB69B3Ce5A1)
 */
export const useSimulateJbTerminalStoreRecordPaymentFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbTerminalStoreAbi,
    address: jbTerminalStoreAddress,
    functionName: 'recordPaymentFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordPayoutFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6Fb249E55C472fF83dF6F3cDF09A0f414ea9635b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xe9DD4eA90e996d065A3d1082Dbd2adB69B3Ce5A1)
 */
export const useSimulateJbTerminalStoreRecordPayoutFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbTerminalStoreAbi,
    address: jbTerminalStoreAddress,
    functionName: 'recordPayoutFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordRedemptionFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6Fb249E55C472fF83dF6F3cDF09A0f414ea9635b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xe9DD4eA90e996d065A3d1082Dbd2adB69B3Ce5A1)
 */
export const useSimulateJbTerminalStoreRecordRedemptionFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbTerminalStoreAbi,
    address: jbTerminalStoreAddress,
    functionName: 'recordRedemptionFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordTerminalMigration"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6Fb249E55C472fF83dF6F3cDF09A0f414ea9635b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xe9DD4eA90e996d065A3d1082Dbd2adB69B3Ce5A1)
 */
export const useSimulateJbTerminalStoreRecordTerminalMigration =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbTerminalStoreAbi,
    address: jbTerminalStoreAddress,
    functionName: 'recordTerminalMigration',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbTerminalStoreAbi}__ and `functionName` set to `"recordUsedAllowanceOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6Fb249E55C472fF83dF6F3cDF09A0f414ea9635b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xe9DD4eA90e996d065A3d1082Dbd2adB69B3Ce5A1)
 */
export const useSimulateJbTerminalStoreRecordUsedAllowanceOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: jbTerminalStoreAbi,
    address: jbTerminalStoreAddress,
    functionName: 'recordUsedAllowanceOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTokensAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
 */
export const useReadJbTokens = /*#__PURE__*/ createUseReadContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"DIRECTORY"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
 */
export const useReadJbTokensDirectory = /*#__PURE__*/ createUseReadContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
  functionName: 'DIRECTORY',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"creditBalanceOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
 */
export const useReadJbTokensProjectIdOf = /*#__PURE__*/ createUseReadContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
  functionName: 'projectIdOf',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"tokenOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
 */
export const useReadJbTokensTokenOf = /*#__PURE__*/ createUseReadContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
  functionName: 'tokenOf',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"totalBalanceOf"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
 */
export const useReadJbTokensTotalSupplyOf = /*#__PURE__*/ createUseReadContract(
  { abi: jbTokensAbi, address: jbTokensAddress, functionName: 'totalSupplyOf' },
)

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbTokensAbi}__
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
 */
export const useWriteJbTokens = /*#__PURE__*/ createUseWriteContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"burnFrom"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
 */
export const useWriteJbTokensBurnFrom = /*#__PURE__*/ createUseWriteContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
  functionName: 'burnFrom',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"claimTokensFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
 */
export const useWriteJbTokensMintFor = /*#__PURE__*/ createUseWriteContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
  functionName: 'mintFor',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"setTokenFor"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
 */
export const useWriteJbTokensSetTokenFor = /*#__PURE__*/ createUseWriteContract(
  { abi: jbTokensAbi, address: jbTokensAddress, functionName: 'setTokenFor' },
)

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"transferCreditsFrom"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
 */
export const useSimulateJbTokens = /*#__PURE__*/ createUseSimulateContract({
  abi: jbTokensAbi,
  address: jbTokensAddress,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link jbTokensAbi}__ and `functionName` set to `"burnFrom"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
 */
export const useWatchJbTokensEvent = /*#__PURE__*/ createUseWatchContractEvent({
  abi: jbTokensAbi,
  address: jbTokensAddress,
})

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link jbTokensAbi}__ and `eventName` set to `"Burn"`
 *
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
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
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xb2e00Cf642526a8a17d966F8f52605e77Bc6f709)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x52E1280E04618d2579d4800d8ad457C5068d0cd4)
 */
export const useWatchJbTokensTransferCreditsEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: jbTokensAbi,
    address: jbTokensAddress,
    eventName: 'TransferCredits',
  })
