// The held-write hooks (@bananapus/nana-sdk-core/review/react) must load in
// an app with no wagmi, or a wagmi other than nana-sdk-react's: nothing they
// import, however indirectly, may name wagmi. Walks the built ESM and CJS
// graphs, then loads both with wagmi made unresolvable.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const dist = resolve("packages/core/dist");
// tsc's output forms: `from "x";` ending a statement, a bare `import "x";`,
// and `require("x")` / `import("x")` calls.
const pattern =
  /\bfrom\s+"([^"]+)";?\s*$|^\s*import\s+"([^"]+)"|\b(?:require|import)\(\s*"([^"]+)"\s*\)/gm;

function walk(entry) {
  const bare = new Set();
  const seen = new Set();
  const queue = [entry];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    for (const [, from, side, call] of readFileSync(file, "utf8").matchAll(
      pattern,
    )) {
      const specifier = from ?? side ?? call;
      if (!specifier.startsWith(".")) bare.add(specifier);
      else {
        const next = resolve(dirname(file), specifier);
        queue.push(next.endsWith(".js") ? next : `${next}.js`);
      }
    }
  }
  return { bare, files: seen.size };
}

let failed = false;
for (const format of ["esm", "cjs"]) {
  const { bare, files } = walk(`${dist}/${format}/review/react/index.js`);
  const wagmi = [...bare].filter((name) => /(^|\/|@)wagmi/.test(name));
  if (wagmi.length) {
    failed = true;
    console.error(`${format}: review/react reaches ${wagmi.join(", ")}`);
  } else
    console.log(
      `${format}: review/react, ${files} files, imports ${[...bare].sort().join(", ")}`,
    );
}

// Load it with wagmi unresolvable, as in an app that has none.
const hooks = `import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, next) {
  if (/(^|\\/|@)wagmi/.test(specifier)) throw new Error("wagmi imported: " + specifier);
  return next(specifier, context);
} });`;
const load = `const esm = await import("@bananapus/nana-sdk-core/review/react");
const cjs = (await import("node:module")).createRequire(import.meta.url)("@bananapus/nana-sdk-core/review/react");
for (const name of ["useHeldWrite", "useHeldIntents", "useHeldWrites", "HeldWritesNotice", "useSavedAttempt"])
  if (typeof esm[name] !== "function" || typeof cjs[name] !== "function") throw new Error("missing " + name);`;
const run = spawnSync(
  process.execPath,
  [
    "--import",
    `data:text/javascript,${encodeURIComponent(hooks)}`,
    "--input-type=module",
    "--eval",
    load,
  ],
  { cwd: resolve("packages/core"), encoding: "utf8" },
);
if (run.status !== 0) {
  failed = true;
  console.error(run.stderr || run.stdout);
} else console.log("review/react loads (ESM and CJS) with wagmi unresolvable");
if (failed) process.exit(1);
