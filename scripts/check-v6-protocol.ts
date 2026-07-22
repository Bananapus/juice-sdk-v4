import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as bindingsModule from "../packages/core/src/generated/juicebox.js";

type AbiParameter = {
  components?: AbiParameter[];
  indexed?: boolean;
  name?: string;
  type?: string;
};

type AbiItem = {
  anonymous?: boolean;
  inputs?: AbiParameter[];
  name?: string;
  outputs?: AbiParameter[];
  stateMutability?: string;
  type?: string;
};

type Deployment = {
  address?: string;
  abi?: AbiItem[];
};

type PairDeployment = { artifact: string; address: string };
type PairFixture = {
  local: string;
  remote: string;
  ccip: PairDeployment;
  native: PairDeployment | null;
};

type ContractFixture = { address: string; abiSha256: string };
type ProtocolFixture = {
  format: string;
  source: { commit: string; repository: string };
  chains: Record<string, string>;
  contracts: Record<string, ContractFixture>;
  overrides: Record<string, Record<string, string | null>>;
  suckerDeployerPairs: PairFixture[];
};

const fixturePath = resolve("test/fixtures/protocol-deployments.v6.json");
const fixture = JSON.parse(
  readFileSync(fixturePath, "utf8"),
) as ProtocolFixture;
const bindings = bindingsModule as unknown as Record<string, unknown>;
const addressPattern = /^0x[0-9a-fA-F]{40}$/;
const digestPattern = /^[0-9a-f]{64}$/;

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function sorted(values: Iterable<string>) {
  return [...values].sort((a, b) =>
    a.localeCompare(b, "en", { numeric: true }),
  );
}

function assertExactKeys(
  actual: Iterable<string>,
  expected: Iterable<string>,
  label: string,
) {
  const actualKeys = sorted(actual);
  const expectedKeys = sorted(expected);
  invariant(
    JSON.stringify(actualKeys) === JSON.stringify(expectedKeys),
    `${label}: expected keys ${expectedKeys.join(", ")}; got ${actualKeys.join(", ")}`,
  );
}

function normalizeAddress(value: unknown) {
  return typeof value === "string" && addressPattern.test(value)
    ? value.toLowerCase()
    : null;
}

function normalizeParameter(parameter: AbiParameter) {
  return {
    name: parameter.name ?? "",
    type: parameter.type ?? "",
    ...(parameter.indexed === undefined ? {} : { indexed: parameter.indexed }),
    components: (parameter.components ?? []).map(normalizeParameter),
  };
}

/**
 * Normalize the externally callable ABI surface while discarding artifact-only
 * noise and declaration order. Duplicate declarations do not change the public
 * interface, so the digest is over a sorted set.
 *
 * Generation intentionally removes JBTerminalStore's legacy four-argument
 * currentReclaimableSurplusOf overload. Apply that one reviewed exception to
 * the contract artifact before comparison; every other function, event, and
 * error must match exactly.
 */
function normalizeAbi(
  abi: AbiItem[],
  contractName: string,
  source: "artifact" | "generated",
) {
  const items = abi
    .filter((item) => ["error", "event", "function"].includes(item.type ?? ""))
    .filter(
      (item) =>
        !(
          contractName === "JBTerminalStore" &&
          source === "artifact" &&
          item.type === "function" &&
          item.name === "currentReclaimableSurplusOf" &&
          item.inputs?.length === 4
        ),
    )
    .map((item) => ({
      type: item.type ?? "",
      name: item.name ?? "",
      ...(item.stateMutability === undefined
        ? {}
        : { stateMutability: item.stateMutability }),
      ...(item.anonymous === undefined ? {} : { anonymous: item.anonymous }),
      inputs: (item.inputs ?? []).map(normalizeParameter),
      outputs: (item.outputs ?? []).map(normalizeParameter),
    }))
    .map((item) => JSON.stringify(item));

  return sorted(new Set(items));
}

function abiDigest(
  abi: AbiItem[],
  contractName: string,
  source: "artifact" | "generated",
) {
  return createHash("sha256")
    .update(JSON.stringify(normalizeAbi(abi, contractName, source)))
    .digest("hex");
}

