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
    // service's signal and 429 rules, the reviewed account before review,
    // Relayr's checksum, quote expiry, retry refusals, bundle read and unpaid
    // guard, the JB Center provider's signal and the shared Retry-After
    // reader) add no files and, mostly in documentation, about 45 kilobytes
    // unpacked and 10 kilobytes packed (measured 1,177,461 B packed,
    // 20,281,267 B unpacked, 722 files).
    // The Safe execution wait's not-found rule (only viem's not-found counts
    // toward giving up) and its signal (an abort ends a chain look in flight)
    // add no files and, mostly in documentation, about 9.5 kilobytes unpacked
    // and 2.5 kilobytes packed (measured 1,180,514 B packed, 20,293,611 B
    // unpacked, 722 files).
    // JB Center's node-lag retry, the shared abortable wait and the JB Center
    // rate-limit module (the limiter, its guard against a request asking it
    // for another, and the refusal readers the web clients copied) add two
    // source modules, sixteen artifacts, about 47 kilobytes unpacked and 8
    // kilobytes packed over the Safe wait fix (measured 1,189,051 B packed,
    // 20,342,557 B unpacked, 738 files).
    // The Relayr session rules Juicebox Money built (rulings R104, R114 and
    // R117: requests classified at a canonical finalized block, their
    // verdict, what the session does next, the forwarder-nonce reservation and
    // the signed-request reader) add no files and about 52 kilobytes unpacked
    // and 14 kilobytes packed, about half of it documentation repeated in the
    // ESM and CJS JavaScript and declarations (measured 1,203,010 B packed,
    // 20,395,254 B unpacked, 738 files).
    // The session rules' review fixes and ruling R118's recheck rule (a node
    // that could not answer reads as unchecked; revert data on any JSON-RPC
    // code reads as changed) add no files and about 8 kilobytes unpacked and
    // 3 kilobytes packed, mostly documentation (measured 1,205,816 B packed,
    // 20,403,617 B unpacked, 738 files).
    // Ruling R104's quote-release and payment-attempt rules (the sent-payment
    // journal, the option a quote is paid again with, a failed attempt's
    // outcome, the paid quote's clock, the quoted options and a reverted
    // quote's release) add no files and 46,326 bytes unpacked and 17,123 bytes
    // packed, about a third of it documentation, repeated in the ESM and CJS
    // JavaScript and declarations (measured 1,222,939 B packed, 20,449,943 B
    // unpacked, 738 files).
    // The retry rule over a quote's sent payments (grouped by the option each
    // used) and the saved payment's proof on resume add no files and 14,148
    // bytes unpacked and 2,187 bytes packed (measured 1,225,126 B packed,
    // 20,464,091 B unpacked, 738 files).
    // Their review's guards (a saved deadline bound to its calldata's, a
    // release holding another bundle's payment or an unreadable time, the
    // clock read after the bundle, and a retry list read as a journal) add no
    // files and 4,870 bytes unpacked and 911 bytes packed (measured 1,226,037 B
    // packed, 20,468,961 B unpacked, 738 files).
    // The shared Safe Relayr lifecycle replaces both clients' preparation,
    // funding and recovery rules. Its one source module adds eight compiled
    // artifacts: measured 1,244,411 B packed, 20,606,456 B unpacked, 746 files.
    // Retain the existing narrow rounding margin and all other package limits.
    // Finalized nonce recovery and structured recovery results add no files:
    // measured 1,251,517 B packed and 20,628,836 B unpacked (746 files).
    // Safe-only unused quote replacement and sticky funding evidence add no
    // files: measured 1,259,012 B packed and 20,645,481 B unpacked (746 files).
    packed: 1_260_000,
    unpacked: 20_646_000,
    entries: 746,
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
