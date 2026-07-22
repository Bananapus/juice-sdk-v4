import {
  DEFAULT_ALLOW_OVERSPENDING,
  createHookMetadata,
} from "@bananapus/nana-sdk-core";
import { encodeAbiParameters } from "viem";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { usePreparePayMetadata } from "./usePreparePayMetadata";

const mocks = vi.hoisted(() => ({
  metadataId: undefined as string | undefined,
}));

vi.mock("./jb721Hook/use721HookMetadataId", () => ({
  use721HookMetadataId: () => mocks.metadataId,
}));

describe("usePreparePayMetadata", () => {
  beforeEach(() => {
    mocks.metadataId = "0x12345678";
  });

  test("returns no metadata when no 721 hook is active", () => {
    expect(usePreparePayMetadata()).toBeNull();
  });

  test("returns no metadata for an empty mint or unresolved hook id", () => {
    const hook = {
      dataHookAddress: "0x1111111111111111111111111111111111111111" as const,
      tierIdsToMint: [] as bigint[],
    };
    expect(usePreparePayMetadata({ jb721Hook: hook })).toBeNull();

    mocks.metadataId = undefined;
    expect(
      usePreparePayMetadata({ jb721Hook: { ...hook, tierIdsToMint: [1n] } }),
    ).toBeNull();
  });

  test("matches the core metadata envelope and contract uint16 tier encoding", () => {
    const tierIdsToMint = [1n, 42n, 65_535n];
    const hookMetadata = encodeAbiParameters(
      [{ type: "bool" }, { type: "uint16[]" }],
      [DEFAULT_ALLOW_OVERSPENDING, tierIdsToMint.map(Number)],
    );

    expect(
      usePreparePayMetadata({
        jb721Hook: {
          dataHookAddress: "0x1111111111111111111111111111111111111111",
          tierIdsToMint,
        },
      }),
    ).toBe(createHookMetadata([mocks.metadataId!], [hookMetadata]));
  });
});
