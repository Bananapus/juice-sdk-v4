import { afterEach, beforeEach, vi } from "vitest";

function networkTarget(input: unknown) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  if (typeof Request !== "undefined" && input instanceof Request)
    return input.url;
  return String(input);
}

function unexpectedFetch(input: string | URL | Request): Promise<never> {
  return Promise.reject(
    new Error(
      `Unexpected fetch in a deterministic SDK test: ${networkTarget(input)}`,
    ),
  );
}

function blockedTransport(name: string) {
  return class {
    constructor(input?: unknown) {
      throw new Error(
        `Unexpected ${name} in a deterministic SDK test: ${networkTarget(input)}`,
      );
    }
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(unexpectedFetch));
  for (const name of ["XMLHttpRequest", "WebSocket", "EventSource"] as const) {
    if (typeof globalThis[name] !== "undefined") {
      vi.stubGlobal(name, blockedTransport(name));
    }
  }
});

afterEach(() => {
  vi.unstubAllGlobals();
});
