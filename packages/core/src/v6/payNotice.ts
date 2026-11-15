/** Each chain's payment notice as read: a string ("" for none), or null/undefined when its read failed. */
export type PayNotices = Readonly<Record<number, string | null | undefined>>;

export type PayNoticeView = {
  /** The notice for the chain being paid; "" when it has none or it could not be read. */
  notice: string;
  /** The paid chain's notice could not be read: say so and offer a retry, without blocking the payment. */
  failed: boolean;
  /** The project's other chains whose notice reads differently, in the caller's display order. */
  others: { chainId: number; notice: string }[];
};

/**
 * What a payer is shown for the chain they pay on. Each chain keeps its own
 * project file, so the notice can differ between them: the payer sees the one
 * for their chain, and the others when they differ. A failed read of the paid
 * chain's notice lists no others, since there is nothing to compare them to.
 *
 * @param chainId The chain being paid.
 * @param notices Each project chain's notice as read.
 * @param byDisplayOrder The site's chain order for `others`.
 */
export function payNoticeView(
  chainId: number,
  notices: PayNotices,
  byDisplayOrder: (a: number, b: number) => number = (a, b) => a - b,
): PayNoticeView {
  const own = notices[chainId];
  return {
    notice: own ?? "",
    failed: own == null,
    others: Object.entries(notices)
      .map(([id, notice]) => ({ chainId: Number(id), notice }))
      .filter(
        (row): row is { chainId: number; notice: string } =>
          row.chainId !== chainId &&
          row.notice != null &&
          own != null &&
          row.notice !== own,
      )
      .sort((a, b) => byDisplayOrder(a.chainId, b.chainId)),
  };
}
