import {
  type Address,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
  decodeAbiParameters,
  encodeAbiParameters,
  encodeFunctionData,
  zeroAddress,
} from "viem";
import { describe, expect, test } from "vitest";
import { NATIVE_TOKEN } from "../constants.js";
import { createHookMetadata, hookMetadataId } from "../utils/hook.js";
import { build721PayMetadata } from "./pay.js";
import { build721CashOutMetadata } from "./cashOut.js";
import {
  buildDefifaPayMetadata,
  prepareDefifaPay,
  prepareDefifaCashOut,
  prepareDefifaTransfer,
  MAX_DEFIFA_ACTION_NFTS,
  defifaPhaseAllowsPay,
  defifaPhaseAllowsCashOut,
  restoreDefifaNftReceiptContext,
  type DefifaNftReceiptContext,
} from "./defifa.js";

const hook = "0x1111111111111111111111111111111111111111";
const account = "0x2222222222222222222222222222222222222222";
const recipient = "0x3333333333333333333333333333333333333333";
const terminal = "0x4444444444444444444444444444444444444444";
const oracle = "0x5555555555555555555555555555555555555555";
const store = "0x69913acf79dbba170d9efafe605ee62b42164f9c";
const deployer = "0xbfa54a97099485c134f06c9a08a4909c26fd7318";
const implementation = "0x3184783d0e3cbf5a821794b246c71a3d1a0cf312";
const args = {
  chainId: 84532 as const,
  projectId: 46n,
  account,
  expectedHook: hook,
} as const;
const tier = (id: number, price = 1000n) => ({
  id,
  price,
  remainingSupply: 20,
  initialSupply: 30,
  votingUnits: 1n,
  reserveFrequency: 0,
  category: 0,
  discountPercent: 0,
  encodedIpfsUri: `0x${"00".repeat(32)}`,
  resolvedUri: "",
  flags: {},
});
type Request = {
  address: Address;
  functionName: string;
  args?: readonly unknown[];
  blockNumber?: bigint;
  account?: Address;
  value?: bigint;
};
function fixture(overrides: Record<string, unknown> = {}) {
  const requests: Request[] = [];
  const simulations: Request[] = [];
  const defaults: Record<string, unknown> = {
    currentRulesetOf: [
      { id: 9 },
      { dataHook: hook, pausePay: false, useDataHookForPay: true },
    ],
    ownerOf: (request: Request) =>
      request.address === hook ? account : deployer,
    store,
    CODE_ORIGIN: implementation,
    projectId: args.projectId,
    gamePhaseReporter: deployer,
    gamePotReporter: deployer,
    pricingCurrency: 61166n,
    contractURI: "ipfs://native-game",
    currentGamePotOf: [0n, NATIVE_TOKEN, 18n],
    currentGamePhaseOf: 1,
    tiersOf: [tier(1)],
    tierNameOf: "Team A",
    currentSupplyOfTier: 10n,
    tierOf: (request: Request) =>
      tier(
        Number(request.args?.[1]),
        BigInt(request.args?.[1] as bigint) * 1000n,
      ),
    primaryTerminalOf: terminal,
    accountingContextForTokenOf: {
      token: NATIVE_TOKEN,
      currency: 61166,
      decimals: 18,
    },
    defaultAttestationDelegate: oracle,
    getTierDelegateOf: zeroAddress,
    noContestTriggeredFor: true,
    tokensClaimableFor: [0n, 0n],
    DEFIFA_TOKEN: oracle,
    BASE_PROTOCOL_TOKEN: recipient,
    decimals: 18,
  };
  const client = {
    getBlockNumber: async () => 123n,
    getChainId: async () => overrides.chainId ?? 84532,
    getBytecode: async () =>
      overrides.cloneCode ??
      `0x363d3d373d3d3d363d73${implementation.slice(2)}5af43d82803e903d91602b57fd5bf3`,
    readContract: async (request: Request) => {
      requests.push(request);
      const value =
        request.functionName in overrides
          ? overrides[request.functionName]
          : defaults[request.functionName];
      if (value instanceof Error) throw value;
      if (value === undefined)
        throw new Error(`Unexpected read ${request.functionName}`);
      return typeof value === "function" ? value(request) : value;
    },
    simulateContract: async (request: Request) => {
      simulations.push(request);
      if (overrides.simulation instanceof Error) throw overrides.simulation;
      return { result: overrides.simulation ?? 1000n, request };
    },
  } as unknown as PublicClient;
  return { client, requests, simulations };
}

