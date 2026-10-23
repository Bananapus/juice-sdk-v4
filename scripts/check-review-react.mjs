// The held-write hooks (@bananapus/nana-sdk-core/review/react) must load in
// an app with no wagmi, or a wagmi other than nana-sdk-react's: nothing they
// import, however indirectly, may name wagmi. Packs core, installs the tarball
// in a fixture outside the repository with React and viem but no wagmi, walks
// the packaged ESM and CJS graphs, then imports and requires the subpath.
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const fixture = mkdtempSync(join(tmpdir(), "review-react-"));
process.on("exit", () => rmSync(fixture, { recursive: true, force: true }));
const sh = (command, args, cwd) => {
  const run = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (run.status !== 0) throw new Error(run.stderr || run.stdout);
  return run.stdout;
};
const tarball = JSON.parse(
  sh("npm", ["pack", "--json", "--pack-destination", fixture], "packages/core"),
)[0].filename;
const installed = join(fixture, "node_modules/@bananapus/nana-sdk-core");
mkdirSync(installed, { recursive: true });
sh(
  "tar",
  ["-xzf", join(fixture, tarball), "-C", installed, "--strip-components=1"],
  fixture,
);
// The app's own React and viem, as an app on wagmi 3 (or none) has them.
const fromCore = createRequire(resolve("packages/core/package.json"));
for (const name of ["react", "viem"])
  symlinkSync(
    dirname(fromCore.resolve(`${name}/package.json`)),
    join(fixture, "node_modules", name),
  );
const dist = join(installed, "dist");
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

// Import and require it as the app would, from the fixture.
const load = `const esm = await import("@bananapus/nana-sdk-core/review/react");
const cjs = (await import("node:module")).createRequire(import.meta.url)("@bananapus/nana-sdk-core/review/react");
for (const name of ["useHeldWrite", "useHeldIntents", "useHeldWrites", "HeldWritesNotice", "useSavedAttempt", "useHeldSend", "useReviewedRun"])
  if (typeof esm[name] !== "function" || typeof cjs[name] !== "function") throw new Error("missing " + name);
try { (await import("node:module")).createRequire(import.meta.url).resolve("wagmi"); throw new Error("wagmi is installed"); }
catch (error) { if (error.code !== "MODULE_NOT_FOUND") throw error; }`;
const run = spawnSync(
  process.execPath,
  ["--input-type=module", "--eval", load],
  { cwd: fixture, encoding: "utf8" },
);
if (run.status !== 0) {
  failed = true;
  console.error(run.stderr || run.stdout);
} else
  console.log(
    `review/react imports and requires from the packed ${tarball}, with no wagmi installed`,
  );
if (failed) process.exit(1);
