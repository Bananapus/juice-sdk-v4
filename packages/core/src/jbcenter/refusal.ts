// `jbcenter.ts` re-exports this module, so the two form an import cycle. Keep
// the `JBCenterRequestError` read inside the function body: a top-level read
// would resolve before `jbcenter.ts` finishes evaluating under CJS.
import { JBCenterRequestError } from "../jbcenter.js";

export type JBCenterRefusalCode =
  | "sponsor_quota"
  | "sponsor_budget"
  | "unavailable"
  | "rate_limited";

export type JBCenterRefusal = {
  code: JBCenterRefusalCode;
  message: string;
};

/** One sentence per refusal, so no provider or gateway text reaches a reader. */
const MESSAGES: Record<JBCenterRefusalCode, string> = {
  sponsor_quota:
    "Center's daily sponsored-deploy quota is used up. Try again tomorrow.",
  sponsor_budget:
    "Center's daily sponsorship budget is spent. Try again tomorrow.",
  unavailable: "Sponsored deploys are paused right now. Try again shortly.",
  rate_limited: "Center is rate limiting sponsored deploys. Try again shortly.",
};

function refusal(code: JBCenterRefusalCode): JBCenterRefusal {
  return { code, message: MESSAGES[code] };
}

/**
 * The sentence to show when JB Center declines to sponsor a deploy, or `null`
 * when the failure is something else and the caller should keep its own
 * wording.
 */
export function describeCenterRefusal(error: unknown): JBCenterRefusal | null {
  if (!(error instanceof JBCenterRequestError)) return null;
  if (
    error.code === "sponsor_quota" ||
    error.code === "sponsor_budget" ||
    error.code === "unavailable"
  ) {
    return refusal(error.code);
  }
  if (error.status === 429) return refusal("rate_limited");
  if (error.status === 503) return refusal("unavailable");
  return null;
}
