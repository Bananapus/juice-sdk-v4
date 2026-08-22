import { describe, expect, test, vi } from "vitest";
import {
  JBCENTER_DEFAULT_URL,
  JBCenterRequestError,
  JBCenterTimeoutError,
  createJBCenterClient,
} from "./jbcenter.js";

const hash = `0x${"12".repeat(32)}` as const;
const signature = `0x${"34".repeat(65)}` as const;
const address = `0x${"56".repeat(20)}` as const;
const envelope = {
  version: 1 as const,
  format: "juicebox.money/v1",
  deploymentVersion: "6",
  chainIds: [1],
  jb: { name: "Example", chains: [1] },
};
const intentInput = {
  format: envelope.format,
  deploymentVersion: envelope.deploymentVersion,
  chainIds: envelope.chainIds,
  jb: envelope.jb,
};

function jsonResponse(value: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  return new Response(JSON.stringify(value), { ...init, headers });
}

function intent() {
  return {
    id: "31b158fc-6ac5-4a4d-9039-882b7eb0ef4b",
    status: "undeployed",
    contentHash: hash,
    envelope,
    publisher: address,
    signature,
    createdAt: "2026-08-22T00:00:00.000Z",
    deployments: [],
    name: "Example",
    description: null,
    tagline: null,
    tags: [],
    logoUri: null,
    owner: address,
  } as const;
}

