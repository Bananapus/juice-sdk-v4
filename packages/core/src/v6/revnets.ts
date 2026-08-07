import { Address, ContractFunctionArgs, PublicClient } from "viem";
import { revDeployerAbi, revOwnerAbi } from "../generated/juicebox.js";
import { JBChainId } from "../types.js";
import { JBAccountingContext } from "./terminals.js";
import { v6Address } from "./types.js";

type RevDeployArgs = ContractFunctionArgs<
  typeof revDeployerAbi,
  "payable",
  "deployFor"
>;

type RevDeployArgs6 = Extract<
  RevDeployArgs,
  readonly [unknown, unknown, unknown, unknown, unknown, unknown]
>;

type RevDeployArgs4 = Extract<
  RevDeployArgs,
  readonly [unknown, unknown, unknown, unknown]
>;

/**
 * A revnet's full configuration: its token description (name/ticker/uri and
 * the salt that fixes the ERC-20's deterministic address), base currency
 * (either a token-keyed currency or a well-known `JBCurrencyIds` id such as
 * ETH=1 or USD=2), operator, and stage configurations.
 */
export type REVConfig = RevDeployArgs4[1];

/**
 * One stage of a revnet's lifecycle. See `buildRevnetStageConfig` for the
 * field encodings.
 */
export type REVStageConfig = REVConfig["stageConfigurations"][number];

/**
 * An auto-issuance: tokens minted without payment when a stage starts, to a
 * beneficiary on a specific chain. `count` is an 18-decimal fixed point.
 */
export type REVAutoIssuance = REVStageConfig["autoIssuances"][number];

/**
 * Sucker deployment configuration for a revnet (same shape the omnichain
 * deployer takes; build with `parseSuckerDeployerConfig(..., { version: 6 })`).
 */
export type REVSuckerDeploymentConfig = RevDeployArgs4[3];

/**
 * Configuration for deploying a tiered 721 hook alongside a revnet.
 */
export type REVDeploy721TiersHookConfig = RevDeployArgs6[4];

/**
 * A croptop allowed-post configuration: which 721 categories third parties
 * may post to, and at what minimum price/supply.
 */
export type REVCroptopAllowedPost = RevDeployArgs6[5][number];

/**
 * Ruleset `extraMetadata` bit 2: allows `REVDeployer.deploySuckersFor` to extend
 * the revnet to new chains while the stage is active (the deployer checks
 * `(metadata >> 2) & 1`). `extraMetadata` is folded into the revnet's immutable
 * encoded-configuration hash, so a stage without this bit can NEVER be extended —
 * there is no later fix.
 */
export const REV_METADATA_ALLOW_SUCKER_DEPLOYMENT = 1 << 2;

/**
 * Build a `REVStageConfig` (spec-exact encodings, documented per field).
 *
 * ENCODINGS:
 * - `startsAtOrAfter`: ABSOLUTE unix timestamp (uint48), strictly increasing
 *   across stages. For omnichain revnets, compute every stage's start as a
 *   cumulative offset from ONE shared deploy-start timestamp so the stage
 *   list is byte-identical on every chain.
 * - `splitPercent`: the share of issuance routed to splits, out of 10,000
 *   (e.g. 3,800 = 38%).
 * - `splits[].percent`: each split's share of the SPLIT BUCKET (not of total
 *   issuance), out of 1e9; the group must total exactly 1e9 — use
 *   `fillSplitPercents`.
 * - `initialIssuance`: tokens minted per unit of base currency, 18-decimal
 *   fixed point (uint112). The exported `RULESET_WEIGHT_INHERIT` sentinel
 *   (1n) means "inherit the previous stage's issuance with its cuts applied";
 *   zero means genuine zero issuance.
 * - `issuanceCutFrequency`: seconds between issuance cuts (should be >= 1
 *   day; it becomes the stage's ruleset duration).
 * - `issuanceCutPercent`: how much issuance drops each period, out of 1e9
 *   (`MAX_WEIGHT_CUT_PERCENT`; e.g. 20% = 200,000,000).
 * - `cashOutTaxRate`: out of 10,000 (`MAX_CASH_OUT_TAX_RATE`). Any non-zero
 *   rate makes EVERY cash out incur the 2.5% protocol fee; zero-tax cash outs
 *   still pay it on `min(reclaimAmount, feeFreeSurplusOf)`, which is often
 *   but not always zero.
 * - `extraMetadata`: extra metadata bits forwarded to hooks.
 *   {@link REV_METADATA_ALLOW_SUCKER_DEPLOYMENT} (bit 2) is ORed in by default
 *   so the revnet stays extendable to new chains; pass
 *   `allowSuckerDeployment: false` to opt out PERMANENTLY for the stage.
 */
