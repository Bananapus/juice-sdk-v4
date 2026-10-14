import { HELD_RELEASE_LABEL } from "../index.js";
import { useState } from "react";
import type { HeldWriteItem } from "./useHeldWrites.js";

/**
 * The one app-wide notice of held writes: each with its action's label, its
 * line, any warning, and the release when its hold offers the exit. Feed it
 * useHeldWrites, useHeldIntents, or both. Unstyled: `className` is the hook.
 */
export function HeldWritesNotice({
  items,
  className,
}: {
  items: readonly HeldWriteItem[];
  className?: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const shown = items.filter(({ view }) => view.line);
  if (!shown.length) return null;
  return (
    <div role="status" className={className}>
      {shown.map(({ key, label, view, release }) => (
        <div key={key} data-phase={view.phase}>
          {label ? <p>{label}</p> : null}
          <p>{view.line}</p>
          {view.warning ? <p>{view.warning}</p> : null}
          {view.notice ? <p>{view.notice}</p> : null}
          {view.exit ? (
            <button
              type="button"
              disabled={busy === key}
              onClick={() => {
                setBusy(key);
                void release().finally(() => setBusy(null));
              }}
            >
              {HELD_RELEASE_LABEL}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
