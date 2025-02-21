import {
  JBChainId,
  readErc2771ForwarderNonces,
  erc2771ForwarderAddress,
  erc2771ForwarderAbi,
} from "juice-sdk-core";
import { Address, Hash, encodeFunctionData } from "viem";
import { useSwitchChain, useAccount, useConfig, useSignTypedData } from "wagmi";

export type ERC2771ForwardRequestData = {
  from: Address;
  to: Address;
  value: bigint;
  gas: bigint;
  data: Hash;
};

export function useSignErc2771ForwardRequest() {
  const { switchChain } = useSwitchChain();
  const { address } = useAccount();
  const config = useConfig();
  const { signTypedData } = useSignTypedData();

  async function sign(
    messageData: ERC2771ForwardRequestData,
    chainId: JBChainId
  ) {
    switchChain({ chainId });

    return new Promise<Hash>(async (resolve, reject) => {
      if (!address) return;

      // 48hrs
      const deadline = Number(
        ((Date.now() + 3600 * 48 * 1000) / 1000).toFixed(0)
      );

      const nonce = await readErc2771ForwarderNonces(config, {
        chainId,
        args: [address],
      });

      signTypedData(
        {
          domain: {
            name: "Juicebox",
            chainId,
            verifyingContract: erc2771ForwarderAddress[chainId],
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
