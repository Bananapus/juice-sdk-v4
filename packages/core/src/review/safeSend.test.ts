import {
  encodeAbiParameters,
  encodeFunctionData,
  erc20Abi,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MULTI_SEND_CALL_ONLY,
  readAuthorityIdentity,
  readBoundedSafeNonce,
  type SafeAuthorityIdentity,
} from "../safe.js";
import {
  safeTransactionHash,
  type SafeQueuedTransaction,
} from "../safeService.js";
import {
  ACCOUNT,
  OTHER,
  payCall,
  resetReviewUi,
  reviewUi,
  setup,
  TERMINAL,
  unregister,
} from "./__fixtures__/reviewedSend.js";
import { TransactionReviewCancelledError } from "./reviewQueue.js";
import { selfReviewingAdapter, type SelfReviewedRequest } from "./wallet.js";
import {
  confirmReviewedSafeTransaction,
  executeReviewedSafeTransaction,
  proposeReviewedSafeTransaction,
} from "./safeSend.js";

vi.mock("../safe.js", async (original) => ({
  ...(await original<typeof import("../safe.js")>()),
  readAuthorityIdentity: vi.fn(),
  readBoundedSafeNonce: vi.fn(),
}));

const SAFE = "0x5555555555555555555555555555555555555555" as Address;
const SPENDER = "0x6666666666666666666666666666666666666666" as Address;
const SIGNATURE = `0x${"ab".repeat(65)}` as Hex;
const EXECUTION_SUCCESS =
  "0x442e715f626346e8c54381002da614f62bee8d27386535b2521ec8540898556e";
const EXECUTION_FAILURE =
  "0x23428b18acfb3ea64b08dc0c1d296ea9c09702c09083ca5272e64d115b687d23";
const TRUE = encodeAbiParameters([{ type: "bool" }], [true]);
const FALSE = encodeAbiParameters([{ type: "bool" }], [false]);

function identity(
  extra: Partial<SafeAuthorityIdentity> = {},
): SafeAuthorityIdentity {
  return {
    kind: "safe",
    owners: [ACCOUNT, OTHER],
    threshold: 1,
    ownersAreEoas: true,
    hasModules: false,
    modules: [],
    proxyCodeHash: `0x${"01".repeat(32)}`,
    singleton: "0x7777777777777777777777777777777777777777",
    singletonCodeHash: `0x${"02".repeat(32)}`,
    version: "1.4.1",
    guard: zeroAddress,
    fallbackHandler: "0x8888888888888888888888888888888888888888",
    fallbackHandlerCodeHash: `0x${"03".repeat(32)}`,
    ...extra,
  };
}

/** The live Safe each read returns: change it to change the chain. */
let live: { identity: SafeAuthorityIdentity | null; nonce: bigint | null };

beforeEach(() => {
  live = { identity: identity(), nonce: 4n };
  vi.mocked(readAuthorityIdentity).mockImplementation(async () =>
    live.identity ? structuredClone(live.identity) : live.identity,
  );
  vi.mocked(readBoundedSafeNonce).mockImplementation(async () => live.nonce);
});
afterEach(resetReviewUi);

function transferTx(
  extra: Partial<SafeQueuedTransaction> = {},
): SafeQueuedTransaction {
  return {
    to: TERMINAL,
    value: "0",
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [SPENDER, 5n],
    }),
    operation: 0,
    safeTxGas: "0",
    baseGas: "0",
    gasPrice: "0",
    gasToken: zeroAddress,
    refundReceiver: zeroAddress,
    nonce: 4,
    ...extra,
  };
}

/** Safe's transaction service: the queue it lists and every request it got. */
function service(pending: SafeQueuedTransaction[] = []) {
  const requests: { url: string; method: string; body?: unknown }[] = [];
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    requests.push({
      url,
      method,
      ...(init?.body ? { body: JSON.parse(String(init.body)) } : {}),
    });
    if (method === "POST") return new Response(null, { status: 201 });
    return Response.json({
      next: null,
      results: pending.map((tx) => ({
        ...tx,
        safe: SAFE,
        safeTxHash: safeTransactionHash(10, SAFE, tx),
      })),
    });
  });
  const posts = () => requests.filter(({ method }) => method === "POST");
  return { options: { fetch: fetch as typeof globalThis.fetch }, posts };
}

/** The setup with a wallet that signs every typed data with `SIGNATURE`. */
function signing() {
  const harness = setup();
  harness.wallet.adapter.signTypedData.mockImplementation(
    async () => SIGNATURE,
  );
  return harness;
}

const executionLog = (topic: string, hash: Hex) => ({
  address: SAFE,
  topics: [topic, hash],
  data: `0x${"0".repeat(64)}`,
});

