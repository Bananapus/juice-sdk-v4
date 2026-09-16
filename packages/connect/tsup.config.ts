import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "core/index": "./src/core/index.ts",
    "wagmi/index": "./src/wagmi/index.ts",
    "react/index": "./src/react/index.ts",
  },
  splitting: true,
  sourcemap: true,
  bundle: true,
  clean: true,
  target: "es2021",
  format: "esm",
  // Same reasoning as packages/react: the modal and the connector are browser-only
  // client boundaries, and esbuild drops the directive while bundling.
  banner: { js: '"use client";' },
});