describe("native Defifa metadata", () => {
  test("shares phase-only eligibility and bounded preparation across consumers", async () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(defifaPhaseAllowsPay)).toEqual([
      false,
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect([0, 1, 2, 3, 4, 5, 6].map(defifaPhaseAllowsCashOut)).toEqual([
      false,
      true,
      true,
      false,
      true,
      true,
      false,
    ]);
    const { client, requests } = fixture();
    await expect(
      prepareDefifaPay(client, {
        ...args,
        tierIdsToMint: Array(MAX_DEFIFA_ACTION_NFTS + 1).fill(1n),
      }),
    ).rejects.toThrow("per action");
    await expect(
      prepareDefifaCashOut(client, {
        ...args,
        tokenIds: Array.from({ length: MAX_DEFIFA_ACTION_NFTS + 1 }, (_, i) =>
          BigInt(i + 1),
        ),
      }),
    ).rejects.toThrow("per action");
    expect(requests).toHaveLength(0);
  });
  test("matches Solidity address,uint16[] and the implementation lookup key exactly", () => {
    const expected = createHookMetadata(
      [hookMetadataId(implementation, "pay")],
      [
        encodeAbiParameters(
          [{ type: "address" }, { type: "uint16[]" }],
          [oracle, [1, 1, 65535]],
        ),
      ],
    );
    expect(
      buildDefifaPayMetadata({
        metadataIdTarget: implementation,
        attestationDelegate: oracle,
        tierIdsToMint: [1n, 1n, 65535n],
      }),
    ).toBe(expected);
  });
  test("zero is native fallback; the ordinary shop boolean would silently become address 1", () => {
    const native = buildDefifaPayMetadata({
      metadataIdTarget: implementation,
      tierIdsToMint: [1n],
    });
    const generic = build721PayMetadata({
      metadataIdTarget: implementation,
      tierIdsToMint: [1n],
    });
    const decode = (value: Hex) =>
      decodeAbiParameters(
        [{ type: "address" }, { type: "uint16[]" }],
        `0x${value.slice(130)}`,
      );
    expect(decode(native)).toEqual([zeroAddress, [1]]);
    expect(decode(generic)).toEqual([
      "0x0000000000000000000000000000000000000001",
      [1],
    ]);
    expect(native).not.toBe(generic);
  });
  test.each(
    [[], [0n], [-1n], [65536n], [2n, 1n], [1 as unknown as bigint]].map(
      (ids) => [ids],
    ),
  )("rejects invalid IDs %#", (tierIdsToMint) => {
    expect(() =>
      buildDefifaPayMetadata({
        metadataIdTarget: implementation,
        tierIdsToMint,
      }),
    ).toThrow("ascending positive uint16");
  });
  test.each([zeroAddress, "0x123", "invalid"])(
    "rejects invalid metadata target %s",
    (target) => {
      expect(() =>
        buildDefifaPayMetadata({
          metadataIdTarget: target as Address,
          tierIdsToMint: [1n],
        }),
      ).toThrow("metadataIdTarget");
    },
  );
  test("validates delegates and respects the shared envelope size limit", () => {
    expect(() =>
      buildDefifaPayMetadata({
        metadataIdTarget: implementation,
        attestationDelegate: "bad" as Address,
        tierIdsToMint: [1n],
      }),
    ).toThrow("delegate");
    expect(() =>
      buildDefifaPayMetadata({
        metadataIdTarget: implementation,
        tierIdsToMint: Array(251).fill(1n),
      }),
    ).toThrow("METADATA_TOO_LONG");
  });
});

