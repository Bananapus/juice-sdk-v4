#!/usr/bin/env node
// A lint for mistaken wallet calls, not a security boundary: it does not follow every alias.
import {
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from "node:fs";
import { createRequire } from "node:module";
import { relative, resolve } from "node:path";

const require = createRequire(resolve("package.json"));
let ts;
try {
  ts = require("typescript");
} catch {
  process.stderr.write(
    "nana-wallet-check needs typescript (>=5.4) installed in the project it runs from.\n",
  );
  process.exit(1);
}

const usage =
  "Usage: nana-wallet-check --root <dir>... --inventory <json> [--forbid-import <spec>]... [--exclude <glob>]...";
const productionRoots = [];
const forbiddenImports = [];
/** Paths (relative to the working directory) left out by `--exclude`: `**` spans directories, `*` and `?` stay within one. */
const excluded = [];
const globPattern = (glob) =>
  new RegExp(
    `^${glob
      .replaceAll("\\", "/")
      .replace(/^(?:\.\/)+/, "")
      .split(/(\*\*\/|\*\*|\*|\?)/)
      .map((part) =>
        part === "**/"
          ? "(?:.*/)?"
          : part === "**"
            ? ".*"
            : part === "*"
              ? "[^/]*"
              : part === "?"
                ? "[^/]"
                : part.replace(/[.+^${}()|[\]\\]/g, "\\$&"),
      )
      .join("")}$`,
  );
let inventoryArg;
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 2) {
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) {
    process.stderr.write(`${usage}\n`);
    process.exit(1);
  }
  if (args[index] === "--root") productionRoots.push(resolve(value));
  else if (args[index] === "--forbid-import") forbiddenImports.push(value);
  else if (args[index] === "--inventory") inventoryArg = value;
  else if (args[index] === "--exclude") excluded.push(globPattern(value));
  else {
    process.stderr.write(`${usage}\n`);
    process.exit(1);
  }
}
if (productionRoots.length === 0 || !inventoryArg) {
  process.stderr.write(`${usage}\n`);
  process.exit(1);
}
const inventory = JSON.parse(readFileSync(resolve(inventoryArg), "utf8"));

const directApis = new Set([
  "deployContract",
  "deployContractAsync",
  "useDeployContract",
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
const selfReviewingApis = new Set([
  "selfReviewingAdapter",
  "signaWalletAdapter",
]);
const guardedNames = new Set([
  "registerTransactionReviewHandler",
  ...selfReviewingApis,
]);
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
  "wallet_sendTransaction",
]);

