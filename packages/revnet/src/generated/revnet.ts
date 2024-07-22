import {
  createUseReadContract,
  createUseWriteContract,
  createUseSimulateContract,
  createUseWatchContractEvent,
} from 'wagmi/codegen'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// REVBasicDeployer
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const revBasicDeployerAbi = [
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
    name: 'allowedMintCountOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
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
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'uint256', type: 'uint256' },
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
                name: 'mintConfigs',
                internalType: 'struct REVMintConfig[]',
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
    outputs: [],
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
    inputs: [
      { name: 'revnetId', internalType: 'uint256', type: 'uint256' },
      { name: 'stageId', internalType: 'uint256', type: 'uint256' },
      { name: 'beneficiary', internalType: 'address', type: 'address' },
    ],
    name: 'mintFor',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'operator', internalType: 'address', type: 'address' },
      { name: '', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'data', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'onERC721Received',
    outputs: [{ name: '', internalType: 'bytes4', type: 'bytes4' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'revnetId', internalType: 'uint256', type: 'uint256' }],
    name: 'payHookSpecificationsOf',
    outputs: [
      {
        name: '',
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
      { name: 'revnetId', internalType: 'uint256', type: 'uint256' },
      { name: 'newSplitOperator', internalType: 'address', type: 'address' },
    ],
    name: 'replaceSplitOperatorOf',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
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
        name: 'suckerSalt',
        internalType: 'bytes32',
        type: 'bytes32',
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
                name: 'mintConfigs',
                internalType: 'struct REVMintConfig[]',
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
            ],
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
    name: 'StoreMintPotential',
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
  { type: 'error', inputs: [], name: 'REVBasic_BadStageTimes' },
  { type: 'error', inputs: [], name: 'REVBasic_CashOutDelayInEffect' },
  { type: 'error', inputs: [], name: 'REVBasic_StageNotStarted' },
  { type: 'error', inputs: [], name: 'REVBasic_StagesRequired' },
  { type: 'error', inputs: [], name: 'REVBasic_Unauthorized' },
] as const

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const revBasicDeployerAddress = {
  84532: '0x34dEfA1601e7b462992166737d1EABdBB395efa1',
  421614: '0x34dEfA1601e7b462992166737d1EABdBB395efa1',
  11155111: '0x34dEfA1601e7b462992166737d1EABdBB395efa1',
  11155420: '0x34dEfA1601e7b462992166737d1EABdBB395efa1',
} as const

