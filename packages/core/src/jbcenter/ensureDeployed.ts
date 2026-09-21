import type { Hex } from "viem";
// `jbcenter.ts` re-exports this module, so the two form an import cycle. Keep
// every value either side takes from the other inside a function body: a
// top-level read of `JBCenterRequestError` or `isSponsorable` would resolve
// before `jbcenter.ts` finishes evaluating under CJS.
import {
  JBCenterRequestError,
  isSponsorable,
  type JBCenterClient,
  type JBCenterDeploymentCall,
  type JBCenterDeploymentInput,
  type JBCenterIntent,
  type JBCenterIntentDeploy,
  type JBCenterJsonObject,
} from "../jbcenter.js";
import { deployedChains, isFullyDeployed } from "./merge.js";

const DEFAULT_POLL_MS = 4_000;
const DEFAULT_TIMEOUT_MS = 600_000;
const SELF_PAID_FALLBACK_STATUSES = new Set([400, 429, 503]);

export type EnsureDeployedStep = {
  chainId: number;
  status: "queued" | "sent" | "confirmed" | "failed" | "self-paid";
  transactionHash?: Hex;
};

export type EnsureDeployedOptions = {
  client: JBCenterClient;
  intent: JBCenterIntent<JBCenterJsonObject>;
  /** Runs the client's own launch pipeline for every remaining chain. */
  selfPaid?: (
    calls: JBCenterDeploymentCall[],
  ) => Promise<JBCenterDeploymentInput[]>;
  onStep?: (step: EnsureDeployedStep) => void;
  pollMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
};

export class EnsureDeployedError extends Error {
  constructor(
    message: string,
    readonly chainId?: number,
  ) {
    super(message);
    this.name = "EnsureDeployedError";
  }
}

function checkAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw signal.reason;
  }
}

