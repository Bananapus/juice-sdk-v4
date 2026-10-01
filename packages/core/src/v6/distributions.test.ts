import {
  encodeAbiParameters,
  encodeEventTopics,
  zeroAddress,
  type Abi,
  type AbiEvent,
  type Address,
} from "viem";
import { describe, expect, it } from "vitest";
import { jbControllerAbi } from "../generated/abi/jbControllerAbi.js";
import { jbMultiTerminalAbi } from "../generated/abi/jbMultiTerminalAbi.js";
import { jbTokensAbi } from "../generated/abi/jbTokensAbi.js";
import {
  verifyPayoutReceipt,
  verifyReservedDistributionReceipt,
  type ExpectedPayoutReceipt,
  type ExpectedReservedReceipt,
} from "./distributions.js";

const terminal = "0x0000000000000000000000000000000000000011" as Address;
const token = "0x0000000000000000000000000000000000000012" as Address;
const owner = "0x0000000000000000000000000000000000000013" as Address;
const caller = "0x0000000000000000000000000000000000000014" as Address;
const hook = "0x0000000000000000000000000000000000000015" as Address;
const controller = "0x0000000000000000000000000000000000000016" as Address;
const tokens = "0x0000000000000000000000000000000000000017" as Address;
const DEAD = "0x000000000000000000000000000000000000dEaD" as Address;

function log(
  abi: Abi,
  name: string,
  args: Record<string, unknown>,
  address: Address,
) {
  const event = abi.find(
    (item) => item.type === "event" && item.name === name,
  ) as AbiEvent;
  const unindexed = event.inputs.filter((input) => !input.indexed);
  return {
    address,
    topics: encodeEventTopics({ abi: [event], eventName: name, args } as never),
    data: encodeAbiParameters(
      unindexed,
      unindexed.map((input) => args[input.name!]),
    ),
  };
}

