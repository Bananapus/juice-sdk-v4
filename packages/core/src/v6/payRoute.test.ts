import type { Address, PublicClient } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ prepare: vi.fn() }));
vi.mock("./pay.js", async (original) => ({
  ...(await original<typeof import("./pay.js")>()),
  prepareUserPay: mocks.prepare,
}));

import { PaySwapQuoteFailedError } from "./pay.js";
import { prepareBestUserPay } from "./payRoute.js";

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
});
