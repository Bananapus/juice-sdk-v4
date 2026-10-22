import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, test } from "vitest";

test("a page that mounts the reviewed-send hook loads the send engine apart", async () => {
  const outdir = mkdtempSync(join(tmpdir(), "lazy-engine-"));
  try {
    const { metafile } = await build({
      stdin: {
        contents:
          'import { useReviewedRun } from "./index.js"; console.log(useReviewedRun);',
        resolveDir: resolve(import.meta.dirname),
        loader: "ts",
      },
      bundle: true,
      splitting: true,
      format: "esm",
      outdir,
      write: false,
      metafile: true,
      external: ["viem", "viem/*", "react", "react-dom"],
      logLevel: "silent",
    });
    const entry = Object.values(metafile.outputs).find(
      (output) => output.entryPoint === "<stdin>",
    )!;
    const loaded = Object.keys(entry.inputs);
    // The hook's own modules load with the page...
    expect(loaded.some((file) => file.endsWith("useReviewedRun.ts"))).toBe(
      true,
    );
    // ...the engine, its review model and the decoder's ABIs only once fetched.
    for (const engine of [
      "review/send.ts",
      "review/model.ts",
      "generated/abi/",
    ])
      expect(loaded.filter((file) => file.includes(engine))).toEqual([]);
  } finally {
    rmSync(outdir, { recursive: true, force: true });
  }
});
