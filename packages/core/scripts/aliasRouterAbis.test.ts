import { describe, expect, it } from "vitest";
import { aliasRouterAbis } from "./aliasRouterAbis.js";

const abi = `[
  { type: 'event', name: 'Example', inputs: [{ name: 'token', type: 'address', indexed: true, internalType: 'address' }] },
] as const`;
const declaration = (name: string, value = abi) =>
  `export const ${name} = ${value}`;
const alias = (name: string) => `export { jbRouterTerminalAbi as ${name} }`;

describe("historical router ABI aliases", () => {
  it("shares exact copies while preserving other exports and repeated generation", () => {
    const source = [
      declaration("jbRouterTerminalAbi"),
      declaration("jbRouterTerminalPreviousAbi"),
      declaration("jbRouterTerminalV1Abi"),
      declaration("unrelatedAbi"),
    ].join("\n\n");
    const output = aliasRouterAbis(source);

    expect(output).toBe(
      [
        declaration("jbRouterTerminalAbi"),
        alias("jbRouterTerminalPreviousAbi"),
        alias("jbRouterTerminalV1Abi"),
        declaration("unrelatedAbi"),
      ].join("\n\n"),
    );
    expect(aliasRouterAbis(output)).toBe(output);
  });

  it.each([
    ["indexed: true", "indexed: false"],
    ["type: 'address'", "type: 'uint256'"],
    ["internalType: 'address'", "internalType: 'contract IExample'"],
  ])("retains a historical ABI whose %s changes", (before, after) => {
    const historical = declaration(
      "jbRouterTerminalPreviousAbi",
      abi.replace(before, after),
    );
    const output = aliasRouterAbis(
      [
        declaration("jbRouterTerminalAbi"),
        historical,
        declaration("jbRouterTerminalV1Abi"),
      ].join("\n\n"),
    );

    expect(output).toContain(historical);
    expect(output).toContain(alias("jbRouterTerminalV1Abi"));
    expect(output).not.toContain(alias("jbRouterTerminalPreviousAbi"));
  });
});
