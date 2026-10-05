import { afterEach, describe, expect, test, vi } from "vitest";
import { createPublicClient, custom, encodeFunctionData, erc20Abi } from "viem";
import { base } from "viem/chains";
import {
  JBCENTER_BLOCK_LAG_RETRY_DELAYS_MS,
  JBCENTER_DEFAULT_URL,
  JBCENTER_SPONSORED_CHAIN_IDS,
  JBCenterRequestError,
  JBCenterRpcError,
  JBCenterTimeoutError,
  createJBCenterClient,
  createJBCenterDeploymentCall,
  createJBCenterRpcProvider,
  isSponsorable,
  sponsorableChains,
  unsponsoredChains,
  type JBCenterRpcRequest,
} from "./jbcenter.js";
import {
  SAFE_CREATE_ABI,
  SAFE_FACTORY,
  SAFE_SINGLETON,
  buildSafeInitializer,
} from "./safe.js";

const hash = `0x${"12".repeat(32)}` as const;
const signature = `0x${"34".repeat(65)}` as const;
const address = `0x${"56".repeat(20)}` as const;
const envelope = {
  format: "juicebox.money/v1",
  deploymentVersion: "6",
  chainIds: [1],
  deploymentCalls: [{ chainId: 1, to: address, data: "0x12345678" as const }],
  jb: { name: "Example", chains: [1] },
};
const intentInput = {
  format: envelope.format,
  deploymentVersion: envelope.deploymentVersion,
  chainIds: envelope.chainIds,
  deploymentCalls: envelope.deploymentCalls,
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
    deploys: [],
    name: "Example",
    description: null,
    tagline: null,
    tags: [],
    logoUri: null,
    owner: address,
  } as const;
}

