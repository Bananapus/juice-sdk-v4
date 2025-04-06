import {
  CashOutTaxRate,
  JBChainId,
  JBRulesetData,
  JBRulesetMetadata,
  ReservedPercent,
  RulesetWeight,
  WeightCutPercent,
} from "juice-sdk-core";
import { useJBContractContext } from "../../contexts/JBContractContext/JBContractContext";
import { useReadJbControllerUpcomingRulesetOf } from "../../generated/juicebox";

export function useJBUpcomingRuleset({
  projectId,
  chainId,
}: {
  projectId: bigint;
  chainId: JBChainId;
}): {
  ruleset: JBRulesetData | undefined;
  rulesetMetadata: JBRulesetMetadata | undefined;
  isLoading: boolean;
} {
  const { contracts, projectId: defaultProjectId } = useJBContractContext();

  const { data, isLoading } = useReadJbControllerUpcomingRulesetOf({
    address: contracts.controller?.data ?? undefined,
    args: [BigInt(projectId ?? defaultProjectId)],
    chainId,
  });

  const _latestUpcomingRuleset = data?.[0];
  const _latestUpcomingRulesetMetadata = data?.[1];
  const upcomingWeight = new RulesetWeight(
    _latestUpcomingRuleset?.weight ?? 0n
  );
  const upcomingWeightCutPercent = new WeightCutPercent(
    _latestUpcomingRuleset?.weightCutPercent ?? 0
  );

  const latestUpcomingRuleset = _latestUpcomingRuleset
    ? {
        ..._latestUpcomingRuleset,
        weight: upcomingWeight,
        weightCutPercent: upcomingWeightCutPercent,
      }
    : undefined;

  const upcomingReservedPercent = new ReservedPercent(
    _latestUpcomingRulesetMetadata?.reservedPercent ?? 0
  );
  const upcomingCashOutTaxRate = new CashOutTaxRate(
    _latestUpcomingRulesetMetadata?.cashOutTaxRate ?? 0
  );
  const latestUpcomingRulesetMetadata = _latestUpcomingRulesetMetadata
    ? {
        ..._latestUpcomingRulesetMetadata,
        reservedPercent: upcomingReservedPercent,
        cashOutTaxRate: upcomingCashOutTaxRate,
      }
    : undefined;

  return {
    ruleset: latestUpcomingRuleset,
    rulesetMetadata: latestUpcomingRulesetMetadata,
    isLoading,
  };
}
