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
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
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
      { name: 'revnetId', internalType: 'uint256', type: 'uint256' },
      { name: 'stageId', internalType: 'uint256', type: 'uint256' },
      { name: 'beneficiary', internalType: 'address', type: 'address' },
    ],
    name: 'amountToAutoMint',
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
    name: 'autoMintFor',
    outputs: [],
    stateMutability: 'nonpayable',
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
              { name: 'decimals', internalType: 'uint8', type: 'uint8' },
              { name: 'currency', internalType: 'uint32', type: 'uint32' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
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
                internalType: 'uint40',
                type: 'uint40',
              },
              {
                name: 'autoMints',
                internalType: 'struct REVAutoMint[]',
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
                name: 'initialIssuance',
                internalType: 'uint112',
                type: 'uint112',
              },
              {
                name: 'issuanceDecayFrequency',
                internalType: 'uint32',
                type: 'uint32',
              },
              {
                name: 'issuanceDecayPercent',
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
          {
            name: 'allowCrosschainSuckerExtension',
            internalType: 'bool',
            type: 'bool',
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
      { name: 'encodedConfiguration', internalType: 'bytes', type: 'bytes' },
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
                internalType: 'uint40',
                type: 'uint40',
              },
              {
                name: 'autoMints',
                internalType: 'struct REVAutoMint[]',
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
                name: 'initialIssuance',
                internalType: 'uint112',
                type: 'uint112',
              },
              {
                name: 'issuanceDecayFrequency',
                internalType: 'uint32',
                type: 'uint32',
              },
              {
                name: 'issuanceDecayPercent',
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
          {
            name: 'allowCrosschainSuckerExtension',
            internalType: 'bool',
            type: 'bool',
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
    inputs: [{ name: 'revnetId', internalType: 'uint256', type: 'uint256' }],
    name: 'unrealizedAutoMintAmountOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
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
                internalType: 'uint40',
                type: 'uint40',
              },
              {
                name: 'autoMints',
                internalType: 'struct REVAutoMint[]',
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
                name: 'initialIssuance',
                internalType: 'uint112',
                type: 'uint112',
              },
              {
                name: 'issuanceDecayFrequency',
                internalType: 'uint32',
                type: 'uint32',
              },
              {
                name: 'issuanceDecayPercent',
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
          {
            name: 'allowCrosschainSuckerExtension',
            internalType: 'bool',
            type: 'bool',
          },
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
          { name: 'decayPercent', internalType: 'uint32', type: 'uint32' },
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
                name: 'redemptionRate',
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
                name: 'allowCrosschainSuckerExtension',
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
                    name: 'preferAddToBalance',
                    internalType: 'bool',
                    type: 'bool',
                  },
                  { name: 'percent', internalType: 'uint32', type: 'uint32' },
                  { name: 'projectId', internalType: 'uint56', type: 'uint56' },
                  {
                    name: 'beneficiary',
                    internalType: 'address payable',
                    type: 'address',
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
        name: 'encodedConfiguration',
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
        name: 'operator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      { name: 'salt', internalType: 'bytes32', type: 'bytes32', indexed: true },
      {
        name: 'encodedConfiguration',
        internalType: 'bytes',
        type: 'bytes',
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
    name: 'Mint',
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
    name: 'StoreAutoMintAmount',
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
  { type: 'error', inputs: [], name: 'REVDeployer_CashOutDelayNotFinished' },
  {
    type: 'error',
    inputs: [],
    name: 'REVDeployer_CashOutsCantBeTurnedOffCompletely',
  },
  { type: 'error', inputs: [], name: 'REVDeployer_StageNotStarted' },
  { type: 'error', inputs: [], name: 'REVDeployer_StageTimesMustIncrease' },
  { type: 'error', inputs: [], name: 'REVDeployer_StagesRequired' },
  { type: 'error', inputs: [], name: 'REVDeployer_Unauthorized' },
] as const

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 */
export const revDeployerAddress = {
  84532: '0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1',
  421614: '0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1',
  11155111: '0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1',
  11155420: '0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1',
} as const

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 */
export const revDeployerConfig = {
  address: revDeployerAddress,
  abi: revDeployerAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// React
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 */
export const useReadRevDeployer = /*#__PURE__*/ createUseReadContract({
  abi: revDeployerAbi,
  address: revDeployerAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"CASH_OUT_DELAY"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
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
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
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
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 */
export const useReadRevDeployerDirectory = /*#__PURE__*/ createUseReadContract({
  abi: revDeployerAbi,
  address: revDeployerAddress,
  functionName: 'DIRECTORY',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"FEE"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 */
export const useReadRevDeployerFee = /*#__PURE__*/ createUseReadContract({
  abi: revDeployerAbi,
  address: revDeployerAddress,
  functionName: 'FEE',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"FEE_REVNET_ID"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
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
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
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
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
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
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 */
export const useReadRevDeployerProjects = /*#__PURE__*/ createUseReadContract({
  abi: revDeployerAbi,
  address: revDeployerAddress,
  functionName: 'PROJECTS',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"PUBLISHER"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 */
export const useReadRevDeployerPublisher = /*#__PURE__*/ createUseReadContract({
  abi: revDeployerAbi,
  address: revDeployerAddress,
  functionName: 'PUBLISHER',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"SUCKER_REGISTRY"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 */
export const useReadRevDeployerSuckerRegistry =
  /*#__PURE__*/ createUseReadContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'SUCKER_REGISTRY',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"amountToAutoMint"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 */
export const useReadRevDeployerAmountToAutoMint =
  /*#__PURE__*/ createUseReadContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'amountToAutoMint',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"beforePayRecordedWith"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 */
export const useReadRevDeployerBeforePayRecordedWith =
  /*#__PURE__*/ createUseReadContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'beforePayRecordedWith',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"beforeRedeemRecordedWith"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 */
export const useReadRevDeployerBeforeRedeemRecordedWith =
  /*#__PURE__*/ createUseReadContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'beforeRedeemRecordedWith',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"buybackHookOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
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
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
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
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 */
export const useReadRevDeployerHasMintPermissionFor =
  /*#__PURE__*/ createUseReadContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'hasMintPermissionFor',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"isSplitOperatorOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 */
export const useReadRevDeployerIsSplitOperatorOf =
  /*#__PURE__*/ createUseReadContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'isSplitOperatorOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"loansOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 */
export const useReadRevDeployerLoansOf = /*#__PURE__*/ createUseReadContract({
  abi: revDeployerAbi,
  address: revDeployerAddress,
  functionName: 'loansOf',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"onERC721Received"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
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
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
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
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 */
export const useReadRevDeployerTiered721HookOf =
  /*#__PURE__*/ createUseReadContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'tiered721HookOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"unrealizedAutoMintAmountOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 */
export const useReadRevDeployerUnrealizedAutoMintAmountOf =
  /*#__PURE__*/ createUseReadContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'unrealizedAutoMintAmountOf',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revDeployerAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 */
export const useWriteRevDeployer = /*#__PURE__*/ createUseWriteContract({
  abi: revDeployerAbi,
  address: revDeployerAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"afterRedeemRecordedWith"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 */
export const useWriteRevDeployerAfterRedeemRecordedWith =
  /*#__PURE__*/ createUseWriteContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'afterRedeemRecordedWith',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"autoMintFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 */
export const useWriteRevDeployerAutoMintFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'autoMintFor',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"deployFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
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
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
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
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
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
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
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
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 */
export const useSimulateRevDeployer = /*#__PURE__*/ createUseSimulateContract({
  abi: revDeployerAbi,
  address: revDeployerAddress,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"afterRedeemRecordedWith"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 */
export const useSimulateRevDeployerAfterRedeemRecordedWith =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'afterRedeemRecordedWith',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"autoMintFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 */
export const useSimulateRevDeployerAutoMintFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    functionName: 'autoMintFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revDeployerAbi}__ and `functionName` set to `"deployFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
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
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
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
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
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
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
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
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 */
export const useWatchRevDeployerEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revDeployerAbi,
    address: revDeployerAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revDeployerAbi}__ and `eventName` set to `"DeployRevnet"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
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
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 */
export const useWatchRevDeployerDeploySuckersEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    eventName: 'DeploySuckers',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revDeployerAbi}__ and `eventName` set to `"Mint"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 */
export const useWatchRevDeployerMintEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    eventName: 'Mint',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revDeployerAbi}__ and `eventName` set to `"ReplaceSplitOperator"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
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
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
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
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 */
export const useWatchRevDeployerSetCashOutDelayEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    eventName: 'SetCashOutDelay',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revDeployerAbi}__ and `eventName` set to `"StoreAutoMintAmount"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x25bC5D5A708c2E426eF3a5196cc18dE6b2d5A3d1)
 */
export const useWatchRevDeployerStoreAutoMintAmountEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revDeployerAbi,
    address: revDeployerAddress,
    eventName: 'StoreAutoMintAmount',
  })
