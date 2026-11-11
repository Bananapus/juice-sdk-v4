/**
 * How long a claimed `onConfirmed` notice stays pending unless its claimant
 * renews it: only a claim whose tab closed or crashed mid-delivery lapses.
 */
export const CONFIRMING_STALE_MS = 5 * 60_000;
/** How often a claimant still delivering renews its claim. */
export const CONFIRMING_RENEW_MS = CONFIRMING_STALE_MS / 5;
