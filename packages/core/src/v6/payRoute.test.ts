import {
  BaseError,
  ContractFunctionRevertedError,
  type Address,
  type PublicClient,
} from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ prepare: vi.fn() }));
vi.mock("./pay.js", async (original) => ({
  ...(await original<typeof import("./pay.js")>()),
  prepareUserPay: mocks.prepare,
}));

import { PaySwapQuoteFailedError } from "./pay.js";
import { isExecutionRevert, prepareBestUserPay } from "./payRoute.js";

const MULTI = "0x00000000000000000000000000000000000000a1" as Address;
const ROUTER = "0x00000000000000000000000000000000000000b2" as Address;
const client = {} as PublicClient;
const args = {
  chainId: 8453 as const,
  projectId: 9n,
  token: "0x000000000000000000000000000000000000EEEe" as Address,
  amount: 10n ** 18n,
  beneficiary: "0x1111111111111111111111111111111111111111" as Address,
  candidates: [
    { terminal: ROUTER, type: "router" as const },
    { terminal: MULTI, type: "multi" as const },
  ],
};
const quote = (beneficiaryTokenCount: bigint, reservedTokenCount = 0n) => ({
  preview: { beneficiaryTokenCount, reservedTokenCount },
  minReturnedTokens: beneficiaryTokenCount,
});
/** What each terminal answers; an Error stands for a failed preparation. */
const answers = (byTerminal: Record<string, unknown>) =>
  mocks.prepare.mockImplementation(async (_client, { terminal }) => {
    const answer = byTerminal[terminal as string];
    if (answer instanceof Error) throw answer;
    return answer;
  });

beforeEach(() => {
  mocks.prepare.mockReset();
});

