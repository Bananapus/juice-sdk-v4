import { describe, expect, it } from "vitest";
import {
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionData,
  parseAbiItem,
  zeroAddress,
  type AbiEvent,
  type Address,
  type Hex,
} from "viem";
import { jbMultiTerminalAbi, jbBuybackHookAbi } from "../generated/juicebox.js";
import { NATIVE_TOKEN } from "../constants.js";
import { uniswapV4PoolId } from "./uniswapV4.js";
import { v6Address } from "./types.js";
import {
  verifyV6OperationEvidence,
  type V6OperationReceipt,
} from "./operationEvidence.js";
const ACCOUNT = "0x1111111111111111111111111111111111111111" as Address;
const OTHER = "0x2222222222222222222222222222222222222222" as Address;
const TOKEN = "0x3333333333333333333333333333333333333333" as Address;
const TERMINAL = v6Address("JBMultiTerminal", 1);
const HASH = `0x${"a".repeat(64)}` as Hex;
const BLOCK100 = `0x${"1".repeat(64)}` as Hex;
const BLOCK101 = `0x${"2".repeat(64)}` as Hex;
const evidence = {
  chainId: 1 as const,
  blockNumber: "101",
  blockHash: BLOCK101,
  timestamp: "1788696000",
  source: "rpc",
};

const payCall = () => ({
  chainId: 1 as const,
  to: TERMINAL,
  data: encodeFunctionData({
    abi: jbMultiTerminalAbi,
    functionName: "pay",
    args: [7n, TOKEN, 100n, ACCOUNT, 5n, "", "0x"],
  }),
  value: "0",
  label: "Pay project 7",
  decoded: {
    functionName: "pay",
    args: ["7", TOKEN, "100", ACCOUNT, "5", "", "0x"],
  },
  dependsOn: [],
});
const draft = (calls = [payCall()]) => ({
  operation: "pay",
  account: ACCOUNT,
  project: { chainId: 1 as const, projectId: "7", version: 6 as const },
  calls,
  evidence: [{ ...evidence, blockNumber: "99" }],
  summary: { amount: "100" },
  warnings: [],
});

function eventLog(
  signature: string,
  args: Record<string, unknown>,
  address: Address,
  logIndex = 0,
) {
  const event = parseAbiItem(signature) as AbiEvent;
  return encodedLog(event, args, address, logIndex);
}
function encodedLog(
  event: AbiEvent,
  args: Record<string, unknown>,
  address: Address,
  logIndex = 0,
) {
  const nonIndexed = event.inputs.filter((input) => !input.indexed);
  return {
    address,
    data: encodeAbiParameters(
      nonIndexed,
      nonIndexed.map((input) => args[input.name!]),
    ),
    topics: encodeEventTopics({ abi: [event], eventName: event.name, args }),
    logIndex,
    removed: false,
    transactionHash: HASH,
    transactionIndex: 0,
    blockNumber: 100n,
    blockHash: BLOCK100,
  };
}
function payLog(overrides: Record<string, unknown> = {}, emitter = TERMINAL) {
  return eventLog(
    "event Pay(uint256 indexed rulesetId,uint256 indexed rulesetCycleNumber,uint256 indexed projectId,address payer,address beneficiary,uint256 amount,uint256 newlyIssuedTokenCount,string memo,bytes metadata,address caller)",
    {
      rulesetId: 1n,
      rulesetCycleNumber: 1n,
      projectId: 7n,
      payer: ACCOUNT,
      beneficiary: ACCOUNT,
      amount: 100n,
      newlyIssuedTokenCount: 10n,
      memo: "",
      metadata: "0x",
      caller: ACCOUNT,
      ...overrides,
    },
    emitter,
  );
}

const receipt = (logs = [payLog()]): V6OperationReceipt => ({
  status: "success",
  transactionHash: HASH,
  blockHash: BLOCK100,
  blockNumber: 100n,
  logs: logs as V6OperationReceipt["logs"],
});

