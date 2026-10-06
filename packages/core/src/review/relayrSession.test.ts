import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import {
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  createPublicClient,
  custom,
  encodeErrorResult,
  encodeFunctionData,
  getAddress,
  HttpRequestError,
  http,
  InternalRpcError,
  parseAbi,
  RpcRequestError,
  TimeoutError,
  WebSocketRequestError,
  type Address,
  type Hex,
} from "viem";
import { mainnet, optimism } from "viem/chains";
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
import { createJBCenterRpcProvider } from "../jbcenter.js";
import {
  atCanonicalFinalizedBlock,
  isRelayrDiscardReason,
  relayrDeadlinePassed,
  relayrRequestStates,
  relayrRequestsDead,
  relayrRequestsVerdict,
  relayrSessionOutcome,
  relayrSignedRequests,
  type RelayrEntry,
  type RelayrFinalizedClient,
  type RelayrRequestState,
  type RelayrRequestsVerdict,
  type RelayrSessionOutcome,
  type RelayrSignedRequest,
} from "./relayr.js";

// The session rules Juicebox Money built (rulings R104, R114, R117), ported
// with the scenarios of its tests at 02278f0: test/transactions/
// relayr-orchestration.test.ts ("a saved session whose bundle will not run as
// signed", "unpaid Relayr quotes", "once its quote expired"),
// launch-relayr.test.ts and forwarder-authorization.test.ts.

const ALICE = "0x1111111111111111111111111111111111111111" as Address;
const BOB = "0x2222222222222222222222222222222222222222" as Address;
const TARGET = "0x3333333333333333333333333333333333333333" as Address;
/** A signer whose address has letters, so its case can differ. */
const CAROL = "0xabcdef0123456789abcdef0123456789abcdef01" as Address;
const FORWARDERS = jbContractAddress["6"].ERC2771Forwarder as Readonly<
  Record<number, Address>
>;
const BLOCK_HASH = `0x${"45".repeat(32)}` as Hex;
const OTHER_BLOCK_HASH = `0x${"46".repeat(32)}` as Hex;
const FINALIZED = 200n;
/** When the requests were signed, in seconds. */
const START = 1_900_000_000;
/** The quote's payment deadline passed here, long before the requests'. */
const EXPIRED = START + 585;
/** Every request signed at START can run until here: 47 hours later. */
const REQUEST_DEADLINE = START + 47 * 60 * 60;
/** A minute after every request's deadline. */
const REQUESTS_EXPIRED = REQUEST_DEADLINE + 60;

type ChainState = {
  /** The finalized block's timestamp in seconds, or null while the node has none. */
  timestamp: number | null;
  /** The forwarder's nonce for each signer, by lower-case address, at the finalized block. */
  nonces: Record<string, bigint>;
  /** The hash of the block at the finalized number when it is read again. */
  canonical: Hex | null;
};

/** A client answering from `state`, read as PublicClient's getBlock and readContract are. */
function chainClient(state: ChainState) {
  return {
    getBlock: vi.fn(
      async (args: { blockTag?: "finalized"; blockNumber?: bigint }) => {
        if (args.blockTag !== "finalized") return { hash: state.canonical };
        if (state.timestamp === null) throw new Error("No finalized block");
        return {
          number: FINALIZED,
          hash: BLOCK_HASH,
          timestamp: BigInt(state.timestamp),
        };
      },
    ),
    readContract: vi.fn(
      async ({ args: [signer] }: { args: readonly [Address] }) => {
        const nonce = state.nonces[signer.toLowerCase()];
        if (nonce === undefined) throw new Error("execution reverted");
        return nonce;
      },
    ),
  };
}

type ChainClient = ReturnType<typeof chainClient>;

let chains: Record<number, ChainState>;
let clients: Record<number, ChainClient>;
const clientFor = (chainId: number) =>
  clients[chainId] as unknown as RelayrFinalizedClient | undefined;

beforeEach(() => {
  chains = {
    1: { timestamp: START, nonces: { [ALICE]: 4n }, canonical: BLOCK_HASH },
    10: { timestamp: START, nonces: { [ALICE]: 4n }, canonical: BLOCK_HASH },
  };
  clients = { 1: chainClient(chains[1]), 10: chainClient(chains[10]) };
});

/** Every chain's finalized block, still canonical, is at `seconds`. */
function finalizedAt(seconds: number | null) {
  for (const state of Object.values(chains)) state.timestamp = seconds;
}

/** The forwarder's nonce for Alice on each chain. */
function noncesOf(nonces: Record<number, bigint>) {
  for (const [chainId, nonce] of Object.entries(nonces)) {
    chains[Number(chainId)].nonces = { [ALICE]: nonce };
  }
}

/** Alice's requests on Ethereum and Optimism, signed at START with `nonces`. */
function requests(
  nonces: (string | undefined)[] = ["4", "4"],
): RelayrSignedRequest[] {
  return [1, 10].map((chainId, index) => ({
    chainId,
    signer: ALICE,
    deadline: REQUEST_DEADLINE,
    ...(nonces[index] === undefined ? {} : { nonce: nonces[index] }),
  }));
}

const classify = async (signed: readonly RelayrSignedRequest[]) =>
  relayrRequestsVerdict(await relayrRequestStates(clientFor, signed));

/** An `execute` of Alice's request on `chain`'s canonical forwarder. */
function forwarded(
  chain: number,
  {
    from = ALICE,
    deadline = REQUEST_DEADLINE,
  }: { from?: Address; deadline?: number } = {},
): RelayrEntry {
  return {
    chain,
    target: FORWARDERS[chain],
    data: encodeFunctionData({
      abi: erc2771ForwarderAbi,
      functionName: "execute",
      args: [
        {
          from,
          to: TARGET,
          value: 5n,
          gas: 500_000n,
          deadline,
          data: "0x1234",
          signature: `0x${"11".repeat(65)}`,
        },
      ],
    }),
    value: "5",
  };
}

/** An outcome as plain data, with its `error`, which is never enumerable, read out. */
const asData = (outcome: RelayrSessionOutcome) => ({
  ...outcome,
  error: (outcome as { error?: unknown }).error,
});

/** `cause` wrapped in an error, as a native error cause, which ES2021's types lack. */
const wrapped = (message: string, cause: unknown): Error =>
  Object.assign(new Error(message), { cause });

/** The JSON-RPC error a node answered with, as viem's HTTP transport reports it. */
const nodeError = (code: number, message: string, data?: unknown) =>
  new RpcRequestError({
    body: {},
    error: { code, message, ...(data === undefined ? {} : { data }) },
    url: "https://rpc.example",
  });

/** Revert data: `Error("Payouts were sent")`, as a contract reverts with it. */
const REVERT = encodeErrorResult({
  abi: parseAbi(["error Error(string message)"]),
  errorName: "Error",
  args: ["Payouts were sent"],
});

/** An HTTP failure under a contract read, as viem reports an unreachable RPC. */
function unreachableRead(): Error {
  return new ContractFunctionExecutionError(
    new HttpRequestError({
      url: "https://rpc.example",
      status: 503,
      details: "Service Unavailable",
    }),
    { abi: [], functionName: "splitsOf" },
  );
}