describe("proposeReviewedSafeTransaction", () => {
  it("one prompt per proposal, including MultiSend", async () => {
    const { wallet, deps } = signing();
    const queued = service([transferTx({ nonce: 4 })]);
    const prompts = reviewUi();
    const calls = [payCall(5n), payCall(6n)];
    const { safeTxHash } = await proposeReviewedSafeTransaction(
      { chainId: 10, safe: SAFE, calls, service: queued.options },
      deps,
    );
    expect(prompts).toHaveLength(1);
    expect(wallet.adapter.signTypedData).toHaveBeenCalledTimes(1);
    const [signed] = wallet.adapter.signTypedData.mock.calls[0];
    // After everything queued, never below the Safe's own nonce.
    expect(signed.message).toMatchObject({
      to: MULTI_SEND_CALL_ONLY,
      operation: 1,
      nonce: 5n,
    });
    // The MultiSend's inner calls are what the prompt shows.
    const [shown] = prompts[0].model.signatures;
    expect(
      shown.calls[0].calls?.map(({ to, selector, value }) => ({
        to,
        selector,
        value,
      })),
    ).toEqual(
      calls.map((call) => ({
        to: TERMINAL,
        selector: call.data.slice(0, 10),
        value: 7n,
      })),
    );
    const [post] = queued.posts();
    expect(post.body).toMatchObject({
      to: MULTI_SEND_CALL_ONLY,
      operation: 1,
      nonce: "5",
      sender: ACCOUNT,
      signature: SIGNATURE,
      contractTransactionHash: safeTxHash,
      origin: "Juicebox",
    });

    // One call is one CALL.
    const single = service();
    await proposeReviewedSafeTransaction(
      { chainId: 10, safe: SAFE, calls: [payCall()], service: single.options },
      deps,
    );
    expect(prompts).toHaveLength(2);
    expect(single.posts()[0].body).toMatchObject({
      to: TERMINAL,
      value: "7",
      operation: 0,
      nonce: "4",
    });
  });

  it("confirms a queued proposal of the same calls instead of proposing it twice", async () => {
    const { wallet, deps } = signing();
    const call = payCall();
    const existing = transferTx({
      to: call.to,
      data: call.data,
      value: "7",
      nonce: 6,
    });
    const queued = service([existing]);
    const prompts = reviewUi();
    const { safeTxHash } = await proposeReviewedSafeTransaction(
      { chainId: 10, safe: SAFE, calls: [call], service: queued.options },
      deps,
    );
    expect(safeTxHash).toBe(safeTransactionHash(10, SAFE, existing));
    expect(prompts).toHaveLength(1);
    expect(queued.posts()).toEqual([
      expect.objectContaining({
        url: expect.stringContaining(
          `/multisig-transactions/${safeTxHash}/confirmations/`,
        ),
        body: { signature: SIGNATURE },
      }),
    ]);

    // Already confirmed by this owner: nothing to sign.
    const confirmed = service([
      {
        ...existing,
        confirmations: [{ owner: ACCOUNT, signature: SIGNATURE }],
      },
    ]);
    await expect(
      proposeReviewedSafeTransaction(
        { chainId: 10, safe: SAFE, calls: [call], service: confirmed.options },
        deps,
      ),
    ).resolves.toEqual({ safeTxHash });
    expect(prompts).toHaveLength(1);
    expect(confirmed.posts()).toEqual([]);
    expect(wallet.adapter.signTypedData).toHaveBeenCalledTimes(1);
  });

  it("refuses an unverified Safe or a wallet that does not sign for it before review", async () => {
    const { deps } = signing();
    const prompts = reviewUi();
    const propose = () =>
      proposeReviewedSafeTransaction(
        {
          chainId: 10,
          safe: SAFE,
          calls: [payCall()],
          service: service().options,
        },
        deps,
      );
    // An owner-shaped contract that is not a recognized Safe.
    live.identity = null;
    await expect(propose()).rejects.toThrow(
      "Could not verify this Safe onchain.",
    );
    // A module set too large to read in one page.
    live.identity = identity({ modules: null });
    await expect(propose()).rejects.toThrow(
      "Could not verify this Safe onchain.",
    );
    live.identity = identity({ owners: [OTHER] });
    await expect(propose()).rejects.toThrow(
      "The connected wallet is not a signer of this Safe.",
    );
    live.identity = identity();
    await expect(
      proposeReviewedSafeTransaction(
        { chainId: 10, safe: SAFE, calls: [{ ...payCall(), chainId: 8453 }] },
        deps,
      ),
    ).rejects.toThrow("Every call of a Safe proposal must be on chain 10.");
    await expect(
      proposeReviewedSafeTransaction(
        { chainId: 999_999, safe: SAFE, calls: [payCall()] },
        deps,
      ),
    ).rejects.toThrow(
      "Safe does not host a transaction service on chain 999999.",
    );
    expect(prompts).toHaveLength(0);
  });

  it("posts nothing when the Safe's policy changed while signing", async () => {
    const { wallet, deps } = signing();
    const queued = service();
    reviewUi();
    wallet.adapter.signTypedData.mockImplementation(async () => {
      live.identity = identity({ threshold: 2 });
      return SIGNATURE;
    });
    await expect(
      proposeReviewedSafeTransaction(
        {
          chainId: 10,
          safe: SAFE,
          calls: [payCall()],
          service: queued.options,
        },
        deps,
      ),
    ).rejects.toThrow(
      "The Safe policy or nonce changed. Review the transaction again.",
    );
    expect(queued.posts()).toEqual([]);
  });
});

