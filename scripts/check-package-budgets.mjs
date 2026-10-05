import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repositoryUrl = "https://github.com/Bananapus/juice-sdk-v4";
const budgets = {
  "@bananapus/nana-sdk-core": {
    directory: "packages/core",
    // Includes the public Bendystraw transport, supported-chain definitions,
    // direct-pay routing, Permit2 helpers, the viem error discriminators, the
    // price-feed reachability probe, the Uniswap V4 LP-split-hook ABIs, and
    // tree-shakable loan/deployment and JB Center entry points in both ESM and
    // CJS formats, plus the router gateway, ratio feed, and preserved router/
    // buyback ABI generations required by projects that have not migrated.
    // The /safe entry point adds eight ESM/CJS JS/declaration/map artifacts.
    // The JB Center intent decoder, merger, and deploy pre-step add
    // twenty-four more, and its guarded publish and refusal wording sixteen.
    // The intent setup-call grouping adds eight more, and the pinned Safe
    // proxy creation code adds about two kilobytes to four of them. The five
    // Sticky ABIs and addresses raise the unpacked budget, and the Sticky
    // split helpers add two entries and about ten kilobytes. Sticky's ERC-2771
    // trusted-forwarder views add about four kilobytes unpacked. The shared
    // web-client runtime (/review, the Safe service helpers,
    // /bendystraw-operations and /v6/fee-buyback) adds seven source files,
    // fifty-six artifacts and about two hundred kilobytes unpacked. The review
    // decoders on their own /review/decode entry point, the receipt fallback
    // and the raw preflight add three source files, twenty-four artifacts,
    // about 237 kilobytes unpacked and 48 kilobytes packed. The Relayr quote
    // binding, payment checks and payment and destination proofs on their own
    // /review/relayr entry point add one source file, eight artifacts, about
    // 179 kilobytes unpacked and 31 kilobytes packed. The decoder's eleven
    // generated ABIs, each in a module of its own so a page loads only the
    // ABIs it uses, add eleven source files, eighty-eight artifacts, about 36
    // kilobytes unpacked and 22 kilobytes packed. The Safe authority, queue
    // and execution checks on /safe and /safe-service, the distribution
    // verifiers on /v6 and the shared untrusted-input readers add two source
    // files, sixteen artifacts, about 377 kilobytes unpacked and 72 kilobytes
    // packed (measured 1,139,349 B packed, 20,075,303 B unpacked, 682 files).
    // Loading the decoder and the distribution checks without running
    // anything splits two modules into sixteen more artifacts, and the
    // creation proof with the pinned 1.3.0 proxy creation code, the contract
    // signature encoding and the refund and row checks add about 48 kilobytes
    // unpacked and 14 kilobytes packed (measured 1,153,389 B packed,
    // 20,123,016 B unpacked, 698 files).
    // Deployment diagnostics, shop preparation and overload selection add
    // three source modules and 24 ESM/CJS artifacts.
    // The checks the web clients wrapped (MultiSendCallOnly 1.4.1, the Safe
    // service's signal and capped 429 waits, the reviewed account before
    // review, Relayr's checksum, quote expiry, retry refusals and bundle read,
    // and the JB Center provider's signal) add no files and, mostly in
    // documentation, about 31 kilobytes unpacked and 7 kilobytes packed
    // (measured 1,174,958 B packed, 20,267,689 B unpacked, 722 files).
    packed: 1_182_000,
    unpacked: 20_292_000,
    entries: 722,
  },
  "@bananapus/nana-sdk-react": {
    directory: "packages/react",
    packed: 155_000,
    unpacked: 1_820_000,
    entries: 110,
  },
  "@bananapus/nana-sdk-connect": {
    directory: "packages/connect",
    packed: 60_000,
    unpacked: 400_000,
    entries: 40,
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
    [
      "pack",
      "--dry-run",
      "--json",
      "--ignore-scripts",
      "--workspace",
      workspace,
    ],
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
    throw new Error(
      result.stderr || result.stdout || `npm pack failed for ${workspace}`,
    );
  }

  const packs = JSON.parse(result.stdout);
  const packed = Array.isArray(packs) ? packs[0] : packs[workspace];
  if (!packed?.files)
    throw new Error(`npm pack returned no metadata for ${workspace}`);
  const forbidden = packed.files
    .map(({ path }) => path)
    .filter((path) => /\.(?:test|spec)\.|tsbuildinfo$/.test(path));
  if (forbidden.length) {
    failures.push(
      `${workspace} publishes test/cache artifacts: ${forbidden.join(", ")}`,
    );
  }
  if (packed.size > budget.packed) {
    failures.push(`${workspace} packed ${packed.size} B > ${budget.packed} B`);
  }
  if (packed.unpackedSize > budget.unpacked) {
    failures.push(
      `${workspace} unpacked ${packed.unpackedSize} B > ${budget.unpacked} B`,
    );
  }
  if (packed.entryCount > budget.entries) {
    failures.push(
      `${workspace} files ${packed.entryCount} > ${budget.entries}`,
    );
  }

  console.log(
    `${workspace}: ${packed.size} B packed, ${packed.unpackedSize} B unpacked, ` +
      `${packed.entryCount} files`,
  );
}

if (failures.length) {
  throw new Error(`Package budget exceeded:\n- ${failures.join("\n- ")}`);
}
