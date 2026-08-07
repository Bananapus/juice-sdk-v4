import {
  CashOutTaxRate,
  debug,
  jbControllerAbi,
  ReservedPercent,
  RulesetWeight,
  WeightCutPercent,
} from "@bananapus/nana-sdk-core";
import { createContext, useContext } from "react";
import { ContractFunctionReturnType } from "viem";
import { useReadContract } from "wagmi";
import { useResolveDataHook } from "../../hooks/ruleset/useResolveDataHook";
import { useJBChainId } from "../JBChainContext/JBChainContext";
import { useJBContractContext } from "../JBContractContext/JBContractContext";
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
  const { contracts, projectId, version } = useJBContractContext();
  const chainId = useJBChainId();

  const controllerAddress = contracts.controller.data ?? undefined;

  const { data: ruleset, isLoading } = useReadContract({
    chainId,
    abi: jbControllerAbi,
    functionName: "currentRulesetOf",
    address: controllerAddress,
    args: [projectId],
    query: {
      enabled: !!controllerAddress,
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
              rulesetMetadata.reservedPercent,
            ),
            // v4/v5 store the INVERSE flag (`useTotalSurplusForCashOuts`) in this slot;
            // normalize to the v6 field's semantics.
            scopeCashOutsToLocalBalances:
              version === 6
                ? rulesetMetadata.scopeCashOutsToLocalBalances
                : !rulesetMetadata.scopeCashOutsToLocalBalances,
          },
        };
      },
    },
  });

  const { resolvedDataHook, isLoading: isDataHookLoading } = useResolveDataHook(
    {
      dataHookAddress: ruleset?.metadata?.dataHook,
      projectId,
      chainId,
      rulesetId:
        ruleset?.data.id === undefined ? undefined : BigInt(ruleset.data.id),
    },
  );

  // A read that is disabled because its controller has not resolved yet reports
  // `isLoading: false`, which reads downstream as "this project has no ruleset".
  const isRulesetLoading = Boolean(isLoading || contracts.controller.isLoading);

  // `resolvedDataHook` is undefined while the hook behind the omnichain deployer
  // is still being resolved. Publishing the metadata with the deployer address in
  // that window makes a pay revert in `use721HookMetadataId`.
  const rulesetMetadataWithResolvedDataHook =
    ruleset?.metadata && resolvedDataHook
      ? { ...ruleset.metadata, dataHook: resolvedDataHook }
      : undefined;

  const rulesetState = { data: ruleset?.data, isLoading: isRulesetLoading };
  const rulesetMetadataState = {
    data: rulesetMetadataWithResolvedDataHook,
    isLoading: Boolean(isRulesetLoading || isDataHookLoading),
  };

  debug("JBRulesetContext", {
    ruleset: rulesetState,
    rulesetMetadata: rulesetMetadataState,
  });

  return (
    <JBRulesetContext.Provider
      value={{
        ruleset: rulesetState,
        rulesetMetadata: rulesetMetadataState,
      }}
    >
      {children}
    </JBRulesetContext.Provider>
  );
};