/**
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const revBasicDeployerConfig = {
  address: revBasicDeployerAddress,
  abi: revBasicDeployerAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// React
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revBasicDeployerAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useReadRevBasicDeployer = /*#__PURE__*/ createUseReadContract({
  abi: revBasicDeployerAbi,
  address: revBasicDeployerAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `functionName` set to `"CASH_OUT_DELAY"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useReadRevBasicDeployerCashOutDelay =
  /*#__PURE__*/ createUseReadContract({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    functionName: 'CASH_OUT_DELAY',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `functionName` set to `"CONTROLLER"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useReadRevBasicDeployerController =
  /*#__PURE__*/ createUseReadContract({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    functionName: 'CONTROLLER',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `functionName` set to `"FEE"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useReadRevBasicDeployerFee = /*#__PURE__*/ createUseReadContract({
  abi: revBasicDeployerAbi,
  address: revBasicDeployerAddress,
  functionName: 'FEE',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `functionName` set to `"FEE_REVNET_ID"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useReadRevBasicDeployerFeeRevnetId =
  /*#__PURE__*/ createUseReadContract({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    functionName: 'FEE_REVNET_ID',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `functionName` set to `"SUCKER_REGISTRY"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useReadRevBasicDeployerSuckerRegistry =
  /*#__PURE__*/ createUseReadContract({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    functionName: 'SUCKER_REGISTRY',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `functionName` set to `"allowedMintCountOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useReadRevBasicDeployerAllowedMintCountOf =
  /*#__PURE__*/ createUseReadContract({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    functionName: 'allowedMintCountOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `functionName` set to `"beforePayRecordedWith"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useReadRevBasicDeployerBeforePayRecordedWith =
  /*#__PURE__*/ createUseReadContract({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    functionName: 'beforePayRecordedWith',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `functionName` set to `"beforeRedeemRecordedWith"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useReadRevBasicDeployerBeforeRedeemRecordedWith =
  /*#__PURE__*/ createUseReadContract({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    functionName: 'beforeRedeemRecordedWith',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `functionName` set to `"buybackHookOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useReadRevBasicDeployerBuybackHookOf =
  /*#__PURE__*/ createUseReadContract({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    functionName: 'buybackHookOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `functionName` set to `"cashOutDelayOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useReadRevBasicDeployerCashOutDelayOf =
  /*#__PURE__*/ createUseReadContract({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    functionName: 'cashOutDelayOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `functionName` set to `"hasMintPermissionFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useReadRevBasicDeployerHasMintPermissionFor =
  /*#__PURE__*/ createUseReadContract({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    functionName: 'hasMintPermissionFor',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `functionName` set to `"isSplitOperatorOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useReadRevBasicDeployerIsSplitOperatorOf =
  /*#__PURE__*/ createUseReadContract({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    functionName: 'isSplitOperatorOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `functionName` set to `"onERC721Received"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useReadRevBasicDeployerOnErc721Received =
  /*#__PURE__*/ createUseReadContract({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    functionName: 'onERC721Received',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `functionName` set to `"payHookSpecificationsOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useReadRevBasicDeployerPayHookSpecificationsOf =
  /*#__PURE__*/ createUseReadContract({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    functionName: 'payHookSpecificationsOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `functionName` set to `"supportsInterface"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useReadRevBasicDeployerSupportsInterface =
  /*#__PURE__*/ createUseReadContract({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    functionName: 'supportsInterface',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revBasicDeployerAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useWriteRevBasicDeployer = /*#__PURE__*/ createUseWriteContract({
  abi: revBasicDeployerAbi,
  address: revBasicDeployerAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `functionName` set to `"afterRedeemRecordedWith"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useWriteRevBasicDeployerAfterRedeemRecordedWith =
  /*#__PURE__*/ createUseWriteContract({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    functionName: 'afterRedeemRecordedWith',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `functionName` set to `"deployFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useWriteRevBasicDeployerDeployFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    functionName: 'deployFor',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `functionName` set to `"deploySuckersFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useWriteRevBasicDeployerDeploySuckersFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    functionName: 'deploySuckersFor',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `functionName` set to `"mintFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useWriteRevBasicDeployerMintFor =
  /*#__PURE__*/ createUseWriteContract({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    functionName: 'mintFor',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `functionName` set to `"replaceSplitOperatorOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useWriteRevBasicDeployerReplaceSplitOperatorOf =
  /*#__PURE__*/ createUseWriteContract({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    functionName: 'replaceSplitOperatorOf',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revBasicDeployerAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useSimulateRevBasicDeployer =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `functionName` set to `"afterRedeemRecordedWith"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useSimulateRevBasicDeployerAfterRedeemRecordedWith =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    functionName: 'afterRedeemRecordedWith',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `functionName` set to `"deployFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useSimulateRevBasicDeployerDeployFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    functionName: 'deployFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `functionName` set to `"deploySuckersFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useSimulateRevBasicDeployerDeploySuckersFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    functionName: 'deploySuckersFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `functionName` set to `"mintFor"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useSimulateRevBasicDeployerMintFor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    functionName: 'mintFor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `functionName` set to `"replaceSplitOperatorOf"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useSimulateRevBasicDeployerReplaceSplitOperatorOf =
  /*#__PURE__*/ createUseSimulateContract({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    functionName: 'replaceSplitOperatorOf',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revBasicDeployerAbi}__
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useWatchRevBasicDeployerEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `eventName` set to `"DeployRevnet"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useWatchRevBasicDeployerDeployRevnetEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    eventName: 'DeployRevnet',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `eventName` set to `"DeploySuckers"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useWatchRevBasicDeployerDeploySuckersEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    eventName: 'DeploySuckers',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `eventName` set to `"Mint"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useWatchRevBasicDeployerMintEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    eventName: 'Mint',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `eventName` set to `"ReplaceSplitOperator"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useWatchRevBasicDeployerReplaceSplitOperatorEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    eventName: 'ReplaceSplitOperator',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `eventName` set to `"SetAdditionalOperator"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useWatchRevBasicDeployerSetAdditionalOperatorEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    eventName: 'SetAdditionalOperator',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `eventName` set to `"SetCashOutDelay"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useWatchRevBasicDeployerSetCashOutDelayEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    eventName: 'SetCashOutDelay',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link revBasicDeployerAbi}__ and `eventName` set to `"StoreMintPotential"`
 *
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Arbitrum Sepolia Arbiscan__](https://sepolia.arbiscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 * - [__View Contract on Op Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x34dEfA1601e7b462992166737d1EABdBB395efa1)
 */
export const useWatchRevBasicDeployerStoreMintPotentialEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: revBasicDeployerAbi,
    address: revBasicDeployerAddress,
    eventName: 'StoreMintPotential',
  })
