import {
  createUseReadContract,
  createUseWriteContract,
  createUseSimulateContract,
  createUseWatchContractEvent,
} from 'wagmi/codegen'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// REVDeployer
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
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
            name: 'hook',
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
              {
                name: 'twapSlippageTolerance',
                internalType: 'uint32',
                type: 'uint32',
              },
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
            name: 'hook',
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
              {
                name: 'twapSlippageTolerance',
                internalType: 'uint32',
                type: 'uint32',
              },
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
            name: 'hook',
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
              {
                name: 'twapSlippageTolerance',
                internalType: 'uint32',
                type: 'uint32',
              },
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

/**
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const revDeployerAddress = {
  1: '0x027F1684c6D31066c3f2468117f2508e8134Fdfc',
  10: '0x027F1684c6D31066c3f2468117f2508e8134Fdfc',
  8453: '0x027F1684c6D31066c3f2468117f2508e8134Fdfc',
  42161: '0x027F1684c6D31066c3f2468117f2508e8134Fdfc',
  84532: '0x027F1684c6D31066c3f2468117f2508e8134Fdfc',
  421614: '0x027F1684c6D31066c3f2468117f2508e8134Fdfc',
  11155111: '0x027F1684c6D31066c3f2468117f2508e8134Fdfc',
  11155420: '0x027F1684c6D31066c3f2468117f2508e8134Fdfc',
} as const

/**
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const revDeployerConfig = {
  address: revDeployerAddress,
  abi: revDeployerAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// REVLoans
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
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

/**
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const revLoansAddress = {
  1: '0x03dE624FeB08C0eDeff779ca5702AEf4B85D7f06',
  10: '0x03dE624FeB08C0eDeff779ca5702AEf4B85D7f06',
  8453: '0x03dE624FeB08C0eDeff779ca5702AEf4B85D7f06',
  42161: '0x03dE624FeB08C0eDeff779ca5702AEf4B85D7f06',
  84532: '0x03dE624FeB08C0eDeff779ca5702AEf4B85D7f06',
  421614: '0x03dE624FeB08C0eDeff779ca5702AEf4B85D7f06',
  11155111: '0x03dE624FeB08C0eDeff779ca5702AEf4B85D7f06',
  11155420: '0x03dE624FeB08C0eDeff779ca5702AEf4B85D7f06',
} as const

/**
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const revLoansConfig = {
  address: revLoansAddress,
  abi: revLoansAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// REVLoans1_1
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
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
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const revLoans1_1Address = {
  1: '0xDE1E70fAF22024559e7D94aB814abD7e42CA849B',
  10: '0xDE1E70fAF22024559e7D94aB814abD7e42CA849B',
  8453: '0xDE1E70fAF22024559e7D94aB814abD7e42CA849B',
  42161: '0xDE1E70fAF22024559e7D94aB814abD7e42CA849B',
  84532: '0xDE1E70fAF22024559e7D94aB814abD7e42CA849B',
  421614: '0xDE1E70fAF22024559e7D94aB814abD7e42CA849B',
  11155111: '0xDE1E70fAF22024559e7D94aB814abD7e42CA849B',
  11155420: '0xDE1E70fAF22024559e7D94aB814abD7e42CA849B',
} as const

/**
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const revLoans1_1Config = {
  address: revLoans1_1Address,
  abi: revLoans1_1Abi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// React
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useReadRevDeployer = /*#__PURE__*/ createUseReadContract({
  abi: revDeployerAbi,
  address: revDeployerAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"CASH_OUT_DELAY"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useReadRevDeployerCashOutDelay =
  /*#__PURE__*/ createUseReadContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'CASH_OUT_DELAY',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"CONTROLLER"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useReadRevDeployerController = /*#__PURE__*/ createUseReadContract(
  {
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'CONTROLLER',
  },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"DIRECTORY"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useReadRevDeployerDirectory = /*#__PURE__*/ createUseReadContract({
  abi: revDeployerAbi,
  address: revDeployerAddress,
  functionName: 'DIRECTORY',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"FEE"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useReadRevDeployerFee = /*#__PURE__*/ createUseReadContract({
  abi: revDeployerAbi,
  address: revDeployerAddress,
  functionName: 'FEE',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"FEE_REVNET_ID"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useReadRevDeployerFeeRevnetId =
  /*#__PURE__*/ createUseReadContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'FEE_REVNET_ID',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"HOOK_DEPLOYER"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useReadRevDeployerHookDeployer =
  /*#__PURE__*/ createUseReadContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'HOOK_DEPLOYER',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"PERMISSIONS"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useReadRevDeployerPermissions =
  /*#__PURE__*/ createUseReadContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'PERMISSIONS',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"PROJECTS"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useReadRevDeployerProjects = /*#__PURE__*/ createUseReadContract({
  abi: revDeployerAbi,
  address: revDeployerAddress,
  functionName: 'PROJECTS',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"PUBLISHER"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useReadRevDeployerPublisher = /*#__PURE__*/ createUseReadContract({
  abi: revDeployerAbi,
  address: revDeployerAddress,
  functionName: 'PUBLISHER',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"SUCKER_REGISTRY"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useReadRevDeployerSuckerRegistry =
  /*#__PURE__*/ createUseReadContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'SUCKER_REGISTRY',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"amountToAutoIssue"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useReadRevDeployerAmountToAutoIssue =
  /*#__PURE__*/ createUseReadContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'amountToAutoIssue',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"beforeCashOutRecordedWith"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useReadRevDeployerBeforeCashOutRecordedWith =
  /*#__PURE__*/ createUseReadContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'beforeCashOutRecordedWith',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"beforePayRecordedWith"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useReadRevDeployerBeforePayRecordedWith =
  /*#__PURE__*/ createUseReadContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'beforePayRecordedWith',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"buybackHookOf"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useReadRevDeployerBuybackHookOf =
  /*#__PURE__*/ createUseReadContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'buybackHookOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"cashOutDelayOf"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useReadRevDeployerCashOutDelayOf =
  /*#__PURE__*/ createUseReadContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'cashOutDelayOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"hasMintPermissionFor"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useReadRevDeployerHasMintPermissionFor =
  /*#__PURE__*/ createUseReadContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'hasMintPermissionFor',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"hashedEncodedConfigurationOf"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useReadRevDeployerHashedEncodedConfigurationOf =
  /*#__PURE__*/ createUseReadContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'hashedEncodedConfigurationOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"isSplitOperatorOf"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useReadRevDeployerIsSplitOperatorOf =
  /*#__PURE__*/ createUseReadContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'isSplitOperatorOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"isTrustedForwarder"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useReadRevDeployerIsTrustedForwarder =
  /*#__PURE__*/ createUseReadContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'isTrustedForwarder',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"loansOf"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useReadRevDeployerLoansOf = /*#__PURE__*/ createUseReadContract({
  abi: revDeployerAbi,
  address: revDeployerAddress,
  functionName: 'loansOf',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"onERC721Received"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useReadRevDeployerOnErc721Received =
  /*#__PURE__*/ createUseReadContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'onERC721Received',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"supportsInterface"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useReadRevDeployerSupportsInterface =
  /*#__PURE__*/ createUseReadContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'supportsInterface',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"tiered721HookOf"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useReadRevDeployerTiered721HookOf =
  /*#__PURE__*/ createUseReadContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'tiered721HookOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"trustedForwarder"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useReadRevDeployerTrustedForwarder =
  /*#__PURE__*/ createUseReadContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'trustedForwarder',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revDeployerAbi}__
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useWriteRevDeployer = /*#__PURE__*/ createUseWriteContract({
  abi: revDeployerAbi,
  address: revDeployerAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"afterCashOutRecordedWith"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useWriteRevDeployerAfterCashOutRecordedWith =
  /*#__PURE__*/ createUseWriteContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'afterCashOutRecordedWith',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"autoIssueFor"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useWriteRevDeployerAutoIssueFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'autoIssueFor',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"deployFor"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useWriteRevDeployerDeployFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'deployFor',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"deploySuckersFor"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useWriteRevDeployerDeploySuckersFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'deploySuckersFor',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"deployWith721sFor"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useWriteRevDeployerDeployWith721sFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'deployWith721sFor',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"setSplitOperatorOf"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useWriteRevDeployerSetSplitOperatorOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'setSplitOperatorOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revDeployerAbi}__
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useSimulateRevDeployer = /*#__PURE__*/ createUseSimulateContract({
  abi: revDeployerAbi,
  address: revDeployerAddress,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"afterCashOutRecordedWith"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useSimulateRevDeployerAfterCashOutRecordedWith =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'afterCashOutRecordedWith',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"autoIssueFor"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useSimulateRevDeployerAutoIssueFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'autoIssueFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"deployFor"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useSimulateRevDeployerDeployFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'deployFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"deploySuckersFor"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useSimulateRevDeployerDeploySuckersFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'deploySuckersFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"deployWith721sFor"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useSimulateRevDeployerDeployWith721sFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'deployWith721sFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"setSplitOperatorOf"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useSimulateRevDeployerSetSplitOperatorOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'setSplitOperatorOf',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revDeployerAbi}__
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useWatchRevDeployerEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revDeployerAbi,
    address: revDeployerAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revDeployerAbi}__ and `eventName` set to `"AutoIssue"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useWatchRevDeployerAutoIssueEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    eventName: 'AutoIssue',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revDeployerAbi}__ and `eventName` set to `"DeployRevnet"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useWatchRevDeployerDeployRevnetEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    eventName: 'DeployRevnet',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revDeployerAbi}__ and `eventName` set to `"DeploySuckers"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useWatchRevDeployerDeploySuckersEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    eventName: 'DeploySuckers',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revDeployerAbi}__ and `eventName` set to `"ReplaceSplitOperator"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useWatchRevDeployerReplaceSplitOperatorEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    eventName: 'ReplaceSplitOperator',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revDeployerAbi}__ and `eventName` set to `"SetAdditionalOperator"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useWatchRevDeployerSetAdditionalOperatorEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    eventName: 'SetAdditionalOperator',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revDeployerAbi}__ and `eventName` set to `"SetCashOutDelay"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useWatchRevDeployerSetCashOutDelayEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    eventName: 'SetCashOutDelay',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revDeployerAbi}__ and `eventName` set to `"StoreAutoIssuanceAmount"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x027f1684c6d31066c3f2468117f2508e8134fdfc)
 */
export const useWatchRevDeployerStoreAutoIssuanceAmountEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    eventName: 'StoreAutoIssuanceAmount',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoans = /*#__PURE__*/ createUseReadContract({
  abi: revLoansAbi,
  address: revLoansAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"CONTROLLER"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansController = /*#__PURE__*/ createUseReadContract({
  abi: revLoansAbi,
  address: revLoansAddress,
  functionName: 'CONTROLLER',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"DIRECTORY"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansDirectory = /*#__PURE__*/ createUseReadContract({
  abi: revLoansAbi,
  address: revLoansAddress,
  functionName: 'DIRECTORY',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"LOAN_LIQUIDATION_DURATION"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansLoanLiquidationDuration =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'LOAN_LIQUIDATION_DURATION',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"MAX_PREPAID_FEE_PERCENT"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansMaxPrepaidFeePercent =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'MAX_PREPAID_FEE_PERCENT',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"MIN_PREPAID_FEE_PERCENT"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansMinPrepaidFeePercent =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'MIN_PREPAID_FEE_PERCENT',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"PERMIT2"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansPermit2 = /*#__PURE__*/ createUseReadContract({
  abi: revLoansAbi,
  address: revLoansAddress,
  functionName: 'PERMIT2',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"PRICES"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansPrices = /*#__PURE__*/ createUseReadContract({
  abi: revLoansAbi,
  address: revLoansAddress,
  functionName: 'PRICES',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"PROJECTS"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansProjects = /*#__PURE__*/ createUseReadContract({
  abi: revLoansAbi,
  address: revLoansAddress,
  functionName: 'PROJECTS',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"REVNETS"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansRevnets = /*#__PURE__*/ createUseReadContract({
  abi: revLoansAbi,
  address: revLoansAddress,
  functionName: 'REVNETS',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"REV_ID"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansRevId = /*#__PURE__*/ createUseReadContract({
  abi: revLoansAbi,
  address: revLoansAddress,
  functionName: 'REV_ID',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"REV_PREPAID_FEE_PERCENT"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansRevPrepaidFeePercent =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'REV_PREPAID_FEE_PERCENT',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"balanceOf"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansBalanceOf = /*#__PURE__*/ createUseReadContract({
  abi: revLoansAbi,
  address: revLoansAddress,
  functionName: 'balanceOf',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"borrowableAmountFrom"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansBorrowableAmountFrom =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'borrowableAmountFrom',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"determineSourceFeeAmount"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansDetermineSourceFeeAmount =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'determineSourceFeeAmount',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"getApproved"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansGetApproved = /*#__PURE__*/ createUseReadContract({
  abi: revLoansAbi,
  address: revLoansAddress,
  functionName: 'getApproved',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"isApprovedForAll"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansIsApprovedForAll =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'isApprovedForAll',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"isLoanSourceOf"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansIsLoanSourceOf =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'isLoanSourceOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"isTrustedForwarder"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansIsTrustedForwarder =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'isTrustedForwarder',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"loanOf"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansLoanOf = /*#__PURE__*/ createUseReadContract({
  abi: revLoansAbi,
  address: revLoansAddress,
  functionName: 'loanOf',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"loanSourcesOf"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansLoanSourcesOf = /*#__PURE__*/ createUseReadContract(
  { abi: revLoansAbi, address: revLoansAddress, functionName: 'loanSourcesOf' },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"name"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansName = /*#__PURE__*/ createUseReadContract({
  abi: revLoansAbi,
  address: revLoansAddress,
  functionName: 'name',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"numberOfLoansFor"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansNumberOfLoansFor =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'numberOfLoansFor',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"owner"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansOwner = /*#__PURE__*/ createUseReadContract({
  abi: revLoansAbi,
  address: revLoansAddress,
  functionName: 'owner',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"ownerOf"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansOwnerOf = /*#__PURE__*/ createUseReadContract({
  abi: revLoansAbi,
  address: revLoansAddress,
  functionName: 'ownerOf',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"revnetIdOfLoanWith"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansRevnetIdOfLoanWith =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'revnetIdOfLoanWith',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"supportsInterface"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansSupportsInterface =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'supportsInterface',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"symbol"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansSymbol = /*#__PURE__*/ createUseReadContract({
  abi: revLoansAbi,
  address: revLoansAddress,
  functionName: 'symbol',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"tokenURI"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansTokenUri = /*#__PURE__*/ createUseReadContract({
  abi: revLoansAbi,
  address: revLoansAddress,
  functionName: 'tokenURI',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"tokenUriResolver"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansTokenUriResolver =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'tokenUriResolver',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"totalBorrowedFrom"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansTotalBorrowedFrom =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'totalBorrowedFrom',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"totalCollateralOf"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansTotalCollateralOf =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'totalCollateralOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"trustedForwarder"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useReadRevLoansTrustedForwarder =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'trustedForwarder',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revLoansAbi}__
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useWriteRevLoans = /*#__PURE__*/ createUseWriteContract({
  abi: revLoansAbi,
  address: revLoansAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"approve"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useWriteRevLoansApprove = /*#__PURE__*/ createUseWriteContract({
  abi: revLoansAbi,
  address: revLoansAddress,
  functionName: 'approve',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"borrowFrom"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useWriteRevLoansBorrowFrom = /*#__PURE__*/ createUseWriteContract({
  abi: revLoansAbi,
  address: revLoansAddress,
  functionName: 'borrowFrom',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"liquidateExpiredLoansFrom"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useWriteRevLoansLiquidateExpiredLoansFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'liquidateExpiredLoansFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"reallocateCollateralFromLoan"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useWriteRevLoansReallocateCollateralFromLoan =
  /*#__PURE__*/ createUseWriteContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'reallocateCollateralFromLoan',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useWriteRevLoansRenounceOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"repayLoan"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useWriteRevLoansRepayLoan = /*#__PURE__*/ createUseWriteContract({
  abi: revLoansAbi,
  address: revLoansAddress,
  functionName: 'repayLoan',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"safeTransferFrom"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useWriteRevLoansSafeTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"setApprovalForAll"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useWriteRevLoansSetApprovalForAll =
  /*#__PURE__*/ createUseWriteContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"setTokenUriResolver"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useWriteRevLoansSetTokenUriResolver =
  /*#__PURE__*/ createUseWriteContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'setTokenUriResolver',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"transferFrom"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useWriteRevLoansTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useWriteRevLoansTransferOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revLoansAbi}__
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useSimulateRevLoans = /*#__PURE__*/ createUseSimulateContract({
  abi: revLoansAbi,
  address: revLoansAddress,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"approve"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useSimulateRevLoansApprove =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'approve',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"borrowFrom"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useSimulateRevLoansBorrowFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'borrowFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"liquidateExpiredLoansFrom"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useSimulateRevLoansLiquidateExpiredLoansFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'liquidateExpiredLoansFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"reallocateCollateralFromLoan"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useSimulateRevLoansReallocateCollateralFromLoan =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'reallocateCollateralFromLoan',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useSimulateRevLoansRenounceOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"repayLoan"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useSimulateRevLoansRepayLoan =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'repayLoan',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"safeTransferFrom"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useSimulateRevLoansSafeTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"setApprovalForAll"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useSimulateRevLoansSetApprovalForAll =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"setTokenUriResolver"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useSimulateRevLoansSetTokenUriResolver =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'setTokenUriResolver',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"transferFrom"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useSimulateRevLoansTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revLoansAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useSimulateRevLoansTransferOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revLoansAbi,
    address: revLoansAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revLoansAbi}__
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useWatchRevLoansEvent = /*#__PURE__*/ createUseWatchContractEvent({
  abi: revLoansAbi,
  address: revLoansAddress,
})

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revLoansAbi}__ and `eventName` set to `"Approval"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useWatchRevLoansApprovalEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revLoansAbi,
    address: revLoansAddress,
    eventName: 'Approval',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revLoansAbi}__ and `eventName` set to `"ApprovalForAll"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useWatchRevLoansApprovalForAllEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revLoansAbi,
    address: revLoansAddress,
    eventName: 'ApprovalForAll',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revLoansAbi}__ and `eventName` set to `"Borrow"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useWatchRevLoansBorrowEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revLoansAbi,
    address: revLoansAddress,
    eventName: 'Borrow',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revLoansAbi}__ and `eventName` set to `"Liquidate"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useWatchRevLoansLiquidateEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revLoansAbi,
    address: revLoansAddress,
    eventName: 'Liquidate',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revLoansAbi}__ and `eventName` set to `"OwnershipTransferred"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useWatchRevLoansOwnershipTransferredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revLoansAbi,
    address: revLoansAddress,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revLoansAbi}__ and `eventName` set to `"ReallocateCollateral"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useWatchRevLoansReallocateCollateralEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revLoansAbi,
    address: revLoansAddress,
    eventName: 'ReallocateCollateral',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revLoansAbi}__ and `eventName` set to `"RepayLoan"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useWatchRevLoansRepayLoanEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revLoansAbi,
    address: revLoansAddress,
    eventName: 'RepayLoan',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revLoansAbi}__ and `eventName` set to `"SetTokenUriResolver"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useWatchRevLoansSetTokenUriResolverEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revLoansAbi,
    address: revLoansAddress,
    eventName: 'SetTokenUriResolver',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revLoansAbi}__ and `eventName` set to `"Transfer"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x03de624feb08c0edeff779ca5702aef4b85d7f06)
 */
export const useWatchRevLoansTransferEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revLoansAbi,
    address: revLoansAddress,
    eventName: 'Transfer',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1 = /*#__PURE__*/ createUseReadContract({
  abi: revLoans1_1Abi,
  address: revLoans1_1Address,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"CONTROLLER"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1Controller = /*#__PURE__*/ createUseReadContract(
  {
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'CONTROLLER',
  },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"DIRECTORY"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1Directory = /*#__PURE__*/ createUseReadContract({
  abi: revLoans1_1Abi,
  address: revLoans1_1Address,
  functionName: 'DIRECTORY',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"LOAN_LIQUIDATION_DURATION"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1LoanLiquidationDuration =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'LOAN_LIQUIDATION_DURATION',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"MAX_PREPAID_FEE_PERCENT"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1MaxPrepaidFeePercent =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'MAX_PREPAID_FEE_PERCENT',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"MIN_PREPAID_FEE_PERCENT"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1MinPrepaidFeePercent =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'MIN_PREPAID_FEE_PERCENT',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"PERMIT2"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1Permit2 = /*#__PURE__*/ createUseReadContract({
  abi: revLoans1_1Abi,
  address: revLoans1_1Address,
  functionName: 'PERMIT2',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"PRICES"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1Prices = /*#__PURE__*/ createUseReadContract({
  abi: revLoans1_1Abi,
  address: revLoans1_1Address,
  functionName: 'PRICES',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"PROJECTS"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1Projects = /*#__PURE__*/ createUseReadContract({
  abi: revLoans1_1Abi,
  address: revLoans1_1Address,
  functionName: 'PROJECTS',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"REVNETS"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1Revnets = /*#__PURE__*/ createUseReadContract({
  abi: revLoans1_1Abi,
  address: revLoans1_1Address,
  functionName: 'REVNETS',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"REV_ID"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1RevId = /*#__PURE__*/ createUseReadContract({
  abi: revLoans1_1Abi,
  address: revLoans1_1Address,
  functionName: 'REV_ID',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"REV_PREPAID_FEE_PERCENT"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1RevPrepaidFeePercent =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'REV_PREPAID_FEE_PERCENT',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"balanceOf"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1BalanceOf = /*#__PURE__*/ createUseReadContract({
  abi: revLoans1_1Abi,
  address: revLoans1_1Address,
  functionName: 'balanceOf',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"borrowableAmountFrom"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1BorrowableAmountFrom =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'borrowableAmountFrom',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"determineSourceFeeAmount"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1DetermineSourceFeeAmount =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'determineSourceFeeAmount',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"getApproved"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1GetApproved =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'getApproved',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"isApprovedForAll"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1IsApprovedForAll =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'isApprovedForAll',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"isLoanSourceOf"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1IsLoanSourceOf =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'isLoanSourceOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"isTrustedForwarder"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1IsTrustedForwarder =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'isTrustedForwarder',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"loanOf"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1LoanOf = /*#__PURE__*/ createUseReadContract({
  abi: revLoans1_1Abi,
  address: revLoans1_1Address,
  functionName: 'loanOf',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"loanSourcesOf"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1LoanSourcesOf =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'loanSourcesOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"name"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1Name = /*#__PURE__*/ createUseReadContract({
  abi: revLoans1_1Abi,
  address: revLoans1_1Address,
  functionName: 'name',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"numberOfLoansFor"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1NumberOfLoansFor =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'numberOfLoansFor',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"owner"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1Owner = /*#__PURE__*/ createUseReadContract({
  abi: revLoans1_1Abi,
  address: revLoans1_1Address,
  functionName: 'owner',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"ownerOf"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1OwnerOf = /*#__PURE__*/ createUseReadContract({
  abi: revLoans1_1Abi,
  address: revLoans1_1Address,
  functionName: 'ownerOf',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"revnetIdOfLoanWith"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1RevnetIdOfLoanWith =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'revnetIdOfLoanWith',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"supportsInterface"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1SupportsInterface =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'supportsInterface',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"symbol"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1Symbol = /*#__PURE__*/ createUseReadContract({
  abi: revLoans1_1Abi,
  address: revLoans1_1Address,
  functionName: 'symbol',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"tokenURI"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1TokenUri = /*#__PURE__*/ createUseReadContract({
  abi: revLoans1_1Abi,
  address: revLoans1_1Address,
  functionName: 'tokenURI',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"tokenUriResolver"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1TokenUriResolver =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'tokenUriResolver',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"totalBorrowedFrom"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1TotalBorrowedFrom =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'totalBorrowedFrom',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"totalCollateralOf"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1TotalCollateralOf =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'totalCollateralOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"trustedForwarder"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useReadRevLoans1_1TrustedForwarder =
  /*#__PURE__*/ createUseReadContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'trustedForwarder',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revLoans1_1Abi}__
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useWriteRevLoans1_1 = /*#__PURE__*/ createUseWriteContract({
  abi: revLoans1_1Abi,
  address: revLoans1_1Address,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"approve"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useWriteRevLoans1_1Approve = /*#__PURE__*/ createUseWriteContract({
  abi: revLoans1_1Abi,
  address: revLoans1_1Address,
  functionName: 'approve',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"borrowFrom"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useWriteRevLoans1_1BorrowFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'borrowFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"liquidateExpiredLoansFrom"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useWriteRevLoans1_1LiquidateExpiredLoansFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'liquidateExpiredLoansFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"reallocateCollateralFromLoan"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useWriteRevLoans1_1ReallocateCollateralFromLoan =
  /*#__PURE__*/ createUseWriteContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'reallocateCollateralFromLoan',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"renounceOwnership"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useWriteRevLoans1_1RenounceOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"repayLoan"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useWriteRevLoans1_1RepayLoan =
  /*#__PURE__*/ createUseWriteContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'repayLoan',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"safeTransferFrom"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useWriteRevLoans1_1SafeTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"setApprovalForAll"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useWriteRevLoans1_1SetApprovalForAll =
  /*#__PURE__*/ createUseWriteContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"setTokenUriResolver"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useWriteRevLoans1_1SetTokenUriResolver =
  /*#__PURE__*/ createUseWriteContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'setTokenUriResolver',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"transferFrom"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useWriteRevLoans1_1TransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"transferOwnership"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useWriteRevLoans1_1TransferOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revLoans1_1Abi}__
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useSimulateRevLoans1_1 = /*#__PURE__*/ createUseSimulateContract({
  abi: revLoans1_1Abi,
  address: revLoans1_1Address,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"approve"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useSimulateRevLoans1_1Approve =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'approve',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"borrowFrom"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useSimulateRevLoans1_1BorrowFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'borrowFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"liquidateExpiredLoansFrom"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useSimulateRevLoans1_1LiquidateExpiredLoansFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'liquidateExpiredLoansFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"reallocateCollateralFromLoan"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useSimulateRevLoans1_1ReallocateCollateralFromLoan =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'reallocateCollateralFromLoan',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"renounceOwnership"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useSimulateRevLoans1_1RenounceOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"repayLoan"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useSimulateRevLoans1_1RepayLoan =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'repayLoan',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"safeTransferFrom"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useSimulateRevLoans1_1SafeTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"setApprovalForAll"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useSimulateRevLoans1_1SetApprovalForAll =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"setTokenUriResolver"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useSimulateRevLoans1_1SetTokenUriResolver =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'setTokenUriResolver',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"transferFrom"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useSimulateRevLoans1_1TransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revLoans1_1Abi}__ and `functionName` set to `"transferOwnership"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useSimulateRevLoans1_1TransferOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revLoans1_1Abi}__
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useWatchRevLoans1_1Event =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revLoans1_1Abi}__ and `eventName` set to `"Approval"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useWatchRevLoans1_1ApprovalEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    eventName: 'Approval',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revLoans1_1Abi}__ and `eventName` set to `"ApprovalForAll"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useWatchRevLoans1_1ApprovalForAllEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    eventName: 'ApprovalForAll',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revLoans1_1Abi}__ and `eventName` set to `"Borrow"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useWatchRevLoans1_1BorrowEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    eventName: 'Borrow',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revLoans1_1Abi}__ and `eventName` set to `"Liquidate"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useWatchRevLoans1_1LiquidateEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    eventName: 'Liquidate',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revLoans1_1Abi}__ and `eventName` set to `"OwnershipTransferred"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useWatchRevLoans1_1OwnershipTransferredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revLoans1_1Abi}__ and `eventName` set to `"ReallocateCollateral"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useWatchRevLoans1_1ReallocateCollateralEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    eventName: 'ReallocateCollateral',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revLoans1_1Abi}__ and `eventName` set to `"RepayLoan"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useWatchRevLoans1_1RepayLoanEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    eventName: 'RepayLoan',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revLoans1_1Abi}__ and `eventName` set to `"SetTokenUriResolver"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useWatchRevLoans1_1SetTokenUriResolverEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    eventName: 'SetTokenUriResolver',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revLoans1_1Abi}__ and `eventName` set to `"Transfer"`
 *
 * - [__View Contract on Ethereum Etherscan__](https://etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Mainnet Optimism Explorer__](https://optimistic.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum One Arbiscan__](https://arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xde1e70faf22024559e7d94ab814abd7e42ca849b)
 */
export const useWatchRevLoans1_1TransferEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revLoans1_1Abi,
    address: revLoans1_1Address,
    eventName: 'Transfer',
  })
