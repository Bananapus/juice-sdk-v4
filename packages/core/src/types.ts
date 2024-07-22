import { ContractFunctionReturnType } from "viem";
import { jbControllerAbi, jbSplitsAbi } from "./generated/juicebox.js";
import {
  DecayPercent,
  RedemptionRate,
  ReservedPercent,
  RulesetWeight,
  SplitPortion,
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

export type JBSplit = Omit<
  ContractFunctionReturnType<typeof jbSplitsAbi, "view", "splitsOf">[number],
  "percent"
> & { percent: SplitPortion };

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
