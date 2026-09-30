import {
  decodeEventLog,
  formatUnits,
  numberToHex,
  parseAbi,
  type Address,
  type Hex,
} from "viem";
import {
  jbContractAddress,
  jbContractAddressHistory,
} from "../generated/juicebox.js";

// Shared by every Juicebox client. Simulation results are
// advisory estimates only; the existing transaction simulation/authorization remains mandatory.
const abi = parseAbi([
  "event Mint(uint256 indexed projectId,uint256 leftoverAmount,uint256 tokenCount,address caller)",
  "event Swap(uint256 indexed projectId,uint256 amountToSwapWith,bytes32 indexed poolId,uint256 amountReceived,address caller)",
  "event Pay(uint256 indexed rulesetId,uint256 indexed rulesetCycleNumber,uint256 indexed projectId,address payer,address beneficiary,uint256 amount,uint256 newlyIssuedTokenCount,string memo,bytes metadata,address caller)",
  "event MintTokens(address indexed beneficiary,uint256 indexed projectId,uint256 tokenCount,uint256 beneficiaryTokenCount,string memo,uint256 reservedPercent,address caller)",
  "event ProcessFee(uint256 indexed projectId,address indexed token,uint256 indexed amount,bool wasHeld,address beneficiary,address caller)",
]);
export type Fee = {
  key: string;
  projectId: bigint;
  beneficiary?: string;
  received: bigint;
  route: "fallback" | "swap" | "issuance" | "unknown";
};
export type FeeResult = {
  status: "none" | "fallback" | "ready" | "unknown";
  fees: Fee[];
  block?: string;
  checkedAt?: number;
};
export type FeeCall = {
  from?: Address;
  to: Address;
  data: Hex;
  value?: bigint;
  gas?: bigint;
};
export type FeeOptions = {
  trustedHooks: readonly string[];
  beneficiary: string;
  terminals?: readonly string[];
  controllers?: readonly string[];
  feePayers?: readonly string[];
};
export type FeeRpc = { request: (args: never) => Promise<unknown> };
const unknownResult = (): FeeResult => ({ status: "unknown", fees: [] });
const same = (a?: string, b?: string) =>
  !!a && !!b && a.toLowerCase() === b.toLowerCase();

/** Successful simulation logs include internal same-terminal fees that call traces cannot isolate. */
export function analyzeFeeSimulation(
  value: unknown,
  options: FeeOptions,
): FeeResult {
  if (!Array.isArray(value) || value.length !== 1) return unknownResult();
  const calls = value[0]?.calls;
  if (
    !Array.isArray(calls) ||
    calls.length !== 1 ||
    calls[0]?.status !== "0x1" ||
    !Array.isArray(calls[0]?.logs) ||
    calls[0].logs.length > 20000
  )
    return unknownResult();
  const records: {
    fee: Fee;
    payer: string;
    metadata: string;
    confirmed: boolean;
  }[] = [];
  const active = new Map<
    string,
    { fee: Fee; hook?: string; mint: boolean; swap: boolean; sawSwap: boolean }
  >();
  const includes = (
    addresses: readonly string[] | undefined,
    address: string,
  ) => addresses?.some((a) => same(a, address));
  try {
    for (const log of calls[0].logs) {
      let event;
      try {
        event = decodeEventLog({
          abi,
          data: log.data as Hex,
          topics: log.topics as [Hex, ...Hex[]],
        });
      } catch {
        continue;
      }
      const args = event.args;
      if (event.eventName === "Pay") {
        const a = event.args;
        if (!includes(options.terminals, log.address)) continue;
        const key = `${log.address.toLowerCase()}:${a.projectId}`;
        // Every pay closes the prior scope for this project, even if unrelated.
        active.delete(key);
        if (!includes(options.feePayers, a.payer) || a.amount === 0n) continue;
        const terminalPayer = includes(options.terminals, a.payer);
        if (terminalPayer && a.projectId !== 1n) continue;
        // Fee recipients can differ from the submitting account. Keep repeated
        // payments distinct without depending on unrelated fees earlier in the log.
        const identity = `${key}:${a.beneficiary.toLowerCase()}`;
        const fee: Fee = {
          key: identity,
          projectId: a.projectId,
          beneficiary: a.beneficiary,
          received: a.newlyIssuedTokenCount,
          route: a.newlyIssuedTokenCount > 0n ? "issuance" : "unknown",
        };
        records.push({
          fee,
          payer: a.payer,
          metadata: a.metadata,
          confirmed: !terminalPayer,
        });
        active.set(key, { fee, mint: false, swap: false, sawSwap: false });
      } else if (event.eventName === "Mint" || event.eventName === "Swap") {
        if (!includes(options.trustedHooks, log.address)) continue;
        const state = active.get(
          `${args.caller.toLowerCase()}:${args.projectId}`,
        );
        if (!state || (state.hook && !same(state.hook, log.address))) continue;
        state.hook = log.address;
        // Earlier direct issuance does not verify this hook's beneficiary receipt.
        state.fee.route = "unknown";
        if (event.eventName === "Mint" && event.args.tokenCount > 0n)
          state.mint = true;
        if (event.eventName === "Swap") state.sawSwap = true;
        if (event.eventName === "Swap" && event.args.amountReceived > 0n)
          state.swap = true;
      } else if (event.eventName === "MintTokens") {
        if (!includes(options.controllers, log.address)) continue;
        const matches = [...active.entries()].filter(
          ([, s]) =>
            s.fee.projectId === event.args.projectId &&
            same(s.fee.beneficiary, event.args.beneficiary) &&
            same(s.hook, event.args.caller),
        );
        if (matches.length !== 1) continue;
        const [key, state] = matches[0];
        state.fee.received += event.args.beneficiaryTokenCount;
        state.fee.route =
          state.fee.received === 0n
            ? "issuance"
            : state.swap
              ? "swap"
              : state.mint && state.sawSwap
                ? "issuance"
                : state.mint
                  ? "fallback"
                  : "unknown";
        active.delete(key);
      } else if (event.eventName === "ProcessFee") {
        if (!includes(options.terminals, log.address)) continue;
        // Ordinary project payouts also emit terminal-paid Pay logs, even to
        // project #1. Only ProcessFee after settlement proves a platform fee.
        const record = [...records]
          .reverse()
          .find(
            (r) =>
              !r.confirmed &&
              r.fee.projectId === 1n &&
              same(r.payer, log.address) &&
              same(r.fee.beneficiary, event.args.beneficiary) &&
              same(r.metadata, numberToHex(event.args.projectId, { size: 32 })),
          );
        if (record) record.confirmed = true;
      }
    }
  } catch {
    return unknownResult();
  }
  // Excluded payout candidates must not change a recognized fee's identity.
  const occurrences = new Map<string, number>();
  const fees = records
    .filter((r) => r.confirmed)
    .map(({ fee }) => {
      const occurrence = occurrences.get(fee.key) ?? 0;
      occurrences.set(fee.key, occurrence + 1);
      fee.key = `${fee.key}:${occurrence}`;
      return fee;
    });
  // Ordinary issuance has no buyback Mint/Swap event and must not be called a fallback.
  return {
    status: fees.some((f) => f.route === "fallback")
      ? "fallback"
      : fees.some((f) => f.route === "unknown")
        ? "unknown"
        : fees.some((f) => f.route === "swap")
          ? "ready"
          : "none",
    fees,
  };
}

