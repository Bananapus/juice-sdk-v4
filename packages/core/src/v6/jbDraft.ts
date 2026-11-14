/**
 * The `.jb` launch draft, version 2: one file every Juicebox client reads and writes.
 *
 * The file states what to launch in plain units, never a site's form state:
 * - amounts, rates and percents are decimal strings in human units ("10000", "2.5");
 * - percents run 0 to 100, and a cash out tax runs 0 to 1, as the sites show it;
 * - times are unix seconds, 0 meaning "not set";
 * - chain ids are the real ids, and a per-chain map overrides its default on that chain.
 *
 * A reader is strict. A file with an unknown key or a value of the wrong type is refused,
 * so a site never opens part of a file. Only `v`, `kind` and `stages` must be written: a
 * key left out takes the default the `emptyJbDraft*` helpers give, so a short file written
 * by hand says the same thing on every site. What a site's own form cannot express is
 * that site's rule: it refuses with {@link jbDraftUnsupported}.
 */

export const JB_DRAFT_VERSION = 2;
export const JB_DRAFT_MAX_CHARS = 2_000_000;

/** `eth` and `usd` are the protocol's abstract currencies; `token` is the accepted custom token. */
export type JbDraftCurrency = "eth" | "usd" | "token";
export type JbDraftApproval =
  | "none"
  | "3hours"
  | "1day"
  | "3days"
  | "7days"
  | "custom";
export type JbDraftChainMap = Record<number, string>;

export type JbDraftSplit = {
  /** Percent share. Reserved rows: of all new tokens. Payout rows in `all` mode: of the
   *  payout. Item rows: of each sale. Empty on a payout row in `amounts` mode. */
  share: string;
  /** Payout rows in `amounts` mode: the amount, in the payout's currency. Else empty. */
  amount: string;
  amountPerChain: JbDraftChainMap;
  to: "address" | "project" | "fundMarket" | "sticky" | "hook";
  /** `address`: the recipient. `project` and `hook`: who gets that project's tokens.
   *  `sticky`: the Sticky token. */
  address: string;
  addressPerChain: JbDraftChainMap;
  /** `project`, and optionally `hook`. */
  projectId: string;
  projectIdPerChain: JbDraftChainMap;
  /** `hook`: the split hook contract. */
  hook: string;
  addToBalance: boolean;
  /** Unix seconds, 0 for unlocked. */
  lockedUntil: number;
  sticky: {
    group: "all" | "tenure";
    minWeeks: string;
    maxWeeks: string;
  } | null;
};

export type JbDraftPayout = {
  token: "eth" | "usdc" | "custom";
  /** `all` pays out everything the project holds in this token, by share. `amounts` pays
   *  each row its amount. */
  mode: "none" | "all" | "amounts";
  /** What the `amounts` are counted in. */
  currency: JbDraftCurrency;
  splits: JbDraftSplit[];
};

export type JbDraftStage = {
  /** First stage: when it starts, 0 for at launch. A later project stage that starts on a
   *  date: that date. Else 0. */
  startAt: number;
  /** A later project stage: after this many cycles of the one before. Empty when by date. */
  startAfterCycles: string;
  /** A later revnet stage: days after the one before starts. A stage starts on a cut of
   *  the one before, so every site rounds this up to that stage's `cutDays`. */
  startAfterDays: string;
  /** Project: cycle length in seconds, 0 for "until changed". Revnets have none. */
  duration: number;
  /** Tokens per one unit of `baseCurrency`. Empty on a later stage keeps the rate before it. */
  issuance: string;
  baseCurrency: JbDraftCurrency;
  /** Percent cut each cycle (project) or each `cutDays` (revnet). Empty or 0 for none. */
  cutPercent: string;
  cutDays: string;
  reserved: JbDraftSplit[];
  /** Revnet: tokens minted when the stage starts, each row on its one chain. */
  autoIssuances: { count: string; address: string; chainId: number }[];
  /** 0 to 1. A project at 1 has cash outs off. */
  cashOutTax: string;
  payouts: JbDraftPayout[];
  surplusAllowance: {
    mode: "none" | "unlimited" | "limited";
    amount: string;
    currency: JbDraftCurrency;
  };
  approval: JbDraftApproval;
  holdFees: boolean;
  ownerMinting: boolean;
  pausePay: boolean;
  pauseCreditTransfers: boolean;
  pause721Transfers: boolean;
  useTotalSurplusForCashOuts: boolean;
  ownerMustSendPayouts: boolean;
  /** The ruleset's free 14 bits. */
  metadataExtra: number;
  powers: {
    setTerminals: boolean;
    setController: boolean;
    terminalMigration: boolean;
    setCustomToken: boolean;
    addAccountingContext: boolean;
    addPriceFeed: boolean;
  };
};