describe("JB Center client", () => {
  test("binds the default browser fetch to the global receiver", async () => {
    const fetchMock = vi.fn(function (this: unknown) {
      if (this !== globalThis) throw new TypeError("Illegal invocation");
      return Promise.resolve(
        jsonResponse({ contentHash: hash, message: "sign me", envelope }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    try {
      await expect(
        createJBCenterClient().prepareIntent(intentInput),
      ).resolves.toMatchObject({ contentHash: hash });
      expect(fetchMock).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("uses the canonical endpoint and prepares an intent for wallet signing", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ contentHash: hash, message: "sign me", envelope }),
      );
    const client = createJBCenterClient({ fetch: fetchMock });

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
    expect(new Headers(init.headers).has("authorization")).toBe(false);
    expect(new Headers(init.headers).get("content-type")).toBe(
      "application/json",
    );
    expect(JSON.parse(String(init.body))).toEqual({
      format: envelope.format,
      deploymentVersion: "6",
      chainIds: [1],
      deploymentCalls: envelope.deploymentCalls,
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
    const client = createJBCenterClient({ fetch: fetchMock });

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

  test("filters search by owner and publisher", async () => {
    const page = { items: [], totalCount: 0, nextCursor: null };
    // A fresh Response per call: Response bodies are single-use streams, and
    // this test drives three sequential fetches through the same mock.
    const fetchMock = vi.fn().mockImplementation(() => jsonResponse(page));
    const client = createJBCenterClient({ fetch: fetchMock });

    await expect(
      client.searchIntents({ owner: address, publisher: address }),
    ).resolves.toEqual(page);
    await expect(
      client.searchIntents({
        query: "public goods",
        limit: 20,
        cursor: "40",
        owner: address,
        publisher: address,
      }),
    ).resolves.toEqual(page);
    await expect(client.searchIntents({ owner: address })).resolves.toEqual(
      page,
    );

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `https://juicebox.center/v1/search?owner=${address}&publisher=${address}`,
      `https://juicebox.center/v1/search?q=public+goods&limit=20&cursor=40&owner=${address}&publisher=${address}`,
      `https://juicebox.center/v1/search?owner=${address}`,
    ]);
  });

  test("freezes typed viem contract requests into signed deployment calls", () => {
    const abi = [
      {
        type: "function",
        name: "launch",
        stateMutability: "payable",
        inputs: [{ name: "projectId", type: "uint256" }],
        outputs: [],
      },
    ] as const;
    expect(
      createJBCenterDeploymentCall({
        chainId: 1,
        address,
        abi,
        functionName: "launch",
        args: [42n],
      }),
    ).toEqual({
      chainId: 1,
      to: address,
      data: encodeFunctionData({ abi, functionName: "launch", args: [42n] }),
    });
  });

  test("rejects incomplete intent envelopes", async () => {
    const incomplete = {
      ...intent(),
      envelope: {
        format: envelope.format,
        deploymentVersion: envelope.deploymentVersion,
        chainIds: envelope.chainIds,
        jb: envelope.jb,
      },
    } as const;
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(incomplete));
    const client = createJBCenterClient({ fetch: fetchMock });

    await expect(client.getIntent(incomplete.id)).rejects.toMatchObject({
      status: 502,
      message: "JB Center returned an invalid response",
    });
  });

  test("rejects an intent whose envelope names no chains", async () => {
    const empty = {
      ...intent(),
      envelope: { ...envelope, chainIds: [], deploymentCalls: [] },
    };
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(empty));
    const client = createJBCenterClient({ fetch: fetchMock });

    await expect(client.getIntent(empty.id)).rejects.toMatchObject({
      status: 502,
      message: "JB Center returned an invalid response",
    });
  });

  const setupData = encodeFunctionData({
    abi: SAFE_CREATE_ABI,
    functionName: "createProxyWithNonce",
    args: [
      SAFE_SINGLETON,
      buildSafeInitializer({
        owners: ["0x0000000000000000000000000000000000000002"],
        threshold: 1,
      }),
      7n,
    ],
  });

  test("accepts an intent whose chain sets up Safes before it launches", async () => {
    const withSetup = {
      ...intent(),
      envelope: {
        ...envelope,
        deploymentCalls: [
          { chainId: 1, to: SAFE_FACTORY, data: setupData },
          ...envelope.deploymentCalls,
        ],
      },
    };
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(withSetup));
    const client = createJBCenterClient({ fetch: fetchMock });

    await expect(client.getIntent(withSetup.id)).resolves.toMatchObject({
      envelope: { deploymentCalls: withSetup.envelope.deploymentCalls },
    });
  });

  test("rejects a setup call that is not a canonical Safe creation", async () => {
    const wrongTarget = {
      ...intent(),
      envelope: {
        ...envelope,
        deploymentCalls: [
          { chainId: 1, to: address, data: setupData },
          ...envelope.deploymentCalls,
        ],
      },
    };
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(wrongTarget));
    const client = createJBCenterClient({ fetch: fetchMock });

    await expect(client.getIntent(wrongTarget.id)).rejects.toMatchObject({
      status: 502,
      message: "JB Center returned an invalid response",
    });
  });

  test("rejects a chain carrying five calls", async () => {
    const tooMany = {
      ...intent(),
      envelope: {
        ...envelope,
        deploymentCalls: [
          { chainId: 1, to: SAFE_FACTORY, data: setupData },
          { chainId: 1, to: SAFE_FACTORY, data: setupData },
          { chainId: 1, to: SAFE_FACTORY, data: setupData },
          { chainId: 1, to: SAFE_FACTORY, data: setupData },
          ...envelope.deploymentCalls,
        ],
      },
    };
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(tooMany));
    const client = createJBCenterClient({ fetch: fetchMock });

    await expect(client.getIntent(tooMany.id)).rejects.toMatchObject({
      status: 502,
      message: "JB Center returned an invalid response",
    });
  });

  test("rejects a chain with no call of its own", async () => {
    const missing = {
      ...intent(),
      envelope: {
        ...envelope,
        chainIds: [1, 10],
        deploymentCalls: [
          { chainId: 1, to: SAFE_FACTORY, data: setupData },
          ...envelope.deploymentCalls,
        ],
      },
    };
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(missing));
    const client = createJBCenterClient({ fetch: fetchMock });

    await expect(client.getIntent(missing.id)).rejects.toMatchObject({
      status: 502,
      message: "JB Center returned an invalid response",
    });
  });

  test("rejects an intent id that is not a UUID", async () => {
    const renamed = { ...intent(), id: "../../etc/passwd" };
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(renamed));
    const client = createJBCenterClient({ fetch: fetchMock });

    await expect(client.getIntent(renamed.id)).rejects.toMatchObject({
      status: 502,
      message: "JB Center returned an invalid response",
    });
  });

  test("rejects a deployment whose projectId is not a decimal number", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        chainId: 8453,
        projectId: "0x2a",
        transactionHash: hash,
        createdAt: "2026-09-21T00:00:00.000Z",
      }),
    );
    const client = createJBCenterClient({ fetch: fetchMock });

    await expect(
      client.recordDeployment(intent().id, {
        chainId: 8453,
        projectId: "42",
        transactionHash: hash,
      }),
    ).rejects.toMatchObject({
      status: 502,
      message: "JB Center returned an invalid response",
    });
  });

  test("requestDeploy returns the queued rows", async () => {
    const deploys = [
      {
        chainId: 84532,
        status: "queued",
        transactionHash: null,
        bundleUuid: null,
        error: null,
        createdAt: "2026-09-21T00:00:00.000Z",
        updatedAt: "2026-09-21T00:00:00.000Z",
      },
    ];
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ deploys }, { status: 202 }));

    await expect(
      createJBCenterClient({ fetch: fetchMock }).requestDeploy(intent().id),
    ).resolves.toEqual({ deploys });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `https://juicebox.center/v1/intents/${intent().id}/deploy`,
    );
    expect(init.method).toBe("POST");
  });

  test("sponsorable chain sets", () => {
    expect(isSponsorable([8453, 10])).toBe(true);
    expect(isSponsorable([1, 8453])).toBe(false);
    expect(isSponsorable([])).toBe(false);
    expect(JBCENTER_SPONSORED_CHAIN_IDS).toContain(84532);
  });

  test("accepts a non-empty deploys list on getIntent", async () => {
    const deploy = {
      chainId: 8453,
      status: "confirmed",
      transactionHash: hash,
      bundleUuid: "1c2d3e4f",
      error: null,
      createdAt: "2026-09-21T00:00:00.000Z",
      updatedAt: "2026-09-21T00:00:01.000Z",
    };
    const withDeploys = { ...intent(), deploys: [deploy] };
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(withDeploys));
    const client = createJBCenterClient({ fetch: fetchMock });

    await expect(client.getIntent(intent().id)).resolves.toEqual(withDeploys);
  });

  test("rejects a malformed deploy row on getIntent", async () => {
    const malformed = {
      ...intent(),
      deploys: [{ chainId: 8453, status: "queued" }],
    };
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(malformed));
    const client = createJBCenterClient({ fetch: fetchMock });

    await expect(client.getIntent(intent().id)).rejects.toMatchObject({
      status: 502,
      message: "JB Center returned an invalid response",
    });
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

  test("routes typed read-only RPC requests through JB Center", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ jsonrpc: "2.0", id: 1, result: "0x1" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ jsonrpc: "2.0", id: 2, result: "0x1234" }),
      );
    const client = createJBCenterClient({ fetch: fetchMock });

    await expect(
      client.rpc<string>(1, { method: "eth_chainId" }),
    ).resolves.toBe("0x1");
    await expect(
      client.rpc<string>(1, {
        method: "eth_call",
        params: [{ to: address, data: "0x" }, "latest"],
      }),
    ).resolves.toBe("0x1234");

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://juicebox.center/v1/rpc/1",
      "https://juicebox.center/v1/rpc/1",
    ]);
    const firstInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(firstInit.headers).has("authorization")).toBe(false);
    expect(JSON.parse(String(firstInit.body))).toEqual({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_chainId",
    });
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      jsonrpc: "2.0",
      id: 2,
      method: "eth_call",
      params: [{ to: address, data: "0x" }, "latest"],
    });
  });

  test.each(["client", "provider"] as const)(
    "forwards eth_simulateV1 through the %s without changing the reviewed calls",
    async (surface) => {
      const result = [
        { calls: [{ status: "0x1", returnData: "0x", logs: [] }] },
      ];
      const fetchMock = vi
        .fn()
        .mockResolvedValue(jsonResponse({ jsonrpc: "2.0", id: 1, result }));
      const request = {
        method: "eth_simulateV1" as const,
        params: [
          {
            blockStateCalls: [
              {
                calls: [
                  { from: address, to: address, data: "0x", value: "0x0" },
                ],
              },
            ],
            validation: false,
          },
          "0x123",
        ],
      };
      const response =
        surface === "client"
          ? createJBCenterClient({ fetch: fetchMock }).rpc(8453, request)
          : createJBCenterRpcProvider(8453, { fetch: fetchMock }).request(
              request,
            );
      await expect(response).resolves.toEqual(result);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0]?.[0]).toBe(
        "https://juicebox.center/v1/rpc/8453",
      );
      expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
        jsonrpc: "2.0",
        id: 1,
        ...request,
      });
    },
  );

  test.each([
    "eth_sendTransaction",
    "eth_sendRawTransaction",
    "debug_traceCall",
    "wallet_sendCalls",
  ])("still rejects %s before making a network request", async (method) => {
    const fetchMock = vi.fn();
    const provider = createJBCenterRpcProvider(8453, { fetch: fetchMock });
    await expect(provider.request({ method, params: [] })).rejects.toThrow(
      "not supported",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("surfaces RPC errors and rejects malformed envelopes", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          jsonrpc: "2.0",
          id: 1,
          error: { code: -32000, message: "RPC request failed", data: "0x12" },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ jsonrpc: "2.0", id: 999, result: "0x1" }),
      );
    const client = createJBCenterClient({ fetch: fetchMock });

    await expect(client.rpc(1, { method: "eth_call" })).rejects.toMatchObject({
      name: "JBCenterRpcError",
      code: -32000,
      message: "RPC request failed",
      data: "0x12",
    });
    await expect(
      client.rpc(1, { method: "eth_chainId" }),
    ).rejects.toMatchObject({
      name: "JBCenterRequestError",
      status: 502,
    });
    expect(new JBCenterRpcError(-32000, "RPC request failed")).toBeInstanceOf(
      Error,
    );
  });

  test("exposes an EIP-1193-shaped provider and fails locally on unsupported methods", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ jsonrpc: "2.0", id: 1, result: "0x1" }),
      );
    const provider = createJBCenterRpcProvider(1, { fetch: fetchMock });
    expect(custom(provider)).toBeTypeOf("function");

    await expect(
      provider.request<string>({ method: "eth_chainId" }),
    ).resolves.toBe("0x1");
    await expect(
      provider.request({ method: "eth_sendRawTransaction", params: ["0x"] }),
    ).rejects.toThrow("not supported");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    expect(() => createJBCenterRpcProvider(0)).toThrow("chainId");
    await expect(
      createJBCenterClient().rpc(1.5, { method: "eth_chainId" }),
    ).rejects.toThrow("chainId");
  });

  test("refuses an unsupported method or params that are not a list before making a network request", async () => {
    const fetchMock = vi.fn();
    const client = createJBCenterClient({ fetch: fetchMock });
    await expect(
      client.rpc(1, {
        method: "eth_sendRawTransaction",
        params: ["0x"],
      } as unknown as JBCenterRpcRequest),
    ).rejects.toThrow(new TypeError("JB Center RPC method is not supported"));
    await expect(
      client.rpc(1, {
        method: "eth_call",
        params: "0x",
      } as unknown as JBCenterRpcRequest),
    ).rejects.toThrow(new TypeError("JB Center RPC params must be an array"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("ends a provider request in flight when the signal viem passes it aborts", async () => {
    let sent: AbortSignal | undefined;
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          sent = init?.signal ?? undefined;
          init?.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason),
          );
        }),
    );
    const provider = createJBCenterRpcProvider(1, {
      fetch: fetchMock,
      timeoutMs: 1_000,
    });
    const page = new AbortController();
    const reason = new DOMException("The page closed.", "AbortError");
    // viem 2.55's custom transport calls request(args, { signal }).
    const pending = provider.request(
      { method: "eth_chainId" },
      { signal: page.signal },
    );
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(sent?.aborted).toBe(false);
    page.abort(reason);
    await expect(pending).rejects.toBe(reason);
    expect(sent?.aborted).toBe(true);
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

  test("reads a rate limit's Retry-After as the Safe service does, in whole seconds", async () => {
    vi.useFakeTimers();
    // Monday 5 October 2026, 12:00:00.400 UTC.
    vi.setSystemTime(Date.UTC(2026, 9, 5, 12, 0, 0, 400));
    try {
      for (const [retryAfter, seconds] of [
        ["60", 60],
        ["0", 0],
        ["Mon, 05 Oct 2026 12:00:30 GMT", 30],
        ["Monday, 05-Oct-26 12:00:30 GMT", 30],
        ["Mon, 05 Oct 2026 11:00:00 GMT", 0],
        ["", undefined],
        ["1e3", undefined],
        ["1.5", undefined],
        ["-1", undefined],
        ["soon", undefined],
      ] as const) {
        const fetchMock = vi
          .fn()
          .mockResolvedValue(
            jsonResponse(
              { error: { code: "rate_limit", message: "Slow down" } },
              { status: 429, headers: { "retry-after": retryAfter } },
            ),
          );
        await expect(
          createJBCenterClient({ fetch: fetchMock }).searchIntents(),
        ).rejects.toMatchObject({ status: 429, retryAfter: seconds });
      }
    } finally {
      vi.useRealTimers();
    }
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
    expect(() =>
      createJBCenterClient({ baseUrl: "https://user@example.com" }),
    ).toThrow("credentials");
    expect(
      createJBCenterClient({
        baseUrl: "http://localhost:3000",
      }).baseUrl,
    ).toBe("http://localhost:3000");
    expect(() => createJBCenterClient({ maxResponseBytes: 0 })).toThrow(
      "maxResponseBytes",
    );
    expect(() => createJBCenterClient({ timeoutMs: 0 })).toThrow("timeoutMs");
  });

  test("splits a chain list into the sponsored and the unsponsored", () => {
    expect(sponsorableChains([1, 8453, 10, 137])).toEqual([8453, 10]);
    expect(unsponsoredChains([1, 8453, 10, 137])).toEqual([1, 137]);
    expect(sponsorableChains([])).toEqual([]);
    expect(unsponsoredChains([])).toEqual([]);
    // The order given is the order returned, so a deploy body reads like the
    // intent it came from.
    expect(sponsorableChains([42161, 8453])).toEqual([42161, 8453]);
  });

  test("requestDeploy sends no body when it asks for every chain", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ deploys: [] }, { status: 202 }));

    await createJBCenterClient({ fetch: fetchMock }).requestDeploy(intent().id);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBeUndefined();
  });

  test("requestDeploy names a subset of chains in its body", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ deploys: [] }, { status: 202 }));

    await createJBCenterClient({ fetch: fetchMock }).requestDeploy(
      intent().id,
      { chainIds: [8453, 10] },
    );

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `https://juicebox.center/v1/intents/${intent().id}/deploy`,
    );
    expect(init.body).toBe(JSON.stringify({ chainIds: [8453, 10] }));
    expect(new Headers(init.headers).get("Content-Type")).toBe(
      "application/json",
    );
  });

  test("requestDeploy treats an empty chain list as every chain", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ deploys: [] }, { status: 202 }));

    await createJBCenterClient({ fetch: fetchMock }).requestDeploy(
      intent().id,
      { chainIds: [] },
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBeUndefined();
  });

  const forwarder = `0x${"78".repeat(20)}` as const;

  function relayBody(overrides: Record<string, unknown> = {}) {
    return {
      chainId: 1,
      to: forwarder,
      data: "0xabcdef01",
      value: "1000000000000000",
      gas: "2500000",
      deadline: 1_790_000_000,
      setup: [],
      ...overrides,
    };
  }

  test("requestRelay parses the signed forward request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        relayBody({
          setup: [{ to: address, data: "0x12345678", value: "0" }],
        }),
      ),
    );

    await expect(
      createJBCenterClient({ fetch: fetchMock }).requestRelay(intent().id, 1),
    ).resolves.toEqual({
      chainId: 1,
      to: forwarder,
      data: "0xabcdef01",
      value: 1_000_000_000_000_000n,
      gas: 2_500_000n,
      deadline: 1_790_000_000,
      setup: [{ to: address, data: "0x12345678", value: 0n }],
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`https://juicebox.center/v1/intents/${intent().id}/relay`);
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ chainId: 1 }));
  });

  test("requestRelay refuses a chain id that is not a positive integer", async () => {
    const fetchMock = vi.fn();
    const client = createJBCenterClient({ fetch: fetchMock });

    await expect(client.requestRelay(intent().id, 0)).rejects.toBeInstanceOf(
      TypeError,
    );
    await expect(client.requestRelay(intent().id, 1.5)).rejects.toBeInstanceOf(
      TypeError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test.each<[string, Record<string, unknown>]>([
    ["another chain", { chainId: 10 }],
    ["no target", { to: "not-an-address" }],
    ["calldata shorter than a selector", { data: "0x1234" }],
    ["a value that is not decimal", { value: "0x10" }],
    ["a signed value", { value: "-1" }],
    ["a padded value", { value: "0100" }],
    ["no gas", { gas: "0" }],
    ["a fractional deadline", { deadline: 1.5 }],
    ["a deadline of zero", { deadline: 0 }],
    ["setup that is not an array", { setup: {} }],
    ["no setup at all", { setup: undefined }],
    [
      "a setup call with no target",
      { setup: [{ data: "0x12345678", value: "0" }] },
    ],
    [
      "a setup call with a bad value",
      { setup: [{ to: address, data: "0x12345678", value: "zero" }] },
    ],
    [
      "a setup call that asks for value",
      { setup: [{ to: address, data: "0x12345678", value: "1" }] },
    ],
  ])("requestRelay rejects a response with %s", async (_label, overrides) => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(relayBody(overrides)));

    await expect(
      createJBCenterClient({ fetch: fetchMock }).requestRelay(intent().id, 1),
    ).rejects.toMatchObject({
      status: 502,
      message: "JB Center returned an invalid response",
    });
  });
});

