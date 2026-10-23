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
  SAFE_EXEC_ABI,
  safeExecutionArgs,
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
import { safeExecutionIntent } from "./intents.js";
import { TransactionReviewCancelledError } from "./reviewQueue.js";
import { selfReviewingAdapter, type SelfReviewedRequest } from "./wallet.js";
import { sendReviewed } from "./send.js";
import { WriteHeldError } from "./writeHold.js";
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
/** Another owner's ECDSA signature, as the service lists it. */
const OTHER_SIGNATURE = `0x${"11".repeat(64)}1b` as Hex;
const EXECUTION_SUCCESS =
  "0x442e715f626346e8c54381002da614f62bee8d27386535b2521ec8540898556e";
const EXECUTION_FAILURE =
  "0x23428b18acfb3ea64b08dc0c1d296ea9c09702c09083ca5272e64d115b687d23";
const TRUE = encodeAbiParameters([{ type: "bool" }], [true]);
const FALSE = encodeAbiParameters([{ type: "bool" }], [false]);

/**
 * The chain's eth_call: execTransaction returns true, and the Safe's nonce
 * is 4 up to block 100 and 5 from the execution's block on.
 */
function executes(params: unknown[]) {
  const [call, block] = params as [{ data: Hex }, Hex | "latest"];
  if (!call.data.startsWith("0xaffed0e0")) return TRUE;
  const ran = block === "latest" || BigInt(block) > 100n;
  return encodeAbiParameters([{ type: "uint256" }], [ran ? 5n : 4n]);
}

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

const actual = await vi.importActual<typeof import("../safe.js")>("../safe.js");

/** The live Safe each read returns: change it to change the chain. */
let live: { identity: SafeAuthorityIdentity | null; nonce: bigint | null };