describe("payout receipts", () => {
  const split = {
    percent: 250_000_000,
    projectId: 0n,
    beneficiary: owner,
    preferAddToBalance: false,
    lockedUntil: 100,
    hook,
  };
  const expected: ExpectedPayoutReceipt = {
    terminal,
    token,
    owner,
    caller,
    projectId: "42",
    rulesetId: "100",
    cycleNumber: "7",
    amount: "10000",
    minimum: "9900",
    splits: [
      { ...split, projectId: "0" },
      {
        ...split,
        percent: 500_000_000,
        hook: zeroAddress,
        projectId: "5",
        preferAddToBalance: true,
      },
    ],
  };
  const payout = {
    rulesetId: 100n,
    rulesetCycleNumber: 7n,
    projectId: 42n,
    projectOwner: owner,
    amount: 10_000n,
    amountPaidOut: 10_000n,
    fee: 249n,
    netLeftoverPayoutAmount: 2_438n,
    caller,
  };
  const first = {
    projectId: 42n,
    rulesetId: 100n,
    group: BigInt(token),
    split,
    amount: 2_500n,
    netAmount: 2_438n,
    caller,
  };
  const second = {
    ...first,
    split: {
      ...split,
      percent: 500_000_000,
      projectId: 5n,
      preferAddToBalance: true,
      hook: zeroAddress,
    },
    amount: 5_000n,
    netAmount: 4_875n,
  };
  const event = (
    name: string,
    args: Record<string, unknown>,
    address = terminal,
  ) => log(jbMultiTerminalAbi as Abi, name, args, address);
  function receipt(
    options: {
      first?: Partial<typeof first>;
      second?: Partial<typeof second>;
      payout?: Partial<typeof payout>;
    } = {},
  ) {
    return {
      status: "success",
      logs: [
        event("SendPayoutToSplit", { ...first, ...options.first }),
        event("SendPayoutToSplit", { ...second, ...options.second }),
        event("SendPayouts", { ...payout, ...options.payout }),
      ],
    };
  }

  it("accepts exact reviewed hook, project and owner recipients with the full standard fee", () => {
    expect(() => verifyPayoutReceipt(receipt(), expected)).not.toThrow();
    // Any uint256 form for the expectation.
    expect(() =>
      verifyPayoutReceipt(receipt(), {
        ...expected,
        projectId: 42n,
        rulesetId: 100,
        cycleNumber: "0x7",
        amount: 10_000n,
        minimum: 9_900,
      }),
    ).not.toThrow();
  });

  it("accepts feeless recipients and fee rounding at the one-unit boundary", () => {
    expect(() =>
      verifyPayoutReceipt(
        receipt({
          first: { netAmount: 2_500n },
          second: { netAmount: 5_000n },
          payout: { netLeftoverPayoutAmount: 2_500n, fee: 0n },
        }),
        expected,
      ),
    ).not.toThrow();
    expect(() =>
      verifyPayoutReceipt(
        receipt({
          first: { amount: 1n, netAmount: 1n },
          second: { amount: 2n, netAmount: 2n },
          payout: {
            amount: 4n,
            amountPaidOut: 4n,
            fee: 0n,
            netLeftoverPayoutAmount: 1n,
          },
        }),
        { ...expected, amount: "4", minimum: "4" },
      ),
    ).not.toThrow();
  });

  it("rejects a hook that took part of its share though the receipt succeeded with no failure event", () => {
    expect(() =>
      verifyPayoutReceipt(receipt({ first: { netAmount: 2_437n } }), expected),
    ).toThrow(
      "Project 42's payouts from 0x0000000000000000000000000000000000000011: split 1 (0x0000000000000000000000000000000000000013) received 2,437 of its 2,500. Keep this transaction, and do not send these payouts again.",
    );
    // Between the two complete amounts: the fee-taking net and the full share.
    expect(() =>
      verifyPayoutReceipt(receipt({ first: { netAmount: 2_490n } }), expected),
    ).toThrow("received 2,490 of its 2,500");
    expect(() =>
      verifyPayoutReceipt(receipt({ first: { netAmount: 2_501n } }), expected),
    ).toThrow();
  });

  it("holds a feeless split to its full share, even short by less than the fee", () => {
    const feeless = {
      ...expected,
      splits: [{ ...expected.splits[0], feeless: true }, expected.splits[1]],
    };
    expect(() =>
      verifyPayoutReceipt(receipt({ first: { netAmount: 2_500n } }), feeless),
    ).not.toThrow();
    expect(() => verifyPayoutReceipt(receipt(), feeless)).toThrow(
      "received 2,438 of its 2,500",
    );
    expect(() =>
      verifyPayoutReceipt(receipt({ first: { netAmount: 2_499n } }), feeless),
    ).toThrow("received 2,499 of its 2,500");
  });

  it("rejects partial owner delivery and excessive fee claims", () => {
    expect(() =>
      verifyPayoutReceipt(
        receipt({ payout: { netLeftoverPayoutAmount: 2_437n } }),
        expected,
      ),
    ).toThrow("the owner received 2,437 of the 2,500 left");
    expect(() =>
      verifyPayoutReceipt(receipt({ payout: { fee: 251n } }), expected),
    ).toThrow("the fee 251 exceeds 2.5% of 10,000");
  });

  it.each([
    [
      { rulesetId: 101n },
      "they ran in ruleset 101 cycle 7, not ruleset 100 cycle 7",
    ],
    [{ rulesetCycleNumber: 8n }, "they ran in ruleset 100 cycle 8"],
    [{ projectOwner: hook }, `the owner was ${hook}, not ${owner}`],
    [{ amount: 10_001n }, "they were for 10,001, not 10,000"],
    [
      { amountPaidOut: 9_899n },
      "they paid out 9,899, below the reviewed 9,900",
    ],
    [{ caller: hook }, `they were sent by ${hook}, not ${caller}`],
  ])(
    "rejects payout ruleset, owner, amount or sender drift: %o",
    (change, problem) => {
      expect(() =>
        verifyPayoutReceipt(receipt({ payout: change }), expected),
      ).toThrow(problem);
    },
  );

  it("rejects a payout of nothing", () => {
    expect(() =>
      verifyPayoutReceipt(receipt({ payout: { amountPaidOut: 0n } }), {
        ...expected,
        minimum: 0,
      }),
    ).toThrow("they paid out 0, below the reviewed 0");
  });

  it.each([
    { percent: 249_999_999 },
    { projectId: 1n },
    { beneficiary: caller },
    { preferAddToBalance: true },
    { lockedUntil: 101 },
    { hook: zeroAddress },
  ])("rejects changed split settings: %o", (change) => {
    expect(() =>
      verifyPayoutReceipt(
        receipt({ first: { split: { ...split, ...change } } }),
        expected,
      ),
    ).toThrow(
      "split 1 (0x0000000000000000000000000000000000000013) is not the reviewed split",
    );
  });

  it("rejects a split paid in another ruleset, group or by another sender", () => {
    for (const change of [
      { rulesetId: 99n },
      { group: 1n },
      { caller: hook },
    ]) {
      expect(() =>
        verifyPayoutReceipt(receipt({ second: change }), expected),
      ).toThrow(
        "split 2 (0x0000000000000000000000000000000000000013) is not the reviewed split",
      );
    }
  });

  it("rejects missing, duplicate, out-of-order and forged-emitter split events", () => {
    const valid = receipt();
    for (const logs of [
      valid.logs.slice(1),
      [...valid.logs, valid.logs[0]],
      [{ ...valid.logs[0], address: hook }, ...valid.logs.slice(1)],
    ]) {
      expect(() => verifyPayoutReceipt({ logs }, expected)).toThrow(
        /pays \d splits, not the reviewed 2/,
      );
    }
    expect(() =>
      verifyPayoutReceipt(
        { logs: [valid.logs[1], valid.logs[0], valid.logs[2]] },
        expected,
      ),
    ).toThrow("is not the reviewed split");
  });

  it("rejects missing or duplicate terminal completion events", () => {
    const valid = receipt();
    expect(() =>
      verifyPayoutReceipt({ logs: valid.logs.slice(0, 2) }, expected),
    ).toThrow("the receipt has 0 SendPayouts events, not 1");
    expect(() =>
      verifyPayoutReceipt({ logs: [...valid.logs, valid.logs[2]] }, expected),
    ).toThrow("the receipt has 2 SendPayouts events, not 1");
  });

  it("uses the terminal's successive remainder rounding for each split's gross", () => {
    const odd = { ...expected, amount: "10003", minimum: "10003" };
    expect(() =>
      verifyPayoutReceipt(
        receipt({
          first: { amount: 2_500n },
          second: { amount: 5_002n, netAmount: 4_877n },
          payout: {
            amount: 10_003n,
            amountPaidOut: 10_003n,
            netLeftoverPayoutAmount: 2_439n,
          },
        }),
        odd,
      ),
    ).not.toThrow();
    expect(() =>
      verifyPayoutReceipt(receipt({ first: { amount: 2_501n } }), expected),
    ).toThrow(
      "split 1 (0x0000000000000000000000000000000000000013) was allotted 2,501, not 2,500",
    );
  });

  it("rejects either recipient failure event, from any sender", () => {
    const reverted = event("PayoutReverted", {
      projectId: 42n,
      split,
      amount: 2_500n,
      reason: "0x",
      caller: hook,
    });
    const transferReverted = event("PayoutTransferReverted", {
      projectId: 42n,
      addr: owner,
      token,
      amount: 2_438n,
      fee: 62n,
      reason: "0x",
      caller,
    });
    for (const [failed, name] of [
      [reverted, "PayoutReverted"],
      [transferReverted, "PayoutTransferReverted"],
    ] as const) {
      expect(() =>
        verifyPayoutReceipt({ logs: [...receipt().logs, failed] }, expected),
      ).toThrow(`a recipient failed (${name})`);
    }
    // Another emitter's failure is not this terminal's.
    expect(() =>
      verifyPayoutReceipt(
        { logs: [...receipt().logs, { ...reverted, address: hook }] },
        expected,
      ),
    ).not.toThrow();
  });

  it("ignores other projects, other emitters and malformed logs without counting them", () => {
    expect(() =>
      verifyPayoutReceipt(
        {
          logs: [
            ...receipt().logs,
            event("SendPayouts", { ...payout, projectId: 99n }),
            event("SendPayouts", payout, hook),
            { ...event("SendPayouts", payout), data: "0x" },
            { address: 7, topics: [], data: "0x" },
            null,
          ],
        },
        expected,
      ),
    ).not.toThrow();
  });

  it("refuses a failed receipt, no logs, or a malformed expectation, naming it", () => {
    expect(() =>
      verifyPayoutReceipt({ ...receipt(), status: "reverted" }, expected),
    ).toThrow("The distribution transaction did not succeed.");
    expect(() =>
      verifyPayoutReceipt({ logs: undefined as never }, expected),
    ).toThrow("The distribution receipt has no logs.");
    for (const [change, message] of [
      [
        { terminal: "0x12" },
        "Invalid distribution expectation terminal: 0x12.",
      ],
      [{ amount: "-1" }, "Invalid distribution expectation amount: -1."],
      [{ splits: "all" }, "Invalid distribution expectation splits: all."],
      [{ splits: [null] }, "Invalid distribution expectation split 1: null."],
      [
        { splits: [{ ...expected.splits[0], preferAddToBalance: "no" }] },
        "Invalid distribution expectation split 1 preferAddToBalance: no.",
      ],
      [
        { splits: [{ ...expected.splits[0], feeless: 1 }] },
        "Invalid distribution expectation split 1 feeless: 1.",
      ],
      [
        { splits: [{ ...expected.splits[0], hook: "0x12" }] },
        "Invalid distribution expectation split 1 hook: 0x12.",
      ],
      [
        {
          splits: [
            { ...expected.splits[0], percent: 600_000_000 },
            { ...expected.splits[1], percent: 500_000_000 },
          ],
        },
        "Invalid distribution expectation split percents: a total above 1000000000.",
      ],
    ] as const) {
      expect(() =>
        verifyPayoutReceipt(receipt(), {
          ...expected,
          ...change,
        } as unknown as ExpectedPayoutReceipt),
      ).toThrow(message);
    }
    expect(() => verifyPayoutReceipt(receipt(), undefined as never)).toThrow(
      "Invalid distribution expectation terminal: undefined.",
    );
  });
});

