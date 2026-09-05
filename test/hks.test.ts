/* The heat kernel signature, held to its identities. */
import test from "node:test";
import assert from "node:assert/strict";
import { heatKernelSignature, magnitudes, HKS_SCALES } from "../src/sky/hks.ts";
import { normalisedLaplacian } from "../src/sky/laplacian.ts";
import type { Graph } from "../src/sky/laplacian.ts";
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

/* two 6-cliques over a bridge, as in sky.test.ts: 31 edges, so 2m = 62;
   degree 5 everywhere except the bridge ends, which have 6 */
const cliques = (): Graph => {
  const edges: [number, number][] = [];
  for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) edges.push([a, b]);
  for (let a = 6; a < 12; a++) for (let b = a + 1; b < 12; b++) edges.push([a, b]);
  edges.push([5, 6]);
  return { n: 12, edges };
};

const triangle: Graph = { n: 3, edges: [[0, 1], [1, 2], [2, 0]] };
const p4: Graph = { n: 4, edges: [[0, 1], [1, 2], [2, 3]] };

/* ---------------- identities ---------------- */

test("the heat trace: Σ_i HKS_t(i) equals Σ_k exp(−t λ_k)", () => {
  /* each φ_k is unit norm, so summing HKS over nodes collapses the
     φ_k(i)² to 1 and leaves the trace of e^{−tL} */
  const g = cliques();
  const { A, n } = dense(g);
  const { values } = jacobiEigen(A, n);
  for (const t of [1, 10]) {
    const h = heatKernelSignature(g, [t]);
    let sum = 0;
    for (const v of h) sum += v;
    let trace = 0;
    for (const l of values) trace += Math.exp(-t * l);
    near(sum, trace, 1e-9);
  }
});

test("P4: the trace against the closed-form path spectrum", () => {
  /* the path P_n has L_sym eigenvalues 1 − cos(πk/(n−1)); for P4 that is
     0, 1/2, 3/2, 2, so the trace is 1 + e^{−t/2} + e^{−3t/2} + e^{−2t} */
  const { A, n } = dense(p4);
  const { values } = jacobiEigen(A, n);
  near(values[0], 0, 1e-10);
  near(values[1], 0.5, 1e-10);
  near(values[2], 1.5, 1e-10);
  near(values[3], 2, 1e-10);
  for (const t of [1, 10]) {
    const h = heatKernelSignature(p4, [t]);
    near(h[0] + h[1] + h[2] + h[3],
      1 + Math.exp(-t / 2) + Math.exp(-1.5 * t) + Math.exp(-2 * t), 1e-10);
  }
});

test("the triangle has the closed form 1/3 + (2/3) exp(−3t/2) at every node", () => {
  /* the triangle is 2-regular: L = I − A/2 with eigenvalues 0, 3/2, 3/2.
     φ_1 = 1/√3 gives 1/3; the λ = 3/2 eigenspace is the complement of the
     constants, whose projector has diagonal 1 − 1/3 = 2/3 */
  for (const t of [0.1, 1, 10]) {
    const h = heatKernelSignature(triangle, [t]);
    for (let i = 0; i < 3; i++) near(h[i], 1 / 3 + (2 / 3) * Math.exp(-1.5 * t), 1e-12);
  }
});

/* ---------------- what the scales read ---------------- */

test("K_{1,6} at small t: the hub is strictly largest", () => {
  /* the star's spectrum is 0, 1 (five times), 2. φ_1 = D^{1/2}·1/√12 gives
     the hub 6/12 and each leaf 1/12; the λ = 2 vector is the same with the
     leaves' sign flipped, so the same squares; the λ = 1 eigenspace lives
     on the leaves summing to zero — nothing at the hub, diagonal 5/6 at a
     leaf. Hence hub = (1 + e^{−2t})/2, leaf = (1 + e^{−2t})/12 + (5/6)e^{−t};
     at t = 0.1 that is 0.90937 against 0.90559 */
  const star: Graph = { n: 7, edges: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6]] };
  const t = 0.1;
  const h = heatKernelSignature(star, [t]);
  near(h[0], (1 + Math.exp(-2 * t)) / 2, 1e-12);
  for (let i = 1; i < 7; i++) {
    near(h[i], (1 + Math.exp(-2 * t)) / 12 + (5 / 6) * Math.exp(-t), 1e-12);
    assert.ok(h[0] > h[i], `leaf ${i} (${h[i]}) not below the hub (${h[0]})`);
  }
});

