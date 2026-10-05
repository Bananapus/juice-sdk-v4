import { Address, PublicClient, isAddress, zeroAddress, zeroHash } from "viem";
import {
  jb721TiersHookAbi,
  jb721TiersHookStoreAbi,
  jbAddressRegistryAbi,
  revDeployerAbi,
} from "../generated/juicebox.js";
import { jbDirectoryAbi } from "../generated/abi/jbDirectoryAbi.js";
import { jbProjectsAbi } from "../generated/abi/jbProjectsAbi.js";
import { JBChainId } from "../types.js";
import { isMissingContractFunctionError } from "../utils/errors.js";
import { resolveProject721Hook } from "./nft.js";
import { hasPermissions, JBPermissionIdsV6 } from "./permissions.js";
import { getCurrentRuleset } from "./rulesets.js";
import { v6Address } from "./types.js";

/** Indexer evidence is supplied by the caller, independently of chain reads. */
export type ProjectDataStatus =
  | "available"
  | "missing"
  | "incomplete"
  | "unavailable"
  | "not-checked";

export function describeProjectDataStatus(status: ProjectDataStatus): string {
  switch (status) {
    case "available":
      return "Indexed project details are available.";
    case "missing":
      return "The indexer returned no project record. This does not establish why it is missing.";
    case "incomplete":
      return "Some indexed project details are missing. This does not establish indexing progress.";
    case "unavailable":
      return "The indexer request did not complete. Indexing progress is unknown.";
    case "not-checked":
      return "The indexer was not checked.";
  }
}

export interface ProjectDeploymentCheck {
  id: string;
  category: "project" | "hook" | "pricing" | "permissions";
  status: "passed" | "mismatch" | "unsupported" | "unavailable" | "info";
  label: string;
  message: string;
  actual?: string;
  expected?: string;
  action?: string;
}

/** Copyable, JSON-safe evidence. A passed check is limited to its stated claim. */
export interface ProjectDeploymentDiagnostics {
  version: 6;
  chainId: number;
  projectId: string;
  operator?: Address;
  checkedAt: string;
  checkedBlock: string | null;
  kind: "revnet" | "juicebox" | "custom" | "unknown";
  checks: ProjectDeploymentCheck[];
}

const sameAddress = (left: Address, right: Address) =>
  left.toLowerCase() === right.toLowerCase();

/** Inspect current v6 wiring without a wallet, tier enumeration or indexer.
 * Reads are pinned to one block. Caller-supplied indexer evidence belongs in a
 * separate report section: a failed indexer request proves nothing about wiring.
 * Custom hooks/controllers are unsupported where capabilities cannot be verified,
 * never invalid merely for differing from canonical deployments. Pricing units
 * and operator powers are informational unless explicit expectations are supplied.
 */
