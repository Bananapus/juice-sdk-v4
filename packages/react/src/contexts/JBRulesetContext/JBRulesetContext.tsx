import {
  WeightCutPercent,
  CashOutTaxRate,
  ReservedPercent,
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
import { debug } from "juice-sdk-core";

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
      "weight" | "weightCutPercent"
    > & {
      weight: RulesetWeight;
      weightCutPercent: WeightCutPercent;
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
      "cashOutTaxRate" | "reservedPercent"
    > & {
      cashOutTaxRate: CashOutTaxRate;
      reservedPercent: ReservedPercent;
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

/**
 * 
 * @deprecated use useJBRuleset instead
 */
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
            weightCutPercent: new WeightCutPercent(ruleset.weightCutPercent),
          },
          metadata: {
            ...rulesetMetadata,
            cashOutTaxRate: new CashOutTaxRate(rulesetMetadata.cashOutTaxRate),
            reservedPercent: new ReservedPercent(
              rulesetMetadata.reservedPercent
            ),
          },
        };
      },
    },
  });

  debug("JBRulesetContext", {
    ruleset: {
      data: ruleset?.data,
      isLoading,
    },
    rulesetMetadata: {
      data: ruleset?.metadata,
      isLoading,
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
