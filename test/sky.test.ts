/* The sky's physics, held to its promises. */
import test from "node:test";
import assert from "node:assert/strict";
import { normalisedLaplacian, components, apply } from "../src/sky/laplacian.ts";
import type { Graph } from "../src/sky/laplacian.ts";
import { spectralEmbedding, scaleToBox } from "../src/sky/spectral.ts";
import { stepLayout, impulse, DEFAULT_FORCES } from "../src/sky/springs.ts";
import type { Body, Forces, LayoutEnv } from "../src/sky/springs.ts";
import type { Embedding } from "../src/sky/spectral.ts";
import { diffuse } from "../src/sky/heat.ts";
import { jacobiEigen } from "../src/math/linalg.ts";

const near = (a: number, b: number, tol = 1e-9) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} !~ ${b} (tol ${tol})`);

const dense = (g: Graph): { A: Float64Array; n: number } => {
  const L = normalisedLaplacian(g);
  const A = new Float64Array(g.n * g.n);
  for (let i = 0; i < g.n; i++)
    for (let p = L.rowPtr[i]; p < L.rowPtr[i + 1]; p++)
      A[i * g.n + L.col[p]] = L.val[p];
  return { A, n: g.n };
};

/* ---------------- laplacian ---------------- */

test("P4's L_sym has the closed-form path spectrum", () => {
  /* the path P_n has normalised-Laplacian eigenvalues 1 − cos(πk/(n−1));
     for P4 that is 0, 1/2, 3/2, 2 */
  const { A, n } = dense({ n: 4, edges: [[0, 1], [1, 2], [2, 3]] });
  const { values } = jacobiEigen(A, n);
  near(values[0], 0, 1e-10);
  near(values[1], 0.5, 1e-10);
  near(values[2], 1.5, 1e-10);
  near(values[3], 2, 1e-10);
  /* and the kernel is D^{1/2}·1: L (√deg) = 0 */
  const L = normalisedLaplacian({ n: 4, edges: [[0, 1], [1, 2], [2, 3]] });
  const v = Float64Array.from(L.deg, Math.sqrt);
  const out = new Float64Array(4);
  apply(L, v, out);
  for (let i = 0; i < 4; i++) near(out[i], 0, 1e-12);
});

test("components: two disjoint triangles are two components", () => {
  const g: Graph = { n: 6, edges: [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3]] };
  const id = components(g);
  assert.deepEqual([...id], [0, 0, 0, 1, 1, 1]);
});

test("components: isolated nodes stand alone, numbered by first touch", () => {
  const g: Graph = { n: 5, edges: [[1, 3]] };
  assert.deepEqual([...components(g)], [0, 1, 2, 1, 3]);
});

test("apply matches a hand-computed product on a triangle", () => {
  /* triangle: deg = 2 everywhere, L = I − A/2 */
  const L = normalisedLaplacian({ n: 3, edges: [[0, 1], [1, 2], [2, 0]] });
  const x = new Float64Array([1, 2, 3]);
  const out = new Float64Array(3);
  apply(L, x, out);
  /* row i: x_i − (x_j + x_k)/2 */
  near(out[0], 1 - (2 + 3) / 2);
  near(out[1], 2 - (1 + 3) / 2);
  near(out[2], 3 - (1 + 2) / 2);
});

/* ---------------- spectral ---------------- */

test("P10: the Fiedler coordinate is strictly monotone along the path", () => {
  const g: Graph = { n: 10, edges: Array.from({ length: 9 }, (_, i) => [i, i + 1] as const) };
  const e = spectralEmbedding(g);
  const sgn = Math.sign(e.x[1] - e.x[0]);
  assert.notEqual(sgn, 0);
  for (let i = 1; i < 10; i++)
    assert.ok((e.x[i] - e.x[i - 1]) * sgn > 0,
      `x not monotone at ${i}: ${e.x[i - 1]} → ${e.x[i]}`);
});

test("two 6-cliques over a bridge separate in sign on x", () => {
  const edges: [number, number][] = [];
  for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) edges.push([a, b]);
  for (let a = 6; a < 12; a++) for (let b = a + 1; b < 12; b++) edges.push([a, b]);
  edges.push([5, 6]);
  const e = spectralEmbedding({ n: 12, edges });
  const s = Math.sign(e.x[0]);
  assert.notEqual(s, 0);
  for (let i = 0; i < 6; i++) assert.ok(e.x[i] * s > 0, `clique A node ${i} crossed`);
  for (let i = 6; i < 12; i++) assert.ok(e.x[i] * s < 0, `clique B node ${i} crossed`);
});

test("spectralEmbedding is deterministic", () => {
  const g: Graph = {
    n: 9,
    edges: [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 6], [6, 3]],  /* + isolated 7, 8 */
  };
  const a = spectralEmbedding(g, 42);
  const b = spectralEmbedding(g, 42);
  assert.deepEqual([...a.x], [...b.x]);
  assert.deepEqual([...a.y], [...b.y]);
  /* embedding contract: each axis centred with unit RMS */
  for (const v of [a.x, a.y]) {
    let m = 0, s = 0;
    for (const t of v) { m += t; s += t * t; }
    near(m / v.length, 0, 1e-9);
    near(Math.sqrt(s / v.length), 1, 1e-9);
  }
});

test("scaleToBox respects the box and preserves aspect", () => {
  const g: Graph = { n: 8, edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]] };
  const e = spectralEmbedding(g);
  const s = scaleToBox(e, 300, 120);
  let mx = 0, my = 0;
  for (let i = 0; i < 8; i++) {
    mx = Math.max(mx, Math.abs(s.x[i]));
    my = Math.max(my, Math.abs(s.y[i]));
  }
  assert.ok(mx <= 150 + 1e-9 && my <= 60 + 1e-9, `escaped the box: ${mx}, ${my}`);
  /* one factor for both axes */
  const kx = s.x[0] / e.x[0], ky = s.y[0] / e.y[0];
  near(kx, ky, 1e-12);
  assert.ok(mx >= 150 - 1e-9 || my >= 60 - 1e-9, "should touch the tighter wall");
});

test("depth: x and y are what they were before the third mode arrived", () => {
  /* pinned from the two-vector embedding; the third mode is found after
     the first two, deflated against them, so it cannot touch them */
  const p10: Graph = { n: 10, edges: Array.from({ length: 9 }, (_, i) => [i, i + 1] as const) };
  const e = spectralEmbedding(p10);
  const px = [1.348399726557, 1.26708127259, 1.032934116517, 0.674199861376, 0.234147153116,
              -0.234147156884, -0.67419986355, -1.03293411625, -1.267081270176, -1.348399723296];
  const py = [1.224744877476, 0.906371686492, 0.10022247007, -0.816496589755, -1.414842454419,
              -1.414842445871, -0.816496572101, 0.100222480784, 0.906371682016, 1.224744865308];
  for (let i = 0; i < 10; i++) { near(e.x[i], px[i], 1e-7); near(e.y[i], py[i], 1e-7); }
});

test("asking for depth leaves x and y as 0.1.1 drew them, degenerate components included", () => {
  /* a 4-cycle, a path, K4, a lone star, a triangle and a 4×3 grid: cycles
     and cliques have repeated eigenvalues, where the start vector picks
     the eigenvector — so depth draws its starts from its own stream, and
     these are the coordinates the two-vector release produced */
  const edges: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 8],
    [9, 10], [9, 11], [9, 12], [10, 11], [10, 12], [11, 12], [14, 15], [15, 16], [16, 14]];
  const at = (x: number, y: number) => 17 + x + 4 * y;
  for (let x = 0; x < 4; x++) for (let y = 0; y < 3; y++) {
    if (x < 3) edges.push([at(x, y), at(x + 1, y)]);
    if (y < 2) edges.push([at(x, y), at(x, y + 1)]);
  }
  const e = spectralEmbedding({ n: 29, edges });
  const px = [-1.1421539014, -1.1917159552, -0.7507985506, -0.7012364895, 0.9172732788, 0.8333876681,
    0.6308698908, 0.4283521158, 0.3444665074, 1.7083100808, 1.5644329343, 1.2640847999, 1.1580331215,
    2.1963737198, -1.4135630675, -1.7551279186, -1.9503683305, -0.4565820625, -0.3038433544,
    -0.0529266242, 0.0998120829, -0.4793893809, -0.3141287587, -0.0426412253, 0.122619397,
    -0.4565820669, -0.3038433598, -0.0529266295, 0.0998120785];
  const py = [1.1317686123, -0.9030422969, -1.1317685928, 0.9030422774, 1.0573893564, -0.2643473382,
    -1.5860840617, -0.264347349, 1.0573893925, 0.1537494431, -0.6229424168, 1.5894034685,
    -1.1202104948, 0, -0.5202066445, 1.4302861891, -0.9100795446, -1.1267635759, -1.3692998979,
    -1.3692998824, -1.1267635435, -2.36e-8, 4.5e-9, 1.6e-8, 2e-9, 1.126763536, 1.3692999039,
    1.3692999098, 1.126763551];
  for (let i = 0; i < 29; i++) { near(e.x[i], px[i], 1e-7); near(e.y[i], py[i], 1e-7); }
  /* and the components big enough for a third mode have one */
  let nonzero = 0;
  for (let i = 0; i < 29; i++) if (Math.abs(e.z[i]) > 1e-9) nonzero++;
  assert.ok(nonzero >= 20, `only ${nonzero} nodes have depth`);
  for (let i = 14; i < 17; i++) near(e.z[i], 0, 1e-12);       /* the triangle sits on the plane */
});

test("depth on P8 is the third cosine mode: three sign changes, unit RMS", () => {
  const g: Graph = { n: 8, edges: Array.from({ length: 7 }, (_, i) => [i, i + 1] as const) };
  const e = spectralEmbedding(g);
  let changes = 0;
  for (let i = 1; i < 8; i++) if (Math.sign(e.z[i]) !== Math.sign(e.z[i - 1])) changes++;
  assert.equal(changes, 3);
  /* antisymmetric about the middle, like cos(3π(i+½)/8) */
  for (let i = 0; i < 4; i++) near(e.z[i], -e.z[7 - i], 1e-6);
  let s = 0;
  for (const v of e.z) s += v * v;
  near(Math.sqrt(s / 8), 1, 1e-9);
});

test("a 3×3×3 grid yields three modes, mutually orthogonal in the degree-weighted norm", () => {
  const at = (x: number, y: number, z: number) => x + 3 * y + 9 * z;
  const edges: [number, number][] = [];
  for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) for (let z = 0; z < 3; z++) {
    if (x < 2) edges.push([at(x, y, z), at(x + 1, y, z)]);
    if (y < 2) edges.push([at(x, y, z), at(x, y + 1, z)]);
    if (z < 2) edges.push([at(x, y, z), at(x, y, z + 1)]);
  }
  const g: Graph = { n: 27, edges };
  const e = spectralEmbedding(g);
  const deg = new Float64Array(27);
  for (const [a, b] of edges) { deg[a]++; deg[b]++; }
  /* u = D^{-1/2} v with v ⟂ in the plain norm, so u's are D-orthogonal;
     the whole-sky centring cannot disturb that on a single component,
     and D^{1/2}·1 ⟂ v means Σ d_i u_i = 0 */
  const dot = (a: Float64Array, b: Float64Array) => {
    let s = 0;
    for (let i = 0; i < 27; i++) s += deg[i] * a[i] * b[i];
    return s / 27;
  };
  const wsum = (a: Float64Array) => { let s = 0; for (let i = 0; i < 27; i++) s += deg[i] * a[i]; return s; };
  near(dot(e.x, e.y), 0, 1e-6); near(dot(e.x, e.z), 0, 1e-6); near(dot(e.y, e.z), 0, 1e-6);
  near(wsum(e.x), 0, 1e-6); near(wsum(e.y), 0, 1e-6); near(wsum(e.z), 0, 1e-6);
  for (const v of [e.x, e.y, e.z]) {
    let s = 0;
    for (const t of v) s += t * t;
    near(Math.sqrt(s / 27), 1, 1e-9);
  }
});

test("depth is zero where a component cannot have a third mode", () => {
  /* a triangle (three notes: two modes at most), an edge, and two lone stars */
  const g: Graph = { n: 7, edges: [[0, 1], [1, 2], [2, 0], [3, 4]] };
  const e = spectralEmbedding(g);
  for (let i = 0; i < 7; i++) near(e.z[i], 0, 1e-12);
  const s = scaleToBox(e, 100, 100);
  for (let i = 0; i < 7; i++) near(s.z[i], 0, 1e-12);
});

/* ---------------- springs ---------------- */

const quietForces = (over: Partial<Forces> = {}): Forces => ({
  ...DEFAULT_FORCES,
  repulsion: 0, restPull: 0, windowGravity: 0,
  ellipse: [0, 0], clearing: 0, floor: 0,
  ...over,
});

const wideEnv = (K = 10): LayoutEnv => ({
  K,
  window: { x: 0, y: 0, hw: 1e6, hh: 1e6 },
  clearing: 0,
  floorY: 1e6,
});

const body = (x: number, y: number): Body =>
  ({ x, y, px: x, py: y, deg: 1, temper: 0.5, c1: 1, s1: 0 });

const restOf = (bs: Body[]): Embedding => ({
  x: Float64Array.from(bs, b => b.x),
  y: Float64Array.from(bs, b => b.y),
  z: new Float64Array(bs.length),
});

test("a 2-body spring contracts toward its rest length", () => {
  const K = 10;                       /* rest length 0.8K = 8 */
  const bodies = [body(-10, 0), body(10, 0)];
  const rest = restOf(bodies);
  const edges = [[0, 1]] as const;
  const f = quietForces({ spring: 0.01 });
  const gap = () => Math.abs(bodies[1].x - bodies[0].x);
  const d0 = gap();
  for (let i = 0; i < 400; i++) stepLayout(bodies, edges, rest, wideEnv(K), 1, f);
  assert.ok(gap() < d0, "spring should contract a stretched pair");
  near(gap(), 8, 0.1);
});

test("damping bleeds energy: free displacement shrinks step over step", () => {
  const bodies = [body(0, 0)];
  impulse(bodies, () => [2, 0]);      /* a flick, then no forces at all */
  const rest = restOf(bodies);
  const f = quietForces({ spring: 0 });
  let last = Infinity;
  for (let i = 0; i < 10; i++) {
    const before = bodies[0].x;
    stepLayout(bodies, [], rest, wideEnv(), 1, f);
    const step = Math.abs(bodies[0].x - before);
    assert.ok(step < last, `displacement grew: ${step} >= ${last}`);
    assert.ok(step > 0, "still coasting");
    last = step;
  }
  near(last, 2 * Math.pow(DEFAULT_FORCES.damping, 10), 1e-9);
});

test("impulse changes the implicit velocity", () => {
  const bodies = [body(3, 4)];
  impulse(bodies, () => [1.5, -0.5]);
  near(bodies[0].x - bodies[0].px, 1.5);
  near(bodies[0].y - bodies[0].py, -0.5);
  /* and one damping-free, force-free step realises exactly that velocity */
  const f = quietForces({ spring: 0, damping: 1 });
  stepLayout(bodies, [], restOf(bodies), wideEnv(), 1, f);
  near(bodies[0].x, 4.5, 1e-12);
  near(bodies[0].y, 3.5, 1e-12);
});

test("outsideMean is 0 with every body inside the window, positive outside", () => {
  const env: LayoutEnv = { K: 10, window: { x: 0, y: 0, hw: 50, hh: 50 }, clearing: 0, floorY: 1e6 };
  const inside = [body(10, -20), body(-30, 40)];
  const r1 = stepLayout(inside, [], restOf(inside), env, 1, quietForces());
  assert.equal(r1.outsideMean, 0);
  const straying = [body(0, 0), body(110, 0)];   /* one body 60 past the wall */
  const r2 = stepLayout(straying, [], restOf(straying), env, 1, quietForces());
  near(r2.outsideMean, 30, 1e-9);
});

test("restPull draws a displaced body home", () => {
  const bodies = [body(20, -10)];
  const rest: Embedding = { x: new Float64Array([0]), y: new Float64Array([0]), z: new Float64Array([0]) };
  const f = quietForces({ spring: 0, restPull: DEFAULT_FORCES.restPull });
  for (let i = 0; i < 2000; i++) stepLayout(bodies, [], rest, wideEnv(), 1, f);
  assert.ok(Math.hypot(bodies[0].x, bodies[0].y) < 1, "restPull should bring it home");
});

/* ---------------- heat ---------------- */

test("diffuse conserves the sum on a regular graph when decay = 1", () => {
  /* the triangle is 2-regular, so L_sym rows sum to zero and explicit
     Euler moves heat around without making or losing any */
  const L = normalisedLaplacian({ n: 3, edges: [[0, 1], [1, 2], [2, 0]] });
  const u = new Float64Array([1, 0.25, 0]);
  const total = 1.25;
  diffuse(u, L, 0.4, 25, 1);
  near(u[0] + u[1] + u[2], total, 1e-9);
  /* and it flows toward uniform */
  for (const v of u) near(v, total / 3, 1e-3);
});

test("diffuse keeps a delta start non-negative", () => {
  const L = normalisedLaplacian({ n: 5, edges: [[0, 1], [1, 2], [2, 3], [3, 4]] });
  const u = new Float64Array([1, 0, 0, 0, 0]);
  diffuse(u, L, 0.45, 40, 1);
  for (let i = 0; i < 5; i++) assert.ok(u[i] >= 0, `went negative at ${i}: ${u[i]}`);
  assert.ok(u[4] > 0, "heat should reach the far end");
});

test("decay < 1 cools the field", () => {
  const L = normalisedLaplacian({ n: 3, edges: [[0, 1], [1, 2], [2, 0]] });
  const u = new Float64Array([1, 1, 1]);
  diffuse(u, L, 0.4, 10, 0.9);
  const sum = u[0] + u[1] + u[2];
  /* uniform heat on a regular graph is in the kernel: only decay acts */
  near(sum, 3 * Math.pow(0.9, 10), 1e-9);
});

test("dt past the stability bound throws RangeError", () => {
  const L = normalisedLaplacian({ n: 2, edges: [[0, 1]] });
  const u = new Float64Array([1, 0]);
  assert.throws(() => diffuse(u, L, 0.5, 1, 1), RangeError);
  assert.throws(() => diffuse(u, L, Number.NaN, 1, 1), RangeError);
});

test("a per-link length multiplies the rest length", () => {
  const K = 40;
  const env = { K, window: { x: 0, y: 0, hw: 1e6, hh: 1e6 }, clearing: 0, floorY: 1e6, lengths: [2] };
  const only = { repulsion: 0, spring: 0.01, restPull: 0, windowGravity: 0, ellipse: [0, 0] as [number, number],
                 clearing: 0, floor: 0, damping: 0.82, vcap: [2.5, 4] as [number, number] };
  const mk = (x: number) => ({ x, y: 0, px: x, py: 0, deg: 1, temper: 0, c1: 1, s1: 0 });
  const bodies = [mk(-60), mk(60)];
  const rest = { x: new Float64Array(2), y: new Float64Array(2), z: new Float64Array(2) };
  for (let i = 0; i < 3000; i++) stepLayout(bodies, [[0, 1]], rest, env, 1, only);
  assert.ok(Math.abs(Math.abs(bodies[1].x - bodies[0].x) - 1.6 * K) < 0.05,
    `settled at ${bodies[1].x - bodies[0].x}, wanted ${1.6 * K}`);
  const plain = [mk(-60), mk(60)];
  for (let i = 0; i < 3000; i++) stepLayout(plain, [[0, 1]], rest, { ...env, lengths: undefined }, 1, only);
  assert.ok(Math.abs(Math.abs(plain[1].x - plain[0].x) - 0.8 * K) < 0.05);
});
