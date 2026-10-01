import { Address, PublicClient } from "viem";
import { jbPermissionsAbi } from "../generated/juicebox.js";
import type { JBChainId } from "../types.js";
import {
  JBPermissionIdsV6,
  type JBPermissionIdV6,
  type JBPermissionKeyV6,
} from "./permissionIds.js";
import { v6Address } from "./types.js";

export {
  JBPermissionIdsV6,
  permissionKeyV6,
  type JBPermissionIdV6,
  type JBPermissionKeyV6,
} from "./permissionIds.js";

/** Canonical permission names and ids, sorted by id. */
export const JBPermissionCatalogV6: readonly {
  key: JBPermissionKeyV6;
  id: JBPermissionIdV6;
}[] = (
  Object.entries(JBPermissionIdsV6) as [JBPermissionKeyV6, JBPermissionIdV6][]
)
  .map(([key, id]) => ({ key, id }))
  .sort((a, b) => a.id - b.id);

/**
 * Decode `JBPermissions.permissionsOf`'s packed bitmap into ascending ids.
 *
 * By default only ids known to this SDK release are returned. Pass
 * `includeUnknown: true` to preserve set bits from future permission-id
 * releases as well.
 */
export function decodePermissionBitmap(
  bitmap: bigint,
  { includeUnknown = false }: { includeUnknown?: boolean } = {},
): number[] {
  if (bitmap < 0n) throw new Error("A permission bitmap cannot be negative.");
  const ids: number[] = [];
  const maxId = includeUnknown
    ? 255
    : (JBPermissionCatalogV6[JBPermissionCatalogV6.length - 1]?.id ?? 0);
  for (let id = 1; id <= maxId; id++) {
    if (((bitmap >> BigInt(id)) & 1n) === 1n) ids.push(id);
  }
  return ids;
}

/** Encode permission ids into the packed bitmap returned by `permissionsOf`. */
export function encodePermissionBitmap(
  permissionIds: readonly number[],
): bigint {
  let bitmap = 0n;
  for (const id of permissionIds) {
    if (!Number.isInteger(id) || id < 1 || id > 255) {
      throw new Error(`Invalid permission id: ${id}.`);
    }
    bitmap |= 1n << BigInt(id);
  }
  return bitmap;
}

/**
 * A prepared `setPermissionsFor` transaction request.
 */
export interface V6SetPermissionsTxRequest {
  chainId: JBChainId;
  address: Address;
  abi: typeof jbPermissionsAbi;
  functionName: "setPermissionsFor";
  args: readonly [
    Address,
    { operator: Address; projectId: bigint; permissionIds: number[] },
  ];
}

/**
 * Build a `JBPermissions.setPermissionsFor(account, { operator, projectId,
 * permissionIds })` transaction request.
 *
 * Replaces ALL of the operator's permissions for the account and project with the
 * given ids — pass an empty array to revoke everything. Must be sent by `account` (or
 * an operator with the ROOT permission for it).
 *
 * @param args.chainId The chain to set permissions on.
 * @param args.account The account granting the permissions.
 * @param args.operator The operator receiving the permissions.
 * @param args.projectId The project the permissions are scoped to, or 0 for all of the
 * account's projects (the wildcard project id).
 * @param args.permissionIds The permission ids to grant (see
 * {@link JBPermissionIdsV6}).
 * @returns The transaction request.
 */
export function buildSetPermissionsTx({
  chainId,
  account,
  operator,
  projectId,
  permissionIds,
}: {
  chainId: JBChainId;
  account: Address;
  operator: Address;
  projectId: bigint;
  permissionIds: number[];
}): V6SetPermissionsTxRequest {
  return {
    chainId,
    address: v6Address("JBPermissions", chainId),
    abi: jbPermissionsAbi,
    functionName: "setPermissionsFor",
    args: [account, { operator, projectId, permissionIds }],
  };
}

/**
 * Check whether an operator holds ALL of the given permissions for an account and
 * project, via `JBPermissions.hasPermissions`.
 *
 * @param client A viem public client on the given chain.
 * @param args.chainId The chain to check on.
 * @param args.operator The operator being checked.
 * @param args.account The account the permissions would be granted by.
 * @param args.projectId The project the permissions are scoped to.
 * @param args.permissionIds The permission ids to check (see
 * {@link JBPermissionIdsV6}).
 * @param args.includeRoot Whether holding the ROOT permission should satisfy the
 * check. Defaults to true.
 * @param args.includeWildcardProjectId Whether permissions granted for the wildcard
 * project id (0) should satisfy the check. Defaults to true.
 * @returns True when the operator holds every given permission.
 */
export async function hasPermissions(
  client: PublicClient,
  {
    chainId,
    operator,
    account,
    projectId,
    permissionIds,
    includeRoot = true,
    includeWildcardProjectId = true,
  }: {
    chainId: JBChainId;
    operator: Address;
    account: Address;
    projectId: bigint;
    permissionIds: number[];
    includeRoot?: boolean;
    includeWildcardProjectId?: boolean;
  },
): Promise<boolean> {
  return client.readContract({
    address: v6Address("JBPermissions", chainId),
    abi: jbPermissionsAbi,
    functionName: "hasPermissions",
    args: [
      operator,
      account,
      projectId,
      permissionIds.map(BigInt),
      includeRoot,
      includeWildcardProjectId,
    ],
  });
}
