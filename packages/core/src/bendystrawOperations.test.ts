import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bendystrawOperationId,
  compileBendystrawOperation,
  requestPersistedBendystraw,
  resolvePersistedBendystrawRequest,
} from "./bendystrawOperations.js";

const PROJECTS = `
  query Projects($where: projectFilter!, $limit: Int!) {
    projects(where: $where, limit: $limit) {
      totalCount
      items { chainId projectId version name }
    }
  }
`;
const OPERATION = createHash("sha256").update(PROJECTS).digest("hex");

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Bendystraw operation contracts", () => {
  it("names the operation, bounds its variables and requires every selected field", () => {
    const contract = compileBendystrawOperation(PROJECTS);
    expect(compileBendystrawOperation(PROJECTS)).toBe(contract);
    expect(contract.operationName).toBe("Projects");
    expect(
      contract.validateVariables({ where: { version: 6 }, limit: 25 }),
    ).toBe(true);
    expect(
      contract.validateVariables({ where: {}, limit: 25, extra: true }),
    ).toBe(false);
    expect(contract.validateVariables({ where: {} })).toBe(false);
    expect(contract.validateVariables({ where: {}, limit: 1.5 })).toBe(false);
    expect(contract.validateVariables([])).toBe(false);
    expect(
      contract.validateData({
        projects: {
          totalCount: 1,
          items: [{ chainId: 8453, projectId: 6, version: 6, name: "A" }],
        },
      }),
    ).toBe(true);
    expect(contract.validateData({ projects: null })).toBe(true);
    expect(
      contract.validateData({
        projects: { totalCount: 1, items: [{ chainId: 8453, projectId: 6 }] },
      }),
    ).toBe(false);
    expect(
      contract.validateData({ projects: { totalCount: 1, items: 7 } }),
    ).toBe(false);
    expect(contract.validateData([])).toBe(false);
  });

  it("checks scalar, list and default inputs by their declared types", () => {
    const contract = compileBendystrawOperation(`
      query Inputs(
        $flag: Boolean
        $ratio: Float
        $id: ID
        $name: String
        $tags: [String!]
        $filter: projectFilter = { version: 6, name: "x", ids: [1, 2.5], none: null, on: true, kind: ALL }
        $count: Int = 3
      ) {
        project(id: $id) { name }
      }
    `);
    const ok = (variables: Record<string, unknown>) =>
      contract.validateVariables(variables);
    expect(ok({})).toBe(true);
    expect(
      ok({ flag: true, ratio: 0.5, id: "7", name: "a", tags: ["b"] }),
    ).toBe(true);
    expect(ok({ id: 7, tags: "single" })).toBe(true);
    expect(ok({ flag: "yes" })).toBe(false);
    expect(ok({ ratio: "1" })).toBe(false);
    expect(ok({ id: 1.5 })).toBe(false);
    expect(ok({ name: 1 })).toBe(false);
    expect(ok({ tags: [null] })).toBe(false);
    expect(ok({ count: 1.5 })).toBe(false);
    expect(ok({ name: "x".repeat(16_385) })).toBe(false);
    expect(ok({ tags: Array.from({ length: 1_001 }, () => "t") })).toBe(false);
    expect(
      ok({
        filter: Object.fromEntries(
          Array.from({ length: 251 }, (_, index) => [`k${index}`, index]),
        ),
      }),
    ).toBe(false);
    let deep: Record<string, unknown> = {};
    for (let depth = 0; depth < 13; depth += 1) deep = { deep };
    expect(ok({ filter: deep })).toBe(false);
    expect(ok({ filter: { ratio: Number.NaN } })).toBe(false);
    expect(ok({ filter: { at: 1n } })).toBe(false);
    expect(
      compileBendystrawOperation(
        `query LongDefault($s: String = "${"x".repeat(16_385)}") { a }`,
      ).validateVariables({}),
    ).toBe(false);
  });

  it("follows inline fragments and named fragments", () => {
    const contract = compileBendystrawOperation(`
      query Moments { moments { ...Fields ... on Pay { amount } ... { at } } }
      fragment Fields on Moment { id }
    `);
    expect(contract.operationName).toBe("Moments");
    expect(contract.validateData({ moments: [{ at: 1 }] })).toBe(true);
    expect(contract.validateData({ moments: [{ id: 1 }] })).toBe(false);
    expect(
      compileBendystrawOperation(
        "query Aliased { first: moments { id } }",
      ).validateData({ first: { id: 1 } }),
    ).toBe(true);
    expect(
      compileBendystrawOperation(`
        query Nested { moments { ... on Pay { payer { id } } } }
      `).validateData({ moments: { payer: "x" } }),
    ).toBe(false);
    expect(
      compileBendystrawOperation(`
        query Spread { moments { ...Fields } }
        fragment Fields on Moment { payer { id } }
      `).validateData({ moments: { payer: 1 } }),
    ).toBe(false);
    expect(
      compileBendystrawOperation(
        "query Missing { moments { ...Absent } }",
      ).validateData({ moments: {} }),
    ).toBe(false);
    expect(
      compileBendystrawOperation("{ moments { id } }").operationName,
    ).toBeUndefined();
  });

  it("refuses documents without exactly one operation", () => {
    expect(() => compileBendystrawOperation("fragment F on P { id }")).toThrow(
      /exactly one operation/,
    );
    expect(() =>
      compileBendystrawOperation("query A { a } query B { b }"),
    ).toThrow(/exactly one operation/);
  });
});