describe("JB Center answers and defaults", () => {
  test("accepts written metadata, a deployed intent, a failed deploy's error and a next-page cursor", async () => {
    const written = {
      description: "Funds public goods.",
      tagline: "For everyone",
      logoUri: "ipfs://QmNQLK1UW6k13Srgq6awEHiVVP82V5urfKENXBcbSstnzR",
      owner: null,
    };
    const deployed = {
      ...intent(),
      ...written,
      status: "deployed",
      deploys: [
        {
          chainId: 8453,
          status: "failed",
          transactionHash: null,
          bundleUuid: null,
          error: "The launch reverted.",
          createdAt: "2026-09-21T00:00:00.000Z",
          updatedAt: "2026-09-21T00:00:01.000Z",
        },
      ],
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
          tags: ["goods"],
          ...written,
        },
      ],
      totalCount: 21,
      nextCursor: "20",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(deployed))
      .mockResolvedValueOnce(jsonResponse(page));
    const client = createJBCenterClient({ fetch: fetchMock });

    await expect(client.getIntent(intent().id)).resolves.toEqual(deployed);
    await expect(client.searchIntents({ query: "goods" })).resolves.toEqual(
      page,
    );
  });

  test("refuses an RPC answer with both a result and an error, or neither", async () => {
    for (const answer of [
      { jsonrpc: "2.0", id: 1 },
      {
        jsonrpc: "2.0",
        id: 1,
        result: "0x1",
        error: { code: -32000, message: "RPC request failed" },
      },
    ]) {
      await expect(
        createJBCenterClient({
          fetch: vi.fn().mockResolvedValue(jsonResponse(answer)),
        }).rpc(1, { method: "eth_chainId" }),
      ).rejects.toMatchObject({
        status: 502,
        message: "JB Center returned an invalid response",
      });
    }
  });

  test("numbers RPC requests from 1 again after the largest safe integer", async () => {
    const fetchMock = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) => {
        const { id } = JSON.parse(String(init?.body)) as { id: number };
        return jsonResponse({ jsonrpc: "2.0", id, result: "0x1" });
      },
    );
    const client = createJBCenterClient({ fetch: fetchMock });
    (client as unknown as { nextRpcId: number }).nextRpcId =
      Number.MAX_SAFE_INTEGER;

    await client.rpc(1, { method: "eth_chainId" });
    await client.rpc(1, { method: "eth_chainId" });
    expect(
      fetchMock.mock.calls.map(
        ([, init]) => (JSON.parse(String(init?.body)) as { id: number }).id,
      ),
    ).toEqual([Number.MAX_SAFE_INTEGER, 1]);
  });

  test("pins with the caller's timeout, and names a file after itself or its kind", async () => {
    const hang = (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(init.signal?.reason),
        );
      });
    await expect(
      createJBCenterClient({ fetch: vi.fn(hang) }).pinJson(
        { name: "Example" },
        { timeoutMs: 5 },
      ),
    ).rejects.toMatchObject({ name: "JBCenterTimeoutError", timeoutMs: 5 });

    const pin = {
      cid: "QmNQLK1UW6k13Srgq6awEHiVVP82V5urfKENXBcbSstnzR",
      status: "queued",
      uri: "ipfs://QmNQLK1UW6k13Srgq6awEHiVVP82V5urfKENXBcbSstnzR",
      gatewayUrl: "/ipfs/QmNQLK1UW6k13Srgq6awEHiVVP82V5urfKENXBcbSstnzR",
    };
    const fetchMock = vi.fn().mockImplementation(() => jsonResponse(pin));
    const client = createJBCenterClient({ fetch: fetchMock });
    await client.pinImage(new File(["image"], "logo.png"));
    await client.pinImage(new Blob(["image"]));
    await client.pinMedia(new Blob(["video"]));
    expect(
      fetchMock.mock.calls.map(([, init]) =>
        ((init as RequestInit).body as FormData).get("file"),
      ),
    ).toMatchObject([
      { name: "logo.png" },
      { name: "image" },
      { name: "media" },
    ]);
  });

  test("reports an error answer that is not a record by its status", async () => {
    for (const body of [["unexpected"], "down", null]) {
      await expect(
        createJBCenterClient({
          fetch: vi.fn().mockResolvedValue(jsonResponse(body, { status: 500 })),
        }).getIntent(intent().id),
      ).rejects.toMatchObject({
        name: "JBCenterRequestError",
        status: 500,
        message: "JB Center request failed (500)",
        code: undefined,
      });
    }
  });
});

