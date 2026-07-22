import { describe, expect, test } from "vitest";

describe("deterministic network guard", () => {
  test("rejects an unexpected fetch before it can reach the network", async () => {
    await expect(fetch("https://unexpected.invalid/fetch")).rejects.toThrow(
      "Unexpected fetch in a deterministic SDK test",
    );
  });

  test.each(["XMLHttpRequest", "WebSocket", "EventSource"] as const)(
    "blocks %s when the runtime exposes it",
    (name) => {
      const Transport = globalThis[name] as
        | (new (url: string) => unknown)
        | undefined;
      if (!Transport) return;

      expect(
        () => new Transport("https://unexpected.invalid/transport"),
      ).toThrow(`Unexpected ${name} in a deterministic SDK test`);
    },
  );
});
