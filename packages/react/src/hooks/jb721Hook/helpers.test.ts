import { describe, expect, test } from "vitest";
import { createMetadataTargetIdPayHash } from "./helpers";
import { hookMetadataId } from "@bananapus/nana-sdk-core";

describe("createMetadataTargetIdPayHash", () => {
  test("matches the contract-derived pay metadata id vector", () => {
    const mockAddress = "0x823b92d6a4b2AED4b15675c7917c9f922ea8ADAD";
    const fn = "pay";
    const expected = "0x2ffcc456";

    const result = createMetadataTargetIdPayHash(mockAddress, fn);
    expect(result).toEqual(expected);
  });

  test.each([
    "0x0000000000000000000000000000000000000000",
    "0x1111111111111111111111111111111111111111",
    "0xffffffffffffffffffffffffffffffffffffffff",
  ] as const)(
    "stays in parity with core's JBMetadataResolver implementation for %s",
    (target) => {
      expect(createMetadataTargetIdPayHash(target)).toBe(
        hookMetadataId(target, "pay"),
      );
      expect(createMetadataTargetIdPayHash(target, "cashOut")).toBe(
        hookMetadataId(target, "cashOut"),
      );
    },
  );

  test("different purposes cannot alias on the pinned target", () => {
    const target = "0x823b92d6a4b2AED4b15675c7917c9f922ea8ADAD";
    expect(createMetadataTargetIdPayHash(target, "pay")).not.toBe(
      createMetadataTargetIdPayHash(target, "cashOut"),
    );
  });
});