beforeEach(() => {
  live = { identity: identity(), nonce: 4n };
  vi.mocked(readAuthorityIdentity).mockImplementation(async () =>
    live.identity ? structuredClone(live.identity) : live.identity,
  );
  // The live nonce; one at a block (a settled execution's) is the chain's.
  vi.mocked(readBoundedSafeNonce).mockImplementation(
    async (client, safe, options) =>
      options?.blockNumber === undefined
        ? live.nonce
        : actual.readBoundedSafeNonce(client, safe, options),
  );
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
function service(
  pending: SafeQueuedTransaction[] = [],
  answers: { post?: number; recorded?: SafeQueuedTransaction } = {},
) {
  const requests: { url: string; method: string; body?: unknown }[] = [];
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    requests.push({
      url,
      method,
      ...(init?.body ? { body: JSON.parse(String(init.body)) } : {}),
    });
    if (method === "POST") {
      return new Response(null, { status: answers.post ?? 201 });
    }
    if (!url.includes("?")) {
      const { recorded } = answers;
      return recorded
        ? Response.json({
            ...recorded,
            safe: SAFE,
            safeTxHash: safeTransactionHash(10, SAFE, recorded),
          })
        : new Response(null, { status: 404 });
    }
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

    // Changed while the review was open: the wallet is never asked.
    live.identity = identity();
    wallet.adapter.signTypedData.mockClear();
    unregister.pop()!();
    reviewUi(async (prompt) => {
      live.nonce = 5n;
      return prompt.confirmation;
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
    expect(wallet.adapter.signTypedData).not.toHaveBeenCalled();
    expect(queued.posts()).toEqual([]);
  });

  it("posts nothing when another proposal took the nonce during review", async () => {
    const { wallet, deps } = signing();
    const pending: SafeQueuedTransaction[] = [];
    const queued = service(pending);
    reviewUi();
    wallet.adapter.signTypedData.mockImplementation(async () => {
      pending.push(transferTx({ nonce: 4 }));
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
      "Another proposal took Safe nonce 4 during review. Nothing was proposed; review it again.",
    );
    expect(queued.posts()).toEqual([]);
  });
});

describe("proposeReviewedSafeTransaction answers", () => {
  it("finds a proposal the service queued but whose answer was lost, and posts nothing when the Safe changed during the last queue read", async () => {
    const { wallet, deps } = signing();
    reviewUi();
    const call = payCall();
    const lost = service([], {
      post: 502,
      recorded: transferTx({
        to: call.to,
        data: call.data,
        value: "7",
        confirmations: [{ owner: ACCOUNT, signature: SIGNATURE }],
      }),
    });
    const { safeTxHash } = await proposeReviewedSafeTransaction(
      { chainId: 10, safe: SAFE, calls: [call], service: lost.options },
      deps,
    );
    expect(safeTxHash).toBe(
      safeTransactionHash(
        10,
        SAFE,
        transferTx({ to: call.to, data: call.data, value: "7" }),
      ),
    );
    // The same transaction queued by another owner is not this proposal.
    await expect(
      proposeReviewedSafeTransaction(
        {
          chainId: 10,
          safe: SAFE,
          calls: [call],
          service: service([], {
            post: 502,
            recorded: transferTx({
              to: call.to,
              data: call.data,
              value: "7",
              confirmations: [{ owner: OTHER, signature: OTHER_SIGNATURE }],
            }),
          }).options,
        },
        deps,
      ),
    ).rejects.toThrow("Safe's transaction service refused");
    // Refused and not queued: the service's refusal stands.
    await expect(
      proposeReviewedSafeTransaction(
        {
          chainId: 10,
          safe: SAFE,
          calls: [call],
          service: service([], { post: 400 }).options,
        },
        deps,
      ),
    ).rejects.toThrow("Safe's transaction service refused");

    let reads = 0;
    const changing = service();
    const fetch = changing.options.fetch;
    changing.options.fetch = (async (...args: Parameters<typeof fetch>) => {
      if ((args[1]?.method ?? "GET") === "GET" && ++reads === 2) {
        live.identity = identity({ threshold: 2 });
      }
      return fetch(...args);
    }) as typeof fetch;
    await expect(
      proposeReviewedSafeTransaction(
        { chainId: 10, safe: SAFE, calls: [call], service: changing.options },
        deps,
      ),
    ).rejects.toThrow(
      "The Safe policy or nonce changed. Review the transaction again.",
    );
    expect(changing.posts()).toEqual([]);
    expect(wallet.adapter.signTypedData).toHaveBeenCalledTimes(4);
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
      confirmations: [{ owner: OTHER, signature: OTHER_SIGNATURE }],
      ...extra,
    });

  it("execution goes through the hold and settles from the Safe event", async () => {
    const { wallet, deps, chain, hold, progress } = signing();
    const prompts = reviewUi();
    const open = vi.spyOn(hold, "open");
    const tx = signedTx();
    const safeTxHash = safeTransactionHash(10, SAFE, tx);
    chain.state.ethCall = executes;
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
        namespace: safeExecutionIntent({ chainId: 10, safe: SAFE, safeTxHash }),
      }),
      undefined,
    );
    expect(progress[progress.length - 1]?.phase).toBe("done");

    // A receipt that succeeded while the Safe's call failed is a failure,
    // never reported done.
    progress.length = 0;
    chain.state.logs = [executionLog(EXECUTION_FAILURE, safeTxHash)];
    await expect(
      executeReviewedSafeTransaction(
        { chainId: 10, safe: SAFE, tx },
        { ...deps, hold: setup().hold },
      ),
    ).rejects.toThrow("but its call failed, so nothing changed");
    expect(progress.map(({ phase }) => phase)).not.toContain("done");
  });

  it("settles an execution as failed, never succeeded, unless the Safe logged ExecutionSuccess for its exact hash", async () => {
    const tx = signedTx();
    const safeTxHash = safeTransactionHash(10, SAFE, tx);
    for (const logs of [
      [executionLog(EXECUTION_FAILURE, safeTxHash)],
      // Another transaction's success is not this one's.
      [executionLog(EXECUTION_SUCCESS, `0x${"77".repeat(32)}`)],
    ]) {
      const { wallet, deps, chain } = signing();
      reviewUi();
      chain.state.ethCall = executes;
      chain.state.logs = logs;
      await expect(
        executeReviewedSafeTransaction({ chainId: 10, safe: SAFE, tx }, deps),
      ).rejects.toThrow();
      const [sent] = wallet.adapter.sendTransaction.mock.calls[0];
      // Read again as any later reader (a reload, the held-write notice) reads it.
      const state = await deps.hold
        .open({
          chainId: 10,
          account: ACCOUNT,
          safe: false,
          call: { to: SAFE, data: sent.data, value: 0n },
          namespace: safeExecutionIntent({
            chainId: 10,
            safe: SAFE,
            safeTxHash,
          }),
        })
        .state(chain.client as never);
      expect(state).toMatchObject({
        status: "clear",
        settled: { result: "failed" },
      });
      resetReviewUi();
    }
  });

  it("decides a call that only shares execTransaction's selector as any other, and keeps an unknown target held", async () => {
    const data = encodeFunctionData({
      abi: SAFE_EXEC_ABI,
      functionName: "execTransaction",
      args: safeExecutionArgs(signedTx(), [ACCOUNT, OTHER]),
    });
    const view = (
      deps: ReturnType<typeof signing>["deps"],
      chain: ReturnType<typeof signing>["chain"],
    ) =>
      deps.hold
        .open({
          chainId: 10,
          account: ACCOUNT,
          safe: false,
          call: { to: SAFE, data, value: 0n },
        })
        .state(chain.client as never);
    {
      const { deps, chain } = signing();
      reviewUi();
      chain.state.ethCall = executes;
      live.identity = { kind: "contract" } as never;
      await expect(
        sendReviewed(
          { account: ACCOUNT, calls: [{ chainId: 10, to: SAFE, data }] },
          deps,
        ),
      ).resolves.toMatchObject({ status: "done" });
      expect(await view(deps, chain)).toMatchObject({
        status: "clear",
        settled: { result: "success" },
      });
      resetReviewUi();
    }
    {
      // Who the target is can't be read: it stays held, never settled.
      const { deps, chain } = signing();
      reviewUi();
      chain.state.ethCall = executes;
      live.identity = identity();
      const sent = sendReviewed(
        { account: ACCOUNT, calls: [{ chainId: 10, to: SAFE, data }] },
        deps,
      );
      vi.mocked(readAuthorityIdentity).mockImplementation(async () => null);
      // Never done while the Safe's own result is unproven.
      await expect(sent).rejects.toThrow(
        "This transaction landed, but the Safe's own result is not confirmed yet. Check the Safe before trying again.",
      );
      expect((await view(deps, chain)).status).not.toBe("clear");
      resetReviewUi();
    }
    {
      // The receipt client's one `request` answers every identity read, at
      // the receipt's block.
      const { deps, chain } = signing();
      reviewUi();
      chain.state.ethCall = executes;
      const request = chain.client.request.getMockImplementation()!;
      chain.client.request.mockImplementation(async (args) =>
        args.method === "eth_getCode" || args.method === "eth_getStorageAt"
          ? "0x"
          : request(args),
      );
      vi.mocked(readAuthorityIdentity).mockImplementation(
        async (client, address, options) => {
          await client.getCode({ address, blockNumber: options?.blockNumber });
          await client.getStorageAt({
            address,
            slot: "0x0",
            blockNumber: options?.blockNumber,
          });
          return { kind: "contract" };
        },
      );
      await sendReviewed(
        { account: ACCOUNT, calls: [{ chainId: 10, to: SAFE, data }] },
        deps,
      );
      expect(chain.client.request).toHaveBeenCalledWith({
        method: "eth_getCode",
        params: [SAFE, "0x65"],
      });
      expect(chain.client.request).toHaveBeenCalledWith({
        method: "eth_getStorageAt",
        params: [SAFE, "0x0", "0x65"],
      });
      resetReviewUi();
    }
  });

  it("reads a step's outcome only from its own reservation's settlement", async () => {
    const { deps, hold } = signing();
    reviewUi();
    const open = hold.open.bind(hold);
    // Another send of the same call settled failed after this one.
    vi.spyOn(hold, "open").mockImplementation((...args) => {
      const handle = open(...args);
      return {
        ...handle,
        state: async () => ({
          status: "clear" as const,
          reservation: "another-send",
          settled: {
            result: "failed" as const,
            hash: `0x${"1".padStart(64, "0")}` as Hex,
          },
        }),
      } as never;
    });
    await expect(
      sendReviewed({ account: ACCOUNT, calls: [payCall()] }, deps),
    ).resolves.toMatchObject({ status: "done" });
  });

  it("binds the execution to its nonce with another owner's signature", async () => {
    const { wallet, deps, chain } = signing();
    const prompts = reviewUi();
    chain.state.ethCall = executes;
    // The executor's own approval alone binds nothing.
    await expect(
      executeReviewedSafeTransaction(
        {
          chainId: 10,
          safe: SAFE,
          tx: signedTx({
            confirmations: [{ owner: ACCOUNT, signature: null }],
          }),
        },
        deps,
      ),
    ).rejects.toThrow(
      "Your own approval alone does not bind this execution to its nonce. Sign the Safe transaction first.",
    );
    expect(prompts).toHaveLength(0);

    // With another owner's signature enough, the executor's approval is left out.
    const tx = signedTx({
      confirmations: [
        { owner: ACCOUNT, signature: null },
        { owner: OTHER, signature: OTHER_SIGNATURE },
      ],
    });
    chain.state.logs = [
      executionLog(EXECUTION_SUCCESS, safeTransactionHash(10, SAFE, tx)),
    ];
    await executeReviewedSafeTransaction({ chainId: 10, safe: SAFE, tx }, deps);
    const [sent] = wallet.adapter.sendTransaction.mock.calls[0];
    expect(sent.data).toBe(
      encodeFunctionData({
        abi: SAFE_EXEC_ABI,
        functionName: "execTransaction",
        args: safeExecutionArgs(
          {
            ...tx,
            confirmations: [{ owner: OTHER, signature: OTHER_SIGNATURE }],
          },
          [ACCOUNT, OTHER],
        ),
      }),
    );
  });

  it("holds one execution per Safe transaction, whatever signatures it carries", async () => {
    const { wallet, deps, chain } = signing();
    const prompts = reviewUi();
    chain.state.ethCall = executes;
    wallet.adapter.sendTransaction.mockRejectedValueOnce(
      new Error("Request timed out."),
    );
    await expect(
      executeReviewedSafeTransaction(
        { chainId: 10, safe: SAFE, tx: signedTx() },
        deps,
      ),
    ).rejects.toThrow("Request timed out.");
    // More signatures change the calldata, not the Safe transaction.
    await expect(
      executeReviewedSafeTransaction(
        {
          chainId: 10,
          safe: SAFE,
          tx: signedTx({
            confirmations: [
              {
                owner: ACCOUNT,
                signature: SIGNATURE.replace(/ab$/, "1c") as Hex,
              },
              { owner: OTHER, signature: OTHER_SIGNATURE },
            ],
          }),
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(WriteHeldError);
    expect(prompts).toHaveLength(1);
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);

    // The Safe itself, connected as a Safe app, is refused before review.
    wallet.state.account = SAFE;
    await expect(
      executeReviewedSafeTransaction(
        { chainId: 10, safe: SAFE, tx: signedTx() },
        deps,
      ),
    ).rejects.toThrow(
      "A Safe can't execute its own queued transaction from inside itself. Execute it from an owner's wallet.",
    );
    expect(prompts).toHaveLength(1);
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

    chain.state.ethCall = executes;
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
    chain.state.ethCall = executes;
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
