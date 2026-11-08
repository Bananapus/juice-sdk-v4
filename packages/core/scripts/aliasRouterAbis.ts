/** Share identical router ABI literals while retaining distinct historical interfaces. */
export function aliasRouterAbis(source: string): string {
  for (const base of ["jbRouterTerminal", "jbRouterTerminalGateway"]) {
    const canonical = source.match(
      new RegExp(
        `^export const ${base}Abi = (\\[[\\s\\S]*?^\\] as const);?$`,
        "m",
      ),
    )?.[1];
    if (!canonical) continue;
    source = source.replace(
      new RegExp(
        `^export const (${base}(?:Previous|V2|V1)Abi) = (\\[[\\s\\S]*?^\\] as const);?$`,
        "gm",
      ),
      (declaration, name: string, abi: string) =>
        abi === canonical ? `export { ${base}Abi as ${name} }` : declaration,
    );
  }
  return source;
}
