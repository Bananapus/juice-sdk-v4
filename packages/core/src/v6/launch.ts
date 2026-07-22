import {
  Address,
  ContractFunctionArgs,
  Hex,
  PublicClient,
  decodeEventLog,
  isAddressEqual,
  zeroAddress,
} from "viem";
import { NATIVE_TOKEN, NATIVE_TOKEN_DECIMALS } from "../constants.js";
import { jbControllerAbi, jbProjectsAbi } from "../generated/juicebox.js";
import { JBChainId } from "../types.js";
import { BASE_CURRENCY_ETH, tokenCurrencyId } from "./currency.js";
import { JBRulesetConfig, JBRulesetMetadata } from "./rulesets.js";
import { JBAccountingContext } from "./terminals.js";
import { v6Address } from "./types.js";

type LaunchProjectArgs = ContractFunctionArgs<
  typeof jbControllerAbi,
  "payable",
  "launchProjectFor"
>;

/**
 * A terminal to attach to a project at launch, together with the accounting
 * contexts (tokens) it should accept.
 */
export type JBTerminalConfig = LaunchProjectArgs[3][number];

/**
 * A fund access limit group scoping how much of a terminal's token balance
 * the project can pay out / use as surplus allowance.
 */
export type JBFundAccessLimitGroup =
  JBRulesetConfig["fundAccessLimitGroups"][number];

/**
 * Read the fee (in wei) that `JBProjects` charges to create a new project.
 *
 * Launch transactions must send EXACTLY this value as `msg.value` or they
 * revert. The fee is dynamic — read it per chain right before launching, and
 * never reuse a value across chains.
 */
export async function getProjectCreationFee(
  client: PublicClient,
  chainId: JBChainId,
): Promise<bigint> {
  return client.readContract({
    address: v6Address("JBProjects", chainId),
    abi: jbProjectsAbi,
    functionName: "creationFee",
  });
}

/**
 * Build a `JBAccountingContext` for a token.
 *
 * The context currency is ALWAYS token-keyed: `uint32(uint160(token))`
 * (native token → 61166). This is distinct from a ruleset's `baseCurrency`,
 * which must be a standard currency id (ETH=1, USD=2) — never use a
 * token-keyed currency as a base currency to "skip the price feed".
 *
 * @param token The token address. Defaults to the native token sentinel
 * (`0x…EEEe`).
 * @param decimals The token's decimals. Defaults to 18 for the native token;
 * REQUIRED for any other token (there is no safe default).
 */
export function buildAccountingContext(
  token: Address = NATIVE_TOKEN,
  decimals?: number,
): JBAccountingContext {
  const isNative = token.toLowerCase() === NATIVE_TOKEN.toLowerCase();
  if (decimals === undefined && !isNative) {
    throw new Error(
      `decimals is required for non-native token ${token} (there is no safe default)`,
    );
  }
  return {
    token,
    decimals: decimals ?? NATIVE_TOKEN_DECIMALS,
    currency: tokenCurrencyId(token),
  };
}

/**
 * Build the standard terminal configurations for a launch:
 *
 * 1. `JBMultiTerminal` accepting the given accounting contexts (the
 *    project's treasury), and
 * 2. `JBRouterTerminalRegistry` with EMPTY accounting contexts — registering
 *    the router registry makes the project accept ANY token via swap
 *    routing. It is skipped on chains where it isn't deployed.
 *
 * @param args.accountingContexts The contexts the multi terminal accepts.
 * Defaults to just the native token context.
 */
export function buildTerminalConfigurations(args: {
  chainId: JBChainId;
  accountingContexts?: readonly JBAccountingContext[];
}): JBTerminalConfig[] {
  const configurations: JBTerminalConfig[] = [
    {
      terminal: v6Address("JBMultiTerminal", args.chainId),
      accountingContextsToAccept: args.accountingContexts ?? [
        buildAccountingContext(),
      ],
    },
  ];
  try {
    configurations.push({
      terminal: v6Address("JBRouterTerminalRegistry", args.chainId),
      accountingContextsToAccept: [],
    });
  } catch {
    // No router terminal registry on this chain — the multi terminal alone
    // is a valid configuration.
  }
  return configurations;
}

/**
 * Build a `JBRulesetMetadata` with safe defaults (v6 field names ONLY):
 * everything false/zero, `baseCurrency` ETH (1), no data hook.
 *
 * Note `scopeCashOutsToLocalBalances` is the v6 spelling — it replaces the
 * old inverted `useTotalSurplusForCashOuts`, and `false` keeps the v6
 * default behavior of cashing out against total surplus.
 *
 * @param overrides Any metadata fields to override.
 */
export function buildRulesetMetadata(
  overrides?: Partial<JBRulesetMetadata>,
): JBRulesetMetadata {
  return {
    reservedPercent: 0,
    cashOutTaxRate: 0,
    baseCurrency: BASE_CURRENCY_ETH,
    pausePay: false,
    pauseCreditTransfers: false,
    allowOwnerMinting: false,
    allowSetCustomToken: false,
    allowTerminalMigration: false,
    allowSetTerminals: false,
    allowSetController: false,
    allowAddAccountingContext: false,
    allowAddPriceFeed: false,
    ownerMustSendPayouts: false,
    holdFees: false,
    scopeCashOutsToLocalBalances: false,
    useDataHookForPay: false,
    useDataHookForCashOut: false,
    dataHook: zeroAddress,
    metadata: 0,
    ...overrides,
  };
}