describe("persisted Bendystraw requests", () => {
  it("uses the document SHA-256 as its operation id", async () => {
    expect(await bendystrawOperationId(PROJECTS)).toBe(OPERATION);
  });

  it("sends the id and variables, never the document, and validates the reply", async () => {
    const operation = await bendystrawOperationId(PROJECTS);
    const variables = { where: { version: 6 }, limit: 1 };
    const data = { projects: { totalCount: 0, items: [] } };
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ data }), {
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const contract = compileBendystrawOperation(PROJECTS);
    await expect(
      requestPersistedBendystraw({
        contract,
        network: "testnet",
        query: PROJECTS,
        variables,
      }),
    ).resolves.toEqual(data);
    const [url, init = {}] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/bendystraw/testnet/query");
    expect(JSON.parse(init.body as string)).toEqual({ operation, variables });
    expect(init.cache).toBe("no-store");

    await requestPersistedBendystraw({
      contract,
      network: "mainnet",
      query: PROJECTS,
      variables,
      endpoint: "https://app.test/bendystraw",
    });
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://app.test/bendystraw");

    fetchMock.mockImplementation(
      async () =>
        new Response(JSON.stringify({ data: { projects: { items: [] } } }), {
          headers: { "content-type": "application/json" },
        }),
    );
    await expect(
      requestPersistedBendystraw({
        contract,
        network: "mainnet",
        query: PROJECTS,
        variables,
      }),
    ).rejects.toThrow();
  });
});

