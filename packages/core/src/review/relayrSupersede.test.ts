import {
  createPublicClient,
  encodeFunctionData,
  http,
  toEventSelector,
  type Address,
  type Hex,
} from "viem";
import { mainnet } from "viem/chains";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  erc2771ForwarderAbi,
  jbContractAddress,
} from "../generated/juicebox.js";
import {
  RELAYR_API,
  RELAYR_NATIVE_TOKEN,
  RELAYR_PAYMENT_ADDRESS,
  RELAYR_PAYMENT_EVENT,
  RELAYR_PAYMENT_SELECTOR,
  relayrBundleRequest,
  relayrSupersede,
  type RelayrEntry,
  type RelayrPayment,
  type RelayrSignedRequest,
  type RelayrSupersedeClient,
  type RelayrTransactionBinding,
} from "./relayr.js";

// Ruling R119's supersede rule: an ordinary action may sign different calls at
// the saved nonces of an earlier session once that session provably can never
// be paid, instead of waiting out its signed requests.

const ALICE = "0x1111111111111111111111111111111111111111" as Address;
const TARGET = "0x3333333333333333333333333333333333333333" as Address;
const FORWARDERS = jbContractAddress["6"].ERC2771Forwarder as Readonly<
  Record<number, Address>
>;
const BUNDLE_UUID = "01234567-89ab-cdef-0123-456789abcdef";
const IDS = [
  "fedcba98-7654-3210-fedc-ba9876543210",
  "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
];
const OTHER_ID = "bbbbbbbb-cccc-dddd-eeee-ffffffffffff";
const BLOCK_HASH = `0x${"45".repeat(32)}` as Hex;
const OTHER_BLOCK_HASH = `0x${"46".repeat(32)}` as Hex;
const FINALIZED = 100_000n;
const LATEST = FINALIZED + 60n;
/** When the requests were signed and the quote received, in seconds. */
const START = 1_900_000_000;
/** The quote's payment deadline. */
const PAY_DEADLINE = START + 585;
/** Requests signed at START run until here: the 2-hour default. */
const REQUEST_DEADLINE = START + 2 * 60 * 60;
/** How far before the saved quote time the payment search starts. */
const CLOCK_SLACK = 10 * 60;

type ChainState = {
  /** The finalized block's number. */
  finalized: bigint;
  /** The finalized block's timestamp. */
  finalizedAt: number;
  /** Seconds between blocks. */
  blockTime: number;
  finalizedNonce: bigint;
  latestNonce: bigint;
  /** The hash of the finalized block when it is read again by number. */
  canonical: Hex;
  /** A block holding a payment for the bundle. */
  paidIn?: bigint;
};

const timestampOf = (state: ChainState, block: bigint) =>
  BigInt(
    Math.floor(
      state.finalizedAt - Number(state.finalized - block) * state.blockTime,
    ),
  );

function chainClient(state: ChainState) {
  return {
    getBlock: vi.fn(
      async (args: {
        blockTag?: "finalized" | "latest";
        blockNumber?: bigint;
      }) => {
        if (args.blockTag === "finalized")
          return {
            number: state.finalized,
            hash: BLOCK_HASH,
            timestamp: timestampOf(state, state.finalized),
          };
        if (args.blockTag === "latest")
          return {
            number: state.finalized + 60n,
            hash: BLOCK_HASH,
            timestamp: timestampOf(state, state.finalized + 60n),
          };
        const block = args.blockNumber!;
        return {
          hash: block === state.finalized ? state.canonical : BLOCK_HASH,
          timestamp: timestampOf(state, block),
        };
      },
    ),
    readContract: vi.fn(async ({ blockNumber }: { blockNumber: bigint }) =>
      blockNumber === state.finalized + 60n
        ? state.latestNonce
        : state.finalizedNonce,
    ),
    getLogs: vi.fn(
      async ({
        fromBlock,
        toBlock,
      }: {
        fromBlock: bigint;
        toBlock: bigint;
      }): Promise<unknown[]> =>
        state.paidIn !== undefined &&
        state.paidIn >= fromBlock &&
        state.paidIn <= toBlock
          ? [{ address: RELAYR_PAYMENT_ADDRESS, blockNumber: state.paidIn }]
          : [],
    ),
  };
}

