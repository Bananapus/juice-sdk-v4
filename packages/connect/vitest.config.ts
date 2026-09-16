import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["../../test/setup-network.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["dist/**", "**/*.d.ts", "**/*.config.ts", "**/*.test.{ts,tsx}"],
      thresholds: { statements: 100, branches: 95, functions: 100, lines: 100 },
    },
  },
});