export type JbDraftItem = {
  name: string;
  description: string;
  /** The pinned image or media, and the pinned metadata JSON when it already exists. */
  mediaUri: string;
  /** A hint a site may ignore: the media's MIME type. */
  mediaType: string;
  metadataUri: string;
  price: string;
  /** Empty for unlimited. */
  supply: string;
  /** A number, or "unlimited". */
  supplyPerChain: JbDraftChainMap;
  /** Chains this item is left off. */
  excludedChains: number[];
  discountPercent: string;
  /** One of every N goes to `reserveBeneficiary`. Empty for none. */
  reserveEvery: string;
  reserveBeneficiary: string;
  reserveBeneficiaryPerChain: JbDraftChainMap;
  category: number;
  votingUnits: string;
  splits: JbDraftSplit[];
  allowOwnerMint: boolean;
  transfersPausable: boolean;
  cantBeRemoved: boolean;
  allowCredits: boolean;
  ownerCanEditDiscount: boolean;
};

export type JbDraftShop = {
  currency: JbDraftCurrency;
  collectionName: string;
  collectionSymbol: string;
  preventOverspending: boolean;
  noNewTiersWithReserves: boolean;
  noNewTiersWithVotes: boolean;
  noNewTiersWithOwnerMinting: boolean;
  issueTokensForSplits: boolean;
  itemsRedeem: boolean;
  /** Revnet: what the operator may do with the shop. */
  operatorCanAdjustTiers: boolean;
  operatorCanUpdateMetadata: boolean;
  operatorCanMint: boolean;
  operatorCanIncreaseDiscount: boolean;
  categories: { id: number; name: string }[];
  items: JbDraftItem[];
};

export type JbDraft = {
  v: typeof JB_DRAFT_VERSION;
  kind: "project" | "revnet";
  name: string;
  ticker: string;
  tagline: string;
  description: string;
  payNotice: string;
  tags: string[];
  logoUri: string;
  coverUri: string;
  links: {
    website: string;
    twitter: string;
    discord: string;
    telegram: string;
    instagram: string;
    whatsapp: string;
  };
  chains: number[];
  /** Bridge the chains to each other. Only matters above one chain. */
  linkChains: boolean;
  bridge: "ccip" | "native" | "both";
  /** The project's owner, or the revnet's operator. Empty for the launching wallet. */
  owner: string;
  ownerPerChain: JbDraftChainMap;
  /** A new Safe to create as the owner or operator, in place of `owner`. */
  safe: { signers: string[]; threshold: number } | null;
  /** `custom` stands alone and names `customToken`. */
  accepts: ("eth" | "usdc" | "custom")[];
  customToken: string;
  /** Accept any token by swapping it on the way in. */
  anyToken: boolean;
  /** The contract behind a stage whose `approval` is `custom`. */
  approvalHook: string;
  approvalHookPerChain: JbDraftChainMap;
  /** What follows a single timed last stage of a project. */
  afterMode: "wait" | "terminal" | "cycle";
  stages: JbDraftStage[];
  shop: JbDraftShop;
};

export class JbDraftError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JbDraftError";
  }
}

/** The refusal a site gives a file holding something its form cannot express. */
export function jbDraftUnsupported(site: string, what: string): JbDraftError {
  return new JbDraftError(`${site} can't launch this file: it has ${what}.`);
}

/** `my-project.jb`, or `<fallback>.jb` for a name with nothing to keep. */
export function jbDraftFileName(name: string, fallback = "project"): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || fallback}.jb`;
}

/**
 * A number as a form holds it, written the way the format reads it: ".5" is "0.5", "5." is
 * "5", and nothing typed stays "". Anything else (an exponent, a comma, a sign) throws, so a
 * writer never drops a value the form would have launched with.
 */
export function jbDraftDecimal(value: unknown): string {
  const typed = String(value ?? "").trim();
  if (typed === "") return "";
  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(typed)) {
    throw new JbDraftError(
      `This draft has a number a .jb file can't hold: ${typed.slice(0, 40)}.`,
    );
  }
  const [whole, fraction = ""] = typed.split(".");
  // One spelling per number: no zeros ahead of it.
  const lead = whole.replace(/^0+(?=\d)/, "") || "0";
  return fraction ? `${lead}.${fraction}` : lead;
}

type Check<T> = (value: unknown, path: string) => T;

function invalid(path: string): never {
  throw new JbDraftError(`That .jb file can't be read: ${path} isn't valid.`);
}

