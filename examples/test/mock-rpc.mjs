// Offline transport fixture. It never opens a socket and rejects send methods.
import {
  decodeFunctionData,
  encodeFunctionResult,
  encodeEventTopics,
  encodeAbiParameters,
  zeroAddress,
} from "viem";
import {
  jbProjectsAbi,
  jbDirectoryAbi,
  jbControllerAbi,
} from "@bananapus/nana-sdk-core";
import { v6Address } from "@bananapus/nana-sdk-core/v6";
const owner = "0x0000000000000000000000000000000000000099";
const abi = [...jbProjectsAbi, ...jbDirectoryAbi, ...jbControllerAbi];
function empty(parameter) {
  if (parameter.type.endsWith("[]")) return [];
  if (parameter.type === "tuple")
    return Object.fromEntries(
      parameter.components.map((part) => [part.name, empty(part)]),
    );
  if (parameter.type === "address") return zeroAddress;
  if (parameter.type === "bool") return false;
  if (parameter.type === "string") return "";
  if (parameter.type.startsWith("bytes"))
    return `0x${"00".repeat(Number(parameter.type.slice(5)) || 0)}`;
  return 0n;
}
globalThis.fetch = async (_url, options) => {
  const call = JSON.parse(options.body);
  let result;
  if (call.method === "eth_chainId") result = "0x14a34";
  else if (call.method === "eth_blockNumber") result = "0x7b";
  else if (call.method === "eth_getTransactionReceipt") {
    const hash = call.params[0];
    const blockHash = `0x${"11".repeat(32)}`;
    const projectRegistry = v6Address("JBProjects", 84532);
    result = {
      blockHash,
      blockNumber: "0x7b",
      contractAddress: null,
      cumulativeGasUsed: "0x1",
      effectiveGasPrice: "0x1",
      from: owner,
      gasUsed: "0x1",
      logsBloom: `0x${"00".repeat(256)}`,
      status: "0x1",
      to: projectRegistry,
      transactionHash: hash,
      transactionIndex: "0x0",
      type: "0x2",
      logs: [
        {
          address: projectRegistry,
          blockHash,
          blockNumber: "0x7b",
          transactionHash: hash,
          transactionIndex: "0x0",
          logIndex: "0x0",
          removed: false,
          topics: encodeEventTopics({
            abi: jbProjectsAbi,
            eventName: "Create",
            args: { projectId: 45n, owner },
          }),
          data: encodeAbiParameters([{ type: "address" }], [owner]),
        },
      ],
    };
  } else if (call.method === "eth_getBlockByNumber")
    result = {
      timestamp: "0x68b00000",
      number: "0x7b",
      hash: `0x${"11".repeat(32)}`,
      transactions: [],
      baseFeePerGas: "0x1",
      gasLimit: "0x1000000",
      gasUsed: "0x1",
      size: "0x1",
      difficulty: "0x0",
      totalDifficulty: "0x0",
      extraData: "0x",
      nonce: "0x0000000000000000",
    };
  else if (call.method === "eth_call") {
    let decoded;
    try {
      decoded = decodeFunctionData({ abi, data: call.params[0].data });
    } catch {
      /* Prepared revnet simulation has no result. */
    }
    if (!decoded) result = "0x";
    else {
      const fn = abi.find(
        (entry) =>
          entry.type === "function" && entry.name === decoded.functionName,
      );
      let value =
        fn.outputs.length === 1 ? empty(fn.outputs[0]) : fn.outputs.map(empty);
      if (decoded.functionName !== "creationFee" && call.params[1] !== "0x7b")
        throw new Error("Diagnostic read was not pinned");
      if (decoded.functionName === "ownerOf") value = owner;
      if (decoded.functionName === "controllerOf")
        value = v6Address("JBController", 84532);
      if (decoded.functionName === "creationFee") value = 123n;
      result = encodeFunctionResult({
        abi: [fn],
        functionName: decoded.functionName,
        result: value,
      });
    }
  } else
    throw new Error(`Example attempted unexpected RPC method: ${call.method}`);
  return new Response(JSON.stringify({ jsonrpc: "2.0", id: call.id, result }), {
    headers: { "content-type": "application/json" },
  });
};