describe("reading at a canonical finalized block", () => {
  it("reads at the finalized block's number and answers once that block is still canonical", async () => {
    const client = clients[1];
    const read = vi.fn(async (blockNumber: bigint) => `read at ${blockNumber}`);
    await expect(
      atCanonicalFinalizedBlock(
        client as unknown as RelayrFinalizedClient,
        read,
      ),
    ).resolves.toEqual({ value: "read at 200", timestamp: BigInt(START) });
    expect(client.getBlock.mock.calls).toEqual([
      [{ blockTag: "finalized" }],
      [{ blockNumber: FINALIZED }],
    ]);
    // The block is read again after the read, not before it.
    expect(read.mock.invocationCallOrder[0]).toBeGreaterThan(
      client.getBlock.mock.invocationCallOrder[0],
    );
    expect(read.mock.invocationCallOrder[0]).toBeLessThan(
      client.getBlock.mock.invocationCallOrder[1],
    );
  });

  it.each<[string, () => void, (blockNumber: bigint) => Promise<unknown>]>([
    [
      "the node has no finalized block",
      () => (chains[1].timestamp = null),
      async () => 1,
    ],
    [
      "the block at its number has another hash",
      () => (chains[1].canonical = OTHER_BLOCK_HASH),
      async () => 1,
    ],
    [
      "the block at its number has no hash",
      () => (chains[1].canonical = null),
      async () => 1,
    ],
    [
      "the block cannot be read again",
      () =>
        clients[1].getBlock.mockImplementation(async (args) => {
          if (args.blockTag) {
            return { number: FINALIZED, hash: BLOCK_HASH, timestamp: 1n };
          }
          throw new Error("header not found");
        }),
      async () => 1,
    ],
    [
      "the read fails",
      () => {},
      async () => {
        throw new Error("execution reverted");
      },
    ],
  ])("is unknown when %s", async (_, arrange, read) => {
    arrange();
    await expect(
      atCanonicalFinalizedBlock(
        clients[1] as unknown as RelayrFinalizedClient,
        read,
      ),
    ).resolves.toBeNull();
  });

  it.each<[string, Record<string, unknown> | null]>([
    ["no block", null],
    ["no number", { hash: BLOCK_HASH, timestamp: 1n }],
    [
      "a number that is not a bigint",
      { number: 200, hash: BLOCK_HASH, timestamp: 1n },
    ],
    ["no hash", { number: FINALIZED, hash: null, timestamp: 1n }],
    [
      "a hash that is not 32 bytes",
      { number: FINALIZED, hash: "0x45", timestamp: 1n },
    ],
    ["no timestamp", { number: FINALIZED, hash: BLOCK_HASH }],
    [
      "a timestamp that is not a bigint",
      { number: FINALIZED, hash: BLOCK_HASH, timestamp: 1 },
    ],
  ])(
    "is unknown when the finalized block has %s, and reads nothing at it",
    async (_, block) => {
      const getBlock = vi.fn(async (args: { blockTag?: string }) =>
        args.blockTag ? block : { hash: null },
      );
      const read = vi.fn(async () => 1);
      await expect(
        atCanonicalFinalizedBlock(
          { getBlock } as unknown as RelayrFinalizedClient,
          read,
        ),
      ).resolves.toBeNull();
      expect(read).not.toHaveBeenCalled();
      expect(getBlock).toHaveBeenCalledTimes(1);
    },
  );
});

describe("a session's signed requests", () => {
  it("reads each entry's chain, signer and deadline, with the nonce it was signed with", () => {
    expect(
      relayrSignedRequests(
        [forwarded(1), forwarded(10, { from: BOB, deadline: 7 })],
        ["4", 7n],
      ),
    ).toEqual([
      { chainId: 1, signer: ALICE, deadline: REQUEST_DEADLINE, nonce: "4" },
      { chainId: 10, signer: BOB, deadline: 7, nonce: 7n },
    ]);
  });

  it("keeps the nonces only when there is one for every entry", () => {
    const expected = [
      { chainId: 1, signer: ALICE, deadline: REQUEST_DEADLINE },
      { chainId: 10, signer: ALICE, deadline: REQUEST_DEADLINE },
    ];
    for (const nonces of [undefined, ["4"], ["4", "4", "4"]]) {
      const read = relayrSignedRequests([forwarded(1), forwarded(10)], nonces);
      expect(read).toEqual(expected);
      expect(read?.every((request) => !("nonce" in request))).toBe(true);
    }
  });

  it.each<[string, RelayrEntry[] | undefined]>([
    ["none", []],
    ["no entries at all", undefined],
    [
      "a raw call",
      [forwarded(1), { chain: 10, target: TARGET, data: "0x1234", value: "0" }],
    ],
    ["an execute on another forwarder", [{ ...forwarded(1), target: TARGET }]],
    [
      "an execute on a chain without a forwarder",
      [{ ...forwarded(1), chain: 5 }],
    ],
    [
      "another forwarder function",
      [
        {
          ...forwarded(1),
          data: encodeFunctionData({
            abi: erc2771ForwarderAbi,
            functionName: "nonces",
            args: [ALICE],
          }),
        },
      ],
    ],
    ["calldata that does not decode", [{ ...forwarded(1), data: "0x12" }]],
  ])("is null when a session published %s", (_, entries) => {
    expect(relayrSignedRequests(entries, ["4"])).toBeNull();
  });

  it("is null for entries or nonces that are not lists", () => {
    expect(
      relayrSignedRequests("entries" as unknown as RelayrEntry[]),
    ).toBeNull();
    expect(
      relayrSignedRequests([forwarded(1)], "4" as unknown as string[]),
    ).toEqual([{ chainId: 1, signer: ALICE, deadline: REQUEST_DEADLINE }]);
  });
});

