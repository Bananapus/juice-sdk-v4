import {
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
  RELAYR_PAYMENT_GAS,
  RELAYR_PAYMENT_SELECTOR,
  RelayrPaymentNotSentError,
  relayrForwardRequest,
  type RelayrEntry,
  type RelayrQuote,
} from "./relayr.js";
import {
  payRelayrReviewed,
  pollRelayrBundle,
  RELAYR_FEE_MARGIN_BPS,
  RELAYR_FEE_MARKUP_BPS,
  runRelayrReviewed,
  safeRelayrWalletDeps,
  signReviewedForwardRequests,
  type RelayrReviewedCall,
} from "./relayrSend.js";
import { TransactionReviewCancelledError } from "./reviewQueue.js";
import type { SafeRelayrSession } from "./safeRelayr.js";
import { openStepHold } from "./writeHold.js";
import { REVIEWED_PLAN_REFUSED_LINE } from "./plan.js";
import { reviewPlan } from "./send.js";
import { selfReviewingAdapter } from "./wallet.js";
import { WriteHeldError } from "./writeHold.js";
import { SubmittedContractWriteError } from "./contractWrite.js";

const FORWARDER = jbV6ContractAddress.ERC2771Forwarder[10] as Address;
const PROJECTS = jbV6ContractAddress.JBProjects[10] as Address;
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

