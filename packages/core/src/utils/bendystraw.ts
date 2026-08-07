import { JB_CHAINS } from "../constants.js";

export const BENDYSTRAW_TIMEOUT_MS = 15_000;
export const MAX_BENDYSTRAW_RESPONSE_BYTES = 5 * 1024 * 1024;
export const BENDYSTRAW_PROJECT_REF_BATCH_SIZE = 200;
export const BENDYSTRAW_CACHE_TTL_MS = {
  live: 15_000,
  standard: 30_000,
  stable: 60_000,
} as const;

const RETRY_DELAYS_MS = [250, 750] as const;
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

export type BendystrawFilter = Record<string, unknown>;
export type BendystrawNetwork = "mainnet" | "testnet";
export type BendystrawCachePolicy = keyof typeof BENDYSTRAW_CACHE_TTL_MS;
export type BendystrawValidator<T> = (value: unknown) => value is T;

export type BendystrawNetworkSelection = {
  chainId?: number;
  defaultNetwork?: BendystrawNetwork;
  network?: BendystrawNetwork;
  variables?: unknown;
};

export type BendystrawEndpoints = {
  mainnet: string;
  testnet: string;
};

export type BendystrawProjectRef = {
  chainId: number;
  projectId: number;
  version?: number;
};

export type BendystrawProjectRow = {
  chainId?: unknown;
  projectId?: unknown;
  version?: unknown;
};

export class BendystrawRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "BendystrawRequestError";
  }
}

/**
 * The internal per-attempt request timeout elapsed.
 *
 * It exists so a timeout can be told apart from a caller cancel: both abort the
 * same `AbortController`, and without a distinct reason the timeout surfaces as
 * a bare `AbortError` indistinguishable from `options.signal` firing. Bendystraw
 * is known to spike to 5-13 s, so treating its timeout as a deliberate cancel
 * turned the most likely transient failure into a hard first-attempt error.
 */
export class BendystrawTimeoutError extends Error {
  constructor(readonly timeoutMs: number) {
    super(`Bendystraw request timed out after ${timeoutMs}ms`);
    this.name = "BendystrawTimeoutError";
  }
}

export type BendystrawRequestOptions<
  TResult = unknown,
  TVariables extends object = Record<string, never>,
> = {
  fetch?: typeof fetch;
  maxResponseBytes?: number;
  operationName?: string;
  retryDelaysMs?: readonly number[];
  signal?: AbortSignal;
  timeoutMs?: number;
  validateData?: BendystrawValidator<TResult>;
  validateVariables?: BendystrawValidator<TVariables>;
};

function collectBendystrawChainIds(
  value: unknown,
  chainIds: Set<number>,
  depth = 0,
): void {
  if (value === null || typeof value !== "object") return;
  if (depth > 12) {
    throw new TypeError("Bendystraw variables exceed the nesting limit");
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectBendystrawChainIds(item, chainIds, depth + 1);
    }
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    if (key === "chainId" || key === "chainId_in") {
      const candidates = Array.isArray(item) ? item : [item];
      for (const candidate of candidates) {
        const chainId =
          typeof candidate === "string" && candidate.trim()
            ? Number(candidate)
            : candidate;
        if (!Number.isSafeInteger(chainId) || Number(chainId) <= 0) {
          throw new TypeError(`Invalid Bendystraw ${key}`);
        }
        chainIds.add(Number(chainId));
      }
    } else {
      collectBendystrawChainIds(item, chainIds, depth + 1);
    }
  }
}

function networkForChainId(chainId: number): BendystrawNetwork {
  const metadata = JB_CHAINS[chainId as keyof typeof JB_CHAINS];
  if (!metadata) {
    throw new TypeError(`Unsupported Bendystraw chain ID: ${chainId}`);
  }
  return metadata.chain.testnet ? "testnet" : "mainnet";
}

/**
 * Resolve the Bendystraw network for an operation from every chain selector in
 * its variables. Unknown chains, mixed networks, and explicit contradictions
 * fail closed instead of silently querying the wrong index.
 */