export async function getProjectDeploymentDiagnostics(
  client: PublicClient,
  args: {
    chainId: JBChainId;
    projectId: bigint;
    /** Optional operator candidate, for reading actual shop powers. */
    operator?: Address;
    /** An intended pricing context, only when supplied by the deployer. */
    expectedPricing?: { currency: number; decimals: number };
  },
): Promise<ProjectDeploymentDiagnostics> {
  const requestedOperator =
    args.operator && isAddress(args.operator) ? args.operator : undefined;
  const report: ProjectDeploymentDiagnostics = {
    version: 6,
    chainId: args.chainId,
    projectId: args.projectId.toString(),
    checkedAt: new Date().toISOString(),
    checkedBlock: null,
    kind: "unknown",
    checks: [],
    ...(requestedOperator ? { operator: requestedOperator } : {}),
  };
  const add = (check: ProjectDeploymentCheck) => {
    if (check.status === "mismatch" && !check.action)
      check.action =
        "Compare these values with the original deployment call before choosing a correction; immutable settings may require a new deployment.";
    report.checks.push(check);
  };
  const unavailable = (
    id: string,
    category: ProjectDeploymentCheck["category"],
    label: string,
    error?: unknown,
  ) =>
    add({
      id,
      category,
      label,
      status: isMissingContractFunctionError(error)
        ? "unsupported"
        : "unavailable",
      message: isMissingContractFunctionError(error)
        ? "The contract read reverted or returned no data, so this check could not be verified."
        : "The chain read did not complete. No mismatch was established.",
      action:
        "Retry the check or inspect this contract with your deployment configuration.",
    });
  if (args.projectId <= 0n) {
    add({
      id: "project",
      category: "project",
      status: "unsupported",
      label: "Project",
      message: "A positive project ID is required.",
    });
    return report;
  }
  let blockNumber: bigint;
  try {
    const chainId = await client.getChainId();
    if (chainId !== args.chainId) {
      add({
        id: "network",
        category: "project",
        status: "unavailable",
        label: "Network",
        message: "The connected network does not match this project.",
        actual: String(chainId),
        expected: String(args.chainId),
        action: "Choose the project's network and retry.",
      });
      return report;
    }
    blockNumber = await client.getBlockNumber();
    report.checkedBlock = blockNumber.toString();
  } catch {
    unavailable("network", "project", "Network");
    return report;
  }
  let directory: Address,
    projects: Address,
    controller: Address,
    revOwner: Address,
    revDeployer: Address,
    omni: Address;
  try {
    directory = v6Address("JBDirectory", args.chainId);
    projects = v6Address("JBProjects", args.chainId);
    controller = v6Address("JBController", args.chainId);
    revOwner = v6Address("REVOwner", args.chainId);
    revDeployer = v6Address("REVDeployer", args.chainId);
    omni = v6Address("JBOmnichainDeployer", args.chainId);
  } catch {
    add({
      id: "network",
      category: "project",
      status: "unsupported",
      label: "Network",
      message: "This SDK has no supported v6 deployment on this network.",
    });
    return report;
  }
  // Every nested shared resolver uses this same block; no mutable latest reads.
  const snapshot = {
    ...client,
    readContract: (parameters: Parameters<PublicClient["readContract"]>[0]) =>
      client.readContract({ ...parameters, blockNumber }),
  } as PublicClient;
  const read = snapshot.readContract;
  const [ownerRead, controllerRead] = await Promise.allSettled([
    read({
      address: projects,
      abi: jbProjectsAbi,
      functionName: "ownerOf",
      args: [args.projectId],
    }),
    read({
      address: directory,
      abi: jbDirectoryAbi,
      functionName: "controllerOf",
      args: [args.projectId],
    }),
  ]);
  if (ownerRead.status === "rejected") {
    unavailable("project.owner", "project", "Project owner", ownerRead.reason);
    return report;
  }
  const owner = ownerRead.value;
  const isRevnet = sameAddress(owner, revOwner);
  report.kind = isRevnet ? "revnet" : "juicebox";
  add({
    id: "project.owner",
    category: "project",
    status: "passed",
    label: "Project exists",
    message: "The v6 project registry returned its current owner.",
    actual: owner,
  });
  if (controllerRead.status === "rejected") {
    unavailable(
      "project.controller",
      "project",
      "Controller",
      controllerRead.reason,
    );
    return report;
  }
  if (!sameAddress(controllerRead.value, controller)) {
    report.kind = "custom";
    add({
      id: "project.controller",
      category: "project",
      status: "unsupported",
      label: "Controller",
      message: "This controller requires deployment-specific checks.",
      actual: controllerRead.value,
      expected: controller,
      action: "Compare with the controller chosen in the deployment script.",
    });
    return report;
  }
  add({
    id: "project.controller",
    category: "project",
    status: "passed",
    label: "Controller",
    message: "The project uses the supported v6 controller.",
    actual: controller,
  });
  let canonicalRevnet = false;
  if (isRevnet) {
    try {
      const hash = await read({
        address: revDeployer,
        abi: revDeployerAbi,
        functionName: "hashedEncodedConfigurationOf",
        args: [args.projectId],
      });
      canonicalRevnet = hash !== zeroHash;
      add({
        id: "project.provenance",
        category: "project",
        status: canonicalRevnet ? "passed" : "unsupported",
        label: "Revnet configuration",
        message: canonicalRevnet
          ? "The canonical deployer has a configuration for this revnet."
          : "No canonical configuration is registered. Ownership alone does not establish canonical deployment.",
        actual: hash,
      });
    } catch (error) {
      unavailable(
        "project.provenance",
        "project",
        "Revnet configuration",
        error,
      );
    }
  }
  let current: Awaited<ReturnType<typeof getCurrentRuleset>> | undefined;
  try {
    current = await getCurrentRuleset(snapshot, args);
  } catch (error) {
    unavailable("project.ruleset", "project", "Current ruleset", error);
    if (!isRevnet) return report;
  }
  if (current?.ruleset.id === 0) {
    add({
      id: "project.ruleset",
      category: "project",
      status: "info",
      label: "Current ruleset",
      message:
        "No active ruleset is available yet. Hook routing cannot be checked.",
    });
    if (!isRevnet) return report;
    current = undefined;
  }
  const metadata = current?.metadata;
  if (metadata) {
    const expectedHook = canonicalRevnet ? revOwner : undefined;
    add({
      id: "hook.routing",
      category: "hook",
      status:
        expectedHook && !sameAddress(metadata.dataHook, expectedHook)
          ? "mismatch"
          : "info",
      label: "Payment hook routing",
      message: "The current ruleset selects this data hook.",
      actual: metadata.dataHook,
      ...(expectedHook ? { expected: expectedHook } : {}),
    });
    const canonicalComposite = canonicalRevnet;
    add({
      id: "hook.flags",
      category: "hook",
      status:
        canonicalComposite &&
        (!metadata.useDataHookForPay || !metadata.useDataHookForCashOut)
          ? "mismatch"
          : "info",
      label: "Hook enablement",
      message: canonicalComposite
        ? "Canonical composite hooks enable both payment and cash-out routing."
        : "Hook enablement can be an intentional ruleset choice.",
      actual: `payments=${metadata.useDataHookForPay}; cashOuts=${metadata.useDataHookForCashOut}`,
      ...(canonicalComposite
        ? { expected: "payments=true; cashOuts=true" }
        : {}),
    });
  }
  let resolved: Awaited<ReturnType<typeof resolveProject721Hook>>;
  try {
    resolved = await resolveProject721Hook(snapshot, {
      ...args,
      isRevnet,
      ruleset: current,
      includeInactiveHook: true,
    });
  } catch (error) {
    unavailable("hook.shop", "hook", "Shop hook", error);
    return report;
  }
  if (!resolved) {
    const custom =
      metadata &&
      metadata.dataHook !== zeroAddress &&
      !sameAddress(metadata.dataHook, omni) &&
      !isRevnet;
    if (custom) report.kind = "custom";
    add({
      id: "hook.shop",
      category: "hook",
      status: canonicalRevnet ? "mismatch" : custom ? "unsupported" : "info",
      label: "Shop hook",
      message: canonicalRevnet
        ? "The canonical revnet has no registered shop hook."
        : custom
          ? "The selected custom data hook does not expose a supported 721 shop."
          : "No 721 shop is configured. This is valid for a Juicebox project.",
      ...(canonicalRevnet
        ? { actual: zeroAddress, expected: "A registered 721 hook" }
        : {}),
    });
    return report;
  }
  const hook = resolved.hook;
  add({
    id: "hook.shop",
    category: "hook",
    status: "passed",
    label: "Shop hook",
    message: "The project resolves to a hook reporting a 721 store address.",
    actual: hook,
  });
  const bind = async (
    id: string,
    label: string,
    readValue: () => Promise<string | bigint>,
    expected?: string,
  ) => {
    try {
      const actual = String(await readValue());
      add({
        id,
        category: "hook",
        label,
        status: expected
          ? actual.toLowerCase() === expected.toLowerCase()
            ? "passed"
            : "mismatch"
          : "info",
        message: expected
          ? "Compared the hook's binding with this project."
          : "The hook reported this value; custom ownership can be intentional.",
        actual,
        ...(expected ? { expected } : {}),
      });
      return actual;
    } catch (error) {
      unavailable(id, "hook", label, error);
      return undefined;
    }
  };
  const [hookProject, , hookOwner, permissionRegistry] = await Promise.all([
    bind(
      "hook.projectId",
      "Hook project",
      () =>
        read({
          address: hook,
          abi: jb721TiersHookAbi,
          functionName: "projectId",
        }),
      args.projectId.toString(),
    ),
    bind(
      "hook.directory",
      "Hook directory",
      () =>
        read({
          address: hook,
          abi: jb721TiersHookAbi,
          functionName: "DIRECTORY",
        }),
      directory,
    ),
    bind(
      "hook.owner",
      "Shop authority",
      () =>
        read({ address: hook, abi: jb721TiersHookAbi, functionName: "owner" }),
      canonicalRevnet ? revOwner : undefined,
    ),
    bind("hook.permissions", "Permission registry", () =>
      read({
        address: hook,
        abi: jb721TiersHookAbi,
        functionName: "PERMISSIONS",
      }),
    ),
  ]);
  await Promise.all([
    (async () => {
      if (sameAddress(resolved.store, zeroAddress)) {
        add({
          id: "hook.store",
          category: "hook",
          status: "mismatch",
          label: "Shop store",
          message: "The hook reports no store address.",
          actual: zeroAddress,
          expected: "A deployed 721 store",
          action:
            "Compare the hook initialization with the deployment script before using its shop.",
        });
        return;
      }
      try {
        const maxTierId = await read({
          address: resolved.store,
          abi: jb721TiersHookStoreAbi,
          functionName: "maxTierIdOf",
          args: [hook],
        });
        add({
          id: "hook.store",
          category: "hook",
          status: "passed",
          label: "Shop store",
          message: `The reported store is readable; highest tier ID is ${maxTierId}.`,
          actual: resolved.store,
        });
      } catch (error) {
        unavailable("hook.store", "hook", "Shop store", error);
      }
    })(),
    (async () => {
      try {
        const factory = await read({
          address: v6Address("JBAddressRegistry", args.chainId),
          abi: jbAddressRegistryAbi,
          functionName: "deployerOf",
          args: [hook],
        });
        const expected = v6Address("JB721TiersHookDeployer", args.chainId);
        add({
          id: "hook.provenance",
          category: "hook",
          status: sameAddress(factory, expected) ? "passed" : "unsupported",
          label: "Shop factory",
          message: sameAddress(factory, expected)
            ? "The registry records the canonical 721 factory."
            : "The registry does not establish canonical factory provenance. Custom hooks need separate review.",
          actual: factory,
          expected,
        });
      } catch (error) {
        unavailable("hook.provenance", "hook", "Shop factory", error);
      }
    })(),
    (async () => {
      try {
        const [currency, decimals] = await read({
          address: hook,
          abi: jb721TiersHookAbi,
          functionName: "pricingContext",
        });
        const expected = args.expectedPricing;
        add({
          id: "shop.pricing",
          category: "pricing",
          status: expected
            ? currency === BigInt(expected.currency) &&
              decimals === BigInt(expected.decimals)
              ? "passed"
              : "mismatch"
            : "info",
          label: "Shop pricing",
          message:
            "Prices use these units. Precision alone cannot establish whether an item was priced as intended.",
          actual: `currency=${currency}; decimals=${decimals}`,
          ...(expected
            ? {
                expected: `currency=${expected.currency}; decimals=${expected.decimals}`,
              }
            : {}),
        });
      } catch (error) {
        unavailable("shop.pricing", "pricing", "Shop pricing", error);
      }
    })(),
    (async () => {
      if (args.operator && !requestedOperator) {
        add({
          id: "shop.permissions",
          category: "permissions",
          status: "unsupported",
          label: "Shop permissions",
          message: "The supplied operator is not a valid address.",
          action:
            "Supply the operator address from your deployment configuration.",
        });
        return;
      }
      if (!requestedOperator) {
        add({
          id: "shop.permissions",
          category: "permissions",
          status: "info",
          label: "Shop permissions",
          message:
            "Operator permissions can be intentionally restricted. Supply an operator address to read its current powers.",
          ...(hookOwner ? { actual: `Shop authority: ${hookOwner}` } : {}),
        });
        return;
      }
      if (!hookOwner || !hookProject || !permissionRegistry) {
        const dependencies = [
          "hook.owner",
          "hook.projectId",
          "hook.permissions",
        ].map((id) => report.checks.find((item) => item.id === id));
        add({
          id: "shop.permissions",
          category: "permissions",
          status: dependencies.some((item) => item?.status === "unavailable")
            ? "unavailable"
            : "unsupported",
          label: "Shop permissions",
          message:
            "A required hook authority or binding read could not be verified. Operator powers remain unknown.",
          action:
            "Retry the missing hook reads before checking operator powers.",
        });
        return;
      }
      const operator = requestedOperator;
      if (
        sameAddress(operator, zeroAddress) ||
        hookProject !== args.projectId.toString() ||
        !permissionRegistry ||
        !sameAddress(
          permissionRegistry as Address,
          v6Address("JBPermissions", args.chainId),
        )
      ) {
        add({
          id: "shop.permissions",
          category: "permissions",
          status: "unsupported",
          label: "Shop permissions",
          message:
            "Operator powers cannot be established for an unverified project binding, custom permission registry or zero operator.",
          action:
            "Verify the hook's project and permission registry, then supply a nonzero operator address.",
        });
        return;
      }
      const permissions = [
        ["Adjust tiers", JBPermissionIdsV6.ADJUST_721_TIERS],
        ["Update metadata", JBPermissionIdsV6.SET_721_METADATA],
        ["Mint items", JBPermissionIdsV6.MINT_721],
        ["Increase discounts", JBPermissionIdsV6.SET_721_DISCOUNT_PERCENT],
      ] as const;
      await Promise.all(
        permissions.map(async ([label, id]) => {
          try {
            const allowed =
              sameAddress(operator, hookOwner as Address) ||
              (await hasPermissions(snapshot, {
                ...args,
                operator,
                account: hookOwner as Address,
                permissionIds: [id],
              }));
            add({
              id: `shop.permission.${id}`,
              category: "permissions",
              status: "info",
              label,
              message:
                "This is the supplied operator's current capability, including owner, root and wildcard authority.",
              actual: allowed ? "Allowed" : "Not allowed",
            });
          } catch (error) {
            unavailable(`shop.permission.${id}`, "permissions", label, error);
          }
        }),
      );
    })(),
  ]);
  report.checks.sort((left, right) => left.id.localeCompare(right.id));
  return report;
}
