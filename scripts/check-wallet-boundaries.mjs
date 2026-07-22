import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import ts from "typescript";

const productionRoots = [
  resolve("packages/core/src"),
  resolve("packages/react/src"),
];
const inventoryPath = resolve("test/wallet-boundaries.json");
const inventory = JSON.parse(readFileSync(inventoryPath, "utf8"));

const directApis = new Set([
  "sendCalls",
  "sendCallsAsync",
  "sendRawTransaction",
  "sendRawTransactionAsync",
  "sendTransaction",
  "sendTransactionAsync",
  "signMessage",
  "signMessageAsync",
  "signTransaction",
  "signTransactionAsync",
  "signTypedData",
  "signTypedDataAsync",
  "useSendCalls",
  "useSendRawTransaction",
  "useSendTransaction",
  "useSignMessage",
  "useSignTransaction",
  "useSignTypedData",
  "useWalletClient",
  "useWriteContract",
  "useWriteContracts",
  "writeContract",
  "writeContractAsync",
  "writeContracts",
  "writeContractsAsync",
]);
const memberApis = new Set([...directApis, "request"]);
const signingRpcMethods = new Set([
  "eth_sendTransaction",
  "eth_sendRawTransaction",
  "eth_sign",
  "eth_signTransaction",
  "eth_signTypedData",
  "eth_signTypedData_v1",
  "eth_signTypedData_v3",
  "eth_signTypedData_v4",
  "personal_sign",
  "wallet_sendCalls",
]);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function productionFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "generated") return [];
      return productionFiles(path);
    }
    if (!entry.isFile() || !/\.(?:ts|tsx)$/.test(entry.name)) return [];
    if (/\.(?:test|spec)\.(?:ts|tsx)$/.test(entry.name)) return [];
    if (entry.name.endsWith(".d.ts")) return [];
    return [path];
  });
}

function apiOf(call, aliases) {
  if (
    ts.isIdentifier(call.expression)
  ) {
    const name = aliases.get(call.expression.text) ?? call.expression.text;
    if (directApis.has(name)) return name;
  }
  if (
    ts.isPropertyAccessExpression(call.expression) &&
    memberApis.has(call.expression.name.text)
  ) {
    return call.expression.name.text;
  }
  return null;
}

const discovered = [];
for (const filePath of productionRoots.flatMap(productionFiles)) {
  const sourceText = readFileSync(filePath, "utf8");
  const source = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const aliases = new Map();

  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause) continue;
    const bindings = statement.importClause.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const specifier of bindings.elements) {
      const imported = (specifier.propertyName ?? specifier.name).text;
      if (directApis.has(imported)) aliases.set(specifier.name.text, imported);
    }
  }

  function collectAliases(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isObjectBindingPattern(node.name) &&
      node.initializer &&
      ts.isCallExpression(node.initializer)
    ) {
      const initializerApi = apiOf(node.initializer, aliases);
      if (initializerApi?.startsWith("use")) {
        for (const element of node.name.elements) {
          if (!ts.isIdentifier(element.name)) continue;
          const exposed = element.propertyName
            ? element.propertyName.getText(source)
            : element.name.text;
          if (directApis.has(exposed)) aliases.set(element.name.text, exposed);
        }
      }
    }
    ts.forEachChild(node, collectAliases);
  }
  collectAliases(source);

  function visit(node) {
    if (ts.isCallExpression(node)) {
      const api = apiOf(node, aliases);
      if (api) {
        const { line } = source.getLineAndCharacterOfPosition(
          node.getStart(source),
        );
        discovered.push({
          file: relative(resolve("."), filePath),
          line: line + 1,
          api,
        });
      }
    }
    if (ts.isStringLiteral(node) && signingRpcMethods.has(node.text)) {
      const { line } = source.getLineAndCharacterOfPosition(
        node.getStart(source),
      );
      discovered.push({
        file: relative(resolve("."), filePath),
        line: line + 1,
        api: `rpc:${node.text}`,
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}

function siteKey(site) {
  return `${site.file}:${site.line}:${site.api}`;
}

invariant(
  inventory.format === "juice-sdk-wallet-boundaries-1",
  "Unsupported wallet inventory format",
);
invariant(
  Array.isArray(inventory.sites),
  "Wallet inventory sites must be an array",
);
const reviewed = new Map();
for (const site of inventory.sites) {
  invariant(
    typeof site.file === "string" &&
      Number.isInteger(site.line) &&
      typeof site.api === "string" &&
      typeof site.boundary === "string" &&
      site.boundary.length > 0 &&
      typeof site.test === "string",
    `Invalid reviewed wallet site ${JSON.stringify(site)}`,
  );
  invariant(
    existsSync(resolve(site.file)),
    `Missing wallet-boundary source ${site.file}`,
  );
  invariant(
    statSync(resolve(site.test)).isFile(),
    `Missing wallet-boundary test ${site.test}`,
  );
  const key = siteKey(site);
  invariant(!reviewed.has(key), `Duplicate reviewed wallet site ${key}`);
  reviewed.set(key, site);
}

const discoveredKeys = new Set(discovered.map(siteKey));
const unreviewed = discovered.filter((site) => !reviewed.has(siteKey(site)));
const stale = [...reviewed.keys()].filter((key) => !discoveredKeys.has(key));
invariant(
  unreviewed.length === 0,
  `Unreviewed wallet boundary sites:\n${unreviewed.map((site) => `- ${siteKey(site)}`).join("\n")}`,
);
invariant(
  stale.length === 0,
  `Stale wallet boundary inventory sites:\n${stale.map((key) => `- ${key}`).join("\n")}`,
);

process.stdout.write(
  `Reviewed ${discovered.length} production wallet signing/submission sites; 0 unreviewed residuals.\n`,
);
