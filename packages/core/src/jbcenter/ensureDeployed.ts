import type { Hex } from "viem";
// `jbcenter.ts` re-exports this module, so the two form an import cycle. Keep
// every value either side takes from the other inside a function body: a
// top-level read of `JBCenterRequestError` or `isSponsorable` would resolve
// before `jbcenter.ts` finishes evaluating under CJS.
import {
  JBCenterRequestError,
  isSponsorable,
  sponsorableChains,
  unsponsoredChains,
  type JBCenterClient,
  type JBCenterDeploymentCall,
  type JBCenterDeploymentInput,
  type JBCenterIntent,
  type JBCenterIntentDeploy,
  type JBCenterJsonObject,
  type JBCenterRelayRequest,
} from "../jbcenter.js";
import { deployedChains } from "./merge.js";

const DEFAULT_POLL_MS = 4_000;
const DEFAULT_TIMEOUT_MS = 600_000;
const SELF_PAID_FALLBACK_STATUSES = new Set([400, 429, 503]);

export type EnsureDeployedStep = {
  chainId: number;
  status:
    | "queued"
    | "sent"
    | "confirmed"
    | "failed"
    | "self-paid"
    | "relay-paid";
  transactionHash?: Hex;
};

export type EnsureDeployedOptions = {
  client: JBCenterClient;
  intent: JBCenterIntent<JBCenterJsonObject>;
  /**
   * The chains this run covers, each one of the intent's own. Omitted, the
   * run is every chain in the intent.
   */
  chainIds?: readonly number[];
  /**
   * Sends the forward request JB Center signed for a chain it does not
   * sponsor, and returns the deployment that transaction produced. The
   * request's `setup` calls go first, from the same wallet, in order. The
   * forwarder keeps Center's sponsor as the sender, so a chain paid for this
   * way pairs with every sponsored chain in the intent.
   */
  relayPaid?: (
    request: JBCenterRelayRequest,
  ) => Promise<JBCenterDeploymentInput>;
  /**
   * Runs the client's own launch pipeline for every remaining chain in the
   * run. The caller's wallet is then the sender, which a deployer that scopes
   * its token and sucker salt to the sender turns into a different token and
   * sucker address per chain; `relayPaid` keeps Center's sponsor as the
   * sender instead.
   */
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

/**
 * The chains this run covers, in the intent's own order. Naming a chain the
 * intent does not carry is a caller mistake, not a deploy failure.
 */
function runChains(
  intent: JBCenterIntent<JBCenterJsonObject>,
  chainIds: readonly number[] | undefined,
): number[] {
  if (!chainIds) return [...intent.envelope.chainIds];

  const requested = new Set(chainIds);
  for (const chainId of requested) {
    if (!intent.envelope.chainIds.includes(chainId)) {
      throw new EnsureDeployedError(
        `Chain ${chainId} is not part of this intent`,
        chainId,
      );
    }
  }

  const run = intent.envelope.chainIds.filter((id) => requested.has(id));
  if (run.length === 0) {
    throw new EnsureDeployedError("ensureDeployed was given no chains to run");
  }

  return run;
}

function isRunDeployed(
  intent: JBCenterIntent<JBCenterJsonObject>,
  run: readonly number[],
): boolean {
  const deployed = deployedChains(intent);

  return run.every((chainId) => chainId in deployed);
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
  run: readonly number[],
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

    if (isRunDeployed(current, run)) {
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
  run: readonly number[],
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
    (call) => run.includes(call.chainId) && !(call.chainId in deployed),
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
 * Whether a wallet sent one of the chains an intent has already landed. Every
 * chain in an intent belongs to one sender, and a deployment JB Center's
 * forwarder did not carry was sent by the caller's own wallet.
 */
function walletSent(intent: JBCenterIntent<JBCenterJsonObject>): boolean {
  return intent.deployments.some((deployment) => deployment.forwarded !== true);
}

/**
 * The sender an intent already has, or `undefined` when JB Center's sponsor is
 * still free to take the run. A deployment a wallet sent pins the intent to
 * `selfPaid`; deployments the forwarder carried leave the sponsor path open,
 * because every one of them reports Center's sponsor as the sender.
 */
function existingSender(
  options: EnsureDeployedOptions,
  intent: JBCenterIntent<JBCenterJsonObject>,
  run: readonly number[],
): Promise<Record<number, string>> | undefined {
  const { client, onStep, selfPaid, signal } = options;

  if (isRunDeployed(intent, run)) {
    return Promise.resolve(deployedChains(intent));
  }

  if (walletSent(intent)) {
    return runSelfPaid(client, intent, run, selfPaid, onStep, signal);
  }

  return undefined;
}

/**
 * Center's lane for the chains it sponsors and the caller's own sender for
 * the chains it does not, in one run. The sponsored chains are queued first,
 * in one request, so Center works while the visitor is still signing.
 */
async function runRelayPaid(
  options: EnsureDeployedOptions,
  relayPaid: NonNullable<EnsureDeployedOptions["relayPaid"]>,
  run: readonly number[],
  pollMs: number,
  timeoutMs: number,
): Promise<Record<number, string>> {
  const { client, intent, onStep, signal } = options;

  checkAborted(signal);

  const result = deployedChains(intent);
  const remaining = run.filter((chainId) => !(chainId in result));
  const sponsored = sponsorableChains(remaining);

  let deploys: JBCenterIntentDeploy[] = [];
  if (sponsored.length > 0) {
    ({ deploys } = await client.requestDeploy(intent.id, {
      chainIds: sponsored,
      signal,
    }));
  }

  for (const chainId of unsponsoredChains(remaining)) {
    checkAborted(signal);
    const request = await client.requestRelay(intent.id, chainId, { signal });
    const deployment = await relayPaid(request);
    if (deployment.chainId !== chainId) {
      throw new EnsureDeployedError(
        `Relay-paid deploy returned chain ${deployment.chainId} for chain ${chainId}`,
        chainId,
      );
    }
    await client.recordDeployment(intent.id, deployment, { signal });
    result[chainId] = deployment.projectId;
    onStep?.({
      chainId,
      status: "relay-paid",
      transactionHash: deployment.transactionHash,
    });
  }

  if (sponsored.length === 0) return result;

  return {
    ...result,
    ...(await pollUntilDeployed(
      client,
      { ...intent, deploys },
      remaining,
      pollMs,
      timeoutMs,
      signal,
      onStep,
    )),
  };
}

/**
 * The pre-step every webclient runs before the first on-chain write against
 * an undeployed intent: sponsor the deploy through JB Center for the chains
 * it covers, hand the rest to the caller's own sender, and poll until the
 * run's chains land. `chainIds` narrows the run to part of the intent.
 */
export async function ensureDeployed(
  options: EnsureDeployedOptions,
): Promise<Record<number, string>> {
  const { client, intent, onStep, relayPaid, selfPaid, signal } = options;
  const pollMs = options.pollMs ?? DEFAULT_POLL_MS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  if (relayPaid && selfPaid) {
    throw new EnsureDeployedError(
      "ensureDeployed takes relayPaid or selfPaid, never both",
    );
  }

  const run = runChains(intent, options.chainIds);

  const started = existingSender(options, intent, run);
  if (started) return started;

  if (relayPaid) {
    return runRelayPaid(options, relayPaid, run, pollMs, timeoutMs);
  }

  if (!isSponsorable(run)) {
    return runSelfPaid(client, intent, run, selfPaid, onStep, signal);
  }

  const deployed = deployedChains(intent);
  const pending = run.filter((chainId) => !(chainId in deployed));

  let deploys: JBCenterIntentDeploy[];
  try {
    checkAborted(signal);
    ({ deploys } = await client.requestDeploy(intent.id, {
      chainIds: pending,
      signal,
    }));
  } catch (error) {
    if (
      error instanceof JBCenterRequestError &&
      SELF_PAID_FALLBACK_STATUSES.has(error.status)
    ) {
      // The refusal may mean the sponsor already took this intent, so read the
      // intent back and follow whatever sender it now has instead of adding a
      // second one.
      const fresh = await client.getIntent(intent.id, { signal });
      const resumed = existingSender(options, fresh, run);
      if (resumed) return resumed;
      if (fresh.deploys.length > 0) {
        return pollUntilDeployed(
          client,
          fresh,
          run,
          pollMs,
          timeoutMs,
          signal,
          onStep,
        );
      }
      return runSelfPaid(client, fresh, run, selfPaid, onStep, signal);
    }
    throw error;
  }

  return pollUntilDeployed(
    client,
    { ...intent, deploys },
    run,
    pollMs,
    timeoutMs,
    signal,
    onStep,
  );
}
