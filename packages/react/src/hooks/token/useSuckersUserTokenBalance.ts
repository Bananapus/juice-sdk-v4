import {
  JBChainId,
  JBCoreContracts,
  JBProjectToken,
  jbTokensAbi,
} from "@bananapus/nana-sdk-core";
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
  const { projectId, version, contractAddress } = useJBContractContext();
  const { address: userAddress } = useAccount();

  // `contractAddress` throws for a chain with no deployment, and it runs in the
  // render body — before any `enabled` gate can help. An unresolvable address
  // disables the read instead of taking the tree down.
  let jbTokensAddress: `0x${string}` | undefined;
  try {
    jbTokensAddress = chainId
      ? contractAddress(JBCoreContracts.JBTokens)
      : undefined;
  } catch {
    jbTokensAddress = undefined;
  }

  const currentChainQuery = useReadContract({
    abi: jbTokensAbi,
    functionName: "totalBalanceOf",
    address: jbTokensAddress,
    chainId,
    args: userAddress ? [userAddress, projectId] : undefined,
    query: {
      enabled: !!userAddress && !!jbTokensAddress,
      select(data) {
        return new JBProjectToken(data);
      },
    },
  });
  const { data: pairs = [], isLoading, isError } = useSuckers();

  const balanceQuery = useQuery({
    // The balances are keyed to a wallet and a protocol version as much as to a
    // project: without them a previous account's (or version's) balances are
    // served to the next one.
    queryKey: [
      "suckersUserTokenBalance",
      projectId.toString(),
      chainId?.toString(),
      version,
      userAddress,
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

          const balance = await contract.read.totalBalanceOf([
            userAddress,
            projectId,
          ]);

          return {
            balance: new JBProjectToken(balance),
            chainId: peerChainId,
            projectId,
          };
        }),
      );

      if (
        !balances.some((balance) => balance.chainId === currentChain.chainId)
      ) {
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
