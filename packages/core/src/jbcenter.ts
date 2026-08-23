import {
  encodeFunctionData,
  type Abi,
  type Address,
  type ContractFunctionName,
  type ContractFunctionParameters,
  type Hex,
} from "viem";

export const JBCENTER_DEFAULT_URL = "https://juicebox.center";
export const JBCENTER_REQUEST_TIMEOUT_MS = 15_000;
export const JBCENTER_DEPLOYMENT_TIMEOUT_MS = 45_000;
export const JBCENTER_PIN_TIMEOUT_MS = 300_000;
export const MAX_JBCENTER_RESPONSE_BYTES = 20 * 1024 * 1024;

export const JBCENTER_RPC_METHODS = [
  "eth_blobBaseFee",
  "eth_blockNumber",
  "eth_call",
  "eth_chainId",
  "eth_createAccessList",
  "eth_estimateGas",
  "eth_feeHistory",
  "eth_gasPrice",
  "eth_getBalance",
  "eth_getBlockByHash",
  "eth_getBlockByNumber",
  "eth_getBlockReceipts",
  "eth_getBlockTransactionCountByHash",
  "eth_getBlockTransactionCountByNumber",
  "eth_getCode",
  "eth_getLogs",
  "eth_getProof",
  "eth_getStorageAt",
  "eth_getTransactionByBlockHashAndIndex",
  "eth_getTransactionByBlockNumberAndIndex",
  "eth_getTransactionByHash",
  "eth_getTransactionCount",
  "eth_getTransactionReceipt",
  "eth_maxPriorityFeePerGas",
  "eth_syncing",
  "net_version",
] as const;

export type JBCenterRpcMethod = (typeof JBCENTER_RPC_METHODS)[number];

export type JBCenterRpcRequest = {
  method: JBCenterRpcMethod;
  params?: readonly unknown[];
};

/** Structurally compatible with EIP-1193 providers, including viem's `custom`. */
export type JBCenterRpcProvider = {
  request<TResult = unknown>(request: {
    method: string;
    params?: readonly unknown[];
  }): Promise<TResult>;
};

export type JBCenterJson =
  | null
  | boolean
  | number
  | string
  | JBCenterJson[]
  | JBCenterJsonObject;

export type JBCenterJsonObject = { [key: string]: JBCenterJson };

export type JBCenterDeploymentCall = {
  chainId: number;
  to: Address;
  data: Hex;
};

export type JBCenterContractCall<
  TAbi extends Abi = Abi,
  TFunctionName extends ContractFunctionName<
    TAbi,
    "payable" | "nonpayable"
  > = ContractFunctionName<TAbi, "payable" | "nonpayable">,
> = {
  chainId: number;
  address: Address;
} & ContractFunctionParameters<TAbi, "payable" | "nonpayable", TFunctionName>;

/** Freeze a typed viem contract request into the call signed by JB Center. */
export function createJBCenterDeploymentCall<
  const TAbi extends Abi,
  TFunctionName extends ContractFunctionName<TAbi, "payable" | "nonpayable">,
>(request: JBCenterContractCall<TAbi, TFunctionName>): JBCenterDeploymentCall {
  const { chainId, address, ...parameters } = request;
  return {
    chainId,
    to: address,
    data: encodeFunctionData(
      parameters as Parameters<typeof encodeFunctionData>[0],
    ),
  };
}

export type JBCenterIntentInput<
  TJb extends JBCenterJsonObject = JBCenterJsonObject,
> = {
  format: string;
  deploymentVersion: string;
  chainIds: number[];
  deploymentCalls: JBCenterDeploymentCall[];
  jb: TJb;
};

export type JBCenterIntentEnvelope<
  TJb extends JBCenterJsonObject = JBCenterJsonObject,
> = JBCenterIntentInput<TJb>;

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
  baseUrl?: string;
  fetch?: typeof fetch;
  maxResponseBytes?: number;
  timeoutMs?: number;
};

type ErrorEnvelope = {
  error?: { code?: unknown; message?: unknown };
};