describe("reserved token receipts", () => {
  const recipient = "0x0000000000000000000000000000000000000018" as Address;
  const base = {
    projectId: 0n,
    preferAddToBalance: false,
    lockedUntil: 0,
    hook: zeroAddress,
  };
  const splits = [
    { ...base, percent: 500_000_000, beneficiary: recipient },
    { ...base, percent: 100_000_000, beneficiary: DEAD },
    { ...base, percent: 300_000_000, beneficiary: recipient, hook },
  ];
  const expected: ExpectedReservedReceipt = {
    controller,
    tokens,
    projectId: "4",
    rulesetId: "1",
    cycleNumber: "1",
    owner,
    caller,
    tokenCount: "100",
    splits,
  };
  const event = (
    name: string,
    args: Record<string, unknown>,
    address = controller,
  ) => log(jbControllerAbi as Abi, name, args, address);
  const sent = (
    split: (typeof splits)[number],
    tokenCount: bigint,
    extra: Record<string, unknown> = {},
  ) =>
    event("SendReservedTokensToSplit", {
      projectId: 4n,
      rulesetId: 1n,
      groupId: 1n,
      split,
      tokenCount,
      caller,
      ...extra,
    });
  const total = (extra: Record<string, unknown> = {}) =>
    event("SendReservedTokensToSplits", {
      rulesetId: 1n,
      rulesetCycleNumber: 1n,
      projectId: 4n,
      owner,
      tokenCount: 100n,
      leftoverAmount: 10n,
      caller,
      ...extra,
    });
  const burn = (count: bigint, holder: Address = controller, projectId = 4n) =>
    log(
      jbTokensAbi as Abi,
      "Burn",
      {
        holder,
        projectId,
        count,
        creditBalance: 0n,
        tokenBalance: 0n,
        caller: controller,
      },
      tokens,
    );
  const valid = () => [
    sent(splits[0], 50n),
    sent(splits[1], 10n),
    burn(10n),
    sent(splits[2], 30n),
    total(),
  ];

  it("accepts every split's exact share, the reviewed total and the leftover", () => {
    expect(() =>
      verifyReservedDistributionReceipt(
        { status: "success", logs: valid() },
        expected,
      ),
    ).not.toThrow();
    // Burns of other holders or projects are not the controller's.
    expect(() =>
      verifyReservedDistributionReceipt(
        { logs: [...valid(), burn(5n, hook), burn(5n, controller, 5n)] },
        expected,
      ),
    ).not.toThrow();
  });

  it("rejects tokens a hook did not take, and a burn the review did not plan", () => {
    expect(() =>
      verifyReservedDistributionReceipt(
        { logs: [...valid(), burn(1n)] },
        expected,
      ),
    ).toThrow(
      `Project 4's reserved tokens from ${controller}: the controller burned 11 tokens, not the 10 sent to ${DEAD}; a hook did not take its share. Keep this transaction, and do not distribute these reserved tokens again.`,
    );
    const withoutBurn = valid().filter((_, index) => index !== 2);
    expect(() =>
      verifyReservedDistributionReceipt({ logs: withoutBurn }, expected),
    ).toThrow("the controller burned 0 tokens, not the 10");
  });

  it("plans a burn only for 0x…dEaD with no hook and no project", () => {
    const hooked = [
      { ...base, percent: 500_000_000, beneficiary: DEAD, hook },
      { ...base, percent: 400_000_000, beneficiary: DEAD, projectId: 7n },
    ];
    expect(() =>
      verifyReservedDistributionReceipt(
        {
          logs: [sent(hooked[0], 50n), sent(hooked[1], 40n), total()],
        },
        { ...expected, splits: hooked },
      ),
    ).not.toThrow();
  });

  it("rejects either recipient failure event", () => {
    for (const [failed, name] of [
      [
        event("ReservedDistributionReverted", {
          projectId: 4n,
          split: splits[0],
          tokenCount: 50n,
          reason: "0x",
          caller,
        }),
        "ReservedDistributionReverted",
      ],
      [
        event("SplitHookReverted", {
          projectId: 4n,
          hook,
          reason: "0x",
          caller,
        }),
        "SplitHookReverted",
      ],
    ] as const) {
      expect(() =>
        verifyReservedDistributionReceipt(
          { logs: [...valid(), failed] },
          expected,
        ),
      ).toThrow(`a recipient failed (${name})`);
    }
  });

  it("requires exactly one distribution for the reviewed sender, ruleset, owner, count and leftover", () => {
    const withTotal = (extra: Record<string, unknown> | null) =>
      verifyReservedDistributionReceipt(
        { logs: [...valid().slice(0, 4), ...(extra ? [total(extra)] : [])] },
        expected,
      );
    expect(() => withTotal(null)).toThrow(
      "the receipt has 0 SendReservedTokensToSplits events, not 1",
    );
    expect(() =>
      verifyReservedDistributionReceipt(
        { logs: [...valid(), total()] },
        expected,
      ),
    ).toThrow("the receipt has 2 SendReservedTokensToSplits events, not 1");
    for (const [extra, problem] of [
      [{ caller: hook }, `they were sent by ${hook}, not ${caller}`],
      [
        { rulesetId: 2n },
        "they ran in ruleset 2 cycle 1, not ruleset 1 cycle 1",
      ],
      [{ rulesetCycleNumber: 2n }, "they ran in ruleset 1 cycle 2"],
      [{ owner: hook }, `the owner was ${hook}, not ${owner}`],
      [
        { tokenCount: 101n },
        "101 tokens were distributed, not the reviewed 100",
      ],
      [{ leftoverAmount: 11n }, "11 tokens were left to the owner, not 10"],
    ] as const) {
      expect(() => withTotal(extra)).toThrow(problem);
    }
  });

  it("requires each reviewed split's exact share, in order", () => {
    const logs = valid();
    expect(() =>
      verifyReservedDistributionReceipt(
        { logs: [logs[1], logs[0], ...logs.slice(2)] },
        expected,
      ),
    ).toThrow(`split 1 (${recipient}) is not the reviewed split`);
    expect(() =>
      verifyReservedDistributionReceipt(
        { logs: [sent(splits[0], 49n), ...logs.slice(1)] },
        expected,
      ),
    ).toThrow(`split 1 (${recipient}) was sent 49 tokens, not 50`);
    for (const extra of [
      { groupId: 2n },
      { rulesetId: 2n },
      { caller: hook },
    ]) {
      expect(() =>
        verifyReservedDistributionReceipt(
          { logs: [sent(splits[0], 50n, extra), ...logs.slice(1)] },
          expected,
        ),
      ).toThrow("is not the reviewed split");
    }
    expect(() =>
      verifyReservedDistributionReceipt({ logs: logs.slice(1) }, expected),
    ).toThrow("the receipt sends to 2 splits, not the reviewed 3");
    expect(() =>
      verifyReservedDistributionReceipt(
        { logs: [...logs, sent(splits[0], 50n)] },
        expected,
      ),
    ).toThrow("the receipt sends to 4 splits, not the reviewed 3");
  });
});

