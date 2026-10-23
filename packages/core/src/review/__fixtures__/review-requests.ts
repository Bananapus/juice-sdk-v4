// Review requests the four web clients' dialogs show, one per decoder route.
// Clients copy this file for their own rendering tests: src/__fixtures__ is
// not published.
import {
  decodeFunctionData,
  encodeAbiParameters,
  encodeFunctionData,
  erc20Abi,
  zeroAddress,
  type Abi,
  type AbiParameter,
  type Address,
  type Hex,
} from "viem";
import { jbContractAddress } from "../../generated/addresses/jbContractAddress.js";
import { jbControllerAbi } from "../../generated/abi/jbControllerAbi.js";
import { jbMultiTerminalAbi } from "../../generated/abi/jbMultiTerminalAbi.js";
import { jbPermissionsAbi } from "../../generated/abi/jbPermissionsAbi.js";
import {
  buildSafeInitializer,
  encodeMultiSend,
  MULTI_SEND_ABI,
  MULTI_SEND_CALL_ONLY,
  SAFE_CREATE_ABI,
  SAFE_FACTORY,
  SAFE_SINGLETON,
} from "../../safe.js";
import { build721CashOutMetadata } from "../../v6/cashOut.js";
import { build721PayMetadata } from "../../v6/pay.js";
import type {
  TransactionReviewCall,
  TransactionReviewRequest,
} from "../transactionReview.js";

const BASE = 8453;
const ALICE = "0x1111111111111111111111111111111111111111" as Address;
const BOB = "0x2222222222222222222222222222222222222222" as Address;
const TOKEN = "0x3333333333333333333333333333333333333333" as Address;
const TARGET = "0x4444444444444444444444444444444444444444" as Address;
const SAFE = "0x5555555555555555555555555555555555555555" as Address;
const NATIVE_TOKEN = "0x000000000000000000000000000000000000EEEe" as Address;

const v6 = jbContractAddress["6"] as unknown as Record<
  string,
  Record<number, Address>
>;
const TERMINAL = v6.JBMultiTerminal[BASE];
const CONTROLLER = v6.JBController[BASE];
const PERMISSIONS = v6.JBPermissions[BASE];

const fn = (
  name: string,
  inputs: readonly AbiParameter[],
  stateMutability: "payable" | "nonpayable" = "payable",
) =>
  [
    { type: "function", name, stateMutability, inputs, outputs: [] },
  ] as const satisfies Abi;

const safeAbi = fn("execTransaction", [
  { type: "address", name: "to" },
  { type: "uint256", name: "value" },
  { type: "bytes", name: "data" },
  { type: "uint8", name: "operation" },
  { type: "uint256", name: "safeTxGas" },
  { type: "uint256", name: "baseGas" },
  { type: "uint256", name: "gasPrice" },
  { type: "address", name: "gasToken" },
  { type: "address", name: "refundReceiver" },
  { type: "bytes", name: "signatures" },
]);
const suckerAbi = fn(
  "claim",
  [
    {
      type: "tuple",
      name: "claimData",
      components: [
        { type: "address", name: "token" },
        {
          type: "tuple",
          name: "leaf",
          components: [
            { type: "uint256", name: "index" },
            { type: "bytes32", name: "beneficiary" },
            { type: "uint256", name: "projectTokenCount" },
            { type: "uint256", name: "terminalTokenAmount" },
            { type: "bytes", name: "metadata" },
          ],
        },
        { type: "bytes32[32]", name: "proof" },
      ],
    },
  ],
  "nonpayable",
);
const positionManagerAbi = fn("modifyLiquidities", [
  { type: "bytes", name: "unlockData" },
  { type: "uint256", name: "deadline" },
]);
const universalRouterAbi = fn("execute", [
  { type: "bytes", name: "commands" },
  { type: "bytes[]", name: "inputs" },
  { type: "uint256", name: "deadline" },
]);

function call(
  chainId: number,
  to: Address,
  abi: Abi,
  functionName: string,
  args: readonly unknown[],
  rest: Partial<TransactionReviewCall> = {},
): TransactionReviewCall {
  return {
    chainId,
    to,
    data: encodeFunctionData({ abi, functionName, args }),
    abi,
    functionName,
    args,
    ...rest,
  };
}

const approve = (amount: bigint) =>
  call(1, TOKEN, erc20Abi, "approve", [BOB, amount], { from: SAFE });

const multiSendInner = [approve(5n), approve(6n)];
const multiSendData = encodeMultiSend(multiSendInner);

const v4Mint = encodeAbiParameters(
  [
    {
      type: "tuple",
      components: [
        { type: "address" },
        { type: "address" },
        { type: "uint24" },
        { type: "int24" },
        { type: "address" },
      ],
    },
    { type: "int24" },
    { type: "int24" },
    { type: "uint256" },
    { type: "uint128" },
    { type: "uint128" },
    { type: "address" },
    { type: "bytes" },
  ],
  [
    [zeroAddress, TOKEN, 10_000, 200, zeroAddress],
    -200,
    200,
    5n,
    7n,
    9n,
    ALICE,
    "0x",
  ],
);

