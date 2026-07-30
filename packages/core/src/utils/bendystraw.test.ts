import { describe, expect, test, vi } from "vitest";
import {
  BendystrawRequestError,
  bendystrawProjectRefFilter,
  bendystrawProjectRefsFilter,
  bendystrawProjectRefsFilters,
  matchesBendystrawProjectRef,
  requestBendystraw,
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
