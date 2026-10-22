import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, test } from "vitest";

/** The source files a page that runs `contents` (from this folder) loads up front. */
async function loadedBy(contents: string): Promise<string[]> {
  const outdir = mkdtempSync(join(tmpdir(), "lazy-engine-"));
  try {
    const { metafile } = await build({
      stdin: {
        contents,
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
    return Object.keys(entry.inputs);
  } finally {
    rmSync(outdir, { recursive: true, force: true });
  }
}

const ENGINE = ["review/send.ts", "review/model.ts", "generated/abi/"];

test("a site's own refusal and a mined revert are told apart without the engine", async () => {
  const loaded = await loadedBy(
    'import { ReviewLineError, ReviewedCallRevertedError } from "../index.js"; console.log(ReviewLineError, ReviewedCallRevertedError);',
  );
  expect(loaded.some((file) => file.endsWith("lineError.ts"))).toBe(true);
  for (const engine of ENGINE)
    expect(loaded.filter((file) => file.includes(engine))).toEqual([]);
});

test("the reviewed-send hook leaves the send engine to the app's loader", async () => {
  const loaded = await loadedBy(
    'import { useReviewedRun } from "./index.js"; console.log(useReviewedRun);',
  );
  // The hook's own modules load with the page...
  expect(loaded.some((file) => file.endsWith("useReviewedRun.ts"))).toBe(true);
  // ...the engine, its review model and the decoder's ABIs only through `engine`.
  for (const engine of ENGINE)
    expect(loaded.filter((file) => file.includes(engine))).toEqual([]);
});
