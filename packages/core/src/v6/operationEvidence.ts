import {
  decodeEventLog,
  decodeFunctionData,
  erc20Abi,
  getAddress,
  isAddress,
  toFunctionSelector,
  zeroAddress,
  type Abi,
  type Address,
  type Hex,
  type TransactionReceipt,
} from "viem";
import {
  jb721TiersHookAbi,
  jb721TiersHookDeployerAbi,
  jb721TiersHookProjectDeployerAbi,
  jbBuybackHookAbi,
  jbBuybackHookRegistryAbi,
  jbControllerAbi,
  jbMultiTerminalAbi,
  jbPermissionsAbi,
  jbOmnichainDeployerAbi,
  jbTokensAbi,
  jbProjectsAbi,
  jbRouterTerminalRegistryAbi,
  jbSuckerRegistryAbi,
  revDeployerAbi,
  revLoansAbi,
  revOwnerAbi,
} from "../generated/juicebox.js";
import { NATIVE_TOKEN } from "../constants.js";
import { uniswapV4PoolId, type UniswapV4PoolKey } from "./uniswapV4.js";
import { jbSuckerV6Abi } from "./suckers.js";
import { v6Address, v6Deployments } from "./types.js";
import type { JBChainId } from "../types.js";
/** A reviewed protocol action. Hosts validate its source/schema before verifying outcomes. */
export interface V6OperationDraft {
  operation: string;
  account: Address;
  project?: { chainId: JBChainId; projectId: string; version?: 6 };
  calls: readonly V6OperationCall[];
  summary: unknown;
}
export interface V6OperationCall {
  chainId: JBChainId;
  to: Address;
  data: Hex;
}
export interface V6OutcomeEvidence {
  emitter: Address;
  event: string;
  logIndex: number | null;
  args: unknown;
}
export type V6OperationReceipt = Pick<
  TransactionReceipt,
  "status" | "transactionHash" | "blockHash" | "blockNumber" | "logs"
>;
export interface V6OperationEvidence {
  verified: boolean;
  events: V6OutcomeEvidence[];
  reason?: string;
}

const PAY_SELECTOR = /* @__PURE__ */ toFunctionSelector(
  "pay(uint256,address,uint256,address,uint256,string,bytes)",
);
const same = (left: unknown, right: unknown) =>
  typeof left === "string" &&
  typeof right === "string" &&
  left.toLowerCase() === right.toLowerCase();
const jsonSafe = (value: unknown): unknown =>
  JSON.parse(
    JSON.stringify(value, (_key, item: unknown) =>
      typeof item === "bigint" ? item.toString() : item,
    ),
  );
function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value))
    return JSON.stringify(value);
  if (typeof value === "bigint") return JSON.stringify(value.toString());
  if (Array.isArray(value))
    return "[" + value.map(canonicalJson).join(",") + "]";
  if (typeof value === "object" && value !== null)
    return (
      "{" +
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => JSON.stringify(k) + ":" + canonicalJson(v))
        .join(",") +
      "}"
    );
  throw new Error("Value cannot be represented as canonical JSON.");
}
const equalData = (left: unknown, right: unknown) =>
  canonicalJson(left) === canonicalJson(right);
const suckerReceiptAbi = [
  {
    type: "event",
    name: "Claimed",
    inputs: [
      {
        name: "beneficiary",
        type: "bytes32",
        indexed: false,
      },
      {
        name: "token",
        type: "address",
        indexed: false,
      },
      {
        name: "projectTokenCount",
        type: "uint256",
        indexed: false,
      },
      {
        name: "terminalTokenAmount",
        type: "uint256",
        indexed: false,
      },
      {
        name: "index",
        type: "uint256",
        indexed: false,
      },
      {
        name: "metadata",
        type: "bytes32",
        indexed: false,
      },
      {
        name: "caller",
        type: "address",
        indexed: false,
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "AccountingDataSynced",
    inputs: [
      {
        name: "sourceTimestamp",
        type: "uint256",
        indexed: false,
      },
      {
        name: "caller",
        type: "address",
        indexed: false,
      },
    ],
    anonymous: false,
  },
] as const;

/** The producer's strict pool-key schema, without a service/schema dependency. */
function reviewedPoolKey(input: unknown): UniswapV4PoolKey | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input))
    return undefined;
  const key = input as Record<string, unknown>;
  const fields = ["currency0", "currency1", "fee", "tickSpacing", "hooks"];
  if (Object.keys(key).some((field) => !fields.includes(field)))
    return undefined;
  if (
    typeof key.fee !== "number" ||
    !Number.isInteger(key.fee) ||
    key.fee < 0 ||
    key.fee > 16777215 ||
    typeof key.tickSpacing !== "number" ||
    !Number.isInteger(key.tickSpacing) ||
    key.tickSpacing < -8388608 ||
    key.tickSpacing > 8388607
  )
    return undefined;
  if (
    typeof key.currency0 !== "string" ||
    !isAddress(key.currency0, { strict: true }) ||
    typeof key.currency1 !== "string" ||
    !isAddress(key.currency1, { strict: true }) ||
    typeof key.hooks !== "string" ||
    !isAddress(key.hooks, { strict: true })
  )
    return undefined;
  return {
    currency0: getAddress(key.currency0),
    currency1: getAddress(key.currency1),
    fee: key.fee,
    tickSpacing: key.tickSpacing,
    hooks: getAddress(key.hooks),
  };
}

