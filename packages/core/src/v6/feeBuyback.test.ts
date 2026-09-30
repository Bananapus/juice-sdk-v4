import { describe, expect, it, vi } from "vitest";
import { encodeAbiParameters, encodeEventTopics, parseAbi } from "viem";
import {
  jbContractAddress,
  jbContractAddressHistory,
} from "../generated/juicebox.js";
import {
  analyzeFeeSimulation,
  checkFeeBuyback,
  combineFeeResults,
  createFeeWatch,
  feeBuybackOptions,
  feeMessage,
  feeReceipt,
  feeReviewConfirmLabel,
  isFeePayingCall,
  type Fee,
  type FeeResult,
} from "./feeBuyback.js";
const terminal = "0x1111111111111111111111111111111111111111";
const hook = "0x2222222222222222222222222222222222222222";
const user = "0x3333333333333333333333333333333333333333";
const controller = "0x4444444444444444444444444444444444444444";
const loans = "0x5555555555555555555555555555555555555555";
const abi = parseAbi([
  "event Mint(uint256 indexed projectId,uint256 leftoverAmount,uint256 tokenCount,address caller)",
  "event Swap(uint256 indexed projectId,uint256 amountToSwapWith,bytes32 indexed poolId,uint256 amountReceived,address caller)",
  "event Pay(uint256 indexed rulesetId,uint256 indexed rulesetCycleNumber,uint256 indexed projectId,address payer,address beneficiary,uint256 amount,uint256 newlyIssuedTokenCount,string memo,bytes metadata,address caller)",
  "event MintTokens(address indexed beneficiary,uint256 indexed projectId,uint256 tokenCount,uint256 beneficiaryTokenCount,string memo,uint256 reservedPercent,address caller)",
  "event ProcessFee(uint256 indexed projectId,address indexed token,uint256 indexed amount,bool wasHeld,address beneficiary,address caller)",
]);
const opts = {
  trustedHooks: [hook],
  beneficiary: user,
  terminals: [terminal],
  controllers: [controller],
  feePayers: [loans, terminal],
};
const word = (n: bigint) => encodeAbiParameters([{ type: "uint256" }], [n]);
const mint = {
  address: hook,
  topics: encodeEventTopics({
    abi,
    eventName: "Mint",
    args: { projectId: 6n },
  }),
  data: encodeAbiParameters(
    [{ type: "uint256" }, { type: "uint256" }, { type: "address" }],
    [15090000n, 9429n, terminal],
  ),
};
const swap = {
  address: hook,
  topics: encodeEventTopics({
    abi,
    eventName: "Swap",
    args: { projectId: 6n, poolId: `0x${"00".repeat(32)}` },
  }),
  data: encodeAbiParameters(
    [{ type: "uint256" }, { type: "uint256" }, { type: "address" }],
    [15090000n, 60874n, terminal],
  ),
};
function pay(
  issued = 0n,
  payer: `0x${string}` = loans,
  beneficiary: `0x${string}` = user,
) {
  return {
    address: terminal,
    topics: encodeEventTopics({
      abi,
      eventName: "Pay",
      args: { rulesetId: 1n, rulesetCycleNumber: 1n, projectId: 6n },
    }),
    data: encodeAbiParameters(
      [
        { type: "address" },
        { type: "address" },
        { type: "uint256" },
        { type: "uint256" },
        { type: "string" },
        { type: "bytes" },
        { type: "address" },
      ],
      [payer, beneficiary, 15090000n, issued, "", word(6n), loans],
    ),
  };
}
function receipt(received = 9429n, beneficiary: `0x${string}` = user) {
  return {
    address: controller,
    topics: encodeEventTopics({
      abi,
      eventName: "MintTokens",
      args: { beneficiary, projectId: 6n },
    }),
    data: encodeAbiParameters(
      [
        { type: "uint256" },
        { type: "uint256" },
        { type: "string" },
        { type: "uint256" },
        { type: "address" },
      ],
      [9429n, received, "", 2500n, hook],
    ),
  };
}
function simulation(swaps = false, received = swaps ? 60874n : 9429n) {
  return [
    {
      calls: [
        {
          status: "0x1",
          logs: [pay(), swaps ? swap : mint, receipt(received)],
        },
      ],
    },
  ];
}
const result = (swaps = false) => analyzeFeeSimulation(simulation(swaps), opts);
function platformFee(beneficiary: `0x${string}` = user) {
  const s = simulation();
  s[0].calls[0].logs = [
    pay(0n, terminal, beneficiary),
    mint,
    receipt(9429n, beneficiary),
  ].map((log) => ({ ...log, topics: [...log.topics] }));
  s[0].calls[0].logs[0].topics[3] = word(1n);
  s[0].calls[0].logs[1].topics[1] = word(1n);
  s[0].calls[0].logs[2].topics[2] = word(1n);
  s[0].calls[0].logs.push({
    address: terminal,
    topics: encodeEventTopics({
      abi,
      eventName: "ProcessFee",
      args: {
        projectId: 6n,
        token: user,
        amount: 15090000n,
      },
    }),
    data: encodeAbiParameters(
      [{ type: "bool" }, { type: "address" }, { type: "address" }],
      [false, beneficiary, user],
    ),
  });
  return s;
}

