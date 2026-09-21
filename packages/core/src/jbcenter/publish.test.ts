import { describe, expect, test, vi } from "vitest";
import { createJBCenterClient, type JBCenterIntentInput } from "../jbcenter.js";
import { JBCenterIntentMismatchError, publishSignedIntent } from "./publish.js";

const OWNER_LOWER = "0x000000000000000000000000000000000000dead" as const;
const OWNER_CHECKSUM = "0x000000000000000000000000000000000000dEaD" as const;
const PUBLISHER = "0x1111111111111111111111111111111111111111" as const;
const SIGNATURE = `0x${"34".repeat(65)}` as const;
const CONTENT_HASH = `0x${"ab".repeat(32)}` as const;
/** Long enough to be calldata, so its casing is Center's to choose. */
const CALL_DATA = `0x011fb19e${"ab".repeat(32)}` as const;
const CALL_DATA_UPPER = `0x${CALL_DATA.slice(2).toUpperCase()}` as const;
const INTENT_ID = "31b158fc-6ac5-4a4d-9039-882b7eb0ef4b";

/** JB Center's signing message, from its own `signingMessage`. */
function centerMessage(contentHash: string): string {
  return `Juice Central project intent\nVersion: 1\nContent hash: ${contentHash}`;
}

/** What the caller built: hex lowercased, keys in the caller's own order. */
function localIntent(): JBCenterIntentInput {
  return {
    format: "homerun.money/fund/v1",
    deploymentVersion: "6",
    chainIds: [8453],
    deploymentCalls: [{ chainId: 8453, to: OWNER_LOWER, data: CALL_DATA }],
    jb: {
      app: "homerun",
      name: "Fund",
      owner: OWNER_LOWER,
      tagline: null,
      chainIds: [8453],
    },
  };
}

/** What Center prepared: same values, checksummed hex, keys reordered. */
function preparedEnvelope(): JBCenterIntentInput {
  return {
    deploymentCalls: [
      { data: CALL_DATA_UPPER, to: OWNER_CHECKSUM, chainId: 8453 },
    ],
    chainIds: [8453],
    jb: {
      chainIds: [8453],
      owner: OWNER_CHECKSUM,
      tagline: null,
      name: "Fund",
      app: "homerun",
    },
    deploymentVersion: "6",
    format: "homerun.money/fund/v1",
  };
}

function prepared(overrides: Record<string, unknown> = {}) {
  return {
    contentHash: CONTENT_HASH,
    message: centerMessage(CONTENT_HASH.toUpperCase()),
    envelope: preparedEnvelope(),
    ...overrides,
  };
}

function storedIntent() {
  return {
    id: INTENT_ID,
    status: "undeployed",
    contentHash: CONTENT_HASH,
    envelope: preparedEnvelope(),
    publisher: PUBLISHER,
    signature: SIGNATURE,
    createdAt: "2026-09-21T00:00:00.000Z",
    deployments: [],
    deploys: [],
    name: "Fund",
    description: null,
    tagline: null,
    tags: [],
    logoUri: null,
    owner: OWNER_CHECKSUM,
  };
}

function jsonResponse(value: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  return new Response(JSON.stringify(value), { ...init, headers });
}

