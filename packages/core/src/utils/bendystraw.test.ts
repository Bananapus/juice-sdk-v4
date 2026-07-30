import { describe, expect, test, vi } from "vitest";
import {
  BENDYSTRAW_CACHE_TTL_MS,
  BendystrawRequestError,
  assertBendystrawData,
  bendystrawCacheTtl,
  bendystrawDataHasFields,
  bendystrawProjectRefFilter,
  bendystrawProjectRefsFilter,
  bendystrawProjectRefsFilters,
  matchesBendystrawProjectRef,
  normalizeBendystrawEndpoint,
  requestBendystraw,
  resolveBendystrawNetwork,
  selectBendystrawEndpoint,
} from "./bendystraw.js";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return new Response(JSON.stringify(body), { ...init, headers });
}

describe("Bendystraw project reference filters", () => {
  test("builds explicit versioned conjunctions", () => {
    expect(bendystrawProjectRefFilter({ chainId: 1, projectId: 7 })).toEqual({
      AND: [{ chainId: 1 }, { projectId: 7 }, { version: 6 }],
    });
    expect(
      bendystrawProjectRefFilter({ chainId: 8453, projectId: 9, version: 5 }),
    ).toEqual({
      AND: [{ chainId: 8453 }, { projectId: 9 }, { version: 5 }],
    });
  });

  test("deduplicates refs and uses OR only for distinct deployments", () => {
    expect(
      bendystrawProjectRefsFilter([
        { chainId: 1, projectId: 7 },
        { chainId: 1, projectId: 7, version: 6 },
      ]),
    ).toEqual({
      AND: [{ chainId: 1 }, { projectId: 7 }, { version: 6 }],
    });
    expect(
      bendystrawProjectRefsFilter([
        { chainId: 1, projectId: 7 },
        { chainId: 8453, projectId: 11 },
      ]),
    ).toEqual({
      OR: [
        { AND: [{ chainId: 1 }, { projectId: 7 }, { version: 6 }] },
        {
          AND: [{ chainId: 8453 }, { projectId: 11 }, { version: 6 }],
        },
      ],
    });
  });

  test("rejects empty and malformed refs instead of broadening a query", () => {
    expect(() => bendystrawProjectRefsFilter([])).toThrow(TypeError);
    for (const ref of [
      { chainId: 0, projectId: 1 },
      { chainId: 1.5, projectId: 1 },
      { chainId: 1, projectId: 0 },
      { chainId: 1, projectId: -1 },
      { chainId: 1, projectId: Number.MAX_SAFE_INTEGER + 1 },
      { chainId: 1, projectId: 1, version: 0 },
    ]) {
      expect(() => bendystrawProjectRefFilter(ref)).toThrow(
        "Invalid Bendystraw project reference",
      );
    }
  });

  test("builds bounded, independently queryable exact-ref batches", () => {
    expect(
      bendystrawProjectRefsFilters(
        [
          { chainId: 1, projectId: 7 },
          { chainId: 1, projectId: 7, version: 6 },
          { chainId: 8453, projectId: 11 },
        ],
        1,
      ),
    ).toEqual([
      { OR: [{ AND: [{ chainId: 1 }, { projectId: 7 }, { version: 6 }] }] },
      {
        OR: [
          {
            AND: [{ chainId: 8453 }, { projectId: 11 }, { version: 6 }],
          },
        ],
      },
    ]);
    expect(bendystrawProjectRefsFilters([])).toEqual([]);
    expect(() =>
      bendystrawProjectRefsFilters([{ chainId: 1, projectId: 7 }], 0),
    ).toThrow("batchSize");
  });

  test("matches only exact, well-formed deployment rows", () => {
    const refs = [
      { chainId: 1, projectId: 7 },
      { chainId: 8453, projectId: 11, version: 5 },
    ];
    expect(
      matchesBendystrawProjectRef(
        { chainId: "8453", projectId: "11", version: "5" },
        refs,
      ),
    ).toBe(true);
    expect(
      matchesBendystrawProjectRef(
        { chainId: 8453, projectId: 7, version: 6 },
        refs,
      ),
    ).toBe(false);
    expect(
      matchesBendystrawProjectRef(
        { chainId: "bad", projectId: 7, version: 6 },
        refs,
      ),
    ).toBe(false);
  });
});

