import {
  RulesetWeight,
  WeightCutPercent,
  CashOutTaxRate,
  ReservedPercent,
  JBChainId,
} from "juice-sdk-core";
import { useJBContractContext } from "../../contexts/JBContractContext/JBContractContext";
import { useReadJbControllerCurrentRulesetOf } from "../../generated/juicebox";

export function useJBRuleset({
  projectId,
  chainId,
}: {
  projectId: bigint | undefined;
  chainId: JBChainId | undefined;
}) {
  const { contracts } = useJBContractContext();
  const query = useReadJbControllerCurrentRulesetOf({
    chainId,
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
              rulesetMetadata.reservedPercent
            ),
          },
        };
      },
    },
  });

  return {
    ruleset: query.data?.data,
    metadata: query.data?.metadata,
    ...query,
  };
}
