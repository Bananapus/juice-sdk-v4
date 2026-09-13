import {
  concatHex,
  decodeFunctionData,
  decodeFunctionResult,
  encodeFunctionData,
  encodeFunctionResult,
  encodePacked,
  getAddress,
  getContractAddress,
  isAddress,
  isAddressEqual,
  keccak256,
  parseAbi,
  toHex,
  zeroAddress,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";

// Canonical Safe 1.4.1 deployments, from safe-global/safe-deployments.
// A fixed singleton and initializer preserve CREATE2 addresses across chains.
export const SAFE_FACTORY = getAddress(
  "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67",
);
export const SAFE_SINGLETON = getAddress(
  "0x41675C099F32341bf84BFc5382aF534df5C7461a",
);
export const SAFE_FALLBACK = getAddress(
  "0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99",
);
export const MULTICALL3 = getAddress(
  "0xcA11bde05977b3631167028862bE2a173976CA11",
);
export const MAX_SAFE_OWNERS = 50;

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
const PROXY_CODE_HASH =
  "0xd7d408ebcd99b2b70be43e20253d6d92a8ea8fab29bd3be7f55b10032331fb4c";
const SENTINEL = "0x0000000000000000000000000000000000000001" as const;
const SINGLETON_SLOT = toHex(0n, { size: 32 });
const GUARD_SLOT =
  "0x4a204f620c8c5ccdca3fd54d003badd85ba500436a431f0cbda4f558c93c34c8" as const;
const FALLBACK_SLOT =
  "0x6c9a6c4a39284e37ed1cf53d337577d14212a4870fb976a4366c693b939918d5" as const;

export const SAFE_CREATE_ABI = parseAbi([
  "function proxyCreationCode() pure returns (bytes)",
  "function createProxyWithNonce(address singleton, bytes initializer, uint256 saltNonce) returns (address proxy)",
  "function setup(address[] owners,uint256 threshold,address to,bytes data,address fallbackHandler,address paymentToken,uint256 payment,address paymentReceiver)",
]);
export const CREATE_BATCH_ABI = parseAbi([
  "function aggregate3Value((address target,bool allowFailure,uint256 value,bytes callData)[] calls) payable returns ((bool success,bytes returnData)[] returnData)",
]);
const READ_ABI = parseAbi([
  "function masterCopy() view returns (address)",
  "function VERSION() view returns (string)",
  "function getThreshold() view returns (uint256)",
  "function getOwners() view returns (address[])",
  "function getModulesPaginated(address start,uint256 pageSize) view returns (address[],address)",
]);

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

async function boundedCall(
  client: PublicClient,
  address: Address,
  data: Hex,
  gas: bigint,
  maxBytes: number,
  blockNumber?: bigint,
): Promise<Hex> {
  // Raw RPC cannot follow a contract-selected CCIP/OffchainLookup URL.
  const result = await client.request({
    method: "eth_call",
    params: [
      { to: address, data, gas: toHex(gas) },
      blockNumber === undefined ? "latest" : toHex(blockNumber),
    ],
  });
  if (
    typeof result !== "string" ||
    !/^0x(?:[\da-f]{2})*$/i.test(result) ||
    result.length > 2 + maxBytes * 2
  ) {
    throw new Error("Invalid or oversized Safe policy response.");
  }
  return result;
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
    const call = (data: Hex, maxBytes: number, gas = 100_000n) =>
      boundedCall(client, plan.address, data, gas, maxBytes, blockNumber);
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
