import { jb721TiersHookAbi } from "@bananapus/nana-sdk-core";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createMetadataTargetIdPayHash } from "./helpers";
import { use721HookMetadataId } from "./use721HookMetadataId";

const mocks = vi.hoisted(() => ({ readContract: vi.fn() }));

vi.mock("wagmi", () => ({ useReadContract: mocks.readContract }));
vi.mock("../../contexts/JBChainContext/JBChainContext", () => ({
  useJBChainId: () => 10,
}));

const hook = "0x1111111111111111111111111111111111111111" as const;

describe("use721HookMetadataId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readContract.mockImplementation((config) => ({
      data: config.query.enabled
        ? config.query.select("0x12345678")
        : undefined,
    }));
  });

  test("hashes the hook target for the pay metadata namespace", () => {
    expect(use721HookMetadataId({ dataHookAddress: hook })).toBe(
      createMetadataTargetIdPayHash("0x12345678", "pay"),
    );
    expect(mocks.readContract.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        abi: jb721TiersHookAbi,
        functionName: "METADATA_ID_TARGET",
        chainId: 10,
        address: hook,
        query: expect.objectContaining({ enabled: true }),
      }),
    );
  });

  test("disables the read until a hook address is known", () => {
    expect(
      use721HookMetadataId({ dataHookAddress: undefined }),
    ).toBeUndefined();
    expect(mocks.readContract.mock.calls[0][0].query.enabled).toBe(false);
  });
});
