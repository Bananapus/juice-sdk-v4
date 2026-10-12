import {
  type Abi,
  type AbiEvent,
  type Address,
  type Hex,
  type Log,
  type PublicClient,
  type TransactionReceipt,
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionData,
  erc721Abi,
  parseAbi,
  zeroAddress,
} from "viem";
import { describe, expect, test, vi } from "vitest";
import { NATIVE_TOKEN } from "../constants.js";
import { jbMultiTerminalAbi } from "../generated/juicebox.js";
import * as recovery from "../review/writeRecovery.js";
import { build721CashOutMetadata, buildCashOutTx } from "./cashOut.js";
import { buildPayTx } from "./pay.js";
import {
  buildDefifaPayMetadata,
  verifyDefifaNftReceipt,
  verifyDefifaNftTransaction,
  type DefifaNftReceiptContext,
} from "./defifa.js";

const hook = "0x1111111111111111111111111111111111111111";
const account = "0x2222222222222222222222222222222222222222";
const recipient = "0x3333333333333333333333333333333333333333";
const terminal = "0x4444444444444444444444444444444444444444";
const implementation = "0x3184783d0e3cbf5a821794b246c71a3d1a0cf312";
const hash = `0x${"ab".repeat(32)}` as Hex;
const blockHash = `0x${"cd".repeat(32)}` as Hex;
const otherHash = `0x${"ef".repeat(32)}` as Hex;
const effectAbi = parseAbi([
  "event Mint(uint256 indexed tokenId,uint256 indexed tierId,address indexed beneficiary,uint256 totalAmountContributed,address caller)",
  "event ClaimedTokens(address indexed beneficiary,uint256 defifaTokenAmount,uint256 baseProtocolTokenAmount,address caller)",
]);
function event(
  abi: Abi,
  name: string,
  values: Record<string, unknown>,
  emitter: Address = hook,
): Log<bigint, number, false> {
  const definition = abi.find(
    (item) => item.type === "event" && item.name === name,
  ) as AbiEvent;
  const inputs = definition.inputs.filter((input) => !input.indexed);
  return {
    address: emitter,
    topics: encodeEventTopics({
      abi,
      eventName: name,
      args: values,
    } as never) as [Hex, ...Hex[]],
    data: encodeAbiParameters(
      inputs,
      inputs.map((input) => values[input.name!]),
    ),
    blockHash,
    blockNumber: 123n,
    transactionHash: hash,
    transactionIndex: 0,
    logIndex: 0,
    removed: false,
  };
}
function receipt(
  logs: Log<bigint, number, false>[],
  to: Address = terminal,
): TransactionReceipt {
  return {
    status: "success",
    transactionHash: hash,
    blockNumber: 123n,
    blockHash,
    transactionIndex: 0,
    from: account,
    to,
    logs,
  } as unknown as TransactionReceipt;
}
function mintFixture() {
  const transaction = buildPayTx({
    chainId: 84532,
    terminal,
    projectId: 46n,
    token: NATIVE_TOKEN,
    amount: 3000n,
    beneficiary: account,
    memo: "entry",
    metadata: buildDefifaPayMetadata({
      metadataIdTarget: implementation,
      tierIdsToMint: [1n, 1n, 2n],
    }),
  });
  const context: DefifaNftReceiptContext = {
    hook,
    implementation,
    account,
    transaction,
  };
  const logs = [
    event(
      jbMultiTerminalAbi,
      "Pay",
      {
        rulesetId: 9n,
        rulesetCycleNumber: 1n,
        projectId: 46n,
        payer: account,
        beneficiary: account,
        amount: 3000n,
        newlyIssuedTokenCount: 0n,
        memo: "entry",
        metadata: transaction.args[6],
        caller: account,
      },
      terminal,
    ),
  ];
  for (const [tokenId, tierId] of [
    [1000000001n, 1n],
    [1000000002n, 1n],
    [2000000001n, 2n],
  ]) {
    logs.push(
      event(effectAbi, "Mint", {
        tokenId,
        tierId,
        beneficiary: account,
        totalAmountContributed: 3000n,
        caller: terminal,
      }),
    );
    logs.push(
      event(erc721Abi, "Transfer", { from: zeroAddress, to: account, tokenId }),
    );
  }
  return { context, receipt: receipt(logs) };
}
function cashFixture(reclaimAmount = 1000n, reward = 0n) {
  const transaction = buildCashOutTx({
    chainId: 84532,
    terminal,
    projectId: 46n,
    holder: account,
    cashOutCount: 0n,
    tokenToReclaim: NATIVE_TOKEN,
    minTokensReclaimed: reclaimAmount,
    beneficiary: recipient,
    metadata: build721CashOutMetadata({
      metadataIdTarget: implementation,
      tokenIds: [1000000001n],
    }),
  });
  const context: DefifaNftReceiptContext = {
    hook,
    implementation,
    account,
    transaction,
  };
  const logs = [
    event(
      jbMultiTerminalAbi,
      "CashOutTokens",
      {
        rulesetId: 9n,
        rulesetCycleNumber: 4n,
        projectId: 46n,
        holder: account,
        beneficiary: recipient,
        cashOutCount: 0n,
        cashOutTaxRate: 0n,
        reclaimAmount,
        metadata: transaction.args[6],
        caller: account,
      },
      terminal,
    ),
    event(erc721Abi, "Transfer", {
      from: account,
      to: zeroAddress,
      tokenId: 1000000001n,
    }),
  ];
  if (reward)
    logs.push(
      event(effectAbi, "ClaimedTokens", {
        beneficiary: recipient,
        defifaTokenAmount: reward,
        baseProtocolTokenAmount: 0n,
        caller: terminal,
      }),
    );
  return { context, receipt: receipt(logs) };
}
function transferFixture() {
  const context: DefifaNftReceiptContext = {
    hook,
    implementation,
    account,
    transaction: {
      chainId: 84532,
      address: hook,
      abi: erc721Abi,
      functionName: "safeTransferFrom",
      args: [account, recipient, 1000000001n],
    },
  };
  return {
    context,
    receipt: receipt(
      [
        event(erc721Abi, "Transfer", {
          from: account,
          to: recipient,
          tokenId: 1000000001n,
        }),
      ],
      hook,
    ),
  };
}
function proofFixture(overrides: Record<string, unknown> = {}) {
  const run = mintFixture();
  const transaction = {
    hash,
    chainId: 84532,
    from: account,
    to: terminal,
    input: encodeFunctionData(
      run.context.transaction as ReturnType<typeof buildPayTx>,
    ),
    value: 3000n,
    blockHash,
    blockNumber: 123n,
    transactionIndex: 0,
  };
  const client = {
    getChainId: vi.fn(async () => 84532),
    getTransaction: vi.fn(async () => transaction),
    getTransactionReceipt: vi.fn(async () => run.receipt),
    getBlock: vi.fn(async () => ({ hash: blockHash, number: 123n })),
    ...overrides,
  } as unknown as PublicClient;
  return { ...run, client, transaction };
}

