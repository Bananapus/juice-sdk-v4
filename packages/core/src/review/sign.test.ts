import {
  encodeFunctionData,
  erc20Abi,
  hashTypedData,
  recoverAddress,
  zeroAddress,
  type Address,
  type Hex,
  type TypedDataDefinition,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { USDC_ADDRESSES } from "../pureConstants.js";
import { encodeMultiSend, MULTI_SEND_CALL_ONLY } from "../safe.js";
import {
  safeTransactionHash,
  type SafeQueuedTransaction,
} from "../safeService.js";
import { PERMIT2_ADDRESS, permit2TypedData } from "../v6/permit2.js";
import {
  ACCOUNT,
  OTHER,
  action,
  payCall,
  resetReviewUi,
  reviewUi,
  setup,
  TERMINAL,
} from "./__fixtures__/reviewedSend.js";
import { unixTime } from "./decode.js";
import {
  FORWARD_REQUEST_TYPES,
  relayrForwarder,
  relayrForwarderDeadline,
} from "./relayr.js";
import { TransactionReviewCancelledError } from "./reviewQueue.js";
import { sendReviewed } from "./send.js";
import { signReviewed, type ReviewedSignature } from "./sign.js";
import {
  selfReviewingAdapter,
  WALLET_NOT_READY_LINE,
  type WalletAdapter,
} from "./wallet.js";

afterEach(resetReviewUi);

const signer = privateKeyToAccount(`0x${"11".repeat(32)}`);
const SAFE = "0x5555555555555555555555555555555555555555" as Address;
const SPENDER = "0x6666666666666666666666666666666666666666" as Address;
const USDC = USDC_ADDRESSES[10] as Address;

/** A wallet on OP Mainnet that signs with a real key. */
function wallet() {
  const state = { chainId: 10 };
  const adapter = {
    kind: "wallet",
    account: () => signer.address,
    chainId: () => state.chainId,
    isSafe: () => false,
    switchChain: vi.fn(async (chainId: number) => {
      state.chainId = chainId;
    }),
    sendTransaction: vi.fn(async (): Promise<Hex> => {
      throw new Error("unused");
    }),
    signTypedData: vi.fn((typedData: TypedDataDefinition) =>
      signer.signTypedData(typedData),
    ),
    signMessage: vi.fn((message: string) => signer.signMessage({ message })),
  } satisfies WalletAdapter;
  return { adapter, state };
}

function safeTx(
  extra: Partial<SafeQueuedTransaction> = {},
): SafeQueuedTransaction {
  return {
    to: USDC,
    value: 0n,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [SPENDER, 5n],
    }),
    operation: 0,
    safeTxGas: 0n,
    baseGas: 0n,
    gasPrice: 0n,
    gasToken: zeroAddress,
    refundReceiver: zeroAddress,
    nonce: 3,
    ...extra,
  };
}

function forward(
  extra: Partial<
    Extract<ReviewedSignature, { kind: "forward-request" }>["request"]
  > = {},
  chainId = 10,
): ReviewedSignature {
  const pay = payCall();
  return {
    kind: "forward-request",
    chainId,
    request: {
      from: signer.address,
      to: pay.to,
      value: 0n,
      gas: 200_000n,
      nonce: 0n,
      deadline: relayrForwarderDeadline() - 60,
      data: pay.data,
      ...extra,
    },
  };
}

const signed = { account: signer.address };

