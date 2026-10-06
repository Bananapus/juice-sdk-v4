import { createTransport, type Transport } from "viem";
import { retryAfterMs } from "../untrusted.js";

// JB Center's rate limit, as the SDK reads it and keeps to it. Center counts
// each origin's requests, every chain's together, in a fixed minute in which
// refused requests count too: 600 a minute for an allowlisted first-party
// origin, 120 for any other. It refuses the rest of the minute with a 429 whose
// Retry-After says how long is left, and a page that trips it stalls until
// then.

/** What one link of an error chain can say about a refusal. */
export type ErrorChainLink = {
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
export function errorChain(error: unknown): ErrorChainLink[] {
  const chain: ErrorChainLink[] = [];
  for (
    let next = error;
    typeof next === "object" && next !== null && chain.length < 8;
    next = (next as { cause?: unknown }).cause
  ) {
    chain.push(next as ErrorChainLink);
  }
  return chain;
}

/** Whether `error` is a 429, as an HTTP status or a JSON-RPC code, on it or on anything it wraps. */
export function isRateLimited(error: unknown): boolean {
  return errorChain(error).some(
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
  const chain = errorChain(error);
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

/** What a limiter says when a request it is starting asks it for another slot. */
const NESTED =
  "A request this JB Center limiter was starting asked it for another slot. Give the limiter to JB Center's provider or wrap one transport with it, not both, and wrap only once.";

/** The longest a refusal holds a limiter's slots: Center's window is a minute. */
export const JBCENTER_MAX_RATE_LIMIT_PAUSE_MS = 60_000;

export type JBCenterLimiterOptions = {
  /**
   * How many requests may be in flight at once, every chain's together. Slots
   * bound how many are in flight, not how many go out a minute: two in flight
   * send up to 343 a minute at the quickest round trip measured against
   * Center's staging (0.35 s), under the 600 a first-party origin gets but over
   * the 120 any other gets. Past the limit, the first 429 pauses the rest.
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
   * stop it, and its slot frees when it ends. A request that `send` asks the
   * same limiter for before it returns is refused at once with a TypeError,
   * since it would wait on the slot its asker holds. One asked for after an
   * await looks like any other request and is not refused, so a request never
   * asks its own limiter for another.
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
   * waits for a node behind the head hold no slot. A transport that already
   * sends through this limiter, one built on a provider that has it or one it
   * wraps already, fails each request at once with a TypeError and sends
   * nothing, where it would wait on its own slot for good.
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

  /** Whether one of the limiter's requests is starting: its `send` has not returned yet. */
  let starting = false;

  /** `send()`, with every request it asks this limiter for before it returns refused. */
  function begin<T>(send: () => Promise<T>): Promise<T> {
    starting = true;
    try {
      return send();
    } finally {
      starting = false;
    }
  }

  function run<T>(
    send: () => Promise<T>,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<T> {
    // Asked for by a request this limiter is starting, it would wait on the
    // slot that request holds, and the request on it.
    if (starting) return Promise.reject(new TypeError(NESTED));
    return queue.join(async () => {
      try {
        return await begin(send);
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
