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
  RelayrPaymentRevertedError,
  relayrPaidQuoteOpen,
  relayrPaymentAttemptOutcome,
  relayrPaymentDetails,
  relayrQuotedOptions,
  relayrRetryOption,
  relayrSentPaymentsSnapshot,
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
  ])("refuses %s", (_, payments, options) => {
    expect(() => relayrRetryOption(payments, options)).toThrow(
      "This Relayr quote cannot be paid again from its saved record. Keep it pending; do not pay again.",
    );
  });
});

describe("where a failed payment attempt leaves its quote", () => {
  const rejection = new UserRejectedRequestError(new Error("User rejected."));

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
          return { hash: args.blockNumber === 200n ? canonical : BLOCK_HASH };
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

  it("takes a PublicClient for any chain", () => {
    const client: RelayrReleaseClient = createPublicClient({
      chain: mainnet,
      transport: http("http://127.0.0.1:1"),
    });
    expect(typeof client.getBlock).toBe("function");
  });
});
