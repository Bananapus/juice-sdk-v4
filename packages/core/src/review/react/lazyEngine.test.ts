import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, test } from "vitest";

/** The source files a page that runs `contents` (from this folder) loads up front, and their code. */
async function loadedBy(
  contents: string,
): Promise<string[] & { code: string }> {
  const outdir = mkdtempSync(join(tmpdir(), "lazy-engine-"));
  try {
    const result = await build({
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
    const entry = Object.values(result.metafile.outputs).find(
      (output) => output.entryPoint === "<stdin>",
    )!;
    const code = Object.values(result.outputFiles)
      .filter((file) => file.path.endsWith("stdin.js"))
      .map((file) => file.text)
      .join("");
    return Object.assign(Object.keys(entry.inputs), { code });
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

test("errorLine loads without the lines of the SDK's typed errors", async () => {
  const loaded = await loadedBy(
    'import { errorLine } from "../index.js"; console.log(errorLine);',
  );
  expect(loaded.some((file) => file.endsWith("transaction-message.ts"))).toBe(
    true,
  );
  // Each typed error's line loads with the code that throws it.
  for (const engine of [...ENGINE, "review/relayr.ts", "review/safeRelayr.ts"])
    expect(loaded.filter((file) => file.includes(engine))).toEqual([]);
  expect(loaded.code).not.toContain("already paid");
});
