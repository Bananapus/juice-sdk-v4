import { describe, expect, it } from "vitest";
import {
  JB_DRAFT_MAX_CHARS,
  JbDraftError,
  checkJbDraft,
  emptyJbDraft,
  emptyJbDraftItem,
  emptyJbDraftSplit,
  emptyJbDraftStage,
  jbDraftFileName,
  jbDraftUnsupported,
  parseJbDraft,
  serializeJbDraft,
  type JbDraft,
} from "./jbDraft.js";

function sample(): JbDraft {
  return {
    v: 2,
    kind: "revnet",
    name: "Sample",
    ticker: "SMPL",
    tagline: "",
    description: "A sample.",
    payNotice: "",
    tags: ["art"],
    logoUri: "ipfs://logo",
    coverUri: "",
    links: { website: "", twitter: "", discord: "", telegram: "", instagram: "", whatsapp: "" },
    chains: [1, 8453],
    linkChains: true,
    bridge: "ccip",
    owner: "",
    ownerPerChain: { 8453: "0x0000000000000000000000000000000000000001" },
    safe: null,
    accepts: ["eth"],
    customToken: "",
    anyToken: true,
    approvalHook: "",
    approvalHookPerChain: {},
    afterMode: "wait",
    stages: [
      {
        ...emptyJbDraftStage("revnet"),
        issuance: "10000",
        cutPercent: "2.5",
        cutDays: "30",
        cashOutTax: "0.1",
        reserved: [
          { ...emptyJbDraftSplit(), share: "20", address: "jango.eth" },
          {
            ...emptyJbDraftSplit("sticky"),
            share: "5",
            sticky: { group: "tenure", minWeeks: "1", maxWeeks: "52" },
          },
        ],
        autoIssuances: [{ count: "100", address: "jango.eth", chainId: 1 }],
      },
    ],
    shop: {
      currency: "eth",
      collectionName: "",
      collectionSymbol: "",
      preventOverspending: false,
      noNewTiersWithReserves: false,
      noNewTiersWithVotes: false,
      noNewTiersWithOwnerMinting: false,
      issueTokensForSplits: false,
      itemsRedeem: false,
      operatorCanAdjustTiers: true,
      operatorCanUpdateMetadata: true,
      operatorCanMint: true,
      operatorCanIncreaseDiscount: true,
      categories: [{ id: 1, name: "Shirts" }],
      items: [{ ...emptyJbDraftItem(), name: "Shirt", price: "0.1", supplyPerChain: { 1: "unlimited" } }],
    },
  };
}

const refused = (value: unknown) => {
  try {
    checkJbDraft(value);
  } catch (error) {
    expect(error).toBeInstanceOf(JbDraftError);
    return (error as Error).message;
  }
  throw new Error("accepted");
};

