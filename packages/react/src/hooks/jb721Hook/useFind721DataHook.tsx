import { find721DataHook } from "@bananapus/nana-sdk-core";
import { usePublicClient } from "wagmi";
import { useQuery } from "wagmi/query";
import { useJBChainId } from "../../contexts/JBChainContext/JBChainContext";
import { useJBContractContext } from "../../contexts/JBContractContext/JBContractContext";
import { useJBRulesetContext } from "../../contexts/JBRulesetContext/JBRulesetContext";
import { useJBDataHookContext } from "../../contexts/JBDataHookContext/JBDataHookContext";
import { debug } from "@bananapus/nana-sdk-core";

/**
 * Return the 721 data hook (if it exists) for the project and current ruleset in context.
 */
export function useFind721DataHook() {
  const { data } = useJBDataHookContext();
  const { projectId, version } = useJBContractContext();
  const { ruleset } = useJBRulesetContext();
  const chainId = useJBChainId();
  // Without an explicit chain this reads the wallet's chain, not the project's.
  const publicClient = usePublicClient({ chainId });

  const rulesetId = ruleset.data?.id;
  const dataHookAddress = data?.dataHookAddress;

  debug("useFind721DataHook::args", {
    projectId,
    rulesetId,
    dataHookAddress,
    publicClient,
  });

  const jb721DataHookQuery = useQuery({
    // Chain and version are read inputs, and with `staleTime: Infinity` a key
    // that omits them serves one chain's (or version's) hook for another's.
    queryKey: [
      "dataHook",
      chainId,
      version,
      projectId,
      rulesetId,
      dataHookAddress,
    ],
    enabled: !!chainId && !!rulesetId && !!dataHookAddress,
    staleTime: Infinity,
    queryFn: async () => {
      if (!rulesetId || !dataHookAddress) return null;
      if (!publicClient) {
        throw new Error("Public client not available.");
      }

      const jb721DataHook = await find721DataHook(publicClient, {
        dataHookAddress,
        projectId,
        rulesetId,
        version,
      });

      return jb721DataHook;
    },
  });

  return jb721DataHookQuery;
}
