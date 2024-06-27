import { find721DataHook } from "juice-sdk-core";
import { usePublicClient } from "wagmi";
import { useQuery } from "wagmi/query";
import { useJBContractContext } from "../../contexts/JBContractContext/JBContractContext";
import { useJBRulesetContext } from "../../contexts/JBRulesetContext/JBRulesetContext";
import { useJBDataHookContext } from "../../contexts/JBDataHookContext/JBDataHookContext";
import { debug } from "src/debug";

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

  debug("useFind721DataHook::args", {
    projectId,
    rulesetId,
    dataHookAddress,
    publicClient,
  });

  const jb721DataHookQuery = useQuery({
    queryKey: ["dataHook", projectId, rulesetId, dataHookAddress],
    queryFn: async () => {
      if (!rulesetId || !dataHookAddress) return null;
      if (!publicClient) {
        throw new Error("Public client not available.");
      }

      const jb721DataHook = await find721DataHook(publicClient, {
        dataHookAddress,
        projectId,
        rulesetId,
      });

      return jb721DataHook;
    },
  });

  return jb721DataHookQuery;
}
