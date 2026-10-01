import {
  concatHex,
  decodeAbiParameters,
  decodeFunctionData,
  decodeFunctionResult,
  encodeAbiParameters,
  encodeFunctionData,
  encodeFunctionResult,
  encodePacked,
  getAddress,
  getContractAddress,
  isAddress,
  isAddressEqual,
  keccak256,
  size,
  toHex,
  zeroAddress,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { simulateStateChangingTransaction } from "./review/simulation.js";
import { isHexBytes, uint256 } from "./untrusted.js";

// This module runs nothing when it loads: every value below is a literal, so
// importing one export does not pull in the rest. Checksummed addresses are
// written out rather than computed with getAddress, and ABIs are JSON rather
// than parseAbi strings.

// Canonical Safe 1.4.1 deployments, from safe-global/safe-deployments.
// A fixed singleton and initializer preserve CREATE2 addresses across chains.
export const SAFE_FACTORY: Address =
  "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67";
export const SAFE_SINGLETON: Address =
  "0x41675C099F32341bf84BFc5382aF534df5C7461a";
/** The 1.4.1 SafeL2 singleton, which SafeToL2Setup installs off Ethereum. */
const SAFE_L2_SINGLETON: Address = "0x29fcB43b46531BcA003ddC8FCB67FFE91900C762";
export const SAFE_FALLBACK: Address =
  "0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99";
export const MULTICALL3: Address = "0xcA11bde05977b3631167028862bE2a173976CA11";
export const MAX_SAFE_OWNERS = 50;

/**
 * Safe's canonical 1.4.1 creation calls `SafeToL2Setup.setupToL2` as `setup`'s
 * delegatecall hook. That library repoints slot zero at SafeL2 on every chain
 * except Ethereum, so one initializer produces the same address with a
 * different, but paired, singleton per chain. Same address on every chain.
 */
export const SAFE_TO_L2_SETUP_ADDRESS: Address =
  "0xBD89A1CE4DDe368FFAB0eC35506eEcE0b1fFdc54";

/** keccak256 of SafeToL2Setup's runtime, the same on every canonical chain. */
export const SAFE_TO_L2_SETUP_CODE_HASH: Hex =
  "0x2f25df28caf984366ee584e13241707e85dcd5a6ea0c14267928dafc1fd6274b";

/**
 * Safe's vanity `paymentReceiver` marker. Inert, because a replayable
 * initializer must still set a zero `payment`.
 */
export const SAFE_CANONICAL_PAYMENT_RECEIVER: Address =
  "0x5afe7A11E7000000000000000000000000000000";

/**
 * The official Safe releases an authority may run, from
 * safe-global/safe-deployments: each singleton (Safe and SafeL2, canonical and
 * EIP-155 deployments) and proxy factory. An address is pinned to its code by
 * its deterministic deployment, so the list is a code allow-list. A contract
 * that only implements the owner API is never a Safe.
 */
export const RECOGNIZED_SAFE_RELEASES = [
  {
    version: "1.3.0",
    singletons: [
      "0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552",
      "0x69f4D1788e39c87893C980c06EdF4b7f686e2938",
      "0x3E5c63644E683549055b9Be8653de26E0B4CD36E",
      "0xfb1bffC9d739B8D520DaF37dF666da4C687191EA",
    ],
    factories: [
      "0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2",
      "0xC22834581EbC8527d974F8a1c97E1bEA4EF910BC",
    ],
  },
  {
    version: "1.4.1",
    singletons: [SAFE_SINGLETON, SAFE_L2_SINGLETON],
    factories: [SAFE_FACTORY],
  },
] as const satisfies readonly {
  version: string;
  singletons: readonly Address[];
  factories: readonly Address[];
}[];

export type RecognizedSafeVersion =
  (typeof RECOGNIZED_SAFE_RELEASES)[number]["version"];

/**
 * keccak256 of the proxy runtime each recognized factory deploys
 * (`proxyCreationCode()` of 1.3.0 and 1.4.1).
 */
const PROXY_CODE_HASH =
  "0xd7d408ebcd99b2b70be43e20253d6d92a8ea8fab29bd3be7f55b10032331fb4c";
const RECOGNIZED_SAFE_PROXY_CODE_HASHES = [
  "0xb89c1b3bdf2cf8827818646bce9a8f6e372885f8c55e5c07acbd307cb133b000",
  PROXY_CODE_HASH,
] as const;

/** Each release's Ethereum singleton and the SafeL2 singleton SafeToL2Setup installs elsewhere. */
export const SAFE_L1_L2_SINGLETON_PAIRS = [
  [SAFE_SINGLETON, SAFE_L2_SINGLETON],
] as const satisfies readonly (readonly [Address, Address])[];

/**
 * Safe's MultiSendCallOnly 1.3.0, the same address on every supported chain. A
 * Safe DELEGATECALLs it to run several calls as one transaction.
 */
export const MULTI_SEND_CALL_ONLY: Address =
  "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D";

export const MULTI_SEND_ABI = [
  {
    name: "multiSend",
    type: "function",
    stateMutability: "payable",
    inputs: [{ type: "bytes", name: "transactions" }],
    outputs: [],
  },
] as const;

/**
 * `SafeProxyFactory.proxyCreationCode()` at {@link SAFE_FACTORY}: the same
 * bytes wherever the canonical 1.4.1 factory is deployed. Pinned so an address
 * can be predicted from calldata alone. Reading it from a chain
 * ({@link readSafeCreationCode}) stays the rule for anything that is about to
 * be deployed; this constant is for reading a signed call back.
 */
export const SAFE_PROXY_CREATION_CODE: Hex =
  "0x608060405234801561001057600080fd5b506040516101e63803806101e68339818101604052602081101561003357600080fd5b8101908080519060200190929190505050600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614156100ca576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260228152602001806101c46022913960400191505060405180910390fd5b806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505060ab806101196000396000f3fe608060405273ffffffffffffffffffffffffffffffffffffffff600054167fa619486e0000000000000000000000000000000000000000000000000000000060003514156050578060005260206000f35b3660008037600080366000845af43d6000803e60008114156070573d6000fd5b3d6000f3fea264697066735822122003d1488ee65e08fa41e58e888a9865554c535f2c77126a82cb4c0f917f31441364736f6c63430007060033496e76616c69642073696e676c65746f6e20616464726573732070726f7669646564";

/**
 * `GnosisSafeProxyFactory.proxyCreationCode()` of both recognized 1.3.0
 * factories (canonical and EIP-155), which are byte-identical. With
 * {@link SAFE_PROXY_CREATION_CODE} it lets a creation record be checked
 * against its address from calldata alone.
 */
const SAFE_130_PROXY_CREATION_CODE: Hex =
  "0x608060405234801561001057600080fd5b506040516101e63803806101e68339818101604052602081101561003357600080fd5b8101908080519060200190929190505050600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614156100ca576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260228152602001806101c46022913960400191505060405180910390fd5b806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505060ab806101196000396000f3fe608060405273ffffffffffffffffffffffffffffffffffffffff600054167fa619486e0000000000000000000000000000000000000000000000000000000060003514156050578060005260206000f35b3660008037600080366000845af43d6000803e60008114156070573d6000fd5b3d6000f3fea2646970667358221220d1429297349653a4918076d650332de1a1068c5f3e07c5c82360c277770b955264736f6c63430007060033496e76616c69642073696e676c65746f6e20616464726573732070726f7669646564";

/** The proxy creation code `factory` deploys, or null for an unrecognized factory. */
function proxyCreationCodeOf(factory: Address): Hex | null {
  const release = RECOGNIZED_SAFE_RELEASES.find(({ factories }) =>
    factories.some((candidate) => isAddressEqual(candidate, factory)),
  );
  if (!release) return null;
  return release.version === "1.4.1"
    ? SAFE_PROXY_CREATION_CODE
    : SAFE_130_PROXY_CREATION_CODE;
}

const contracts = [
  [
    SAFE_FACTORY,
    "0x50c3cdc4074750a7a974204a716c999edd37482f907608d960b2b025ee0b3317",
  ],
  [
    SAFE_SINGLETON,
    "0x1fe2df852ba3299d6534ef416eefa406e56ced995bca886ab7a553e6d0c5e1c4",
  ],
  [
    SAFE_FALLBACK,
    "0x7c6007a5d711cea8dfd5d91f5940ec29c7f200fe511eb1fc1397b367af3c42f9",
  ],
] as const;
const SENTINEL = "0x0000000000000000000000000000000000000001" as const;
const SINGLETON_SLOT =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as const;
const GUARD_SLOT =
  "0x4a204f620c8c5ccdca3fd54d003badd85ba500436a431f0cbda4f558c93c34c8" as const;
const FALLBACK_SLOT =
  "0x6c9a6c4a39284e37ed1cf53d337577d14212a4870fb976a4366c693b939918d5" as const;

const SETUP_FUNCTION = {
  name: "setup",
  type: "function",
  stateMutability: "nonpayable",
  inputs: [
    { type: "address[]", name: "owners" },
    { type: "uint256", name: "threshold" },
    { type: "address", name: "to" },
    { type: "bytes", name: "data" },
    { type: "address", name: "fallbackHandler" },
    { type: "address", name: "paymentToken" },
    { type: "uint256", name: "payment" },
    { type: "address", name: "paymentReceiver" },
  ],
  outputs: [],
} as const;

/** `Safe.setup`, the initializer a Safe proxy runs once at creation. */
export const SAFE_SETUP_ABI = [SETUP_FUNCTION] as const;

/** `SafeToL2Setup.setupToL2`, the only delegatecall hook a replayed creation may run. */
export const SAFE_TO_L2_SETUP_ABI = [
  {
    name: "setupToL2",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ type: "address", name: "l2Singleton" }],
    outputs: [],
  },
] as const;

