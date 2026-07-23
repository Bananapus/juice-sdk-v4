import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repositoryUrl = "https://github.com/Bananapus/juice-sdk-v4";
const budgets = {
  "@bananapus/nana-sdk-core": {
    directory: "packages/core",
    packed: 750_000,
    unpacked: 16_800_000,
    entries: 350,
  },
  "@bananapus/nana-sdk-react": {
    directory: "packages/react",
    packed: 155_000,
    unpacked: 1_820_000,
    entries: 110,
  },
};

const failures = [];
for (const [workspace, budget] of Object.entries(budgets)) {
  const manifest = JSON.parse(
    readFileSync(join(process.cwd(), budget.directory, "package.json"), "utf8"),
  );
  if (
    manifest.repository?.type !== "git" ||
    manifest.repository?.url !== repositoryUrl ||
    manifest.repository?.directory !== budget.directory
  ) {
    failures.push(
      `${workspace} repository metadata must identify ${repositoryUrl}/${budget.directory}`,
    );
  }

  const result = spawnSync(
    "npm",
    ["pack", "--dry-run", "--json", "--ignore-scripts", "--workspace", workspace],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        npm_config_cache: join(tmpdir(), "juice-sdk-package-budget-cache"),
        npm_config_loglevel: "error",
      },
    },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `npm pack failed for ${workspace}`);
  }

  const [packed] = JSON.parse(result.stdout);
  const forbidden = packed.files
    .map(({ path }) => path)
    .filter((path) => /\.(?:test|spec)\.|tsbuildinfo$/.test(path));
  if (forbidden.length) {
    failures.push(`${workspace} publishes test/cache artifacts: ${forbidden.join(", ")}`);
  }
  if (packed.size > budget.packed) {
    failures.push(`${workspace} packed ${packed.size} B > ${budget.packed} B`);
  }
  if (packed.unpackedSize > budget.unpacked) {
    failures.push(`${workspace} unpacked ${packed.unpackedSize} B > ${budget.unpacked} B`);
  }
  if (packed.entryCount > budget.entries) {
    failures.push(`${workspace} files ${packed.entryCount} > ${budget.entries}`);
  }

  console.log(
    `${workspace}: ${packed.size} B packed, ${packed.unpackedSize} B unpacked, ` +
      `${packed.entryCount} files`,
  );
}

if (failures.length) {
  throw new Error(`Package budget exceeded:\n- ${failures.join("\n- ")}`);
}
