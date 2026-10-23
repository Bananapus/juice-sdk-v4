import {
  encodeFunctionData,
  erc20Abi,
  zeroAddress,
  type Address,
  type Hex,
  type PublicClient,
  type TypedDataDefinition,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { encodeMultiSend, MULTI_SEND_CALL_ONLY } from "../safe.js";
import {
  ACCOUNT,
  OTHER,
  TERMINAL,
  action,
  payCall,
  resetReviewUi,
  reviewUi,
  setup,
} from "./__fixtures__/reviewedSend.js";
import {
  REVIEWED_PLAN_EXPIRED_LINE,
  REVIEWED_PLAN_REFUSED_LINE,
  REVIEWED_PLAN_TTL_MS,
  type ReviewedPlan,
} from "./plan.js";
import { reviewPlan, sendReviewed } from "./send.js";
import { signReviewed } from "./sign.js";
import type { WalletAdapter } from "./wallet.js";

afterEach(() => {
  resetReviewUi();
  vi.restoreAllMocks();
});

const SAFE = "0x5555555555555555555555555555555555555555" as Address;

describe("reviewPlan", () => {
  it("asks once over exactly the plan's calls, then sends a matching call with no prompt", async () => {
    const { deps, wallet } = setup();
    const prompts = reviewUi();
    const pay = payCall();
    const plan = await reviewPlan(
      { account: ACCOUNT, calls: [pay, payCall(9n)], title: "Pay twice" },
      deps,
    );
    expect(prompts).toHaveLength(1);
    expect(prompts[0].model.calls).toHaveLength(2);
    expect(prompts[0].model.calls[0]).toMatchObject({
      from: ACCOUNT,
      to: TERMINAL,
    });
    expect(Object.isFrozen(plan) && Object.isFrozen(plan.calls)).toBe(true);
    const result = await sendReviewed(action([pay], { plan }), deps);
    expect(prompts).toHaveLength(1);
    expect(result.status).toBe("done");
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);
  });

  it("refuses a call whose data, value or chain changed, and spends nothing for it", async () => {
    const { deps, wallet } = setup();
    const prompts = reviewUi();
    const pay = payCall();
    const plan = await reviewPlan({ account: ACCOUNT, calls: [pay] }, deps);
    for (const changed of [
      payCall(6n),
      { ...pay, value: 8n },
      { ...pay, chainId: 8453 },
    ])
      await expect(
        sendReviewed(action([changed], { plan }), deps),
      ).rejects.toThrow(REVIEWED_PLAN_REFUSED_LINE);
    // Another account, and a copy of the plan core never minted.
    await expect(
      sendReviewed(action([pay], { plan, account: OTHER }), deps),
    ).rejects.toThrow();
    await expect(
      sendReviewed(action([pay], { plan: { ...plan } }), deps),
    ).rejects.toThrow(REVIEWED_PLAN_REFUSED_LINE);
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
    await sendReviewed(action([pay], { plan }), deps);
    expect(prompts).toHaveLength(1);
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);
  });

  it("refuses a call spent once already", async () => {
    const { deps, wallet } = setup();
    reviewUi();
    const pay = payCall();
    const plan = await reviewPlan({ account: ACCOUNT, calls: [pay] }, deps);
    await sendReviewed(action([pay], { plan }), deps);
    await expect(sendReviewed(action([pay], { plan }), deps)).rejects.toThrow(
      REVIEWED_PLAN_REFUSED_LINE,
    );
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);
  });

  it("refuses an expired plan", async () => {
    const { deps, wallet } = setup();
    reviewUi();
    const pay = payCall();
    const plan = await reviewPlan({ account: ACCOUNT, calls: [pay] }, deps);
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now + REVIEWED_PLAN_TTL_MS + 1);
    await expect(sendReviewed(action([pay], { plan }), deps)).rejects.toThrow(
      REVIEWED_PLAN_EXPIRED_LINE,
    );
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
  });

  it("returns no plan when the review is declined", async () => {
    const { deps } = setup();
    reviewUi(async () => null);
    await expect(
      reviewPlan({ account: ACCOUNT, calls: [payCall()] }, deps),
    ).rejects.toThrow();
  });

  it("simulates each call as its own sender", async () => {
    const { deps, chain } = setup();
    reviewUi();
    await reviewPlan(
      { account: ACCOUNT, calls: [{ ...payCall(), from: SAFE }] },
      deps,
    );
    expect(chain.client.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "eth_call",
        params: [expect.objectContaining({ from: SAFE }), "latest"],
      }),
    );
  });
});