describe("Bendystraw network and cache policy", () => {
  test("infers networks from nested chain variables", () => {
    expect(
      resolveBendystrawNetwork({
        variables: {
          where: {
            OR: [{ chainId: 1 }, { nested: { chainId_in: ["10", 8453] } }],
          },
        },
      }),
    ).toBe("mainnet");
    expect(
      resolveBendystrawNetwork({
        variables: { where: { chainId_in: [11155111, 84532] } },
      }),
    ).toBe("testnet");
    expect(resolveBendystrawNetwork({ defaultNetwork: "testnet" })).toBe(
      "testnet",
    );
  });

  test("fails closed for malformed, unsupported, mixed, and contradictory networks", () => {
    expect(() =>
      resolveBendystrawNetwork({ variables: { chainId: 0 } }),
    ).toThrow("Invalid Bendystraw chainId");
    expect(() =>
      resolveBendystrawNetwork({ variables: { chainId: 999_999 } }),
    ).toThrow("Unsupported Bendystraw chain ID");
    expect(() =>
      resolveBendystrawNetwork({
        variables: { chainId_in: [1, 11155111] },
      }),
    ).toThrow("cannot mix mainnet and testnet");
    expect(() =>
      resolveBendystrawNetwork({
        network: "mainnet",
        variables: { chainId: 11155111 },
      }),
    ).toThrow("conflicts with testnet");
    let tooDeep: Record<string, unknown> = { chainId: 1 };
    for (let depth = 0; depth < 14; depth += 1) {
      tooDeep = { nested: tooDeep };
    }
    expect(() => resolveBendystrawNetwork({ variables: tooDeep })).toThrow(
      "nesting limit",
    );
  });

  test("normalizes and selects canonical endpoints", () => {
    expect(
      normalizeBendystrawEndpoint(
        "https://bendystraw.example/base/graphql/?ignored=yes#hash",
      ),
    ).toBe("https://bendystraw.example/base/graphql");
    expect(
      selectBendystrawEndpoint(
        {
          mainnet: "https://bendystraw.example",
          testnet: "https://testnet.bendystraw.example/graphql",
        },
        { variables: { where: { chainId: 84532 } } },
      ),
    ).toBe("https://testnet.bendystraw.example/graphql");
    expect(() =>
      normalizeBendystrawEndpoint("ftp://bendystraw.example"),
    ).toThrow("HTTP or HTTPS");
  });

  test("exposes one cache vocabulary without caching in the transport", () => {
    expect(bendystrawCacheTtl("live")).toBe(15_000);
    expect(bendystrawCacheTtl("standard")).toBe(30_000);
    expect(bendystrawCacheTtl("stable")).toBe(60_000);
    expect(BENDYSTRAW_CACHE_TTL_MS).toEqual({
      live: 15_000,
      standard: 30_000,
      stable: 60_000,
    });
  });
});

