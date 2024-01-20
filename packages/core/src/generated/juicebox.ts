//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBController
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x719c79da361Ce133e9621a6f682Eff5DAB44E016)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x8c392FeF6bfEca79de5b7b43CDEe08B3Bd9d4ac4)
 */
export const jbControllerABI = [
  {
    stateMutability: "nonpayable",
    type: "constructor",
    inputs: [
      {
        name: "permissions",
        internalType: "contract IJBPermissions",
        type: "address",
      },
      {
        name: "projects",
        internalType: "contract IJBProjects",
        type: "address",
      },
      {
        name: "directory",
        internalType: "contract IJBDirectory",
        type: "address",
      },
      {
        name: "rulesets",
        internalType: "contract IJBRulesets",
        type: "address",
      },
      { name: "tokens", internalType: "contract IJBTokens", type: "address" },
      { name: "splits", internalType: "contract IJBSplits", type: "address" },
      {
        name: "fundAccessLimits",
        internalType: "contract IJBFundAccessLimits",
        type: "address",
      },
      { name: "trustedForwarder", internalType: "address", type: "address" },
    ],
  },
  { type: "error", inputs: [], name: "CONTROLLER_MIGRATION_NOT_ALLOWED" },
  { type: "error", inputs: [], name: "CREDIT_TRANSFERS_PAUSED" },
  { type: "error", inputs: [], name: "INVALID_BASE_CURRENCY" },
  { type: "error", inputs: [], name: "INVALID_REDEMPTION_RATE" },
  { type: "error", inputs: [], name: "INVALID_RESERVED_RATE" },
  {
    type: "error",
    inputs: [],
    name: "MINT_NOT_ALLOWED_AND_NOT_TERMINAL_OR_HOOK",
  },
  { type: "error", inputs: [], name: "NO_BURNABLE_TOKENS" },
  {
    type: "error",
    inputs: [
      { name: "x", internalType: "uint256", type: "uint256" },
      { name: "y", internalType: "uint256", type: "uint256" },
      { name: "denominator", internalType: "uint256", type: "uint256" },
    ],
    name: "PRBMath_MulDiv_Overflow",
  },
  { type: "error", inputs: [], name: "RULESET_ALREADY_LAUNCHED" },
  { type: "error", inputs: [], name: "UNAUTHORIZED" },
  { type: "error", inputs: [], name: "ZERO_TOKENS_TO_MINT" },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "holder",
        internalType: "address",
        type: "address",
        indexed: true,
      },
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "tokenCount",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      { name: "memo", internalType: "string", type: "string", indexed: false },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "BurnTokens",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "rulesetId",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "metadata",
        internalType: "string",
        type: "string",
        indexed: false,
      },
      { name: "memo", internalType: "string", type: "string", indexed: false },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "LaunchProject",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "rulesetId",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      { name: "memo", internalType: "string", type: "string", indexed: false },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "LaunchRulesets",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "to",
        internalType: "contract IJBMigratable",
        type: "address",
        indexed: false,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "MigrateController",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "beneficiary",
        internalType: "address",
        type: "address",
        indexed: true,
      },
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "tokenCount",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "beneficiaryTokenCount",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      { name: "memo", internalType: "string", type: "string", indexed: false },
      {
        name: "reservedRate",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "MintTokens",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "from",
        internalType: "address",
        type: "address",
        indexed: false,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "PrepMigration",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "rulesetId",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      { name: "memo", internalType: "string", type: "string", indexed: false },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "QueueRulesets",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "rulesetId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "group",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "split",
        internalType: "struct JBSplit",
        type: "tuple",
        components: [
          { name: "preferAddToBalance", internalType: "bool", type: "bool" },
          { name: "percent", internalType: "uint256", type: "uint256" },
          { name: "projectId", internalType: "uint256", type: "uint256" },
          {
            name: "beneficiary",
            internalType: "address payable",
            type: "address",
          },
          { name: "lockedUntil", internalType: "uint256", type: "uint256" },
          {
            name: "hook",
            internalType: "contract IJBSplitHook",
            type: "address",
          },
        ],
        indexed: false,
      },
      {
        name: "tokenCount",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "SendReservedTokensToSplit",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "rulesetId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "rulesetCycleNumber",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "beneficiary",
        internalType: "address",
        type: "address",
        indexed: false,
      },
      {
        name: "tokenCount",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "beneficiaryTokenCount",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      { name: "memo", internalType: "string", type: "string", indexed: false },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "SendReservedTokensToSplits",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "metadata",
        internalType: "string",
        type: "string",
        indexed: false,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "SetMetadata",
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "DIRECTORY",
    outputs: [
      { name: "", internalType: "contract IJBDirectory", type: "address" },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "FUND_ACCESS_LIMITS",
    outputs: [
      {
        name: "",
        internalType: "contract IJBFundAccessLimits",
        type: "address",
      },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "PERMISSIONS",
    outputs: [
      { name: "", internalType: "contract IJBPermissions", type: "address" },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "PROJECTS",
    outputs: [
      { name: "", internalType: "contract IJBProjects", type: "address" },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "RULESETS",
    outputs: [
      { name: "", internalType: "contract IJBRulesets", type: "address" },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "SPLITS",
    outputs: [
      { name: "", internalType: "contract IJBSplits", type: "address" },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "TOKENS",
    outputs: [
      { name: "", internalType: "contract IJBTokens", type: "address" },
    ],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "holder", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "tokenCount", internalType: "uint256", type: "uint256" },
      { name: "memo", internalType: "string", type: "string" },
    ],
    name: "burnTokensOf",
    outputs: [],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "holder", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "amount", internalType: "uint256", type: "uint256" },
      { name: "beneficiary", internalType: "address", type: "address" },
    ],
    name: "claimTokensFor",
    outputs: [],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "currentRulesetOf",
    outputs: [
      {
        name: "ruleset",
        internalType: "struct JBRuleset",
        type: "tuple",
        components: [
          { name: "cycleNumber", internalType: "uint256", type: "uint256" },
          { name: "id", internalType: "uint256", type: "uint256" },
          { name: "basedOnId", internalType: "uint256", type: "uint256" },
          { name: "start", internalType: "uint256", type: "uint256" },
          { name: "duration", internalType: "uint256", type: "uint256" },
          { name: "weight", internalType: "uint256", type: "uint256" },
          { name: "decayRate", internalType: "uint256", type: "uint256" },
          {
            name: "approvalHook",
            internalType: "contract IJBRulesetApprovalHook",
            type: "address",
          },
          { name: "metadata", internalType: "uint256", type: "uint256" },
        ],
      },
      {
        name: "metadata",
        internalType: "struct JBRulesetMetadata",
        type: "tuple",
        components: [
          { name: "reservedRate", internalType: "uint256", type: "uint256" },
          { name: "redemptionRate", internalType: "uint256", type: "uint256" },
          { name: "baseCurrency", internalType: "uint256", type: "uint256" },
          { name: "pausePay", internalType: "bool", type: "bool" },
          { name: "pauseCreditTransfers", internalType: "bool", type: "bool" },
          { name: "allowOwnerMinting", internalType: "bool", type: "bool" },
          {
            name: "allowTerminalMigration",
            internalType: "bool",
            type: "bool",
          },
          { name: "allowSetTerminals", internalType: "bool", type: "bool" },
          {
            name: "allowControllerMigration",
            internalType: "bool",
            type: "bool",
          },
          { name: "allowSetController", internalType: "bool", type: "bool" },
          { name: "holdFees", internalType: "bool", type: "bool" },
          {
            name: "useTotalSurplusForRedemptions",
            internalType: "bool",
            type: "bool",
          },
          { name: "useDataHookForPay", internalType: "bool", type: "bool" },
          { name: "useDataHookForRedeem", internalType: "bool", type: "bool" },
          { name: "dataHook", internalType: "address", type: "address" },
          { name: "metadata", internalType: "uint256", type: "uint256" },
        ],
      },
    ],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "name", internalType: "string", type: "string" },
      { name: "symbol", internalType: "string", type: "string" },
    ],
    name: "deployERC20For",
    outputs: [
      { name: "token", internalType: "contract IJBToken", type: "address" },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "rulesetId", internalType: "uint256", type: "uint256" },
    ],
    name: "getRulesetOf",
    outputs: [
      {
        name: "ruleset",
        internalType: "struct JBRuleset",
        type: "tuple",
        components: [
          { name: "cycleNumber", internalType: "uint256", type: "uint256" },
          { name: "id", internalType: "uint256", type: "uint256" },
          { name: "basedOnId", internalType: "uint256", type: "uint256" },
          { name: "start", internalType: "uint256", type: "uint256" },
          { name: "duration", internalType: "uint256", type: "uint256" },
          { name: "weight", internalType: "uint256", type: "uint256" },
          { name: "decayRate", internalType: "uint256", type: "uint256" },
          {
            name: "approvalHook",
            internalType: "contract IJBRulesetApprovalHook",
            type: "address",
          },
          { name: "metadata", internalType: "uint256", type: "uint256" },
        ],
      },
      {
        name: "metadata",
        internalType: "struct JBRulesetMetadata",
        type: "tuple",
        components: [
          { name: "reservedRate", internalType: "uint256", type: "uint256" },
          { name: "redemptionRate", internalType: "uint256", type: "uint256" },
          { name: "baseCurrency", internalType: "uint256", type: "uint256" },
          { name: "pausePay", internalType: "bool", type: "bool" },
          { name: "pauseCreditTransfers", internalType: "bool", type: "bool" },
          { name: "allowOwnerMinting", internalType: "bool", type: "bool" },
          {
            name: "allowTerminalMigration",
            internalType: "bool",
            type: "bool",
          },
          { name: "allowSetTerminals", internalType: "bool", type: "bool" },
          {
            name: "allowControllerMigration",
            internalType: "bool",
            type: "bool",
          },
          { name: "allowSetController", internalType: "bool", type: "bool" },
          { name: "holdFees", internalType: "bool", type: "bool" },
          {
            name: "useTotalSurplusForRedemptions",
            internalType: "bool",
            type: "bool",
          },
          { name: "useDataHookForPay", internalType: "bool", type: "bool" },
          { name: "useDataHookForRedeem", internalType: "bool", type: "bool" },
          { name: "dataHook", internalType: "address", type: "address" },
          { name: "metadata", internalType: "uint256", type: "uint256" },
        ],
      },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "forwarder", internalType: "address", type: "address" }],
    name: "isTrustedForwarder",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "latestQueuedRulesetOf",
    outputs: [
      {
        name: "ruleset",
        internalType: "struct JBRuleset",
        type: "tuple",
        components: [
          { name: "cycleNumber", internalType: "uint256", type: "uint256" },
          { name: "id", internalType: "uint256", type: "uint256" },
          { name: "basedOnId", internalType: "uint256", type: "uint256" },
          { name: "start", internalType: "uint256", type: "uint256" },
          { name: "duration", internalType: "uint256", type: "uint256" },
          { name: "weight", internalType: "uint256", type: "uint256" },
          { name: "decayRate", internalType: "uint256", type: "uint256" },
          {
            name: "approvalHook",
            internalType: "contract IJBRulesetApprovalHook",
            type: "address",
          },
          { name: "metadata", internalType: "uint256", type: "uint256" },
        ],
      },
      {
        name: "metadata",
        internalType: "struct JBRulesetMetadata",
        type: "tuple",
        components: [
          { name: "reservedRate", internalType: "uint256", type: "uint256" },
          { name: "redemptionRate", internalType: "uint256", type: "uint256" },
          { name: "baseCurrency", internalType: "uint256", type: "uint256" },
          { name: "pausePay", internalType: "bool", type: "bool" },
          { name: "pauseCreditTransfers", internalType: "bool", type: "bool" },
          { name: "allowOwnerMinting", internalType: "bool", type: "bool" },
          {
            name: "allowTerminalMigration",
            internalType: "bool",
            type: "bool",
          },
          { name: "allowSetTerminals", internalType: "bool", type: "bool" },
          {
            name: "allowControllerMigration",
            internalType: "bool",
            type: "bool",
          },
          { name: "allowSetController", internalType: "bool", type: "bool" },
          { name: "holdFees", internalType: "bool", type: "bool" },
          {
            name: "useTotalSurplusForRedemptions",
            internalType: "bool",
            type: "bool",
          },
          { name: "useDataHookForPay", internalType: "bool", type: "bool" },
          { name: "useDataHookForRedeem", internalType: "bool", type: "bool" },
          { name: "dataHook", internalType: "address", type: "address" },
          { name: "metadata", internalType: "uint256", type: "uint256" },
        ],
      },
      {
        name: "approvalStatus",
        internalType: "enum JBApprovalStatus",
        type: "uint8",
      },
    ],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "owner", internalType: "address", type: "address" },
      { name: "projectMetadata", internalType: "string", type: "string" },
      {
        name: "rulesetConfigurations",
        internalType: "struct JBRulesetConfig[]",
        type: "tuple[]",
        components: [
          {
            name: "mustStartAtOrAfter",
            internalType: "uint256",
            type: "uint256",
          },
          { name: "duration", internalType: "uint256", type: "uint256" },
          { name: "weight", internalType: "uint256", type: "uint256" },
          { name: "decayRate", internalType: "uint256", type: "uint256" },
          {
            name: "approvalHook",
            internalType: "contract IJBRulesetApprovalHook",
            type: "address",
          },
          {
            name: "metadata",
            internalType: "struct JBRulesetMetadata",
            type: "tuple",
            components: [
              {
                name: "reservedRate",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "redemptionRate",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "baseCurrency",
                internalType: "uint256",
                type: "uint256",
              },
              { name: "pausePay", internalType: "bool", type: "bool" },
              {
                name: "pauseCreditTransfers",
                internalType: "bool",
                type: "bool",
              },
              { name: "allowOwnerMinting", internalType: "bool", type: "bool" },
              {
                name: "allowTerminalMigration",
                internalType: "bool",
                type: "bool",
              },
              { name: "allowSetTerminals", internalType: "bool", type: "bool" },
              {
                name: "allowControllerMigration",
                internalType: "bool",
                type: "bool",
              },
              {
                name: "allowSetController",
                internalType: "bool",
                type: "bool",
              },
              { name: "holdFees", internalType: "bool", type: "bool" },
              {
                name: "useTotalSurplusForRedemptions",
                internalType: "bool",
                type: "bool",
              },
              { name: "useDataHookForPay", internalType: "bool", type: "bool" },
              {
                name: "useDataHookForRedeem",
                internalType: "bool",
                type: "bool",
              },
              { name: "dataHook", internalType: "address", type: "address" },
              { name: "metadata", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "splitGroups",
            internalType: "struct JBSplitGroup[]",
            type: "tuple[]",
            components: [
              { name: "groupId", internalType: "uint256", type: "uint256" },
              {
                name: "splits",
                internalType: "struct JBSplit[]",
                type: "tuple[]",
                components: [
                  {
                    name: "preferAddToBalance",
                    internalType: "bool",
                    type: "bool",
                  },
                  { name: "percent", internalType: "uint256", type: "uint256" },
                  {
                    name: "projectId",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "beneficiary",
                    internalType: "address payable",
                    type: "address",
                  },
                  {
                    name: "lockedUntil",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "hook",
                    internalType: "contract IJBSplitHook",
                    type: "address",
                  },
                ],
              },
            ],
          },
          {
            name: "fundAccessLimitGroups",
            internalType: "struct JBFundAccessLimitGroup[]",
            type: "tuple[]",
            components: [
              { name: "terminal", internalType: "address", type: "address" },
              { name: "token", internalType: "address", type: "address" },
              {
                name: "payoutLimits",
                internalType: "struct JBCurrencyAmount[]",
                type: "tuple[]",
                components: [
                  { name: "amount", internalType: "uint256", type: "uint256" },
                  {
                    name: "currency",
                    internalType: "uint256",
                    type: "uint256",
                  },
                ],
              },
              {
                name: "surplusAllowances",
                internalType: "struct JBCurrencyAmount[]",
                type: "tuple[]",
                components: [
                  { name: "amount", internalType: "uint256", type: "uint256" },
                  {
                    name: "currency",
                    internalType: "uint256",
                    type: "uint256",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "terminalConfigurations",
        internalType: "struct JBTerminalConfig[]",
        type: "tuple[]",
        components: [
          {
            name: "terminal",
            internalType: "contract IJBTerminal",
            type: "address",
          },
          {
            name: "tokensToAccept",
            internalType: "address[]",
            type: "address[]",
          },
        ],
      },
      { name: "memo", internalType: "string", type: "string" },
    ],
    name: "launchProjectFor",
    outputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      {
        name: "rulesetConfigurations",
        internalType: "struct JBRulesetConfig[]",
        type: "tuple[]",
        components: [
          {
            name: "mustStartAtOrAfter",
            internalType: "uint256",
            type: "uint256",
          },
          { name: "duration", internalType: "uint256", type: "uint256" },
          { name: "weight", internalType: "uint256", type: "uint256" },
          { name: "decayRate", internalType: "uint256", type: "uint256" },
          {
            name: "approvalHook",
            internalType: "contract IJBRulesetApprovalHook",
            type: "address",
          },
          {
            name: "metadata",
            internalType: "struct JBRulesetMetadata",
            type: "tuple",
            components: [
              {
                name: "reservedRate",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "redemptionRate",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "baseCurrency",
                internalType: "uint256",
                type: "uint256",
              },
              { name: "pausePay", internalType: "bool", type: "bool" },
              {
                name: "pauseCreditTransfers",
                internalType: "bool",
                type: "bool",
              },
              { name: "allowOwnerMinting", internalType: "bool", type: "bool" },
              {
                name: "allowTerminalMigration",
                internalType: "bool",
                type: "bool",
              },
              { name: "allowSetTerminals", internalType: "bool", type: "bool" },
              {
                name: "allowControllerMigration",
                internalType: "bool",
                type: "bool",
              },
              {
                name: "allowSetController",
                internalType: "bool",
                type: "bool",
              },
              { name: "holdFees", internalType: "bool", type: "bool" },
              {
                name: "useTotalSurplusForRedemptions",
                internalType: "bool",
                type: "bool",
              },
              { name: "useDataHookForPay", internalType: "bool", type: "bool" },
              {
                name: "useDataHookForRedeem",
                internalType: "bool",
                type: "bool",
              },
              { name: "dataHook", internalType: "address", type: "address" },
              { name: "metadata", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "splitGroups",
            internalType: "struct JBSplitGroup[]",
            type: "tuple[]",
            components: [
              { name: "groupId", internalType: "uint256", type: "uint256" },
              {
                name: "splits",
                internalType: "struct JBSplit[]",
                type: "tuple[]",
                components: [
                  {
                    name: "preferAddToBalance",
                    internalType: "bool",
                    type: "bool",
                  },
                  { name: "percent", internalType: "uint256", type: "uint256" },
                  {
                    name: "projectId",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "beneficiary",
                    internalType: "address payable",
                    type: "address",
                  },
                  {
                    name: "lockedUntil",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "hook",
                    internalType: "contract IJBSplitHook",
                    type: "address",
                  },
                ],
              },
            ],
          },
          {
            name: "fundAccessLimitGroups",
            internalType: "struct JBFundAccessLimitGroup[]",
            type: "tuple[]",
            components: [
              { name: "terminal", internalType: "address", type: "address" },
              { name: "token", internalType: "address", type: "address" },
              {
                name: "payoutLimits",
                internalType: "struct JBCurrencyAmount[]",
                type: "tuple[]",
                components: [
                  { name: "amount", internalType: "uint256", type: "uint256" },
                  {
                    name: "currency",
                    internalType: "uint256",
                    type: "uint256",
                  },
                ],
              },
              {
                name: "surplusAllowances",
                internalType: "struct JBCurrencyAmount[]",
                type: "tuple[]",
                components: [
                  { name: "amount", internalType: "uint256", type: "uint256" },
                  {
                    name: "currency",
                    internalType: "uint256",
                    type: "uint256",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "terminalConfigurations",
        internalType: "struct JBTerminalConfig[]",
        type: "tuple[]",
        components: [
          {
            name: "terminal",
            internalType: "contract IJBTerminal",
            type: "address",
          },
          {
            name: "tokensToAccept",
            internalType: "address[]",
            type: "address[]",
          },
        ],
      },
      { name: "memo", internalType: "string", type: "string" },
    ],
    name: "launchRulesetsFor",
    outputs: [{ name: "rulesetId", internalType: "uint256", type: "uint256" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "metadataOf",
    outputs: [{ name: "", internalType: "string", type: "string" }],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "to", internalType: "contract IJBMigratable", type: "address" },
    ],
    name: "migrateController",
    outputs: [],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "tokenCount", internalType: "uint256", type: "uint256" },
      { name: "beneficiary", internalType: "address", type: "address" },
      { name: "memo", internalType: "string", type: "string" },
      { name: "useReservedRate", internalType: "bool", type: "bool" },
    ],
    name: "mintTokensOf",
    outputs: [
      {
        name: "beneficiaryTokenCount",
        internalType: "uint256",
        type: "uint256",
      },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "pendingReservedTokenBalanceOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      {
        name: "rulesetConfigurations",
        internalType: "struct JBRulesetConfig[]",
        type: "tuple[]",
        components: [
          {
            name: "mustStartAtOrAfter",
            internalType: "uint256",
            type: "uint256",
          },
          { name: "duration", internalType: "uint256", type: "uint256" },
          { name: "weight", internalType: "uint256", type: "uint256" },
          { name: "decayRate", internalType: "uint256", type: "uint256" },
          {
            name: "approvalHook",
            internalType: "contract IJBRulesetApprovalHook",
            type: "address",
          },
          {
            name: "metadata",
            internalType: "struct JBRulesetMetadata",
            type: "tuple",
            components: [
              {
                name: "reservedRate",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "redemptionRate",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "baseCurrency",
                internalType: "uint256",
                type: "uint256",
              },
              { name: "pausePay", internalType: "bool", type: "bool" },
              {
                name: "pauseCreditTransfers",
                internalType: "bool",
                type: "bool",
              },
              { name: "allowOwnerMinting", internalType: "bool", type: "bool" },
              {
                name: "allowTerminalMigration",
                internalType: "bool",
                type: "bool",
              },
              { name: "allowSetTerminals", internalType: "bool", type: "bool" },
              {
                name: "allowControllerMigration",
                internalType: "bool",
                type: "bool",
              },
              {
                name: "allowSetController",
                internalType: "bool",
                type: "bool",
              },
              { name: "holdFees", internalType: "bool", type: "bool" },
              {
                name: "useTotalSurplusForRedemptions",
                internalType: "bool",
                type: "bool",
              },
              { name: "useDataHookForPay", internalType: "bool", type: "bool" },
              {
                name: "useDataHookForRedeem",
                internalType: "bool",
                type: "bool",
              },
              { name: "dataHook", internalType: "address", type: "address" },
              { name: "metadata", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "splitGroups",
            internalType: "struct JBSplitGroup[]",
            type: "tuple[]",
            components: [
              { name: "groupId", internalType: "uint256", type: "uint256" },
              {
                name: "splits",
                internalType: "struct JBSplit[]",
                type: "tuple[]",
                components: [
                  {
                    name: "preferAddToBalance",
                    internalType: "bool",
                    type: "bool",
                  },
                  { name: "percent", internalType: "uint256", type: "uint256" },
                  {
                    name: "projectId",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "beneficiary",
                    internalType: "address payable",
                    type: "address",
                  },
                  {
                    name: "lockedUntil",
                    internalType: "uint256",
                    type: "uint256",
                  },
                  {
                    name: "hook",
                    internalType: "contract IJBSplitHook",
                    type: "address",
                  },
                ],
              },
            ],
          },
          {
            name: "fundAccessLimitGroups",
            internalType: "struct JBFundAccessLimitGroup[]",
            type: "tuple[]",
            components: [
              { name: "terminal", internalType: "address", type: "address" },
              { name: "token", internalType: "address", type: "address" },
              {
                name: "payoutLimits",
                internalType: "struct JBCurrencyAmount[]",
                type: "tuple[]",
                components: [
                  { name: "amount", internalType: "uint256", type: "uint256" },
                  {
                    name: "currency",
                    internalType: "uint256",
                    type: "uint256",
                  },
                ],
              },
              {
                name: "surplusAllowances",
                internalType: "struct JBCurrencyAmount[]",
                type: "tuple[]",
                components: [
                  { name: "amount", internalType: "uint256", type: "uint256" },
                  {
                    name: "currency",
                    internalType: "uint256",
                    type: "uint256",
                  },
                ],
              },
            ],
          },
        ],
      },
      { name: "memo", internalType: "string", type: "string" },
    ],
    name: "queueRulesetsOf",
    outputs: [{ name: "rulesetId", internalType: "uint256", type: "uint256" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "queuedRulesetsOf",
    outputs: [
      {
        name: "queuedRulesets",
        internalType: "struct JBRulesetWithMetadata[]",
        type: "tuple[]",
        components: [
          {
            name: "ruleset",
            internalType: "struct JBRuleset",
            type: "tuple",
            components: [
              { name: "cycleNumber", internalType: "uint256", type: "uint256" },
              { name: "id", internalType: "uint256", type: "uint256" },
              { name: "basedOnId", internalType: "uint256", type: "uint256" },
              { name: "start", internalType: "uint256", type: "uint256" },
              { name: "duration", internalType: "uint256", type: "uint256" },
              { name: "weight", internalType: "uint256", type: "uint256" },
              { name: "decayRate", internalType: "uint256", type: "uint256" },
              {
                name: "approvalHook",
                internalType: "contract IJBRulesetApprovalHook",
                type: "address",
              },
              { name: "metadata", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "metadata",
            internalType: "struct JBRulesetMetadata",
            type: "tuple",
            components: [
              {
                name: "reservedRate",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "redemptionRate",
                internalType: "uint256",
                type: "uint256",
              },
              {
                name: "baseCurrency",
                internalType: "uint256",
                type: "uint256",
              },
              { name: "pausePay", internalType: "bool", type: "bool" },
              {
                name: "pauseCreditTransfers",
                internalType: "bool",
                type: "bool",
              },
              { name: "allowOwnerMinting", internalType: "bool", type: "bool" },
              {
                name: "allowTerminalMigration",
                internalType: "bool",
                type: "bool",
              },
              { name: "allowSetTerminals", internalType: "bool", type: "bool" },
              {
                name: "allowControllerMigration",
                internalType: "bool",
                type: "bool",
              },
              {
                name: "allowSetController",
                internalType: "bool",
                type: "bool",
              },
              { name: "holdFees", internalType: "bool", type: "bool" },
              {
                name: "useTotalSurplusForRedemptions",
                internalType: "bool",
                type: "bool",
              },
              { name: "useDataHookForPay", internalType: "bool", type: "bool" },
              {
                name: "useDataHookForRedeem",
                internalType: "bool",
                type: "bool",
              },
              { name: "dataHook", internalType: "address", type: "address" },
              { name: "metadata", internalType: "uint256", type: "uint256" },
            ],
          },
        ],
      },
    ],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "from", internalType: "contract IERC165", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
    ],
    name: "receiveMigrationFrom",
    outputs: [],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "memo", internalType: "string", type: "string" },
    ],
    name: "sendReservedTokensToSplitsOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "setControllerAllowed",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "metadata", internalType: "string", type: "string" },
    ],
    name: "setMetadataOf",
    outputs: [],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "rulesetId", internalType: "uint256", type: "uint256" },
      {
        name: "splitGroups",
        internalType: "struct JBSplitGroup[]",
        type: "tuple[]",
        components: [
          { name: "groupId", internalType: "uint256", type: "uint256" },
          {
            name: "splits",
            internalType: "struct JBSplit[]",
            type: "tuple[]",
            components: [
              {
                name: "preferAddToBalance",
                internalType: "bool",
                type: "bool",
              },
              { name: "percent", internalType: "uint256", type: "uint256" },
              { name: "projectId", internalType: "uint256", type: "uint256" },
              {
                name: "beneficiary",
                internalType: "address payable",
                type: "address",
              },
              { name: "lockedUntil", internalType: "uint256", type: "uint256" },
              {
                name: "hook",
                internalType: "contract IJBSplitHook",
                type: "address",
              },
            ],
          },
        ],
      },
    ],
    name: "setSplitGroupsOf",
    outputs: [],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "setTerminalsAllowed",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "contract IJBToken", type: "address" },
    ],
    name: "setTokenFor",
    outputs: [],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "interfaceId", internalType: "bytes4", type: "bytes4" }],
    name: "supportsInterface",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "totalTokenSupplyWithReservedTokensOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "holder", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "recipient", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
    ],
    name: "transferCreditsFrom",
    outputs: [],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "trustedForwarder",
    outputs: [{ name: "", internalType: "address", type: "address" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "upcomingRulesetOf",
    outputs: [
      {
        name: "ruleset",
        internalType: "struct JBRuleset",
        type: "tuple",
        components: [
          { name: "cycleNumber", internalType: "uint256", type: "uint256" },
          { name: "id", internalType: "uint256", type: "uint256" },
          { name: "basedOnId", internalType: "uint256", type: "uint256" },
          { name: "start", internalType: "uint256", type: "uint256" },
          { name: "duration", internalType: "uint256", type: "uint256" },
          { name: "weight", internalType: "uint256", type: "uint256" },
          { name: "decayRate", internalType: "uint256", type: "uint256" },
          {
            name: "approvalHook",
            internalType: "contract IJBRulesetApprovalHook",
            type: "address",
          },
          { name: "metadata", internalType: "uint256", type: "uint256" },
        ],
      },
      {
        name: "metadata",
        internalType: "struct JBRulesetMetadata",
        type: "tuple",
        components: [
          { name: "reservedRate", internalType: "uint256", type: "uint256" },
          { name: "redemptionRate", internalType: "uint256", type: "uint256" },
          { name: "baseCurrency", internalType: "uint256", type: "uint256" },
          { name: "pausePay", internalType: "bool", type: "bool" },
          { name: "pauseCreditTransfers", internalType: "bool", type: "bool" },
          { name: "allowOwnerMinting", internalType: "bool", type: "bool" },
          {
            name: "allowTerminalMigration",
            internalType: "bool",
            type: "bool",
          },
          { name: "allowSetTerminals", internalType: "bool", type: "bool" },
          {
            name: "allowControllerMigration",
            internalType: "bool",
            type: "bool",
          },
          { name: "allowSetController", internalType: "bool", type: "bool" },
          { name: "holdFees", internalType: "bool", type: "bool" },
          {
            name: "useTotalSurplusForRedemptions",
            internalType: "bool",
            type: "bool",
          },
          { name: "useDataHookForPay", internalType: "bool", type: "bool" },
          { name: "useDataHookForRedeem", internalType: "bool", type: "bool" },
          { name: "dataHook", internalType: "address", type: "address" },
          { name: "metadata", internalType: "uint256", type: "uint256" },
        ],
      },
    ],
  },
] as const;

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x719c79da361Ce133e9621a6f682Eff5DAB44E016)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x8c392FeF6bfEca79de5b7b43CDEe08B3Bd9d4ac4)
 */
export const jbControllerAddress = {
  11155111: "0x719c79da361Ce133e9621a6f682Eff5DAB44E016",
  11155420: "0x8c392FeF6bfEca79de5b7b43CDEe08B3Bd9d4ac4",
};

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x719c79da361Ce133e9621a6f682Eff5DAB44E016)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x8c392FeF6bfEca79de5b7b43CDEe08B3Bd9d4ac4)
 */
export const jbControllerConfig = {
  address: jbControllerAddress,
  abi: jbControllerABI,
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBDirectory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x499ca8d58C84509f665f19722ccC5e77B4615ACD)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x3bFfAFD76C495cFf542Cef8aA26fC9e35c8f3778)
 */
export const jbDirectoryABI = [
  {
    stateMutability: "nonpayable",
    type: "constructor",
    inputs: [
      {
        name: "permissions",
        internalType: "contract IJBPermissions",
        type: "address",
      },
      {
        name: "projects",
        internalType: "contract IJBProjects",
        type: "address",
      },
      { name: "owner", internalType: "address", type: "address" },
    ],
  },
  { type: "error", inputs: [], name: "DUPLICATE_TERMINALS" },
  { type: "error", inputs: [], name: "INVALID_PROJECT_ID_IN_DIRECTORY" },
  {
    type: "error",
    inputs: [{ name: "owner", internalType: "address", type: "address" }],
    name: "OwnableInvalidOwner",
  },
  {
    type: "error",
    inputs: [{ name: "account", internalType: "address", type: "address" }],
    name: "OwnableUnauthorizedAccount",
  },
  { type: "error", inputs: [], name: "SET_CONTROLLER_NOT_ALLOWED" },
  { type: "error", inputs: [], name: "SET_TERMINALS_NOT_ALLOWED" },
  { type: "error", inputs: [], name: "TOKEN_NOT_ACCEPTED" },
  { type: "error", inputs: [], name: "UNAUTHORIZED" },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "terminal",
        internalType: "contract IJBTerminal",
        type: "address",
        indexed: true,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "AddTerminal",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "previousOwner",
        internalType: "address",
        type: "address",
        indexed: true,
      },
      {
        name: "newOwner",
        internalType: "address",
        type: "address",
        indexed: true,
      },
    ],
    name: "OwnershipTransferred",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "controller",
        internalType: "contract IERC165",
        type: "address",
        indexed: true,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "SetController",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "addr", internalType: "address", type: "address", indexed: true },
      { name: "flag", internalType: "bool", type: "bool", indexed: true },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "SetIsAllowedToSetFirstController",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "token",
        internalType: "address",
        type: "address",
        indexed: true,
      },
      {
        name: "terminal",
        internalType: "contract IJBTerminal",
        type: "address",
        indexed: true,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "SetPrimaryTerminal",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "terminals",
        internalType: "contract IJBTerminal[]",
        type: "address[]",
        indexed: false,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "SetTerminals",
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "PERMISSIONS",
    outputs: [
      { name: "", internalType: "contract IJBPermissions", type: "address" },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "PROJECTS",
    outputs: [
      { name: "", internalType: "contract IJBProjects", type: "address" },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "controllerOf",
    outputs: [{ name: "", internalType: "contract IERC165", type: "address" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "addr", internalType: "address", type: "address" }],
    name: "isAllowedToSetFirstController",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      {
        name: "terminal",
        internalType: "contract IJBTerminal",
        type: "address",
      },
    ],
    name: "isTerminalOf",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "owner",
    outputs: [{ name: "", internalType: "address", type: "address" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
    ],
    name: "primaryTerminalOf",
    outputs: [
      { name: "", internalType: "contract IJBTerminal", type: "address" },
    ],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "controller", internalType: "contract IERC165", type: "address" },
    ],
    name: "setControllerOf",
    outputs: [],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "addr", internalType: "address", type: "address" },
      { name: "flag", internalType: "bool", type: "bool" },
    ],
    name: "setIsAllowedToSetFirstController",
    outputs: [],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
      {
        name: "terminal",
        internalType: "contract IJBTerminal",
        type: "address",
      },
    ],
    name: "setPrimaryTerminalOf",
    outputs: [],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      {
        name: "terminals",
        internalType: "contract IJBTerminal[]",
        type: "address[]",
      },
    ],
    name: "setTerminalsOf",
    outputs: [],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "terminalsOf",
    outputs: [
      { name: "", internalType: "contract IJBTerminal[]", type: "address[]" },
    ],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [{ name: "newOwner", internalType: "address", type: "address" }],
    name: "transferOwnership",
    outputs: [],
  },
];

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x499ca8d58C84509f665f19722ccC5e77B4615ACD)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x3bFfAFD76C495cFf542Cef8aA26fC9e35c8f3778)
 */
