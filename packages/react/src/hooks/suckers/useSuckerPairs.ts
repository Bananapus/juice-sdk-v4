import { getSuckerPairs } from "juice-sdk-core";
import { debug } from "src/debug";
import { useChainId, useConfig } from "wagmi";
import { useQuery } from "wagmi/query";
import { useJBContractContext } from "../../contexts/JBContractContext/JBContractContext";

export function useSuckerPairs() {
  const { projectId } = useJBContractContext();
  const config = useConfig();
  const chainId = useChainId();

  debug("suckerPairs::args", {
    projectId,
    chainId,
  });

  const query = useQuery({
    queryKey: ["suckerPairs", projectId, chainId],
    queryFn: async () => {
      const pairs = await getSuckerPairs({
        config,

        chainId: 1,
        projectId,
      });

      return pairs;
    },
  });

  return query;
}