/**
 * Interpret modeled V6 effects in a receipt. No RPC, signing, secrets or storage.
 * The host must first validate the draft and independently prove exact execution,
 * receipt identity and canonicality. A successful receipt alone is insufficient.
 */
export function verifyV6OperationEvidence(
  draft: V6OperationDraft,
  step: number,
  receipt: V6OperationReceipt,
): V6OperationEvidence {
  if (!Number.isSafeInteger(step) || step < 0 || step >= draft.calls.length)
    throw new Error(
      "The semantic verification step is outside the validated plan.",
    );
  if (receipt.status !== "success")
    return {
      verified: false,
      events: [],
      reason:
        "A reverted or unrecognized receipt cannot establish the planned outcome.",
    };
  return operationEvidence({ draft }, draft.calls[step]!, receipt);
}

function operationEvidence(
  plan: { draft: V6OperationDraft },
  call: V6OperationCall,
  receipt: V6OperationReceipt,
): { verified: boolean; events: V6OutcomeEvidence[]; reason?: string } {
  const events: V6OutcomeEvidence[] = [];
  const sourceLogs = receipt.logs.filter(
    (log) =>
      !log.removed &&
      same(log.transactionHash, receipt.transactionHash) &&
      same(log.blockHash, receipt.blockHash) &&
      log.blockNumber === receipt.blockNumber &&
      log.logIndex !== null,
  );
  const append = (
    log: TransactionReceipt["logs"][number],
    event: string,
    args: unknown,
  ) =>
    events.push({
      emitter: log.address,
      event,
      logIndex: log.logIndex,
      args: jsonSafe(args),
    });
  const unknown = (reason: string) => ({ verified: false, events, reason });
  try {
    // Canonical deployments matter: arbitrary contracts can copy a Juicebox event signature.
    const terminalEmitter = v6Address("JBMultiTerminal", call.chainId);
    const directTerminal = same(call.to, terminalEmitter);
    const routers = v6Deployments("JBRouterTerminal", call.chainId);
    const gateways = v6Deployments("JBRouterTerminalGateway", call.chainId);
    const buybacks = v6Deployments("JBBuybackHook", call.chainId);
    const routerRegistry = v6Address("JBRouterTerminalRegistry", call.chainId);
    if (
      directTerminal ||
      ([...routers, ...gateways, routerRegistry].some((address) =>
        same(call.to, address),
      ) &&
        same(call.data.slice(0, 10), PAY_SELECTOR))
    ) {
      const decoded = decodeFunctionData({
        abi: jbMultiTerminalAbi,
        data: call.data,
      });
      const args = decoded.args as readonly unknown[];
      const projectId =
        decoded.functionName === "cashOutTokensOf" ? args[1] : args[0];
      if (
        !plan.draft.project ||
        plan.draft.project.chainId !== call.chainId ||
        projectId !== BigInt(plan.draft.project.projectId)
      )
        return unknown("The call does not match the signed project identity.");
      const eventName =
        decoded.functionName === "pay"
          ? "Pay"
          : decoded.functionName === "cashOutTokensOf"
            ? "CashOutTokens"
            : decoded.functionName === "sendPayoutsOf"
              ? "SendPayouts"
              : undefined;
      if (!eventName)
        return unknown(
          "Semantic verification is not implemented for this terminal function.",
        );
      let payoutFailed = false;
      for (const log of sourceLogs) {
        if (!same(log.address, terminalEmitter) || log.removed) continue;
        try {
          const event = decodeEventLog({
            abi: jbMultiTerminalAbi,
            data: log.data,
            topics: log.topics,
            strict: true,
          });
          const fields = event.args as unknown as Record<string, unknown>;
          if (fields.projectId !== projectId) continue;
          if (
            eventName === "SendPayouts" &&
            ["PayoutReverted", "PayoutTransferReverted"].includes(
              event.eventName,
            )
          ) {
            payoutFailed = true;
            append(log, event.eventName, fields);
          }
          const callerMatches = directTerminal
            ? same(fields.caller, plan.draft.account)
            : [...routers, routerRegistry].some((address) =>
                same(fields.caller, address),
              );
          if (event.eventName !== eventName || !callerMatches) continue;
          // Pay.newlyIssuedTokenCount is newly minted tokens only. The exact successful call
          // enforces minReturnedTokens against the beneficiary's complete balance delta, including hooks.
          if (
            eventName === "Pay" &&
            (!same(
              fields.payer,
              directTerminal ? plan.draft.account : fields.caller,
            ) ||
              !same(fields.beneficiary, args[3]))
          )
            continue;
          if (
            eventName === "CashOutTokens" &&
            (!same(fields.holder, args[0]) ||
              !same(fields.beneficiary, args[5]) ||
              fields.cashOutCount !== args[2] ||
              typeof fields.reclaimAmount !== "bigint" ||
              fields.reclaimAmount < (args[4] as bigint))
          )
            continue;
          append(log, event.eventName, fields);
        } catch {
          /* Unrelated or malformed events are not outcome evidence. */
        }
      }
      if (payoutFailed)
        return unknown(
          "The transaction confirmed, but at least one payout transfer or hook reverted. Inspect the payout events for partial completion.",
        );
      let sellFailed = false;
      if (eventName === "Pay" || eventName === "CashOutTokens") {
        for (const log of sourceLogs) {
          if (!buybacks.some((address) => same(log.address, address))) continue;
          try {
            const event = decodeEventLog({
              abi: jbBuybackHookAbi,
              data: log.data,
              topics: log.topics,
              strict: true,
            });
            const fields = event.args as unknown as Record<string, unknown>;
            if (
              fields.projectId !== projectId ||
              !same(fields.caller, terminalEmitter)
            )
              continue;
            if (
              eventName === "Pay" &&
              ["Swap", "Mint"].includes(event.eventName)
            )
              append(log, event.eventName, fields);
            if (
              eventName === "CashOutTokens" &&
              ["CashOutSwap", "SellSwapReverted"].includes(event.eventName)
            ) {
              append(log, event.eventName, fields);
              if (event.eventName === "SellSwapReverted") sellFailed = true;
            }
          } catch {
            /* Hook legs are separate observed amounts; never add them to minted amounts blindly. */
          }
        }
      }
      if (sellFailed)
        return unknown(
          "The exact transaction confirmed, but the sell-side swap failed and project tokens were returned. The requested terminal-token cash-out outcome is not verified.",
        );
      if (
        eventName === "Pay" &&
        plan.draft.operation === "721_pay" &&
        events.some((event) => event.event === "Pay")
      ) {
        const nft = nftPaymentEvidence(plan, sourceLogs, terminalEmitter);
        return { ...nft, events: [...events, ...nft.events] };
      }
      return events.some((event) => event.event === eventName)
        ? { verified: true, events }
        : unknown(
            "The expected canonical project event is absent or does not match the planned beneficiary, holder, or minimum output.",
          );
    }
    if (same(call.to, v6Address("JBController", call.chainId))) {
      const decoded = decodeFunctionData({
        abi: jbControllerAbi,
        data: call.data,
      });
      if (decoded.functionName === "queueRulesetsOf") {
        const [projectId, , memo] = decoded.args;
        if (
          !plan.draft.project ||
          plan.draft.project.chainId !== call.chainId ||
          projectId !== BigInt(plan.draft.project.projectId)
        )
          return unknown(
            "The queued rulesets do not match the signed project identity.",
          );
        for (const log of sourceLogs) {
          if (!same(log.address, call.to)) continue;
          try {
            const event = decodeEventLog({
              abi: jbControllerAbi,
              data: log.data,
              topics: log.topics,
              strict: true,
            });
            if (
              event.eventName === "QueueRulesets" &&
              event.args.projectId === projectId &&
              same(event.args.caller, plan.draft.account) &&
              event.args.memo === memo
            )
              append(log, event.eventName, event.args);
          } catch {
            /* Only a canonical queue event proves that rulesets were queued. */
          }
        }
        return events.length
          ? {
              verified: true,
              events,
              reason:
                "Rulesets were queued. This does not assert approval or activation; inspect their current status and effective dates separately.",
            }
          : unknown(
              "The canonical QueueRulesets event is absent or does not match the project/caller/memo.",
            );
      }
      if (
        decoded.functionName === "deployERC20For" ||
        decoded.functionName === "setUriOf"
      )
        return extensionEvidence(plan, call, sourceLogs)!;
      if (decoded.functionName !== "launchProjectFor")
        return unknown(
          "Semantic verification is not implemented for this controller function.",
        );
      const [owner, projectUri] = decoded.args;
      const creates = new Set<string>();
      const launches = new Set<string>();
      for (const log of sourceLogs) {
        if (log.removed) continue;
        try {
          if (same(log.address, v6Address("JBProjects", call.chainId))) {
            const event = decodeEventLog({
              abi: jbProjectsAbi,
              eventName: "Create",
              data: log.data,
              topics: log.topics,
              strict: true,
            });
            if (
              event.eventName !== "Create" ||
              !same(event.args.owner, owner) ||
              !same(event.args.caller, call.to)
            )
              continue;
            creates.add(event.args.projectId.toString());
            append(log, event.eventName, event.args);
          } else if (same(log.address, call.to)) {
            const event = decodeEventLog({
              abi: jbControllerAbi,
              eventName: "LaunchProject",
              data: log.data,
              topics: log.topics,
              strict: true,
            });
            if (
              event.eventName !== "LaunchProject" ||
              !same(event.args.caller, plan.draft.account) ||
              event.args.projectUri !== projectUri
            )
              continue;
            launches.add(event.args.projectId.toString());
            append(log, event.eventName, event.args);
          }
        } catch {
          /* Require both canonical emitter events for the same created ID. */
        }
      }
      return [...creates].some((id) => launches.has(id))
        ? { verified: true, events }
        : unknown(
            "A launch requires matching JBProjects.Create and JBController.LaunchProject logs from canonical deployments, with the requested owner and URI.",
          );
    }
    const extension = extensionEvidence(plan, call, sourceLogs);
    if (extension) return extension;
    const approval = decodeFunctionData({ abi: erc20Abi, data: call.data });
    if (approval.functionName === "approve") {
      for (const log of sourceLogs) {
        if (!same(log.address, call.to) || log.removed) continue;
        try {
          const event = decodeEventLog({
            abi: erc20Abi,
            eventName: "Approval",
            data: log.data,
            topics: log.topics,
            strict: true,
          });
          if (
            event.eventName === "Approval" &&
            same(event.args.owner, plan.draft.account) &&
            same(event.args.spender, approval.args[0]) &&
            event.args.value === approval.args[1]
          )
            append(log, event.eventName, event.args);
        } catch {
          /* Tokens without matching Approval logs remain semantically unverified. */
        }
      }
      return events.length > 0
        ? {
            verified: true,
            events,
            reason:
              "The token emitted the exact Approval event. Re-simulate the dependent call against current chain state; this event does not prove a persistent allowance.",
          }
        : unknown(
            "No exact Approval event was found; use the next step’s real-state simulation to check allowance.",
          );
    }
  } catch {
    return unknown(
      "The confirmed transaction uses calldata or a deployment without a supported semantic verifier.",
    );
  }
  return unknown(
    "The direct transaction confirmed, but semantic outcome verification is not implemented for this operation.",
  );
}