export const jbDirectoryAddress = {
  11155111: "0x499ca8d58C84509f665f19722ccC5e77B4615ACD",
  11155420: "0x3bFfAFD76C495cFf542Cef8aA26fC9e35c8f3778",
};

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x499ca8d58C84509f665f19722ccC5e77B4615ACD)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x3bFfAFD76C495cFf542Cef8aA26fC9e35c8f3778)
 */
export const jbDirectoryConfig = {
  address: jbDirectoryAddress,
  abi: jbDirectoryABI,
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBMultiTerminal
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc1Ce30883c7C25050BFE1F3e9139842bAc809E3a)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x98aB3D768D8134c57c963EE0ddd316F0E277f033)
 */
export const jbMultiTerminalABI = [
  {
    stateMutability: "nonpayable",
    type: "constructor",
    inputs: [
      {
        name: "permissions",
        internalType: "contract IJBPermissions",
        type: "address",
      },
      {
        name: "projects",
        internalType: "contract IJBProjects",
        type: "address",
      },
      {
        name: "directory",
        internalType: "contract IJBDirectory",
        type: "address",
      },
      { name: "splits", internalType: "contract IJBSplits", type: "address" },
      {
        name: "store",
        internalType: "contract IJBTerminalStore",
        type: "address",
      },
      {
        name: "feelessAddresses",
        internalType: "contract IJBFeelessAddresses",
        type: "address",
      },
      { name: "permit2", internalType: "contract IPermit2", type: "address" },
      { name: "trustedForwarder", internalType: "address", type: "address" },
    ],
  },
  { type: "error", inputs: [], name: "ACCOUNTING_CONTEXT_ALREADY_SET" },
  {
    type: "error",
    inputs: [{ name: "target", internalType: "address", type: "address" }],
    name: "AddressEmptyCode",
  },
  {
    type: "error",
    inputs: [{ name: "account", internalType: "address", type: "address" }],
    name: "AddressInsufficientBalance",
  },
  { type: "error", inputs: [], name: "FailedInnerCall" },
  { type: "error", inputs: [], name: "INADEQUATE_PAYOUT_AMOUNT" },
  { type: "error", inputs: [], name: "INADEQUATE_RECLAIM_AMOUNT" },
  { type: "error", inputs: [], name: "NO_MSG_VALUE_ALLOWED" },
  { type: "error", inputs: [], name: "OVERFLOW_ALERT" },
  { type: "error", inputs: [], name: "PERMIT_ALLOWANCE_NOT_ENOUGH" },
  {
    type: "error",
    inputs: [
      { name: "x", internalType: "uint256", type: "uint256" },
      { name: "y", internalType: "uint256", type: "uint256" },
      { name: "denominator", internalType: "uint256", type: "uint256" },
    ],
    name: "PRBMath_MulDiv_Overflow",
  },
  {
    type: "error",
    inputs: [{ name: "token", internalType: "address", type: "address" }],
    name: "SafeERC20FailedOperation",
  },
  { type: "error", inputs: [], name: "TERMINAL_TOKENS_INCOMPATIBLE" },
  { type: "error", inputs: [], name: "TOKEN_NOT_ACCEPTED" },
  { type: "error", inputs: [], name: "UNAUTHORIZED" },
  { type: "error", inputs: [], name: "UNDER_MIN_RETURNED_TOKENS" },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "amount",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "unlockedFees",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      { name: "memo", internalType: "string", type: "string", indexed: false },
      {
        name: "metadata",
        internalType: "bytes",
        type: "bytes",
        indexed: false,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "AddToBalance",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "token",
        internalType: "address",
        type: "address",
        indexed: true,
      },
      {
        name: "feeProjectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "amount",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      { name: "reason", internalType: "bytes", type: "bytes", indexed: false },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "FeeReverted",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "token",
        internalType: "address",
        type: "address",
        indexed: true,
      },
      {
        name: "amount",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      { name: "fee", internalType: "uint256", type: "uint256", indexed: false },
      {
        name: "beneficiary",
        internalType: "address",
        type: "address",
        indexed: false,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "HoldFee",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "hook",
        internalType: "contract IJBPayHook",
        type: "address",
        indexed: true,
      },
      {
        name: "context",
        internalType: "struct JBAfterPayRecordedContext",
        type: "tuple",
        components: [
          { name: "payer", internalType: "address", type: "address" },
          { name: "projectId", internalType: "uint256", type: "uint256" },
          { name: "rulesetId", internalType: "uint256", type: "uint256" },
          {
            name: "amount",
            internalType: "struct JBTokenAmount",
            type: "tuple",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "value", internalType: "uint256", type: "uint256" },
              { name: "decimals", internalType: "uint256", type: "uint256" },
              { name: "currency", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "forwardedAmount",
            internalType: "struct JBTokenAmount",
            type: "tuple",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "value", internalType: "uint256", type: "uint256" },
              { name: "decimals", internalType: "uint256", type: "uint256" },
              { name: "currency", internalType: "uint256", type: "uint256" },
            ],
          },
          { name: "weight", internalType: "uint256", type: "uint256" },
          {
            name: "projectTokenCount",
            internalType: "uint256",
            type: "uint256",
          },
          { name: "beneficiary", internalType: "address", type: "address" },
          { name: "hookMetadata", internalType: "bytes", type: "bytes" },
          { name: "payerMetadata", internalType: "bytes", type: "bytes" },
        ],
        indexed: false,
      },
      {
        name: "specificationAmount",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "HookAfterRecordPay",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "hook",
        internalType: "contract IJBRedeemHook",
        type: "address",
        indexed: true,
      },
      {
        name: "context",
        internalType: "struct JBAfterRedeemRecordedContext",
        type: "tuple",
        components: [
          { name: "holder", internalType: "address", type: "address" },
          { name: "projectId", internalType: "uint256", type: "uint256" },
          { name: "rulesetId", internalType: "uint256", type: "uint256" },
          { name: "redeemCount", internalType: "uint256", type: "uint256" },
          {
            name: "reclaimedAmount",
            internalType: "struct JBTokenAmount",
            type: "tuple",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "value", internalType: "uint256", type: "uint256" },
              { name: "decimals", internalType: "uint256", type: "uint256" },
              { name: "currency", internalType: "uint256", type: "uint256" },
            ],
          },
          {
            name: "forwardedAmount",
            internalType: "struct JBTokenAmount",
            type: "tuple",
            components: [
              { name: "token", internalType: "address", type: "address" },
              { name: "value", internalType: "uint256", type: "uint256" },
              { name: "decimals", internalType: "uint256", type: "uint256" },
              { name: "currency", internalType: "uint256", type: "uint256" },
            ],
          },
          { name: "redemptionRate", internalType: "uint256", type: "uint256" },
          {
            name: "beneficiary",
            internalType: "address payable",
            type: "address",
          },
          { name: "hookMetadata", internalType: "bytes", type: "bytes" },
          { name: "redeemerMetadata", internalType: "bytes", type: "bytes" },
        ],
        indexed: false,
      },
      {
        name: "specificationAmount",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      { name: "fee", internalType: "uint256", type: "uint256", indexed: false },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "HookAfterRecordRedeem",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "token",
        internalType: "address",
        type: "address",
        indexed: true,
      },
      {
        name: "to",
        internalType: "contract IJBTerminal",
        type: "address",
        indexed: true,
      },
      {
        name: "amount",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "MigrateTerminal",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "rulesetId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "rulesetCycleNumber",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "payer",
        internalType: "address",
        type: "address",
        indexed: false,
      },
      {
        name: "beneficiary",
        internalType: "address",
        type: "address",
        indexed: false,
      },
      {
        name: "amount",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "beneficiaryTokenCount",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      { name: "memo", internalType: "string", type: "string", indexed: false },
      {
        name: "metadata",
        internalType: "bytes",
        type: "bytes",
        indexed: false,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "Pay",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "split",
        internalType: "struct JBSplit",
        type: "tuple",
        components: [
          { name: "preferAddToBalance", internalType: "bool", type: "bool" },
          { name: "percent", internalType: "uint256", type: "uint256" },
          { name: "projectId", internalType: "uint256", type: "uint256" },
          {
            name: "beneficiary",
            internalType: "address payable",
            type: "address",
          },
          { name: "lockedUntil", internalType: "uint256", type: "uint256" },
          {
            name: "hook",
            internalType: "contract IJBSplitHook",
            type: "address",
          },
        ],
        indexed: false,
      },
      {
        name: "amount",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      { name: "reason", internalType: "bytes", type: "bytes", indexed: false },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "PayoutReverted",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "token",
        internalType: "address",
        type: "address",
        indexed: true,
      },
      {
        name: "amount",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      { name: "wasHeld", internalType: "bool", type: "bool", indexed: false },
      {
        name: "beneficiary",
        internalType: "address",
        type: "address",
        indexed: false,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "ProcessFee",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "rulesetId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "rulesetCycleNumber",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "holder",
        internalType: "address",
        type: "address",
        indexed: false,
      },
      {
        name: "beneficiary",
        internalType: "address",
        type: "address",
        indexed: false,
      },
      {
        name: "tokenCount",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "reclaimedAmount",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "metadata",
        internalType: "bytes",
        type: "bytes",
        indexed: false,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "RedeemTokens",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "token",
        internalType: "address",
        type: "address",
        indexed: true,
      },
      {
        name: "amount",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "returnedFees",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "leftoverAmount",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "ReturnHeldFees",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "rulesetId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "group",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "split",
        internalType: "struct JBSplit",
        type: "tuple",
        components: [
          { name: "preferAddToBalance", internalType: "bool", type: "bool" },
          { name: "percent", internalType: "uint256", type: "uint256" },
          { name: "projectId", internalType: "uint256", type: "uint256" },
          {
            name: "beneficiary",
            internalType: "address payable",
            type: "address",
          },
          { name: "lockedUntil", internalType: "uint256", type: "uint256" },
          {
            name: "hook",
            internalType: "contract IJBSplitHook",
            type: "address",
          },
        ],
        indexed: false,
      },
      {
        name: "amount",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "netAmount",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "SendPayoutToSplit",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "rulesetId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "rulesetCycleNumber",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "beneficiary",
        internalType: "address",
        type: "address",
        indexed: false,
      },
      {
        name: "amount",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "amountPaidOut",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      { name: "fee", internalType: "uint256", type: "uint256", indexed: false },
      {
        name: "beneficiaryDistributionAmount",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "SendPayouts",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "token",
        internalType: "address",
        type: "address",
        indexed: true,
      },
      {
        name: "context",
        internalType: "struct JBAccountingContext",
        type: "tuple",
        components: [
          { name: "token", internalType: "address", type: "address" },
          { name: "decimals", internalType: "uint8", type: "uint8" },
          { name: "currency", internalType: "uint32", type: "uint32" },
        ],
        indexed: false,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "SetAccountingContext",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "rulesetId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "rulesetCycleNumber",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "beneficiary",
        internalType: "address",
        type: "address",
        indexed: false,
      },
      {
        name: "amount",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "amountPaidOut",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "netAmountPaidOut",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      { name: "memo", internalType: "string", type: "string", indexed: false },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "UseAllowance",
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "DIRECTORY",
    outputs: [
      { name: "", internalType: "contract IJBDirectory", type: "address" },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "FEE",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "FEELESS_ADDRESSES",
    outputs: [
      {
        name: "",
        internalType: "contract IJBFeelessAddresses",
        type: "address",
      },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "PERMISSIONS",
    outputs: [
      { name: "", internalType: "contract IJBPermissions", type: "address" },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "PERMIT2",
    outputs: [{ name: "", internalType: "contract IPermit2", type: "address" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "PROJECTS",
    outputs: [
      { name: "", internalType: "contract IJBProjects", type: "address" },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "SPLITS",
    outputs: [
      { name: "", internalType: "contract IJBSplits", type: "address" },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "STORE",
    outputs: [
      { name: "", internalType: "contract IJBTerminalStore", type: "address" },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
    ],
    name: "accountingContextForTokenOf",
    outputs: [
      {
        name: "",
        internalType: "struct JBAccountingContext",
        type: "tuple",
        components: [
          { name: "token", internalType: "address", type: "address" },
          { name: "decimals", internalType: "uint8", type: "uint8" },
          { name: "currency", internalType: "uint32", type: "uint32" },
        ],
      },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "accountingContextsOf",
    outputs: [
      {
        name: "",
        internalType: "struct JBAccountingContext[]",
        type: "tuple[]",
        components: [
          { name: "token", internalType: "address", type: "address" },
          { name: "decimals", internalType: "uint8", type: "uint8" },
          { name: "currency", internalType: "uint32", type: "uint32" },
        ],
      },
    ],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "tokens", internalType: "address[]", type: "address[]" },
    ],
    name: "addAccountingContextsFor",
    outputs: [],
  },
  {
    stateMutability: "payable",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
      { name: "shouldReturnHeldFees", internalType: "bool", type: "bool" },
      { name: "memo", internalType: "string", type: "string" },
      { name: "metadata", internalType: "bytes", type: "bytes" },
    ],
    name: "addToBalanceOf",
    outputs: [],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "decimals", internalType: "uint256", type: "uint256" },
      { name: "currency", internalType: "uint256", type: "uint256" },
    ],
    name: "currentSurplusOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      {
        name: "split",
        internalType: "struct JBSplit",
        type: "tuple",
        components: [
          { name: "preferAddToBalance", internalType: "bool", type: "bool" },
          { name: "percent", internalType: "uint256", type: "uint256" },
          { name: "projectId", internalType: "uint256", type: "uint256" },
          {
            name: "beneficiary",
            internalType: "address payable",
            type: "address",
          },
          { name: "lockedUntil", internalType: "uint256", type: "uint256" },
          {
            name: "hook",
            internalType: "contract IJBSplitHook",
            type: "address",
          },
        ],
      },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
      {
        name: "originalMessageSender",
        internalType: "address",
        type: "address",
      },
    ],
    name: "executePayout",
    outputs: [
      { name: "netPayoutAmount", internalType: "uint256", type: "uint256" },
    ],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
      { name: "beneficiary", internalType: "address", type: "address" },
      {
        name: "feeTerminal",
        internalType: "contract IJBTerminal",
        type: "address",
      },
    ],
    name: "executeProcessFee",
    outputs: [],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
    ],
    name: "heldFeesOf",
    outputs: [
      {
        name: "",
        internalType: "struct JBFee[]",
        type: "tuple[]",
        components: [
          { name: "amount", internalType: "uint256", type: "uint256" },
          { name: "beneficiary", internalType: "address", type: "address" },
          { name: "unlockTimestamp", internalType: "uint256", type: "uint256" },
        ],
      },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "forwarder", internalType: "address", type: "address" }],
    name: "isTrustedForwarder",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
      { name: "to", internalType: "contract IJBTerminal", type: "address" },
    ],
    name: "migrateBalanceOf",
    outputs: [{ name: "balance", internalType: "uint256", type: "uint256" }],
  },
  {
    stateMutability: "payable",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
      { name: "beneficiary", internalType: "address", type: "address" },
      { name: "minReturnedTokens", internalType: "uint256", type: "uint256" },
      { name: "memo", internalType: "string", type: "string" },
      { name: "metadata", internalType: "bytes", type: "bytes" },
    ],
    name: "pay",
    outputs: [
      {
        name: "beneficiaryTokenCount",
        internalType: "uint256",
        type: "uint256",
      },
    ],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
    ],
    name: "processHeldFeesOf",
    outputs: [],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "holder", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "tokenToReclaim", internalType: "address", type: "address" },
      { name: "redeemCount", internalType: "uint256", type: "uint256" },
      { name: "minTokensReclaimed", internalType: "uint256", type: "uint256" },
      { name: "beneficiary", internalType: "address payable", type: "address" },
      { name: "metadata", internalType: "bytes", type: "bytes" },
    ],
    name: "redeemTokensOf",
    outputs: [
      { name: "reclaimAmount", internalType: "uint256", type: "uint256" },
    ],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
      { name: "currency", internalType: "uint256", type: "uint256" },
      { name: "minTokensPaidOut", internalType: "uint256", type: "uint256" },
    ],
    name: "sendPayoutsOf",
    outputs: [
      { name: "amountPaidOut", internalType: "uint256", type: "uint256" },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "interfaceId", internalType: "bytes4", type: "bytes4" }],
    name: "supportsInterface",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "trustedForwarder",
    outputs: [{ name: "", internalType: "address", type: "address" }],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
      { name: "currency", internalType: "uint256", type: "uint256" },
      { name: "minTokensPaidOut", internalType: "uint256", type: "uint256" },
      { name: "beneficiary", internalType: "address payable", type: "address" },
      { name: "memo", internalType: "string", type: "string" },
    ],
    name: "useAllowanceOf",
    outputs: [
      { name: "amountPaidOut", internalType: "uint256", type: "uint256" },
    ],
  },
];

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc1Ce30883c7C25050BFE1F3e9139842bAc809E3a)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x98aB3D768D8134c57c963EE0ddd316F0E277f033)
 */
