import {
  createWalletClient,
  custom,
  decodeFunctionData,
  encodeFunctionData,
  formatEther,
  toFunctionSelector,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  erc2771ForwarderAbi,
  jbV6ContractAddress,
} from "../generated/juicebox.js";
import { SAFE_EXEC_ABI } from "../safeService.js";
import {
  ACCOUNT,
  OTHER,
  resetReviewUi,
  reviewUi,
  setup,
  TERMINAL,
} from "./__fixtures__/reviewedSend.js";
import {
  RELAYR_NATIVE_TOKEN,
  RELAYR_PAYMENT_ADDRESS,
  RELAYR_PAYMENT_SELECTOR,
  RelayrPaymentNotSentError,
  relayrForwardRequest,
  relayrPaymentAttemptOutcome,
  type RelayrEntry,
  type RelayrQuote,
} from "./relayr.js";
import {
  payRelayrReviewed,
  pollRelayrBundle,
  RELAYR_FEE_MARGIN_BPS,
  safeRelayrWalletDeps,
  signReviewedForwardRequests,
  type RelayrReviewedCall,
} from "./relayrSend.js";
import type { SafeRelayrSession } from "./safeRelayr.js";
import { openStepHold } from "./writeHold.js";
import { REVIEWED_PLAN_REFUSED_LINE } from "./plan.js";
import { reviewPlan } from "./send.js";
import { signReviewed } from "./sign.js";
import { viemWalletAdapter } from "./wallet.js";
import { WriteHeldError } from "./writeHold.js";
import { SubmittedContractWriteError } from "./contractWrite.js";
import { RelayrProofUnavailableError } from "./relayr.js";
import {
  ReviewedCallRevertedError,
  WalletNotInvokedError,
} from "./lineError.js";

const FORWARDER = jbV6ContractAddress.ERC2771Forwarder[10] as Address;
const TRUSTED = toFunctionSelector("isTrustedForwarder(address)");
const SIGNATURE = `0x${"11".repeat(65)}` as Hex;
const UUIDS = [
  "01234567-89ab-cdef-0123-456789abcdef",
  "fedcba98-7654-3210-fedc-ba9876543210",
  "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "bbbbbbbb-cccc-dddd-eeee-ffffffffffff",
  "cccccccc-dddd-eeee-ffff-000000000000",
];
const TX_UUIDS = [
  "10000000-0000-0000-0000-000000000000",
  "20000000-0000-0000-0000-000000000000",
];
// The runtime code deployed at RELAYR_PAYMENT_ADDRESS on every Relayr chain.
const PAYMENT_RUNTIME =
  "0x608060405260043610156010575f80fd5b5f3560e01c63103903a7146022575f80fd5b604036600319011260ef576004356fffffffffffffffffffffffffffffffff19811680910360ef5760243564ffffffffff811680910360ef5780421160ce575f341560c6575b5f8080809373755ff2f75a0a586ecfa2b9a3c959cb662458a1053491f11560bb5760407fb96b060a9c075a83da0cf1f9405deeb5df21df681a762de16c3d5eaf99531cd8918151903482526020820152a2005b6040513d5f823e3d90fd5b506108fc6068565b90630f01bd8760e21b5f5260045260245264ffffffffff421660445260645ffd5b5f80fdfea26469706673582212206ea0d2ba1e0cb26cc9293b24f1a7aecc1de7e328ca83d6b3bf5382ac44c7390064736f6c634300081a0033" as Hex;

const CALL: RelayrReviewedCall = {
  chainId: 10,
  target: TERMINAL,
  data: "0xabcdef01",
  gas: 300_000n,
};

const withMargin = (fee: bigint) =>
  (fee * RELAYR_FEE_MARGIN_BPS + 9_999n) / 10_000n;

function paymentCalldata(uuid: string, deadline: number): Hex {
  return `${RELAYR_PAYMENT_SELECTOR}${uuid.replaceAll("-", "").padEnd(64, "0")}${BigInt(deadline).toString(16).padStart(64, "0")}` as Hex;
}

const json = (body: unknown, status = 201) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

/**
 * Relayr: each POST is one quote, priced by `fee(from)`, where `from` is
 * the signer of the bundle's first forward request. A fee of null answers
 * 406, as Relayr does for a request whose simulation reverts.
 */
function fakeRelayr(
  fee: (from: Address, data: Hex) => bigint | null,
  /** Seconds each quote's payment stays open, by quote. */
  window: (quote: number) => number = () => 600,
) {
  const posts: { from: Address; uuid?: string; entries: RelayrEntry[] }[] = [];
  let next = 0;
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (!String(url).endsWith("/v1/bundle/prepaid")) {
      throw new Error(`unexpected ${url}`);
    }
    const { transactions } = JSON.parse(String(init!.body)) as {
      transactions: RelayrEntry[];
    };
    // A raw entry is its own sender's: Relayr's.
    const request = relayrForwardRequest(transactions[0]) ?? {
      from: transactions[0].target,
      data: transactions[0].data,
    };
    const amount = fee(request.from, request.data);
    posts.push({ from: request.from, entries: transactions });
    if (amount === null) return json({ SimulationReverted: {} }, 406);
    const deadline = Math.floor(Date.now() / 1_000) + window(next);
    const uuid = UUIDS[next++];
    posts[posts.length - 1].uuid = uuid;
    return json({
      bundle_uuid: uuid,
      tx_uuids: transactions.map((_, index) => TX_UUIDS[index]),
      transactions: transactions.map((request, index) => ({
        tx_uuid: TX_UUIDS[index],
        request,
        status: { state: "Pending" },
      })),
      payment_info: [10, 8453].map((chain) => ({
        chain,
        amount: amount.toString(),
        calldata: paymentCalldata(uuid, deadline),
        target: RELAYR_PAYMENT_ADDRESS,
        token: RELAYR_NATIVE_TOKEN,
        payment_deadline: deadline,
      })),
    });
  });
  vi.stubGlobal("fetch", fetch);
  return { fetch, posts };
}