test("at large t every node settles to its degree share d_i / 2m", () => {
  /* only the kernel vector D^{1/2}·1/√(2m) survives; on the cliques graph
     λ_2 ≈ 0.05, so at t = 1000 the slowest other mode is e^{−50} */
  const g = cliques();
  const L = normalisedLaplacian(g);
  const h = heatKernelSignature(g, [1000]);
  for (let i = 0; i < 12; i++) near(h[i], L.deg[i] / 62, 1e-6);
  near(h[5], 6 / 62, 1e-6);          /* a bridge end */
  near(h[0], 5 / 62, 1e-6);          /* an ordinary clique member */
});

/* ---------------- shape and components ---------------- */

test("components are independent: a union's signature is the concatenation", () => {
  /* triangle on 0..2, P4 on 3..6; components are numbered by first touch
     and members kept in node order, so the rows line up */
  const union: Graph = {
    n: 7,
    edges: [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 6]],
  };
  const whole = heatKernelSignature(union);
  const tri = heatKernelSignature(triangle);
  const path = heatKernelSignature(p4);
  assert.equal(whole.length, 7 * HKS_SCALES.length);
  for (let j = 0; j < tri.length; j++) near(whole[j], tri[j], 1e-12);
  for (let j = 0; j < path.length; j++) near(whole[tri.length + j], path[j], 1e-12);
});

test("an isolated node gives exp(−t) at every scale", () => {
  /* its L_sym row is the lone 1, so λ = 1 and φ = 1 */
  const g: Graph = { n: 3, edges: [[0, 1]] };          /* node 2 stands alone */
  const times = [0.5, 1, 10];
  const h = heatKernelSignature(g, times);
  for (let k = 0; k < 3; k++) near(h[2 * 3 + k], Math.exp(-times[k]), 1e-12);
  const d = heatKernelSignature(g);
  near(d[2 * 2 + 0], Math.exp(-1), 1e-12);
  near(d[2 * 2 + 1], Math.exp(-10), 1e-12);
});

test("the array is n × times.length, row-major by node", () => {
  const g = cliques();
  const times = [0.5, 2, 8];
  const h = heatKernelSignature(g, times);
  assert.equal(h.length, 12 * 3);
  for (let k = 0; k < 3; k++) {
    const one = heatKernelSignature(g, [times[k]]);
    for (let i = 0; i < 12; i++) near(h[i * 3 + k], one[i], 1e-12);
  }
  /* and every value is a return probability: in (0, 1] */
  for (const v of h) assert.ok(v > 0 && v <= 1 + 1e-12, `out of range: ${v}`);
});

test("magnitudes: Pogson's ratio, five per factor of a hundred", () => {
  const m = magnitudes([100, 1]);
  near(m[0], 0, 1e-12);                        /* the brightest is zero */
  near(m[1], 5, 1e-12);                        /* a hundredth is five fainter */
  /* monotone, and a factor of 2.512 is one magnitude */
  const s = magnitudes([8, 4, 2, 1]);
  for (let i = 1; i < s.length; i++) assert.ok(s[i] > s[i - 1]);
  near(s[1] - s[0], 2.5 * Math.log10(2), 1e-12);
  /* a zero is floored, not sent to infinity */
  const z = magnitudes([1, 0]);
  assert.ok(Number.isFinite(z[1]) && z[1] > 0, `zero read ${z[1]}`);
  near(z[1], 30, 1e-9);                        /* −2.5 log10(1e-12) */
  /* nothing bright at all: all zeros out, no NaN */
  assert.deepEqual([...magnitudes([0, 0])], [0, 0]);
  assert.deepEqual([...magnitudes([])], []);
  /* and the signature's own scale: a hub against a leaf */
  const h = magnitudes(heatKernelSignature(cliques()));
  for (const v of h) assert.ok(Number.isFinite(v) && v >= 0);
});