export const jbMultiTerminalAddress = {
  11155111: "0xc1Ce30883c7C25050BFE1F3e9139842bAc809E3a",
  11155420: "0x98aB3D768D8134c57c963EE0ddd316F0E277f033",
};

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc1Ce30883c7C25050BFE1F3e9139842bAc809E3a)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x98aB3D768D8134c57c963EE0ddd316F0E277f033)
 */
export const jbMultiTerminalConfig = {
  address: jbMultiTerminalAddress,
  abi: jbMultiTerminalABI,
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBPermissions
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xDd68353f90B9c82eF1e6adf1F0f458c5f02534d6)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x7DF9C20A66dDAb3346ff8EAD69e6127e36722764)
 */
export const jbPermissionsABI = [
  { stateMutability: "nonpayable", type: "constructor", inputs: [] },
  { type: "error", inputs: [], name: "PERMISSION_ID_OUT_OF_BOUNDS" },
  { type: "error", inputs: [], name: "UNAUTHORIZED" },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "operator",
        internalType: "address",
        type: "address",
        indexed: true,
      },
      {
        name: "account",
        internalType: "address",
        type: "address",
        indexed: true,
      },
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "permissionIds",
        internalType: "uint256[]",
        type: "uint256[]",
        indexed: false,
      },
      {
        name: "packed",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "OperatorPermissionsSet",
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "PERMISSIONS",
    outputs: [
      { name: "", internalType: "contract IJBPermissions", type: "address" },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [
      { name: "operator", internalType: "address", type: "address" },
      { name: "account", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "permissionId", internalType: "uint256", type: "uint256" },
    ],
    name: "hasPermission",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [
      { name: "operator", internalType: "address", type: "address" },
      { name: "account", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "permissionIds", internalType: "uint256[]", type: "uint256[]" },
    ],
    name: "hasPermissions",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [
      { name: "operator", internalType: "address", type: "address" },
      { name: "account", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
    ],
    name: "permissionsOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "account", internalType: "address", type: "address" },
      {
        name: "permissionsData",
        internalType: "struct JBPermissionsData",
        type: "tuple",
        components: [
          { name: "operator", internalType: "address", type: "address" },
          { name: "projectId", internalType: "uint256", type: "uint256" },
          {
            name: "permissionIds",
            internalType: "uint256[]",
            type: "uint256[]",
          },
        ],
      },
    ],
    name: "setPermissionsFor",
    outputs: [],
  },
];

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xDd68353f90B9c82eF1e6adf1F0f458c5f02534d6)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x7DF9C20A66dDAb3346ff8EAD69e6127e36722764)
 */