describe("signReviewed", () => {
  it("asks nothing of a wallet whose ready fails", async () => {
    const { adapter } = wallet();
    const prompts = reviewUi();
    await expect(
      signReviewed(
        [{ kind: "safe-tx", chainId: 10, safe: SAFE, tx: safeTx() }],
        signed,
        {
          adapter: { ...adapter, ready: () => Promise.reject(new Error("x")) },
        },
      ),
    ).rejects.toThrow(WALLET_NOT_READY_LINE);
    expect(prompts).toHaveLength(0);
    expect(adapter.signTypedData).not.toHaveBeenCalled();
  });

  it("refuses a SafeTx whose given safeTxHash is not its own", async () => {
    const { adapter } = wallet();
    const prompts = reviewUi();
    const tx = { ...safeTx(), safeTxHash: `0x${"ab".repeat(32)}` as Hex };
    await expect(
      signReviewed([{ kind: "safe-tx", chainId: 10, safe: SAFE, tx }], signed, {
        adapter,
      }),
    ).rejects.toThrow(
      "This Safe transaction does not match its hash. Nothing was signed.",
    );
    expect(prompts).toHaveLength(0);
    expect(adapter.signTypedData).not.toHaveBeenCalled();
    const own = { ...tx, safeTxHash: safeTransactionHash(10, SAFE, tx) };
    await signReviewed(
      [{ kind: "safe-tx", chainId: 10, safe: SAFE, tx: own }],
      signed,
      { adapter },
    );
    expect(adapter.signTypedData).toHaveBeenCalledTimes(1);
  });

  it("signs a SafeTx whose hash equals safeTransactionHash", async () => {
    const { adapter } = wallet();
    const prompts = reviewUi();
    const tx = safeTx();
    const [signature] = await signReviewed(
      [{ kind: "safe-tx", chainId: 10, safe: SAFE, tx }],
      signed,
      { adapter },
    );
    expect(prompts).toHaveLength(1);
    const hash = safeTransactionHash(10, SAFE, tx);
    expect(hashTypedData(adapter.signTypedData.mock.calls[0][0])).toBe(hash);
    expect(await recoverAddress({ hash, signature })).toBe(signer.address);
    const [shown] = prompts[0].model.signatures;
    expect(shown.kind).toBe("safe-tx");
    expect(shown.calls[0]).toMatchObject({
      to: SAFE,
      functionName: "execTransaction",
    });
    expect(prompts[0].model.kind).toBe("authorization");
    // The model shows the very typed data the wallet signed.
    expect(shown.typedData).toEqual(adapter.signTypedData.mock.calls[0][0]);
    expect(
      JSON.parse(prompts[0].model.rawJson).signatures[0].typedData,
    ).toMatchObject({ primaryType: "SafeTx", domain: { chainId: 10 } });
  });

  it("refuses a forward request to a non-forwarder target", async () => {
    const { adapter } = wallet();
    const prompts = reviewUi();
    // No Juicebox forwarder on Polygon: core has no verifying contract to name.
    expect(relayrForwarder(137)).toBeUndefined();
    await expect(
      signReviewed([forward({}, 137)], signed, { adapter }),
    ).rejects.toThrow("There is no Juicebox forwarder on chain 137");
    await expect(
      signReviewed([forward({ from: ACCOUNT })], signed, { adapter }),
    ).rejects.toThrow("not from the connected account");
    expect(prompts).toHaveLength(0);
    expect(adapter.signTypedData).not.toHaveBeenCalled();
  });

  it("signs nothing when its review can't be bound", async () => {
    const { adapter } = wallet();
    const prompts = reviewUi();
    await expect(
      signReviewed(
        [{ kind: "safe-tx", chainId: 10, safe: SAFE, tx: safeTx() }],
        {
          ...signed,
          context: [{ label: "When", value: new Date(0) as never }],
        },
        { adapter },
      ),
    ).rejects.toThrow("can't be confirmed here");
    expect(prompts).toHaveLength(0);
    expect(adapter.signTypedData).not.toHaveBeenCalled();
  });

  it("refuses a deadline past relayrForwarderDeadline", async () => {
    const { adapter } = wallet();
    const prompts = reviewUi();
    await expect(
      signReviewed(
        [forward({ deadline: relayrForwarderDeadline() + 60 })],
        signed,
        { adapter },
      ),
    ).rejects.toThrow("stays executable longer than allowed");
    expect(prompts).toHaveLength(0);
    expect(adapter.signTypedData).not.toHaveBeenCalled();
  });

  it("shows the decoded inner call of a Safe MultiSend", async () => {
    const { adapter } = wallet();
    const prompts = reviewUi();
    const approve = (amount: bigint) => ({
      to: USDC,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [SPENDER, amount],
      }),
      value: 0n,
    });
    await signReviewed(
      [
        {
          kind: "safe-tx",
          chainId: 10,
          safe: SAFE,
          tx: safeTx({
            to: MULTI_SEND_CALL_ONLY,
            data: encodeMultiSend([approve(5n), approve(6n)]),
            operation: 1,
          }),
        },
      ],
      signed,
      { adapter },
    );
    const [call] = prompts[0].model.signatures[0].calls;
    expect(call.calls).toHaveLength(2);
    expect(call.calls![1]).toMatchObject({
      to: USDC,
      from: SAFE,
      functionName: "approve",
      tokenAmounts: [{ token: USDC, amount: 6n, symbol: "USDC" }],
    });
    expect(call.warnings.map((warning) => warning.code)).toContain(
      "delegatecall",
    );
    // A DELEGATECALL to anything else is refused.
    await expect(
      signReviewed(
        [
          {
            kind: "safe-tx",
            chainId: 10,
            safe: SAFE,
            tx: safeTx({ operation: 1 }),
          },
        ],
        signed,
        { adapter },
      ),
    ).rejects.toThrow("DELEGATECALLs a contract other than MultiSendCallOnly");
    expect(prompts).toHaveLength(1);
  });

  it("one prompt for three forward requests", async () => {
    const { adapter } = wallet();
    const prompts = reviewUi();
    const signatures = await signReviewed(
      [forward({ nonce: 0n }), forward({ nonce: 1n }), forward({ nonce: 2n })],
      signed,
      { adapter },
    );
    expect(prompts).toHaveLength(1);
    expect(signatures).toHaveLength(3);
    const [first] = prompts[0].model.signatures;
    expect(first.calls[0]).toMatchObject({
      to: TERMINAL,
      from: signer.address,
      gas: 200_000n,
    });
    const domains = adapter.signTypedData.mock.calls.map(
      ([typedData]) => typedData.domain,
    );
    expect(domains).toEqual(
      [0, 1, 2].map(() => ({
        name: "Juicebox",
        version: "1",
        chainId: 10,
        verifyingContract: relayrForwarder(10),
      })),
    );
  });

  it("message model shows the exact text", async () => {
    const { adapter } = wallet();
    const prompts = reviewUi();
    const text = "List project 4 on sticky.center\n\nnonce 7";
    const [signature] = await signReviewed(
      [{ kind: "message", chainId: 10, message: text }],
      {
        ...signed,
        title: "List your project",
        description: "Sticky lists it once you sign.",
        context: [{ label: "Project", value: "4" }],
      },
      { adapter },
    );
    const { model } = prompts[0];
    expect(model).toMatchObject({
      title: "List your project",
      description: "Sticky lists it once you sign.",
      context: [{ label: "Project", value: "4" }],
    });
    expect(model.kind).toBe("message");
    expect(model.message).toBe(text);
    expect(model.signatures[0].message).toBe(text);
    expect(adapter.signMessage).toHaveBeenCalledWith(text);
    expect(signature).toBe(await signer.signMessage({ message: text }));

    await signReviewed(
      [{ kind: "message", chainId: 10, message: `${text}.` }],
      signed,
      { adapter },
    );
    expect(prompts[1].model.id).not.toBe(model.id);
    expect(prompts[1].model.description).toMatch(
      /exact data your wallet signs/,
    );
  });

  it("a message shows the calls it authorizes, decoded as transactions are", async () => {
    const { adapter } = wallet();
    const prompts = reviewUi();
    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [SPENDER, 5n],
    });
    const message = (value: bigint): ReviewedSignature => ({
      kind: "message",
      chainId: 10,
      message: "List it",
      calls: [{ chainId: 10, to: USDC, data, value }],
    });
    await signReviewed([message(0n)], signed, { adapter });
    const [shown] = prompts[0].model.signatures[0].calls;
    expect(shown).toMatchObject({
      chainId: 10,
      to: USDC,
      value: 0n,
      functionName: "approve",
    });
    await signReviewed([message(1n)], signed, { adapter });
    expect(prompts[1].model.id).not.toBe(prompts[0].model.id);
    expect(adapter.signMessage).toHaveBeenCalledWith("List it");
  });

  it("refuses a message whose calls it cannot show", async () => {
    const { adapter } = wallet();
    reviewUi();
    const refused = (call: unknown, line: string) =>
      expect(
        signReviewed(
          [
            {
              kind: "message",
              chainId: 10,
              message: "hi",
              calls: [call],
            } as ReviewedSignature,
          ],
          signed,
          { adapter },
        ),
      ).rejects.toThrow(line);
    await refused(
      { chainId: 10, to: "0x12", data: "0x" },
      "Invalid call target address",
    );
    await refused({ chainId: 10, to: USDC, data: "0x1" }, "Invalid call data");
    await refused(
      { chainId: 10, to: USDC, data: "0x", value: -1n },
      "Invalid call value",
    );
    await refused({ chainId: 0, to: USDC, data: "0x" }, "Invalid chain ID");
    expect(adapter.signMessage).not.toHaveBeenCalled();
  });

  it("an aborted signature review signs nothing", async () => {
    const { adapter } = wallet();
    const prompts = reviewUi(() => new Promise(() => {}));
    const controller = new AbortController();
    const signing = signReviewed(
      [{ kind: "message", chainId: 10, message: "hi" }],
      { ...signed, signal: controller.signal },
      { adapter },
    );
    await vi.waitFor(() => expect(prompts).toHaveLength(1));
    controller.abort();
    await expect(signing).rejects.toBeInstanceOf(
      TransactionReviewCancelledError,
    );
    expect(adapter.signMessage).not.toHaveBeenCalled();
  });

  it("permit2 model names spender and expiry", async () => {
    const { adapter } = wallet();
    const prompts = reviewUi();
    await signReviewed(
      [
        {
          kind: "permit2",
          authorization: {
            chainId: 10,
            token: USDC,
            spender: SPENDER,
            amount: 5_000_000n,
            expiration: 1_800_000_000,
            nonce: 0,
            sigDeadline: 1_700_000_000n,
          },
        },
      ],
      signed,
      { adapter },
    );
    const [shown] = prompts[0].model.signatures;
    expect(shown.steps[0].rows).toEqual(
      expect.arrayContaining([
        ["Spender", SPENDER],
        ["Amount", "5000000"],
        ["Expires", unixTime(1_800_000_000)],
      ]),
    );
    const [typedData] = adapter.signTypedData.mock.calls[0];
    expect(typedData.domain?.verifyingContract).toBe(PERMIT2_ADDRESS);
  });

  it("4001 returns no signature and throws TransactionReviewCancelledError", async () => {
    const { adapter } = wallet();
    reviewUi();
    adapter.signMessage.mockImplementationOnce(async () => "0x01");
    adapter.signMessage.mockImplementationOnce(() =>
      Promise.reject(
        Object.assign(new Error("User rejected the request."), {
          cause: { code: 4001 },
        }),
      ),
    );
    await expect(
      signReviewed(
        [
          { kind: "message", chainId: 10, message: "one" },
          { kind: "message", chainId: 10, message: "two" },
        ],
        signed,
        { adapter },
      ),
    ).rejects.toBeInstanceOf(TransactionReviewCancelledError);
    expect(adapter.signMessage).toHaveBeenCalledTimes(2);
  });

  it("one prompt covers a message signature and a send in one action", async () => {
    const { wallet: fake, deps } = setup();
    const prompts = reviewUi();
    fake.adapter.signMessage.mockImplementation(async () => "0xabcd");
    const result = await sendReviewed(
      action([payCall()], {
        signatures: [{ kind: "message", chainId: 10, message: "List it" }],
      }),
      deps,
    );
    expect(prompts).toHaveLength(1);
    expect(prompts[0].model.kind).toBe("transaction");
    expect(prompts[0].model.calls).toHaveLength(1);
    expect(prompts[0].model.signatures[0].message).toBe("List it");
    expect(result).toMatchObject({ status: "done", signatures: ["0xabcd"] });
    expect(JSON.parse(prompts[0].model.rawJson)).toMatchObject({
      signatures: [{ message: "List it" }],
      calls: { to: TERMINAL },
    });
    expect(fake.adapter.signMessage.mock.invocationCallOrder[0]).toBeLessThan(
      fake.adapter.sendTransaction.mock.invocationCallOrder[0],
    );
  });

  it("refuses a self-reviewing adapter with 4200", async () => {
    const prompts = reviewUi();
    const submit = vi.fn();
    const adapter = selfReviewingAdapter({ account: () => ACCOUNT, submit });
    const message: ReviewedSignature = {
      kind: "message",
      chainId: 10,
      message: "hi",
    };
    await expect(
      signReviewed([message], { account: ACCOUNT }, { adapter }),
    ).rejects.toMatchObject({ code: 4200 });
    const { deps } = setup();
    await expect(
      sendReviewed(action([payCall()], { signatures: [message] }), {
        ...deps,
        adapter,
      }),
    ).rejects.toMatchObject({ code: 4200 });
    expect(prompts).toHaveLength(0);
    expect(submit).not.toHaveBeenCalled();
  });

  it("hands a self-reviewing wallet the raw request to review on its own page, never a model", async () => {
    const prompts = reviewUi();
    const signTypedData = vi.fn(
      async (_: TypedDataDefinition) => "0xaa" as Hex,
    );
    const signMessage = vi.fn(async (_: string) => "0xbb" as Hex);
    const submit = vi.fn();
    const adapter = selfReviewingAdapter({
      account: () => ACCOUNT,
      submit,
      signTypedData,
      signMessage,
    });
    const authorization = {
      chainId: 10 as const,
      token: USDC,
      spender: SPENDER,
      amount: 5_000_000n,
      expiration: 1_800_000_000,
      nonce: 0,
      sigDeadline: 1_700_000_000n,
    };
    const onPreview = vi.fn();
    await expect(
      signReviewed(
        [
          { kind: "permit2", authorization },
          { kind: "message", chainId: 10, message: "hi" },
        ],
        { account: ACCOUNT },
        { adapter, onPreview },
      ),
    ).resolves.toEqual(["0xaa", "0xbb"]);
    // Its own page is the one confirmation: core asks nothing.
    expect(prompts).toHaveLength(0);
    expect(signTypedData).toHaveBeenCalledWith(permit2TypedData(authorization));
    expect(signMessage).toHaveBeenCalledWith("hi");
    expect(submit).not.toHaveBeenCalled();
    expect(onPreview.mock.calls[0][0].signatures).toHaveLength(2);

    // Its user's rejection is a cancel, nothing signed.
    signMessage.mockRejectedValueOnce(
      Object.assign(new Error("rejected"), { code: 4001 }),
    );
    await expect(
      signReviewed(
        [{ kind: "message", chainId: 10, message: "hi" }],
        { account: ACCOUNT },
        { adapter },
      ),
    ).rejects.toBeInstanceOf(TransactionReviewCancelledError);
  });

  it("refuses what it cannot review before the prompt", async () => {
    const { adapter } = wallet();
    const prompts = reviewUi();
    const refused = (signature: unknown, message: string) =>
      expect(
        signReviewed([signature as ReviewedSignature], signed, { adapter }),
      ).rejects.toThrow(message);
    await refused(
      { kind: "typed-data", chainId: 10 },
      "not one the app can review",
    );
    await refused(
      { kind: "message", chainId: 0, message: "hi" },
      "Invalid chain ID",
    );
    await refused({ kind: "message", chainId: 10, message: 7 }, "must be text");
    await refused(
      { kind: "safe-tx", chainId: 10, safe: "0x12", tx: safeTx() },
      "Invalid Safe address",
    );
    await expect(signReviewed([], signed, { adapter })).rejects.toThrow(
      "There is nothing to sign.",
    );
    await expect(
      signReviewed([forward()], { account: ACCOUNT }, { adapter }),
    ).rejects.toThrow("The connected account changed");
    expect(prompts).toHaveLength(0);
  });

  it("signs typed data on its domain's chain and a message where the wallet is", async () => {
    const { adapter, state } = wallet();
    reviewUi();
    state.chainId = 8453;
    await signReviewed(
      [{ kind: "message", chainId: 10, message: "hi" }],
      signed,
      { adapter },
    );
    expect(adapter.switchChain).not.toHaveBeenCalled();
    await signReviewed([forward()], signed, { adapter });
    expect(adapter.switchChain).toHaveBeenCalledWith(10);

    // A wallet that did not move refuses before it signs.
    state.chainId = 8453;
    adapter.switchChain.mockImplementationOnce(async () => {});
    await expect(
      signReviewed([forward()], signed, { adapter }),
    ).rejects.toThrow("Your wallet changed networks");
    expect(adapter.signTypedData).toHaveBeenCalledTimes(1);
  });

  it("keeps any other wallet error as it is", async () => {
    const { adapter } = wallet();
    reviewUi();
    const timeout = new Error("The request timed out.");
    adapter.signMessage.mockImplementationOnce(() => Promise.reject(timeout));
    await expect(
      signReviewed([{ kind: "message", chainId: 10, message: "hi" }], signed, {
        adapter,
      }),
    ).rejects.toBe(timeout);
  });

  it("signs the reviewed values, whatever changes after review", async () => {
    const { adapter } = wallet();
    const signature = forward();
    const { request } = signature as Extract<
      ReviewedSignature,
      { kind: "forward-request" }
    >;
    // `to`, an address.
    const field = FORWARD_REQUEST_TYPES.ForwardRequest[1] as { type: string };
    const prompts = reviewUi(async (prompt) => {
      // The inputs and the shared type constants change while the review is open.
      request.to = SPENDER;
      field.type = "uint160";
      return prompt.confirmation;
    });
    try {
      await signReviewed([signature], signed, { adapter });
    } finally {
      field.type = "address";
    }
    const [typedData] = adapter.signTypedData.mock.calls[0];
    expect(typedData.message).toMatchObject({ to: TERMINAL });
    expect(typedData).toEqual(prompts[0].model.signatures[0].typedData);

    // A number-like object is refused: it could read one way and sign another.
    const amount = { valueOf: () => 5n, toString: () => "5" };
    await expect(
      signReviewed(
        [
          {
            kind: "permit2",
            authorization: {
              chainId: 10,
              token: USDC,
              spender: SPENDER,
              amount: amount as unknown as bigint,
              expiration: 0,
              nonce: 0,
              sigDeadline: 1n,
            },
          },
        ],
        signed,
        { adapter },
      ),
    ).rejects.toThrow("Invalid amount");
    await expect(
      signReviewed([forward({ data: "0x1" as Hex })], signed, { adapter }),
    ).rejects.toThrow("Invalid forwarded calldata");
  });

  it("an action its own gates refuse after review signs nothing", async () => {
    const { wallet: fake, deps } = setup();
    let open = true;
    reviewUi(async (prompt) => {
      open = false;
      return prompt.confirmation;
    });
    await expect(
      sendReviewed(
        action([payCall()], {
          signatures: [{ kind: "message", chainId: 10, message: "List it" }],
          assertWriteState: () => {
            if (!open) throw new Error("The project changed.");
          },
        }),
        deps,
      ),
    ).rejects.toThrow("The project changed.");
    expect(fake.adapter.signMessage).not.toHaveBeenCalled();
    expect(fake.adapter.sendTransaction).not.toHaveBeenCalled();
  });

  it("checks the action again before each signature", async () => {
    const { wallet: fake, deps } = setup();
    reviewUi();
    let open = true;
    fake.adapter.signMessage.mockImplementation(async () => {
      // The first signature changes what the action depends on.
      open = false;
      return "0x01";
    });
    const messages = ["one", "two"].map((message) => ({
      kind: "message" as const,
      chainId: 10,
      message,
    }));
    const assertWriteState = () => {
      if (!open) throw new Error("The project changed.");
    };
    await expect(
      sendReviewed(
        action([payCall()], { signatures: messages, assertWriteState }),
        deps,
      ),
    ).rejects.toThrow("The project changed.");
    expect(fake.adapter.signMessage).toHaveBeenCalledTimes(1);

    // A call changed while the review was open stops the signing too.
    const call = payCall(7n);
    reviewUi(async (prompt) => {
      call.value = 8n;
      return prompt.confirmation;
    });
    await expect(
      sendReviewed(action([call], { signatures: messages }), deps),
    ).rejects.toThrow("Transaction data changed after review");
    expect(fake.adapter.signMessage).toHaveBeenCalledTimes(1);
    expect(fake.adapter.sendTransaction).not.toHaveBeenCalled();
  });

  it("keeps a gate's own error and checks the account after it", async () => {
    const { wallet: fake, deps } = setup();
    reviewUi();
    const message = [{ kind: "message" as const, chainId: 10, message: "x" }];
    const stale = Object.assign(new Error("The project changed."), {
      cause: { code: 4001 },
    });
    await expect(
      sendReviewed(
        action([payCall()], {
          signatures: message,
          assertWriteState: () => {
            throw stale;
          },
        }),
        deps,
      ),
    ).rejects.toBe(stale);
    await expect(
      sendReviewed(
        action([payCall(6n)], {
          signatures: message,
          assertWriteState: () => {
            fake.state.account = OTHER;
          },
        }),
        deps,
      ),
    ).rejects.toThrow("The connected account changed");
    expect(fake.adapter.signMessage).not.toHaveBeenCalled();
  });
});
