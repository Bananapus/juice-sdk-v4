import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import {
  createPublicClient,
  encodeFunctionData,
  getAddress,
  http,
  keccak256,
  toFunctionSelector,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { base, mainnet } from "viem/chains";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  erc2771ForwarderAbi,
  jbContractAddress,
} from "../generated/juicebox.js";
import {
  bindRelayrQuote,
  FORWARD_REQUEST_TYPES,
  RELAYR_API,
  RELAYR_FORWARDER_DEADLINE_SECONDS,
  RELAYR_NATIVE_TOKEN,
  RELAYR_PAYMENT_ADDRESS,
  RELAYR_PAYMENT_CODE_HASH,
  RELAYR_PAYMENT_GAS,
  RELAYR_PAYMENT_SELECTOR,
  relayrBundleRequest,
  relayrDestinationHash,
  relayrForwardRequest,
  relayrPaymentChains,
  relayrPaymentDetails,
  relayrPaymentOptions,
  relayrProgress,
  relayrRecordChain,
  RelayrDestinationRevertedError,
  RelayrPaymentRevertedError,
  RelayrProofError,
  relayrStateIsFailed,
  relayrStateIsSuccess,
  relayrSupportsChain,
  relayrSupportsChains,
  requireRelayrPaymentRetry,
  requireRelayrPaymentRuntime,
  simulateRelayrPayment,
  TRUSTED_FORWARDER_ABI,
  verifyRelayrDestination,
  verifyRelayrDestinations,
  verifyRelayrPayment,
  type RelayrBundleRequest,
  type RelayrEntry,
  type RelayrPayment,
  type RelayrPaymentDetails,
  type RelayrProofClient,
  type RelayrTransactionBinding,
  type RelayrTransactionRecord,
} from "./relayr.js";

const ACCOUNT = "0x1111111111111111111111111111111111111111" as Address;
const OTHER = "0x2222222222222222222222222222222222222222" as Address;
const TARGET = "0x3333333333333333333333333333333333333333" as Address;
const FORWARDER = jbContractAddress["6"].ERC2771Forwarder[1] as Address;
const BUNDLE_UUID = "01234567-89ab-cdef-0123-456789abcdef";
const OTHER_UUID = "fedcba98-7654-3210-fedc-ba9876543210";
const THIRD_UUID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const FOURTH_UUID = "bbbbbbbb-cccc-dddd-eeee-ffffffffffff";
const HASH = `0x${"ab".repeat(32)}` as Hex;
const SECOND_HASH = `0x${"ef".repeat(32)}` as Hex;
const BLOCK_HASH = `0x${"cd".repeat(32)}` as Hex;
const OTHER_BLOCK_HASH = `0x${"45".repeat(32)}` as Hex;
const NOW = 1_750_000_000;
const DEADLINE = NOW + 600;
// Relayr's payment contract and native token as EIP-55 writes them, with the
// case of one letter flipped so the checksum fails, and in upper case, which
// viem's strict address check refuses too.
const CHECKSUMMED_PAYMENT_ADDRESS =
  "0x1C05F7841379D4393574c0FFA17908Ec40FFD97d" as Address;
const MISCASED_PAYMENT_ADDRESS =
  "0x1c05F7841379D4393574c0FFA17908Ec40FFD97d" as Address;
const UPPERCASE_PAYMENT_ADDRESS =
  "0x1C05F7841379D4393574C0FFA17908EC40FFD97D" as Address;
const CHECKSUMMED_NATIVE_TOKEN =
  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as Address;
const MISCASED_NATIVE_TOKEN =
  "0xeeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as Address;
const UPPERCASE_NATIVE_TOKEN =
  "0xEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE" as Address;
const MAINNETS = [1, 10, 8453, 42161];
const TESTNETS = [11155111, 11155420, 84532, 421614];
// The runtime code deployed at RELAYR_PAYMENT_ADDRESS on every Relayr chain.
const PAYMENT_RUNTIME =
  "0x608060405260043610156010575f80fd5b5f3560e01c63103903a7146022575f80fd5b604036600319011260ef576004356fffffffffffffffffffffffffffffffff19811680910360ef5760243564ffffffffff811680910360ef5780421160ce575f341560c6575b5f8080809373755ff2f75a0a586ecfa2b9a3c959cb662458a1053491f11560bb5760407fb96b060a9c075a83da0cf1f9405deeb5df21df681a762de16c3d5eaf99531cd8918151903482526020820152a2005b6040513d5f823e3d90fd5b506108fc6068565b90630f01bd8760e21b5f5260045260245264ffffffffff421660445260645ffd5b5f80fdfea26469706673582212206ea0d2ba1e0cb26cc9293b24f1a7aecc1de7e328ca83d6b3bf5382ac44c7390064736f6c634300081a0033" as Hex;

function paymentCalldata(
  uuid = BUNDLE_UUID,
  deadline: number | bigint = DEADLINE,
  selector = RELAYR_PAYMENT_SELECTOR,
): Hex {
  const uuidWord = uuid.replaceAll("-", "").toLowerCase().padEnd(64, "0");
  const deadlineWord = BigInt(deadline).toString(16).padStart(64, "0");
  return `${selector}${uuidWord}${deadlineWord}` as Hex;
}

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

const details = (
  payment: RelayrPayment,
  destinationChainIds: readonly number[] = [1],
  bundleUuid = BUNDLE_UUID,
) =>
  relayrPaymentDetails(payment, {
    bundleUuid,
    destinationChainIds,
    nowSeconds: NOW,
  });