let chains: Record<number, ChainState>;
let clients: Record<number, ReturnType<typeof chainClient> | undefined>;
const clientFor = (chainId: number) =>
  clients[chainId] as unknown as RelayrSupersedeClient | undefined;

function paymentCalldata(deadline: number): Hex {
  const uuidWord = BUNDLE_UUID.replaceAll("-", "").padEnd(64, "0");
  const deadlineWord = BigInt(deadline).toString(16).padStart(64, "0");
  return `${RELAYR_PAYMENT_SELECTOR}${uuidWord}${deadlineWord}` as Hex;
}

function option(chain: number, deadline = PAY_DEADLINE): RelayrPayment {
  return {
    chain,
    amount: "100",
    calldata: paymentCalldata(deadline),
    target: RELAYR_PAYMENT_ADDRESS,
    token: RELAYR_NATIVE_TOKEN,
    payment_deadline: deadline,
  };
}

/** An `execute` of Alice's request on `chain`'s canonical forwarder. */
function forwarded(chain: number): RelayrEntry {
  return {
    chain,
    target: FORWARDERS[chain],
    data: encodeFunctionData({
      abi: erc2771ForwarderAbi,
      functionName: "execute",
      args: [
        {
          from: ALICE,
          to: TARGET,
          value: 0n,
          gas: 500_000n,
          deadline: REQUEST_DEADLINE,
          data: "0x1234",
          signature: `0x${"11".repeat(65)}`,
        },
      ],
    }),
    value: "0",
  };
}

const bindings: RelayrTransactionBinding[] = relayrBundleRequest([
  forwarded(1),
  forwarded(10),
]).transactions.map((entry, index) => ({
  txUuid: IDS[index],
  chain: entry.chain,
  entry,
}));

const pending = (binding: RelayrTransactionBinding) => ({
  tx_uuid: binding.txUuid,
  request: { ...binding.entry },
  status: { state: "Pending" },
});