const text =
  (max: number): Check<string> =>
  (value, path) =>
    typeof value === "string" && value.length <= max ? value : invalid(path);

const decimal: Check<string> = (value, path) =>
  typeof value === "string" &&
  value.length <= 40 &&
  /^(?:(?:0|[1-9]\d*)(?:\.\d+)?)?$/.test(value)
    ? value
    : invalid(path);

/** A count: a whole number a script holds exactly, or "" for none. */
const count: Check<string> = (value, path) =>
  typeof value === "string" && /^(?:0|[1-9]\d{0,14})?$/.test(value)
    ? value
    : invalid(path);

const flag: Check<boolean> = (value, path) =>
  typeof value === "boolean" ? value : invalid(path);

const whole =
  (min: number, max: number): Check<number> =>
  (value, path) =>
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= min &&
    value <= max
      ? value
      : invalid(path);

const oneOf =
  <const T extends string>(...options: T[]): Check<T> =>
  (value, path) =>
    options.includes(value as T) ? (value as T) : invalid(path);

const list =
  <T>(item: Check<T>, max: number, min = 0): Check<T[]> =>
  (value, path) =>
    Array.isArray(value) && value.length >= min && value.length <= max
      ? value.map((entry, index) => item(entry, `${path}[${index}]`))
      : invalid(path);

const nullable =
  <T>(item: Check<T>): Check<T | null> =>
  (value, path) =>
    value === null ? null : item(value, path);

function record(value: unknown, path: string): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : invalid(path);
}

/** Exactly these keys: a missing one or an extra one refuses the file. */
const shape =
  <T>(spec: { [K in keyof T]-?: Check<T[K]> }): Check<T> =>
  (value, path) => {
    const source = record(value, path);
    for (const key of Object.keys(source)) {
      if (!Object.prototype.hasOwnProperty.call(spec, key))
        invalid(`${path}.${key}`);
    }
    const out = {} as T;
    for (const key of Object.keys(spec) as (keyof T & string)[]) {
      // Defaults are filled before this runs, so a key still missing is one that must be written.
      if (!Object.prototype.hasOwnProperty.call(source, key))
        invalid(`${path}.${key}`);
      out[key] = spec[key](source[key], `${path}.${key}`);
    }
    return out;
  };

const MAX_CHAINS = 16;
const chainId = whole(1, Number.MAX_SAFE_INTEGER);

const chainMap =
  (entry: Check<string>): Check<JbDraftChainMap> =>
  (value, path) => {
    const source = record(value, path);
    const keys = Object.keys(source);
    if (keys.length > MAX_CHAINS) invalid(path);
    const out: JbDraftChainMap = {};
    for (const key of keys) {
      if (!/^[1-9]\d{0,15}$/.test(key)) invalid(`${path}.${key}`);
      out[Number(key)] = entry(source[key], `${path}.${key}`);
    }
    return out;
  };

/** An address, or a name that resolves to one (it has a dot), or "" for none. Anything
 *  else, a bare number say, would be read as something other than an address. */
const address: Check<string> = (value, path) =>
  typeof value === "string" &&
  value.length <= 64 &&
  /^(?:0x[0-9a-fA-F]{40}|[^\s.]+(?:\.[^\s.]+)+)?$/.test(value)
    ? value
    : invalid(path);
const addresses = chainMap(address);
const decimals = chainMap(decimal);
const currency = oneOf("eth", "usd", "token");
/** Far enough out for any date, small enough to stay a date (year 2286). */
const time = whole(0, 9_999_999_999);

const supplyOnChain: Check<string> = (value, path) =>
  value === "unlimited" ? value : count(value, path);

const split = shape<JbDraftSplit>({
  share: decimal,
  amount: decimal,
  amountPerChain: decimals,
  to: oneOf("address", "project", "fundMarket", "sticky", "hook"),
  address,
  addressPerChain: addresses,
  projectId: decimal,
  projectIdPerChain: decimals,
  hook: address,
  addToBalance: flag,
  lockedUntil: time,
  sticky: nullable(
    shape<NonNullable<JbDraftSplit["sticky"]>>({
      group: oneOf("all", "tenure"),
      minWeeks: decimal,
      maxWeeks: decimal,
    }),
  ),
});
const splits = list(split, 100);