export async function checkFeeBuyback(
  client: FeeRpc,
  call: FeeCall,
  options: FeeOptions,
): Promise<FeeResult> {
  if (!call.from || !options.trustedHooks.length) return unknownResult();
  // Bound provider stalls; a stalled quote must not trap the confirmation dialog.
  const request = async (args: unknown) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        client.request(args as never),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("Fee estimate timed out")),
            8000,
          );
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
  try {
    const block = await request({ method: "eth_blockNumber" });
    if (typeof block !== "string" || !/^0x[0-9a-f]+$/i.test(block))
      return unknownResult();
    const simulation = await request({
      method: "eth_simulateV1",
      params: [
        {
          blockStateCalls: [
            {
              calls: [
                {
                  from: call.from,
                  to: call.to,
                  data: call.data,
                  value: numberToHex(call.value ?? 0n),
                  gas: numberToHex(call.gas ?? 10000000n),
                },
              ],
            },
          ],
          validation: false,
        },
        block,
      ],
    });
    return {
      ...analyzeFeeSimulation(simulation, options),
      block,
      checkedAt: Date.now(),
    };
  } catch {
    return { ...unknownResult(), checkedAt: Date.now() };
  }
}

export function feeMessage(result: FeeResult): string {
  if (result.status === "fallback")
    return "Your fee would create tokens at the issuance rate. Wait for “Buyback ready” to use the pool rate.";
  if (result.status === "ready")
    return "Buyback ready — review and submit now. The rate may change before execution.";
  if (result.status === "unknown")
    return "Fee return unavailable. Retry now, or submit without an estimate.";
  return "";
}
export function feeReceipt(fee: Fee): string {
  const amount = formatUnits(fee.received, 18);
  const [whole, fraction] = amount.split(".");
  const recipient = fee.beneficiary
    ? ` to ${fee.beneficiary.slice(0, 6)}…${fee.beneficiary.slice(-4)}`
    : "";
  return `~${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${fraction ? "." + fraction.slice(0, 4) : ""} project #${fee.projectId} tokens${recipient}`;
}

/** Whether a reviewed call can pay a protocol fee, so its fee return is worth checking. */
export function isFeePayingCall(call: { functionName?: string }): boolean {
  return /^(?:borrowFrom|reallocateCollateralFromLoan|repayLoan|cashOutTokensOf|useAllowanceOf|sendPayoutsOf|processHeldFeesOf|pay)$/.test(
    call.functionName ?? "",
  );
}

const severity: Record<FeeResult["status"], number> = {
  none: 0,
  ready: 1,
  unknown: 2,
  fallback: 3,
};