describe("distributions as jbm reviews them", () => {
  const recipient = "0x3333333333333333333333333333333333333333" as Address;
  const account = "0x1111111111111111111111111111111111111111" as Address;
  const usdc = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address;
  const split = {
    percent: 500_000_000,
    projectId: 0n,
    beneficiary: recipient,
    lockedUntil: 0,
    hook: zeroAddress,
    preferAddToBalance: false,
  };

  it("proves a 12 USDC payout with one half split and the owner's half, both net of the fee", () => {
    const expected: ExpectedPayoutReceipt = {
      terminal,
      token: usdc,
      owner: account,
      caller: account,
      projectId: 303,
      rulesetId: 79,
      cycleNumber: 6,
      amount: 12_000_000n,
      minimum: 12_000_000n,
      splits: [split],
    };
    const paid = (netAmount: bigint, hookAddress: Address = zeroAddress) =>
      log(
        jbMultiTerminalAbi as Abi,
        "SendPayoutToSplit",
        {
          projectId: 303n,
          rulesetId: 79n,
          group: BigInt(usdc),
          split: { ...split, hook: hookAddress },
          amount: 6_000_000n,
          netAmount,
          caller: account,
        },
        terminal,
      );
    const success = log(
      jbMultiTerminalAbi as Abi,
      "SendPayouts",
      {
        rulesetId: 79n,
        rulesetCycleNumber: 6n,
        projectId: 303n,
        projectOwner: account,
        amount: 12_000_000n,
        amountPaidOut: 12_000_000n,
        fee: 300_000n,
        netLeftoverPayoutAmount: 5_850_000n,
        caller: account,
      },
      terminal,
    );
    expect(() =>
      verifyPayoutReceipt({ logs: [paid(5_850_000n), success] }, expected),
    ).not.toThrow();
    expect(() => verifyPayoutReceipt({ logs: [success] }, expected)).toThrow(
      "the receipt pays 0 splits, not the reviewed 1",
    );
    // A feeless hook that pulled 10,000 short: less than the fee would be.
    const hooked = { ...expected, splits: [{ ...split, hook, feeless: true }] };
    expect(() =>
      verifyPayoutReceipt({ logs: [paid(5_990_000n, hook), success] }, hooked),
    ).toThrow("received 5,990,000 of its 6,000,000");
  });

  it("proves a reserved distribution of 100 tokens with one half split", () => {
    const pending = 100n * 10n ** 18n;
    const expected: ExpectedReservedReceipt = {
      controller,
      tokens,
      projectId: 303,
      rulesetId: 79,
      cycleNumber: 6,
      owner: account,
      caller: account,
      tokenCount: pending,
      splits: [split],
    };
    const logs = [
      log(
        jbControllerAbi as Abi,
        "SendReservedTokensToSplit",
        {
          projectId: 303n,
          rulesetId: 79n,
          groupId: 1n,
          split,
          tokenCount: pending / 2n,
          caller: account,
        },
        controller,
      ),
      log(
        jbControllerAbi as Abi,
        "SendReservedTokensToSplits",
        {
          rulesetId: 79n,
          rulesetCycleNumber: 6n,
          projectId: 303n,
          owner: account,
          tokenCount: pending,
          leftoverAmount: pending / 2n,
          caller: account,
        },
        controller,
      ),
    ];
    expect(() =>
      verifyReservedDistributionReceipt({ logs }, expected),
    ).not.toThrow();
    const burned = log(
      jbTokensAbi as Abi,
      "Burn",
      {
        holder: controller,
        projectId: 303n,
        count: 1n,
        creditBalance: 0n,
        tokenBalance: 0n,
        caller: controller,
      },
      tokens,
    );
    expect(() =>
      verifyReservedDistributionReceipt({ logs: [burned, ...logs] }, expected),
    ).toThrow("the controller burned 1 tokens, not the 0");
  });
});
