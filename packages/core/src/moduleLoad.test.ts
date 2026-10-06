import { readFileSync } from "node:fs";
import { posix } from "node:path";
import ts from "typescript";
import { describe, expect, test } from "vitest";

/**
 * Modules apps import on first load, or that a lazily loaded chunk shares with
 * them. A call at module level (`getAddress(...)`, `parseAbi(...)`) runs on
 * import and is not marked pure, so a bundler keeps it, and what it calls, in
 * every chunk that imports anything from the module. The gate covers every
 * module these load, not just the entries.
 */
const ENTRIES = [
  "src/safe.ts",
  "src/safeService.ts",
  "src/review/decode.ts",
  "src/untrusted.ts",
  "src/v6/distributions.ts",
  "src/jbcenter/rateLimit.ts",
];

/** True when evaluating `node` cannot call anything. */
function isInert(node: ts.Expression): boolean {
  if (
    ts.isStringLiteral(node) ||
    ts.isNumericLiteral(node) ||
    ts.isBigIntLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isRegularExpressionLiteral(node) ||
    ts.isIdentifier(node) ||
    ts.isArrowFunction(node) ||
    ts.isFunctionExpression(node) ||
    node.kind === ts.SyntaxKind.TrueKeyword ||
    node.kind === ts.SyntaxKind.FalseKeyword ||
    node.kind === ts.SyntaxKind.NullKeyword
  ) {
    return true;
  }
  if (
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isParenthesizedExpression(node) ||
    ts.isTypeAssertionExpression(node)
  ) {
    return isInert(node.expression);
  }
  if (ts.isPrefixUnaryExpression(node)) return isInert(node.operand);
  if (ts.isBinaryExpression(node)) {
    return isInert(node.left) && isInert(node.right);
  }
  if (ts.isTemplateExpression(node)) {
    return node.templateSpans.every((span) => isInert(span.expression));
  }
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.every(
      (element) => !ts.isSpreadElement(element) && isInert(element),
    );
  }
  if (ts.isObjectLiteralExpression(node)) {
    return node.properties.every(
      (property) =>
        ts.isPropertyAssignment(property) &&
        !ts.isComputedPropertyName(property.name) &&
        isInert(property.initializer),
    );
  }
  return false;
}

/** `file:line` of every statement in `text` that runs something on import. */
function moduleWork(file: string, text = readFileSync(file, "utf8")): string[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const work: string[] = [];
  const at = (node: ts.Node) =>
    `${file}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`;
  for (const statement of source.statements) {
    if (
      ts.isImportDeclaration(statement) ||
      ts.isExportDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isFunctionDeclaration(statement)
    ) {
      continue;
    }
    if (ts.isClassDeclaration(statement)) {
      const base = statement.heritageClauses?.find(
        (clause) => clause.token === ts.SyntaxKind.ExtendsKeyword,
      )?.types[0]?.expression;
      if (
        (base && !ts.isIdentifier(base)) ||
        ts.getDecorators(statement)?.length
      ) {
        work.push(at(statement));
      }
      for (const member of statement.members) {
        if (
          (ts.canHaveDecorators(member) && ts.getDecorators(member)?.length) ||
          (member.name &&
            ts.isComputedPropertyName(member.name) &&
            !isInert(member.name.expression)) ||
          ts.isClassStaticBlockDeclaration(member) ||
          (ts.isPropertyDeclaration(member) &&
            member.modifiers?.some(
              (modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword,
            ) &&
            member.initializer &&
            !isInert(member.initializer))
        ) {
          work.push(at(member));
        }
      }
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (declaration.initializer && !isInert(declaration.initializer)) {
          work.push(at(declaration));
        }
      }
      continue;
    }
    work.push(at(statement));
  }
  return work;
}

/**
 * The relative modules `file` loads: value imports, re-exports and side-effect
 * imports. Only `import type` and `export type` are erased.
 */