describe("resolving a persisted request", () => {
  const near = {
    upperCase: OPERATION.toUpperCase(),
    oneShort: OPERATION.slice(1),
    oneLong: `${OPERATION}0`,
    lineBreak: `${OPERATION}\n`,
    leadingSpace: ` ${OPERATION}`,
  };
  // Every near miss of the id is registered too, so a malformed id is refused
  // for its shape and not only because it is unknown.
  const registry = Object.fromEntries(
    [OPERATION, ...Object.values(near)].map((id) => [id, PROJECTS]),
  );

  it("resolves a registered id with its variables and nothing else", () => {
    const variables = { where: { version: 6 }, limit: 25 };
    expect(
      resolvePersistedBendystrawRequest(
        { operation: OPERATION, variables },
        registry,
      ),
    ).toEqual({ query: PROJECTS, variables });
  });

  // One row for each way the resolver refuses a body.
  const refusals: Array<[name: string, body: unknown]> = [
    [
      "a raw document beside the id",
      {
        operation: OPERATION,
        variables: {},
        query: "query Attacker { projects { totalCount } }",
      },
    ],
    [
      "an own `__proto__` key, as JSON.parse makes one",
      JSON.parse(`{"operation":"${OPERATION}","variables":{},"__proto__":{}}`),
    ],
    [
      "an id that is not registered",
      { operation: "0".repeat(64), variables: {} },
    ],
    ["an upper case id", { operation: near.upperCase, variables: {} }],
    [
      "an inherited property name for an id",
      { operation: "constructor", variables: {} },
    ],
    ["`__proto__` for an id", { operation: "__proto__", variables: {} }],
    ["an id one character short", { operation: near.oneShort, variables: {} }],
    ["an id one character long", { operation: near.oneLong, variables: {} }],
    [
      "an id with a line break after it",
      { operation: near.lineBreak, variables: {} },
    ],
    [
      "an id with a space before it",
      { operation: near.leadingSpace, variables: {} },
    ],
    ["an id that is a number", { operation: 1, variables: {} }],
    [
      "an id in an array, which reads as the id text",
      { operation: [OPERATION], variables: {} },
    ],
    ["no id", { variables: {} }],
    ["no variables", { operation: OPERATION }],
    ["variables in an array", { operation: OPERATION, variables: [] }],
    ["null variables", { operation: OPERATION, variables: null }],
    ["variables that are text", { operation: OPERATION, variables: "{}" }],
    ["an array for a body", []],
    ["null for a body", null],
    ["text for a body", "query { projects { totalCount } }"],
  ];

  it.each(refusals)("refuses %s", (_name, body) => {
    expect(resolvePersistedBendystrawRequest(body, registry)).toBeNull();
  });
});

describe("persisted Bendystraw requests with a caller's signal", () => {
  const variables = { where: { version: 6 }, limit: 1 };
  const reason = new Error("left the page");

  beforeEach(() => {
    vi.useFakeTimers();
  });

  /**
   * A relay that never answers and fails a request with its signal's reason the
   * moment that signal aborts, as fetch does. A signal that has already aborted
   * fails at once, before anything is sent.
   */
  function silentRelay() {
    const relay = vi.fn<typeof fetch>(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          if (signal?.aborted) return reject(signal.reason);
          signal?.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          });
        }),
    );
    vi.stubGlobal("fetch", relay);
    return relay;
  }

  const failureOf = (request: Promise<unknown>) =>
    request.then(
      () => undefined,
      (error: unknown) => error,
    );

  const requestWith = (signal: AbortSignal) =>
    failureOf(
      requestPersistedBendystraw({
        contract: compileBendystrawOperation(PROJECTS),
        network: "mainnet",
        query: PROJECTS,
        signal,
        variables,
      }),
    );

  // Time enough for a request that was not cancelled to time out at 15 s and
  // retry.
  const waitOutRetries = () => vi.advanceTimersByTimeAsync(60_000);

  it("ends the request under way with the caller's reason and never retries it", async () => {
    const relay = silentRelay();
    const controller = new AbortController();
    const failure = requestWith(controller.signal);
    // The document is hashed before anything is sent.
    await vi.waitFor(() => expect(relay).toHaveBeenCalledOnce());
    expect(relay.mock.calls[0]![1]?.signal?.aborted).toBe(false);

    controller.abort(reason);
    await waitOutRetries();

    expect(await failure).toBe(reason);
    expect(relay).toHaveBeenCalledOnce();
    expect(relay.mock.calls[0]![1]?.signal?.aborted).toBe(true);
  });

  it("hands fetch a signal that has already aborted, so nothing is sent", async () => {
    const relay = silentRelay();
    const controller = new AbortController();
    controller.abort(reason);
    const failure = requestWith(controller.signal);
    await vi.waitFor(() => expect(relay).toHaveBeenCalled());
    await waitOutRetries();

    expect(await failure).toBe(reason);
    expect(relay).toHaveBeenCalledOnce();
    expect(relay.mock.calls[0]![1]?.signal?.aborted).toBe(true);
  });
});
