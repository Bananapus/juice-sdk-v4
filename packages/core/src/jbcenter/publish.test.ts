import { keccak256, toBytes } from "viem";
import { describe, expect, test, vi } from "vitest";
import { createJBCenterClient, type JBCenterIntentInput } from "../jbcenter.js";
import { JBCenterIntentMismatchError, publishSignedIntent } from "./publish.js";

const OWNER_LOWER = "0x000000000000000000000000000000000000dead" as const;
const OWNER_CHECKSUM = "0x000000000000000000000000000000000000dEaD" as const;
const PUBLISHER = "0x1111111111111111111111111111111111111111" as const;
const SIGNATURE = `0x${"34".repeat(65)}` as const;
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

/** Exact canonical JSON used by Center and the legacy Sticky client. */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`,
    )
    .join(",")}}`;
}
const hashOf = (envelope: JBCenterIntentInput) =>
  keccak256(toBytes(canonicalJson(envelope)));
const CONTENT_HASH = hashOf(preparedEnvelope());

function prepared(overrides: Record<string, unknown> = {}) {
  const envelope = (overrides.envelope ??
    preparedEnvelope()) as JBCenterIntentInput;
  const contentHash = hashOf(envelope);
  return {
    contentHash,
    message: centerMessage(contentHash.toUpperCase()),
    envelope,
    ...overrides,
  };
}

function storedIntent(envelope = preparedEnvelope()) {
  return {
    id: INTENT_ID,
    status: "undeployed",
    contentHash: hashOf(envelope),
    envelope,
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

  test("publishes the exact prepared envelope, publisher, and signature", async () => {
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
      ...preparedEnvelope(),
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
      ...preparedEnvelope(),
      publisher: PUBLISHER,
      signature: SIGNATURE,
    });
  });

  test("publishes an immutable prepared snapshot when the service response changes while the signer waits", async () => {
    const response = prepared();
    const expected = preparedEnvelope();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(storedIntent()));
    const client = createJBCenterClient({ fetch: fetchMock });
    vi.spyOn(client, "prepareIntent").mockResolvedValueOnce(response);
    let release!: (signature: typeof SIGNATURE) => void;
    const sign = vi.fn(
      () =>
        new Promise<typeof SIGNATURE>((resolve) => {
          release = resolve;
        }),
    );
    const publishing = publishSignedIntent(client, localIntent(), sign, {
      publisher: PUBLISHER,
    });
    await vi.waitFor(() => expect(sign).toHaveBeenCalledOnce());
    response.envelope.jb.owner = PUBLISHER;
    response.envelope.deploymentCalls[0].data = "0xdeadbeef";
    response.envelope.chainIds.push(10);
    response.message = "Changed after the review";
    release(SIGNATURE);
    await expect(publishing).resolves.toHaveProperty(
      "contentHash",
      CONTENT_HASH,
    );
    expect(sign).toHaveBeenCalledWith(
      centerMessage(CONTENT_HASH.toUpperCase()),
    );
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      ...expected,
      publisher: PUBLISHER,
      signature: SIGNATURE,
    });
  });

  test("matches Sticky's fixed Unicode and checksum content-hash vector", async () => {
    const deployer = "0xdA38Ec48B5b1d186B02BA99F297e95153BEE33a9" as const;
    const envelope: JBCenterIntentInput = {
      format: "sticky.center/deploy.v1",
      deploymentVersion: "6",
      chainIds: [84532, 11155420],
      deploymentCalls: [84532, 11155420].map((chainId) => ({
        chainId,
        to: deployer,
        data: "0x00d5ce37abcd",
      })),
      jb: {
        app: "sticky",
        kind: "sticky",
        name: "Sticky Test — ünïcode",
        owner: "0x042F619EED558723252593DB0375fC34306f203A",
        chainIds: [84532, 11155420],
        symbol: "STICKYT",
        stakedToken: `0x${"5".repeat(40)}`,
        stakedTokenSymbol: "T",
        cashOutTaxRate: "1000",
        soulbound: false,
        launchId: "abc",
        projectUri: "data:application/json,{}",
      },
    };
    // Pinned in Sticky's legacy center-intents.test.cjs independently of this implementation.
    const expectedHash =
      "0xf9d00ba55aa7a79c95f4fef8f73ed77316caa67b93649f659dc4b6150f24b821";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          envelope,
          contentHash: expectedHash,
          message: centerMessage(expectedHash),
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ ...storedIntent(envelope), contentHash: expectedHash }),
      );
    const sign = vi.fn().mockResolvedValue(SIGNATURE);
    await publishSignedIntent(
      createJBCenterClient({ fetch: fetchMock }),
      envelope,
      sign,
      { publisher: PUBLISHER },
    );
    expect(sign).toHaveBeenCalledWith(centerMessage(expectedHash));
  });

  test("hashes integer-looking object keys lexicographically while retaining array order", async () => {
    const envelope = localIntent();
    envelope.jb.values = { "2": "two", "10": "ten", nested: [false, null, 3] };
    expect(canonicalJson(envelope.jb.values)).toBe(
      '{"10":"ten","2":"two","nested":[false,null,3]}',
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(prepared({ envelope })))
      .mockResolvedValueOnce(jsonResponse(storedIntent(envelope)));
    const sign = vi.fn().mockResolvedValue(SIGNATURE);
    await publishSignedIntent(
      createJBCenterClient({ fetch: fetchMock }),
      envelope,
      sign,
      { publisher: PUBLISHER },
    );
    expect(sign).toHaveBeenCalledWith(
      centerMessage(hashOf(envelope).toUpperCase()),
    );
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
      .mockResolvedValueOnce(jsonResponse(storedIntent(sorted)));
    const client = createJBCenterClient({ fetch: fetchMock });
    const sign = vi.fn().mockResolvedValue(SIGNATURE);

    await publishSignedIntent(client, unsorted, sign, {
      publisher: PUBLISHER,
    });

    expect(sign).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      ...sorted,
      publisher: PUBLISHER,
      signature: SIGNATURE,
    });
  });

  test("refuses an unrelated hash even when Center pairs it with the expected message and unchanged envelope", async () => {
    const wrongHash = `0x${"ab".repeat(32)}`;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          prepared({
            contentHash: wrongHash,
            message: centerMessage(wrongHash),
          }),
        ),
      )
      .mockResolvedValueOnce(jsonResponse(storedIntent()));
    const sign = vi.fn().mockResolvedValue(SIGNATURE);
    await expect(
      publishSignedIntent(
        createJBCenterClient({ fetch: fetchMock }),
        localIntent(),
        sign,
        { publisher: PUBLISHER },
      ),
    ).rejects.toMatchObject({
      name: "JBCenterIntentMismatchError",
      reason: "contentHash",
    });
    expect(sign).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("refuses a published listing with a different content hash", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(prepared()))
      .mockResolvedValueOnce(
        jsonResponse({
          ...storedIntent(),
          contentHash: `0x${"ab".repeat(32)}`,
        }),
      );
    const sign = vi.fn().mockResolvedValue(SIGNATURE);
    await expect(
      publishSignedIntent(
        createJBCenterClient({ fetch: fetchMock }),
        localIntent(),
        sign,
        { publisher: PUBLISHER },
      ),
    ).rejects.toMatchObject({
      name: "JBCenterIntentMismatchError",
      reason: "publication",
    });
    expect(sign).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(2);
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
      .mockResolvedValueOnce(jsonResponse(storedIntent(recased)));
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