export function resolveBendystrawNetwork(
  selection: BendystrawNetworkSelection = {},
): BendystrawNetwork {
  const chainIds = new Set<number>();
  if (selection.chainId !== undefined) {
    if (!Number.isSafeInteger(selection.chainId) || selection.chainId <= 0) {
      throw new TypeError("Invalid Bendystraw chainId");
    }
    chainIds.add(selection.chainId);
  }
  collectBendystrawChainIds(selection.variables, chainIds);

  const inferred = new Set(
    [...chainIds].map((chainId) => networkForChainId(chainId)),
  );
  if (inferred.size > 1) {
    throw new TypeError(
      "A Bendystraw request cannot mix mainnet and testnet chains",
    );
  }
  const inferredNetwork = [...inferred][0];
  if (
    selection.network &&
    inferredNetwork &&
    selection.network !== inferredNetwork
  ) {
    throw new TypeError(
      `Bendystraw network ${selection.network} conflicts with ${inferredNetwork} chain variables`,
    );
  }
  return (
    selection.network ??
    inferredNetwork ??
    selection.defaultNetwork ??
    "mainnet"
  );
}

/** Normalize a Bendystraw origin or endpoint to one canonical GraphQL URL. */
export function normalizeBendystrawEndpoint(endpoint: string): string {
  const url = new URL(endpoint);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new TypeError("Bendystraw endpoint must use HTTP or HTTPS");
  }
  url.pathname = `${url.pathname
    .replace(/\/graphql\/?$/u, "")
    .replace(/\/$/u, "")}/graphql`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

/** Select and normalize the endpoint for the operation's resolved network. */
export function selectBendystrawEndpoint(
  endpoints: BendystrawEndpoints,
  selection: BendystrawNetworkSelection = {},
): string {
  return normalizeBendystrawEndpoint(
    endpoints[resolveBendystrawNetwork(selection)],
  );
}

export function isBendystrawRecord(
  value: unknown,
): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Build a lightweight guard for the required root fields of an operation. */
export function bendystrawDataHasFields<const TKey extends string>(
  ...fields: readonly TKey[]
): BendystrawValidator<Record<TKey, unknown>> {
  return (value): value is Record<TKey, unknown> =>
    isBendystrawRecord(value) &&
    fields.every((field) => Object.prototype.hasOwnProperty.call(value, field));
}

export function assertBendystrawData<T>(
  value: unknown,
  validator: BendystrawValidator<T>,
  operationName = "Bendystraw operation",
): T {
  if (!validator(value)) {
    throw new BendystrawRequestError(
      `${operationName} returned invalid data`,
      502,
    );
  }
  return value;
}

export function assertBendystrawVariables<T extends object>(
  value: unknown,
  validator: BendystrawValidator<T>,
  operationName = "Bendystraw operation",
): T {
  if (!validator(value)) {
    throw new BendystrawRequestError(
      `${operationName} received invalid variables`,
      400,
    );
  }
  return value;
}

/**
 * Shared freshness vocabulary for clients. The transport does not cache.
 *
 * - `live`: balances, activity, and mutable project state.
 * - `standard`: lists, search, and aggregate charts.
 * - `stable`: metadata and historical records.
 *
 * Writes should invalidate affected reads. An indexer failure may fall back to
 * an authoritative RPC read only when the fallback preserves the same scoped
 * identity; failures must never be converted into zero or empty data.
 */
export function bendystrawCacheTtl(policy: BendystrawCachePolicy): number {
  return BENDYSTRAW_CACHE_TTL_MS[policy];
}

function normalizeProjectRef(
  ref: BendystrawProjectRef,
): Required<BendystrawProjectRef> {
  const version = ref.version ?? 6;
  if (
    !Number.isSafeInteger(ref.chainId) ||
    ref.chainId <= 0 ||
    !Number.isSafeInteger(ref.projectId) ||
    ref.projectId <= 0 ||
    !Number.isSafeInteger(version) ||
    version <= 0
  ) {
    throw new TypeError("Invalid Bendystraw project reference");
  }
  return { chainId: ref.chainId, projectId: ref.projectId, version };
}

