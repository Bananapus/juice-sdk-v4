import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const sdk = realpathSync(resolve(process.argv[2]));
const packScript = realpathSync(process.argv[1]);
const output = resolve(process.argv[3]);
const core = join(sdk, "packages/core");
if (
  JSON.parse(readFileSync(join(core, "package.json"), "utf8")).name !==
  "@bananapus/nana-sdk-core"
)
  throw new Error("Expected the Juice SDK core workspace");
// Rebuild from clean output so the provenance cannot describe stale compiled files.
rmSync(join(core, "dist"), { recursive: true, force: true });
for (const command of ["build:esm", "build:cjs"]) {
  execFileSync(
    "npm",
    ["run", command, "--workspace", "@bananapus/nana-sdk-core"],
    { cwd: sdk, stdio: "inherit" },
  );
}
const sha = (value) => createHash("sha256").update(value).digest("hex");
function collect(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? collect(path) : [path];
    });
}
const inputPaths = [
  ...collect(join(core, "src")),
  join(core, "package.json"),
  join(core, "tsconfig.json"),
  join(core, "tsconfig.cjs.json"),
  join(sdk, "package-lock.json"),
  ...(packScript.startsWith(sdk + "/") ? [packScript] : []),
];
const sourceFiles = inputPaths.map((path) => ({
  path: path.slice(sdk.length + 1),
  sha256: sha(readFileSync(path)),
}));
const sourceDigest = sha(JSON.stringify(sourceFiles));
const manifest = JSON.parse(readFileSync(join(core, "package.json"), "utf8"));
const [major, minor] = manifest.version.split(".").map(Number);
manifest.version = `${major}.${minor + 1}.0-preview.deployment.${sourceDigest.slice(0, 12)}`;
manifest.files = [...manifest.files, "snapshot-provenance.json"];
const stage = mkdtempSync(join(tmpdir(), "kmac-sdk-pack-"));
cpSync(join(core, "dist"), join(stage, "dist"), { recursive: true });
writeFileSync(
  join(stage, "package.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
const provenance = {
  package: manifest.name,
  version: manifest.version,
  sdkRepository: manifest.repository.url,
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: sdk,
    encoding: "utf8",
  }).trim(),
  sourceDigest,
  sourceFiles,
  reproduce:
    "node scripts/pack-deployment-preview.mjs <sdk-root> <output-directory>",
  buildCommands: [
    "npm run build:esm --workspace @bananapus/nana-sdk-core",
    "npm run build:cjs --workspace @bananapus/nana-sdk-core",
  ],
};
writeFileSync(
  join(stage, "snapshot-provenance.json"),
  JSON.stringify(provenance, null, 2) + "\n",
);
mkdirSync(output, { recursive: true });
const packs = JSON.parse(
  execFileSync(
    "npm",
    ["pack", "--ignore-scripts", "--json", "--pack-destination", output],
    { cwd: stage, encoding: "utf8" },
  ),
);
const pack = Array.isArray(packs) ? packs[0] : packs[manifest.name];
if (!pack?.filename || !pack?.integrity)
  throw new Error("npm pack did not return artifact metadata.");
const artifact = join(output, basename(pack.filename));
const artifactInfo = {
  ...provenance,
  artifact: basename(artifact),
  sha256: sha(readFileSync(artifact)),
  integrity: pack.integrity,
};
writeFileSync(
  join(output, "sdk-snapshot.json"),
  JSON.stringify(artifactInfo, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      artifact,
      version: manifest.version,
      sourceDigest,
      sha256: artifactInfo.sha256,
      integrity: pack.integrity,
    },
    null,
    2,
  ),
);
