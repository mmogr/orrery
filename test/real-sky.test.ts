/* The sky as it really is: a notes graph of 191 stars and 1,368 links with
   a hub of 38, taken from a published feed and stripped to its indices
   (fixtures/sky.json). The other tests check the mathematics on graphs
   small enough to do by hand; these check that the numbers a consumer has
   baked do not drift, and that the work stays in proportion as hubs grow —
   the sparse random graphs elsewhere have no hubs, and reported five
   milliseconds while this sky cost eighty.

   `UPDATE_GOLDEN=1 npm test` rewrites the numbers on file. Do that only
   for a change that is meant to move them, and say so in its changeset. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { ollivierRicci } from "../src/sky/curvature.ts";
import { ricciFlow } from "../src/sky/ricci-flow.ts";
import { tally } from "../src/sky/transport.ts";
import type { Graph } from "../src/sky/laplacian.ts";

const at = (name: string): URL => new URL(`./fixtures/${name}`, import.meta.url);
const sky: Graph = JSON.parse(readFileSync(at("sky.json"), "utf8"));
const FLOW_STEPS = 10, FLOW_EPS = 0.5;      /* what the homepage bakes */
const TOL = 1e-9;

const clear = (): void => { tally.problems = 0; tally.routes = 0; tally.rises = 0; };
const worst = (got: ArrayLike<number>, want: ArrayLike<number>): number => {
  let d = 0;
  for (let e = 0; e < want.length; e++) d = Math.max(d, Math.abs(got[e] - want[e]));
  return d;
};

test("the real sky's curvature and flow are the ones on file", () => {
  const kappa = ollivierRicci(sky);
  const { lengths } = ricciFlow(sky, FLOW_STEPS, { step: FLOW_EPS });
  if (process.env.UPDATE_GOLDEN) {
    writeFileSync(at("sky.golden.json"), JSON.stringify({ kappa: Array.from(kappa), lengths: Array.from(lengths) }) + "\n");
    console.log("    sky.golden.json rewritten");
    return;
  }
  const golden: { kappa: number[]; lengths: number[] } = JSON.parse(readFileSync(at("sky.golden.json"), "utf8"));
  assert.equal(kappa.length, golden.kappa.length);
  assert.equal(lengths.length, golden.lengths.length);
  const dk = worst(kappa, golden.kappa), dl = worst(lengths, golden.lengths);
  assert.ok(dk <= TOL, `a curvature moved by ${dk}`);
  assert.ok(dl <= TOL, `a flowed length moved by ${dl}`);
});

test("on the real sky the solver's work stays in proportion", () => {
  const links = sky.edges.length;
  clear();
  const t0 = performance.now();
  ollivierRicci(sky);
  const ms = performance.now() - t0;
  const { problems, routes, rises } = tally;
  console.log(`    ollivierRicci on ${sky.n} stars, ${links} links: ${routes} routes, ${rises} price rises, ${ms.toFixed(1)} ms`);
  /* at most one transport per link: links whose walks coincide solve none */
  assert.ok(problems <= links, `${problems} problems for ${links} links`);
  /* hop costs take three values, so the prices settle in a rise or two
     however large the hub; a search per route is what this replaced */
  assert.ok(rises <= 2 * links, `${rises} price rises: more than two a link`);
  /* the routes follow the surplus each side is left with once shared mass
     is cancelled — 27 a link here; without the cancelling it is far more */
  assert.ok(routes <= 32 * links, `${routes} routes: more than 32 a link`);
});
