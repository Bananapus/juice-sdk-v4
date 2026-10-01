import {
  decodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionData,
  getAddress,
  hashTypedData,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MULTI_SEND_CALL_ONLY,
  RECOGNIZED_SAFE_RELEASES,
  SAFE_SETUP_ABI,
  encodeMultiSend,
} from "./safe.js";
import {
  SAFE_EXEC_ABI,
  SAFE_TX_TYPES,
  canonicalSafeTxHash,
  fetchSafeCreation,
  fetchSafesOwnedBy,
  findPendingSafeTransaction,
  hasSafeService,
  listPendingSafeTransactions,
  nextProposalNonce,
  onchainApprovalStep,
  parseSafeCreationPayload,
  proposeSafeTransaction,
  readSafeTransaction,
  requireSafeExecutionSuccess,
  safeBatchProposalFor,
  safeCreationUrl,
  safeExecutionArgs,
  safeExecutionResult,
  safeExecutionSignatures,
  safeProposalFor,
  safeTransactionHasRefund,
  safeTransactionHash,
  safeTransactionMatchesCall,
  safeTransactionMessage,
  safeTransactionUrl,
  submitSafeConfirmation,
  usableSafeConfirmations,
  type SafeQueuedTransaction,
} from "./safeService.js";

const SAFE = "0x2222222222222222222222222222222222222222" as Address;
const OTHER_SAFE = "0x8888888888888888888888888888888888888888" as Address;
const LOW_OWNER = "0x1111111111111111111111111111111111111111" as Address;
const HIGH_OWNER = "0x9999999999999999999999999999999999999999" as Address;
const LETTER_OWNER = "0xaaaa111111111111111111111111111111111111" as Address;
const STALE_OWNER = "0x7777777777777777777777777777777777777777" as Address;
const TARGET = "0x3333333333333333333333333333333333333333" as Address;
const lowSignature = `0x${"11".repeat(65)}` as Hex;
const highSignature = `0x${"99".repeat(65)}` as Hex;
/** An EIP-1271 signature in the transaction service's standalone form: r = owner, s = 65, v = 0, length, bytes. */
function serviceContractSignature(
  owner: Address,
  inner: Hex,
  padded = false,
): Hex {
  const body = inner.slice(2).toLowerCase();
  return `0x${owner.slice(2).toLowerCase().padStart(64, "0")}${(65).toString(16).padStart(64, "0")}00${(body.length / 2).toString(16).padStart(64, "0")}${padded ? body.padEnd(Math.ceil(body.length / 64) * 64, "0") : body}` as Hex;
}
const nestedSignature = `0x${"ab".repeat(65)}` as Hex;
const contractSignature = serviceContractSignature(LOW_OWNER, nestedSignature);

const transaction = {
  to: TARGET,
  value: "17",
  data: "0x1234",
  operation: 0,
  safeTxGas: "100",
  baseGas: "20",
  gasPrice: "2",
  gasToken: zeroAddress,
  refundReceiver: zeroAddress,
  nonce: 8,
  confirmations: [
    { owner: HIGH_OWNER, signature: highSignature },
    { owner: LOW_OWNER, signature: lowSignature },
    { owner: HIGH_OWNER, signature: highSignature },
    { owner: STALE_OWNER, signature: `0x${"77".repeat(65)}` as Hex },
    { owner: LOW_OWNER, signature: "0x1234" as Hex },
  ],
} satisfies SafeQueuedTransaction;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Safe transaction hashing", () => {
  it("hashes every SafeTx field under the chain and Safe domain", () => {
    const hash = safeTransactionHash(1, SAFE, transaction);
    expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(hash).toBe(
      hashTypedData({
        domain: { chainId: 1, verifyingContract: SAFE },
        types: SAFE_TX_TYPES,
        primaryType: "SafeTx",
        message: {
          to: TARGET,
          value: 17n,
          data: "0x1234",
          operation: 0,
          safeTxGas: 100n,
          baseGas: 20n,
          gasPrice: 2n,
          gasToken: zeroAddress,
          refundReceiver: zeroAddress,
          nonce: 8n,
        },
      }),
    );
    for (const changed of [
      { nonce: 9 },
      { value: "18" },
      { operation: 1 },
      { safeTxGas: "0" },
      { data: "0x" as Hex },
    ]) {
      expect(
        safeTransactionHash(1, SAFE, { ...transaction, ...changed }),
      ).not.toBe(hash);
    }
    expect(safeTransactionHash(10, SAFE, transaction)).not.toBe(hash);
    expect(safeTransactionHash(1, OTHER_SAFE, transaction)).not.toBe(hash);
    // Any uint256 form, and null data as empty.
    expect(
      safeTransactionHash(1, SAFE, {
        ...transaction,
        value: 17n,
        safeTxGas: 100,
        gasPrice: "0x2",
      }),
    ).toBe(hash);
    expect(safeTransactionHash(1, SAFE, { ...transaction, data: null })).toBe(
      safeTransactionHash(1, SAFE, { ...transaction, data: "0x" }),
    );
  });

  it("refuses a record with any malformed field, naming it", () => {
    for (const [field, value] of [
      ["to", "0x12"],
      ["to", undefined],
      ["value", "-1"],
      ["value", "1.5"],
      ["data", "0x123"],
      ["operation", 2],
      ["operation", "call"],
      ["safeTxGas", undefined],
      ["baseGas", null],
      ["gasPrice", -1],
      ["gasToken", "0xzz"],
      ["refundReceiver", undefined],
      ["nonce", -1],
      ["nonce", 2 ** 53],
      ["nonce", "9007199254740993"],
      ["nonce", "8.5"],
    ] as const) {
      expect(() =>
        safeTransactionMessage({
          ...transaction,
          [field]: value,
        } as SafeQueuedTransaction),
      ).toThrow(
        `The Safe transaction's ${field} is invalid: ${String(value)}.`,
      );
    }
    expect(() =>
      safeTransactionMessage(null as unknown as SafeQueuedTransaction),
    ).toThrow("The Safe transaction's record is invalid: null.");
    expect(() => safeTransactionHash(0, SAFE, transaction)).toThrow(
      "Invalid chain ID: 0.",
    );
    expect(() =>
      safeTransactionHash(1, "0x12" as Address, transaction),
    ).toThrow("Invalid Safe address: 0x12.");
  });

  it("hashes a null gas token or refund receiver as the zero address, as the service does", () => {
    const omitted = { ...transaction, gasToken: null, refundReceiver: null };
    expect(safeTransactionMessage(omitted)).toMatchObject({
      gasToken: zeroAddress,
      refundReceiver: zeroAddress,
    });
    expect(safeTransactionHash(1, SAFE, omitted)).toBe(
      safeTransactionHash(1, SAFE, transaction),
    );
  });

  it("refuses an advertised hash, Safe or reviewed hash that the fields do not produce", () => {
    const hash = safeTransactionHash(1, SAFE, transaction);
    expect(
      canonicalSafeTxHash(1, SAFE, {
        ...transaction,
        safe: SAFE,
        safeTxHash: hash,
        contractTransactionHash: hash.toUpperCase().replace("0X", "0x") as Hex,
      }),
    ).toBe(hash);
    expect(canonicalSafeTxHash(1, SAFE, transaction, hash)).toBe(hash);
    const other = safeTransactionHash(1, SAFE, { ...transaction, nonce: 9 });
    expect(() =>
      canonicalSafeTxHash(1, SAFE, { ...transaction, safeTxHash: other }),
    ).toThrow(
      `The Safe transaction's safeTxHash ${other} does not match its fields, which hash to ${hash}.`,
    );
    expect(() =>
      canonicalSafeTxHash(1, SAFE, {
        ...transaction,
        contractTransactionHash: "0x12",
      }),
    ).toThrow("contractTransactionHash 0x12 does not match");
    expect(() => canonicalSafeTxHash(1, SAFE, transaction, other)).toThrow(
      `The Safe transaction changed: it hashes to ${hash}, not the reviewed ${other}.`,
    );
    for (const safe of [OTHER_SAFE, "0x12"]) {
      expect(() =>
        canonicalSafeTxHash(1, SAFE, { ...transaction, safe: safe as Address }),
      ).toThrow(`The Safe transaction belongs to ${safe}, not ${SAFE}.`);
    }
  });
});

