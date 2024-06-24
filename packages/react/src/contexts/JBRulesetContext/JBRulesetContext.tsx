import {
  DecayRate,
  RedemptionRate,
  ReservedRate,
  RulesetWeight,
} from "juice-sdk-core";
import { createContext, useContext } from "react";
import {
  jbControllerAbi,
  useReadJbControllerCurrentRulesetOf,
} from "../../generated/juicebox";
import { useJBContractContext } from "../JBContractContext/JBContractContext";
import { AsyncData, AsyncDataNone } from "../types";
import { ContractFunctionReturnType } from "viem";
import { useJBChainId } from "../JBChainContext/JBChainContext";

/**
 * Context for the current ruleset of a project.
 */
export type JBRulesetContext = {
  /**
   * The current ruleset of the project.
   */
  ruleset: AsyncData<
    Omit<
      ContractFunctionReturnType<
        typeof jbControllerAbi,
        "view",
        "currentRulesetOf"
      >[0],
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
      ContractFunctionReturnType<
        typeof jbControllerAbi,
        "view",
        "currentRulesetOf"
      >[1],
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

export function useJBRulesetContext() {
  return useContext(JBRulesetContext);
}

export function useJBRuleset() {
  const { ruleset } = useJBRulesetContext();

  return ruleset;
}

export function useJBRulesetMetadata() {
  const { rulesetMetadata } = useJBRulesetContext();

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
  const { contracts, projectId } = useJBContractContext();
  const chainId = useJBChainId();

  const { data: ruleset, isLoading } = useReadJbControllerCurrentRulesetOf({
    chainId,
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