/** The reviewed-send fixture with a Relayr chain: a forwarder, its nonce, and the payment contract. */
function relayrSetup({ trusted = true } = {}) {
  const fixture = setup();
  const { chain, wallet } = fixture;
  chain.state.ethCall = ([tx]) => {
    const { data } = tx as { data: Hex };
    if (data.startsWith(TRUSTED)) {
      return `0x${(trusted ? 1n : 0n).toString(16).padStart(64, "0")}`;
    }
    return "0x";
  };
  const client = chain.client as unknown as Record<string, unknown>;
  client.readContract = vi.fn(
    async ({ functionName }: { functionName: string }) => {
      if (functionName === "nonces") return 4n;
      if (functionName === "verify") return true;
      throw new Error(`unexpected ${functionName}`);
    },
  );
  client.getCode = vi.fn(async () => PAYMENT_RUNTIME);
  client.getGasPrice = vi.fn(async () => 2_000_000n);
  const signTypedData = vi.fn(async () => SIGNATURE);
  wallet.adapter.signTypedData = signTypedData;
  return { ...fixture, signTypedData };
}

beforeEach(() => vi.useRealTimers());
afterEach(() => {
  resetReviewUi();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("a plan's Relayr rounds", () => {
  it("simulates a relayed call's value as Relayr's, not the signer's", async () => {
    const { deps, chain } = relayrSetup();
    fakeRelayr(() => 1_000n);
    // The signer holds 2 wei: its balance runs topped up by the call's value.
    (chain.client as unknown as Record<string, unknown>).getBalance = vi.fn(
      async () => 2n,
    );
    chain.state.ethCall = (params) => {
      const override = params[2] as Record<string, { balance: Hex }>;
      if (BigInt(override?.[ACCOUNT]?.balance ?? 0) === 7n) return "0x";
      throw Object.assign(new Error("reverted"), {
        code: 3,
        details: "insufficient funds for transfer",
      });
    };
    const prompts = reviewUi();
    await reviewPlan(
      {
        account: ACCOUNT,
        calls: [
          {
            chainId: 10,
            to: TERMINAL,
            data: CALL.data,
            gas: CALL.gas,
            value: 5n,
            relayrRound: "a",
          },
        ],
      },
      deps,
    );
    await expect(prompts[0].simulation).resolves.toEqual({ status: "passed" });
  });
});

describe("payRelayrReviewed", () => {
  const quoteFor = (
    overrides: Record<string, unknown> = {},
    uuid = UUIDS[0],
  ): RelayrQuote => {
    const deadline = Math.floor(Date.now() / 1_000) + 600;
    const entry = {
      chain: 10,
      target: TERMINAL,
      data: "0x01" as Hex,
      value: "0",
      virtual_nonce: 0,
    };
    return {
      bundle_uuid: uuid,
      payment_info: [
        {
          chain: 10,
          amount: "500",
          calldata: paymentCalldata(uuid, deadline),
          target: RELAYR_PAYMENT_ADDRESS,
          token: RELAYR_NATIVE_TOKEN,
          payment_deadline: deadline,
          ...overrides,
        },
      ],
      transactions: [],
      expectedTransactions: [{ txUuid: TX_UUIDS[0], chain: 10, entry }],
    };
  };

  /** Relayr reports each bundle unpaid, unless `paid`. */
  const relayrBundle = (paid = false) =>
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json(
          {
            bundle_uuid: UUIDS[0],
            payment_received: paid,
            transactions: [
              { tx_uuid: TX_UUIDS[0], status: { state: "Pending" } },
            ],
          },
          200,
        ),
      ),
    );
  beforeEach(() => relayrBundle());

  it("refuses a bundle Relayr reports paid, before the wallet", async () => {
    const { deps, wallet } = relayrSetup();
    relayrBundle(true);
    reviewUi();
    await expect(
      payRelayrReviewed(quoteFor(), 10, { account: ACCOUNT }, deps),
    ).rejects.toMatchObject({ reason: "paid" });
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
  });

  it("payment target and selector are pinned", async () => {
    const { deps, wallet } = relayrSetup();
    const prompts = reviewUi();
    await expect(
      payRelayrReviewed(
        quoteFor({ target: OTHER }),
        10,
        { account: ACCOUNT },
        deps,
      ),
    ).rejects.toThrow("no payment option");
    const uuid = UUIDS[0].replaceAll("-", "").padEnd(64, "0");
    await expect(
      payRelayrReviewed(
        quoteFor({ calldata: `0xdeadbeef${uuid}${"0".repeat(64)}` }),
        10,
        { account: ACCOUNT },
        deps,
      ),
    ).rejects.toThrow("no payment option");
    expect(prompts).toHaveLength(0);
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
    const { hash } = (await payRelayrReviewed(
      quoteFor(),
      10,
      { account: ACCOUNT },
      deps,
    )) as { hash: Hex };
    expect(prompts).toHaveLength(1);
    expect(prompts[0].model.calls[0].functionName).toBe("prepayment");
    const [sent] = wallet.adapter.sendTransaction.mock.calls[0];
    expect(sent.to).toBe(RELAYR_PAYMENT_ADDRESS);
    expect(sent.data.slice(0, 10)).toBe(RELAYR_PAYMENT_SELECTOR);
    expect(sent.value).toBe(500n);
    expect(hash).toMatch(/^0x/);
  });

  it("keeps a refusal at the wallet request unsent, so the payment journal frees its quote", async () => {
    const { deps, wallet } = relayrSetup();
    reviewUi();
    let viewAs = false;
    const provider = vi.fn(async ({ method }: { method: string }) => {
      if (method !== "eth_chainId") throw new Error(`Unexpected ${method}`);
      // Inside viem's own await, after every check before the viem call.
      viewAs = true;
      return "0xa";
    });
    const real = viemWalletAdapter({
      walletClient: async () =>
        createWalletClient({
          chain: { id: 10 } as never,
          transport: custom({ request: provider }, { retryCount: 0 }),
        }),
      account: () => ACCOUNT,
      chainId: () => 10,
      isSafe: () => false,
      switchChain: async () => undefined,
      check: () => {
        if (viewAs) throw new Error("You are viewing as another account.");
      },
    });
    let sending = false;
    const error = await payRelayrReviewed(
      quoteFor(),
      10,
      {
        account: ACCOUNT,
        onSending: async () => {
          sending = true;
        },
      },
      {
        ...deps,
        adapter: { ...wallet.adapter, sendTransaction: real.sendTransaction },
      },
    ).catch((caught: unknown) => caught);
    expect(provider.mock.calls.map(([{ method }]) => method)).toEqual([
      "eth_chainId",
    ]);
    expect(error).toBeInstanceOf(WalletNotInvokedError);
    expect(error).toMatchObject({
      message: "You are viewing as another account.",
    });
    expect(relayrPaymentAttemptOutcome(error, { sending, paid: false })).toBe(
      "unpaid",
    );
    // Released: the same quote reviewed again pays.
    await expect(
      payRelayrReviewed(quoteFor(), 10, { account: ACCOUNT }, deps),
    ).resolves.toMatchObject({ hash: expect.stringMatching(/^0x/) });
  });

  it("pays a planned payment with no prompt, and refuses another", async () => {
    const { deps, wallet } = relayrSetup();
    const prompts = reviewUi();
    const quote = quoteFor();
    const [option] = quote.payment_info;
    const plan = await reviewPlan(
      {
        account: ACCOUNT,
        calls: [
          {
            chainId: 10,
            to: RELAYR_PAYMENT_ADDRESS,
            data: option.calldata as Hex,
            value: 500n,
          },
        ],
      },
      deps,
    );
    await expect(
      payRelayrReviewed(
        quoteFor({ amount: "501" }),
        10,
        { account: ACCOUNT, plan },
        deps,
      ),
    ).rejects.toThrow(REVIEWED_PLAN_REFUSED_LINE);
    await payRelayrReviewed(quote, 10, { account: ACCOUNT, plan }, deps);
    expect(prompts).toHaveLength(1);
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);
  });

  describe("with a planned Relayr round", () => {
    const bound = withMargin(1_000n);

    /** Rounds "a" (the quote's call) and "b" (another call), each with a reviewed bound on OP Mainnet. */
    async function plannedRounds(
      relayrRounds?: Record<string, { paymentChainId: number }>,
    ) {
      const setup = relayrSetup();
      const relayr = fakeRelayr(() => 1_000n);
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string, init?: RequestInit) =>
          String(url).endsWith("/v1/bundle/prepaid")
            ? relayr.fetch(url, init)
            : json(
                {
                  bundle_uuid: String(url).split("/").pop(),
                  payment_received: false,
                  transactions: [
                    { tx_uuid: TX_UUIDS[0], status: { state: "Pending" } },
                  ],
                },
                200,
              ),
        ),
      );
      const prompts = reviewUi();
      const plan = await reviewPlan(
        {
          account: ACCOUNT,
          calls: [
            {
              chainId: 10,
              to: TERMINAL,
              data: "0x01",
              from: "relayr",
              relayrRound: "a",
            },
            {
              chainId: 10,
              to: OTHER,
              data: "0x02",
              from: "relayr",
              relayrRound: "b",
            },
          ],
          ...(relayrRounds ? { relayrRounds } : {}),
        },
        setup.deps,
      );
      expect(prompts).toHaveLength(1);
      return { ...setup, prompts, plan };
    }

    it("pays within the round's bound with no prompt", async () => {
      const { deps, wallet, prompts, plan } = await plannedRounds();
      const events: string[] = [];
      const paid = await payRelayrReviewed(
        quoteFor({ amount: bound.toString() }),
        10,
        {
          account: ACCOUNT,
          plan,
          relayrRound: "a",
          onSending: async () => void events.push("sending"),
          onSent: async (hash) => void events.push(hash),
        },
        deps,
      );
      expect(prompts).toHaveLength(1);
      expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);
      expect(events).toEqual(["sending", (paid as { hash: Hex }).hash]);
    });

    it("asks for a fee above the bound", async () => {
      const { deps, wallet, prompts, plan } = await plannedRounds();
      await payRelayrReviewed(
        quoteFor({ amount: (bound + 1n).toString() }),
        10,
        { account: ACCOUNT, plan, relayrRound: "a" },
        deps,
      );
      expect(prompts).toHaveLength(2);
      expect(prompts[1].model.title).toBe("The network fee went up");
      expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);
    });

    it("asks on a second use of the same round", async () => {
      const { deps, prompts, plan } = await plannedRounds();
      const action = { account: ACCOUNT, plan, relayrRound: "a" };
      await payRelayrReviewed(quoteFor(), 10, action, deps);
      expect(prompts).toHaveLength(1);
      await payRelayrReviewed(quoteFor({}, UUIDS[1]), 10, action, deps);
      expect(prompts).toHaveLength(2);
      expect(prompts[1].model.title).toBe("Review network fee");
    });

    it("asks when the quote is another round's", async () => {
      const { deps, prompts, plan } = await plannedRounds();
      await payRelayrReviewed(
        quoteFor(),
        10,
        { account: ACCOUNT, plan, relayrRound: "b" },
        deps,
      );
      expect(prompts).toHaveLength(2);
      // Round "a" kept its bound.
      await payRelayrReviewed(
        quoteFor({}, UUIDS[1]),
        10,
        { account: ACCOUNT, plan, relayrRound: "a" },
        deps,
      );
      expect(prompts).toHaveLength(2);
    });

    it("pays a round whose forward requests were signed under the plan", async () => {
      const { deps, wallet } = relayrSetup();
      const relayr = fakeRelayr(() => 1_000n);
      const prompts = reviewUi();
      const plan = await reviewPlan(
        {
          account: ACCOUNT,
          calls: [
            {
              chainId: 10,
              to: TERMINAL,
              data: CALL.data,
              gas: CALL.gas,
              relayrRound: "a",
            },
          ],
        },
        deps,
      );
      const request = {
        from: ACCOUNT,
        to: TERMINAL,
        value: 0n,
        gas: CALL.gas!,
        deadline: Math.floor(Date.now() / 1_000) + 3_600,
        data: CALL.data,
      };
      const [signature] = await signReviewed(
        [
          {
            kind: "forward-request",
            chainId: 10,
            request: { ...request, nonce: 4n },
          },
        ],
        { account: ACCOUNT, plan },
        deps,
      );
      const quote = quoteFor();
      quote.expectedTransactions = [
        {
          txUuid: TX_UUIDS[0],
          chain: 10,
          entry: {
            chain: 10,
            target: FORWARDER,
            data: encodeFunctionData({
              abi: erc2771ForwarderAbi,
              functionName: "execute",
              args: [{ ...request, signature }],
            }),
            value: "0",
          },
        },
      ];
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string, init?: RequestInit) =>
          String(url).endsWith("/v1/bundle/prepaid")
            ? relayr.fetch(url, init)
            : json(
                {
                  bundle_uuid: UUIDS[0],
                  payment_received: false,
                  transactions: [
                    { tx_uuid: TX_UUIDS[0], status: { state: "Pending" } },
                  ],
                },
                200,
              ),
        ),
      );
      await payRelayrReviewed(
        quote,
        10,
        { account: ACCOUNT, plan, relayrRound: "a" },
        deps,
      );
      expect(prompts).toHaveLength(1);
      expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);
    });

    it("pays with no prompt on the round's payment chain, though not a destination", async () => {
      const { deps, chain, wallet, prompts, plan } = await plannedRounds({
        a: { paymentChainId: 8453 },
      });
      expect(prompts[0].model.context[0].value).toContain(
        `Up to ${formatEther(bound)} ETH`,
      );
      const client = chain.client as unknown as {
        getTransaction: (args: { hash: Hex }) => Promise<object>;
      };
      const read = client.getTransaction;
      client.getTransaction = async (args) => ({
        ...(await read(args)),
        chainId: 8453,
      });
      await payRelayrReviewed(
        quoteFor({ chain: 8453 }),
        8453,
        { account: ACCOUNT, plan, relayrRound: "a" },
        deps,
      );
      expect(prompts).toHaveLength(1);
      expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);
    });

    it("asks on another chain than the round's payment chain", async () => {
      const { deps, prompts, plan } = await plannedRounds({
        a: { paymentChainId: 8453 },
      });
      await payRelayrReviewed(
        quoteFor(),
        10,
        { account: ACCOUNT, plan, relayrRound: "a" },
        deps,
      );
      expect(prompts).toHaveLength(2);
    });

    it("asks for a zero fee with no bound", async () => {
      const { deps, prompts, plan } = await plannedRounds();
      await payRelayrReviewed(
        quoteFor({ amount: "0" }),
        10,
        { account: ACCOUNT, plan, relayrRound: "b" },
        deps,
      );
      expect(prompts).toHaveLength(2);
    });

    it("asks when paying on a chain the bound was not reviewed for", async () => {
      const { deps, wallet, prompts, plan } = await plannedRounds();
      // The fixture mines on OP Mainnet only: the wallet stops at the send.
      wallet.adapter.sendTransaction.mockRejectedValueOnce(new Error("stop"));
      await expect(
        payRelayrReviewed(
          quoteFor({ chain: 8453 }),
          8453,
          { account: ACCOUNT, plan, relayrRound: "a" },
          deps,
        ),
      ).rejects.toThrow("stop");
      expect(prompts).toHaveLength(2);
    });
  });

  it("lets a reverted payment be reviewed and paid again", async () => {
    const { deps, chain, wallet } = relayrSetup();
    const prompts = reviewUi();
    chain.state.status = "reverted";
    await expect(
      payRelayrReviewed(quoteFor(), 10, { account: ACCOUNT }, deps),
    ).rejects.toBeInstanceOf(ReviewedCallRevertedError);
    chain.state.status = "success";
    await payRelayrReviewed(quoteFor(), 10, { account: ACCOUNT }, deps);
    expect(prompts).toHaveLength(2);
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["reads on a retry", 1, "resolves"],
    ["stays unreadable past the follow's bound", Infinity, "rejects"],
  ] as const)("a payment whose proof %s", async (_name, failures, outcome) => {
    const { deps, chain, wallet } = relayrSetup();
    reviewUi();
    const read = chain.client.getTransaction.getMockImplementation()!;
    let failed = 0;
    chain.client.getTransaction.mockImplementation(async (args) => {
      // The proof's read, once the hold read the payment settled.
      if (
        wallet.adapter.sendTransaction.mock.calls.length &&
        new Error().stack!.includes("readTransaction") &&
        failed < failures
      ) {
        failed += 1;
        throw new Error("RPC temporarily unavailable");
      }
      return read(args);
    });
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    try {
      const paid = payRelayrReviewed(
        quoteFor(),
        10,
        { account: ACCOUNT },
        deps,
      );
      const settled = paid.then(
        (hash) => ({ hash }),
        (error: unknown) => ({ error }),
      );
      await vi.advanceTimersByTimeAsync(130_000);
      const result = await settled;
      if (outcome === "resolves") expect(result).toHaveProperty("hash");
      else
        expect((result as { error: unknown }).error).toBeInstanceOf(
          RelayrProofUnavailableError,
        );
      if (outcome === "rejects") expect(failed).toBeGreaterThan(1);
      expect(wallet.adapter.sendTransaction).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it("ends a payment whose proof reads stall within the follow's bound, unreadable with its hash", async () => {
    const { deps, chain, wallet } = relayrSetup();
    reviewUi();
    const read = chain.client.getTransaction.getMockImplementation()!;
    chain.client.getTransaction.mockImplementation(async (args) => {
      // Each proof read, once the hold read the payment settled, answers only after 30 s.
      if (
        wallet.adapter.sendTransaction.mock.calls.length &&
        new Error().stack!.includes("readTransaction")
      ) {
        await new Promise((resolve) => setTimeout(resolve, 30_000));
        throw new Error("RPC timed out");
      }
      return read(args);
    });
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    try {
      let outcome: unknown = "pending";
      void payRelayrReviewed(quoteFor(), 10, { account: ACCOUNT }, deps).then(
        (hash) => (outcome = { hash }),
        (error: unknown) => (outcome = error),
      );
      await vi.advanceTimersByTimeAsync(121_000);
      expect(outcome).toBeInstanceOf(RelayrProofUnavailableError);
      const hash: string =
        await wallet.adapter.sendTransaction.mock.results[0].value;
      expect((outcome as Error).message).toContain(hash);
      expect(wallet.adapter.sendTransaction).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it("ends a payment whose receipt watcher is exhausted unreadable with its hash, never as a bare read failure", async () => {
    const { deps, chain, wallet } = relayrSetup();
    reviewUi();
    chain.client.waitForTransactionReceipt.mockRejectedValue(
      new Error("watcher dropped"),
    );
    chain.client.getTransactionReceipt.mockRejectedValue(
      new Error("lagging node"),
    );
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    try {
      let outcome: unknown = "pending";
      void payRelayrReviewed(quoteFor(), 10, { account: ACCOUNT }, deps).then(
        (hash) => (outcome = { hash }),
        (error: unknown) => (outcome = error),
      );
      await vi.advanceTimersByTimeAsync(200_000);
      expect(outcome).toBeInstanceOf(RelayrProofUnavailableError);
      const hash: string =
        await wallet.adapter.sendTransaction.mock.results[0].value;
      expect((outcome as Error).message).toContain(hash);
      expect(wallet.adapter.sendTransaction).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it("tells the site before the wallet opens and each hash after", async () => {
    const { deps, wallet } = relayrSetup();
    reviewUi();
    const events: string[] = [];
    const paid = await payRelayrReviewed(
      quoteFor(),
      10,
      {
        account: ACCOUNT,
        onSending: async () => {
          expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
          events.push("sending");
        },
        onSent: async (hash) => {
          events.push(hash);
        },
      },
      deps,
    );
    expect(events).toEqual(["sending", (paid as { hash: Hex }).hash]);
  });

  it("lets a Safe pay: its proposal, with no gas the Safe could spend on a failure", async () => {
    const { deps, wallet, chain } = relayrSetup();
    wallet.state.safe = true;
    const prompts = reviewUi();
    const sent: Hex[] = [];
    const paid = await payRelayrReviewed(
      quoteFor(),
      10,
      { account: ACCOUNT, onSent: async (hash) => void sent.push(hash) },
      deps,
    );
    const proposal = `0x${"1".padStart(64, "0")}`;
    expect(paid).toEqual({ safeTxHash: proposal });
    expect(sent).toEqual([proposal]);
    expect(prompts[0].model.calls[0]).toMatchObject({
      safeTxGas: 0n,
      gas: null,
    });
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ to: RELAYR_PAYMENT_ADDRESS, gas: 0n }),
    );
    // A proposal is not mined here: its hold follows it to the Safe's execution.
    expect(chain.client.waitForTransactionReceipt).not.toHaveBeenCalled();
    await expect(
      payRelayrReviewed(quoteFor(), 10, { account: ACCOUNT }, deps),
    ).rejects.toBeInstanceOf(WriteHeldError);
  });

  it("lets a Safe adopt its queued proposal of the exact payment, never proposing twice", async () => {
    // One quote for both: its deadline is in the calldata.
    const quote = quoteFor();
    const first = relayrSetup();
    first.wallet.state.safe = true;
    reviewUi();
    await payRelayrReviewed(quote, 10, { account: ACCOUNT }, first.deps);
    const [[payment]] = first.wallet.adapter.sendTransaction.mock.calls;
    resetReviewUi();

    const { deps, wallet, chain } = relayrSetup();
    wallet.state.safe = true;
    reviewUi();
    const exact = chain.queueProposal({
      to: payment.to,
      data: payment.data,
      value: payment.value,
    });
    const sent: Hex[] = [];
    await expect(
      payRelayrReviewed(
        quote,
        10,
        { account: ACCOUNT, onSent: async (hash) => void sent.push(hash) },
        deps,
      ),
    ).resolves.toEqual({ safeTxHash: exact });
    expect(sent).toEqual([exact]);
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
  });

  it("refuses a payment contract whose code is not Relayr's, before the wallet", async () => {
    const { deps, wallet, chain } = relayrSetup();
    (
      chain.client as unknown as { getCode: ReturnType<typeof vi.fn> }
    ).getCode.mockResolvedValue("0x6000");
    reviewUi();
    await expect(
      payRelayrReviewed(quoteFor(), 10, { account: ACCOUNT }, deps),
    ).rejects.toThrow("not recognized");
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
  });

  it("refuses a payment whose simulation reverts, before the wallet", async () => {
    const { deps, wallet, chain } = relayrSetup();
    chain.state.ethCall = () => {
      throw Object.assign(new Error("reverted"), {
        code: 3,
        details: "execution reverted",
      });
    };
    reviewUi();
    await expect(
      payRelayrReviewed(quoteFor(), 10, { account: ACCOUNT }, deps),
    ).rejects.toThrow("The Relayr payment would fail");
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
  });

  it("frees the payment only when the wallet rejects with 4001", async () => {
    const { deps, wallet } = relayrSetup();
    reviewUi();
    wallet.adapter.sendTransaction.mockRejectedValueOnce(
      Object.assign(new Error("User rejected"), { code: 4001 }),
    );
    await expect(
      payRelayrReviewed(quoteFor(), 10, { account: ACCOUNT }, deps),
    ).rejects.toMatchObject({ code: 4001 });
    await payRelayrReviewed(quoteFor(), 10, { account: ACCOUNT }, deps);
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2);
  });

  it("proves the payment under the hash it was mined", async () => {
    const { deps, chain } = relayrSetup();
    reviewUi();
    const replacement = `0x${"99".repeat(32)}` as Hex;
    const original = chain.client.waitForTransactionReceipt;
    chain.client.waitForTransactionReceipt = vi.fn(async ({ hash }) => {
      const tx = chain.state.sent.get(hash)!;
      chain.mine(replacement, tx);
      return original({ hash: replacement });
    }) as typeof original;
    const { hash } = (await payRelayrReviewed(
      quoteFor(),
      10,
      { account: ACCOUNT },
      deps,
    )) as { hash: Hex };
    expect(hash).toBe(replacement);
  });

  it("never reads a site's failure to record the mined hash as a refusal", async () => {
    const { deps, wallet, chain } = relayrSetup();
    reviewUi();
    const replacement = `0x${"99".repeat(32)}` as Hex;
    const original = chain.client.waitForTransactionReceipt;
    chain.client.waitForTransactionReceipt = vi.fn(async ({ hash }) => {
      const tx = chain.state.sent.get(hash)!;
      chain.mine(replacement, tx);
      return original({ hash: replacement });
    }) as typeof original;
    await expect(
      payRelayrReviewed(
        quoteFor(),
        10,
        {
          account: ACCOUNT,
          onSent: async (sent) => {
            if (sent === replacement)
              throw Object.assign(new Error("no"), { code: 4001 });
          },
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(SubmittedContractWriteError);
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);
  });
  it("holds a quote's payment on every funding chain", async () => {
    const { deps, wallet } = relayrSetup();
    const prompts = reviewUi();
    const quote = quoteFor();
    quote.payment_info.push({ ...quote.payment_info[0], chain: 8453 });
    wallet.adapter.sendTransaction.mockRejectedValueOnce(new Error("timeout"));
    await expect(
      payRelayrReviewed(quote, 10, { account: ACCOUNT }, deps),
    ).rejects.toThrow("timeout");
    await expect(
      payRelayrReviewed(quote, 8453, { account: ACCOUNT }, deps),
    ).rejects.toBeInstanceOf(WriteHeldError);
    expect(prompts).toHaveLength(1);
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);
  });

  it("never pays a bundle again once a payment of it succeeded", async () => {
    const { deps, chain } = relayrSetup();
    const prompts = reviewUi();
    const quote = quoteFor();
    quote.payment_info.push({ ...quote.payment_info[0], chain: 8453 });
    await payRelayrReviewed(quote, 10, { account: ACCOUNT }, deps);
    // Recovery reads the hold, which settles the proven payment.
    const state = await openStepHold(deps.hold, ACCOUNT, false, {
      chainId: 10,
      to: RELAYR_PAYMENT_ADDRESS,
      data: "0x",
      intent: `relayr:${UUIDS[0]}`,
    }).state(chain.client as unknown as PublicClient);
    expect(state.status === "clear" && state.settled?.result).toBe("success");
    await expect(
      payRelayrReviewed(quote, 8453, { account: ACCOUNT }, deps),
    ).rejects.toThrow("already succeeded");
    expect(prompts).toHaveLength(1);
  });

  it("does not hold other chains' payments while one wallet stalls before reserving", async () => {
    const { deps, wallet } = relayrSetup();
    reviewUi();
    const quote = quoteFor();
    quote.payment_info.push({ ...quote.payment_info[0], chain: 8453 });
    const stalled = {
      ...deps,
      adapter: {
        ...deps.adapter,
        chainId: () => 10,
        switchChain: () => new Promise<void>(() => {}),
      },
    };
    void payRelayrReviewed(quote, 8453, { account: ACCOUNT }, stalled).catch(
      () => undefined,
    );
    await payRelayrReviewed(quote, 10, { account: ACCOUNT }, deps);
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);
  });

  it("pays from the account the payment was reviewed for", async () => {
    const { deps, wallet } = relayrSetup();
    const action = { account: ACCOUNT };
    reviewUi(async (prompt) => {
      action.account = OTHER;
      wallet.state.account = OTHER;
      return prompt.confirmation;
    });
    await expect(
      payRelayrReviewed(quoteFor(), 10, action, deps),
    ).rejects.toThrow("account changed");
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
  });

  it("keeps a wallet's own not-sent error from reading as not sent", async () => {
    const { deps, wallet } = relayrSetup();
    reviewUi();
    wallet.adapter.sendTransaction.mockRejectedValueOnce(
      new RelayrPaymentNotSentError(new Error("wallet said so")),
    );
    const error = await payRelayrReviewed(
      quoteFor(),
      10,
      { account: ACCOUNT },
      deps,
    ).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(RelayrPaymentNotSentError);
  });
});

describe("signReviewedForwardRequests", () => {
  it("signs each request after one review and returns its forwarder entry", async () => {
    const { deps, signTypedData } = relayrSetup();
    const prompts = reviewUi();
    const entries = await signReviewedForwardRequests(
      [{ ...CALL, value: 3n }],
      { account: ACCOUNT, title: "Queue rulesets" },
      deps,
    );
    expect(prompts).toHaveLength(1);
    expect(prompts[0].model.title).toBe("Queue rulesets");
    expect(signTypedData).toHaveBeenCalledTimes(1);
    expect(entries).toHaveLength(1);
    expect(entries[0].target).toBe(FORWARDER);
    expect(entries[0].value).toBe("3");
    const { functionName, args } = decodeFunctionData({
      abi: erc2771ForwarderAbi,
      data: entries[0].data,
    });
    expect(functionName).toBe("execute");
    expect(args[0]).toMatchObject({
      from: ACCOUNT,
      to: TERMINAL,
      value: 3n,
      gas: CALL.gas,
      signature: SIGNATURE,
    });
  });

  it("refuses a destination that does not trust the forwarder", async () => {
    const { deps, signTypedData } = relayrSetup({ trusted: false });
    const prompts = reviewUi();
    await expect(
      signReviewedForwardRequests([CALL], { account: ACCOUNT }, deps),
    ).rejects.toThrow("does not trust the canonical forwarder");
    expect(prompts).toHaveLength(0);
    expect(signTypedData).not.toHaveBeenCalled();
  });

  it("refuses a gas limit that is not positive", async () => {
    const { deps } = relayrSetup();
    await expect(
      signReviewedForwardRequests(
        [{ ...CALL, gas: 0n }],
        { account: ACCOUNT },
        deps,
      ),
    ).rejects.toThrow("positive gas limit");
  });
});

describe("pollRelayrBundle", () => {
  const bundle = (...states: string[]) =>
    json(
      {
        bundle_uuid: UUIDS[0],
        transactions: states.map((state, index) => ({
          tx_uuid: TX_UUIDS[index],
          status: { state },
        })),
      },
      200,
    );

  it("poll treats only failed (any case) as final", async () => {
    vi.useFakeTimers();
    const answers = [
      bundle("Pending", "reverted"),
      bundle("error", "Pending"),
      bundle("Success", "COMPLETED"),
    ];
    const fetch = vi.fn(async () => answers.shift()!);
    const polled = pollRelayrBundle(UUIDS[0], 2, { fetch });
    await vi.advanceTimersByTimeAsync(5_000);
    await expect(polled).resolves.toMatchObject({ bundle_uuid: UUIDS[0] });
    expect(fetch).toHaveBeenCalledTimes(3);
    for (const failed of ["failed", "FAILED", " Failed "]) {
      await expect(
        pollRelayrBundle(UUIDS[0], 2, {
          fetch: async () => bundle("Success", failed),
        }),
      ).rejects.toThrow("could not run this on 1 chain");
    }
  });

  it("keeps polling through failed reads, stops on abort and after five minutes", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(async () => {
      throw new Error("offline");
    });
    const controller = new AbortController();
    const aborted = pollRelayrBundle(UUIDS[0], 1, {
      fetch,
      signal: controller.signal,
    });
    await vi.advanceTimersByTimeAsync(3_000);
    controller.abort(new Error("stopped"));
    await expect(aborted).rejects.toThrow("stopped");
    const timedOut = pollRelayrBundle(UUIDS[0], 1, { fetch });
    const settled = expect(timedOut).rejects.toThrow("still processing");
    await vi.advanceTimersByTimeAsync(5 * 60_000 + 5_000);
    await settled;
    await expect(pollRelayrBundle(UUIDS[0], 0)).rejects.toThrow(
      "exact destination count",
    );
  });
});

describe("safeRelayrWalletDeps", () => {
  const SAFE = "0x5555555555555555555555555555555555555555" as Address;
  const execution = () => {
    const args = [
      TERMINAL,
      0n,
      "0xabcdef01" as Hex,
      0,
      0n,
      0n,
      0n,
      "0x0000000000000000000000000000000000000000" as Address,
      "0x0000000000000000000000000000000000000000" as Address,
      "0x" as Hex,
    ] as const;
    return {
      entry: {
        chain: 10,
        target: SAFE,
        data: encodeFunctionData({
          abi: SAFE_EXEC_ABI,
          functionName: "execTransaction",
          args,
        }),
        value: "0",
      },
      safe: SAFE,
      safeTxHash: `0x${"aa".repeat(32)}` as Hex,
      nonce: 1,
    };
  };

  it("reviews the frozen Safe executions once, decoded", async () => {
    const { deps } = relayrSetup();
    const prompts = reviewUi();
    await safeRelayrWalletDeps(deps).review([execution()], { resumed: false });
    expect(prompts).toHaveLength(1);
    const [call] = prompts[0].model.calls;
    expect(call.functionName).toBe("execTransaction");
    expect(call.calls?.[0].to).toBe(TERMINAL);
  });

  it("reviews and sends the payment with the controller's callbacks around the wallet", async () => {
    const { deps, wallet, chain } = relayrSetup();
    const prompts = reviewUi();
    const deadline = Math.floor(Date.now() / 1_000) + 600;
    const payment = {
      chain: 10,
      amount: "500",
      calldata: paymentCalldata(UUIDS[0], deadline),
      target: RELAYR_PAYMENT_ADDRESS,
      token: RELAYR_NATIVE_TOKEN,
      payment_deadline: deadline,
    };
    const order: string[] = [];
    wallet.adapter.sendTransaction.mockImplementationOnce(async (tx) => {
      order.push("wallet");
      const hash = `0x${"77".repeat(32)}` as Hex;
      chain.mine(hash, tx);
      return hash;
    });
    const onSent = vi.fn(async () => {
      order.push("sent");
    });
    const session = {
      id: "s",
      account: ACCOUNT,
      executions: [execution()],
      quote: { bundle_uuid: UUIDS[0] },
      payments: [],
    } as unknown as SafeRelayrSession;
    const result = await safeRelayrWalletDeps(deps).sendPayment({
      session,
      payment,
      beforeSend: async () => {
        order.push("check");
      },
      onSending: async () => {
        order.push("sending");
      },
      onSent,
    });
    expect(prompts).toHaveLength(1);
    expect(order).toEqual(["check", "sending", "wallet", "sent"]);
    expect(result.hash).toBe(`0x${"77".repeat(32)}`);
    expect(result.payments).toHaveLength(1);
    expect(result.payments[0]).toMatchObject({
      hash: result.hash,
      amount: "500",
      bundleUuid: UUIDS[0],
    });
  });
  it("reports an account change after the attempt was saved as not sent", async () => {
    const { deps, wallet } = relayrSetup();
    reviewUi();
    const deadline = Math.floor(Date.now() / 1_000) + 600;
    const session = {
      id: "s",
      account: ACCOUNT,
      executions: [execution()],
      quote: { bundle_uuid: UUIDS[0] },
      payments: [],
    } as unknown as SafeRelayrSession;
    await expect(
      safeRelayrWalletDeps(deps).sendPayment({
        session,
        payment: {
          chain: 10,
          amount: "500",
          calldata: paymentCalldata(UUIDS[0], deadline),
          target: RELAYR_PAYMENT_ADDRESS,
          token: RELAYR_NATIVE_TOKEN,
          payment_deadline: deadline,
        },
        beforeSend: async () => {},
        onSending: async () => {
          wallet.state.account = OTHER;
        },
        onSent: async () => {},
      }),
    ).rejects.toBeInstanceOf(RelayrPaymentNotSentError);
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
  });
});