/** The id of the JSON-RPC request a fetch to JB Center sends. */
function rpcId(init: RequestInit | undefined): number {
  return (JSON.parse(String(init?.body)) as { id: number }).id;
}

/** Center's answer to one JSON-RPC request. */
function rpcResult(id: number, result: unknown): Response {
  return jsonResponse({ jsonrpc: "2.0", id, result });
}

/** A node behind the head, asked for a block it has not imported yet. */
function behindHead(id: number): Response {
  return jsonResponse({
    jsonrpc: "2.0",
    id,
    error: { code: -32001, message: "Requested resource not found" },
  });
}

describe("JB Center RPC provider and a node behind the head", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("asks again for a read pinned to a block the answering node has not imported yet", async () => {
    let calls = 0;
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        calls += 1;
        return calls <= 2
          ? behindHead(rpcId(init))
          : rpcResult(rpcId(init), "0x2a");
      },
    );
    const provider = createJBCenterRpcProvider(8453, {
      fetch: fetchMock,
      blockLagRetryDelaysMs: [0, 0, 0],
    });

    await expect(
      provider.request({ method: "eth_call", params: [{}, "0x64"] }),
    ).resolves.toBe("0x2a");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test("hands back the node's answer once the waits are spent", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) =>
        behindHead(rpcId(init)),
    );
    const provider = createJBCenterRpcProvider(8453, {
      fetch: fetchMock,
      blockLagRetryDelaysMs: [0, 0],
    });

    await expect(
      provider.request({ method: "eth_call" }),
    ).rejects.toMatchObject({ name: "JBCenterRpcError", code: -32001 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test("waits 250, 500, 1,000, 2,000 and 2,000 ms by default", async () => {
    vi.useFakeTimers();
    const start = Date.now();
    const sentAt: number[] = [];
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        sentAt.push(Date.now() - start);
        return behindHead(rpcId(init));
      },
    );
    const read = createJBCenterRpcProvider(8453, { fetch: fetchMock })
      .request({ method: "eth_call" })
      .catch((error: unknown) => error);

    await vi.advanceTimersByTimeAsync(5_749);
    expect(sentAt).toEqual([0, 250, 750, 1_750, 3_750]);
    await vi.advanceTimersByTimeAsync(1);
    expect(sentAt).toEqual([0, 250, 750, 1_750, 3_750, 5_750]);
    expect(await read).toMatchObject({ code: -32001 });
    expect(JBCENTER_BLOCK_LAG_RETRY_DELAYS_MS).toEqual([
      250, 500, 1_000, 2_000, 2_000,
    ]);
  });

  test("never asks again after a revert, any other RPC error, a refusal or a timeout", async () => {
    const answers: ((id: number) => Response)[] = [
      (id) =>
        jsonResponse({
          jsonrpc: "2.0",
          id,
          error: { code: 3, message: "execution reverted", data: "0x" },
        }),
      (id) =>
        jsonResponse({
          jsonrpc: "2.0",
          id,
          error: { code: -32000, message: "header not found" },
        }),
      () =>
        jsonResponse(
          { error: { code: "rate_limit", message: "Slow down" } },
          { status: 429, headers: { "retry-after": "60" } },
        ),
    ];
    for (const answer of answers) {
      const fetchMock = vi.fn(
        async (_input: RequestInfo | URL, init?: RequestInit) =>
          answer(rpcId(init)),
      );
      await expect(
        createJBCenterRpcProvider(1, {
          fetch: fetchMock,
          blockLagRetryDelaysMs: [0],
        }).request({ method: "eth_call" }),
      ).rejects.toBeInstanceOf(Error);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }

    const hang = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) =>
          init?.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason),
          ),
        ),
    );
    await expect(
      createJBCenterRpcProvider(1, {
        fetch: hang,
        timeoutMs: 5,
        blockLagRetryDelaysMs: [0],
      }).request({ method: "eth_call" }),
    ).rejects.toBeInstanceOf(JBCenterTimeoutError);
    expect(hang).toHaveBeenCalledTimes(1);
  });

  test("keeps `rpc` to one request: a node behind the head is its caller's to wait out", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) =>
        behindHead(rpcId(init)),
    );
    await expect(
      createJBCenterClient({ fetch: fetchMock }).rpc(1, { method: "eth_call" }),
    ).rejects.toMatchObject({ code: -32001 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("passes the caller's request options, signal included, to every try", async () => {
    const sent: AbortSignal[] = [];
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      sent.push(init!.signal!);
      if (sent.length === 1) return Promise.resolve(behindHead(rpcId(init)));
      return new Promise<Response>((_resolve, reject) =>
        init?.signal?.addEventListener("abort", () =>
          reject(init.signal?.reason),
        ),
      );
    });
    const client = createJBCenterClient({ fetch: fetchMock });
    const rpc = vi.spyOn(client, "rpc");
    const page = new AbortController();
    const options = { signal: page.signal };
    const read = client
      .rpcProvider(8453, { blockLagRetryDelaysMs: [0] })
      .request({ method: "eth_call" }, options);

    await vi.waitFor(() => expect(sent).toHaveLength(2));
    expect(rpc.mock.calls.map(([, , passed]) => passed)).toEqual([
      options,
      options,
    ]);
    expect(rpc.mock.calls[1]?.[2]).toBe(options);
    const reason = new DOMException("The page closed.", "AbortError");
    page.abort(reason);
    await expect(read).rejects.toBe(reason);
    expect(sent[1]?.aborted).toBe(true);
  });

  test("ends a wait between tries the moment the signal aborts, and asks no more", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) =>
        behindHead(rpcId(init)),
    );
    const page = new AbortController();
    const reason = new Error("left the page");
    const read = createJBCenterRpcProvider(8453, {
      fetch: fetchMock,
      blockLagRetryDelaysMs: [60_000],
    })
      .request({ method: "eth_call" }, { signal: page.signal })
      .catch((error: unknown) => error);

    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledOnce();
    page.abort(reason);

    expect(await read).toBe(reason);
    expect(vi.getTimerCount()).toBe(0);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  test("sends nothing for a signal that has already aborted", async () => {
    const fetchMock = vi.fn();
    const page = new AbortController();
    const reason = new Error("left the page");
    page.abort(reason);

    await expect(
      createJBCenterRpcProvider(8453, { fetch: fetchMock }).request(
        { method: "eth_call" },
        { signal: page.signal },
      ),
    ).rejects.toBe(reason);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("turns the retry off with no waits, and refuses a wait that is not a finite number of milliseconds", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) =>
        behindHead(rpcId(init)),
    );
    await expect(
      createJBCenterRpcProvider(1, {
        fetch: fetchMock,
        blockLagRetryDelaysMs: [],
      }).request({ method: "eth_call" }),
    ).rejects.toMatchObject({ code: -32001 });
    expect(fetchMock).toHaveBeenCalledOnce();

    for (const blockLagRetryDelaysMs of [
      [-1],
      [Number.NaN],
      [Number.POSITIVE_INFINITY],
      [250, "500"],
      250,
    ]) {
      expect(() =>
        createJBCenterClient().rpcProvider(1, {
          blockLagRetryDelaysMs: blockLagRetryDelaysMs as readonly number[],
        }),
      ).toThrow(
        new TypeError(
          "blockLagRetryDelaysMs must be a list of finite waits of 0 ms or more",
        ),
      );
    }
  });

  test("carries a pinned read through a lagging node on a viem client", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        calls += 1;
        return calls === 1
          ? behindHead(rpcId(init))
          : rpcResult(
              rpcId(init),
              `0x${1_000_000n.toString(16).padStart(64, "0")}`,
            );
      },
    );
    const client = createPublicClient({
      chain: base,
      transport: custom(
        createJBCenterRpcProvider(base.id, { fetch: fetchMock }),
      ),
    });

    const balance = client.readContract({
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      abi: erc20Abi,
      functionName: "balanceOf",
      args: ["0x000000000000000000000000000000000000dEaD"],
      blockNumber: 50_623_163n,
    });
    await vi.advanceTimersByTimeAsync(250);

    await expect(balance).resolves.toBe(1_000_000n);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
