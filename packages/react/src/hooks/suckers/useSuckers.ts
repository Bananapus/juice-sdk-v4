import { resolveSuckers } from "juice-sdk-core";
import { useJBChainId } from "src/contexts/JBChainContext/JBChainContext";
import { debug } from "src/debug";
import { useConfig } from "wagmi";
import { useQuery } from "wagmi/query";
import { useJBContractContext } from "../../contexts/JBContractContext/JBContractContext";

export function useSuckers() {
  const { projectId } = useJBContractContext();
  const config = useConfig();
  const chainId = useJBChainId();

  debug("useSuckers::args", {
    projectId,
    chainId,
  });

  const query = useQuery({
    queryKey: ["suckers", projectId.toString(), chainId?.toString()],
    queryFn: () => {
      if (!chainId) return null;

      return resolveSuckers({
        config,
        chainId,
        projectId,
      });
    },
  });

  return query;
}
