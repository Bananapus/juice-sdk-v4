export const BENDYSTRAW_TIMEOUT_MS = 15_000;
export const MAX_BENDYSTRAW_RESPONSE_BYTES = 5 * 1024 * 1024;
export const BENDYSTRAW_PROJECT_REF_BATCH_SIZE = 200;

const RETRY_DELAYS_MS = [250, 750] as const;
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

export type BendystrawFilter = Record<string, unknown>;

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

export type BendystrawRequestOptions = {
  fetch?: typeof fetch;
  maxResponseBytes?: number;
  retryDelaysMs?: readonly number[];
  signal?: AbortSignal;
  timeoutMs?: number;
};

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
 * The helper retries only transient transport failures. GraphQL errors,
 * invalid envelopes, invalid content types, oversized bodies, and caller
 * cancellation fail closed without being retried.
 */
export async function requestBendystraw<
  TResult,
  TVariables extends object = Record<string, never>,
>(
  endpoint: string,
  query: string,
  variables: TVariables,
  options: BendystrawRequestOptions = {},
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

  for (let attempt = 0; ; attempt += 1) {
    const controller = new AbortController();
    const abort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      if (options.signal?.aborted) abort();
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/graphql-response+json, application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables }),
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
        return envelope.data as TResult;
      }
    } catch (error) {
      const aborted =
        options.signal?.aborted ||
        abortName(error) === "AbortError" ||
        abortName(error) === "TimeoutError";
      if (
        aborted ||
        error instanceof BendystrawRequestError ||
        attempt >= retryDelaysMs.length
      ) {
        throw error;
      }
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abort);
    }
    await delay(retryDelaysMs[attempt]);
  }
}
