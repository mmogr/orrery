/* The lightness promise, kept mechanically: the whole package, bundled and
   minified, stays under 40 KB. A physics library for web pages that grows
   past that has stopped being one. */
import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";

test("the whole orrery minifies to under 40 KB", async () => {
  const out = await build({
    entryPoints: [new URL("../src/index.ts", import.meta.url).pathname],
    bundle: true, write: false, minify: true, format: "esm", target: "es2022",
  });
  const bytes = out.outputFiles[0].contents.byteLength;
  assert.ok(bytes < 40 * 1024, `bundled orrery is ${bytes} bytes`);
});