describe("runRelayrReviewed", () => {
  it("refuses a destination that does not trust the forwarder", async () => {
    const { deps, wallet, signTypedData } = relayrSetup({ trusted: false });
    const relayr = fakeRelayr(() => 100n);
    const prompts = reviewUi();
    await expect(
      runRelayrReviewed([CALL], { account: ACCOUNT, scope: "action" }, deps),
    ).rejects.toThrow("does not trust the canonical forwarder");
    expect(prompts).toHaveLength(0);
    expect(relayr.fetch).not.toHaveBeenCalled();
    expect(signTypedData).not.toHaveBeenCalled();
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
  });

  it("asks nothing of a wallet whose ready fails", async () => {
    const { deps, wallet, signTypedData } = relayrSetup();
    const relayr = fakeRelayr(() => 100n);
    const prompts = reviewUi();
    const adapter = {
      ...wallet.adapter,
      ready: () => Promise.reject(new Error("peer")),
    };
    await expect(
      runRelayrReviewed(
        [CALL],
        { account: ACCOUNT, scope: "action" },
        { ...deps, adapter },
      ),
    ).rejects.toThrow("Your wallet's connection could not be confirmed.");
    expect(prompts).toHaveLength(0);
    expect(relayr.fetch).not.toHaveBeenCalled();
    expect(signTypedData).not.toHaveBeenCalled();
  });

  it("one prompt covers the forward requests, the quoted fee and the payment", async () => {
    const { deps, wallet, signTypedData } = relayrSetup();
    const relayr = fakeRelayr((from) => (from === ACCOUNT ? 900n : 1_000n));
    const prompts = reviewUi();
    const result = await runRelayrReviewed(
      [CALL],
      {
        account: ACCOUNT,
        scope: "action",
        context: [{ label: "Project", value: "#1" }],
      },
      deps,
    );
    expect(prompts).toHaveLength(1);
    const { model } = prompts[0];
    expect(model.signatures).toHaveLength(1);
    expect(model.signatures[0].kind).toBe("forward-request");
    expect(model.signatures[0].calls[0].to).toBe(TERMINAL);
    expect(model.context).toEqual([
      { label: "Project", value: "#1" },
      {
        label: "Network fee",
        value: `Up to ${formatEther(withMargin(1_000n))} ETH`,
        strong: true,
      },
      { label: "Fee paid on", value: "Chain 10" },
      { label: "Fee paid to", value: RELAYR_PAYMENT_ADDRESS, mono: true },
    ]);
    // The stand-in and then the signed requests.
    expect(relayr.posts.map(({ from }) => from === ACCOUNT)).toEqual([
      false,
      true,
    ]);
    expect(signTypedData).toHaveBeenCalledTimes(1);
    const typed = signTypedData.mock.calls[0] as unknown as [
      { domain: { verifyingContract: Address }; message: { nonce: bigint } },
    ];
    expect(typed[0].domain.verifyingContract).toBe(FORWARDER);
    expect(typed[0].message.nonce).toBe(4n);
    const posted = relayrForwardRequest(relayr.posts[1].entries[0])!;
    expect(posted.signature).toBe(SIGNATURE);
    expect(posted.to).toBe(TERMINAL);
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        to: RELAYR_PAYMENT_ADDRESS,
        value: 900n,
        gas: RELAYR_PAYMENT_GAS,
      }),
    );
    expect(result.uuid).toBe(relayr.posts[1].uuid);
    expect(result.paymentHash).toMatch(/^0x/);
    expect(result.signatures).toBeUndefined();
  });

  it("the fee row shows the quoted amount before confirm", async () => {
    const { deps, signTypedData } = relayrSetup();
    const relayr = fakeRelayr((from) => (from === ACCOUNT ? 10n : 4_000n));
    let shown: string | undefined;
    reviewUi(async (prompt) => {
      shown = prompt.model.context.find(
        (row) => row.label === "Network fee",
      )?.value;
      // Only the stand-in was quoted, and nothing was signed yet.
      expect(relayr.fetch).toHaveBeenCalledTimes(1);
      expect(signTypedData).not.toHaveBeenCalled();
      return null;
    });
    await expect(
      runRelayrReviewed([CALL], { account: ACCOUNT, scope: "action" }, deps),
    ).rejects.toBeInstanceOf(TransactionReviewCancelledError);
    expect(shown).toBe(`Up to ${formatEther(withMargin(4_000n))} ETH`);
    expect(signTypedData).not.toHaveBeenCalled();
  });

  it("quotes a public call with the same gas when the calls need the real sender", async () => {
    const { deps } = relayrSetup();
    const relayr = fakeRelayr((from, data) =>
      from === ACCOUNT ? 10n : data === CALL.data ? null : 3_000n,
    );
    let shown: string | undefined;
    reviewUi(async (prompt) => {
      shown = prompt.model.context[0].value;
      return null;
    });
    await expect(
      runRelayrReviewed(
        [{ ...CALL, value: 5n }],
        { account: ACCOUNT, scope: "action" },
        deps,
      ),
    ).rejects.toBeInstanceOf(TransactionReviewCancelledError);
    const probe = relayrForwardRequest(relayr.posts[1].entries[0])!;
    expect(probe.to.toLowerCase()).toBe(PROJECTS.toLowerCase());
    expect(probe.gas).toBe(CALL.gas);
    expect(probe.value).toBe(0n);
    expect(shown).toBe(`Up to ${formatEther(withMargin(3_005n))} ETH`);
  });

  it("bounds the fee locally when no stand-in can be quoted", async () => {
    const { deps, chain } = relayrSetup();
    fakeRelayr(() => null);
    chain.client.estimateGas.mockResolvedValue(400_000n);
    let shown: string | undefined;
    reviewUi(async (prompt) => {
      shown = prompt.model.context[0].value;
      return null;
    });
    await expect(
      runRelayrReviewed(
        [{ ...CALL, value: 5n }],
        { account: ACCOUNT, scope: "action" },
        deps,
      ),
    ).rejects.toBeInstanceOf(TransactionReviewCancelledError);
    // Estimated through the forwarder as the real sender.
    expect(chain.client.estimateGas).toHaveBeenCalledWith(
      expect.objectContaining({
        account: FORWARDER,
        to: TERMINAL,
        data: `${CALL.data}${ACCOUNT.slice(2)}`,
      }),
    );
    const bound =
      ((400_000n + 100_000n) * 2_000_000n * RELAYR_FEE_MARKUP_BPS) / 10_000n +
      5n;
    expect(shown).toBe(`Up to ${formatEther(withMargin(bound))} ETH`);
  });

  it("an expired quote re-quotes silently when the fee did not rise", async () => {
    const { deps, wallet, chain } = relayrSetup();
    const relayr = fakeRelayr((from) => (from === ACCOUNT ? 900n : 1_000n));
    const real = Date.now();
    let now = real;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const ethCall = chain.state.ethCall;
    let simulated = 0;
    chain.state.ethCall = (params) => {
      const [tx] = params as [{ to: Address }];
      // The first payment's quote runs out while its simulation runs.
      if (tx.to.toLowerCase() === RELAYR_PAYMENT_ADDRESS && !simulated++) {
        now = real + 590_000;
      }
      return ethCall(params);
    };
    const prompts = reviewUi();
    const result = await runRelayrReviewed(
      [CALL],
      { account: ACCOUNT, scope: "action" },
      deps,
    );
    expect(prompts).toHaveLength(1);
    expect(relayr.posts.filter(({ from }) => from === ACCOUNT)).toHaveLength(2);
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);
    const [sent] = wallet.adapter.sendTransaction.mock.calls[0];
    expect(sent.data).toBe(
      paymentCalldata(relayr.posts[2].uuid!, Math.floor(now / 1_000) + 600),
    );
    expect(result.uuid).toBe(relayr.posts[2].uuid);
  });

  it("a higher re-quoted fee opens one fresh review and sends nothing before it", async () => {
    const { deps, wallet } = relayrSetup();
    fakeRelayr((from) => (from === ACCOUNT ? 2_000n : 1_000n));
    const prompts = reviewUi(async (prompt) => {
      if (prompts.length === 1) return prompt.confirmation;
      expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
      return null;
    });
    await expect(
      runRelayrReviewed([CALL], { account: ACCOUNT, scope: "action" }, deps),
    ).rejects.toBeInstanceOf(TransactionReviewCancelledError);
    expect(prompts).toHaveLength(2);
    const fresh = prompts[1].model;
    expect(fresh.calls).toHaveLength(1);
    expect(fresh.calls[0].to).toBe(RELAYR_PAYMENT_ADDRESS);
    expect(fresh.calls[0].value).toBe(2_000n);
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
  });

  it("pays the higher fee once the fresh review is confirmed", async () => {
    const { deps, wallet } = relayrSetup();
    fakeRelayr((from) => (from === ACCOUNT ? 2_000n : 1_000n));
    const prompts = reviewUi();
    await runRelayrReviewed(
      [CALL],
      { account: ACCOUNT, scope: "action" },
      deps,
    );
    expect(prompts).toHaveLength(2);
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ value: 2_000n }),
    );
  });

  it("signs further signatures in the same review and returns them", async () => {
    const { deps, wallet } = relayrSetup();
    fakeRelayr(() => 100n);
    wallet.adapter.signMessage = vi.fn(async () => `0x${"22".repeat(65)}`);
    const prompts = reviewUi();
    const result = await runRelayrReviewed(
      [CALL],
      {
        account: ACCOUNT,
        scope: "action",
        signatures: [{ kind: "message", chainId: 10, message: "List it" }],
      },
      deps,
    );
    expect(prompts).toHaveLength(1);
    expect(prompts[0].model.signatures).toHaveLength(2);
    expect(result.signatures).toEqual([`0x${"22".repeat(65)}`]);
  });

  it("posts nothing and pays nothing when the wallet rejects a signature", async () => {
    const { deps, wallet, signTypedData } = relayrSetup();
    const relayr = fakeRelayr(() => 100n);
    signTypedData.mockRejectedValue(
      Object.assign(new Error("User rejected"), { code: 4001 }),
    );
    reviewUi();
    await expect(
      runRelayrReviewed([CALL], { account: ACCOUNT, scope: "action" }, deps),
    ).rejects.toBeInstanceOf(TransactionReviewCancelledError);
    expect(relayr.posts.filter(({ from }) => from === ACCOUNT)).toHaveLength(0);
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
  });

  it("refuses a signed request the forwarder no longer verifies, before posting it", async () => {
    const { deps, chain } = relayrSetup();
    const relayr = fakeRelayr(() => 100n);
    (
      chain.client as unknown as { readContract: ReturnType<typeof vi.fn> }
    ).readContract.mockImplementation(
      async ({ functionName }: { functionName: string }) =>
        functionName === "nonces" ? 4n : false,
    );
    reviewUi();
    await expect(
      runRelayrReviewed([CALL], { account: ACCOUNT, scope: "action" }, deps),
    ).rejects.toThrow("trusted forwarder changed");
    expect(relayr.posts.filter(({ from }) => from === ACCOUNT)).toHaveLength(0);
  });

  it("refuses two calls on one chain, a Safe wallet and a self-reviewing wallet", async () => {
    const { deps, wallet } = relayrSetup();
    fakeRelayr(() => 100n);
    const prompts = reviewUi();
    await expect(
      runRelayrReviewed(
        [CALL, CALL],
        { account: ACCOUNT, scope: "action" },
        deps,
      ),
    ).rejects.toThrow("one call per supported destination");
    wallet.state.safe = true;
    await expect(
      runRelayrReviewed([CALL], { account: ACCOUNT, scope: "action" }, deps),
    ).rejects.toThrow("ordinary wallet");
    const signa = selfReviewingAdapter({
      account: () => ACCOUNT,
      submit: async () => "0x",
    });
    await expect(
      runRelayrReviewed(
        [CALL],
        { account: ACCOUNT, scope: "action" },
        { ...deps, adapter: signa },
      ),
    ).rejects.toMatchObject({ code: 4200 });
    expect(prompts).toHaveLength(0);
  });

  it("holds the payment by scope, so the same action is not paid twice", async () => {
    const { deps, wallet, signTypedData } = relayrSetup();
    fakeRelayr(() => 100n);
    const prompts = reviewUi();
    wallet.adapter.sendTransaction.mockRejectedValueOnce(new Error("timeout"));
    await expect(
      runRelayrReviewed([CALL], { account: ACCOUNT, scope: "launch:1" }, deps),
    ).rejects.toThrow("timeout");
    await expect(
      runRelayrReviewed([CALL], { account: ACCOUNT, scope: "launch:1" }, deps),
    ).rejects.toBeInstanceOf(WriteHeldError);
    expect(prompts).toHaveLength(1);
    expect(signTypedData).toHaveBeenCalledTimes(1);
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);
  });
  it("requires a scope", async () => {
    const { deps, signTypedData } = relayrSetup();
    const relayr = fakeRelayr(() => 100n);
    const prompts = reviewUi();
    for (const scope of [undefined, "", "  "]) {
      await expect(
        runRelayrReviewed(
          [CALL],
          { account: ACCOUNT, scope } as unknown as Parameters<
            typeof runRelayrReviewed
          >[1],
          deps,
        ),
      ).rejects.toThrow("needs its scope");
    }
    expect(prompts).toHaveLength(0);
    expect(relayr.fetch).not.toHaveBeenCalled();
    expect(signTypedData).not.toHaveBeenCalled();
  });

  it("never pays a scope again after its bundle was paid", async () => {
    const { deps, wallet, chain, signTypedData } = relayrSetup();
    fakeRelayr(() => 100n);
    const prompts = reviewUi();
    const action = { account: ACCOUNT, scope: "launch:paid" };
    await runRelayrReviewed([CALL], action, deps);
    // Recovery reads the hold, which settles the proven payment.
    const state = await openStepHold(deps.hold, ACCOUNT, false, {
      chainId: 10,
      to: RELAYR_PAYMENT_ADDRESS,
      data: "0x",
      intent: action.scope,
    }).state(chain.client as unknown as PublicClient);
    expect(state.status === "clear" && state.settled?.result).toBe("success");
    for (const paymentChainId of [10, 8453]) {
      await expect(
        runRelayrReviewed([CALL], { ...action, paymentChainId }, deps),
      ).rejects.toThrow("already succeeded");
    }
    expect(prompts).toHaveLength(1);
    expect(signTypedData).toHaveBeenCalledTimes(1);
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);
  });

  it("holds the scope on every funding chain, so another chain cannot pay it again", async () => {
    const { deps, wallet, signTypedData } = relayrSetup();
    fakeRelayr(() => 100n);
    const prompts = reviewUi();
    wallet.adapter.sendTransaction.mockRejectedValueOnce(new Error("timeout"));
    await expect(
      runRelayrReviewed([CALL], { account: ACCOUNT, scope: "launch:2" }, deps),
    ).rejects.toThrow("timeout");
    await expect(
      runRelayrReviewed(
        [CALL],
        { account: ACCOUNT, scope: "launch:2", paymentChainId: 8453 },
        deps,
      ),
    ).rejects.toBeInstanceOf(WriteHeldError);
    expect(prompts).toHaveLength(1);
    expect(signTypedData).toHaveBeenCalledTimes(1);
  });

  it("pays one funding chain at a time for a scope, across concurrent runs", async () => {
    const { deps, wallet } = relayrSetup();
    fakeRelayr(() => 100n);
    reviewUi();
    let fail: (error: Error) => void = () => {};
    wallet.adapter.sendTransaction.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          fail = reject;
        }),
    );
    const action = { account: ACCOUNT, scope: "launch:3" };
    const outcome = (run: Promise<unknown>) =>
      run.then(
        () => "paid",
        (error: unknown) =>
          error instanceof WriteHeldError ? "held" : (error as Error).message,
      );
    const first = outcome(
      runRelayrReviewed([CALL], { ...action, paymentChainId: 10 }, deps),
    );
    // Another window's wallet, with its own network.
    let baseChain = 8453;
    const base = {
      ...deps,
      adapter: {
        ...deps.adapter,
        chainId: () => baseChain,
        switchChain: async (chainId: number) => {
          baseChain = chainId;
        },
      },
    };
    const second = outcome(
      runRelayrReviewed([CALL], { ...action, paymentChainId: 8453 }, base),
    );
    await vi.waitFor(() =>
      expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1),
    );
    fail(new Error("timeout"));
    // Whichever reserved first reached the wallet; the other was held.
    expect((await Promise.all([first, second])).sort()).toEqual([
      "held",
      "timeout",
    ]);
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);
  });

  it("re-quotes a quote that is offered already too close to its deadline", async () => {
    const { deps, wallet } = relayrSetup();
    const relayr = fakeRelayr(
      () => 100n,
      (quote) => (quote === 1 ? 10 : 600),
    );
    const prompts = reviewUi();
    const result = await runRelayrReviewed(
      [CALL],
      { account: ACCOUNT, scope: "action" },
      deps,
    );
    expect(prompts).toHaveLength(1);
    expect(result.uuid).toBe(relayr.posts[2].uuid);
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);
  });

  it("re-quotes when the quote lapses while the fresh review is open", async () => {
    const { deps, wallet } = relayrSetup();
    const relayr = fakeRelayr((from) => (from === ACCOUNT ? 2_000n : 1_000n));
    const real = Date.now();
    let now = real;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const prompts = reviewUi(async (prompt) => {
      if (prompts.length === 2) now = real + 590_000;
      return prompt.confirmation;
    });
    const result = await runRelayrReviewed(
      [CALL],
      { account: ACCOUNT, scope: "action" },
      deps,
    );
    expect(prompts).toHaveLength(2);
    const signed = relayr.posts.filter(({ from }) => from === ACCOUNT);
    expect(signed).toHaveLength(2);
    expect(result.uuid).toBe(signed[1].uuid);
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);
  });
});