export const jbPermissionsAddress = {
  11155111: "0xDd68353f90B9c82eF1e6adf1F0f458c5f02534d6",
  11155420: "0x7DF9C20A66dDAb3346ff8EAD69e6127e36722764",
};

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xDd68353f90B9c82eF1e6adf1F0f458c5f02534d6)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x7DF9C20A66dDAb3346ff8EAD69e6127e36722764)
 */
export const jbPermissionsConfig = {
  address: jbPermissionsAddress,
  abi: jbPermissionsABI,
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBProjects
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3bFfAFD76C495cFf542Cef8aA26fC9e35c8f3778)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xDd68353f90B9c82eF1e6adf1F0f458c5f02534d6)
 */
export const jbProjectsABI = [
  {
    stateMutability: "nonpayable",
    type: "constructor",
    inputs: [{ name: "owner", internalType: "address", type: "address" }],
  },
  { type: "error", inputs: [], name: "CheckpointUnorderedInsertion" },
  { type: "error", inputs: [], name: "ECDSAInvalidSignature" },
  {
    type: "error",
    inputs: [{ name: "length", internalType: "uint256", type: "uint256" }],
    name: "ECDSAInvalidSignatureLength",
  },
  {
    type: "error",
    inputs: [{ name: "s", internalType: "bytes32", type: "bytes32" }],
    name: "ECDSAInvalidSignatureS",
  },
  {
    type: "error",
    inputs: [
      { name: "timepoint", internalType: "uint256", type: "uint256" },
      { name: "clock", internalType: "uint48", type: "uint48" },
    ],
    name: "ERC5805FutureLookup",
  },
  { type: "error", inputs: [], name: "ERC6372InconsistentClock" },
  {
    type: "error",
    inputs: [
      { name: "sender", internalType: "address", type: "address" },
      { name: "tokenId", internalType: "uint256", type: "uint256" },
      { name: "owner", internalType: "address", type: "address" },
    ],
    name: "ERC721IncorrectOwner",
  },
  {
    type: "error",
    inputs: [
      { name: "operator", internalType: "address", type: "address" },
      { name: "tokenId", internalType: "uint256", type: "uint256" },
    ],
    name: "ERC721InsufficientApproval",
  },
  {
    type: "error",
    inputs: [{ name: "approver", internalType: "address", type: "address" }],
    name: "ERC721InvalidApprover",
  },
  {
    type: "error",
    inputs: [{ name: "operator", internalType: "address", type: "address" }],
    name: "ERC721InvalidOperator",
  },
  {
    type: "error",
    inputs: [{ name: "owner", internalType: "address", type: "address" }],
    name: "ERC721InvalidOwner",
  },
  {
    type: "error",
    inputs: [{ name: "receiver", internalType: "address", type: "address" }],
    name: "ERC721InvalidReceiver",
  },
  {
    type: "error",
    inputs: [{ name: "sender", internalType: "address", type: "address" }],
    name: "ERC721InvalidSender",
  },
  {
    type: "error",
    inputs: [{ name: "tokenId", internalType: "uint256", type: "uint256" }],
    name: "ERC721NonexistentToken",
  },
  {
    type: "error",
    inputs: [
      { name: "account", internalType: "address", type: "address" },
      { name: "currentNonce", internalType: "uint256", type: "uint256" },
    ],
    name: "InvalidAccountNonce",
  },
  { type: "error", inputs: [], name: "InvalidShortString" },
  {
    type: "error",
    inputs: [{ name: "owner", internalType: "address", type: "address" }],
    name: "OwnableInvalidOwner",
  },
  {
    type: "error",
    inputs: [{ name: "account", internalType: "address", type: "address" }],
    name: "OwnableUnauthorizedAccount",
  },
  {
    type: "error",
    inputs: [
      { name: "bits", internalType: "uint8", type: "uint8" },
      { name: "value", internalType: "uint256", type: "uint256" },
    ],
    name: "SafeCastOverflowedUintDowncast",
  },
  {
    type: "error",
    inputs: [{ name: "str", internalType: "string", type: "string" }],
    name: "StringTooLong",
  },
  {
    type: "error",
    inputs: [{ name: "expiry", internalType: "uint256", type: "uint256" }],
    name: "VotesExpiredSignature",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "owner",
        internalType: "address",
        type: "address",
        indexed: true,
      },
      {
        name: "approved",
        internalType: "address",
        type: "address",
        indexed: true,
      },
      {
        name: "tokenId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
    ],
    name: "Approval",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "owner",
        internalType: "address",
        type: "address",
        indexed: true,
      },
      {
        name: "operator",
        internalType: "address",
        type: "address",
        indexed: true,
      },
      { name: "approved", internalType: "bool", type: "bool", indexed: false },
    ],
    name: "ApprovalForAll",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "owner",
        internalType: "address",
        type: "address",
        indexed: true,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "Create",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "delegator",
        internalType: "address",
        type: "address",
        indexed: true,
      },
      {
        name: "fromDelegate",
        internalType: "address",
        type: "address",
        indexed: true,
      },
      {
        name: "toDelegate",
        internalType: "address",
        type: "address",
        indexed: true,
      },
    ],
    name: "DelegateChanged",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "delegate",
        internalType: "address",
        type: "address",
        indexed: true,
      },
      {
        name: "previousVotes",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "newVotes",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
    ],
    name: "DelegateVotesChanged",
  },
  { type: "event", anonymous: false, inputs: [], name: "EIP712DomainChanged" },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "previousOwner",
        internalType: "address",
        type: "address",
        indexed: true,
      },
      {
        name: "newOwner",
        internalType: "address",
        type: "address",
        indexed: true,
      },
    ],
    name: "OwnershipTransferred",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "resolver",
        internalType: "contract IJBTokenUriResolver",
        type: "address",
        indexed: true,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "SetTokenUriResolver",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      { name: "from", internalType: "address", type: "address", indexed: true },
      { name: "to", internalType: "address", type: "address", indexed: true },
      {
        name: "tokenId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
    ],
    name: "Transfer",
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "CLOCK_MODE",
    outputs: [{ name: "", internalType: "string", type: "string" }],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "to", internalType: "address", type: "address" },
      { name: "tokenId", internalType: "uint256", type: "uint256" },
    ],
    name: "approve",
    outputs: [],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "owner", internalType: "address", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "clock",
    outputs: [{ name: "", internalType: "uint48", type: "uint48" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "count",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [{ name: "owner", internalType: "address", type: "address" }],
    name: "createFor",
    outputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [{ name: "delegatee", internalType: "address", type: "address" }],
    name: "delegate",
    outputs: [],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "delegatee", internalType: "address", type: "address" },
      { name: "nonce", internalType: "uint256", type: "uint256" },
      { name: "expiry", internalType: "uint256", type: "uint256" },
      { name: "v", internalType: "uint8", type: "uint8" },
      { name: "r", internalType: "bytes32", type: "bytes32" },
      { name: "s", internalType: "bytes32", type: "bytes32" },
    ],
    name: "delegateBySig",
    outputs: [],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "account", internalType: "address", type: "address" }],
    name: "delegates",
    outputs: [{ name: "", internalType: "address", type: "address" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "eip712Domain",
    outputs: [
      { name: "fields", internalType: "bytes1", type: "bytes1" },
      { name: "name", internalType: "string", type: "string" },
      { name: "version", internalType: "string", type: "string" },
      { name: "chainId", internalType: "uint256", type: "uint256" },
      { name: "verifyingContract", internalType: "address", type: "address" },
      { name: "salt", internalType: "bytes32", type: "bytes32" },
      { name: "extensions", internalType: "uint256[]", type: "uint256[]" },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "tokenId", internalType: "uint256", type: "uint256" }],
    name: "getApproved",
    outputs: [{ name: "", internalType: "address", type: "address" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "timepoint", internalType: "uint256", type: "uint256" }],
    name: "getPastTotalSupply",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [
      { name: "account", internalType: "address", type: "address" },
      { name: "timepoint", internalType: "uint256", type: "uint256" },
    ],
    name: "getPastVotes",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "account", internalType: "address", type: "address" }],
    name: "getVotes",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [
      { name: "owner", internalType: "address", type: "address" },
      { name: "operator", internalType: "address", type: "address" },
    ],
    name: "isApprovedForAll",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "name",
    outputs: [{ name: "", internalType: "string", type: "string" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "owner", internalType: "address", type: "address" }],
    name: "nonces",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "owner",
    outputs: [{ name: "", internalType: "address", type: "address" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "tokenId", internalType: "uint256", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ name: "", internalType: "address", type: "address" }],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "from", internalType: "address", type: "address" },
      { name: "to", internalType: "address", type: "address" },
      { name: "tokenId", internalType: "uint256", type: "uint256" },
    ],
    name: "safeTransferFrom",
    outputs: [],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "from", internalType: "address", type: "address" },
      { name: "to", internalType: "address", type: "address" },
      { name: "tokenId", internalType: "uint256", type: "uint256" },
      { name: "data", internalType: "bytes", type: "bytes" },
    ],
    name: "safeTransferFrom",
    outputs: [],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "operator", internalType: "address", type: "address" },
      { name: "approved", internalType: "bool", type: "bool" },
    ],
    name: "setApprovalForAll",
    outputs: [],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      {
        name: "newResolver",
        internalType: "contract IJBTokenUriResolver",
        type: "address",
      },
    ],
    name: "setTokenUriResolver",
    outputs: [],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "interfaceId", internalType: "bytes4", type: "bytes4" }],
    name: "supportsInterface",
    outputs: [{ name: "", internalType: "bool", type: "bool" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", internalType: "string", type: "string" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ name: "", internalType: "string", type: "string" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "tokenUriResolver",
    outputs: [
      {
        name: "",
        internalType: "contract IJBTokenUriResolver",
        type: "address",
      },
    ],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "from", internalType: "address", type: "address" },
      { name: "to", internalType: "address", type: "address" },
      { name: "tokenId", internalType: "uint256", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [{ name: "newOwner", internalType: "address", type: "address" }],
    name: "transferOwnership",
    outputs: [],
  },
];

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3bFfAFD76C495cFf542Cef8aA26fC9e35c8f3778)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xDd68353f90B9c82eF1e6adf1F0f458c5f02534d6)
 */