describe("native Defifa receipt effects", () => {
  test("requires the exact Mint tier vector and matching ERC721 mint events", () => {
    const run = mintFixture();
    expect(() =>
      verifyDefifaNftReceipt(run.context, run.receipt),
    ).not.toThrow();
    for (let index = 0; index < run.receipt.logs.length; index++) {
      expect(() =>
        verifyDefifaNftReceipt(run.context, {
          ...run.receipt,
          logs: run.receipt.logs.filter((_, i) => i !== index),
        }),
      ).toThrow("exact reviewed");
    }
  });
  test.each([
    {
      tokenId: 1000000001n,
      tierId: 3n,
      beneficiary: account,
      totalAmountContributed: 3000n,
      caller: terminal,
    },
    {
      tokenId: 1000000001n,
      tierId: 1n,
      beneficiary: recipient,
      totalAmountContributed: 3000n,
      caller: terminal,
    },
    {
      tokenId: 1000000001n,
      tierId: 1n,
      beneficiary: account,
      totalAmountContributed: 3001n,
      caller: terminal,
    },
    {
      tokenId: 1000000001n,
      tierId: 1n,
      beneficiary: account,
      totalAmountContributed: 3000n,
      caller: recipient,
    },
    {
      tokenId: 1000000002n,
      tierId: 1n,
      beneficiary: account,
      totalAmountContributed: 3000n,
      caller: terminal,
    },
  ])("rejects wrong mint evidence %#", (values) => {
    const run = mintFixture();
    run.receipt.logs[1] = event(effectAbi, "Mint", values);
    expect(() => verifyDefifaNftReceipt(run.context, run.receipt)).toThrow();
  });
  test("rejects wrong hook logs, duplicate proof, failed receipt and chain implementation", () => {
    const run = mintFixture();
    expect(() =>
      verifyDefifaNftReceipt({ ...run.context, hook: recipient }, run.receipt),
    ).toThrow();
    expect(() =>
      verifyDefifaNftReceipt(run.context, {
        ...run.receipt,
        logs: [...run.receipt.logs, run.receipt.logs[0]!],
      }),
    ).toThrow();
    expect(() =>
      verifyDefifaNftReceipt(run.context, {
        ...run.receipt,
        status: "reverted",
      }),
    ).toThrow("did not succeed");
    expect(() =>
      verifyDefifaNftReceipt(
        { ...run.context, implementation: recipient },
        run.receipt,
      ),
    ).toThrow("pinned");
  });
  test("cash-out proves exact terminal event, selected burns and minimum", () => {
    const run = cashFixture();
    expect(() =>
      verifyDefifaNftReceipt(run.context, run.receipt),
    ).not.toThrow();
    expect(() =>
      verifyDefifaNftReceipt(run.context, {
        ...run.receipt,
        logs: run.receipt.logs.slice(0, 1),
      }),
    ).toThrow();
    const wrong = event(erc721Abi, "Transfer", {
      from: account,
      to: zeroAddress,
      tokenId: 1000000002n,
    });
    expect(() =>
      verifyDefifaNftReceipt(run.context, {
        ...run.receipt,
        logs: [run.receipt.logs[0]!, wrong],
      }),
    ).toThrow();
    expect(() =>
      verifyDefifaNftReceipt(
        { ...run.context, account: recipient },
        run.receipt,
      ),
    ).toThrow();
  });
  test("zero settlement-token claim requires native positive reward evidence", () => {
    const run = cashFixture(0n, 123n);
    expect(() =>
      verifyDefifaNftReceipt(run.context, run.receipt),
    ).not.toThrow();
    expect(() =>
      verifyDefifaNftReceipt(run.context, {
        ...run.receipt,
        logs: run.receipt.logs.slice(0, 2),
      }),
    ).toThrow();
  });
  test("allows a recipient to forward the NFT after the exact transfer event", () => {
    const run = transferFixture();
    run.receipt.logs.push(
      event(erc721Abi, "Transfer", {
        from: recipient,
        to: terminal,
        tokenId: 1000000001n,
      }),
    );
    expect(() =>
      verifyDefifaNftReceipt(run.context, run.receipt),
    ).not.toThrow();
    expect(() =>
      verifyDefifaNftReceipt({ ...run.context, hook: terminal }, run.receipt),
    ).toThrow();
    expect(() =>
      verifyDefifaNftReceipt(run.context, {
        ...run.receipt,
        logs: run.receipt.logs.slice(1),
      }),
    ).toThrow();
  });
});