describe("JB Center client", () => {
  test("uses the canonical endpoint and prepares an intent for wallet signing", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ contentHash: hash, message: "sign me", envelope }),
      );
    const client = createJBCenterClient({ apiKey: "secret", fetch: fetchMock });

    await expect(client.prepareIntent(intentInput)).resolves.toEqual({
      contentHash: hash,
      message: "sign me",
      envelope,
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(client.baseUrl).toBe(JBCENTER_DEFAULT_URL);
    expect(url).toBe("https://juicebox.center/v1/intents/message");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers)).toMatchObject({});
    expect(new Headers(init.headers).get("authorization")).toBe(
      "Bearer secret",
    );
    expect(new Headers(init.headers).get("content-type")).toBe(
      "application/json",
    );
    expect(JSON.parse(String(init.body))).toEqual({
      format: envelope.format,
      deploymentVersion: "6",
      chainIds: [1],
      jb: envelope.jb,
    });
  });

  test("publishes, fetches, searches, and records deployments", async () => {
    const deployment = {
      chainId: 1,
      projectId: "42",
      transactionHash: hash,
      createdAt: "2026-08-22T00:01:00.000Z",
    };
    const page = {
      items: [
        {
          source: "jbcenter",
          status: "undeployed",
          intentId: intent().id,
          contentHash: hash,
          format: envelope.format,
          deploymentVersion: "6",
          chainIds: [1],
          publisher: address,
          createdAt: intent().createdAt,
          name: "Example",
          description: null,
          tagline: null,
          tags: [],
          logoUri: null,
          owner: address,
        },
      ],
      totalCount: 1,
      nextCursor: null,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(intent()))
      .mockResolvedValueOnce(jsonResponse(intent()))
      .mockResolvedValueOnce(jsonResponse(page))
      .mockResolvedValueOnce(jsonResponse(deployment));
    const client = createJBCenterClient({ apiKey: "secret", fetch: fetchMock });

    await expect(
      client.publishIntent({
        ...envelope,
        publisher: address,
        signature,
      }),
    ).resolves.toEqual(intent());
    await expect(client.getIntent(intent().id)).resolves.toEqual(intent());
    await expect(
      client.searchIntents({ query: "public goods", limit: 20, cursor: "40" }),
    ).resolves.toEqual(page);
    await expect(
      client.recordDeployment(intent().id, {
        chainId: 1,
        projectId: "42",
        transactionHash: hash,
      }),
    ).resolves.toEqual(deployment);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://juicebox.center/v1/intents",
      `https://juicebox.center/v1/intents/${intent().id}`,
      "https://juicebox.center/v1/search?q=public+goods&limit=20&cursor=40",
      `https://juicebox.center/v1/intents/${intent().id}/deployments`,
    ]);
  });

  test("pins JSON and multipart content without forcing an authorization header", async () => {
    const pin = {
      cid: "QmNQLK1UW6k13Srgq6awEHiVVP82V5urfKENXBcbSstnzR",
      status: "queued",
      uri: "ipfs://QmNQLK1UW6k13Srgq6awEHiVVP82V5urfKENXBcbSstnzR",
      gatewayUrl: "/ipfs/QmNQLK1UW6k13Srgq6awEHiVVP82V5urfKENXBcbSstnzR",
    };
    const fetchMock = vi.fn().mockImplementation(() => jsonResponse(pin));
    const client = createJBCenterClient({ fetch: fetchMock });

    await expect(client.pinJson({ name: "Example" })).resolves.toEqual(pin);
    await expect(
      client.pinImage(new Blob(["image"], { type: "image/png" }), {
        filename: "logo.png",
      }),
    ).resolves.toEqual(pin);
    await expect(
      client.pinMedia(new Blob(["video"], { type: "video/mp4" }), {
        filename: "intro.mp4",
      }),
    ).resolves.toEqual(pin);

    for (const [, init] of fetchMock.mock.calls as [string, RequestInit][]) {
      expect(new Headers(init.headers).has("authorization")).toBe(false);
    }
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBeInstanceOf(FormData);
    const image = (fetchMock.mock.calls[1]?.[1]?.body as FormData).get("file");
    expect((image as File).name).toBe("logo.png");
    expect(fetchMock.mock.calls[2]?.[1]?.body).toBeInstanceOf(FormData);
  });

  test("surfaces structured API failures and rejects invalid successful responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          { error: { code: "rate_limit", message: "Slow down" } },
          {
            status: 429,
            headers: { "retry-after": "60", "x-request-id": "request-1" },
          },
        ),
      )
      .mockResolvedValueOnce(jsonResponse({ wrong: true }));
    const client = createJBCenterClient({ fetch: fetchMock });

    await expect(client.searchIntents()).rejects.toMatchObject({
      name: "JBCenterRequestError",
      message: "Slow down",
      status: 429,
      code: "rate_limit",
      requestId: "request-1",
      retryAfter: 60,
    });
    await expect(client.searchIntents()).rejects.toMatchObject({
      status: 502,
      message: "JB Center returned an invalid response",
    });
  });

  test("fails closed on malformed, empty, and oversized transport responses", async () => {
    const streamedOversize = new Response(JSON.stringify({ value: "large" }), {
      headers: { "content-type": "application/json" },
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("html", { headers: { "content-type": "text/html" } }),
      )
      .mockResolvedValueOnce(
        new Response("{", { headers: { "content-type": "application/json" } }),
      )
      .mockResolvedValueOnce(
        new Response(null, { headers: { "content-type": "application/json" } }),
      )
      .mockResolvedValueOnce(streamedOversize)
      .mockResolvedValueOnce(jsonResponse({}, { status: 500 }));
    const client = createJBCenterClient({
      fetch: fetchMock,
      maxResponseBytes: 10,
    });

    await expect(client.searchIntents()).rejects.toThrow("content type");
    await expect(client.searchIntents()).rejects.toThrow("invalid JSON");
    await expect(client.searchIntents()).rejects.toThrow("empty response");
    await expect(client.searchIntents()).rejects.toThrow("size limit");
    await expect(client.searchIntents()).rejects.toMatchObject({
      status: 500,
      message: "JB Center request failed (500)",
      code: undefined,
      retryAfter: undefined,
    });
  });

  test("bounds response bodies and distinguishes timeouts from caller cancellation", async () => {
    const oversized = jsonResponse(
      { items: [], totalCount: 0, nextCursor: null },
      { headers: { "content-length": "100" } },
    );
    await expect(
      createJBCenterClient({
        fetch: vi.fn().mockResolvedValue(oversized),
        maxResponseBytes: 10,
      }).searchIntents(),
    ).rejects.toBeInstanceOf(JBCenterRequestError);

    const hang = (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        if (init?.signal?.aborted) {
          reject(init.signal.reason);
          return;
        }
        init?.signal?.addEventListener("abort", () =>
          reject(init.signal?.reason),
        );
      });
    await expect(
      createJBCenterClient({
        fetch: vi.fn().mockImplementation(hang),
      }).searchIntents({}, { timeoutMs: 5 }),
    ).rejects.toBeInstanceOf(JBCenterTimeoutError);

    const cancelled = new AbortController();
    cancelled.abort(new DOMException("cancelled", "AbortError"));
    await expect(
      createJBCenterClient({
        fetch: vi.fn().mockImplementation(hang),
      }).searchIntents({}, { signal: cancelled.signal }),
    ).rejects.toHaveProperty("name", "AbortError");

    await expect(
      createJBCenterClient({ fetch: vi.fn() }).searchIntents(
        {},
        { timeoutMs: 0 },
      ),
    ).rejects.toThrow("timeoutMs");
  });

  test("validates client resource and endpoint options", () => {
    expect(() =>
      createJBCenterClient({ baseUrl: "ftp://example.com" }),
    ).toThrow("HTTP or HTTPS");
    expect(() => createJBCenterClient({ apiKey: "" })).toThrow("apiKey");
    expect(() => createJBCenterClient({ apiKey: "   " })).toThrow("apiKey");
    expect(() =>
      createJBCenterClient({ baseUrl: "https://user@example.com" }),
    ).toThrow("credentials");
    expect(() =>
      createJBCenterClient({
        baseUrl: "http://example.com",
        apiKey: "secret",
      }),
    ).toThrow("requires HTTPS");
    expect(
      createJBCenterClient({
        baseUrl: "http://localhost:3000",
        apiKey: "secret",
      }).baseUrl,
    ).toBe("http://localhost:3000");
    expect(() => createJBCenterClient({ maxResponseBytes: 0 })).toThrow(
      "maxResponseBytes",
    );
    expect(() => createJBCenterClient({ timeoutMs: 0 })).toThrow("timeoutMs");
  });
});
