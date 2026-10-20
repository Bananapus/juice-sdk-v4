import {
  type Address,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
  decodeAbiParameters,
  decodeFunctionData,
  encodeAbiParameters,
  encodeFunctionData,
  erc20Abi,
  erc721Abi,
  isAddress,
  parseEventLogs,
  zeroAddress,
} from "viem";
import {
  jb721TiersHookStoreAbi,
  jbMultiTerminalAbi,
} from "../generated/juicebox.js";
import type { JBChainId } from "../types.js";
import { createHookMetadata, hookMetadataId } from "../utils/hook.js";
import {
  build721CashOutMetadata,
  buildCashOutTx,
  type V6CashOutTxRequest,
} from "./cashOut.js";
import { effectiveTierPrice } from "./nft.js";
import {
  getProjectNftInventory,
  type ProjectDefifaInventory,
} from "./nftInventory.js";
import { buildPayTx, type V6PayTxRequest } from "./pay.js";
import { resolvePaymentTerminal } from "./terminals.js";
import { defifaDeployments } from "./defifaDeployments.js";
import {
  RelayrDestinationRevertedError,
  verifyRelayrDestination,
} from "../review/relayr.js";
import {
  parseReviewedWriteRecoveryRecord,
  verifyReviewedWriteReceipt,
} from "../review/writeRecovery.js";