function abiExportName(contractName: string) {
  if (contractName.startsWith("JB")) return `jb${contractName.slice(2)}Abi`;
  if (contractName.startsWith("REV")) return `rev${contractName.slice(3)}Abi`;
  if (contractName.startsWith("ERC")) return `erc${contractName.slice(3)}Abi`;
  throw new Error(`No generated ABI naming rule for ${contractName}`);
}

function readDeployment(path: string) {
  invariant(existsSync(path), `Missing deployment artifact ${path}`);
  return JSON.parse(readFileSync(path, "utf8")) as Deployment;
}

function checkedDeploymentsRoot() {
  const configured = process.env.PROTOCOL_DEPLOYMENTS_DIR;
  invariant(
    configured,
    "Set PROTOCOL_DEPLOYMENTS_DIR to the pinned deploy-all-v6 checkout.",
  );
  const root = resolve(configured);
  const commit = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  invariant(
    commit === fixture.source.commit,
    `deploy-all-v6 is at ${commit}; fixture requires ${fixture.source.commit}`,
  );
  return root;
}

invariant(
  fixture.format === "juice-sdk-v6-deployments-1",
  `Unsupported protocol fixture format in ${fixturePath}`,
);
invariant(
  fixture.source.commit === "316e9d4d3f9e1c5b41a5df7c0ad6183abbeccc7f",
  "The protocol source commit changed without a reviewed parity-gate update.",
);
invariant(
  fixture.source.repository === "Bananapus/deploy-all-v6",
  `Unexpected protocol source repository ${fixture.source.repository}`,
);

const sdkAddressBook = bindings.jbContractAddress as {
  "6": Record<string, Record<string, string>>;
};
const sdkCcipAddressBook = bindings.jbCcipSuckerDeployerAddress as {
  "6": Record<string, Record<string, string>>;
};
const sdkNativeAddressBook = bindings.jbNativeSuckerDeployerAddress as {
  "6": Record<string, Record<string, string>>;
};
const chainIds = Object.keys(fixture.chains);
const contractNames = Object.keys(fixture.contracts);

assertExactKeys(
  Object.keys(sdkAddressBook["6"]),
  contractNames,
  "v6 contracts",
);
invariant(
  contractNames.length === 30,
  `Expected 30 v6 contracts; got ${contractNames.length}`,
);
invariant(
  chainIds.length === 8,
  `Expected 8 v6 chains; got ${chainIds.length}`,
);

if (process.argv.includes("--print-abi-digests")) {
  const root = checkedDeploymentsRoot();
  const firstAlias = fixture.chains[chainIds[0]];
  const digests = Object.fromEntries(
    contractNames.map((contractName) => {
      const artifact = readDeployment(
        join(root, "deployments", firstAlias, `${contractName}.json`),
      );
      invariant(Array.isArray(artifact.abi), `${contractName} has no ABI`);
      return [contractName, abiDigest(artifact.abi, contractName, "artifact")];
    }),
  );
  process.stdout.write(`${JSON.stringify(digests, null, 2)}\n`);
  process.exit(0);
}

let addressSlots = 0;
let explicitAbsences = 0;
let generatedAbiCount = 0;
for (const [contractName, expectedContract] of Object.entries(
  fixture.contracts,
)) {
  invariant(
    addressPattern.test(expectedContract.address),
    `Invalid fixture address for ${contractName}: ${expectedContract.address}`,
  );
  invariant(
    digestPattern.test(expectedContract.abiSha256),
    `Invalid fixture ABI digest for ${contractName}: ${expectedContract.abiSha256}`,
  );

  const expectedChainKeys = chainIds.filter((chainId) => {
    const override = fixture.overrides[chainId];
    return !(
      Object.hasOwn(override ?? {}, contractName) &&
      override[contractName] === null
    );
  });
  assertExactKeys(
    Object.keys(sdkAddressBook["6"][contractName] ?? {}),
    expectedChainKeys,
    `${contractName} chain deployments`,
  );

  for (const chainId of chainIds) {
    const override = fixture.overrides[chainId];
    const expected = Object.hasOwn(override ?? {}, contractName)
      ? override[contractName]
      : expectedContract.address;
    const actual = normalizeAddress(
      sdkAddressBook["6"][contractName]?.[chainId],
    );
    invariant(
      actual === (expected === null ? null : expected.toLowerCase()),
      `${contractName} on chain ${chainId}: fixture=${expected}, SDK=${actual}`,
    );
    if (expected === null) explicitAbsences += 1;
    addressSlots += 1;
  }

  const exportName = abiExportName(contractName);
  const abi = bindings[exportName];
  invariant(
    Array.isArray(abi),
    `Missing generated public ABI export ${exportName}`,
  );
  const actualDigest = abiDigest(abi as AbiItem[], contractName, "generated");
  invariant(
    actualDigest === expectedContract.abiSha256,
    `${exportName} does not match the pinned ${contractName} artifact ABI: fixture=${expectedContract.abiSha256}, SDK=${actualDigest}`,
  );
  generatedAbiCount += 1;
}

