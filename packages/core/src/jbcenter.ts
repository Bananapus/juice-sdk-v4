import type { Address, Hex } from "viem";

export const JBCENTER_DEFAULT_URL = "https://juicebox.center";
export const JBCENTER_REQUEST_TIMEOUT_MS = 15_000;
export const JBCENTER_PIN_TIMEOUT_MS = 300_000;
export const MAX_JBCENTER_RESPONSE_BYTES = 5 * 1024 * 1024;

export type JBCenterJson =
  | null
  | boolean
  | number
  | string
  | JBCenterJson[]
  | JBCenterJsonObject;

export type JBCenterJsonObject = { [key: string]: JBCenterJson };

export type JBCenterIntentInput<
  TJb extends JBCenterJsonObject = JBCenterJsonObject,
> = {
  format: string;
  deploymentVersion: string;
  chainIds: number[];
  jb: TJb;
};

export type JBCenterIntentEnvelope<
  TJb extends JBCenterJsonObject = JBCenterJsonObject,
> = JBCenterIntentInput<TJb> & { version: 1 };

export type JBCenterPreparedIntent<
  TJb extends JBCenterJsonObject = JBCenterJsonObject,
> = {
  contentHash: Hex;
  message: string;
  envelope: JBCenterIntentEnvelope<TJb>;
};

export type JBCenterPublishIntentInput<
  TJb extends JBCenterJsonObject = JBCenterJsonObject,
> = JBCenterIntentInput<TJb> & {
  publisher: Address;
  signature: Hex;
};

export type JBCenterIntentMetadata = {
  name: string;
  description: string | null;
  tagline: string | null;
  tags: string[];
  logoUri: string | null;
  owner: Address | null;
};

export type JBCenterDeployment = {
  chainId: number;
  projectId: string;
  transactionHash: Hex;
  createdAt: string;
};

export type JBCenterDeploymentInput = Omit<JBCenterDeployment, "createdAt">;

export type JBCenterIntent<
  TJb extends JBCenterJsonObject = JBCenterJsonObject,
> = JBCenterIntentMetadata & {
  id: string;
  status: "undeployed" | "deployed";
  contentHash: Hex;
  envelope: JBCenterIntentEnvelope<TJb>;
  publisher: Address;
  signature: Hex;
  createdAt: string;
  deployments: JBCenterDeployment[];
};

export type JBCenterSearchItem = JBCenterIntentMetadata & {
  source: "jbcenter";
  status: "undeployed";
  intentId: string;
  contentHash: Hex;
  format: string;
  deploymentVersion: string;
  chainIds: number[];
  publisher: Address;
  createdAt: string;
};

export type JBCenterSearchPage = {
  items: JBCenterSearchItem[];
  totalCount: number;
  nextCursor: string | null;
};

export type JBCenterSearchParams = {
  query?: string;
  limit?: number;
  cursor?: string;
};

export type JBCenterPin = {
  cid: string;
  status: "queued";
  uri: `ipfs://${string}`;
  gatewayUrl: string;
};

export type JBCenterRequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type JBCenterClientOptions = {
  /** A server-side API key. Omit it for trusted-origin browser pin requests. */
  apiKey?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  maxResponseBytes?: number;
  timeoutMs?: number;
};

type ErrorEnvelope = {
  error?: { code?: unknown; message?: unknown };
};

type Validator<T> = (value: unknown) => value is T;

export class JBCenterRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly requestId?: string,
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "JBCenterRequestError";
  }
}