export function buildRevnetStageConfig(args: {
  startsAtOrAfter: number;
  initialIssuance: bigint;
  autoIssuances?: readonly REVAutoIssuance[];
  splitPercent?: number;
  splits?: REVStageConfig["splits"];
  issuanceCutFrequency?: number;
  issuanceCutPercent?: number;
  cashOutTaxRate?: number;
  extraMetadata?: number;
  /**
   * Whether `REVDeployer.deploySuckersFor` may extend the revnet to new chains
   * during this stage. Defaults to TRUE — a stage without the bit is
   * un-extendable forever, since stages are immutable once deployed.
   */
  allowSuckerDeployment?: boolean;
}): REVStageConfig {
  const extraMetadata =
    args.allowSuckerDeployment === false
      ? (args.extraMetadata ?? 0)
      : (args.extraMetadata ?? 0) | REV_METADATA_ALLOW_SUCKER_DEPLOYMENT;
  return {
    startsAtOrAfter: args.startsAtOrAfter,
    autoIssuances: args.autoIssuances ?? [],
    splitPercent: args.splitPercent ?? 0,
    splits: args.splits ?? [],
    initialIssuance: args.initialIssuance,
    issuanceCutFrequency: args.issuanceCutFrequency ?? 0,
    issuanceCutPercent: args.issuanceCutPercent ?? 0,
    cashOutTaxRate: args.cashOutTaxRate ?? 0,
    extraMetadata,
  };
}

/**
 * Build a `REVDeployer.deployFor` transaction request deploying a new revnet
 * (or a 721-shop revnet when `tiered721Config` is given).
 *
 * Deploying a NEW revnet (`revnetId` 0n) is payable and must send EXACTLY the
 * current project creation fee — read it with `getProjectCreationFee` on the
 * same chain. Deploying for an EXISTING project must send no value (the
 * deployer reverts otherwise), so `creationFee` is ignored in that case.
 * For omnichain revnets, send one transaction per chain with an identical
 * `config` (shared description salt, shared absolute stage starts) and a
 * shared sucker salt.
 *
 * @param args.config The revnet configuration; see {@link REVConfig}.
 * @param args.accountingContexts The tokens the revnet accepts as reserves;
 * see `buildAccountingContext`.
 * @param args.suckerConfig Cross-chain sucker configuration (empty
 * `deployerConfigurations` for a single-chain revnet); build with
 * `parseSuckerDeployerConfig(chainId, chainIds, assets, { version: 6 })`.
 * @param args.revnetId The revnet to deploy for. Defaults to 0n (create a
 * NEW revnet).
 * @param args.tiered721Config Optional tiered 721 hook config — switches to
 * the 6-arg overload.
 * @param args.allowedPosts Croptop posting rules (only used with
 * `tiered721Config`). Defaults to none.
 */
