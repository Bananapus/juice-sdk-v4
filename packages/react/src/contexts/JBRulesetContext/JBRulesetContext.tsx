import {
  CashOutTaxRate,
  debug,
  ReservedPercent,
  RulesetWeight,
  WeightCutPercent,
} from "juice-sdk-core";
import { createContext, useContext } from "react";
import { ContractFunctionReturnType } from "viem";
import { jbControllerAbi } from "../../generated/juicebox";
import { useResolveDataHook } from "../../hooks/ruleset/useResolveDataHook";
import { useJBChainId } from "../JBChainContext/JBChainContext";
import { useJBContractContext } from "../JBContractContext/JBContractContext";
import { AsyncData, AsyncDataNone } from "../types";
import { useReadContract } from "wagmi";

/**
 * Context for the current ruleset of a project.
 */
export type JBRulesetContext = {
  /**
   * The current ruleset of the project.
   */
  ruleset: AsyncData<
    Omit<
      ContractFunctionReturnType<typeof jbControllerAbi, "view", "currentRulesetOf">[0],
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
      ContractFunctionReturnType<typeof jbControllerAbi, "view", "currentRulesetOf">[1],
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
export const JBRulesetProvider = ({ children }: { children: React.ReactNode }) => {
  const { contracts, projectId } = useJBContractContext();
  const chainId = useJBChainId();

  const { data: ruleset, isLoading } = useReadContract({
    chainId,
    abi: jbControllerAbi,
    functionName: "currentRulesetOf",
    address: contracts.controller.data ?? undefined,
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
            reservedPercent: new ReservedPercent(rulesetMetadata.reservedPercent),
          },
        };
      },
    },
  });

  const { resolvedDataHook } = useResolveDataHook({
    dataHookAddress: ruleset?.metadata?.dataHook,
    projectId,
    chainId,
    rulesetId: BigInt(ruleset?.data.id ?? 0),
  });

  const rulesetMetadataWithResolvedDataHook = ruleset?.metadata && {
    ...ruleset.metadata,
    dataHook: resolvedDataHook,
  };

  debug("JBRulesetContext", {
    ruleset: {
      data: ruleset?.data,
      isLoading,
    },
    rulesetMetadata: {
      data: rulesetMetadataWithResolvedDataHook,
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
          data: rulesetMetadataWithResolvedDataHook,
          isLoading,
        },
      }}
    >
      {children}
    </JBRulesetContext.Provider>
  );
};