describe("Safe execution results", () => {
  const expected = safeTransactionHash(1, SAFE, transaction);
  const otherProposal = safeTransactionHash(1, SAFE, {
    ...transaction,
    nonce: 9,
  });
  const EXECUTION = `0x${"cd".repeat(32)}` as Hex;

  function executionLog(
    eventName: "ExecutionSuccess" | "ExecutionFailure",
    txHash: Hex,
    { address = SAFE, indexed = true, payment = 0n } = {},
  ) {
    const topics = encodeEventTopics({
      abi: SAFE_EXEC_ABI,
      eventName,
      args: { txHash },
    });
    return {
      address,
      topics: indexed ? topics : [topics[0]],
      data: indexed
        ? encodeAbiParameters([{ type: "uint256" }], [payment])
        : encodeAbiParameters(
            [{ type: "bytes32" }, { type: "uint256" }],
            [txHash, payment],
          ),
    };
  }
  const receipt = (
    logs: unknown[],
    status: "success" | "reverted" = "success",
    transactionHash: Hex = EXECUTION,
  ) => ({ status, logs, transactionHash });

  it("proves success and failure in both the Safe 1.4 and the Safe 1.3 layout", () => {
    for (const indexed of [true, false]) {
      expect(
        safeExecutionResult(
          receipt([executionLog("ExecutionSuccess", expected, { indexed })]),
          SAFE,
          expected,
        ),
      ).toEqual({ status: "success", payment: 0n });
      expect(
        safeExecutionResult(
          receipt([executionLog("ExecutionFailure", expected, { indexed })]),
          SAFE,
          expected,
        ),
      ).toEqual({ status: "failed", payment: 0n });
    }
    // A checksummed or uppercase Safe log address is the same Safe.
    expect(
      safeExecutionResult(
        receipt([
          {
            ...executionLog("ExecutionSuccess", expected),
            address: SAFE.toUpperCase().replace("0X", "0x"),
          },
        ]),
        SAFE,
        expected,
      ),
    ).toEqual({ status: "success", payment: 0n });
    expect(() =>
      requireSafeExecutionSuccess(
        receipt([executionLog("ExecutionSuccess", expected)]),
        SAFE,
        expected,
      ),
    ).not.toThrow();
  });

  it("binds the result to the reviewed hash, so another proposal in the batch cannot stand in", () => {
    // Another proposal of the same Safe failed in the same transaction.
    expect(
      safeExecutionResult(
        receipt([
          executionLog("ExecutionFailure", otherProposal),
          executionLog("ExecutionSuccess", expected),
        ]),
        SAFE,
        expected,
      ),
    ).toEqual({ status: "success", payment: 0n });
    for (const logs of [
      [],
      [executionLog("ExecutionSuccess", otherProposal)],
      [executionLog("ExecutionSuccess", expected, { address: OTHER_SAFE })],
      [{ address: "not-an-address", topics: [], data: "0x" }],
      [null],
    ]) {
      const result = safeExecutionResult(receipt(logs), SAFE, expected);
      expect(result).toEqual({
        status: "unproven",
        reason: `The receipt has no ExecutionSuccess or ExecutionFailure from Safe ${SAFE} for Safe transaction ${expected}.`,
      });
      expect(() =>
        requireSafeExecutionSuccess(receipt(logs), SAFE, expected),
      ).toThrow("no ExecutionSuccess or ExecutionFailure");
    }
  });

  it("proves nothing from two results for one hash, or a malformed event", () => {
    const both = receipt([
      executionLog("ExecutionSuccess", expected),
      executionLog("ExecutionFailure", expected),
    ]);
    expect(safeExecutionResult(both, SAFE, expected)).toMatchObject({
      status: "unproven",
    });
    expect(() => requireSafeExecutionSuccess(both, SAFE, expected)).toThrow(
      "logged 2 execution results (ExecutionSuccess, ExecutionFailure)",
    );
    const success = executionLog("ExecutionSuccess", expected);
    for (const [log, problem] of [
      [{ ...success, data: "0x" }, "a malformed ExecutionSuccess event"],
      [
        { ...success, topics: [...success.topics, `0x${"ff".repeat(32)}`] },
        "a malformed ExecutionSuccess event",
      ],
      [
        { ...success, topics: [success.topics[0], "0x1234"] },
        "a malformed ExecutionSuccess event",
      ],
      [
        { ...success, topics: [success.topics[0]], data: "0x1234" },
        "a malformed ExecutionSuccess event",
      ],
      [{ ...success, topics: [], data: "0x" }, null],
    ] as const) {
      const result = safeExecutionResult(receipt([log]), SAFE, expected);
      if (problem) {
        expect(result).toEqual({
          status: "unproven",
          reason: `Safe ${SAFE} logged ${problem}.`,
        });
      } else {
        expect(result).toMatchObject({ status: "unproven" });
      }
    }
    // Topics or data that are not even strings and arrays.
    expect(
      safeExecutionResult(
        receipt([
          { address: SAFE, topics: success.topics[0], data: success.data },
        ]),
        SAFE,
        expected,
      ),
    ).toMatchObject({ status: "unproven" });
    expect(
      safeExecutionResult(
        receipt([{ address: SAFE, topics: success.topics }]),
        SAFE,
        expected,
      ),
    ).toEqual({
      status: "unproven",
      reason: `Safe ${SAFE} logged a malformed ExecutionSuccess event.`,
    });
    // A malformed event of another emitter is not this Safe's concern.
    expect(
      safeExecutionResult(
        receipt([{ ...success, address: OTHER_SAFE, data: "0x" }, success]),
        SAFE,
        expected,
      ),
    ).toEqual({ status: "success", payment: 0n });
  });

  it("keeps an execution that paid a refund proven, and reports the refund", () => {
    expect(
      safeExecutionResult(
        receipt([executionLog("ExecutionSuccess", expected, { payment: 7n })]),
        SAFE,
        expected,
      ),
    ).toEqual({ status: "success", payment: 7n });
    // The nonce is spent: a failed call that paid a refund is still failed.
    expect(
      safeExecutionResult(
        receipt([
          executionLog("ExecutionFailure", expected, {
            indexed: false,
            payment: 3n,
          }),
        ]),
        SAFE,
        expected,
      ),
    ).toEqual({ status: "failed", payment: 3n });
    // Another proposal's refunded event never decides this one.
    expect(
      safeExecutionResult(
        receipt([
          executionLog("ExecutionSuccess", otherProposal, { payment: 9n }),
          executionLog("ExecutionSuccess", expected),
        ]),
        SAFE,
        expected,
      ),
    ).toEqual({ status: "success", payment: 0n });
  });

  it("reads Safe{Wallet}'s at-once execution by the transaction's own hash", () => {
    // The wallet returned the execution's hash: exactly one result of the Safe proves it.
    const atOnce = (logs: unknown[]) => receipt(logs, "success", EXECUTION);
    expect(
      safeExecutionResult(
        atOnce([executionLog("ExecutionSuccess", expected)]),
        SAFE,
        EXECUTION,
      ),
    ).toEqual({ status: "success", payment: 0n });
    expect(
      safeExecutionResult(
        atOnce([executionLog("ExecutionFailure", expected)]),
        SAFE,
        EXECUTION,
      ),
    ).toEqual({ status: "failed", payment: 0n });
    expect(safeExecutionResult(atOnce([]), SAFE, EXECUTION)).toEqual({
      status: "unproven",
      reason: `The receipt has no ExecutionSuccess or ExecutionFailure from Safe ${SAFE} for transaction ${EXECUTION}.`,
    });
    expect(
      safeExecutionResult(
        atOnce([
          executionLog("ExecutionSuccess", expected),
          executionLog("ExecutionSuccess", otherProposal),
        ]),
        SAFE,
        EXECUTION,
      ),
    ).toMatchObject({ status: "unproven" });
  });

  it("separates an outer revert from a failed call, and refuses what is not a receipt", () => {
    const reverted = receipt([], "reverted");
    expect(safeExecutionResult(reverted, SAFE, expected)).toEqual({
      status: "reverted",
    });
    expect(() => requireSafeExecutionSuccess(reverted, SAFE, expected)).toThrow(
      `The transaction executing ${expected} on Safe ${SAFE} reverted, so the Safe ran nothing.`,
    );
    expect(() =>
      requireSafeExecutionSuccess(
        receipt([executionLog("ExecutionFailure", expected)]),
        SAFE,
        expected,
      ),
    ).toThrow(
      `Safe ${SAFE} ran ${expected}, but its call failed (ExecutionFailure).`,
    );
    const proof = [executionLog("ExecutionSuccess", expected)];
    for (const bad of [
      { logs: [] },
      { status: "success" },
      { status: "0x1", logs: [] },
      { logs: proof },
      { status: "0x1", logs: proof },
      { status: true, logs: proof },
    ]) {
      expect(safeExecutionResult(bad, SAFE, expected)).toMatchObject({
        status: "unproven",
      });
    }
    expect(() => safeExecutionResult(receipt([]), SAFE, "0x1234")).toThrow(
      "Invalid Safe transaction hash: 0x1234.",
    );
    expect(() =>
      safeExecutionResult(receipt([]), "0x12" as Address, expected),
    ).toThrow("Invalid Safe address: 0x12.");
  });
});