/**
 * Build an explicit conjunction for one versioned deployment. Keeping each
 * identity field in its own `AND` member prevents accidental project/chain
 * cross-products when multiple deployments are combined with `OR`.
 */
export function bendystrawProjectRefFilter(
  ref: BendystrawProjectRef,
): BendystrawFilter {
  const normalized = normalizeProjectRef(ref);
  return {
    AND: [
      { chainId: normalized.chainId },
      { projectId: normalized.projectId },
      { version: normalized.version },
    ],
  };
}

/**
 * Build an exact filter for one or more deployments. An empty list throws
 * instead of silently producing a broad, unscoped indexer query.
 */
export function bendystrawProjectRefsFilter(
  refs: readonly BendystrawProjectRef[],
): BendystrawFilter {
  const unique = new Map<string, Required<BendystrawProjectRef>>();
  for (const ref of refs) {
    const normalized = normalizeProjectRef(ref);
    unique.set(
      `${normalized.chainId}:${normalized.projectId}:${normalized.version}`,
      normalized,
    );
  }
  const filters = [...unique.values()].map(bendystrawProjectRefFilter);
  if (filters.length === 0) {
    throw new TypeError(
      "At least one Bendystraw project reference is required",
    );
  }
  return filters.length === 1 ? filters[0] : { OR: filters };
}

/**
 * Build independently queryable exact-deployment filters without handing an
 * indexer one unbounded `OR`. Empty input produces no queries; malformed refs
 * still fail closed.
 */
export function bendystrawProjectRefsFilters(
  refs: readonly BendystrawProjectRef[],
  batchSize = BENDYSTRAW_PROJECT_REF_BATCH_SIZE,
): BendystrawFilter[] {
  if (!Number.isSafeInteger(batchSize) || batchSize <= 0) {
    throw new TypeError("batchSize must be a positive safe integer");
  }

  const unique = new Map<string, Required<BendystrawProjectRef>>();
  for (const ref of refs) {
    const normalized = normalizeProjectRef(ref);
    unique.set(
      `${normalized.chainId}:${normalized.projectId}:${normalized.version}`,
      normalized,
    );
  }

  const normalized = [...unique.values()];
  const batches: BendystrawFilter[] = [];
  for (let index = 0; index < normalized.length; index += batchSize) {
    batches.push({
      OR: normalized
        .slice(index, index + batchSize)
        .map(bendystrawProjectRefFilter),
    });
  }
  return batches;
}

/**
 * Verify that an indexer row belongs to one of the requested deployments.
 * Use this at the response boundary as defense in depth against stale schemas,
 * permissive filters, and indexer regressions.
 */
export function matchesBendystrawProjectRef(
  row: BendystrawProjectRow,
  refs: readonly BendystrawProjectRef[],
): boolean {
  const chainId = Number(row.chainId);
  const projectId = Number(row.projectId);
  const version = Number(row.version);
  if (
    !Number.isSafeInteger(chainId) ||
    !Number.isSafeInteger(projectId) ||
    !Number.isSafeInteger(version)
  ) {
    return false;
  }
  return refs.some((ref) => {
    const normalized = normalizeProjectRef(ref);
    return (
      chainId === normalized.chainId &&
      projectId === normalized.projectId &&
      version === normalized.version
    );
  });
}

