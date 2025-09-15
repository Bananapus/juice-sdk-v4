import { JBChainId, JBCoreContracts, JBProjectToken, jbTokensAbi } from "juice-sdk-core";
import { getContract } from "viem";
import { useAccount, useConfig, useReadContract } from "wagmi";
import { useQuery } from "wagmi/query";
import { useJBChainId } from "../../contexts/JBChainContext/JBChainContext";
import { useJBContractContext } from "../../contexts/JBContractContext/JBContractContext";
import { useSuckers } from "../suckers/useSuckers";

/**
 * Return the user's project token balance across each sucker on all chains for the current project.
 */
export function useSuckersUserTokenBalance() {
  const config = useConfig();

  const chainId = useJBChainId();
  const { projectId, contractAddress } = useJBContractContext();
  const { address: userAddress } = useAccount();

  const currentChainQuery = useReadContract({
    abi: jbTokensAbi,
    functionName: "totalBalanceOf",
    address: contractAddress(JBCoreContracts.JBTokens),
    chainId,
    args: userAddress ? [userAddress, projectId] : undefined,
    query: {
      select(data) {
        return new JBProjectToken(data);
      },
    },
  });
  const { data: pairs = [], isLoading, isError } = useSuckers();

  const balanceQuery = useQuery({
    queryKey: [
      "suckersUserTokenBalance",
      projectId.toString(),
      chainId?.toString(),
      currentChainQuery.data?.value.toString(),
      pairs?.map((pair) => pair.peerChainId).join(","),
    ],
    queryFn: async () => {
      if (!chainId || !userAddress) return null;

      const currentChain = {
        balance: currentChainQuery.data ?? new JBProjectToken(0n),
        chainId,
        projectId,
      };

      if (!pairs || pairs.length === 0) {
        return [currentChain];
      }

      const balances = await Promise.all(
        pairs.map(async (pair) => {
          const { peerChainId, projectId } = pair;
          const contract = getContract({
            address: contractAddress(JBCoreContracts.JBTokens, peerChainId),
            abi: jbTokensAbi,
            client: config.getClient({ chainId: peerChainId }),
          });

          const balance = await contract.read.totalBalanceOf([userAddress, projectId]);

          return {
            balance: new JBProjectToken(balance),
            chainId: peerChainId,
            projectId,
          };
        })
      );

      if (!balances.some((balance) => balance.chainId === currentChain.chainId)) {
        // Add the current chain's balance to the list.
        balances.push(currentChain);
      }

      return balances;
    },
  });

  return {
    isLoading: balanceQuery.isLoading || isLoading,
    isError: balanceQuery.isError || isError,
    data: balanceQuery.data as
      | { balance: JBProjectToken; chainId: JBChainId; projectId: bigint }[]
      | undefined,
  };
}
