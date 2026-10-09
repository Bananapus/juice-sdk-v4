import { BaseError, UserRejectedRequestError, type Address } from "viem";
import { describe, expect, it, vi } from "vitest";
import {
  isDefiniteWalletRejection,
  SubmittedContractWriteError,
  submitReviewedContractWrite,
} from "./contractWrite.js";

const ALICE = "0x1111111111111111111111111111111111111111" as Address;
const BOB = "0x2222222222222222222222222222222222222222" as Address;

function harness() {
  const events: string[] = [];
  const request = { chainId: 10, calldata: "reviewed" };
  const simulated = { calldata: "simulated", gas: 123n };
  let current: Address | undefined = ALICE;

  return {
    events,
    request,
    simulated,
    setCurrent: (account: Address | undefined) => {
      current = account;
    },
    options: {
      request,
      expectedAccount: ALICE,
      review: vi.fn(async (reviewed) => {
        events.push("review");
        expect(reviewed).toBe(request);
      }),
      switchChain: vi.fn(async (chainId) => {
        events.push(`switch:${chainId}`);
      }),
      currentAccount: vi.fn(() => current),
      reverify: vi.fn(async (reviewed) => {
        events.push("reverify");
        expect(reviewed).toBe(request);
      }),
      simulate: vi.fn(async (reviewed) => {
        events.push("simulate");
        expect(reviewed).toBe(request);
        return simulated;
      }),
      write: vi.fn(async (prepared) => {
        events.push("write");
        expect(prepared).toBe(simulated);
        return "0xhash";
      }),
      onPhase: vi.fn((phase: string) => {
        events.push(`phase:${phase}`);
      }),
    },
  };
}

