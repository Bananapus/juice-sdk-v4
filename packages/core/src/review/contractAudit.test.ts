import { jbV6ContractAddress } from "../generated/addresses/jbV6ContractAddress.js";
import type { JBChainId } from "../types.js";
import { zeroAddress, type Address, type PublicClient } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { auditProjectContracts } from "./contractAudit.js";

const CHAIN = 8453 as JBChainId;
const known = (name: keyof typeof jbV6ContractAddress) =>
  (jbV6ContractAddress[name] as Record<number, Address>)[CHAIN];
const STRANGER = "0x00000000000000000000000000000000000000A1" as Address;
const CLONE = "0x00000000000000000000000000000000000000B2" as Address;

const mocks = vi.hoisted(() => ({
  ruleset: vi.fn(),
  inventory: vi.fn(),
  buyback: vi.fn(),
  route: vi.fn(),
}));
vi.mock("../v6/rulesets.js", async (original) => ({
  ...(await original<typeof import("../v6/rulesets.js")>()),
  getCurrentRuleset: mocks.ruleset,
}));
vi.mock("../v6/nftInventory.js", async (original) => ({
  ...(await original<typeof import("../v6/nftInventory.js")>()),
  getProjectNftInventory: mocks.inventory,
}));
vi.mock("../v6/projectHooks.js", async (original) => ({
  ...(await original<typeof import("../v6/projectHooks.js")>()),
  resolveProjectBuybackHook: mocks.buyback,
}));
vi.mock("../v6/terminals.js", async (original) => ({
  ...(await original<typeof import("../v6/terminals.js")>()),
  resolveProjectRouterTerminal: mocks.route,
}));

/** What the chain answers; a function throws to stand for a failed read. */
let chain: {
  controller: Address;
  terminals: Address[];
  deployerOf: (address: Address) => Address;
  extra: Address;
};
const client = {
  readContract: async ({
    functionName,
    args,
  }: {
    functionName: string;
    args: unknown[];
  }) => {
    if (functionName === "controllerOf") return chain.controller;
    if (functionName === "terminalsOf") return chain.terminals;
    if (functionName === "deployerOf")
      return chain.deployerOf(args[0] as Address);
    if (functionName === "extraDataHookOf") return { dataHook: chain.extra };
    throw new Error(`Unexpected read: ${functionName}`);
  },
} as unknown as PublicClient;

const rules = (approvalHook: Address, dataHook: Address) => ({
  ruleset: { id: 7, approvalHook },
  metadata: { dataHook },
});
const audit = () =>
  auditProjectContracts(client, {
    chainId: CHAIN,
    projectId: 9n,
    isRevnet: false,
  });

beforeEach(() => {
  vi.clearAllMocks();
  chain = {
    controller: known("JBController"),
    terminals: [known("JBMultiTerminal"), known("JBRouterTerminalRegistry")],
    deployerOf: () => zeroAddress,
    extra: zeroAddress,
  };
  mocks.ruleset.mockResolvedValue(
    rules(known("JBDeadline3Days"), known("JBBuybackHookRegistry")),
  );
  mocks.inventory.mockResolvedValue(null);
  mocks.buyback.mockResolvedValue({ hook: known("JBBuybackHook") });
  mocks.route.mockResolvedValue({
    via: "registry",
    status: "direct",
    terminal: known("JBRouterTerminal"),
  });
});

describe("the contracts a project points at", () => {
  it("names the terminal a known router registry forwards to when it is not a known router", async () => {
    mocks.route.mockResolvedValue({
      via: "registry",
      status: "unknown",
      terminal: STRANGER,
    });
    const result = await audit();
    expect(result.failed).toBe(false);
    expect(result.unknown.map((row) => [row.role, row.address])).toEqual([
      ["Router terminal", STRANGER],
    ]);
  });

  it("reports an unfinished check when the registry route cannot be read", async () => {
    mocks.route.mockRejectedValue(new Error("rpc"));
    expect((await audit()).failed).toBe(true);
  });

  it("finds nothing in a project made of known deployments", async () => {
    expect(await audit()).toEqual({
      chainId: CHAIN,
      unknown: [],
      failed: false,
    });
  });

  it("names every role held by a contract it does not know", async () => {
    chain.controller = STRANGER;
    chain.terminals = [known("JBMultiTerminal"), STRANGER];
    mocks.ruleset.mockResolvedValue(rules(STRANGER, STRANGER));
    mocks.buyback.mockResolvedValue({ hook: STRANGER });
    const result = await audit();
    expect(result.failed).toBe(false);
    expect(result.unknown.map((row) => row.role)).toEqual([
      "Controller",
      "Payment terminal",
      "Rule-change hook",
      "Data hook",
      "Buyback hook",
    ]);
    expect(result.unknown.every((row) => row.address === STRANGER)).toBe(true);
  });

  it("accepts an instance the address registry traces to a known deployer, and no other", async () => {
    mocks.ruleset.mockResolvedValue(rules(zeroAddress, CLONE));
    chain.deployerOf = () => known("JB721TiersHookDeployer");
    expect((await audit()).unknown).toEqual([]);
    chain.deployerOf = () => STRANGER;
    expect((await audit()).unknown.map((row) => row.role)).toEqual([
      "Data hook",
    ]);
  });

  it("accepts the project's verified Defifa game as its data hook, and only that address", async () => {
    mocks.ruleset.mockResolvedValue(rules(zeroAddress, CLONE));
    mocks.inventory.mockResolvedValue({ protocol: "defifa", hook: CLONE });
    expect((await audit()).unknown).toEqual([]);
    mocks.inventory.mockResolvedValue({ protocol: "defifa", hook: STRANGER });
    expect((await audit()).unknown.map((row) => row.address)).toEqual([CLONE]);
  });

  it("knows Croptop's deployer as a data hook", async () => {
    mocks.ruleset.mockResolvedValue(
      rules(zeroAddress, "0xF21b8717Cb50E497E90f375ec532557dD9022655"),
    );
    expect(await audit()).toEqual({
      chainId: CHAIN,
      unknown: [],
      failed: false,
    });
  });

  it("checks the buyback hook used for cash outs when payments use none", async () => {
    mocks.buyback.mockImplementation(
      async (_client: unknown, { direction }: { direction: string }) => ({
        hook: direction === "cashOut" ? STRANGER : null,
      }),
    );
    expect(
      (await audit()).unknown.map((row) => [row.role, row.address]),
    ).toEqual([["Buyback hook", STRANGER]]);
  });

  it("checks the hook the omnichain deployer delegates to", async () => {
    mocks.ruleset.mockResolvedValue(
      rules(zeroAddress, known("JBOmnichainDeployer")),
    );
    chain.extra = STRANGER;
    expect((await audit()).unknown.map((row) => row.role)).toEqual([
      "Extra data hook",
    ]);
  });

  it("stops at a project with no controller without calling it unverified", async () => {
    chain.controller = zeroAddress;
    chain.terminals = [];
    expect(await audit()).toEqual({
      chainId: CHAIN,
      unknown: [],
      failed: false,
    });
    expect(mocks.ruleset).not.toHaveBeenCalled();
  });

  it("reports a failed read as unverified and keeps what it had found", async () => {
    chain.terminals = [STRANGER];
    mocks.ruleset.mockRejectedValue(new Error("rpc"));
    const result = await audit();
    expect(result.failed).toBe(true);
    expect(result.unknown.map((row) => row.role)).toEqual(["Payment terminal"]);

    chain.deployerOf = () => {
      throw new Error("rpc");
    };
    expect(await audit()).toMatchObject({ unknown: [], failed: true });
  });
});