const stage = shape<JbDraftStage>({
  startAt: time,
  startAfterCycles: count,
  startAfterDays: decimal,
  duration: whole(0, 4_294_967_295),
  issuance: decimal,
  baseCurrency: currency,
  cutPercent: decimal,
  cutDays: decimal,
  reserved: splits,
  autoIssuances: list(
    shape<JbDraftStage["autoIssuances"][number]>({
      count: decimal,
      address,
      chainId,
    }),
    100,
  ),
  cashOutTax: decimal,
  payouts: list(
    shape<JbDraftPayout>({
      token: oneOf("eth", "usdc", "custom"),
      mode: oneOf("none", "all", "amounts"),
      currency,
      splits,
    }),
    3,
  ),
  surplusAllowance: shape<JbDraftStage["surplusAllowance"]>({
    mode: oneOf("none", "unlimited", "limited"),
    amount: decimal,
    currency,
  }),
  approval: oneOf("none", "3hours", "1day", "3days", "7days", "custom"),
  holdFees: flag,
  ownerMinting: flag,
  pausePay: flag,
  pauseCreditTransfers: flag,
  pause721Transfers: flag,
  useTotalSurplusForCashOuts: flag,
  ownerMustSendPayouts: flag,
  metadataExtra: whole(0, 0x3fff),
  powers: shape<JbDraftStage["powers"]>({
    setTerminals: flag,
    setController: flag,
    terminalMigration: flag,
    setCustomToken: flag,
    addAccountingContext: flag,
    addPriceFeed: flag,
  }),
});

const uri = text(500);

const item = shape<JbDraftItem>({
  name: text(100),
  description: text(2_000),
  mediaUri: uri,
  mediaType: text(100),
  metadataUri: uri,
  price: decimal,
  supply: count,
  supplyPerChain: chainMap(supplyOnChain),
  excludedChains: list(chainId, MAX_CHAINS),
  discountPercent: decimal,
  reserveEvery: count,
  reserveBeneficiary: address,
  reserveBeneficiaryPerChain: addresses,
  category: whole(0, 0xffffff),
  votingUnits: count,
  splits,
  allowOwnerMint: flag,
  transfersPausable: flag,
  cantBeRemoved: flag,
  allowCredits: flag,
  ownerCanEditDiscount: flag,
});

const draft = shape<JbDraft>({
  v: (value, path) =>
    value === JB_DRAFT_VERSION ? JB_DRAFT_VERSION : invalid(path),
  kind: oneOf("project", "revnet"),
  name: text(100),
  ticker: text(32),
  tagline: text(100),
  description: text(10_000),
  payNotice: text(1_000),
  tags: list(text(30), 3),
  logoUri: uri,
  coverUri: uri,
  links: shape<JbDraft["links"]>({
    website: uri,
    twitter: uri,
    discord: uri,
    telegram: uri,
    instagram: uri,
    whatsapp: uri,
  }),
  chains: list(chainId, MAX_CHAINS),
  linkChains: flag,
  bridge: oneOf("ccip", "native", "both"),
  owner: address,
  ownerPerChain: addresses,
  safe: nullable(
    shape<NonNullable<JbDraft["safe"]>>({
      signers: list(address, 20),
      threshold: whole(0, 20),
    }),
  ),
  accepts: list(oneOf("eth", "usdc", "custom"), 2),
  customToken: address,
  anyToken: flag,
  approvalHook: address,
  approvalHookPerChain: addresses,
  afterMode: oneOf("wait", "terminal", "cycle"),
  stages: list(stage, 32, 1),
  shop: shape<JbDraftShop>({
    currency,
    collectionName: text(100),
    collectionSymbol: text(32),
    preventOverspending: flag,
    noNewTiersWithReserves: flag,
    noNewTiersWithVotes: flag,
    noNewTiersWithOwnerMinting: flag,
    issueTokensForSplits: flag,
    itemsRedeem: flag,
    operatorCanAdjustTiers: flag,
    operatorCanUpdateMetadata: flag,
    operatorCanMint: flag,
    operatorCanIncreaseDiscount: flag,
    categories: list(
      shape<JbDraftShop["categories"][number]>({
        id: whole(1, 0xffffff),
        name: text(64),
      }),
      255,
    ),
    items: list(item, 100),
  }),
});

/**
 * What the shape alone cannot say. A revnet has no owner rules, so a revnet file carries
 * none: a reader never has to decide what a payout on a revnet would mean.
 */