describe("reviewed direct-write boundary", () => {
  it("checks, reviews, switches, checks, simulates, rechecks, then signs exactly once", async () => {
    const run = harness();

    await expect(submitReviewedContractWrite(run.options)).resolves.toBe(
      "0xhash",
    );
    expect(run.events).toEqual([
      "phase:review",
      "review",
      "phase:simulating",
      "switch:10",
      "reverify",
      "simulate",
      "phase:signing",
      "write",
    ]);
    expect(run.options.currentAccount).toHaveBeenCalledTimes(5);
    expect(run.options.write).toHaveBeenCalledTimes(1);
  });

  it("refuses before the review opens when the connected account is not the reviewed one", async () => {
    for (const connected of [BOB, undefined]) {
      const run = harness();
      run.setCurrent(connected);
      await expect(submitReviewedContractWrite(run.options)).rejects.toThrow(
        new Error("The connected account changed. Review again."),
      );
      expect(run.options.onPhase).not.toHaveBeenCalled();
      expect(run.options.review).not.toHaveBeenCalled();
      expect(run.options.switchChain).not.toHaveBeenCalled();
    }
    const run = harness();
    run.setCurrent(BOB);
    await expect(
      submitReviewedContractWrite({
        ...run.options,
        accountChangedError: "Reconnect the account that reviewed this.",
      }),
    ).rejects.toThrow(new Error("Reconnect the account that reviewed this."));
    expect(run.options.review).not.toHaveBeenCalled();
  });

  it("compares the reviewed account in any letter case", async () => {
    const mixed = "0xAbCdEf0000000000000000000000000000000001" as Address;
    const run = harness();
    run.setCurrent(mixed.toLowerCase() as Address);
    await expect(
      submitReviewedContractWrite({ ...run.options, expectedAccount: mixed }),
    ).resolves.toBe("0xhash");
  });

  it("runs the app's guard before reading the account", async () => {
    const run = harness();
    run.setCurrent(BOB);
    const guard = vi.fn(() => {
      throw new Error("Stop viewing as another account to send.");
    });
    await expect(
      submitReviewedContractWrite({ ...run.options, guard }),
    ).rejects.toThrow("Stop viewing as another account to send.");
    expect(run.options.currentAccount).not.toHaveBeenCalled();
    expect(run.options.review).not.toHaveBeenCalled();
  });

  it("says the apps' words when the account changes after the review opens", async () => {
    const run = harness();
    run.options.review.mockImplementationOnce(async () => {
      run.setCurrent(BOB);
    });
    await expect(submitReviewedContractWrite(run.options)).rejects.toThrow(
      new Error("The connected account changed. Review again."),
    );
    expect(run.options.switchChain).toHaveBeenCalledOnce();
    expect(run.options.simulate).not.toHaveBeenCalled();
  });

  it("fails closed before simulation when reviewed state changes", async () => {
    const run = harness();
    run.options.reverify.mockRejectedValueOnce(
      new Error("The project controller changed. Review again."),
    );

    await expect(submitReviewedContractWrite(run.options)).rejects.toThrow(
      "controller changed",
    );
    expect(run.options.simulate).not.toHaveBeenCalled();
    expect(run.options.write).not.toHaveBeenCalled();
  });

  it("does nothing irreversible when review fails", async () => {
    const run = harness();
    run.options.review.mockRejectedValueOnce(new Error("Review closed."));

    await expect(submitReviewedContractWrite(run.options)).rejects.toThrow(
      "Review closed.",
    );
    expect(run.options.switchChain).not.toHaveBeenCalled();
    expect(run.options.simulate).not.toHaveBeenCalled();
    expect(run.options.write).not.toHaveBeenCalled();
  });

  it("fails closed if the account changes during the chain switch", async () => {
    const run = harness();
    run.options.switchChain.mockImplementationOnce(async () => {
      run.setCurrent(BOB);
    });

    await expect(submitReviewedContractWrite(run.options)).rejects.toThrow(
      /account changed/i,
    );
    expect(run.options.simulate).not.toHaveBeenCalled();
    expect(run.options.write).not.toHaveBeenCalled();
  });

  it("never signs when the account changes while simulation is running", async () => {
    const run = harness();
    run.options.simulate.mockImplementationOnce(async () => {
      run.setCurrent(undefined);
      return run.simulated;
    });

    await expect(submitReviewedContractWrite(run.options)).rejects.toThrow(
      /account changed/i,
    );
    expect(run.options.write).not.toHaveBeenCalled();
  });

  it("requires an expected connected account before opening review", async () => {
    const run = harness();

    await expect(
      submitReviewedContractWrite({
        ...run.options,
        expectedAccount: undefined,
      }),
    ).rejects.toThrow("Connect a wallet first.");
    expect(run.options.review).not.toHaveBeenCalled();
  });

  it("awaits durable intent after simulation and before signing, then checks identity again", async () => {
    const run = harness();
    const beforeWrite = vi.fn(async () => {
      expect(run.options.simulate).toHaveBeenCalledOnce();
      expect(run.options.write).not.toHaveBeenCalled();
      await Promise.resolve();
      run.events.push("persist");
    });
    await submitReviewedContractWrite({ ...run.options, beforeWrite });
    expect(run.events.slice(-4)).toEqual([
      "simulate",
      "persist",
      "phase:signing",
      "write",
    ]);
    expect(run.options.currentAccount).toHaveBeenCalledTimes(5);
  });

  it("does not mark an attempt when review is cancelled or simulation fails", async () => {
    for (const gate of ["review", "simulate"] as const) {
      const run = harness();
      const beforeWrite = vi.fn();
      run.options[gate].mockRejectedValueOnce(new Error(`${gate} failed`));
      await expect(
        submitReviewedContractWrite({ ...run.options, beforeWrite }),
      ).rejects.toThrow(`${gate} failed`);
      expect(beforeWrite).not.toHaveBeenCalled();
      expect(run.options.write).not.toHaveBeenCalled();
    }
  });

  it("blocks the wallet write if persistence fails", async () => {
    const run = harness();
    await expect(
      submitReviewedContractWrite({
        ...run.options,
        beforeWrite: () => {
          throw new Error("Recovery storage unavailable");
        },
      }),
    ).rejects.toThrow("Recovery storage unavailable");
    expect(run.options.write).not.toHaveBeenCalled();
    expect(run.events).not.toContain("phase:signing");
  });

  it("blocks the wallet write if identity changes during asynchronous persistence", async () => {
    const run = harness();
    const onBeforeWriteAborted = vi.fn();
    await expect(
      submitReviewedContractWrite({
        ...run.options,
        beforeWrite: async () => {
          await Promise.resolve();
          run.setCurrent(BOB);
        },
        onBeforeWriteAborted,
      }),
    ).rejects.toThrow(/account changed/i);
    expect(run.options.write).not.toHaveBeenCalled();
    expect(onBeforeWriteAborted).toHaveBeenCalledOnce();
  });

  it.each([false, true])(
    "runs the final synchronous guard after every preparation and signing phase (intent %s)",
    async (persist) => {
      const run = harness();
      const beforeWrite = persist
        ? vi.fn(async () => {
            await Promise.resolve();
            run.events.push("persist");
          })
        : undefined;
      const beforeSend = vi.fn(() => {
        run.events.push("final");
        queueMicrotask(() => run.events.push("later"));
      });
      await submitReviewedContractWrite({
        ...run.options,
        beforeWrite,
        beforeSend,
      });
      expect(run.events.slice(-4)).toEqual([
        "phase:signing",
        "final",
        "write",
        "later",
      ]);
      expect(beforeSend).toHaveBeenCalledOnce();
    },
  );

  it.each([false, true])(
    "cleans only a persisted intent when the final app guard refuses (intent %s)",
    async (persist) => {
      const run = harness();
      const onBeforeWriteAborted = vi.fn();
      const onWriteRejected = vi.fn();
      const refusal = new UserRejectedRequestError(
        new Error("Final scope changed"),
      );
      await expect(
        submitReviewedContractWrite({
          ...run.options,
          beforeWrite: persist
            ? async () => {
                await Promise.resolve();
              }
            : undefined,
          beforeSend: () => {
            throw refusal;
          },
          onBeforeWriteAborted,
          onWriteRejected,
        }),
      ).rejects.toBe(refusal);
      expect(onBeforeWriteAborted).toHaveBeenCalledTimes(persist ? 1 : 0);
      expect(onWriteRejected).not.toHaveBeenCalled();
      expect(run.options.write).not.toHaveBeenCalled();
    },
  );

  it.each([false, true])(
    "refuses account drift in the signing-phase callback (intent %s)",
    async (persist) => {
      const run = harness();
      const onBeforeWriteAborted = vi.fn();
      const beforeSend = vi.fn();
      run.options.onPhase.mockImplementation((phase) => {
        if (phase === "signing") run.setCurrent(BOB);
      });
      await expect(
        submitReviewedContractWrite({
          ...run.options,
          beforeWrite: persist ? async () => {} : undefined,
          beforeSend,
          onBeforeWriteAborted,
        }),
      ).rejects.toThrow(/account changed/i);
      expect(onBeforeWriteAborted).toHaveBeenCalledTimes(persist ? 1 : 0);
      expect(beforeSend).not.toHaveBeenCalled();
      expect(run.options.write).not.toHaveBeenCalled();
    },
  );

  it("never invokes pre-wallet cleanup after a write starts or when persistence was not completed", async () => {
    for (const gate of ["beforeWrite", "write"] as const) {
      const run = harness();
      const onBeforeWriteAborted = vi.fn();
      const beforeWrite = vi.fn(async () => {});
      const error = new Error("Ambiguous transport error");
      if (gate === "beforeWrite") beforeWrite.mockRejectedValueOnce(error);
      else run.options.write.mockRejectedValueOnce(error);
      await expect(
        submitReviewedContractWrite({
          ...run.options,
          beforeWrite,
          onBeforeWriteAborted,
        }),
      ).rejects.toBe(error);
      expect(onBeforeWriteAborted).not.toHaveBeenCalled();
    }
  });

  it("allows intent cleanup only for a typed wallet rejection from the write", async () => {
    const run = harness();
    const rejected = new BaseError("Wallet write rejected", {
      cause: new UserRejectedRequestError(new Error("Rejected in wallet")),
    });
    const onWriteRejected = vi.fn();
    run.options.write.mockRejectedValueOnce(rejected);
    await expect(
      submitReviewedContractWrite({ ...run.options, onWriteRejected }),
    ).rejects.toBe(rejected);
    expect(onWriteRejected).toHaveBeenCalledOnce();
  });

  it("preserves an unknown attempt after ambiguous transport failure or an earlier rejection", async () => {
    for (const gate of ["review", "simulate", "write"] as const) {
      const run = harness();
      const onWriteRejected = vi.fn();
      const error =
        gate === "write"
          ? new Error("RPC disconnected after send")
          : new UserRejectedRequestError(new Error("Rejected earlier"));
      run.options[gate].mockRejectedValueOnce(error);
      await expect(
        submitReviewedContractWrite({ ...run.options, onWriteRejected }),
      ).rejects.toBe(error);
      expect(onWriteRejected).not.toHaveBeenCalled();
    }
  });

  it("reports an uncertain result only after invoking the wallet, preserving its original error", async () => {
    for (const gate of [
      "review",
      "simulate",
      "beforeWrite",
      "beforeSend",
      "write",
    ] as const) {
      const run = harness();
      const failure = new Error("Reply lost");
      const onWriteUncertain = vi.fn();
      const onWriteSubmitted = vi.fn();
      const beforeWrite = vi.fn(async () => {});
      const beforeSend = vi.fn(() => {});
      if (gate === "beforeWrite") beforeWrite.mockRejectedValueOnce(failure);
      else if (gate === "beforeSend")
        beforeSend.mockImplementationOnce(() => {
          throw failure;
        });
      else run.options[gate].mockRejectedValueOnce(failure);
      await expect(
        submitReviewedContractWrite({
          ...run.options,
          beforeWrite,
          beforeSend,
          onWriteUncertain,
          onWriteSubmitted,
        }),
      ).rejects.toBe(failure);
      expect(onWriteUncertain).toHaveBeenCalledTimes(gate === "write" ? 1 : 0);
      if (gate === "write")
        expect(onWriteUncertain).toHaveBeenCalledWith(failure);
      expect(onWriteSubmitted).not.toHaveBeenCalled();
    }
  });

  it("reports explicit rejection without labeling it uncertain", async () => {
    const run = harness();
    const error = { code: 4001 };
    const onWriteUncertain = vi.fn();
    const onWriteRejected = vi.fn();
    run.options.write.mockRejectedValueOnce(error);
    await expect(
      submitReviewedContractWrite({
        ...run.options,
        onWriteUncertain,
        onWriteRejected,
      }),
    ).rejects.toBe(error);
    expect(onWriteRejected).toHaveBeenCalledOnce();
    expect(onWriteUncertain).not.toHaveBeenCalled();
  });

  it("awaits returned-identity persistence outside all wallet error cleanup", async () => {
    const run = harness();
    const onWriteSubmitted = vi.fn(async (hash: string) => {
      await Promise.resolve();
      expect(hash).toBe("0xhash");
      run.events.push("submitted");
    });
    await expect(
      submitReviewedContractWrite({ ...run.options, onWriteSubmitted }),
    ).resolves.toBe("0xhash");
    expect(run.events.slice(-2)).toEqual(["write", "submitted"]);

    const onWriteRejected = vi.fn();
    const onWriteUncertain = vi.fn();
    const onBeforeWriteAborted = vi.fn();
    const failure = { code: 4001 };
    onWriteSubmitted.mockRejectedValueOnce(failure);
    await expect(
      submitReviewedContractWrite({
        ...run.options,
        beforeWrite: async () => {},
        onWriteSubmitted,
        onWriteRejected,
        onWriteUncertain,
        onBeforeWriteAborted,
      }),
    ).rejects.toMatchObject({
      name: "SubmittedContractWriteError",
      hash: "0xhash",
      cause: failure,
    });
    try {
      await submitReviewedContractWrite({
        ...run.options,
        onWriteSubmitted: () => {
          throw failure;
        },
      });
    } catch (error) {
      expect(error).toBeInstanceOf(SubmittedContractWriteError);
    }
    expect(onWriteRejected).not.toHaveBeenCalled();
    expect(onWriteUncertain).not.toHaveBeenCalled();
    expect(onBeforeWriteAborted).not.toHaveBeenCalled();
  });
});