function requests(
  nonces: (string | undefined)[] = ["4", "4"],
  chainIds = [1, 10],
): RelayrSignedRequest[] {
  return chainIds.map((chainId, index) => ({
    chainId,
    signer: ALICE,
    deadline: REQUEST_DEADLINE,
    ...(nonces[index] === undefined ? {} : { nonce: nonces[index] }),
  }));
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

/** Relayr's record of the bundle: unpaid, its quote and every call pending. */
const bundle = (overrides: Record<string, unknown> = {}) =>
  json({
    bundle_uuid: BUNDLE_UUID,
    created_at: new Date(START * 1_000).toISOString(),
    expires_at: new Date(PAY_DEADLINE * 1_000).toISOString(),
    payment: [option(1), option(10)],
    payment_received: false,
    transactions: bindings.map(pending),
    ...overrides,
  });

let fetchBundle: ReturnType<typeof vi.fn>;

const settings = (overrides: Record<string, unknown> = {}) => ({
  bundleUuid: BUNDLE_UUID,
  options: [option(1), option(10)],
  expectedTransactions: bindings,
  quotedAt: START,
  destinationChainIds: [1, 10],
  paymentAttempted: false,
  launch: false,
  fetch: fetchBundle as unknown as typeof globalThis.fetch,
  ...overrides,
});

const hold = { kind: "hold", until: REQUEST_DEADLINE };
const supersede = {
  kind: "supersede",
  nonces: [
    { chainId: 1, signer: ALICE, nonce: "4" },
    { chainId: 10, signer: ALICE, nonce: "4" },
  ],
};

beforeEach(() => {
  const state = (blockTime: number): ChainState => ({
    finalized: FINALIZED,
    finalizedAt: PAY_DEADLINE + 900,
    blockTime,
    finalizedNonce: 4n,
    latestNonce: 4n,
    canonical: BLOCK_HASH,
  });
  chains = { 1: state(12), 10: state(2) };
  clients = { 1: chainClient(chains[1]), 10: chainClient(chains[10]) };
  fetchBundle = vi.fn(async () => bundle());
});

/** The last block on `chainId` whose timestamp is at most `seconds`. */
function lastBlockAtOrBefore(chainId: number, seconds: number): bigint {
  let block = FINALIZED;
  while (timestampOf(chains[chainId], block) > BigInt(seconds)) block -= 1n;
  return block;
}

describe("superseding an unpaid Relayr session", () => {
  it("hands back the saved nonces once nothing can pay the session", async () => {
    await expect(
      relayrSupersede(clientFor, requests(), settings()),
    ).resolves.toEqual(supersede);
    expect(fetchBundle).toHaveBeenCalledTimes(1);
    expect(fetchBundle).toHaveBeenCalledWith(
      `${RELAYR_API}/v1/bundle/${BUNDLE_UUID}`,
      { cache: "no-store", signal: expect.any(AbortSignal) },
    );
  });

  it("searches every finalized block from before the quote to its deadline for a payment, 500 at a time", async () => {
    await relayrSupersede(clientFor, requests(), settings());
    for (const chainId of [1, 10]) {
      const calls = clients[chainId]!.getLogs.mock.calls.map(
        ([args]) => args as unknown as Record<string, unknown>,
      );
      const first = lastBlockAtOrBefore(chainId, START - CLOCK_SLACK);
      const last = lastBlockAtOrBefore(chainId, PAY_DEADLINE);
      expect(calls[0].fromBlock).toBe(first);
      expect(calls[calls.length - 1].toBlock).toBe(last);
      calls.forEach((call, index) => {
        expect(call).toMatchObject({
          address: RELAYR_PAYMENT_ADDRESS,
          args: { payment_uuid: `0x${BUNDLE_UUID.replaceAll("-", "")}` },
        });
        expect(
          (call.toBlock as bigint) - (call.fromBlock as bigint),
        ).toBeLessThan(500n);
        if (index)
          expect(call.fromBlock).toBe(
            (calls[index - 1].toBlock as bigint) + 1n,
          );
      });
    }
    expect(clients[10]!.getLogs.mock.calls.length).toBeGreaterThan(1);
  });

  it("searches for the payment contract's Prepayment event", async () => {
    await relayrSupersede(clientFor, requests(), settings());
    const [[{ event }]] = clients[1]!.getLogs.mock.calls as unknown as [
      [{ event: Parameters<typeof toEventSelector>[0] }],
    ];
    expect(toEventSelector(event)).toBe(RELAYR_PAYMENT_EVENT);
  });

  it("holds when the chain shows a payment Relayr has not indexed", async () => {
    chains[10].paidIn = lastBlockAtOrBefore(10, PAY_DEADLINE);
    await expect(
      relayrSupersede(clientFor, requests(), settings()),
    ).resolves.toEqual(hold);
    chains[10].paidIn = lastBlockAtOrBefore(10, START - CLOCK_SLACK);
    await expect(
      relayrSupersede(clientFor, requests(), settings()),
    ).resolves.toEqual(hold);
    expect(fetchBundle).not.toHaveBeenCalled();
  });

  it("waits until a finalized block on every payment chain is past the quote's deadline", async () => {
    chains[1].finalizedAt = PAY_DEADLINE;
    await expect(
      relayrSupersede(clientFor, requests(), settings()),
    ).resolves.toEqual(hold);
    expect(clients[1]!.getLogs).not.toHaveBeenCalled();
    chains[1].finalizedAt = PAY_DEADLINE + 1;
    await expect(
      relayrSupersede(clientFor, requests(), settings()),
    ).resolves.toEqual(supersede);
  });

  it("holds when the search can't be read or the finalized block is no longer canonical", async () => {
    clients[10]!.getLogs.mockRejectedValueOnce(new Error("-32005"));
    await expect(
      relayrSupersede(clientFor, requests(), settings()),
    ).resolves.toEqual(hold);
    clients[10]!.getLogs.mockResolvedValueOnce(null as unknown as unknown[]);
    await expect(
      relayrSupersede(clientFor, requests(), settings()),
    ).resolves.toEqual(hold);
    chains[10].canonical = OTHER_BLOCK_HASH;
    await expect(
      relayrSupersede(clientFor, requests(), settings()),
    ).resolves.toEqual(hold);
    chains[10].canonical = BLOCK_HASH;
    const getBlock = clients[10]!.getBlock.getMockImplementation()!;
    clients[10]!.getBlock.mockImplementation(async (args) =>
      args.blockNumber !== undefined && args.blockNumber < FINALIZED
        ? ({ hash: BLOCK_HASH } as Awaited<ReturnType<typeof getBlock>>)
        : getBlock(args),
    );
    await expect(
      relayrSupersede(clientFor, requests(), settings()),
    ).resolves.toEqual(hold);
    expect(fetchBundle).not.toHaveBeenCalled();
  });

  it("holds rather than search more than 10,000 blocks on a chain", async () => {
    chains[10].blockTime = 0.1;
    await expect(
      relayrSupersede(clientFor, requests(), settings()),
    ).resolves.toEqual(hold);
    expect(clients[10]!.getLogs).not.toHaveBeenCalled();
  });

  it("searches from the first block when the chain is younger than the search window", async () => {
    // Block 0 is 285 seconds after START, after the window opens.
    chains[1].finalized = 100n;
    await expect(
      relayrSupersede(
        clientFor,
        requests(["4"], [1]),
        settings({ options: [option(1)], destinationChainIds: [1] }),
      ),
    ).resolves.toMatchObject({ kind: "hold" });
    const [[first]] = clients[1]!.getLogs.mock.calls;
    expect(first).toMatchObject({ fromBlock: 0n, toBlock: 25n });
  });

  it("keeps several requests of one signer on a chain at their own saved nonces", async () => {
    await expect(
      relayrSupersede(clientFor, requests(["4", "5"], [1, 1]), settings()),
    ).resolves.toEqual({
      kind: "supersede",
      nonces: [
        { chainId: 1, signer: ALICE, nonce: "4" },
        { chainId: 1, signer: ALICE, nonce: "5" },
      ],
    });
  });

  it("is released once every request is dead, without reading Relayr", async () => {
    for (const state of Object.values(chains))
      state.finalizedAt = REQUEST_DEADLINE + 1;
    await expect(
      relayrSupersede(clientFor, requests(), settings({ launch: true })),
    ).resolves.toEqual({ kind: "released" });
    expect(fetchBundle).not.toHaveBeenCalled();
  });

  it.each<[string, Record<string, unknown>]>([
    ["a launch", { launch: true }],
    ["an app that did not say whether it launches", { launch: undefined }],
    ["a session whose payment was attempted", { paymentAttempted: true }],
    [
      "a session that did not say whether it paid",
      { paymentAttempted: undefined },
    ],
    ["a session without a bundle", { bundleUuid: undefined }],
    ["a malformed bundle ID", { bundleUuid: "bundle" }],
    ["a session without a quote", { options: undefined }],
    ["a quote without options", { options: [] }],
    [
      "a quote with an option that can't be authenticated",
      { options: [option(1), { ...option(10), target: ALICE }] },
    ],
    ["a session without its bindings", { expectedTransactions: undefined }],
    ["a session with no bindings", { expectedTransactions: [] }],
    [
      "bindings that share an ID",
      {
        expectedTransactions: [bindings[0], { ...bindings[1], txUuid: IDS[0] }],
      },
    ],
    ["a session without its quote time", { quotedAt: undefined }],
    ["a quote time that is not a time", { quotedAt: Number.NaN }],
  ])("holds %s", async (_name, overrides) => {
    await expect(
      relayrSupersede(clientFor, requests(), settings(overrides)),
    ).resolves.toEqual(hold);
    expect(fetchBundle).not.toHaveBeenCalled();
  });

  it("holds requests saved without their nonces", async () => {
    await expect(
      relayrSupersede(clientFor, requests(["4", undefined]), settings()),
    ).resolves.toEqual(hold);
    await expect(
      relayrSupersede(clientFor, requests(["4", "four"]), settings()),
    ).resolves.toEqual(hold);
  });

  it("holds requests it can't read, with no time to name", async () => {
    for (const signed of [null, undefined, []]) {
      await expect(
        relayrSupersede(clientFor, signed, settings()),
      ).resolves.toEqual({ kind: "hold", until: 0 });
    }
  });

  it("holds when a request may have run", async () => {
    chains[10].finalizedNonce = 5n;
    await expect(
      relayrSupersede(clientFor, requests(), settings()),
    ).resolves.toEqual(hold);
  });

  it("holds when a request expired but another is still live", async () => {
    await expect(
      relayrSupersede(
        clientFor,
        [
          ...requests(["4"], [1]),
          { ...requests(["4"], [10])[0], deadline: START },
        ],
        settings(),
      ),
    ).resolves.toEqual(hold);
  });

  it("holds when the latest nonce moved past the saved one", async () => {
    chains[10].latestNonce = 5n;
    await expect(
      relayrSupersede(clientFor, requests(), settings()),
    ).resolves.toEqual(hold);
    expect(fetchBundle).not.toHaveBeenCalled();
  });

  it("holds when a payment chain or a destination chain can't be read", async () => {
    clients[10] = undefined;
    await expect(
      relayrSupersede(clientFor, requests(["4"], [1]), settings()),
    ).resolves.toEqual(hold);
    clients[10] = chainClient(chains[10]);
    clients[10].getBlock.mockRejectedValue(new Error("down"));
    await expect(
      relayrSupersede(clientFor, requests(["4"], [1]), settings()),
    ).resolves.toEqual(hold);
    clients[10] = chainClient(chains[10]);
    clients[1]!.readContract.mockImplementation(
      async ({ blockNumber }: { blockNumber: bigint }) => {
        if (blockNumber === LATEST) throw new Error("down");
        return 4n;
      },
    );
    await expect(
      relayrSupersede(clientFor, requests(["4"], [1]), settings()),
    ).resolves.toEqual(hold);
    expect(fetchBundle).not.toHaveBeenCalled();
  });

  it("holds when a destination has no forwarder, no client or no latest block", async () => {
    const onlyMainnet = settings({ options: [option(1)] });
    fetchBundle.mockImplementation(async () =>
      bundle({ payment: [option(1)] }),
    );
    await expect(
      relayrSupersede(clientFor, requests(["4", "4"], [1, 5]), onlyMainnet),
    ).resolves.toEqual(hold);
    clients[10] = undefined;
    await expect(
      relayrSupersede(clientFor, requests(), onlyMainnet),
    ).resolves.toEqual(hold);
    clients[10] = chainClient(chains[10]);
    const getBlock = clients[10].getBlock.getMockImplementation()!;
    clients[10].getBlock.mockImplementation(async (args) => {
      if (args.blockTag === "latest") throw new Error("down");
      return getBlock(args);
    });
    await expect(
      relayrSupersede(clientFor, requests(), onlyMainnet),
    ).resolves.toEqual(hold);
    expect(fetchBundle).not.toHaveBeenCalled();
  });

  it("holds when a latest block has no number or the nonce read is malformed", async () => {
    const getBlock = clients[1]!.getBlock.getMockImplementation()!;
    clients[1]!.getBlock.mockImplementation(async (args) =>
      args.blockTag === "latest"
        ? ({
            number: null,
            hash: null,
            timestamp: 0n,
          } as unknown as Awaited<ReturnType<typeof getBlock>>)
        : getBlock(args),
    );
    await expect(
      relayrSupersede(clientFor, requests(), settings()),
    ).resolves.toEqual(hold);
    clients[1] = chainClient(chains[1]);
    clients[1].readContract.mockImplementation(
      async ({ blockNumber }: { blockNumber: bigint }) =>
        (blockNumber === LATEST ? "four" : 4n) as bigint,
    );
    await expect(
      relayrSupersede(clientFor, requests(), settings()),
    ).resolves.toEqual(hold);
    expect(fetchBundle).not.toHaveBeenCalled();
  });

  it.each<[string, Record<string, unknown>]>([
    ["Relayr reports a payment", { payment_received: true }],
    ["Relayr has not said whether it is paid", { payment_received: undefined }],
    [
      "Relayr reports a call running",
      {
        transactions: [
          pending(bindings[0]),
          { ...pending(bindings[1]), status: { state: "Executing" } },
        ],
      },
    ],
    [
      "a call has a destination hash",
      {
        transactions: [
          pending(bindings[0]),
          {
            ...pending(bindings[1]),
            status: { state: "Pending", data: { hash: BLOCK_HASH } },
          },
        ],
      },
    ],
    ["Relayr lists no calls", { transactions: [] }],
    ["Relayr's calls are not a list", { transactions: "calls" }],
    ["a saved call is missing", { transactions: [pending(bindings[0])] }],
    [
      "a saved call is listed twice",
      {
        transactions: [
          pending(bindings[0]),
          pending(bindings[1]),
          pending(bindings[1]),
        ],
      },
    ],
    [
      "Relayr lists a call nobody saved",
      {
        transactions: [
          pending(bindings[0]),
          { ...pending(bindings[1]), tx_uuid: OTHER_ID },
        ],
      },
    ],
    [
      "a saved ID carries another call",
      {
        transactions: [
          pending(bindings[0]),
          { ...pending(bindings[1]), request: { ...bindings[0].entry } },
        ],
      },
    ],
    ["Relayr quotes no options now", { payment: undefined }],
    ["Relayr quotes an option fewer", { payment: [option(1)] }],
    [
      "Relayr quotes an option more",
      { payment: [option(1), option(10), option(8453)] },
    ],
    [
      "Relayr quotes another amount",
      { payment: [option(1), { ...option(10), amount: "101" }] },
    ],
    [
      "Relayr quotes a later deadline",
      { payment: [option(1), option(10, PAY_DEADLINE + 3_600)] },
    ],
    [
      "Relayr's quote predates the search window",
      {
        created_at: new Date((START - CLOCK_SLACK - 1) * 1_000).toISOString(),
      },
    ],
  ])("holds when %s", async (_name, overrides) => {
    fetchBundle.mockImplementation(async () => bundle(overrides));
    await expect(
      relayrSupersede(clientFor, requests(), settings()),
    ).resolves.toEqual(hold);
  });

  it("accepts Relayr's options in any order and case, and a quote time it doesn't give", async () => {
    fetchBundle.mockImplementation(async () =>
      bundle({
        created_at: undefined,
        payment: [
          {
            ...option(10),
            target: RELAYR_PAYMENT_ADDRESS.toUpperCase().replace("0X", "0x"),
            payment_deadline: new Date(PAY_DEADLINE * 1_000).toISOString(),
          },
          option(1),
        ],
        transactions: [...bindings].reverse().map(pending),
      }),
    );
    await expect(
      relayrSupersede(clientFor, requests(), settings()),
    ).resolves.toEqual(supersede);
  });

  it("holds when Relayr's options are malformed", async () => {
    fetchBundle.mockImplementation(async () =>
      bundle({ payment: [null, { chain: "1", amount: "x", calldata: 1 }] }),
    );
    await expect(
      relayrSupersede(clientFor, requests(), settings()),
    ).resolves.toEqual(hold);
  });

  it("searches each payment chain to its latest option deadline", async () => {
    const options = [
      option(1, PAY_DEADLINE - 100),
      option(1),
      option(1, PAY_DEADLINE - 200),
      option(10),
    ];
    fetchBundle.mockImplementation(async () => bundle({ payment: options }));
    await expect(
      relayrSupersede(clientFor, requests(), settings({ options })),
    ).resolves.toEqual(supersede);
    const calls = clients[1]!.getLogs.mock.calls;
    expect(calls[calls.length - 1][0].toBlock).toBe(
      lastBlockAtOrBefore(1, PAY_DEADLINE),
    );
  });

  it("searches the deadline's block when the quote time is after it", async () => {
    fetchBundle.mockImplementation(async () =>
      bundle({ created_at: undefined }),
    );
    await expect(
      relayrSupersede(
        clientFor,
        requests(),
        settings({ quotedAt: PAY_DEADLINE + 700 }),
      ),
    ).resolves.toEqual(supersede);
    const [[call]] = clients[1]!.getLogs.mock.calls;
    expect(call).toMatchObject({
      fromBlock: lastBlockAtOrBefore(1, PAY_DEADLINE),
      toBlock: lastBlockAtOrBefore(1, PAY_DEADLINE),
    });
  });

  it("holds when Relayr can't be read", async () => {
    fetchBundle.mockImplementation(async () => json({ error: "down" }, 503));
    await expect(
      relayrSupersede(clientFor, requests(), settings()),
    ).resolves.toEqual(hold);
  });

  it("reads Relayr with the global fetch by default", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => bundle()),
    );
    try {
      await expect(
        relayrSupersede(clientFor, requests(), settings({ fetch: undefined })),
      ).resolves.toEqual(supersede);
      expect(fetch).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("takes a PublicClient", () => {
    const client: RelayrSupersedeClient = createPublicClient({
      chain: mainnet,
      transport: http("http://127.0.0.1:1"),
    });
    expect(client).toBeTruthy();
  });
});