async function readBoundedBody(
  response: Response,
  maxResponseBytes: number,
): Promise<Uint8Array> {
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredSize) && declaredSize > maxResponseBytes) {
    await response.body?.cancel();
    throw new BendystrawRequestError(
      "Bendystraw response exceeds the size limit",
      502,
    );
  }
  if (!response.headers.get("content-type")?.toLowerCase().includes("json")) {
    await response.body?.cancel();
    throw new BendystrawRequestError(
      "Bendystraw returned an invalid content type",
      502,
    );
  }
  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxResponseBytes) {
        await reader.cancel("Bendystraw response exceeds the size limit");
        throw new BendystrawRequestError(
          "Bendystraw response exceeds the size limit",
          502,
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function abortName(error: unknown): string | undefined {
  return error instanceof Error ? error.name : undefined;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Execute a bounded, timeout-protected Bendystraw GraphQL request.
 *
 * The helper retries only transient transport failures — including its own
 * per-attempt {@link BendystrawTimeoutError}. GraphQL errors, invalid
 * envelopes, invalid content types, oversized bodies, and caller cancellation
 * (`options.signal`) fail closed without being retried.
 *
 * @throws {BendystrawTimeoutError} When every attempt timed out.
 */
export async function requestBendystraw<
  TResult,
  TVariables extends object = Record<string, never>,
>(
  endpoint: string,
  query: string,
  variables: TVariables,
  options: BendystrawRequestOptions<TResult, TVariables> = {},
): Promise<TResult> {
  const fetchImpl = options.fetch ?? fetch;
  const maxResponseBytes =
    options.maxResponseBytes ?? MAX_BENDYSTRAW_RESPONSE_BYTES;
  const retryDelaysMs = options.retryDelaysMs ?? RETRY_DELAYS_MS;
  const timeoutMs = options.timeoutMs ?? BENDYSTRAW_TIMEOUT_MS;

  if (!Number.isSafeInteger(maxResponseBytes) || maxResponseBytes <= 0) {
    throw new TypeError("maxResponseBytes must be a positive safe integer");
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError("timeoutMs must be positive");
  }
  if (options.validateVariables) {
    assertBendystrawVariables(
      variables,
      options.validateVariables,
      options.operationName,
    );
  }

  for (let attempt = 0; ; attempt += 1) {
    const controller = new AbortController();
    const abort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener("abort", abort, { once: true });
    const timeoutReason = new BendystrawTimeoutError(timeoutMs);
    const timeout = setTimeout(
      () => controller.abort(timeoutReason),
      timeoutMs,
    );
    try {
      if (options.signal?.aborted) abort();
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/graphql-response+json, application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          variables,
          ...(options.operationName
            ? { operationName: options.operationName }
            : {}),
        }),
        signal: controller.signal,
      });

      if (
        RETRYABLE_STATUSES.has(response.status) &&
        attempt < retryDelaysMs.length
      ) {
        await response.body?.cancel();
      } else {
        const bytes = await readBoundedBody(response, maxResponseBytes);
        let envelope: {
          data?: TResult;
          errors?: Array<{ message?: unknown }>;
        };
        try {
          envelope = JSON.parse(
            new TextDecoder().decode(bytes),
          ) as typeof envelope;
        } catch {
          throw new BendystrawRequestError(
            "Bendystraw returned invalid JSON",
            502,
          );
        }
        if (!response.ok) {
          throw new BendystrawRequestError(
            `Bendystraw request failed (${response.status})`,
            response.status,
          );
        }
        const message = envelope.errors?.find(
          (error) => typeof error?.message === "string",
        )?.message;
        if (envelope.errors?.length) {
          throw new BendystrawRequestError(
            typeof message === "string"
              ? message.slice(0, 500)
              : "Bendystraw query failed",
            502,
          );
        }
        if (!Object.prototype.hasOwnProperty.call(envelope, "data")) {
          throw new BendystrawRequestError(
            "Bendystraw response is missing data",
            502,
          );
        }
        const data = envelope.data as TResult;
        return options.validateData
          ? assertBendystrawData(
              data,
              options.validateData,
              options.operationName,
            )
          : data;
      }
    } catch (error) {
      // The internal timeout is a transient transport failure, so it retries.
      // Only a CALLER cancel fails closed — hence the distinct abort reason.
      const timedOut =
        controller.signal.reason === timeoutReason ||
        error === timeoutReason ||
        error instanceof BendystrawTimeoutError;
      const cancelled =
        !timedOut &&
        (options.signal?.aborted ||
          abortName(error) === "AbortError" ||
          abortName(error) === "TimeoutError");
      if (
        cancelled ||
        error instanceof BendystrawRequestError ||
        attempt >= retryDelaysMs.length
      ) {
        // Surface the timeout as itself rather than as an opaque `AbortError`.
        throw timedOut ? timeoutReason : error;
      }
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abort);
    }
    await delay(retryDelaysMs[attempt]);
  }
}
