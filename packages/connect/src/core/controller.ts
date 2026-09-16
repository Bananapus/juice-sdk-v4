/** One way in. The passkey account and every external wallet share this shape, so the modal and
 * the apps never special-case Center. `handoff` publishes a pairing URI (WalletConnect, a mobile
 * deep link) for the app to render as a QR code or a link. */
export type ConnectOption = {
  id: string;
  name: string;
  /** A data: image URL. Apps render their own mark when absent. */
  icon?: string;
  disabled?: boolean;
  connect(context: {
    signal: AbortSignal;
    handoff(uri: string): void;
  }): Promise<void>;
};
export type ConnectState = {
  /** The option being connected, or null when idle. A passkey connection leaves the page, so it
   * stays pending until the browser returns. */
  pending: string | null;
  error: string | null;
  handoffUri: string | null;
};
export type ConnectController = {
  readonly options: readonly ConnectOption[];
  getState(): ConnectState;
  subscribe(listener: () => void): () => void;
  /** Starts an option; rejections become `state.error`, never a thrown promise. */
  choose(id: string): Promise<void>;
  /** Aborts the in-flight option and clears the state. */
  cancel(): void;
};

const idle: ConnectState = { pending: null, error: null, handoffUri: null };

export function createConnectController(
  options: readonly ConnectOption[],
): ConnectController {
  let state = idle;
  let current: AbortController | null = null;
  const listeners = new Set<() => void>();
  const set = (next: Partial<ConnectState>) => {
    state = { ...state, ...next };
    for (const listener of listeners) listener();
  };
  return {
    options,
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async choose(id) {
      const option = options.find((candidate) => candidate.id === id);
      if (!option || option.disabled || current) return;
      const controller = (current = new AbortController());
      set({ pending: id, error: null, handoffUri: null });
      try {
        await option.connect({
          signal: controller.signal,
          handoff: (uri) => {
            if (current === controller) set({ handoffUri: uri });
          },
        });
      } catch (error) {
        if (current === controller)
          set({ pending: null, handoffUri: null, error: messageOf(error) });
      } finally {
        if (current === controller) current = null;
      }
    },
    cancel() {
      current?.abort();
      current = null;
      set(idle);
    },
  };
}

/** A user's own rejection is not an error; wallet errors show their short form, not viem's details. */
function messageOf(error: unknown): string | null {
  const value = error as {
    code?: unknown;
    name?: string;
    shortMessage?: string;
    message?: string;
  } | null;
  if (value?.code === 4001 || value?.name === "AbortError") return null;
  return (
    value?.shortMessage ||
    (error instanceof Error && error.message) ||
    "The connection did not complete."
  );
}
