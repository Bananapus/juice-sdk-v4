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
        "src/generated/**",
        "**/*.d.ts",
        "**/*.config.ts",
        "**/*.test.ts",
      ],
      // Keep the entire published React surface covered, with explicit stricter
      // floors on the money, indexer, and signing boundaries below. Generated
      // output is independently protected by deterministic regeneration.
      thresholds: {
        statements: 100,
        branches: 95,
        functions: 100,
        lines: 100,
        "src/hooks/usePreparePayMetadata.ts": {
          statements: 100,
          branches: 85,
          functions: 100,
          lines: 100,
        },
        "src/hooks/token/useTokenCashOutQuoteEth.ts": {
          statements: 100,
          branches: 85,
          functions: 100,
          lines: 100,
        },
        "src/hooks/jb721Hook/helpers.ts": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        "src/lib/bendystraw/getBendystrawUrl.ts": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        "src/lib/bendystraw/useBendystrawQuery.ts": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        "src/lib/bendystraw/queries/shop.ts": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        "src/lib/relayr/hooks/useGetRelayrTxQuote.ts": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        "src/lib/relayr/hooks/useGetRelayrTxBundle.ts": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        "src/lib/relayr/hooks/useRequestRelayrQuote.ts": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        "src/lib/relayr/hooks/useSignErc2771ForwardRequest.ts": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        "src/lib/relayr/hooks/useSendRelayrTx.ts": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
      },
    },
  },
});