describe(".jb draft v2", () => {
  it("writes a file that reads back the same", () => {
    const written = serializeJbDraft(sample());
    expect(parseJbDraft(written)).toEqual(sample());
    expect(serializeJbDraft(parseJbDraft(written))).toBe(written);
  });

  it("refuses a file from before version 2 by name, never half reads it", () => {
    const { v: _v, ...old } = sample();
    for (const file of [old, { ...old, v: 1 }, { v: 1, app: "revnet.money", data: {} }]) {
      expect(refused(file)).toBe(
        "This .jb file was saved in a format this site no longer reads. Export it again from the site it came from.",
      );
    }
  });

  it("refuses an unknown key, a missing key and a wrong type, naming where", () => {
    expect(refused({ ...sample(), referral: "x" })).toBe(
      "That .jb file can't be read: draft.referral isn't valid.",
    );
    const { stages: _stages, ...missing } = sample();
    expect(refused(missing)).toBe("That .jb file can't be read: draft.stages isn't valid.");
    const stage = { ...sample().stages[0], cashOutTax: 10 };
    expect(refused({ ...sample(), stages: [stage] })).toBe(
      "That .jb file can't be read: draft.stages[0].cashOutTax isn't valid.",
    );
    const nested = { ...sample().stages[0], powers: { ...sample().stages[0].powers, mint: true } };
    expect(refused({ ...sample(), stages: [nested] })).toContain("draft.stages[0].powers.mint");
  });

  it("refuses values outside the format: numbers as text, lists past their cap, bad chain keys", () => {
    const withStage = (patch: object) => ({
      ...sample(),
      stages: [{ ...sample().stages[0], ...patch }],
    });
    expect(refused(withStage({ issuance: "1e9" }))).toContain("issuance");
    expect(refused(withStage({ issuance: "-1" }))).toContain("issuance");
    expect(refused(withStage({ metadataExtra: 0x4000 }))).toContain("metadataExtra");
    expect(refused(withStage({ startAt: 1.5 }))).toContain("startAt");
    expect(refused({ ...sample(), stages: [] })).toContain("draft.stages");
    expect(refused({ ...sample(), tags: ["a", "b", "c", "d"] })).toContain("draft.tags");
    expect(refused({ ...sample(), ownerPerChain: { base: "0x1" } })).toContain("ownerPerChain.base");
    expect(refused({ ...sample(), name: "x".repeat(101) })).toContain("draft.name");
    expect(refused({ ...sample(), chains: [0] })).toContain("draft.chains[0]");
  });

  it("drops nothing a prototype could add and never writes a refused draft", () => {
    const polluted = JSON.parse(`{"__proto__":{"extra":1},${serializeJbDraft(sample()).slice(1)}`);
    expect(refused(polluted)).toContain("__proto__");
    expect(() => serializeJbDraft({ ...sample(), kind: "simple" as never })).toThrow(JbDraftError);
  });

  it("reads text: too large, not JSON, not an object", () => {
    expect(() => parseJbDraft(" ".repeat(JB_DRAFT_MAX_CHARS + 1))).toThrow("That file is too large.");
    for (const source of ["nope", "[]", "null", "3"]) {
      expect(() => parseJbDraft(source)).toThrow("That doesn't look like a .jb file.");
    }
  });

  it("names files and words a site's refusal", () => {
    expect(jbDraftFileName("My Project!")).toBe("my-project.jb");
    expect(jbDraftFileName("***", "revnet")).toBe("revnet.jb");
    expect(jbDraftUnsupported("revnet.money", "tags").message).toBe(
      "revnet.money can't launch this file: it has tags.",
    );
  });

  it("hands out fresh empty rows", () => {
    const first = emptyJbDraftSplit();
    first.addressPerChain[1] = "0x1";
    expect(emptyJbDraftSplit().addressPerChain).toEqual({});
    expect(emptyJbDraftStage("project", ["usdc"]).baseCurrency).toBe("usd");
    expect(emptyJbDraftStage("project", ["eth", "usdc"]).payouts.map((p) => p.token)).toEqual([
      "eth",
      "usdc",
    ]);
  });

  it("refuses a revnet file carrying owner rules, and a project file carrying revnet ones", () => {
    const revnetStage = (patch: object) => ({
      ...sample(),
      stages: [{ ...sample().stages[0], ...patch }],
    });
    const payout = { token: "eth", mode: "all", currency: "eth", splits: [] };
    expect(refused(revnetStage({ payouts: [payout] }))).toContain("stages[0].payouts");
    expect(refused(revnetStage({ pause721Transfers: false }))).toContain("pause721Transfers");
    expect(refused(revnetStage({ duration: 86_400 }))).toContain("duration");
    expect(refused(revnetStage({ approval: "1day" }))).toContain("approval");
    expect(refused(revnetStage({ ownerMinting: true }))).toContain("ownerMinting");
    expect(
      refused(revnetStage({ powers: { ...sample().stages[0].powers, setTerminals: true } })),
    ).toContain("powers");
    expect(refused(revnetStage({ cutPercent: "5", cutDays: "" }))).toContain("cutDays");
    expect(refused(revnetStage({ cutPercent: "", cutDays: "0" }))).toContain("cutDays");
    expect(checkJbDraft(revnetStage({ cutPercent: "", cutDays: "30" })).stages[0].cutDays).toBe("30");
    expect(refused({ ...sample(), afterMode: "cycle" })).toContain("afterMode");
    expect(refused({ ...sample(), approvalHook: "0x1" })).toContain("approvalHook");

    const ethPayout = { token: "eth", mode: "none", currency: "eth", splits: [] };
    const projectStageBase = emptyJbDraftStage();
    const project = { ...sample(), kind: "project", stages: [projectStageBase] };
    expect(checkJbDraft(project).kind).toBe("project");
    const projectStage = (patch: object) => ({
      ...project,
      stages: [projectStageBase, { ...projectStageBase, ...patch }],
    });
    expect(refused(projectStage({ payouts: [] }))).toContain("stages[1].payouts");
    expect(refused(projectStage({ baseCurrency: "token" }))).toContain("baseCurrency");
    const row = { ...emptyJbDraftSplit(), share: "50", address: "a.eth" };
    expect(
      checkJbDraft(projectStage({ payouts: [{ ...ethPayout, mode: "all", splits: [row] }] })).stages,
    ).toHaveLength(2);
    expect(
      refused(projectStage({ payouts: [{ ...ethPayout, mode: "amounts", splits: [row] }] })),
    ).toContain("splits[0].share");
    expect(refused(projectStage({ payouts: [{ ...ethPayout, splits: [row] }] }))).toContain(
      "payouts[0].splits",
    );
    expect(refused(projectStage({ reserved: [{ ...row, projectId: "3" }] }))).toContain("projectId");
    expect(refused(projectStage({ reserved: [{ ...row, hook: "0x1" }] }))).toContain("hook");
    expect(refused(projectStage({ reserved: [{ ...row, amount: "1" }] }))).toContain("amount");
    expect(refused({ ...project, accepts: ["custom", "eth"] })).toContain("draft.accepts");
    expect(refused({ ...project, chains: [1, 1] })).toContain("draft.chains");
    expect(refused(projectStage({ cutDays: "30" }))).toContain("stages[1].cutDays");
    expect(refused(projectStage({ startAfterDays: "30" }))).toContain("startAfterDays");
    expect(
      refused(projectStage({ autoIssuances: [{ count: "1", address: "a.eth", chainId: 1 }] })),
    ).toContain("autoIssuances");
    expect(refused(projectStage({ startAt: 1_900_000_000, startAfterCycles: "2" }))).toContain(
      "startAfterCycles",
    );
    expect(checkJbDraft(projectStage({ startAfterCycles: "2" })).stages).toHaveLength(2);
  });

  it("fills what a short file leaves out, the same way for every reader", () => {
    const short = {
      v: 2,
      kind: "project",
      name: "Short",
      chains: [8453],
      stages: [{ issuance: "10000", cashOutTax: "0.1", reserved: [{ share: "10", address: "a.eth" }] }],
    };
    const filled = checkJbDraft(short);
    expect(filled).toEqual({
      ...emptyJbDraft(),
      name: "Short",
      chains: [8453],
      stages: [
        {
          ...emptyJbDraftStage(),
          issuance: "10000",
          cashOutTax: "0.1",
          reserved: [{ ...emptyJbDraftSplit(), share: "10", address: "a.eth" }],
        },
      ],
    });
    expect(filled.stages[0]).toMatchObject({
      approval: "1day",
      baseCurrency: "eth",
      payouts: [{ token: "eth", mode: "none", currency: "eth", splits: [] }],
    });
    expect(checkJbDraft(JSON.parse(serializeJbDraft(filled)))).toEqual(filled);

    const usdc = checkJbDraft({
      ...short,
      accepts: ["usdc"],
      stages: [{ payouts: [{ token: "usdc", mode: "all", splits: [{ share: "50", address: "a.eth" }] }] }],
    });
    expect(usdc.shop.currency).toBe("usd");
    expect(usdc.stages[0]).toMatchObject({
      baseCurrency: "usd",
      surplusAllowance: { currency: "usd" },
      payouts: [{ currency: "usd", splits: [{ to: "address", lockedUntil: 0 }] }],
    });

    const revnet = checkJbDraft({ v: 2, kind: "revnet", stages: [{ issuance: "1" }, {}] });
    expect(revnet.stages[1]).toMatchObject({ cashOutTax: "0.1", pause721Transfers: true, approval: "none", payouts: [] });
    expect(refused({ ...short, stages: [{ isuance: "1" }] })).toContain("stages[0].isuance");
    expect(refused({ ...short, links: { site: "x" } })).toContain("links.site");
  });

  it("ties a Sticky group to a Sticky row", () => {
    const withReserved = (row: object) => ({
      ...sample(),
      stages: [{ ...sample().stages[0], reserved: [row] }],
    });
    expect(refused(withReserved({ ...emptyJbDraftSplit("sticky") }))).toContain("reserved[0].sticky");
    expect(
      refused(
        withReserved({
          ...emptyJbDraftSplit(),
          sticky: { group: "all", minWeeks: "", maxWeeks: "" },
        }),
      ),
    ).toContain("reserved[0].sticky");
  });
});