/** An ERC-2771 `execute` on the chain's canonical forwarder, as a relayed authorization publishes it. */
function forwarded(
  chain = 1,
  {
    from = ACCOUNT,
    value = 5n,
    data = "0x1234" as Hex,
  }: { from?: Address; value?: bigint; data?: Hex } = {},
): RelayrEntry {
  return {
    chain,
    target: (
      jbContractAddress["6"].ERC2771Forwarder as Record<number, Address>
    )[chain],
    data: encodeFunctionData({
      abi: erc2771ForwarderAbi,
      functionName: "execute",
      args: [
        {
          from,
          to: TARGET,
          value,
          gas: 500_000n,
          deadline: DEADLINE,
          data,
          signature: `0x${"11".repeat(65)}`,
        },
      ],
    }),
    value: value.toString(),
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** What Relayr records for a posted transaction. */
function recordFor(
  entry: RelayrEntry,
  txUuid: string,
  status: RelayrTransactionRecord["status"] = { state: "Pending" },
): RelayrTransactionRecord {
  return { tx_uuid: txUuid, request: { ...entry }, status };
}

/** A viem-shaped transaction and receipt for `hash`. */
function onchain({
  hash = HASH,
  chainId = 1,
  from = ACCOUNT,
  to = RELAYR_PAYMENT_ADDRESS as Address | null,
  input = paymentCalldata(),
  value = 100n,
  status = "success" as string,
  blockHash = BLOCK_HASH as Hex | null,
  blockNumber = 123n as bigint | null,
}: {
  hash?: Hex;
  chainId?: number;
  from?: Address;
  to?: Address | null;
  input?: Hex;
  value?: bigint;
  status?: string;
  blockHash?: Hex | null;
  blockNumber?: bigint | null;
} = {}) {
  return {
    transaction: {
      hash,
      chainId: chainId as number | undefined,
      from,
      to,
      input,
      value,
      blockHash,
      blockNumber,
    },
    receipt: {
      transactionHash: hash,
      status,
      to,
      from,
      blockHash,
      blockNumber,
      logs: [],
    },
  };
}

type Onchain = ReturnType<typeof onchain>;

/** A PublicClient whose reads answer from `rows`, with `canonical` as every block's hash. */
function proofClient(rows: Onchain[], canonical: Hex | null = BLOCK_HASH) {
  const find = (hash: Hex) => {
    const row = rows.find(
      (item) => item.transaction.hash.toLowerCase() === hash.toLowerCase(),
    );
    if (!row) throw new Error(`No fixture for ${hash}`);
    return row;
  };
  return {
    getTransaction: vi.fn(
      async ({ hash }: { hash: Hex }) => find(hash).transaction,
    ),
    getTransactionReceipt: vi.fn(
      async ({ hash }: { hash: Hex }) => find(hash).receipt,
    ),
    getBlock: vi.fn(async () => ({ hash: canonical })),
  };
}

const asClient = (client: object) => client as unknown as PublicClient;

/** The error `promise` rejects with; the test fails if it resolves. */
async function rejection(
  promise: Promise<unknown>,
): Promise<Error & { cause?: unknown }> {
  try {
    await promise;
  } catch (error) {
    return error as Error & { cause?: unknown };
  }
  throw new Error("Expected a rejection.");
}

const reviewedPayment = (
  overrides: Partial<RelayrPaymentDetails> = {},
): RelayrPaymentDetails => ({
  ...details(paymentFor()),
  ...overrides,
});

describe("Relayr constants", () => {
  it("pins the payment contract's runtime code hash and selector", () => {
    expect(keccak256(PAYMENT_RUNTIME)).toBe(RELAYR_PAYMENT_CODE_HASH);
    // The runtime's dispatcher pushes (PUSH4) this selector.
    expect(PAYMENT_RUNTIME).toContain(`63${RELAYR_PAYMENT_SELECTOR.slice(2)}`);
    expect(RELAYR_PAYMENT_GAS).toBe(150_000n);
    expect(RELAYR_FORWARDER_DEADLINE_SECONDS).toBe(47 * 60 * 60);
    expect(RELAYR_API).toBe("https://api.relayr.ba5ed.com");
  });

  it("types a ForwardRequest the way ERC2771Forwarder hashes it", () => {
    const fields = FORWARD_REQUEST_TYPES.ForwardRequest.map(
      ({ name, type }) => `${type} ${name}`,
    ).join(",");
    expect(`ForwardRequest(${fields})`).toBe(
      "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,uint48 deadline,bytes data)",
    );
    expect(
      encodeFunctionData({
        abi: TRUSTED_FORWARDER_ABI,
        functionName: "isTrustedForwarder",
        args: [FORWARDER],
      }).slice(0, 10),
    ).toBe(toFunctionSelector("isTrustedForwarder(address)"));
  });
});

describe("Relayr destination and funding network families", () => {
  it.each([...MAINNETS, ...TESTNETS])(
    "supports configured destination %s",
    (chain) => {
      expect(relayrSupportsChain(chain)).toBe(true);
      expect(relayrSupportsChains([chain])).toBe(true);
      expect(relayrPaymentChains([chain])).toEqual(
        MAINNETS.includes(chain) ? MAINNETS : TESTNETS,
      );
    },
  );

  it("accepts all four destinations in either family without offering the other family", () => {
    expect(relayrSupportsChains(MAINNETS)).toBe(true);
    expect(relayrSupportsChains(TESTNETS)).toBe(true);
    expect(relayrPaymentChains(TESTNETS)).toEqual(TESTNETS);
    expect(relayrPaymentChains(MAINNETS)).toEqual(MAINNETS);
  });

  it.each(
    [[], [1, 11155111], [8453, 84532], [999], [Number.NaN]].map((chains) => ({
      chains,
    })),
  )("rejects ambiguous or unsupported destinations $chains", ({ chains }) => {
    expect(relayrSupportsChains(chains)).toBe(false);
    expect(relayrPaymentChains(chains)).toEqual([]);
  });

  it("wants one destination per chain, but funds a bundle by its set of chains", () => {
    expect(relayrSupportsChains([1, 1])).toBe(false);
    expect(relayrPaymentChains([1, 1, 10])).toEqual(MAINNETS);
  });

  it.each([0, 56, 31337])("does not support chain %s", (chain) => {
    expect(relayrSupportsChain(chain)).toBe(false);
  });
});

describe("Relayr bundle requests", () => {
  it("assigns virtual nonces per chain and preserves the posted order", () => {
    expect(
      relayrBundleRequest([
        { chain: 1, target: TARGET, data: "0x01", value: "0" },
        { chain: 10, target: TARGET, data: "0x02", value: "0x2" },
        { chain: 1, target: TARGET, data: "0x03", value: "3" },
      ]),
    ).toEqual({
      transactions: [
        {
          chain: 1,
          target: TARGET,
          data: "0x01",
          value: "0",
          virtual_nonce: 0,
        },
        {
          chain: 10,
          target: TARGET,
          data: "0x02",
          value: "2",
          virtual_nonce: 0,
        },
        {
          chain: 1,
          target: TARGET,
          data: "0x03",
          value: "3",
          virtual_nonce: 1,
        },
      ],
      virtual_nonce_mode: "ChainIndependent",
    });
  });

  it.each([[[1, 11155111]], [[]], [[56]]])(
    "refuses destinations %j outside one supported network family",
    (chains) => {
      expect(() =>
        relayrBundleRequest(
          chains.map((chain) => ({
            chain,
            target: TARGET,
            data: "0x01",
            value: "0",
          })),
        ),
      ).toThrow(/one network family/);
    },
  );

  it.each([
    { target: "0xnot-an-address" as Address },
    { data: "0x123" as Hex },
    { data: "1234" as Hex },
    { value: "-1" },
    { value: "1.5" },
    { value: " 5" },
    { value: (1n << 256n).toString() },
  ])("refuses a malformed transaction %j", (change) => {
    expect(() =>
      relayrBundleRequest([
        { chain: 1, target: TARGET, data: "0x01", value: "0", ...change },
      ]),
    ).toThrow("A Relayr bundle transaction is malformed.");
  });
});

describe("Relayr quote binding", () => {
  const entries: RelayrEntry[] = [
    { chain: 1, target: TARGET, data: "0x01", value: "0" },
    { chain: 10, target: TARGET, data: "0x02", value: "2" },
    { chain: 1, target: TARGET, data: "0x03", value: "3" },
  ];
  const request = relayrBundleRequest(entries);
  const ids = [BUNDLE_UUID, OTHER_UUID, THIRD_UUID];
  const quote = (overrides: Record<string, unknown> = {}) => ({
    bundle_uuid: BUNDLE_UUID.toUpperCase(),
    payment_info: [paymentFor()],
    tx_uuids: ids.map((id) => id.toUpperCase()),
    ...overrides,
  });
  // Relayr lists records out of request order; binding follows each request.
  const outOfOrder = () => [
    recordFor(request.transactions[2], THIRD_UUID),
    recordFor(request.transactions[0], BUNDLE_UUID),
    recordFor(request.transactions[1], OTHER_UUID),
  ];
  const bundle = (transactions: unknown = outOfOrder()) =>
    json({ bundle_uuid: BUNDLE_UUID, transactions });

  it("binds each posted transaction to the record carrying its exact request", async () => {
    const fetchBundle = vi.fn(async () => bundle());
    const bound = await bindRelayrQuote(json(quote()), request, {
      fetch: fetchBundle,
    });
    expect(bound.bundle_uuid).toBe(BUNDLE_UUID);
    expect(bound.payment_info).toEqual([paymentFor()]);
    expect(bound.expectedTransactions).toEqual(
      request.transactions.map((entry, index) => ({
        txUuid: ids[index],
        chain: entry.chain,
        entry,
      })),
    );
    expect(bound.expectedTransactions[0].entry).not.toBe(
      request.transactions[0],
    );
    expect(bound.transactions.map((record) => record.tx_uuid)).toEqual(ids);
    expect(fetchBundle).toHaveBeenCalledTimes(1);
    expect(fetchBundle).toHaveBeenCalledWith(
      `${RELAYR_API}/v1/bundle/${BUNDLE_UUID}`,
      { cache: "no-store", signal: expect.any(AbortSignal) },
    );
  });

  it("reads the bundle with the global fetch by default", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => bundle()),
    );
    await expect(
      bindRelayrQuote(json(quote()), request),
    ).resolves.toMatchObject({ bundle_uuid: BUNDLE_UUID });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("uses complete records from the quote itself, under the legacy txn_uuids name", async () => {
    const fetchBundle = vi.fn();
    const bound = await bindRelayrQuote(
      json(
        quote({
          tx_uuids: undefined,
          txn_uuids: ids,
          transactions: outOfOrder(),
        }),
      ),
      request,
      { fetch: fetchBundle },
    );
    expect(bound.expectedTransactions.map((item) => item.txUuid)).toEqual(ids);
    expect(fetchBundle).not.toHaveBeenCalled();
  });

  it("accepts both ID lists when they agree and refuses them when they conflict", async () => {
    const fetchBundle = vi.fn(async () => bundle());
    await expect(
      bindRelayrQuote(json(quote({ tx_uuids: ids, txn_uuids: ids })), request, {
        fetch: fetchBundle,
      }),
    ).resolves.toBeTruthy();
    await expect(
      bindRelayrQuote(
        json(quote({ tx_uuids: ids, txn_uuids: [...ids].reverse() })),
        request,
        { fetch: fetchBundle },
      ),
    ).rejects.toThrow(
      "Relayr returned conflicting transaction IDs. Nothing was paid.",
    );
  });

  it("reads the bundle when a quoted record lacks its request or ID", async () => {
    for (const records of [
      [...outOfOrder().slice(0, 2), { tx_uuid: OTHER_UUID }],
      [...outOfOrder().slice(0, 2), { request: request.transactions[1] }],
      [...outOfOrder().slice(0, 2), null],
    ]) {
      const fetchBundle = vi.fn(async () => bundle());
      await expect(
        bindRelayrQuote(json(quote({ transactions: records })), request, {
          fetch: fetchBundle,
        }),
      ).resolves.toBeTruthy();
      expect(fetchBundle).toHaveBeenCalledTimes(1);
    }
  });

  it("surfaces bounded Relayr HTTP detail", async () => {
    await expect(
      bindRelayrQuote(json("bad quote", 503), request),
    ).rejects.toThrow("Relayr HTTP 503: bad quote");
    await expect(
      bindRelayrQuote(json(`x${"y".repeat(400)}`, 502), request),
    ).rejects.toThrow(new RegExp(`^Relayr HTTP 502: x${"y".repeat(239)}$`));
    await expect(bindRelayrQuote(json("", 500), request)).rejects.toThrow(
      /^Relayr HTTP 500$/,
    );
    const unreadable = {
      ok: false,
      status: 504,
      text: () => Promise.reject(new Error("stream failed")),
    } as unknown as Response;
    await expect(bindRelayrQuote(unreadable, request)).rejects.toThrow(
      /^Relayr HTTP 504$/,
    );
  });

  it.each(["not json", "null", "5", '"text"'])(
    "refuses an unreadable quote body %s",
    async (body) => {
      await expect(bindRelayrQuote(json(body), request)).rejects.toThrow(
        "Relayr returned an unreadable quote. Nothing was paid.",
      );
    },
  );

  it.each([undefined, "bundle-1", 7])(
    "refuses a quote without a valid bundle ID (%s)",
    async (bundleUuid) => {
      await expect(
        bindRelayrQuote(json(quote({ bundle_uuid: bundleUuid })), request),
      ).rejects.toThrow(
        "Relayr returned no valid bundle ID. Nothing was paid.",
      );
    },
  );

  it.each([
    ["no transaction IDs", { tx_uuids: undefined }],
    ["too few IDs", { tx_uuids: ids.slice(1) }],
    ["an ID that is not a UUID", { tx_uuids: [...ids.slice(1), "tx-1"] }],
    ["a repeated ID", { tx_uuids: [BUNDLE_UUID, BUNDLE_UUID, THIRD_UUID] }],
    ["no payment list", { payment_info: undefined }],
  ])(
    "requires a unique ID for every quoted transaction: %s",
    async (_, change) => {
      await expect(
        bindRelayrQuote(json(quote(change)), request, {
          fetch: vi.fn(async () => bundle()),
        }),
      ).rejects.toThrow(
        "Relayr did not bind every quoted transaction to a unique ID. Nothing was paid.",
      );
    },
  );

  it("refuses a request that was not built with virtual nonces", async () => {
    for (const transactions of [
      [],
      entries as RelayrBundleRequest["transactions"],
      [{ ...request.transactions[0], virtual_nonce: -1 }],
    ]) {
      await expect(
        bindRelayrQuote(
          json(quote({ tx_uuids: ids.slice(0, transactions.length) })),
          { transactions, virtual_nonce_mode: "ChainIndependent" },
          { fetch: vi.fn(async () => bundle()) },
        ),
      ).rejects.toThrow(/did not bind every quoted transaction/);
    }
  });

  it.each<[string, Partial<RelayrEntry> | null]>([
    ["value", { value: "0x9" }],
    ["virtual nonce", { virtual_nonce: 1 }],
    // How Relayr echoes nonces for a bundle posted with virtual nonces disabled.
    ["null virtual nonce", { virtual_nonce: null as unknown as number }],
    ["calldata", { data: "0x99" }],
    ["target", { target: OTHER }],
    ["chain", { chain: 8453 }],
    ["missing request", null],
  ])(
    "does not bind a record whose %s differs from the posted request",
    async (_, change) => {
      const records = outOfOrder();
      records[2] =
        change === null
          ? { tx_uuid: OTHER_UUID }
          : recordFor({ ...request.transactions[1], ...change }, OTHER_UUID);
      await expect(
        bindRelayrQuote(json(quote()), request, {
          fetch: vi.fn(async () => bundle(records)),
        }),
      ).rejects.toThrow(/did not bind every quoted transaction/);
    },
  );

  it("binds only a bundle whose records are exactly the quoted IDs, one each", async () => {
    const unquoted = outOfOrder();
    unquoted[2] = recordFor(request.transactions[1], FOURTH_UUID);
    // Every posted transaction still has its record, but the bundle carries
    // one more that the destination proof would never accept.
    const extra = [
      ...outOfOrder(),
      recordFor({ ...request.transactions[1], data: "0xdead" }, FOURTH_UUID),
    ];
    const repeated = [
      ...outOfOrder(),
      recordFor(request.transactions[1], FOURTH_UUID),
    ];
    repeated[3].tx_uuid = OTHER_UUID;
    const reused = outOfOrder();
    reused[0].tx_uuid = OTHER_UUID;
    // A quoted ID on a second record that carries no posted transaction.
    const twin = [
      ...outOfOrder(),
      recordFor({ ...request.transactions[1], data: "0xdead" }, OTHER_UUID),
    ];
    const shared = outOfOrder();
    shared[2] = recordFor(request.transactions[1], BUNDLE_UUID);
    const anonymous: unknown[] = outOfOrder();
    anonymous[2] = { request: request.transactions[1] };
    for (const records of [
      unquoted,
      extra,
      repeated,
      reused,
      twin,
      shared,
      anonymous,
    ]) {
      await expect(
        bindRelayrQuote(json(quote()), request, {
          fetch: vi.fn(async () => bundle(records)),
        }),
      ).rejects.toThrow(/did not bind every quoted transaction/);
    }
  });

  it("refuses two posted transactions bound to one record", async () => {
    // A hand-built request can repeat a transaction; relayrBundleRequest never does.
    const twice: RelayrBundleRequest = {
      transactions: [request.transactions[0], { ...request.transactions[0] }],
      virtual_nonce_mode: "ChainIndependent",
    };
    await expect(
      bindRelayrQuote(json(quote({ tx_uuids: ids.slice(0, 2) })), twice, {
        fetch: vi.fn(async () =>
          bundle([
            recordFor(request.transactions[0], BUNDLE_UUID),
            recordFor(request.transactions[1], OTHER_UUID),
          ]),
        ),
      }),
    ).rejects.toThrow(/did not bind every quoted transaction/);
  });

  it("accepts a record whose value Relayr writes in hex", async () => {
    const records = outOfOrder();
    records[2] = recordFor(
      { ...request.transactions[1], value: "0x2" },
      OTHER_UUID,
    );
    await expect(
      bindRelayrQuote(json(quote()), request, {
        fetch: vi.fn(async () => bundle(records)),
      }),
    ).resolves.toBeTruthy();
  });

  it.each([
    ["an HTTP error", async () => json({ error: "not found" }, 404)],
    ["an unreadable body", async () => json("{not json")],
    [
      "another bundle",
      async () => json({ bundle_uuid: OTHER_UUID, transactions: outOfOrder() }),
    ],
    ["no records", async () => json({ bundle_uuid: BUNDLE_UUID })],
    ["an empty body", async () => json("null")],
  ])("refuses a bundle read that returns %s", async (_, read) => {
    await expect(
      bindRelayrQuote(json(quote()), request, { fetch: vi.fn(read) }),
    ).rejects.toThrow(
      "Relayr did not return the quoted transactions. Nothing was paid.",
    );
  });

  it("keeps a failed bundle read's cause out of serialization", async () => {
    const failure = new TypeError("fetch failed: https://rpc.invalid/key");
    const error = await rejection(
      bindRelayrQuote(json(quote()), request, {
        fetch: vi.fn(async () => {
          throw failure;
        }),
      }),
    );
    expect(error.message).toBe(
      "Relayr did not return the quoted transactions. Nothing was paid.",
    );
    expect(error.cause).toBe(failure);
    expect(Object.keys(error)).not.toContain("cause");
    expect(JSON.stringify(error)).not.toContain("rpc.invalid");
  });
});

describe("Relayr payment authentication", () => {
  it("binds the payment contract, token, selector, bundle UUID and deadline", () => {
    expect(
      details(
        paymentFor({
          calldata: paymentCalldata().toUpperCase().replace("0X", "0x") as Hex,
        }),
        [1],
        BUNDLE_UUID.toUpperCase(),
      ),
    ).toEqual({
      chainId: 1,
      target: RELAYR_PAYMENT_ADDRESS,
      amount: 100n,
      calldata: paymentCalldata(),
      bundleUuid: BUNDLE_UUID,
      deadline: BigInt(DEADLINE),
    });
  });

  it("checks expiry against the current time by default", () => {
    const later = Math.floor(Date.now() / 1_000) + 3_600;
    expect(
      relayrPaymentDetails(paymentFor({}, later), {
        bundleUuid: BUNDLE_UUID,
        destinationChainIds: [1],
      }).deadline,
    ).toBe(BigInt(later));
    expect(() =>
      relayrPaymentDetails(
        paymentFor({}, Math.floor(Date.now() / 1_000) + 10),
        {
          bundleUuid: BUNDLE_UUID,
          destinationChainIds: [1],
        },
      ),
    ).toThrow(/quote expired/);
  });

  it.each([
    [{ chain: 999 }, [1], /unsupported payment chain/],
    [{ chain: "1" as unknown as number }, [1], /unsupported payment chain/],
    [{ chain: 1 }, TESTNETS, /same network family/],
    [{ chain: 11155111 }, [1, 10], /same network family/],
    [{ chain: 1 }, [1, 11155111], /same network family/],
    [{ chain: 1 }, [], /same network family/],
    [
      { target: "not-an-address" as Address },
      [1],
      /unrecognized payment contract/,
    ],
    [{ target: TARGET }, [1], /unrecognized payment contract/],
    [
      { target: MISCASED_PAYMENT_ADDRESS },
      [1],
      /unrecognized payment contract/,
    ],
    [
      { target: UPPERCASE_PAYMENT_ADDRESS },
      [1],
      /unrecognized payment contract/,
    ],
    [{ token: undefined }, [1], /unsupported payment token/],
    [{ token: TARGET }, [1], /unsupported payment token/],
    [{ token: MISCASED_NATIVE_TOKEN }, [1], /unsupported payment token/],
    [{ token: UPPERCASE_NATIVE_TOKEN }, [1], /unsupported payment token/],
    [{ amount: "-1" }, [1], /invalid payment amount/],
    [{ amount: "1.5" }, [1], /invalid payment amount/],
    [{ amount: "1e18" }, [1], /invalid payment amount/],
    [{ amount: " 100" }, [1], /invalid payment amount/],
    [{ amount: (1n << 256n).toString() }, [1], /invalid payment amount/],
    [{ amount: 1.5 as unknown as string }, [1], /invalid payment amount/],
    [{ amount: (2 ** 60) as unknown as string }, [1], /invalid payment amount/],
    [{ calldata: "0xxyz" as Hex }, [1], /invalid payment calldata/],
    [
      { calldata: paymentCalldata().slice(0, -2) as Hex },
      [1],
      /invalid payment calldata/,
    ],
    [{ calldata: 7 as unknown as Hex }, [1], /invalid payment calldata/],
    [
      { calldata: paymentCalldata(BUNDLE_UUID, DEADLINE, "0xdeadbeef") },
      [1],
      /unrecognized payment function/,
    ],
    [
      { calldata: paymentCalldata(OTHER_UUID) },
      [1],
      /does not match this bundle/,
    ],
    [
      {
        calldata: paymentCalldata(BUNDLE_UUID, 1n << 40n),
        payment_deadline: undefined,
      },
      [1],
      /invalid payment deadline/,
    ],
    [
      { payment_deadline: DEADLINE + 1 },
      [1],
      /does not match the quote deadline/,
    ],
    [{ payment_deadline: undefined }, [1], /does not match the quote deadline/],
  ] as const)(
    "rejects an unsafe quote %j for destinations %j",
    (change, destinations, message) => {
      expect(() =>
        details(paymentFor(change as Partial<RelayrPayment>), destinations),
      ).toThrow(message);
    },
  );

  it("accepts the payment contract and token in lower case or with their EIP-55 checksum", () => {
    expect(getAddress(RELAYR_PAYMENT_ADDRESS)).toBe(
      CHECKSUMMED_PAYMENT_ADDRESS,
    );
    expect(getAddress(RELAYR_NATIVE_TOKEN)).toBe(CHECKSUMMED_NATIVE_TOKEN);
    for (const [target, token] of [
      [RELAYR_PAYMENT_ADDRESS, RELAYR_NATIVE_TOKEN],
      [CHECKSUMMED_PAYMENT_ADDRESS, CHECKSUMMED_NATIVE_TOKEN],
    ]) {
      expect(details(paymentFor({ target, token })).target).toBe(
        RELAYR_PAYMENT_ADDRESS,
      );
    }
  });

  it("rejects a missing payment and an invalid bundle ID", () => {
    expect(() => details(null as unknown as RelayrPayment)).toThrow(
      /unsupported payment chain/,
    );
    expect(() => details(paymentFor(), [1], "bundle-1")).toThrow(
      "Relayr returned an invalid bundle ID.",
    );
  });

  it("accepts an amount in decimal or hex digits, or as an exact number", () => {
    for (const amount of ["100", "0x64", 100, 100n]) {
      expect(details(paymentFor({ amount: amount as string })).amount).toBe(
        100n,
      );
    }
  });

  it("requires more than 15 seconds before the payment deadline", () => {
    expect(() => details(paymentFor({}, NOW + 15))).toThrow(
      "This Relayr quote expired. Review the action again for a new quote.",
    );
    expect(details(paymentFor({}, NOW + 16)).deadline).toBe(BigInt(NOW + 16));
  });

  it.each([
    DEADLINE,
    String(DEADLINE),
    new Date(DEADLINE * 1_000).toISOString(),
    "2025-06-15T15:16:40Z",
    "2025-06-15T17:16:40+02:00",
    "2025-06-15T15:16:40.999999999Z",
  ])("reads the quoted deadline %s", (quoted) => {
    expect(new Date(DEADLINE * 1_000).toISOString()).toBe(
      "2025-06-15T15:16:40.000Z",
    );
    expect(details(paymentFor({ payment_deadline: quoted })).deadline).toBe(
      BigInt(DEADLINE),
    );
  });

  it.each([
    // Without an offset the time would be read in the machine's timezone.
    "2025-06-15T15:16:40",
    "Sun, 15 Jun 2025 15:16:40 GMT",
    "2025-06-15",
    "1969-12-31T23:59:59Z",
    -1,
    DEADLINE + 0.5,
    "99999999999999999999",
    { seconds: DEADLINE },
  ])("refuses the quoted deadline %j", (quoted) => {
    expect(() =>
      details(paymentFor({ payment_deadline: quoted as unknown as string })),
    ).toThrow("Relayr payment calldata does not match the quote deadline.");
  });
});

describe("Relayr payment options", () => {
  it("offers only authenticated options in the destinations' family, one per chain", () => {
    const quote = {
      bundle_uuid: BUNDLE_UUID,
      payment_info: [
        paymentFor(),
        paymentFor({ chain: 11155111, amount: "7" }),
        paymentFor({ chain: 84532, target: TARGET }),
        paymentFor({ chain: 84532, amount: "8" }),
        paymentFor({ chain: 84532, amount: "9" }),
        paymentFor({ chain: 421614 }, NOW + 5),
      ],
    };
    expect(relayrPaymentOptions(quote, TESTNETS, NOW)).toEqual([
      paymentFor({ chain: 11155111, amount: "7" }),
      paymentFor({ chain: 84532, amount: "8" }),
    ]);
    expect(relayrPaymentOptions(quote, [1, 1], NOW)).toEqual([paymentFor()]);
    expect(relayrPaymentOptions(quote, [1, 11155111], NOW)).toEqual([]);
  });

  it("skips an option whose contract or token fails its checksum, like any other refused option", () => {
    const quote = {
      bundle_uuid: BUNDLE_UUID,
      payment_info: [
        paymentFor({ target: MISCASED_PAYMENT_ADDRESS }),
        paymentFor({ token: MISCASED_NATIVE_TOKEN, amount: "7" }),
        paymentFor({ chain: 10, target: UPPERCASE_PAYMENT_ADDRESS }),
        paymentFor({ amount: "8", target: CHECKSUMMED_PAYMENT_ADDRESS }),
      ],
    };
    expect(relayrPaymentOptions(quote, [1, 10], NOW)).toEqual([
      paymentFor({ amount: "8", target: CHECKSUMMED_PAYMENT_ADDRESS }),
    ]);
  });

  it("hands out copies the quote's owner cannot change under a later review", () => {
    const quote = { bundle_uuid: BUNDLE_UUID, payment_info: [paymentFor()] };
    const [option] = relayrPaymentOptions(quote, [1], NOW);
    quote.payment_info[0].amount = "999";
    expect(option.amount).toBe("100");
    option.chain = 10;
    expect(quote.payment_info[0].chain).toBe(1);
  });

  it("offers nothing for a quote without a payment list", () => {
    expect(
      relayrPaymentOptions(
        { bundle_uuid: BUNDLE_UUID, payment_info: undefined as never },
        [1],
      ),
    ).toEqual([]);
  });
});

describe("Relayr payment contract checks", () => {
  const codeClient = (read: () => Promise<unknown>) => ({
    getCode: vi.fn(read),
  });

  it("recognizes the payment contract by its runtime code", async () => {
    const client = codeClient(async () => PAYMENT_RUNTIME);
    await expect(
      requireRelayrPaymentRuntime(asClient(client)),
    ).resolves.toBeUndefined();
    expect(client.getCode).toHaveBeenCalledWith({
      address: RELAYR_PAYMENT_ADDRESS,
      blockTag: "latest",
    });
  });

  it("rejects other runtime code", async () => {
    await expect(
      requireRelayrPaymentRuntime(asClient(codeClient(async () => "0x6000"))),
    ).rejects.toThrow("Relayr payment contract code is not recognized.");
  });

  it.each([undefined, null, "0x", "0xzz", "0x600", `0x${"00".repeat(2_049)}`])(
    "cannot authenticate code %s",
    async (code) => {
      await expect(
        requireRelayrPaymentRuntime(asClient(codeClient(async () => code))),
      ).rejects.toThrow("Could not authenticate the Relayr payment contract.");
    },
  );

  it("keeps an RPC failure's cause out of serialization", async () => {
    const failure = new Error(
      "HTTP request failed. URL: https://rpc.invalid/key",
    );
    const error = await rejection(
      requireRelayrPaymentRuntime(
        asClient(
          codeClient(async () => {
            throw failure;
          }),
        ),
      ),
    );
    expect(error.message).toBe(
      "Could not authenticate the Relayr payment contract.",
    );
    expect(error.cause).toBe(failure);
    expect(JSON.stringify(error)).not.toContain("rpc.invalid");
  });

  it("simulates the exact payment with the gas it is sent with", async () => {
    const request = vi.fn(async () => "0x");
    await expect(
      simulateRelayrPayment(asClient({ request }), {
        from: ACCOUNT,
        payment: reviewedPayment(),
      }),
    ).resolves.toBeUndefined();
    expect(request).toHaveBeenCalledWith({
      method: "eth_call",
      params: [
        {
          from: ACCOUNT,
          to: RELAYR_PAYMENT_ADDRESS,
          data: paymentCalldata(),
          value: "0x64",
          gas: "0x249f0",
        },
        "latest",
      ],
    });
  });

  it("refuses a payment whose simulation returns data", async () => {
    await expect(
      simulateRelayrPayment(asClient({ request: vi.fn(async () => "0x00") }), {
        from: ACCOUNT,
        payment: reviewedPayment(),
      }),
    ).rejects.toThrow(
      "Relayr payment simulation returned an unexpected result.",
    );
  });

  it.each([
    [
      "a node's revert text",
      Object.assign(
        new Error("RPC Request failed. URL: https://rpc.invalid/key"),
        {
          shortMessage: "RPC Request failed.",
          details: "execution reverted: Expired",
        },
      ),
      "The Relayr payment would fail: execution reverted: Expired",
    ],
    [
      "text nested in a cause",
      Object.assign(new Error("Outer. URL: https://rpc.invalid/key"), {
        shortMessage: "Outer.",
        details: " ",
        cause: { details: "insufficient funds for gas * price + value" },
      }),
      "The Relayr payment would fail: insufficient funds for gas * price + value",
    ],
    [
      "a viem error without the node's text",
      Object.assign(
        new Error("HTTP request failed. URL: https://rpc.invalid/key"),
        {
          shortMessage: "HTTP request failed.",
        },
      ),
      "The Relayr payment would fail: the node refused the call",
    ],
    [
      "an error from outside viem",
      new Error("socket hang up\nat the second line"),
      "The Relayr payment would fail: socket hang up",
    ],
    [
      "a thrown string",
      "boom",
      "The Relayr payment would fail: the node refused the call",
    ],
  ])("explains a failing simulation from %s", async (_, failure, message) => {
    const error = await rejection(
      simulateRelayrPayment(
        asClient({ request: vi.fn(async () => Promise.reject(failure)) }),
        { from: ACCOUNT, payment: reviewedPayment() },
      ),
    );
    expect(error.message).toBe(message);
    expect(error.cause).toBe(failure);
    expect(JSON.stringify(error)).not.toContain("rpc.invalid");
  });
});

describe("Relayr status labels", () => {
  it("normalizes success and failure labels and counts unreported rows as pending", () => {
    expect(relayrStateIsSuccess(" Completed ")).toBe(true);
    expect(relayrStateIsSuccess("SUCCESS")).toBe(true);
    expect(relayrStateIsSuccess("pending")).toBe(false);
    expect(relayrStateIsSuccess(undefined)).toBe(false);
    expect(relayrStateIsSuccess(1 as unknown as string)).toBe(false);
    expect(relayrStateIsFailed(" FAILED ")).toBe(true);
    // Receipts, not these labels, prove a destination's outcome.
    expect(relayrStateIsFailed("Reverted")).toBe(false);
    expect(relayrStateIsFailed("Dropped")).toBe(false);
    expect(relayrStateIsFailed(undefined)).toBe(false);
    expect(
      relayrProgress(
        [
          { status: { state: "success" } },
          { status: { state: "failed" } },
          { status: { state: "submitted" } },
        ],
        4,
      ),
    ).toEqual({ confirmed: 1, failed: 1, pending: 2, total: 4 });
    expect(
      relayrProgress([
        { status: { state: "completed" } },
        null as unknown as RelayrTransactionRecord,
      ]),
    ).toEqual({ confirmed: 1, failed: 0, pending: 1, total: 2 });
  });

  it("reads a record's destination hash and chain", () => {
    expect(
      relayrDestinationHash({
        status: { data: { hash: HASH, transaction: { hash: SECOND_HASH } } },
      }),
    ).toBe(HASH);
    expect(
      relayrDestinationHash({
        status: { data: { transaction: { hash: SECOND_HASH } } },
      }),
    ).toBe(SECOND_HASH);
    expect(
      relayrDestinationHash({ status: { data: { hash: "0x1234" as Hex } } }),
    ).toBeNull();
    expect(relayrDestinationHash({})).toBeNull();
    expect(
      relayrDestinationHash(null as unknown as RelayrTransactionRecord),
    ).toBeNull();
    expect(relayrRecordChain({ chain: 1, request: forwarded(10) })).toBe(10);
    expect(relayrRecordChain({ chain: 8453 })).toBe(8453);
    for (const chain of [0, -1, 1.5, "1"]) {
      expect(relayrRecordChain({ chain: chain as number })).toBeNull();
    }
    expect(
      relayrRecordChain(null as unknown as RelayrTransactionRecord),
    ).toBeNull();
  });
});

describe("Relayr forward requests", () => {
  it.each([1, 10, 8453, 42161, 11155111, 84532])(
    "reads the account's request from an execute on chain %s's canonical forwarder",
    (chain) => {
      expect(relayrForwardRequest(forwarded(chain))).toEqual({
        from: ACCOUNT,
        to: TARGET,
        value: 5n,
        gas: 500_000n,
        deadline: DEADLINE,
        data: "0x1234",
        signature: `0x${"11".repeat(65)}`,
      });
    },
  );

  it("reads nothing else", () => {
    const entry = forwarded();
    for (const other of [
      { ...entry, target: TARGET },
      { ...entry, chain: 56 },
      { ...entry, data: "0x1234" as Hex },
      { ...entry, data: `${entry.data}00` as Hex },
      { ...entry, data: "not hex" as Hex },
      {
        ...entry,
        data: encodeFunctionData({
          abi: erc2771ForwarderAbi,
          functionName: "nonces",
          args: [ACCOUNT],
        }),
      },
      null as unknown as RelayrEntry,
    ]) {
      expect(relayrForwardRequest(other)).toBeNull();
    }
  });
});

describe("Relayr payment proof", () => {
  const verify = (
    client: object,
    input: Partial<Parameters<typeof verifyRelayrPayment>[1]> = {},
  ) =>
    verifyRelayrPayment(asClient(client), {
      hash: HASH,
      from: ACCOUNT,
      payment: reviewedPayment(),
      ...input,
    });

  it("proves the exact reviewed payment, canonically included", async () => {
    const client = proofClient([onchain()]);
    await expect(verify(client)).resolves.toMatchObject({
      transactionHash: HASH,
      status: "success",
    });
    expect(client.getTransaction).toHaveBeenCalledWith({ hash: HASH });
    expect(client.getTransactionReceipt).toHaveBeenCalledWith({ hash: HASH });
    expect(client.getBlock).toHaveBeenCalledWith({ blockNumber: 123n });
  });

  it("permits recovery only when the original funding transaction canonically reverted", async () => {
    const reverted = await rejection(
      verify(proofClient([onchain({ status: "reverted" })])),
    );
    expect(reverted).toBeInstanceOf(RelayrPaymentRevertedError);
    expect(reverted).toBeInstanceOf(RelayrProofError);
    expect(reverted).not.toBeInstanceOf(RelayrDestinationRevertedError);
    expect(reverted).toMatchObject({
      name: "RelayrPaymentRevertedError",
      message: "The Relayr funding transaction reverted onchain.",
      hash: HASH,
      chainId: 1,
    });
    // A reverted receipt that is not canonical proves nothing yet.
    const reorged = await rejection(
      verify(proofClient([onchain({ status: "reverted" })], OTHER_BLOCK_HASH)),
    );
    expect(reorged).not.toBeInstanceOf(RelayrProofError);
    expect(reorged).toMatchObject({
      message: expect.stringMatching(/no longer canonical/),
    });
    // Nor does a reverted transaction that is not the reviewed payment.
    const other = await rejection(
      verify(proofClient([onchain({ status: "reverted", value: 1n })])),
    );
    expect(other).toBeInstanceOf(RelayrProofError);
    expect(other).not.toBeInstanceOf(RelayrPaymentRevertedError);
  });

  it.each<[string, unknown]>([
    // A saved session restores the reviewed amount from JSON as a string.
    ["a decimal string", "100"],
    ["a hex string", "0x64"],
    ["an exact number", 100],
  ])(
    "proves a payment whose saved amount is %s, and signals its canonical revert",
    async (_, amount) => {
      const saved = {
        ...JSON.parse(
          JSON.stringify(reviewedPayment(), (_key, value: unknown) =>
            typeof value === "bigint" ? value.toString() : value,
          ),
        ),
        amount,
      } as RelayrPaymentDetails;
      await expect(
        verify(proofClient([onchain()]), { payment: saved }),
      ).resolves.toMatchObject({ status: "success" });
      await expect(
        verify(proofClient([onchain({ status: "reverted" })]), {
          payment: saved,
        }),
      ).rejects.toBeInstanceOf(RelayrPaymentRevertedError);
      await expect(
        verify(proofClient([onchain({ value: 99n })]), { payment: saved }),
      ).rejects.toThrow(
        "The funding transaction does not match the reviewed Relayr payment.",
      );
    },
  );

  it.each([
    ["sender", { from: OTHER }],
    ["contract", { to: TARGET }],
    ["missing contract", { to: null }],
    ["calldata", { input: paymentCalldata(OTHER_UUID) }],
    ["value", { value: 101n }],
    ["chain", { chainId: 10 }],
    ["missing chain", {}],
  ])("refuses a different %s as proof of the payment", async (name, change) => {
    const row = onchain(change);
    if (name === "missing chain") row.transaction.chainId = undefined;
    const error = await rejection(verify(proofClient([row])));
    expect(error).toBeInstanceOf(RelayrProofError);
    expect(error).toMatchObject({
      name: "RelayrProofError",
      message:
        "The funding transaction does not match the reviewed Relayr payment. Do not pay again; inspect the wallet's activity and the saved bundle.",
    });
  });

  it.each([
    [
      "the transaction hash",
      (row: Onchain) => {
        row.transaction.hash = SECOND_HASH;
      },
    ],
    [
      "the receipt hash",
      (row: Onchain) => {
        row.receipt.transactionHash = SECOND_HASH;
      },
    ],
    [
      "the receipt target",
      (row: Onchain) => {
        row.receipt.to = TARGET;
      },
    ],
    [
      "a receipt block hash",
      (row: Onchain) => {
        row.receipt.blockHash = "0x1234";
      },
    ],
    [
      "a pending transaction",
      (row: Onchain) => {
        row.transaction.blockHash = null;
        row.transaction.blockNumber = null;
      },
    ],
    [
      "the block hash",
      (row: Onchain) => {
        row.transaction.blockHash = OTHER_BLOCK_HASH;
      },
    ],
    [
      "the block number",
      (row: Onchain) => {
        row.transaction.blockNumber = 124n;
      },
    ],
    [
      "a receipt block number",
      (row: Onchain) => {
        row.receipt.blockNumber = null;
      },
    ],
    [
      "the receipt status",
      (row: Onchain) => {
        row.receipt.status = "0x1";
      },
    ],
  ])(
    "treats a node whose answers disagree on %s as unavailable, not as proof",
    async (_, change) => {
      const row = onchain();
      change(row);
      const client = proofClient([]);
      client.getTransaction.mockResolvedValue(row.transaction);
      client.getTransactionReceipt.mockResolvedValue(row.receipt);
      const error = await rejection(verify(client));
      expect(error).not.toBeInstanceOf(RelayrProofError);
      expect(error).toMatchObject({
        message: `Could not read Relayr payment ${HASH} on chain 1. Do not pay again; check it later.`,
      });
    },
  );

  it("treats a missing canonical block as not canonical", async () => {
    await expect(verify(proofClient([onchain()], null))).rejects.toThrow(
      "The Relayr funding receipt is no longer canonical. Do not pay again; check it later.",
    );
  });

  it.each(["getTransaction", "getBlock"] as const)(
    "keeps a failed %s out of the message and serialization",
    async (method) => {
      const client = proofClient([onchain()]);
      const failure = Object.assign(
        new Error(
          "Missing or invalid parameters. URL: https://rpc.invalid/key",
        ),
        { details: "header not found" },
      );
      client[method].mockRejectedValueOnce(failure);
      const error = await rejection(verify(client));
      expect(error).not.toBeInstanceOf(RelayrProofError);
      expect(error.message).toBe(
        `Could not read Relayr payment ${HASH} on chain 1. Do not pay again; check it later.`,
      );
      expect(error.cause).toBe(failure);
      expect(JSON.stringify(error)).not.toContain("rpc.invalid");
    },
  );

  it.each([
    ["a malformed hash", { hash: "0x1234" as Hex }],
    ["a malformed sender", { from: "0xnope" as Address }],
    ["an unsupported chain", { payment: reviewedPayment({ chainId: 56 }) }],
    ["another contract", { payment: reviewedPayment({ target: TARGET }) }],
    ["a negative amount", { payment: reviewedPayment({ amount: -1n }) }],
    [
      "an invalid bundle ID",
      { payment: reviewedPayment({ bundleUuid: "bundle-1" }) },
    ],
    [
      "calldata for another bundle",
      { payment: reviewedPayment({ bundleUuid: OTHER_UUID }) },
    ],
    [
      "calldata for another function",
      {
        payment: reviewedPayment({
          calldata: paymentCalldata(BUNDLE_UUID, DEADLINE, "0xdeadbeef"),
        }),
      },
    ],
    [
      "a deadline beyond uint40",
      {
        payment: reviewedPayment({
          calldata: paymentCalldata(BUNDLE_UUID, 1n << 40n),
        }),
      },
    ],
    [
      "missing calldata",
      { payment: reviewedPayment({ calldata: undefined as never }) },
    ],
  ])("reads nothing for %s", async (_, input) => {
    const client = proofClient([onchain()]);
    await expect(verify(client, input)).rejects.toThrow(
      "Only an authenticated Relayr payment with its transaction hash can be verified.",
    );
    expect(client.getTransaction).not.toHaveBeenCalled();
  });
});

describe("Relayr payment retry", () => {
  /** Relayr's record of a call it has not run. */
  const unrun: RelayrTransactionRecord = {
    tx_uuid: OTHER_UUID,
    status: { state: "Pending" },
  };
  const answer = (body: Record<string, unknown>) =>
    vi.fn(async (_input: unknown, _init?: unknown) =>
      json({ bundle_uuid: BUNDLE_UUID, transactions: [unrun], ...body }),
    );
  const unpaid = () => answer({ payment_received: false });
  const retry = (
    client: object,
    {
      hashes = [HASH],
      fetchBundle = unpaid(),
      payment = reviewedPayment(),
      nowSeconds = NOW,
    }: {
      hashes?: Hex[];
      fetchBundle?: typeof globalThis.fetch;
      payment?: Parameters<typeof verifyRelayrPayment>[1]["payment"];
      nowSeconds?: number;
    } = {},
  ) =>
    requireRelayrPaymentRetry(
      asClient(client),
      { hashes, from: ACCOUNT, payment },
      { fetch: fetchBundle, nowSeconds },
    );
  const reverted = (hash: Hex = HASH) => onchain({ hash, status: "reverted" });

  it("clears the quote only when every payment the session sent canonically reverted and Relayr's bundle is unpaid and unrun", async () => {
    const client = proofClient([reverted(), reverted(SECOND_HASH)]);
    const fetchBundle = unpaid();
    await expect(
      retry(client, { hashes: [HASH, SECOND_HASH], fetchBundle }),
    ).resolves.toBeUndefined();
    expect(client.getTransaction.mock.calls).toEqual([
      [{ hash: HASH }],
      [{ hash: SECOND_HASH }],
    ]);
    // Relayr's answer must never come from a cache.
    expect(fetchBundle).toHaveBeenCalledTimes(1);
    expect(fetchBundle).toHaveBeenCalledWith(
      `${RELAYR_API}/v1/bundle/${BUNDLE_UUID}`,
      { cache: "no-store", signal: expect.any(AbortSignal) },
    );
    // A session restored from JSON carries the amount as a string.
    await expect(
      retry(proofClient([reverted()]), {
        payment: { ...reviewedPayment(), amount: "100" },
      }),
    ).resolves.toBeUndefined();
  });

  it("refuses while any payment the session sent is not a canonical revert", async () => {
    // An earlier attempt reverted; a later one landed but Relayr has not seen it.
    const landed = proofClient([reverted(), onchain({ hash: SECOND_HASH })]);
    for (const hashes of [
      [HASH, SECOND_HASH],
      [SECOND_HASH, HASH],
    ]) {
      const fetchBundle = unpaid();
      await expect(retry(landed, { hashes, fetchBundle })).rejects.toThrow(
        "This Relayr payment succeeded onchain, so its bundle is paid. Do not pay again.",
      );
      expect(fetchBundle).not.toHaveBeenCalled();
    }
    await expect(
      retry(
        proofClient([
          reverted(),
          onchain({ hash: SECOND_HASH, status: "reverted", value: 1n }),
        ]),
        { hashes: [HASH, SECOND_HASH] },
      ),
    ).rejects.toBeInstanceOf(RelayrProofError);
    await expect(
      retry(proofClient([reverted()]), { hashes: [HASH, SECOND_HASH] }),
    ).rejects.toThrow(
      `Could not read Relayr payment ${SECOND_HASH} on chain 1. Do not pay again; check it later.`,
    );
  });

  it("refuses without every payment the session sent", async () => {
    const client = proofClient([reverted()]);
    for (const hashes of [[], undefined as unknown as Hex[]]) {
      const fetchBundle = unpaid();
      await expect(
        requireRelayrPaymentRetry(
          asClient(client),
          { hashes, from: ACCOUNT, payment: reviewedPayment() },
          { fetch: fetchBundle, nowSeconds: NOW },
        ),
      ).rejects.toThrow(
        "Name every payment this session sent for the quote before paying it again.",
      );
      expect(fetchBundle).not.toHaveBeenCalled();
    }
    expect(client.getTransaction).not.toHaveBeenCalled();
  });

  it("refuses a quote whose deadline is 15 seconds away or less", async () => {
    const client = proofClient([reverted()]);
    await expect(retry(client, { nowSeconds: DEADLINE - 15 })).rejects.toThrow(
      "This Relayr quote expired. Review the action again for a new quote.",
    );
    expect(client.getTransaction).not.toHaveBeenCalled();
    await expect(
      retry(client, { nowSeconds: DEADLINE - 16 }),
    ).resolves.toBeUndefined();
  });

  it("reads the bundle with the global fetch, and the deadline against the clock, by default", async () => {
    const later = Math.floor(Date.now() / 1_000) + 3_600;
    const live = relayrPaymentDetails(paymentFor({}, later), {
      bundleUuid: BUNDLE_UUID,
      destinationChainIds: [1],
    });
    vi.stubGlobal("fetch", unpaid());
    await expect(
      requireRelayrPaymentRetry(
        asClient(
          proofClient([
            onchain({
              status: "reverted",
              input: paymentCalldata(BUNDLE_UUID, later),
            }),
          ]),
        ),
        { hashes: [HASH], from: ACCOUNT, payment: live },
      ),
    ).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(1);
    // The fixtures' quote expired in 2025.
    await expect(
      requireRelayrPaymentRetry(
        asClient(proofClient([reverted()])),
        { hashes: [HASH], from: ACCOUNT, payment: reviewedPayment() },
        { fetch: unpaid() },
      ),
    ).rejects.toThrow("This Relayr quote expired.");
  });

  it("refuses when Relayr reports a payment for the bundle", async () => {
    await expect(
      retry(proofClient([reverted()]), {
        fetchBundle: answer({ payment_received: true }),
      }),
    ).rejects.toThrow(
      "Relayr already reports a payment for this bundle. Do not pay again.",
    );
  });

  it.each<[string, Record<string, unknown>]>([
    ["no payment_received", {}],
    ["a null payment_received", { payment_received: null }],
    ['payment_received "false"', { payment_received: "false" }],
    ["payment_received 0", { payment_received: 0 }],
    ["no records", { payment_received: false, transactions: undefined }],
    ["an empty record list", { payment_received: false, transactions: [] }],
    [
      "records that are not a list",
      { payment_received: false, transactions: "x" },
    ],
  ])("refuses while Relayr's answer has %s", async (_, body) => {
    await expect(
      retry(proofClient([reverted()]), { fetchBundle: answer(body) }),
    ).rejects.toThrow(
      "Relayr has not said whether this bundle is paid. Do not pay again yet; check it later.",
    );
  });

  it.each<[string, unknown]>([
    ["a destination hash", { state: "Success", data: { hash: SECOND_HASH } }],
    [
      "a pending state with a destination hash",
      { state: "Pending", data: { transaction: { hash: SECOND_HASH } } },
    ],
    ["an included call", { state: "Included" }],
    ["a completed call", { state: "Completed" }],
    ["a failed call", { state: "Failed" }],
    ["an unknown state", { state: "Submitted" }],
    ["no state", {}],
  ])(
    "refuses while a record shows the bundle running or run: %s",
    async (_, status) => {
      for (const transactions of [
        [{ tx_uuid: OTHER_UUID, status }],
        [unrun, { tx_uuid: THIRD_UUID, status }],
      ]) {
        await expect(
          retry(proofClient([reverted()]), {
            fetchBundle: answer({ payment_received: false, transactions }),
          }),
        ).rejects.toThrow(
          "Relayr reports a transaction of this bundle as running or run. Do not pay again.",
        );
      }
    },
  );

  it("reads a pending state in any case", async () => {
    await expect(
      retry(proofClient([reverted()]), {
        fetchBundle: answer({
          payment_received: false,
          transactions: [
            { tx_uuid: OTHER_UUID, status: { state: " PENDING " } },
            unrun,
          ],
        }),
      }),
    ).resolves.toBeUndefined();
  });

  it.each([
    ["an HTTP error", vi.fn(async () => json({ error: "not found" }, 404))],
    [
      "another bundle",
      answer({ bundle_uuid: OTHER_UUID, payment_received: false }),
    ],
    ["an unreadable body", vi.fn(async () => json("{not json"))],
  ])("refuses when the bundle read returns %s", async (_, fetchBundle) => {
    await expect(
      retry(proofClient([reverted()]), { fetchBundle }),
    ).rejects.toThrow(
      "Relayr has not said whether this bundle is paid. Do not pay again yet; check it later.",
    );
  });

  it("keeps a failed bundle read's cause out of serialization", async () => {
    const failure = new TypeError("fetch failed: https://relayr.invalid/key");
    const error = await rejection(
      retry(proofClient([reverted()]), {
        fetchBundle: vi.fn(async () => {
          throw failure;
        }),
      }),
    );
    expect(error.cause).toBe(failure);
    expect(JSON.stringify(error)).not.toContain("relayr.invalid");
  });

  it("never asks Relayr about a payment that succeeded, differs or cannot be read", async () => {
    const fetchBundle = unpaid();
    await expect(
      retry(proofClient([onchain()]), { fetchBundle }),
    ).rejects.toThrow(
      "This Relayr payment succeeded onchain, so its bundle is paid. Do not pay again.",
    );
    await expect(
      retry(proofClient([onchain({ status: "reverted", value: 1n })]), {
        fetchBundle,
      }),
    ).rejects.toBeInstanceOf(RelayrProofError);
    await expect(retry(proofClient([]), { fetchBundle })).rejects.toThrow(
      `Could not read Relayr payment ${HASH} on chain 1. Do not pay again; check it later.`,
    );
    await expect(
      retry(proofClient([reverted()]), {
        fetchBundle,
        payment: { ...reviewedPayment(), target: TARGET },
      }),
    ).rejects.toThrow(
      "Only an authenticated Relayr payment with its transaction hash can be verified.",
    );
    expect(fetchBundle).not.toHaveBeenCalled();
  });
});

describe("Relayr destination proof", () => {
  const first = forwarded(1);
  const second = forwarded(10, { value: 0n, data: "0x5678" });
  const bindings: RelayrTransactionBinding[] = [
    { txUuid: OTHER_UUID, chain: 1, entry: first },
    { txUuid: THIRD_UUID, chain: 10, entry: second },
  ];
  const destination = (
    entry: RelayrEntry,
    hash: Hex,
    change: Parameters<typeof onchain>[0] = {},
  ) =>
    onchain({
      hash,
      chainId: entry.chain,
      from: OTHER,
      to: entry.target,
      input: entry.data,
      value: BigInt(entry.value),
      ...change,
    });
  const success = { state: "Success" };
  const records = (): RelayrTransactionRecord[] => [
    // Out of order, as Relayr lists them.
    recordFor(second, THIRD_UUID, { ...success, data: { hash: SECOND_HASH } }),
    recordFor(first, OTHER_UUID, {
      state: "Completed",
      data: { transaction: { hash: HASH } },
    }),
  ];
  const clients = (
    rows: Onchain[] = [
      destination(first, HASH),
      destination(second, SECOND_HASH),
    ],
    canonical: Hex | null = BLOCK_HASH,
  ) => {
    const client = proofClient(rows, canonical);
    return { client, clientFor: vi.fn(() => asClient(client)) };
  };
  const verifyAll = (
    input: Partial<Parameters<typeof verifyRelayrDestinations>[1]> = {},
    clientFor: (chainId: number) => PublicClient | undefined = clients()
      .clientFor,
  ) =>
    verifyRelayrDestinations(clientFor, {
      bindings,
      records: records(),
      ...input,
    });

  it("proves each signed destination onchain and returns its receipt in binding order", async () => {
    const { client, clientFor } = clients();
    const verified = await verifyAll({ account: ACCOUNT }, clientFor);
    expect(
      verified.map(({ txUuid, chainId, receipt }) => [
        txUuid,
        chainId,
        receipt.transactionHash,
      ]),
    ).toEqual([
      [OTHER_UUID, 1, HASH],
      [THIRD_UUID, 10, SECOND_HASH],
    ]);
    expect(clientFor.mock.calls).toEqual([[1], [10]]);
    expect(client.getBlock).toHaveBeenCalledTimes(2);
  });

  it("binds records by request, so IDs saved by position still prove their calls", async () => {
    const swapped = records();
    [swapped[0].tx_uuid, swapped[1].tx_uuid] = [
      swapped[1].tx_uuid,
      swapped[0].tx_uuid,
    ];
    await expect(verifyAll({ records: swapped })).resolves.toHaveLength(2);
  });

  it("binds a record without a request by its exact ID", async () => {
    const bare = records().map(({ tx_uuid, status }, index) => ({
      tx_uuid,
      status,
      chain: index === 0 ? 10 : 1,
    }));
    await expect(verifyAll({ records: bare })).resolves.toHaveLength(2);
    const swapped = bare.map((record, index) => ({
      ...record,
      tx_uuid: bare[1 - index].tx_uuid,
    }));
    await expect(verifyAll({ records: swapped })).rejects.toBeInstanceOf(
      RelayrProofError,
    );
  });

  it("compares virtual nonces only when both sides carry one", async () => {
    const numbered = bindings.map((binding) => ({
      ...binding,
      entry: { ...binding.entry, virtual_nonce: 0 },
    }));
    await expect(verifyAll({ bindings: numbered })).resolves.toHaveLength(2);
    const other = records();
    other[1].request = { ...first, virtual_nonce: 1 };
    await expect(
      verifyAll({ bindings: numbered, records: other }),
    ).rejects.toThrow(
      "Relayr's destination call does not match the signed request. Keep the original bundle pending; do not pay again.",
    );
  });

  it.each([
    ["another signer", { account: OTHER }],
    ["an invalid signer", { account: "0xnope" as Address }],
    [
      "a value other than the signed request's",
      {
        account: ACCOUNT,
        bindings: [
          { ...bindings[0], entry: { ...first, value: "6" } },
          bindings[1],
        ],
      },
    ],
    [
      "a raw call",
      {
        account: ACCOUNT,
        bindings: [
          {
            ...bindings[0],
            entry: {
              chain: 1,
              target: TARGET,
              data: "0x1234" as Hex,
              value: "5",
            },
          },
          bindings[1],
        ],
      },
    ],
  ])("refuses a saved authorization with %s", async (_, input) => {
    await expect(verifyAll(input)).rejects.toThrow(
      "The saved relay authorization does not match its account or value.",
    );
  });

  it.each([
    ["no bindings", { bindings: [] }],
    [
      "an invalid ID",
      { bindings: [{ ...bindings[0], txUuid: "tx-1" }, bindings[1]] },
    ],
    [
      "a repeated ID",
      { bindings: [bindings[0], { ...bindings[1], txUuid: OTHER_UUID }] },
    ],
    [
      "a chain other than its entry's",
      { bindings: [{ ...bindings[0], chain: 8453 }, bindings[1]] },
    ],
    [
      "a malformed entry",
      {
        bindings: [
          { ...bindings[0], entry: { ...first, value: "-5" } },
          bindings[1],
        ],
      },
    ],
    [
      "a missing binding",
      { bindings: [null as unknown as RelayrTransactionBinding] },
    ],
  ])("keeps a saved bundle with %s pending", async (_, input) => {
    await expect(verifyAll(input)).rejects.toThrow(
      "This saved Relayr bundle lacks exact destination proof. Keep it pending and verify the original transactions; do not pay again.",
    );
  });

  it.each([
    ["fewer records", (list: RelayrTransactionRecord[]) => list.slice(1)],
    [
      "more records",
      (list: RelayrTransactionRecord[]) => [
        ...list,
        { ...list[0], tx_uuid: FOURTH_UUID },
      ],
    ],
    [
      "a record without a hash",
      (list: RelayrTransactionRecord[]) => {
        list[1].status = { state: "Completed" };
        return list;
      },
    ],
    [
      "a record whose hash is malformed",
      (list: RelayrTransactionRecord[]) => {
        list[0].status = { state: "Success", data: { hash: "0x12" as Hex } };
        return list;
      },
    ],
  ])("keeps checking while Relayr reports %s", async (_, change) => {
    const error = await rejection(verifyAll({ records: change(records()) }));
    expect(error).not.toBeInstanceOf(RelayrProofError);
    expect(error).toMatchObject({
      message:
        "Relayr has not identified every exact destination transaction. Keep checking the original bundle; do not pay again.",
    });
  });

  it.each([
    [
      "an ID this quote did not bind",
      (list: RelayrTransactionRecord[]) => {
        list[0].tx_uuid = FOURTH_UUID;
        return list;
      },
      /names a transaction this quote did not bind/,
    ],
    [
      "one ID twice",
      (list: RelayrTransactionRecord[]) => {
        list[0].tx_uuid = OTHER_UUID;
        return list;
      },
      /names a transaction this quote did not bind/,
    ],
    [
      "an empty record",
      (list: RelayrTransactionRecord[]) => [
        list[0],
        null as unknown as RelayrTransactionRecord,
      ],
      /names a transaction this quote did not bind/,
    ],
    [
      "changed calldata",
      (list: RelayrTransactionRecord[]) => {
        list[1].request = { ...first, data: "0x99" };
        return list;
      },
      /does not match the signed request/,
    ],
    [
      "changed value",
      (list: RelayrTransactionRecord[]) => {
        list[1].request = { ...first, value: "0x1" };
        return list;
      },
      /does not match the signed request/,
    ],
    [
      "one request twice",
      (list: RelayrTransactionRecord[]) => {
        list[0].request = { ...first };
        return list;
      },
      /does not match the signed request/,
    ],
    [
      "one hash for two calls",
      (list: RelayrTransactionRecord[]) => {
        list[0].status = { state: "Success", data: { hash: HASH } };
        return list;
      },
      /one destination transaction for two signed calls/,
    ],
  ])("refuses a status with %s", async (_, change, message) => {
    const error = await rejection(verifyAll({ records: change(records()) }));
    expect(error).toBeInstanceOf(RelayrProofError);
    expect(error).toMatchObject({ message: expect.stringMatching(message) });
  });

  it("waits for an RPC on every destination chain", async () => {
    await expect(verifyAll({}, () => undefined)).rejects.toThrow(
      "No RPC is available for chain 1. Keep the original bundle pending; do not pay again.",
    );
  });

  it.each([
    ["calldata", { input: "0x1234" as Hex }, RelayrProofError],
    ["value", { value: 1n }, RelayrProofError],
    ["target", { to: TARGET }, RelayrProofError],
    ["chain", { chainId: 8453 }, RelayrProofError],
    ["receipt status", { status: "reverted" }, RelayrDestinationRevertedError],
  ])(
    "keeps a paid bundle pending when the onchain %s is wrong",
    async (_, change, kind) => {
      const { clientFor } = clients([
        destination(first, HASH),
        destination(second, SECOND_HASH, change),
      ]);
      const error = await rejection(verifyAll({}, clientFor));
      expect(error).toBeInstanceOf(kind);
      expect(error).toMatchObject({
        message: expect.stringMatching(/does not prove the signed Relayr call/),
      });
    },
  );

  it("keeps a paid bundle pending while its receipt is not canonical", async () => {
    const error = await rejection(
      verifyAll({}, clients(undefined, OTHER_BLOCK_HASH).clientFor),
    );
    expect(error).not.toBeInstanceOf(RelayrProofError);
    expect(error).toMatchObject({
      message:
        "The destination receipt is no longer canonical. Keep the original bundle pending.",
    });
  });

  it("proves one destination for a caller that tracks each chain itself", async () => {
    const { client } = clients();
    await expect(
      verifyRelayrDestination(asClient(client), {
        entry: second,
        hash: SECOND_HASH,
      }),
    ).resolves.toMatchObject({ transactionHash: SECOND_HASH });
    const reverted = await rejection(
      verifyRelayrDestination(
        asClient(
          proofClient([destination(first, HASH, { status: "reverted" })]),
        ),
        { entry: first, hash: HASH },
      ),
    );
    // A failed destination never reads as a payment that may be retried.
    expect(reverted).not.toBeInstanceOf(RelayrPaymentRevertedError);
    expect(reverted).toMatchObject({
      name: "RelayrDestinationRevertedError",
      hash: HASH,
      chainId: 1,
    });
    const failure = new Error("URL: https://rpc.invalid/key");
    client.getTransactionReceipt.mockRejectedValueOnce(failure);
    const unavailable = await rejection(
      verifyRelayrDestination(asClient(client), {
        entry: first,
        hash: HASH,
      }),
    );
    expect(unavailable.message).toBe(
      `Could not read destination transaction ${HASH} on chain 1. Keep the original bundle pending; do not pay again.`,
    );
    expect(unavailable.cause).toBe(failure);
    expect(JSON.stringify(unavailable)).not.toContain("rpc.invalid");
  });

  it.each([
    ["a malformed entry", { entry: { ...first, target: "0xnope" as Address } }],
    ["a malformed hash", { hash: "0x12" as Hex }],
  ])("reads nothing for %s", async (_, input) => {
    const { client } = clients();
    await expect(
      verifyRelayrDestination(asClient(client), {
        entry: first,
        hash: HASH,
        ...input,
      }),
    ).rejects.toThrow(/lacks exact destination proof/);
    expect(client.getTransaction).not.toHaveBeenCalled();
  });
});

describe("Relayr's live bundle shape", () => {
  // Posted in chain order; Relayr lists the bundle by chain name.
  const posted = [1, 10, 8453, 42161];
  const listed = [42161, 8453, 1, 10];
  const ID: Record<number, string> = {
    1: OTHER_UUID,
    10: THIRD_UUID,
    8453: FOURTH_UUID,
    42161: "cccccccc-dddd-eeee-ffff-aaaaaaaaaaaa",
  };
  const TX: Record<number, Hex> = {
    1: `0x${"a1".repeat(32)}`,
    10: `0x${"b2".repeat(32)}`,
    8453: `0x${"c3".repeat(32)}`,
    42161: `0x${"d4".repeat(32)}`,
  };
  const request = relayrBundleRequest(
    posted.map((chain) => forwarded(chain, { value: chain === 1 ? 5n : 0n })),
  );
  const entryOn = (chain: number) =>
    request.transactions[posted.indexOf(chain)];
  // `GET /v1/bundle/{uuid}` with the fields revnet.money's client reads from
  // the live API, in the order a live bundle posted as 1, 10, 8453, 42161 came
  // back on 2026-09-25 (bundle 9c33afcf…). No raw response was kept, so it is
  // rebuilt from that schema and order: hex values, a gas limit per call, and
  // a completed status that nests the hash beside its block hash.
  const live = {
    bundle_uuid: BUNDLE_UUID,
    created_at: "2026-09-25T21:40:11.482913Z",
    expires_at: "2026-09-25T22:40:11.482913Z",
    payment: [paymentFor({ chain: 8453, amount: "0x1c6bf52634000" })],
    payment_received: true,
    transactions: listed.map((chain) => ({
      tx_uuid: ID[chain],
      request: {
        chain,
        target: entryOn(chain).target.toLowerCase(),
        data: entryOn(chain).data,
        value: `0x${BigInt(entryOn(chain).value).toString(16)}`,
        gas_limit: "0x9c4e0",
        virtual_nonce: 0,
      },
      status:
        chain === 8453
          ? { state: "Success", data: { hash: TX[chain] } }
          : {
              state: "Completed",
              data: {
                block_hash: BLOCK_HASH,
                transaction: { hash: TX[chain] },
              },
            },
    })),
  };
  // The quote lists its IDs in that order too, and leaves the records out.
  const quote = {
    bundle_uuid: BUNDLE_UUID,
    payment_info: live.payment,
    per_txn: listed.map(() => ({
      gas_cost: 61_234,
      priced_in: { asset: "ETH", type: "native" },
      value: 0.0000123,
    })),
    txn_uuids: listed.map((chain) => ID[chain]),
  };

  it("binds each posted call to its own ID and proves every destination", async () => {
    const bound = await bindRelayrQuote(json(quote), request, {
      fetch: vi.fn(async () => json(live)),
    });
    expect(
      bound.expectedTransactions.map(({ chain, txUuid }) => [chain, txUuid]),
    ).toEqual(posted.map((chain) => [chain, ID[chain]]));
    const client = proofClient(
      posted.map((chain) =>
        onchain({
          hash: TX[chain],
          chainId: chain,
          from: OTHER,
          to: entryOn(chain).target,
          input: entryOn(chain).data,
          value: BigInt(entryOn(chain).value),
        }),
      ),
    );
    const verified = await verifyRelayrDestinations(() => asClient(client), {
      bindings: bound.expectedTransactions,
      records: live.transactions as RelayrTransactionRecord[],
      account: ACCOUNT,
    });
    expect(
      verified.map(({ chainId, receipt }) => [
        chainId,
        receipt.transactionHash,
      ]),
    ).toEqual(posted.map((chain) => [chain, TX[chain]]));
  });

  it("refuses to pay its quote again once it reports a payment received", async () => {
    await expect(
      requireRelayrPaymentRetry(
        asClient(proofClient([onchain({ status: "reverted" })])),
        { hashes: [HASH], from: ACCOUNT, payment: reviewedPayment() },
        { fetch: vi.fn(async () => json(live)), nowSeconds: NOW },
      ),
    ).rejects.toThrow("Relayr already reports a payment for this bundle.");
  });
});

// The network guard stubs fetch before every test; this is the real one.
const loopbackFetch = globalThis.fetch;

describe("Relayr proofs over viem's HTTP transport and real HTTP", () => {
  type RpcError = { code: number; message: string; data?: Hex };
  let server: Server;
  let url: string;
  let transactions: Map<string, Record<string, unknown>>;
  let receipts: Map<string, Record<string, unknown>>;
  let canonical: Hex;
  let errors: Partial<Record<string, RpcError>>;
  let bundles: Map<string, unknown>;

  const hex = (value: number | bigint) => `0x${value.toString(16)}`;
  function mine(
    entry: {
      chain: number;
      to: Address;
      data: Hex;
      value: bigint;
      from: Address;
    },
    hash: Hex,
    status: "0x1" | "0x0" = "0x1",
  ) {
    transactions.set(hash, {
      hash,
      from: entry.from,
      to: entry.to,
      input: entry.data,
      value: hex(entry.value),
      chainId: hex(entry.chain),
      blockHash: BLOCK_HASH,
      blockNumber: "0x7b",
      nonce: "0x0",
      gas: "0x249f0",
      type: "0x2",
      maxFeePerGas: "0x1",
      maxPriorityFeePerGas: "0x1",
      v: "0x0",
      yParity: "0x0",
      r: "0x1",
      s: "0x1",
      transactionIndex: "0x0",
      accessList: [],
    });
    receipts.set(hash, {
      transactionHash: hash,
      status,
      from: entry.from,
      to: entry.to,
      blockHash: BLOCK_HASH,
      blockNumber: "0x7b",
      logs: [],
      gasUsed: "0x5208",
      cumulativeGasUsed: "0x5208",
      effectiveGasPrice: "0x1",
      type: "0x2",
      transactionIndex: "0x0",
      contractAddress: null,
      logsBloom: `0x${"00".repeat(256)}`,
    });
  }

  beforeAll(async () => {
    // One local node for every chain and a local Relayr for bundle reads.
    server = createServer((request, response) => {
      let body = "";
      request.on("data", (chunk) => (body += chunk));
      request.on("end", () => {
        response.setHeader("content-type", "application/json");
        if (request.method === "GET") {
          const uuid = String(request.url).split("/").pop()!;
          const found = bundles.get(uuid);
          response.statusCode = found ? 200 : 404;
          response.end(JSON.stringify(found ?? { error: "not found" }));
          return;
        }
        const answer = ({
          id,
          method,
          params,
        }: {
          id: number;
          method: string;
          params: unknown[];
        }) => {
          const error = errors[method];
          if (error) return { jsonrpc: "2.0", id, error };
          const key = String(params[0]).toLowerCase();
          const result =
            method === "eth_getTransactionByHash"
              ? (transactions.get(key) ?? null)
              : method === "eth_getTransactionReceipt"
                ? (receipts.get(key) ?? null)
                : method === "eth_getBlockByNumber"
                  ? {
                      hash: canonical,
                      number: params[0],
                      parentHash: BLOCK_HASH,
                      timestamp: "0x1",
                      transactions: [],
                      gasLimit: "0x1",
                      gasUsed: "0x0",
                      baseFeePerGas: "0x1",
                      difficulty: "0x0",
                      extraData: "0x",
                      logsBloom: `0x${"00".repeat(256)}`,
                      miner: ACCOUNT,
                      mixHash: BLOCK_HASH,
                      nonce: "0x0000000000000000",
                      receiptsRoot: BLOCK_HASH,
                      sha3Uncles: BLOCK_HASH,
                      size: "0x1",
                      stateRoot: BLOCK_HASH,
                      totalDifficulty: "0x0",
                      transactionsRoot: BLOCK_HASH,
                      uncles: [],
                    }
                  : method === "eth_getCode"
                    ? PAYMENT_RUNTIME
                    : "0x";
          return { jsonrpc: "2.0", id, result };
        };
        const message = JSON.parse(body);
        response.end(
          JSON.stringify(
            Array.isArray(message) ? message.map(answer) : answer(message),
          ),
        );
      });
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    // A key in the RPC path, as hosted RPC URLs carry one.
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/rpc-key-7f3a`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    transactions = new Map();
    receipts = new Map();
    bundles = new Map();
    canonical = BLOCK_HASH;
    errors = {};
    // Only this suite's loopback server may answer.
    vi.stubGlobal(
      "fetch",
      vi.fn((input: string | URL | Request, init?: RequestInit) =>
        String(input).startsWith(url.split("/rpc-key")[0])
          ? loopbackFetch(input, init)
          : Promise.reject(new Error(`Unexpected fetch: ${String(input)}`)),
      ),
    );
  });

  const clientOn = (chain: typeof mainnet | typeof base) =>
    createPublicClient({ chain, transport: http(url, { retryCount: 0 }) });

  const payment = () => ({
    chain: 1,
    from: ACCOUNT,
    to: RELAYR_PAYMENT_ADDRESS,
    data: paymentCalldata(),
    value: 100n,
  });

  it("proves a payment and detects its canonical revert", async () => {
    mine(payment(), HASH);
    await expect(
      verifyRelayrPayment(clientOn(mainnet), {
        hash: HASH,
        from: ACCOUNT,
        payment: reviewedPayment(),
      }),
    ).resolves.toMatchObject({ status: "success", blockNumber: 123n });
    mine(payment(), SECOND_HASH, "0x0");
    await expect(
      verifyRelayrPayment(clientOn(mainnet), {
        hash: SECOND_HASH,
        from: ACCOUNT,
        payment: reviewedPayment(),
      }),
    ).rejects.toBeInstanceOf(RelayrPaymentRevertedError);
    canonical = OTHER_BLOCK_HASH;
    await expect(
      verifyRelayrPayment(clientOn(mainnet), {
        hash: SECOND_HASH,
        from: ACCOUNT,
        payment: reviewedPayment(),
      }),
    ).rejects.toThrow(/no longer canonical/);
  });

  it("refuses a different payment read through viem's formatters", async () => {
    mine({ ...payment(), value: 99n }, HASH);
    await expect(
      verifyRelayrPayment(clientOn(mainnet), {
        hash: HASH,
        from: ACCOUNT,
        payment: reviewedPayment(),
      }),
    ).rejects.toBeInstanceOf(RelayrProofError);
  });

  it("names neither the RPC URL nor its key when the node fails or lacks the transaction", async () => {
    const read = () =>
      rejection(
        verifyRelayrPayment(clientOn(mainnet), {
          hash: HASH,
          from: ACCOUNT,
          payment: reviewedPayment(),
        }),
      );
    const missing = await read();
    errors = {
      eth_getTransactionByHash: { code: -32000, message: "header not found" },
      eth_getTransactionReceipt: { code: -32000, message: "header not found" },
    };
    const failing = await read();
    // viem quotes the URL in a failed request's message; the proof must not.
    expect((failing.cause as Error).message).toContain("rpc-key-7f3a");
    for (const error of [missing, failing]) {
      expect(error).not.toBeInstanceOf(RelayrProofError);
      expect(error.message).toBe(
        `Could not read Relayr payment ${HASH} on chain 1. Do not pay again; check it later.`,
      );
      expect(error.cause).toBeInstanceOf(Error);
      expect(JSON.stringify(error)).not.toContain("rpc-key-7f3a");
    }
  });

  it("checks the payment contract's code and simulates the payment", async () => {
    await expect(
      requireRelayrPaymentRuntime(clientOn(mainnet)),
    ).resolves.toBeUndefined();
    await expect(
      simulateRelayrPayment(clientOn(mainnet), {
        from: ACCOUNT,
        payment: reviewedPayment(),
      }),
    ).resolves.toBeUndefined();
    errors = {
      eth_getCode: { code: -32000, message: "header not found" },
      eth_call: {
        code: 3,
        message: "execution reverted: Expired",
        data: "0x08c379a0",
      },
    };
    const runtime = await rejection(
      requireRelayrPaymentRuntime(clientOn(mainnet)),
    );
    expect(runtime.message).toBe(
      "Could not authenticate the Relayr payment contract.",
    );
    const simulation = await rejection(
      simulateRelayrPayment(clientOn(mainnet), {
        from: ACCOUNT,
        payment: reviewedPayment(),
      }),
    );
    expect(simulation.message).toBe(
      "The Relayr payment would fail: execution reverted: Expired",
    );
    for (const error of [runtime, simulation]) {
      expect(JSON.stringify(error)).not.toContain("rpc-key-7f3a");
    }
  });

  it("proves destinations on two chains", async () => {
    const first = forwarded(1);
    const second = forwarded(8453, { value: 0n });
    mine(
      { chain: 1, from: OTHER, to: first.target, data: first.data, value: 5n },
      HASH,
    );
    mine(
      {
        chain: 8453,
        from: OTHER,
        to: second.target,
        data: second.data,
        value: 0n,
      },
      SECOND_HASH,
    );
    // Clients typed by their chain's formatters fit the exported client type.
    const clients: Record<number, RelayrProofClient> = {
      1: clientOn(mainnet),
      8453: clientOn(base),
    };
    const verified = await verifyRelayrDestinations(
      (chainId) => clients[chainId],
      {
        bindings: [
          { txUuid: OTHER_UUID, chain: 1, entry: first },
          { txUuid: THIRD_UUID, chain: 8453, entry: second },
        ],
        records: [
          recordFor(second, THIRD_UUID, {
            state: "Success",
            data: { hash: SECOND_HASH },
          }),
          recordFor(first, OTHER_UUID, {
            state: "Success",
            data: { hash: HASH },
          }),
        ],
        account: ACCOUNT,
      },
    );
    expect(
      verified.map(({ chainId, receipt }) => [
        chainId,
        receipt.transactionHash,
      ]),
    ).toEqual([
      [1, HASH],
      [8453, SECOND_HASH],
    ]);
    // The base client reads with its own chain's formatters; the chain ID
    // still comes from the transaction itself.
    mine(
      {
        chain: 10,
        from: OTHER,
        to: second.target,
        data: second.data,
        value: 0n,
      },
      SECOND_HASH,
    );
    await expect(
      verifyRelayrDestination(clientOn(base), {
        entry: second,
        hash: SECOND_HASH,
      }),
    ).rejects.toBeInstanceOf(RelayrProofError);
  });

  it("reads quoted records from Relayr over real HTTP", async () => {
    const request = relayrBundleRequest([
      { chain: 1, target: TARGET, data: "0x01", value: "0" },
      { chain: 10, target: TARGET, data: "0x02", value: "2" },
    ]);
    bundles.set(BUNDLE_UUID, {
      bundle_uuid: BUNDLE_UUID,
      transactions: [
        recordFor(request.transactions[1], OTHER_UUID),
        recordFor(request.transactions[0], BUNDLE_UUID),
      ],
    });
    const relay = (input: string | URL | Request, init?: RequestInit) =>
      fetch(String(input).replace(RELAYR_API, url.split("/rpc-key")[0]), init);
    await expect(
      bindRelayrQuote(
        json({
          bundle_uuid: BUNDLE_UUID,
          payment_info: [],
          tx_uuids: [OTHER_UUID, BUNDLE_UUID],
        }),
        request,
        { fetch: relay },
      ),
    ).resolves.toMatchObject({
      expectedTransactions: [
        { txUuid: BUNDLE_UUID, chain: 1 },
        { txUuid: OTHER_UUID, chain: 10 },
      ],
    });
    bundles.clear();
    await expect(
      bindRelayrQuote(
        json({
          bundle_uuid: BUNDLE_UUID,
          payment_info: [],
          tx_uuids: [OTHER_UUID, BUNDLE_UUID],
        }),
        request,
        { fetch: relay },
      ),
    ).rejects.toThrow(
      "Relayr did not return the quoted transactions. Nothing was paid.",
    );
  });
});