describe("classifying signed requests at a canonical finalized block (ruling R114)", () => {
  it("reads each chain's forwarder once, at its finalized block, for the request's signer", async () => {
    const both = [...requests(), { ...requests()[0], deadline: START }];
    await relayrRequestStates(clientFor, both);
    for (const chainId of [1, 10]) {
      expect(clients[chainId].getBlock).toHaveBeenCalledTimes(2);
      expect(clients[chainId].readContract).toHaveBeenCalledTimes(1);
      expect(clients[chainId].readContract).toHaveBeenCalledWith({
        address: FORWARDERS[chainId],
        abi: erc2771ForwarderAbi,
        functionName: "nonces",
        args: [ALICE],
        blockNumber: FINALIZED,
      });
    }
  });

  it("reads each signer's own nonce, once for a signer in any case", async () => {
    chains[1].nonces = { [CAROL]: 4n, [BOB]: 9n };
    finalizedAt(REQUESTS_EXPIRED);
    const states = await relayrRequestStates(clientFor, [
      { chainId: 1, signer: CAROL, deadline: REQUEST_DEADLINE, nonce: "4" },
      { chainId: 1, signer: BOB, deadline: REQUEST_DEADLINE, nonce: "8" },
      {
        chainId: 1,
        signer: getAddress(CAROL),
        deadline: REQUEST_DEADLINE,
        nonce: "4",
      },
    ]);
    expect(states).toEqual([
      { live: false, mayHaveRun: false, unused: true },
      { live: false, mayHaveRun: true, unused: false },
      { live: false, mayHaveRun: false, unused: true },
    ]);
    expect(clients[1].readContract).toHaveBeenCalledTimes(2);
  });

  it("is live while the finalized block is at its deadline: the forwarder runs a request while its deadline is at least the block's timestamp", async () => {
    finalizedAt(REQUEST_DEADLINE);
    await expect(relayrRequestStates(clientFor, requests())).resolves.toEqual([
      { live: true, deadline: REQUEST_DEADLINE },
      { live: true, deadline: REQUEST_DEADLINE },
    ]);
  });

  it("is live past its deadline by the clock until the finalized block is", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(REQUESTS_EXPIRED * 1_000);
    finalizedAt(EXPIRED);
    const states = await relayrRequestStates(clientFor, requests());
    now.mockRestore();
    expect(states.every((state) => state.live)).toBe(true);
  });

  it("is dead and unused once its deadline is earlier than the finalized block's timestamp and the nonce is still the saved one", async () => {
    finalizedAt(REQUEST_DEADLINE + 1);
    await expect(relayrRequestStates(clientFor, requests())).resolves.toEqual([
      { live: false, mayHaveRun: false, unused: true },
      { live: false, mayHaveRun: false, unused: true },
    ]);
  });

  it("is dead and may have run once the forwarder's nonce moved past the saved one, before its deadline too", async () => {
    finalizedAt(EXPIRED);
    noncesOf({ 1: 5n, 10: 4n });
    await expect(relayrRequestStates(clientFor, requests())).resolves.toEqual([
      { live: false, mayHaveRun: true, unused: false },
      { live: true, deadline: REQUEST_DEADLINE },
    ]);
  });

  it("reads a request saved without its nonce as live until its deadline passes, then as possibly run", async () => {
    finalizedAt(EXPIRED);
    noncesOf({ 1: 9n, 10: 9n });
    await expect(
      relayrRequestStates(clientFor, requests([undefined, undefined])),
    ).resolves.toEqual([
      { live: true, deadline: REQUEST_DEADLINE },
      { live: true, deadline: REQUEST_DEADLINE },
    ]);
    finalizedAt(REQUESTS_EXPIRED);
    await expect(
      relayrRequestStates(clientFor, requests([undefined, undefined])),
    ).resolves.toEqual([
      { live: false, mayHaveRun: true, unused: false },
      { live: false, mayHaveRun: true, unused: false },
    ]);
  });

  it("reads a finalized nonce below the saved one as neither moved nor unused once the deadline passed (a reorg dropped an earlier forwarded transaction)", async () => {
    noncesOf({ 1: 3n, 10: 3n });
    await expect(relayrRequestStates(clientFor, requests())).resolves.toEqual([
      { live: true, deadline: REQUEST_DEADLINE },
      { live: true, deadline: REQUEST_DEADLINE },
    ]);
    finalizedAt(REQUESTS_EXPIRED);
    await expect(relayrRequestStates(clientFor, requests())).resolves.toEqual([
      { live: false, mayHaveRun: false, unused: false },
      { live: false, mayHaveRun: false, unused: false },
    ]);
  });

  it.each<[string, () => void]>([
    ["the node has no finalized block", () => (chains[1].timestamp = null)],
    [
      "the finalized block is no longer canonical",
      () => (chains[1].canonical = OTHER_BLOCK_HASH),
    ],
    ["the nonce read fails", () => (chains[1].nonces = {})],
    [
      "the nonce read answers something other than a nonce",
      () =>
        clients[1].readContract.mockResolvedValue("lots" as unknown as bigint),
    ],
    ["there is no client for its chain", () => delete clients[1]],
  ])("counts a request as live while %s", async (_, arrange) => {
    finalizedAt(REQUESTS_EXPIRED);
    noncesOf({ 1: 5n, 10: 5n });
    arrange();
    await expect(relayrRequestStates(clientFor, requests())).resolves.toEqual([
      { live: true, deadline: REQUEST_DEADLINE },
      { live: false, mayHaveRun: true, unused: false },
    ]);
  });

  it("counts a request as live when its chain's client cannot be had, has no forwarder, or the signer is not an address", async () => {
    finalizedAt(REQUESTS_EXPIRED);
    const throwing = (chainId: number) => {
      if (chainId === 1) throw new Error("No RPC for chain 1");
      return clientFor(chainId);
    };
    const signed: RelayrSignedRequest[] = [
      { chainId: 1, signer: ALICE, deadline: REQUEST_DEADLINE, nonce: "4" },
      { chainId: 5, signer: ALICE, deadline: REQUEST_DEADLINE, nonce: "4" },
      {
        chainId: 10,
        signer: "0x1234" as Address,
        deadline: REQUEST_DEADLINE,
        nonce: "4",
      },
    ];
    await expect(relayrRequestStates(throwing, signed)).resolves.toEqual([
      { live: true, deadline: REQUEST_DEADLINE },
      { live: true, deadline: REQUEST_DEADLINE },
      { live: true, deadline: REQUEST_DEADLINE },
    ]);
    expect(clients[10].getBlock).not.toHaveBeenCalled();
  });

  it("counts a request as live when its saved nonce or its deadline cannot be read", async () => {
    finalizedAt(REQUESTS_EXPIRED);
    noncesOf({ 1: 5n, 10: 5n });
    await expect(
      relayrRequestStates(clientFor, [
        {
          chainId: 1,
          signer: ALICE,
          deadline: REQUEST_DEADLINE,
          nonce: "four",
        },
        { chainId: 10, signer: ALICE, deadline: 1.5, nonce: "4" },
      ]),
    ).resolves.toEqual([
      { live: true, deadline: REQUEST_DEADLINE },
      { live: false, mayHaveRun: true, unused: false },
    ]);
    noncesOf({ 1: 4n, 10: 4n });
    const [state] = await relayrRequestStates(clientFor, [
      {
        chainId: 10,
        signer: ALICE,
        deadline: "soon" as unknown as number,
        nonce: "4",
      },
    ]);
    expect(state.live).toBe(true);
    expect(
      (state as Extract<RelayrRequestState, { live: true }>).deadline,
    ).toBeNaN();
  });

  it.each<[string, Partial<RelayrSignedRequest>]>([
    ["an empty nonce", { nonce: "" }],
    ["a blank nonce", { nonce: " " }],
    ["a negative nonce", { nonce: "-1" }],
    ["a padded nonce", { nonce: " 4" }],
    ["a null nonce", { nonce: null as unknown as string }],
    ["an empty deadline", { deadline: "" as unknown as number }],
    ["a blank deadline", { deadline: " " as unknown as number }],
    ["a negative deadline", { deadline: "-1" as unknown as number }],
    ["a negative number deadline", { deadline: -1 }],
  ])(
    "cannot classify a request with %s, so it stays live",
    async (_, malformed) => {
      finalizedAt(REQUESTS_EXPIRED);
      const [state] = await relayrRequestStates(clientFor, [
        { ...requests()[0], ...malformed },
      ]);
      expect(state.live).toBe(true);
    },
  );

  it("takes deadlines and nonces as numbers, decimal strings or bigints", async () => {
    finalizedAt(REQUESTS_EXPIRED);
    await expect(
      relayrRequestStates(clientFor, [
        {
          chainId: 1,
          signer: ALICE,
          deadline: BigInt(REQUEST_DEADLINE),
          nonce: 4n,
        },
        { chainId: 10, signer: ALICE, deadline: REQUEST_DEADLINE, nonce: "4" },
      ]),
    ).resolves.toEqual([
      { live: false, mayHaveRun: false, unused: true },
      { live: false, mayHaveRun: false, unused: true },
    ]);
  });

  it("classifies nothing when there are no requests", async () => {
    await expect(relayrRequestStates(clientFor, [])).resolves.toEqual([]);
    expect(clients[1].getBlock).not.toHaveBeenCalled();
  });
});