function invariant(condition, message) {
  if (condition) return;
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const sourceExtension = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const sourceKinds = {
  ".tsx": ts.ScriptKind.TSX,
  ".jsx": ts.ScriptKind.JSX,
  ".js": ts.ScriptKind.JS,
  ".mjs": ts.ScriptKind.JS,
  ".cjs": ts.ScriptKind.JS,
};

function productionFiles(directory, ancestors = []) {
  const real = realpathSync(directory);
  if (ancestors.includes(real)) return [];
  return readdirSync(directory).flatMap((name) => {
    const path = resolve(directory, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (name === "node_modules") return [];
      return productionFiles(path, [...ancestors, real]);
    }
    if (!stat.isFile() || !sourceExtension.test(name)) return [];
    if (/\.d\.[cm]?ts$/.test(name)) return [];
    // Every other file under a root is scanned unless the caller excludes it.
    const shown = relative(resolve("."), path).split("\\").join("/");
    if (excluded.some((pattern) => pattern.test(shown))) return [];
    return [path];
  });
}

function unwrap(expression) {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function memberNameOf(expression) {
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  if (
    ts.isElementAccessExpression(expression) &&
    ts.isStringLiteralLike(unwrap(expression.argumentExpression))
  ) {
    return unwrap(expression.argumentExpression).text;
  }
  return null;
}

// The name a callee resolves to: a bare identifier (through import and
// destructuring aliases) or a member, including a quoted member and one reached
// through call, apply or bind.
function calleeOf(expression, aliases) {
  const callee = unwrap(expression);
  if (ts.isIdentifier(callee)) {
    return { name: aliases.get(callee.text) ?? callee.text, member: false };
  }
  const member = memberNameOf(callee);
  if (member === null) return null;
  if (["call", "apply", "bind"].includes(member)) {
    const inner = calleeOf(callee.expression, aliases);
    if (inner && (inner.member || directApis.has(inner.name))) return inner;
  }
  return { name: member, member: true };
}

/**
 * The method a `.request(...)` call names when it is written out: the first
 * argument's string, or its object's `method` string. Null when the code does
 * not say (a variable, a spread, a call through call/apply/bind).
 */
function requestMethodOf(call) {
  if (memberNameOf(unwrap(call.expression)) !== "request") return null;
  const first = call.arguments[0] && unwrap(call.arguments[0]);
  if (!first) return null;
  if (ts.isStringLiteralLike(first)) return first.text;
  if (!ts.isObjectLiteralExpression(first)) return null;
  // Only plain, written-out keys: a spread, shorthand, accessor or computed
  // key could name the method another way.
  if (
    first.properties.some(
      (property) =>
        !ts.isPropertyAssignment(property) ||
        !(
          ts.isIdentifier(property.name) ||
          ts.isStringLiteralLike(property.name)
        ),
    )
  )
    return null;
  const methods = first.properties.filter(
    (property) => property.name.text === "method",
  );
  if (methods.length !== 1) return null;
  const value = unwrap(methods[0].initializer);
  return ts.isStringLiteralLike(value) ? value.text : null;
}

function apiOf(call, aliases) {
  const callee = calleeOf(call.expression, aliases);
  if (!callee) return null;
  if (callee.member && callee.name === "request") {
    // A request whose method is written out and signs nothing is a read.
    const method = requestMethodOf(call);
    return method === null || signingRpcMethods.has(method) ? "request" : null;
  }
  return (callee.member ? memberApis : directApis).has(callee.name)
    ? callee.name
    : null;
}

const discovered = [];
const forbidden = [];
const selfReviewing = new Set(
  (Array.isArray(inventory.selfReviewing) ? inventory.selfReviewing : []).map(
    (file) =>
      typeof file === "string" ? relative(resolve("."), resolve(file)) : file,
  ),
);
for (const filePath of new Set(
  productionRoots.flatMap((root) => productionFiles(root)),
)) {
  const sourceText = readFileSync(filePath, "utf8");
  const source = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    sourceKinds[filePath.slice(filePath.lastIndexOf("."))] ?? ts.ScriptKind.TS,
  );
  const aliases = new Map();

  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause) continue;
    const bindings = statement.importClause.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const specifier of bindings.elements) {
      const imported = (specifier.propertyName ?? specifier.name).text;
      if (
        directApis.has(imported) ||
        selfReviewingApis.has(imported) ||
        imported === "registerTransactionReviewHandler"
      )
        aliases.set(specifier.name.text, imported);
    }
  }

  function aliasPattern(pattern) {
    for (const element of pattern.elements) {
      if (!ts.isIdentifier(element.name)) continue;
      const key = element.propertyName;
      const exposed = !key
        ? element.name.text
        : ts.isComputedPropertyName(key)
          ? ts.isStringLiteralLike(key.expression)
            ? key.expression.text
            : null
          : key.text;
      if (directApis.has(exposed)) aliases.set(element.name.text, exposed);
    }
  }

  function collectAliases(node) {
    if (
      (ts.isVariableDeclaration(node) || ts.isParameter(node)) &&
      ts.isObjectBindingPattern(node.name)
    ) {
      aliasPattern(node.name);
    } else if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    ) {
      const initializer = unwrap(node.initializer);
      const name = memberNameOf(initializer);
      if (name !== null && (directApis.has(name) || guardedNames.has(name))) {
        aliases.set(node.name.text, name);
      } else if (
        ts.isIdentifier(initializer) &&
        aliases.has(initializer.text)
      ) {
        aliases.set(node.name.text, aliases.get(initializer.text));
      }
    }
    ts.forEachChild(node, collectAliases);
  }
  collectAliases(source);

  const here = relative(resolve("."), filePath);
  function lineOf(node) {
    return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
  }
  function moduleSpecifierOf(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const typeOnly = ts.isImportDeclaration(node)
        ? node.importClause?.isTypeOnly
        : node.isTypeOnly;
      const named = ts.isImportDeclaration(node)
        ? node.importClause?.namedBindings
        : node.exportClause;
      const allTypeOnly =
        named &&
        (ts.isNamedImports(named) || ts.isNamedExports(named)) &&
        named.elements.length > 0 &&
        !node.importClause?.name &&
        named.elements.every((element) => element.isTypeOnly);
      return typeOnly || allTypeOnly ? null : node.moduleSpecifier;
    }
    if (
      ts.isImportEqualsDeclaration(node) &&
      !node.isTypeOnly &&
      ts.isExternalModuleReference(node.moduleReference) &&
      ts.isStringLiteralLike(node.moduleReference.expression)
    ) {
      return node.moduleReference.expression;
    }
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === "require")) &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      return node.arguments[0];
    }
    return null;
  }
  function visit(node) {
    const nameNode =
      ts.isIdentifier(node) &&
      !ts.isImportSpecifier(node.parent) &&
      !ts.isExportSpecifier(node.parent) &&
      !ts.isPropertySignature(node.parent)
        ? node
        : ts.isStringLiteralLike(node) &&
            ((ts.isPropertyAssignment(node.parent) &&
              node.parent.name === node) ||
              ts.isComputedPropertyName(node.parent) ||
              ts.isElementAccessExpression(node.parent))
          ? node
          : null;
    if (nameNode && nameNode.text === "reviewedInParent") {
      discovered.push({ file: here, line: lineOf(node), api: nameNode.text });
    }
    const specifier = moduleSpecifierOf(node);
    if (
      specifier &&
      forbiddenImports.some(
        (spec) =>
          specifier.text === spec || specifier.text.startsWith(`${spec}/`),
      )
    ) {
      forbidden.push(`${here}:${lineOf(specifier)}:import ${specifier.text}`);
    }
    if (ts.isCallExpression(node)) {
      const callee = calleeOf(node.expression, aliases)?.name;
      if (callee === "registerTransactionReviewHandler") {
        discovered.push({ file: here, line: lineOf(node), api: callee });
      }
      if (selfReviewingApis.has(callee) && !selfReviewing.has(here)) {
        forbidden.push(
          `${here}:${lineOf(node)}:${callee} outside selfReviewing`,
        );
      }
      const api = apiOf(node, aliases);
      if (api) discovered.push({ file: here, line: lineOf(node), api });
    }
    if (ts.isStringLiteralLike(node) && signingRpcMethods.has(node.text)) {
      discovered.push({
        file: here,
        line: lineOf(node),
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
  site.file = relative(resolve("."), resolve(site.file));
  const key = siteKey(site);
  invariant(!reviewed.has(key), `Duplicate reviewed wallet site ${key}`);
  reviewed.set(key, site);
}

const discoveredKeys = new Set(discovered.map(siteKey));
const sameLine = discovered.filter(
  (site, index) =>
    discovered.findIndex((other) => siteKey(other) === siteKey(site)) !== index,
);
invariant(
  sameLine.length === 0,
  `Several wallet boundary sites share one line, so one inventory row cannot review each; split the line:\n${sameLine.map((site) => `- ${siteKey(site)}`).join("\n")}`,
);
const unreviewed = discovered.filter((site) => !reviewed.has(siteKey(site)));
const stale = [...reviewed.keys()].filter((key) => !discoveredKeys.has(key));
invariant(
  Array.isArray(inventory.selfReviewing ?? []) &&
    [...selfReviewing].every(
      (file) => typeof file === "string" && existsSync(resolve(file)),
    ),
  "Wallet inventory selfReviewing must list existing files",
);
invariant(
  forbidden.length === 0,
  `Forbidden wallet boundary uses:\n${forbidden.map((line) => `- ${line}`).join("\n")}`,
);
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