const wrapEth = encodeAbiParameters(
  [{ type: "address" }, { type: "uint256" }],
  ["0x0000000000000000000000000000000000000002", 10n],
);

/** One request per decoder route the dialogs take, in a stable order. */
export const REVIEW_REQUESTS = {
  "pay with 721 metadata": {
    title: "Review payment",
    confirmLabel: "Pay",
    calls: [
      call(
        BASE,
        TERMINAL,
        jbMultiTerminalAbi,
        "pay",
        [
          4n,
          NATIVE_TOKEN,
          10n ** 16n,
          ALICE,
          0n,
          "gm",
          build721PayMetadata({
            metadataIdTarget: TARGET,
            tierIdsToMint: [4n, 4n, 7n],
            allowOverspending: false,
          }),
        ],
        { from: ALICE, value: 10n ** 16n, label: "Pay project #4" },
      ),
    ],
  },
  cashOut: {
    calls: [
      call(
        BASE,
        TERMINAL,
        jbMultiTerminalAbi,
        "cashOutTokensOf",
        [
          ALICE,
          4n,
          1_000n,
          NATIVE_TOKEN,
          0n,
          ALICE,
          build721CashOutMetadata({
            metadataIdTarget: TARGET,
            tokenIds: [4_000_000_001n],
          }),
        ],
        { from: ALICE, gas: 400_000n },
      ),
    ],
  },
  "sucker claim": {
    calls: [
      call(1, TARGET, suckerAbi, "claim", [
        {
          token: zeroAddress,
          leaf: {
            index: 7n,
            beneficiary: `0x000000000000000000000000${ALICE.slice(2)}`,
            projectTokenCount: 1_000n,
            terminalTokenAmount: 25n,
            metadata: `0x${"00".repeat(32)}`,
          },
          proof: Array.from(
            { length: 32 },
            (_, i) => `0x${String(i).padStart(2, "0").repeat(32)}` as Hex,
          ),
        },
      ]),
    ],
  },
  "Safe execTransaction with DELEGATECALL": {
    kind: "authorization",
    authorization: {
      domain: { chainId: 1, verifyingContract: SAFE },
      primaryType: "SafeTx",
      message: { to: MULTI_SEND_CALL_ONLY, operation: 1, nonce: 3n },
    },
    calls: [
      call(
        1,
        SAFE,
        safeAbi,
        "execTransaction",
        [
          MULTI_SEND_CALL_ONLY,
          0n,
          multiSendData,
          1,
          50_000n,
          0n,
          0n,
          zeroAddress,
          zeroAddress,
          "0x",
        ],
        { safeTxGas: 50_000n, calls: multiSendInner },
      ),
    ],
  },
  "Safe createProxyWithNonce": {
    kind: "authorization",
    description: "Center creates your multisig.",
    authorization: { kind: "message", type: "Juicebox Center project intent" },
    calls: [
      call(
        BASE,
        SAFE_FACTORY,
        SAFE_CREATE_ABI,
        "createProxyWithNonce",
        [
          SAFE_SINGLETON,
          buildSafeInitializer({ owners: [ALICE, BOB], threshold: 2 }),
          7n,
        ],
        { contractName: "SafeProxyFactory", safeTxGas: 0n },
      ),
    ],
  },
  setPermissionsFor: {
    calls: [
      call(BASE, PERMISSIONS, jbPermissionsAbi, "setPermissionsFor", [
        ALICE,
        { operator: CONTROLLER, projectId: 4n, permissionIds: [2, 3] },
      ]),
    ],
  },
  setSplitGroupsOf: {
    calls: [
      call(BASE, CONTROLLER, jbControllerAbi, "setSplitGroupsOf", [
        4n,
        0n,
        [
          {
            groupId: 1n,
            splits: [
              {
                percent: 500_000_000,
                projectId: 0n,
                beneficiary: ALICE,
                preferAddToBalance: false,
                lockedUntil: 0,
                hook: zeroAddress,
              },
            ],
          },
        ],
      ]),
    ],
  },
  MultiSend: {
    calls: [
      {
        chainId: 1,
        to: MULTI_SEND_CALL_ONLY,
        data: multiSendData,
        abi: MULTI_SEND_ABI,
        functionName: "multiSend",
        args: decodeFunctionData({ abi: MULTI_SEND_ABI, data: multiSendData })
          .args,
        calls: multiSendInner,
      },
    ],
  },
  "V4 modifyLiquidities": {
    calls: [
      call(1, TARGET, positionManagerAbi, "modifyLiquidities", [
        encodeAbiParameters(
          [{ type: "bytes" }, { type: "bytes[]" }],
          ["0x02", [v4Mint]],
        ),
        1_900_000_000n,
      ]),
    ],
  },
  "unknown selector": {
    calls: [
      { chainId: 1, to: TARGET, data: "0xdeadbeef" },
      { chainId: BASE, to: TARGET, data: "0x", value: 1n },
    ],
  },
  "Universal Router execute": {
    calls: [
      call(
        1,
        TARGET,
        universalRouterAbi,
        "execute",
        ["0x0b", [wrapEth], 1_900_000_000n],
        { value: 10n },
      ),
    ],
  },
} satisfies Record<string, TransactionReviewRequest>;
