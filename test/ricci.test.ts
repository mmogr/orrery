/* Ricci flow: the barbell by hand, the communities it parts into, and a
   clique that never moves. */
import test from "node:test";
import assert from "node:assert/strict";
import { ricciFlowStep, ricciFlow, modularity, cutCommunities } from "../src/sky/ricci-flow.ts";
import { ollivierRicci } from "../src/sky/curvature.ts";
import { shortestPaths } from "../src/sky/paths.ts";
import { notesGraph } from "../src/sky/notes-graph.ts";
import type { Graph } from "../src/sky/laplacian.ts";
import { rng } from "../src/rng.ts";

const near = (a: number, b: number, tol = 1e-9) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} !~ ${b} (tol ${tol})`);

const clique = (from: number, size: number, into: [number, number][]) => {
  for (let a = from; a < from + size; a++)
    for (let b = a + 1; b < from + size; b++) into.push([a, b]);
};

/* two 5-cliques over the bridge 4–5; the bridge is the last edge */
function barbell(): Graph {
  const edges: [number, number][] = [];
  clique(0, 5, edges); clique(5, 5, edges);
  edges.push([4, 5]);
  return { n: 10, edges };
}

function randomGraph(n: number, m: number, seed: number): Graph {
  const rnd = rng(seed), edges: [number, number][] = [], seen = new Set<string>();
  while (edges.length < m) {
    const a = Math.floor(rnd() * n), b = Math.floor(rnd() * n);
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (a !== b && !seen.has(key)) { seen.add(key); edges.push([a, b]); }
  }
  return { n, edges };
}

test("shortestPaths: lengths add along a path, Infinity across a gap", () => {
  const g: Graph = { n: 4, edges: [[0, 1], [1, 2]] };
  const d = shortestPaths(g, [1.5, 2]);
  near(d[0 * 4 + 2], 3.5);
  near(d[2 * 4 + 0], 3.5);
  near(d[1 * 4 + 1], 0);
  assert.equal(d[0 * 4 + 3], Infinity);
  /* a longer direct link loses to a shorter detour */
  const tri: Graph = { n: 3, edges: [[0, 1], [1, 2], [0, 2]] };
  near(shortestPaths(tri, [1, 1, 5])[0 * 3 + 2], 2);
});

test("curvature with unit lengths is the unweighted curvature, and scaling every length changes nothing", () => {
  const g = randomGraph(150, 320, 4);
  const plain = ollivierRicci(g);
  const unit = ollivierRicci(g, { lengths: new Float64Array(320).fill(1) });
  const scaled = ollivierRicci(g, { lengths: new Float64Array(320).fill(3) });
  for (let e = 0; e < 320; e++) { near(unit[e], plain[e], 1e-12); near(scaled[e], plain[e], 1e-12); }
});

test("the barbell, one step: the bridge stretches to 1.3 / 0.754762 and every clique edge stays under 1.1", () => {
  const g = barbell();
  const L = new Float64Array(21).fill(1);
  const kappa = ricciFlowStep(g, L, { step: 0.5 });
  near(kappa[20], -3 / 5, 1e-9);
  /* before renormalisation: bridge 1.3, the twelve inner clique edges
     1 − ½·⅝ = 0.6875, the eight touching the bridge 1 − ½·0.425 = 0.7875;
     mean (12·0.6875 + 8·0.7875 + 1.3) / 21 */
  const mean = (12 * 0.6875 + 8 * 0.7875 + 1.3) / 21;
  near(L[20], 1.3 / mean, 1e-9);
  near(L[0], 0.6875 / mean, 1e-9);           /* 0–1: neither end touches the bridge */
  near(L[3], 0.7875 / mean, 1e-9);           /* 0–4: touches it */
  for (let e = 0; e < 20; e++) assert.ok(L[e] < 1.1 && L[e] < L[20], `clique edge ${e}: ${L[e]}`);
  let sum = 0;
  for (const l of L) sum += l;
  near(sum / 21, 1, 1e-12);
});

test("ten steps part the barbell in two, at the cut modularity chooses", () => {
  const g = barbell();
  const { lengths } = ricciFlow(g, 10);
  assert.ok(lengths[20] > 2, `bridge ${lengths[20]}`);
  for (let e = 0; e < 20; e++) assert.ok(lengths[e] < lengths[20]);
  const cut = cutCommunities(g, lengths);
  assert.equal(cut.count, 2);
  for (let i = 0; i < 10; i++) assert.equal(cut.label[i], i < 5 ? 0 : 1);
  /* two communities of ten inner links, degree sum 21 each, m = 21 */
  near(cut.q, 2 * (10 / 21 - 0.25), 1e-12);
  assert.ok(cut.cut < lengths[20] && cut.cut > 1);
  /* a cut given by hand is honoured */
  assert.equal(cutCommunities(g, lengths, 100).count, 1);
  assert.deepEqual(ricciFlow(g, 10), ricciFlow(g, 10));
});

test("modularity: one community is 0, a clique split in two is negative, the barbell's parting is 19/42", () => {
  const k6: Graph = { n: 6, edges: [] };
  clique(0, 6, k6.edges as [number, number][]);
  assert.equal(modularity(k6, new Int32Array(6)), 0);
  assert.ok(modularity(k6, Int32Array.from([0, 0, 0, 1, 1, 1])) < 0);
  near(modularity(barbell(), Int32Array.from([0, 0, 0, 0, 0, 1, 1, 1, 1, 1])), 19 / 42, 1e-12);
  assert.equal(modularity({ n: 3, edges: [] }, new Int32Array(3)), 0);
});

test("a clique is stationary under the flow and stays one community", () => {
  const k7: Graph = { n: 7, edges: [] };
  clique(0, 7, k7.edges as [number, number][]);
  const { lengths } = ricciFlow(k7, 5);
  for (const l of lengths) near(l, 1, 1e-12);
  const cut = cutCommunities(k7, lengths);
  assert.equal(cut.count, 1);
  assert.equal(cut.q, 0);
});

test("the clamp holds a runaway length", () => {
  const g = barbell();
  const { lengths } = ricciFlow(g, 40, { step: 0.9, ceil: 2.5 });
  /* the ceiling binds before renormalisation, so no length exceeds
     ceil times the renormalising factor, and none is below floor */
  assert.ok(Math.max(...lengths) < 2.5 * 1.5);
  assert.ok(Math.min(...lengths) >= 0.1 * 0.5);
});

test("a notes-sized graph flows one step in a few milliseconds", () => {
  const g = randomGraph(150, 320, 8);
  const L = new Float64Array(320).fill(1);
  const t0 = performance.now();
  ricciFlowStep(g, L);
  const ms = performance.now() - t0;
  console.log(`one Ricci flow step, n=150, m=320: ${ms.toFixed(1)} ms`);
  assert.ok(ms < 500, `${ms} ms`);
});

/* ---------------- the notes graph ---------------- */

const node = (id: string, course: string, week: number | null = null) =>
  ({ id, label: id, course, week, tags: [], html: id.replace(/\.qmd$/, ".html") });

test("notesGraph: stars only, weekly notes mediate, landing pages never do", () => {
  const feed = {
    nodes: [node("courses/c1/c1.qmd", "c1"), node("courses/c1/a.qmd", "c1"), node("courses/c1/b.qmd", "c1"),
            node("courses/c1/c.qmd", "c1"), node("courses/c1/2026-01-05-w.qmd", "c1", 1), node("courses/c2/d.qmd", "c2")],
    edges: [["courses/c1/2026-01-05-w.qmd", "courses/c1/a.qmd"], ["courses/c1/b.qmd", "courses/c1/2026-01-05-w.qmd"],
            ["courses/c1/2026-01-05-w.qmd", "courses/c1/c.qmd"], ["courses/c1/c1.qmd", "courses/c1/a.qmd"],
            ["courses/c1/c1.qmd", "courses/c2/d.qmd"], ["courses/c1/a.qmd", "courses/c1/b.qmd"],
            ["courses/c1/a.qmd", "courses/c1/a.qmd"]] as Array<[string, string]>,
  };
  const g = notesGraph(feed);
  assert.deepEqual(g.nodes.map(n => n.id), ["courses/c1/a.qmd", "courses/c1/b.qmd", "courses/c1/c.qmd", "courses/c2/d.qmd"]);
  assert.deepEqual(g.edges, [["courses/c1/a.qmd", "courses/c1/b.qmd"],
                             ["courses/c1/a.qmd", "courses/c1/c.qmd"], ["courses/c1/b.qmd", "courses/c1/c.qmd"]]);
  assert.deepEqual([...g.hosts.entries()],
    [["courses/c1/2026-01-05-w.qmd", ["courses/c1/a.qmd", "courses/c1/b.qmd", "courses/c1/c.qmd"]]]);
});

test("notesGraph: an index note past the fan-out cap mediates nothing", () => {
  const stars = Array.from({ length: 65 }, (_, i) => node(`courses/c/s${i}.qmd`, "c"));
  const feed = { nodes: [...stars, node("courses/c/2026-01-05-w.qmd", "c", 1)],
                 edges: stars.map(s => ["courses/c/2026-01-05-w.qmd", s.id] as [string, string]) };
  assert.equal(notesGraph(feed).edges.length, 0);
  assert.equal(notesGraph(feed, { maxFanout: 65 }).edges.length, 65 * 64 / 2);
});