/**
 * One result for a batch's fee-paying calls: the worst status, every fee keyed
 * by its call's index, and the oldest check time.
 */
export function combineFeeResults(results: readonly FeeResult[]): FeeResult {
  if (results.length === 1) return results[0];
  const checkedAt = Math.min(
    ...results.map((result) => result.checkedAt ?? Infinity),
  );
  return {
    status: results.reduce<FeeResult["status"]>(
      (worst, result) =>
        severity[result.status] > severity[worst] ? result.status : worst,
      "none",
    ),
    fees: results.flatMap((result, index) =>
      result.fees.map((fee) => ({ ...fee, key: `${index}:${fee.key}` })),
    ),
    ...(Number.isFinite(checkedAt) ? { checkedAt } : {}),
  };
}

/**
 * The review's confirm label while a fee return shows, or undefined to keep
 * the review's own label.
 */
export function feeReviewConfirmLabel({
  enabled,
  busy,
  status,
}: {
  /** Whether the review holds a fee-paying call ({@link isFeePayingCall}). */
  enabled: boolean;
  /** Whether a fee check is running. */
  busy: boolean;
  status: FeeResult["status"];
}): string | undefined {
  if (!enabled || status === "none") return undefined;
  if (busy) return "Checking fee return…";
  if (status === "fallback") return "Submit anyway";
  if (status === "ready") return "Review and submit";
  return "Submit without estimate";
}

/**
 * The contracts {@link checkFeeBuyback} trusts on `chainId`: every buyback hook
 * generation, the terminal and controller, and the terminal and REVLoans as
 * fee payers. A chain without deployments trusts nothing, so its check reads
 * as unknown.
 */
export function feeBuybackOptions(
  chainId: number,
  beneficiary: Address,
): Required<FeeOptions> {
  const current = jbContractAddress["6"] as Readonly<
    Partial<Record<string, Readonly<Record<string, string>>>>
  >;
  const history = jbContractAddressHistory["6"] as Readonly<
    Record<string, Readonly<Record<string, Readonly<Record<string, string>>>>>
  >;
  const deployed = (contract: string) =>
    [
      current[contract]?.[chainId],
      ...Object.values(history[contract] ?? {}).map(
        (generation) => generation[chainId],
      ),
    ].filter((address): address is string => !!address);
  const terminals = deployed("JBMultiTerminal");
  return {
    beneficiary,
    trustedHooks: deployed("JBBuybackHook"),
    terminals,
    controllers: deployed("JBController"),
    feePayers: [...terminals, ...deployed("REVLoans")],
  };
}

/** One review owns one watcher. It never sends, and stale/closed reviews cannot approve. */
export function createFeeWatch(
  check: () => Promise<FeeResult>,
  changed: (result: FeeResult) => void,
) {
  let stopped = false;
  let latest: FeeResult = unknownResult();
  let pending: Promise<FeeResult> | undefined;
  const affected = new Set<string>();
  const affectedCounts = new Map<string, number>();
  const identity = (fee: Fee) => fee.key.slice(0, fee.key.lastIndexOf(":"));
  async function refresh(): Promise<FeeResult> {
    if (stopped) return unknownResult();
    if (pending) return pending;
    pending = (async () => {
      let next: FeeResult;
      try {
        next = await check();
      } catch {
        next = unknownResult();
      }
      if (stopped) return unknownResult();
      const counts = new Map<string, number>();
      for (const fee of next.fees)
        counts.set(identity(fee), (counts.get(identity(fee)) ?? 0) + 1);
      for (const fee of next.fees) {
        if (fee.route !== "fallback") continue;
        affected.add(fee.key);
        const group = identity(fee);
        affectedCounts.set(
          group,
          Math.max(affectedCounts.get(group) ?? 0, counts.get(group) ?? 0),
        );
      }
      for (const [group, count] of affectedCounts)
        affectedCounts.set(group, Math.max(count, counts.get(group) ?? 0));
      if (
        next.status !== "fallback" &&
        ([...affectedCounts].some(
          ([group, count]) => (counts.get(group) ?? 0) < count,
        ) ||
          [...affected].some(
            (key) =>
              !next.fees.some((fee) => fee.key === key && fee.route === "swap"),
          ))
      )
        next = { ...next, status: "unknown" };
      latest = next;
      changed(next);
      return next;
    })();
    try {
      return await pending;
    } finally {
      pending = undefined;
    }
  }
  return {
    refresh,
    async confirm() {
      if (stopped) return false;
      const before = latest;
      if (pending) await pending;
      const fresh = await refresh();
      if (stopped) return false;
      // A fresh degradation must be displayed before the user can elect to submit anyway.
      if (
        fresh.status === "fallback" &&
        (before.status !== "fallback" ||
          fresh.fees.some(
            (fee) =>
              fee.route === "fallback" &&
              !before.fees.some(
                (old) => old.key === fee.key && old.route === "fallback",
              ),
          ))
      )
        return false;
      if (fresh.status === "unknown" && before.status !== "unknown")
        return false;
      return true;
    },
    stop() {
      stopped = true;
    },
  };
}
