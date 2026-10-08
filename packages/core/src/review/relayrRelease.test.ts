import {
  createPublicClient,
  http,
  UserRejectedRequestError,
  type Address,
  type Hex,
} from "viem";
import { mainnet } from "viem/chains";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_RELAYR_SENT_PAYMENTS,
  RELAYR_NATIVE_TOKEN,
  RELAYR_PAYMENT_ADDRESS,
  RELAYR_PAYMENT_SELECTOR,
  RELAYR_UUID_RE,
  RelayrPaymentRetryError,
  RelayrPaymentNotSentError,
  RelayrPaymentRevertedError,
  RelayrProofError,
  proveSavedRelayrPayment,
  relayrPaidQuoteOpen,
  relayrPaymentAttemptOutcome,
  relayrPaymentDetails,
  relayrQuotedOptions,
  relayrRetryOption,
  relayrSentPaymentsSnapshot,
  requireRelayrRetry,
  revertedRelayrQuote,
  sentRelayrPayment,
  type RelayrPayment,
  type RelayrReleaseClient,
  type RelayrSentPayment,
} from "./relayr.js";

// Juicebox Money's R104 quote-release and payment-attempt rules, ported with
// the scenarios of its tests at 27c40e98: test/transactions/
// relayr-orchestration.test.ts ("paying a reverted Relayr payment again",
// "once its quote expired (ruling R104)"), payer-relayr.test.ts and
// launch-relayr.test.ts.

const ACCOUNT = "0x1111111111111111111111111111111111111111" as Address;
const BUNDLE_UUID = "01234567-89ab-cdef-0123-456789abcdef";
const OTHER_UUID = "fedcba98-7654-3210-fedc-ba9876543210";
const HASH = `0x${"ab".repeat(32)}` as Hex;
const SECOND_HASH = `0x${"5c".repeat(32)}` as Hex;
const DESTINATION_HASH = `0x${"77".repeat(32)}` as Hex;
const BLOCK_HASH = `0x${"45".repeat(32)}` as Hex;
const FINAL_HASH = `0x${"46".repeat(32)}` as Hex;
const OTHER_HASH = `0x${"47".repeat(32)}` as Hex;
const START = 1_900_000_000;
/** The first quote is payable until DEADLINE. */
const DEADLINE = START + 600;

function paymentCalldata(uuid = BUNDLE_UUID, deadline = DEADLINE): Hex {
  const uuidWord = uuid.replaceAll("-", "").padEnd(64, "0");
  const deadlineWord = BigInt(deadline).toString(16).padStart(64, "0");
  return `${RELAYR_PAYMENT_SELECTOR}${uuidWord}${deadlineWord}` as Hex;
}

/** One of Relayr's payment options for BUNDLE_UUID. */
function paymentFor(
  overrides: Partial<RelayrPayment> = {},
  deadline = DEADLINE,
): RelayrPayment {
  return {
    chain: 1,
    amount: "100",
    calldata: paymentCalldata(BUNDLE_UUID, deadline),
    target: RELAYR_PAYMENT_ADDRESS,
    token: RELAYR_NATIVE_TOKEN,
    payment_deadline: deadline,
    ...overrides,
  };
}