function loads(file: string, text: string): string[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const modules: string[] = [];
  for (const statement of source.statements) {
    if (
      !ts.isImportDeclaration(statement) &&
      !ts.isExportDeclaration(statement)
    ) {
      continue;
    }
    const specifier = statement.moduleSpecifier;
    if (
      !specifier ||
      !ts.isStringLiteral(specifier) ||
      !specifier.text.startsWith(".") ||
      (ts.isImportDeclaration(statement)
        ? statement.importClause?.isTypeOnly
        : statement.isTypeOnly)
    ) {
      continue;
    }
    modules.push(
      posix.join(posix.dirname(file), specifier.text.replace(/\.js$/, ".ts")),
    );
  }
  return modules;
}

/** Module-level work in every module `entries` load, keyed by module. */
function closureWork(
  entries: readonly string[],
  read = (file: string) => readFileSync(file, "utf8"),
): Map<string, string[]> {
  const work = new Map<string, string[]>();
  const queue = [...entries];
  for (let file = queue.shift(); file; file = queue.shift()) {
    if (work.has(file)) continue;
    const text = read(file);
    work.set(file, moduleWork(file, text));
    queue.push(...loads(file, text));
  }
  return work;
}

describe("module load", () => {
  // Parsing every module in the closure takes seconds under coverage.
  test("the Safe, Safe service, review decoder, untrusted-input, distribution and JB Center rate-limit modules, and every module they load, run nothing when imported", () => {
    const work = closureWork(ENTRIES);
    expect([...work.values()].flat()).toEqual([]);
  }, 60_000);

  test("flags a module-level call, spread, computed key, constructor or statement", () => {
    const work = (code: string) => moduleWork("sample.ts", code).length;
    expect(work('const A = getAddress("0x1");')).toBe(1);
    expect(work("const A = [...B];")).toBe(1);
    expect(work("const A = { [key]: 1 };")).toBe(1);
    expect(work("const A = new Map();")).toBe(1);
    expect(work("register();")).toBe(1);
    expect(work("class A { static b = c(); }")).toBe(1);
    expect(work("class A { static { b(); } }")).toBe(1);
    expect(work("class A extends b() {}")).toBe(1);
    expect(work("class A { [b()]() {} }")).toBe(1);
    expect(work("class A { [b()] = 1; }")).toBe(1);
    expect(work("@b class A {}")).toBe(1);
    expect(work("class A { @b c() {} }")).toBe(1);
    expect(
      work(
        'const A = { b: [1, "c", -2n, `d${E}`, true, null], f: () => g() } as const;\n' +
          "let B: Map<string, string> | undefined;\n" +
          "function h() { i(); }\n" +
          "class J extends Error { static k = 1; l = m(); [O]() {} }\n" +
          'export { N } from "./n.js";',
      ),
    ).toBe(0);
  });

  test("walks value imports, re-exports and side-effect imports, and skips type-only ones", () => {
    const files: Record<string, string> = {
      "src/a.ts": [
        'import type { T } from "./typed.js";',
        'export type { U } from "./typed.js";',
        'export { X } from "./constants.js";',
        'import "./chains.js";',
        'import { y } from "./v6/y.js";',
        'import { z } from "viem";',
      ].join("\n"),
      "src/constants.ts": 'export const X = parseEther("1");',
      "src/chains.ts": "export const C = defineChain({});",
      "src/v6/y.ts": 'export * from "../star.js";',
      "src/star.ts": "export const S = new Map();",
    };
    const read = (file: string) => {
      if (files[file] === undefined) throw new Error(`No module ${file}.`);
      return files[file];
    };
    expect([...closureWork(["src/a.ts"], read).values()].flat()).toEqual([
      "src/constants.ts:1",
      "src/chains.ts:1",
      "src/star.ts:1",
    ]);
    expect(() =>
      closureWork(["src/b.ts"], (file) =>
        file === "src/b.ts" ? 'import { m } from "./missing.js";' : read(file),
      ),
    ).toThrow("No module src/missing.ts.");
  });
});
