/** Share identical router ABI literals while retaining distinct historical interfaces. */
export function aliasRouterAbis(source: string): string {
  const canonical = source.match(
    /^export const jbRouterTerminalAbi = (\[[\s\S]*?^\] as const);?$/m,
  )?.[1];
  if (!canonical) return source;

  return source.replace(
    /^export const (jbRouterTerminalPreviousAbi|jbRouterTerminalV1Abi) = (\[[\s\S]*?^\] as const);?$/gm,
    (declaration, name: string, abi: string) =>
      abi === canonical
        ? `export { jbRouterTerminalAbi as ${name} }`
        : declaration,
  );
}
