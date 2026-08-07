import {
  CashOutTaxRate,
  JBChainId,
  jbControllerAbi,
  JBRulesetData,
  JBRulesetMetadata,
  ReservedPercent,
  RulesetWeight,
  WeightCutPercent,
} from "@bananapus/nana-sdk-core";
import { useReadContract } from "wagmi";
import { useJBContractContext } from "../../contexts/JBContractContext/JBContractContext";
import { useResolveDataHook } from "./useResolveDataHook";

export function useJBUpcomingRuleset({
  projectId,
  chainId,
}: {
  projectId: bigint | undefined;
  chainId: JBChainId | undefined;
}): {
  ruleset: JBRulesetData | undefined;
  rulesetMetadata: JBRulesetMetadata | undefined;
  isLoading: boolean;
} {
  const { contracts, version } = useJBContractContext();

  const controllerAddress = contracts.controller?.data ?? undefined;

  const { data, isLoading } = useReadContract({
    abi: jbControllerAbi,
    functionName: "upcomingRulesetOf",
    address: controllerAddress,
    args: projectId ? [projectId] : undefined,
    chainId,
  });

  const _latestUpcomingRuleset = data?.[0];
  const _latestUpcomingRulesetMetadata = data?.[1];

  // Resolve the actual data hook address
  const { resolvedDataHook, isLoading: isDataHookLoading } = useResolveDataHook(
    {
      dataHookAddress: _latestUpcomingRulesetMetadata?.dataHook,
      projectId,
      chainId,
      // Ruleset 0 is not a ruleset; don't fabricate one for the deployer lookup.
      rulesetId:
        _latestUpcomingRuleset?.id === undefined
          ? undefined
          : BigInt(_latestUpcomingRuleset.id),
    },
  );

  const latestUpcomingRuleset = _latestUpcomingRuleset
    ? {
        ..._latestUpcomingRuleset,
        weight: new RulesetWeight(_latestUpcomingRuleset.weight),
        weightCutPercent: new WeightCutPercent(
          _latestUpcomingRuleset.weightCutPercent,
        ),
      }
    : undefined;

  const latestUpcomingRulesetMetadata =
    _latestUpcomingRulesetMetadata && resolvedDataHook
      ? {
          ..._latestUpcomingRulesetMetadata,
          reservedPercent: new ReservedPercent(
            _latestUpcomingRulesetMetadata.reservedPercent,
          ),
          cashOutTaxRate: new CashOutTaxRate(
            _latestUpcomingRulesetMetadata.cashOutTaxRate,
          ),
          // v4/v5 store the INVERSE flag (`useTotalSurplusForCashOuts`) in this slot;
          // normalize to the v6 field's semantics.
          scopeCashOutsToLocalBalances:
            version === 6
              ? _latestUpcomingRulesetMetadata.scopeCashOutsToLocalBalances
              : !_latestUpcomingRulesetMetadata.scopeCashOutsToLocalBalances,
          dataHook: resolvedDataHook,
        }
      : undefined;

  return {
    ruleset: latestUpcomingRuleset,
    rulesetMetadata: latestUpcomingRulesetMetadata,
    // A read disabled while its controller is still resolving reports
    // `isLoading: false`, which reads as "there is no upcoming ruleset".
    isLoading: Boolean(
      isLoading || contracts.controller?.isLoading || isDataHookLoading,
    ),
  };
}
