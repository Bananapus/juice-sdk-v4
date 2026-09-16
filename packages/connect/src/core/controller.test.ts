import { describe, expect, test, vi } from "vitest";
import { createConnectController, type ConnectOption } from "./controller";

function option(id: string, connect: ConnectOption["connect"]): ConnectOption {
  return { id, name: id, connect };
}

describe("createConnectController", () => {
  test("runs one option at a time, publishes its handoff, and clears on success", async () => {
    let release!: () => void;
    const slow = option("wc", async ({ handoff }) => {
      handoff("wc:uri");
      await new Promise<void>((resolve) => (release = resolve));
    });
    const other = option(
      "other",
      vi.fn(async () => {}),
    );
    const controller = createConnectController([slow, other]);
    const seen: string[] = [];
    controller.subscribe(() =>
      seen.push(JSON.stringify(controller.getState())),
    );
    const first = controller.choose("wc");
    expect(controller.getState()).toEqual({
      pending: "wc",
      error: null,
      handoffUri: "wc:uri",
    });
    await controller.choose("other");
    expect(other.connect).not.toHaveBeenCalled();
    release();
    await first;
    // A finished option keeps its pending state: a passkey launch leaves the page and the
    // app decides when the dialog goes away.
    expect(controller.getState()).toEqual({
      pending: "wc",
      error: null,
      handoffUri: "wc:uri",
    });
    expect(seen).toHaveLength(2);
  });
  test("a failed option reports its message and frees the controller; an unknown or disabled option is ignored", async () => {
    const controller = createConnectController([
      option("bad", async () => {
        throw new Error("Wallet closed.");
      }),
      option("worse", async () => {
        throw "nope";
      }),
      {
        ...option(
          "off",
          vi.fn(async () => {}),
        ),
        disabled: true,
      },
    ]);
    await controller.choose("bad");
    expect(controller.getState()).toEqual({
      pending: null,
      error: "Wallet closed.",
      handoffUri: null,
    });
    await controller.choose("worse");
    expect(controller.getState().error).toBe(
      "The connection did not complete.",
    );
    const quiet = createConnectController([
      option("rejected", async () => {
        throw Object.assign(
          new Error("User rejected the request.\n\nDetails: long"),
          { code: 4001 },
        );
      }),
      option("aborted", async () => {
        throw Object.assign(new Error("aborted"), { name: "AbortError" });
      }),
      option("viem", async () => {
        throw Object.assign(new Error("Long viem message\nVersion: viem@2"), {
          shortMessage: "Connector not found.",
        });
      }),
    ]);
    await quiet.choose("rejected");
    expect(quiet.getState()).toEqual({
      pending: null,
      error: null,
      handoffUri: null,
    });
    await quiet.choose("aborted");
    expect(quiet.getState().error).toBeNull();
    await quiet.choose("viem");
    expect(quiet.getState().error).toBe("Connector not found.");
    await controller.choose("missing");
    await controller.choose("off");
    expect(controller.options[2]!.connect).not.toHaveBeenCalled();
  });
  test("cancel aborts the signal, resets the state, and ignores late results from the aborted option", async () => {
    let seenSignal!: AbortSignal;
    let fail!: (error: Error) => void;
    let late!: (uri: string) => void;
    const controller = createConnectController([
      option("wc", ({ signal, handoff }) => {
        seenSignal = signal;
        late = handoff;
        return new Promise((_, reject) => (fail = reject));
      }),
      option("ok", async () => {}),
    ]);
    const run = controller.choose("wc");
    controller.cancel();
    expect(seenSignal.aborted).toBe(true);
    expect(controller.getState()).toEqual({
      pending: null,
      error: null,
      handoffUri: null,
    });
    late("stale:uri");
    fail(new Error("aborted"));
    await run;
    expect(controller.getState()).toEqual({
      pending: null,
      error: null,
      handoffUri: null,
    });
    await controller.choose("ok");
    expect(controller.getState().pending).toBe("ok");
    const unsubscribe = controller.subscribe(() => {
      throw new Error("should not run");
    });
    unsubscribe();
    controller.cancel();
  });
});