function checkKind(value: JbDraft): void {
  const revnet = value.kind === "revnet";
  const custom = value.accepts.includes("custom");
  const hasEntries = (map: object) => Object.keys(map).length > 0;
  const bad = (when: boolean, path: string) => {
    if (when) invalid(path);
  };
  /** `token` means the custom token, so it needs one. */
  const money = (unit: JbDraftCurrency, path: string) =>
    bad(unit === "token" && !custom, path);
  /** Digits after the point. The protocol stores each rate at a fixed precision, so a
   *  value finer than it holds would launch as something else: the file is refused. */
  const places = (text: string) => (text.split(".")[1] ?? "").length;
  const rate = (text: string, max: number, finest: number, path: string) =>
    bad(Number(text) > max || places(text) > finest, path);
  /** Shares of one whole: each within what a split holds, together no more than 100. */
  const shares = (rows: JbDraftSplit[], finest: number, path: string) => {
    rows.forEach((row, index) =>
      rate(row.share, 100, finest, `${path}[${index}].share`),
    );
    const total = rows.reduce(
      (sum, row) => sum + Math.round(Number(row.share) * 1e7),
      0,
    );
    bad(total > 100 * 1e7, path);
  };
  /** A price no finer than its currency counts: 18 places of ETH, 6 of USD. */
  const price = (text: string, unit: JbDraftCurrency, path: string) =>
    bad(places(text) > (unit === "usd" ? 6 : 18), path);
  /** An amount no finer than its token counts: 6 places of USDC, 18 of anything else. A
   *  custom token with fewer decimals is for the site that knows them to refuse. */
  const amount = (text: string, token: Token | undefined, path: string) =>
    bad(places(text) > (token === "usdc" ? 6 : 18), path);
  /** A token count in its 18-place units, within what the protocol's field holds. */
  const units = (text: string, bits: bigint, path: string) => {
    bad(places(text) > 18, path);
    const [whole, fraction = ""] = text.split(".");
    bad(BigInt((whole || "0") + fraction.padEnd(18, "0")) >= 2n ** bits, path);
  };
  /** A project id is a whole number a script holds exactly. */
  const projectIds = (row: JbDraftSplit, path: string) =>
    [row.projectId, ...Object.values(row.projectIdPerChain)].forEach((id) =>
      bad(!/^(?:[1-9]\d{0,14})?$/.test(id), `${path}.projectId`),
    );
  /** Days that are a whole number of seconds, so no site has to round them. */
  const days = (text: string, path: string) =>
    bad(
      places(text) > 5 ||
        (BigInt(text.replace(".", "") || "0") * 86_400n) %
          10n ** BigInt(places(text)) !==
          0n ||
        // The protocol counts a cycle in 32 bits of seconds.
        Number(text) * 86_400 > 4_294_967_295,
      path,
    );
  /** A row carries only what its kind uses, and a share or an amount, never both. */
  const eachSplit = (rows: JbDraftSplit[], path: string, amounts = false) =>
    rows.forEach((row, index) => {
      const at = `${path}[${index}]`;
      bad((row.to === "sticky") !== (row.sticky !== null), `${at}.sticky`);
      projectIds(row, at);
      bad(row.to !== "hook" && row.hook !== "", `${at}.hook`);
      bad(row.to !== "project" && row.addToBalance, `${at}.addToBalance`);
      // A project row names a project. A hook row may pass one on to its hook.
      const takesProject =
        row.to === "project" || row.to === "hook" || row.to === "fundMarket";
      bad(!takesProject && row.projectId !== "", `${at}.projectId`);
      bad(
        row.to !== "project" &&
          row.to !== "hook" &&
          hasEntries(row.projectIdPerChain),
        `${at}.projectIdPerChain`,
      );
      bad(
        amounts ? row.share !== "" : row.amount !== "",
        amounts ? `${at}.share` : `${at}.amount`,
      );
      bad(!amounts && hasEntries(row.amountPerChain), `${at}.amountPerChain`);
    });
  bad(custom && value.accepts.length > 1, "draft.accepts");
  // One order for the accepted tokens, so no reader pairs a payout with the wrong one.
  bad(value.accepts.join() === "usdc,eth", "draft.accepts");
  // REVDeployer turns both of these off for every revnet's shop.
  bad(
    revnet && value.shop.issueTokensForSplits,
    "draft.shop.issueTokensForSplits",
  );
  bad(revnet && value.shop.itemsRedeem, "draft.shop.itemsRedeem");
  // A revnet's deployer takes any token through its router: a file cannot turn that off.
  bad(revnet && !value.anyToken, "draft.anyToken");
  bad(new Set(value.accepts).size !== value.accepts.length, "draft.accepts");
  bad(new Set(value.chains).size !== value.chains.length, "draft.chains");
  // A new Safe is the owner: a file names one or the other, never both.
  bad(
    value.safe !== null &&
      (value.owner !== "" || hasEntries(value.ownerPerChain)),
    "draft.safe",
  );
  bad(revnet && value.afterMode !== "wait", "draft.afterMode");
  bad(revnet && value.approvalHook !== "", "draft.approvalHook");
  bad(
    revnet && hasEntries(value.approvalHookPerChain),
    "draft.approvalHookPerChain",
  );
  money(value.shop.currency, "draft.shop.currency");
  // A shop with items launches under a name: each site would otherwise make up its own.
  bad(
    value.shop.items.length > 0 && value.shop.collectionName.trim() === "",
    "draft.shop.collectionName",
  );
  bad(
    value.shop.items.length > 0 && value.shop.collectionSymbol.trim() === "",
    "draft.shop.collectionSymbol",
  );
  value.shop.items.forEach((entry, index) => {
    const at = `draft.shop.items[${index}]`;
    eachSplit(entry.splits, `${at}.splits`);
    shares(entry.splits, 7, `${at}.splits`);
    price(entry.price, value.shop.currency, `${at}.price`);
    // A discount is stored in halves of a percent.
    bad(
      !/^(?:\d+(?:\.[05])?)?$/.test(entry.discountPercent) ||
        Number(entry.discountPercent) > 100,
      `${at}.discountPercent`,
    );
  });
  value.stages.forEach((entry, index) => {
    const at = `draft.stages[${index}]`;
    money(entry.baseCurrency, `${at}.baseCurrency`);
    // Issuance counts 18 places. The smallest amount is how the protocol says "keep the
    // rate before", so a file cannot ask for it as a rate.
    units(entry.issuance, 112n, `${at}.issuance`);
    bad(/^0\.0{17}1$/.test(entry.issuance), `${at}.issuance`);
    rate(entry.cashOutTax, 1, 4, `${at}.cashOutTax`);
    days(entry.cutDays, `${at}.cutDays`);
    days(entry.startAfterDays, `${at}.startAfterDays`);
    amount(
      entry.surplusAllowance.amount,
      value.accepts.join() === "usdc" ? "usdc" : undefined,
      `${at}.surplusAllowance.amount`,
    );
    entry.autoIssuances.forEach((row, n) => {
      units(row.count, 104n, `${at}.autoIssuances[${n}].count`);
      bad(
        !value.chains.includes(row.chainId),
        `${at}.autoIssuances[${n}].chainId`,
      );
    });
    rate(entry.cutPercent, 100, 7, `${at}.cutPercent`);
    // The reserved percent is stored in hundredths, and its rows add up to it.
    shares(entry.reserved, 2, `${at}.reserved`);
    money(entry.surplusAllowance.currency, `${at}.surplusAllowance.currency`);
    eachSplit(entry.reserved, `${at}.reserved`);
    entry.payouts.forEach((payout, n) => {
      money(payout.currency, `${at}.payouts[${n}].currency`);
      bad(
        payout.mode === "none" && payout.splits.length > 0,
        `${at}.payouts[${n}].splits`,
      );
      eachSplit(
        payout.splits,
        `${at}.payouts[${n}].splits`,
        payout.mode === "amounts",
      );
      payout.splits.forEach((row, r) => {
        const split = `${at}.payouts[${n}].splits[${r}]`;
        amount(row.amount, payout.token, `${split}.amount`);
        Object.values(row.amountPerChain).forEach((text) =>
          amount(text, payout.token, `${split}.amountPerChain`),
        );
      });
      if (payout.mode === "all")
        shares(payout.splits, 7, `${at}.payouts[${n}].splits`);
    });
    bad(index === 0 && entry.startAfterCycles !== "", `${at}.startAfterCycles`);
    bad(index === 0 && entry.startAfterDays !== "", `${at}.startAfterDays`);
    bad(
      entry.startAt > 0 && entry.startAfterCycles !== "",
      `${at}.startAfterCycles`,
    );
    if (!revnet) {
      // One payout entry per accepted token, in the same order.
      bad(
        entry.payouts.map((payout) => payout.token).join() !==
          value.accepts.join(),
        `${at}.payouts`,
      );
      bad(entry.autoIssuances.length > 0, `${at}.autoIssuances`);
      bad(entry.startAfterDays !== "", `${at}.startAfterDays`);
      bad(entry.cutDays !== "", `${at}.cutDays`);
      return;
    }
    bad(index > 0 && entry.startAt > 0, `${at}.startAt`);
    // A cut repeats on the stage's cycle, so it needs one. A cycle is at least a day.
    bad(entry.cutDays !== "" && !(Number(entry.cutDays) > 0), `${at}.cutDays`);
    bad(Number(entry.cutPercent) > 0 && entry.cutDays === "", `${at}.cutDays`);
    bad(entry.startAfterCycles !== "", `${at}.startAfterCycles`);
    bad(entry.duration !== 0, `${at}.duration`);
    bad(entry.payouts.length > 0, `${at}.payouts`);
    bad(entry.surplusAllowance.mode !== "none", `${at}.surplusAllowance`);
    bad(entry.approval !== "none", `${at}.approval`);
    bad(entry.holdFees, `${at}.holdFees`);
    bad(entry.ownerMinting, `${at}.ownerMinting`);
    bad(entry.pausePay, `${at}.pausePay`);
    bad(entry.pauseCreditTransfers, `${at}.pauseCreditTransfers`);
    bad(!entry.pause721Transfers, `${at}.pause721Transfers`);
    bad(!entry.useTotalSurplusForCashOuts, `${at}.useTotalSurplusForCashOuts`);
    bad(entry.ownerMustSendPayouts, `${at}.ownerMustSendPayouts`);
    // REVDeployer takes a cash out tax under 1: a revnet always lets its holders out.
    bad(Number(entry.cashOutTax) >= 1, `${at}.cashOutTax`);
    bad(Object.values(entry.powers).some(Boolean), `${at}.powers`);
  });
}