describe("definite wallet rejections", () => {
  it("recognizes an explicit rejection anywhere in the first eight causes", () => {
    const rejection = new UserRejectedRequestError(new Error("Rejected"));
    expect(isDefiniteWalletRejection(rejection)).toBe(true);
    expect(
      isDefiniteWalletRejection(
        new BaseError("Write failed", { cause: rejection }),
      ),
    ).toBe(true);
    // A raw EIP-1193 provider error, and one carried across a module boundary by name.
    expect(isDefiniteWalletRejection({ code: 4001 })).toBe(true);
    expect(
      isDefiniteWalletRejection({ name: "UserRejectedRequestError" }),
    ).toBe(true);
    let chain: unknown = { code: 4001 };
    for (let depth = 0; depth < 7; depth += 1) chain = { cause: chain };
    expect(isDefiniteWalletRejection(chain)).toBe(true);
    expect(isDefiniteWalletRejection({ cause: chain })).toBe(false);
  });

  it("treats every other failure as a possible broadcast", () => {
    for (const error of [
      undefined,
      null,
      "User rejected",
      4001,
      new Error("User rejected the request."),
      { code: "4001" },
      { code: 4100 },
      { code: -32603, cause: { message: "timeout" } },
      new SubmittedContractWriteError("0xhash", { code: 4001 }),
      { name: "SubmittedWritePersistenceError", cause: { code: 4001 } },
    ]) {
      expect(isDefiniteWalletRejection(error)).toBe(false);
    }
    const loop: { cause?: unknown } = {};
    loop.cause = loop;
    expect(isDefiniteWalletRejection(loop)).toBe(false);
  });

  it("clears persisted intent for a raw provider rejection from the write", async () => {
    const run = harness();
    const onWriteRejected = vi.fn();
    const rejected = Object.assign(new Error("User rejected the request."), {
      code: 4001,
    });
    run.options.write.mockRejectedValueOnce(rejected);
    await expect(
      submitReviewedContractWrite({ ...run.options, onWriteRejected }),
    ).rejects.toBe(rejected);
    expect(onWriteRejected).toHaveBeenCalledOnce();
  });
});