describe("publishSignedIntent", () => {
  test("signs and publishes when Center's envelope carries the same values", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(prepared()))
      .mockResolvedValueOnce(jsonResponse(storedIntent()));
    const client = createJBCenterClient({ fetch: fetchMock });
    const sign = vi.fn().mockResolvedValue(SIGNATURE);

    const published = await publishSignedIntent(client, localIntent(), sign, {
      publisher: PUBLISHER,
    });

    expect(published.id).toBe(INTENT_ID);
    expect(sign).toHaveBeenCalledWith(prepared().message);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://juicebox.center/v1/intents/message",
      "https://juicebox.center/v1/intents",
    ]);
  });

  test("forwards the caller's intent, publisher, and signature to the publish call", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(prepared()))
      .mockResolvedValueOnce(jsonResponse(storedIntent()));
    const client = createJBCenterClient({ fetch: fetchMock });

    await publishSignedIntent(client, localIntent(), async () => SIGNATURE, {
      publisher: PUBLISHER,
    });

    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      ...localIntent(),
      publisher: PUBLISHER,
      signature: SIGNATURE,
    });
  });

  test("publishes what was checked, not what the caller wrote while signing", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(prepared()))
      .mockResolvedValueOnce(jsonResponse(storedIntent()));
    const client = createJBCenterClient({ fetch: fetchMock });
    const intent = localIntent();

    await publishSignedIntent(
      client,
      intent,
      async () => {
        intent.jb.owner = PUBLISHER;
        intent.chainIds.push(10);
        intent.deploymentCalls[0].data = "0xdeadbeef";
        return SIGNATURE;
      },
      { publisher: PUBLISHER },
    );

    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      ...localIntent(),
      publisher: PUBLISHER,
      signature: SIGNATURE,
    });
  });

  test("accepts the chain ids and calls in the order Center sorts them into", async () => {
    const unsorted: JBCenterIntentInput = {
      format: "juicebox.money/v1",
      deploymentVersion: " 6 ",
      chainIds: [11155420, 84532],
      deploymentCalls: [
        { chainId: 11155420, to: OWNER_LOWER, data: CALL_DATA },
        { chainId: 84532, to: OWNER_LOWER, data: CALL_DATA },
      ],
      jb: { app: "juicebox", chainIds: [11155420, 84532] },
    };
    const sorted: JBCenterIntentInput = {
      format: "juicebox.money/v1",
      deploymentVersion: "6",
      chainIds: [84532, 11155420],
      deploymentCalls: [
        { chainId: 84532, to: OWNER_CHECKSUM, data: CALL_DATA_UPPER },
        { chainId: 11155420, to: OWNER_CHECKSUM, data: CALL_DATA_UPPER },
      ],
      jb: { app: "juicebox", chainIds: [11155420, 84532] },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(prepared({ envelope: sorted })))
      .mockResolvedValueOnce(
        jsonResponse({ ...storedIntent(), envelope: sorted }),
      );
    const client = createJBCenterClient({ fetch: fetchMock });
    const sign = vi.fn().mockResolvedValue(SIGNATURE);

    await publishSignedIntent(client, unsorted, sign, {
      publisher: PUBLISHER,
    });

    expect(sign).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      ...sorted,
      deploymentCalls: [
        { chainId: 84532, to: OWNER_LOWER, data: CALL_DATA },
        { chainId: 11155420, to: OWNER_LOWER, data: CALL_DATA },
      ],
      publisher: PUBLISHER,
      signature: SIGNATURE,
    });
  });

  test("refuses before signing when Center changed a value", async () => {
    const tampered = preparedEnvelope();
    tampered.jb.owner = PUBLISHER;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(prepared({ envelope: tampered })));
    const client = createJBCenterClient({ fetch: fetchMock });
    const sign = vi.fn().mockResolvedValue(SIGNATURE);

    await expect(
      publishSignedIntent(client, localIntent(), sign, {
        publisher: PUBLISHER,
      }),
    ).rejects.toMatchObject({
      name: "JBCenterIntentMismatchError",
      reason: "envelope",
    });
    expect(sign).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("refuses before signing when short hex-looking text changed case", async () => {
    const local = localIntent();
    local.jb.ticker = "0xAbC";
    const tampered = preparedEnvelope();
    tampered.jb.ticker = "0xabc";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(prepared({ envelope: tampered })));
    const client = createJBCenterClient({ fetch: fetchMock });
    const sign = vi.fn().mockResolvedValue(SIGNATURE);

    await expect(
      publishSignedIntent(client, local, sign, { publisher: PUBLISHER }),
    ).rejects.toMatchObject({ reason: "envelope" });
    expect(sign).not.toHaveBeenCalled();
  });

  test("signs when only an address or calldata changed case", async () => {
    const local = localIntent();
    local.jb.ticker = "0xAbC";
    local.jb.hook = OWNER_LOWER;
    const recased = preparedEnvelope();
    recased.jb.ticker = "0xAbC";
    recased.jb.hook = OWNER_CHECKSUM;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(prepared({ envelope: recased })))
      .mockResolvedValueOnce(jsonResponse(storedIntent()));
    const client = createJBCenterClient({ fetch: fetchMock });
    const sign = vi.fn().mockResolvedValue(SIGNATURE);

    await publishSignedIntent(client, local, sign, { publisher: PUBLISHER });

    expect(sign).toHaveBeenCalledOnce();
  });

  test("refuses before signing when the message is not Center's", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(prepared({ message: "Publish this project intent." })),
      );
    const client = createJBCenterClient({ fetch: fetchMock });
    const sign = vi.fn().mockResolvedValue(SIGNATURE);

    const error = await publishSignedIntent(client, localIntent(), sign, {
      publisher: PUBLISHER,
    }).catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(JBCenterIntentMismatchError);
    expect((error as JBCenterIntentMismatchError).reason).toBe("message");
    expect(sign).not.toHaveBeenCalled();
  });

  test("refuses a sign-in message that carries the content hash", async () => {
    const siwe = [
      "example.com wants you to sign in with your Ethereum account:",
      PUBLISHER,
      "",
      "Sign in to continue.",
      "",
      "URI: https://example.com",
      "Version: 1",
      "Chain ID: 8453",
      `Nonce: ${CONTENT_HASH}`,
      "Issued At: 2026-09-21T00:00:00.000Z",
    ].join("\n");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(prepared({ message: siwe })));
    const client = createJBCenterClient({ fetch: fetchMock });
    const sign = vi.fn().mockResolvedValue(SIGNATURE);

    await expect(
      publishSignedIntent(client, localIntent(), sign, {
        publisher: PUBLISHER,
      }),
    ).rejects.toMatchObject({ reason: "message" });
    expect(sign).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("checks against the caller's own template when one is given", async () => {
    const message = `Publish intent ${CONTENT_HASH}`;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(prepared({ message })))
      .mockResolvedValueOnce(jsonResponse(storedIntent()));
    const client = createJBCenterClient({ fetch: fetchMock });
    const sign = vi.fn().mockResolvedValue(SIGNATURE);

    await publishSignedIntent(client, localIntent(), sign, {
      publisher: PUBLISHER,
      expectMessage: (contentHash) => `Publish intent ${contentHash}`,
    });

    expect(sign).toHaveBeenCalledWith(message);
  });

  test("carries the caller's request options into both Center calls", async () => {
    // The client always hands `fetch` a signal of its own, so a mock that
    // ignores it proves nothing. This one refuses an aborted request the way
    // a real fetch does.
    const honorsSignal =
      (body: unknown) => async (_url: string, init: RequestInit) => {
        if (init.signal?.aborted) throw init.signal.reason;
        return jsonResponse(body);
      };

    const early = new AbortController();
    early.abort(new Error("caller left before prepare"));
    const earlyFetch = vi.fn(honorsSignal(prepared()));
    await expect(
      publishSignedIntent(
        createJBCenterClient({ fetch: earlyFetch as unknown as typeof fetch }),
        localIntent(),
        async () => SIGNATURE,
        { publisher: PUBLISHER, request: { signal: early.signal } },
      ),
    ).rejects.toThrow("caller left before prepare");

    const late = new AbortController();
    const lateFetch = vi
      .fn()
      .mockImplementationOnce(honorsSignal(prepared()))
      .mockImplementationOnce(honorsSignal(storedIntent()));
    await expect(
      publishSignedIntent(
        createJBCenterClient({ fetch: lateFetch as unknown as typeof fetch }),
        localIntent(),
        async () => {
          late.abort(new Error("caller left before publish"));
          return SIGNATURE;
        },
        { publisher: PUBLISHER, request: { signal: late.signal } },
      ),
    ).rejects.toThrow("caller left before publish");
    expect(lateFetch).toHaveBeenCalledTimes(2);
  });
});
