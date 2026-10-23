import {
  encodeFunctionData,
  erc20Abi,
  maxUint256,
  type Abi,
  type Address,
  type Hex,
} from "viem";
import { describe, expect, it, vi } from "vitest";
import { jbContractAddress } from "../generated/addresses/jbContractAddress.js";
import { USDC_ADDRESSES } from "../pureConstants.js";
import { REVIEW_REQUESTS } from "./reviewRequests.js";
import expectedModels from "./__fixtures__/review-models.json" with { type: "json" };
import {
  buildReviewModel,
  enrichReviewModel,
  type ReviewCallModel,
  type ReviewModel,
} from "./model.js";
import {
  buildTransactionReviewPrompt,
  type TransactionReviewCall,
  type TransactionReviewRequest,
} from "./transactionReview.js";

// review-models.json was captured from jbm main's dialog, where JSON keeps
// each bigint as { $bigint }.
const asJson = (value: unknown) =>
  JSON.parse(
    JSON.stringify(value, (_, item) =>
      typeof item === "bigint" ? { $bigint: item.toString() } : item,
    ),
  );

const requests = REVIEW_REQUESTS as Record<string, TransactionReviewRequest>;
const pay = requests["pay with 721 metadata"];

describe("buildReviewModel", () => {
  it("matches the jbm dialog for every fixture", () => {
    expect(Object.keys(requests)).toEqual(Object.keys(expectedModels));
    for (const [name, request] of Object.entries(requests)) {
      expect(asJson(buildReviewModel(request)), name).toEqual(
        (expectedModels as Record<string, unknown>)[name],
      );
    }
  });

  it("binds id to calls and context", () => {
    const { id } = buildReviewModel(pay);
    const [call] = pay.calls;
    const lastByte = call.data.slice(-2) === "00" ? "01" : "00";
    const changedData = {
      ...pay,
      calls: [{ ...call, data: `${call.data.slice(0, -2)}${lastByte}` as Hex }],
    };
    expect(buildReviewModel(changedData).id).not.toBe(id);
    // The decoded calls the review shows inside a call are bound too.
    const multiSend = requests.MultiSend;
    const [batch] = multiSend.calls;
    const multiSendId = buildReviewModel(multiSend).id;
    for (const calls of [
      [...batch.calls!].reverse(),
      batch.calls!.slice(1),
      [{ ...batch.calls![0], value: 1n }, batch.calls![1]],
    ]) {
      expect(
        buildReviewModel({ ...multiSend, calls: [{ ...batch, calls }] }).id,
      ).not.toBe(multiSendId);
    }
    // The gas a wallet or Safe signs is part of what is sent.
    for (const changed of [{ gas: 1n }, { safeTxGas: 0n }]) {
      expect(
        buildReviewModel({ ...pay, calls: [{ ...call, ...changed }] }).id,
      ).not.toBe(id);
    }

    const context = [{ label: "Pay", value: "0.01 ETH" }];
    const withContext = buildReviewModel({ ...pay, context });
    expect(withContext.id).not.toBe(id);
    expect(
      buildReviewModel({
        ...pay,
        context: [{ label: "Pay", value: "0.02 ETH" }],
      }).id,
    ).not.toBe(withContext.id);
    expect(buildReviewModel({ ...pay, context }).id).toBe(withContext.id);
  });

  it("keeps id when only warnings or enrichment change", () => {
    const { id } = buildReviewModel(pay);
    const [call] = pay.calls;
    // A label, contract name or a missing ABI only change what the review
    // explains; the missing ABI adds a warning.
    const enriched = buildReviewModel({
      ...pay,
      title: "Another title",
      calls: [
        {
          ...call,
          label: "Pay with 4 decimals",
          contractName: "Terminal",
          abi: undefined,
        },
      ],
    });
    expect(enriched.calls[0].warnings.map((warning) => warning.code)).toEqual([
      "abi-unavailable",
    ]);
    expect(enriched.id).toBe(id);
  });

  it("binds the authorization by type and keeps a copy of it", () => {
    const authorization = {
      domain: { chainId: 1n },
      message: { amount: 5n, $bigint: "1" },
    };
    const request: TransactionReviewRequest = {
      ...pay,
      kind: "authorization",
      authorization,
    };
    const model = buildReviewModel(request);
    expect(
      buildReviewModel({
        ...request,
        authorization: { ...authorization, domain: { chainId: "1" } },
      }).id,
    ).not.toBe(model.id);
    expect(
      buildReviewModel({
        ...request,
        authorization: {
          domain: { chainId: { $bigint: "1" } },
          message: authorization.message,
        },
      }).id,
    ).not.toBe(model.id);
    expect(
      buildReviewModel({
        ...request,
        authorization: {
          message: authorization.message,
          domain: { chainId: 1n },
        },
      }).id,
    ).toBe(model.id);

    // Data it can't bind exactly is never bound as something else: the
    // model says so, and its id matches no other model.
    for (const unbindable of [new Number(1), new Date(0), Number.NaN]) {
      const unread = buildReviewModel({
        ...request,
        authorization: { message: { amount: unbindable } },
      });
      expect(unread.warnings.map((warning) => warning.code)).toEqual([
        "unreadable",
      ]);
      expect(unread.id).not.toBe(model.id);
      expect(
        buildReviewModel({
          ...request,
          authorization: { message: { amount: unbindable } },
        }).id,
      ).not.toBe(unread.id);
    }

    authorization.message.amount = 6n;
    expect(model.authorization).toEqual({
      domain: { chainId: 1n },
      message: { amount: 5n, $bigint: "1" },
    });
    expect(buildReviewModel(request).id).not.toBe(model.id);
  });

  it("carries each call's exact bytes, nested calls included", () => {
    const model = buildReviewModel(pay);
    expect(model.calls[0].data).toBe(pay.calls[0].data);
    const multiSend = requests.MultiSend;
    const shown = buildReviewModel(multiSend);
    const inner = shown.calls[0].args?.find((argument) => argument.nested)
      ?.nested?.[0];
    expect(inner?.data).toMatch(/^0x[\da-f]+$/u);
    // A call it can't read keeps its bytes too.
    const unread = buildReviewModel({
      ...pay,
      calls: [{ ...pay.calls[0], abi: "nope" } as never],
    });
    expect(unread.calls[0].data).toBe(pay.calls[0].data);
  });

  it("builds the audit prompt from a model as from its request", () => {
    const display = { explorerOrigin: () => "https://example.org" };
    expect(buildTransactionReviewPrompt(buildReviewModel(pay), display)).toBe(
      buildTransactionReviewPrompt(pay, display),
    );
  });

  it("treats context as display only", () => {
    const context = [
      { label: "You pay", value: "0.01 ETH", strong: true },
      { label: "Project", value: "#4", mono: true },
    ];
    const plain = buildReviewModel(pay);
    const shown = buildReviewModel({ ...pay, context });
    expect(shown.context).toEqual(context);
    expect(shown.context).not.toBe(context);
    expect(shown.calls).toEqual(plain.calls);
    expect(shown.rawJson).toBe(plain.rawJson);
  });

  it("copies a context row's lines and note, and binds them", () => {
    const signers = ["0xaa", "0xbb"];
    const row = {
      label: "Signers",
      value: "2 of 2",
      lines: signers,
      note: "Each signer must confirm.",
    };
    const shown = buildReviewModel({ ...pay, context: [row] });
    expect(shown.context).toEqual([row]);
    signers.push("0xcc");
    expect(shown.context[0].lines).toEqual(["0xaa", "0xbb"]);
    expect(buildReviewModel({ ...pay, context: [row] }).id).not.toBe(shown.id);
    expect(
      buildReviewModel({ ...pay, context: [{ ...row, note: "Other." }] }).id,
    ).not.toBe(buildReviewModel({ ...pay, context: [row] }).id);
  });

  it("never throws: whatever it can't read, it shows with a warning", () => {
    const [call] = pay.calls;
    const unexpected: unknown[] = [
      null,
      undefined,
      "pay",
      { calls: "pay" },
      { ...pay, calls: [{ ...call, data: 7 }] },
      { ...pay, calls: [{ ...call, abi: "nope" }] },
      { ...pay, calls: [null, call] },
      { ...pay, signatures: [{ kind: "permit2", typedData: { a: () => 1 } }] },
      { ...pay, context: [{ label: "Pay", value: new Date(0) }] },
      { ...pay, authorization: { amount: Symbol("x") } },
    ];
    for (const input of unexpected) {
      const model = buildReviewModel(input as TransactionReviewRequest);
      expect(
        model.warnings.some((warning) => warning.code === "unreadable"),
        String(input),
      ).toBe(true);
      expect(model.id).toMatch(/^0x[\da-f]{64}$/u);
    }
    // Not even its parts read: the warning alone.
    const hostile = new Proxy(
      {},
      {
        get: () => {
          throw new Error("no");
        },
      },
    );
    for (const input of [
      hostile,
      { ...pay, context: [hostile] },
      Object.defineProperty({ ...pay, calls: [null] }, "title", {
        get: () => {
          throw new Error("no");
        },
      }),
    ]) {
      expect(
        buildReviewModel(input as TransactionReviewRequest).warnings,
      ).toEqual([expect.objectContaining({ code: "unreadable" })]);
    }
    // What it can read still shows: the calls it could decode, and the raw bytes of the rest.
    const model = buildReviewModel({
      ...pay,
      calls: [{ ...call, abi: "nope" } as never, call],
      context: [{ label: "When", value: new Date(0) as never }],
    });
    expect(model.calls).toHaveLength(2);
    expect(model.calls[1]).toEqual(buildReviewModel(pay).calls[0]);
    expect(model.calls[0]).toMatchObject({
      to: call.to,
      selector: call.data.slice(0, 10),
      args: null,
    });
    expect(model.context).toEqual([{ label: "When", value: "" }]);
  });
});

