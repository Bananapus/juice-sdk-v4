import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/index.ts"],
  splitting: true,
  sourcemap: true,
  bundle: true,
  clean: true,
  target: "es2021",
  format: "esm",
});