/** The payment relayrPay records for `option` once it is sent under `hash`. */
function sent(option = paymentFor(), hash = HASH): RelayrSentPayment {
  return sentRelayrPayment(
    relayrPaymentDetails(option, {
      bundleUuid: BUNDLE_UUID,
      destinationChainIds: [1, 10],
      nowSeconds: START,
    }),
    hash,
  );
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("the payments a quote's journal keeps", () => {
  it("records a payment as it was authenticated, with its amount and deadline in decimal and the hash it was mined under", () => {
    const payment = sent();
    expect(payment).toEqual({
      chainId: 1,
      target: RELAYR_PAYMENT_ADDRESS,
      amount: "100",
      calldata: paymentCalldata(),
      bundleUuid: BUNDLE_UUID,
      deadline: String(DEADLINE),
      hash: HASH,
    });
    expect(
      relayrSentPaymentsSnapshot(JSON.parse(JSON.stringify([payment]))),
    ).toEqual([payment]);
  });

  it("keeps at most 16 payments for one quote", () => {
    expect(MAX_RELAYR_SENT_PAYMENTS).toBe(16);
    const full = Array.from({ length: 16 }, () => sent());
    expect(relayrSentPaymentsSnapshot(full)).toHaveLength(16);
    expect(relayrSentPaymentsSnapshot([...full, sent()])).toBeNull();
    expect(relayrSentPaymentsSnapshot([])).toEqual([]);
  });

  it("reads a saved list strictly, keeping only the payment's own fields", () => {
    const [read] = relayrSentPaymentsSnapshot([
      { ...sent(), note: "extra", amount: "0100" },
    ])!;
    expect(read).toEqual({ ...sent(), amount: "0100" });
    expect(read).not.toHaveProperty("note");
  });

  it.each<[string, unknown]>([
    ["a list that is not one", { 0: sent(), length: 1 }],
    ["a payment that is not an object", "payment"],
    ["no payment at all", null],
    ["a hash of 31 bytes", { ...sent(), hash: `0x${"ab".repeat(31)}` }],
    ["an unsupported chain", { ...sent(), chainId: 5 }],
    ["a chain written as a string", { ...sent(), chainId: "1" }],
    [
      "a target with a wrong checksum",
      { ...sent(), target: "0x1C05F7841379D4393574c0FFA17908Ec40FFD97D" },
    ],
    ["calldata of the wrong length", { ...sent(), calldata: "0x103903a7" }],
    ["an amount that is not decimal", { ...sent(), amount: "0x64" }],
    ["an amount of 79 digits", { ...sent(), amount: "1".repeat(79) }],
    ["an amount as a number", { ...sent(), amount: 100 }],
    ["a deadline of 14 digits", { ...sent(), deadline: "1".repeat(14) }],
    [
      "a bundle ID in upper case",
      { ...sent(), bundleUuid: BUNDLE_UUID.toUpperCase() },
    ],
    ["a bundle ID that is not one", { ...sent(), bundleUuid: "bundle" }],
    [
      "calldata a byte too long, whose last word is still the deadline",
      {
        ...sent(),
        calldata: `${paymentCalldata().slice(0, 74)}00${paymentCalldata().slice(74)}`,
      },
    ],
    [
      "a deadline that is not the one its calldata pays until",
      { ...sent(), deadline: "1" },
    ],
  ])("refuses a saved list with %s", (_, value) => {
    expect(
      relayrSentPaymentsSnapshot(Array.isArray(value) ? value : [value]),
    ).toBeNull();
  });

  it("reads Relayr IDs in lower case only", () => {
    expect(RELAYR_UUID_RE.test(BUNDLE_UUID)).toBe(true);
    expect(RELAYR_UUID_RE.test(BUNDLE_UUID.toUpperCase())).toBe(false);
    expect(RELAYR_UUID_RE.test(`${BUNDLE_UUID}0`)).toBe(false);
  });
});

describe("the option a quote paid before is paid again with", () => {
  it("is exactly the one its latest payment used: its chain, calldata and amount", () => {
    const used = paymentFor({ amount: "100" });
    const options = [
      paymentFor({ amount: "200" }),
      paymentFor({ chain: 10 }),
      {
        ...used,
        calldata: used.calldata.toUpperCase().replace("0X", "0x") as Hex,
      },
    ];
    expect(
      relayrRetryOption(
        [sent(paymentFor({ amount: "300" }), SECOND_HASH), sent(used)],
        options,
      ),
    ).toBe(options[2]);
    // An amount written with a leading zero is the same amount.
    expect(
      relayrRetryOption([sent(used)], [{ ...used, amount: "0100" }]),
    ).toEqual({
      ...used,
      amount: "0100",
    });
  });

  it.each<
    [string, RelayrSentPayment[] | undefined, RelayrPayment[] | undefined]
  >([
    ["another amount on that chain", [sent()], [paymentFor({ amount: "200" })]],
    ["the same option on another chain", [sent()], [paymentFor({ chain: 10 })]],
    [
      "other calldata",
      [sent()],
      [paymentFor({ calldata: paymentCalldata(OTHER_UUID) })],
    ],
    [
      "calldata that is not a string",
      [sent()],
      [paymentFor({ calldata: 1 as never })],
    ],
    ["an amount as a number", [sent()], [paymentFor({ amount: 100 as never })]],
    ["an amount that is not one", [sent()], [paymentFor({ amount: " 100" })]],
    ["no options", [sent()], undefined],
    ["no payments", [], [paymentFor()]],
    ["no payment list", undefined, [paymentFor()]],
    [
      "a payment list that is not one",
      { length: 1, 0: sent() } as never,
      [paymentFor()],
    ],
    [
      "options that are not a list",
      [sent()],
      { find: () => paymentFor() } as never,
    ],
    [
      "a later twin, after an earlier one whose amount can't be read",
      [sent()],
      [paymentFor({ amount: "100 " }), paymentFor()],
    ],
    [
      "an option whose amount, like the payment's, is beyond a uint256",
      [{ ...sent(), amount: "9".repeat(78) }],
      [paymentFor({ amount: "9".repeat(78) })],
    ],
  ])("refuses %s", (_, payments, options) => {
    expect(() => relayrRetryOption(payments, options)).toThrow(
      "This Relayr quote cannot be paid again from its saved record. Keep it pending; do not pay again.",
    );
  });
});

describe("where a failed payment attempt leaves its quote", () => {
  const rejection = new UserRejectedRequestError(new Error("User rejected."));

  it("clears a saved attempt only for a typed pre-wallet refusal, preserving prior payment policy", () => {
    const cause = new Error("Wallet changed during persistence");
    const error = new RelayrPaymentNotSentError(cause);
    expect(error.message).toBe(cause.message);
    expect(error).toHaveProperty("cause", cause);
    expect(Object.keys(error)).not.toContain("cause");
    expect(
      relayrPaymentAttemptOutcome(error, { sending: true, paid: false }),
    ).toBe("unpaid");
    expect(
      relayrPaymentAttemptOutcome(error, { sending: true, paid: true }),
    ).toBe("reverted");
    expect(
      relayrPaymentAttemptOutcome(error, { sending: false, paid: false }),
    ).toBeNull();
    expect(new RelayrPaymentNotSentError(null).message).toBe(
      "The payment was not sent. Review the payment again.",
    );
  });

  it("never trusts an unsent error name, serialized shape or nested cause", () => {
    for (const error of [
      Object.assign(new Error("nothing sent"), {
        name: "RelayrPaymentNotSentError",
      }),
      { name: "RelayrPaymentNotSentError", message: "nothing sent" },
      Object.assign(new Error("wallet error"), {
        cause: new RelayrPaymentNotSentError(new Error("changed")),
      }),
    ])
      expect(
        relayrPaymentAttemptOutcome(error, { sending: true, paid: false }),
      ).toBeNull();
  });

  it("is reverted when the payment reverted onchain", () => {
    const reverted = new RelayrPaymentRevertedError("reverted", HASH, 1);
    expect(
      relayrPaymentAttemptOutcome(reverted, { sending: true, paid: false }),
    ).toBe("reverted");
    expect(
      relayrPaymentAttemptOutcome(reverted, { sending: false, paid: true }),
    ).toBe("reverted");
  });

  it("is unpaid when the wallet declined a first payment it held, and reverted when it declined to pay a quote paid before", () => {
    expect(
      relayrPaymentAttemptOutcome(rejection, { sending: true, paid: false }),
    ).toBe("unpaid");
    expect(
      relayrPaymentAttemptOutcome(rejection, { sending: true, paid: true }),
    ).toBe("reverted");
    const wrapped = Object.assign(new Error("Request failed"), {
      cause: { code: 4001 },
    });
    expect(
      relayrPaymentAttemptOutcome(wrapped, { sending: true, paid: false }),
    ).toBe("unpaid");
  });

  it("is unknown, leaving the journal as it is, when the wallet did not hold the payment or anything else failed", () => {
    expect(
      relayrPaymentAttemptOutcome(rejection, { sending: false, paid: false }),
    ).toBeNull();
    expect(
      relayrPaymentAttemptOutcome(
        new Error("WalletConnect request timed out"),
        {
          sending: true,
          paid: false,
        },
      ),
    ).toBeNull();
  });
});

describe("whether the quote a session paid can still be paid", () => {
  it("is open while its latest payment's deadline is more than 15 seconds away", () => {
    const payments = [
      sent(paymentFor({}, DEADLINE + 3_600), SECOND_HASH),
      sent(),
    ];
    expect(relayrPaidQuoteOpen(payments, (DEADLINE - 16) * 1_000)).toBe(true);
    expect(relayrPaidQuoteOpen(payments, (DEADLINE - 15) * 1_000)).toBe(false);
  });

  it.each([NaN, Infinity, -Infinity])("is closed at a time of %s", (nowMs) => {
    expect(relayrPaidQuoteOpen([sent()], nowMs)).toBe(false);
  });

  it("reads the clock unless told the time", () => {
    const now = vi.spyOn(Date, "now").mockReturnValue((DEADLINE - 16) * 1_000);
    expect(relayrPaidQuoteOpen([sent()])).toBe(true);
    now.mockReturnValue(DEADLINE * 1_000);
    expect(relayrPaidQuoteOpen([sent()])).toBe(false);
    now.mockRestore();
  });

  it.each<[string, unknown]>([
    ["no payments", []],
    ["no payment list", undefined],
    ["a list that is not one", { length: 1, 0: sent() }],
    [
      "a deadline that is not decimal",
      [{ ...sent(), deadline: " 1900000600" }],
    ],
    ["an empty deadline", [{ ...sent(), deadline: "" }]],
  ])("is closed for %s", (_, payments) => {
    expect(
      relayrPaidQuoteOpen(payments as RelayrSentPayment[], START * 1_000),
    ).toBe(false);
  });
});

describe("the options a session keeps from its quote", () => {
  it("are every option relayrPaymentDetails accepts, expired or not, several on one chain included", () => {
    const options = [
      paymentFor(),
      paymentFor({ amount: "200" }, DEADLINE + 3_600),
      paymentFor({ chain: 10 }),
      paymentFor({ chain: 11155111 }),
      paymentFor({ target: OTHER_HASH.slice(0, 42) as Address }),
    ];
    const quoted = relayrQuotedOptions(
      { bundle_uuid: BUNDLE_UUID, payment_info: options },
      [1, 10],
    );
    expect(quoted.map(({ option }) => option)).toEqual(options.slice(0, 3));
    expect(
      quoted.map(({ details }) => [details.chainId, details.deadline]),
    ).toEqual([
      [1, BigInt(DEADLINE)],
      [1, BigInt(DEADLINE + 3_600)],
      [10, BigInt(DEADLINE)],
    ]);
  });

  it("keep an option whose deadline passed long ago by the clock", () => {
    const old = paymentFor({}, 1_000);
    expect(
      relayrQuotedOptions({ bundle_uuid: BUNDLE_UUID, payment_info: [old] }, [
        1,
      ]),
    ).toEqual([
      {
        option: old,
        details: expect.objectContaining({ chainId: 1, deadline: 1_000n }),
      },
    ]);
  });

  it("are none for a quote whose options are not a list", () => {
    expect(
      relayrQuotedOptions(
        { bundle_uuid: BUNDLE_UUID, payment_info: null as never },
        [1],
      ),
    ).toEqual([]);
  });
});

describe("a quote whose own payments reverted (ruling R104)", () => {
  const UNRELEASED =
    "This Relayr quote expired after its payment reverted. A new quote needs its deadline final onchain and Relayr to report nothing ran; try again in a few minutes.";
  /** Each chain's finalized block timestamp in seconds, or null while it has none. */
  let finalized: Record<number, number | null>;
  /** The hash of the block at the finalized number when it is read again. */
  let canonical: Hex;
  /** The hash of the block a payment was mined in when it is read again. */
  let paymentBlock: Hex;
  /** How each payment mined, by hash: anything missing cannot be read. */
  let mined: Map<string, { payment: RelayrSentPayment; status: string }>;
  /** Relayr's answers to each bundle read, in order; the last one repeats. */
  let reads: (() => Promise<Response>)[];
  let fetchBundle: ReturnType<typeof vi.fn>;
  let clients: Record<number, RelayrReleaseClient | undefined>;

  function chainClient(chainId: number) {
    return {
      getBlock: vi.fn(
        async (args: { blockTag?: "finalized"; blockNumber?: bigint }) => {
          if (args.blockTag === "finalized") {
            const timestamp = finalized[chainId];
            if (timestamp === null) throw new Error("No finalized block");
            return {
              number: 200n,
              hash: FINAL_HASH,
              timestamp: BigInt(timestamp),
            };
          }
          return { hash: args.blockNumber === 200n ? canonical : paymentBlock };
        },
      ),
      getTransaction: vi.fn(async ({ hash }: { hash: Hex }) => {
        const row = mined.get(hash);
        if (!row) throw new Error(`No transaction ${hash}`);
        return {
          hash,
          chainId: row.payment.chainId,
          from: ACCOUNT,
          to: row.payment.target,
          input: row.payment.calldata,
          value: BigInt(row.payment.amount),
          blockHash: BLOCK_HASH,
          blockNumber: 100n,
        };
      }),
      getTransactionReceipt: vi.fn(async ({ hash }: { hash: Hex }) => {
        const row = mined.get(hash);
        if (!row) throw new Error(`No receipt ${hash}`);
        return {
          transactionHash: hash,
          status: row.status,
          to: row.payment.target,
          from: ACCOUNT,
          blockHash: BLOCK_HASH,
          blockNumber: 100n,
          logs: [],
        };
      }),
    } as unknown as RelayrReleaseClient;
  }

  /** Relayr reports the bundle unpaid with its one call pending, unless `body` says otherwise. */
  const bundle =
    (body: Record<string, unknown> = {}) =>
    () =>
      Promise.resolve(
        json({
          bundle_uuid: BUNDLE_UUID,
          payment_received: false,
          transactions: [{ tx_uuid: OTHER_UUID, status: { state: "Pending" } }],
          ...body,
        }),
      );

  beforeEach(() => {
    // Every deadline involved passed at both chains' finalized blocks.
    finalized = { 1: DEADLINE + 3_601, 10: DEADLINE + 3_601 };
    canonical = FINAL_HASH;
    paymentBlock = BLOCK_HASH;
    mined = new Map([[HASH, { payment: sent(), status: "reverted" }]]);
    reads = [bundle()];
    let read = 0;
    fetchBundle = vi.fn(async () =>
      reads[Math.min(read++, reads.length - 1)](),
    );
    clients = { 1: chainClient(1), 10: chainClient(10) };
  });

  /** The quote as an app saved it: one payment, sent and reverted, and its options. */
  function quote(
    overrides: Partial<Parameters<typeof revertedRelayrQuote>[1]> = {},
  ) {
    return {
      bundleUuid: BUNDLE_UUID,
      payments: [sent()],
      options: [paymentFor()],
      destinationChainIds: [1],
      account: ACCOUNT,
      ...overrides,
    };
  }

  const reverted = (
    overrides: Partial<Parameters<typeof revertedRelayrQuote>[1]> = {},
    nowMs = (DEADLINE + 1) * 1_000,
  ) =>
    revertedRelayrQuote((chainId) => clients[chainId], quote(overrides), {
      fetch: fetchBundle as unknown as typeof fetch,
      nowMs,
    });

  it("releases a quote nothing can fund any more, after one more uncached read of its bundle", async () => {
    await expect(reverted()).resolves.toEqual({
      state: "released",
      records: [{ tx_uuid: OTHER_UUID, status: { state: "Pending" } }],
    });
    expect(fetchBundle).toHaveBeenCalledTimes(2);
    for (const [url, init] of fetchBundle.mock.calls) {
      expect(url).toBe(`https://api.relayr.ba5ed.com/v1/bundle/${BUNDLE_UUID}`);
      expect(init).toMatchObject({ cache: "no-store" });
    }
  });

  it("is payable while the quote of its latest payment is open, read or not", async () => {
    await expect(reverted({}, (DEADLINE - 16) * 1_000)).resolves.toEqual({
      state: "payable",
      records: [{ tx_uuid: OTHER_UUID, status: { state: "Pending" } }],
    });
    reads = [() => Promise.reject(new TypeError("Failed to fetch"))];
    await expect(reverted({}, (DEADLINE - 16) * 1_000)).resolves.toEqual({
      state: "payable",
      records: null,
    });
  });

  it.each<[string, Record<string, unknown>]>([
    ["reports a payment", { payment_received: true }],
    [
      "reports a call running",
      {
        transactions: [{ tx_uuid: OTHER_UUID, status: { state: "Included" } }],
      },
    ],
    [
      "reports a destination hash",
      {
        transactions: [
          {
            tx_uuid: OTHER_UUID,
            status: { state: "Pending", data: { hash: DESTINATION_HASH } },
          },
        ],
      },
    ],
    [
      "reports a call in a state that is not a label",
      { transactions: [{ tx_uuid: OTHER_UUID, status: { state: 1 } }] },
    ],
  ])("is funded, never paid again, when Relayr %s", async (_, body) => {
    reads = [bundle(body)];
    await expect(reverted({}, (DEADLINE - 16) * 1_000)).resolves.toMatchObject({
      state: "funded",
    });
    await expect(reverted()).resolves.toMatchObject({ state: "funded" });
  });

  it.each<[string, () => void]>([
    [
      "a payment it sent did not revert",
      () => mined.set(HASH, { payment: sent(), status: "success" }),
    ],
    ["a payment it sent cannot be read", () => mined.clear()],
    [
      "its deadline has not passed at the finalized block",
      () => (finalized[1] = DEADLINE),
    ],
    [
      "the finalized block is no longer canonical",
      () => (canonical = OTHER_HASH),
    ],
    ["its chain has no finalized block", () => (finalized[1] = null)],
    [
      "Relayr does not report it unpaid",
      () => (reads = [bundle({ payment_received: null })]),
    ],
    [
      "Relayr reports it paid on the second read",
      () => (reads = [bundle(), bundle({ payment_received: true })]),
    ],
    [
      "Relayr cannot be read",
      () => (reads = [() => Promise.reject(new TypeError("Failed to fetch"))]),
    ],
    [
      "Relayr names another bundle",
      () => (reads = [bundle({ bundle_uuid: OTHER_UUID })]),
    ],
    [
      "Relayr answers without a list of calls",
      () => (reads = [bundle({ transactions: null })]),
    ],
    [
      "Relayr cannot be read at first, though a second read finds it unpaid",
      () =>
        (reads = [
          () => Promise.reject(new TypeError("Failed to fetch")),
          bundle(),
        ]),
    ],
    ["its chain has no client", () => (clients[1] = undefined)],
  ])("keeps the quote when %s", async (_, arrange) => {
    arrange();
    await expect(reverted()).rejects.toThrow(UNRELEASED);
  });

  it.each<[string, Partial<Parameters<typeof revertedRelayrQuote>[1]>]>([
    [
      "another option on the paid chain is still open at its finalized block",
      {
        options: [
          paymentFor(),
          paymentFor({ amount: "200" }, DEADLINE + 3_602),
        ],
      },
    ],
    [
      "another of its options is still open at the finalized block of its chain",
      {
        options: [paymentFor(), paymentFor({ chain: 10 }, DEADLINE + 3_602)],
        destinationChainIds: [1, 10],
      },
    ],
    ["it sent no payment", { payments: [] }],
    ["its payments are not a list", { payments: { length: 1 } as never }],
    ["its options are not a list", { options: null as never }],
    ["its account is not an address", { account: "0x1234" }],
  ])("keeps the quote when %s", async (_, overrides) => {
    await expect(reverted(overrides)).rejects.toThrow(UNRELEASED);
  });

  it("waits for each payment's own deadline, with no options to wait for", async () => {
    finalized[1] = DEADLINE;
    await expect(reverted({ options: [] })).rejects.toThrow(UNRELEASED);
    finalized[1] = DEADLINE + 1;
    await expect(reverted({ options: [] })).resolves.toMatchObject({
      state: "released",
    });
  });

  it("waits for a deadline on each chain it is on, when two chains share it", async () => {
    finalized[1] = DEADLINE;
    finalized[10] = DEADLINE + 3_601;
    await expect(
      reverted({
        options: [paymentFor(), paymentFor({ chain: 10 })],
        destinationChainIds: [1, 10],
      }),
    ).rejects.toThrow(UNRELEASED);
  });

  it("waits for an option whose deadline passed long ago by the clock, until it passes at its finalized block", async () => {
    finalized[10] = 1_699_999_999;
    const options = [paymentFor(), paymentFor({ chain: 10 }, 1_700_000_000)];
    await expect(
      reverted({ options, destinationChainIds: [1, 10] }),
    ).rejects.toThrow(UNRELEASED);
    finalized[10] = 1_700_000_001;
    await expect(
      reverted({ options, destinationChainIds: [1, 10] }),
    ).resolves.toMatchObject({ state: "released" });
  });

  it("waits for the deadline its payment's calldata pays until, whatever deadline the journal saved", async () => {
    finalized[1] = DEADLINE - 1_000;
    await expect(
      reverted({ payments: [{ ...sent(), deadline: "1" }], options: [] }),
    ).rejects.toThrow(UNRELEASED);
  });

  it("holds a journal that files another bundle's payment under this quote", async () => {
    const foreign = sentRelayrPayment(
      relayrPaymentDetails(
        paymentFor({ calldata: paymentCalldata(OTHER_UUID) }),
        { bundleUuid: OTHER_UUID, destinationChainIds: [1], nowSeconds: START },
      ),
      HASH,
    );
    mined.set(HASH, { payment: foreign, status: "reverted" });
    await expect(reverted({ payments: [foreign] })).rejects.toThrow(UNRELEASED);
    await expect(
      reverted({ payments: [foreign] }, (DEADLINE - 16) * 1_000),
    ).rejects.toThrow(UNRELEASED);
  });

  it("reads the clock after the bundle, so a quote whose window closes during the read is not payable", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue((DEADLINE - 30) * 1_000);
    const slow = vi.fn(async (input: unknown, init: unknown) => {
      now.mockReturnValue(DEADLINE * 1_000);
      return (
        fetchBundle as unknown as (a: unknown, b: unknown) => Promise<Response>
      )(input, init);
    });
    await expect(
      revertedRelayrQuote((chainId) => clients[chainId], quote(), {
        fetch: slow as unknown as typeof fetch,
      }),
    ).resolves.toMatchObject({ state: "released" });
    now.mockRestore();
  });

  it.each([NaN, Infinity, -Infinity])(
    "holds, with its line, at a time of %s",
    async (nowMs) => {
      await expect(reverted({}, nowMs)).rejects.toThrow(UNRELEASED);
    },
  );

  it("keeps the quote when a client cannot be had for a chain", async () => {
    await expect(
      revertedRelayrQuote(
        () => {
          throw new Error("No RPC for chain 1");
        },
        quote(),
        {
          fetch: fetchBundle as unknown as typeof fetch,
          nowMs: (DEADLINE + 1) * 1_000,
        },
      ),
    ).rejects.toThrow(UNRELEASED);
  });

  it("ignores an option no flow can authenticate, which is never paid from", async () => {
    await expect(
      reverted({
        options: [
          paymentFor(),
          paymentFor({ chain: 11155111 }, DEADLINE + 3_602),
        ],
      }),
    ).resolves.toMatchObject({ state: "released" });
  });

  it("proves every payment it sent reverted, on each one's chain", async () => {
    const second = sent(paymentFor({ chain: 10 }), SECOND_HASH);
    mined.set(SECOND_HASH, { payment: second, status: "reverted" });
    await expect(
      reverted({
        payments: [sent(), second],
        options: [paymentFor(), paymentFor({ chain: 10 })],
        destinationChainIds: [1, 10],
      }),
    ).resolves.toMatchObject({ state: "released" });
    mined.set(SECOND_HASH, { payment: second, status: "success" });
    await expect(
      reverted({
        payments: [sent(), second],
        options: [paymentFor(), paymentFor({ chain: 10 })],
        destinationChainIds: [1, 10],
      }),
    ).rejects.toThrow(UNRELEASED);
  });

  it("reads the bundle through the global fetch and the clock unless given others", async () => {
    vi.stubGlobal("fetch", fetchBundle);
    const now = vi.spyOn(Date, "now").mockReturnValue((DEADLINE - 16) * 1_000);
    await expect(
      revertedRelayrQuote((chainId) => clients[chainId], quote()),
    ).resolves.toMatchObject({ state: "payable" });
    now.mockRestore();
  });

  describe("clearing a quote paid before for one more payment", () => {
    /** While the quote is still open. */
    const OPEN = DEADLINE - 16;
    const retry = (
      payments: readonly RelayrSentPayment[],
      { bundleUuid = BUNDLE_UUID, nowSeconds = OPEN } = {},
    ) =>
      requireRelayrRetry(
        (chainId) => clients[chainId],
        { payments, from: ACCOUNT, bundleUuid },
        { fetch: fetchBundle as unknown as typeof fetch, nowSeconds },
      );
    const refusal = async (promise: Promise<unknown>) => {
      try {
        await promise;
      } catch (error) {
        return error as RelayrPaymentRetryError;
      }
      throw new Error("Expected a refusal.");
    };

    it("clears it once every payment it sent reverted, the quote is open and Relayr reports it unpaid with every call pending", async () => {
      await expect(retry([sent()])).resolves.toBeUndefined();
      expect(fetchBundle).toHaveBeenCalledTimes(1);
    });

    it("proves the payments of one option together, its calldata in any case, and each other option on its own", async () => {
      const again = {
        ...sent(paymentFor(), SECOND_HASH),
        calldata: paymentCalldata().toUpperCase().replace("0X", "0x") as Hex,
      };
      mined.set(SECOND_HASH, { payment: again, status: "reverted" });
      await expect(retry([sent(), again])).resolves.toBeUndefined();
      // One option, so one bundle read for both payments.
      expect(fetchBundle).toHaveBeenCalledTimes(1);
      const other = sent(paymentFor({ amount: "200" }), OTHER_HASH);
      mined.set(OTHER_HASH, { payment: other, status: "reverted" });
      await expect(retry([sent(), other])).resolves.toBeUndefined();
      expect(fetchBundle).toHaveBeenCalledTimes(3);
    });

    it("refuses when a later payment of the same option succeeded", async () => {
      const later = sent(paymentFor(), SECOND_HASH);
      mined.set(SECOND_HASH, { payment: later, status: "success" });
      const error = await refusal(retry([sent(), later]));
      expect(error).toBeInstanceOf(RelayrPaymentRetryError);
      expect(error.reason).toBe("paid");
    });

    it("proves the same option on two chains on each chain", async () => {
      const elsewhere = sent(paymentFor({ chain: 10 }), SECOND_HASH);
      mined.set(SECOND_HASH, { payment: elsewhere, status: "reverted" });
      await expect(retry([sent(), elsewhere])).resolves.toBeUndefined();
      expect(fetchBundle).toHaveBeenCalledTimes(2);
    });

    it("refuses when any payment it sent did not revert, including one before a declined retry", async () => {
      const first = sent(paymentFor(), SECOND_HASH);
      mined.set(SECOND_HASH, { payment: first, status: "success" });
      const error = await refusal(retry([first, sent()]));
      expect(error).toBeInstanceOf(RelayrPaymentRetryError);
      expect(error.reason).toBe("paid");
    });

    it.each<[string, () => void, string]>([
      [
        "Relayr cannot be read",
        () =>
          (reads = [() => Promise.reject(new TypeError("Failed to fetch"))]),
        "unknown",
      ],
      [
        "Relayr reports a call running",
        () =>
          (reads = [
            bundle({
              transactions: [
                { tx_uuid: OTHER_UUID, status: { state: "Included" } },
              ],
            }),
          ]),
        "running",
      ],
      ["its chain has no client", () => (clients[1] = undefined), "unknown"],
    ])("refuses while %s", async (_, arrange, reason) => {
      arrange();
      const error = await refusal(retry([sent()]));
      expect(error).toBeInstanceOf(RelayrPaymentRetryError);
      expect(error.reason).toBe(reason);
    });

    it("refuses once the quote expired", async () => {
      const error = await refusal(
        retry([sent()], { nowSeconds: DEADLINE - 15 }),
      );
      expect(error.reason).toBe("expired");
    });

    it("refuses a chain whose client cannot be had", async () => {
      const error = await refusal(
        requireRelayrRetry(
          () => {
            throw new Error("No RPC for chain 1");
          },
          { payments: [sent()], from: ACCOUNT, bundleUuid: BUNDLE_UUID },
          { fetch: fetchBundle as unknown as typeof fetch, nowSeconds: OPEN },
        ),
      );
      expect(error).toBeInstanceOf(RelayrPaymentRetryError);
      expect(error.reason).toBe("unknown");
      expect(error.message).toBe(
        "No RPC is available for chain 1. Do not pay again yet; check it later.",
      );
    });

    it("refuses a payment that belongs to another bundle", async () => {
      await expect(retry([sent()], { bundleUuid: OTHER_UUID })).rejects.toThrow(
        "A saved Relayr payment belongs to another bundle. Do not pay again; check the original bundle.",
      );
      expect(fetchBundle).not.toHaveBeenCalled();
    });

    it.each<[string, unknown]>([
      ["no payments", []],
      ["payments that are not a list", { length: 1, 0: sent() }],
      ["a payment that is not one", [null]],
      ["a payment with only its bundle", [{ bundleUuid: BUNDLE_UUID }]],
      ["an empty payment", [{}]],
      [
        "a payment whose deadline is not the one its calldata pays until",
        [{ ...sent(), deadline: "1" }],
      ],
      [
        "more payments than a journal keeps",
        Array.from({ length: 17 }, () => sent()),
      ],
    ])("refuses %s before reading anything", async (_, payments) => {
      const error = await refusal(retry(payments as RelayrSentPayment[]));
      expect(error).toBeInstanceOf(RelayrPaymentRetryError);
      expect(error.reason).toBe("invalid");
      expect(fetchBundle).not.toHaveBeenCalled();
    });

    it("reads Relayr through the global fetch and the clock unless given others", async () => {
      vi.stubGlobal("fetch", fetchBundle);
      const now = vi.spyOn(Date, "now").mockReturnValue(OPEN * 1_000);
      await expect(
        requireRelayrRetry((chainId) => clients[chainId], {
          payments: [sent()],
          from: ACCOUNT,
          bundleUuid: BUNDLE_UUID,
        }),
      ).resolves.toBeUndefined();
      now.mockRestore();
    });
  });

  describe("proving a saved session's latest payment", () => {
    const prove = (
      payments: unknown,
      account: unknown = ACCOUNT,
      onReverted = vi.fn(),
    ) =>
      proveSavedRelayrPayment(
        (chainId) => clients[chainId],
        payments as RelayrSentPayment[],
        account as string,
        onReverted,
      );

    it("resolves true once the latest payment succeeded", async () => {
      mined.set(HASH, { payment: sent(), status: "success" });
      const onReverted = vi.fn();
      await expect(prove([sent()], ACCOUNT, onReverted)).resolves.toBe(true);
      expect(onReverted).not.toHaveBeenCalled();
    });

    it("proves only the latest payment", async () => {
      mined.set(SECOND_HASH, {
        payment: sent(paymentFor(), SECOND_HASH),
        status: "success",
      });
      await expect(
        prove([sent(), sent(paymentFor(), SECOND_HASH)]),
      ).resolves.toBe(true);
    });

    it("runs onReverted and throws when the payment canonically reverted", async () => {
      const onReverted = vi.fn();
      await expect(prove([sent()], ACCOUNT, onReverted)).rejects.toBeInstanceOf(
        RelayrPaymentRevertedError,
      );
      expect(onReverted).toHaveBeenCalledTimes(1);
    });

    it("throws onReverted's own failure", async () => {
      await expect(
        prove(
          [sent()],
          ACCOUNT,
          vi.fn(() => {
            throw new Error("Could not save the reverted payment.");
          }),
        ),
      ).rejects.toThrow("Could not save the reverted payment.");
    });

    it("throws, without onReverted, when the hash holds another transaction", async () => {
      mined.set(HASH, {
        payment: { ...sent(), amount: "99" },
        status: "success",
      });
      const onReverted = vi.fn();
      const error = await prove([sent()], ACCOUNT, onReverted).catch(
        (caught: unknown) => caught,
      );
      expect(error).toBeInstanceOf(RelayrProofError);
      expect(error).not.toBeInstanceOf(RelayrPaymentRevertedError);
      expect(onReverted).not.toHaveBeenCalled();
    });

    it.each<[string, () => void]>([
      ["the payment cannot be read", () => mined.clear()],
      [
        "its receipt's block is no longer canonical",
        () => (paymentBlock = OTHER_HASH),
      ],
      ["its chain has no client", () => (clients[1] = undefined)],
    ])("resolves false while %s", async (_, arrange) => {
      arrange();
      const onReverted = vi.fn();
      await expect(prove([sent()], ACCOUNT, onReverted)).resolves.toBe(false);
      expect(onReverted).not.toHaveBeenCalled();
    });

    it("resolves false when a client cannot be had for its chain", async () => {
      await expect(
        proveSavedRelayrPayment(
          () => {
            throw new Error("No RPC for chain 1");
          },
          [sent()],
          ACCOUNT,
          vi.fn(),
        ),
      ).resolves.toBe(false);
    });

    it.each<[string, unknown, unknown]>([
      ["no payments", [], ACCOUNT],
      ["no payment list", undefined, ACCOUNT],
      ["payments that are not a list", { length: 1, 0: sent() }, ACCOUNT],
      ["no account", [sent()], null],
      ["an account that is not an address", [sent()], "0x1234"],
      [
        "an account with a wrong checksum",
        [sent()],
        "0x1C05F7841379D4393574c0FFA17908Ec40FFD97D",
      ],
    ])(
      "resolves false, reading nothing, for %s",
      async (_, payments, account) => {
        await expect(prove(payments, account)).resolves.toBe(false);
        expect(
          (
            clients[1] as unknown as {
              getTransaction: ReturnType<typeof vi.fn>;
            }
          ).getTransaction,
        ).not.toHaveBeenCalled();
      },
    );
  });

  it("takes a PublicClient for any chain", () => {
    const client: RelayrReleaseClient = createPublicClient({
      chain: mainnet,
      transport: http("http://127.0.0.1:1"),
    });
    expect(typeof client.getBlock).toBe("function");
  });
});
