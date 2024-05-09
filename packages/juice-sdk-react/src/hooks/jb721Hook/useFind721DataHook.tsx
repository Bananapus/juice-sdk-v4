import { find721DataHook } from "juice-sdk-core";
import { usePublicClient, useQuery } from "wagmi";
import { useJBContractContext } from "../../contexts/JBContractContext/JBContractContext";
import { useJBRulesetContext } from "../../contexts/JBRulesetContext/JBRulesetContext";
import { useJBDataHookContext } from "../../contexts/JBDataHookContext/JBDataHookContext";

/**
 * Return the 721 data hook (if it exists) for the project and current ruleset in context.
 */
export function useFind721DataHook() {
  const { data } = useJBDataHookContext();
  const { projectId } = useJBContractContext();
  const { ruleset } = useJBRulesetContext();
  const publicClient = usePublicClient();

  const rulesetId = ruleset.data?.id;
  const dataHookAddress = data?.dataHookAddress;
  // console.log("useFind721DataHook::args", {
  //   projectId,
  //   rulesetId,
  //   dataHookAddress,
  //   publicClient,
  // });

  const jb721DataHookQuery = useQuery(
    ["dataHook", projectId, rulesetId, dataHookAddress],
    async () => {
      if (!rulesetId || !dataHookAddress) return null;

      const jb721DataHook = await find721DataHook(publicClient, {
        dataHookAddress,
        projectId,
        rulesetId,
      });
      // console.log("useFind721DataHook::final jb721DataHook", jb721DataHook);

      return jb721DataHook;
    }
  );

  return jb721DataHookQuery;
}
