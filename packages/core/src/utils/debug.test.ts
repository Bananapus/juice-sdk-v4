import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { debug } from "./debug.js";

const debugEnvVars = [
  "JUICE_SDK_DEBUG",
  "REACT_APP_JUICE_SDK_DEBUG",
  "NEXT_PUBLIC_JUICE_SDK_DEBUG",
] as const;

describe("debug", () => {
  beforeEach(() => {
    for (const key of debugEnvVars) delete process.env[key];
  });

  afterEach(() => {
    for (const key of debugEnvVars) delete process.env[key];
    vi.restoreAllMocks();
  });

  test("is silent by default", () => {
    const consoleDebug = vi
      .spyOn(console, "debug")
      .mockImplementation(() => undefined);

    debug("private state");

    expect(consoleDebug).not.toHaveBeenCalled();
  });

  test.each(debugEnvVars)("honors the %s opt-in", (key) => {
    const consoleDebug = vi
      .spyOn(console, "debug")
      .mockImplementation(() => undefined);
    process.env[key] = "true";

    debug("project", 7n);

    expect(consoleDebug).toHaveBeenCalledWith("🧃", "project", 7n);
  });

  test("does not accept truthy values other than the literal true string", () => {
    const consoleDebug = vi
      .spyOn(console, "debug")
      .mockImplementation(() => undefined);
    process.env.JUICE_SDK_DEBUG = "1";

    debug("private state");

    expect(consoleDebug).not.toHaveBeenCalled();
  });
});