describe("fresh Defifa payment preparation", () => {
  test("prices repeated selected tiers at one block and honors the native default", async () => {
    const { client, requests, simulations } = fixture();
    const result = await prepareDefifaPay(client, {
      ...args,
      tierIdsToMint: [1n, 1n, 2n],
      memo: "Team entry",
    });
    expect(result.amount).toBe(4000n);
    expect(result.selectedTiers).toEqual([
      { tierId: 1n, count: 2n, unitPrice: 1000n },
      { tierId: 2n, count: 1n, unitPrice: 2000n },
    ]);
    expect(result.attestationDelegate).toBe(zeroAddress);
    expect(result.effectiveAttestationDelegate).toBe(oracle);
    expect(result.transaction).toMatchObject({
      address: terminal,
      functionName: "pay",
      value: 4000n,
      args: [
        46n,
        NATIVE_TOKEN,
        4000n,
        account,
        0n,
        "Team entry",
        buildDefifaPayMetadata({
          metadataIdTarget: implementation,
          tierIdsToMint: [1n, 1n, 2n],
        }),
      ],
    });
    expect(requests.every((request) => request.blockNumber === 123n)).toBe(
      true,
    );
    expect(simulations).toHaveLength(0);
    expect(result.inventory.capabilities.genericPay).toBe(false);
  });
  test("exposes changed selected-tier unit prices even when the exact payment total is unchanged", async () => {
    const prepare = async (second: boolean) => {
      const run = fixture({
        tierOf: (request: Request) => {
          const id = Number(request.args?.[1]);
          return tier(
            id,
            second ? (id === 1 ? 1200n : 1600n) : BigInt(id) * 1000n,
          );
        },
      });
      const prepared = await prepareDefifaPay(run.client, {
        ...args,
        tierIdsToMint: [1n, 1n, 2n],
      });
      expect(
        run.requests.filter((request) => request.functionName === "tierOf"),
      ).toHaveLength(2);
      return prepared;
    };
    const before = await prepare(false);
    const after = await prepare(true);
    expect(after.amount).toBe(before.amount);
    expect(after.transaction).toEqual(before.transaction);
    expect(after.selectedTiers).toEqual([
      { tierId: 1n, count: 2n, unitPrice: 1200n },
      { tierId: 2n, count: 1n, unitPrice: 1600n },
    ]);
    expect(after.selectedTiers).not.toEqual(before.selectedTiers);
  });
  test("keeps explicit delegate and beneficiary; empty configured default falls back to beneficiary", async () => {
    const { client } = fixture({ defaultAttestationDelegate: zeroAddress });
    expect(
      (
        await prepareDefifaPay(client, {
          ...args,
          tierIdsToMint: [1n],
          beneficiary: recipient,
        })
      ).effectiveAttestationDelegate,
    ).toBe(recipient);
    const explicit = await prepareDefifaPay(client, {
      ...args,
      tierIdsToMint: [1n],
      beneficiary: recipient,
      attestationDelegate: account,
    });
    expect(explicit.effectiveAttestationDelegate).toBe(recipient);
    expect(explicit.transaction.args[3]).toBe(recipient);
  });
  test("uses ERC20 token units and the store discount formula with no native value", async () => {
    const { client } = fixture({
      pricingCurrency: 42n,
      currentGamePotOf: [0n, oracle, 6n],
      accountingContextForTokenOf: { token: oracle, currency: 42, decimals: 6 },
      tierOf: { ...tier(1, 101n), discountPercent: 25 },
    });
    const result = await prepareDefifaPay(client, {
      ...args,
      tierIdsToMint: [1n, 1n],
    });
    expect(result.amount).toBe(178n);
    expect(result.selectedTiers).toEqual([
      { tierId: 1n, count: 2n, unitPrice: 89n },
    ]);
    expect(result.transaction.value).toBe(0n);
    expect(result.transaction.args[1]).toBe(oracle);
  });
  test("gift mints preserve mixed recipient delegates, including self fallback", async () => {
    const { client } = fixture({
      getTierDelegateOf: (request: Request) =>
        request.args?.[1] === 1n ? oracle : zeroAddress,
    });
    const result = await prepareDefifaPay(client, {
      ...args,
      beneficiary: recipient,
      tierIdsToMint: [1n, 2n],
      attestationDelegate: account,
    });
    expect(result.effectiveAttestationDelegate).toBeNull();
    expect(result.effectiveDelegates).toEqual([
      { tierId: 1n, delegate: oracle },
      { tierId: 2n, delegate: recipient },
    ]);
  });
  test("snapshots mutable caller inputs before awaited reads", async () => {
    const selected = [1n, 1n];
    const { client } = fixture();
    const pending = prepareDefifaPay(client, {
      ...args,
      tierIdsToMint: selected,
    });
    selected[0] = 2n;
    const prepared = await pending;
    expect(prepared.amount).toBe(2000n);
    expect(prepared.transaction.args[6]).toBe(
      buildDefifaPayMetadata({
        metadataIdTarget: implementation,
        tierIdsToMint: [1n, 1n],
      }),
    );
  });
  test.each([0, 2, 3, 4, 5])(
    "refuses closed phase %s before preparing a payment",
    async (phase) => {
      const { client } = fixture({ currentGamePhaseOf: phase });
      await expect(
        prepareDefifaPay(client, { ...args, tierIdsToMint: [1n] }),
      ).rejects.toThrow("entry is not open");
    },
  );
  test.each([
    [
      {
        currentRulesetOf: [
          { id: 9 },
          { dataHook: hook, pausePay: true, useDataHookForPay: true },
        ],
      },
      "entry is not open",
    ],
    [
      {
        currentRulesetOf: [
          { id: 9 },
          { dataHook: hook, pausePay: false, useDataHookForPay: false },
        ],
      },
      "entry is not open",
    ],
    [{ tierOf: tier(2) }, "unavailable"],
    [{ tierOf: { ...tier(1), remainingSupply: 0 } }, "unavailable"],
    [{ primaryTerminalOf: zeroAddress }, "no primary terminal"],
    [
      {
        accountingContextForTokenOf: {
          token: oracle,
          decimals: 18,
          currency: 61166,
        },
      },
      "accounting",
    ],
    [
      {
        accountingContextForTokenOf: {
          token: NATIVE_TOKEN,
          decimals: 6,
          currency: 61166,
        },
      },
      "accounting",
    ],
    [
      {
        accountingContextForTokenOf: {
          token: NATIVE_TOKEN,
          decimals: 18,
          currency: 42,
        },
      },
      "accounting",
    ],
    [{ tierOf: new Error("RPC unavailable") }, "RPC unavailable"],
    [{ CODE_ORIGIN: oracle }, "provenance"],
    [{ cloneCode: "0x" }, "clone"],
    [{ chainId: 1 }, "wrong chain"],
  ] as const)(
    "rejects mismatched native payment context %#",
    async (override, message) => {
      const { client } = fixture(override);
      await expect(
        prepareDefifaPay(client, { ...args, tierIdsToMint: [1n] }),
      ).rejects.toThrow(message);
    },
  );
  test("checks every review preparation freshly", async () => {
    const overrides = { currentGamePhaseOf: 1 };
    const { client } = fixture(overrides);
    await prepareDefifaPay(client, { ...args, tierIdsToMint: [1n] });
    overrides.currentGamePhaseOf = 3;
    await expect(
      prepareDefifaPay(client, { ...args, tierIdsToMint: [1n] }),
    ).rejects.toThrow("entry is not open");
  });
  test.each([
    [{ account: zeroAddress, beneficiary: recipient }, "account"],
    [{ beneficiary: zeroAddress }, "beneficiary"],
    [{ expectedHook: zeroAddress }, "expected hook"],
    [{ expectedHook: recipient }, "collection changed"],
    [{ projectId: 0n }, "projectId"],
  ] as const)("validates action binding %#", async (override, message) => {
    const { client } = fixture();
    await expect(
      prepareDefifaPay(client, { ...args, tierIdsToMint: [1n], ...override }),
    ).rejects.toThrow(message as string);
  });
});

