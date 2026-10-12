import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  ContractFunctionRevertedError,
  ContractFunctionExecutionError,
  parseAbi,
  type Address,
  type PublicClient,
} from "viem";
import { getDefifaHoldings, scanDefifaHoldings } from "./defifaHoldings.js";
vi.mock("./nftInventory.js", () => ({ getProjectNftInventory: vi.fn() }));
import { getProjectNftInventory } from "./nftInventory.js";
const hook = "0x1111111111111111111111111111111111111111" as Address;
const account = "0x2222222222222222222222222222222222222222" as Address;
const other = "0x3333333333333333333333333333333333333333" as Address;
const abi = parseAbi([
  "function ownerOf(uint256) view returns (address)",
  "error ERC721NonexistentToken(uint256 tokenId)",
]);
function burned(id: bigint) {
  return new ContractFunctionExecutionError(
    new ContractFunctionRevertedError({
      abi,
      data: `0x7e273289${id.toString(16).padStart(64, "0")}`,
      functionName: "ownerOf",
    }),
    { abi, contractAddress: hook, functionName: "ownerOf", args: [id] },
  );
}
function fixture(count = 3, owned = 1n) {
  const requests: { blockNumber?: bigint; args?: readonly unknown[] }[] = [];
  const client = {
    readContract: async (request: {
      blockNumber?: bigint;
      args?: readonly unknown[];
    }): Promise<unknown> => {
      requests.push(request);
      const id = request.args![0] as bigint;
      if (id === 1_000_000_001n) throw burned(id);
      return id === BigInt(1_000_000_000 + count) ? account : other;
    },
  } as unknown as PublicClient;
  return {
    client,
    requests,
    context: {
      hook,
      account,
      blockNumber: 100n,
      owned,
      tiers: [
        { id: 1, initialSupply: 999999999, remainingSupply: 999999999 - count },
      ],
      limit: 200,
    },
  };
}
describe("existing Metalog cumulative holdings scan equivalence", () => {
  test("preserves burned holes, transferred owners and pinned reads", async () => {
    const f = fixture();
    expect(await scanDefifaHoldings(f.client, f.context)).toEqual({
      tokens: [{ tierId: 1, tokenId: 1000000003n }],
      totalOwned: 1n,
      totalCandidates: 3n,
      nextCursor: null,
      complete: true,
    });
    expect(f.requests).toHaveLength(3);
    expect(f.requests.every((x) => x.blockNumber === 100n)).toBe(true);
  });
  test("preserves the 200-candidate continuation when the first page owns nothing", async () => {
    const f = fixture(201);
    expect(await scanDefifaHoldings(f.client, f.context)).toMatchObject({
      tokens: [],
      nextCursor: "200",
      complete: false,
    });
    expect(f.requests).toHaveLength(200);
    expect(
      await scanDefifaHoldings(f.client, { ...f.context, cursor: "200" }),
    ).toMatchObject({
      tokens: [{ tierId: 1, tokenId: 1000000201n }],
      complete: true,
      nextCursor: null,
    });
  });
  test("preserves zero holdings without ownership reads", async () => {
    const f = fixture(3, 0n);
    expect(await scanDefifaHoldings(f.client, f.context)).toMatchObject({
      tokens: [],
      totalCandidates: 3n,
      complete: true,
    });
    expect(f.requests).toHaveLength(0);
  });
  test("never misclassifies RPC outages as burns", async () => {
    const f = fixture();
    f.client.readContract = async () => {
      throw new Error("RPC unavailable");
    };
    await expect(scanDefifaHoldings(f.client, f.context)).rejects.toThrow(
      "RPC unavailable",
    );
  });
  test("preserves cursor and supply refusal", async () => {
    const f = fixture();
    await expect(
      scanDefifaHoldings(f.client, { ...f.context, cursor: "4" }),
    ).rejects.toThrow("outside this snapshot");
    await expect(
      scanDefifaHoldings(f.client, { ...f.context, cursor: "01" }),
    ).rejects.toThrow("valid inventory cursor");
    await expect(
      scanDefifaHoldings(f.client, {
        ...f.context,
        tiers: [{ id: 1, initialSupply: 0, remainingSupply: 1 }],
      }),
    ).rejects.toThrow("invalid count");
  });
});