export const SAFE_CREATE_ABI = [
  {
    name: "proxyCreationCode",
    type: "function",
    stateMutability: "pure",
    inputs: [],
    outputs: [{ type: "bytes" }],
  },
  {
    name: "createProxyWithNonce",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { type: "address", name: "singleton" },
      { type: "bytes", name: "initializer" },
      { type: "uint256", name: "saltNonce" },
    ],
    outputs: [{ type: "address", name: "proxy" }],
  },
  SETUP_FUNCTION,
] as const;
export const CREATE_BATCH_ABI = [
  {
    name: "aggregate3Value",
    type: "function",
    stateMutability: "payable",
    inputs: [
      {
        type: "tuple[]",
        name: "calls",
        components: [
          { type: "address", name: "target" },
          { type: "bool", name: "allowFailure" },
          { type: "uint256", name: "value" },
          { type: "bytes", name: "callData" },
        ],
      },
    ],
    outputs: [
      {
        type: "tuple[]",
        name: "returnData",
        components: [
          { type: "bool", name: "success" },
          { type: "bytes", name: "returnData" },
        ],
      },
    ],
  },
] as const;
const READ_ABI = [
  {
    name: "masterCopy",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    name: "VERSION",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    name: "getThreshold",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "getOwners",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address[]" }],
  },
  {
    name: "getModulesPaginated",
    type: "function",
    stateMutability: "view",
    inputs: [
      { type: "address", name: "start" },
      { type: "uint256", name: "pageSize" },
    ],
    outputs: [{ type: "address[]" }, { type: "address" }],
  },
  {
    name: "nonce",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "approvedHashes",
    type: "function",
    stateMutability: "view",
    inputs: [
      { type: "address", name: "owner" },
      { type: "bytes32", name: "hash" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const;

export type SafeDeploymentPlan = {
  owners: Address[];
  threshold: number;
  saltNonce: Hex;
  proxyCreationCode: Hex;
  address: Address;
};
export type SafeCall = { to: Address; data: Hex; value: bigint };
export type SafeAddressInput =
  | { kind: "existing"; address: Address }
  | { kind: "create"; owners: Address[]; threshold: number; saltNonce: Hex };
export type SafeVerificationOptions = {
  /** Missing code is allowed only for a preflight check, never receipt acceptance. */
  allowMissing?: boolean;
  /** Use the receipt block to recover a launch even after subsequent owner changes. */
  blockNumber?: bigint;
};

function validAddress(address: Address): boolean {
  return isAddress(address) && BigInt(address) > 1n;
}

/** Plain Safe only: no delegatecall hook, modules, guard, or setup payments. */
export function buildSafeInitializer(policy: {
  owners: readonly Address[];
  threshold: number;
}): Hex {
  if (
    !Array.isArray(policy.owners) ||
    policy.owners.length < 1 ||
    policy.owners.length > MAX_SAFE_OWNERS ||
    policy.owners.some((owner) => !validAddress(owner)) ||
    new Set(policy.owners.map((owner) => owner.toLowerCase())).size !==
      policy.owners.length
  )
    throw new Error(
      "A Safe needs 1–50 unique nonzero, nonsentinel owner addresses.",
    );
  if (
    !Number.isInteger(policy.threshold) ||
    policy.threshold < 1 ||
    policy.threshold > policy.owners.length
  ) {
    throw new Error("Invalid Safe approval policy.");
  }
  return encodeFunctionData({
    abi: SAFE_CREATE_ABI,
    functionName: "setup",
    args: [
      policy.owners,
      BigInt(policy.threshold),
      zeroAddress,
      "0x",
      SAFE_FALLBACK,
      zeroAddress,
      0n,
      zeroAddress,
    ],
  });
}

/** Owner order and the original 32-byte salt are part of the deterministic address. */
export function predictSafeAddress(
  plan: Omit<SafeDeploymentPlan, "address">,
): Address {
  if (
    !/^0x[\da-f]{64}$/i.test(plan.saltNonce) ||
    !/^0x(?:[\da-f]{2}){1,2048}$/i.test(plan.proxyCreationCode)
  ) {
    throw new Error("Invalid Safe deployment record.");
  }
  const salt = keccak256(
    encodePacked(
      ["bytes32", "uint256"],
      [keccak256(buildSafeInitializer(plan)), BigInt(plan.saltNonce)],
    ),
  );
  return getContractAddress({
    opcode: "CREATE2",
    from: SAFE_FACTORY,
    salt,
    bytecode: concatHex([
      plan.proxyCreationCode,
      toHex(BigInt(SAFE_SINGLETON), { size: 32 }),
    ]),
  });
}

export function validateSafeDeploymentPlan(plan: SafeDeploymentPlan): void {
  if (
    !validAddress(plan.address) ||
    !isAddressEqual(predictSafeAddress(plan), plan.address)
  ) {
    throw new Error(
      "The Safe address differs from its saved owners and policy.",
    );
  }
}

function validatePlans(plans: readonly SafeDeploymentPlan[]): void {
  if (!Array.isArray(plans)) throw new Error("Invalid Safe deployment plans.");
  plans.forEach(validateSafeDeploymentPlan);
  if (
    new Set(plans.map((plan) => plan.address.toLowerCase())).size !==
    plans.length
  ) {
    throw new Error("Duplicate Safe deployment plans.");
  }
}

function codeMatches(code: Hex | undefined, hash: Hex): boolean {
  return (
    typeof code === "string" &&
    /^0x(?:[\da-f]{2}){1,24576}$/i.test(code) &&
    keccak256(code) === hash
  );
}

/** Check canonical dependencies before trusting factory-returned creation code. */
export async function readSafeCreationCode(client: PublicClient): Promise<Hex> {
  await Promise.all(
    contracts.map(async ([address, hash]) => {
      if (!codeMatches(await client.getCode({ address }), hash)) {
        throw new Error(
          `The canonical Safe 1.4.1 contract is unavailable at ${address}.`,
        );
      }
    }),
  );
  const proxyCreationCode = await client.readContract({
    address: SAFE_FACTORY,
    abi: SAFE_CREATE_ABI,
    functionName: "proxyCreationCode",
  });
  if (!/^0x(?:[\da-f]{2}){1,2048}$/i.test(proxyCreationCode))
    throw new Error("Invalid Safe proxy creation code.");
  return proxyCreationCode;
}

/** Existing inputs are address-only: this does not certify an arbitrary address as a Safe. */
export async function resolveSafeAddress(
  input: SafeAddressInput,
  clients: readonly PublicClient[],
): Promise<{ address: Address; plan?: SafeDeploymentPlan }> {
  if (input.kind === "existing") {
    if (!validAddress(input.address))
      throw new Error("Enter a valid existing Safe address.");
    return { address: getAddress(input.address) };
  }
  if (input.kind !== "create") throw new Error("Invalid Safe address input.");
  // Validate local inputs before any network request.
  buildSafeInitializer(input);
  if (!/^0x[\da-f]{64}$/i.test(input.saltNonce))
    throw new Error("Invalid Safe deployment salt.");
  if (!clients.length)
    throw new Error("Select at least one network to create a Safe.");
  const codes = await Promise.all(clients.map(readSafeCreationCode));
  if (codes.some((code) => code.toLowerCase() !== codes[0].toLowerCase()))
    throw new Error("Safe creation code differs across the selected networks.");
  const policy = {
    owners: input.owners.map((owner) => getAddress(owner)),
    threshold: input.threshold,
    saltNonce: input.saltNonce,
    proxyCreationCode: codes[0],
  };
  const plan = { ...policy, address: predictSafeAddress(policy) };
  return { address: plan.address, plan };
}

/**
 * One raw `eth_call` into a Safe, bounded by `gas` and `maxBytes` of return
 * data: the result, or null when the node answered with anything but whole
 * hex bytes within the bound. An RPC failure throws.
 */
async function boundedCall(
  client: Pick<PublicClient, "request">,
  address: Address,
  data: Hex,
  gas: bigint,
  maxBytes: number,
  blockNumber?: bigint,
): Promise<Hex | null> {
  // Raw RPC cannot follow a contract-selected CCIP/OffchainLookup URL.
  const result = await client.request({
    method: "eth_call",
    params: [
      { to: address, data, gas: toHex(gas) },
      blockNumber === undefined ? "latest" : toHex(blockNumber),
    ],
  });
  return typeof result === "string" &&
    /^0x(?:[\da-f]{2})*$/i.test(result) &&
    result.length <= 2 + maxBytes * 2
    ? (result as Hex)
    : null;
}

/**
 * Certify this module's plain Safe profile, failing closed on malformed state or RPC errors.
 * Receipt recovery pins every code, storage, and raw policy read to blockNumber.
 * Contract signers are supported; this verifies their membership, not their own policy.
 */
export async function verifySafeDeployments(
  client: PublicClient,
  plans: readonly SafeDeploymentPlan[],
  options: SafeVerificationOptions = {},
): Promise<boolean> {
  validatePlans(plans);
  const { blockNumber, allowMissing = false } = options;
  if (blockNumber !== undefined && blockNumber < 0n)
    throw new Error("Invalid Safe verification block.");
  let complete = true;
  for (const plan of plans) {
    const code = await client.getCode({ address: plan.address, blockNumber });
    if (allowMissing && (code === undefined || code === "0x")) {
      complete = false;
      continue;
    }
    const mismatch = () =>
      new Error(
        `The Safe at ${plan.address} does not match its reviewed owners and policy.`,
      );
    if (!codeMatches(code, PROXY_CODE_HASH)) throw mismatch();
    const singleton = await client.getStorageAt({
      address: plan.address,
      slot: SINGLETON_SLOT,
      blockNumber,
    });
    if (
      singleton?.toLowerCase() !==
      toHex(BigInt(SAFE_SINGLETON), { size: 32 }).toLowerCase()
    )
      throw mismatch();
    // Do not delegate through a claimed implementation before checking its exact runtime.
    for (const [address, hash] of contracts.slice(1)) {
      if (!codeMatches(await client.getCode({ address, blockNumber }), hash))
        throw mismatch();
    }
    const call = async (data: Hex, maxBytes: number, gas = 100_000n) => {
      const result = await boundedCall(
        client,
        plan.address,
        data,
        gas,
        maxBytes,
        blockNumber,
      );
      if (result === null) {
        throw new Error("Invalid or oversized Safe policy response.");
      }
      return result;
    };
    const [
      masterCopy,
      version,
      threshold,
      ownersData,
      modules,
      guard,
      fallback,
    ] = await Promise.all([
      call(
        encodeFunctionData({ abi: READ_ABI, functionName: "masterCopy" }),
        32,
      ),
      call(encodeFunctionData({ abi: READ_ABI, functionName: "VERSION" }), 96),
      call(
        encodeFunctionData({ abi: READ_ABI, functionName: "getThreshold" }),
        32,
      ),
      call(
        encodeFunctionData({ abi: READ_ABI, functionName: "getOwners" }),
        64 + MAX_SAFE_OWNERS * 32,
        400_000n,
      ),
      call(
        encodeFunctionData({
          abi: READ_ABI,
          functionName: "getModulesPaginated",
          args: [SENTINEL, 1n],
        }),
        128,
        500_000n,
      ),
      client.getStorageAt({
        address: plan.address,
        slot: GUARD_SLOT,
        blockNumber,
      }),
      client.getStorageAt({
        address: plan.address,
        slot: FALLBACK_SLOT,
        blockNumber,
      }),
    ]);
    if (
      masterCopy.toLowerCase() !==
        toHex(BigInt(SAFE_SINGLETON), { size: 32 }).toLowerCase() ||
      version.toLowerCase() !==
        encodeFunctionResult({
          abi: READ_ABI,
          functionName: "VERSION",
          result: "1.4.1",
        }).toLowerCase() ||
      threshold.toLowerCase() !==
        toHex(BigInt(plan.threshold), { size: 32 }).toLowerCase() ||
      modules.toLowerCase() !==
        encodeFunctionResult({
          abi: READ_ABI,
          functionName: "getModulesPaginated",
          result: [[], SENTINEL],
        }).toLowerCase() ||
      guard?.toLowerCase() !== toHex(0n, { size: 32 }) ||
      fallback?.toLowerCase() !==
        toHex(BigInt(SAFE_FALLBACK), { size: 32 }).toLowerCase() ||
      ownersData.length !== 2 + (64 + plan.owners.length * 32) * 2 ||
      ownersData.slice(2, 66).toLowerCase() !==
        toHex(32n, { size: 32 }).slice(2) ||
      ownersData.slice(66, 130).toLowerCase() !==
        toHex(BigInt(plan.owners.length), { size: 32 }).slice(2)
    )
      throw mismatch();
    const owners = decodeFunctionResult({
      abi: READ_ABI,
      functionName: "getOwners",
      data: ownersData,
    });
    if (
      new Set(owners.map((owner) => owner.toLowerCase())).size !==
        plan.owners.length ||
      plan.owners.some(
        (owner) => !owners.some((actual) => isAddressEqual(actual, owner)),
      )
    )
      throw mismatch();
  }
  return complete;
}

export async function checkSafeDeployments(
  client: PublicClient,
  plans: readonly SafeDeploymentPlan[] = [],
): Promise<void> {
  if (!plans.length) return;
  validatePlans(plans);
  const code = await readSafeCreationCode(client);
  if (
    plans.some(
      (plan) => plan.proxyCreationCode.toLowerCase() !== code.toLowerCase(),
    )
  )
    throw new Error("The saved Safe creation code changed.");
  await verifySafeDeployments(client, plans, { allowMissing: true });
}

/** Optional factory calls are idempotent only with preflight, simulation, and receipt verification. */
export function buildSafeDeploymentCalls(plans: readonly SafeDeploymentPlan[]) {
  validatePlans(plans);
  return plans.map((plan) => ({
    target: SAFE_FACTORY,
    allowFailure: true as const,
    value: 0n,
    callData: encodeFunctionData({
      abi: SAFE_CREATE_ABI,
      functionName: "createProxyWithNonce",
      args: [
        SAFE_SINGLETON,
        buildSafeInitializer(plan),
        BigInt(plan.saltNonce),
      ],
    }),
  }));
}

export function buildSafeDeploymentTx(
  chainId: number,
  plans: readonly SafeDeploymentPlan[],
) {
  if (!Number.isSafeInteger(chainId) || chainId <= 0)
    throw new Error("Invalid Safe deployment chain.");
  return {
    chainId,
    address: MULTICALL3,
    abi: CREATE_BATCH_ABI,
    functionName: "aggregate3Value" as const,
    args: [buildSafeDeploymentCalls(plans)] as const,
    value: 0n,
  };
}

/**
 * Multicall3 changes msg.sender. Use only a sender-independent or already authenticated
 * forwarded launch. This helper cannot decide the launch contract's authorization semantics.
 * Simulate the returned call, verifySafeLaunchSimulation, then verify receipt-block state.
 */
export function bundleSafeLaunch(
  call: SafeCall,
  plans: readonly SafeDeploymentPlan[] = [],
): SafeCall {
  if (!plans.length) return call;
  if (
    !validAddress(call.to) ||
    !/^0x(?:[\da-f]{2})*$/i.test(call.data) ||
    typeof call.value !== "bigint" ||
    call.value < 0n
  )
    throw new Error("Invalid Safe launch call.");
  const calls = [
    ...buildSafeDeploymentCalls(plans),
    {
      target: call.to,
      allowFailure: false,
      value: call.value,
      callData: call.data,
    },
  ];
  return {
    to: MULTICALL3,
    value: call.value,
    data: encodeFunctionData({
      abi: CREATE_BATCH_ABI,
      functionName: "aggregate3Value",
      args: [calls],
    }),
  };
}

/** Require the exact reviewed factory calls, their order, one mandatory launch, and its value. */
export function unbundleSafeLaunch(
  call: SafeCall,
  plans: readonly SafeDeploymentPlan[] = [],
): SafeCall {
  if (!plans.length) return call;
  if (!isAddressEqual(call.to, MULTICALL3))
    throw new Error("The saved Safe launch is not a creation batch.");
  const { args } = decodeFunctionData({
    abi: CREATE_BATCH_ABI,
    data: call.data,
  });
  const last = args[0][args[0].length - 1];
  if (!last) throw new Error("The saved creation batch is empty.");
  const inner = { to: last.target, data: last.callData, value: call.value };
  if (
    bundleSafeLaunch(inner, plans).data.toLowerCase() !==
    call.data.toLowerCase()
  )
    throw new Error(
      "The saved creation batch differs from its reviewed Safes and launch.",
    );
  return inner;
}

/** Outer simulation success is insufficient: an optional deployment may have failed. */
export async function verifySafeLaunchSimulation(
  client: PublicClient,
  plans: readonly SafeDeploymentPlan[] = [],
  data?: Hex,
): Promise<void> {
  if (!plans.length) return;
  validatePlans(plans);
  if (!data)
    throw new Error("The Safe creation simulation returned no results.");
  const results = decodeFunctionResult({
    abi: CREATE_BATCH_ABI,
    functionName: "aggregate3Value",
    data,
  });
  if (
    results.length !== plans.length + 1 ||
    !results[results.length - 1].success
  )
    throw new Error("The creation batch did not simulate every required call.");
  for (const [index, plan] of plans.entries()) {
    const result = results[index];
    if (result.success) {
      if (
        result.returnData.toLowerCase() !==
        toHex(BigInt(plan.address), { size: 32 }).toLowerCase()
      )
        throw new Error(
          "The simulated factory returned a different Safe address.",
        );
    } else {
      // Only an already-deployed Safe with the exact policy can explain an accepted failure.
      await verifySafeDeployments(client, [plan]);
    }
  }
}

// ── Authority identity ───────────────────────────────────────────────────────

/** A recognized Safe and its live policy. */
export type SafeAuthorityIdentity = {
  kind: "safe";
  owners: Address[];
  threshold: number;
  /** Every owner is a plain or exactly EIP-7702-delegated EOA on this chain. */
  ownersAreEoas: boolean;
  hasModules: boolean;
  /** The enabled modules, or null when there are more than one page of them. */
  modules: Address[] | null;
  proxyCodeHash: Hex;
  singleton: Address;
  singletonCodeHash: Hex;
  version: RecognizedSafeVersion;
  guard: Address;
  fallbackHandler: Address;
  fallbackHandlerCodeHash: Hex | null;
};

/**
 * Who controls an address. An EIP-7702-delegated EOA is its own kind, so a
 * check for a plain `eoa` never admits one by accident; it is never a Safe.
 */
export type AuthorityIdentity =
  | { kind: "eoa" }
  | { kind: "delegated-eoa"; delegation: Address }
  | { kind: "contract" }
  | SafeAuthorityIdentity;

/** Pin every read to one block, a receipt's say. */
export type AuthorityReadOptions = { blockNumber?: bigint };

type CodeClient = Pick<PublicClient, "getCode">;
type AuthorityClient = Pick<
  PublicClient,
  "getCode" | "getStorageAt" | "request"
>;

/** Gas each bounded Safe read may use: a word, the owner list, a module page. */
const SAFE_SCALAR_READ_GAS = 100_000n;
const SAFE_OWNERS_READ_GAS = 400_000n;
const SAFE_MODULES_READ_GAS = 500_000n;
const SAFE_MODULE_PAGE = 64;
/** A `createProxyWithNonce` preflight's gas: a proxy, its setup and any hook. */
const SAFE_DEPLOY_SIMULATION_GAS = 3_000_000n;

function invalidArgument(name: string, value: unknown): Error {
  return new Error(`Invalid ${name}: ${String(value)}.`);
}

/** The checksummed address, or a refusal naming `name`. */
function requireAddress(value: unknown, name: string): Address {
  if (typeof value !== "string" || !isAddress(value)) {
    throw invalidArgument(name, value);
  }
  return getAddress(value);
}

/** Byte-aligned code as eth_getCode returns it, with a lowercase 0x. */
function isRuntimeCode(code: unknown): code is Hex {
  return typeof code === "string" && /^0x(?:[\da-fA-F]{2})*$/.test(code);
}

/** The delegate of an exact 23-byte EIP-7702 designator, `0xef0100 ‖ address`. */
function eip7702Delegation(code: unknown): Address | null {
  return typeof code === "string" && /^0x[eE][fF]0100[\da-fA-F]{40}$/.test(code)
    ? getAddress(`0x${code.slice(8).toLowerCase()}`)
    : null;
}

/**
 * Whether `code` is exactly an EIP-7702 delegation designator. A contract that
 * only starts with the prefix is not, and stays a contract.
 */
export function isEip7702DelegatedEoaRuntime(code: unknown): code is Hex {
  return eip7702Delegation(code) !== null;
}

/** No code, or an exact EIP-7702 designator: the account's key still signs. */
function isEoaRuntime(code: unknown): boolean {
  return (
    code === undefined || code === "0x" || isEip7702DelegatedEoaRuntime(code)
  );
}

/** The address in a 32-byte word whose upper 12 bytes are zero. */
function wordAddress(word: unknown): Address | null {
  return typeof word === "string" && /^0x0{24}[\da-fA-F]{40}$/.test(word)
    ? getAddress(`0x${word.slice(26).toLowerCase()}`)
    : null;
}

function safeReleaseOf(singleton: Address) {
  return RECOGNIZED_SAFE_RELEASES.find((release) =>
    release.singletons.some((candidate) =>
      isAddressEqual(candidate, singleton),
    ),
  );
}

/** Whether `factory` and `singleton` are one recognized Safe release. */
export function isRecognizedSafeDeployment(
  factory: Address,
  singleton: Address,
): boolean {
  return (
    isAddress(factory) &&
    isAddress(singleton) &&
    !!safeReleaseOf(singleton)?.factories.some((candidate) =>
      isAddressEqual(candidate, factory),
    )
  );
}

/**
 * Whether two singletons are one recognized release: the same address, or an
 * Ethereum singleton and the SafeL2 singleton SafeToL2Setup pairs it with.
 */
export function safeSingletonsAreEquivalent(
  left: Address,
  right: Address,
): boolean {
  if (isAddressEqual(left, right)) return true;
  return SAFE_L1_L2_SINGLETON_PAIRS.some(
    ([l1, l2]) =>
      (isAddressEqual(l1, left) && isAddressEqual(l2, right)) ||
      (isAddressEqual(l1, right) && isAddressEqual(l2, left)),
  );
}

/** One exact 32-byte word from a bounded read, or null. */
async function readSafeWord(
  client: Pick<PublicClient, "request">,
  safe: Address,
  data: Hex,
  blockNumber?: bigint,
): Promise<bigint | null> {
  const result = await boundedCall(
    client,
    safe,
    data,
    SAFE_SCALAR_READ_GAS,
    32,
    blockNumber,
  );
  return result?.length === 66 ? BigInt(result) : null;
}

/**
 * A Safe's nonce through one raw, gas- and return-bounded `eth_call`: null
 * when the answer is not exactly one word. An RPC failure throws.
 */
export function readBoundedSafeNonce(
  client: Pick<PublicClient, "request">,
  safe: Address,
  { blockNumber }: AuthorityReadOptions = {},
): Promise<bigint | null> {
  return readSafeWord(
    client,
    requireAddress(safe, "Safe address"),
    encodeFunctionData({ abi: READ_ABI, functionName: "nonce" }),
    blockNumber,
  );
}

/**
 * `approvedHashes(owner, hash)` through one raw, bounded `eth_call`: nonzero
 * when `owner` approved the Safe transaction hash onchain. Null when the answer
 * is not exactly one word. An RPC failure throws.
 */
export function readBoundedSafeApprovedHash(
  client: Pick<PublicClient, "request">,
  safe: Address,
  owner: Address,
  hash: Hex,
  { blockNumber }: AuthorityReadOptions = {},
): Promise<bigint | null> {
  if (typeof hash !== "string" || !/^0x[\da-fA-F]{64}$/.test(hash)) {
    throw invalidArgument("Safe transaction hash", hash);
  }
  return readSafeWord(
    client,
    requireAddress(safe, "Safe address"),
    encodeFunctionData({
      abi: READ_ABI,
      functionName: "approvedHashes",
      args: [requireAddress(owner, "Safe owner"), hash],
    }),
    blockNumber,
  );
}

/**
 * `getOwners()`, bounded before anything is decoded: a crafted proxy's owner
 * list could otherwise make the reader allocate without limit. Null unless the
 * answer is exactly one canonical array of 1 to MAX_SAFE_OWNERS clean words.
 */
async function readSafeOwners(
  client: Pick<PublicClient, "request">,
  safe: Address,
  blockNumber?: bigint,
): Promise<Address[] | null> {
  const result = await boundedCall(
    client,
    safe,
    encodeFunctionData({ abi: READ_ABI, functionName: "getOwners" }),
    SAFE_OWNERS_READ_GAS,
    64 + MAX_SAFE_OWNERS * 32,
    blockNumber,
  );
  if (!result || result.length < 130 || BigInt(result.slice(0, 66)) !== 32n) {
    return null;
  }
  // The byte bound above already caps the count at MAX_SAFE_OWNERS.
  const count = BigInt(`0x${result.slice(66, 130)}`);
  if (count < 1n || result.length !== 130 + Number(count) * 64) return null;
  const owners: Address[] = [];
  for (let index = 0; index < Number(count); index += 1) {
    const owner = wordAddress(
      `0x${result.slice(130 + index * 64, 194 + index * 64)}`,
    );
    if (!owner) return null;
    owners.push(owner);
  }
  return owners;
}

/** The first page of enabled modules, or null for anything but a canonical answer. */
async function readSafeModulePage(
  client: Pick<PublicClient, "request">,
  safe: Address,
  blockNumber?: bigint,
): Promise<{ modules: Address[]; next: Address } | null> {
  const result = await boundedCall(
    client,
    safe,
    encodeFunctionData({
      abi: READ_ABI,
      functionName: "getModulesPaginated",
      args: [SENTINEL, BigInt(SAFE_MODULE_PAGE)],
    }),
    SAFE_MODULES_READ_GAS,
    96 + SAFE_MODULE_PAGE * 32,
    blockNumber,
  );
  if (!result || result.length < 194 || BigInt(result.slice(0, 66)) !== 64n) {
    return null;
  }
  const next = wordAddress(`0x${result.slice(66, 130)}`);
  const count = BigInt(`0x${result.slice(130, 194)}`);
  // The byte bound above already caps the count at one page.
  if (!next || result.length !== 194 + Number(count) * 64) return null;
  const modules: Address[] = [];
  for (let index = 0; index < Number(count); index += 1) {
    const module = wordAddress(
      `0x${result.slice(194 + index * 64, 258 + index * 64)}`,
    );
    if (!module || isAddressEqual(module, zeroAddress)) return null;
    modules.push(module);
  }
  return { modules, next };
}

/** `VERSION()`, only when the answer is the canonical encoding of a string of at most 32 bytes. */
async function readSafeVersion(
  client: Pick<PublicClient, "request">,
  safe: Address,
  blockNumber?: bigint,
): Promise<string | null> {
  const result = await boundedCall(
    client,
    safe,
    encodeFunctionData({ abi: READ_ABI, functionName: "VERSION" }),
    SAFE_SCALAR_READ_GAS,
    96,
    blockNumber,
  );
  if (!result) return null;
  try {
    const [version] = decodeAbiParameters([{ type: "string" }], result);
    return encodeAbiParameters([{ type: "string" }], [version]) ===
      result.toLowerCase()
      ? version
      : null;
  } catch {
    return null;
  }
}

/**
 * Who controls `authority`, from live chain state alone:
 *
 * - no code is an `eoa`; an exact EIP-7702 designator a `delegated-eoa`;
 * - a `safe` is a recognized proxy runtime whose slot zero names a recognized
 *   singleton with code, agreeing with `masterCopy()`, reporting that
 *   release's exact version, with a well-formed policy: 1 to 50 unique nonzero
 *   owners, a threshold within them, clean guard and fallback handler slots,
 *   and a fallback handler that is contract code (not a delegated EOA);
 * - anything else, or any malformed answer, is a `contract`.
 *
 * Nothing calls through the proxy before its singleton is known, and every
 * such call is a raw, gas- and return-bounded `eth_call`, so a contract cannot
 * pick a URL to fetch. An RPC failure is null (unknown), never an EOA or Safe.
 */
export async function readAuthorityIdentity(
  client: AuthorityClient,
  authority: Address,
  { blockNumber }: AuthorityReadOptions = {},
): Promise<AuthorityIdentity | null> {
  const address = requireAddress(authority, "authority address");
  let code: unknown;
  try {
    code = await client.getCode({ address, blockNumber });
  } catch {
    return null;
  }
  if (code === undefined || code === "0x") return { kind: "eoa" };
  if (!isRuntimeCode(code)) return { kind: "contract" };
  const delegation = eip7702Delegation(code);
  if (delegation) return { kind: "delegated-eoa", delegation };
  const proxyCodeHash = keccak256(code);
  if (
    !RECOGNIZED_SAFE_PROXY_CODE_HASHES.some((hash) => hash === proxyCodeHash)
  ) {
    return { kind: "contract" };
  }
  try {
    const singleton = wordAddress(
      await client.getStorageAt({ address, slot: SINGLETON_SLOT, blockNumber }),
    );
    const release = singleton && safeReleaseOf(singleton);
    if (!singleton || !release) return { kind: "contract" };
    const singletonCode = await client.getCode({
      address: singleton,
      blockNumber,
    });
    if (!isRuntimeCode(singletonCode) || singletonCode === "0x") {
      return { kind: "contract" };
    }
    const masterCopy = await boundedCall(
      client,
      address,
      encodeFunctionData({ abi: READ_ABI, functionName: "masterCopy" }),
      SAFE_SCALAR_READ_GAS,
      32,
      blockNumber,
    );
    const reported = wordAddress(masterCopy);
    if (!reported || !isAddressEqual(reported, singleton)) {
      return { kind: "contract" };
    }
    const [threshold, owners, modulePage, version, guardWord, fallbackWord] =
      await Promise.all([
        readSafeWord(
          client,
          address,
          encodeFunctionData({ abi: READ_ABI, functionName: "getThreshold" }),
          blockNumber,
        ),
        readSafeOwners(client, address, blockNumber),
        readSafeModulePage(client, address, blockNumber),
        readSafeVersion(client, address, blockNumber),
        client.getStorageAt({ address, slot: GUARD_SLOT, blockNumber }),
        client.getStorageAt({ address, slot: FALLBACK_SLOT, blockNumber }),
      ]);
    const guard = wordAddress(guardWord);
    const fallbackHandler = wordAddress(fallbackWord);
    if (
      !owners ||
      !ownerSet(owners) ||
      threshold === null ||
      threshold < 1n ||
      threshold > BigInt(owners.length) ||
      !modulePage ||
      version !== release.version ||
      !guard ||
      !fallbackHandler
    ) {
      return { kind: "contract" };
    }
    const hasFallback = !isAddressEqual(fallbackHandler, zeroAddress);
    const codes = await Promise.all(
      [...owners, ...(hasFallback ? [fallbackHandler] : [])].map((target) =>
        client.getCode({ address: target, blockNumber }),
      ),
    );
    const fallbackCode = hasFallback ? codes[owners.length] : undefined;
    if (
      hasFallback &&
      (!isRuntimeCode(fallbackCode) ||
        fallbackCode === "0x" ||
        isEip7702DelegatedEoaRuntime(fallbackCode))
    ) {
      // A fallback handler runs as code. A delegated EOA's runtime follows its
      // delegate, which can differ by chain behind the same 23-byte marker.
      return { kind: "contract" };
    }
    const { modules, next } = modulePage;
    const lastPage = isAddressEqual(next, SENTINEL);
    return {
      kind: "safe",
      owners,
      threshold: Number(threshold),
      ownersAreEoas: codes.slice(0, owners.length).every(isEoaRuntime),
      hasModules: modules.length > 0 || !lastPage,
      modules: lastPage ? modules : null,
      proxyCodeHash,
      singleton,
      singletonCodeHash: keccak256(singletonCode),
      version: release.version,
      guard,
      fallbackHandler,
      fallbackHandlerCodeHash: fallbackCode ? keccak256(fallbackCode) : null,
    };
  } catch {
    return null;
  }
}

/** Sorted lowercase owners: 1 to MAX_SAFE_OWNERS unique, valid, nonzero addresses. */
function ownerSet(owners: readonly unknown[]): string[] | null {
  if (
    !Array.isArray(owners) ||
    owners.length < 1 ||
    owners.length > MAX_SAFE_OWNERS
  ) {
    return null;
  }
  const normalized: string[] = [];
  for (const owner of owners) {
    if (
      typeof owner !== "string" ||
      !isAddress(owner) ||
      isAddressEqual(owner, zeroAddress)
    ) {
      return null;
    }
    normalized.push(owner.toLowerCase());
  }
  const unique = [...new Set(normalized)].sort();
  return unique.length === normalized.length ? unique : null;
}

function sameOwners(left: readonly unknown[], right: readonly unknown[]) {
  const leftSet = ownerSet(left);
  const rightSet = ownerSet(right);
  return (
    !!leftSet &&
    !!rightSet &&
    leftSet.length === rightSet.length &&
    leftSet.every((owner, index) => owner === rightSet[index])
  );
}

/**
 * The plain Safe policy a cross-chain claim or a same-address replay can
 * stand on: EOA owners, no modules, no guard.
 */
export function isDeployableSafeAuthority(
  identity: AuthorityIdentity,
): identity is SafeAuthorityIdentity {
  return (
    identity.kind === "safe" &&
    identity.ownersAreEoas &&
    !identity.hasModules &&
    isAddressEqual(identity.guard, zeroAddress)
  );
}

function isEoaIdentity(identity: AuthorityIdentity): boolean {
  return identity.kind === "eoa" || identity.kind === "delegated-eoa";
}

/**
 * Whether one authority shows the same policy on two chains: an EOA (plain or
 * delegated, the key is the same) on both, or plain Safes with the same owners,
 * threshold, proxy, release, fallback handler and code. Paired Ethereum and
 * SafeL2 singletons are one release; a shared singleton address must also
 * share its code.
 *
 * For Safes this is the visible policy, not proof of control. A setup hook can
 * plant an owner or module no getter shows, and a Safe made with CREATE can be
 * claimed at the same address on another chain. Pair it with
 * {@link proveSafeCreation}, as {@link readMatchingAuthorityIdentities} and
 * {@link readCrossChainHandleAuthority} do.
 */
export function authorityIdentitiesMatch(
  source: AuthorityIdentity,
  destination: AuthorityIdentity,
): boolean {
  if (isEoaIdentity(source) || isEoaIdentity(destination)) {
    return isEoaIdentity(source) && isEoaIdentity(destination);
  }
  return (
    isDeployableSafeAuthority(source) &&
    isDeployableSafeAuthority(destination) &&
    sameOwners(source.owners, destination.owners) &&
    source.threshold === destination.threshold &&
    source.proxyCodeHash.toLowerCase() ===
      destination.proxyCodeHash.toLowerCase() &&
    safeSingletonsAreEquivalent(source.singleton, destination.singleton) &&
    (!isAddressEqual(source.singleton, destination.singleton) ||
      source.singletonCodeHash.toLowerCase() ===
        destination.singletonCodeHash.toLowerCase()) &&
    source.version === destination.version &&
    isAddressEqual(source.fallbackHandler, destination.fallbackHandler) &&
    source.fallbackHandlerCodeHash?.toLowerCase() ===
      destination.fallbackHandlerCodeHash?.toLowerCase()
  );
}

/**
 * Both chains' identities and whether one authority controls `authority` on
 * both, or null when either is unknown. EOAs match on their key. Safes match
 * only on the same visible policy ({@link authorityIdentitiesMatch}) and a
 * `creation` that proves how the Safe was made ({@link proveSafeCreation});
 * without one, `matches` is false and `creationUnproven` is true.
 */
export async function readMatchingAuthorityIdentities({
  sourceClient,
  destinationClient,
  authority,
  sourceBlockNumber,
  destinationBlockNumber,
  creation,
}: {
  sourceClient: AuthorityClient;
  destinationClient: AuthorityClient;
  authority: Address;
  sourceBlockNumber?: bigint;
  destinationBlockNumber?: bigint;
  /** The Safe's creation record, from `fetchSafeCreation` on the chain where it was made. */
  creation?: SafeCreation | null;
}): Promise<{
  source: AuthorityIdentity;
  destination: AuthorityIdentity;
  matches: boolean;
  creationUnproven: boolean;
} | null> {
  const [source, destination] = await Promise.all([
    readAuthorityIdentity(sourceClient, authority, {
      blockNumber: sourceBlockNumber,
    }),
    readAuthorityIdentity(destinationClient, authority, {
      blockNumber: destinationBlockNumber,
    }),
  ]);
  if (!source || !destination) return null;
  const visible = authorityIdentitiesMatch(source, destination);
  const creationUnproven =
    visible &&
    source.kind === "safe" &&
    !(creation && proveSafeCreation(creation, authority).valid);
  return {
    source,
    destination,
    matches: visible && !creationUnproven,
    creationUnproven,
  };
}

export type CrossChainHandleAuthorityStatus =
  | "valid-local"
  | "valid-eoa"
  | "valid-safe"
  | "missing-mainnet-safe"
  | "source-contract"
  | "mainnet-contract"
  | "authority-mismatch"
  | "unproven-creation"
  | "unsafe-safe-policy"
  | "contract-owner"
  | "unknown";

export type CrossChainHandleAuthority = {
  status: CrossChainHandleAuthorityStatus;
  allowed: boolean;
  source: AuthorityIdentity | null;
  mainnet: AuthorityIdentity | null;
};

function handleVerdict(
  status: CrossChainHandleAuthorityStatus,
  source: AuthorityIdentity | null,
  mainnet: AuthorityIdentity | null,
): CrossChainHandleAuthority {
  return {
    status,
    allowed:
      status === "valid-local" ||
      status === "valid-eoa" ||
      status === "valid-safe",
    source,
    mainnet,
  };
}

async function addressesAreEoas(
  client: CodeClient,
  addresses: readonly Address[],
  blockNumber?: bigint,
): Promise<boolean | null> {
  try {
    const codes = await Promise.all(
      addresses.map((address) => client.getCode({ address, blockNumber })),
    );
    return codes.every(isEoaRuntime);
  } catch {
    return null;
  }
}

/**
 * Whether `authority`, the live owner or operator of a project on
 * `sourceChainId`, may publish its Ethereum handle. On Ethereum it may. From
 * another chain it must be the same EOA on Ethereum, or a plain Safe there with
 * the same policy whose `creation` proves how it was made
 * ({@link proveSafeCreation}); without that proof it is `unproven-creation`.
 * A source Safe not yet deployed on Ethereum is `missing-mainnet-safe`, which a
 * same-address deployment can fix; every other doubt is denied, an unreadable
 * chain as `unknown`.
 */
export async function readCrossChainHandleAuthority({
  sourceChainId,
  sourceClient,
  mainnetClient,
  authority,
  sourceBlockNumber,
  mainnetBlockNumber,
  creation,
}: {
  sourceChainId: number;
  sourceClient: AuthorityClient;
  mainnetClient?: AuthorityClient;
  authority: Address;
  sourceBlockNumber?: bigint;
  mainnetBlockNumber?: bigint;
  /** The Safe's creation record, from `fetchSafeCreation` on `sourceChainId`. */
  creation?: SafeCreation | null;
}): Promise<CrossChainHandleAuthority> {
  if (sourceChainId === 1) return handleVerdict("valid-local", null, null);
  if (!mainnetClient) return handleVerdict("unknown", null, null);
  const [source, mainnet] = await Promise.all([
    readAuthorityIdentity(sourceClient, authority, {
      blockNumber: sourceBlockNumber,
    }),
    readAuthorityIdentity(mainnetClient, authority, {
      blockNumber: mainnetBlockNumber,
    }),
  ]);
  const verdict = (status: CrossChainHandleAuthorityStatus) =>
    handleVerdict(status, source, mainnet);
  if (!source || !mainnet) return verdict("unknown");
  if (source.kind === "contract") return verdict("source-contract");
  if (source.kind !== "safe") {
    if (isEoaIdentity(mainnet)) return verdict("valid-eoa");
    return verdict(
      mainnet.kind === "contract" ? "mainnet-contract" : "authority-mismatch",
    );
  }
  if (!source.ownersAreEoas) return verdict("contract-owner");
  if (!isDeployableSafeAuthority(source)) return verdict("unsafe-safe-policy");
  if (mainnet.kind === "delegated-eoa") {
    // The designator occupies the address, so no Safe can be deployed there.
    return verdict("authority-mismatch");
  }
  if (mainnet.kind === "eoa") {
    const ownersAreEoas = await addressesAreEoas(
      mainnetClient,
      source.owners,
      mainnetBlockNumber,
    );
    if (ownersAreEoas === null) return verdict("unknown");
    return verdict(ownersAreEoas ? "missing-mainnet-safe" : "contract-owner");
  }
  if (mainnet.kind === "contract") return verdict("mainnet-contract");
  if (!mainnet.ownersAreEoas) return verdict("contract-owner");
  if (!isDeployableSafeAuthority(mainnet)) {
    return verdict("unsafe-safe-policy");
  }
  if (!authorityIdentitiesMatch(source, mainnet)) {
    return verdict("authority-mismatch");
  }
  return verdict(
    creation && proveSafeCreation(creation, authority).valid
      ? "valid-safe"
      : "unproven-creation",
  );
}

// ── Same-address Safe deployment ─────────────────────────────────────────────

/** A Safe's original CREATE2 inputs, as its transaction service records them. */
export type SafeCreation = {
  factory: Address;
  singleton: Address;
  initializer: Hex;
  saltNonce: bigint;
};

export type SafeCreationValidation =
  | {
      valid: true;
      owners: Address[];
      threshold: number;
      fallbackHandler: Address;
    }
  | {
      valid: false;
      reason:
        | "malformed-creation"
        | "unrecognized-deployment"
        | "unsafe-current-policy"
        | "malformed-initializer"
        | "initializer-policy-mismatch"
        | "unsafe-initializer";
    };

/** The exact `setupToL2(l2Singleton)` naming `singleton`'s SafeL2 pair. */
function isExactSetupToL2Call(data: Hex, singleton: Address): boolean {
  const pair = SAFE_L1_L2_SINGLETON_PAIRS.find(([l1]) =>
    isAddressEqual(l1, singleton),
  );
  return (
    !!pair &&
    data.toLowerCase() ===
      encodeFunctionData({
        abi: SAFE_TO_L2_SETUP_ABI,
        functionName: "setupToL2",
        args: [pair[1]],
      }).toLowerCase()
  );
}

type SafeSetupArgs = readonly [
  readonly Address[],
  bigint,
  Address,
  Hex,
  Address,
  Address,
  bigint,
  Address,
];

/** Why `creation` is malformed or not one recognized Safe release, or null. */
function safeCreationShapeRefusal(
  creation: SafeCreation,
): "malformed-creation" | "unrecognized-deployment" | null {
  if (
    !creation ||
    typeof creation.factory !== "string" ||
    typeof creation.singleton !== "string" ||
    !isAddress(creation.factory) ||
    !isAddress(creation.singleton) ||
    !isHexBytes(creation.initializer) ||
    uint256(creation.saltNonce) === null ||
    typeof creation.saltNonce !== "bigint"
  ) {
    return "malformed-creation";
  }
  if (!isRecognizedSafeDeployment(creation.factory, creation.singleton)) {
    return "unrecognized-deployment";
  }
  return null;
}

/**
 * `setup`'s arguments when `initializer` is exactly their canonical encoding,
 * with a valid owner set and threshold; null otherwise. A noncanonical
 * encoding, trailing bytes included, could hide a policy.
 */
function canonicalSafeSetupArgs(initializer: Hex): SafeSetupArgs | null {
  let args: SafeSetupArgs;
  try {
    args = decodeFunctionData({ abi: SAFE_SETUP_ABI, data: initializer }).args;
    if (
      encodeFunctionData({
        abi: SAFE_SETUP_ABI,
        functionName: "setup",
        args,
      }).toLowerCase() !== initializer.toLowerCase()
    ) {
      return null;
    }
  } catch {
    return null;
  }
  const [owners, threshold] = args;
  if (!ownerSet(owners) || threshold < 1n || threshold > BigInt(owners.length)) {
    return null;
  }
  return args;
}

/**
 * Whether `setup` runs no delegatecall hook but the exact SafeToL2Setup call
 * pairing `singleton`, and pays no one.
 */
function safeSetupIsInert(args: SafeSetupArgs, singleton: Address): boolean {
  const [, , to, data, , paymentToken, payment, paymentReceiver] = args;
  const hook = isAddressEqual(to, SAFE_TO_L2_SETUP_ADDRESS)
    ? isExactSetupToL2Call(data, singleton)
    : isAddressEqual(to, zeroAddress) && data === "0x";
  return (
    hook &&
    isAddressEqual(paymentToken, zeroAddress) &&
    payment === 0n &&
    (isAddressEqual(paymentReceiver, zeroAddress) ||
      isAddressEqual(paymentReceiver, SAFE_CANONICAL_PAYMENT_RECEIVER))
  );
}

/**
 * Whether replaying `creation` reproduces `current`, the Safe's live policy,
 * and nothing else: a recognized factory and singleton of its release, a
 * canonical `setup` with today's owners, threshold and fallback handler, no
 * setup payment, and no delegatecall hook but the exact SafeToL2Setup call.
 * The live Safe must be plain (EOA owners, no modules, no guard).
 */
export function validateSafeCreationForCurrentPolicy(
  creation: SafeCreation,
  current: SafeAuthorityIdentity,
): SafeCreationValidation {
  const refuse = (
    reason: Extract<SafeCreationValidation, { valid: false }>["reason"],
  ): SafeCreationValidation => ({ valid: false, reason });
  const shape = safeCreationShapeRefusal(creation);
  if (shape) return refuse(shape);
  if (
    !isDeployableSafeAuthority(current) ||
    !RECOGNIZED_SAFE_PROXY_CODE_HASHES.some(
      (hash) => hash === current.proxyCodeHash.toLowerCase(),
    ) ||
    safeReleaseOf(current.singleton)?.version !== current.version ||
    (isAddressEqual(current.fallbackHandler, zeroAddress)
      ? current.fallbackHandlerCodeHash !== null
      : current.fallbackHandlerCodeHash === null)
  ) {
    return refuse("unsafe-current-policy");
  }
  if (!safeSingletonsAreEquivalent(creation.singleton, current.singleton)) {
    return refuse("initializer-policy-mismatch");
  }
  const args = canonicalSafeSetupArgs(creation.initializer);
  if (!args) return refuse("malformed-initializer");
  const [owners, thresholdRaw, , , fallbackHandler] = args;
  if (
    thresholdRaw !== BigInt(current.threshold) ||
    !sameOwners(owners, current.owners) ||
    !isAddressEqual(fallbackHandler, current.fallbackHandler)
  ) {
    return refuse("initializer-policy-mismatch");
  }
  if (!safeSetupIsInert(args, creation.singleton)) {
    return refuse("unsafe-initializer");
  }
  return {
    valid: true,
    owners: owners.map((owner) => getAddress(owner)),
    threshold: Number(thresholdRaw),
    fallbackHandler: getAddress(fallbackHandler),
  };
}

export type SafeCreationProof =
  | {
      valid: true;
      /** The policy the Safe was created with, which its owners may since have changed. */
      owners: Address[];
      threshold: number;
      fallbackHandler: Address;
    }
  | {
      valid: false;
      reason:
        | "malformed-creation"
        | "unrecognized-deployment"
        | "malformed-initializer"
        | "unsafe-initializer"
        | "address-mismatch";
    };

/**
 * Whether `creation` is how `safe` was created, so that no one but its owners
 * can hold the same address on another chain:
 *
 * - a recognized release's factory and singleton;
 * - the exact canonical `setup`, with no delegatecall hook but the exact
 *   SafeToL2Setup call and no payment, so it planted no owner or module that
 *   `getOwners` or `getModulesPaginated` cannot show;
 * - its CREATE2 address (the factory, keccak256(keccak256(initializer) ‖
 *   saltNonce), and the release's proxy creation code with the singleton) is
 *   `safe`.
 *
 * The address then pins those inputs on every chain where the factory has its
 * canonical code. A Safe made with CREATE (1.3.0's `createProxy`) has no such
 * proof: its address depends only on the factory's nonce, which anyone can take
 * on another chain. Read `creation` with `fetchSafeCreation` from the chain
 * where the Safe was made.
 */
export function proveSafeCreation(
  creation: SafeCreation,
  safe: Address,
): SafeCreationProof {
  const refuse = (
    reason: Extract<SafeCreationProof, { valid: false }>["reason"],
  ): SafeCreationProof => ({ valid: false, reason });
  if (typeof safe !== "string" || !isAddress(safe)) {
    return refuse("malformed-creation");
  }
  const shape = safeCreationShapeRefusal(creation);
  if (shape) return refuse(shape);
  const args = canonicalSafeSetupArgs(creation.initializer);
  if (!args) return refuse("malformed-initializer");
  if (!safeSetupIsInert(args, creation.singleton)) {
    return refuse("unsafe-initializer");
  }
  const created = getContractAddress({
    opcode: "CREATE2",
    from: getAddress(creation.factory),
    salt: keccak256(
      encodePacked(
        ["bytes32", "uint256"],
        [keccak256(creation.initializer), creation.saltNonce],
      ),
    ),
    bytecode: concatHex([
      proxyCreationCodeOf(creation.factory)!,
      toHex(BigInt(creation.singleton), { size: 32 }),
    ]),
  });
  if (!isAddressEqual(created, safe)) return refuse("address-mismatch");
  const [owners, threshold, , , fallbackHandler] = args;
  return {
    valid: true,
    owners: owners.map((owner) => getAddress(owner)),
    threshold: Number(threshold),
    fallbackHandler: getAddress(fallbackHandler),
  };
}

export type SafeProxyFactoryCall = {
  target: Address;
  data: Hex;
  abi: typeof SAFE_CREATE_ABI;
  functionName: "createProxyWithNonce";
  args: readonly [Address, Hex, bigint];
};

/** The exact factory call that reproduces a Safe's CREATE2 address. */
export function buildSafeProxyFactoryCall(
  creation: SafeCreation,
): SafeProxyFactoryCall {
  if (!isRecognizedSafeDeployment(creation.factory, creation.singleton)) {
    throw new Error(
      `Factory ${String(creation.factory)} and singleton ${String(creation.singleton)} are not one recognized Safe release.`,
    );
  }
  const args = [
    getAddress(creation.singleton),
    creation.initializer,
    creation.saltNonce,
  ] as const;
  return {
    target: getAddress(creation.factory),
    abi: SAFE_CREATE_ABI,
    functionName: "createProxyWithNonce",
    args,
    data: encodeFunctionData({
      abi: SAFE_CREATE_ABI,
      functionName: "createProxyWithNonce",
      args,
    }),
  };
}

export type SafeSameAddressDeploymentRefusal =
  | Extract<SafeCreationValidation, { valid: false }>["reason"]
  | "rpc-error"
  | "not-a-safe"
  | "address-occupied"
  | "factory-unavailable"
  | "factory-mismatch"
  | "singleton-unavailable"
  | "singleton-mismatch"
  | "setup-library-mismatch"
  | "contract-owner"
  | "fallback-handler-unavailable"
  | "delegated-fallback-handler"
  | "fallback-handler-mismatch"
  | "simulation-failed"
  | "unexpected-address";

export type SafeSameAddressDeployment =
  | {
      valid: true;
      call: SafeProxyFactoryCall;
      /** The live source Safe the deployment reproduces. */
      source: SafeAuthorityIdentity;
    }
  | { valid: false; reason: SafeSameAddressDeploymentRefusal };

/**
 * Prove, before anything is signed, that deploying `creation` on the
 * destination chain puts the source Safe's live policy at `safe`:
 *
 * - the source Safe is plain and `creation` reproduces it exactly
 *   ({@link validateSafeCreationForCurrentPolicy});
 * - `safe` has no code on the destination, an EIP-7702 designator included;
 * - the factory and singleton there have the source chain's code, the
 *   singleton the source Safe's own when it is the same address, and a
 *   SafeToL2Setup hook the canonical library code;
 * - every owner is an EOA there, and a fallback handler is the same contract
 *   code, not a delegated EOA;
 * - a raw, bounded `eth_call` of the factory call returns `safe`.
 *
 * Re-run it before the wallet signs, and read both chains' identities again
 * after the receipt ({@link readMatchingAuthorityIdentities}).
 */
export async function prepareSafeSameAddressDeployment({
  sourceClient,
  destinationClient,
  creation,
  safe,
  from,
}: {
  sourceClient: AuthorityClient;
  destinationClient: AuthorityClient;
  creation: SafeCreation;
  safe: Address;
  /** The account the simulation runs as: the wallet that will send it. */
  from: Address;
}): Promise<SafeSameAddressDeployment> {
  const expected = requireAddress(safe, "Safe address");
  const sender = requireAddress(from, "deployment sender");
  const refuse = (
    reason: SafeSameAddressDeploymentRefusal,
  ): SafeSameAddressDeployment => ({ valid: false, reason });
  const [source, destination] = await Promise.all([
    readAuthorityIdentity(sourceClient, expected),
    readAuthorityIdentity(destinationClient, expected),
  ]);
  if (!source || !destination) return refuse("rpc-error");
  if (source.kind !== "safe") return refuse("not-a-safe");
  const validation = validateSafeCreationForCurrentPolicy(creation, source);
  if (!validation.valid) return refuse(validation.reason);
  if (destination.kind !== "eoa") return refuse("address-occupied");

  // The validation above decoded this exact initializer.
  const usesHook = isAddressEqual(
    decodeFunctionData({ abi: SAFE_SETUP_ABI, data: creation.initializer })
      .args[2],
    SAFE_TO_L2_SETUP_ADDRESS,
  );
  const hasFallback = !isAddressEqual(source.fallbackHandler, zeroAddress);
  let codes: unknown[];
  let sourceCodes: unknown[];
  try {
    [codes, sourceCodes] = await Promise.all([
      Promise.all(
        [
          creation.factory,
          creation.singleton,
          SAFE_TO_L2_SETUP_ADDRESS,
          ...(hasFallback ? [source.fallbackHandler] : []),
          ...source.owners,
        ].map((address) => destinationClient.getCode({ address })),
      ),
      Promise.all(
        [creation.factory, creation.singleton].map((address) =>
          sourceClient.getCode({ address }),
        ),
      ),
    ]);
  } catch {
    return refuse("rpc-error");
  }
  if (
    [...codes, ...sourceCodes].some(
      (code) => code !== undefined && !isRuntimeCode(code),
    )
  ) {
    return refuse("rpc-error");
  }
  const [factoryCode, singletonCode, hookCode] = codes as (Hex | undefined)[];
  const fallbackCode = hasFallback ? (codes[3] as Hex | undefined) : undefined;
  const ownerCodes = codes.slice(hasFallback ? 4 : 3);
  const [sourceFactoryCode, sourceSingletonCode] = sourceCodes as (
    | Hex
    | undefined
  )[];
  if (!factoryCode || factoryCode === "0x")
    return refuse("factory-unavailable");
  if (factoryCode.toLowerCase() !== sourceFactoryCode?.toLowerCase()) {
    return refuse("factory-mismatch");
  }
  if (!singletonCode || singletonCode === "0x") {
    return refuse("singleton-unavailable");
  }
  if (
    singletonCode.toLowerCase() !== sourceSingletonCode?.toLowerCase() ||
    (isAddressEqual(creation.singleton, source.singleton) &&
      keccak256(singletonCode) !== source.singletonCodeHash.toLowerCase())
  ) {
    return refuse("singleton-mismatch");
  }
  if (
    usesHook &&
    (!hookCode ||
      hookCode === "0x" ||
      keccak256(hookCode) !== SAFE_TO_L2_SETUP_CODE_HASH)
  ) {
    return refuse("setup-library-mismatch");
  }
  if (!ownerCodes.every(isEoaRuntime)) return refuse("contract-owner");
  if (hasFallback) {
    if (!fallbackCode || fallbackCode === "0x") {
      return refuse("fallback-handler-unavailable");
    }
    if (isEip7702DelegatedEoaRuntime(fallbackCode)) {
      return refuse("delegated-fallback-handler");
    }
    if (
      keccak256(fallbackCode) !== source.fallbackHandlerCodeHash?.toLowerCase()
    ) {
      return refuse("fallback-handler-mismatch");
    }
  }
  const call = buildSafeProxyFactoryCall(creation);
  let result: Hex;
  try {
    result = await simulateStateChangingTransaction(destinationClient, {
      from: sender,
      to: call.target,
      data: call.data,
      gas: SAFE_DEPLOY_SIMULATION_GAS,
      maxReturnBytes: 32,
    });
  } catch {
    return refuse("simulation-failed");
  }
  const deployed = result.length === 66 ? wordAddress(result) : null;
  if (!deployed || !isAddressEqual(deployed, expected)) {
    return refuse("unexpected-address");
  }
  return { valid: true, call, source };
}

// ── MultiSend ────────────────────────────────────────────────────────────────

/** One call of a MultiSendCallOnly batch: always a plain CALL. */
export type MultiSendCall = { to: Address; data: Hex; value: bigint };

/**
 * The packed `transactions` bytes: per call, `uint8 operation (0) ‖ address to
 * ‖ uint256 value ‖ uint256 data length ‖ data`. Throws naming the first call
 * that is not a valid address, whole hex bytes and a uint256 value.
 */
export function packMultiSend(
  calls: readonly { to: Address; data: Hex; value?: bigint }[],
): Hex {
  return concatHex(
    calls.map((call, index) => {
      const value = uint256(call?.value ?? 0n);
      if (
        typeof call?.to !== "string" ||
        !isAddress(call.to) ||
        !isHexBytes(call.data) ||
        value === null
      ) {
        throw new Error(`Batch call ${index + 1} is not a valid call.`);
      }
      return encodePacked(
        ["uint8", "address", "uint256", "uint256", "bytes"],
        [0, call.to, value, BigInt(size(call.data)), call.data],
      );
    }),
  );
}

/** `multiSend(transactions)` calldata for at least one call. */
export function encodeMultiSend(
  calls: readonly { to: Address; data: Hex; value?: bigint }[],
): Hex {
  if (!calls.length) throw new Error("A batch needs at least one call.");
  return encodeFunctionData({
    abi: MULTI_SEND_ABI,
    functionName: "multiSend",
    args: [packMultiSend(calls)],
  });
}

/**
 * The calls in `multiSend` calldata, or null unless the bytes are exactly a
 * canonical `multiSend(bytes)` of one or more whole CALL entries. A
 * DELEGATECALL entry is null: MultiSendCallOnly reverts on it.
 */
export function decodeMultiSend(data: unknown): MultiSendCall[] | null {
  if (!isHexBytes(data)) return null;
  let packed: Hex;
  try {
    const decoded = decodeFunctionData({ abi: MULTI_SEND_ABI, data });
    packed = decoded.args[0];
    if (
      encodeFunctionData({
        abi: MULTI_SEND_ABI,
        functionName: "multiSend",
        args: [packed],
      }).toLowerCase() !== data.toLowerCase()
    ) {
      return null;
    }
  } catch {
    return null;
  }
  const bytes = packed.slice(2).toLowerCase();
  const calls: MultiSendCall[] = [];
  let offset = 0;
  while (offset < bytes.length) {
    // 1 + 20 + 32 + 32 header bytes before the call data.
    if (
      bytes.length - offset < 170 ||
      bytes.slice(offset, offset + 2) !== "00"
    ) {
      return null;
    }
    const length = BigInt(`0x${bytes.slice(offset + 106, offset + 170)}`);
    const end = BigInt(offset + 170) + length * 2n;
    if (end > BigInt(bytes.length)) return null;
    calls.push({
      to: getAddress(`0x${bytes.slice(offset + 2, offset + 42)}`),
      value: BigInt(`0x${bytes.slice(offset + 42, offset + 106)}`),
      data: `0x${bytes.slice(offset + 170, Number(end))}`,
    });
    offset = Number(end);
  }
  return calls.length ? calls : null;
}

/** The calls of a Safe transaction that DELEGATECALLs MultiSendCallOnly, else null. */
export function multiSendCallsOf(tx: {
  to: unknown;
  data: unknown;
  operation: unknown;
}): MultiSendCall[] | null {
  return Number(tx?.operation) === 1 &&
    typeof tx.to === "string" &&
    isAddress(tx.to) &&
    isAddressEqual(tx.to, MULTI_SEND_CALL_ONLY)
    ? decodeMultiSend(tx.data)
    : null;
}
