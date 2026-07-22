import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["../../test/setup-network.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "dist/**",
        "scripts/**",
        "src/generated/**",
        "**/*.d.ts",
        "**/*.config.ts",
        "**/*.test.ts",
      ],
      thresholds: {
        statements: 95,
        branches: 82,
        functions: 92,
        lines: 95,
        "src/actions/dataHook.ts": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        "src/actions/projectMetadata.ts": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        "src/actions/suckerPairs.ts": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        "src/utils/token.ts": {
          statements: 94,
          branches: 90,
          functions: 75,
          lines: 94,
        },
      },
    },
  },
});