describe("Safe signatures", () => {
  const owners = [LOW_OWNER, HIGH_OWNER, LETTER_OWNER];

  it("keeps one well-formed confirmation per current owner, in numeric owner order", () => {
    expect(
      usableSafeConfirmations(transaction, [LOW_OWNER, HIGH_OWNER]).map(
        ({ owner }) => owner,
      ),
    ).toEqual([LOW_OWNER, HIGH_OWNER]);
    expect(safeExecutionArgs(transaction, [LOW_OWNER, HIGH_OWNER])).toEqual([
      getAddress(TARGET),
      17n,
      "0x1234",
      0,
      100n,
      20n,
      2n,
      zeroAddress,
      zeroAddress,
      `0x${lowSignature.slice(2)}${highSignature.slice(2)}`,
    ]);
    const sorted = usableSafeConfirmations(
      {
        confirmations: [
          { owner: LETTER_OWNER, signature: lowSignature },
          { owner: HIGH_OWNER, signature: lowSignature },
        ],
      },
      owners,
    );
    expect(sorted.map(({ owner }) => owner)).toEqual([
      HIGH_OWNER,
      getAddress(LETTER_OWNER),
    ]);
    // Checksummed, "0x1B1b…" sorts before "0x1a1A…" as text, after it as a
    // number; Safe wants numeric order or it reverts with GS026.
    const lower = "0x1a1A1A1A1a1A1A1a1A1a1a1a1a1a1a1A1A1a1a1a" as Address;
    const higher = "0x1B1b1B1B1B1B1B1B1b1b1B1B1b1b1B1B1b1b1B1b" as Address;
    expect(higher < lower).toBe(true);
    for (const order of [
      [higher, lower],
      [lower, higher],
    ]) {
      expect(
        usableSafeConfirmations(
          {
            confirmations: order.map((owner) => ({
              owner,
              signature: lowSignature,
            })),
          },
          [lower, higher],
        ).map(({ owner }) => owner),
      ).toEqual([lower, higher]);
    }
  });

  it("keeps EIP-1271 contract signatures, prefers a signature to an approval, and drops the malformed", () => {
    const kept = usableSafeConfirmations(
      {
        confirmations: [
          { owner: LOW_OWNER },
          { owner: LOW_OWNER, signature: contractSignature },
          { owner: HIGH_OWNER, signature: "0xdeadbeef" as Hex },
          { owner: LETTER_OWNER, signature: `0x${"1".repeat(131)}` as Hex },
          { owner: "0x12" as Address, signature: lowSignature },
          null as unknown as { owner: Address },
        ],
      },
      owners,
    );
    expect(kept).toEqual([{ owner: LOW_OWNER, signature: contractSignature }]);
    // A later approval never replaces an owner's signature.
    expect(
      usableSafeConfirmations(
        {
          confirmations: [
            { owner: LOW_OWNER, signature: lowSignature },
            { owner: LOW_OWNER },
            { owner: LOW_OWNER, signature: highSignature },
          ],
        },
        owners,
      ),
    ).toEqual([{ owner: LOW_OWNER, signature: lowSignature }]);
    // A mixed-case owner with a broken checksum is corrupt, not an owner.
    const badChecksum = getAddress(LETTER_OWNER).replace("a", "A") as Address;
    expect(badChecksum.toLowerCase()).toBe(LETTER_OWNER.toLowerCase());
    expect(
      usableSafeConfirmations(
        { confirmations: [{ owner: badChecksum, signature: lowSignature }] },
        owners,
      ),
    ).toEqual([]);
    expect(usableSafeConfirmations({}, owners)).toEqual([]);
    expect(() =>
      usableSafeConfirmations(transaction, ["0x12" as Address]),
    ).toThrow("Invalid Safe owner: 0x12.");
    expect(() =>
      usableSafeConfirmations(transaction, null as unknown as Address[]),
    ).toThrow("Invalid Safe owners: null.");
  });

  it("places a contract owner's signature after every head, at its byte offset", () => {
    const word = (owner: Address) =>
      owner.slice(2).toLowerCase().padStart(64, "0");
    const offset = (bytes: number) => bytes.toString(16).padStart(64, "0");
    const tail = `${offset(65)}${nestedSignature.slice(2)}`;
    // One EOA signature, then the contract owner: 65 + 65 heads, then the tail.
    for (const padded of [false, true]) {
      const signatures = safeExecutionSignatures(
        {
          confirmations: [
            {
              owner: HIGH_OWNER,
              signature: serviceContractSignature(
                HIGH_OWNER,
                nestedSignature,
                padded,
              ),
            },
            { owner: LOW_OWNER, signature: lowSignature },
          ],
        },
        owners,
      );
      expect(signatures).toBe(
        `0x${lowSignature.slice(2)}${word(HIGH_OWNER)}${offset(130)}00${tail}`,
      );
      expect((signatures.length - 2) / 2).toBe(227);
    }
    // The contract owner first: its head still points past both heads.
    expect(
      safeExecutionSignatures(
        {
          confirmations: [
            { owner: LOW_OWNER, signature: contractSignature },
            { owner: HIGH_OWNER, signature: highSignature },
          ],
        },
        owners,
      ),
    ).toBe(
      `0x${word(LOW_OWNER)}${offset(130)}00${highSignature.slice(2)}${tail}`,
    );
    // Two contract owners: the second tail starts after the first.
    const second = `0x${"cd".repeat(70)}` as Hex;
    expect(
      safeExecutionSignatures(
        {
          confirmations: [
            { owner: LOW_OWNER, signature: contractSignature },
            {
              owner: HIGH_OWNER,
              signature: serviceContractSignature(HIGH_OWNER, second),
            },
          ],
        },
        owners,
      ),
    ).toBe(
      `0x${word(LOW_OWNER)}${offset(130)}00${word(HIGH_OWNER)}${offset(130 + 32 + 65)}00${tail}${offset(70)}${second.slice(2)}`,
    );
  });

  it("never counts a malformed contract, approval or ECDSA signature", () => {
    const valid = serviceContractSignature(LOW_OWNER, nestedSignature).slice(2);
    const malformed = [
      // r names another owner.
      serviceContractSignature(HIGH_OWNER, nestedSignature),
      // s is not 65.
      `0x${valid.slice(0, 64)}${(66).toString(16).padStart(64, "0")}${valid.slice(128)}`,
      // The length runs past the bytes.
      `0x${valid.slice(0, 130)}${(66).toString(16).padStart(64, "0")}${valid.slice(194)}`,
      // Nonzero padding, and a whole extra word of it.
      `0x${valid}01`,
      `0x${valid}${"0".repeat(64)}`,
      // Too short for a length word.
      `0x${valid.slice(0, 160)}`,
      // A 70-byte signature that is not a contract signature.
      `0x${"11".repeat(70)}`,
      // An approved hash (v = 1) naming another owner.
      `0x${HIGH_OWNER.slice(2).toLowerCase().padStart(64, "0")}${"0".repeat(64)}01`,
    ] as Hex[];
    for (const signature of malformed) {
      expect(
        usableSafeConfirmations(
          { confirmations: [{ owner: LOW_OWNER, signature }] },
          owners,
        ),
      ).toEqual([]);
    }
    // An approved hash naming its own owner counts.
    const approval =
      `0x${LOW_OWNER.slice(2).toLowerCase().padStart(64, "0")}${"0".repeat(64)}01` as Hex;
    expect(
      usableSafeConfirmations(
        { confirmations: [{ owner: LOW_OWNER, signature: approval }] },
        owners,
      ),
    ).toEqual([{ owner: LOW_OWNER, signature: approval }]);
  });

  it("encodes an onchain approval as Safe's v = 1 signature of the owner", () => {
    expect(
      safeExecutionSignatures(
        { confirmations: [{ owner: LOW_OWNER }] },
        owners,
      ),
    ).toBe(
      `0x${LOW_OWNER.slice(2).toLowerCase().padStart(64, "0")}${"0".repeat(64)}01`,
    );
    expect(
      safeExecutionSignatures(
        { confirmations: [{ owner: LOW_OWNER, signature: null }] },
        owners,
      ),
    ).toHaveLength(2 + 65 * 2);
  });

  it("round-trips the exact execTransaction call", () => {
    const args = safeExecutionArgs(transaction, owners);
    const data = encodeFunctionData({
      abi: SAFE_EXEC_ABI,
      functionName: "execTransaction",
      args,
    });
    expect(decodeFunctionData({ abi: SAFE_EXEC_ABI, data }).args).toEqual(args);
    expect(
      decodeFunctionData({
        abi: SAFE_EXEC_ABI,
        data: encodeFunctionData({
          abi: SAFE_EXEC_ABI,
          functionName: "approveHash",
          args: [`0x${"ab".repeat(32)}`],
        }),
      }).functionName,
    ).toBe("approveHash");
  });
});