describe("requestBendystraw", () => {
  test("posts the exact GraphQL envelope and returns data", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: { project: { id: "1" } } }));

    await expect(
      requestBendystraw<{ project: { id: string } }, { projectId: number }>(
        "https://bendystraw.example/graphql",
        "query Project($projectId: Int!) { project(projectId: $projectId) { id } }",
        { projectId: 1 },
        { fetch: fetchMock },
      ),
    ).resolves.toEqual({ project: { id: "1" } });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [endpoint, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(endpoint).toBe("https://bendystraw.example/graphql");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      Accept: "application/graphql-response+json, application/json",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init.body))).toEqual({
      query:
        "query Project($projectId: Int!) { project(projectId: $projectId) { id } }",
      variables: { projectId: 1 },
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  test("validates variables and response data at the transport boundary", async () => {
    const isVariables = (value: unknown): value is { projectId: number } =>
      typeof value === "object" &&
      value !== null &&
      typeof (value as { projectId?: unknown }).projectId === "number";
    const hasProject = bendystrawDataHasFields("project");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: { project: null } }))
      .mockResolvedValueOnce(jsonResponse({ data: { wrong: null } }));

    await expect(
      requestBendystraw(
        "https://bendystraw.example/graphql",
        "query Project($projectId: Int!) { project(projectId: $projectId) { id } }",
        { projectId: 1 },
        {
          fetch: fetchMock,
          operationName: "Project",
          validateVariables: isVariables,
          validateData: hasProject,
        },
      ),
    ).resolves.toEqual({ project: null });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      query:
        "query Project($projectId: Int!) { project(projectId: $projectId) { id } }",
      variables: { projectId: 1 },
      operationName: "Project",
    });

    await expect(
      requestBendystraw(
        "https://bendystraw.example/graphql",
        "query Project($projectId: Int!) { project(projectId: $projectId) { id } }",
        { projectId: 1 },
        {
          fetch: fetchMock,
          operationName: "Project",
          validateData: hasProject,
        },
      ),
    ).rejects.toMatchObject({
      message: "Project returned invalid data",
      status: 502,
    });
    expect(() => assertBendystrawData({}, hasProject, "Project")).toThrow(
      "Project returned invalid data",
    );

    await expect(
      requestBendystraw(
        "https://bendystraw.example/graphql",
        "query Project($projectId: Int!) { project(projectId: $projectId) { id } }",
        { projectId: "not-a-number" } as unknown as { projectId: number },
        {
          fetch: fetchMock,
          operationName: "Project",
          validateVariables: isVariables,
        },
      ),
    ).rejects.toMatchObject({
      message: "Project received invalid variables",
      status: 400,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("retries transient HTTP and network failures with a bounded schedule", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, { status: 503 }))
      .mockRejectedValueOnce(new TypeError("network down"))
      .mockResolvedValueOnce(jsonResponse({ data: { ok: true } }));

    await expect(
      requestBendystraw<{ ok: boolean }>(
        "https://bendystraw.example/graphql",
        "query { ok }",
        {},
        { fetch: fetchMock, retryDelaysMs: [0, 0] },
      ),
    ).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test("does not retry terminal HTTP, GraphQL, or envelope failures", async () => {
    const cases: Array<[Response, string]> = [
      [jsonResponse({}, { status: 400 }), "request failed (400)"],
      [jsonResponse({ errors: [{ message: "nope" }] }), "nope"],
      [jsonResponse({}), "missing data"],
      [
        new Response("<html>", {
          headers: { "content-type": "text/html" },
        }),
        "invalid content type",
      ],
      [
        new Response("{", {
          headers: { "content-type": "application/json" },
        }),
        "invalid JSON",
      ],
    ];

    for (const [response, message] of cases) {
      const fetchMock = vi.fn().mockResolvedValue(response);
      await expect(
        requestBendystraw(
          "https://bendystraw.example/graphql",
          "query { ok }",
          {},
          { fetch: fetchMock, retryDelaysMs: [0, 0] },
        ),
      ).rejects.toThrow(message);
      expect(fetchMock).toHaveBeenCalledOnce();
    }
  });

  test("rejects declared and streamed bodies over the configured limit", async () => {
    const declared = jsonResponse(
      { data: { ok: true } },
      { headers: { "content-length": "100" } },
    );
    await expect(
      requestBendystraw(
        "https://bendystraw.example/graphql",
        "query { ok }",
        {},
        { fetch: vi.fn().mockResolvedValue(declared), maxResponseBytes: 10 },
      ),
    ).rejects.toBeInstanceOf(BendystrawRequestError);

    const streamed = jsonResponse({ data: { value: "too large" } });
    await expect(
      requestBendystraw(
        "https://bendystraw.example/graphql",
        "query { value }",
        {},
        { fetch: vi.fn().mockResolvedValue(streamed), maxResponseBytes: 10 },
      ),
    ).rejects.toThrow("size limit");
  });

  test("honors caller cancellation and validates resource bounds", async () => {
    const aborted = new AbortController();
    aborted.abort();
    const fetchMock = vi.fn().mockImplementation(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          if (init?.signal?.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
            return;
          }
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );
    await expect(
      requestBendystraw(
        "https://bendystraw.example/graphql",
        "query { ok }",
        {},
        { fetch: fetchMock, signal: aborted.signal },
      ),
    ).rejects.toHaveProperty("name", "AbortError");
    expect(fetchMock).toHaveBeenCalledOnce();

    await expect(
      requestBendystraw(
        "https://bendystraw.example/graphql",
        "query { ok }",
        {},
        { maxResponseBytes: 0 },
      ),
    ).rejects.toThrow("maxResponseBytes");
    await expect(
      requestBendystraw(
        "https://bendystraw.example/graphql",
        "query { ok }",
        {},
        { timeoutMs: 0 },
      ),
    ).rejects.toThrow("timeoutMs");
  });
});
