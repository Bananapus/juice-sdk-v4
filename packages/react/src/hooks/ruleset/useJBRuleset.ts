import {
  CashOutTaxRate,
  JBChainId,
  jbControllerAbi,
  ReservedPercent,
  RulesetWeight,
  WeightCutPercent,
} from "@bananapus/nana-sdk-core";
import { useReadContract } from "wagmi";
import { useJBContractContext } from "../../contexts/JBContractContext/JBContractContext";
import { useResolveDataHook } from "./useResolveDataHook";

export function useJBRuleset({
  projectId,
  chainId,
}: {
  projectId: bigint | undefined;
  chainId: JBChainId | undefined;
}) {
  const { contracts, version } = useJBContractContext();

  const query = useReadContract({
    chainId,
    abi: jbControllerAbi,
    functionName: "currentRulesetOf",
    address: contracts?.controller?.data ?? undefined,
    args: projectId ? [projectId] : undefined,
    query: {
      enabled: !!projectId && !!contracts?.controller?.data,
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

  const rulesetId = query.data?.data?.id;

  const { resolvedDataHook, isLoading: isDataHookLoading } = useResolveDataHook(
    {
      dataHookAddress: query.data?.metadata?.dataHook,
      projectId,
      chainId,
      // Ruleset 0 is not a ruleset. Passing it as a real id would query the
      // deployer for a ruleset that cannot exist.
      rulesetId: rulesetId === undefined ? undefined : BigInt(rulesetId),
    },
  );

  return {
    ruleset: query.data?.data,
    // Withhold the metadata until the data hook behind the omnichain deployer
    // is known, rather than publishing the deployer address as the hook.
    rulesetMetadata:
      query.data?.metadata && resolvedDataHook
        ? { ...query.data.metadata, dataHook: resolvedDataHook }
        : undefined,
    ...query,
    // A read disabled while its controller is still resolving reports
    // `isLoading: false`, which reads as "this project has no ruleset".
    isLoading: Boolean(
      query.isLoading || contracts?.controller?.isLoading || isDataHookLoading,
    ),
  };
}
