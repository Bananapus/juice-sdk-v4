import type { Hex } from "viem";

// Readers for values that came from a service, an RPC or storage. Each returns
// null, or false, for anything outside the exact shape, never a guess.

const MAX_UINT256 = (1n << 256n) - 1n;

/** A uint256 given as decimal or 0x-hex digits, a safe integer or a bigint. */
export function uint256(value: unknown): bigint | null {
  let parsed: bigint;
  if (typeof value === "bigint") parsed = value;
  else if (typeof value === "number" && Number.isSafeInteger(value)) {
    parsed = BigInt(value);
  } else if (
    typeof value === "string" &&
    /^(?:0x[0-9a-f]+|\d+)$/iu.test(value)
  ) {
    parsed = BigInt(value);
  } else return null;
  return parsed >= 0n && parsed <= MAX_UINT256 ? parsed : null;
}

/** Whole bytes of hex, "0x" included. */
export function isHexBytes(value: unknown): value is Hex {
  return typeof value === "string" && /^0x(?:[0-9a-f]{2})*$/iu.test(value);
}

/** Exactly 32 bytes of hex: a transaction, block or Safe transaction hash. */
export function isBytes32(value: unknown): value is Hex {
  return typeof value === "string" && /^0x[0-9a-f]{64}$/iu.test(value);
}

/** An HTTP-date in IMF-fixdate form, the one RFC 9110 has a sender use. */
const IMF_FIXDATE =
  /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/u;

/** An HTTP-date in the obsolete RFC 850 form, with a two-digit year. */
const RFC_850_DATE =
  /^(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day, (\d{2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{2}) (\d{2}:\d{2}:\d{2}) GMT$/u;

/** An HTTP-date in the obsolete asctime form, which is in GMT without saying so. */
const ASCTIME_DATE =
  /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) [ \d]\d \d{2}:\d{2}:\d{2} \d{4}$/u;

/**
 * The wait a Retry-After header asks for at `nowMs`, in milliseconds: its
 * delay-seconds, or the time left until its HTTP-date in any of RFC 9110's
 * three forms (none once that has passed). An RFC 850 year that would be more
 * than 50 years ahead is the last such year past, as RFC 9110 reads it. Null
 * for anything else, a missing header included.
 */
export function retryAfterMs(
  value: unknown,
  nowMs: number = Date.now(),
): number | null {
  if (typeof value !== "string") return null;
  if (/^\d+$/u.test(value)) return Number(value) * 1000;
  let date: string;
  const rfc850 = RFC_850_DATE.exec(value);
  if (rfc850) {
    const [, day, month, shortYear, time] = rfc850;
    const thisYear = new Date(nowMs).getUTCFullYear();
    let year = thisYear - (thisYear % 100) + Number(shortYear);
    if (year > thisYear + 50) year -= 100;
    date = `${day} ${month} ${year} ${time} GMT`;
  } else if (ASCTIME_DATE.test(value)) {
    date = `${value} GMT`;
  } else if (IMF_FIXDATE.test(value)) {
    date = value;
  } else {
    return null;
  }
  const at = Date.parse(date);
  return Number.isNaN(at) ? null : Math.max(at - nowMs, 0);
}
