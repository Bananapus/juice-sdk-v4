import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const bin = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "wallet-check.mjs",
);
const typescriptModules = resolve(
  dirname(createRequire(import.meta.url).resolve("typescript/package.json")),
  "..",
);
const dirs = [];

function project(files, sites = [], extra = {}) {
  const dir = mkdtempSync(join(tmpdir(), "wallet-check-"));
  dirs.push(dir);
  symlinkSync(typescriptModules, join(dir, "node_modules"));
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, "reviewed.test.ts"), "");
  for (const [name, text] of Object.entries(files)) {
    writeFileSync(join(dir, "src", name), text);
  }
  writeFileSync(
    join(dir, "inventory.json"),
    JSON.stringify({
      format: "juice-sdk-wallet-boundaries-1",
      sites: sites.map(([name, line, api]) => ({
        file: `src/${name}`,
        line,
        api,
        boundary: "reviewed",
        test: "reviewed.test.ts",
      })),
      ...extra,
    }),
  );
  return dir;
}

function run(dir, ...flags) {
  const result = spawnSync(
    process.execPath,
    [bin, "--root", "src", "--inventory", "inventory.json", ...flags],
    { cwd: dir, encoding: "utf8" },
  );
  return { status: result.status, out: result.stdout + result.stderr };
}

afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

