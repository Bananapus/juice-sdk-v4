import { find721DataHook } from "juice-sdk-core";
import { usePublicClient, useQuery } from "wagmi";
import { useJBContractContext } from "../../contexts/JBContractContext/JBContractContext";
import { useJBRulesetContext } from "../../contexts/JBRulesetContext/JBRulesetContext";
import { useJBDataHookContext } from "../../contexts/JBDataHookContext/JBDataHookContext";

export function useFind721DataHook() {
  const { data } = useJBDataHookContext();
  const { projectId } = useJBContractContext();
  const { ruleset } = useJBRulesetContext();
  const publicClient = usePublicClient();

  const rulesetId = ruleset.data?.id;
  const dataHookAddress = data?.dataHookAddress;

  const jb721DataHookQuery = useQuery(
    ["dataHook", projectId, rulesetId, dataHookAddress],
    async () => {
      if (!rulesetId || !dataHookAddress) return null;

      const jb721DataHook = await find721DataHook(publicClient, {
        dataHookAddress,
        projectId,
        rulesetId,
      });

      return jb721DataHook;
    }
  );

  return jb721DataHookQuery;
}