describe("modeled V6 operation evidence", () => {
  it("verifies a canonical matching payment event without RPC or tokens", () => {
    expect(verifyV6OperationEvidence(draft(), 0, receipt())).toMatchObject({
      verified: true,
      events: [
        {
          event: "Pay",
          emitter: TERMINAL,
          args: { projectId: "7", amount: "100" },
        },
      ],
    });
  });
  it.each([
    ["spoofed emitter", payLog({}, OTHER)],
    ["wrong beneficiary", payLog({ beneficiary: OTHER })],
    ["wrong project", payLog({ projectId: 8n })],
    ["wrong payer", payLog({ payer: OTHER })],
    ["wrong caller", payLog({ caller: OTHER })],
    ["removed log", { ...payLog(), removed: true }],
    ["wrong transaction", { ...payLog(), transactionHash: BLOCK101 }],
    ["wrong block", { ...payLog(), blockHash: BLOCK101 }],
    ["wrong block height", { ...payLog(), blockNumber: 101n }],
  ])("rejects %s", (_label, log) => {
    expect(verifyV6OperationEvidence(draft(), 0, receipt([log]))).toMatchObject(
      { verified: false },
    );
  });
  it("does not equate success with a modeled outcome", () => {
    expect(verifyV6OperationEvidence(draft(), 0, receipt([])).verified).toBe(
      false,
    );
    expect(
      verifyV6OperationEvidence(draft(), 0, {
        ...receipt(),
        status: "reverted",
      }).verified,
    ).toBe(false);
    expect(
      verifyV6OperationEvidence(
        draft([{ ...payCall(), data: "0x12345678" as Hex }]),
        0,
        receipt(),
      ).verified,
    ).toBe(false);
  });
  it("rejects an absent step", () => {
    expect(() => verifyV6OperationEvidence(draft(), -1, receipt())).toThrow(
      "step",
    );
    expect(() => verifyV6OperationEvidence(draft(), 1, receipt())).toThrow(
      "step",
    );
  });
});

describe("reviewed buyback pool key", () => {
  const hook = v6Address("JBBuybackHook", 1);
  const key = {
    currency0: zeroAddress,
    currency1: TOKEN,
    fee: 10000,
    tickSpacing: 200,
    hooks: OTHER,
  };
  const plan = {
    ...draft(),
    calls: [
      {
        chainId: 1 as const,
        to: hook,
        data: encodeFunctionData({
          abi: jbBuybackHookAbi,
          functionName: "setPoolFor",
          args: [7n, 10000, 200, 172800n, NATIVE_TOKEN],
        }),
      },
    ],
    summary: { key },
  };
  const log = (
    eventName: string,
    args: Record<string, unknown>,
    index: number,
  ) =>
    encodedLog(
      jbBuybackHookAbi.find(
        (item) => item.type === "event" && item.name === eventName,
      ) as AbiEvent,
      args,
      hook,
      index,
    );
  const proof = receipt([
    log(
      "PoolAdded",
      {
        projectId: 7n,
        terminalToken: zeroAddress,
        poolId: uniswapV4PoolId(key),
        caller: ACCOUNT,
      },
      0,
    ),
    log(
      "TwapWindowChanged",
      {
        projectId: 7n,
        terminalToken: zeroAddress,
        oldWindow: 0n,
        newWindow: 1800n,
        caller: ACCOUNT,
      },
      1,
    ),
  ]);
  it("verifies the exact pool registration and sentinel window", () => {
    expect(verifyV6OperationEvidence(plan, 0, proof).verified).toBe(true);
  });
  it.each([
    { ...key, unexpected: true },
    { ...key, fee: 16777216 },
    { ...key, fee: 1.5 },
    { ...key, tickSpacing: -8388609 },
    { ...key, tickSpacing: 8388608 },
    { ...key, hooks: "0x123" },
    { ...key, hooks: "0x52908400098527886e0F7030069857D2E4169EE7" },
    { ...key, currency0: undefined },
  ])("rejects invalid pool key %j", (invalidKey) => {
    expect(
      verifyV6OperationEvidence(
        { ...plan, summary: { key: invalidKey } },
        0,
        proof,
      ),
    ).toMatchObject({
      verified: false,
      reason: "The reviewed pool key is unavailable or invalid.",
    });
  });
});