describe("nana-wallet-check", () => {
  it("passes a clean file", () => {
    const dir = project({ "clean.ts": "export const a = 1;\n" });
    expect(run(dir).status).toBe(0);
  });

  it("fails an uninventoried wallet call with its file and line", () => {
    const dir = project({
      "send.ts": "const x = 1;\nwallet.sendTransaction({});\n",
    });
    const { status, out } = run(dir);
    expect(status).toBe(1);
    expect(out).toContain("src/send.ts:2:sendTransaction");
  });

  it("fails an uninventoried reviewedInParent", () => {
    const dir = project({
      "parent.ts": "const x = 1;\nrun({ reviewedInParent: true });\n",
    });
    const { status, out } = run(dir);
    expect(status).toBe(1);
    expect(out).toContain("src/parent.ts:2:reviewedInParent");
  });

  it("fails an uninventoried registerTransactionReviewHandler call", () => {
    const dir = project({
      "handler.ts":
        "const x = 1;\nregisterTransactionReviewHandler(() => true);\n",
    });
    const { status, out } = run(dir);
    expect(status).toBe(1);
    expect(out).toContain("src/handler.ts:2:registerTransactionReviewHandler");
  });

  it("fails a stale inventory row", () => {
    const dir = project({ "clean.ts": "export const a = 1;\n" }, [
      ["clean.ts", 1, "sendTransaction"],
    ]);
    const { status, out } = run(dir);
    expect(status).toBe(1);
    expect(out).toContain("src/clean.ts:1:sendTransaction");
  });

  it("fails an import that matches --forbid-import", () => {
    const dir = project({
      "import.ts":
        'const x = 1;\nimport { useThing } from "@bananapus/nana-sdk-react/hooks";\n',
      "dynamic.ts":
        'export const load = () => import("@bananapus/nana-sdk-react");\n',
    });
    const { status, out } = run(
      dir,
      "--forbid-import",
      "@bananapus/nana-sdk-react",
    );
    expect(status).toBe(1);
    expect(out).toContain(
      "src/import.ts:2:import @bananapus/nana-sdk-react/hooks",
    );
    expect(out).toContain("src/dynamic.ts:1:import @bananapus/nana-sdk-react");
    expect(run(dir).status).toBe(0);
  });

  it("fails a self-reviewing adapter call outside selfReviewing files", () => {
    const files = {
      "adapter.ts":
        "const x = 1;\nexport const a = selfReviewingAdapter({});\n",
      "signa.ts": "export const a = signaWalletAdapter({});\n",
    };
    const { status, out } = run(project(files));
    expect(status).toBe(1);
    expect(out).toContain("src/adapter.ts:2:selfReviewingAdapter");
    expect(out).toContain("src/signa.ts:1:signaWalletAdapter");
    const listed = project(files, [], {
      selfReviewing: ["src/adapter.ts", "src/signa.ts"],
    });
    expect(run(listed).status).toBe(0);
  });

  it("passes occurrences that have inventory rows", () => {
    const dir = project(
      {
        "parent.ts": "const x = 1;\nrun({ reviewedInParent: true });\n",
        "handler.ts":
          "const x = 1;\nregisterTransactionReviewHandler(() => true);\n",
      },
      [
        ["parent.ts", 2, "reviewedInParent"],
        ["handler.ts", 2, "registerTransactionReviewHandler"],
      ],
    );
    expect(run(dir).status).toBe(0);
  });

  it.each([
    ["element access", 'wallet["sendTransaction"]({});', "sendTransaction"],
    [
      "parenthesized member",
      "(wallet.sendTransaction)({});",
      "sendTransaction",
    ],
    ["call", "wallet.sendTransaction.call(wallet, {});", "sendTransaction"],
    [
      "member alias",
      "const send = wallet.sendTransaction;\nsend({});",
      "sendTransaction",
    ],
    [
      "required destructuring",
      'const { sendTransaction: send } = require("viem/actions");\nsend(wallet, {});',
      "sendTransaction",
    ],
    ["deployContract", "wallet.deployContract({});", "deployContract"],
    [
      "call on an imported action",
      'import { sendTransaction as send } from "viem/actions";\nsend.call(null, wallet, {});',
      "sendTransaction",
    ],
    [
      "parameter destructuring",
      "function pay({ sendTransaction: send }, tx) {\n  return send(tx);\n}",
      "sendTransaction",
    ],
    [
      "template rpc method",
      "provider.send(`personal_sign`, []);",
      "rpc:personal_sign",
    ],
    [
      "quoted reviewedInParent",
      'run({ "reviewedInParent": true });',
      "reviewedInParent",
    ],
  ])("fails %s", (_name, text, api) => {
    const { status, out } = run(project({ "case.js": `${text}\n` }));
    expect(status).toBe(1);
    expect(out).toContain(`src/case.js:`);
    expect(out).toContain(`:${api}`);
  });

  it("fails a same-line duplicate that one row cannot review", () => {
    const dir = project(
      { "twice.ts": "wallet.sendTransaction(a); wallet.sendTransaction(b);\n" },
      [["twice.ts", 1, "sendTransaction"]],
    );
    const { status, out } = run(dir);
    expect(status).toBe(1);
    expect(out).toContain("split the line");
  });

  it("forbids import-equals and ignores type-only imports", () => {
    const dir = project({
      "eq.ts": 'import sdk = require("@bananapus/nana-sdk-react");\n',
      "types.ts":
        'import type { T } from "@bananapus/nana-sdk-react";\nexport type { U } from "@bananapus/nana-sdk-react";\n',
    });
    const { status, out } = run(
      dir,
      "--forbid-import",
      "@bananapus/nana-sdk-react",
    );
    expect(status).toBe(1);
    expect(out).toContain("src/eq.ts:1:import @bananapus/nana-sdk-react");
    expect(out).not.toContain("src/types.ts");
  });

  it("scans a symlinked source directory", () => {
    const dir = project({});
    mkdirSync(join(dir, "real"));
    writeFileSync(join(dir, "real", "x.ts"), "wallet.sendTransaction({});\n");
    symlinkSync(join(dir, "real"), join(dir, "src", "linked"));
    const { status, out } = run(dir);
    expect(status).toBe(1);
    expect(out).toContain("src/linked/x.ts:1:sendTransaction");
  });

  it("accepts inline type-only imports, string values and overlapping roots", () => {
    const dir = project({
      "ok.ts":
        'import { type T } from "@bananapus/nana-sdk-react";\nexport const labels = { note: "reviewedInParent" };\n',
    });
    const result = spawnSync(
      process.execPath,
      [
        bin,
        "--root",
        "src",
        "--root",
        "src",
        "--inventory",
        "inventory.json",
        "--forbid-import",
        "@bananapus/nana-sdk-react",
      ],
      { cwd: dir, encoding: "utf8" },
    );
    expect(result.status).toBe(0);
  });

  it("survives a symlink loop", () => {
    const dir = project({ "ok.ts": "export const a = 1;\n" });
    symlinkSync(join(dir, "src"), join(dir, "src", "loop"));
    expect(run(dir).status).toBe(0);
  });

  it("matches inventory paths however they are spelled", () => {
    const dir = project(
      { "adapter.ts": "export const a = selfReviewingAdapter({});\n" },
      [],
      { selfReviewing: ["./src/adapter.ts"] },
    );
    expect(run(dir).status).toBe(0);
  });

  it("exits 1 with usage when the flags are missing", () => {
    const dir = project({});
    const result = spawnSync(process.execPath, [bin], {
      cwd: dir,
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Usage: nana-wallet-check");
  });
});
