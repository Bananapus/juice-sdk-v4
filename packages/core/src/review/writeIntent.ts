import { isAddress, isHex, keccak256, stringToHex } from "viem";

const TAG = Symbol.for("nana-sdk:write-intent-tag");

/** An address or hex value, normalized to lower case: from {@link intent}. */
export type IntentTagged = {
  readonly [TAG]: "address" | "hex";
  readonly value: string;
};

/**
 * A value the user chose for an intent: a string (compared exactly, case
 * included), a safe integer, a bigint, a boolean, null, an address or hex
 * tagged with {@link intent}, or an array or record of these. An undefined
 * record field is left out. A number and a bigint are different values: pass
 * amounts (wei, token units) as bigint, and counts or ids that fit as number,
 * consistently.
 */
export type IntentValue =
  | string
  | number
  | bigint
  | boolean
  | null
  | IntentTagged
  | readonly IntentValue[]
  | { readonly [name: string]: IntentValue | undefined };

/** Tag values compared case-blind. Every other string stays case-sensitive. */
export const intent = {
  address(value: string): IntentTagged {
    if (!isAddress(value, { strict: false }))
      throw new Error(`Invalid intent address: ${String(value)}.`);
    return { [TAG]: "address", value: value.toLowerCase() };
  },
  hex(value: string): IntentTagged {
    if (!isHex(value, { strict: true }))
      throw new Error(`Invalid intent hex: ${String(value)}.`);
    return { [TAG]: "hex", value: value.toLowerCase() };
  },
};

function canonical(value: unknown): string {
  if (value === null) return "z";
  if (typeof value === "boolean") return value ? "t" : "f";
  if (typeof value === "string") return `s${JSON.stringify(value)}`;
  if (typeof value === "bigint") return `i${value.toString()}`;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value))
      throw new Error(`An intent number must be a safe integer: ${value}.`);
    return `d${value}`;
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1)
      if (!(index in value))
        throw new Error("An intent array can't be sparse.");
    return `[${value.map(canonical).join(",")}]`;
  }
  if (typeof value === "object") {
    const tag = (value as Partial<IntentTagged>)[TAG];
    if (tag)
      return `${tag === "address" ? "a" : "h"}${(value as IntentTagged).value}`;
    const fields = Object.keys(value)
      .filter((name) => (value as Record<string, unknown>)[name] !== undefined)
      .sort()
      .map(
        (name) =>
          `${JSON.stringify(name)}:${canonical((value as Record<string, unknown>)[name])}`,
      );
    return `{${fields.join(",")}}`;
  }
  throw new Error(`Invalid intent value: ${String(value)}.`);
}

/**
 * The write hold namespace for a write whose calldata regenerates on retry:
 * the action and the parameters the user chose, canonically encoded (sorted
 * keys, decimal integers, exact strings) and hashed, behind a readable action
 * prefix (every value type its own tag: a number never equals a bigint, and
 * an array may not be sparse). A retry of the same intent is held by the first attempt until it
 * settles or the user takes its explicit exit.
 *
 * Include the user's chosen inputs and the identity of what is acted on
 * (project, pool, collection, position, loan). Leave out what restamps on
 * every review: deadlines, expirations, signatures, nonces and quotes derived
 * from the inputs. Tag addresses and hex with {@link intent} so they compare
 * case-blind; plain strings (a memo) compare exactly.
 */
export function writeIntentKey(
  action: string,
  params: { readonly [name: string]: IntentValue | undefined },
): string {
  const slug = String(action)
    .toLowerCase()
    .replace(/[^a-z0-9._/-]+/g, "-")
    .replace(/^[^a-z0-9]+|-+$/g, "")
    .slice(0, 40);
  if (!slug) throw new Error("A write intent needs an action.");
  const digest = keccak256(stringToHex(canonical([action, params]))).slice(
    2,
    42,
  );
  return `intent:${slug}:${digest}`;
}
