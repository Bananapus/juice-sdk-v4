import {
  decodeFunctionData,
  encodeFunctionData,
  keccak256,
  getAddress,
  pad,
  zeroAddress,
  zeroHash,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { describe, expect, test, vi } from "vitest";
import { SPLITS_TOTAL_PERCENT } from "../pureConstants.js";
import { v6Address } from "./types.js";
import {
  STICKY_SOURCE_COLLECTOR_DEPLOYMENTS,
  stickySourceCollectorAbi,
  stickySourceCollectorAt,
  stickySourceCollectorDeployment,
  verifyStickySourceCollector,
  verifyStickyCollectorRoute,
  buildStickyReservedSplit,
  buildStickyCollectorSendTx,
  buildStickyCollectorSettleTx,
  getStickyCollectorPending,
  type StickySourceCollectorDeployment,
} from "./sticky.js";

const address = (id: number) =>
  `0x${id.toString(16).padStart(40, "0")}` as Address;
const COLLECTOR = address(100),
  FEE_PAYER = address(101),
  SHARE = address(102),
  SOURCE_TOKEN = address(103),
  REWARD_TOKEN = address(104),
  SUCKER = address(105),
  PEER = address(106),
  RECEIVER = address(107),
  BACKING = address(108);
const CODE = "0x6000" as const,
  FEE_CODE = "0x6001" as const;
const deployment: StickySourceCollectorDeployment = {
  sourceChainId: 10,
  destinationChainId: 1,
  address: COLLECTOR,
  runtimeCodeHash: keccak256(CODE),
  feePayer: FEE_PAYER,
  feePayerRuntimeCodeHash: keccak256(FEE_CODE),
  registry: v6Address("JBSuckerRegistry", 10),
  tokens: v6Address("JBTokens", 10),
  directory: v6Address("JBDirectory", 10),
  receiverFactory: v6Address("StickyRewardReceiverFactory", 10),
};
const allocation = {
  deployment,
  sourceProjectId: 3n,
  stickyToken: SHARE,
  groupId: 4052n,
};
const remote = { ...allocation, sucker: SUCKER, backingToken: BACKING };
const sending = { ...remote, amount: 25n, value: 2n };
const local = {
  ...allocation,
  deployment: { ...deployment, sourceChainId: 1 as const },
};
type Read = {
  address: Address;
  functionName: string;
  args?: readonly unknown[];
};
type Override = (call: Read) => unknown;
function fixture(
  options: {
    local?: boolean;
    sourceRead?: Override;
    homeRead?: Override;
    sourceCode?: (a: Address) => Hex | undefined;
    homeCode?: (a: Address) => Hex | undefined;
  } = {},
) {
  const homeId = deployment.destinationChainId;
  const make = (isSource: boolean) => {
    const readContract = vi.fn(async (call: Read) => {
      const override = (isSource ? options.sourceRead : options.homeRead)?.(
        call,
      );
      if (override !== undefined) return override;
      const { address: target, functionName: name, args } = call;
      if (target === COLLECTOR) {
        const fields = {
          DESTINATION_CHAIN_ID: BigInt(homeId),
          DIRECTORY: deployment.directory,
          REGISTRY: deployment.registry,
          TOKENS: deployment.tokens,
          RECEIVER_FACTORY: deployment.receiverFactory,
          FEE_PAYER,
          pendingOf: 100n,
        };
        return fields[name as keyof typeof fields];
      }
      if (target === FEE_PAYER) return COLLECTOR;
      if (name === "PROJECT_ID") return 7n;
      if (name === "controllerOf") return address(120);
      if (name === "primaryTerminalOf") return address(121);
      if (name === "accountingContextForTokenOf")
        return { token: args?.[1], decimals: 18, currency: 1 };
      if (name === "predictReceiverOf") return RECEIVER;
      if (name === "DISTRIBUTOR") return v6Address("StickyDistributor", homeId);
      if (name === "tokenOf")
        return args?.[0] === 7n
          ? SHARE
          : isSource
            ? SOURCE_TOKEN
            : REWARD_TOKEN;
      if (name === "isSuckerOf") return true;
      if (name === "projectId") return isSource ? 3n : 30n;
      if (name === "peerChainId") return isSource ? BigInt(homeId) : 10n;
      if (name === "peer") return pad(isSource ? PEER : SUCKER);
      if (name === "state") return 0;
      if (name === "remoteTokenFor")
        return {
          enabled: true,
          emergencyHatch: false,
          minGas: 200_000,
          addr: pad(BACKING),
        };
      if (name === "REGISTRY") return deployment.registry;
      if (name === "TOKENS") return deployment.tokens;
      if (name === "DIRECTORY") return deployment.directory;
      throw new Error(`Unhandled read ${name}`);
    });
    const getCode = vi.fn(async ({ address: target }: { address: Address }) => {
      const override = isSource ? options.sourceCode : options.homeCode;
      if (override) return override(target);
      return target === FEE_PAYER ? FEE_CODE : CODE;
    });
    const getChainId = vi.fn(async () =>
      isSource && !options.local ? 10 : homeId,
    );
    return {
      readContract,
      getCode,
      getChainId,
      simulateContract: vi.fn(async (_call: unknown) => ({ result: 1n })),
    };
  };
  const source = make(true),
    home = make(false);
  return {
    source,
    home,
    sourceClient: source as unknown as PublicClient,
    homeClient: home as unknown as PublicClient,
  };
}

const wrongRead =
  (name: string, value: unknown, target?: Address): Override =>
  (call) =>
    call.functionName === name && (!target || call.address === target)
      ? value
      : undefined;

describe("Sticky collector deployment identity", () => {
  test("does not advertise predictions as deployments", () => {
    expect(STICKY_SOURCE_COLLECTOR_DEPLOYMENTS).toEqual([]);
    expect(stickySourceCollectorDeployment(10, 1)).toBeUndefined();
    expect(stickySourceCollectorAt(10, COLLECTOR)).toBeUndefined();
    expect(stickySourceCollectorAt(10, "0x1234", [deployment])).toBeUndefined();
  });
  test("namespaces source and home, and rejects ambiguous family identity", () => {
    const base = { ...deployment, sourceChainId: 8453 as const };
    const otherHome = {
      ...deployment,
      destinationChainId: 8453 as const,
      address: address(200),
    };
    const configured = [deployment, base, otherHome];
    expect(stickySourceCollectorDeployment(10, 1, configured)).toEqual(
      deployment,
    );
    expect(stickySourceCollectorDeployment(10, 8453, configured)).toEqual(
      otherHome,
    );
    expect(stickySourceCollectorAt(8453, COLLECTOR, configured)).toEqual(base);
    expect(
      stickySourceCollectorAt(42161, COLLECTOR, configured),
    ).toBeUndefined();
    expect(
      stickySourceCollectorAt(10, COLLECTOR, [
        deployment,
        { ...otherHome, address: COLLECTOR },
      ]),
    ).toBeUndefined();
    expect(
      stickySourceCollectorDeployment(10, 1, [deployment, deployment]),
    ).toBeUndefined();
    for (const conflicting of [
      { ...base, address: address(200) },
      { ...base, runtimeCodeHash: zeroHash },
    ]) {
      expect(
        stickySourceCollectorDeployment(10, 1, [deployment, conflicting]),
      ).toBeUndefined();
      expect(
        stickySourceCollectorAt(10, COLLECTOR, [deployment, conflicting]),
      ).toBeUndefined();
    }
  });
  test("checks actual chain, both runtimes and every immutable", async () => {
    const f = fixture();
    await verifyStickySourceCollector(f.sourceClient, deployment);
    expect(f.source.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: FEE_PAYER,
        functionName: "COLLECTOR",
      }),
    );
    f.source.getChainId.mockResolvedValue(8453);
    await expect(
      verifyStickySourceCollector(f.sourceClient, deployment),
    ).rejects.toThrow("RPC chain");
    for (const code of [undefined, "0x" as Hex]) {
      await expect(
        verifyStickySourceCollector(
          fixture({ sourceCode: () => code }).sourceClient,
          deployment,
        ),
      ).rejects.toThrow("deployed code");
    }
    for (const key of ["runtimeCodeHash", "feePayerRuntimeCodeHash"] as const) {
      await expect(
        verifyStickySourceCollector(fixture().sourceClient, {
          ...deployment,
          [key]: zeroHash,
        }),
      ).rejects.toThrow("runtime");
    }
    for (const [name, key] of [
      ["DIRECTORY", "directory"],
      ["REGISTRY", "registry"],
      ["TOKENS", "tokens"],
      ["RECEIVER_FACTORY", "receiverFactory"],
    ] as const) {
      await expect(
        verifyStickySourceCollector(fixture().sourceClient, {
          ...deployment,
          [key]: SHARE,
        }),
      ).rejects.toThrow("canonical");
      await expect(
        verifyStickySourceCollector(
          fixture({ sourceRead: wrongRead(name, SHARE, COLLECTOR) })
            .sourceClient,
          deployment,
        ),
      ).rejects.toThrow("binding changed");
    }
    for (const [name, value] of [
      ["DESTINATION_CHAIN_ID", 8453n],
      ["FEE_PAYER", SHARE],
      ["COLLECTOR", SHARE],
    ] as const) {
      await expect(
        verifyStickySourceCollector(
          fixture({ sourceRead: wrongRead(name, value) }).sourceClient,
          deployment,
        ),
      ).rejects.toThrow("fee-child binding");
    }
  });
});