describe("what a set of requests allows together (ruling R114)", () => {
  const live = (deadline: number): RelayrRequestState => ({
    live: true,
    deadline,
  });
  const dead = (mayHaveRun: boolean, unused: boolean): RelayrRequestState => ({
    live: false,
    mayHaveRun,
    unused,
  });

  it("holds while any request is live, until the last live deadline, saying whether a dead one may have run", () => {
    expect(
      relayrRequestsVerdict([live(5), live(9), dead(false, true)]),
    ).toEqual({
      live: true,
      until: 9,
      mayHaveRun: false,
    });
    expect(relayrRequestsVerdict([dead(true, false), live(5)])).toEqual({
      live: true,
      until: 5,
      mayHaveRun: true,
    });
  });

  it("says, once every request is dead, whether one may have run and whether every nonce is unused", () => {
    expect(
      relayrRequestsVerdict([dead(false, true), dead(false, true)]),
    ).toEqual({
      live: false,
      mayHaveRun: false,
      unused: true,
    });
    expect(
      relayrRequestsVerdict([dead(false, true), dead(true, false)]),
    ).toEqual({
      live: false,
      mayHaveRun: true,
      unused: false,
    });
    expect(
      relayrRequestsVerdict([dead(false, true), dead(false, false)]),
    ).toEqual({
      live: false,
      mayHaveRun: false,
      unused: false,
    });
  });

  it("reads no requests as neither run nor unused, so a session with none holds", async () => {
    const none = relayrRequestsVerdict([]);
    expect(none).toEqual({ live: false, mayHaveRun: false, unused: false });
    const recheck = vi.fn(async () => {});
    for (const options of [{ nonces: ["4"], recheck }, { nonces: ["4"] }]) {
      await expect(relayrSessionOutcome(none, options)).resolves.toEqual({
        kind: "reorg-hold",
      });
    }
    expect(recheck).not.toHaveBeenCalled();
  });
});

describe("reserving the signer's forwarder nonces (ruling R117)", () => {
  it("reserves while a request is live, past the quote's payment deadline and the device clock, and stops once every one is dead", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(REQUESTS_EXPIRED * 1_000);
    await expect(relayrRequestsDead(clientFor, requests())).resolves.toBe(
      false,
    );
    finalizedAt(EXPIRED);
    await expect(relayrRequestsDead(clientFor, requests())).resolves.toBe(
      false,
    );
    // Optimism's request is unused and can still run, while Ethereum's nonce moved.
    noncesOf({ 1: 5n, 10: 4n });
    await expect(relayrRequestsDead(clientFor, requests())).resolves.toBe(
      false,
    );
    finalizedAt(REQUESTS_EXPIRED);
    await expect(relayrRequestsDead(clientFor, requests())).resolves.toBe(true);
    now.mockRestore();
  });

  it("stops reserving once every request's nonce moved, whatever their deadlines", async () => {
    noncesOf({ 1: 5n, 10: 5n });
    await expect(relayrRequestsDead(clientFor, requests())).resolves.toBe(true);
  });

  it("keeps reserving while one chain cannot be read", async () => {
    finalizedAt(REQUESTS_EXPIRED);
    chains[10].timestamp = null;
    await expect(relayrRequestsDead(clientFor, requests())).resolves.toBe(
      false,
    );
  });

  it("keeps reserving for requests it cannot classify, or none", async () => {
    finalizedAt(REQUESTS_EXPIRED);
    // A legacy session that saved no exact entries.
    await expect(
      relayrRequestsDead(clientFor, relayrSignedRequests(undefined)),
    ).resolves.toBe(false);
    await expect(relayrRequestsDead(clientFor, null)).resolves.toBe(false);
    await expect(relayrRequestsDead(clientFor, [])).resolves.toBe(false);
    expect(clients[1].getBlock).not.toHaveBeenCalled();
  });

  it("classifies a session from the entries and nonces it saved", async () => {
    finalizedAt(REQUESTS_EXPIRED);
    const saved = relayrSignedRequests(
      [forwarded(1), forwarded(10)],
      ["4", "4"],
    );
    await expect(relayrRequestsDead(clientFor, saved)).resolves.toBe(true);
    expect(clients[10].readContract).toHaveBeenCalledWith(
      expect.objectContaining({ args: [ALICE], blockNumber: FINALIZED }),
    );
  });
});

describe("whether a deadline passed at a canonical finalized block", () => {
  it("passes once the finalized block's timestamp is later than the deadline", async () => {
    const client = clients[1] as unknown as RelayrFinalizedClient;
    finalizedAt(REQUEST_DEADLINE + 1);
    await expect(
      relayrDeadlinePassed(client, String(REQUEST_DEADLINE)),
    ).resolves.toBe(true);
    await expect(
      relayrDeadlinePassed(client, BigInt(REQUEST_DEADLINE)),
    ).resolves.toBe(true);
    await expect(relayrDeadlinePassed(client, REQUEST_DEADLINE)).resolves.toBe(
      true,
    );
    finalizedAt(REQUEST_DEADLINE);
    await expect(
      relayrDeadlinePassed(client, String(REQUEST_DEADLINE)),
    ).resolves.toBe(false);
  });

  it.each<[string, () => void, string]>([
    ["the node has no finalized block", () => finalizedAt(null), String(START)],
    [
      "the finalized block is no longer canonical",
      () => (chains[1].canonical = OTHER_BLOCK_HASH),
      String(START),
    ],
    ["the deadline cannot be read", () => {}, "soon"],
    ["the deadline is empty", () => {}, ""],
    ["the deadline is blank", () => {}, " "],
    ["the deadline is negative", () => {}, "-1"],
  ])("does not pass while %s", async (_, arrange, deadline) => {
    finalizedAt(REQUESTS_EXPIRED);
    arrange();
    await expect(
      relayrDeadlinePassed(
        clients[1] as unknown as RelayrFinalizedClient,
        deadline,
      ),
    ).resolves.toBe(false);
  });
});