export const jbProjectsAddress = {
  11155111: "0x3bFfAFD76C495cFf542Cef8aA26fC9e35c8f3778",
  11155420: "0xDd68353f90B9c82eF1e6adf1F0f458c5f02534d6",
};

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x3bFfAFD76C495cFf542Cef8aA26fC9e35c8f3778)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xDd68353f90B9c82eF1e6adf1F0f458c5f02534d6)
 */
export const jbProjectsConfig = {
  address: jbProjectsAddress,
  abi: jbProjectsABI,
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBRulesets
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9e5e08Af158b4E4fdb77ee68873FE9Ac582BF4bC)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xF1a10C55D13bFea9d1CFE47540F6eC7b84f8377D)
 */
export const jbRulesetsABI = [
  {
    stateMutability: "nonpayable",
    type: "constructor",
    inputs: [
      {
        name: "directory",
        internalType: "contract IJBDirectory",
        type: "address",
      },
    ],
  },
  { type: "error", inputs: [], name: "BLOCK_ALREADY_CONTAINS_RULESET" },
  { type: "error", inputs: [], name: "CONTROLLER_UNAUTHORIZED" },
  { type: "error", inputs: [], name: "INVALID_DECAY_RATE" },
  { type: "error", inputs: [], name: "INVALID_RULESET_APPROVAL_HOOK" },
  { type: "error", inputs: [], name: "INVALID_RULESET_DURATION" },
  { type: "error", inputs: [], name: "INVALID_RULESET_END_TIME" },
  { type: "error", inputs: [], name: "INVALID_WEIGHT" },
  {
    type: "error",
    inputs: [
      { name: "x", internalType: "uint256", type: "uint256" },
      { name: "y", internalType: "uint256", type: "uint256" },
      { name: "denominator", internalType: "uint256", type: "uint256" },
    ],
    name: "PRBMath_MulDiv_Overflow",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "rulesetId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "basedOnId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
    ],
    name: "RulesetInitialized",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "rulesetId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "duration",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "weight",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "decayRate",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "hook",
        internalType: "contract IJBRulesetApprovalHook",
        type: "address",
        indexed: false,
      },
      {
        name: "metadata",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "mustStartAtOrAfter",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "RulesetQueued",
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "DIRECTORY",
    outputs: [
      { name: "", internalType: "contract IJBDirectory", type: "address" },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "currentApprovalStatusForLatestRulesetOf",
    outputs: [
      { name: "", internalType: "enum JBApprovalStatus", type: "uint8" },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "currentOf",
    outputs: [
      {
        name: "ruleset",
        internalType: "struct JBRuleset",
        type: "tuple",
        components: [
          { name: "cycleNumber", internalType: "uint256", type: "uint256" },
          { name: "id", internalType: "uint256", type: "uint256" },
          { name: "basedOnId", internalType: "uint256", type: "uint256" },
          { name: "start", internalType: "uint256", type: "uint256" },
          { name: "duration", internalType: "uint256", type: "uint256" },
          { name: "weight", internalType: "uint256", type: "uint256" },
          { name: "decayRate", internalType: "uint256", type: "uint256" },
          {
            name: "approvalHook",
            internalType: "contract IJBRulesetApprovalHook",
            type: "address",
          },
          { name: "metadata", internalType: "uint256", type: "uint256" },
        ],
      },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "rulesetId", internalType: "uint256", type: "uint256" },
    ],
    name: "getRulesetOf",
    outputs: [
      {
        name: "ruleset",
        internalType: "struct JBRuleset",
        type: "tuple",
        components: [
          { name: "cycleNumber", internalType: "uint256", type: "uint256" },
          { name: "id", internalType: "uint256", type: "uint256" },
          { name: "basedOnId", internalType: "uint256", type: "uint256" },
          { name: "start", internalType: "uint256", type: "uint256" },
          { name: "duration", internalType: "uint256", type: "uint256" },
          { name: "weight", internalType: "uint256", type: "uint256" },
          { name: "decayRate", internalType: "uint256", type: "uint256" },
          {
            name: "approvalHook",
            internalType: "contract IJBRulesetApprovalHook",
            type: "address",
          },
          { name: "metadata", internalType: "uint256", type: "uint256" },
        ],
      },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "latestQueuedRulesetOf",
    outputs: [
      {
        name: "ruleset",
        internalType: "struct JBRuleset",
        type: "tuple",
        components: [
          { name: "cycleNumber", internalType: "uint256", type: "uint256" },
          { name: "id", internalType: "uint256", type: "uint256" },
          { name: "basedOnId", internalType: "uint256", type: "uint256" },
          { name: "start", internalType: "uint256", type: "uint256" },
          { name: "duration", internalType: "uint256", type: "uint256" },
          { name: "weight", internalType: "uint256", type: "uint256" },
          { name: "decayRate", internalType: "uint256", type: "uint256" },
          {
            name: "approvalHook",
            internalType: "contract IJBRulesetApprovalHook",
            type: "address",
          },
          { name: "metadata", internalType: "uint256", type: "uint256" },
        ],
      },
      {
        name: "approvalStatus",
        internalType: "enum JBApprovalStatus",
        type: "uint8",
      },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "latestRulesetIdOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "duration", internalType: "uint256", type: "uint256" },
      { name: "weight", internalType: "uint256", type: "uint256" },
      { name: "decayRate", internalType: "uint256", type: "uint256" },
      {
        name: "approvalHook",
        internalType: "contract IJBRulesetApprovalHook",
        type: "address",
      },
      { name: "metadata", internalType: "uint256", type: "uint256" },
      { name: "mustStartAtOrAfter", internalType: "uint256", type: "uint256" },
    ],
    name: "queueFor",
    outputs: [
      {
        name: "",
        internalType: "struct JBRuleset",
        type: "tuple",
        components: [
          { name: "cycleNumber", internalType: "uint256", type: "uint256" },
          { name: "id", internalType: "uint256", type: "uint256" },
          { name: "basedOnId", internalType: "uint256", type: "uint256" },
          { name: "start", internalType: "uint256", type: "uint256" },
          { name: "duration", internalType: "uint256", type: "uint256" },
          { name: "weight", internalType: "uint256", type: "uint256" },
          { name: "decayRate", internalType: "uint256", type: "uint256" },
          {
            name: "approvalHook",
            internalType: "contract IJBRulesetApprovalHook",
            type: "address",
          },
          { name: "metadata", internalType: "uint256", type: "uint256" },
        ],
      },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "queuedRulesetsOf",
    outputs: [
      {
        name: "queuedRulesets",
        internalType: "struct JBRuleset[]",
        type: "tuple[]",
        components: [
          { name: "cycleNumber", internalType: "uint256", type: "uint256" },
          { name: "id", internalType: "uint256", type: "uint256" },
          { name: "basedOnId", internalType: "uint256", type: "uint256" },
          { name: "start", internalType: "uint256", type: "uint256" },
          { name: "duration", internalType: "uint256", type: "uint256" },
          { name: "weight", internalType: "uint256", type: "uint256" },
          { name: "decayRate", internalType: "uint256", type: "uint256" },
          {
            name: "approvalHook",
            internalType: "contract IJBRulesetApprovalHook",
            type: "address",
          },
          { name: "metadata", internalType: "uint256", type: "uint256" },
        ],
      },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "upcomingRulesetOf",
    outputs: [
      {
        name: "ruleset",
        internalType: "struct JBRuleset",
        type: "tuple",
        components: [
          { name: "cycleNumber", internalType: "uint256", type: "uint256" },
          { name: "id", internalType: "uint256", type: "uint256" },
          { name: "basedOnId", internalType: "uint256", type: "uint256" },
          { name: "start", internalType: "uint256", type: "uint256" },
          { name: "duration", internalType: "uint256", type: "uint256" },
          { name: "weight", internalType: "uint256", type: "uint256" },
          { name: "decayRate", internalType: "uint256", type: "uint256" },
          {
            name: "approvalHook",
            internalType: "contract IJBRulesetApprovalHook",
            type: "address",
          },
          { name: "metadata", internalType: "uint256", type: "uint256" },
        ],
      },
    ],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "updateRulesetWeightCache",
    outputs: [],
  },
];

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9e5e08Af158b4E4fdb77ee68873FE9Ac582BF4bC)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xF1a10C55D13bFea9d1CFE47540F6eC7b84f8377D)
 */
export const jbRulesetsAddress = {
  11155111: "0x9e5e08Af158b4E4fdb77ee68873FE9Ac582BF4bC",
  11155420: "0xF1a10C55D13bFea9d1CFE47540F6eC7b84f8377D",
};

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x9e5e08Af158b4E4fdb77ee68873FE9Ac582BF4bC)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xF1a10C55D13bFea9d1CFE47540F6eC7b84f8377D)
 */
