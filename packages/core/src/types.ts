import { Address, ContractFunctionReturnType } from "viem";
import { jbControllerAbi } from "./generated/juicebox.js";
import {
  DecayPercent,
  RedemptionRate,
  ReservedPercent,
  RulesetWeight,
} from "./utils/data.js";

export const projectTagOptions = [
  "art",
  "business",
  "charity",
  "dao",
  "defi",
  "education",
  "events",
  "fundraising",
  "games",
  "music",
  "nfts",
  "social",
  "software",
] as const;

export type ProjectTagName =
  typeof projectTagOptions extends Readonly<Array<infer T>> ? T : never;

/**
 * The metadata associated with a juicebox project.
 *
 * @interface
 */
export type JBProjectMetadata = {
  /**
   * The name of the project.
   */
  name: string;
} & Partial<{
  /**
   * The description of the project. May be raw text or HTML.
   */
  description: string;

  /**
   * The tagline of the project.
   */
  projectTagline: string;
  /**
   * The URI of the project's cover image/banner. Typically ipfs://
   */
  coverImageUri: string;
  /**
   * The URI of the project's logo. Typically ipfs://
   */
  logoUri: string;
  /**
   * The project's website URL.
   */
  infoUri: string;
  /**
   * Custom text for a project's pay button.
   */
  payButton: string;
  /**
   * Custom text for a project to display to users before they pay.
   */
  payDisclosure: string;
  /**
   * Flag indiciating if a project has been archived.
   */
  archived: boolean;
  /**
   * List of tags for the project.
   */
  tags: ProjectTagName[];
  telegram: string;
  twitter: string;
  discord: string;

  /**
   * Juicecrowd data
   */
  introVideoUrl: string;
  introImageUri: string;
  softTargetAmount: string;
  softTargetCurrency: string;
}>;

/**
 * A split of a project's payout funds to a beneficiary, project or allocator.
 *
 * @type
 */
export type JBSplit = {
  /**
   * The address of the beneficiary.
   */
  beneficiary: Address;
  /**
   * The percentage of funds to send to the beneficiary.
   */
  percent: number;
  /**
   * TODO: What is preferClaimed?
   */
  preferClaimed: boolean;
  /**
   * The timestamp at which the split is locked until and cannot be changed.
   */
  lockedUntil: number;
  /**
   * The ID of the project that is acting as the beneficiary.
   */
  projectId: bigint;
  /**
   * The address of the allocator contract.
   *
   * If an allocator is specified, funds will be sent to the allocator contract
   * along with the projectId, beneficiary, preferClaimed properties.
   */
  allocator: Address;
};

/**
 * Splits as they are given to transactions such as reconfigureRulesetsOf
 *
 * Used when interpreting data from Gnosis Safe transactions
 */
export type JBSplitParams = {
  beneficiary: Address;
  percent: bigint;
  preferClaimed: boolean;
  lockedUntil: number;
  projectId: bigint;
  allocator: Address;
};

/**
 * The type of split.
 */
export enum SplitGroup {
  /**
   * Splits that are paid out in ETH.
   */
  ETHPayout = 1,
  /**
   * Splits that are reserved for a project's token.
   */
  ReservedTokens = 2,
}

/**
 * Contractual groups of splits.
 */
export interface GroupedSplits<G> {
  /**
   * The group type of the splits.
   */
  group: G;
  /**
   * The splits.
   */
  splits: JBSplit[];
}

/**
 * Splits that are paid out in ETH.
 */
export type ETHPayoutGroupedSplits = GroupedSplits<SplitGroup.ETHPayout>;

/**
 * Splits for a project's reserved token list.
 */
export type ReservedTokensGroupedSplits =
  GroupedSplits<SplitGroup.ReservedTokens>;

export type JBRuleset = ContractFunctionReturnType<
  typeof jbControllerAbi,
  "view",
  "currentRulesetOf"
>;

/**
 * Juicebox ruleset.
 */
export type JBRulesetData = Omit<JBRuleset[0], "weight" | "decayPercent"> & {
  weight: RulesetWeight;
  decayPercent: DecayPercent;
};

/**
 * Juicebox ruleset metadata.
 */
export type JBRulesetMetadata = Omit<
  JBRuleset[1],
  "redemptionRate" | "reservedPercent"
> & {
  redemptionRate: RedemptionRate;
  reservedPercent: ReservedPercent;
};