function sleep(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function reportSteps(
  deploys: readonly JBCenterIntentDeploy[],
  seen: Map<number, string>,
  onStep: EnsureDeployedOptions["onStep"],
): void {
  let failedChainId: number | undefined;

  for (const deploy of deploys) {
    if (seen.get(deploy.chainId) === deploy.status) continue;
    seen.set(deploy.chainId, deploy.status);
    onStep?.({
      chainId: deploy.chainId,
      status: deploy.status,
      transactionHash: deploy.transactionHash ?? undefined,
    });
    if (deploy.status === "failed" && failedChainId === undefined) {
      failedChainId = deploy.chainId;
    }
  }

  if (failedChainId !== undefined) {
    throw new EnsureDeployedError(
      `JB Center could not deploy chain ${failedChainId}`,
      failedChainId,
    );
  }
}

async function pollUntilDeployed(
  client: JBCenterClient,
  seed: JBCenterIntent<JBCenterJsonObject>,
  pollMs: number,
  timeoutMs: number,
  signal: AbortSignal | undefined,
  onStep: EnsureDeployedOptions["onStep"],
): Promise<Record<number, string>> {
  const seen = new Map<number, string>();
  const startedAt = Date.now();
  let current = seed;

  while (true) {
    checkAborted(signal);
    reportSteps(current.deploys, seen, onStep);

    if (isFullyDeployed(current)) {
      return deployedChains(current);
    }

    if (Date.now() - startedAt >= timeoutMs) {
      throw new EnsureDeployedError("JB Center deploy polling timed out");
    }

    await sleep(pollMs, signal);
    current = await client.getIntent(current.id, { signal });
  }
}

async function runSelfPaid(
  client: JBCenterClient,
  intent: JBCenterIntent<JBCenterJsonObject>,
  selfPaid: EnsureDeployedOptions["selfPaid"],
  onStep: EnsureDeployedOptions["onStep"],
  signal: AbortSignal | undefined,
): Promise<Record<number, string>> {
  if (!selfPaid) {
    throw new EnsureDeployedError(
      "JB Center cannot sponsor this deploy and no self-paid fallback was provided",
    );
  }

  checkAborted(signal);

  const deployed = deployedChains(intent);
  const remainingCalls = intent.envelope.deploymentCalls.filter(
    (call) => !(call.chainId in deployed),
  );

  const deployments = await selfPaid(remainingCalls);

  const remainingChainIds = new Set(remainingCalls.map((call) => call.chainId));
  const returnedChainIds = new Set<number>();
  for (const deployment of deployments) {
    if (!remainingChainIds.has(deployment.chainId)) {
      throw new EnsureDeployedError(
        `Self-paid deploy returned an unexpected chain ${deployment.chainId}`,
        deployment.chainId,
      );
    }
    if (returnedChainIds.has(deployment.chainId)) {
      throw new EnsureDeployedError(
        `Self-paid deploy returned chain ${deployment.chainId} more than once`,
        deployment.chainId,
      );
    }
    returnedChainIds.add(deployment.chainId);
  }

  for (const chainId of remainingChainIds) {
    if (!returnedChainIds.has(chainId)) {
      throw new EnsureDeployedError(
        `Self-paid deploy left chain ${chainId} undeployed`,
        chainId,
      );
    }
  }

  const result: Record<number, string> = { ...deployed };

  for (const deployment of deployments) {
    checkAborted(signal);
    await client.recordDeployment(intent.id, deployment, { signal });
    result[deployment.chainId] = deployment.projectId;
    onStep?.({
      chainId: deployment.chainId,
      status: "self-paid",
      transactionHash: deployment.transactionHash,
    });
  }

  return result;
}

/**
 * The sender an intent already has, or `undefined` when nothing has started
 * it yet. Every chain in an intent belongs to one sender, so this decides the
 * route before any new request goes out.
 */
function existingSender(
  options: EnsureDeployedOptions,
  intent: JBCenterIntent<JBCenterJsonObject>,
  pollMs: number,
  timeoutMs: number,
): Promise<Record<number, string>> | undefined {
  const { client, onStep, selfPaid, signal } = options;

  if (isFullyDeployed(intent)) {
    return Promise.resolve(deployedChains(intent));
  }

  if (intent.deploys.length > 0) {
    return pollUntilDeployed(client, intent, pollMs, timeoutMs, signal, onStep);
  }

  if (intent.deployments.length > 0) {
    return runSelfPaid(client, intent, selfPaid, onStep, signal);
  }

  return undefined;
}

/**
 * The pre-step every webclient runs before the first on-chain write against
 * an undeployed intent: sponsor the deploy through JB Center when eligible
 * and poll until every chain lands, or fall back to the caller's own launch
 * pipeline when JB Center can't or won't sponsor it.
 */
export async function ensureDeployed(
  options: EnsureDeployedOptions,
): Promise<Record<number, string>> {
  const { client, intent, onStep, selfPaid, signal } = options;
  const pollMs = options.pollMs ?? DEFAULT_POLL_MS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const started = existingSender(options, intent, pollMs, timeoutMs);
  if (started) return started;

  if (!isSponsorable(intent.envelope.chainIds)) {
    return runSelfPaid(client, intent, selfPaid, onStep, signal);
  }

  let deploys: JBCenterIntentDeploy[];
  try {
    checkAborted(signal);
    ({ deploys } = await client.requestDeploy(intent.id, { signal }));
  } catch (error) {
    if (
      error instanceof JBCenterRequestError &&
      SELF_PAID_FALLBACK_STATUSES.has(error.status)
    ) {
      // The refusal may mean the sponsor already took this intent, so read the
      // intent back and follow whatever sender it now has instead of adding a
      // second one.
      const fresh = await client.getIntent(intent.id, { signal });
      return (
        existingSender(options, fresh, pollMs, timeoutMs) ??
        runSelfPaid(client, fresh, selfPaid, onStep, signal)
      );
    }
    throw error;
  }

  return pollUntilDeployed(
    client,
    { ...intent, deploys },
    pollMs,
    timeoutMs,
    signal,
    onStep,
  );
}
