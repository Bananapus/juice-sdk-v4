import type { Address, Hex } from "viem";

/**
 * Safe's per-chain app URL prefix. Wider than {@link SAFE_SERVICE_PREFIX}:
 * Safe app links work on chains without a hosted transaction service.
 */
export const SAFE_PREFIX: Partial<Record<number, string>> = {
  1: "eth",
  10: "oeth",
  8453: "base",
  42161: "arb1",
  11155111: "sep",
  11155420: "opsepolia",
  84532: "basesep",
  421614: "arb1-sep",
};

/**
 * Chains with a HOSTED Safe Transaction Service — a smaller set than the
 * chains Safe app links work on: `api.safe.global/tx-service/{opsepolia,
 * arb1-sep}` both 404, while `basesep` is live. Probed against
 * `/api/v1/about/`. This split from {@link SAFE_PREFIX} is DELIBERATE:
 * conflating the two maps is what made service calls fire at chains with
 * none. Every tx-service URL must come from here, never from `SAFE_PREFIX`.
 */
export const SAFE_SERVICE_PREFIX: Partial<Record<number, string>> = {
  1: "eth",
  10: "oeth",
  8453: "base",
  42161: "arb1",
  11155111: "sep",
  84532: "basesep",
};

/** The Safe Transaction Service base URL for a chain, honoring the
 *  `jb-safe-tx-base` localStorage override; null when the chain has none. */
export function safeServiceBase(chainId: number): string | null {
  try {
    const custom = JSON.parse(
      globalThis.localStorage?.getItem("jb-safe-tx-base") ?? "null",
    ) as Record<string, string> | null;
    if (custom?.[chainId]) return custom[chainId].replace(/\/$/, "");
  } catch {
    // Local overrides are optional.
  }
  const prefix = SAFE_SERVICE_PREFIX[chainId];
  return prefix ? `https://api.safe.global/tx-service/${prefix}` : null;
}

export const SAFE_NONCE_GUIDANCE =
  "On Safe’s confirmation screen, Nonce defaults to the next available value. Open its dropdown to see queued nonces and replace one if desired.";

/** Swap/mint execution deadline seconds: 20 minutes for an EOA, whose review
 *  and signature are one sitting. */
const SWAP_DEADLINE_SECONDS = 20 * 60;
/** Safe deadline seconds: co-signer collection routinely outlives 20 minutes,
 *  so match the 30-day Permit2 approval windows. The longer window widens MEV
 *  exposure only within the swap's already-frozen slippage floor. */
const SAFE_SWAP_DEADLINE_SECONDS = 30 * 24 * 60 * 60;

/** The unix deadline for a swap/liquidity transaction proposed now. */
export function swapDeadline(
  isSafe: boolean,
  nowMs: number = Date.now(),
): bigint {
  return BigInt(
    Math.floor(nowMs / 1000) +
      (isSafe ? SAFE_SWAP_DEADLINE_SECONDS : SWAP_DEADLINE_SECONDS),
  );
}

export function safeQueueUrl(chainId: number, safe: Address): string | null {
  const prefix = SAFE_PREFIX[chainId];
  return prefix
    ? `https://app.safe.global/transactions/queue?safe=${prefix}:${safe}`
    : null;
}

/**
 * Consecutive 404s from the transaction service before the wait gives up. The
 * service can lag a just-created proposal briefly, but a sustained 404 means
 * it will never report this proposal (wrong network or an unhosted chain that
 * slipped through) — polling forever just strands the flow at "pending".
 * At the default 5s interval this is about a minute of patience.
 */
const SAFE_EXECUTION_NOT_FOUND_LIMIT = 12;

/**
 * Whether a WalletConnect peer is Safe{Wallet}. It proposes like the Safe
 * app: the gas a dapp sends becomes the proposal's safeTxGas, and the reply is
 * a safeTxHash unless the owner executes at once.
 */
export function isSafeWalletPeer(url: string | undefined): boolean {
  try {
    return new URL(url ?? "").origin === "https://app.safe.global";
  } catch {
    return false;
  }
}

function noHostedService(chainId: number): Error {
  return new Error(
    `Safe does not host a transaction service on chain ${chainId}, so this proposal cannot be tracked here. Execute it from the Safe app; the action takes effect once it is executed there.`,
  );
}

/**
 * Resolve a Safe proposal identifier to its actual onchain execution hash.
 * A safeTxHash is not a transaction hash and must never be receipt-polled.
 *
 * The polling URL comes from {@link safeServiceBase} (the hosted-service
 * map), NOT `SAFE_PREFIX`: OP Sepolia and Arbitrum Sepolia have Safe app
 * URLs but no hosted transaction service, and polling a nonexistent service
 * left every Safe write there pending forever.
 *
 * With the chain's `client`, a hash the chain already knows as a transaction
 * is returned as the execution: over WalletConnect, Safe{Wallet} answers with
 * the execution's own hash when the owner executes at once.
 */
export async function waitForSafeExecutionHash(
  chainId: number,
  safeTxHash: Hex,
  options: {
    pollingIntervalMs?: number;
    signal?: AbortSignal;
    client?: { getTransaction: (args: { hash: Hex }) => Promise<unknown> };
  } = {},
): Promise<Hex> {
  const base = safeServiceBase(chainId);
  const { client } = options;
  if (!base && !client) throw noHostedService(chainId);
  const interval = options.pollingIntervalMs ?? 5_000;
  const endpoint =
    base && `${base}/api/v1/multisig-transactions/${safeTxHash}/`;
  let consecutiveNotFound = 0;

  for (;;) {
    if (options.signal?.aborted) {
      throw new DOMException("Safe execution wait aborted", "AbortError");
    }
    if (
      client &&
      (await client.getTransaction({ hash: safeTxHash }).then(
        () => true,
        () => false,
      ))
    ) {
      return safeTxHash;
    }
    if (!endpoint) {
      consecutiveNotFound += 1;
      if (consecutiveNotFound >= SAFE_EXECUTION_NOT_FOUND_LIMIT) {
        throw noHostedService(chainId);
      }
    } else {
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          consecutiveNotFound = 0;
          const transaction = (await response.json()) as {
            isExecuted?: boolean;
            isSuccessful?: boolean | null;
            transactionHash?: Hex | null;
          };
          if (transaction.isExecuted && transaction.isSuccessful === false) {
            throw new Error(
              "Safe executed the proposal, but the onchain transaction failed.",
            );
          }
          if (transaction.isExecuted && transaction.transactionHash) {
            return transaction.transactionHash;
          }
        } else if (response.status === 404) {
          consecutiveNotFound += 1;
          if (consecutiveNotFound >= SAFE_EXECUTION_NOT_FOUND_LIMIT) {
            throw new Error(
              "Safe’s transaction service has no record of this proposal. Tracking cannot continue here — check the proposal in the Safe app; if it exists there, it will still take effect once executed.",
            );
          }
        }
      } catch (error) {
        if (
          error instanceof Error &&
          /executed the proposal.*failed|no record of this proposal/i.test(
            error.message,
          )
        ) {
          throw error;
        }
        // Other service/network failures are transient. Keep the already-created
        // proposal pending instead of inviting a duplicate submission.
      }
    }
    await new Promise<void>((resolve, reject) => {
      function onAbort() {
        clearTimeout(timer);
        reject(new DOMException("Safe execution wait aborted", "AbortError"));
      }
      const timer = setTimeout(() => {
        options.signal?.removeEventListener("abort", onAbort);
        resolve();
      }, interval);
      options.signal?.addEventListener("abort", onAbort, { once: true });
      if (options.signal?.aborted) onAbort();
    });
  }
}
