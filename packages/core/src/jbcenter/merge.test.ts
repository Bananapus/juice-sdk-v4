import { describe, expect, test } from "vitest";
import type { JBCenterIntent, JBCenterSearchItem } from "../jbcenter.js";
import {
  deployedChains,
  intentPath,
  intentRow,
  isFullyDeployed,
  mergeSearch,
} from "./merge.js";

const OWNER = "0x000000000000000000000000000000000000dEaD" as const;
const HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000001" as const;

function searchItem(): JBCenterSearchItem {
  return {
    source: "jbcenter",
    status: "undeployed",
    intentId: "test-intent",
    name: "Test Intent",
    description: "A test intent",
    tagline: "Testing",
    tags: [],
    logoUri: null,
    owner: OWNER,
    contentHash: HASH,
    format: "v1",
    deploymentVersion: "1",
    chainIds: [8453],
    publisher: OWNER,
    createdAt: "1970-01-01T00:00:00.000Z",
  };
}

function intent(): JBCenterIntent {
  return {
    id: "test-intent",
    status: "undeployed",
    name: "Test Intent",
    description: "A test intent",
    tagline: "Testing",
    tags: [],
    logoUri: null,
    owner: OWNER,
    contentHash: HASH,
    envelope: {
      format: "v1",
      deploymentVersion: "1",
      chainIds: [8453],
      deploymentCalls: [
        {
          chainId: 8453,
          to: OWNER,
          data: "0x1234",
        },
      ],
      jb: {},
    },
    publisher: OWNER,
    signature: HASH,
    createdAt: "1970-01-01T00:00:00.000Z",
    deployments: [],
    deploys: [],
  };
}

describe("merge search results and intent helpers", () => {
  test("mergeSearch interleaves by creation time, newest first, and flags undeployed intents", () => {
    const rows = [
      { id: "a", createdAt: 100 },
      { id: "b", createdAt: 300 },
    ];
    const items = [
      { ...searchItem(), intentId: "d", createdAt: "1970-01-01T00:03:20.000Z" }, // 200s
    ];
    expect(
      mergeSearch(rows, items).map((r) =>
        "undeployed" in r ? r.intentId : r.id,
      ),
    ).toEqual(["b", "d", "a"]);
    expect(mergeSearch(rows, items)[1]).toMatchObject({
      undeployed: true,
      createdAt: 200,
    });
  });

  test("mergeSearch keeps caller rows identical, fields and all", () => {
    const rows = [{ id: "a", createdAt: 100, extra: { nested: true } }];
    const merged = mergeSearch(rows, [searchItem()]);

    expect(merged[0]).toBe(rows[0]);
  });

  test("intentPath and deployedChains", () => {
    expect(intentPath("x")).toBe("/intent/x");
    expect(intentPath("a/b?c#d")).toBe("/intent/a%2Fb%3Fc%23d");
    expect(
      deployedChains({
        ...intent(),
        deployments: [
          {
            chainId: 8453,
            projectId: "12",
            transactionHash: HASH,
            createdAt: "",
          },
        ],
      }),
    ).toEqual({ 8453: "12" });
    expect(
      isFullyDeployed({
        ...intent(),
        envelope: {
          ...intent().envelope,
          chainIds: [8453, 10],
        },
        deployments: [
          {
            chainId: 8453,
            projectId: "12",
            transactionHash: HASH,
            createdAt: "",
          },
        ],
      }),
    ).toBe(false);
  });

  test("intentRow converts ISO createdAt to unix seconds", () => {
    const item = {
      ...searchItem(),
      createdAt: "1970-01-01T00:01:40.000Z", // 100 seconds
    };
    const row = intentRow(item);
    expect(row).toMatchObject({
      undeployed: true,
      intentId: item.intentId,
      name: item.name,
      tagline: item.tagline,
      logoUri: item.logoUri,
      owner: item.owner,
      chainIds: item.chainIds,
      createdAt: 100,
    });
  });

  test("intentRow falls back to 0 for an unparsable createdAt", () => {
    expect(
      intentRow({ ...searchItem(), createdAt: "not a date" }),
    ).toMatchObject({ createdAt: 0 });
  });

  test("isFullyDeployed reads an empty chainIds envelope as deployed, which is why the intent validator rejects one", () => {
    expect(
      isFullyDeployed({
        ...intent(),
        envelope: { ...intent().envelope, chainIds: [], deploymentCalls: [] },
        deployments: [],
      }),
    ).toBe(true);
  });

  test("isFullyDeployed returns true when all chainIds are deployed", () => {
    expect(
      isFullyDeployed({
        ...intent(),
        envelope: {
          ...intent().envelope,
          chainIds: [8453],
        },
        deployments: [
          {
            chainId: 8453,
            projectId: "12",
            transactionHash: HASH,
            createdAt: "",
          },
        ],
      }),
    ).toBe(true);
  });

  test("mergeSearch maintains stable sort for equal timestamps", () => {
    const rows = [
      { id: "a", createdAt: 100 },
      { id: "b", createdAt: 100 },
    ];
    const items = [
      { ...searchItem(), intentId: "c", createdAt: "1970-01-01T00:01:40.000Z" }, // 100s
      { ...searchItem(), intentId: "d", createdAt: "1970-01-01T00:01:40.000Z" }, // 100s
    ];
    expect(
      mergeSearch(rows, items).map((r) =>
        "undeployed" in r ? r.intentId : r.id,
      ),
    ).toEqual(["a", "b", "c", "d"]);
  });
});
