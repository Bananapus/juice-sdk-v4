import {
  createPublicClient,
  custom,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { base } from "viem/chains";
import { describe, expect, it, vi } from "vitest";
import {
  simulateCallSequence,
  simulateStateChangingTransaction,
  TRANSACTION_SIMULATION_GAS,
  TRANSACTION_SIMULATION_MAX_RETURN_BYTES,
} from "./simulation.js";

const FROM = "0x1111111111111111111111111111111111111111" as Address;
const TARGET = "0x2222222222222222222222222222222222222222" as Address;

const rawClient = (result: unknown) =>
  ({
    request: vi.fn().mockResolvedValue(result),
  }) as unknown as PublicClient & {
    request: ReturnType<typeof vi.fn>;
  };

describe("state-changing transaction simulation", () => {
  it("uses a raw, explicitly gas-bounded eth_call", async () => {
    const client = rawClient("0x");
    await expect(
      simulateStateChangingTransaction(client, {
        from: FROM,
        to: TARGET,
        data: "0x1234",
        value: 7n,
      }),
    ).resolves.toBe("0x");
    expect(client.request).toHaveBeenCalledWith({
      method: "eth_call",
      params: [
        {
          from: FROM,
          to: TARGET,
          data: "0x1234",
          value: "0x7",
          gas: `0x${TRANSACTION_SIMULATION_GAS.toString(16)}`,
        },
        "latest",
      ],
    });
  });

  it("simulates at a given block with the caller's gas", async () => {
    const client = rawClient("0xabcd");
    await expect(
      simulateStateChangingTransaction(client, {
        from: FROM,
        to: TARGET,
        data: "0x1234",
        gas: 500_000n,
        blockNumber: 12_345n,
      }),
    ).resolves.toBe("0xabcd");
    expect(client.request).toHaveBeenCalledWith({
      method: "eth_call",
      params: [
        {
          from: FROM,
          to: TARGET,
          data: "0x1234",
          value: "0x0",
          gas: "0x7a120",
        },
        "0x3039",
      ],
    });
  });

  it("never follows a target-controlled OffchainLookup URL", async () => {
    const request = vi
      .fn()
      .mockRejectedValue(
        new Error(
          "execution reverted: OffchainLookup(https://127.0.0.1/private)",
        ),
      );
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(
      simulateStateChangingTransaction(
        { request, ccipRead: true } as unknown as PublicClient,
        { from: FROM, to: TARGET, data: "0x1234" },
      ),
    ).rejects.toThrow(/OffchainLookup/);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("rejects oversized or malformed return data before a caller decodes it", async () => {
    const simulate = (result: unknown, maxReturnBytes?: number) =>
      simulateStateChangingTransaction(rawClient(result), {
        from: FROM,
        to: TARGET,
        data: "0x1234",
        maxReturnBytes,
      });
    await expect(
      simulate(`0x${"00".repeat(TRANSACTION_SIMULATION_MAX_RETURN_BYTES + 1)}`),
    ).rejects.toThrow(/too much data/);
    await expect(
      simulate(`0x${"00".repeat(TRANSACTION_SIMULATION_MAX_RETURN_BYTES)}`),
    ).resolves.toMatch(/^0x/);
    await expect(simulate(`0x${"00".repeat(33)}`, 32)).rejects.toThrow(
      /too much data/,
    );
    await expect(simulate(`0x${"00".repeat(32)}`, 32)).resolves.toMatch(/^0x/);
    for (const malformed of [null, 7, "0x123", "0xzz", "1234"]) {
      await expect(simulate(malformed)).rejects.toThrow(/malformed data/);
    }
  });

  it("refuses an unbounded simulation", async () => {
    const client = rawClient("0x");
    for (const gas of [0n, -1n]) {
      await expect(
        simulateStateChangingTransaction(client, {
          from: FROM,
          to: TARGET,
          data: "0x",
          gas,
        }),
      ).rejects.toThrow("Transaction simulation gas must be positive.");
    }
    for (const maxReturnBytes of [-1, 1.5, Number.NaN]) {
      await expect(
        simulateStateChangingTransaction(client, {
          from: FROM,
          to: TARGET,
          data: "0x",
          maxReturnBytes,
        }),
      ).rejects.toThrow("Transaction simulation needs a return data limit.");
    }
    expect(client.request).not.toHaveBeenCalled();
  });
});

describe("ordered call sequence simulation", () => {
  const calls = [
    { to: TARGET, data: "0x01" as Hex, label: "Approve the pool" },
    {
      to: FROM,
      data: "0x02" as Hex,
      value: 3n,
      label: "Add liquidity",
      dependsOnPrior: true,
    },
  ];
  const sequenceClient = (
    simulateCalls: ReturnType<typeof vi.fn>,
    request = vi.fn().mockResolvedValue("0x"),
  ) =>
    ({ simulateCalls, request }) as unknown as PublicClient & {
      request: ReturnType<typeof vi.fn>;
    };
  const simulate = (client: PublicClient) =>
    simulateCallSequence(client, { from: FROM, calls, chainName: "Base" });

  it("runs every call in order against one state with eth_simulateV1", async () => {
    const simulateCalls = vi.fn().mockResolvedValue({
      results: [{ status: "success" }, { status: "success" }],
    });
    const client = sequenceClient(simulateCalls);
    await expect(simulate(client)).resolves.toBeUndefined();
    expect(simulateCalls).toHaveBeenCalledWith({
      account: FROM,
      calls: [
        { to: TARGET, data: "0x01", value: undefined },
        { to: FROM, data: "0x02", value: 3n },
      ],
    });
    expect(client.request).not.toHaveBeenCalled();
  });

  it("names the call that fails and why", async () => {
    const revert = Object.assign(new Error("execution reverted\ndetails"), {
      shortMessage: "Allowance too low",
    });
    await expect(
      simulate(
        sequenceClient(
          vi.fn().mockResolvedValue({
            results: [
              { status: "success" },
              { status: "failure", error: revert },
            ],
          }),
        ),
      ),
    ).rejects.toThrow("Add liquidity cannot run on Base: Allowance too low");
    await expect(
      simulate(
        sequenceClient(
          vi.fn().mockResolvedValue({
            results: [
              { status: "failure", error: new Error("first line\nsecond") },
            ],
          }),
        ),
      ),
    ).rejects.toThrow("Approve the pool cannot run on Base: first line");
    // A missing result is never read as success.
    await expect(
      simulate(
        sequenceClient(
          vi.fn().mockResolvedValue({ results: [{ status: "success" }] }),
        ),
      ),
    ).rejects.toThrow(
      "Add liquidity cannot run on Base: The call would revert.",
    );
  });

  it("stops when the sequence itself cannot be simulated", async () => {
    await expect(
      simulate(
        sequenceClient(vi.fn().mockRejectedValue(new Error("reverted"))),
      ),
    ).rejects.toThrow("The batch could not be simulated on Base: reverted");
    await expect(
      simulate(sequenceClient(vi.fn().mockRejectedValue(undefined))),
    ).rejects.toThrow(
      "The batch could not be simulated on Base: The call would revert.",
    );
    await expect(
      simulate(sequenceClient(vi.fn().mockRejectedValue({ code: -32000 }))),
    ).rejects.toThrow(
      "The batch could not be simulated on Base: The call would revert.",
    );
  });

  it("falls back to each independent call alone where the node lacks eth_simulateV1", async () => {
    for (const unsupported of [
      { code: -32601 },
      { code: -32004 },
      { cause: { cause: { code: -32601 } } },
      new Error("the method eth_simulateV1 does not exist/is not available"),
      { details: "eth_simulateV1 is not supported on this network" },
    ]) {
      const client = sequenceClient(vi.fn().mockRejectedValue(unsupported));
      await expect(simulate(client)).resolves.toBeUndefined();
      // The dependent call is left to the executing wallet's simulation.
      expect(client.request).toHaveBeenCalledTimes(1);
      expect(client.request.mock.calls[0][0].params[0]).toMatchObject({
        from: FROM,
        to: TARGET,
        data: "0x01",
      });
    }
    const failing = sequenceClient(
      vi.fn().mockRejectedValue({ code: -32601 }),
      vi.fn().mockRejectedValue(new Error("execution reverted: no allowance")),
    );
    await expect(simulate(failing)).rejects.toThrow(
      "Approve the pool cannot run on Base: execution reverted: no allowance",
    );
  });

  it("never reads a revert or another node error as eth_simulateV1 being unavailable", async () => {
    for (const error of [
      // A reason, even one naming eth_simulateV1, is the call's own revert.
      new Error("execution reverted: Project not found"),
      new Error("execution reverted: eth_simulateV1 is not supported"),
      new Error("Method not supported"),
      { code: -32603, message: "Internal error" },
    ]) {
      const client = sequenceClient(vi.fn().mockRejectedValue(error));
      await expect(simulate(client)).rejects.toThrow(
        /^The batch could not be simulated on Base: /,
      );
      expect(client.request).not.toHaveBeenCalled();
    }
  });
});

describe("call sequence simulation through viem", () => {
  const calls = [
    { to: TARGET, data: "0x01" as Hex, label: "First" },
    { to: TARGET, data: "0x02" as Hex, label: "Second", dependsOnPrior: true },
  ];
  /** A real viem client whose node fails eth_simulateV1 with `error`. */
  function node(error: { code: number; message: string; data?: Hex }) {
    const methods: string[] = [];
    const client = createPublicClient({
      chain: base,
      transport: custom(
        {
          async request({ method }: { method: string }) {
            methods.push(method);
            if (method === "eth_simulateV1") {
              throw Object.assign(new Error(error.message), error);
            }
            if (method === "eth_call") return "0x";
            throw new Error(`Unexpected ${method}`);
          },
        },
        { retryCount: 0 },
      ),
    });
    return { client, methods };
  }

  it("falls back when the node has no eth_simulateV1", async () => {
    for (const error of [
      {
        code: -32601,
        message: "the method eth_simulateV1 does not exist/is not available",
      },
      { code: -32004, message: "Method not supported" },
      // Some nodes answer with a generic code and name the method.
      {
        code: -32000,
        message: "the method eth_simulateV1 does not exist/is not available",
      },
    ]) {
      const { client, methods } = node(error);
      await expect(
        simulateCallSequence(client, { from: FROM, calls, chainName: "Base" }),
      ).resolves.toBeUndefined();
      expect(methods).toEqual(["eth_simulateV1", "eth_call"]);
    }
  });

  it("stops on a revert or an internal error instead of skipping dependent calls", async () => {
    for (const error of [
      {
        code: 3,
        message: "execution reverted: Project not found",
        data: "0x08c379a0" as Hex,
      },
      {
        code: 3,
        message: "execution reverted: the method eth_simulateV1 does not exist",
        data: "0x08c379a0" as Hex,
      },
      { code: -32603, message: "Internal error" },
    ]) {
      const { client, methods } = node(error);
      await expect(
        simulateCallSequence(client, { from: FROM, calls, chainName: "Base" }),
      ).rejects.toThrow(/^The batch could not be simulated on Base: /);
      expect(methods).toEqual(["eth_simulateV1"]);
    }
  });
});
