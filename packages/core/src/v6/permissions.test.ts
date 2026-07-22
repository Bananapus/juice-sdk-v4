import { PublicClient, encodeFunctionData } from "viem";
import { describe, expect, test } from "vitest";
import { jbPermissionsAbi } from "../generated/juicebox.js";
import {
  JBPermissionCatalogV6,
  JBPermissionIdsV6,
  buildSetPermissionsTx,
  decodePermissionBitmap,
  encodePermissionBitmap,
  hasPermissions,
  permissionKeyV6,
} from "./permissions.js";
import { v6Address } from "./types.js";

const chainId = 11155111;
const account = "0x1111111111111111111111111111111111111111" as const;
const operator = "0x2222222222222222222222222222222222222222" as const;
const projectId = 3n;

describe("permissions", () => {
  test("JBPermissionIdsV6 transcribes all 39 ids contiguously", () => {
    const ids = Object.values(JBPermissionIdsV6);
    expect(ids.length).toEqual(39);
    expect(new Set(ids).size).toEqual(39);
    expect([...ids].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 39 }, (_, i) => i + 1),
    );
  });

  test("JBPermissionIdsV6 spot checks against JBPermissionIds.sol", () => {
    expect(JBPermissionIdsV6.ROOT).toEqual(1);
    expect(JBPermissionIdsV6.QUEUE_RULESETS).toEqual(2);
    expect(JBPermissionIdsV6.CASH_OUT_TOKENS).toEqual(4);
    expect(JBPermissionIdsV6.SIGN_FOR_ERC20).toEqual(23);
    expect(JBPermissionIdsV6.ADJUST_721_TIERS).toEqual(24);
    expect(JBPermissionIdsV6.SET_BUYBACK_HOOK).toEqual(30);
    expect(JBPermissionIdsV6.SET_ROUTER_TERMINAL).toEqual(31);
    expect(JBPermissionIdsV6.SET_SUCKER_DEPRECATION).toEqual(36);
    expect(JBPermissionIdsV6.REPAY_LOAN).toEqual(39);
  });

  test("catalog and bitmap codecs preserve canonical ids", () => {
    expect(JBPermissionCatalogV6[0]).toEqual({ key: "ROOT", id: 1 });
    expect(JBPermissionCatalogV6[JBPermissionCatalogV6.length - 1]).toEqual({
      key: "REPAY_LOAN",
      id: 39,
    });
    const ids = [
      JBPermissionIdsV6.QUEUE_RULESETS,
      JBPermissionIdsV6.ADJUST_721_TIERS,
      JBPermissionIdsV6.REPAY_LOAN,
    ];
    const bitmap = encodePermissionBitmap(ids);
    expect(decodePermissionBitmap(bitmap)).toEqual(ids);
    expect(permissionKeyV6(24)).toBe("ADJUST_721_TIERS");
    expect(permissionKeyV6(99)).toBeNull();
  });

  test("unknown bitmap bits are opt-in", () => {
    const bitmap = encodePermissionBitmap([1, 200]);
    expect(decodePermissionBitmap(bitmap)).toEqual([1]);
    expect(decodePermissionBitmap(bitmap, { includeUnknown: true })).toEqual([
      1, 200,
    ]);
    expect(() => encodePermissionBitmap([0])).toThrow(/Invalid/);
    expect(() => decodePermissionBitmap(-1n)).toThrow(/negative/);
  });

  test("buildSetPermissionsTx encodes setPermissionsFor", () => {
    const tx = buildSetPermissionsTx({
      chainId,
      account,
      operator,
      projectId,
      permissionIds: [
        JBPermissionIdsV6.QUEUE_RULESETS,
        JBPermissionIdsV6.SET_SPLIT_GROUPS,
      ],
    });

    expect(tx.chainId).toEqual(chainId);
    expect(tx.address).toEqual(v6Address("JBPermissions", chainId));
    expect(tx.functionName).toEqual("setPermissionsFor");
    expect(tx.args).toEqual([
      account,
      { operator, projectId, permissionIds: [2, 19] },
    ]);
    expect(() => encodeFunctionData(tx)).not.toThrow();
  });

  test("buildSetPermissionsTx with an empty array revokes everything", () => {
    const tx = buildSetPermissionsTx({
      chainId,
      account,
      operator,
      projectId,
      permissionIds: [],
    });

    expect(tx.args[1].permissionIds).toEqual([]);
    expect(() => encodeFunctionData(tx)).not.toThrow();
  });

  test("hasPermissions reads JBPermissions.hasPermissions", async () => {
    const calls: any[] = [];
    const client = {
      async readContract(params: unknown) {
        calls.push(params);
        return true;
      },
    } as unknown as PublicClient;

    const result = await hasPermissions(client, {
      chainId,
      operator,
      account,
      projectId,
      permissionIds: [JBPermissionIdsV6.MINT_TOKENS],
    });

    expect(result).toEqual(true);
    expect(calls[0].address).toEqual(v6Address("JBPermissions", chainId));
    expect(calls[0].abi).toBe(jbPermissionsAbi);
    expect(calls[0].functionName).toEqual("hasPermissions");
    // Ids are widened to uint256; root and wildcard-project grants count by default.
    expect(calls[0].args).toEqual([
      operator,
      account,
      projectId,
      [10n],
      true,
      true,
    ]);
  });

  test("hasPermissions can exclude root and wildcard grants", async () => {
    const calls: any[] = [];
    const client = {
      async readContract(params: unknown) {
        calls.push(params);
        return false;
      },
    } as unknown as PublicClient;

    await hasPermissions(client, {
      chainId,
      operator,
      account,
      projectId,
      permissionIds: [1, 2],
      includeRoot: false,
      includeWildcardProjectId: false,
    });

    expect(calls[0].args).toEqual([
      operator,
      account,
      projectId,
      [1n, 2n],
      false,
      false,
    ]);
  });
});
