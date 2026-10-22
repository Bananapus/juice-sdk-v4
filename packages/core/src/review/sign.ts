import {
  encodeFunctionData,
  getAddress,
  hashTypedData,
  isAddress,
  type Address,
  type Hex,
  type TypedDataDefinition,
} from "viem";
import { multiSendCallsOf } from "../safe.js";
import { isHexBytes, uint256 } from "../untrusted.js";
import {
  SAFE_EXEC_ABI,
  SAFE_TX_TYPES,
  safeTransactionMessage,
  type SafeQueuedTransaction,
} from "../safeService.js";
import {
  permit2TypedData,
  type Permit2SignatureAuthorization,
} from "../v6/permit2.js";
import { promptReview } from "./confirm.js";
import {
  isDefiniteWalletRejection,
  submitReviewedContractWrite,
} from "./contractWrite.js";
import { permit2Rows } from "./decode.js";
import { decodeReviewCall } from "./decodeCall.js";
import { buildReviewModel, type ReviewContextRow } from "./model.js";
import {
  FORWARD_REQUEST_TYPES,
  relayrForwarder,
  relayrForwarderDeadline,
  type RelayrForwardRequest,
} from "./relayr.js";
import { TransactionReviewCancelledError } from "./reviewQueue.js";
import type { TransactionReviewSignature } from "./transactionReview.js";
import {
  unsupportedWalletRequest,
  walletReady,
  type WalletAdapter,
} from "./wallet.js";

/** An ERC-2771 request to sign: what `execute` carries, with the signer's forwarder nonce in place of the signature. */
export type ReviewedForwardRequest = Omit<RelayrForwardRequest, "signature"> & {
  nonce: bigint;
};

/**
 * A signature core can review and sign. Core builds each typed-data
 * definition from its own constants, so no caller passes `types` or `domain`.
 */
export type ReviewedSignature =
  | {
      kind: "safe-tx";
      chainId: number;
      safe: Address;
      tx: SafeQueuedTransaction;
    }
  | {
      kind: "forward-request";
      chainId: number;
      request: ReviewedForwardRequest;
    }
  | { kind: "permit2"; authorization: Permit2SignatureAuthorization }
  | { kind: "message"; chainId: number; message: string };

/** One signature as reviewed: the exact payload signed, and how the review shows it. */
export type PreparedSignature = Readonly<{
  chainId: number;
  typedData: TypedDataDefinition | null;
  message: string | null;
  review: TransactionReviewSignature;
}>;

const REJECTED = "You rejected the signature. Nothing was sent.";

function requireChainId(chainId: unknown): number {
  if (
    typeof chainId !== "number" ||
    !Number.isSafeInteger(chainId) ||
    chainId <= 0
  ) {
    throw new Error(`Invalid chain ID: ${String(chainId)}.`);
  }
  return chainId;
}

function requireAddress(name: string, value: unknown): Address {
  if (typeof value !== "string" || !isAddress(value)) {
    throw new Error(`Invalid ${name} address: ${String(value)}.`);
  }
  return getAddress(value);
}

/** An unsigned integer as a primitive, so nothing can change it after review. */
function requireUint(name: string, value: unknown): bigint {
  const parsed = uint256(value);
  if (parsed === null) throw new Error(`Invalid ${name}: ${String(value)}.`);
  return parsed;
}

/** `value` and everything in it frozen. */
function frozen<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const inner of Object.values(value)) frozen(inner);
  }
  return value;
}

/**
 * The prepared signature: `payload` is what the wallet signs and what the
 * review shows, one frozen copy, so neither the inputs nor the shared type
 * constants changing after review changes what is signed. Typed data must
 * encode first, so viem checks every address and integer before the review
 * opens.
 */
function prepared(
  kind: ReviewedSignature["kind"],
  chainId: number,
  payload: { typedData: TypedDataDefinition } | { message: string },
  shown: Pick<TransactionReviewSignature, "calls" | "steps"> = {},
): PreparedSignature {
  const copy = frozen(structuredClone(payload));
  const typedData = "typedData" in copy ? copy.typedData : null;
  if (typedData) hashTypedData(typedData);
  return Object.freeze({
    chainId,
    typedData,
    message: "message" in copy ? copy.message : null,
    review: { kind, chainId, ...copy, ...shown },
  });
}

