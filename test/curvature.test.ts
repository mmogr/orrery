/* Ollivier–Ricci curvature: closed forms on the graphs where the transport
   can be done by hand, and the solver against brute force where it can't. */
import test from "node:test";
import assert from "node:assert/strict";
import { ollivierRicci, transportCost } from "../src/sky/curvature.ts";
import type { Graph } from "../src/sky/laplacian.ts";
import { rng } from "../src/rng.ts";

const near = (a: number, b: number, tol = 1e-9) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} !~ ${b} (tol ${tol})`);

const clique = (from: number, size: number, into: [number, number][]) => {
  for (let a = from; a < from + size; a++)
    for (let b = a + 1; b < from + size; b++) into.push([a, b]);
};

/* ---------------- transport ---------------- */

test("transportCost on a point mass is the distance to where it goes", () => {
  const C = new Float64Array([2]);
  near(transportCost(new Float64Array([1]), new Float64Array([1]), C), 2);
});

test("transportCost matches brute force on 3×3 problems", () => {
  /* every feasible plan for 3×3 is a doubly-stochastic-like table; a fine
     grid over the two free cells of the first two rows brackets the optimum
     well enough to check the solver to 1e-3 */
  const rnd = rng(5);
  for (let trial = 0; trial < 20; trial++) {
    const a = new Float64Array([0.5, 0.3, 0.2]), b = new Float64Array([0.4, 0.4, 0.2]);
    const C = Float64Array.from({ length: 9 }, () => Math.floor(rnd() * 4));
    const got = transportCost(a, b, C);
    /* brute force: enumerate the plan on a 1/200 grid, keep feasible ones */
    let best = Infinity;
    const N = 100;
    for (let p00 = 0; p00 <= N; p00++) for (let p01 = 0; p01 + p00 <= N; p01++)
      for (let p10 = 0; p10 <= N; p10++) for (let p11 = 0; p11 + p10 <= N; p11++) {
        const x00 = a[0] * p00 / N, x01 = a[0] * p01 / N, x02 = a[0] - x00 - x01;
        const x10 = a[1] * p10 / N, x11 = a[1] * p11 / N, x12 = a[1] - x10 - x11;
        const x20 = b[0] - x00 - x10, x21 = b[1] - x01 - x11, x22 = b[2] - x02 - x12;
        if (x20 < -1e-12 || x21 < -1e-12 || x22 < -1e-12) continue;
        const c = x00 * C[0] + x01 * C[1] + x02 * C[2] + x10 * C[3] + x11 * C[4] + x12 * C[5]
                + x20 * C[6] + x21 * C[7] + x22 * C[8];
        if (c < best) best = c;
      }
    assert.ok(got <= best + 1e-9, `solver ${got} worse than a grid plan ${best}`);
    assert.ok(got >= best - 0.03, `solver ${got} beat the grid by too much (${best})`);
  }
});

/* ---------------- curvature ---------------- */

test("K_n at α = ½ has curvature n / (2(n − 1)) on every edge", () => {
  /* only i's excess α − (1−α)/(n−1) has to move, one step, to j */
  for (const n of [3, 4, 5, 7]) {
    const edges: [number, number][] = [];
    clique(0, n, edges);
    const k = ollivierRicci({ n, edges });
    for (const v of k) near(v, n / (2 * (n - 1)), 1e-9);
  }
});

test("a tree edge has curvature 1/d_x + 1/d_y − 1", () => {
  /* leaf–hub: 1/d; interior of a path: 0; two degree-3 nodes: −1/3 */
  const g: Graph = { n: 8, edges: [[0, 1], [1, 2], [1, 3], [3, 4], [3, 5], [5, 6], [5, 7]] };
  const deg = new Float64Array(8);
  for (const [a, b] of g.edges) { deg[a]++; deg[b]++; }
  const k = ollivierRicci(g);
  g.edges.forEach(([a, b], e) => near(k[e], 1 / deg[a] + 1 / deg[b] - 1, 1e-9));
  near(k[2], -1 / 3);                                  /* 1–3: both degree 3 */
});

test("the interior of a path is flat", () => {
  const g: Graph = { n: 9, edges: Array.from({ length: 8 }, (_, i) => [i, i + 1] as const) };
  const k = ollivierRicci(g);
  for (let e = 1; e < 7; e++) near(k[e], 0, 1e-9);
  near(k[0], 0.5); near(k[7], 0.5);                   /* leaf edges: 1 + ½ − 1 */
});

test("two 5-cliques over a bridge: the bridge is −3/5 and the unique minimum", () => {
  /* u's excess 2/5 crosses two steps to v's mates, u's mates' 2/5 crosses
     two steps to v: W₁ = 8/5 */
  const edges: [number, number][] = [];
  clique(0, 5, edges); clique(5, 5, edges);
  edges.push([4, 5]);
  const k = ollivierRicci({ n: 10, edges });
  near(k[k.length - 1], -0.6, 1e-9);
  for (let e = 0; e < k.length - 1; e++) assert.ok(k[e] > 0, `clique edge ${e} not positive: ${k[e]}`);
});

test("curvature is symmetric in the edge's direction and ignores self-loops", () => {
  const edges: [number, number][] = [];
  clique(0, 4, edges); edges.push([3, 4], [4, 5], [5, 6], [6, 4], [2, 2]);
  const a = ollivierRicci({ n: 7, edges });
  const b = ollivierRicci({ n: 7, edges: edges.map(([x, y]) => [y, x] as const) });
  for (let e = 0; e < edges.length; e++) near(a[e], b[e], 1e-9);
  near(a[edges.length - 1], 0);
});

test("laziness is honoured: α = 1 leaves every edge with curvature 0", () => {
  /* all mass stays home, so the walk from i is δ_i and from j is δ_j: cost 1 */
  const edges: [number, number][] = [];
  clique(0, 5, edges);
  for (const v of ollivierRicci({ n: 5, edges }, { alpha: 1 })) near(v, 0, 1e-9);
});

test("a notes-sized graph is curved in a few milliseconds", () => {
  const rnd = rng(3);
  const n = 150, edges: [number, number][] = [];
  for (let i = 1; i < n; i++) edges.push([i, Math.floor(rnd() * i)]);   /* a tree, connected */
  while (edges.length < 320) {
    const a = Math.floor(rnd() * n), b = Math.floor(rnd() * n);
    if (a !== b) edges.push([a, b]);
  }
  const t0 = performance.now();
  const k = ollivierRicci({ n, edges });
  const ms = performance.now() - t0;
  assert.equal(k.length, edges.length);
  for (const v of k) assert.ok(v >= -2 - 1e-9 && v <= 1 + 1e-9, `out of range: ${v}`);
  assert.ok(ms < 500, `took ${ms} ms`);
  console.log(`    ollivierRicci on ${n} nodes, ${edges.length} edges: ${ms.toFixed(1)} ms`);
});