describe("native Defifa cash-out preparation", () => {
  test.each([1, 2, 4, 5])(
    "simulates exact selected NFT cash-out in native phase %s",
    async (phase) => {
      const { client, requests, simulations } = fixture({
        currentGamePhaseOf: phase,
      });
      const result = await prepareDefifaCashOut(client, {
        ...args,
        tokenIds: [1000000001n, 2000000001n],
        minimumReclaim: 900n,
        beneficiary: recipient,
      });
      expect(result.reclaimAmount).toBe(1000n);
      expect(result.transaction.args).toEqual([
        account,
        46n,
        0n,
        NATIVE_TOKEN,
        900n,
        recipient,
        build721CashOutMetadata({
          metadataIdTarget: implementation,
          tokenIds: [1000000001n, 2000000001n],
        }),
      ]);
      expect(simulations).toEqual([
        { ...result.transaction, account, blockNumber: 123n },
      ]);
      expect(requests.every((request) => request.blockNumber === 123n)).toBe(
        true,
      );
    },
  );
  test("permits a zero settlement-token result with actual protocol rewards", async () => {
    const { client } = fixture({
      currentGamePhaseOf: 4,
      simulation: 0n,
      tokensClaimableFor: [123n, 456n],
    });
    const result = await prepareDefifaCashOut(client, {
      ...args,
      tokenIds: [1000000001n],
    });
    expect(result.reclaimAmount).toBe(0n);
    expect(result.protocolRewards).toEqual({
      defifaToken: oracle,
      defifaAmount: 123n,
      defifaDecimals: 18,
      baseProtocolToken: recipient,
      baseProtocolAmount: 456n,
      baseProtocolDecimals: 18,
    });
  });
  test.each([
    [{ currentGamePhaseOf: 0 }, "phase"],
    [{ currentGamePhaseOf: 3 }, "phase"],
    [{ currentGamePhaseOf: 5, noContestTriggeredFor: false }, "activated"],
    [
      {
        ownerOf: (request: Request) =>
          request.address === hook ? recipient : deployer,
      },
      "not owned",
    ],
    [{ simulation: new Error("NothingToClaim") }, "NothingToClaim"],
    [
      { tokensClaimableFor: new Error("Rewards read unavailable") },
      "Rewards read unavailable",
    ],
  ] as const)(
    "refuses unavailable/unverified cash-out %#",
    async (override, message) => {
      const { client } = fixture(override);
      await expect(
        prepareDefifaCashOut(client, { ...args, tokenIds: [1n] }),
      ).rejects.toThrow(message);
    },
  );
  test.each([[], [0n], [1n, 1n], [-1n], [1n << 256n]].map((ids) => [ids]))(
    "rejects invalid token IDs %#",
    async (tokenIds) => {
      const { client, requests } = fixture();
      await expect(
        prepareDefifaCashOut(client, { ...args, tokenIds }),
      ).rejects.toThrow();
      expect(requests).toHaveLength(0);
    },
  );
  test("rejects a negative minimum", async () => {
    const { client } = fixture();
    await expect(
      prepareDefifaCashOut(client, {
        ...args,
        tokenIds: [1n],
        minimumReclaim: -1n,
      }),
    ).rejects.toThrow("minimum reclaim");
  });
});