const BOB = "0x2222222222222222222222222222222222222222" as Address;
const TOKEN = "0x3333333333333333333333333333333333333333" as Address;
const OTHER_TOKEN = "0x6666666666666666666666666666666666666666" as Address;
const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3" as Address;
const PROJECTS = (
  jbContractAddress["6"] as unknown as Record<string, Record<number, Address>>
).JBProjects[8453];

function call(
  chainId: number,
  to: Address,
  abi: Abi,
  functionName: string,
  args: readonly unknown[],
): TransactionReviewCall {
  return {
    chainId,
    to,
    data: encodeFunctionData({ abi, functionName, args }),
    abi,
    functionName,
    args,
  };
}

const approve = (chainId: number, token: Address, amount: bigint) =>
  call(chainId, token, erc20Abi, "approve", [BOB, amount]);

const one = (abiCall: TransactionReviewCall) =>
  buildReviewModel({ calls: [abiCall] }).calls[0];

const codes = (reviewed: ReviewCallModel) =>
  reviewed.warnings.map((warning) => warning.code);

describe("review roles, amounts and warnings", () => {
  it("names the approve spender and flags maxUint256 as unlimited", () => {
    const usdc = USDC_ADDRESSES[8453];
    const unlimited = one(approve(8453, usdc, maxUint256));
    expect(unlimited.roles).toEqual([
      { role: "spender", address: BOB, name: null },
    ]);
    expect(unlimited.tokenAmounts).toEqual([
      { token: usdc, amount: maxUint256, decimals: 6, symbol: "USDC" },
    ]);
    expect(codes(unlimited)).toEqual([
      "unlimited-approval",
      "permission-grant",
    ]);
    expect(codes(one(approve(8453, usdc, maxUint256 - 1n)))).toEqual([
      "permission-grant",
    ]);
    // Positions decide, not the ABI's argument names.
    const unnamed = [
      {
        type: "function",
        name: "approve",
        stateMutability: "nonpayable",
        inputs: [{ type: "address" }, { type: "uint256" }],
        outputs: [{ type: "bool" }],
      },
    ] as const satisfies Abi;
    const anonymous = one(
      call(8453, usdc, unnamed, "approve", [BOB, maxUint256]),
    );
    expect(anonymous.roles).toEqual(unlimited.roles);
    expect(anonymous.tokenAmounts).toEqual(unlimited.tokenAmounts);
    expect(codes(anonymous)).toEqual([
      "unlimited-approval",
      "permission-grant",
    ]);
  });

  it("shows a native payment's value as its amount", () => {
    const [paid] = pay.calls;
    const args = [...paid.args!];
    args[2] = 0n;
    const [reviewed] = buildReviewModel({
      calls: [call(8453, paid.to, paid.abi!, "pay", args)].map((unpaid) => ({
        ...unpaid,
        value: 10n ** 18n,
      })),
    }).calls;
    expect(reviewed.tokenAmounts).toEqual([
      { token: "native", amount: 10n ** 18n, decimals: 18, symbol: "ETH" },
    ]);
  });

  it("names pay beneficiary and cashOut beneficiary", () => {
    const paid = buildReviewModel(pay).calls[0];
    const cashOut = buildReviewModel(requests.cashOut).calls[0];
    const alice = "0x1111111111111111111111111111111111111111";
    for (const reviewed of [paid, cashOut]) {
      expect(reviewed.roles).toEqual([
        { role: "beneficiary", address: alice, name: null },
      ]);
      expect(codes(reviewed)).toEqual([]);
    }
    expect(paid.tokenAmounts).toEqual([
      { token: "native", amount: 10n ** 16n, decimals: 18, symbol: "ETH" },
    ]);
    expect(cashOut.tokenAmounts).toEqual([]);
  });

  it("flags transferOwnership, setPermissionsFor and Safe owner changes as owner-action or permission-grant", () => {
    const fn = (name: string, inputs: { type: string; name: string }[]) =>
      [
        {
          type: "function",
          name,
          stateMutability: "nonpayable",
          inputs,
          outputs: [],
        },
      ] as const satisfies Abi;
    const ownable = fn("transferOwnership", [
      { type: "address", name: "newOwner" },
    ]);
    const swapOwner = fn("swapOwner", [
      { type: "address", name: "prevOwner" },
      { type: "address", name: "oldOwner" },
      { type: "address", name: "newOwner" },
    ]);
    const addOwner = fn("addOwnerWithThreshold", [
      { type: "address", name: "owner" },
      { type: "uint256", name: "_threshold" },
    ]);
    const transfer = one(call(1, TOKEN, ownable, "transferOwnership", [BOB]));
    expect(codes(transfer)).toEqual(["unknown-contract", "owner-action"]);
    const toProject = fn("transferOwnershipToProject", [
      { type: "uint256", name: "projectId" },
    ]);
    expect(
      codes(one(call(1, TOKEN, toProject, "transferOwnershipToProject", [4n]))),
    ).toContain("owner-action");
    expect(transfer.roles).toEqual([
      { role: "owner", address: BOB, name: null },
    ]);
    for (const safeCall of [
      call(1, TOKEN, swapOwner, "swapOwner", [TOKEN, OTHER_TOKEN, BOB]),
      call(1, TOKEN, addOwner, "addOwnerWithThreshold", [BOB, 2n]),
    ]) {
      const reviewed = one(safeCall);
      expect(codes(reviewed)).toContain("owner-action");
      expect(reviewed.roles).toEqual([
        { role: "owner", address: BOB, name: null },
      ]);
    }

    const permissions = buildReviewModel(requests.setPermissionsFor).calls[0];
    expect(codes(permissions)).toEqual(["permission-grant"]);
    expect(permissions.roles).toEqual([
      {
        role: "operator",
        address: expect.stringMatching(/^0x/u),
        name: "JBController",
      },
    ]);
  });

  it("flags an unnamed destination as unknown-contract", () => {
    const unnamed = one(approve(1, TOKEN, 5n));
    expect(codes(unnamed)).toEqual([
      "unknown-contract",
      "permission-grant",
      "possible-token-id",
      "decimals-unknown",
    ]);
    const [selector, transfer] = buildReviewModel(
      requests["unknown selector"],
    ).calls;
    expect(codes(selector)).toEqual(["abi-unavailable", "unknown-contract"]);
    // Sending ETH with no calldata calls no contract.
    expect(codes(transfer)).toEqual(["abi-unavailable"]);
    // A name the caller gives counts.
    expect(
      codes(one({ ...approve(1, TOKEN, 5n), contractName: "Token" })),
    ).toEqual(["permission-grant", "possible-token-id", "decimals-unknown"]);
  });

  it("flags a grant only to a spender or operator the app does not name", () => {
    const usdc = USDC_ADDRESSES[8453];
    const named = PERMIT2;
    expect(
      codes(one(call(8453, usdc, erc20Abi, "approve", [named, 5n]))),
    ).toEqual([]);
    expect(
      codes(one(call(8453, usdc, erc20Abi, "approve", [BOB, 0n]))),
    ).toEqual([]);
    const forAll = [
      {
        type: "function",
        name: "setApprovalForAll",
        stateMutability: "nonpayable",
        inputs: [
          { type: "address", name: "operator" },
          { type: "bool", name: "approved" },
        ],
        outputs: [],
      },
    ] as const satisfies Abi;
    const projects = PROJECTS;
    expect(
      codes(
        one(call(8453, projects, forAll, "setApprovalForAll", [BOB, true])),
      ),
    ).toEqual(["permission-grant"]);
    expect(
      codes(
        one(call(8453, projects, forAll, "setApprovalForAll", [named, true])),
      ),
    ).toEqual([]);
    expect(
      codes(
        one(call(8453, projects, forAll, "setApprovalForAll", [BOB, false])),
      ),
    ).toEqual([]);
    const permit = [
      {
        type: "function",
        name: "permit",
        stateMutability: "nonpayable",
        inputs: [
          { type: "address", name: "owner" },
          { type: "address", name: "spender" },
          { type: "uint256", name: "value" },
          { type: "uint256", name: "deadline" },
          { type: "uint8", name: "v" },
          { type: "bytes32", name: "r" },
          { type: "bytes32", name: "s" },
        ],
        outputs: [],
      },
    ] as const satisfies Abi;
    const signedPermit = one(
      call(8453, usdc, permit, "permit", [
        BOB,
        TOKEN,
        maxUint256,
        1n,
        27,
        `0x${"11".repeat(32)}`,
        `0x${"22".repeat(32)}`,
      ]),
    );
    expect(codes(signedPermit)).toEqual([
      "unlimited-approval",
      "permission-grant",
    ]);
  });

  it("leaves decimals null and adds decimals-unknown when the read fails", async () => {
    const model = buildReviewModel({ calls: [approve(1, TOKEN, 5n)] });
    const failing = {
      readContract: vi.fn(async () => {
        throw new Error("execution reverted");
      }),
    };
    for (const clientFor of [() => failing, () => undefined]) {
      const [reviewed] = (await enrichReviewModel(model, clientFor)).calls;
      expect(reviewed.tokenAmounts).toEqual([
        { token: TOKEN, amount: 5n, decimals: null, symbol: null },
      ]);
      expect(reviewed.nft).toBeNull();
      expect(codes(reviewed)).toEqual([
        "unknown-contract",
        "permission-grant",
        "possible-token-id",
        "decimals-unknown",
      ]);
    }
    // A read that answers out of range is no answer either.
    const [odd] = (
      await enrichReviewModel(model, () => ({
        readContract: (async ({ functionName }: { functionName: string }) =>
          functionName === "decimals" ? 300 : "TKN") as never,
      }))
    ).calls;
    expect(odd.tokenAmounts[0]).toMatchObject({
      decimals: null,
      symbol: "TKN",
    });
    expect(codes(odd)).toContain("decimals-unknown");
  });

  it("reads decimals once per token per chain", async () => {
    // Two approvals of TOKEN on chain 1 (one inside a MultiSend), one of
    // TOKEN on Base, one of another token and one of USDC, which needs no read.
    const multiSend = requests.MultiSend;
    const model = buildReviewModel({
      calls: [
        approve(1, TOKEN, 1n),
        ...multiSend.calls,
        approve(8453, TOKEN, 2n),
        approve(8453, OTHER_TOKEN, 3n),
        approve(8453, USDC_ADDRESSES[8453], 4n),
      ],
    });
    const reads: string[] = [];
    const clientFor = (chainId: number) => ({
      readContract: (async ({
        address,
        functionName,
      }: {
        address: Address;
        functionName: string;
      }) => {
        reads.push(`${chainId}:${address}:${functionName}`);
        return functionName === "decimals" ? 8 : "TKN";
      }) as never,
    });
    const enriched = await enrichReviewModel(model, clientFor);
    expect(reads.sort()).toEqual(
      [
        `1:${TOKEN}:decimals`,
        `1:${TOKEN}:symbol`,
        `1:${TOKEN}:supportsInterface`,
        `8453:${OTHER_TOKEN}:decimals`,
        `8453:${OTHER_TOKEN}:symbol`,
        `8453:${OTHER_TOKEN}:supportsInterface`,
        `8453:${TOKEN}:decimals`,
        `8453:${TOKEN}:symbol`,
        `8453:${TOKEN}:supportsInterface`,
      ].sort(),
    );
    const amounts: unknown[] = [];
    const visit = (calls: ReviewCallModel[]) => {
      for (const reviewed of calls) {
        amounts.push(...reviewed.tokenAmounts);
        expect(codes(reviewed)).not.toContain("decimals-unknown");
        // Decimals it answers make it ERC-20.
        expect(codes(reviewed)).not.toContain("possible-token-id");
        visit(reviewed.calls ?? []);
        for (const argument of reviewed.args ?? []) {
          visit(argument.nested ?? []);
        }
      }
    };
    visit(enriched.calls);
    expect(amounts).toHaveLength(6);
    expect(amounts[amounts.length - 1]).toEqual({
      token: USDC_ADDRESSES[8453],
      amount: 4n,
      decimals: 6,
      symbol: "USDC",
    });
    expect(amounts.slice(0, -1)).toEqual(
      [1n, 5n, 6n, 2n, 3n].map((amount) =>
        expect.objectContaining({ amount, decimals: 8, symbol: "TKN" }),
      ),
    );
  });

  it("enrichment does not change the model id", async () => {
    const model: ReviewModel = buildReviewModel({
      calls: [approve(1, TOKEN, 5n)],
    });
    const enriched = await enrichReviewModel(model, () => ({
      readContract: (async ({ functionName }: { functionName: string }) =>
        functionName === "decimals" ? 18 : "TKN") as never,
    }));
    expect(enriched.calls[0].tokenAmounts[0]).toMatchObject({
      decimals: 18,
      symbol: "TKN",
    });
    expect(enriched.id).toBe(model.id);
    expect(model.calls[0].tokenAmounts[0].decimals).toBeNull();
  });

  it("keeps a zero approve a grant until the token is confirmed ERC-20", async () => {
    const model = buildReviewModel({ calls: [approve(1, TOKEN, 0n)] });
    expect(codes(model.calls[0])).toContain("permission-grant");
    const answering = (answers: Record<string, unknown>) => () => ({
      readContract: (async ({ functionName }: { functionName: string }) => {
        if (!(functionName in answers)) throw new Error("execution reverted");
        return answers[functionName];
      }) as never,
    });
    const [nft] = (
      await enrichReviewModel(model, answering({ supportsInterface: true }))
    ).calls;
    expect(nft.nft).toEqual({ token: TOKEN, tokenId: 0n });
    expect(codes(nft)).toEqual(["unknown-contract", "permission-grant"]);
    const [unanswered] = (await enrichReviewModel(model, answering({}))).calls;
    expect(codes(unanswered)).toEqual([
      "unknown-contract",
      "permission-grant",
      "possible-token-id",
      "decimals-unknown",
    ]);
    const [erc20] = (
      await enrichReviewModel(model, answering({ decimals: 18, symbol: "TKN" }))
    ).calls;
    expect(codes(erc20)).toEqual(["unknown-contract"]);
    // USDC is ERC-20 from the start: a zero approval revokes.
    expect(
      codes(
        one(call(8453, USDC_ADDRESSES[8453], erc20Abi, "approve", [BOB, 0n])),
      ),
    ).toEqual([]);
  });

  it("shows an ERC-721 approve as an NFT approval when the contract says it is ERC-721", async () => {
    const model = buildReviewModel({ calls: [approve(1, TOKEN, 5n)] });
    const asked: unknown[] = [];
    const enriched = await enrichReviewModel(model, () => ({
      readContract: (async ({
        functionName,
        args,
      }: {
        functionName: string;
        args?: unknown[];
      }) => {
        if (functionName !== "supportsInterface") {
          throw new Error("execution reverted");
        }
        asked.push(...(args ?? []));
        return true;
      }) as never,
    }));
    expect(asked).toEqual(["0x80ac58cd"]);
    const [reviewed] = enriched.calls;
    expect(reviewed.nft).toEqual({ token: TOKEN, tokenId: 5n });
    expect(reviewed.tokenAmounts).toEqual([]);
    expect(codes(reviewed)).toEqual(["unknown-contract", "permission-grant"]);
    expect(enriched.id).toBe(model.id);
    // Not ERC-721: the ERC-20 reading stands without the token-ID warning.
    const [erc20] = (
      await enrichReviewModel(model, () => ({
        readContract: (async ({ functionName }: { functionName: string }) =>
          functionName === "supportsInterface" ? false : "TKN") as never,
      }))
    ).calls;
    expect(erc20.nft).toBeNull();
    expect(codes(erc20)).toEqual([
      "unknown-contract",
      "permission-grant",
      "decimals-unknown",
    ]);
  });
});

