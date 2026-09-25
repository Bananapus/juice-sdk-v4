import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { validateRolloutDeployment } from "../packages/core/scripts/validateRolloutDeployment.js";
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
type HistoryFixture = {
  abiSha256: string;
  deployments: Record<string, { address: string; artifact: string }>;
};
type ProtocolFixture = {
  format: string;
  source: { commit: string; repository: string };
  extensions: Record<string, { commit: string; contracts: string[] }>;
  chains: Record<string, string>;
  contracts: Record<string, ContractFixture>;
  overrides: Record<string, Record<string, string | null>>;
  suckerDeployerPairs: PairFixture[];
  abiOverrides: Record<string, Record<string, string>>;
  history: Record<string, Record<string, HistoryFixture>>;
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
 * Generation carries every artifact declaration through verbatim: there are no
 * per-contract exceptions, so every function, event, and error must match
 * exactly.
 */
function normalizeAbi(abi: AbiItem[]) {
  const items = abi
    .filter((item) => ["error", "event", "function"].includes(item.type ?? ""))
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

function abiDigest(abi: AbiItem[]) {
  return createHash("sha256")
    .update(JSON.stringify(normalizeAbi(abi)))
    .digest("hex");
}

/**
 * Contracts whose generated export name is not the plain prefix-lowercased
 * slice: wagmi camelizes runs of capitals (`LPSplit` -> `LpSplit`, `JBP6` ->
 * `jbp6`), which the slice rule below cannot express.
 */
const ABI_EXPORT_NAMES: Record<string, string> = {
  JBP6FeeLPSplitHook: "jbp6FeeLpSplitHookAbi",
  JBUniswapV4LPSplitHook: "jbUniswapV4LpSplitHookAbi",
  JBUniswapV4LPSplitHookDeployer: "jbUniswapV4LpSplitHookDeployerAbi",
};

/**
 * Contracts that deploy-all-v6 does not carry are pinned to their own
 * repository's commit, read from the checkout its variable names.
 */
const EXTENSION_DEPLOYMENTS_ENV: Record<string, string> = {
  "mejango/sticky": "STICKY_DEPLOYMENTS_DIR",
};

function abiExportName(contractName: string) {
  const override = ABI_EXPORT_NAMES[contractName];
  if (override) return override;
  if (contractName.startsWith("JB")) return `jb${contractName.slice(2)}Abi`;
  if (contractName.startsWith("REV")) return `rev${contractName.slice(3)}Abi`;
  if (contractName.startsWith("ERC")) return `erc${contractName.slice(3)}Abi`;
  if (contractName.startsWith("Sticky"))
    return `sticky${contractName.slice(6)}Abi`;
  throw new Error(`No generated ABI naming rule for ${contractName}`);
}

function readDeployment(path: string) {
  invariant(existsSync(path), `Missing deployment artifact ${path}`);
  const deployment = JSON.parse(readFileSync(path, "utf8")) as Deployment;
  validateRolloutDeployment(
    deployment,
    basename(dirname(path)),
    basename(path, ".json"),
    path,
  );
  return deployment;
}

function headOf(root: string) {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
}

function extensionOf(contractName: string) {
  return Object.entries(fixture.extensions).find(([, extension]) =>
    extension.contracts.includes(contractName),
  )?.[0];
}

function extensionRoot(repository: string) {
  const variable = EXTENSION_DEPLOYMENTS_ENV[repository];
  invariant(variable, `No deployments variable for ${repository}`);
  const configured = process.env[variable];
  invariant(configured, `Set ${variable} to the ${repository} checkout.`);
  return resolve(configured);
}

/** The pinned checkout holding `contractName`'s artifacts: deploy-all-v6, or its own repository. */
function checkedDeploymentsRoot(contractName?: string) {
  const repository = contractName && extensionOf(contractName);
  if (repository) {
    const root = extensionRoot(repository);
    const commit = headOf(root);
    const expected = fixture.extensions[repository].commit;
    invariant(
      commit === expected,
      `${repository} is at ${commit}; fixture requires ${expected}`,
    );
    return root;
  }
  const configured = process.env.PROTOCOL_DEPLOYMENTS_DIR;
  invariant(
    configured,
    "Set PROTOCOL_DEPLOYMENTS_DIR to the pinned deploy-all-v6 checkout.",
  );
  const root = resolve(configured);
  const commit = headOf(root);
  invariant(
    commit === fixture.source.commit,
    `deploy-all-v6 is at ${commit}; fixture requires ${fixture.source.commit}`,
  );
  return root;
}

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

// Explicit refresh reads only executed deployment artifacts. Proposal files are
// never inputs. Review the resulting fixture and matching CI source pin together.
if (process.argv.includes("--update-fixture")) {
  invariant(
    process.env.PROTOCOL_DEPLOYMENTS_DIR,
    "Set PROTOCOL_DEPLOYMENTS_DIR to the executed deploy-all-v6 checkout.",
  );
  const root = resolve(process.env.PROTOCOL_DEPLOYMENTS_DIR);
  fixture.source.commit = headOf(root);
  for (const [repository, extension] of Object.entries(fixture.extensions))
    extension.commit = headOf(extensionRoot(repository));
  fixture.format = "juice-sdk-v6-deployments-2";
  fixture.contracts = {};
  fixture.overrides = {};
  fixture.abiOverrides = {};
  fixture.history = {};
  for (const name of Object.keys(sdkAddressBook["6"])) {
    const repository = extensionOf(name);
    const source = repository ? extensionRoot(repository) : root;
    const artifacts = Object.fromEntries(
      Object.entries(fixture.chains).flatMap(([chainId, alias]) => {
        const path = join(source, "deployments", alias, `${name}.json`);
        return existsSync(path) ? [[chainId, readDeployment(path)]] : [];
      }),
    );
    const first = Object.values(artifacts)[0];
    const canonical = artifacts["11155111"] ?? first;
    invariant(first?.address && canonical?.abi, `Missing ${name} deployment`);
    const canonicalDigest = abiDigest(canonical.abi);
    fixture.contracts[name] = {
      address: first.address.toLowerCase(),
      abiSha256: canonicalDigest,
    };
    for (const chainId of chainIds) {
      const artifact = artifacts[chainId];
      const address = artifact?.address?.toLowerCase() ?? null;
      if (address !== fixture.contracts[name].address) {
        (fixture.overrides[chainId] ??= {})[name] = address;
      }
      if (artifact?.abi && abiDigest(artifact.abi) !== canonicalDigest) {
        (fixture.abiOverrides[chainId] ??= {})[name] = abiDigest(artifact.abi);
      }
    }
  }
  for (const name of ["JBBuybackHook", "JBRouterTerminal"]) {
    fixture.history[name] = {};
    for (const [generation, suffix] of [
      ["previous", "_deprecated1"],
      ["v1", "_deprecated"],
    ]) {
      const records = Object.fromEntries(
        Object.entries(fixture.chains).flatMap(([chainId, alias]) => {
          const artifact = `${name}${suffix}`;
          const path = join(root, "deployments", alias, `${artifact}.json`);
          return existsSync(path)
            ? [[chainId, { artifact, deployment: readDeployment(path) }]]
            : [];
        }),
      );
      const reference = Object.values(records)[0]?.deployment;
      invariant(
        reference?.abi && reference.address,
        `Missing ${name} ${generation}`,
      );
      const digest = abiDigest(reference.abi);
      const deployments: HistoryFixture["deployments"] = {};
      for (const [chainId, alias] of Object.entries(fixture.chains)) {
        let record = records[chainId];
        if (!record && generation === "previous") {
          const path = join(root, "deployments", alias, `${name}.json`);
          if (existsSync(path)) {
            const candidate = readDeployment(path);
            if (
              candidate.address?.toLowerCase() ===
                reference.address.toLowerCase() &&
              candidate.abi &&
              abiDigest(candidate.abi) === digest
            ) {
              record = { artifact: name, deployment: candidate };
            }
          }
        }
        if (record?.deployment.address)
          deployments[chainId] = {
            artifact: record.artifact,
            address: record.deployment.address.toLowerCase(),
          };
      }
      fixture.history[name][generation] = { abiSha256: digest, deployments };
    }
  }
  writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`);
  process.stdout.write(
    `Updated executed deployment fixture from ${fixture.source.commit}. Review the CI source pin before committing.\n`,
  );
  process.exit(0);
}

invariant(
  fixture.format === "juice-sdk-v6-deployments-2",
  `Unsupported protocol fixture format in ${fixturePath}`,
);
invariant(
  /^[0-9a-f]{40}$/.test(fixture.source.commit),
  "Pin a full reviewed deployment source commit.",
);
invariant(
  fixture.source.repository === "Bananapus/deploy-all-v6",
  `Unexpected protocol source repository ${fixture.source.repository}`,
);

assertExactKeys(
  Object.keys(sdkAddressBook["6"]),
  contractNames,
  "v6 contracts",
);
invariant(
  contractNames.length === 40,
  `Expected 40 v6 contracts; got ${contractNames.length}`,
);
for (const [repository, extension] of Object.entries(fixture.extensions)) {
  invariant(
    Object.hasOwn(EXTENSION_DEPLOYMENTS_ENV, repository),
    `Unexpected extension source repository ${repository}`,
  );
  invariant(
    /^[0-9a-f]{40}$/.test(extension.commit),
    `Pin a full reviewed ${repository} commit.`,
  );
  for (const name of extension.contracts)
    invariant(
      Object.hasOwn(fixture.contracts, name),
      `${repository} lists unknown contract ${name}`,
    );
}
invariant(
  chainIds.length === 8,
  `Expected 8 v6 chains; got ${chainIds.length}`,
);

if (process.argv.includes("--print-abi-digests")) {
  const aliases = [
    fixture.chains["11155111"],
    ...Object.values(fixture.chains),
  ];
  const digests = Object.fromEntries(
    contractNames.map((contractName) => {
      const root = checkedDeploymentsRoot(contractName);
      const artifact = readDeployment(
        aliases
          .map((alias) =>
            join(root, "deployments", alias, `${contractName}.json`),
          )
          .find(existsSync)!,
      );
      invariant(Array.isArray(artifact.abi), `${contractName} has no ABI`);
      return [contractName, abiDigest(artifact.abi)];
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
  const actualDigest = abiDigest(abi as AbiItem[]);
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

const sdkHistory = bindings.jbContractAddressHistory as {
  "6": Record<string, Record<string, Record<string, string>>>;
};
const sdkGenerations = bindings.jbContractAbiGeneration as {
  "6": Record<string, Record<string, string>>;
};
assertExactKeys(
  Object.keys(sdkHistory["6"]),
  Object.keys(fixture.history),
  "historical contracts",
);
for (const [name, generations] of Object.entries(fixture.history)) {
  assertExactKeys(
    Object.keys(sdkHistory["6"][name]),
    Object.keys(generations),
    `${name} generations`,
  );
  for (const [generation, historical] of Object.entries(generations)) {
    const addressBook = sdkHistory["6"][name][generation];
    assertExactKeys(
      Object.keys(addressBook),
      Object.keys(historical.deployments),
      `${name} ${generation} chains`,
    );
    const exportName = abiExportName(
      `${name}${generation === "previous" ? "Previous" : "V1"}`,
    );
    const abi = bindings[exportName] as AbiItem[];
    invariant(
      Array.isArray(abi) && abiDigest(abi) === historical.abiSha256,
      `${exportName} differs from its executed artifact`,
    );
    for (const [chainId, deployment] of Object.entries(
      historical.deployments,
    )) {
      invariant(
        normalizeAddress(addressBook[chainId]) === deployment.address,
        `${name} ${generation} on ${chainId} differs`,
      );
    }
  }
  for (const [chainId, address] of Object.entries(sdkAddressBook["6"][name])) {
    const generation =
      Object.entries(generations).find(
        ([, history]) =>
          history.deployments[chainId]?.address === address.toLowerCase(),
      )?.[0] ?? "current";
    invariant(
      sdkGenerations["6"][name][chainId] === generation,
      `${name} ABI generation on ${chainId} differs`,
    );
    const digest =
      generation === "current"
        ? fixture.contracts[name].abiSha256
        : generations[generation].abiSha256;
    invariant(
      (fixture.abiOverrides[chainId]?.[name] ??
        fixture.contracts[name].abiSha256) === digest,
      `${name} selected ABI on ${chainId} does not match its generated generation`,
    );
  }
}

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
const contractRoots = Object.fromEntries(
  contractNames.map((name) => [name, checkedDeploymentsRoot(name)]),
);
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
      contractRoots[contractName],
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
      abiDigest(artifact.abi) ===
        (fixture.abiOverrides[chainId]?.[contractName] ??
          expectedContract.abiSha256),
      `${contractName} ABI on ${chainId} differs from its pinned public surface`,
    );
    contractArtifacts += 1;
    artifactAbiChecks += 1;
  }
}

for (const [name, generations] of Object.entries(fixture.history)) {
  for (const [generation, historical] of Object.entries(generations)) {
    for (const [chainId, deployment] of Object.entries(
      historical.deployments,
    )) {
      const artifact = readDeployment(
        join(
          root,
          "deployments",
          fixture.chains[chainId],
          `${deployment.artifact}.json`,
        ),
      );
      invariant(
        normalizeAddress(artifact.address) === deployment.address &&
          artifact.abi &&
          abiDigest(artifact.abi) === historical.abiSha256,
        `${name} ${generation} on ${chainId} differs from its source artifact`,
      );
    }
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
  contractArtifacts === addressSlots - explicitAbsences,
  `Deployed artifact count differs from the fixture: ${contractArtifacts}`,
);
invariant(
  artifactAbiChecks === contractArtifacts,
  `Expected an ABI check for every artifact; got ${artifactAbiChecks}`,
);
invariant(
  suckerArtifacts === 36,
  `Expected 36 sucker artifact checks; got ${suckerArtifacts}`,
);
process.stdout.write(
  `Verified ${addressSlots} contract deployment slots (${contractArtifacts} artifacts, ${explicitAbsences} absences), ${generatedAbiCount} generated ABI surfaces plus retained historical generations against ${artifactAbiChecks} chain artifacts, and 36 directional sucker artifacts at deploy-all-v6 ${fixture.source.commit}${Object.entries(
    fixture.extensions,
  )
    .map(([repository, { commit }]) => ` and ${repository} ${commit}`)
    .join("")}.\n`,
);