/**
 * `signature` as core signs and shows it, each field read once. Refuses any
 * kind core does not know, a Safe transaction that DELEGATECALLs anything
 * but a recognized MultiSendCallOnly, a forward request not from `account`,
 * on a chain with no forwarder, or executable past
 * {@link relayrForwarderDeadline}, and a message that is not text.
 */
export function prepareSignature(
  signature: ReviewedSignature,
  account: Address,
): PreparedSignature {
  const kind = signature?.kind;
  switch (kind) {
    case "safe-tx": {
      const { chainId, safe, tx } = signature;
      const id = requireChainId(chainId);
      const verifyingContract = requireAddress("Safe", safe);
      const message = safeTransactionMessage(tx);
      const inner = multiSendCallsOf(message);
      if (message.operation === 1 && !inner) {
        throw new Error(
          "This Safe transaction DELEGATECALLs a contract other than MultiSendCallOnly. Nothing was signed.",
        );
      }
      const args = [
        message.to,
        message.value,
        message.data,
        message.operation,
        message.safeTxGas,
        message.baseGas,
        message.gasPrice,
        message.gasToken,
        message.refundReceiver,
        "0x",
      ] as const;
      return prepared(
        kind,
        id,
        {
          typedData: {
            domain: { chainId: id, verifyingContract },
            types: SAFE_TX_TYPES,
            primaryType: "SafeTx",
            message,
          },
        },
        {
          // The Safe's own execution of it, with the MultiSend's calls inside.
          calls: [
            {
              chainId: id,
              to: verifyingContract,
              data: encodeFunctionData({
                abi: SAFE_EXEC_ABI,
                functionName: "execTransaction",
                args,
              }),
              abi: SAFE_EXEC_ABI,
              functionName: "execTransaction",
              args,
              safeTxGas: message.safeTxGas,
              contractName: "Safe",
              ...(inner
                ? {
                    calls: inner.map((call) =>
                      decodeReviewCall({
                        chainId: id,
                        from: verifyingContract,
                        ...call,
                      }),
                    ),
                  }
                : {}),
            },
          ],
        },
      );
    }
    case "forward-request": {
      const { chainId, request } = signature;
      const id = requireChainId(chainId);
      const verifyingContract = relayrForwarder(id);
      if (!verifyingContract) {
        throw new Error(
          `There is no Juicebox forwarder on chain ${id}. Nothing was signed.`,
        );
      }
      const { from, to, value, gas, nonce, deadline, data } = request;
      if (
        typeof from !== "string" ||
        from.toLowerCase() !== account.toLowerCase()
      ) {
        throw new Error(
          "This request is not from the connected account. Nothing was signed.",
        );
      }
      if (
        !Number.isSafeInteger(deadline) ||
        deadline > relayrForwarderDeadline()
      ) {
        throw new Error(
          "This request stays executable longer than allowed. Nothing was signed.",
        );
      }
      if (!isHexBytes(data)) throw new Error("Invalid forwarded calldata.");
      const message = {
        from: requireAddress("sender", from),
        to: requireAddress("destination", to),
        value: requireUint("value", value),
        gas: requireUint("gas", gas),
        nonce: requireUint("nonce", nonce),
        deadline,
        data,
      };
      return prepared(
        kind,
        id,
        {
          typedData: {
            domain: {
              name: "Juicebox",
              version: "1",
              chainId: id,
              verifyingContract,
            },
            types: FORWARD_REQUEST_TYPES,
            primaryType: "ForwardRequest",
            message,
          },
        },
        {
          calls: [
            decodeReviewCall({
              chainId: id,
              from: message.from,
              to: message.to,
              data,
              value: message.value,
              gas: message.gas,
            }),
          ],
        },
      );
    }
    case "permit2": {
      const {
        chainId,
        token,
        spender,
        amount,
        expiration,
        nonce,
        sigDeadline,
      } = signature.authorization;
      const id = requireChainId(chainId);
      const authorization = {
        chainId: id,
        token: requireAddress("token", token),
        spender: requireAddress("spender", spender),
        amount: requireUint("amount", amount),
        expiration: Number(requireUint("expiration", expiration)),
        nonce: Number(requireUint("nonce", nonce)),
        sigDeadline: requireUint("signature deadline", sigDeadline),
      } as Permit2SignatureAuthorization;
      return prepared(
        kind,
        id,
        { typedData: permit2TypedData(authorization) },
        {
          steps: [
            {
              title: "Permit2 allowance",
              rows: permit2Rows(id, authorization),
            },
          ],
        },
      );
    }
    case "message": {
      const { chainId, message } = signature;
      const id = requireChainId(chainId);
      if (typeof message !== "string") {
        throw new Error("A message to sign must be text. Nothing was signed.");
      }
      return prepared(kind, id, { message });
    }
  }
  throw new Error(
    `This signature is not one the app can review: ${String(kind)}. Nothing was signed.`,
  );
}