describe("what a session whose bundle won't run as signed does next (rulings R104, R114)", () => {
  const recheck = vi.fn(async () => {});
  beforeEach(() => {
    recheck.mockReset();
    recheck.mockResolvedValue(undefined);
  });

  /**
   * Classify Alice's two requests, saved at `nonces`, and decide, with the
   * action's recheck unless `run` is null.
   */
  async function decide(
    nonces: (string | undefined)[] = ["4", "4"],
    run: typeof recheck | null = recheck,
  ): Promise<RelayrSessionOutcome> {
    const saved = nonces.every((nonce) => nonce !== undefined)
      ? (nonces as string[])
      : undefined;
    return relayrSessionOutcome(await classify(requests(nonces)), {
      nonces: saved,
      recheck: run ?? undefined,
    });
  }

  it("ends with Discard once its old requests ran outside Relayr, before the action's recheck runs", async () => {
    finalizedAt(EXPIRED);
    noncesOf({ 1: 5n, 10: 5n });
    recheck.mockRejectedValue(
      new Error("The split recipients changed on Ethereum."),
    );
    await expect(decide()).resolves.toEqual({ kind: "discard", reason: "ran" });
    expect(recheck).not.toHaveBeenCalled();
  });

  it("holds while another chain's old request can still run: the time it expires, no Discard and no new signature", async () => {
    finalizedAt(EXPIRED);
    noncesOf({ 1: 5n, 10: 4n });
    await expect(decide()).resolves.toEqual({
      kind: "hold",
      until: REQUEST_DEADLINE,
    });
    expect(recheck).not.toHaveBeenCalled();
  });

  it("offers Discard once every request is dead and one moved", async () => {
    finalizedAt(REQUESTS_EXPIRED);
    noncesOf({ 1: 5n, 10: 4n });
    await expect(decide()).resolves.toEqual({ kind: "discard", reason: "ran" });
    expect(recheck).not.toHaveBeenCalled();
  });

  it("signs again at the saved nonces once every request expired unused and the recheck passes (ruling R104)", async () => {
    finalizedAt(REQUESTS_EXPIRED);
    const nonces = ["4", "4"];
    const outcome = await decide(nonces);
    expect(outcome).toEqual({ kind: "re-sign", nonces: ["4", "4"] });
    expect(recheck).toHaveBeenCalledTimes(1);
    // A copy: the session's record is not handed out to be changed.
    expect((outcome as { nonces: string[] }).nonces).not.toBe(nonces);
  });

  it("offers Discard with the changed reason once every request expired unused and the recheck fails", async () => {
    finalizedAt(REQUESTS_EXPIRED);
    const refusal = new Error(
      "The authority, queue, or rules changed on Ethereum.",
    );
    recheck.mockRejectedValue(refusal);
    expect(asData(await decide())).toEqual({
      kind: "discard",
      reason: "changed",
      error: refusal,
    });
    expect(recheck).toHaveBeenCalledTimes(1);
  });

  it("classifies again on every run, so a session marked for Discard signs again once its recheck passes", async () => {
    finalizedAt(REQUESTS_EXPIRED);
    recheck.mockRejectedValueOnce(new Error("The queue changed"));
    await expect(decide()).resolves.toMatchObject({
      kind: "discard",
      reason: "changed",
    });
    await expect(decide()).resolves.toEqual({
      kind: "re-sign",
      nonces: ["4", "4"],
    });
  });

  it("reads a session saved without nonces as possibly run once its requests expired; before, it may only send them again as signed", async () => {
    finalizedAt(EXPIRED);
    // While its requests can still run it may only send them again as signed.
    await expect(decide([undefined, undefined])).resolves.toEqual({
      kind: "refresh",
      until: REQUEST_DEADLINE,
      nonces: null,
    });
    finalizedAt(REQUESTS_EXPIRED);
    await expect(decide([undefined, undefined])).resolves.toEqual({
      kind: "discard",
      reason: "ran",
    });
    expect(recheck).not.toHaveBeenCalled();
  });

  it("holds while a request past its deadline by the clock is not dead at a finalized block", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(REQUESTS_EXPIRED * 1_000);
    finalizedAt(REQUEST_DEADLINE);
    await expect(decide()).resolves.toMatchObject({
      kind: "refresh",
      until: REQUEST_DEADLINE,
    });
    chains[1].timestamp = null;
    chains[10].timestamp = REQUESTS_EXPIRED;
    await expect(decide()).resolves.toMatchObject({
      kind: "refresh",
      until: REQUEST_DEADLINE,
    });
    finalizedAt(REQUEST_DEADLINE + 1);
    await expect(decide()).resolves.toEqual({
      kind: "re-sign",
      nonces: ["4", "4"],
    });
    now.mockRestore();
  });

  it("says the recheck could not check the project, and decides nothing, when it cannot reach the chain", async () => {
    finalizedAt(REQUESTS_EXPIRED);
    const failure = unreachableRead();
    recheck.mockRejectedValueOnce(failure);
    expect(asData(await decide())).toEqual({
      kind: "unchecked",
      error: failure,
    });
    // Once the chain answers, the recheck passes and the calls are signed again.
    await expect(decide()).resolves.toEqual({
      kind: "re-sign",
      nonces: ["4", "4"],
    });
  });

  it.each<[string, () => unknown]>([
    [
      "an HTTP failure",
      () => new HttpRequestError({ url: "https://rpc.example", status: 429 }),
    ],
    [
      "a timeout",
      () => new TimeoutError({ body: {}, url: "https://rpc.example" }),
    ],
    [
      "a WebSocket failure",
      () => new WebSocketRequestError({ body: {}, url: "wss://rpc.example" }),
    ],
    [
      "a failure eight errors deep",
      () => {
        let error: Error = new HttpRequestError({ url: "https://rpc.example" });
        for (let depth = 1; depth < 8; depth += 1) {
          error = wrapped(`wrapper ${depth}`, error);
        }
        return error;
      },
    ],
  ])(
    "reads %s as a recheck that could not reach the chain",
    async (_, failure) => {
      finalizedAt(REQUESTS_EXPIRED);
      const error = failure();
      recheck.mockRejectedValueOnce(error);
      expect(asData(await decide())).toEqual({ kind: "unchecked", error });
    },
  );

  it.each<[string, () => unknown]>([
    [
      "a JSON-RPC error the node sent",
      () =>
        new RpcRequestError({
          body: {},
          error: { code: -32002, message: "resource unavailable" },
          url: "https://rpc.example",
        }),
    ],
    [
      "viem's error for one",
      () => new InternalRpcError(new Error("internal error")),
    ],
    [
      "a revert with no revert data, as viem reads a transient -32603",
      () =>
        new ContractFunctionRevertedError({
          abi: [],
          functionName: "splitsOf",
          message: "internal error",
        }),
    ],
    [
      "a revert whose data is empty",
      () =>
        new ContractFunctionRevertedError({
          abi: [],
          data: "0x",
          functionName: "splitsOf",
        }),
    ],
    [
      "an execution revert without data",
      () =>
        new RpcRequestError({
          body: {},
          error: { code: 3, message: "execution reverted", data: "0x" },
          url: "https://rpc.example",
        }),
    ],
    [
      "an execution revert whose data is null",
      () => nodeError(3, "execution reverted", null),
    ],
    [
      "an execution revert whose data is odd hex",
      () => nodeError(3, "execution reverted", "0xabc"),
    ],
    [
      "an execution revert whose data is shorter than a selector",
      () => nodeError(3, "execution reverted", "0x123456"),
    ],
    [
      "an execution revert whose data is not hex",
      () => nodeError(3, "execution reverted", "execution reverted"),
    ],
    [
      "a nested revert data field that is not hex",
      () => nodeError(-32603, "execution reverted", { data: "0xzz" }),
    ],
    [
      "Nethermind's revert form without hex",
      () => nodeError(-32015, "VM execution error.", "Reverted 0xzz"),
    ],
    [
      "Nethermind's revert form shorter than a selector",
      () => nodeError(-32015, "VM execution error.", "Reverted 0x1234"),
    ],
    [
      "a revert whose raw data is shorter than a selector",
      () =>
        new ContractFunctionRevertedError({
          abi: [],
          data: "0x1234",
          functionName: "splitsOf",
        }),
    ],
    [
      "an app error that wraps a JSON-RPC failure as its cause",
      () =>
        wrapped(
          "The queue changed",
          new InternalRpcError(new Error("internal error")),
        ),
    ],
  ])(
    "reads %s as a recheck the node could not answer (ruling R118)",
    async (_, failure) => {
      finalizedAt(REQUESTS_EXPIRED);
      const error = failure();
      recheck.mockRejectedValueOnce(error);
      expect(asData(await decide())).toEqual({ kind: "unchecked", error });
    },
  );

  it.each<[string, () => unknown]>([
    [
      "a revert carrying its data",
      () =>
        new ContractFunctionRevertedError({
          abi: [],
          data: "0xdeadbeef",
          functionName: "splitsOf",
        }),
    ],
    [
      "an execution revert whose data a node nests",
      () =>
        wrapped(
          "wrapper",
          new RpcRequestError({
            body: {},
            error: {
              code: 3,
              message: "execution reverted",
              data: { data: "0xdeadbeef" },
            },
            url: "https://rpc.example",
          }),
        ),
    ],
    [
      "an execution revert with data under a transport error",
      () =>
        wrapped(
          "wrapper",
          Object.assign(new HttpRequestError({ url: "https://rpc.example" }), {
            cause: new RpcRequestError({
              body: {},
              error: {
                code: 3,
                message: "execution reverted",
                data: "0x08c379a0",
              },
              url: "https://rpc.example",
            }),
          }),
        ),
    ],
    [
      "revert data on a -32000 answer",
      () => nodeError(-32000, "Execution reverted", REVERT),
    ],
    [
      "revert data on a -32603 answer, nested beside a message",
      () =>
        new InternalRpcError(
          nodeError(-32603, "execution reverted", {
            message: "execution reverted",
            data: REVERT,
          }),
        ),
    ],
    [
      "Nethermind's revert form on a -32015 answer",
      () => nodeError(-32015, "VM execution error.", `Reverted ${REVERT}`),
    ],
  ])(
    "reads %s as the chain answering: changed (ruling R118)",
    async (_, failure) => {
      finalizedAt(REQUESTS_EXPIRED);
      const error = failure();
      recheck.mockRejectedValueOnce(error);
      expect(asData(await decide())).toEqual({
        kind: "discard",
        reason: "changed",
        error,
      });
    },
  );

  it.each<[string, () => unknown]>([
    [
      "a failure nine errors deep",
      () => {
        let error: Error = new HttpRequestError({ url: "https://rpc.example" });
        for (let depth = 1; depth < 9; depth += 1) {
          error = wrapped(`wrapper ${depth}`, error);
        }
        return error;
      },
    ],
    [
      "a failure under something that is not an error",
      () =>
        wrapped("wrapper", {
          cause: new HttpRequestError({ url: "https://rpc.example" }),
        }),
    ],
    ["a refusal that is not an error", () => "The queue changed"],
  ])("reads %s as a recheck that refused", async (_, failure) => {
    finalizedAt(REQUESTS_EXPIRED);
    const error = failure();
    recheck.mockRejectedValueOnce(error);
    expect(asData(await decide())).toEqual({
      kind: "discard",
      reason: "changed",
      error,
    });
  });

  it("reads a recheck that throws before it returns as one that refused", async () => {
    finalizedAt(REQUESTS_EXPIRED);
    const refusal = new Error("The queue changed");
    const outcome = await relayrSessionOutcome(await classify(requests()), {
      nonces: ["4", "4"],
      recheck: () => {
        throw refusal;
      },
    });
    expect(asData(outcome)).toEqual({
      kind: "discard",
      reason: "changed",
      error: refusal,
    });
  });

  it("keeps the recheck's error out of the outcome's enumerable fields, since an RPC URL can carry a key", async () => {
    finalizedAt(REQUESTS_EXPIRED);
    const keyed = "https://rpc.example/v2/SECRETKEY";
    const failure = new ContractFunctionExecutionError(
      new HttpRequestError({ url: keyed, status: 503 }),
      { abi: [], functionName: "splitsOf" },
    );
    // The error itself carries the URL in its enumerable fields.
    expect(JSON.stringify(failure)).toContain("SECRETKEY");
    recheck.mockRejectedValueOnce(failure);
    const unchecked = await decide();
    expect(unchecked.kind).toBe("unchecked");
    expect(asData(unchecked).error).toBe(failure);
    expect(Object.keys(unchecked)).toEqual(["kind"]);
    expect(JSON.stringify(unchecked)).not.toContain("SECRETKEY");
    const refusal = Object.assign(new Error("The queue changed"), {
      url: keyed,
    });
    recheck.mockRejectedValueOnce(refusal);
    const changed = await decide();
    expect(asData(changed)).toEqual({
      kind: "discard",
      reason: "changed",
      error: refusal,
    });
    expect(Object.keys(changed).sort()).toEqual(["kind", "reason"]);
    expect(JSON.stringify(changed)).not.toContain("SECRETKEY");
  });

  it("takes only a recheck that resolves with nothing, so a check that resolves false can't read as passed", async () => {
    const unused = { live: false, mayHaveRun: false, unused: true } as const;
    const outcome = relayrSessionOutcome(unused, {
      nonces: ["4"],
      // @ts-expect-error A recheck refuses by throwing; a value it resolves with is never read.
      recheck: async () => false,
    });
    await expect(outcome).resolves.toEqual({ kind: "re-sign", nonces: ["4"] });
  });

  it("reads nonces that are not a list as none", async () => {
    const unused = { live: false, mayHaveRun: false, unused: true } as const;
    for (const nonces of ["44", { length: 1, 0: "4" }]) {
      await expect(
        relayrSessionOutcome(unused, { nonces: nonces as never, recheck }),
      ).resolves.toEqual({ kind: "reorg-hold" });
    }
    await expect(
      relayrSessionOutcome(
        { live: true, until: 9, mayHaveRun: false },
        { nonces: "44" as never },
      ),
    ).resolves.toEqual({ kind: "refresh", until: 9, nonces: null });
    expect(recheck).not.toHaveBeenCalled();
  });

  it("offers Discard with the expired reason where the recheck cannot run, as in an account view (ruling R114 (e))", async () => {
    finalizedAt(REQUESTS_EXPIRED);
    await expect(decide(["4", "4"], null)).resolves.toEqual({
      kind: "discard",
      reason: "expired",
    });
    // A request that moved is still read as possibly run.
    noncesOf({ 1: 5n, 10: 4n });
    await expect(decide(["4", "4"], null)).resolves.toEqual({
      kind: "discard",
      reason: "ran",
    });
  });

  it("holds, rather than offering Discard, once every request is dead while a finalized nonce fell below a saved one", async () => {
    finalizedAt(REQUESTS_EXPIRED);
    noncesOf({ 1: 3n, 10: 4n });
    await expect(decide()).resolves.toEqual({ kind: "reorg-hold" });
    await expect(decide(["4", "4"], null)).resolves.toEqual({
      kind: "reorg-hold",
    });
    expect(recheck).not.toHaveBeenCalled();
  });

  it("holds when every request is dead and unused but it was given no nonces to sign at", async () => {
    const unused: RelayrRequestsVerdict = {
      live: false,
      mayHaveRun: false,
      unused: true,
    };
    for (const nonces of [undefined, null, []]) {
      await expect(
        relayrSessionOutcome(unused, { nonces, recheck }),
      ).resolves.toEqual({
        kind: "reorg-hold",
      });
    }
    await expect(relayrSessionOutcome(unused)).resolves.toEqual({
      kind: "reorg-hold",
    });
    expect(recheck).not.toHaveBeenCalled();
  });

  describe("while a request can still run and none moved (amended ruling R114 (a))", () => {
    it("may refresh at the saved nonces, holding until the last request expires, without running the recheck", async () => {
      await expect(decide()).resolves.toEqual({
        kind: "refresh",
        until: REQUEST_DEADLINE,
        nonces: ["4", "4"],
      });
      expect(recheck).not.toHaveBeenCalled();
    });

    it("may refresh once one request expired unused while another can still run", async () => {
      chains[1].timestamp = REQUESTS_EXPIRED;
      await expect(decide()).resolves.toEqual({
        kind: "refresh",
        until: REQUEST_DEADLINE,
        nonces: ["4", "4"],
      });
    });

    it("holds without refreshing once any request may have run", async () => {
      noncesOf({ 1: 5n, 10: 4n });
      await expect(decide()).resolves.toEqual({
        kind: "hold",
        until: REQUEST_DEADLINE,
      });
      chains[1].timestamp = REQUESTS_EXPIRED;
      await expect(decide([undefined, "4"])).resolves.toEqual({
        kind: "hold",
        until: REQUEST_DEADLINE,
      });
    });

    it("counts a request it cannot read as live, so the session may still refresh at the saved nonces", async () => {
      finalizedAt(null);
      await expect(decide()).resolves.toEqual({
        kind: "refresh",
        until: REQUEST_DEADLINE,
        nonces: ["4", "4"],
      });
      noncesOf({ 1: 5n, 10: 5n });
      await expect(decide()).resolves.toMatchObject({ kind: "refresh" });
    });
  });
});