describe("prepareBestUserPay", () => {
  it("keeps the terminal that gives the beneficiary more tokens", async () => {
    answers({ [MULTI]: quote(100n), [ROUTER]: quote(120n) });
    expect(await prepareBestUserPay(client, args)).toMatchObject({
      terminal: ROUTER,
      type: "router",
      minReturnedTokens: 120n,
    });
    answers({ [MULTI]: quote(130n), [ROUTER]: quote(120n) });
    expect((await prepareBestUserPay(client, args))?.terminal).toBe(MULTI);
  });

  it("breaks a tie by total issuance, then by the direct terminal", async () => {
    answers({ [MULTI]: quote(100n, 5n), [ROUTER]: quote(100n, 9n) });
    expect((await prepareBestUserPay(client, args))?.terminal).toBe(ROUTER);
    answers({ [MULTI]: quote(100n, 9n), [ROUTER]: quote(100n, 9n) });
    expect((await prepareBestUserPay(client, args))?.terminal).toBe(MULTI);
  });

  it("skips a terminal that cannot prepare the payment", async () => {
    answers({ [MULTI]: quote(100n), [ROUTER]: new Error("no route") });
    expect((await prepareBestUserPay(client, args))?.terminal).toBe(MULTI);
  });

  it("returns null when none can, and throws a failed swap quote instead", async () => {
    answers({
      [MULTI]: new Error("no context"),
      [ROUTER]: new Error("no route"),
    });
    expect(await prepareBestUserPay(client, args)).toBeNull();
    const failed = Object.create(PaySwapQuoteFailedError.prototype) as Error;
    answers({ [MULTI]: new Error("no context"), [ROUTER]: failed });
    await expect(prepareBestUserPay(client, args)).rejects.toBe(failed);
  });

  it("prepares each candidate on its own terminal with the payer's settings", async () => {
    answers({ [MULTI]: quote(1n), [ROUTER]: quote(1n) });
    await prepareBestUserPay(client, { ...args, slippageBps: 250n });
    expect(mocks.prepare.mock.calls.map((call) => call[1])).toEqual([
      expect.objectContaining({
        terminal: ROUTER,
        slippageBps: 250n,
        projectId: 9n,
      }),
      expect.objectContaining({
        terminal: MULTI,
        slippageBps: 250n,
        projectId: 9n,
      }),
    ]);
    expect(mocks.prepare.mock.calls[0][1]).not.toHaveProperty("candidates");
  });

  it("breaks an equal preview by the larger guaranteed minimum", async () => {
    answers({
      [ROUTER]: { ...quote(900n), minReturnedTokens: 97n },
      [MULTI]: { ...quote(900n), minReturnedTokens: 47n },
    });
    await expect(prepareBestUserPay(client, args)).resolves.toMatchObject({
      terminal: ROUTER,
      minReturnedTokens: 97n,
    });
  });

  describe("with simulateFrom", () => {
    const PAYER = "0x2222222222222222222222222222222222222222" as Address;
    const reverted = () =>
      new BaseError("call failed", {
        cause: new ContractFunctionRevertedError({
          abi: [],
          data: "0x",
          functionName: "pay",
        }),
      });
    /** A node's own failure (JSON-RPC -32603), which viem also words as a revert. */
    const nodeFailed = () =>
      new BaseError("call failed", {
        cause: new ContractFunctionRevertedError({
          abi: [],
          functionName: "pay",
          message: "Internal error",
        }),
      });
    /** What running each terminal's payment returns; an Error is thrown. */
    const runs = (byTerminal: Record<string, unknown>) =>
      ({
        simulateContract: vi.fn(async ({ address }: { address: Address }) => {
          const run = byTerminal[address];
          if (run instanceof Error) throw run;
          return { result: run };
        }),
      }) as unknown as PublicClient & {
        simulateContract: ReturnType<typeof vi.fn>;
      };

    it("picks by what each payment delivers when run, over the previews", async () => {
      answers({ [MULTI]: quote(100n), [ROUTER]: quote(120n) });
      const chain = runs({ [MULTI]: 100n, [ROUTER]: 90n });
      await expect(
        prepareBestUserPay(chain, { ...args, simulateFrom: PAYER }),
      ).resolves.toMatchObject({ terminal: MULTI, simulatedTokenCount: 100n });
      expect(chain.simulateContract.mock.calls[0][0]).toMatchObject({
        account: PAYER,
        value: args.amount,
        functionName: "pay",
        stateOverride: [
          { address: PAYER, balance: args.amount * 2n + 10n ** 18n },
        ],
      });
      expect(mocks.prepare.mock.calls[0][1]).not.toHaveProperty("simulateFrom");
    });

    it("drops a route whose payment reverts when another runs", async () => {
      answers({ [MULTI]: quote(100n), [ROUTER]: quote(120n) });
      await expect(
        prepareBestUserPay(runs({ [MULTI]: 100n, [ROUTER]: reverted() }), {
          ...args,
          simulateFrom: PAYER,
        }),
      ).resolves.toMatchObject({ terminal: MULTI, simulatedTokenCount: 100n });
    });

    it("never drops a route for a node failure worded as a revert", async () => {
      answers({ [MULTI]: quote(100n), [ROUTER]: quote(120n) });
      const picked = await prepareBestUserPay(
        runs({ [MULTI]: 100n, [ROUTER]: nodeFailed() }),
        { ...args, simulateFrom: PAYER },
      );
      expect(picked).toMatchObject({ terminal: ROUTER });
      expect(picked).not.toHaveProperty("simulatedTokenCount");
      // A node that reports an empty revert without data (code 3, "execution reverted").
      const bare = new BaseError("call failed", {
        cause: new ContractFunctionRevertedError({
          abi: [],
          functionName: "pay",
          message: "execution reverted",
        }),
      });
      expect(isExecutionRevert(bare)).toBe(true);
      expect(isExecutionRevert(new BaseError("execution reverted"))).toBe(
        false,
      );
      expect(isExecutionRevert(nodeFailed())).toBe(false);
      expect(isExecutionRevert(reverted())).toBe(true);
    });

    it("lets the previews decide when a route cannot be run, or every one reverts", async () => {
      answers({ [MULTI]: quote(100n), [ROUTER]: quote(120n) });
      const unknown = await prepareBestUserPay(
        runs({ [MULTI]: 100n, [ROUTER]: new Error("no overrides") }),
        { ...args, simulateFrom: PAYER },
      );
      expect(unknown).toMatchObject({ terminal: ROUTER });
      expect(unknown).not.toHaveProperty("simulatedTokenCount");
      // A reverting route is dropped even when the other could not be run.
      await expect(
        prepareBestUserPay(
          runs({ [MULTI]: new Error("no overrides"), [ROUTER]: reverted() }),
          { ...args, simulateFrom: PAYER },
        ),
      ).resolves.toMatchObject({ terminal: MULTI });
      const none = await prepareBestUserPay(
        runs({ [MULTI]: reverted(), [ROUTER]: reverted() }),
        { ...args, simulateFrom: PAYER },
      );
      expect(none).toMatchObject({ terminal: ROUTER });
    });

    it("runs nothing for an ERC-20 payment or a single candidate", async () => {
      answers({ [MULTI]: quote(100n), [ROUTER]: quote(120n) });
      const chain = runs({});
      await prepareBestUserPay(chain, {
        ...args,
        token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        simulateFrom: PAYER,
      });
      await prepareBestUserPay(chain, {
        ...args,
        candidates: [args.candidates[1]],
        simulateFrom: PAYER,
      });
      expect(chain.simulateContract).not.toHaveBeenCalled();
    });
  });
});
