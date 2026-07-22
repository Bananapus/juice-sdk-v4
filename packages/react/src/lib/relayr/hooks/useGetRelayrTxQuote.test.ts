import { beforeEach, describe, expect, test, vi } from "vitest";
import { useGetRelayrTxQuote } from "./useGetRelayrTxQuote";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  sign: vi.fn(),
}));

vi.mock("./useRequestRelayrQuote", () => ({
  useRequestRelayrQuote: () => ({
    mutateAsync: mocks.mutateAsync,
    status: "idle",
  }),
}));
vi.mock("./useSignErc2771ForwardRequest", () => ({
  useSignErc2771ForwardRequest: () => ({ sign: mocks.sign }),
}));

const from = "0x1111111111111111111111111111111111111111" as const;
const to = "0x2222222222222222222222222222222222222222" as const;

describe("useGetRelayrTxQuote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sign
      .mockResolvedValueOnce("0xsigned1")
      .mockResolvedValueOnce("0xsigned2");
    mocks.mutateAsync.mockResolvedValue({ bundle_uuid: "bundle" });
  });

  test("signs each chain and preserves value and version in the quote request", async () => {
    const requests = [
      {
        chainId: 1 as const,
        data: { from, to, value: 0n, gas: 10n, data: "0x01" as const },
      },
      {
        chainId: 10 as const,
        version: 5 as const,
        data: { from, to, value: 42n, gas: 20n, data: "0x02" as const },
      },
    ];

    await expect(
      useGetRelayrTxQuote().getRelayrTxQuote(requests),
    ).resolves.toEqual({
      bundle_uuid: "bundle",
    });

    expect(mocks.sign.mock.calls).toEqual([
      [requests[0].data, 1, undefined],
      [requests[1].data, 10, 5],
    ]);
    expect(mocks.mutateAsync).toHaveBeenCalledWith([
      { chain: 1, data: "0xsigned1", value: "0", version: undefined },
      { chain: 10, data: "0xsigned2", value: "42", version: 5 },
    ]);
  });

  test("does not request a quote when any authorization fails", async () => {
    mocks.sign.mockReset().mockRejectedValue(new Error("Signature rejected"));

    await expect(
      useGetRelayrTxQuote().getRelayrTxQuote([
        { chainId: 1, data: { from, to, value: 0n, gas: 10n, data: "0x01" } },
      ]),
    ).rejects.toThrow("Signature rejected");
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });

  test("rejects empty and duplicate-nonce bundles before signing", async () => {
    await expect(useGetRelayrTxQuote().getRelayrTxQuote([])).rejects.toThrow(
      "no Relayr calls",
    );
    await expect(
      useGetRelayrTxQuote().getRelayrTxQuote([
        { chainId: 1, data: { from, to, value: 0n, gas: 10n, data: "0x01" } },
        { chainId: 1, data: { from, to, value: 0n, gas: 20n, data: "0x02" } },
      ]),
    ).rejects.toThrow("only one forward request per account and chain");
    expect(mocks.sign).not.toHaveBeenCalled();
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });
});