export function buildDeployRevnetTx(args: {
  chainId: JBChainId;
  config: REVConfig;
  accountingContexts: readonly JBAccountingContext[];
  suckerConfig: REVSuckerDeploymentConfig;
  creationFee?: bigint;
  revnetId?: bigint;
  tiered721Config?: REVDeploy721TiersHookConfig;
  allowedPosts?: readonly REVCroptopAllowedPost[];
}) {
  const address = v6Address("REVDeployer", args.chainId);
  const revnetId = args.revnetId ?? 0n;

  // An omnichain revnet whose stages lack the sucker-deployment bit can never
  // be extended to new chains (or have failed sucker deploys retried): stages
  // are immutable and `deploySuckersFor` checks the CURRENT stage's bit. Refuse
  // to encode that foot-gun — `buildRevnetStageConfig` sets the bit by default.
  if (args.suckerConfig.deployerConfigurations.length > 0) {
    const blockedStage = args.config.stageConfigurations.findIndex(
      (stage) =>
        (Number(stage.extraMetadata) & REV_METADATA_ALLOW_SUCKER_DEPLOYMENT) ===
        0,
    );
    if (blockedStage !== -1) {
      throw new Error(
        `Stage ${blockedStage} does not set REV_METADATA_ALLOW_SUCKER_DEPLOYMENT ` +
          `(extraMetadata bit 2), so this cross-chain revnet could never deploy ` +
          `suckers during that stage — permanently. Build stages with ` +
          `buildRevnetStageConfig (which sets the bit by default), or OR the bit ` +
          `into extraMetadata.`,
      );
    }
  }

  // The deployer forwards msg.value to `JBProjects.createFor` for new revnets and
  // reverts on any value when initializing an existing project.
  if (revnetId === 0n && args.creationFee === undefined) {
    throw new Error("creationFee is required when deploying a new revnet");
  }
  const value = revnetId === 0n ? (args.creationFee as bigint) : 0n;

  if (args.tiered721Config) {
    return {
      chainId: args.chainId,
      address,
      abi: revDeployerAbi,
      functionName: "deployFor" as const,
      args: [
        revnetId,
        args.config,
        args.accountingContexts,
        args.suckerConfig,
        args.tiered721Config,
        args.allowedPosts ?? [],
      ] as const,
      value,
    };
  }
  return {
    chainId: args.chainId,
    address,
    abi: revDeployerAbi,
    functionName: "deployFor" as const,
    args: [
      revnetId,
      args.config,
      args.accountingContexts,
      args.suckerConfig,
    ] as const,
    value,
  };
}

/**
 * Build a `REVOwner.autoIssueFor` transaction request minting a stage's
 * pending auto-issuance to its beneficiary. Callable by anyone once the
 * stage has started; mints whatever `amountToAutoIssue` reports.
 */
export function buildAutoIssueTx(args: {
  chainId: JBChainId;
  revnetId: bigint;
  stageId: bigint;
  beneficiary: Address;
}) {
  return {
    chainId: args.chainId,
    address: v6Address("REVOwner", args.chainId),
    abi: revOwnerAbi,
    functionName: "autoIssueFor" as const,
    args: [args.revnetId, args.stageId, args.beneficiary] as const,
  };
}

/**
 * Read the token count (18-decimal fixed point) still available to
 * auto-issue to a beneficiary for a given stage.
 */
export async function getAmountToAutoIssue(
  client: PublicClient,
  args: {
    chainId: JBChainId;
    revnetId: bigint;
    stageId: bigint;
    beneficiary: Address;
  },
): Promise<bigint> {
  return client.readContract({
    address: v6Address("REVOwner", args.chainId),
    abi: revOwnerAbi,
    functionName: "amountToAutoIssue",
    args: [args.revnetId, args.stageId, args.beneficiary],
  });
}

/**
 * Read the timestamp when cash outs become available to the revnet's
 * participants (only set when an EXISTING revnet deploys onto a new
 * network). 0 or a past timestamp means cash outs are live. Loans are also
 * unavailable while the delay is active.
 */
export async function getCashOutDelay(
  client: PublicClient,
  args: { chainId: JBChainId; revnetId: bigint },
): Promise<bigint> {
  return client.readContract({
    address: v6Address("REVOwner", args.chainId),
    abi: revOwnerAbi,
    functionName: "cashOutDelayOf",
    args: [args.revnetId],
  });
}

/**
 * Read whether an address is the revnet's current operator (the account that
 * can manage splits and other operator-scoped powers).
 */
export async function isRevnetOperator(
  client: PublicClient,
  args: { chainId: JBChainId; revnetId: bigint; operator: Address },
): Promise<boolean> {
  return client.readContract({
    address: v6Address("REVOwner", args.chainId),
    abi: revOwnerAbi,
    functionName: "isOperatorOf",
    args: [args.revnetId, args.operator],
  });
}

/**
 * Read the tiered 721 hook deployed for the revnet (zero address if the
 * revnet was deployed without one).
 */
export async function getRevnetTiered721Hook(
  client: PublicClient,
  args: { chainId: JBChainId; revnetId: bigint },
): Promise<Address> {
  return client.readContract({
    address: v6Address("REVOwner", args.chainId),
    abi: revOwnerAbi,
    functionName: "tiered721HookOf",
    args: [args.revnetId],
  });
}
