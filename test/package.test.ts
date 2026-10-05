/* What gets published, checked as a consumer meets it. Every other test
   imports the TypeScript in src/; nobody installs that. This packs the
   tarball npm would upload, unpacks it where a project would have it, and
   reaches it by name — through package.json's `exports`, into dist/ — so a
   build that emits nothing, an export that points nowhere, or a module
   left out of the bundle fails here rather than after a release. */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as source from "../src/index.ts";

const root = new URL("..", import.meta.url).pathname;
const run = (cmd: string, args: string[], cwd: string): string =>
  execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

test("the packed package is dist and nothing else, and answers as the source does", () => {
  const tmp = mkdtempSync(join(tmpdir(), "orrery-pack-"));
  try {
    /* npm pack runs `prepare`, so this is today's source, built. npm 10
       reports a list of packages; npm 12, which the release runs under,
       an object keyed by name */
    const report = JSON.parse(run("npm", ["pack", "--json", "--pack-destination", tmp], root));
    const packed = Array.isArray(report) ? report[0] : report["@mmogr/orrery"];
    assert.ok(packed && Array.isArray(packed.files), "npm pack reported no package");
    const files: string[] = packed.files.map((f: { path: string }) => f.path);
    for (const f of files)
      assert.ok(f.startsWith("dist/") || ["package.json", "README.md", "LICENSE"].includes(f), `${f} would be published`);
    assert.ok(files.includes("dist/index.js") && files.includes("dist/index.d.ts"));
    assert.ok(!files.some(f => f.endsWith(".ts") && !f.endsWith(".d.ts")), "a TypeScript source would be published");

    const home = join(tmp, "node_modules", "@mmogr", "orrery");
    mkdirSync(home, { recursive: true });
    run("tar", ["-xzf", join(tmp, packed.filename), "-C", home, "--strip-components=1"], tmp);

    /* by name, as a page's bundler or a script would */
    writeFileSync(join(tmp, "consumer.mjs"), `
      import * as orrery from "@mmogr/orrery";
      const k5 = []; for (let a = 0; a < 5; a++) for (let b = a + 1; b < 5; b++) k5.push([a, b]);
      const g = { n: 6, edges: [...k5, [4, 5]] };
      const rnd = orrery.rng(7);
      console.log(JSON.stringify({
        names: Object.keys(orrery).sort(),
        kappa: Array.from(orrery.ollivierRicci(g)),
        lengths: Array.from(orrery.ricciFlow(g, 3).lengths),
        draws: [rnd(), rnd(), rnd()],
      }));`);
    const got = JSON.parse(run(process.execPath, ["consumer.mjs"], tmp));

    assert.deepEqual(got.names, Object.keys(source).sort(), "the package exports what src/index.ts does");
    const k5: [number, number][] = [];
    for (let a = 0; a < 5; a++) for (let b = a + 1; b < 5; b++) k5.push([a, b]);
    const g = { n: 6, edges: [...k5, [4, 5] as [number, number]] };
    const rnd = source.rng(7);
    assert.deepEqual(got.kappa, Array.from(source.ollivierRicci(g)));
    assert.deepEqual(got.lengths, Array.from(source.ricciFlow(g, 3).lengths));
    assert.deepEqual(got.draws, [rnd(), rnd(), rnd()]);

    /* and its types resolve for a consumer that type-checks */
    writeFileSync(join(tmp, "consumer.ts"), `
      import { ollivierRicci, type Graph, type FlowFeed } from "@mmogr/orrery";
      const g: Graph = { n: 2, edges: [[0, 1]] };
      const k: Float64Array = ollivierRicci(g);
      export const flow: FlowFeed | null = null;
      export default k;`);
    writeFileSync(join(tmp, "tsconfig.json"), JSON.stringify({
      compilerOptions: { target: "es2022", module: "esnext", moduleResolution: "bundler", strict: true, noEmit: true, skipLibCheck: false },
      files: ["consumer.ts"] }));
    run(process.execPath, [join(root, "node_modules", "typescript", "bin", "tsc"), "-p", "tsconfig.json"], tmp);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
