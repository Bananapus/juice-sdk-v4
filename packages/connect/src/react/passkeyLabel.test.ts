import { describe, expect, test } from "vitest";
import { passkeyLabel } from "./passkeyLabel";

describe("passkeyLabel", () => {
  test("names the platform prompt", () => {
    expect(
      passkeyLabel("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) Safari"),
    ).toBe("Continue with Touch ID");
    expect(passkeyLabel("Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X)")).toBe(
      "Continue with Touch ID",
    );
    expect(
      passkeyLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)"),
    ).toBe("Continue with Face ID");
    expect(passkeyLabel("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe(
      "Continue with Windows Hello",
    );
    expect(passkeyLabel("Mozilla/5.0 (Linux; Android 14) Chrome")).toBe(
      "Continue with a passkey",
    );
    expect(passkeyLabel("")).toBe("Continue with a passkey");
  });
});
