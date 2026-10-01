import { readdirSync, readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, test } from "vitest";

/**
 * Modules apps import on first load, or that a lazily loaded chunk shares with
 * them. A call at module level (`getAddress(...)`, `parseAbi(...)`) runs on
 * import and is not marked pure, so a bundler keeps it, and what it calls, in
 * every chunk that imports anything from the module.
 */
const MODULES = [
  "src/safe.ts",
  "src/safeService.ts",
  "src/review/decode.ts",
  "src/untrusted.ts",
  ...readdirSync("src/generated/abi").map(
    (file) => `src/generated/abi/${file}`,
  ),
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
      for (const member of statement.members) {
        if (
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

describe("module load", () => {
  test("the Safe, Safe service, review decoder, its ABI modules and the untrusted-input readers run nothing when imported", () => {
    for (const file of MODULES) expect(moduleWork(file)).toEqual([]);
  });

  test("flags a module-level call, spread, computed key, constructor or statement", () => {
    const work = (code: string) => moduleWork("sample.ts", code).length;
    expect(work('const A = getAddress("0x1");')).toBe(1);
    expect(work("const A = [...B];")).toBe(1);
    expect(work("const A = { [key]: 1 };")).toBe(1);
    expect(work("const A = new Map();")).toBe(1);
    expect(work("register();")).toBe(1);
    expect(work("class A { static b = c(); }")).toBe(1);
    expect(work("class A { static { b(); } }")).toBe(1);
    expect(
      work(
        'const A = { b: [1, "c", -2n, `d${E}`, true, null], f: () => g() } as const;\n' +
          "let B: Map<string, string> | undefined;\n" +
          "function h() { i(); }\n" +
          "class J { static k = 1; l = m(); }\n" +
          'export { N } from "./n.js";',
      ),
    ).toBe(0);
  });
});