/**
 * Build a `JBRulesetConfig` with safe defaults: starts as soon as possible,
 * no duration (rules can change any time), no issuance (`weight` 0), no
 * approval hook, default metadata, no splits, and ZERO payouts (an empty
 * `fundAccessLimitGroups` means the project can pay out NOTHING — funds can
 * only leave via cash outs).
 *
 * @param args.mustStartAtOrAfter Earliest start timestamp (uint48). 0 (the
 * default) starts at the deploy block. For omnichain launches pass ONE
 * shared timestamp so every chain's ruleset is byte-identical.
 * @param args.duration Seconds the ruleset is locked for. 0 = no duration.
 * @param args.weight Tokens issued per unit of `baseCurrency` paid, as an
 * 18-decimal fixed point (uint112). Later configurations can use the exported
 * `RULESET_WEIGHT_INHERIT` sentinel (1n); zero means genuine zero issuance.
 * @param args.weightCutPercent Issuance cut applied each cycle, out of 1e9.
 * @param args.approvalHook A deadline contract queued rulesets must clear.
 * @param args.metadata Ruleset metadata; see {@link buildRulesetMetadata}.
 * @param args.splitGroups Split groups to set alongside the ruleset.
 * @param args.fundAccessLimitGroups Payout limits / surplus allowances.
 */
export function buildRulesetConfiguration(args?: {
  mustStartAtOrAfter?: number;
  duration?: number;
  weight?: bigint;
  weightCutPercent?: number;
  approvalHook?: Address;
  metadata?: JBRulesetMetadata;
  splitGroups?: JBRulesetConfig["splitGroups"];
  fundAccessLimitGroups?: JBRulesetConfig["fundAccessLimitGroups"];
}): JBRulesetConfig {
  return {
    mustStartAtOrAfter: args?.mustStartAtOrAfter ?? 0,
    duration: args?.duration ?? 0,
    weight: args?.weight ?? 0n,
    weightCutPercent: args?.weightCutPercent ?? 0,
    approvalHook: args?.approvalHook ?? zeroAddress,
    metadata: args?.metadata ?? buildRulesetMetadata(),
    splitGroups: args?.splitGroups ?? [],
    fundAccessLimitGroups: args?.fundAccessLimitGroups ?? [],
  };
}

/**
 * Build a `JBController.launchProjectFor` transaction request creating a new
 * project on a single chain.
 *
 * The transaction is payable and must send EXACTLY the current project
 * creation fee — read it with {@link getProjectCreationFee} on the same
 * chain right before sending.
 *
 * @param args.owner The address that receives the project NFT (full control).
 * @param args.projectUri An IPFS URI (`ipfs://…`) pointing to the project's
 * metadata.
 * @param args.rulesetConfigurations The project's initial rulesets; see
 * {@link buildRulesetConfiguration}.
 * @param args.terminalConfigurations The project's terminals; see
 * {@link buildTerminalConfigurations}.
 * @param args.memo An optional memo emitted with the launch event.
 * @param args.creationFee The exact fee read from `JBProjects.creationFee()`.
 */
export function buildLaunchProjectTx(args: {
  chainId: JBChainId;
  owner: Address;
  projectUri: string;
  rulesetConfigurations: readonly JBRulesetConfig[];
  terminalConfigurations: readonly JBTerminalConfig[];
  memo?: string;
  creationFee: bigint;
}) {
  return {
    chainId: args.chainId,
    address: v6Address("JBController", args.chainId),
    abi: jbControllerAbi,
    functionName: "launchProjectFor" as const,
    args: [
      args.owner,
      args.projectUri,
      args.rulesetConfigurations,
      args.terminalConfigurations,
      args.memo ?? "",
    ] as const,
    value: args.creationFee,
  };
}

/** Minimal log shape needed to decode a project launch. */
export interface V6LaunchProjectLog {
  address: Address;
  data: Hex;
  topics: readonly Hex[];
}

/**
 * Decode a v6 `LaunchProject` log emitted by the canonical controller.
 *
 * Checking the emitter matters: unrelated contracts can emit an event with the
 * same signature, and ERC-721 `Transfer` logs in a complex receipt are not a
 * reliable way to identify which mint was the Juicebox project NFT.
 */
export function decodeLaunchProjectId(
  log: V6LaunchProjectLog,
  { chainId }: { chainId: JBChainId },
): bigint | null {
  if (!isAddressEqual(log.address, v6Address("JBController", chainId))) {
    return null;
  }

  try {
    const decoded = decodeEventLog({
      abi: jbControllerAbi,
      eventName: "LaunchProject",
      data: log.data,
      topics: log.topics as [Hex, ...Hex[]],
      strict: true,
    });
    return decoded.eventName === "LaunchProject"
      ? decoded.args.projectId
      : null;
  } catch {
    return null;
  }
}

/** Return the first canonical v6 project id found in a transaction's logs. */
export function projectIdFromLaunchLogs(
  logs: readonly V6LaunchProjectLog[],
  args: { chainId: JBChainId },
): bigint | null {
  for (const log of logs) {
    const projectId = decodeLaunchProjectId(log, args);
    if (projectId !== null) return projectId;
  }
  return null;
}