for (const [chainId, overrides] of Object.entries(fixture.overrides)) {
  invariant(
    Object.hasOwn(fixture.chains, chainId),
    `Override uses unknown chain ${chainId}`,
  );
  for (const [contractName, value] of Object.entries(overrides)) {
    invariant(
      Object.hasOwn(fixture.contracts, contractName),
      `Override uses unknown contract ${contractName}`,
    );
    invariant(
      value === null || addressPattern.test(value),
      `Invalid override for ${contractName} on ${chainId}`,
    );
  }
}
invariant(
  explicitAbsences === 2,
  `Expected 2 explicit deployment absences; got ${explicitAbsences}`,
);

const chainFamilies = [
  ["1", "10", "8453", "42161"],
  ["11155111", "11155420", "84532", "421614"],
];
const expectedPairKeys = new Set<string>();
for (const family of chainFamilies) {
  for (const local of family) {
    for (const remote of family) {
      if (local !== remote) expectedPairKeys.add(`${local}->${remote}`);
    }
  }
}

const pairKeys = new Set<string>();
const expectedCcip: Record<string, Record<string, string>> = {};
const expectedNative: Record<string, Record<string, string>> = {};
let suckerArtifactCount = 0;
let nativeAbsences = 0;
for (const pair of fixture.suckerDeployerPairs) {
  const key = `${pair.local}->${pair.remote}`;
  invariant(!pairKeys.has(key), `Duplicate sucker-deployer pair ${key}`);
  pairKeys.add(key);
  invariant(
    expectedPairKeys.has(key),
    `Unexpected sucker-deployer pair ${key}`,
  );
  invariant(
    pair.ccip && typeof pair.ccip === "object",
    `Missing CCIP deployer for ${key}`,
  );
  invariant(
    Object.hasOwn(pair, "native"),
    `Native availability is not explicit for ${key}`,
  );

  expectedCcip[pair.local] ??= {};
  expectedNative[pair.local] ??= {};
  for (const [kind, deployment] of [
    ["ccip", pair.ccip],
    ["native", pair.native],
  ] as const) {
    if (deployment === null) {
      invariant(kind === "native", `CCIP deployer cannot be absent for ${key}`);
      nativeAbsences += 1;
      continue;
    }
    invariant(
      /^[A-Za-z0-9_]+$/.test(deployment.artifact) &&
        addressPattern.test(deployment.address),
      `Invalid ${kind} sucker deployer for ${key}`,
    );
    (kind === "ccip" ? expectedCcip : expectedNative)[pair.local][pair.remote] =
      deployment.address.toLowerCase();
    suckerArtifactCount += 1;
  }
}

assertExactKeys(
  pairKeys,
  expectedPairKeys,
  "directional sucker-deployer pairs",
);
invariant(
  pairKeys.size === 24,
  `Expected 24 directional sucker pairs; got ${pairKeys.size}`,
);
invariant(
  suckerArtifactCount === 36,
  `Expected 36 directional sucker artifacts; got ${suckerArtifactCount}`,
);
invariant(
  nativeAbsences === 12,
  `Expected 12 explicit native absences; got ${nativeAbsences}`,
);