describe("fee buyback execution evidence", () => {
  it("detects incident-shaped mint fallback even though the full loan succeeds", () => {
    expect(result()).toMatchObject({
      status: "fallback",
      fees: [{ projectId: 6n, received: 9429n, route: "fallback" }],
    });
  });
  it("uses beneficiary receipt after reserved splits, never gross swap output", () => {
    expect(
      analyzeFeeSimulation(simulation(true, 45655n), opts).fees[0].received,
    ).toBe(45655n);
  });
  it("reports ready only for successful nonzero swaps", () => {
    expect(result(true).status).toBe("ready");
  });
  it("handles partial fill plus leftover issuance as a successful buyback", () => {
    const s = simulation(true);
    s[0].calls[0].logs.splice(2, 0, mint);
    expect(analyzeFeeSimulation(s, opts).status).toBe("ready");
  });
  it("does not warn when the live pool cannot fill above the issuance price limit", () => {
    const s = simulation(true);
    s[0].calls[0].logs[1] = {
      ...swap,
      data: encodeAbiParameters(
        [{ type: "uint256" }, { type: "uint256" }, { type: "address" }],
        [15090000n, 0n, terminal],
      ),
    };
    s[0].calls[0].logs.splice(2, 0, mint);
    expect(analyzeFeeSimulation(s, opts).status).toBe("none");
  });
  it("does not warn when direct issuance was selected", () => {
    const s = simulation();
    s[0].calls[0].logs = [pay(9429n)];
    expect(analyzeFeeSimulation(s, opts).status).toBe("none");
  });
  it("does not hide a ready source fee because another fee uses ordinary issuance", () => {
    const s = simulation(true);
    s[0].calls[0].logs.push(pay(123n));
    expect(analyzeFeeSimulation(s, opts).status).toBe("ready");
  });
  it("never promises more user tokens when all output is reserved", () => {
    expect(analyzeFeeSimulation(simulation(false, 0n), opts).status).toBe(
      "none",
    );
  });
  it("does not include rolled-back transactions or unrelated hooks", () => {
    const s = simulation();
    s[0].calls[0].status = "0x0";
    expect(analyzeFeeSimulation(s, opts).status).toBe("unknown");
    expect(
      analyzeFeeSimulation(simulation(true), {
        ...opts,
        trustedHooks: [terminal],
      }).status,
    ).not.toBe("ready");
  });
  it("reports fees for their actual beneficiary when the sender differs", () => {
    const s = simulation();
    s[0].calls[0].logs = [
      pay(0n, loans, terminal),
      mint,
      receipt(9429n, terminal),
    ];
    const analyzed = analyzeFeeSimulation(s, opts);
    expect(analyzed).toMatchObject({
      status: "fallback",
      fees: [{ beneficiary: terminal, received: 9429n }],
    });
    expect(feeReceipt(analyzed.fees[0])).toContain("to 0x1111…1111");
  });
  it("does not attribute another beneficiary receipt to the active fee", () => {
    const s = simulation();
    s[0].calls[0].logs = [pay(1n, loans, terminal), mint, receipt()];
    expect(analyzeFeeSimulation(s, opts)).toMatchObject({
      status: "unknown",
      fees: [{ beneficiary: terminal, received: 1n, route: "unknown" }],
    });
    s[0].calls[0].logs.push(receipt(123n, terminal));
    expect(analyzeFeeSimulation(s, opts)).toMatchObject({
      status: "fallback",
      fees: [{ beneficiary: terminal, received: 124n, route: "fallback" }],
    });
  });
  it.each([mint, swap])(
    "requires a verified receipt after hook activity despite direct issuance",
    (hookEvent) => {
      const s = simulation();
      s[0].calls[0].logs = [pay(1n), hookEvent];
      expect(analyzeFeeSimulation(s, opts).status).toBe("unknown");
      s[0].calls[0].logs.push({ ...receipt(), address: user });
      expect(analyzeFeeSimulation(s, opts).status).toBe("unknown");
      s[0].calls[0].logs.push(receipt());
      expect(analyzeFeeSimulation(s, opts).fees[0].received).toBe(9430n);
      expect(analyzeFeeSimulation(s, opts).status).toBe(
        hookEvent === mint ? "fallback" : "ready",
      );
    },
  );
  it("does not mistake a user pay for a fee or consume its following mint events", () => {
    const s = simulation();
    s[0].calls[0].logs[0] = pay(0n, user);
    expect(analyzeFeeSimulation(s, opts).fees).toEqual([]);
  });
  it("detects a same-terminal internal fee without any external pay call", () => {
    const s = platformFee(loans);
    expect(analyzeFeeSimulation(s, opts).status).toBe("fallback");
  });
  it("excludes ordinary terminal payouts, including voluntary payments to project #1", () => {
    const s = simulation();
    s[0].calls[0].logs[0] = pay(0n, terminal);
    expect(analyzeFeeSimulation(s, opts).fees).toEqual([]);
    const platform = platformFee();
    platform[0].calls[0].logs.pop();
    expect(analyzeFeeSimulation(platform, opts).fees).toEqual([]);
  });
  it.each(["emitter", "beneficiary", "source"])(
    "rejects a ProcessFee with the wrong %s",
    (field) => {
      const s = platformFee();
      const event = s[0].calls[0].logs[3];
      if (field === "emitter") event.address = loans;
      if (field === "beneficiary")
        event.data = encodeAbiParameters(
          [{ type: "bool" }, { type: "address" }, { type: "address" }],
          [false, loans, user],
        );
      if (field === "source") event.topics[1] = word(99n);
      expect(analyzeFeeSimulation(s, opts).fees).toEqual([]);
    },
  );
  it("recognizes fee-on-transfer platform fees despite different offered and accepted amounts", () => {
    const s = platformFee();
    s[0].calls[0].logs[3].topics[3] = word(16000000n);
    expect(analyzeFeeSimulation(s, opts).status).toBe("fallback");
  });
  it("keeps a warning when another fee successfully swaps", () => {
    const s = simulation();
    s[0].calls[0].logs.push(...simulation(true)[0].calls[0].logs);
    expect(analyzeFeeSimulation(s, opts).status).toBe("fallback");
  });
  it("does not use spoofed controller receipts or missing logs as readiness", () => {
    const s = simulation(true);
    s[0].calls[0].logs[2].address = user;
    expect(analyzeFeeSimulation(s, opts).status).toBe("unknown");
    expect(
      analyzeFeeSimulation([{ calls: [{ status: "0x1" }] }], opts).status,
    ).toBe("unknown");
  });
  it("treats malformed/unsupported RPC as unknown, never ready", async () => {
    const client = {
      request: vi.fn().mockRejectedValue(new Error("unsupported")),
    };
    expect(
      (
        await checkFeeBuyback(
          client,
          { from: user, to: loans, data: "0x" },
          opts,
        )
      ).status,
    ).toBe("unknown");
    expect(analyzeFeeSimulation({}, opts).status).toBe("unknown");
  });
  it("simulates exact account/calldata/value on a pinned block with no balance or allowance overrides", async () => {
    const client = {
      request: vi
        .fn()
        .mockResolvedValueOnce("0x123")
        .mockResolvedValueOnce(simulation()),
    };
    expect(
      (
        await checkFeeBuyback(
          client,
          { from: user, to: loans, data: "0x1234", value: 42n },
          opts,
        )
      ).status,
    ).toBe("fallback");
    expect(client.request.mock.calls[1][0]).toEqual({
      method: "eth_simulateV1",
      params: [
        {
          blockStateCalls: [
            {
              calls: [
                {
                  from: user,
                  to: loans,
                  data: "0x1234",
                  value: "0x2a",
                  gas: "0x989680",
                },
              ],
            },
          ],
          validation: false,
        },
        "0x123",
      ],
    });
  });
  it("times out a stalled provider so the user can retry or proceed explicitly", async () => {
    vi.useFakeTimers();
    try {
      const request = checkFeeBuyback(
        { request: () => new Promise(() => {}) },
        { from: user, to: loans, data: "0x" },
        opts,
      );
      await vi.advanceTimersByTimeAsync(8001);
      expect((await request).status).toBe("unknown");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("live fee review", () => {
  it("keeps a later shrink of an affected group unavailable after initial recovery", async () => {
    const expanded = simulation(true);
    expanded[0].calls[0].logs.push(...simulation(true)[0].calls[0].logs);
    const check = vi
      .fn()
      .mockResolvedValueOnce(result())
      .mockResolvedValueOnce(analyzeFeeSimulation(expanded, opts))
      .mockResolvedValue(result(true));
    const changed = vi.fn();
    const watch = createFeeWatch(check, changed);
    await watch.refresh();
    await watch.refresh();
    expect(changed.mock.lastCall?.[0].status).toBe("ready");
    await watch.refresh();
    expect(changed.mock.lastCall?.[0].status).toBe("unknown");
    watch.stop();
  });
  it("does not infer recovery when indistinguishable repeated fees shrink", async () => {
    const first = simulation();
    first[0].calls[0].logs.push(...simulation(true)[0].calls[0].logs);
    const check = vi
      .fn()
      .mockResolvedValueOnce(analyzeFeeSimulation(first, opts))
      .mockResolvedValue(result(true));
    const changed = vi.fn();
    const watch = createFeeWatch(check, changed);
    await watch.refresh();
    await watch.refresh();
    expect(changed.mock.lastCall?.[0].status).toBe("unknown");
    watch.stop();
  });
  it.each(["project", "beneficiary"])(
    "recognizes recovery when an unrelated earlier %s fee disappears",
    async (scope) => {
      const first = simulation();
      const unrelated = pay(
        100n,
        loans,
        scope === "beneficiary" ? terminal : user,
      );
      if (scope === "project")
        unrelated.topics = encodeEventTopics({
          abi,
          eventName: "Pay",
          args: { rulesetId: 1n, rulesetCycleNumber: 1n, projectId: 99n },
        });
      first[0].calls[0].logs.unshift(unrelated);
      const check = vi
        .fn()
        .mockResolvedValueOnce(analyzeFeeSimulation(first, opts))
        .mockResolvedValue(result(true));
      const changed = vi.fn();
      const watch = createFeeWatch(check, changed);
      await watch.refresh();
      await watch.refresh();
      expect(changed.mock.lastCall?.[0].status).toBe("ready");
      watch.stop();
    },
  );
  it("keeps repeated fees distinct within one beneficiary and project", () => {
    const s = simulation();
    s[0].calls[0].logs.push(...simulation(true)[0].calls[0].logs);
    const fees = analyzeFeeSimulation(s, opts).fees;
    expect(new Set(fees.map((f) => f.key)).size).toBe(2);
    expect(fees.map((f) => f.route)).toEqual(["fallback", "swap"]);
  });
  it("rechecks before confirmation and refuses a newly unfavorable result", async () => {
    const check = vi
      .fn()
      .mockResolvedValueOnce(result(true))
      .mockResolvedValue(result());
    const watch = createFeeWatch(check, vi.fn());
    await watch.refresh();
    expect(await watch.confirm()).toBe(false);
    expect(await watch.confirm()).toBe(true);
    watch.stop();
  });
  it("never reports ready if a previously affected fee disappears", async () => {
    const check = vi
      .fn()
      .mockResolvedValueOnce(result())
      .mockResolvedValue({ status: "none", fees: [] });
    const changed = vi.fn();
    const watch = createFeeWatch(check, changed);
    await watch.refresh();
    await watch.refresh();
    expect(changed.mock.lastCall?.[0].status).toBe("unknown");
    watch.stop();
  });
  it("requires an explicit choice when a ready estimate becomes unavailable", async () => {
    const check = vi
      .fn()
      .mockResolvedValueOnce(result(true))
      .mockRejectedValue(new Error("RPC down"));
    const watch = createFeeWatch(check, vi.fn());
    await watch.refresh();
    expect(await watch.confirm()).toBe(false);
    expect(await watch.confirm()).toBe(true);
    watch.stop();
  });
  it("discards in-flight results after closing or changing the review", async () => {
    let resolve!: (v: ReturnType<typeof analyzeFeeSimulation>) => void;
    const changed = vi.fn();
    const watch = createFeeWatch(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
      changed,
    );
    const pending = watch.refresh();
    watch.stop();
    changed.mockClear();
    resolve(result());
    await pending;
    expect(changed).not.toHaveBeenCalled();
    expect(await watch.confirm()).toBe(false);
  });
});

describe("fee buyback edge cases", () => {
  const logsResult = (logs: unknown[]) =>
    analyzeFeeSimulation([{ calls: [{ status: "0x1", logs }] }], opts);

  it("skips undecodable and untrusted logs and fails closed on malformed ones", () => {
    const [p, m, r] = simulation()[0].calls[0].logs;
    expect(
      logsResult([
        { address: terminal, topics: ["0xdead"], data: "0x" },
        p,
        m,
        r,
      ]).status,
    ).toBe("fallback");
    expect(logsResult([{ ...p, address: user }, m, r])).toEqual({
      status: "none",
      fees: [],
    });
    expect(logsResult([{ ...p, address: 5 }]).status).toBe("unknown");
  });

  it("calls a hook receipt without a pool trade or issuance unknown", () => {
    const [p, , r] = simulation()[0].calls[0].logs;
    const idle = {
      ...mint,
      data: encodeAbiParameters(
        [{ type: "uint256" }, { type: "uint256" }, { type: "address" }],
        [15090000n, 0n, terminal],
      ),
    };
    expect(logsResult([p, idle, r]).fees[0]?.route).toBe("unknown");
  });

  it("refuses to estimate without a sender or a readable block", async () => {
    const request = vi.fn(async () => "latest");
    expect(
      (await checkFeeBuyback({ request }, { to: loans, data: "0x" }, opts))
        .status,
    ).toBe("unknown");
    expect(request).not.toHaveBeenCalled();
    expect(
      (
        await checkFeeBuyback(
          { request },
          { from: user, to: loans, data: "0x" },
          opts,
        )
      ).status,
    ).toBe("unknown");
    const simulate = vi.fn(async (args: { method: string }) =>
      args.method === "eth_blockNumber" ? "0x1" : simulation(),
    );
    await checkFeeBuyback(
      { request: simulate as never },
      { from: user, to: loans, data: "0x" },
      opts,
    );
    expect(simulate.mock.calls[1]?.[0]).toMatchObject({
      params: [{ blockStateCalls: [{ calls: [{ value: "0x0" }] }] }, "0x1"],
    });
  });

  it("words every status and formats receipts", () => {
    const status = (value: FeeResult["status"]) =>
      feeMessage({ status: value, fees: [] });
    expect(status("fallback")).toMatch(/issuance rate/);
    expect(status("ready")).toMatch(/Buyback ready/);
    expect(status("unknown")).toMatch(/unavailable/);
    expect(status("none")).toBe("");
    expect(
      feeReceipt({
        key: "k",
        projectId: 6n,
        received: 1234n * 10n ** 18n,
        route: "swap",
      }),
    ).toBe("~1,234 project #6 tokens");
  });

  it("shares one check between overlapping refreshes and stops cleanly", async () => {
    let finish: (value: FeeResult) => void = () => {};
    const check = vi.fn(
      () => new Promise<FeeResult>((resolve) => (finish = resolve)),
    );
    const watch = createFeeWatch(check, vi.fn());
    const first = watch.refresh();
    const second = watch.refresh();
    const confirming = watch.confirm();
    finish(result());
    expect(await second).toBe(await first);
    await vi.waitFor(() => expect(check).toHaveBeenCalledTimes(2));
    watch.stop();
    finish(result());
    await expect(confirming).resolves.toBe(false);
    await expect(watch.refresh()).resolves.toEqual({
      status: "unknown",
      fees: [],
    });
  });

  it("keeps the largest count of fallback fees seen in one group", async () => {
    const twice = analyzeFeeSimulation(
      [
        {
          calls: [
            {
              status: "0x1",
              logs: [
                ...simulation()[0].calls[0].logs,
                ...simulation()[0].calls[0].logs,
              ],
            },
          ],
        },
      ],
      opts,
    );
    const watch = createFeeWatch(async () => twice, vi.fn());
    await watch.refresh();
    await watch.refresh();
    const once = result(true);
    const confirmed = createFeeWatch(async () => once, vi.fn());
    await confirmed.refresh();
    expect(twice.fees).toHaveLength(2);
  });
});

describe("fee review helpers", () => {
  const fee: Fee = {
    key: "base:6",
    projectId: 6n,
    beneficiary: user,
    received: 9429n * 10n ** 18n,
    route: "fallback",
  };

  it("checks only calls that can pay a protocol fee", () => {
    for (const functionName of [
      "borrowFrom",
      "reallocateCollateralFromLoan",
      "repayLoan",
      "cashOutTokensOf",
      "useAllowanceOf",
      "sendPayoutsOf",
      "processHeldFeesOf",
      "pay",
    ]) {
      expect(isFeePayingCall({ functionName })).toBe(true);
    }
    for (const functionName of ["transfer", "payX", "xpay", "addToBalanceOf"]) {
      expect(isFeePayingCall({ functionName })).toBe(false);
    }
    expect(isFeePayingCall({})).toBe(false);
  });

  it("shows a batch's worst fee result, keeping each call's fees apart", () => {
    const ready: FeeResult = {
      status: "ready",
      fees: [{ ...fee, route: "swap" }],
      checkedAt: 1,
    };
    const fallback: FeeResult = {
      status: "fallback",
      fees: [fee],
      checkedAt: 2,
    };
    expect(combineFeeResults([ready])).toBe(ready);
    expect(combineFeeResults([ready, fallback])).toEqual({
      status: "fallback",
      fees: [
        { ...fee, route: "swap", key: "0:base:6" },
        { ...fee, key: "1:base:6" },
      ],
      checkedAt: 1,
    });
    const none: FeeResult = { status: "none", fees: [] };
    const unknown: FeeResult = { status: "unknown", fees: [] };
    expect(combineFeeResults([none, unknown, ready])).toMatchObject({
      status: "unknown",
      checkedAt: 1,
    });
    // Without check times, the batch has none either.
    expect(combineFeeResults([none, none])).toEqual({
      status: "none",
      fees: [],
    });
    expect(combineFeeResults([])).toEqual({ status: "none", fees: [] });
  });

  it("labels the confirm button by the fee result", () => {
    const label = (
      status: FeeResult["status"],
      { enabled = true, busy = false } = {},
    ) => feeReviewConfirmLabel({ enabled, busy, status });
    expect(label("fallback", { enabled: false })).toBeUndefined();
    expect(label("none")).toBeUndefined();
    expect(label("none", { busy: true })).toBeUndefined();
    expect(label("ready", { busy: true })).toBe("Checking fee return…");
    expect(label("fallback")).toBe("Submit anyway");
    expect(label("ready")).toBe("Review and submit");
    expect(label("unknown")).toBe("Submit without estimate");
  });

  it("trusts every buyback hook generation, the terminal, the controller and the fee payers", () => {
    const v6 = jbContractAddress["6"] as unknown as Record<
      string,
      Record<number, string>
    >;
    const hooks = jbContractAddressHistory["6"].JBBuybackHook;
    expect(feeBuybackOptions(8453, user)).toEqual({
      beneficiary: user,
      trustedHooks: [
        v6.JBBuybackHook[8453],
        hooks.previous[8453],
        hooks.v1[8453],
      ],
      terminals: [v6.JBMultiTerminal[8453]],
      controllers: [v6.JBController[8453]],
      feePayers: [v6.JBMultiTerminal[8453], v6.REVLoans[8453]],
    });
    // OP Sepolia has no buyback hook, so its fee return cannot be checked.
    expect(feeBuybackOptions(11155420, user).trustedHooks).toEqual([]);
    expect(feeBuybackOptions(999, user)).toEqual({
      beneficiary: user,
      trustedHooks: [],
      terminals: [],
      controllers: [],
      feePayers: [],
    });
  });

  it("recognizes a fee routed through the chain's own deployments", async () => {
    const v6 = jbContractAddress["6"] as unknown as Record<
      string,
      Record<number, string>
    >;
    // The fixture's fee, emitted by Base's terminal, controller and REVLoans
    // and by the previous buyback hook generation.
    const deployed: Record<string, string> = {
      [terminal]: v6.JBMultiTerminal[8453],
      [hook]: jbContractAddressHistory["6"].JBBuybackHook.previous[8453],
      [controller]: v6.JBController[8453],
      [loans]: v6.REVLoans[8453],
    };
    const readdress = <T extends string>(text: T) =>
      Object.entries(deployed).reduce(
        (out, [fixture, address]) =>
          out.replaceAll(fixture.slice(2), address.slice(2).toLowerCase()),
        text as string,
      ) as T;
    const onBase = simulation().map((block) => ({
      calls: block.calls.map((call) => ({
        ...call,
        logs: call.logs.map((log) => ({
          address: readdress(log.address),
          topics: (log.topics as `0x${string}`[]).map(readdress),
          data: readdress(log.data),
        })),
      })),
    }));
    expect(
      analyzeFeeSimulation(onBase, feeBuybackOptions(8453, user)),
    ).toMatchObject({ status: "fallback", fees: [{ route: "fallback" }] });
    expect(
      analyzeFeeSimulation(simulation(), feeBuybackOptions(8453, user)).status,
    ).toBe("none");
    // A chain without a buyback hook never simulates.
    const request = vi.fn();
    await expect(
      checkFeeBuyback(
        { request },
        { from: user, to: terminal, data: "0x" },
        feeBuybackOptions(11155420, user),
      ),
    ).resolves.toEqual({ status: "unknown", fees: [] });
    expect(request).not.toHaveBeenCalled();
  });
});