export const jbRulesetsConfig = {
  address: jbRulesetsAddress,
  abi: jbRulesetsABI,
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBSplits
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xF1a10C55D13bFea9d1CFE47540F6eC7b84f8377D)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x499ca8d58C84509f665f19722ccC5e77B4615ACD)
 */
export const jbSplitsABI = [
  {
    stateMutability: "nonpayable",
    type: "constructor",
    inputs: [
      {
        name: "directory",
        internalType: "contract IJBDirectory",
        type: "address",
      },
    ],
  },
  { type: "error", inputs: [], name: "CONTROLLER_UNAUTHORIZED" },
  { type: "error", inputs: [], name: "INVALID_LOCKED_UNTIL" },
  { type: "error", inputs: [], name: "INVALID_PROJECT_ID" },
  { type: "error", inputs: [], name: "INVALID_SPLIT_PERCENT" },
  { type: "error", inputs: [], name: "INVALID_TOTAL_PERCENT" },
  { type: "error", inputs: [], name: "PREVIOUS_LOCKED_SPLITS_NOT_INCLUDED" },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "rulesetId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "group",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "split",
        internalType: "struct JBSplit",
        type: "tuple",
        components: [
          { name: "preferAddToBalance", internalType: "bool", type: "bool" },
          { name: "percent", internalType: "uint256", type: "uint256" },
          { name: "projectId", internalType: "uint256", type: "uint256" },
          {
            name: "beneficiary",
            internalType: "address payable",
            type: "address",
          },
          { name: "lockedUntil", internalType: "uint256", type: "uint256" },
          {
            name: "hook",
            internalType: "contract IJBSplitHook",
            type: "address",
          },
        ],
        indexed: false,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "SetSplit",
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "DIRECTORY",
    outputs: [
      { name: "", internalType: "contract IJBDirectory", type: "address" },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "FALLBACK_RULESET_ID",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "rulesetId", internalType: "uint256", type: "uint256" },
      {
        name: "splitGroups",
        internalType: "struct JBSplitGroup[]",
        type: "tuple[]",
        components: [
          { name: "groupId", internalType: "uint256", type: "uint256" },
          {
            name: "splits",
            internalType: "struct JBSplit[]",
            type: "tuple[]",
            components: [
              {
                name: "preferAddToBalance",
                internalType: "bool",
                type: "bool",
              },
              { name: "percent", internalType: "uint256", type: "uint256" },
              { name: "projectId", internalType: "uint256", type: "uint256" },
              {
                name: "beneficiary",
                internalType: "address payable",
                type: "address",
              },
              { name: "lockedUntil", internalType: "uint256", type: "uint256" },
              {
                name: "hook",
                internalType: "contract IJBSplitHook",
                type: "address",
              },
            ],
          },
        ],
      },
    ],
    name: "setSplitGroupsOf",
    outputs: [],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "rulesetId", internalType: "uint256", type: "uint256" },
      { name: "groupId", internalType: "uint256", type: "uint256" },
    ],
    name: "splitsOf",
    outputs: [
      {
        name: "splits",
        internalType: "struct JBSplit[]",
        type: "tuple[]",
        components: [
          { name: "preferAddToBalance", internalType: "bool", type: "bool" },
          { name: "percent", internalType: "uint256", type: "uint256" },
          { name: "projectId", internalType: "uint256", type: "uint256" },
          {
            name: "beneficiary",
            internalType: "address payable",
            type: "address",
          },
          { name: "lockedUntil", internalType: "uint256", type: "uint256" },
          {
            name: "hook",
            internalType: "contract IJBSplitHook",
            type: "address",
          },
        ],
      },
    ],
  },
];

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xF1a10C55D13bFea9d1CFE47540F6eC7b84f8377D)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x499ca8d58C84509f665f19722ccC5e77B4615ACD)
 */
