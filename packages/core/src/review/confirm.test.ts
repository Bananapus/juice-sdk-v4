import {
  REVIEWED_SIMULATION_FAILED_LINE,
  REVIEWED_SIMULATION_UNEXPLAINED_LINE,
} from "./messages.js";
import type { Address, Hex } from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  promptReview,
  registerReviewHandler,
  type ReviewConfirmation,
  type ReviewPrompt,
  type ReviewSimulation,
} from "./confirm.js";
import { buildReviewModel, type ReviewModel } from "./model.js";
import { TransactionReviewCancelledError } from "./reviewQueue.js";
import { promptReviewForTests } from "../testing.js";

const TARGET = "0x2222222222222222222222222222222222222222" as Address;
const NOT_CONFIRMED =
  "This review was not confirmed here. Nothing was sent; review it again.";

const modelOf = (data: Hex): ReviewModel =>
  buildReviewModel({ calls: [{ chainId: 10, to: TARGET, data, value: 0n }] });

const passed = Promise.resolve<ReviewSimulation>({ status: "passed" });

function ask(model: ReviewModel, simulation = passed) {
  return promptReview(model, simulation, Promise.resolve(model));
}

const unregister: (() => void)[] = [];
function answer(
  handler: (prompt: ReviewPrompt) => Promise<ReviewConfirmation | null>,
) {
  unregister.push(registerReviewHandler(handler));
}

afterEach(() => {
  while (unregister.length) unregister.pop()!();
});

describe("core-issued review confirmation", () => {
  it("rejects foreign, reused and boolean confirmations", async () => {
    const model = modelOf("0x12345678");

    answer(async () => true as unknown as ReviewConfirmation);
    await expect(ask(model)).rejects.toThrow(NOT_CONFIRMED);

    answer(async () => ({}) as ReviewConfirmation);
    await expect(ask(model)).rejects.toThrow(NOT_CONFIRMED);

    answer(
      async () => Object.freeze(Object.create(null)) as ReviewConfirmation,
    );
    await expect(ask(model)).rejects.toThrow(NOT_CONFIRMED);

    // A confirmation that confirmed once never confirms again.
    let kept: ReviewConfirmation | undefined;
    answer(async (prompt) => (kept = prompt.confirmation));
    await expect(ask(model)).resolves.toBeUndefined();
    answer(async () => kept!);
    await expect(ask(model)).rejects.toThrow(NOT_CONFIRMED);

    // Nor does one from a prompt that was cancelled.
    let cancelled: ReviewConfirmation | undefined;
    answer(async (prompt) => {
      cancelled = prompt.confirmation;
      return null;
    });
    await expect(ask(model)).rejects.toBeInstanceOf(
      TransactionReviewCancelledError,
    );
    answer(async () => cancelled!);
    await expect(ask(model)).rejects.toThrow(NOT_CONFIRMED);
  });

  it("a confirmation for model A does not confirm model B", async () => {
    const a = modelOf("0xaaaaaaaa");
    const b = modelOf("0xbbbbbbbb");
    expect(a.id).not.toBe(b.id);
    const prompts: ReviewPrompt[] = [];
    const answers: ((value: ReviewConfirmation | null) => void)[] = [];
    answer(
      (prompt) =>
        new Promise((resolve) => {
          prompts.push(prompt);
          answers.push(resolve);
        }),
    );
    const first = ask(a);
    const second = ask(b);
    await Promise.resolve();
    expect(prompts.map((prompt) => prompt.model.id)).toEqual([a.id, b.id]);
    expect(Object.isFrozen(prompts[0].confirmation)).toBe(true);
    answers[1](prompts[0].confirmation);
    await expect(second).rejects.toThrow(NOT_CONFIRMED);
    answers[0](prompts[0].confirmation);
    await expect(first).resolves.toBeUndefined();
  });

  it("an abort closes a pending prompt as cancelled, and spends its confirmation", async () => {
    const model = modelOf("0x12345678");
    const prompts: ReviewPrompt[] = [];
    const answers: ((value: ReviewConfirmation | null) => void)[] = [];
    answer(
      (prompt) =>
        new Promise((resolve) => {
          prompts.push(prompt);
          answers.push(resolve);
        }),
    );
    const controller = new AbortController();
    const pending = promptReview(
      model,
      passed,
      Promise.resolve(model),
      controller.signal,
    );
    await Promise.resolve();
    expect(prompts[0].signal.aborted).toBe(false);
    controller.abort();
    expect(prompts[0].signal.aborted).toBe(true);
    await expect(pending).rejects.toBeInstanceOf(
      TransactionReviewCancelledError,
    );
    // The dialog's late confirm confirms nothing, here or in another prompt.
    answers[0](prompts[0].confirmation);
    answer(async () => prompts[0].confirmation);
    await expect(ask(model)).rejects.toThrow(NOT_CONFIRMED);
  });

  it("an already aborted signal never opens the prompt", async () => {
    let asked = 0;
    answer(async (prompt) => {
      asked += 1;
      return prompt.confirmation;
    });
    const model = modelOf("0x12345678");
    await expect(
      promptReview(model, passed, Promise.resolve(model), AbortSignal.abort()),
    ).rejects.toBeInstanceOf(TransactionReviewCancelledError);
    expect(asked).toBe(0);
  });

  it("an abort after the confirmation changes nothing", async () => {
    const model = modelOf("0x12345678");
    const controller = new AbortController();
    answer(async (prompt) => prompt.confirmation);
    await expect(
      promptReview(model, passed, Promise.resolve(model), controller.signal),
    ).resolves.toBeUndefined();
    controller.abort();
  });

  it("null cancels with TransactionReviewCancelledError", async () => {
    answer(async () => null);
    const cancelled = ask(modelOf("0x12345678"));
    await expect(cancelled).rejects.toBeInstanceOf(
      TransactionReviewCancelledError,
    );
    await expect(cancelled).rejects.toThrow("Review closed. Nothing was sent.");
  });

  it("refuses an unreadable model before the handler opens", async () => {
    let asked = 0;
    answer(async (prompt) => {
      asked += 1;
      return prompt.confirmation;
    });
    const unreadable = buildReviewModel(null as never);
    await expect(ask(unreadable)).rejects.toThrow(
      "This request can't be read in full, so it can't be confirmed here. Nothing was sent.",
    );
    expect(asked).toBe(0);
  });

  it("refuses with no review handler registered", async () => {
    await expect(ask(modelOf("0x12345678"))).rejects.toThrow(
      "Transaction review is unavailable. Reload the page before continuing.",
    );
  });

  it("refuses a confirmed review whose simulation reported a revert, never waits on a pending one", async () => {
    const model = modelOf("0x12345678");
    answer(async (prompt) => {
      await prompt.simulation.catch(() => undefined);
      return prompt.confirmation;
    });
    await expect(
      ask(
        model,
        Promise.resolve({
          status: "failed",
          message: "Pay cannot run: nope",
          explained: true,
        }),
      ),
    ).rejects.toMatchObject({
      message: REVIEWED_SIMULATION_FAILED_LINE,
      cause: expect.stringContaining("Pay cannot run: nope"),
    });
    // A revert whose reason the review could not read never says it shows why.
    await expect(
      ask(
        model,
        Promise.resolve({ status: "failed", message: "Pay cannot run" }),
      ),
    ).rejects.toMatchObject({ message: REVIEWED_SIMULATION_UNEXPLAINED_LINE });
    await expect(
      ask(
        model,
        Promise.resolve({ status: "unavailable", message: "rpc down" }),
      ),
    ).resolves.toBeUndefined();

    unregister.pop()!();
    answer(async (prompt) => prompt.confirmation);
    await expect(
      ask(model, new Promise<ReviewSimulation>(() => {})),
    ).resolves.toBeUndefined();
  });
});