describe("confirmReviewedSafeTransaction", () => {
  it("refuses a queued tx whose hash no longer matches", async () => {
    const { wallet, deps } = signing();
    const queued = service();
    const prompts = reviewUi();
    const tx = transferTx();
    await expect(
      confirmReviewedSafeTransaction(
        {
          chainId: 10,
          safe: SAFE,
          tx: { ...tx, safeTxHash: `0x${"99".repeat(32)}` },
          service: queued.options,
        },
        deps,
      ),
    ).rejects.toThrow("does not match its fields");
    expect(prompts).toHaveLength(0);
    expect(wallet.adapter.signTypedData).not.toHaveBeenCalled();

    // A record changed during review: the reviewed fields are what is signed
    // and confirmed.
    const reviewed = safeTransactionHash(10, SAFE, tx);
    unregister.pop()!();
    const mutable = { ...tx };
    reviewUi(async (prompt) => {
      mutable.to = OTHER;
      return prompt.confirmation;
    });
    const { safeTxHash } = await confirmReviewedSafeTransaction(
      { chainId: 10, safe: SAFE, tx: mutable, service: queued.options },
      deps,
    );
    expect(safeTxHash).toBe(reviewed);
    expect(wallet.adapter.signTypedData.mock.calls[0][0].message).toMatchObject(
      { to: TERMINAL },
    );
    expect(queued.posts()[0].url).toContain(
      `/multisig-transactions/${reviewed}/confirmations/`,
    );
  });

  it("reviews the exact safeTxGas a co-signature commits to", async () => {
    const { deps } = signing();
    const prompts = reviewUi();
    await confirmReviewedSafeTransaction(
      {
        chainId: 10,
        safe: SAFE,
        tx: transferTx({ safeTxGas: "50000" }),
        context: [{ label: "Proposal", value: "Pay project 1" }],
        service: service().options,
      },
      deps,
    );
    const { model } = prompts[0];
    expect(model.signatures[0].calls[0].safeTxGas).toBe(50_000n);
    expect(model.context).toEqual([
      { label: "Proposal", value: "Pay project 1" },
    ]);
  });

  it("refuses a gas refund, a stale nonce, or a chain without a service before review", async () => {
    const { deps } = signing();
    const prompts = reviewUi();
    const confirm = (tx: SafeQueuedTransaction, chainId = 10) =>
      confirmReviewedSafeTransaction(
        { chainId, safe: SAFE, tx, service: service().options },
        deps,
      );
    await expect(confirm(transferTx({ gasPrice: "1" }))).rejects.toThrow(
      "This transaction pays a gas refund, so it can't be executed here.",
    );
    await expect(confirm(transferTx({ nonce: 3 }))).rejects.toThrow(
      "Safe transaction #3 is stale or does not match the live nonce.",
    );
    await expect(confirm(transferTx(), 999_999)).rejects.toThrow(
      "Safe does not host a transaction service on chain 999999.",
    );
    expect(prompts).toHaveLength(0);
  });

  it("posts nothing when the wallet rejects the signature", async () => {
    const { wallet, deps } = signing();
    const queued = service();
    reviewUi();
    wallet.adapter.signTypedData.mockRejectedValue(
      Object.assign(new Error("User rejected."), { code: 4001 }),
    );
    await expect(
      confirmReviewedSafeTransaction(
        { chainId: 10, safe: SAFE, tx: transferTx(), service: queued.options },
        deps,
      ),
    ).rejects.toBeInstanceOf(TransactionReviewCancelledError);
    expect(queued.posts()).toEqual([]);
  });
});

