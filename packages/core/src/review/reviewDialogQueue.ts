/**
 * The review dialog queue: one dialog at a time, in request order, each bound
 * to the project scope and account it opened under. A change of either
 * cancels what no longer belongs to it, and an approval re-proves its scope
 * before it resolves. React-free; a provider renders `getState().active`.
 */

/** The project a request belongs to. `verify` re-proves it before an approval resolves. */
export type ReviewQueueScope = {
  identity: string;
  verify(): Promise<boolean>;
};

export type ReviewQueueContext = {
  scope?: ReviewQueueScope | null;
  account?: string;
  /** While true, new requests are declined at once. */
  blocked?: boolean;
};

export type ReviewQueueRequest<R> = {
  /** The result that declines; cancellations resolve with it. */
  declined: R;
  approves(result: R): boolean;
  /** An abort closes the dialog or drops the request from the queue. */
  signal?: AbortSignal;
};

export type ReviewQueueState<P> = {
  active: { id: number; payload: P } | null;
  /** True while the active approval re-proves its scope. */
  checking: boolean;
  queued: number;
};

export type ReviewQueue<P, R> = {
  request(payload: P, request: ReviewQueueRequest<R>): Promise<R>;
  /** Answers the active dialog; a stale id is ignored. */
  finish(id: number, result: R): Promise<void>;
  /** Declines the dialog with this id, active or queued. */
  cancel(id: number): void;
  setContext(context: ReviewQueueContext): void;
  /** Declines everything, as on unmount. */
  cancelAll(): void;
  getState(): ReviewQueueState<P>;
  subscribe(listener: () => void): () => void;
};

type Entry<P, R> = ReviewQueueRequest<R> & {
  id: number;
  payload: P;
  scope?: ReviewQueueScope | null;
  account?: string;
  resolve(result: R): void;
};

const sameAccount = (a?: string, b?: string) =>
  a?.toLowerCase() === b?.toLowerCase();

export function createReviewQueue<P, R>(): ReviewQueue<P, R> {
  let context: ReviewQueueContext = {};
  let active: Entry<P, R> | null = null;
  let queue: Entry<P, R>[] = [];
  let checking = false;
  let nextId = 1;
  let state: ReviewQueueState<P> = { active: null, checking: false, queued: 0 };
  const listeners = new Set<() => void>();

  const emit = () => {
    state = {
      active: active && { id: active.id, payload: active.payload },
      checking,
      queued: queue.length,
    };
    listeners.forEach((listener) => listener());
  };
  const advance = () => {
    active = queue.shift() ?? null;
    checking = false;
  };
  const belongs = (entry: Entry<P, R>) =>
    (!entry.scope || entry.scope.identity === context.scope?.identity) &&
    sameAccount(entry.account, context.account);
  const decline = (entry: Entry<P, R>) => entry.resolve(entry.declined);

  const cancel = (id: number) => {
    if (active?.id === id) {
      const entry = active;
      advance();
      emit();
      decline(entry);
      return;
    }
    const entry = queue.find((queued) => queued.id === id);
    if (!entry) return;
    queue = queue.filter((queued) => queued !== entry);
    emit();
    decline(entry);
  };

  return {
    request: (payload, request) =>
      new Promise<R>((resolve) => {
        if (context.blocked || request.signal?.aborted)
          return resolve(request.declined);
        const entry: Entry<P, R> = {
          ...request,
          id: nextId++,
          payload,
          scope: context.scope,
          account: context.account,
          resolve: (result) => {
            request.signal?.removeEventListener("abort", abort);
            resolve(result);
          },
        };
        const abort = () => cancel(entry.id);
        request.signal?.addEventListener("abort", abort, { once: true });
        if (active) queue.push(entry);
        else active = entry;
        emit();
      }),

    async finish(id, result) {
      const entry = active;
      if (!entry || entry.id !== id) return;
      let approved = entry.approves(result);
      if (approved && entry.scope) {
        checking = true;
        emit();
        const scope = entry.scope;
        const verified = await Promise.resolve()
          .then(() => scope.verify())
          .catch(() => false);
        // A cancellation while the proof was pending already resolved it.
        if (active !== entry) return;
        approved = verified && belongs(entry);
      }
      advance();
      emit();
      entry.resolve(approved ? result : entry.declined);
    },

    cancel,

    setContext(next) {
      context = { ...next };
      const dropped = [active, ...queue].filter(
        (entry): entry is Entry<P, R> => !!entry && !belongs(entry),
      );
      if (!dropped.length) return;
      queue = queue.filter((entry) => !dropped.includes(entry));
      if (active && dropped.includes(active)) advance();
      emit();
      dropped.forEach(decline);
    },

    cancelAll() {
      const dropped = [active, ...queue].filter(
        (entry): entry is Entry<P, R> => !!entry,
      );
      active = null;
      queue = [];
      checking = false;
      emit();
      dropped.forEach(decline);
    },

    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
