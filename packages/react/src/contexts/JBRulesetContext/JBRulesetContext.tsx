import {
  DecayRate,
  RedemptionRate,
  ReservedRate,
  RulesetWeight,
} from "juice-sdk-core";
import { PropsWithChildren, createContext, useContext } from "react";
import { ReadContractResult } from "wagmi/dist/actions";
import {
  jbControllerABI,
  useReadJbControllerCurrentRulesetOf,
} from "../../generated/juicebox";
import { useReadJbContractContext } from "../JBContractContext/JBContractContext";
import { AsyncData, AsyncDataNone } from "../types";

/**
 * Context for the current ruleset of a project.
 */
export type JBRulesetContext = {
  /**
   * The current ruleset of the project.
   */
  ruleset: AsyncData<
    Omit<
      ReadContractResult<typeof jbControllerABI, "currentRulesetOf">[0],
      "weight" | "decayRate"
    > & {
      weight: RulesetWeight;
      decayRate: DecayRate;
    }
  >;
  /**
   * The metadata for the current ruleset of the project.
   */
  rulesetMetadata: AsyncData<
    Omit<
      ReadContractResult<typeof jbControllerABI, "currentRulesetOf">[1],
      "redemptionRate" | "reservedRate"
    > & {
      redemptionRate: RedemptionRate;
      reservedRate: ReservedRate;
    }
  >;
};

/**
 * Context for the project's current ruleset.
 */
export const JBRulesetContext = createContext<JBRulesetContext>({
  ruleset: AsyncDataNone,
  rulesetMetadata: AsyncDataNone,
});

export function useJbRulesetContext() {
  return useContext(JBRulesetContext);
}

export function useJbRuleset() {
  const { ruleset } = useJbRulesetContext();

  return ruleset;
}

export function useReadJbRulesetMetadata() {
  const { rulesetMetadata } = useJbRulesetContext();

  return rulesetMetadata;
}

/**
 * Provides the current ruleset for a project.
 *
 * @note depends on JBContractContext
 */
export const JBRulesetProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { contracts, projectId } = useReadJbContractContext();

  const { data: ruleset, isLoading } = useReadJbControllerCurrentRulesetOf({
    address: contracts?.controller?.data ?? undefined,
    args: [projectId],
    query: {
      select([ruleset, rulesetMetadata]) {
        return {
          data: {
            ...ruleset,
            weight: new RulesetWeight(ruleset.weight),
            decayRate: new DecayRate(ruleset.decayRate),
          },
          metadata: {
            ...rulesetMetadata,
            redemptionRate: new RedemptionRate(rulesetMetadata.redemptionRate),
            reservedRate: new ReservedRate(rulesetMetadata.reservedRate),
          },
        };
      },
    },
  });

  return (
    <JBRulesetContext.Provider
      value={{
        ruleset: {
          data: ruleset?.data,
          isLoading,
        },
        rulesetMetadata: {
          data: ruleset?.metadata,
          isLoading,
        },
      }}
    >
      {children}
    </JBRulesetContext.Provider>
  );
};