describe("runRelayrReviewed raw calls and plans", () => {
  const RAW: RelayrReviewedCall = {
    chainId: 8453,
    target: OTHER,
    data: "0x12345678",
    gas: 400_000n,
    raw: true,
  };

  it("shows a raw call as sent by Relayr and posts it unsigned beside the signed one", async () => {
    const { deps, signTypedData } = relayrSetup();
    const relayr = fakeRelayr(() => 900n);
    const prompts = reviewUi();
    await runRelayrReviewed(
      [CALL, RAW],
      { account: ACCOUNT, scope: "raw" },
      deps,
    );
    expect(prompts).toHaveLength(1);
    expect(prompts[0].model.calls).toHaveLength(1);
    expect(prompts[0].model.calls[0]).toMatchObject({
      to: OTHER,
      label: "Sent by Relayr",
    });
    expect(prompts[0].model.signatures).toHaveLength(1);
    expect(signTypedData).toHaveBeenCalledTimes(1);
    const posted = relayr.posts[relayr.posts.length - 1].entries;
    expect(relayrForwardRequest(posted[0])?.to).toBe(TERMINAL);
    expect(posted[1]).toMatchObject({
      chain: 8453,
      target: OTHER,
      data: "0x12345678",
      value: "0",
    });
  });

  it("refuses a raw call that carries ETH before anything is asked", async () => {
    const { deps } = relayrSetup();
    const relayr = fakeRelayr(() => 900n);
    const prompts = reviewUi();
    await expect(
      runRelayrReviewed(
        [{ ...RAW, value: 1n }],
        { account: ACCOUNT, scope: "raw" },
        deps,
      ),
    ).rejects.toThrow("can't carry ETH");
    expect(prompts).toHaveLength(0);
    expect(relayr.posts).toHaveLength(0);
  });

  it("refuses a raw call changed after review, posting and paying nothing", async () => {
    const { deps, wallet } = relayrSetup();
    const relayr = fakeRelayr(() => 900n);
    const raw = { ...RAW };
    reviewUi(async (prompt) => {
      raw.data = "0x87654321";
      return prompt.confirmation;
    });
    await expect(
      runRelayrReviewed([raw], { account: ACCOUNT, scope: "raw" }, deps),
    ).rejects.toThrow("Transaction data changed after review");
    // Only the review's own stand-in quote was posted.
    expect(relayr.posts).toHaveLength(1);
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
  });

  it("under a plan, spends the planned calls without asking and reviews only the fee", async () => {
    const { deps, wallet } = relayrSetup();
    fakeRelayr(() => 900n);
    const prompts = reviewUi();
    const plan = await reviewPlan(
      {
        account: ACCOUNT,
        calls: [
          {
            chainId: CALL.chainId,
            to: CALL.target,
            data: CALL.data,
            gas: CALL.gas,
          },
          {
            chainId: RAW.chainId,
            to: RAW.target,
            data: RAW.data,
            from: "relayr",
          },
        ],
      },
      deps,
    );
    expect(prompts).toHaveLength(1);
    expect(prompts[0].model.calls[1].label).toBe("Sent by Relayr");
    // A forward request signing more gas than reviewed is refused.
    await expect(
      runRelayrReviewed(
        [{ ...CALL, gas: 900_000n }, RAW],
        { account: ACCOUNT, scope: "planned", plan },
        deps,
      ),
    ).rejects.toThrow(REVIEWED_PLAN_REFUSED_LINE);
    await runRelayrReviewed(
      [CALL, RAW],
      { account: ACCOUNT, scope: "planned", plan },
      deps,
    );
    expect(prompts).toHaveLength(2);
    expect(prompts[1].model.calls[0].functionName).toBe("prepayment");
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);
    await expect(
      runRelayrReviewed(
        [CALL],
        { account: ACCOUNT, scope: "again", plan },
        deps,
      ),
    ).rejects.toThrow(REVIEWED_PLAN_REFUSED_LINE);
  });
});

describe("payRelayrReviewed", () => {
  const quoteFor = (overrides: Record<string, unknown> = {}): RelayrQuote => {
    const uuid = UUIDS[0];
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
