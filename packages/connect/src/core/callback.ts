/** The wallet client surface the callback page needs. */
export type CenterCallbackWallet = {
  completeConnection(url: string): Promise<unknown>;
  retryConnection(): Promise<unknown>;
  payments(): {
    completePayment(url: string): Promise<unknown>;
    refreshPayment(): Promise<unknown>;
  };
};
export type CenterCallbackResult =
  | { kind: "connection"; connection: unknown }
  | { kind: "payment"; status: unknown };

/** Finishes whatever Center sent the browser back for: a connection (`code`) or a payment
 * review (`review`). Without parameters it retries the pending exchange, so a reload of the
 * callback page after a failed exchange resumes instead of starting over. */
export async function completeCenterCallback(
  wallet: CenterCallbackWallet,
  url: string,
): Promise<CenterCallbackResult> {
  const parameters = new URL(url).searchParams;
  if (parameters.has("review"))
    return {
      kind: "payment",
      status: await wallet.payments().completePayment(url),
    };
  if (parameters.has("code"))
    return {
      kind: "connection",
      connection: await wallet.completeConnection(url),
    };
  if (parameters.has("state"))
    return {
      kind: "payment",
      status: await wallet.payments().refreshPayment(),
    };
  return { kind: "connection", connection: await wallet.retryConnection() };
}
