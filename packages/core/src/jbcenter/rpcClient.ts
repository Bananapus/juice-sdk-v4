/**
 * JB Center's read-only RPC client, apart from the intent, deployment and pin
 * client that extends it. A page that only reads chains through Center loads
 * this module, not the intent decoders, ABIs and Safe code `../jbcenter.ts`
 * brings in.
 */
import type { Hex } from "viem";
import { pause } from "../pause.js";
import { retryAfterMs } from "../untrusted.js";
import type { JBCenterLimiter } from "./rateLimit.js";

export const JBCENTER_DEFAULT_URL = "https://juicebox.center";
export const JBCENTER_REQUEST_TIMEOUT_MS = 15_000;
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
  "eth_simulateV1",
  "eth_syncing",
  "net_version",
] as const;

export type JBCenterRpcMethod = (typeof JBCENTER_RPC_METHODS)[number];

/**
 * The waits, in milliseconds, before each retry of a read that a node behind
 * the head could not answer: JSON-RPC -32001. JB Center load balances reads
 * across nodes that import blocks at slightly different times, so a read
 * pinned to a block one node has imported can land on a sibling that has not,
 * which answers -32001 ("Requested resource not found." in viem). Waiting out
 * the lag is the only correct answer: reading `latest` instead would read
 * state older than the block the read pins. Base mines every two seconds, so
 * these waits cover a few blocks of drift.
 */
export const JBCENTER_BLOCK_LAG_RETRY_DELAYS_MS = [
  250, 500, 1_000, 2_000, 2_000,
] as const;

/** How a JB Center RPC provider retries a read. */
export type JBCenterRpcProviderOptions = {
  /**
   * The waits before each retry of a read a node behind the head answered
   * with -32001, {@link JBCENTER_BLOCK_LAG_RETRY_DELAYS_MS} by default; `[]`
   * retries nothing. No other failure is retried: that answer is the only one
   * that changes by itself, once the node catches up. A revert, bad params or
   * a refusal comes back the same, a 429 must wait out Center's minute, and a
   * timeout has already waited its full time. Every method Center allows is a
   * read, so a retry repeats work, never an effect.
   */
  blockLagRetryDelaysMs?: readonly number[];
  /**
   * The limiter every try waits for a slot of ({@link createJBCenterLimiter}):
   * one per page, shared by every chain's provider, so the page's requests
   * share its slots and its pause after a 429. Each try takes its own slot, so
   * a wait between tries holds none. Without one, requests go as they are
   * made.
   */
  limiter?: JBCenterLimiter;
};

/** A read pinned past the head of the node that answered it: JSON-RPC -32001. */
function isBehindHead(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === -32001
  );
}

export type JBCenterRpcRequest = {
  method: JBCenterRpcMethod;
  params?: readonly unknown[];
};

/** Structurally compatible with EIP-1193 providers, including viem's `custom`. */
export type JBCenterRpcProvider = {
  /**
   * One read-only JSON-RPC request, asked again while a node behind the head
   * cannot answer it ({@link JBCenterRpcProviderOptions}). `options`, which
   * viem's custom transport passes with the read's `signal`, goes with every
   * try. Once the signal aborts, the request or the wait between tries ends
   * at once with its reason, and nothing more is sent.
   */
  request<TResult = unknown>(
    request: {
      method: string;
      params?: readonly unknown[];
    },
    options?: { signal?: AbortSignal },
  ): Promise<TResult>;
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

export type Validator<T> = (value: unknown) => value is T;

export class JBCenterRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly requestId?: string,
    /** The whole seconds the answer's Retry-After asks for, when it can be read. */
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

export function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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

export class JBCenterRpcClient {
  readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly maxResponseBytes: number;
  private readonly timeoutMs: number;
  private nextRpcId = 1;

  constructor(options: JBCenterClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? JBCENTER_DEFAULT_URL);
    // Calling a native browser fetch through `this.fetchImpl(...)` otherwise
    // supplies the client as its receiver. Browsers brand-check the
    // receiver as Window and reject the request with "Illegal invocation".
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
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

  /**
   * Returns an EIP-1193-shaped provider suitable for viem's `custom`. It asks
   * again for a read a node behind the head could not answer, as
   * {@link JBCenterRpcProviderOptions} describes.
   */
  rpcProvider(
    chainId: number,
    options: JBCenterRpcProviderOptions = {},
  ): JBCenterRpcProvider {
    if (!Number.isSafeInteger(chainId) || chainId <= 0) {
      throw new TypeError("chainId must be a positive safe integer");
    }
    const given: readonly number[] =
      options.blockLagRetryDelaysMs ?? JBCENTER_BLOCK_LAG_RETRY_DELAYS_MS;
    if (
      !Array.isArray(given) ||
      !given.every((ms) => Number.isFinite(ms) && ms >= 0)
    ) {
      throw new TypeError(
        "blockLagRetryDelaysMs must be a list of finite waits of 0 ms or more",
      );
    }
    // The provider keeps its own copy, so the waits it checked are the waits it uses.
    const delays = [...given];
    const { limiter } = options;
    return {
      request: async <TResult = unknown>(
        request: {
          method: string;
          params?: readonly unknown[];
        },
        requestOptions?: { signal?: AbortSignal },
      ) => {
        if (
          !(JBCENTER_RPC_METHODS as readonly string[]).includes(request.method)
        ) {
          throw new TypeError("JB Center RPC method is not supported");
        }
        const signal = requestOptions?.signal;
        const ask = () =>
          this.rpc<TResult>(
            chainId,
            request as JBCenterRpcRequest,
            requestOptions,
          );
        for (let attempt = 0; ; attempt += 1) {
          // A request whose signal has aborted is not sent.
          signal?.throwIfAborted();
          try {
            return await (limiter ? limiter.run(ask, { signal }) : ask());
          } catch (error) {
            if (attempt >= delays.length || !isBehindHead(error)) throw error;
            await pause(delays[attempt], signal, () => signal?.reason);
          }
        }
      },
    };
  }

  protected async fetchJson<T>(
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
    // A failure is thrown once the timer and listener are cleaned up.
    let failure: unknown;
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
        const retryAfter = retryAfterMs(response.headers.get("retry-after"));
        throw new JBCenterRequestError(
          message,
          response.status,
          code,
          response.headers.get("x-request-id") ?? undefined,
          retryAfter === null ? undefined : Math.ceil(retryAfter / 1000),
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
      failure =
        controller.signal.reason === timeoutReason ? timeoutReason : error;
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abort);
    }
    throw failure;
  }
}

export function createJBCenterRpcProvider(
  chainId: number,
  options: JBCenterClientOptions & JBCenterRpcProviderOptions = {},
): JBCenterRpcProvider {
  return new JBCenterRpcClient(options).rpcProvider(chainId, options);
}