describe("promptReviewForTests", () => {
  const request = {
    title: "Pay",
    calls: [{ chainId: 10, to: TARGET, data: "0x12345678" as Hex }],
  };

  it("prompts the registered handler with core's model and reports its answer", async () => {
    const seen: ReviewPrompt[] = [];
    answer(async (prompt) => {
      seen.push(prompt);
      return prompt.confirmation;
    });
    const { model, outcome } = promptReviewForTests(request);
    expect(model.id).toBe(buildReviewModel(request).id);
    await expect(outcome).resolves.toBe("confirmed");
    expect(seen[0].model.id).toBe(model.id);
    await expect(seen[0].simulation).resolves.toEqual({ status: "passed" });

    answer(async () => null);
    await expect(promptReviewForTests(request).outcome).resolves.toBe(
      "cancelled",
    );
    answer(async () => true as unknown as ReviewConfirmation);
    await expect(promptReviewForTests(request).outcome).rejects.toThrow(
      NOT_CONFIRMED,
    );
  });

  it("passes the simulation a test gives, and withdraws on abort", async () => {
    const seen: ReviewPrompt[] = [];
    answer((prompt) => {
      seen.push(prompt);
      return new Promise(() => {});
    });
    const controller = new AbortController();
    const { outcome } = promptReviewForTests(request, {
      simulation: { status: "failed", message: "reverted" },
      signal: controller.signal,
    });
    await vi.waitFor(() => expect(seen).toHaveLength(1));
    await expect(seen[0].simulation).resolves.toEqual({
      status: "failed",
      message: "reverted",
    });
    controller.abort();
    await expect(outcome).resolves.toBe("cancelled");
  });
});