function extensionEvidence(
  plan: { draft: V6OperationDraft },
  call: V6OperationCall,
  logs: TransactionReceipt["logs"],
):
  | { verified: boolean; events: V6OutcomeEvidence[]; reason?: string }
  | undefined {
  const events: V6OutcomeEvidence[] = [];
  const projectMatches = (projectId: unknown) =>
    !!plan.draft.project &&
    plan.draft.project.chainId === call.chainId &&
    projectId === BigInt(plan.draft.project.projectId);
  const matching = (
    abi: Abi,
    eventName: string,
    emitter: Address,
    predicate: (args: Record<string, unknown>) => boolean,
  ): V6OutcomeEvidence[] => {
    const matches: V6OutcomeEvidence[] = [];
    for (const log of logs) {
      if (!same(log.address, emitter)) continue;
      try {
        const event = decodeEventLog({
          abi,
          data: log.data,
          topics: log.topics,
          strict: true,
        });
        const args = event.args as unknown as Record<string, unknown>;
        // `eventName` is only a TypeScript inference hint to viem, never a runtime filter.
        if (event.eventName === eventName && predicate(args))
          matches.push({
            emitter: log.address,
            event: eventName,
            logIndex: log.logIndex,
            args: jsonSafe(args),
          });
      } catch {
        /* No outcome evidence from malformed or unrelated logs. */
      }
    }
    events.push(...matches);
    return matches;
  };
  const done = (verified: boolean, reason?: string) => ({
    verified,
    events,
    reason:
      reason ??
      (verified
        ? undefined
        : "Canonical operation events are absent or do not exactly match the signed call."),
  });
  const fromCaller = (args: Record<string, unknown>) =>
    same(args.caller, plan.draft.account);

  if (same(call.to, v6Address("JBController", call.chainId))) {
    const decoded = decodeFunctionData({
      abi: jbControllerAbi,
      data: call.data,
    });
    if (decoded.functionName === "deployERC20For") {
      const [projectId, name, symbol, salt] = decoded.args;
      const deployed =
        projectMatches(projectId) &&
        matching(
          jbControllerAbi,
          "DeployERC20",
          call.to,
          (args) =>
            fromCaller(args) &&
            args.projectId === projectId &&
            args.salt === salt,
        ).length === 1 &&
        matching(
          jbTokensAbi,
          "DeployERC20",
          v6Address("JBTokens", call.chainId),
          (args) =>
            args.projectId === projectId &&
            args.name === name &&
            args.symbol === symbol &&
            same(args.caller, call.to),
        ).length === 1;
      return done(
        deployed,
        deployed ? "The project ERC-20 was deployed." : undefined,
      );
    }
    if (decoded.functionName === "setUriOf") {
      const [projectId, uri] = decoded.args;
      return done(
        projectMatches(projectId) &&
          matching(
            jbControllerAbi,
            "SetUri",
            call.to,
            (args) =>
              fromCaller(args) &&
              args.projectId === projectId &&
              args.uri === uri,
          ).length === 1,
      );
    }
    return done(false);
  }
  if (same(call.to, v6Address("JBOmnichainDeployer", call.chainId))) {
    const decoded = decodeFunctionData({
      abi: jbOmnichainDeployerAbi,
      data: call.data,
    });
    if (decoded.functionName === "queueRulesetsOf") {
      const args = decoded.args as readonly unknown[];
      const projectId = args[0];
      const memo = args[args.length - 1];
      const queued =
        projectMatches(projectId) &&
        matching(
          jbControllerAbi,
          "QueueRulesets",
          v6Address("JBController", call.chainId),
          (event) =>
            event.projectId === projectId &&
            same(event.caller, call.to) &&
            event.memo === memo,
        ).length === 1;
      return done(
        queued,
        queued
          ? "Rulesets were queued through JBOmnichainDeployer. This does not assert approval or activation; inspect their current status and effective dates separately."
          : "The canonical QueueRulesets event from JBController with JBOmnichainDeployer as caller is absent or does not match the project/memo.",
      );
    }
    if (decoded.functionName !== "launchProjectFor") return done(false);
    const args = decoded.args as readonly unknown[];
    const owner = args[0] as Address;
    const projectUri = args[1] as string;
    const memo = args[args.length - 2] as string;
    const expectedSuckers = (
      args[args.length - 1] as { deployerConfigurations: readonly unknown[] }
    ).deployerConfigurations;
    const created = matching(
      jbProjectsAbi,
      "Create",
      v6Address("JBProjects", call.chainId),
      (event) => same(event.owner, call.to) && same(event.caller, call.to),
    );
    const ids = new Set(
      created.map((event) => (event.args as Record<string, unknown>).projectId),
    );
    const hooks = matching(
      jb721TiersHookDeployerAbi,
      "HookDeployed",
      v6Address("JB721TiersHookDeployer", call.chainId),
      (event) =>
        ids.has(String(event.projectId)) && same(event.caller, call.to),
    );
    const rulesets = matching(
      jbControllerAbi,
      "LaunchRulesets",
      v6Address("JBController", call.chainId),
      (event) =>
        ids.has(String(event.projectId)) &&
        same(event.caller, call.to) &&
        event.projectUri === projectUri &&
        event.memo === memo,
    );
    const suckers = matching(
      jbSuckerRegistryAbi,
      "SuckerDeployedFor",
      v6Address("JBSuckerRegistry", call.chainId),
      (event) =>
        ids.has(String(event.projectId)) && same(event.caller, call.to),
    );
    const ownership = matching(
      jbProjectsAbi,
      "Transfer",
      v6Address("JBProjects", call.chainId),
      (event) =>
        ids.has(String(event.tokenId)) &&
        same(event.from, call.to) &&
        same(event.to, owner),
    );
    const actual = suckers
      .map((event) =>
        canonicalJson((event.args as Record<string, unknown>).configuration),
      )
      .sort();
    const expected = expectedSuckers
      .map((item) => canonicalJson(jsonSafe(item)))
      .sort();
    const verified =
      created.length === 1 &&
      hooks.length === 1 &&
      rulesets.length === 1 &&
      ownership.length === 1 &&
      equalData(actual, expected);
    return done(
      verified,
      verified
        ? "The project, its NFT collection, its rulesets and the requested local suckers were created on this chain, and the owner received the project. The remote chains need their own verification."
        : "Project creation, NFT collection, rulesets, local suckers or the owner transfer were not all verified.",
    );
  }
  if (same(call.to, v6Address("JBPermissions", call.chainId))) {
    const decoded = decodeFunctionData({
      abi: jbPermissionsAbi,
      data: call.data,
    });
    if (decoded.functionName !== "setPermissionsFor") return done(false);
    const [account, permission] = decoded.args;
    const packed = permission.permissionIds.reduce(
      (bits, id) => bits | (1n << BigInt(id)),
      0n,
    );
    return done(
      matching(
        jbPermissionsAbi,
        "OperatorPermissionsSet",
        call.to,
        (args) =>
          fromCaller(args) &&
          same(args.account, account) &&
          same(args.operator, permission.operator) &&
          args.projectId === permission.projectId &&
          equalData(args.permissionIds, permission.permissionIds) &&
          args.packed === packed,
      ).length > 0,
    );
  }
  if (same(call.to, v6Address("REVLoans", call.chainId))) {
    const decoded = decodeFunctionData({ abi: revLoansAbi, data: call.data });
    if (decoded.functionName === "borrowFrom") {
      const [
        projectId,
        token,
        minimumBorrow,
        collateral,
        beneficiary,
        prepaidFee,
        holder,
      ] = decoded.args;
      if (!projectMatches(projectId)) return done(false);
      const borrows = matching(revLoansAbi, "Borrow", call.to, (args) => {
        const loan = args.loan as Record<string, unknown>;
        return (
          fromCaller(args) &&
          args.revnetId === projectId &&
          same(args.token, token) &&
          args.collateralCount === collateral &&
          same(args.beneficiary, beneficiary) &&
          typeof args.borrowAmount === "bigint" &&
          args.borrowAmount >= minimumBorrow &&
          loan.collateral === collateral &&
          BigInt(loan.prepaidFeePercent as number) === prepaidFee &&
          same(loan.sourceToken, token)
        );
      });
      const ids = new Set(
        borrows.map((event) => (event.args as Record<string, unknown>).loanId),
      );
      const ownership = matching(
        revLoansAbi,
        "Transfer",
        call.to,
        (args) =>
          same(args.from, zeroAddress) &&
          same(args.to, holder) &&
          ids.has(String(args.tokenId)),
      );
      return done(borrows.length > 0 && ownership.length > 0);
    }
    if (decoded.functionName === "repayLoan") {
      const [loanId, maximumRepay, collateralReturned, beneficiary] =
        decoded.args;
      return done(
        matching(revLoansAbi, "RepayLoan", call.to, (args) => {
          const loan = args.loan as Record<string, unknown>;
          const paidOff = args.paidOffLoan as Record<string, unknown>;
          // The contract returns all collateral if the remaining debt rounds down to zero.
          const returned =
            args.collateralCountToReturn === collateralReturned ||
            (paidOff.amount === 0n &&
              args.collateralCountToReturn === loan.collateral);
          return (
            fromCaller(args) &&
            args.loanId === loanId &&
            projectMatches(args.revnetId) &&
            returned &&
            same(args.beneficiary, beneficiary) &&
            typeof args.repayBorrowAmount === "bigint" &&
            args.repayBorrowAmount <= maximumRepay
          );
        }).length > 0,
      );
    }
    return done(false);
  }
  if (same(call.to, v6Address("REVOwner", call.chainId))) {
    const decoded = decodeFunctionData({ abi: revOwnerAbi, data: call.data });
    if (decoded.functionName !== "autoIssueFor") return done(false);
    const [projectId, stageId, beneficiary] = decoded.args;
    return done(
      projectMatches(projectId) &&
        matching(
          revOwnerAbi,
          "AutoIssue",
          call.to,
          (args) =>
            fromCaller(args) &&
            args.revnetId === projectId &&
            args.stageId === stageId &&
            same(args.beneficiary, beneficiary) &&
            typeof args.count === "bigint" &&
            args.count > 0n,
        ).length > 0,
    );
  }
  if (same(call.to, v6Address("JB721TiersHookProjectDeployer", call.chainId))) {
    const decoded = decodeFunctionData({
      abi: jb721TiersHookProjectDeployerAbi,
      data: call.data,
    });
    if (decoded.functionName !== "launchProjectFor") return done(false);
    const [owner, , configuration, controller] = decoded.args;
    if (!same(controller, v6Address("JBController", call.chainId)))
      return done(
        false,
        "Only canonical-controller NFT project launches have a supported verifier.",
      );
    const created = matching(
      jbProjectsAbi,
      "Create",
      v6Address("JBProjects", call.chainId),
      (args) => same(args.owner, call.to) && same(args.caller, call.to),
    );
    const ids = new Set(
      created.map((event) => (event.args as Record<string, unknown>).projectId),
    );
    const hooks = matching(
      jb721TiersHookDeployerAbi,
      "HookDeployed",
      v6Address("JB721TiersHookDeployer", call.chainId),
      (args) =>
        ids.has(String(args.projectId)) &&
        same(args.caller, call.to) &&
        typeof args.hook === "string" &&
        !same(args.hook, zeroAddress),
    );
    const rulesets = matching(
      jbControllerAbi,
      "LaunchRulesets",
      controller,
      (args) =>
        ids.has(String(args.projectId)) &&
        same(args.caller, call.to) &&
        args.projectUri === configuration.projectUri &&
        args.memo === configuration.memo,
    );
    const ownership = matching(
      jbProjectsAbi,
      "Transfer",
      v6Address("JBProjects", call.chainId),
      (args) =>
        ids.has(String(args.tokenId)) &&
        same(args.from, call.to) &&
        same(args.to, owner),
    );
    const verified =
      created.length === 1 &&
      hooks.length === 1 &&
      rulesets.length === 1 &&
      ownership.length === 1;
    return done(
      verified,
      verified
        ? "The project and its NFT hook were created on this chain, initial rulesets were launched, and the project NFT was delivered to the requested owner."
        : "The canonical project creation, hook association, launched rulesets and requested ownership transfer were not all verified.",
    );
  }
  if (same(call.to, v6Address("REVDeployer", call.chainId))) {
    const decoded = decodeFunctionData({
      abi: revDeployerAbi,
      data: call.data,
    });
    if (decoded.functionName !== "deployFor" || decoded.args[0] !== 0n)
      return done(
        false,
        "Only new canonical revnet deployment receipts have a supported deployment verifier.",
      );
    const [, configuration, , suckerConfiguration] = decoded.args;
    const deployments = matching(
      revDeployerAbi,
      "DeployRevnet",
      call.to,
      (args) =>
        fromCaller(args) &&
        equalData(args.configuration, configuration) &&
        equalData(args.suckerDeploymentConfiguration, suckerConfiguration),
    );
    const ids = new Set(
      deployments.map(
        (event) => (event.args as Record<string, unknown>).revnetId,
      ),
    );
    const created = matching(
      jbProjectsAbi,
      "Create",
      v6Address("JBProjects", call.chainId),
      (args) =>
        ids.has(String(args.projectId)) &&
        same(args.owner, call.to) &&
        same(args.caller, call.to),
    );
    const initialized = matching(
      revOwnerAbi,
      "InitializeRevnet",
      v6Address("REVOwner", call.chainId),
      (args) => ids.has(String(args.revnetId)) && same(args.caller, call.to),
    );
    const ownership = matching(
      jbProjectsAbi,
      "Transfer",
      v6Address("JBProjects", call.chainId),
      (args) =>
        ids.has(String(args.tokenId)) &&
        same(args.from, call.to) &&
        same(args.to, v6Address("REVOwner", call.chainId)),
    );
    const expectedSuckers = suckerConfiguration.deployerConfigurations;
    const suckers = matching(
      jbSuckerRegistryAbi,
      "SuckerDeployedFor",
      v6Address("JBSuckerRegistry", call.chainId),
      (args) =>
        ids.has(String(args.projectId)) &&
        same(args.caller, call.to) &&
        expectedSuckers.some((configuration) =>
          equalData(args.configuration, configuration),
        ),
    );
    const actualConfigurations = suckers
      .map((event) =>
        canonicalJson((event.args as Record<string, unknown>).configuration),
      )
      .sort();
    const expectedConfigurations = expectedSuckers
      .map((configuration) => canonicalJson(jsonSafe(configuration)))
      .sort();
    const verified =
      deployments.length === 1 &&
      created.length === 1 &&
      initialized.length === 1 &&
      ownership.length === 1 &&
      equalData(actualConfigurations, expectedConfigurations);
    return done(
      verified,
      verified
        ? "The revnet, project ownership, and requested local suckers were created. Peer deployments, transport delivery, and cross-chain connectivity require separate verification."
        : "Required revnet creation, ownership, initialization, or requested local sucker-deployment events are missing.",
    );
  }
  if (["bridge_claim", "sync_accounting"].includes(plan.draft.operation)) {
    // Plan producers prove canonical-registry membership + projectId before sealing a sucker call.
    // Restrict this instance-address verifier to those producer operations and the signed project chain.
    if (!plan.draft.project || plan.draft.project.chainId !== call.chainId)
      return done(false);
    const decoded = decodeFunctionData({ abi: jbSuckerV6Abi, data: call.data });
    if (
      plan.draft.operation === "bridge_claim" &&
      decoded.functionName === "claim"
    ) {
      const [claim] = decoded.args;
      return done(
        matching(
          suckerReceiptAbi,
          "Claimed",
          call.to,
          (args) =>
            fromCaller(args) &&
            same(args.token, claim.token) &&
            same(args.beneficiary, claim.leaf.beneficiary) &&
            args.projectTokenCount === claim.leaf.projectTokenCount &&
            args.terminalTokenAmount === claim.leaf.terminalTokenAmount &&
            args.index === claim.leaf.index &&
            same(args.metadata, claim.leaf.metadata),
        ).length > 0,
      );
    }
    if (
      plan.draft.operation === "sync_accounting" &&
      decoded.functionName === "syncAccountingData"
    ) {
      const synced = matching(
        suckerReceiptAbi,
        "AccountingDataSynced",
        call.to,
        (args) =>
          fromCaller(args) &&
          typeof args.sourceTimestamp === "bigint" &&
          args.sourceTimestamp > 0n,
      );
      return done(
        synced.length > 0,
        synced.length > 0
          ? "The source sucker sent accounting data. Destination delivery and freshness are not verified by this source receipt."
          : undefined,
      );
    }
    return done(false);
  }
  const summary = plan.draft.summary as Record<string, unknown> | null;
  if (
    summary?.operation === "721_adjust_tiers" &&
    same(summary.hook, call.to)
  ) {
    // The producer authenticates this exact Solady clone, immutable implementation, store and project.
    if (!plan.draft.project || !equalData(summary.project, plan.draft.project))
      return done(false);
    const decoded = decodeFunctionData({
      abi: jb721TiersHookAbi,
      data: call.data,
    });
    if (decoded.functionName !== "adjustTiers") return done(false);
    const [tiers, removals] = decoded.args;
    const added = matching(
      jb721TiersHookAbi,
      "AddTier",
      call.to,
      (args) =>
        fromCaller(args) && tiers.some((tier) => equalData(args.tier, tier)),
    );
    const removed = matching(
      jb721TiersHookAbi,
      "RemoveTier",
      call.to,
      (args) => fromCaller(args) && removals.includes(args.tierId as bigint),
    );
    const actualConfigurations = added
      .map((event) =>
        canonicalJson((event.args as Record<string, unknown>).tier),
      )
      .sort();
    const expectedConfigurations = tiers
      .map((tier) => canonicalJson(jsonSafe(tier)))
      .sort();
    return done(
      equalData(actualConfigurations, expectedConfigurations) &&
        new Set(
          removed.map(
            (event) => (event.args as Record<string, unknown>).tierId,
          ),
        ).size === removals.length,
    );
  }
  if (same(call.to, v6Address("JBBuybackHookRegistry", call.chainId))) {
    const decoded = decodeFunctionData({
      abi: jbBuybackHookRegistryAbi,
      data: call.data,
    });
    if (decoded.functionName !== "setHookFor") return done(false);
    const [projectId, hook] = decoded.args;
    return done(
      projectMatches(projectId) &&
        matching(
          jbBuybackHookRegistryAbi,
          "JBBuybackHookRegistry_SetHook",
          call.to,
          (args) =>
            fromCaller(args) &&
            args.projectId === projectId &&
            same(args.hook, hook),
        ).length > 0,
    );
  }
  if (same(call.to, v6Address("JBRouterTerminalRegistry", call.chainId))) {
    const decoded = decodeFunctionData({
      abi: jbRouterTerminalRegistryAbi,
      data: call.data,
    });
    if (decoded.functionName !== "setTerminalFor") return done(false);
    const [projectId, terminal] = decoded.args;
    return done(
      projectMatches(projectId) &&
        matching(
          jbRouterTerminalRegistryAbi,
          "JBRouterTerminalRegistry_SetTerminal",
          call.to,
          (args) =>
            fromCaller(args) &&
            args.projectId === projectId &&
            same(args.terminal, terminal),
        ).length > 0,
    );
  }
  if (
    v6Deployments("JBBuybackHook", call.chainId).some((address) =>
      same(call.to, address),
    )
  ) {
    const decoded = decodeFunctionData({
      abi: jbBuybackHookAbi,
      data: call.data,
    });
    if (decoded.functionName === "setTwapWindowOf") {
      const [projectId, terminalToken, window] = decoded.args;
      const normalized = same(terminalToken, NATIVE_TOKEN)
        ? zeroAddress
        : terminalToken;
      return done(
        projectMatches(projectId) &&
          matching(
            jbBuybackHookAbi,
            "TwapWindowChanged",
            call.to,
            (args) =>
              fromCaller(args) &&
              args.projectId === projectId &&
              same(args.terminalToken, normalized) &&
              args.newWindow === window,
          ).length > 0,
      );
    }
    if (decoded.functionName === "setPoolFor") {
      const projectId = decoded.args[0];
      const window =
        decoded.args.length === 4 ? decoded.args[2] : decoded.args[3];
      const terminalToken =
        decoded.args.length === 4 ? decoded.args[3] : decoded.args[4];
      const key = reviewedPoolKey(
        decoded.args.length === 4 ? decoded.args[1] : summary?.key,
      );
      if (!key)
        return done(false, "The reviewed pool key is unavailable or invalid.");
      const normalized = same(terminalToken, NATIVE_TOKEN)
        ? zeroAddress
        : terminalToken;
      if (
        decoded.args.length === 5 &&
        (key.fee !== decoded.args[1] ||
          key.tickSpacing !== decoded.args[2] ||
          (!same(key.currency0, normalized) &&
            !same(key.currency1, normalized)))
      )
        return done(
          false,
          "The reviewed pool key does not match the signed fee, tick spacing, or terminal token.",
        );
      const poolId = uniswapV4PoolId(key);
      const pools = matching(
        jbBuybackHookAbi,
        "PoolAdded",
        call.to,
        (args) =>
          fromCaller(args) &&
          projectMatches(args.projectId) &&
          args.projectId === projectId &&
          same(args.terminalToken, normalized) &&
          same(args.poolId, poolId),
      );
      // The rollout hook remaps the registration sentinel; retired 1.1.1/v1 store the literal window.
      const expectedWindow =
        window === 172800n &&
        same(call.to, v6Address("JBBuybackHook", call.chainId))
          ? 1800n
          : window;
      const windows = matching(
        jbBuybackHookAbi,
        "TwapWindowChanged",
        call.to,
        (args) =>
          fromCaller(args) &&
          args.projectId === projectId &&
          same(args.terminalToken, normalized) &&
          args.newWindow === expectedWindow,
      );
      return done(pools.length > 0 && windows.length > 0);
    }
    return done(false);
  }
  return undefined;
}

