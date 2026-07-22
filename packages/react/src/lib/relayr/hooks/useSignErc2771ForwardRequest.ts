import {
  JBChainId,
  JBVersion,
  erc2771ForwarderAbi,
  jbContractAddress,
} from "@bananapus/nana-sdk-core";
import { useJBContractContext } from "../../../contexts/JBContractContext/JBContractContext";
import { Address, Hash, encodeFunctionData, getContract } from "viem";
import { useAccount, useConfig, useSignTypedData, useSwitchChain } from "wagmi";

export type ERC2771ForwardRequestData = {
  from: Address;
  to: Address;
  value: bigint;
  gas: bigint;
  data: Hash;
};

export function useSignErc2771ForwardRequest() {
  const { switchChainAsync } = useSwitchChain();
  const { address } = useAccount();
  const config = useConfig();
  const { signTypedDataAsync } = useSignTypedData();
  const { version: contextVersion } = useJBContractContext();

  async function sign(
    messageData: ERC2771ForwardRequestData,
    chainId: JBChainId,
    version?: JBVersion,
  ) {
    if (!address) {
      throw new Error("Wallet account is not connected");
    }
    if (messageData.from.toLowerCase() !== address.toLowerCase()) {
      throw new Error(
        "Forward request signer does not match the connected account",
      );
    }

    await switchChainAsync({ chainId });

    const verifyingContract =
      jbContractAddress[version ?? contextVersion]["ERC2771Forwarder"][chainId];

    // 48hrs
    const deadline = Number(
      ((Date.now() + 3600 * 48 * 1000) / 1000).toFixed(0),
    );

    const contract = getContract({
      address: verifyingContract,
      abi: erc2771ForwarderAbi,
      client: config.getClient({ chainId }),
    });

    // Keep RPC failures outside the callback promise so they reject `sign`
    // instead of leaving the caller waiting indefinitely.
    const nonce = await contract.read.nonces([address]);

    const signature = await signTypedDataAsync({
      // Pin the checked account across the asynchronous chain/RPC work.
      account: address,
      domain: {
        name: "Juicebox",
        chainId,
        verifyingContract,
        version: "1",
      },
      primaryType: "ForwardRequest",
      types: {
        ForwardRequest: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "gas", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint48" },
          { name: "data", type: "bytes" },
        ],
      },
      message: { ...messageData, deadline, nonce },
    });

    // Encoding failures must reject `sign`, not escape an async callback and
    // leave callers waiting forever.
    return encodeFunctionData({
      abi: erc2771ForwarderAbi,
      functionName: "execute",
      args: [{ ...messageData, deadline, signature }],
    });
  }

  return {
    sign,
  };
}
