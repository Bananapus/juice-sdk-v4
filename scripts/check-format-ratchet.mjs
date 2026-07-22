import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const prettierCli = require.resolve("prettier/bin/prettier.cjs");
const fixture = JSON.parse(
  readFileSync(new URL("../test/format-debt.json", import.meta.url), "utf8"),
);
const baselines = fixture.baselines ?? {};

const result = spawnSync(
  process.execPath,
  [prettierCli, "--list-different", "**/*.{ts,tsx,md}"],
  {
    cwd: process.cwd(),
    encoding: "utf8",
  },
);

if (![0, 1].includes(result.status)) {
  process.stderr.write(result.stderr);
  throw new Error(`Prettier failed with exit code ${result.status}.`);
}

const actual = new Set(
  result.stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean),
);
const expected = new Set(Object.keys(baselines));
const unexpected = [...actual].filter((file) => !expected.has(file)).sort();
const resolved = [...expected].filter((file) => !actual.has(file)).sort();
const changed = [...actual]
  .filter((file) => {
    const digest = createHash("sha256")
      .update(readFileSync(file))
      .digest("hex");
    return baselines[file] !== digest;
  })
  .sort();

if (unexpected.length || resolved.length || changed.length) {
  if (unexpected.length) {
    console.error(
      "New unformatted files (format them before merging):\n" +
        unexpected.map((file) => `  - ${file}`).join("\n"),
    );
  }
  if (changed.length) {
    console.error(
      "Reviewed debt files changed while still unformatted:\n" +
        changed.map((file) => `  - ${file}`).join("\n"),
    );
  }
  if (resolved.length) {
    console.error(
      "Formatting debt was resolved; remove these stale baselines:\n" +
        resolved.map((file) => `  - ${file}`).join("\n"),
    );
  }
  process.exit(1);
}

console.log(
  `Prettier ratchet verified: ${expected.size} frozen debt files and no new formatting debt.`,
);