type Token = JbDraft["accepts"][number];
const TOKEN_CURRENCY: Record<Token, JbDraftCurrency> = {
  eth: "eth",
  usdc: "usd",
  custom: "token",
};

/** What a token's amounts are counted in when nothing says otherwise: itself. */
export function jbDraftTokenCurrency(token: Token): JbDraftCurrency {
  return TOKEN_CURRENCY[token];
}

/** What issuance is priced in when nothing says otherwise: the custom token, else ETH when
 *  ETH is accepted, else USD. */
export function jbDraftBaseCurrency(
  accepts: readonly Token[],
): JbDraftCurrency {
  return accepts.includes("custom")
    ? "token"
    : accepts.includes("eth")
      ? "eth"
      : "usd";
}

/** A split row with everything unset, for a writer to fill. */
export function emptyJbDraftSplit(
  to: JbDraftSplit["to"] = "address",
): JbDraftSplit {
  return {
    share: "",
    amount: "",
    amountPerChain: {},
    to,
    address: "",
    addressPerChain: {},
    projectId: "",
    projectIdPerChain: {},
    hook: "",
    addToBalance: false,
    lockedUntil: 0,
    sticky: null,
  };
}

/** A token's payout entry with no payouts. */
export function emptyJbDraftPayout(token: Token): JbDraftPayout {
  return { token, mode: "none", currency: TOKEN_CURRENCY[token], splits: [] };
}

