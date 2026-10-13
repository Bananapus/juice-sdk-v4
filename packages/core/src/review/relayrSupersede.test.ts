import type { Address, Hex } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  RELAYR_API,
  RELAYR_NATIVE_TOKEN,
  RELAYR_PAYMENT_ADDRESS,
  RELAYR_PAYMENT_SELECTOR,
  relayrSupersede,
  type RelayrPayment,
  type RelayrSignedRequest,
  type RelayrSupersedeClient,
} from "./relayr.js";

// Ruling R119's supersede rule: an ordinary action may sign different calls at
// the saved nonces of an earlier session once that session provably can never
// be paid, instead of waiting out its signed requests.

const ALICE = "0x1111111111111111111111111111111111111111" as Address;
const BUNDLE_UUID = "01234567-89ab-cdef-0123-456789abcdef";
const BLOCK_HASH = `0x${"45".repeat(32)}` as Hex;
const FINALIZED = 200n;
const LATEST = 260n;
/** When the requests were signed, in seconds. */
const START = 1_900_000_000;
/** The quote's payment deadline. */
const PAY_DEADLINE = START + 585;
/** Requests signed at START run until here: the 2-hour default. */
const REQUEST_DEADLINE = START + 2 * 60 * 60;

type ChainState = {
  finalizedAt: number;
  latestAt: number;
  finalizedNonce: bigint;
  latestNonce: bigint;
};

function chainClient(state: ChainState) {
  return {
    getBlock: vi.fn(
      async (args: {
        blockTag?: "finalized" | "latest";
        blockNumber?: bigint;
      }) => {
        if (args.blockTag === "finalized")
          return {
            number: FINALIZED,
            hash: BLOCK_HASH,
            timestamp: BigInt(state.finalizedAt),
          };
        if (args.blockTag === "latest")
          return {
            number: LATEST,
            hash: BLOCK_HASH,
            timestamp: BigInt(state.latestAt),
          };
        return { hash: BLOCK_HASH };
      },
    ),
    readContract: vi.fn(async ({ blockNumber }: { blockNumber: bigint }) =>
      blockNumber === LATEST ? state.latestNonce : state.finalizedNonce,
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

const unpaid = () =>
  json({
    bundle_uuid: BUNDLE_UUID,
    payment_received: false,
    transactions: [
      { tx_uuid: BUNDLE_UUID, status: { state: "Pending" } },
      { tx_uuid: BUNDLE_UUID, status: { state: "pending" } },
    ],
  });

let fetchBundle: ReturnType<typeof vi.fn>;

const settings = (overrides: Record<string, unknown> = {}) => ({
  bundleUuid: BUNDLE_UUID,
  options: [option(1), option(10)],
  destinationChainIds: [1, 10],
  paymentAttempted: false,
  launch: false,
  fetch: fetchBundle as unknown as typeof globalThis.fetch,
  ...overrides,
});

const hold = { kind: "hold", until: REQUEST_DEADLINE };

beforeEach(() => {
  const state = (): ChainState => ({
    finalizedAt: START + 600,
    latestAt: PAY_DEADLINE + 61,
    finalizedNonce: 4n,
    latestNonce: 4n,
  });
  chains = { 1: state(), 10: state() };
  clients = { 1: chainClient(chains[1]), 10: chainClient(chains[10]) };
  fetchBundle = vi.fn(async () => unpaid());
});

describe("superseding an unpaid Relayr session", () => {
  it("hands back the saved nonces once nothing can pay the session", async () => {
    await expect(
      relayrSupersede(clientFor, requests(), settings()),
    ).resolves.toEqual({
      kind: "supersede",
      nonces: [
        { chainId: 1, signer: ALICE, nonce: "4" },
        { chainId: 10, signer: ALICE, nonce: "4" },
      ],
    });
    expect(fetchBundle).toHaveBeenCalledTimes(1);
    expect(fetchBundle).toHaveBeenCalledWith(
      `${RELAYR_API}/v1/bundle/${BUNDLE_UUID}`,
      { cache: "no-store", signal: expect.any(AbortSignal) },
    );
  });

  it("reads Relayr only after the quote's deadlines and nonces", async () => {
    const order: string[] = [];
    for (const client of Object.values(clients)) {
      const getBlock = client!.getBlock.getMockImplementation()!;
      client!.getBlock.mockImplementation(async (args) => {
        if (args.blockTag === "latest") order.push("latest");
        return getBlock(args);
      });
    }
    fetchBundle.mockImplementation(async () => {
      order.push("relayr");
      return unpaid();
    });
    await relayrSupersede(clientFor, requests(), settings());
    expect(order[order.length - 1]).toBe("relayr");
    expect(order.filter((step) => step === "relayr")).toHaveLength(1);
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

  it("holds until every option's deadline is more than a minute past at the latest block", async () => {
    chains[10].latestAt = PAY_DEADLINE + 60;
    await expect(
      relayrSupersede(clientFor, requests(), settings()),
    ).resolves.toEqual(hold);
    chains[10].latestAt = PAY_DEADLINE + 61;
    await expect(
      relayrSupersede(
        clientFor,
        requests(),
        settings({ options: [option(1), option(10, PAY_DEADLINE + 10)] }),
      ),
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
            timestamp: BigInt(PAY_DEADLINE + 61),
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

  it.each<[string, () => Response | Promise<Response>]>([
    [
      "Relayr reports a payment",
      () =>
        json({
          bundle_uuid: BUNDLE_UUID,
          payment_received: true,
          transactions: [
            { tx_uuid: BUNDLE_UUID, status: { state: "Pending" } },
          ],
        }),
    ],
    [
      "Relayr reports a call running",
      () =>
        json({
          bundle_uuid: BUNDLE_UUID,
          payment_received: false,
          transactions: [
            { tx_uuid: BUNDLE_UUID, status: { state: "Executing" } },
          ],
        }),
    ],
    [
      "Relayr has not said whether it is paid",
      () =>
        json({
          bundle_uuid: BUNDLE_UUID,
          transactions: [
            { tx_uuid: BUNDLE_UUID, status: { state: "Pending" } },
          ],
        }),
    ],
    ["Relayr can't be read", () => json({ error: "down" }, 503)],
  ])("holds when %s", async (_name, answer) => {
    fetchBundle.mockImplementation(async () => answer());
    await expect(
      relayrSupersede(clientFor, requests(), settings()),
    ).resolves.toEqual(hold);
  });

  it("reads Relayr with the global fetch by default", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => unpaid()),
    );
    try {
      await expect(
        relayrSupersede(clientFor, requests(), settings({ fetch: undefined })),
      ).resolves.toMatchObject({ kind: "supersede" });
      expect(fetch).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