function nftPaymentEvidence(
  plan: { draft: V6OperationDraft },
  logs: TransactionReceipt["logs"],
  terminal: Address,
) {
  const summary = plan.draft.summary as Record<string, unknown> | null;
  const events: V6OutcomeEvidence[] = [];
  if (
    !summary ||
    !same(summary.operation, "721_pay") ||
    !plan.draft.project ||
    !equalData(summary.project, plan.draft.project) ||
    typeof summary.hook !== "string" ||
    !Array.isArray(summary.tierIds)
  )
    return {
      verified: false,
      events,
      reason: "The signed NFT delivery specification is unavailable.",
    };
  const minted: string[] = [];
  const transferred = new Set<string>();
  const tokenIds = new Set<string>();
  for (const log of logs) {
    if (!same(log.address, summary.hook)) continue;
    try {
      const event = decodeEventLog({
        abi: jb721TiersHookAbi,
        data: log.data,
        topics: log.topics,
        strict: true,
      });
      if (
        event.eventName === "Mint" &&
        same(event.args.beneficiary, summary.beneficiary) &&
        same(event.args.caller, terminal)
      ) {
        minted.push(event.args.tierId.toString());
        tokenIds.add(event.args.tokenId.toString());
        events.push({
          emitter: log.address,
          event: event.eventName,
          logIndex: log.logIndex,
          args: jsonSafe(event.args),
        });
      }
      if (
        event.eventName === "Transfer" &&
        same(event.args.from, zeroAddress) &&
        same(event.args.to, summary.beneficiary)
      )
        transferred.add(event.args.tokenId.toString());
    } catch {
      /* Mint + ERC721 Transfer are both required from the authenticated clone. */
    }
  }
  const verified =
    equalData(minted.sort(), summary.tierIds.map(String).sort()) &&
    minted.length === tokenIds.size &&
    [...tokenIds].every((id) => transferred.has(id));
  return {
    verified,
    events,
    ...(verified
      ? {}
      : {
          reason:
            "Payment confirmed, but the expected NFT tier Mint and ownership Transfer events were not all verified for the planned beneficiary.",
        }),
  };
}