/**
 * A stage with nothing chosen. A project's has cash outs off, one day for the rules before
 * it to be approved, and no payouts in any accepted token. A revnet's has the 0.1 cash out
 * tax a revnet starts at and keeps shop items from moving, as REVDeployer does.
 */
export function emptyJbDraftStage(
  kind: JbDraft["kind"] = "project",
  accepts: readonly Token[] = ["eth"],
): JbDraftStage {
  const revnet = kind === "revnet";
  return {
    startAt: 0,
    startAfterCycles: "",
    startAfterDays: "",
    duration: 0,
    issuance: "",
    baseCurrency: jbDraftBaseCurrency(accepts),
    cutPercent: "",
    cutDays: "",
    reserved: [],
    autoIssuances: [],
    cashOutTax: revnet ? "0.1" : "1",
    payouts: revnet ? [] : accepts.map(emptyJbDraftPayout),
    surplusAllowance: {
      mode: "none",
      amount: "",
      currency: TOKEN_CURRENCY[accepts[0] ?? "eth"],
    },
    approval: revnet ? "none" : "1day",
    holdFees: false,
    ownerMinting: false,
    pausePay: false,
    pauseCreditTransfers: false,
    pause721Transfers: revnet,
    useTotalSurplusForCashOuts: true,
    ownerMustSendPayouts: false,
    metadataExtra: 0,
    powers: {
      setTerminals: false,
      setController: false,
      terminalMigration: false,
      setCustomToken: false,
      addAccountingContext: false,
      addPriceFeed: false,
    },
  };
}

/** A shop item with everything unset, for a writer to fill. */
export function emptyJbDraftItem(): JbDraftItem {
  return {
    name: "",
    description: "",
    mediaUri: "",
    mediaType: "",
    metadataUri: "",
    price: "",
    supply: "",
    supplyPerChain: {},
    excludedChains: [],
    discountPercent: "",
    reserveEvery: "",
    reserveBeneficiary: "",
    reserveBeneficiaryPerChain: {},
    category: 0,
    votingUnits: "",
    splits: [],
    allowOwnerMint: false,
    transfersPausable: false,
    cantBeRemoved: false,
    allowCredits: true,
    ownerCanEditDiscount: true,
  };
}

