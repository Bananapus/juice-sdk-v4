import { JBChainId, erc2771ForwarderAbi, jbContractAddress } from "juice-sdk-core";
import { useJBContractContext } from "src/contexts/JBContractContext/JBContractContext";
import { Address, Hash, encodeFunctionData, getContract } from "viem";
import { useAccount, useConfig, useSignTypedData, useSwitchChain, version } from "wagmi";

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
  const { signTypedData } = useSignTypedData();
  const { version } = useJBContractContext();

  async function sign(messageData: ERC2771ForwardRequestData, chainId: JBChainId) {
    await switchChainAsync({ chainId });

    return new Promise<Hash>(async (resolve, reject) => {
      if (!address) return;

      const verifyingContract = jbContractAddress[version]["ERC2771Forwarder"][chainId];

      // 48hrs
      const deadline = Number(((Date.now() + 3600 * 48 * 1000) / 1000).toFixed(0));

      const contract = getContract({
        address: verifyingContract,
        abi: erc2771ForwarderAbi,
        client: config.getClient({ chainId }),
      });

      const nonce = await contract.read.nonces([address]);

      signTypedData(
        {
          domain: {
            name: "Juicebox",
            chainId,
            verifyingContract,
            version: "1",
          },
          primaryType: "ForwardRequest",
          types: {
            ForwardRequest: [
              {
                name: "from",
                type: "address",
              },
              {
                name: "to",
                type: "address",
              },
              {
                name: "value",
                type: "uint256",
              },
              {
                name: "gas",
                type: "uint256",
              },
              {
                name: "nonce",
                type: "uint256",
              },
              {
                name: "deadline",
                type: "uint48",
              },
              {
                name: "data",
                type: "bytes",
              },
            ],
          },
          message: { ...messageData, deadline, nonce },
        },
        {
          onSuccess: (signature) => {
            const executeFnEncodedData = encodeFunctionData({
              abi: erc2771ForwarderAbi, // ABI of the contract
              functionName: "execute",
              args: [
                {
                  ...messageData,
                  deadline,
                  signature,
                },
              ],
            });

            resolve(executeFnEncodedData);
          },
          onError: (e) => {
            reject(e);
          },
        }
      );
    });
  }

  return {
    sign,
  };
}
