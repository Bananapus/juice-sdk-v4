import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  JBCenterRequestError,
  createJBCenterClient,
  type JBCenterDeploymentCall,
  type JBCenterDeploymentInput,
  type JBCenterIntent,
  type JBCenterIntentDeploy,
  type JBCenterRelayRequest,
} from "../jbcenter.js";
import { EnsureDeployedError, ensureDeployed } from "./ensureDeployed.js";

const ADDRESS = "0x000000000000000000000000000000000000dEaD" as const;
const HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000001" as const;
const TX_HASH_1 =
  "0x1111111111111111111111111111111111111111111111111111111111111111" as const;
const TX_HASH_2 =
  "0x2222222222222222222222222222222222222222222222222222222222222222" as const;
const SIGNATURE = `0x${"34".repeat(65)}` as const;
const INTENT_ID = "31b158fc-6ac5-4a4d-9039-882b7eb0ef4b";

function jsonResponse(value: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  return new Response(JSON.stringify(value), { ...init, headers });
}

function call(chainId: number): JBCenterDeploymentCall {
  return { chainId, to: ADDRESS, data: "0x12345678" };
}

function deploy(
  chainId: number,
  status: JBCenterIntentDeploy["status"],
  transactionHash: JBCenterIntentDeploy["transactionHash"] = null,
): JBCenterIntentDeploy {
  return {
    chainId,
    status,
    transactionHash,
    bundleUuid: null,
    error: null,
    createdAt: "2026-09-21T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z",
  };
}

function intent(
  chainIds: number[],
  overrides: Partial<JBCenterIntent> = {},
): JBCenterIntent {
  return {
    id: INTENT_ID,
    status: "undeployed",
    contentHash: HASH,
    envelope: {
      format: "juicebox.money/v1",
      deploymentVersion: "6",
      chainIds,
      deploymentCalls: chainIds.map(call),
      jb: {},
    },
    publisher: ADDRESS,
    signature: SIGNATURE,
    createdAt: "2026-09-21T00:00:00.000Z",
    deployments: [],
    deploys: [],
    name: "Example",
    description: null,
    tagline: null,
    tags: [],
    logoUri: null,
    owner: ADDRESS,
    ...overrides,
  };
}

function deployUrl(id = INTENT_ID) {
  return `https://juicebox.center/v1/intents/${id}/deploy`;
}

function intentUrl(id = INTENT_ID) {
  return `https://juicebox.center/v1/intents/${id}`;
}

