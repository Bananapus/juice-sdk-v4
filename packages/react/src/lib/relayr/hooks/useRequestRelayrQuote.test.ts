import { jbContractAddress } from "@bananapus/nana-sdk-core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useRequestRelayrQuote } from "./useRequestRelayrQuote";

const mocks = vi.hoisted(() => ({
  contextVersion: 6,
  mutationConfig: undefined as any,
}));

vi.mock("../../../contexts/JBContractContext/JBContractContext", () => ({
  useJBContractContext: () => ({ version: mocks.contextVersion }),
}));
vi.mock("wagmi/query", () => ({
  useMutation: (config: any) => {
    mocks.mutationConfig = config;
    return { mutateAsync: config.mutationFn };
  },
}));

describe("useRequestRelayrQuote", () => {
  beforeEach(() => {
    mocks.contextVersion = 6;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("posts only canonical forwarder targets and exact prepaid values", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ bundle_uuid: "bundle" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      useRequestRelayrQuote().mutateAsync([
        { chain: 1, data: "0x01", value: "0" },
        { chain: 10, data: "0x02", value: "42", version: 5 },
      ]),
    ).resolves.toEqual({ bundle_uuid: "bundle" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.relayr.ba5ed.com/v1/bundle/prepaid",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({
      transactions: [
        {
          chain: 1,
          data: "0x01",
          target: jbContractAddress[6].ERC2771Forwarder[1],
          value: "0",
        },
        {
          chain: 10,
          data: "0x02",
          target: jbContractAddress[5].ERC2771Forwarder[10],
          value: "42",
        },
      ],
      virtual_nonce_mode: "Disabled",
    });
  });

  test("surfaces Relayr errors without returning an unsafe partial quote", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: false, text: async () => "quote expired" }),
    );

    await expect(
      useRequestRelayrQuote().mutateAsync([
        { chain: 1, data: "0x01", value: "0" },
      ]),
    ).rejects.toThrow("quote expired");
  });
});