type RpcEnvelope =
  | { jsonrpc: "2.0"; id: number; result: unknown }
  | {
      jsonrpc: "2.0";
      id: number;
      error: { code: number; message: string; data?: Hex };
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

export class JBCenterRpcError extends Error {
  constructor(
    readonly code: number,
    message: string,
    readonly data?: Hex,
  ) {
    super(message);
    this.name = "JBCenterRpcError";
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

function isRpcErrorData(value: unknown): value is Hex {
  return typeof value === "string" && /^0x(?:[0-9a-f]{2})*$/iu.test(value);
}

function rpcEnvelope(id: number): Validator<RpcEnvelope> {
  return (value: unknown): value is RpcEnvelope => {
    if (!record(value) || value.jsonrpc !== "2.0" || value.id !== id) {
      return false;
    }
    const hasResult = Object.prototype.hasOwnProperty.call(value, "result");
    const hasError = Object.prototype.hasOwnProperty.call(value, "error");
    if (hasResult === hasError) return false;
    if (hasResult) return true;
    return (
      record(value.error) &&
      Number.isSafeInteger(value.error.code) &&
      typeof value.error.message === "string" &&
      (value.error.data === undefined || isRpcErrorData(value.error.data))
    );
  };
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

function isDeploymentCall(value: unknown): value is JBCenterDeploymentCall {
  return (
    record(value) &&
    Number.isSafeInteger(value.chainId) &&
    Number(value.chainId) > 0 &&
    isAddress(value.to) &&
    typeof value.data === "string" &&
    /^0x(?:[0-9a-f]{2}){4,}$/iu.test(value.data)
  );
}

function isEnvelope(value: unknown): value is JBCenterIntentEnvelope {
  if (
    !record(value) ||
    typeof value.format !== "string" ||
    typeof value.deploymentVersion !== "string" ||
    !isNumberArray(value.chainIds) ||
    new Set(value.chainIds).size !== value.chainIds.length ||
    !record(value.jb)
  ) {
    return false;
  }
  if (
    !Array.isArray(value.deploymentCalls) ||
    !value.deploymentCalls.every(isDeploymentCall) ||
    value.deploymentCalls.length !== value.chainIds.length
  ) {
    return false;
  }
  const chains = [...value.chainIds].sort((a, b) => a - b);
  const callChains = value.deploymentCalls
    .map(({ chainId }) => chainId)
    .sort((a, b) => a - b);
  return (
    new Set(callChains).size === callChains.length &&
    chains.every((chainId, index) => callChains[index] === chainId)
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
  private readonly fetchImpl: typeof fetch;
  private readonly maxResponseBytes: number;
  private readonly timeoutMs: number;
  private nextRpcId = 1;

  constructor(options: JBCenterClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? JBCENTER_DEFAULT_URL);
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
      {
        ...options,
        timeoutMs: options?.timeoutMs ?? JBCENTER_DEPLOYMENT_TIMEOUT_MS,
      },
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

  /**
   * Sends one read-only JSON-RPC request through JB Center. The service rejects
   * wallet, signing, transaction-submission, batch, and privileged methods.
   */
  async rpc<TResult = unknown>(
    chainId: number,
    request: JBCenterRpcRequest,
    options?: JBCenterRequestOptions,
  ): Promise<TResult> {
    if (!Number.isSafeInteger(chainId) || chainId <= 0) {
      throw new TypeError("chainId must be a positive safe integer");
    }
    if (!JBCENTER_RPC_METHODS.includes(request.method)) {
      throw new TypeError("JB Center RPC method is not supported");
    }
    if (request.params !== undefined && !Array.isArray(request.params)) {
      throw new TypeError("JB Center RPC params must be an array");
    }

    const id = this.nextRpcId;
    this.nextRpcId = id === Number.MAX_SAFE_INTEGER ? 1 : id + 1;
    const body = await this.fetchJson(
      `v1/rpc/${chainId}`,
      {
        method: "POST",
        body: JSON.stringify({ jsonrpc: "2.0", id, ...request }),
      },
      rpcEnvelope(id),
      options,
    );
    if ("error" in body) {
      throw new JBCenterRpcError(
        body.error.code,
        body.error.message,
        body.error.data,
      );
    }
    return body.result as TResult;
  }

  /** Returns an EIP-1193-shaped provider suitable for viem's `custom`. */
  rpcProvider(chainId: number): JBCenterRpcProvider {
    if (!Number.isSafeInteger(chainId) || chainId <= 0) {
      throw new TypeError("chainId must be a positive safe integer");
    }
    return {
      request: async <TResult = unknown>(request: {
        method: string;
        params?: readonly unknown[];
      }) => {
        if (
          !(JBCENTER_RPC_METHODS as readonly string[]).includes(request.method)
        ) {
          throw new TypeError("JB Center RPC method is not supported");
        }
        return this.rpc<TResult>(chainId, request as JBCenterRpcRequest);
      },
    };
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

export function createJBCenterRpcProvider(
  chainId: number,
  options: JBCenterClientOptions = {},
): JBCenterRpcProvider {
  return new JBCenterClient(options).rpcProvider(chainId);
}