const store = "0x4444444444444444444444444444444444444444" as Address;
const args = { chainId: 84532 as const, projectId: 46n, account };
beforeEach(() => {
  vi.mocked(getProjectNftInventory)
    .mockReset()
    .mockResolvedValue({
      protocol: "defifa",
      hook,
      store,
      blockNumber: 100n,
    } as never);
});
function wrapperFixture(count = 201) {
  const requests: {
    functionName: string;
    blockNumber?: bigint;
    args?: readonly unknown[];
  }[] = [];
  const rawTier = (id: number, minted = count) => ({
    id,
    initialSupply: 999999999,
    remainingSupply: 999999999 - minted,
  });
  const read = vi.fn(
    async (request: {
      functionName: string;
      blockNumber?: bigint;
      args?: readonly unknown[];
    }): Promise<unknown> => {
      requests.push(request);
      if (request.functionName === "balanceOf") return 1n;
      if (request.functionName === "tiersOf") return [rawTier(1)];
      if (request.functionName === "ownerOf")
        return request.args![0] === BigInt(1000000000 + count)
          ? account
          : other;
      throw new Error("Unexpected read");
    },
  );
  return {
    client: { readContract: read } as unknown as PublicClient,
    read,
    requests,
    rawTier,
  };
}
describe("authenticated native holdings wrapper", () => {
  test("defaults to 100 bounded candidates and requires a pinned continuation", async () => {
    const f = wrapperFixture();
    const first = await getDefifaHoldings(f.client, args);
    expect(first).toMatchObject({
      hook,
      blockNumber: 100n,
      totalOwned: 1n,
      totalCandidates: 201n,
      tokens: [],
      nextCursor: "100",
      complete: false,
    });
    expect(f.requests.filter((x) => x.functionName === "ownerOf")).toHaveLength(
      100,
    );
    await expect(
      getDefifaHoldings(f.client, { ...args, cursor: "100" }),
    ).rejects.toThrow("original blockNumber");
    const second = await getDefifaHoldings(f.client, {
      ...args,
      cursor: "100",
      blockNumber: 100n,
      limit: 200,
    });
    expect(second).toMatchObject({
      tokens: [{ tierId: 1, tokenId: 1000000201n }],
      complete: true,
    });
    expect(f.requests.every((x) => x.blockNumber === 100n)).toBe(true);
    expect(getProjectNftInventory).toHaveBeenLastCalledWith(f.client, {
      chainId: 84532,
      projectId: 46n,
      blockNumber: 100n,
      tierLimit: 1,
    });
  });
  test("preserves store ordering with inclusive lookahead, without copying tier-ID adjacency", async () => {
    const f = wrapperFixture(1);
    const page = Array.from({ length: 129 }, (_, i) => f.rawTier(i + 1, 0));
    page.forEach((x) => {
      x.remainingSupply = x.initialSupply - 1;
    });
    page[128]!.id = 1000;
    const original = f.read.getMockImplementation()!;
    f.read.mockImplementation(async (request) =>
      request.functionName === "tiersOf"
        ? request.args![3] === 0n
          ? page
          : [page[128]!]
        : original(request),
    );
    await getDefifaHoldings(f.client, { ...args, limit: 1 });
    expect(f.requests.filter((x) => x.functionName === "ownerOf")).toHaveLength(
      1,
    );
    expect(
      f.read.mock.calls
        .filter(([x]) => x.functionName === "tiersOf")
        .map(([x]) => x.args![3]),
    ).toEqual([0n, 1000n]);
  });
  test("refuses unrecognized identity, wrong expected hook and unavailable identity", async () => {
    const f = wrapperFixture();
    vi.mocked(getProjectNftInventory).mockResolvedValueOnce(null);
    await expect(getDefifaHoldings(f.client, args)).rejects.toThrow(
      "verified Defifa",
    );
    expect(f.read).not.toHaveBeenCalled();
    await expect(
      getDefifaHoldings(f.client, { ...args, expectedHook: other }),
    ).rejects.toThrow("hook changed");
    vi.mocked(getProjectNftInventory).mockRejectedValueOnce(
      new Error("Identity RPC failed"),
    );
    await expect(getDefifaHoldings(f.client, args)).rejects.toThrow(
      "Identity RPC failed",
    );
  });
  test("refuses malformed account, limit and cursor before reads", async () => {
    const f = wrapperFixture();
    for (const patch of [
      { account: "0x0" },
      { account: "0x0000000000000000000000000000000000000000" },
      { limit: 0 },
      { limit: 201 },
      { cursor: "01", blockNumber: 100n },
      { projectId: 0n },
      { blockNumber: -1n },
    ]) {
      await expect(
        getDefifaHoldings(f.client, { ...args, ...patch } as typeof args),
      ).rejects.toThrow();
    }
    expect(getProjectNftInventory).not.toHaveBeenCalled();
    expect(f.read).not.toHaveBeenCalled();
  });
  test("rejects duplicate tiers and invalid supply, never substituting empty holdings", async () => {
    const f = wrapperFixture();
    const original = f.read.getMockImplementation()!;
    for (const tiers of [
      [f.rawTier(1), f.rawTier(1)],
      [{ ...f.rawTier(1), remainingSupply: 1000000000 }],
    ]) {
      f.read.mockImplementation(async (request) =>
        request.functionName === "tiersOf" ? tiers : original(request),
      );
      await expect(getDefifaHoldings(f.client, args)).rejects.toThrow();
    }
  });
});