describe("Sticky collector recipes and custody reads", () => {
  test("keeps split group encoding and transaction destinations exact", async () => {
    expect(
      buildStickyReservedSplit({
        ...allocation,
        percent: SPLITS_TOTAL_PERCENT,
        lockedUntil: 12,
      }),
    ).toEqual({
      percent: SPLITS_TOTAL_PERCENT,
      beneficiary: SHARE,
      hook: COLLECTOR,
      projectId: 4052n,
      preferAddToBalance: false,
      lockedUntil: 12,
    });
    expect(
      buildStickyReservedSplit({ ...allocation, percent: 0 }).lockedUntil,
    ).toBe(0);
    const tx = buildStickyCollectorSendTx(sending);
    expect(tx.value).toBe(2n);
    expect(tx.chainId).toBe(10);
    expect(
      decodeFunctionData({
        abi: stickySourceCollectorAbi,
        data: encodeFunctionData(tx),
      }),
    ).toEqual({
      functionName: "send",
      args: [3n, SHARE, 4052n, 25n, SUCKER, getAddress(BACKING)],
    });
    expect(
      buildStickyCollectorSettleTx({ ...local, amount: 5n }),
    ).toMatchObject({
      chainId: 1,
      address: COLLECTOR,
      functionName: "settle",
      args: [3n, SHARE, 4052n, 5n],
    });
    const f = fixture();
    await expect(
      getStickyCollectorPending(f.sourceClient, allocation),
    ).resolves.toBe(100n);
  });
  test("rejects invalid source/share/group/percent and execution direction", () => {
    for (const bad of [
      { sourceProjectId: 0n },
      { stickyToken: zeroAddress },
      { groupId: 1n },
    ])
      expect(() =>
        buildStickyReservedSplit({ ...allocation, percent: 1, ...bad }),
      ).toThrow();
    for (const percent of [-1, 1.2, SPLITS_TOTAL_PERCENT + 1])
      expect(() =>
        buildStickyReservedSplit({ ...allocation, percent }),
      ).toThrow("percent");
    expect(() =>
      buildStickyCollectorSendTx({ ...sending, amount: 0n }),
    ).toThrow("positive");
    expect(() =>
      buildStickyCollectorSendTx({ ...sending, deployment: local.deployment }),
    ).toThrow("Use settle");
    for (const bad of [
      { sucker: zeroAddress },
      { backingToken: zeroAddress },
      { value: -1n },
    ])
      expect(() => buildStickyCollectorSendTx({ ...sending, ...bad })).toThrow(
        "route, backing",
      );
    expect(() =>
      buildStickyCollectorSettleTx({ ...allocation, amount: 1n }),
    ).toThrow("home chain");
  });
});

