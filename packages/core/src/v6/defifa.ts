import {
  type Address,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
  decodeAbiParameters,
  encodeAbiParameters,
  encodeFunctionData,
  erc20Abi,
  erc721Abi,
  isAddress,
  parseAbi,
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
import { verifyRelayrDestination } from "../review/relayr.js";
import { verifyReviewedWriteReceipt } from "../review/writeRecovery.js";

// @ballkidz/defifa 1.0.2 native getters. Provenance belongs to nftInventory.
const defifaActionAbi = parseAbi([
  "function defaultAttestationDelegate() view returns (address)",
  "function getTierDelegateOf(address,uint256) view returns (address)",
  "function gamePhaseReporter() view returns (address)",
  "function noContestTriggeredFor(uint256) view returns (bool)",
  "function tokensClaimableFor(uint256[]) view returns (uint256,uint256)",
  "function DEFIFA_TOKEN() view returns (address)",
  "function BASE_PROTOCOL_TOKEN() view returns (address)",
]);

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

async function actionContext(client: PublicClient, args: DefifaActionArgs) {
  address(args.account, "Defifa account");
  if (args.expectedHook) address(args.expectedHook, "Defifa expected hook");
  if (args.projectId <= 0n)
    throw new Error("Defifa projectId must be positive.");
  const inventory = await getProjectNftInventory(client, {
    chainId: args.chainId,
    projectId: args.projectId,
    tierLimit: 1,
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
  const [terminal, configuredDelegate, costs] = await Promise.all([
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
        return effectiveTierPrice(tier.price, tier.discountPercent) * count;
      }),
    ),
  ]);
  const amount = costs.reduce((sum, cost) => sum + cost, 0n);
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

const defifaEffectAbi = parseAbi([
  "event Mint(uint256 indexed tokenId,uint256 indexed tierId,address indexed beneficiary,uint256 totalAmountContributed,address caller)",
  "event ClaimedTokens(address indexed beneficiary,uint256 defifaTokenAmount,uint256 baseProtocolTokenAmount,address caller)",
]);

export interface DefifaNftReceiptContext {
  /** Retain these authenticated native identities alongside the reviewed request. */
  hook: Address;
  implementation: Address;
  account: Address;
  transaction: V6PayTxRequest | V6CashOutTxRequest | DefifaTransferTxRequest;
  /** Wallet-returned Safe proposal identity; absent for direct wallet execution. */
  safe?: { proposalHash: Hex };
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
    const [delegate, ids] = decodeAbiParameters(
      [{ type: "address" }, { type: "uint16[]" }],
      `0x${metadata.slice(130)}`,
    );
    const tierIds = ids.map(BigInt);
    if (
      buildDefifaPayMetadata({
        metadataIdTarget: implementation,
        attestationDelegate: delegate,
        tierIdsToMint: tierIds,
      }).toLowerCase() !== metadata.toLowerCase()
    )
      fail();
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
  const [tokenIds] = decodeAbiParameters(
    [{ type: "uint256[]" }],
    `0x${metadata.slice(130)}`,
  );
  if (
    !sameAddress(holder, account) ||
    cashOutCount !== 0n ||
    build721CashOutMetadata({
      metadataIdTarget: implementation,
      tokenIds: [...tokenIds],
    }).toLowerCase() !== metadata.toLowerCase()
  )
    fail();
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
 * Authenticate canonical execution using the SDK's existing transaction/Safe
 * proof owners, then prove native NFT effects. Retain context and receipt on
 * failure and retry this read-only function; do not prepare or send again.
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
  if (context.safe) {
    const status = await verifyReviewedWriteReceipt(
      proofClient,
      {
        version: 1,
        id: "defifa-nft",
        chainId: transaction.chainId,
        account,
        safe: true,
        hash: context.safe.proposalHash,
        call: { ...call, value: call.value.toString() },
      },
      canonical,
    );
    if (status !== "success")
      throw new Error("Defifa Safe transaction did not succeed.");
  } else {
    if (!sameAddress(actual.from, account))
      throw new Error(
        "Defifa transaction sender does not match the reviewed account.",
      );
    await verifyRelayrDestination(proofClient, {
      entry: {
        chain: transaction.chainId,
        target: call.to,
        data: call.data,
        value: call.value.toString(),
      },
      hash: receipt.transactionHash,
    });
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