function normalizedAddressBook(book: Record<string, Record<string, string>>) {
  return Object.fromEntries(
    sorted(Object.keys(book)).map((local) => [
      local,
      Object.fromEntries(
        sorted(Object.keys(book[local])).map((remote) => [
          remote,
          normalizeAddress(book[local][remote]),
        ]),
      ),
    ]),
  );
}

invariant(
  JSON.stringify(normalizedAddressBook(sdkCcipAddressBook["6"])) ===
    JSON.stringify(normalizedAddressBook(expectedCcip)),
  "The v6 CCIP sucker-deployer address book does not match the pinned directional fixture.",
);
invariant(
  JSON.stringify(normalizedAddressBook(sdkNativeAddressBook["6"])) ===
    JSON.stringify(normalizedAddressBook(expectedNative)),
  "The v6 native sucker-deployer address book does not match the pinned directional fixture.",
);

const deploymentsRoot = process.env.PROTOCOL_DEPLOYMENTS_DIR;
if (!deploymentsRoot) {
  process.stdout.write(
    `Verified ${addressSlots} SDK contract address slots (${explicitAbsences} explicit absences), ${generatedAbiCount} generated ABI surfaces, and ${suckerArtifactCount} directional sucker artifacts against deploy-all-v6 ${fixture.source.commit}.\n`,
  );
  process.stdout.write(
    "Set PROTOCOL_DEPLOYMENTS_DIR to the exact deploy-all-v6 checkout to verify the fixture against its source artifacts.\n",
  );
  process.exit(0);
}

const root = checkedDeploymentsRoot();
let contractArtifacts = 0;
let artifactAbiChecks = 0;
for (const [chainId, alias] of Object.entries(fixture.chains)) {
  for (const [contractName, expectedContract] of Object.entries(
    fixture.contracts,
  )) {
    const override = fixture.overrides[chainId];
    const expected = Object.hasOwn(override ?? {}, contractName)
      ? override[contractName]
      : expectedContract.address;
    const artifactPath = join(
      root,
      "deployments",
      alias,
      `${contractName}.json`,
    );
    if (expected === null) {
      invariant(
        !existsSync(artifactPath),
        `${contractName} on ${chainId} is explicitly absent but ${artifactPath} exists`,
      );
      continue;
    }

    const artifact = readDeployment(artifactPath);
    invariant(
      normalizeAddress(artifact.address) === expected.toLowerCase(),
      `${contractName} on ${chainId}: fixture=${expected}, artifact=${artifact.address}`,
    );
    invariant(
      Array.isArray(artifact.abi),
      `${contractName} on ${chainId} has no ABI`,
    );
    invariant(
      abiDigest(artifact.abi, contractName, "artifact") ===
        expectedContract.abiSha256,
      `${contractName} ABI on ${chainId} differs from its pinned public surface`,
    );
    contractArtifacts += 1;
    artifactAbiChecks += 1;
  }
}

let suckerArtifacts = 0;
for (const pair of fixture.suckerDeployerPairs) {
  const alias = fixture.chains[pair.local];
  for (const [kind, deployment] of [
    ["ccip", pair.ccip],
    ["native", pair.native],
  ] as const) {
    if (deployment === null) continue;
    const artifactPath = join(
      root,
      "deployments",
      alias,
      `${deployment.artifact}.json`,
    );
    const artifact = readDeployment(artifactPath);
    invariant(
      normalizeAddress(artifact.address) === deployment.address.toLowerCase(),
      `${kind} sucker deployer ${pair.local}->${pair.remote} (${deployment.artifact}): fixture=${deployment.address}, artifact=${artifact.address}`,
    );
    suckerArtifacts += 1;
  }
}

invariant(
  contractArtifacts === 238,
  `Expected 238 deployed contract artifacts; got ${contractArtifacts}`,
);
invariant(
  artifactAbiChecks === 238,
  `Expected 238 artifact ABI checks; got ${artifactAbiChecks}`,
);
invariant(
  suckerArtifacts === 36,
  `Expected 36 sucker artifact checks; got ${suckerArtifacts}`,
);
process.stdout.write(
  `Verified 240 contract deployment slots (238 artifacts, 2 absences), 30 generated ABI surfaces against 238 chain artifacts, and 36 directional sucker artifacts at deploy-all-v6 ${fixture.source.commit}.\n`,
);