describe("Sticky source-to-home qualification", () => {
  test("qualifies a canonical direct route using the peer's project, including pending deprecation and source credits", async () => {
    const f = fixture();
    await expect(
      verifyStickyCollectorRoute(f.sourceClient, f.homeClient, remote),
    ).resolves.toEqual({
      receiver: RECEIVER,
      sourceToken: SOURCE_TOKEN,
      rewardToken: REWARD_TOKEN,
      destinationProjectId: 30n,
    });
    const credits = fixture({
      sourceRead: (call) =>
        call.address === SUCKER && call.functionName === "state"
          ? 1
          : call.functionName === "tokenOf"
            ? zeroAddress
            : undefined,
    });
    await expect(
      verifyStickyCollectorRoute(
        credits.sourceClient,
        credits.homeClient,
        remote,
      ),
    ).resolves.toMatchObject({ sourceToken: zeroAddress });
  });
  test("qualifies same-chain delivery without requesting any bridge lane", async () => {
    const f = fixture({ local: true });
    await expect(
      verifyStickyCollectorRoute(f.sourceClient, f.homeClient, local),
    ).resolves.toMatchObject({ destinationProjectId: 3n });
    expect(
      f.source.readContract.mock.calls.some(
        ([call]) => call.functionName === "isSuckerOf",
      ),
    ).toBe(false);
  });
  test("requires registered destination shares, matching receivers and deployed reward ERC20", async () => {
    for (const target of [
      v6Address("StickyHook", 1),
      v6Address("JBTokens", 1),
    ]) {
      const f = fixture({
        homeRead: wrongRead("tokenOf", zeroAddress, target),
      });
      await expect(
        verifyStickyCollectorRoute(f.sourceClient, f.homeClient, remote),
      ).rejects.toThrow("registered home-chain pool");
    }
    for (const name of ["predictReceiverOf", "DISTRIBUTOR"]) {
      const f = fixture({ homeRead: wrongRead(name, SHARE) });
      await expect(
        verifyStickyCollectorRoute(f.sourceClient, f.homeClient, remote),
      ).rejects.toThrow("receiver identity");
    }
    for (const unavailable of [SHARE, REWARD_TOKEN]) {
      const f = fixture({
        homeCode: (target) => (target === unavailable ? "0x" : CODE),
      });
      await expect(
        verifyStickyCollectorRoute(f.sourceClient, f.homeClient, remote),
      ).rejects.toThrow("deployed code");
    }
  });
  test("fails closed on an absent, unregistered, wrong-home, retired or unmapped route", async () => {
    for (const missing of [
      { sucker: undefined },
      { backingToken: undefined },
    ]) {
      const f = fixture();
      await expect(
        verifyStickyCollectorRoute(f.sourceClient, f.homeClient, {
          ...remote,
          ...missing,
        }),
      ).rejects.toThrow("direct Sticky");
    }
    const mutations: [string, unknown, string][] = [
      ["isSuckerOf", false, "not registered"],
      ["projectId", 99n, "does not bind"],
      ["peerChainId", 8453n, "does not bind"],
      ["peer", zeroHash, "does not bind"],
      ["REGISTRY", SHARE, "does not bind"],
      ["TOKENS", SHARE, "does not bind"],
      ["DIRECTORY", SHARE, "does not bind"],
      ["state", 2, "no longer"],
      ["state", 3, "no longer"],
      [
        "remoteTokenFor",
        { enabled: false, emergencyHatch: false, addr: pad(BACKING) },
        "mapping",
      ],
      [
        "remoteTokenFor",
        { enabled: true, emergencyHatch: true, addr: pad(BACKING) },
        "mapping",
      ],
      [
        "remoteTokenFor",
        { enabled: true, emergencyHatch: false, addr: zeroHash },
        "mapping",
      ],
    ];
    for (const [name, value, message] of mutations) {
      const f = fixture({
        sourceRead: wrongRead(
          name,
          value,
          name === "isSuckerOf" ? deployment.registry : SUCKER,
        ),
      });
      await expect(
        verifyStickyCollectorRoute(f.sourceClient, f.homeClient, remote),
      ).rejects.toThrow(message);
    }
  });
  test("verifies the destination registry and reverse peer, and propagates unavailable reads", async () => {
    for (const [name, value, message] of [
      ["isSuckerOf", false, "destination route"],
      ["peerChainId", 8453n, "destination peer"],
      ["peer", pad(SHARE), "destination peer"],
    ] as const) {
      const f = fixture({ homeRead: wrongRead(name, value) });
      await expect(
        verifyStickyCollectorRoute(f.sourceClient, f.homeClient, remote),
      ).rejects.toThrow(message);
    }
    const f = fixture();
    f.source.readContract.mockRejectedValueOnce(new Error("RPC unavailable"));
    await expect(
      verifyStickyCollectorRoute(f.sourceClient, f.homeClient, remote),
    ).rejects.toThrow("RPC unavailable");
  });
});

