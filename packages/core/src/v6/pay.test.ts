import {
  PublicClient,
  decodeAbiParameters,
  encodeFunctionData,
  sliceHex,
} from "viem";
import { describe, expect, test } from "vitest";
import { NATIVE_TOKEN } from "../constants.js";
import { jbMultiTerminalAbi } from "../generated/juicebox.js";
import { build721PayMetadata, buildPayTx, previewPay } from "./pay.js";

const chainId = 11155111;
const terminal = "0x1111111111111111111111111111111111111111" as const;
const projectId = 3n;
const beneficiary = "0x2222222222222222222222222222222222222222" as const;
const usdc = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as const;

describe("pay", () => {
  test("buildPayTx sets value for native token payments", () => {
    const tx = buildPayTx({
      chainId,
      terminal,
      projectId,
      token: NATIVE_TOKEN,
      amount: 1000n,
      beneficiary,
    });

    expect(tx.chainId).toEqual(chainId);
    expect(tx.address).toEqual(terminal);
    expect(tx.functionName).toEqual("pay");
    expect(tx.value).toEqual(1000n);
    expect(tx.args).toEqual([
      projectId,
      NATIVE_TOKEN,
      1000n,
      beneficiary,
      0n,
      "",
      "0x",
    ]);
    expect(() => encodeFunctionData(tx)).not.toThrow();
  });

  test("buildPayTx sets no value for ERC-20 payments", () => {
    const tx = buildPayTx({
      chainId,
      terminal,
      projectId,
      token: usdc,
      amount: 1000n,
      beneficiary,
      minReturnedTokens: 7n,
      memo: "gm",
      metadata: "0x1234",
    });

    expect(tx.value).toEqual(0n);
    expect(tx.args).toEqual([
      projectId,
      usdc,
      1000n,
      beneficiary,
      7n,
      "gm",
      "0x1234",
    ]);
    expect(() => encodeFunctionData(tx)).not.toThrow();
  });

  test("previewPay calls the terminal's previewPayFor", async () => {
    const calls: any[] = [];
    const client = {
      async readContract(params: unknown) {
        calls.push(params);
        return [{}, 100n, 25n, []];
      },
    } as unknown as PublicClient;

    const preview = await previewPay(client, {
      chainId,
      terminal,
      projectId,
      token: NATIVE_TOKEN,
      amount: 1000n,
      beneficiary,
    });

    expect(preview).toEqual({
      beneficiaryTokenCount: 100n,
      reservedTokenCount: 25n,
    });
    expect(calls[0].address).toEqual(terminal);
    expect(calls[0].abi).toBe(jbMultiTerminalAbi);
    expect(calls[0].functionName).toEqual("previewPayFor");
    expect(calls[0].args).toEqual([
      projectId,
      NATIVE_TOKEN,
      1000n,
      beneficiary,
      "0x",
    ]);
  });

  test("build721PayMetadata packs the hook's metadata id and tier payload", () => {
    // With a hook address whose first 4 bytes are zero, the metadata id is the first
    // 4 bytes of keccak256("pay").
    const metadata = build721PayMetadata({
      hookAddress: "0x00000000000000000000000000000000DeaDBeef",
      tierIdsToMint: [1n, 2n],
    });

    // Word 0 is the protocol's reserved word.
    expect(sliceHex(metadata, 0, 32)).toEqual(`0x${"00".repeat(32)}`);
    // The lookup table: the hook's metadata id, then the payload's word offset (2).
    expect(sliceHex(metadata, 32, 36)).toEqual("0xadc75680");
    expect(sliceHex(metadata, 36, 37)).toEqual("0x02");
    // The payload starts at word 2 and decodes to (allowOverspending, tierIdsToMint).
    const payload = sliceHex(metadata, 64);
    const [allowOverspending, tierIds] = decodeAbiParameters(
      [{ type: "bool" }, { type: "uint16[]" }],
      payload,
    );
    expect(allowOverspending).toEqual(true);
    expect(tierIds).toEqual([1, 2]);
  });

  test("build721PayMetadata respects allowOverspending false", () => {
    const metadata = build721PayMetadata({
      hookAddress: "0x00000000000000000000000000000000DeaDBeef",
      tierIdsToMint: [5n],
      allowOverspending: false,
    });

    const [allowOverspending, tierIds] = decodeAbiParameters(
      [{ type: "bool" }, { type: "uint16[]" }],
      sliceHex(metadata, 64),
    );
    expect(allowOverspending).toEqual(false);
    expect(tierIds).toEqual([5]);
  });

  test("build721PayMetadata id XORs the hook address with keccak256('pay')", () => {
    const metadata = build721PayMetadata({
      hookAddress: "0x1111111111111111111111111111111111111111",
      tierIdsToMint: [1n],
    });

    // 0xadc75680 (first 4 bytes of keccak256("pay")) XOR 0x11111111.
    expect(sliceHex(metadata, 32, 36)).toEqual("0xbcd64791");
  });

  test("build721PayMetadata metadataIdTarget matches the hookAddress alias", () => {
    const target = "0x1111111111111111111111111111111111111111" as const;
    expect(
      build721PayMetadata({ metadataIdTarget: target, tierIdsToMint: [1n] }),
    ).toEqual(build721PayMetadata({ hookAddress: target, tierIdsToMint: [1n] }));
  });

  test("build721PayMetadata throws when no target is given", () => {
    expect(() => build721PayMetadata({ tierIdsToMint: [1n] })).toThrow(
      /metadataIdTarget/,
    );
  });
});
