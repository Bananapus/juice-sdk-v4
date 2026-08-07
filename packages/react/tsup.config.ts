import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/index.ts"],
  splitting: true,
  sourcemap: true,
  bundle: true,
  clean: true,
  target: "es2021",
  format: "esm",
  // Every export in this package is a React hook or a context provider, so the
  // whole bundle is a client boundary. esbuild drops source directives while
  // bundling, so re-declare it on each emitted chunk: without it a Next App
  // Router consumer cannot mark the boundary and the hooks fail inside an RSC.
  banner: { js: '"use client";' },
});