test("route qualification refuses a backing asset that cannot be claimed at home", async () => {
  for (const [name, value] of [
    ["controllerOf", zeroAddress],
    ["primaryTerminalOf", zeroAddress],
    [
      "accountingContextForTokenOf",
      { token: SHARE, decimals: 18, currency: 1 },
    ],
    [
      "accountingContextForTokenOf",
      { token: BACKING, decimals: 6, currency: 1 },
    ],
  ] as const) {
    const f = fixture({ homeRead: wrongRead(name, value) });
    await expect(
      verifyStickyCollectorRoute(f.sourceClient, f.homeClient, remote),
    ).rejects.toThrow(
      /controller and backing terminal|does not accept|decimals differ/,
    );
  }
  const missingCode = fixture({
    homeCode: (target) => (target === address(121) ? "0x" : CODE),
  });
  await expect(
    verifyStickyCollectorRoute(
      missingCode.sourceClient,
      missingCode.homeClient,
      remote,
    ),
  ).rejects.toThrow("deployed code");
  const badMapping = fixture({
    sourceRead: wrongRead(
      "remoteTokenFor",
      {
        enabled: true,
        emergencyHatch: false,
        minGas: 1,
        addr: `0x${"11".repeat(32)}`,
      },
      SUCKER,
    ),
  });
  await expect(
    verifyStickyCollectorRoute(
      badMapping.sourceClient,
      badMapping.homeClient,
      remote,
    ),
  ).rejects.toThrow("not an EVM address");
});

test("route qualification probes current destination mint authority without transacting", async () => {
  const f = fixture();
  await verifyStickyCollectorRoute(f.sourceClient, f.homeClient, remote);
  expect(f.home.simulateContract).toHaveBeenCalledWith(
    expect.objectContaining({
      address: address(120),
      functionName: "mintTokensOf",
      args: [30n, 1n, RECEIVER, "", false],
      account: PEER,
    }),
  );
  f.home.simulateContract.mockRejectedValueOnce(
    new Error("destination mint permission revoked"),
  );
  await expect(
    verifyStickyCollectorRoute(f.sourceClient, f.homeClient, remote),
  ).rejects.toThrow("mint permission revoked");
});