/** A draft with nothing chosen: ETH on no chain yet, one empty stage, an empty shop. */
export function emptyJbDraft(
  kind: JbDraft["kind"] = "project",
  accepts: readonly Token[] = ["eth"],
): JbDraft {
  return {
    v: JB_DRAFT_VERSION,
    kind,
    name: "",
    ticker: "",
    tagline: "",
    description: "",
    payNotice: "",
    tags: [],
    logoUri: "",
    coverUri: "",
    links: {
      website: "",
      twitter: "",
      discord: "",
      telegram: "",
      instagram: "",
      whatsapp: "",
    },
    chains: [],
    linkChains: true,
    bridge: "ccip",
    owner: "",
    ownerPerChain: {},
    safe: null,
    accepts: [...accepts],
    customToken: "",
    anyToken: true,
    approvalHook: "",
    approvalHookPerChain: {},
    afterMode: "wait",
    stages: [emptyJbDraftStage(kind, accepts)],
    shop: {
      currency: jbDraftBaseCurrency(accepts),
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
      categories: [],
      items: [],
    },
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Give a written object the keys it left out. Anything that is not an object passes
 *  through for the strict check to refuse. */
function withDefaults(value: unknown, defaults: object): unknown {
  if (!isRecord(value)) return value;
  const out: Record<string, unknown> = { ...value };
  for (const [key, fallback] of Object.entries(defaults)) {
    if (!Object.prototype.hasOwnProperty.call(out, key)) out[key] = fallback;
    else if (isRecord(fallback)) out[key] = withDefaults(out[key], fallback);
  }
  return out;
}

const eachOf = (value: unknown, fill: (entry: unknown) => unknown): unknown =>
  Array.isArray(value) ? value.map(fill) : value;

const fillSplit = (value: unknown) => withDefaults(value, emptyJbDraftSplit());

/** The file with every key it left out. `stages` is the one list that must be written. */
function withJbDraftDefaults(source: Record<string, unknown>): unknown {
  const kind = source.kind === "revnet" ? "revnet" : "project";
  const written = Array.isArray(source.accepts) ? source.accepts : ["eth"];
  const accepts = written.filter(
    (token): token is Token => token in TOKEN_CURRENCY,
  );
  // `v`, `kind` and `stages` are the file's to state: none of them is filled in.
  const {
    v: _v,
    kind: _kind,
    stages: _stages,
    ...defaults
  } = emptyJbDraft(kind, accepts);
  const filled = withDefaults(source, defaults) as Record<string, unknown>;
  filled.stages = eachOf(filled.stages, (entry) => {
    const stage = withDefaults(entry, emptyJbDraftStage(kind, accepts));
    if (!isRecord(stage)) return stage;
    stage.reserved = eachOf(stage.reserved, fillSplit);
    stage.payouts = eachOf(stage.payouts, (payout) => {
      const token = isRecord(payout) && String(payout.token) in TOKEN_CURRENCY;
      const filledPayout = token
        ? withDefaults(
            payout,
            emptyJbDraftPayout((payout as { token: Token }).token),
          )
        : payout;
      if (isRecord(filledPayout))
        filledPayout.splits = eachOf(filledPayout.splits, fillSplit);
      return filledPayout;
    });
    return stage;
  });
  if (isRecord(filled.shop)) {
    filled.shop.items = eachOf(filled.shop.items, (entry) => {
      const filledItem = withDefaults(entry, emptyJbDraftItem());
      if (isRecord(filledItem))
        filledItem.splits = eachOf(filledItem.splits, fillSplit);
      return filledItem;
    });
  }
  return filled;
}

/** Check a value against the format, returning the whole draft: only the format's keys,
 *  with every key the file left out at its default. */
export function checkJbDraft(value: unknown): JbDraft {
  const source = record(value, "the file");
  if (source.v !== JB_DRAFT_VERSION) {
    throw new JbDraftError(
      "This .jb file was saved in a format this site no longer reads. Export it again from the site it came from.",
    );
  }
  const checked = draft(withJbDraftDefaults(source), "draft");
  checkKind(checked);
  return checked;
}

/** Read the text of a `.jb` file. Throws a {@link JbDraftError} a person can act on. */
export function parseJbDraft(source: string): JbDraft {
  if (source.length > JB_DRAFT_MAX_CHARS)
    throw new JbDraftError("That file is too large.");
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new JbDraftError("That doesn't look like a .jb file.");
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new JbDraftError("That doesn't look like a .jb file.");
  }
  return checkJbDraft(value);
}

/** The text of a `.jb` file. A draft the format refuses is never written. */
export function serializeJbDraft(value: JbDraft): string {
  return JSON.stringify(checkJbDraft(value), null, 2);
}