/**
 * Signs each prepared signature in order through the adapter, after the same
 * account and chain checks as {@link submitReviewedContractWrite}: the
 * connected account must stay `account`, and typed data is signed on its
 * domain's chain. A message is chain-free, so the wallet is not asked to
 * switch for one. A definite wallet rejection (EIP-1193 4001) returns no
 * signature and throws {@link TransactionReviewCancelledError}.
 */
export async function signPrepared(
  prepared: readonly PreparedSignature[],
  account: Address,
  adapter: WalletAdapter,
  /** The caller's final gate before each signature; it throws to stop. */
  beforeSign?: () => void,
  /** The caller's async recheck before each signature, ahead of `beforeSign`. */
  reverify?: () => Promise<void>,
): Promise<Hex[]> {
  const signatures: Hex[] = [];
  for (const { chainId, typedData, message } of prepared) {
    signatures.push(
      await submitReviewedContractWrite({
        request: { chainId },
        expectedAccount: account,
        review: () => Promise.resolve(),
        switchChain: async (id) => {
          if (typedData && adapter.chainId() !== id) {
            await adapter.switchChain(id);
          }
        },
        currentAccount: () => adapter.account(),
        ...(reverify ? { reverify } : {}),
        simulate: async () => undefined,
        beforeSend: () => {
          beforeSign?.();
          if (typedData && adapter.chainId() !== chainId) {
            throw new Error(
              "Your wallet changed networks. Review the signature again.",
            );
          }
          // Last, after every callback above could have run.
          if (adapter.account()?.toLowerCase() !== account.toLowerCase()) {
            throw new Error("The connected account changed. Review again.");
          }
        },
        // Only the wallet's own answer can read as a rejection.
        write: async () => {
          try {
            return await (typedData
              ? adapter.signTypedData(typedData)
              : adapter.signMessage(message!));
          } catch (error) {
            if (isDefiniteWalletRejection(error)) {
              throw new TransactionReviewCancelledError(REJECTED);
            }
            throw error;
          }
        },
      }),
    );
  }
  return signatures;
}

/**
 * Signs only what the person reviewed: one prompt for every signature, with
 * the exact typed data or text and the calls each lets someone run, decoded.
 * Nothing is signed unless the review handler returns core's confirmation
 * ({@link registerReviewHandler}). The signatures come back in order.
 *
 * A self-reviewing adapter (Signa) is refused with EIP-1193 4200: it has no
 * reviewed-signature path yet.
 */
export async function signReviewed(
  signatures: readonly ReviewedSignature[],
  action: {
    account: Address;
    title?: string;
    description?: string;
    context?: readonly ReviewContextRow[];
    /** Rechecks, after confirm and before each signature, that what was reviewed still holds; it throws to stop. */
    reverify?: () => Promise<void>;
  },
  deps: { adapter: WalletAdapter },
): Promise<Hex[]> {
  const { adapter } = deps;
  const { account } = action;
  await walletReady(adapter);
  if (adapter.kind === "self-reviewing") throw unsupportedWalletRequest();
  const connected = adapter.account();
  if (!connected) throw new Error("Connect a wallet first.");
  if (connected.toLowerCase() !== account.toLowerCase()) {
    throw new Error("The connected account changed. Review again.");
  }
  const prepared = [...signatures].map((signature) =>
    prepareSignature(signature, account),
  );
  if (!prepared.length) throw new Error("There is nothing to sign.");
  const model = buildReviewModel({
    calls: [],
    signatures: prepared.map(({ review }) => review),
    ...(action.title ? { title: action.title } : {}),
    ...(action.description ? { description: action.description } : {}),
    ...(action.context ? { context: action.context } : {}),
  });
  // Nothing is sent, so there is nothing to simulate.
  await promptReview(
    model,
    Promise.resolve({ status: "passed" }),
    Promise.resolve(model),
  );
  return signPrepared(prepared, account, adapter, undefined, action.reverify);
}