describe("signReviewed under a plan", () => {
  const signer = privateKeyToAccount(`0x${"11".repeat(32)}`);
  const transfer = (amount: bigint) => ({
    chainId: 10,
    to: TERMINAL,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [OTHER, amount],
    }),
    value: 0n,
  });
  const safeTx = (call: { to: Address; data: Hex }, extra = {}) => ({
    kind: "safe-tx" as const,
    chainId: 10,
    safe: SAFE,
    tx: {
      to: call.to,
      value: 0n,
      data: call.data,
      operation: 0,
      safeTxGas: 0n,
      baseGas: 0n,
      gasPrice: 0n,
      gasToken: zeroAddress,
      refundReceiver: zeroAddress,
      nonce: 3,
      ...extra,
    },
  });
  const adapter = {
    kind: "wallet",
    account: () => signer.address,
    chainId: () => 10,
    isSafe: () => false,
    switchChain: vi.fn(async () => {}),
    sendTransaction: vi.fn(async (): Promise<Hex> => {
      throw new Error("unused");
    }),
    signTypedData: vi.fn((typedData: TypedDataDefinition) =>
      signer.signTypedData(typedData),
    ),
    signMessage: vi.fn((message: string) => signer.signMessage({ message })),
  } satisfies WalletAdapter;
  const plannedFor = async (...calls: ReturnType<typeof transfer>[]) => {
    const { deps } = setup();
    return reviewPlan(
      {
        account: signer.address,
        calls: calls.map((call) => ({ ...call, from: SAFE })),
      },
      { clientFor: deps.clientFor as (id: number) => PublicClient },
    );
  };

  it("signs a Safe transaction of a planned call, or a MultiSend of planned calls, with no prompt", async () => {
    const prompts = reviewUi();
    const one = transfer(5n);
    const two = transfer(6n);
    const plan = await plannedFor(one, two, transfer(7n));
    const batch = {
      to: MULTI_SEND_CALL_ONLY,
      data: encodeMultiSend([
        { to: two.to, data: two.data, value: 0n },
        { to: TERMINAL, data: transfer(7n).data, value: 0n },
      ]),
    };
    await signReviewed(
      [safeTx(one)],
      { account: signer.address, plan },
      {
        adapter,
      },
    );
    await signReviewed(
      [safeTx(batch, { operation: 1 })],
      { account: signer.address, plan },
      { adapter },
    );
    expect(prompts).toHaveLength(1);
    expect(adapter.signTypedData).toHaveBeenCalledTimes(2);
  });

  it("refuses a Safe transaction with a refund, another Safe's, and a message", async () => {
    reviewUi();
    const one = transfer(5n);
    const plan: ReviewedPlan = await plannedFor(one);
    for (const signature of [
      safeTx(one, { gasPrice: 1n }),
      { ...safeTx(one), safe: OTHER },
      { kind: "message" as const, chainId: 10, message: "hi" },
    ])
      await expect(
        signReviewed(
          [signature],
          { account: signer.address, plan },
          {
            adapter,
          },
        ),
      ).rejects.toThrow(REVIEWED_PLAN_REFUSED_LINE);
    await signReviewed(
      [safeTx(one)],
      { account: signer.address, plan },
      {
        adapter,
      },
    );
  });
});