describe("executeReviewedSafeTransaction", () => {
  const signedTx = (extra: Partial<SafeQueuedTransaction> = {}) =>
    transferTx({
      confirmations: [{ owner: ACCOUNT, signature: null }],
      ...extra,
    });

  it("execution goes through the hold and settles from the Safe event", async () => {
    const { wallet, deps, chain, hold } = signing();
    const prompts = reviewUi();
    const open = vi.spyOn(hold, "open");
    const tx = signedTx();
    const safeTxHash = safeTransactionHash(10, SAFE, tx);
    chain.state.ethCall = () => TRUE;
    chain.state.logs = [executionLog(EXECUTION_SUCCESS, safeTxHash)];
    const result = await executeReviewedSafeTransaction(
      { chainId: 10, safe: SAFE, tx },
      deps,
    );
    expect(result.status).toBe("done");
    expect(prompts).toHaveLength(1);
    expect(prompts[0].model.calls[0]).toMatchObject({
      to: SAFE,
      functionName: "execTransaction",
    });
    const [sent] = wallet.adapter.sendTransaction.mock.calls[0];
    expect(sent.to).toBe(SAFE);
    expect(open).toHaveBeenCalledWith(
      expect.objectContaining({
        chainId: 10,
        account: ACCOUNT,
        call: { to: SAFE, data: sent.data, value: 0n },
      }),
      undefined,
    );

    // A receipt that succeeded while the Safe's call failed is a failure.
    chain.state.logs = [executionLog(EXECUTION_FAILURE, safeTxHash)];
    live.nonce = 4n;
    await expect(
      executeReviewedSafeTransaction(
        { chainId: 10, safe: SAFE, tx: signedTx({ value: "0" }) },
        { ...deps, hold: setup().hold },
      ),
    ).rejects.toThrow("but its call failed (ExecutionFailure)");
  });

  it("requires enough current-owner approvals before review", async () => {
    const { wallet, deps } = signing();
    const prompts = reviewUi();
    live.identity = identity({ threshold: 2 });
    await expect(
      executeReviewedSafeTransaction(
        { chainId: 10, safe: SAFE, tx: signedTx() },
        deps,
      ),
    ).rejects.toThrow(
      "This transaction needs 2 current-owner signatures before it can execute.",
    );
    live.identity = identity();
    await expect(
      executeReviewedSafeTransaction(
        { chainId: 10, safe: SAFE, tx: signedTx({ nonce: 5 }) },
        deps,
      ),
    ).rejects.toThrow(
      "Safe transaction #5 is stale or does not match the live nonce.",
    );
    await expect(
      executeReviewedSafeTransaction(
        { chainId: 10, safe: SAFE, tx: signedTx({ gasPrice: "1" }) },
        deps,
      ),
    ).rejects.toThrow("pays a gas refund");
    expect(prompts).toHaveLength(0);
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
  });

  it("refuses an execution that simulates false or a Safe that changed after review", async () => {
    const { wallet, deps, chain } = signing();
    reviewUi();
    chain.state.ethCall = () => FALSE;
    await expect(
      executeReviewedSafeTransaction(
        { chainId: 10, safe: SAFE, tx: signedTx() },
        deps,
      ),
    ).rejects.toThrow("Safe transaction #4 would not execute successfully.");

    chain.state.ethCall = () => TRUE;
    unregister.pop()!();
    reviewUi(async (prompt) => {
      live.identity = identity({ owners: [ACCOUNT, SPENDER] });
      return prompt.confirmation;
    });
    await expect(
      executeReviewedSafeTransaction(
        { chainId: 10, safe: SAFE, tx: signedTx() },
        deps,
      ),
    ).rejects.toThrow(
      "The Safe policy or nonce changed. Review the transaction again.",
    );
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
  });

  it("returns a Safe-connected wallet's proposal, and settles a self-reviewing wallet's send from its receipt", async () => {
    const { wallet, deps, chain } = signing();
    reviewUi();
    const tx = signedTx();
    const safeTxHash = safeTransactionHash(10, SAFE, tx);
    chain.state.ethCall = () => TRUE;
    wallet.state.safe = true;
    const proposed = await executeReviewedSafeTransaction(
      { chainId: 10, safe: SAFE, tx },
      deps,
    );
    expect(proposed).toMatchObject({ status: "proposed", step: 0 });

    const submit = vi.fn(async (request: SelfReviewedRequest) => {
      const [call] = request.calls;
      const hash = `0x${"e".repeat(64)}` as Hex;
      chain.mine(hash, call);
      return hash;
    });
    const signa = {
      ...deps,
      adapter: selfReviewingAdapter({ account: () => ACCOUNT, submit }),
    };
    chain.state.logs = [executionLog(EXECUTION_SUCCESS, safeTxHash)];
    await expect(
      executeReviewedSafeTransaction({ chainId: 10, safe: SAFE, tx }, signa),
    ).resolves.toMatchObject({ status: "done" });
    expect(submit).toHaveBeenCalledTimes(1);

    // Its execution is checked before it is handed the call.
    chain.state.ethCall = () => FALSE;
    await expect(
      executeReviewedSafeTransaction({ chainId: 10, safe: SAFE, tx }, signa),
    ).rejects.toThrow("would not execute successfully");
    expect(submit).toHaveBeenCalledTimes(1);
  });
});
