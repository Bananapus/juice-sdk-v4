import { debug } from "juice-sdk-core";
import { useJBChainId } from "src/contexts/JBChainContext/JBChainContext";
import { useQuery } from "wagmi/query";
import { useJBContractContext } from "../../contexts/JBContractContext/JBContractContext";

/**
 * Return sucker pairs for the project ID in context.
 *
 * Hits JBM endpoint, heavily cached
 * @returns
 */
export function useSuckers() {
  const { projectId } = useJBContractContext();
  const chainId = useJBChainId();

  debug("useSuckers::args", {
    projectId,
    chainId,
  });

  const query = useQuery({
    queryKey: [
      "juice-sdk",
      "suckers",
      projectId.toString(),
      chainId?.toString(),
    ],
    enabled: !!chainId,
    queryFn: async () => {
      if (!chainId) {
        return null;
      }

      const suckers = await fetch(
        `https://sepolia.juicebox.money/api/juicebox/v4/project/${projectId}/sucker-pairs?chainId=${chainId}`
      ).then((res) => res.json());

      return suckers;
    },
  });

  return query;
}