test("only the decoded native missing-token revert is a burned hole", async () => {
  const f = fixture();
  f.client.readContract = async () => {
    throw new ContractFunctionRevertedError({
      abi,
      data: "0x",
      functionName: "ownerOf",
    });
  };
  await expect(scanDefifaHoldings(f.client, f.context)).rejects.toThrow();
});
test("bounds raw tier fanout and rejects malformed supply/balance", async () => {
  const f = wrapperFixture();
  const original = f.read.getMockImplementation()!;
  for (const raw of [
    Array.from({ length: 130 }, (_, i) => f.rawTier(i + 1)),
    [{ ...f.rawTier(1), initialSupply: -1 }],
    [{ ...f.rawTier(1), id: 65536 }],
  ]) {
    f.read.mockImplementation(async (request) =>
      request.functionName === "tiersOf" ? raw : original(request),
    );
    await expect(getDefifaHoldings(f.client, args)).rejects.toThrow();
  }
  f.read.mockImplementation(async (request) =>
    request.functionName === "balanceOf" ? -1n : original(request),
  );
  await expect(getDefifaHoldings(f.client, args)).rejects.toThrow("balance");
});
test("bounds all tier pages even when owner count is zero", async () => {
  const f = wrapperFixture();
  let page = 0;
  f.read.mockImplementation(async (request) => {
    if (request.functionName === "balanceOf") return 0n;
    if (request.functionName === "tiersOf")
      return Array.from({ length: 129 }, (_, i) =>
        f.rawTier(page * 128 + i + 1, 0),
      ).map((tier) => ({ ...tier, remainingSupply: tier.initialSupply - 1 }));
    throw new Error(
      "Ownership reads must not occur before tier bounds are checked",
    );
  });
  const original = f.read.getMockImplementation()!;
  f.read.mockImplementation(async (request) => {
    const result = await original(request);
    if (request.functionName === "tiersOf") page++;
    return result;
  });
  await expect(getDefifaHoldings(f.client, args)).rejects.toThrow("4096 tiers");
  expect(
    f.read.mock.calls.filter(([r]) => r.functionName === "tiersOf"),
  ).toHaveLength(32);
});
test("retains first-page early completion when all owned IDs were verified", async () => {
  const f = wrapperFixture();
  const original = f.read.getMockImplementation()!;
  f.read.mockImplementation(async (request) =>
    request.functionName === "ownerOf"
      ? request.args![0] === 1000000001n
        ? account
        : other
      : original(request),
  );
  expect(
    await getDefifaHoldings(f.client, {
      ...args,
      expectedHook: hook,
      limit: 2,
    }),
  ).toMatchObject({
    tokens: [{ tierId: 1, tokenId: 1000000001n }],
    complete: true,
    nextCursor: null,
  });
});

test("ignores removed zero-supply placeholders consistently with the native tier reader", async () => {
  const f = wrapperFixture(1);
  const original = f.read.getMockImplementation()!;
  f.read.mockImplementation(async (request) =>
    request.functionName === "tiersOf"
      ? [{ id: 0, initialSupply: 0, remainingSupply: 0 }, f.rawTier(1)]
      : original(request),
  );
  expect(await getDefifaHoldings(f.client, args)).toMatchObject({
    totalCandidates: 1n,
    tokens: [{ tierId: 1, tokenId: 1000000001n }],
    complete: true,
  });
});
test("rejects a repeated store cursor before another read", async () => {
  const f = wrapperFixture();
  const original = f.read.getMockImplementation()!;
  const raw = Array.from({ length: 129 }, (_, i) => f.rawTier(i + 1));
  raw[128]!.id = 0;
  f.read.mockImplementation(async (request) =>
    request.functionName === "tiersOf" ? raw : original(request),
  );
  await expect(getDefifaHoldings(f.client, args)).rejects.toThrow(
    "repeated a cursor",
  );
  expect(
    f.read.mock.calls.filter(([r]) => r.functionName === "tiersOf"),
  ).toHaveLength(1);
});
