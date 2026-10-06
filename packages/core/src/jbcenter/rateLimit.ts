import { createTransport, type Transport } from "viem";
import { retryAfterMs } from "../untrusted.js";

// JB Center's rate limit, as the SDK reads it and keeps to it. Center counts
// each origin's requests, every chain's together, in a fixed minute in which
// refused requests count too: 600 a minute. It refuses the rest of the minute
// with a 429 whose Retry-After says how long is left, and a page that trips it
// stalls until then.

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

/** The longest a refusal holds a limiter's slots: Center's window is a minute. */
export const JBCENTER_MAX_RATE_LIMIT_PAUSE_MS = 60_000;

export type JBCenterLimiterOptions = {
  /**
   * How many requests may be in flight at once, every chain's together. Two in
   * flight are at most 343 requests a minute at the quickest round trip
   * measured against Center's staging (0.35 s), under Center's 600.
   */
  slots: number;
};

/** Requests that share JB Center's rate limit. One limiter serves a whole page. */
export type JBCenterLimiter = {
  /**
   * `send`, once one of the limiter's slots is free: requests start in the
   * order they came, at most `slots` at once. When Center refuses one with a
   * 429 that says how long to wait, nothing starts until that has passed, a
   * minute at most ({@link JBCENTER_MAX_RATE_LIMIT_PAUSE_MS}): every request in
   * the minute would be refused, and would count. A request whose `signal`
   * aborts while it waits leaves the line, rejecting with the reason, and is
   * never sent. One under way answers to its own signal: the limiter does not
   * stop it, and its slot frees when it ends.
   */
  run<T>(
    send: () => Promise<T>,
    options?: { signal?: AbortSignal },
  ): Promise<T>;
  /**
   * `transport`, with every request it sends in one of the limiter's slots.
   * Each try is a request of its own, so viem's retry of a refused request
   * waits out the Retry-After with the rest, and a try made with a signal
   * leaves the line when it aborts. This is for a transport that does not go
   * through JB Center's provider, such as viem's `http`. Give that provider
   * the limiter instead (`createJBCenterRpcProvider`'s `limiter`), so its
   * waits for a node behind the head hold no slot. Never wrap a transport
   * built on a provider that has the limiter: each request would need two
   * slots at once, and two requests could block each other for good.
   */
  transport(transport: Transport): Transport;
};

/** Tasks that wait their turn: at most `room` under way at once, started in the order they joined, none while `held`. */
type Line = {
  join<T>(task: () => Promise<T>, signal: AbortSignal | undefined): Promise<T>;
  /** Starts what waits, as far as there is room, once `held` no longer holds the line. */
  resume(): void;
};

function line(room: number, held: () => boolean): Line {
  let running = 0;
  /** What waits, in the order it joined. */
  const waiting = new Set<() => void>();

  function resume() {
    while (!held() && running < room && waiting.size > 0) {
      const [next] = waiting;
      waiting.delete(next);
      next();
    }
  }

  function join<T>(
    task: () => Promise<T>,
    signal: AbortSignal | undefined,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (signal?.aborted) return reject(signal.reason);
      function start() {
        signal?.removeEventListener("abort", leave);
        running += 1;
        new Promise<T>((begun) => begun(task()))
          .then(resolve, reject)
          .finally(() => {
            running -= 1;
            resume();
          });
      }
      function leave() {
        waiting.delete(start);
        reject(signal!.reason);
      }
      signal?.addEventListener("abort", leave, { once: true });
      waiting.add(start);
      resume();
    });
  }

  return { join, resume };
}

/**
 * A limiter for every request a page sends to JB Center: create one when the
 * page loads (at module level in the browser), hand it to every chain's
 * provider (`createJBCenterRpcProvider`'s `limiter`), and wrap any other
 * transport to Center with its `transport`. Every try takes its own slot, so
 * a read waiting out a node behind the head holds none.
 */
export function createJBCenterLimiter({
  slots,
}: JBCenterLimiterOptions): JBCenterLimiter {
  if (!Number.isSafeInteger(slots) || slots <= 0) {
    throw new TypeError("slots must be a positive safe integer");
  }
  /** When the slots open again after a refusal, by the clock, and the timer that opens them. */
  let resumeAt = 0;
  let paused: ReturnType<typeof setTimeout> | undefined;
  const queue = line(slots, () => paused !== undefined);

  /** Holds every slot for `ms`, or until a later end a refusal already set. */
  function hold(ms: number) {
    const until = Date.now() + ms;
    if (paused !== undefined && until <= resumeAt) return;
    clearTimeout(paused);
    resumeAt = until;
    paused = setTimeout(() => {
      paused = undefined;
      queue.resume();
    }, ms);
  }

  function run<T>(
    send: () => Promise<T>,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<T> {
    return queue.join(async () => {
      try {
        return await send();
      } catch (error) {
        const seconds = isRateLimited(error) ? retryAfterOf(error) : undefined;
        if (seconds !== undefined && seconds > 0) {
          hold(Math.min(seconds * 1_000, JBCENTER_MAX_RATE_LIMIT_PAUSE_MS));
        }
        throw error;
      }
    }, signal);
  }

  function transport(wrapped: Transport): Transport {
    return (parameters) => {
      const { config, value } = wrapped(parameters);
      const send = config.request;
      const request = (
        args: Parameters<typeof send>[0],
        options?: Parameters<typeof send>[1],
      ) =>
        run(() => send(args, options), {
          signal: (options as { signal?: AbortSignal } | undefined)?.signal,
        });
      return createTransport(
        { ...config, request: request as typeof send },
        value,
      );
    };
  }

  return { run, transport };
}
