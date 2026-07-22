import { beforeEach, describe, expect, test, vi } from "vitest";
import { type ChainPayment } from "../types";
import { useSendRelayrTx } from "./useSendRelayrTx";

const mocks = vi.hoisted(() => ({
  chainId: 1,
  sendTransactionAsync: vi.fn(),
  switchChainAsync: vi.fn(),
  transactionState: {
    data: "0xsubmitted",
    error: null,
    isPending: false,
    isSuccess: true,
  },
}));

vi.mock("react", () => ({
  useCallback: (callback: unknown) => callback,
}));

vi.mock("wagmi", () => ({
  useChainId: () => mocks.chainId,
  useSendTransaction: () => ({
    ...mocks.transactionState,
    sendTransactionAsync: mocks.sendTransactionAsync,
  }),
  useSwitchChain: () => ({ switchChainAsync: mocks.switchChainAsync }),
}));

const payment: ChainPayment = {
  amount: "0x2a",
  calldata: "0xabcdef",
  chain: 1,
  payment_deadline: "1767225600",
  target: "0x1111111111111111111111111111111111111111",
  token: "0x0000000000000000000000000000000000000000",
};

describe("useSendRelayrTx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.chainId = 1;
    mocks.sendTransactionAsync.mockResolvedValue("0xsubmitted");
    mocks.switchChainAsync.mockResolvedValue(undefined);
  });

  test("submits Relayr's exact target, calldata, and payment value", async () => {
    const relayr = useSendRelayrTx();

    await expect(relayr.sendRelayrTx(payment)).resolves.toBe("0xsubmitted");

    expect(mocks.switchChainAsync).not.toHaveBeenCalled();
    expect(mocks.sendTransactionAsync).toHaveBeenCalledWith({
      chainId: 1,
      data: "0xabcdef",
      to: "0x1111111111111111111111111111111111111111",
      value: 42n,
    });
    expect(relayr).toMatchObject({
      data: "0xsubmitted",
      error: null,
      isPending: false,
      isSuccess: true,
    });
  });

  test("switches to the quoted chain before submitting", async () => {
    mocks.chainId = 10;

    await useSendRelayrTx().sendRelayrTx(payment);

    expect(mocks.switchChainAsync).toHaveBeenCalledWith({ chainId: 1 });
    expect(mocks.switchChainAsync.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.sendTransactionAsync.mock.invocationCallOrder[0],
    );
    expect(mocks.sendTransactionAsync).toHaveBeenCalledWith(
      expect.objectContaining({ chainId: payment.chain }),
    );
  });

  test("stops submission and reports a normalized chain-switch failure", async () => {
    const switchError = new Error("wallet refused");
    mocks.chainId = 10;
    mocks.switchChainAsync.mockRejectedValue(switchError);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await expect(useSendRelayrTx().sendRelayrTx(payment)).rejects.toThrow(
      "Failed to switch to correct chain",
    );

    expect(consoleError).toHaveBeenCalledWith(switchError);
    expect(mocks.sendTransactionAsync).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  test("propagates wallet submission failures", async () => {
    mocks.sendTransactionAsync.mockRejectedValue(new Error("User rejected"));

    await expect(useSendRelayrTx().sendRelayrTx(payment)).rejects.toThrow(
      "User rejected",
    );
  });
});