describe("native Defifa transfer preparation", () => {
  test.each([1, 3, 4, 5])(
    "simulates a standard owner transfer in phase %s without invented phase restrictions",
    async (phase) => {
      const { client, simulations } = fixture({ currentGamePhaseOf: phase });
      const result = await prepareDefifaTransfer(client, {
        ...args,
        tokenId: 1000000001n,
        recipient,
      });
      expect(result.transaction).toMatchObject({
        address: hook,
        functionName: "safeTransferFrom",
        args: [account, recipient, 1000000001n],
      });
      expect(simulations).toEqual([
        { ...result.transaction, account, blockNumber: 123n },
      ]);
    },
  );
  test("rejects receiver/paused transfer failures without masking the native error", async () => {
    const { client } = fixture({ simulation: new Error("TransfersPaused") });
    await expect(
      prepareDefifaTransfer(client, { ...args, tokenId: 1n, recipient }),
    ).rejects.toThrow("TransfersPaused");
  });
  test.each([
    { tokenId: 0n, recipient },
    { tokenId: 1n, recipient: zeroAddress },
  ] as const)("rejects invalid transfer %#", async (input) => {
    const { client } = fixture();
    await expect(
      prepareDefifaTransfer(client, { ...args, ...input }),
    ).rejects.toThrow();
  });
});

