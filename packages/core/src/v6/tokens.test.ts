import { PublicClient, encodeFunctionData, zeroAddress, zeroHash } from "viem";
import { describe, expect, test } from "vitest";
import { ONE_ETHER } from "../constants.js";
import { jbTokensAbi } from "../generated/juicebox.js";
import {
  buildBurnTokensTx,
  buildClaimTokensTx,
  buildDeployErc20Tx,
  buildMintTokensTx,
  buildTransferCreditsTx,
  getCreditBalance,
  getTokenAddress,
} from "./tokens.js";
import { v6Address } from "./types.js";

const chainId = 11155111;
const projectId = 3n;
const holder = "0x1111111111111111111111111111111111111111" as const;
const beneficiary = "0x2222222222222222222222222222222222222222" as const;

describe("tokens", () => {
  test("buildDeployErc20Tx encodes deployERC20For", () => {
    const tx = buildDeployErc20Tx({
      chainId,
      projectId,
      name: "Token",
      symbol: "TKN",
    });

    expect(tx.address).toEqual(v6Address("JBController", chainId));
    expect(tx.functionName).toEqual("deployERC20For");
    expect(tx.args).toEqual([projectId, "Token", "TKN", zeroHash]);
    expect(() => encodeFunctionData(tx)).not.toThrow();
  });

  test("buildDeployErc20Tx passes a custom salt through", () => {
    const salt = `0x${"11".repeat(32)}` as const;
    const tx = buildDeployErc20Tx({
      chainId,
      projectId,
      name: "Token",
      symbol: "TKN",
      salt,
    });

    expect(tx.args[3]).toEqual(salt);
  });

  test("buildClaimTokensTx encodes claimTokensFor", () => {
    const tx = buildClaimTokensTx({
      chainId,
      holder,
      projectId,
      tokenCount: ONE_ETHER,
      beneficiary,
    });

    expect(tx.address).toEqual(v6Address("JBController", chainId));
    expect(tx.functionName).toEqual("claimTokensFor");
    expect(tx.args).toEqual([holder, projectId, ONE_ETHER, beneficiary]);
    expect(() => encodeFunctionData(tx)).not.toThrow();
  });

  test("buildTransferCreditsTx encodes transferCreditsFrom", () => {
    const tx = buildTransferCreditsTx({
      chainId,
      holder,
      projectId,
      recipient: beneficiary,
      creditCount: ONE_ETHER,
    });

    expect(tx.address).toEqual(v6Address("JBController", chainId));
    expect(tx.functionName).toEqual("transferCreditsFrom");
    expect(tx.args).toEqual([holder, projectId, beneficiary, ONE_ETHER]);
    expect(() => encodeFunctionData(tx)).not.toThrow();
  });

  test("buildMintTokensTx encodes mintTokensOf with defaults", () => {
    const tx = buildMintTokensTx({
      chainId,
      projectId,
      tokenCount: ONE_ETHER,
      beneficiary,
    });

    expect(tx.address).toEqual(v6Address("JBController", chainId));
    expect(tx.functionName).toEqual("mintTokensOf");
    expect(tx.args).toEqual([projectId, ONE_ETHER, beneficiary, "", true]);
    expect(() => encodeFunctionData(tx)).not.toThrow();
  });

  test("buildMintTokensTx can skip the reserved percent", () => {
    const tx = buildMintTokensTx({
      chainId,
      projectId,
      tokenCount: ONE_ETHER,
      beneficiary,
      memo: "gm",
      useReservedPercent: false,
    });

    expect(tx.args).toEqual([projectId, ONE_ETHER, beneficiary, "gm", false]);
  });

  test("buildBurnTokensTx encodes burnTokensOf", () => {
    const tx = buildBurnTokensTx({
      chainId,
      holder,
      projectId,
      tokenCount: ONE_ETHER,
    });

    expect(tx.address).toEqual(v6Address("JBController", chainId));
    expect(tx.functionName).toEqual("burnTokensOf");
    expect(tx.args).toEqual([holder, projectId, ONE_ETHER, ""]);
    expect(() => encodeFunctionData(tx)).not.toThrow();
  });

  test("getTokenAddress returns null when no ERC-20 is deployed", async () => {
    const calls: any[] = [];
    const client = {
      async readContract(params: unknown) {
        calls.push(params);
        return zeroAddress;
      },
    } as unknown as PublicClient;

    const token = await getTokenAddress(client, { chainId, projectId });

    expect(token).toBeNull();
    expect(calls[0].address).toEqual(v6Address("JBTokens", chainId));
    expect(calls[0].abi).toBe(jbTokensAbi);
    expect(calls[0].functionName).toEqual("tokenOf");
    expect(calls[0].args).toEqual([projectId]);
  });

  test("getTokenAddress returns the deployed ERC-20", async () => {
    const erc20 = "0x3333333333333333333333333333333333333333";
    const client = {
      async readContract() {
        return erc20;
      },
    } as unknown as PublicClient;

    expect(await getTokenAddress(client, { chainId, projectId })).toEqual(
      erc20,
    );
  });

  test("getCreditBalance reads creditBalanceOf(holder, projectId)", async () => {
    const calls: any[] = [];
    const client = {
      async readContract(params: unknown) {
        calls.push(params);
        return 42n;
      },
    } as unknown as PublicClient;

    const balance = await getCreditBalance(client, {
      chainId,
      projectId,
      holder,
    });

    expect(balance).toEqual(42n);
    expect(calls[0].address).toEqual(v6Address("JBTokens", chainId));
    expect(calls[0].functionName).toEqual("creditBalanceOf");
    expect(calls[0].args).toEqual([holder, projectId]);
  });
});
