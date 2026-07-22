import { beforeEach, describe, expect, test, vi } from "vitest";
import { useChain } from "./useNetwork";

const mocks = vi.hoisted(() => ({
  accountChain: undefined as { id: number } | undefined,
  clientChain: undefined as { id: number } | undefined,
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({ chain: mocks.accountChain }),
  useClient: () =>
    mocks.clientChain ? { chain: mocks.clientChain } : undefined,
}));

describe("useChain", () => {
  beforeEach(() => {
    mocks.accountChain = undefined;
    mocks.clientChain = undefined;
  });

  test("prefers the connected wallet chain", () => {
    mocks.accountChain = { id: 10 };
    mocks.clientChain = { id: 1 };
    expect(useChain()?.id).toBe(10);
  });

  test("falls back to the public client and then undefined", () => {
    mocks.clientChain = { id: 1 };
    expect(useChain()?.id).toBe(1);
    mocks.clientChain = undefined;
    expect(useChain()).toBeUndefined();
  });
});