describe("restoring native Defifa recovery context", () => {
  const hash = `0x${"ab".repeat(32)}` as Hex;
  const proposalHash = `0x${"cd".repeat(32)}` as Hex;
  const receipt = {
    transactionHash: hash,
    blockNumber: 90n,
  } as TransactionReceipt;
  function saved(transaction: DefifaNftReceiptContext["transaction"]) {
    return {
      version: 1 as const,
      id: "native-attempt",
      chainId: args.chainId,
      account,
      safe: false,
      hash,
      call: {
        to: transaction.address,
        data:
          transaction.functionName === "safeTransferFrom"
            ? encodeFunctionData(transaction)
            : encodeFunctionData(transaction),
        value: ("value" in transaction ? transaction.value : 0n).toString(),
      },
    };
  }
  async function payment() {
    return prepareDefifaPay(fixture().client, {
      ...args,
      tierIdsToMint: [1n, 2n],
    });
  }
  const restore = (
    client: PublicClient,
    record: unknown,
    overrides: Partial<
      Parameters<typeof restoreDefifaNftReceiptContext>[1]
    > = {},
  ) =>
    restoreDefifaNftReceiptContext(client, {
      ...args,
      record,
      receipt,
      ...overrides,
    });

  test.each(["pay", "cashout", "transfer"])(
    "restores %s exactly at the historical receipt block without fresh phase, price, ownership or simulation gates",
    async (kind) => {
      const setup = fixture();
      const prepared =
        kind === "pay"
          ? await prepareDefifaPay(setup.client, {
              ...args,
              tierIdsToMint: [1n, 2n],
            })
          : kind === "cashout"
            ? await prepareDefifaCashOut(setup.client, {
                ...args,
                tokenIds: [1000000001n],
              })
            : await prepareDefifaTransfer(setup.client, {
                ...args,
                tokenId: 1000000001n,
                recipient,
              });
      const historical = fixture({
        currentGamePhaseOf: 3,
        tierOf: new Error("no selected-price read in recovery"),
        ownerOf: (request: Request) => {
          if (request.address === hook)
            throw new Error("no token-owner read in recovery");
          return deployer;
        },
      });
      const context = await restore(
        historical.client,
        saved(prepared.transaction),
      );
      expect(context).toEqual({
        hook,
        implementation,
        account,
        transaction: prepared.transaction,
      });
      expect(
        historical.requests.every((request) => request.blockNumber === 90n),
      ).toBe(true);
      expect(historical.simulations).toHaveLength(0);
    },
  );

  test("preserves the wallet-returned Safe proposal identity separately from the execution receipt", async () => {
    const prepared = await payment();
    const record = {
      ...saved(prepared.transaction),
      safe: true,
      hash: proposalHash,
    };
    expect((await restore(fixture().client, record)).safe).toEqual({
      proposalHash,
    });
  });

  test("snapshots recovery identity before awaited reads", async () => {
    const prepared = await payment();
    const input = {
      ...args,
      record: saved(prepared.transaction),
      receipt: { ...receipt },
    };
    const run = fixture({
      CODE_ORIGIN: () => {
        input.projectId = 47n as typeof input.projectId;
        input.receipt.transactionHash = proposalHash;
        input.receipt.blockNumber = 91n;
        input.record.call.data = "0x";
        return implementation;
      },
    });
    const context = await restoreDefifaNftReceiptContext(run.client, input);
    expect(context.transaction).toEqual(prepared.transaction);
    expect(run.requests.every((request) => request.blockNumber === 90n)).toBe(
      true,
    );
  });

  test.each([
    "missing-hash",
    "different-hash",
    "wrong-chain",
    "malformed",
    "negative-block",
  ])("refuses %s evidence before any native RPC reads", async (reason) => {
    const prepared = await payment();
    const record: Record<string, unknown> = saved(prepared.transaction);
    if (reason === "missing-hash") delete record.hash;
    if (reason === "different-hash") record.hash = proposalHash;
    if (reason === "wrong-chain") record.chainId = 1;
    if (reason === "malformed") record.version = 2;
    const run = fixture();
    await expect(
      restore(
        run.client,
        record,
        reason === "negative-block"
          ? { receipt: { ...receipt, blockNumber: -1n } }
          : {},
      ),
    ).rejects.toThrow();
    expect(run.requests).toHaveLength(0);
  });

  test.each([
    "project",
    "token",
    "metadata",
    "value",
    "trailing",
    "terminal",
    "unsupported",
    "donation",
  ])("rejects a saved pay with wrong %s", async (reason) => {
    const prepared = await payment();
    const transaction = {
      ...prepared.transaction,
      args: [
        ...prepared.transaction.args,
      ] as unknown as typeof prepared.transaction.args,
    };
    if (reason === "project")
      transaction.args = [
        47n,
        ...transaction.args.slice(1),
      ] as unknown as typeof transaction.args;
    if (reason === "token")
      transaction.args = [
        transaction.args[0],
        oracle,
        ...transaction.args.slice(2),
      ] as unknown as typeof transaction.args;
    if (reason === "metadata")
      transaction.args = [
        ...transaction.args.slice(0, 6),
        buildDefifaPayMetadata({
          metadataIdTarget: hook,
          tierIdsToMint: [1n, 2n],
        }),
      ] as unknown as typeof transaction.args;
    const record = saved(transaction);
    if (reason === "value") record.call.value = "1";
    if (reason === "trailing") record.call.data = `${record.call.data}00`;
    if (reason === "terminal") record.call.to = recipient;
    if (reason === "unsupported") record.call.data = "0x12345678";
    if (reason === "donation")
      record.call.data = encodeFunctionData({
        abi: prepared.transaction.abi,
        functionName: "addToBalanceOf",
        args: [
          args.projectId,
          NATIVE_TOKEN,
          prepared.amount,
          false,
          "Donation",
          "0x",
        ],
      });
    await expect(restore(fixture().client, record)).rejects.toThrow();
  });

  test.each(["holder", "project", "count", "token", "metadata", "value"])(
    "rejects a saved cash-out with wrong %s",
    async (reason) => {
      const prepared = await prepareDefifaCashOut(fixture().client, {
        ...args,
        tokenIds: [1000000001n],
      });
      const values = [...prepared.transaction.args];
      if (reason === "holder") values[0] = recipient;
      if (reason === "project") values[1] = 47n;
      if (reason === "count") values[2] = 1n;
      if (reason === "token") values[3] = oracle;
      if (reason === "metadata")
        values[6] = build721CashOutMetadata({
          metadataIdTarget: hook,
          tokenIds: [1000000001n],
        });
      const record = saved({
        ...prepared.transaction,
        args: values as unknown as typeof prepared.transaction.args,
      });
      if (reason === "value") record.call.value = "1";
      await expect(restore(fixture().client, record)).rejects.toThrow();
    },
  );

  test.each([
    "from",
    "token",
    "recipient",
    "value",
    "function",
    "receiver-data",
  ])("rejects a saved transfer with wrong %s", async (reason) => {
    const prepared = await prepareDefifaTransfer(fixture().client, {
      ...args,
      tokenId: 1000000001n,
      recipient,
    });
    const record = saved({
      ...prepared.transaction,
      args: [
        reason === "from" ? recipient : account,
        reason === "recipient" ? zeroAddress : recipient,
        reason === "token" ? 0n : 1000000001n,
      ],
    });
    if (reason === "value") record.call.value = "1";
    if (reason === "function")
      record.call.data = encodeFunctionData({
        abi: prepared.transaction.abi,
        functionName: "transferFrom",
        args: [account, recipient, 1000000001n],
      });
    if (reason === "receiver-data")
      record.call.data = encodeFunctionData({
        abi: prepared.transaction.abi,
        functionName: "safeTransferFrom",
        args: [account, recipient, 1000000001n, "0x1234"],
      });
    await expect(restore(fixture().client, record)).rejects.toThrow();
  });

  test("does not turn historical identity failures into a restored context", async () => {
    const prepared = await payment();
    for (const overrides of [
      { CODE_ORIGIN: hook },
      { currentGamePhaseOf: new Error("archive state unavailable") },
      { primaryTerminalOf: recipient },
    ])
      await expect(
        restore(fixture(overrides).client, saved(prepared.transaction)),
      ).rejects.toThrow();
    await expect(
      restore(fixture().client, saved(prepared.transaction), {
        expectedHook: recipient,
      }),
    ).rejects.toThrow();
  });
});
