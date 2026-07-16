import { Address, ContractFunctionArgs, Hex } from "viem";
import { jbOmnichainDeployerAbi } from "../generated/juicebox.js";
import { JBChainId } from "../types.js";
import { MappableAsset, parseSuckerDeployerConfig } from "../utils/deploy.js";
import { JBTerminalConfig } from "./launch.js";
import { JBRulesetConfig } from "./rulesets.js";
import { v6Address } from "./types.js";

type OmnichainLaunchArgs = ContractFunctionArgs<
  typeof jbOmnichainDeployerAbi,
  "payable",
  "launchProjectFor"
>;

type OmnichainLaunchArgs7 = Extract<
  OmnichainLaunchArgs,
  readonly [unknown, unknown, unknown, unknown, unknown, unknown, unknown]
>;

type OmnichainLaunchArgs6 = Exclude<OmnichainLaunchArgs, OmnichainLaunchArgs7>;

/**
 * Configuration for deploying a tiered 721 hook alongside a project:
 * the hook's collection config, whether cash outs route through it, and the
 * salt that determines its deterministic address.
 */
export type JBDeploy721TiersHookConfig = OmnichainLaunchArgs7[2];

/**
 * Configuration for deploying suckers (cross-chain token bridges) alongside
 * a project: one deployer config per remote chain, plus the salt that
 * determines the suckers' deterministic addresses.
 */
export type JBSuckerDeploymentConfig = OmnichainLaunchArgs6[5];

/**
 * Build a `JBOmnichainDeployer.launchProjectFor` transaction request creating
 * a new project wired for cross-chain operation (suckers + omnichain ruleset
 * queueing). Send ONE such transaction per chain in `chainIds`.
 *
 * CROSS-CHAIN DETERMINISM RULES — sucker pairing only works if every chain's
 * deployment derives the SAME deterministic addresses:
 *
 * - Use ONE shared `salt` for every chain's transaction (and the same
 *   sending address — the salt is scoped to the sender).
 * - Ruleset configurations must be BYTE-IDENTICAL across chains: pick ONE
 *   shared `mustStartAtOrAfter` timestamp up front (absolute timestamps are
 *   hashed into the deterministic addresses — per-chain "now" values break
 *   sucker pairing).
 * - When deploying a 721 hook, `deploy721Config` (including its salt) must
 *   also be identical across chains.
 *
 * The transaction is payable and must send EXACTLY the current project
 * creation fee — read it per chain with `getProjectCreationFee` (never reuse
 * a fee across chains).
 *
 * @param args.chainId The chain this transaction is for.
 * @param args.chainIds ALL chains the project deploys to (including
 * `chainId`); sucker deployer configs are built for every other chain.
 * @param args.assets The assets to bridge between chains. Defaults to the
 * native token only.
 * @param args.salt The shared salt (use the same value on every chain).
 * @param args.deploy721Config Optional tiered 721 hook to deploy with the
 * project (uses the 7-arg overload when given).
 * @param args.creationFee The exact fee from `JBProjects.creationFee()` on
 * this chain.
 */
export function buildOmnichainLaunchProjectTx(args: {
  chainId: JBChainId;
  chainIds: JBChainId[];
  owner: Address;
  projectUri: string;
  rulesetConfigurations: readonly JBRulesetConfig[];
  terminalConfigurations: readonly JBTerminalConfig[];
  memo?: string;
  creationFee: bigint;
  salt: Hex;
  assets?: MappableAsset[];
  deploy721Config?: JBDeploy721TiersHookConfig;
}) {
  // parseSuckerDeployerConfig's return type is a v5/v6 union that TS cannot
  // narrow on the `version` option; passing `version: 6` guarantees the v6
  // shape at runtime.
  const suckerDeploymentConfiguration = parseSuckerDeployerConfig(
    args.chainId,
    args.chainIds,
    args.assets ?? [MappableAsset.NATIVE],
    { salt: args.salt, version: 6 },
  ) as unknown as JBSuckerDeploymentConfig;

  const address = v6Address("JBOmnichainDeployer", args.chainId);
  const memo = args.memo ?? "";

  if (args.deploy721Config) {
    return {
      chainId: args.chainId,
      address,
      abi: jbOmnichainDeployerAbi,
      functionName: "launchProjectFor" as const,
      args: [
        args.owner,
        args.projectUri,
        args.deploy721Config,
        args.rulesetConfigurations,
        args.terminalConfigurations,
        memo,
        suckerDeploymentConfiguration,
      ] as const,
      value: args.creationFee,
    };
  }
  return {
    chainId: args.chainId,
    address,
    abi: jbOmnichainDeployerAbi,
    functionName: "launchProjectFor" as const,
    args: [
      args.owner,
      args.projectUri,
      args.rulesetConfigurations,
      args.terminalConfigurations,
      memo,
      suckerDeploymentConfiguration,
    ] as const,
    value: args.creationFee,
  };
}

/**
 * Build a `JBOmnichainDeployer.queueRulesetsOf` transaction request queuing
 * rulesets for an omnichain project. Send ONE such transaction per chain the
 * project lives on, with BYTE-IDENTICAL ruleset configurations (including a
 * single shared `mustStartAtOrAfter` — per-chain "now" timestamps make the
 * chains' rulesets diverge).
 *
 * The caller must have the `QUEUE_RULESETS` permission for the project (the
 * omnichain deployer holds it when the project was launched through it).
 *
 * @param args.deploy721Config Optionally deploy a NEW tiered 721 hook (e.g.
 * as the queued ruleset's data hook) alongside the queue — uses the 4-arg
 * overload when given; keep it identical across chains.
 */
export function buildOmnichainQueueRulesetsTx(args: {
  chainId: JBChainId;
  projectId: bigint;
  rulesetConfigurations: readonly JBRulesetConfig[];
  memo?: string;
  deploy721Config?: JBDeploy721TiersHookConfig;
}) {
  const address = v6Address("JBOmnichainDeployer", args.chainId);
  const memo = args.memo ?? "";

  if (args.deploy721Config) {
    return {
      chainId: args.chainId,
      address,
      abi: jbOmnichainDeployerAbi,
      functionName: "queueRulesetsOf" as const,
      args: [
        args.projectId,
        args.deploy721Config,
        args.rulesetConfigurations,
        memo,
      ] as const,
    };
  }
  return {
    chainId: args.chainId,
    address,
    abi: jbOmnichainDeployerAbi,
    functionName: "queueRulesetsOf" as const,
    args: [args.projectId, args.rulesetConfigurations, memo] as const,
  };
}