export class JBCenterTimeoutError extends Error {
  constructor(readonly timeoutMs: number) {
    super(`JB Center request timed out after ${timeoutMs}ms`);
    this.name = "JBCenterTimeoutError";
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isHash(value: unknown): value is Hex {
  return typeof value === "string" && /^0x[0-9a-f]{64}$/iu.test(value);
}

function isSignature(value: unknown): value is Hex {
  return (
    typeof value === "string" &&
    /^0x(?:[0-9a-f]{128}|[0-9a-f]{130})$/iu.test(value)
  );
}

function isAddress(value: unknown): value is Address {
  return typeof value === "string" && /^0x[0-9a-f]{40}$/iu.test(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isNumberArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((item) => Number.isSafeInteger(item) && Number(item) > 0)
  );
}

function isEnvelope(value: unknown): value is JBCenterIntentEnvelope {
  return (
    record(value) &&
    value.version === 1 &&
    typeof value.format === "string" &&
    typeof value.deploymentVersion === "string" &&
    isNumberArray(value.chainIds) &&
    record(value.jb)
  );
}

function isMetadata(value: Record<string, unknown>): boolean {
  return (
    typeof value.name === "string" &&
    (value.description === null || typeof value.description === "string") &&
    (value.tagline === null || typeof value.tagline === "string") &&
    isStringArray(value.tags) &&
    (value.logoUri === null || typeof value.logoUri === "string") &&
    (value.owner === null || isAddress(value.owner))
  );
}

function isDeployment(value: unknown): value is JBCenterDeployment {
  return (
    record(value) &&
    Number.isSafeInteger(value.chainId) &&
    Number(value.chainId) > 0 &&
    typeof value.projectId === "string" &&
    isHash(value.transactionHash) &&
    typeof value.createdAt === "string"
  );
}

function isIntent(value: unknown): value is JBCenterIntent {
  return (
    record(value) &&
    isMetadata(value) &&
    typeof value.id === "string" &&
    (value.status === "undeployed" || value.status === "deployed") &&
    isHash(value.contentHash) &&
    isEnvelope(value.envelope) &&
    isAddress(value.publisher) &&
    isSignature(value.signature) &&
    typeof value.createdAt === "string" &&
    Array.isArray(value.deployments) &&
    value.deployments.every(isDeployment)
  );
}

function isPreparedIntent(value: unknown): value is JBCenterPreparedIntent {
  return (
    record(value) &&
    isHash(value.contentHash) &&
    typeof value.message === "string" &&
    isEnvelope(value.envelope)
  );
}

function isSearchItem(value: unknown): value is JBCenterSearchItem {
  return (
    record(value) &&
    isMetadata(value) &&
    value.source === "jbcenter" &&
    value.status === "undeployed" &&
    typeof value.intentId === "string" &&
    isHash(value.contentHash) &&
    typeof value.format === "string" &&
    typeof value.deploymentVersion === "string" &&
    isNumberArray(value.chainIds) &&
    isAddress(value.publisher) &&
    typeof value.createdAt === "string"
  );
}

function isSearchPage(value: unknown): value is JBCenterSearchPage {
  return (
    record(value) &&
    Array.isArray(value.items) &&
    value.items.every(isSearchItem) &&
    Number.isSafeInteger(value.totalCount) &&
    Number(value.totalCount) >= 0 &&
    (value.nextCursor === null || typeof value.nextCursor === "string")
  );
}

function isPin(value: unknown): value is JBCenterPin {
  return (
    record(value) &&
    typeof value.cid === "string" &&
    /^(?:Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,160})$/u.test(value.cid) &&
    value.status === "queued" &&
    typeof value.uri === "string" &&
    value.uri === `ipfs://${value.cid}` &&
    value.gatewayUrl === `/ipfs/${value.cid}`
  );
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new TypeError("JB Center baseUrl must use HTTP or HTTPS");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new TypeError(
      "JB Center baseUrl cannot include credentials, query, or hash",
    );
  }
  return url.toString().replace(/\/$/u, "");
}

