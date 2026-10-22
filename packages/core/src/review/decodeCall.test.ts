import {
  encodeFunctionData,
  erc20Abi,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";
import { describe, expect, it } from "vitest";
import { jbContractAddress } from "../generated/addresses/jbContractAddress.js";
import { jbDirectoryAbi } from "../generated/abi/jbDirectoryAbi.js";
import { jbProjectsAbi } from "../generated/abi/jbProjectsAbi.js";
import { SAFE_EXEC_ABI } from "../safeService.js";
import { REVIEW_REQUESTS } from "./__fixtures__/review-requests.js";
import { decodeReviewCall } from "./decodeCall.js";
import { buildReviewModel } from "./model.js";

const BASE = 8453;
const BOB = "0x2222222222222222222222222222222222222222" as Address;
const UNKNOWN = "0x4444444444444444444444444444444444444444" as Address;
const PROJECTS = (
  jbContractAddress["6"] as unknown as Record<string, Record<number, Address>>
).JBProjects[BASE];

const approveData = encodeFunctionData({
  abi: erc20Abi,
  functionName: "approve",
  args: [BOB, 5n],
});

describe("decodeReviewCall", () => {
  it("decodes raw calldata to a known V6 contract by its address ABI", () => {
    const [pay] = REVIEW_REQUESTS["pay with 721 metadata"].calls;
    const { chainId, to, data, value, from } = pay;
    const decoded = decodeReviewCall({ chainId, to, data, value, from });
    expect(decoded.functionName).toBe("pay");
    expect(decoded).toMatchObject({ value: pay.value, from: pay.from });
    const { label: _label, ...unlabeled } = pay;
    const withAbi = buildReviewModel({ calls: [unlabeled] });
    expect(buildReviewModel({ calls: [decoded] })).toEqual(withAbi);

    // The gas a wallet or Safe signs stays bound.
    const signed = { ...unlabeled, gas: 400_000n, safeTxGas: 1n };
    const { gas, safeTxGas } = signed;
    expect(
      buildReviewModel({
        calls: [
          decodeReviewCall({ chainId, to, data, value, from, gas, safeTxGas }),
        ],
      }).id,
    ).toBe(buildReviewModel({ calls: [signed] }).id);
  });

  it("decodes an ERC-20 approve to an unknown address by selector", () => {
    const decoded = decodeReviewCall({
      chainId: 1,
      to: UNKNOWN,
      data: approveData,
    });
    expect(decoded).toMatchObject({
      functionName: "approve",
      args: [BOB, 5n],
    });
    expect(decoded).not.toHaveProperty("value");
    const [model] = buildReviewModel({ calls: [decoded] }).calls;
    expect(model.roles).toEqual([
      { role: "spender", address: BOB, name: null },
    ]);
    expect(model.args!.map((argument) => argument.name)).toEqual([
      "spender",
      "amount",
    ]);
  });

  it("prefers the ABI of the contract at that address when a selector is shared", () => {
    const decoded = decodeReviewCall({
      chainId: BASE,
      to: PROJECTS,
      data: approveData,
    });
    expect(decoded.functionName).toBe("approve");
    const [model] = buildReviewModel({ calls: [decoded] }).calls;
    // JBProjects is ERC-721: the second argument is a token ID, not an amount.
    expect(model.contractName).toBe("JBProjects");
    expect(model.args!.map((argument) => argument.name)).toEqual([
      "to",
      "tokenId",
    ]);
    expect(model.tokenAmounts).toEqual([]);
    expect(model.nft).toEqual({ token: PROJECTS, tokenId: 5n });
    expect(model.roles).toEqual([
      { role: "spender", address: BOB, name: null },
    ]);
    expect(model.warnings.map((warning) => warning.code)).toEqual([
      "permission-grant",
    ]);
    expect(decoded.abi).toEqual([
      jbProjectsAbi.find(
        (item) => item.type === "function" && item.name === "approve",
      ),
    ]);
  });

  it("keeps a selector the known contract's ABI lacks raw", () => {
    const transfer = encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [BOB, 5n],
    });
    expect(
      decodeReviewCall({ chainId: BASE, to: PROJECTS, data: transfer }),
    ).toEqual({ chainId: BASE, to: PROJECTS, data: transfer });
  });

  it("decodes a controller change and a Safe DELEGATECALL with their warnings", () => {
    const v6 = jbContractAddress["6"] as unknown as Record<
      string,
      Record<number, Address>
    >;
    const controllerChange = decodeReviewCall({
      chainId: BASE,
      to: v6.JBDirectory[BASE],
      data: encodeFunctionData({
        abi: jbDirectoryAbi,
        functionName: "setControllerOf",
        args: [4n, UNKNOWN],
      }),
    });
    const execution = decodeReviewCall({
      chainId: BASE,
      to: UNKNOWN,
      data: encodeFunctionData({
        abi: SAFE_EXEC_ABI,
        functionName: "execTransaction",
        args: [
          UNKNOWN,
          0n,
          "0x",
          1,
          0n,
          0n,
          0n,
          zeroAddress,
          zeroAddress,
          "0x",
        ],
      }),
    });
    const [directory, safe] = buildReviewModel({
      calls: [controllerChange, execution],
    }).calls;
    expect(directory.warnings.map((warning) => warning.code)).toEqual([
      "owner-action",
    ]);
    expect(safe.warnings.map((warning) => warning.code)).toEqual([
      "delegatecall",
      "unknown-contract",
    ]);
  });

  it("leaves an unknown selector undecoded, shown raw with abi-unavailable", () => {
    for (const data of ["0xdeadbeef", "0x", "0x1234"] as Hex[]) {
      const decoded = decodeReviewCall({ chainId: 1, to: UNKNOWN, data });
      expect(decoded).toEqual({ chainId: 1, to: UNKNOWN, data });
      const [model] = buildReviewModel({ calls: [decoded] }).calls;
      expect(model.warnings.map((warning) => warning.code)).toContain(
        "abi-unavailable",
      );
    }
  });

  it("rejects a selector match whose re-encoding differs from data", () => {
    const dirtyAddress =
      `${approveData.slice(0, 10)}ff${approveData.slice(12)}` as Hex;
    const trailing = `${approveData}00` as Hex;
    for (const data of [dirtyAddress, trailing]) {
      for (const to of [UNKNOWN, PROJECTS]) {
        expect(decodeReviewCall({ chainId: BASE, to, data })).toEqual({
          chainId: BASE,
          to,
          data,
        });
      }
    }
  });
});
