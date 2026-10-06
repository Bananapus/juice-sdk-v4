import { retryAfterMs } from "../untrusted.js";

// JB Center's rate limit, as the SDK reads it. Center counts each origin's
// requests, every chain's together, in a fixed minute in which refused
// requests count too: 600 a minute. It refuses the rest of the minute with a
// 429 whose Retry-After says how long is left.

/** What one link of an error chain can say about a refusal. */
export type Failure = {
  status?: unknown;
  code?: unknown;
  message?: unknown;
  details?: unknown;
  retryAfter?: unknown;
  headers?: unknown;
};

/**
 * An error and what it wraps, outermost first, eight links at most. viem
 * wraps whatever its transport throws, so the HTTP status or the JSON-RPC
 * code Center answered with usually sits on a cause.
 */
export function failures(error: unknown): Failure[] {
  const chain: Failure[] = [];
  for (
    let next = error;
    typeof next === "object" && next !== null && chain.length < 8;
    next = (next as { cause?: unknown }).cause
  ) {
    chain.push(next as Failure);
  }
  return chain;
}

/** Whether `error` is a 429, as an HTTP status or a JSON-RPC code, on it or on anything it wraps. */
export function isRateLimited(error: unknown): boolean {
  return failures(error).some(
    ({ status, code }) => status === 429 || code === 429,
  );
}

/**
 * How long the refusal asked to wait, in seconds, or undefined when nothing
 * says. The first `retryAfter` in the chain that is a finite number comes
 * first: the SDK reads JB Center's Retry-After header into it. Failing that,
 * a link's Retry-After header (viem's HTTP errors carry the response's
 * headers) is read as `retryAfterMs` reads it, in whole seconds rounded up.
 */
export function retryAfterOf(error: unknown): number | undefined {
  const chain = failures(error);
  const said = chain
    .map((link) => link.retryAfter)
    .find(
      (seconds): seconds is number =>
        typeof seconds === "number" && Number.isFinite(seconds),
    );
  if (said !== undefined) return said;
  for (const { headers } of chain) {
    if (!(headers instanceof Headers)) continue;
    const ms = retryAfterMs(headers.get("retry-after"));
    if (ms !== null) return Math.ceil(ms / 1000);
  }
  return undefined;
}