export const jbSplitsAddress = {
  11155111: "0xF1a10C55D13bFea9d1CFE47540F6eC7b84f8377D",
  11155420: "0x499ca8d58C84509f665f19722ccC5e77B4615ACD",
};

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xF1a10C55D13bFea9d1CFE47540F6eC7b84f8377D)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x499ca8d58C84509f665f19722ccC5e77B4615ACD)
 */
export const jbSplitsConfig = { address: jbSplitsAddress, abi: jbSplitsABI };

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBTerminalStore
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x0EE03cc18403862D2Bf17c8E65A28Bf0685Ce041)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xEACa4242B1DaAf00cC61431F32dE22e8fB76386F)
 */
export const jbTerminalStoreABI = [
  {
    stateMutability: "nonpayable",
    type: "constructor",
    inputs: [
      {
        name: "directory",
        internalType: "contract IJBDirectory",
        type: "address",
      },
      {
        name: "rulesets",
        internalType: "contract IJBRulesets",
        type: "address",
      },
      { name: "prices", internalType: "contract IJBPrices", type: "address" },
    ],
  },
  { type: "error", inputs: [], name: "INADEQUATE_CONTROLLER_ALLOWANCE" },
  { type: "error", inputs: [], name: "INADEQUATE_TERMINAL_STORE_BALANCE" },
  { type: "error", inputs: [], name: "INSUFFICIENT_TOKENS" },
  { type: "error", inputs: [], name: "INVALID_AMOUNT_TO_SEND_HOOK" },
  { type: "error", inputs: [], name: "INVALID_RULESET" },
  { type: "error", inputs: [], name: "PAYOUT_LIMIT_EXCEEDED" },
  {
    type: "error",
    inputs: [
      { name: "x", internalType: "uint256", type: "uint256" },
      { name: "y", internalType: "uint256", type: "uint256" },
      { name: "denominator", internalType: "uint256", type: "uint256" },
    ],
    name: "PRBMath_MulDiv_Overflow",
  },
  { type: "error", inputs: [], name: "RULESET_PAYMENT_PAUSED" },
  { type: "error", inputs: [], name: "ReentrancyGuardReentrantCall" },
  { type: "error", inputs: [], name: "TERMINAL_MIGRATION_NOT_ALLOWED" },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "DIRECTORY",
    outputs: [
      { name: "", internalType: "contract IJBDirectory", type: "address" },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "PRICES",
    outputs: [
      { name: "", internalType: "contract IJBPrices", type: "address" },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "RULESETS",
    outputs: [
      { name: "", internalType: "contract IJBRulesets", type: "address" },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [
      { name: "terminal", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
    ],
    name: "balanceOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [
      { name: "terminal", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      {
        name: "accountingContexts",
        internalType: "struct JBAccountingContext[]",
        type: "tuple[]",
        components: [
          { name: "token", internalType: "address", type: "address" },
          { name: "decimals", internalType: "uint8", type: "uint8" },
          { name: "currency", internalType: "uint32", type: "uint32" },
        ],
      },
      { name: "decimals", internalType: "uint256", type: "uint256" },
      { name: "currency", internalType: "uint256", type: "uint256" },
      { name: "tokenCount", internalType: "uint256", type: "uint256" },
      { name: "useTotalSurplus", internalType: "bool", type: "bool" },
    ],
    name: "currentReclaimableSurplusOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "tokenCount", internalType: "uint256", type: "uint256" },
      { name: "totalSupply", internalType: "uint256", type: "uint256" },
      { name: "surplus", internalType: "uint256", type: "uint256" },
    ],
    name: "currentReclaimableSurplusOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [
      { name: "terminal", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      {
        name: "accountingContexts",
        internalType: "struct JBAccountingContext[]",
        type: "tuple[]",
        components: [
          { name: "token", internalType: "address", type: "address" },
          { name: "decimals", internalType: "uint8", type: "uint8" },
          { name: "currency", internalType: "uint32", type: "uint32" },
        ],
      },
      { name: "decimals", internalType: "uint256", type: "uint256" },
      { name: "currency", internalType: "uint256", type: "uint256" },
    ],
    name: "currentSurplusOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "decimals", internalType: "uint256", type: "uint256" },
      { name: "currency", internalType: "uint256", type: "uint256" },
    ],
    name: "currentTotalSurplusOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
    ],
    name: "recordAddedBalanceFor",
    outputs: [],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "payer", internalType: "address", type: "address" },
      {
        name: "amount",
        internalType: "struct JBTokenAmount",
        type: "tuple",
        components: [
          { name: "token", internalType: "address", type: "address" },
          { name: "value", internalType: "uint256", type: "uint256" },
          { name: "decimals", internalType: "uint256", type: "uint256" },
          { name: "currency", internalType: "uint256", type: "uint256" },
        ],
      },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "beneficiary", internalType: "address", type: "address" },
      { name: "metadata", internalType: "bytes", type: "bytes" },
    ],
    name: "recordPaymentFrom",
    outputs: [
      {
        name: "ruleset",
        internalType: "struct JBRuleset",
        type: "tuple",
        components: [
          { name: "cycleNumber", internalType: "uint256", type: "uint256" },
          { name: "id", internalType: "uint256", type: "uint256" },
          { name: "basedOnId", internalType: "uint256", type: "uint256" },
          { name: "start", internalType: "uint256", type: "uint256" },
          { name: "duration", internalType: "uint256", type: "uint256" },
          { name: "weight", internalType: "uint256", type: "uint256" },
          { name: "decayRate", internalType: "uint256", type: "uint256" },
          {
            name: "approvalHook",
            internalType: "contract IJBRulesetApprovalHook",
            type: "address",
          },
          { name: "metadata", internalType: "uint256", type: "uint256" },
        ],
      },
      { name: "tokenCount", internalType: "uint256", type: "uint256" },
      {
        name: "hookSpecifications",
        internalType: "struct JBPayHookSpecification[]",
        type: "tuple[]",
        components: [
          {
            name: "hook",
            internalType: "contract IJBPayHook",
            type: "address",
          },
          { name: "amount", internalType: "uint256", type: "uint256" },
          { name: "metadata", internalType: "bytes", type: "bytes" },
        ],
      },
    ],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      {
        name: "accountingContext",
        internalType: "struct JBAccountingContext",
        type: "tuple",
        components: [
          { name: "token", internalType: "address", type: "address" },
          { name: "decimals", internalType: "uint8", type: "uint8" },
          { name: "currency", internalType: "uint32", type: "uint32" },
        ],
      },
      { name: "amount", internalType: "uint256", type: "uint256" },
      { name: "currency", internalType: "uint256", type: "uint256" },
    ],
    name: "recordPayoutFor",
    outputs: [
      {
        name: "ruleset",
        internalType: "struct JBRuleset",
        type: "tuple",
        components: [
          { name: "cycleNumber", internalType: "uint256", type: "uint256" },
          { name: "id", internalType: "uint256", type: "uint256" },
          { name: "basedOnId", internalType: "uint256", type: "uint256" },
          { name: "start", internalType: "uint256", type: "uint256" },
          { name: "duration", internalType: "uint256", type: "uint256" },
          { name: "weight", internalType: "uint256", type: "uint256" },
          { name: "decayRate", internalType: "uint256", type: "uint256" },
          {
            name: "approvalHook",
            internalType: "contract IJBRulesetApprovalHook",
            type: "address",
          },
          { name: "metadata", internalType: "uint256", type: "uint256" },
        ],
      },
      { name: "amountPaidOut", internalType: "uint256", type: "uint256" },
    ],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "holder", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "redeemCount", internalType: "uint256", type: "uint256" },
      {
        name: "accountingContext",
        internalType: "struct JBAccountingContext",
        type: "tuple",
        components: [
          { name: "token", internalType: "address", type: "address" },
          { name: "decimals", internalType: "uint8", type: "uint8" },
          { name: "currency", internalType: "uint32", type: "uint32" },
        ],
      },
      {
        name: "balanceAccountingContexts",
        internalType: "struct JBAccountingContext[]",
        type: "tuple[]",
        components: [
          { name: "token", internalType: "address", type: "address" },
          { name: "decimals", internalType: "uint8", type: "uint8" },
          { name: "currency", internalType: "uint32", type: "uint32" },
        ],
      },
      { name: "metadata", internalType: "bytes", type: "bytes" },
    ],
    name: "recordRedemptionFor",
    outputs: [
      {
        name: "ruleset",
        internalType: "struct JBRuleset",
        type: "tuple",
        components: [
          { name: "cycleNumber", internalType: "uint256", type: "uint256" },
          { name: "id", internalType: "uint256", type: "uint256" },
          { name: "basedOnId", internalType: "uint256", type: "uint256" },
          { name: "start", internalType: "uint256", type: "uint256" },
          { name: "duration", internalType: "uint256", type: "uint256" },
          { name: "weight", internalType: "uint256", type: "uint256" },
          { name: "decayRate", internalType: "uint256", type: "uint256" },
          {
            name: "approvalHook",
            internalType: "contract IJBRulesetApprovalHook",
            type: "address",
          },
          { name: "metadata", internalType: "uint256", type: "uint256" },
        ],
      },
      { name: "reclaimAmount", internalType: "uint256", type: "uint256" },
      {
        name: "hookSpecifications",
        internalType: "struct JBRedeemHookSpecification[]",
        type: "tuple[]",
        components: [
          {
            name: "hook",
            internalType: "contract IJBRedeemHook",
            type: "address",
          },
          { name: "amount", internalType: "uint256", type: "uint256" },
          { name: "metadata", internalType: "bytes", type: "bytes" },
        ],
      },
    ],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
    ],
    name: "recordTerminalMigration",
    outputs: [{ name: "balance", internalType: "uint256", type: "uint256" }],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      {
        name: "accountingContext",
        internalType: "struct JBAccountingContext",
        type: "tuple",
        components: [
          { name: "token", internalType: "address", type: "address" },
          { name: "decimals", internalType: "uint8", type: "uint8" },
          { name: "currency", internalType: "uint32", type: "uint32" },
        ],
      },
      { name: "amount", internalType: "uint256", type: "uint256" },
      { name: "currency", internalType: "uint256", type: "uint256" },
    ],
    name: "recordUsedAllowanceOf",
    outputs: [
      {
        name: "ruleset",
        internalType: "struct JBRuleset",
        type: "tuple",
        components: [
          { name: "cycleNumber", internalType: "uint256", type: "uint256" },
          { name: "id", internalType: "uint256", type: "uint256" },
          { name: "basedOnId", internalType: "uint256", type: "uint256" },
          { name: "start", internalType: "uint256", type: "uint256" },
          { name: "duration", internalType: "uint256", type: "uint256" },
          { name: "weight", internalType: "uint256", type: "uint256" },
          { name: "decayRate", internalType: "uint256", type: "uint256" },
          {
            name: "approvalHook",
            internalType: "contract IJBRulesetApprovalHook",
            type: "address",
          },
          { name: "metadata", internalType: "uint256", type: "uint256" },
        ],
      },
      { name: "usedAmount", internalType: "uint256", type: "uint256" },
    ],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [
      { name: "terminal", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
      { name: "rulesetCycleNumber", internalType: "uint256", type: "uint256" },
      { name: "currency", internalType: "uint256", type: "uint256" },
    ],
    name: "usedPayoutLimitOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [
      { name: "terminal", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "address", type: "address" },
      { name: "rulesetId", internalType: "uint256", type: "uint256" },
      { name: "currency", internalType: "uint256", type: "uint256" },
    ],
    name: "usedSurplusAllowanceOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
  },
];

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x0EE03cc18403862D2Bf17c8E65A28Bf0685Ce041)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xEACa4242B1DaAf00cC61431F32dE22e8fB76386F)
 */
