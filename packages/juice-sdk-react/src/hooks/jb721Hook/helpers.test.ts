import { describe, expect, test } from "vitest";
import { createMetadataTargetIdPayHash } from "./helpers";

describe("createMetadataTargetIdPayHash", () => {
  test("should work", () => {
    const mockAddress = "0x823b92d6a4b2AED4b15675c7917c9f922ea8ADAD";
    const fn = "pay";
    const expected = "0x2ffcc456";

    const result = createMetadataTargetIdPayHash(mockAddress, fn);
    expect(result).toEqual(expected);
  });
});