describe("nested arguments", () => {
  const leaf = (name: string, type: string, text: string) => ({
    name,
    type,
    text,
    children: null,
  });

  it("labels a tuple's components", () => {
    const [account, permissionsData] = buildReviewModel(
      requests.setPermissionsFor,
    ).calls[0].args!;
    expect(account.children).toBeNull();
    expect(permissionsData.children).toEqual([
      leaf(
        "operator",
        "address",
        expect.stringMatching(/^JBController \| 0x/u),
      ),
      leaf("projectId", "uint64", "4"),
      {
        name: "permissionIds",
        type: "uint8[]",
        text: expect.any(String),
        children: [leaf("[0]", "uint8", "2"), leaf("[1]", "uint8", "3")],
      },
    ]);
  });

  it("labels an array of tuples by index, each with its components", () => {
    const splitGroups = buildReviewModel(requests.setSplitGroupsOf).calls[0]
      .args![2];
    expect(splitGroups.children).toHaveLength(1);
    const [group] = splitGroups.children!;
    expect(group).toMatchObject({ name: "[0]", type: "tuple" });
    expect(group.children!.map((child) => child.name)).toEqual([
      "groupId",
      "splits",
    ]);
    const [split] = group.children![1].children!;
    expect(split.name).toBe("[0]");
    expect(split.children).toContainEqual(
      leaf(
        "beneficiary",
        "address",
        "0x1111111111111111111111111111111111111111",
      ),
    );
    expect(split.children).toContainEqual(
      leaf("percent", "uint32", "500000000"),
    );
  });

  it("labels a nested tuple and keeps the id for identical calls", () => {
    const request = requests["sucker claim"];
    const [claimData] = buildReviewModel(request).calls[0].args!;
    const leafTuple = claimData.children!.find(
      (child) => child.name === "leaf",
    )!;
    expect(leafTuple.type).toBe("tuple");
    expect(leafTuple.children).toContainEqual(leaf("index", "uint256", "7"));
    const proof = claimData.children!.find((child) => child.name === "proof")!;
    expect(proof.children).toHaveLength(32);
    expect(proof.children![31]).toMatchObject({
      name: "[31]",
      type: "bytes32",
      children: null,
    });
    expect(buildReviewModel(request).id).toBe(
      buildReviewModel(structuredClone(request)).id,
    );
  });
});