export const jbTerminalStoreAddress = {
  11155111: "0x0EE03cc18403862D2Bf17c8E65A28Bf0685Ce041",
  11155420: "0xEACa4242B1DaAf00cC61431F32dE22e8fB76386F",
};

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x0EE03cc18403862D2Bf17c8E65A28Bf0685Ce041)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0xEACa4242B1DaAf00cC61431F32dE22e8fB76386F)
 */
export const jbTerminalStoreConfig = {
  address: jbTerminalStoreAddress,
  abi: jbTerminalStoreABI,
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// JBTokens
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x1A38F9f596E656f35F767B34Cf057f6fbe67F80A)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9e5e08Af158b4E4fdb77ee68873FE9Ac582BF4bC)
 */
export const jbTokensABI = [
  {
    stateMutability: "nonpayable",
    type: "constructor",
    inputs: [
      {
        name: "directory",
        internalType: "contract IJBDirectory",
        type: "address",
      },
    ],
  },
  { type: "error", inputs: [], name: "CONTROLLER_UNAUTHORIZED" },
  { type: "error", inputs: [], name: "EMPTY_NAME" },
  { type: "error", inputs: [], name: "EMPTY_SYMBOL" },
  { type: "error", inputs: [], name: "EMPTY_TOKEN" },
  { type: "error", inputs: [], name: "INSUFFICIENT_CREDITS" },
  { type: "error", inputs: [], name: "INSUFFICIENT_FUNDS" },
  { type: "error", inputs: [], name: "OVERFLOW_ALERT" },
  { type: "error", inputs: [], name: "PROJECT_ALREADY_HAS_TOKEN" },
  { type: "error", inputs: [], name: "RECIPIENT_ZERO_ADDRESS" },
  { type: "error", inputs: [], name: "TOKENS_MUST_HAVE_18_DECIMALS" },
  { type: "error", inputs: [], name: "TOKEN_ALREADY_SET" },
  { type: "error", inputs: [], name: "TOKEN_NOT_FOUND" },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "holder",
        internalType: "address",
        type: "address",
        indexed: true,
      },
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "amount",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "initialCreditBalance",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "initialTokenBalance",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "Burn",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "holder",
        internalType: "address",
        type: "address",
        indexed: true,
      },
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "initialCreditBalance",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "amount",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "beneficiary",
        internalType: "address",
        type: "address",
        indexed: false,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "ClaimTokens",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "token",
        internalType: "contract IJBToken",
        type: "address",
        indexed: true,
      },
      { name: "name", internalType: "string", type: "string", indexed: false },
      {
        name: "symbol",
        internalType: "string",
        type: "string",
        indexed: false,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "DeployERC20",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "holder",
        internalType: "address",
        type: "address",
        indexed: true,
      },
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "amount",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "tokensWereClaimed",
        internalType: "bool",
        type: "bool",
        indexed: false,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "Mint",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "newToken",
        internalType: "contract IJBToken",
        type: "address",
        indexed: true,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "SetToken",
  },
  {
    type: "event",
    anonymous: false,
    inputs: [
      {
        name: "holder",
        internalType: "address",
        type: "address",
        indexed: true,
      },
      {
        name: "projectId",
        internalType: "uint256",
        type: "uint256",
        indexed: true,
      },
      {
        name: "recipient",
        internalType: "address",
        type: "address",
        indexed: true,
      },
      {
        name: "amount",
        internalType: "uint256",
        type: "uint256",
        indexed: false,
      },
      {
        name: "caller",
        internalType: "address",
        type: "address",
        indexed: false,
      },
    ],
    name: "TransferCredits",
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [],
    name: "DIRECTORY",
    outputs: [
      { name: "", internalType: "contract IJBDirectory", type: "address" },
    ],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "holder", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "amount", internalType: "uint256", type: "uint256" },
    ],
    name: "burnFrom",
    outputs: [],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "holder", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "amount", internalType: "uint256", type: "uint256" },
      { name: "beneficiary", internalType: "address", type: "address" },
    ],
    name: "claimTokensFor",
    outputs: [],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [
      { name: "holder", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
    ],
    name: "creditBalanceOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "name", internalType: "string", type: "string" },
      { name: "symbol", internalType: "string", type: "string" },
    ],
    name: "deployERC20For",
    outputs: [
      { name: "token", internalType: "contract IJBToken", type: "address" },
    ],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "holder", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "amount", internalType: "uint256", type: "uint256" },
    ],
    name: "mintFor",
    outputs: [],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [
      { name: "token", internalType: "contract IJBToken", type: "address" },
    ],
    name: "projectIdOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "token", internalType: "contract IJBToken", type: "address" },
    ],
    name: "setTokenFor",
    outputs: [],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "tokenOf",
    outputs: [{ name: "", internalType: "contract IJBToken", type: "address" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [
      { name: "holder", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
    ],
    name: "totalBalanceOf",
    outputs: [{ name: "balance", internalType: "uint256", type: "uint256" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "totalCreditSupplyOf",
    outputs: [{ name: "", internalType: "uint256", type: "uint256" }],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "projectId", internalType: "uint256", type: "uint256" }],
    name: "totalSupplyOf",
    outputs: [
      { name: "totalSupply", internalType: "uint256", type: "uint256" },
    ],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "holder", internalType: "address", type: "address" },
      { name: "projectId", internalType: "uint256", type: "uint256" },
      { name: "recipient", internalType: "address", type: "address" },
      { name: "amount", internalType: "uint256", type: "uint256" },
    ],
    name: "transferCreditsFrom",
    outputs: [],
  },
];

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x1A38F9f596E656f35F767B34Cf057f6fbe67F80A)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9e5e08Af158b4E4fdb77ee68873FE9Ac582BF4bC)
 */
export const jbTokensAddress = {
  11155111: "0x1A38F9f596E656f35F767B34Cf057f6fbe67F80A",
  11155420: "0x9e5e08Af158b4E4fdb77ee68873FE9Ac582BF4bC",
};

/**
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x1A38F9f596E656f35F767B34Cf057f6fbe67F80A)
 * - [__View Contract on Optimism Sepolia Blockscout__](https://optimism-sepolia.blockscout.com/address/0x9e5e08Af158b4E4fdb77ee68873FE9Ac582BF4bC)
 */
export const jbTokensConfig = { address: jbTokensAddress, abi: jbTokensABI };
