/** Every message, error name and revert payload in a viem or wallet error, however deeply nested. */
export function collectErrorText(
  value: unknown,
  seen = new Set<unknown>(),
  depth = 0,
): string[] {
  if (depth > 8 || value === null || value === undefined || seen.has(value)) {
    return [];
  }
  if (typeof value === "string") return [value];
  if (typeof value !== "object") return [];
  seen.add(value);
  const record = value as Record<string, unknown>;
  return [
    record.shortMessage,
    record.message,
    record.details,
    record.errorName,
    record.signature,
    record.raw,
    record.data,
    record.cause,
    record.error,
  ].flatMap((item) => collectErrorText(item, seen, depth + 1));
}