describe("canonical Defifa transaction verification", () => {
  test("authenticates the exact standard ERC721 transfer call and zero value", async () => {
    const run = transferFixture();
    const { client } = proofFixture({
      getTransaction: async () => ({
        hash,
        chainId: 84532,
        from: account,
        to: hook,
        input: encodeFunctionData({
          abi: erc721Abi,
          functionName: "safeTransferFrom",
          args: [account, recipient, 1000000001n],
        }),
        value: 0n,
        blockHash,
        blockNumber: 123n,
        transactionIndex: 0,
      }),
      getTransactionReceipt: async () => run.receipt,
    });
    await verifyDefifaNftTransaction(client, run.context, run.receipt);
  });
  test("reuses exact-call proof and fresh canonical logs, with no ownership state reads", async () => {
    const run = proofFixture();
    await verifyDefifaNftTransaction(run.client, run.context, {
      ...run.receipt,
      logs: [],
    });
    expect(run.client.getTransaction).toHaveBeenCalledTimes(1);
    expect(run.client.getTransactionReceipt).toHaveBeenCalledTimes(1);
    expect(run.client.getBlock).toHaveBeenCalledWith({ blockNumber: 123n });
  });
  test.each([
    { from: recipient },
    { to: recipient },
    { input: "0x" },
    { value: 3001n },
    { chainId: 1 },
    { hash: otherHash },
    { blockHash: otherHash },
    { blockNumber: 124n },
  ])("rejects wrong transaction binding %#", async (override) => {
    const run = proofFixture();
    Object.assign(run.transaction, override);
    await expect(
      verifyDefifaNftTransaction(run.client, run.context, run.receipt),
    ).rejects.toThrow();
  });
  test("rejects wrong RPC chain, noncanonical block and unavailable RPC", async () => {
    for (const overrides of [
      { getChainId: async () => 1 },
      { getBlock: async () => ({ number: 123n, hash: otherHash }) },
      {
        getTransaction: async () => {
          throw new Error("RPC unavailable");
        },
      },
    ]) {
      const run = proofFixture(overrides);
      await expect(
        verifyDefifaNftTransaction(run.client, run.context, run.receipt),
      ).rejects.toThrow();
    }
  });
  test("rejects caller receipt identity mismatch and unbound canonical logs", async () => {
    const run = proofFixture();
    await expect(
      verifyDefifaNftTransaction(run.client, run.context, {
        ...run.receipt,
        blockHash: otherHash,
      }),
    ).rejects.toThrow();
    run.receipt.logs[0] = { ...run.receipt.logs[0]!, removed: true };
    await expect(
      verifyDefifaNftTransaction(run.client, run.context, run.receipt),
    ).rejects.toThrow("logs");
  });
  test("delegates Safe proof to the existing owner without requiring an EOA sender equal to the Safe", async () => {
    const verify = vi
      .spyOn(recovery, "verifyReviewedWriteReceipt")
      .mockResolvedValue("success");
    try {
      const run = proofFixture();
      run.transaction.from = recipient;
      const context = { ...run.context, safe: { proposalHash: otherHash } };
      await verifyDefifaNftTransaction(run.client, context, run.receipt);
      expect(verify).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          chainId: 84532,
          account,
          safe: true,
          hash: otherHash,
          call: { to: terminal, data: run.transaction.input, value: "3000" },
        }),
        run.receipt,
      );
      verify.mockResolvedValue("failed");
      await expect(
        verifyDefifaNftTransaction(run.client, context, run.receipt),
      ).rejects.toThrow("Safe transaction did not succeed");
    } finally {
      verify.mockRestore();
    }
  });
});