async function readBoundedJson(
  response: Response,
  maxResponseBytes: number,
): Promise<unknown> {
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredSize) && declaredSize > maxResponseBytes) {
    await response.body?.cancel();
    throw new JBCenterRequestError(
      "JB Center response exceeds the size limit",
      502,
    );
  }
  if (!response.headers.get("content-type")?.toLowerCase().includes("json")) {
    await response.body?.cancel();
    throw new JBCenterRequestError(
      "JB Center returned an invalid content type",
      502,
    );
  }
  if (!response.body) {
    throw new JBCenterRequestError("JB Center returned an empty response", 502);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxResponseBytes) {
        await reader.cancel("JB Center response exceeds the size limit");
        throw new JBCenterRequestError(
          "JB Center response exceeds the size limit",
          502,
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new JBCenterRequestError("JB Center returned invalid JSON", 502);
  }
}

function filenameOf(content: Blob, fallback: string): string {
  const candidate = (content as Blob & { name?: unknown }).name;
  return typeof candidate === "string" && candidate ? candidate : fallback;
}

export class JBCenterClient {
  readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly fetchImpl: typeof fetch;
  private readonly maxResponseBytes: number;
  private readonly timeoutMs: number;

  constructor(options: JBCenterClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? JBCENTER_DEFAULT_URL);
    if (options.apiKey !== undefined && !options.apiKey.trim()) {
      throw new TypeError("JB Center apiKey cannot be empty");
    }
    const endpoint = new URL(this.baseUrl);
    if (
      options.apiKey &&
      endpoint.protocol !== "https:" &&
      !["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname)
    ) {
      throw new TypeError(
        "JB Center apiKey requires HTTPS outside local development",
      );
    }
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetch ?? fetch;
    this.maxResponseBytes =
      options.maxResponseBytes ?? MAX_JBCENTER_RESPONSE_BYTES;
    this.timeoutMs = options.timeoutMs ?? JBCENTER_REQUEST_TIMEOUT_MS;
    if (
      !Number.isSafeInteger(this.maxResponseBytes) ||
      this.maxResponseBytes <= 0
    ) {
      throw new TypeError("maxResponseBytes must be a positive safe integer");
    }
    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0) {
      throw new TypeError("timeoutMs must be positive");
    }
  }

  prepareIntent<TJb extends JBCenterJsonObject>(
    intent: JBCenterIntentInput<TJb>,
    options?: JBCenterRequestOptions,
  ): Promise<JBCenterPreparedIntent<TJb>> {
    return this.fetchJson(
      "v1/intents/message",
      { method: "POST", body: JSON.stringify(intent) },
      isPreparedIntent,
      options,
    ) as Promise<JBCenterPreparedIntent<TJb>>;
  }

  publishIntent<TJb extends JBCenterJsonObject>(
    intent: JBCenterPublishIntentInput<TJb>,
    options?: JBCenterRequestOptions,
  ): Promise<JBCenterIntent<TJb>> {
    return this.fetchJson(
      "v1/intents",
      { method: "POST", body: JSON.stringify(intent) },
      isIntent,
      options,
    ) as Promise<JBCenterIntent<TJb>>;
  }

  getIntent<TJb extends JBCenterJsonObject = JBCenterJsonObject>(
    intentId: string,
    options?: JBCenterRequestOptions,
  ): Promise<JBCenterIntent<TJb>> {
    return this.fetchJson(
      `v1/intents/${encodeURIComponent(intentId)}`,
      {},
      isIntent,
      options,
    ) as Promise<JBCenterIntent<TJb>>;
  }

  searchIntents(
    params: JBCenterSearchParams = {},
    options?: JBCenterRequestOptions,
  ): Promise<JBCenterSearchPage> {
    const query = new URLSearchParams();
    if (params.query !== undefined) query.set("q", params.query);
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    if (params.cursor !== undefined) query.set("cursor", params.cursor);
    const suffix = query.size ? `?${query}` : "";
    return this.fetchJson(`v1/search${suffix}`, {}, isSearchPage, options);
  }

  recordDeployment(
    intentId: string,
    deployment: JBCenterDeploymentInput,
    options?: JBCenterRequestOptions,
  ): Promise<JBCenterDeployment> {
    return this.fetchJson(
      `v1/intents/${encodeURIComponent(intentId)}/deployments`,
      { method: "POST", body: JSON.stringify(deployment) },
      isDeployment,
      options,
    );
  }

  pinJson(
    value: JBCenterJsonObject,
    options?: JBCenterRequestOptions,
  ): Promise<JBCenterPin> {
    return this.fetchJson(
      "v1/pins/json",
      { method: "POST", body: JSON.stringify(value) },
      isPin,
      { ...options, timeoutMs: options?.timeoutMs ?? JBCENTER_PIN_TIMEOUT_MS },
    );
  }

  pinImage(
    content: Blob,
    options?: JBCenterRequestOptions & { filename?: string },
  ): Promise<JBCenterPin> {
    return this.pinFile("v1/pins/file", content, "image", options);
  }

  pinMedia(
    content: Blob,
    options?: JBCenterRequestOptions & { filename?: string },
  ): Promise<JBCenterPin> {
    return this.pinFile("v1/pins/media", content, "media", options);
  }

  private pinFile(
    path: string,
    content: Blob,
    fallbackName: string,
    options?: JBCenterRequestOptions & { filename?: string },
  ): Promise<JBCenterPin> {
    const body = new FormData();
    body.append(
      "file",
      content,
      options?.filename ?? filenameOf(content, fallbackName),
    );
    return this.fetchJson(path, { method: "POST", body }, isPin, {
      ...options,
      timeoutMs: options?.timeoutMs ?? JBCENTER_PIN_TIMEOUT_MS,
    });
  }

  private async fetchJson<T>(
    path: string,
    init: RequestInit,
    validate: Validator<T>,
    options: JBCenterRequestOptions = {},
  ): Promise<T> {
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new TypeError("timeoutMs must be positive");
    }

    const controller = new AbortController();
    const abort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener("abort", abort, { once: true });
    const timeoutReason = new JBCenterTimeoutError(timeoutMs);
    const timeout = setTimeout(
      () => controller.abort(timeoutReason),
      timeoutMs,
    );
    try {
      if (options.signal?.aborted) abort();
      const headers = new Headers(init.headers);
      headers.set("Accept", "application/json");
      if (typeof init.body === "string") {
        headers.set("Content-Type", "application/json");
      }
      if (this.apiKey) headers.set("Authorization", `Bearer ${this.apiKey}`);

      const response = await this.fetchImpl(`${this.baseUrl}/${path}`, {
        ...init,
        headers,
        signal: controller.signal,
      });
      const body = await readBoundedJson(response, this.maxResponseBytes);
      if (!response.ok) {
        const envelope = record(body) ? (body as ErrorEnvelope) : {};
        const code =
          typeof envelope.error?.code === "string"
            ? envelope.error.code
            : undefined;
        const message =
          typeof envelope.error?.message === "string"
            ? envelope.error.message
            : `JB Center request failed (${response.status})`;
        const retryAfterHeader = response.headers.get("retry-after");
        const retryAfter = Number(retryAfterHeader);
        throw new JBCenterRequestError(
          message,
          response.status,
          code,
          response.headers.get("x-request-id") ?? undefined,
          retryAfterHeader !== null &&
          Number.isFinite(retryAfter) &&
          retryAfter >= 0
            ? retryAfter
            : undefined,
        );
      }
      if (!validate(body)) {
        throw new JBCenterRequestError(
          "JB Center returned an invalid response",
          502,
          undefined,
          response.headers.get("x-request-id") ?? undefined,
        );
      }
      return body;
    } catch (error) {
      if (controller.signal.reason === timeoutReason) throw timeoutReason;
      throw error;
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abort);
    }
  }
}

export function createJBCenterClient(
  options: JBCenterClientOptions = {},
): JBCenterClient {
  return new JBCenterClient(options);
}