describe("Safe proposals", () => {
  const REGISTRY = "0x72F55a54CD53410a5Ff175508a5A384227081788" as Address;
  const calls = [
    { to: REGISTRY, data: "0x779b0290aa" as Hex, value: 0n },
    { to: TARGET, data: "0xf3e37d01bb" as Hex, value: 0n },
  ];

  it("shapes a zero-refund CALL, or one MultiSendCallOnly DELEGATECALL for a batch", () => {
    expect(safeProposalFor({ to: TARGET, data: "0x12", value: 5n }, 3)).toEqual(
      {
        to: getAddress(TARGET),
        value: "5",
        data: "0x12",
        operation: 0,
        safeTxGas: "0",
        baseGas: "0",
        gasPrice: "0",
        gasToken: zeroAddress,
        refundReceiver: zeroAddress,
        nonce: 3,
        confirmations: [],
      },
    );
    const batch = safeBatchProposalFor(calls, 9);
    expect(batch).toMatchObject({
      to: MULTI_SEND_CALL_ONLY,
      value: "0",
      data: encodeMultiSend(calls),
      operation: 1,
      nonce: 9,
    });
    const plain = safeProposalFor(
      { to: MULTI_SEND_CALL_ONLY, data: encodeMultiSend(calls) },
      9,
    );
    expect(safeTransactionHash(8453, SAFE, batch)).not.toBe(
      safeTransactionHash(8453, SAFE, plain),
    );
    expect(() =>
      safeProposalFor({ to: "0x12" as Address, data: "0x" }, 1),
    ).toThrow("The Safe transaction's to is invalid: 0x12.");
    expect(() =>
      safeProposalFor({ to: TARGET, data: "0x1" as Hex }, 1),
    ).toThrow("The Safe transaction's data is invalid: 0x1.");
    expect(() => safeProposalFor({ to: TARGET, data: "0x" }, -1)).toThrow(
      "The Safe transaction's nonce is invalid: -1.",
    );
  });

  it("names a transaction that pays its executor a refund", () => {
    expect(safeTransactionHasRefund(transaction)).toBe(true);
    expect(safeTransactionHasRefund({ ...transaction, gasPrice: "0" })).toBe(
      false,
    );
    expect(
      safeTransactionHasRefund(safeProposalFor({ to: TARGET, data: "0x" }, 1)),
    ).toBe(false);
    expect(() =>
      safeTransactionHasRefund({
        ...transaction,
        gasPrice: -1,
      } as SafeQueuedTransaction),
    ).toThrow("The Safe transaction's gasPrice is invalid: -1.");
  });

  it("matches a queued proposal only on its exact call, operation and zero refund", () => {
    const batch = safeBatchProposalFor(calls, 9);
    const batchCall = {
      to: MULTI_SEND_CALL_ONLY,
      data: encodeMultiSend(calls),
      operation: 1 as const,
    };
    expect(safeTransactionMatchesCall(batch, batchCall)).toBe(true);
    for (const call of [
      { ...batchCall, operation: 0 as const },
      { ...batchCall, operation: undefined },
      { ...batchCall, data: encodeMultiSend([calls[1], calls[0]]) },
      { ...batchCall, value: 1n },
      { ...batchCall, to: TARGET },
      { ...batchCall, to: "0x12" as Address },
    ]) {
      expect(safeTransactionMatchesCall(batch, call)).toBe(false);
    }
    for (const refund of [
      { safeTxGas: "1" },
      { baseGas: "1" },
      { gasPrice: "1" },
      { gasToken: TARGET },
      { refundReceiver: TARGET },
      { to: "0x12" as Address },
    ]) {
      expect(
        safeTransactionMatchesCall({ ...batch, ...refund }, batchCall),
      ).toBe(false);
    }
  });

  it("proposes after everything queued, never below the Safe's own nonce", () => {
    expect(nextProposalNonce(5, [])).toBe(5);
    expect(nextProposalNonce(5, [{ nonce: 5 }, { nonce: 7 }])).toBe(8);
    expect(nextProposalNonce(9, [{ nonce: 5 }])).toBe(9);
    expect(() => nextProposalNonce(5, [{ nonce: Number.NaN }])).toThrow(
      "The Safe transaction's nonce is invalid: NaN.",
    );
  });

  it("lets the owner who completes the threshold execute instead of approving", () => {
    expect(
      onchainApprovalStep({ account: LOW_OWNER, approved: [], threshold: 2 }),
    ).toEqual({
      kind: "approve",
    });
    expect(
      onchainApprovalStep({
        account: LOW_OWNER,
        approved: [LOW_OWNER],
        threshold: 2,
      }),
    ).toEqual({ kind: "waiting" });
    expect(
      onchainApprovalStep({
        account: LOW_OWNER,
        approved: [HIGH_OWNER],
        threshold: 2,
      }),
    ).toEqual({ kind: "execute", signers: [HIGH_OWNER, LOW_OWNER] });
    expect(
      onchainApprovalStep({ account: LOW_OWNER, approved: [], threshold: 1 }),
    ).toEqual({
      kind: "execute",
      signers: [LOW_OWNER],
    });
  });
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("Safe transaction service", () => {
  const base = "https://api.safe.global/tx-service/eth";
  const row = (overrides: Partial<SafeQueuedTransaction> = {}) => {
    const tx = { ...transaction, ...overrides };
    return { ...tx, safe: SAFE, safeTxHash: safeTransactionHash(1, SAFE, tx) };
  };

  it("knows which chains host a service, and links one queued transaction", () => {
    expect(hasSafeService(1)).toBe(true);
    expect(hasSafeService(11155420)).toBe(false);
    const hash = safeTransactionHash(1, SAFE, transaction);
    expect(safeTransactionUrl(1, SAFE, hash)).toBe(
      `https://app.safe.global/transactions/tx?safe=eth:${SAFE}&id=multisig_${SAFE}_${hash}`,
    );
    expect(
      safeTransactionUrl(10, SAFE.toLowerCase() as Address, hash),
    ).toContain(`safe=oeth:${SAFE}`);
    expect(safeTransactionUrl(999, SAFE, hash)).toBeNull();
    expect(safeTransactionUrl(1, "0x12" as Address, hash)).toBeNull();
    expect(safeTransactionUrl(1, SAFE, "0x12")).toBeNull();
  });

  it("lists every page from the Safe's nonce on, built from the Safe's own URL", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        json({
          next: "https://evil.example/",
          results: Array.from({ length: 50 }, (_, index) =>
            row({ nonce: 8 + index }),
          ),
        }),
      )
      .mockResolvedValueOnce(
        json({ next: null, results: [row({ nonce: 7 }), row({ nonce: 99 })] }),
      );
    const listed = await listPendingSafeTransactions(1, SAFE, 8, {
      fetch: fetcher,
    });
    expect(listed.map((tx) => tx.nonce)).toEqual([
      ...Array.from({ length: 50 }, (_, index) => 8 + index),
      99,
    ]);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      `${base}/api/v1/safes/${SAFE}/multisig-transactions/?executed=false&trusted=true&ordering=nonce&limit=50&offset=0&nonce__gte=8`,
      `${base}/api/v1/safes/${SAFE}/multisig-transactions/?executed=false&trusted=true&ordering=nonce&limit=50&offset=50&nonce__gte=8`,
    ]);
  });

  it("lists a row whose proposer omitted the gas token and refund receiver", async () => {
    const omitted = { ...row(), gasToken: null, refundReceiver: null };
    const fetcher = vi.fn(async () => json({ next: null, results: [omitted] }));
    await expect(
      listPendingSafeTransactions(1, SAFE, 8, { fetch: fetcher }),
    ).resolves.toHaveLength(1);
  });

  it("returns normalized rows, drops executed ones, and refuses a row with no hash, too many confirmations or an oversized page", async () => {
    const page = (results: unknown[]) =>
      vi.fn(async () => json({ next: null, results }));
    const listed = await listPendingSafeTransactions(1, SAFE, 8, {
      fetch: page([
        { ...row(), nonce: "8" },
        { ...row({ nonce: 9 }), isExecuted: true },
      ]),
    });
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      nonce: 8,
      safe: SAFE,
      safeTxHash: safeTransactionHash(1, SAFE, transaction),
    });
    const { safeTxHash: hash, ...unhashed } = row();
    // The service's other name for the hash is enough.
    await expect(
      listPendingSafeTransactions(1, SAFE, 8, {
        fetch: page([{ ...unhashed, contractTransactionHash: hash }]),
      }),
    ).resolves.toHaveLength(1);
    for (const [bad, problem] of [
      [
        { ...unhashed, safeTxHash: null, contractTransactionHash: null },
        "It advertises no safeTxHash.",
      ],
      [unhashed, "It advertises no safeTxHash."],
      [
        {
          ...row(),
          confirmations: Array.from({ length: 101 }, () => ({
            owner: LOW_OWNER,
            signature: lowSignature,
          })),
        },
        "Its confirmations are not a list of at most 100.",
      ],
      [{ ...row(), confirmations: "all" }, "Its confirmations are not a list"],
    ] as const) {
      await expect(
        listPendingSafeTransactions(1, SAFE, 8, { fetch: page([bad]) }),
      ).rejects.toThrow(problem);
    }
    await expect(
      listPendingSafeTransactions(1, SAFE, 8, {
        fetch: page(
          Array.from({ length: 51 }, (_, index) => row({ nonce: 8 + index })),
        ),
      }),
    ).rejects.toThrow("returned 51 transactions in a page of 50");
    expect(() =>
      canonicalSafeTxHash(1, SAFE, transaction, null as unknown as Hex),
    ).toThrow("Invalid reviewed Safe transaction hash: null.");
  });

  it("finds the queued proposal of an exact call", async () => {
    const proposal = safeProposalFor({ to: TARGET, data: "0x12" }, 8);
    const fetcher = vi.fn(async () =>
      json({
        next: null,
        results: [
          row(),
          {
            ...proposal,
            safe: SAFE,
            safeTxHash: safeTransactionHash(1, SAFE, proposal),
          },
        ],
      }),
    );
    await expect(
      findPendingSafeTransaction(
        1,
        SAFE,
        8,
        { to: TARGET, data: "0x12" },
        { fetch: fetcher },
      ),
    ).resolves.toMatchObject({ to: getAddress(TARGET), data: "0x12" });
    await expect(
      findPendingSafeTransaction(
        1,
        SAFE,
        8,
        { to: TARGET, data: "0x13" },
        { fetch: fetcher },
      ),
    ).resolves.toBeNull();
  });

  it("never reads an outage, a foreign row or a mismatched hash as a queue", async () => {
    await expect(listPendingSafeTransactions(999, SAFE, 0)).rejects.toThrow(
      "Safe does not host a transaction service on chain 999.",
    );
    vi.useFakeTimers();
    const failing = vi.fn(async () => new Response("down", { status: 503 }));
    const pending = listPendingSafeTransactions(1, SAFE, 8, {
      fetch: failing,
    }).catch((error) => error);
    await vi.advanceTimersByTimeAsync(500);
    expect(String(await pending)).toContain(
      `Safe's transaction service answered 503 listing the queue of Safe ${SAFE} on chain 1: down`,
    );
    expect(failing).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
    for (const [results, problem] of [
      [[{ ...row(), safe: OTHER_SAFE }], `belongs to ${OTHER_SAFE}`],
      [
        [
          {
            ...row(),
            safeTxHash: safeTransactionHash(1, SAFE, {
              ...transaction,
              nonce: 99,
            }),
          },
        ],
        "does not match its fields",
      ],
      [[{ ...row(), to: "0x12" }], "to is invalid"],
    ] as const) {
      await expect(
        listPendingSafeTransactions(1, SAFE, 8, {
          fetch: vi.fn(async () => json({ next: null, results })),
        }),
      ).rejects.toThrow(problem);
    }
    await expect(
      listPendingSafeTransactions(1, SAFE, 8, {
        fetch: vi.fn(async () => json({ next: null })),
      }),
    ).rejects.toThrow(
      `Safe's transaction service returned no transaction list for Safe ${SAFE} on chain 1.`,
    );
    const endless = vi.fn(async () =>
      json({ next: "more", results: Array.from({ length: 50 }, () => row()) }),
    );
    await expect(
      listPendingSafeTransactions(1, SAFE, 8, { fetch: endless }),
    ).rejects.toThrow(
      `Safe ${SAFE} has more than 250 queued transactions on chain 1.`,
    );
    expect(endless).toHaveBeenCalledTimes(5);
    await expect(listPendingSafeTransactions(1, SAFE, -1)).rejects.toThrow(
      "The Safe transaction's nonce is invalid: -1.",
    );
  });

  it("retries a page once, and a 429 after its Retry-After delay", async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("busy", { status: 429, headers: { "retry-after": "2" } }),
      )
      .mockResolvedValueOnce(new Response("", { status: 502 }))
      .mockResolvedValueOnce(new Response("busy", { status: 429 }))
      .mockResolvedValueOnce(json({ next: null, results: [row()] }));
    const pending = listPendingSafeTransactions(1, SAFE, 8, { fetch: fetcher });
    await vi.advanceTimersByTimeAsync(2000 + 500 + 1000);
    await expect(pending).resolves.toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("uses the global fetch unless given one", async () => {
    const fetcher = vi.fn(async () => json({ next: null, results: [row()] }));
    vi.stubGlobal("fetch", fetcher);
    await expect(listPendingSafeTransactions(1, SAFE, 8)).resolves.toHaveLength(
      1,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("sends the optional local API key with every request", async () => {
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => (key === "jb-safe-api-key" ? "secret" : null),
    });
    const fetcher = vi.fn(async () => json({ next: null, results: [] }));
    await listPendingSafeTransactions(1, SAFE, 0, { fetch: fetcher });
    expect(fetcher).toHaveBeenCalledWith(expect.any(String), {
      headers: { accept: "application/json", authorization: "Bearer secret" },
    });
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
    });
    await listPendingSafeTransactions(1, SAFE, 0, { fetch: fetcher });
    expect(fetcher).toHaveBeenLastCalledWith(expect.any(String), {
      headers: { accept: "application/json" },
    });
  });

  it("reads one proposal only when it is the Safe's and hashes to what was asked", async () => {
    const hash = safeTransactionHash(1, SAFE, transaction);
    const fetcher = vi.fn(async () => json(row()));
    await expect(
      readSafeTransaction(1, SAFE, hash, { fetch: fetcher }),
    ).resolves.toMatchObject({
      nonce: 8,
    });
    expect(fetcher).toHaveBeenCalledWith(
      `${base}/api/v1/multisig-transactions/${hash}/`,
      expect.anything(),
    );
    for (const record of [
      { ...row(), safe: OTHER_SAFE },
      { ...row(), safe: undefined },
      { ...row({ nonce: 9 }), safeTxHash: undefined },
    ]) {
      await expect(
        readSafeTransaction(1, SAFE, hash, {
          fetch: vi.fn(async () => json(record)),
        }),
      ).rejects.toThrow(
        `Safe's record of proposal ${hash} does not match Safe ${SAFE} on chain 1.`,
      );
    }
    await expect(
      readSafeTransaction(1, SAFE, hash, {
        fetch: vi.fn(async () => new Response("", { status: 404 })),
      }),
    ).rejects.toThrow(
      `Safe's transaction service answered 404 for proposal ${hash} on chain 1.`,
    );
    await expect(readSafeTransaction(1, SAFE, "0x12")).rejects.toThrow(
      "Invalid Safe transaction hash: 0x12.",
    );
  });

  it("posts a proposal built from its exact fields, and returns their hash", async () => {
    const tx = safeBatchProposalFor([{ to: TARGET, data: "0x12" }], 9);
    const fetcher = vi.fn(async () => new Response("{}", { status: 201 }));
    const hash = await proposeSafeTransaction(
      8453,
      SAFE.toLowerCase() as Address,
      tx,
      { sender: LOW_OWNER, signature: lowSignature, origin: "Juicebox" },
      { fetch: fetcher },
    );
    expect(hash).toBe(safeTransactionHash(8453, SAFE, tx));
    const [url, init] = fetcher.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe(
      `https://api.safe.global/tx-service/base/api/v1/safes/${SAFE}/multisig-transactions/`,
    );
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      to: MULTI_SEND_CALL_ONLY,
      value: "0",
      data: tx.data,
      operation: 1,
      safeTxGas: "0",
      baseGas: "0",
      gasPrice: "0",
      gasToken: zeroAddress,
      refundReceiver: zeroAddress,
      nonce: "9",
      contractTransactionHash: hash,
      sender: LOW_OWNER,
      signature: lowSignature,
      origin: "Juicebox",
    });
  });

  it("refuses to propose a short signature, no origin, a mismatched record or a refused post", async () => {
    const tx = safeProposalFor({ to: TARGET, data: "0x12" }, 9);
    const fetcher = vi.fn(async () => new Response("{}", { status: 201 }));
    const propose = (
      fields: Partial<Parameters<typeof proposeSafeTransaction>[3]>,
      record = tx,
      f = fetcher,
    ) =>
      proposeSafeTransaction(
        1,
        SAFE,
        record,
        {
          sender: LOW_OWNER,
          signature: lowSignature,
          origin: "app",
          ...fields,
        },
        { fetch: f },
      );
    await expect(propose({ signature: "0x99" })).rejects.toThrow(
      "Invalid Safe signature: 0x99.",
    );
    await expect(propose({ origin: " " })).rejects.toThrow(
      "A Safe proposal needs an origin naming the app.",
    );
    await expect(propose({ sender: "0x12" as Address })).rejects.toThrow(
      "The Safe transaction's sender is invalid: 0x12.",
    );
    await expect(
      propose(
        {},
        {
          ...tx,
          safeTxHash: safeTransactionHash(1, SAFE, { ...tx, nonce: 10 }),
        },
      ),
    ).rejects.toThrow("does not match its fields");
    expect(fetcher).not.toHaveBeenCalled();
    await expect(
      propose(
        {},
        tx,
        vi.fn(async () => new Response("Nonce too low", { status: 422 })),
      ),
    ).rejects.toThrow(
      `Safe's transaction service refused the proposal ${safeTransactionHash(1, SAFE, tx)} for Safe ${SAFE} on chain 1 (422): Nonce too low`,
    );
    await expect(
      propose(
        {},
        tx,
        vi.fn(async () => new Response("", { status: 500 })),
      ),
    ).rejects.toThrow(/\(500\)$/);
    await expect(
      proposeSafeTransaction(999, SAFE, tx, {
        sender: LOW_OWNER,
        signature: lowSignature,
        origin: "app",
      }),
    ).rejects.toThrow("Safe does not host a transaction service on chain 999.");
  });

  it("confirms at the hash of the exact fields, never an advertised one", async () => {
    const hash = safeTransactionHash(1, SAFE, transaction);
    const fetcher = vi.fn(async () => new Response("", { status: 201 }));
    await submitSafeConfirmation(1, SAFE, transaction, highSignature, {
      fetch: fetcher,
    });
    expect(fetcher).toHaveBeenCalledWith(
      `${base}/api/v1/multisig-transactions/${hash}/confirmations/`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({ signature: highSignature }),
      },
    );
    await expect(
      submitSafeConfirmation(
        1,
        SAFE,
        {
          ...transaction,
          safeTxHash: safeTransactionHash(1, SAFE, {
            ...transaction,
            nonce: 9,
          }),
        },
        highSignature,
        { fetch: fetcher },
      ),
    ).rejects.toThrow("does not match its fields");
    await expect(
      submitSafeConfirmation(1, SAFE, transaction, highSignature, {
        fetch: vi.fn(
          async () => new Response("Signer not owner", { status: 400 }),
        ),
      }),
    ).rejects.toThrow(
      `Safe's transaction service refused the confirmation of ${hash} on chain 1 (400): Signer not owner`,
    );
  });

  it("lists the Safes an owner signs for, checksummed, and nothing for a failing chain", async () => {
    const SAFE_A = "0x4444444444444444444444444444444444444444";
    const fetcher = vi.fn(async (url: string) => {
      if (url.includes("/tx-service/eth/"))
        return json({
          safes: [
            SAFE_A,
            SAFE_A.toUpperCase().replace("0X", "0x"),
            "not-an-address",
            42,
          ],
        });
      if (url.includes("/tx-service/base/"))
        return new Response("shed", { status: 503 });
      if (url.includes("/tx-service/oeth/")) return json({ safes: "none" });
      throw new Error("network down");
    }) as unknown as typeof fetch;
    await expect(
      fetchSafesOwnedBy(
        LOW_OWNER.toLowerCase(),
        [1, 8453, 10, 42161, 11155420],
        { fetch: fetcher },
      ),
    ).resolves.toEqual([
      { chainId: 1, safe: getAddress(SAFE_A) },
      { chainId: 1, safe: getAddress(SAFE_A) },
    ]);
    expect(
      String((fetcher as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]),
    ).toBe(`${base}/api/v1/owners/${LOW_OWNER}/safes/`);
    await expect(
      fetchSafesOwnedBy("not-an-address", [1], { fetch: fetcher }),
    ).resolves.toEqual([]);
    // At most 200 Safes per chain are read.
    const many = vi.fn(async () =>
      json({
        safes: Array.from(
          { length: 250 },
          (_, index) => `0x${(index + 1).toString(16).padStart(40, "0")}`,
        ),
      }),
    ) as unknown as typeof fetch;
    await expect(
      fetchSafesOwnedBy(LOW_OWNER, [1], { fetch: many }),
    ).resolves.toHaveLength(200);
  });

  it("reads a Safe's creation strictly, from its source chain's service only", async () => {
    const singleton = RECOGNIZED_SAFE_RELEASES[0].singletons[0];
    const factory = RECOGNIZED_SAFE_RELEASES[0].factories[0];
    const setupData = encodeFunctionData({
      abi: SAFE_SETUP_ABI,
      functionName: "setup",
      args: [
        [LOW_OWNER],
        1n,
        zeroAddress,
        "0x",
        zeroAddress,
        zeroAddress,
        0n,
        zeroAddress,
      ],
    });
    const payload = {
      factoryAddress: factory,
      masterCopy: singleton,
      setupData,
      saltNonce: "42",
    };
    const creation = {
      factory,
      singleton,
      initializer: setupData,
      saltNonce: 42n,
    };
    expect(safeCreationUrl(8453, SAFE)).toBe(
      `https://api.safe.global/tx-service/base/api/v1/safes/${SAFE}/creation/`,
    );
    expect(safeCreationUrl(84532, SAFE.toLowerCase())).toBe(
      `https://api.safe.global/tx-service/basesep/api/v1/safes/${SAFE}/creation/`,
    );
    expect(safeCreationUrl(11155420, SAFE)).toBeNull();
    expect(safeCreationUrl(1, "not-an-address")).toBeNull();
    expect(parseSafeCreationPayload(payload)).toEqual(creation);
    for (const bad of [
      { ...payload, factoryAddress: TARGET },
      { ...payload, masterCopy: TARGET },
      { ...payload, factoryAddress: RECOGNIZED_SAFE_RELEASES[1].factories[0] },
      { ...payload, setupData: "0x123" },
      { ...payload, setupData: "0x1234" },
      { ...payload, saltNonce: undefined },
      { ...payload, saltNonce: "0x2a" },
      { ...payload, saltNonce: "-1" },
      { ...payload, saltNonce: `1${"0".repeat(78)}` },
      { ...payload, factoryAddress: 1 },
      null,
      "creation",
    ]) {
      expect(parseSafeCreationPayload(bad)).toBeNull();
    }
    const fetcher = vi.fn(async (_url: string) => json(payload));
    await expect(
      fetchSafeCreation(SAFE, 8453, {
        fetch: fetcher as unknown as typeof fetch,
      }),
    ).resolves.toEqual(creation);
    expect(fetcher.mock.calls[0][0]).toContain("/tx-service/base/");
    await expect(
      fetchSafeCreation(SAFE, 11155420, {
        fetch: fetcher as unknown as typeof fetch,
      }),
    ).resolves.toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
    await expect(
      fetchSafeCreation(SAFE, 8453, {
        fetch: vi.fn(async () => new Response("", { status: 404 })),
      }),
    ).resolves.toBeNull();
    await expect(
      fetchSafeCreation(SAFE, 8453, {
        fetch: vi.fn().mockRejectedValue(new Error("offline")),
      }),
    ).resolves.toBeNull();
  });
});