describe("ensureDeployed", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("returns immediately without fetching when the intent is already fully deployed", async () => {
    const fetchMock = vi.fn();
    const client = createJBCenterClient({ fetch: fetchMock });
    const deployed = intent([8453], {
      deployments: [
        {
          chainId: 8453,
          projectId: "12",
          transactionHash: HASH,
          createdAt: "",
        },
      ],
    });

    await expect(ensureDeployed({ client, intent: deployed })).resolves.toEqual(
      {
        8453: "12",
      },
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("sponsors the deploy and polls to completion across two polls", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          { deploys: [deploy(8453, "queued"), deploy(10, "queued")] },
          { status: 202 },
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          intent([8453, 10], {
            deploys: [deploy(8453, "sent"), deploy(10, "queued")],
          }),
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          intent([8453, 10], {
            deploys: [
              deploy(8453, "confirmed", TX_HASH_1),
              deploy(10, "confirmed", TX_HASH_2),
            ],
            deployments: [
              {
                chainId: 8453,
                projectId: "55",
                transactionHash: TX_HASH_1,
                createdAt: "",
              },
              {
                chainId: 10,
                projectId: "56",
                transactionHash: TX_HASH_2,
                createdAt: "",
              },
            ],
          }),
        ),
      );
    const client = createJBCenterClient({ fetch: fetchMock });
    const onStep = vi.fn();

    const promise = ensureDeployed({
      client,
      intent: intent([8453, 10]),
      onStep,
    });

    await vi.advanceTimersByTimeAsync(4_000);
    await vi.advanceTimersByTimeAsync(4_000);

    await expect(promise).resolves.toEqual({ 8453: "55", 10: "56" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toBe(deployUrl());
    expect(fetchMock.mock.calls[1][0]).toBe(intentUrl());
    expect(onStep.mock.calls.map((args) => args[0])).toEqual([
      { chainId: 8453, status: "queued", transactionHash: undefined },
      { chainId: 10, status: "queued", transactionHash: undefined },
      { chainId: 8453, status: "sent", transactionHash: undefined },
      { chainId: 8453, status: "confirmed", transactionHash: TX_HASH_1 },
      { chainId: 10, status: "confirmed", transactionHash: TX_HASH_2 },
    ]);
  });

  test("cleans up its abort listener when a poll wait completes on a signal that never aborts", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ deploys: [deploy(8453, "queued")] }, { status: 202 }),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          intent([8453], {
            deploys: [deploy(8453, "confirmed", TX_HASH_1)],
            deployments: [
              {
                chainId: 8453,
                projectId: "55",
                transactionHash: TX_HASH_1,
                createdAt: "",
              },
            ],
          }),
        ),
      );
    const client = createJBCenterClient({ fetch: fetchMock });
    const controller = new AbortController();

    const promise = ensureDeployed({
      client,
      intent: intent([8453]),
      signal: controller.signal,
    });

    await vi.advanceTimersByTimeAsync(4_000);

    await expect(promise).resolves.toEqual({ 8453: "55" });
  });

  test("falls back to self-paid and records each deployment when the sponsor is rate limited", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          {
            error: { code: "sponsor_quota", message: "Sponsor quota exceeded" },
          },
          { status: 429 },
        ),
      )
      .mockResolvedValueOnce(jsonResponse(intent([8453, 10])))
      .mockResolvedValueOnce(
        jsonResponse({
          chainId: 8453,
          projectId: "55",
          transactionHash: TX_HASH_1,
          createdAt: "2026-09-21T00:00:00.000Z",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          chainId: 10,
          projectId: "56",
          transactionHash: TX_HASH_2,
          createdAt: "2026-09-21T00:00:00.000Z",
        }),
      );
    const client = createJBCenterClient({ fetch: fetchMock });
    const onStep = vi.fn();
    const deployments: JBCenterDeploymentInput[] = [
      { chainId: 8453, projectId: "55", transactionHash: TX_HASH_1 },
      { chainId: 10, projectId: "56", transactionHash: TX_HASH_2 },
    ];
    const selfPaid = vi.fn().mockResolvedValue(deployments);

    await expect(
      ensureDeployed({ client, intent: intent([8453, 10]), selfPaid, onStep }),
    ).resolves.toEqual({ 8453: "55", 10: "56" });

    expect(selfPaid).toHaveBeenCalledWith([call(8453), call(10)]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[1][0]).toBe(intentUrl());
    expect(fetchMock.mock.calls[2][0]).toBe(
      `https://juicebox.center/v1/intents/${INTENT_ID}/deployments`,
    );
    expect(onStep.mock.calls.map((args) => args[0])).toEqual([
      { chainId: 8453, status: "self-paid", transactionHash: TX_HASH_1 },
      { chainId: 10, status: "self-paid", transactionHash: TX_HASH_2 },
    ]);
  });

  test("throws EnsureDeployedError with the failing chainId when a row fails, after reporting every change in that batch", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          { deploys: [deploy(8453, "queued"), deploy(10, "queued")] },
          { status: 202 },
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          intent([8453, 10], {
            deploys: [deploy(8453, "failed"), deploy(10, "sent")],
          }),
        ),
      );
    const client = createJBCenterClient({ fetch: fetchMock });
    const onStep = vi.fn();

    const promise = ensureDeployed({
      client,
      intent: intent([8453, 10]),
      onStep,
    });
    const instanceAssertion =
      expect(promise).rejects.toBeInstanceOf(EnsureDeployedError);
    const assertion = expect(promise).rejects.toMatchObject({
      name: "EnsureDeployedError",
      chainId: 8453,
    });

    await vi.advanceTimersByTimeAsync(4_000);
    await assertion;
    await instanceAssertion;

    expect(onStep.mock.calls.map((args) => args[0])).toEqual([
      { chainId: 8453, status: "queued", transactionHash: undefined },
      { chainId: 10, status: "queued", transactionHash: undefined },
      { chainId: 8453, status: "failed", transactionHash: undefined },
      { chainId: 10, status: "sent", transactionHash: undefined },
    ]);
  });

  test("a transient failure while polling propagates without ever self-paying", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ deploys: [deploy(8453, "queued")] }, { status: 202 }),
      )
      .mockResolvedValueOnce(jsonResponse({}, { status: 503 }));
    const client = createJBCenterClient({ fetch: fetchMock });
    const selfPaid = vi.fn();

    const promise = ensureDeployed({
      client,
      intent: intent([8453]),
      selfPaid,
    });
    const assertion =
      expect(promise).rejects.toBeInstanceOf(JBCenterRequestError);

    await vi.advanceTimersByTimeAsync(4_000);
    await assertion;
    expect(selfPaid).not.toHaveBeenCalled();
  });

  test("deploy rows alone leave the sponsor free to take the run's chains", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ deploys: [deploy(8453, "sent")] }, { status: 202 }),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          intent([8453], {
            deploys: [deploy(8453, "confirmed", TX_HASH_1)],
            deployments: [
              {
                chainId: 8453,
                projectId: "55",
                transactionHash: TX_HASH_1,
                createdAt: "",
                forwarded: true,
              },
            ],
          }),
        ),
      );
    const client = createJBCenterClient({ fetch: fetchMock });
    const seeded = intent([8453], { deploys: [deploy(8453, "sent")] });

    const promise = ensureDeployed({ client, intent: seeded });
    await vi.advanceTimersByTimeAsync(4_000);

    await expect(promise).resolves.toEqual({ 8453: "55" });
    expect(fetchMock.mock.calls.map((args) => args[0])).toEqual([
      deployUrl(),
      intentUrl(),
    ]);
    expect(
      JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string),
    ).toEqual({ chainIds: [8453] });
  });

  test("never mixes senders: partial deployments with no deploy rows always self-pay the remainder", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        chainId: 10,
        projectId: "56",
        transactionHash: TX_HASH_2,
        createdAt: "2026-09-21T00:00:00.000Z",
      }),
    );
    const client = createJBCenterClient({ fetch: fetchMock });
    const seeded = intent([8453, 10], {
      deployments: [
        {
          chainId: 8453,
          projectId: "55",
          transactionHash: TX_HASH_1,
          createdAt: "",
        },
      ],
    });
    const selfPaid = vi
      .fn()
      .mockResolvedValue([
        { chainId: 10, projectId: "56", transactionHash: TX_HASH_2 },
      ]);

    await expect(
      ensureDeployed({ client, intent: seeded, selfPaid }),
    ).resolves.toEqual({ 8453: "55", 10: "56" });

    expect(selfPaid).toHaveBeenCalledWith([call(10)]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("rejects on an already-aborted signal before invoking self-paid", async () => {
    const fetchMock = vi.fn();
    const client = createJBCenterClient({ fetch: fetchMock });
    const controller = new AbortController();
    controller.abort(new Error("aborted before self-paid"));
    const selfPaid = vi.fn();

    await expect(
      ensureDeployed({
        client,
        intent: intent([1]),
        selfPaid,
        signal: controller.signal,
      }),
    ).rejects.toThrow("aborted before self-paid");
    expect(selfPaid).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("rejects a self-paid result that returns a chain outside the remaining set, before recording anything", async () => {
    const fetchMock = vi.fn();
    const client = createJBCenterClient({ fetch: fetchMock });
    const selfPaid = vi.fn().mockResolvedValue([
      { chainId: 1, projectId: "55", transactionHash: TX_HASH_1 },
      { chainId: 999, projectId: "56", transactionHash: TX_HASH_2 },
    ]);

    await expect(
      ensureDeployed({ client, intent: intent([1]), selfPaid }),
    ).rejects.toMatchObject({ name: "EnsureDeployedError", chainId: 999 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("rejects a self-paid result that returns the same chain twice, before recording anything", async () => {
    const fetchMock = vi.fn();
    const client = createJBCenterClient({ fetch: fetchMock });
    const selfPaid = vi.fn().mockResolvedValue([
      { chainId: 1, projectId: "55", transactionHash: TX_HASH_1 },
      { chainId: 1, projectId: "56", transactionHash: TX_HASH_2 },
    ]);

    await expect(
      ensureDeployed({ client, intent: intent([1]), selfPaid }),
    ).rejects.toMatchObject({ name: "EnsureDeployedError", chainId: 1 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("throws EnsureDeployedError when not sponsorable and no self-paid fallback is given", async () => {
    const fetchMock = vi.fn();
    const client = createJBCenterClient({ fetch: fetchMock });

    await expect(
      ensureDeployed({ client, intent: intent([1]) }),
    ).rejects.toMatchObject({ name: "EnsureDeployedError" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("throws EnsureDeployedError when the sponsor is rate limited and no self-paid fallback is given", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, { status: 503 }))
      .mockResolvedValueOnce(jsonResponse(intent([8453])));
    const client = createJBCenterClient({ fetch: fetchMock });

    await expect(
      ensureDeployed({ client, intent: intent([8453]) }),
    ).rejects.toMatchObject({ name: "EnsureDeployedError" });
  });

  test("re-reads the intent before self-paying a refused sponsor request and leaves the sponsor's chains alone", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, { status: 400 }))
      .mockResolvedValueOnce(
        jsonResponse(
          intent([8453, 10], {
            deployments: [
              {
                chainId: 8453,
                projectId: "55",
                transactionHash: TX_HASH_1,
                createdAt: "2026-09-21T00:00:00.000Z",
              },
            ],
          }),
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          chainId: 10,
          projectId: "56",
          transactionHash: TX_HASH_2,
          createdAt: "2026-09-21T00:00:00.000Z",
        }),
      );
    const client = createJBCenterClient({ fetch: fetchMock });
    const selfPaid = vi
      .fn()
      .mockResolvedValue([
        { chainId: 10, projectId: "56", transactionHash: TX_HASH_2 },
      ]);

    await expect(
      ensureDeployed({ client, intent: intent([8453, 10]), selfPaid }),
    ).resolves.toEqual({ 8453: "55", 10: "56" });

    expect(selfPaid).toHaveBeenCalledWith([call(10)]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toBe(deployUrl());
    expect(fetchMock.mock.calls[1][0]).toBe(intentUrl());
    expect(fetchMock.mock.calls[2][0]).toBe(
      `https://juicebox.center/v1/intents/${INTENT_ID}/deployments`,
    );
  });

  test("rejects a self-paid result that skips a remaining chain, before recording anything", async () => {
    const fetchMock = vi.fn();
    const client = createJBCenterClient({ fetch: fetchMock });
    const selfPaid = vi
      .fn()
      .mockResolvedValue([
        { chainId: 1, projectId: "55", transactionHash: TX_HASH_1 },
      ]);

    await expect(
      ensureDeployed({ client, intent: intent([1, 137]), selfPaid }),
    ).rejects.toMatchObject({ name: "EnsureDeployedError", chainId: 137 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("propagates a non-retryable requestDeploy failure without self-paying", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, { status: 500 }));
    const client = createJBCenterClient({ fetch: fetchMock });
    const selfPaid = vi.fn();

    await expect(
      ensureDeployed({ client, intent: intent([8453]), selfPaid }),
    ).rejects.toBeInstanceOf(JBCenterRequestError);
    expect(selfPaid).not.toHaveBeenCalled();
  });

  test("rejects immediately on an already-aborted signal without making any request", async () => {
    const fetchMock = vi.fn();
    const client = createJBCenterClient({ fetch: fetchMock });
    const controller = new AbortController();
    controller.abort(new Error("aborted before start"));

    await expect(
      ensureDeployed({
        client,
        intent: intent([8453]),
        signal: controller.signal,
      }),
    ).rejects.toThrow("aborted before start");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("stops polling and rejects when the signal is aborted", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ deploys: [deploy(8453, "queued")] }, { status: 202 }),
      );
    const client = createJBCenterClient({ fetch: fetchMock });
    const controller = new AbortController();

    const promise = ensureDeployed({
      client,
      intent: intent([8453]),
      signal: controller.signal,
    });
    const assertion = expect(promise).rejects.toThrow("aborted");

    await vi.advanceTimersByTimeAsync(0);
    controller.abort(new Error("aborted by caller"));

    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("times out polling after timeoutMs when a chain never confirms", async () => {
    const fetchMock = vi.fn((url: string | URL | Request) => {
      if (url === deployUrl()) {
        return Promise.resolve(
          jsonResponse({ deploys: [deploy(8453, "queued")] }, { status: 202 }),
        );
      }
      return Promise.resolve(
        jsonResponse(intent([8453], { deploys: [deploy(8453, "sent")] })),
      );
    });
    const client = createJBCenterClient({ fetch: fetchMock });

    const promise = ensureDeployed({
      client,
      intent: intent([8453]),
      pollMs: 1_000,
      timeoutMs: 2_000,
    });
    const assertion = expect(promise).rejects.toMatchObject({
      name: "EnsureDeployedError",
      message: expect.stringContaining("timed out"),
    });

    await vi.advanceTimersByTimeAsync(1_000);
    await vi.advanceTimersByTimeAsync(1_000);
    await vi.advanceTimersByTimeAsync(1_000);

    await assertion;
  });
  const FORWARDER = "0x0000000000000000000000000000000000007771" as const;

  function relayUrl(id = INTENT_ID) {
    return `https://juicebox.center/v1/intents/${id}/relay`;
  }

  function deploymentsUrl(id = INTENT_ID) {
    return `https://juicebox.center/v1/intents/${id}/deployments`;
  }

  function relayBody(chainId: number) {
    return {
      chainId,
      to: FORWARDER,
      data: "0xabcdef01",
      value: "1000000000000000",
      gas: "2500000",
      deadline: 1_790_000_000,
      setup: [],
    };
  }

  const RELAY_REQUEST: JBCenterRelayRequest = {
    chainId: 1,
    to: FORWARDER,
    data: "0xabcdef01",
    value: 1_000_000_000_000_000n,
    gas: 2_500_000n,
    deadline: 1_790_000_000,
    setup: [],
  };

  test("queues the sponsored chains and relays the one the visitor pays for", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ deploys: [deploy(8453, "queued")] }, { status: 202 }),
      )
      .mockResolvedValueOnce(jsonResponse(relayBody(1)))
      .mockResolvedValueOnce(
        jsonResponse({
          chainId: 1,
          projectId: "7",
          transactionHash: TX_HASH_1,
          createdAt: "2026-09-22T00:00:00.000Z",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          intent([1, 8453], {
            deploys: [deploy(8453, "confirmed", TX_HASH_2)],
            deployments: [
              {
                chainId: 1,
                projectId: "7",
                transactionHash: TX_HASH_1,
                createdAt: "",
              },
              {
                chainId: 8453,
                projectId: "55",
                transactionHash: TX_HASH_2,
                createdAt: "",
              },
            ],
          }),
        ),
      );
    const client = createJBCenterClient({ fetch: fetchMock });
    const onStep = vi.fn();
    const relayPaid = vi.fn().mockResolvedValue({
      chainId: 1,
      projectId: "7",
      transactionHash: TX_HASH_1,
    });

    const promise = ensureDeployed({
      client,
      intent: intent([1, 8453]),
      relayPaid,
      onStep,
    });

    await vi.advanceTimersByTimeAsync(4_000);
    await vi.advanceTimersByTimeAsync(4_000);

    await expect(promise).resolves.toEqual({ 1: "7", 8453: "55" });
    expect(relayPaid).toHaveBeenCalledWith(RELAY_REQUEST);
    expect(fetchMock.mock.calls.map((args) => args[0])).toEqual([
      deployUrl(),
      relayUrl(),
      deploymentsUrl(),
      intentUrl(),
    ]);
    expect(
      JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string),
    ).toEqual({ chainIds: [8453] });
    expect(onStep.mock.calls.map((args) => args[0])).toEqual([
      { chainId: 1, status: "relay-paid", transactionHash: TX_HASH_1 },
      { chainId: 8453, status: "queued", transactionHash: undefined },
      { chainId: 8453, status: "confirmed", transactionHash: TX_HASH_2 },
    ]);
  });

  test("an all-unsponsored run never asks Center to deploy and never polls", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(relayBody(1)))
      .mockResolvedValueOnce(
        jsonResponse({
          chainId: 1,
          projectId: "7",
          transactionHash: TX_HASH_1,
          createdAt: "2026-09-22T00:00:00.000Z",
        }),
      );
    const client = createJBCenterClient({ fetch: fetchMock });
    const relayPaid = vi.fn().mockResolvedValue({
      chainId: 1,
      projectId: "7",
      transactionHash: TX_HASH_1,
    });

    await expect(
      ensureDeployed({ client, intent: intent([1]), relayPaid }),
    ).resolves.toEqual({ 1: "7" });
    expect(fetchMock.mock.calls.map((args) => args[0])).toEqual([
      relayUrl(),
      deploymentsUrl(),
    ]);
  });

  test("limits the run to the chains it was given and returns when they land", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ deploys: [deploy(8453, "queued")] }, { status: 202 }),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          intent([8453, 10], {
            deploys: [deploy(8453, "confirmed", TX_HASH_1)],
            deployments: [
              {
                chainId: 8453,
                projectId: "55",
                transactionHash: TX_HASH_1,
                createdAt: "",
              },
            ],
          }),
        ),
      );
    const client = createJBCenterClient({ fetch: fetchMock });

    const promise = ensureDeployed({
      client,
      intent: intent([8453, 10]),
      chainIds: [8453],
    });

    await vi.advanceTimersByTimeAsync(4_000);

    await expect(promise).resolves.toEqual({ 8453: "55" });
    expect(
      JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string),
    ).toEqual({ chainIds: [8453] });
  });

  test("skips a chain of the run that already has a deployment", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(relayBody(1)))
      .mockResolvedValueOnce(
        jsonResponse({
          chainId: 1,
          projectId: "7",
          transactionHash: TX_HASH_1,
          createdAt: "2026-09-22T00:00:00.000Z",
        }),
      );
    const client = createJBCenterClient({ fetch: fetchMock });
    const relayPaid = vi.fn().mockResolvedValue({
      chainId: 1,
      projectId: "7",
      transactionHash: TX_HASH_1,
    });
    const seeded = intent([1, 137], {
      deployments: [
        {
          chainId: 137,
          projectId: "9",
          transactionHash: TX_HASH_2,
          createdAt: "",
          forwarded: true,
        },
      ],
    });

    await expect(
      ensureDeployed({ client, intent: seeded, relayPaid }),
    ).resolves.toEqual({ 1: "7", 137: "9" });
    expect(relayPaid).toHaveBeenCalledTimes(1);
  });

  test("refuses two senders for the same run", async () => {
    const fetchMock = vi.fn();
    const relayPaid = vi.fn();
    const selfPaid = vi.fn();

    await expect(
      ensureDeployed({
        client: createJBCenterClient({ fetch: fetchMock }),
        intent: intent([1]),
        relayPaid,
        selfPaid,
      }),
    ).rejects.toMatchObject({ name: "EnsureDeployedError" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(relayPaid).not.toHaveBeenCalled();
    expect(selfPaid).not.toHaveBeenCalled();
  });

  test("refuses a chain the intent does not carry, and an empty run", async () => {
    const fetchMock = vi.fn();
    const client = createJBCenterClient({ fetch: fetchMock });

    await expect(
      ensureDeployed({ client, intent: intent([8453]), chainIds: [137] }),
    ).rejects.toMatchObject({ name: "EnsureDeployedError", chainId: 137 });
    await expect(
      ensureDeployed({ client, intent: intent([8453]), chainIds: [] }),
    ).rejects.toMatchObject({ name: "EnsureDeployedError" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("rejects a relay-paid deployment for another chain before recording it", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(relayBody(1)));
    const client = createJBCenterClient({ fetch: fetchMock });
    const relayPaid = vi.fn().mockResolvedValue({
      chainId: 999,
      projectId: "7",
      transactionHash: TX_HASH_1,
    });

    await expect(
      ensureDeployed({ client, intent: intent([1]), relayPaid }),
    ).rejects.toMatchObject({ name: "EnsureDeployedError", chainId: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("rejects a relay run on an already-aborted signal before asking for anything", async () => {
    const fetchMock = vi.fn();
    const controller = new AbortController();
    controller.abort(new Error("aborted before relay"));
    const relayPaid = vi.fn();

    await expect(
      ensureDeployed({
        client: createJBCenterClient({ fetch: fetchMock }),
        intent: intent([1]),
        relayPaid,
        signal: controller.signal,
      }),
    ).rejects.toThrow("aborted before relay");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(relayPaid).not.toHaveBeenCalled();
  });

  test("a relay run whose chains have all landed asks for nothing", async () => {
    const fetchMock = vi.fn();
    const relayPaid = vi.fn();
    const seeded = intent([1], {
      deployments: [
        {
          chainId: 1,
          projectId: "7",
          transactionHash: TX_HASH_1,
          createdAt: "",
        },
      ],
    });

    await expect(
      ensureDeployed({
        client: createJBCenterClient({ fetch: fetchMock }),
        intent: seeded,
        relayPaid,
      }),
    ).resolves.toEqual({ 1: "7" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(relayPaid).not.toHaveBeenCalled();
  });
  test("asks Center for a later chain although an earlier one holds a deploy row", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ deploys: [deploy(42161, "queued")] }, { status: 202 }),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          intent([8453, 42161], {
            deploys: [
              deploy(8453, "confirmed", TX_HASH_1),
              deploy(42161, "confirmed", TX_HASH_2),
            ],
            deployments: [
              {
                chainId: 8453,
                projectId: "55",
                transactionHash: TX_HASH_1,
                createdAt: "",
                forwarded: true,
              },
              {
                chainId: 42161,
                projectId: "56",
                transactionHash: TX_HASH_2,
                createdAt: "",
                forwarded: true,
              },
            ],
          }),
        ),
      );
    const client = createJBCenterClient({ fetch: fetchMock });
    const seeded = intent([8453, 42161], {
      deploys: [deploy(8453, "confirmed", TX_HASH_1)],
      deployments: [
        {
          chainId: 8453,
          projectId: "55",
          transactionHash: TX_HASH_1,
          createdAt: "",
          forwarded: true,
        },
      ],
    });

    const promise = ensureDeployed({
      client,
      intent: seeded,
      chainIds: [42161],
    });

    await vi.advanceTimersByTimeAsync(4_000);

    await expect(promise).resolves.toEqual({ 8453: "55", 42161: "56" });
    expect(fetchMock.mock.calls.map((args) => args[0])).toEqual([
      deployUrl(),
      intentUrl(),
    ]);
    expect(
      JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string),
    ).toEqual({ chainIds: [42161] });
  });

  test("a relay-paid chain leaves the sponsor free to take the rest", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ deploys: [deploy(8453, "queued")] }, { status: 202 }),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          intent([1, 8453], {
            deploys: [deploy(8453, "confirmed", TX_HASH_2)],
            deployments: [
              {
                chainId: 1,
                projectId: "7",
                transactionHash: TX_HASH_1,
                createdAt: "",
                forwarded: true,
              },
              {
                chainId: 8453,
                projectId: "55",
                transactionHash: TX_HASH_2,
                createdAt: "",
                forwarded: true,
              },
            ],
          }),
        ),
      );
    const client = createJBCenterClient({ fetch: fetchMock });
    const seeded = intent([1, 8453], {
      deployments: [
        {
          chainId: 1,
          projectId: "7",
          transactionHash: TX_HASH_1,
          createdAt: "",
          forwarded: true,
        },
      ],
    });

    const promise = ensureDeployed({
      client,
      intent: seeded,
      chainIds: [8453],
    });

    await vi.advanceTimersByTimeAsync(4_000);

    await expect(promise).resolves.toEqual({ 1: "7", 8453: "55" });
    expect(
      JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string),
    ).toEqual({ chainIds: [8453] });
  });

  test("a wallet-sent deployment keeps the sponsor out of the intent", async () => {
    const fetchMock = vi.fn();
    const client = createJBCenterClient({ fetch: fetchMock });

    function seeded(forwarded?: boolean) {
      return intent([1, 8453], {
        deployments: [
          {
            chainId: 1,
            projectId: "7",
            transactionHash: TX_HASH_1,
            createdAt: "",
            forwarded,
          },
        ],
      });
    }

    await expect(
      ensureDeployed({ client, intent: seeded(false), chainIds: [8453] }),
    ).rejects.toMatchObject({
      name: "EnsureDeployedError",
      message: expect.stringContaining("no self-paid fallback was provided"),
    });
    await expect(
      ensureDeployed({ client, intent: seeded(), chainIds: [8453] }),
    ).rejects.toMatchObject({
      name: "EnsureDeployedError",
      message: expect.stringContaining("no self-paid fallback was provided"),
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  test("polls the sponsor's own rows when it refuses a second request", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, { status: 429 }))
      .mockResolvedValueOnce(
        jsonResponse(intent([8453], { deploys: [deploy(8453, "sent")] })),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          intent([8453], {
            deploys: [deploy(8453, "confirmed", TX_HASH_1)],
            deployments: [
              {
                chainId: 8453,
                projectId: "55",
                transactionHash: TX_HASH_1,
                createdAt: "",
                forwarded: true,
              },
            ],
          }),
        ),
      );
    const client = createJBCenterClient({ fetch: fetchMock });
    const selfPaid = vi.fn();

    const promise = ensureDeployed({
      client,
      intent: intent([8453]),
      selfPaid,
    });

    await vi.advanceTimersByTimeAsync(4_000);

    await expect(promise).resolves.toEqual({ 8453: "55" });
    expect(selfPaid).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls.map((args) => args[0])).toEqual([
      deployUrl(),
      intentUrl(),
      intentUrl(),
    ]);
  });
});
