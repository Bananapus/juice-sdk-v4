import {
  CashOutTaxRate,
  JBChainId,
  jbControllerAbi,
  ReservedPercent,
  RulesetWeight,
  WeightCutPercent,
} from "juice-sdk-core";
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
  const { contracts } = useJBContractContext();

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
            reservedPercent: new ReservedPercent(rulesetMetadata.reservedPercent),
          },
        };
      },
    },
  });

  const { resolvedDataHook } = useResolveDataHook({
    dataHookAddress: query.data?.metadata?.dataHook,
    projectId,
    chainId,
    rulesetId: BigInt(query.data?.data?.id ?? 0),
  });

  return {
    ruleset: query.data?.data,
    rulesetMetadata: query.data?.metadata && {
      ...query.data.metadata,
      dataHook: resolvedDataHook,
    },
    ...query,
  };
}