describe("the reasons a session can be discarded", () => {
  it("are ran, changed and expired", () => {
    for (const reason of ["ran", "changed", "expired"]) {
      expect(isRelayrDiscardReason(reason)).toBe(true);
    }
    for (const value of [
      "Ran",
      "unchecked",
      "hold",
      "",
      null,
      undefined,
      1,
      {},
    ]) {
      expect(isRelayrDiscardReason(value)).toBe(false);
    }
  });
});

const loopbackFetch = globalThis.fetch;

describe("the session rules over viem's HTTP transport", () => {
  let server: Server;
  let url: string;
  /** Whether the node knows the finalized tag. */
  let finalizedTag: boolean;
  /** The finalized block's timestamp in seconds. */
  let timestamp: number;
  /** The hash of the block at the finalized number when it is read again. */
  let canonical: Hex;
  /** The forwarder's nonce for every signer. */
  let nonce: bigint;
  /** The JSON-RPC error a call to TARGET answers with, if any. */
  let callError: { code: number; message: string; data?: unknown } | null;
  /** The HTTP status every request answers with, if not 200, carrying `callError` when set. */
  let httpStatus: number | null;
  let origin: string;
  let requestsSeen: { method: string; params: unknown[] }[];

  const hex = (value: number | bigint) => `0x${value.toString(16)}`;
  const block = (hash: Hex) => ({
    hash,
    number: hex(FINALIZED),
    parentHash: BLOCK_HASH,
    timestamp: hex(timestamp),
    transactions: [],
    gasLimit: "0x1",
    gasUsed: "0x0",
    baseFeePerGas: "0x1",
    difficulty: "0x0",
    extraData: "0x",
    logsBloom: `0x${"00".repeat(256)}`,
    miner: ALICE,
    mixHash: BLOCK_HASH,
    nonce: "0x0000000000000000",
    receiptsRoot: BLOCK_HASH,
    sha3Uncles: BLOCK_HASH,
    size: "0x1",
    stateRoot: BLOCK_HASH,
    totalDifficulty: "0x0",
    transactionsRoot: BLOCK_HASH,
    uncles: [],
  });

  beforeAll(async () => {
    server = createServer((request, response) => {
      let body = "";
      request.on("data", (chunk) => (body += chunk));
      request.on("end", () => {
        response.setHeader("content-type", "application/json");
        if (httpStatus) {
          const { id } = JSON.parse(body) as { id: number };
          response.statusCode = httpStatus;
          response.end(
            JSON.stringify(
              callError
                ? { jsonrpc: "2.0", id, error: callError }
                : { error: "Too many requests" },
            ),
          );
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
          requestsSeen.push({ method, params });
          if (method === "eth_getBlockByNumber") {
            if (params[0] === "finalized") {
              return finalizedTag
                ? { jsonrpc: "2.0", id, result: block(BLOCK_HASH) }
                : {
                    jsonrpc: "2.0",
                    id,
                    error: { code: -32602, message: "invalid block tag" },
                  };
            }
            return { jsonrpc: "2.0", id, result: block(canonical) };
          }
          const to = (params[0] as { to?: string } | undefined)?.to;
          if (
            (method === "eth_call" || method === "eth_estimateGas") &&
            callError &&
            to?.toLowerCase() === TARGET.toLowerCase()
          ) {
            return { jsonrpc: "2.0", id, error: callError };
          }
          if (method === "eth_chainId") {
            return { jsonrpc: "2.0", id, result: "0x1" };
          }
          if (method === "eth_call") {
            return {
              jsonrpc: "2.0",
              id,
              result: `0x${nonce.toString(16).padStart(64, "0")}`,
            };
          }
          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32601, message: "method not found" },
          };
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
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    url = `${origin}/rpc`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    finalizedTag = true;
    timestamp = REQUESTS_EXPIRED;
    canonical = BLOCK_HASH;
    nonce = 4n;
    callError = null;
    httpStatus = null;
    requestsSeen = [];
    // Only this suite's loopback node may answer.
    vi.stubGlobal(
      "fetch",
      vi.fn((input: string | URL | Request, init?: RequestInit) =>
        String(input).startsWith(origin)
          ? loopbackFetch(input, init)
          : Promise.reject(new Error(`Unexpected fetch: ${String(input)}`)),
      ),
    );
  });

  // Clients typed by their chain's formatters fit the exported client type.
  const httpClientFor = (chainId: number): RelayrFinalizedClient =>
    chainId === 1
      ? createPublicClient({
          chain: mainnet,
          transport: http(url, { retryCount: 0 }),
        })
      : createPublicClient({
          chain: optimism,
          transport: http(url, { retryCount: 0 }),
        });
  const verdictOverHttp = async () =>
    relayrRequestsVerdict(await relayrRequestStates(httpClientFor, requests()));

  it("reads the nonce at the finalized block's number and classifies from it", async () => {
    await expect(relayrRequestsDead(httpClientFor, requests())).resolves.toBe(
      true,
    );
    const calls = requestsSeen.filter(({ method }) => method === "eth_call");
    expect(calls).toHaveLength(2);
    for (const { params } of calls) {
      expect(params[1]).toBe(hex(FINALIZED));
      expect((params[0] as { to: string }).to.toLowerCase()).toBe(
        FORWARDERS[1].toLowerCase(),
      );
    }
    nonce = 5n;
    await expect(verdictOverHttp()).resolves.toEqual({
      live: false,
      mayHaveRun: true,
      unused: false,
    });
    await expect(
      relayrDeadlinePassed(httpClientFor(1), String(REQUEST_DEADLINE)),
    ).resolves.toBe(true);
  });

  /** The project's view and the error it reverts with once the project changed. */
  const PROJECT_ABI = parseAbi([
    "function splitsOf(uint256 projectId) view returns (uint256)",
    "error ProjectChanged(uint256 projectId)",
  ]);
  const projectClient = () =>
    createPublicClient({
      chain: mainnet,
      transport: http(url, { retryCount: 0 }),
    });
  /** A recheck reading the project through the loopback node, as an app's does. */
  const readProject = async () => {
    await projectClient().readContract({
      address: TARGET,
      abi: PROJECT_ABI,
      functionName: "splitsOf",
      args: [1n],
    });
  };
  /** What a session whose requests all expired unused does after `recheck`. */
  const outcomeAfter = (recheck: () => Promise<void>) =>
    relayrSessionOutcome(
      { live: false, mayHaveRun: false, unused: true },
      { nonces: ["4"], recheck },
    );

  it.each<[string, () => void]>([
    [
      "-32001, the resource was not found",
      () =>
        (callError = {
          code: -32001,
          message: "Requested resource not found.",
        }),
    ],
    [
      "-32005, a limit was exceeded",
      () => (callError = { code: -32005, message: "limit exceeded" }),
    ],
    [
      "-32603, an internal error",
      () => (callError = { code: -32603, message: "internal error" }),
    ],
    ["429, too many requests", () => (httpStatus = 429)],
  ])(
    "reads a recheck the node could not answer (%s) as unchecked (ruling R118)",
    async (_, arrange) => {
      arrange();
      const outcome = await outcomeAfter(readProject);
      expect(outcome.kind).toBe("unchecked");
      expect(JSON.stringify(outcome)).toBe('{"kind":"unchecked"}');
    },
  );

  it("reads a recheck the chain answered with a revert carrying data as changed (ruling R118)", async () => {
    callError = {
      code: 3,
      message: "execution reverted",
      data: encodeErrorResult({
        abi: PROJECT_ABI,
        errorName: "ProjectChanged",
        args: [1n],
      }),
    };
    await expect(outcomeAfter(readProject)).resolves.toMatchObject({
      kind: "discard",
      reason: "changed",
    });
    // A custom error the reading ABI does not know is revert data too.
    callError = { code: 3, message: "execution reverted", data: "0xdeadbeef" };
    await expect(outcomeAfter(readProject)).resolves.toMatchObject({
      kind: "discard",
      reason: "changed",
    });
    // A raw call's revert keeps the node's code 3 and its data.
    await expect(
      outcomeAfter(async () => {
        await projectClient().call({ to: TARGET, data: "0x12345678" });
      }),
    ).resolves.toMatchObject({ kind: "discard", reason: "changed" });
  });

  /** Rechecks reading the project as apps do, each through the loopback node. */
  const RECHECKS: [string, () => Promise<void>][] = [
    ["readContract", readProject],
    [
      "call",
      async () => {
        await projectClient().call({ to: TARGET, data: "0x12345678" });
      },
    ],
    [
      "estimateGas",
      async () => {
        await projectClient().estimateGas({
          account: ALICE,
          to: TARGET,
          data: "0x12345678",
        });
      },
    ],
    [
      "a raw eth_call",
      async () => {
        await projectClient().request({
          method: "eth_call",
          params: [{ to: TARGET, data: "0x12345678" }, "latest"],
        });
      },
    ],
  ];
  const REVERTS_WITH_DATA: [string, NonNullable<typeof callError>][] = [
    [
      "-32603 with revert data",
      { code: -32603, message: "execution reverted", data: REVERT },
    ],
    [
      "-32603 with revert data nested beside a message",
      {
        code: -32603,
        message: "execution reverted",
        data: { message: "execution reverted", data: REVERT },
      },
    ],
    [
      "-32000 with revert data",
      { code: -32000, message: "Execution reverted", data: REVERT },
    ],
    [
      "-32015 with Nethermind's Reverted form",
      {
        code: -32015,
        message: "VM execution error.",
        data: `Reverted ${REVERT}`,
      },
    ],
  ];

  it.each(
    REVERTS_WITH_DATA.flatMap(([shape, error]) =>
      RECHECKS.map(([api, recheck]) => [shape, api, error, recheck] as const),
    ),
  )(
    "reads %s through %s as the chain answering: changed (ruling R118)",
    async (_, __, error, recheck) => {
      callError = error;
      await expect(outcomeAfter(recheck)).resolves.toMatchObject({
        kind: "discard",
        reason: "changed",
      });
    },
  );

  it("reads an HTTP 500 carrying a revert as unchecked: viem 2.37 keeps that body only in the error's details", async () => {
    httpStatus = 500;
    callError = { code: 3, message: "execution reverted", data: REVERT };
    for (const [, recheck] of RECHECKS) {
      await expect(outcomeAfter(recheck)).resolves.toMatchObject({
        kind: "unchecked",
      });
    }
  });

  it("reads the JB Center transport's answers as the apps get them: a lagging node unchecked, a revert with data changed", async () => {
    const center = createPublicClient({
      chain: mainnet,
      transport: custom(
        createJBCenterRpcProvider(1, {
          baseUrl: origin,
          blockLagRetryDelaysMs: [],
        }),
      ),
    });
    const names = (error: unknown) => {
      const found: string[] = [];
      for (let link = error; link instanceof Error; ) {
        found.push(link.name);
        link = (link as { cause?: unknown }).cause;
      }
      return found;
    };
    const readOverCenter = async () => {
      await center.readContract({
        address: TARGET,
        abi: PROJECT_ABI,
        functionName: "splitsOf",
        args: [1n],
      });
    };
    callError = { code: -32001, message: "Requested resource not found." };
    const lagging = await outcomeAfter(readOverCenter);
    expect(lagging.kind).toBe("unchecked");
    // The classifier reads Center's own error, with its code, in the chain.
    expect(names(asData(lagging).error)).toContain("JBCenterRpcError");
    callError = { code: 3, message: "execution reverted", data: "0xdeadbeef" };
    await expect(outcomeAfter(readOverCenter)).resolves.toMatchObject({
      kind: "discard",
      reason: "changed",
    });
    // A raw call keeps Center's error, and its data, under viem's.
    const reverted = await outcomeAfter(async () => {
      await center.call({ to: TARGET, data: "0x12345678" });
    });
    expect(reverted).toMatchObject({ kind: "discard", reason: "changed" });
    expect(names(asData(reverted).error)).toContain("JBCenterRpcError");
  });

  it("reads the action's own refusal, after the node answered, as changed", async () => {
    await expect(
      outcomeAfter(async () => {
        await readProject();
        throw new Error("Payouts were sent since this review.");
      }),
    ).resolves.toMatchObject({ kind: "discard", reason: "changed" });
  });

  it("reads a node without the finalized tag, or a finalized block no longer canonical, as unknown", async () => {
    finalizedTag = false;
    await expect(relayrRequestsDead(httpClientFor, requests())).resolves.toBe(
      false,
    );
    await expect(
      relayrDeadlinePassed(httpClientFor(10), String(START)),
    ).resolves.toBe(false);
    finalizedTag = true;
    canonical = OTHER_BLOCK_HASH;
    await expect(verdictOverHttp()).resolves.toEqual({
      live: true,
      until: REQUEST_DEADLINE,
      mayHaveRun: false,
    });
  });
});