// @ballkidz/defifa 1.0.2 native getters. Provenance belongs to nftInventory.
const defifaActionAbi = [
  {
    name: "defaultAttestationDelegate",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    name: "getTierDelegateOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ type: "address" }, { type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    name: "gamePhaseReporter",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    name: "noContestTriggeredFor",
    type: "function",
    stateMutability: "view",
    inputs: [{ type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
  {
    name: "tokensClaimableFor",
    type: "function",
    stateMutability: "view",
    inputs: [{ type: "uint256[]" }],
    outputs: [{ type: "uint256" }, { type: "uint256" }],
  },
  {
    name: "DEFIFA_TOKEN",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    name: "BASE_PROTOCOL_TOKEN",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const;

/** Adapter RPC/review budget, not a native protocol supply or metadata limit. */
export const MAX_DEFIFA_ACTION_NFTS = 128;

/** Phase-only display eligibility; preparation still authenticates current rules. */
export function defifaPhaseAllowsPay(phase: number): boolean {
  return phase === 1;
}

/** NO_CONTEST additionally requires native activation, checked by preparation. */
export function defifaPhaseAllowsCashOut(phase: number): boolean {
  return phase === 1 || phase === 2 || phase === 4 || phase === 5;
}

function assertActionSize(count: number): void {
  if (count < 1 || count > MAX_DEFIFA_ACTION_NFTS)
    throw new Error(
      `Defifa preparations accept 1–${MAX_DEFIFA_ACTION_NFTS} NFTs per action.`,
    );
}

function address(value: Address, label: string, allowZero = false): Address {
  if (!isAddress(value) || (!allowZero && value === zeroAddress))
    throw new Error(
      `${label} must be a valid${allowZero ? "" : " nonzero"} address.`,
    );
  return value;
}

function sameAddress(left: Address, right: Address): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

/**
 * Native Defifa pay payload: (address attestationDelegate, uint16[] tierIds).
 * Resolve metadataIdTarget from an authenticated inventory's CODE_ORIGIN, never
 * its clone address. This pure encoder validates inputs, not contract identity.
 * Zero delegates through the game's configured default, or to the beneficiary.
 * For a self-payment this updates delegation for ALL holdings in selected tiers.
 * Generic build721PayMetadata is incompatible: its true boolean becomes address 1.
 */
export function buildDefifaPayMetadata({
  metadataIdTarget,
  tierIdsToMint,
  attestationDelegate = zeroAddress,
}: {
  metadataIdTarget: Address;
  tierIdsToMint: readonly bigint[];
  attestationDelegate?: Address;
}): Hex {
  address(metadataIdTarget, "Defifa metadataIdTarget");
  address(attestationDelegate, "Defifa attestation delegate", true);
  if (
    tierIdsToMint.length === 0 ||
    tierIdsToMint.some(
      (id, index) =>
        typeof id !== "bigint" ||
        id < 1n ||
        id > 65535n ||
        (index > 0 && id < tierIdsToMint[index - 1]!),
    )
  ) {
    throw new Error(
      "Defifa tier IDs must be nonempty, ascending positive uint16 values; repeats mint multiple NFTs.",
    );
  }
  return createHookMetadata(
    [hookMetadataId(metadataIdTarget, "pay")],
    [
      encodeAbiParameters(
        [{ type: "address" }, { type: "uint16[]" }],
        [attestationDelegate, tierIdsToMint.map(Number)],
      ),
    ],
  );
}

export interface DefifaActionArgs {
  chainId: JBChainId;
  projectId: bigint;
  /** The actual sender, also the NFT holder for cash-outs/transfers. */
  account: Address;
  /** Bind preparation to the collection shown in the review. */
  expectedHook?: Address;
}

async function actionContext(
  client: PublicClient,
  args: DefifaActionArgs,
  blockNumber?: bigint,
) {
  address(args.account, "Defifa account");
  if (args.expectedHook) address(args.expectedHook, "Defifa expected hook");
  if (args.projectId <= 0n)
    throw new Error("Defifa projectId must be positive.");
  const inventory = await getProjectNftInventory(client, {
    chainId: args.chainId,
    projectId: args.projectId,
    tierLimit: 1,
    blockNumber,
  });
  if (inventory?.protocol !== "defifa")
    throw new Error("Project is not an authenticated native Defifa game.");
  if (args.expectedHook && !sameAddress(inventory.hook, args.expectedHook))
    throw new Error("Defifa collection changed since review.");
  const snapshot = {
    ...client,
    readContract: (parameters: Parameters<PublicClient["readContract"]>[0]) =>
      client.readContract({
        ...parameters,
        blockNumber: inventory.blockNumber,
      }),
  } as PublicClient;
  return { inventory, snapshot };
}

async function paymentTerminal(
  snapshot: PublicClient,
  args: DefifaActionArgs,
  inventory: ProjectDefifaInventory,
): Promise<Address> {
  const terminal = await resolvePaymentTerminal(snapshot, {
    chainId: args.chainId,
    projectId: args.projectId,
    token: inventory.pricing.token,
  });
  if (terminal.isRouter)
    throw new Error("Defifa settlement token has no primary terminal.");
  const context = await snapshot.readContract({
    address: terminal.address,
    abi: jbMultiTerminalAbi,
    functionName: "accountingContextForTokenOf",
    args: [args.projectId, inventory.pricing.token],
  });
  if (
    !sameAddress(context.token, inventory.pricing.token) ||
    Number(context.currency) !== inventory.pricing.currency ||
    Number(context.decimals) !== inventory.pricing.decimals
  )
    throw new Error(
      "Defifa terminal accounting does not match native pricing.",
    );
  return terminal.address;
}

export interface PreparedDefifaPay {
  inventory: ProjectDefifaInventory;
  transaction: V6PayTxRequest;
  amount: bigint;
  /** Selected-tier review evidence. Unit prices include the native discount. */
  selectedTiers: { tierId: bigint; count: bigint; unitPrice: bigint }[];
  /** Encoded value; zero preserves the native fallback rule. */
  attestationDelegate: Address;
  /** Shared effective delegate, or null when a gift preserves different tier delegates. */
  effectiveAttestationDelegate: Address | null;
  /** Native effective delegation, including existing recipient preferences on gifts. */
  effectiveDelegates: { tierId: bigint; delegate: Address }[];
}

/**
 * Fresh native identity, MINT phase, selected supply and exact tier cost at one
 * block. Re-run after review and compare the entire request before execution.
 * ERC20 payments need allowance; after approval, simulate this EXACT request
 * with account before sending. Preparation does not grant execution authority.
 * Donations are separate addToBalanceOf calls: native Defifa rejects overpayment.
 */
export async function prepareDefifaPay(
  client: PublicClient,
  args: DefifaActionArgs & {
    tierIdsToMint: readonly bigint[];
    beneficiary?: Address;
    attestationDelegate?: Address;
    memo?: string;
  },
): Promise<PreparedDefifaPay> {
  assertActionSize(args.tierIdsToMint.length);
  args = { ...args, tierIdsToMint: [...args.tierIdsToMint] };
  const beneficiary = address(
    args.beneficiary ?? args.account,
    "Defifa beneficiary",
  );
  const attestationDelegate = args.attestationDelegate ?? zeroAddress;
  // Validate before any RPC. The real metadata target comes from fresh identity.
  buildDefifaPayMetadata({
    metadataIdTarget: beneficiary,
    tierIdsToMint: args.tierIdsToMint,
    attestationDelegate,
  });
  const { inventory, snapshot } = await actionContext(client, args);
  if (
    !defifaPhaseAllowsPay(inventory.phase) ||
    inventory.ruleset.metadata.pausePay ||
    !inventory.ruleset.metadata.useDataHookForPay
  )
    throw new Error("Defifa NFT entry is not open.");
  const counts = new Map<bigint, bigint>();
  for (const tierId of args.tierIdsToMint)
    counts.set(tierId, (counts.get(tierId) ?? 0n) + 1n);
  const [terminal, configuredDelegate, selectedTiers] = await Promise.all([
    paymentTerminal(snapshot, args, inventory),
    snapshot.readContract({
      address: inventory.hook,
      abi: defifaActionAbi,
      functionName: "defaultAttestationDelegate",
    }),
    Promise.all(
      [...counts].map(async ([tierId, count]) => {
        const tier = await snapshot.readContract({
          address: inventory.store,
          abi: jb721TiersHookStoreAbi,
          functionName: "tierOf",
          args: [inventory.hook, tierId, false],
        });
        if (BigInt(tier.id) !== tierId || BigInt(tier.remainingSupply) < count)
          throw new Error(
            `Defifa tier ${tierId} is unavailable for the selected quantity.`,
          );
        return {
          tierId,
          count,
          unitPrice: effectiveTierPrice(tier.price, tier.discountPercent),
        };
      }),
    ),
  ]);
  const amount = selectedTiers.reduce(
    (sum, tier) => sum + tier.unitPrice * tier.count,
    0n,
  );
  const metadata = buildDefifaPayMetadata({
    metadataIdTarget: inventory.implementation,
    tierIdsToMint: args.tierIdsToMint,
    attestationDelegate,
  });
  const resolvedDelegate =
    attestationDelegate !== zeroAddress
      ? attestationDelegate
      : configuredDelegate !== zeroAddress
        ? configuredDelegate
        : beneficiary;
  const effectiveDelegates = await Promise.all(
    [...counts.keys()].map(async (tierId) => {
      if (sameAddress(args.account, beneficiary))
        return { tierId, delegate: resolvedDelegate };
      const prior = await snapshot.readContract({
        address: inventory.hook,
        abi: defifaActionAbi,
        functionName: "getTierDelegateOf",
        args: [beneficiary, tierId],
      });
      return { tierId, delegate: prior === zeroAddress ? beneficiary : prior };
    }),
  );
  return {
    inventory,
    amount,
    selectedTiers,
    attestationDelegate,
    effectiveAttestationDelegate:
      new Set(effectiveDelegates.map(({ delegate }) => delegate.toLowerCase()))
        .size === 1
        ? effectiveDelegates[0]!.delegate
        : null,
    effectiveDelegates,
    transaction: buildPayTx({
      chainId: args.chainId,
      terminal,
      projectId: args.projectId,
      token: inventory.pricing.token,
      amount,
      beneficiary,
      minReturnedTokens: 0n,
      memo: args.memo,
      metadata,
    }),
  };
}

export interface PreparedDefifaCashOut {
  inventory: ProjectDefifaInventory;
  transaction: V6CashOutTxRequest;
  /** Actual terminal simulation return, after any protocol fee. */
  reclaimAmount: bigint;
  /** Raw protocol token units quoted at inventory.blockNumber. */
  protocolRewards: {
    defifaToken: Address;
    defifaAmount: bigint;
    defifaDecimals: number;
    baseProtocolToken: Address;
    baseProtocolAmount: bigint;
    baseProtocolDecimals: number;
  };
}

async function requireOwner(
  snapshot: PublicClient,
  hook: Address,
  tokenId: bigint,
  account: Address,
) {
  const owner = await snapshot.readContract({
    address: hook,
    abi: erc721Abi,
    functionName: "ownerOf",
    args: [tokenId],
  });
  if (!sameAddress(owner, account))
    throw new Error(`Defifa NFT ${tokenId} is not owned by the sender.`);
}

/** Fresh owner/phase checks and exact cashOutTokensOf simulation, with no ERC721 approval. */
export async function prepareDefifaCashOut(
  client: PublicClient,
  args: DefifaActionArgs & {
    tokenIds: readonly bigint[];
    beneficiary?: Address;
    minimumReclaim?: bigint;
  },
): Promise<PreparedDefifaCashOut> {
  assertActionSize(args.tokenIds.length);
  args = { ...args, tokenIds: [...args.tokenIds] };
  const beneficiary = address(
    args.beneficiary ?? args.account,
    "Defifa beneficiary",
  );
  const minimumReclaim = args.minimumReclaim ?? 0n;
  if (minimumReclaim < 0n)
    throw new Error("Defifa minimum reclaim cannot be negative.");
  const tokenIds = [...args.tokenIds];
  build721CashOutMetadata({ metadataIdTarget: beneficiary, tokenIds });
  const { inventory, snapshot } = await actionContext(client, args);
  if (!defifaPhaseAllowsCashOut(inventory.phase))
    throw new Error("Defifa NFT cash-out is not available in this phase.");
  if (inventory.phase === 5) {
    const reporter = await snapshot.readContract({
      address: inventory.hook,
      abi: defifaActionAbi,
      functionName: "gamePhaseReporter",
    });
    const activated = await snapshot.readContract({
      address: reporter,
      abi: defifaActionAbi,
      functionName: "noContestTriggeredFor",
      args: [args.projectId],
    });
    if (!activated)
      throw new Error("Defifa no-contest must be activated before refunds.");
  }
  await Promise.all(
    tokenIds.map((tokenId) =>
      requireOwner(snapshot, inventory.hook, tokenId, args.account),
    ),
  );
  const terminal = await paymentTerminal(snapshot, args, inventory);
  const transaction = buildCashOutTx({
    chainId: args.chainId,
    terminal,
    holder: args.account,
    projectId: args.projectId,
    cashOutCount: 0n,
    tokenToReclaim: inventory.pricing.token,
    minTokensReclaimed: minimumReclaim,
    beneficiary,
    metadata: build721CashOutMetadata({
      metadataIdTarget: inventory.implementation,
      tokenIds,
    }),
  });
  const [simulation, rewards, defifaToken, baseProtocolToken] =
    await Promise.all([
      client.simulateContract({
        ...transaction,
        account: args.account,
        blockNumber: inventory.blockNumber,
      }),
      snapshot.readContract({
        address: inventory.hook,
        abi: defifaActionAbi,
        functionName: "tokensClaimableFor",
        args: [tokenIds],
      }),
      snapshot.readContract({
        address: inventory.hook,
        abi: defifaActionAbi,
        functionName: "DEFIFA_TOKEN",
      }),
      snapshot.readContract({
        address: inventory.hook,
        abi: defifaActionAbi,
        functionName: "BASE_PROTOCOL_TOKEN",
      }),
    ]);
  const [defifaDecimals, baseProtocolDecimals] = await Promise.all([
    snapshot.readContract({
      address: defifaToken,
      abi: erc20Abi,
      functionName: "decimals",
    }),
    snapshot.readContract({
      address: baseProtocolToken,
      abi: erc20Abi,
      functionName: "decimals",
    }),
  ]);
  return {
    inventory,
    transaction,
    reclaimAmount: simulation.result,
    protocolRewards: {
      defifaToken,
      defifaAmount: rewards[0],
      defifaDecimals,
      baseProtocolToken,
      baseProtocolAmount: rewards[1],
      baseProtocolDecimals,
    },
  };
}

export interface DefifaTransferTxRequest {
  chainId: JBChainId;
  address: Address;
  abi: typeof erc721Abi;
  functionName: "safeTransferFrom";
  args: readonly [Address, Address, bigint];
}

/** Standard NFT transfer; native pause flags and receiver callbacks are simulated exactly. */
export async function prepareDefifaTransfer(
  client: PublicClient,
  args: DefifaActionArgs & { tokenId: bigint; recipient: Address },
): Promise<{
  inventory: ProjectDefifaInventory;
  transaction: DefifaTransferTxRequest;
}> {
  args = { ...args };
  address(args.recipient, "Defifa recipient");
  if (args.tokenId <= 0n) throw new Error("Defifa tokenId must be positive.");
  const { inventory, snapshot } = await actionContext(client, args);
  await requireOwner(snapshot, inventory.hook, args.tokenId, args.account);
  const transaction: DefifaTransferTxRequest = {
    chainId: args.chainId,
    address: inventory.hook,
    abi: erc721Abi,
    functionName: "safeTransferFrom",
    args: [args.account, args.recipient, args.tokenId],
  };
  await client.simulateContract({
    ...transaction,
    account: args.account,
    blockNumber: inventory.blockNumber,
  });
  return { inventory, transaction };
}

const defifaEffectAbi = [
  {
    name: "Mint",
    type: "event",
    inputs: [
      { type: "uint256", name: "tokenId", indexed: true },
      { type: "uint256", name: "tierId", indexed: true },
      { type: "address", name: "beneficiary", indexed: true },
      { type: "uint256", name: "totalAmountContributed" },
      { type: "address", name: "caller" },
    ],
  },
  {
    name: "ClaimedTokens",
    type: "event",
    inputs: [
      { type: "address", name: "beneficiary", indexed: true },
      { type: "uint256", name: "defifaTokenAmount" },
      { type: "uint256", name: "baseProtocolTokenAmount" },
      { type: "address", name: "caller" },
    ],
  },
] as const;

export interface DefifaNftReceiptContext {
  /** Retain these authenticated native identities alongside the reviewed request. */
  hook: Address;
  implementation: Address;
  account: Address;
  transaction: V6PayTxRequest | V6CashOutTxRequest | DefifaTransferTxRequest;
  /** Wallet-returned Safe proposal identity; absent for direct wallet execution. */
  safe?: { proposalHash: Hex };
}

function requireNativeMetadata(metadata: Hex, expected: Hex): void {
  if (expected.toLowerCase() !== metadata.toLowerCase())
    throw new Error(
      "Receipt does not prove the exact reviewed Defifa NFT effects.",
    );
}

function payTierIds(metadata: Hex, implementation: Address): bigint[] {
  const [delegate, ids] = decodeAbiParameters(
    [{ type: "address" }, { type: "uint16[]" }],
    `0x${metadata.slice(130)}`,
  );
  const tierIds = ids.map(BigInt);
  requireNativeMetadata(
    metadata,
    buildDefifaPayMetadata({
      metadataIdTarget: implementation,
      attestationDelegate: delegate,
      tierIdsToMint: tierIds,
    }),
  );
  return tierIds;
}

function cashOutTokenIds(metadata: Hex, implementation: Address): bigint[] {
  const [tokenIds] = decodeAbiParameters(
    [{ type: "uint256[]" }],
    `0x${metadata.slice(130)}`,
  );
  requireNativeMetadata(
    metadata,
    build721CashOutMetadata({
      metadataIdTarget: implementation,
      tokenIds: [...tokenIds],
    }),
  );
  return [...tokenIds];
}

/**
 * Reconstruct native verification context from an existing reviewed-write
 * journal. Authenticate the project/terminal at the receipt's historical block;
 * never prepare, simulate or send a new action. The wallet-returned identity is
 * required: a hashless uncertain write cannot be matched to an old receipt.
 * Call verifyDefifaNftTransaction afterward; restoration alone proves no outcome.
 */
export async function restoreDefifaNftReceiptContext(
  client: PublicClient,
  args: {
    chainId: JBChainId;
    projectId: bigint;
    record: unknown;
    receipt: TransactionReceipt;
    expectedHook?: Address;
  },
): Promise<DefifaNftReceiptContext> {
  args = { ...args, receipt: { ...args.receipt } };
  const saved = parseReviewedWriteRecoveryRecord(args.record);
  function fail(): never {
    throw new Error(
      "Saved call is not the reviewed native Defifa action. Keep this attempt pending.",
    );
  }
  if (
    saved.chainId !== args.chainId ||
    !saved.hash ||
    (!saved.safe &&
      saved.hash.toLowerCase() !==
        args.receipt.transactionHash.toLowerCase()) ||
    typeof args.receipt.blockNumber !== "bigint" ||
    args.receipt.blockNumber < 0n
  )
    fail();
  const identity = {
    chainId: args.chainId,
    projectId: args.projectId,
    account: saved.account,
    expectedHook: args.expectedHook,
  };
  const { inventory, snapshot } = await actionContext(
    client,
    identity,
    args.receipt.blockNumber,
  );
  let transaction: DefifaNftReceiptContext["transaction"];
  if (sameAddress(saved.call.to, inventory.hook)) {
    const call = decodeFunctionData({ abi: erc721Abi, data: saved.call.data });
    if (call.functionName !== "safeTransferFrom" || call.args.length !== 3)
      fail();
    const [from, recipient, tokenId] = call.args;
    if (!sameAddress(from, saved.account) || tokenId <= 0n) fail();
    address(recipient, "Defifa recipient");
    transaction = {
      chainId: args.chainId,
      address: inventory.hook,
      abi: erc721Abi,
      functionName: "safeTransferFrom",
      args: [from, recipient, tokenId],
    };
  } else {
    const terminal = await paymentTerminal(snapshot, identity, inventory);
    if (!sameAddress(saved.call.to, terminal)) fail();
    const call = decodeFunctionData({
      abi: jbMultiTerminalAbi,
      data: saved.call.data,
    });
    if (call.functionName === "pay") {
      const [projectId, token, amount, beneficiary, minimum, memo, metadata] =
        call.args;
      if (
        projectId !== args.projectId ||
        !sameAddress(token, inventory.pricing.token)
      )
        fail();
      payTierIds(metadata, inventory.implementation);
      transaction = buildPayTx({
        chainId: args.chainId,
        terminal,
        projectId,
        token,
        amount,
        beneficiary,
        minReturnedTokens: minimum,
        memo,
        metadata,
      });
    } else if (call.functionName === "cashOutTokensOf") {
      const [holder, projectId, count, token, minimum, beneficiary, metadata] =
        call.args;
      if (
        projectId !== args.projectId ||
        !sameAddress(holder, saved.account) ||
        !sameAddress(token, inventory.pricing.token) ||
        count !== 0n
      )
        fail();
      cashOutTokenIds(metadata, inventory.implementation);
      transaction = buildCashOutTx({
        chainId: args.chainId,
        terminal,
        projectId,
        holder,
        cashOutCount: count,
        tokenToReclaim: token,
        minTokensReclaimed: minimum,
        beneficiary,
        metadata,
      });
    } else fail();
  }
  const data =
    transaction.functionName === "safeTransferFrom"
      ? encodeFunctionData(transaction)
      : encodeFunctionData(transaction);
  if (
    data.toLowerCase() !== saved.call.data.toLowerCase() ||
    ("value" in transaction ? transaction.value : 0n) !==
      BigInt(saved.call.value)
  )
    fail();
  return {
    hook: inventory.hook,
    implementation: inventory.implementation,
    account: saved.account,
    transaction,
    ...(saved.safe ? { safe: { proposalHash: saved.hash! } } : {}),
  };
}

/**
 * Verify native NFT effects of one exact reviewed call; throw if proof is missing.
 * The execution engine MUST first authenticate the canonical receipt and actual
 * chain/account/call/value (including the executed inner call for Safe routes).
 * This pure check is also usable during recovery without preparing a new action.
 * Receipt logs, not end-of-block ownership, prove transfers: a receiver may
 * forward an NFT in its callback or a later transaction in the same block.
 */
export function verifyDefifaNftReceipt(
  { hook, implementation, account, transaction }: DefifaNftReceiptContext,
  receipt: TransactionReceipt,
): void {
  address(hook, "Defifa receipt hook");
  address(account, "Defifa receipt account");
  const deployment = defifaDeployments[transaction.chainId];
  if (!deployment || !sameAddress(implementation, deployment.implementation))
    throw new Error(
      "Defifa receipt context does not match the pinned chain implementation.",
    );
  if (receipt.status !== "success")
    throw new Error("Defifa transaction did not succeed.");
  const hookLogs = receipt.logs.filter((log) => sameAddress(log.address, hook));
  const transfers = parseEventLogs({
    abi: erc721Abi,
    eventName: "Transfer",
    logs: hookLogs,
  });
  const fail = () => {
    throw new Error(
      "Receipt does not prove the exact reviewed Defifa NFT effects.",
    );
  };
  if (transaction.functionName === "safeTransferFrom") {
    const [from, recipient, tokenId] = transaction.args;
    if (!sameAddress(transaction.address, hook) || !sameAddress(from, account))
      fail();
    if (
      transfers.filter(
        ({ args }) =>
          sameAddress(args.from, from) &&
          sameAddress(args.to, recipient) &&
          args.tokenId === tokenId,
      ).length !== 1
    )
      fail();
    return;
  }
  const terminalLogs = receipt.logs.filter((log) =>
    sameAddress(log.address, transaction.address),
  );
  if (transaction.functionName === "pay") {
    const [projectId, , amount, beneficiary, , memo, metadata] =
      transaction.args;
    const tierIds = payTierIds(metadata, implementation);
    const payments = parseEventLogs({
      abi: jbMultiTerminalAbi,
      eventName: "Pay",
      logs: terminalLogs,
    }).filter(
      ({ args }) =>
        args.projectId === projectId &&
        sameAddress(args.payer, account) &&
        sameAddress(args.beneficiary, beneficiary) &&
        args.amount === amount &&
        args.memo === memo &&
        args.metadata.toLowerCase() === metadata.toLowerCase() &&
        sameAddress(args.caller, account),
    );
    const mints = parseEventLogs({
      abi: defifaEffectAbi,
      eventName: "Mint",
      logs: hookLogs,
    });
    if (
      payments.length !== 1 ||
      mints.length !== tierIds.length ||
      new Set(mints.map(({ args }) => args.tokenId)).size !== mints.length
    )
      fail();
    for (const [index, mint] of mints.entries()) {
      if (
        mint.args.tierId !== tierIds[index] ||
        !sameAddress(mint.args.beneficiary, beneficiary) ||
        mint.args.totalAmountContributed !== amount ||
        !sameAddress(mint.args.caller, transaction.address)
      )
        fail();
      if (
        transfers.filter(
          ({ args }) =>
            args.from === zeroAddress &&
            sameAddress(args.to, beneficiary) &&
            args.tokenId === mint.args.tokenId,
        ).length !== 1
      )
        fail();
    }
    return;
  }
  const [holder, projectId, cashOutCount, , minimum, beneficiary, metadata] =
    transaction.args;
  const tokenIds = cashOutTokenIds(metadata, implementation);
  if (!sameAddress(holder, account) || cashOutCount !== 0n) fail();
  const cashOuts = parseEventLogs({
    abi: jbMultiTerminalAbi,
    eventName: "CashOutTokens",
    logs: terminalLogs,
  }).filter(
    ({ args }) =>
      args.projectId === projectId &&
      sameAddress(args.holder, holder) &&
      sameAddress(args.beneficiary, beneficiary) &&
      args.cashOutCount === 0n &&
      args.reclaimAmount >= minimum &&
      args.metadata.toLowerCase() === metadata.toLowerCase() &&
      sameAddress(args.caller, account),
  );
  const burns = transfers.filter(
    ({ args }) => sameAddress(args.from, holder) && args.to === zeroAddress,
  );
  if (
    cashOuts.length !== 1 ||
    burns.length !== tokenIds.length ||
    tokenIds.some(
      (id) => burns.filter(({ args }) => args.tokenId === id).length !== 1,
    )
  )
    fail();
  if (cashOuts[0]!.args.reclaimAmount === 0n) {
    const claims = parseEventLogs({
      abi: defifaEffectAbi,
      eventName: "ClaimedTokens",
      logs: hookLogs,
    });
    if (
      !claims.some(
        ({ args }) =>
          sameAddress(args.beneficiary, beneficiary) &&
          sameAddress(args.caller, transaction.address) &&
          (args.defifaTokenAmount > 0n || args.baseProtocolTokenAmount > 0n),
      )
    )
      fail();
  }
}

/**
 * The exact reviewed action failed in a canonical finalized block. This closes
 * only that attempt; retain its evidence and review any new intent separately.
 * A reverted Safe outer executor alone does not establish this outcome.
 */
export class DefifaNftTransactionRevertedError extends Error {
  readonly name = "DefifaNftTransactionRevertedError";

  constructor(
    readonly hash: Hex,
    readonly chainId: number,
  ) {
    super("The reviewed Defifa transaction failed onchain and is finalized.");
  }
}

/**
 * Authenticate canonical execution using the SDK's existing transaction/Safe
 * proof owners, then prove native NFT effects. Only
 * DefifaNftTransactionRevertedError proves finalized failure. Retain context
 * and receipt on other errors and retry this read-only function; do not resend.
 */
export async function verifyDefifaNftTransaction(
  client: PublicClient,
  context: DefifaNftReceiptContext,
  receipt: TransactionReceipt,
): Promise<void> {
  const { transaction, account } = context;
  const call = {
    to: transaction.address,
    data:
      transaction.functionName === "safeTransferFrom"
        ? encodeFunctionData(transaction)
        : encodeFunctionData(transaction),
    value: "value" in transaction ? transaction.value : 0n,
  };
  const actualPromise = client.getTransaction({
    hash: receipt.transactionHash,
  });
  const canonicalPromise = client.getTransactionReceipt({
    hash: receipt.transactionHash,
  });
  const [chainId, actual, canonical] = await Promise.all([
    client.getChainId(),
    actualPromise,
    canonicalPromise,
  ]);
  if (
    chainId !== transaction.chainId ||
    canonical.blockHash !== receipt.blockHash ||
    canonical.blockNumber !== receipt.blockNumber ||
    canonical.transactionHash.toLowerCase() !==
      receipt.transactionHash.toLowerCase()
  )
    throw new Error(
      "Defifa receipt identity is unavailable or changed; keep this transaction pending.",
    );
  // Both existing proof owners read this same exact transaction/receipt. Reuse
  // the fetched evidence rather than issue duplicate RPC reads or copy checks.
  const proofClient = {
    ...client,
    getTransaction: async () => actual,
    getTransactionReceipt: async () => canonical,
  };
  const record = {
    version: 1 as const,
    id: "defifa-nft",
    chainId: transaction.chainId,
    account,
    safe: Boolean(context.safe),
    hash: context.safe?.proposalHash ?? receipt.transactionHash,
    call: { ...call, value: call.value.toString() },
  };
  if (context.safe) {
    const status = await verifyReviewedWriteReceipt(
      proofClient,
      record,
      canonical,
    );
    if (status !== "success")
      throw new DefifaNftTransactionRevertedError(
        canonical.transactionHash,
        chainId,
      );
  } else {
    if (!sameAddress(actual.from, account))
      throw new Error(
        "Defifa transaction sender does not match the reviewed account.",
      );
    try {
      await verifyRelayrDestination(proofClient, {
        entry: {
          chain: transaction.chainId,
          target: call.to,
          data: call.data,
          value: call.value.toString(),
        },
        hash: receipt.transactionHash,
      });
    } catch (error) {
      if (!(error instanceof RelayrDestinationRevertedError)) throw error;
      // Exact call/account proof precedes finality. The existing reviewed-write
      // owner rejects nonfinal receipts and reorgs before this attempt releases.
      const status = await verifyReviewedWriteReceipt(
        proofClient,
        record,
        canonical,
      );
      if (status !== "failed") throw error;
      throw new DefifaNftTransactionRevertedError(
        canonical.transactionHash,
        chainId,
      );
    }
  }
  // The caller's supplied logs may be stale or fabricated. Only fresh canonical
  // logs are admitted to the native effect verifier, including log identities.
  if (
    canonical.logs.some(
      (log) =>
        log.removed !== false ||
        log.transactionHash?.toLowerCase() !==
          canonical.transactionHash.toLowerCase() ||
        log.blockHash?.toLowerCase() !== canonical.blockHash.toLowerCase() ||
        log.blockNumber !== canonical.blockNumber ||
        log.transactionIndex !== canonical.transactionIndex,
    )
  )
    throw new Error(
      "Defifa receipt logs are not bound to the canonical transaction.",
    );
  verifyDefifaNftReceipt(context, canonical);
}
