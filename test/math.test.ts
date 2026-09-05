/* The maths core, held to its promises. */
import test from "node:test";
import assert from "node:assert/strict";
import { cholesky, solveChol, jacobiEigen, orthogonalise, procrustes } from "../src/math/linalg.ts";
import { gaussianKernel, convolveReflect } from "../src/math/kernels.ts";
import { dft, dominantRhythm } from "../src/math/dft.ts";
import { zscore, laggedCorrelation, entropyBits, ranks, spearman, mantel } from "../src/math/stats.ts";
import { morletPeriod, morletScales, scalogram, ridge } from "../src/math/wavelet.ts";
import { rng } from "../src/rng.ts";

const near = (a: number, b: number, tol = 1e-9) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} !~ ${b} (tol ${tol})`);

test("cholesky reconstructs and solves", () => {
  const n = 5, r = rng(3);
  /* SPD by construction: B Bᵀ + n·I */
  const B = Float64Array.from({ length: n * n }, () => r() - 0.5);
  const A = new Float64Array(n * n);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      let s = i === j ? n : 0;
      for (let k = 0; k < n; k++) s += B[i * n + k] * B[j * n + k];
      A[i * n + j] = s;
    }
  const L = cholesky(A, n);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += L[i * n + k] * L[j * n + k];
      near(s, A[i * n + j], 1e-9);
    }
  const b = Float64Array.from({ length: n }, () => r());
  const x = solveChol(L, n, b);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) s += A[i * n + j] * x[j];
    near(s, b[i], 1e-8);
  }
  assert.throws(() => cholesky(new Float64Array([1, 2, 2, 1]), 2), /positive definite/);
});

test("jacobiEigen finds a known spectrum, ascending", () => {
  /* diag(1, 4, 9) rotated by a random orthogonal-ish similarity is overkill;
     a hand matrix with known eigenvalues does the job:
     [[2,1,0],[1,2,1],[0,1,2]] has eigenvalues 2-√2, 2, 2+√2 */
  const A = new Float64Array([2, 1, 0, 1, 2, 1, 0, 1, 2]);
  const { values, vectors } = jacobiEigen(A, 3);
  near(values[0], 2 - Math.SQRT2, 1e-10);
  near(values[1], 2, 1e-10);
  near(values[2], 2 + Math.SQRT2, 1e-10);
  /* eigenvector property: A v = λ v */
  for (let e = 0; e < 3; e++)
    for (let i = 0; i < 3; i++) {
      let s = 0;
      for (let j = 0; j < 3; j++) s += A[i * 3 + j] * vectors[e * 3 + j];
      near(s, values[e] * vectors[e * 3 + i], 1e-9);
    }
});

test("orthogonalise leaves nothing along the basis", () => {
  const b = new Float64Array([1, 0, 0]);
  const v = new Float64Array([3, 4, 5]);
  orthogonalise(v, [b]);
  near(v[0], 0);
  near(v[1], 4);
});

test("kernels: smoothing preserves a constant, differentiates a ramp, curves a parabola", () => {
  const n = 41;
  const flat = new Array(n).fill(7);
  const ramp = Array.from({ length: n }, (_, i) => 3 * i + 2);
  const para = Array.from({ length: n }, (_, i) => 0.5 * (i - 20) ** 2);
  const k0 = gaussianKernel(1.5, 0), k1 = gaussianKernel(1.5, 1), k2 = gaussianKernel(1.5, 2);
  near(convolveReflect(flat, k0)[20], 7, 1e-9);
  near(convolveReflect(ramp, k1)[20], 3, 1e-6);
  near(convolveReflect(flat, k1)[20], 0, 1e-9);
  near(convolveReflect(para, k2)[20], 1, 1e-6);
  near(convolveReflect(flat, k2)[20], 0, 1e-9);
});

test("kernels: the odd extension keeps a ramp's slope to the last sample", () => {
  const n = 41;
  const ramp = Array.from({ length: n }, (_, i) => 3 * i + 2);
  const flat = new Array(n).fill(7);
  const k1 = gaussianKernel(1.5, 1);
  /* the mirror reads a dead stop at both ends; the reflection through the
     endpoint continues the ramp and reads its slope */
  near(convolveReflect(ramp, k1)[0], 0, 1e-9);
  near(convolveReflect(ramp, k1)[n - 1], 0, 1e-9);
  const odd = convolveReflect(ramp, k1, true);
  for (let i = 0; i < n; i++) near(odd[i], 3, 1e-6);
  /* a level year still has no velocity: the extension of a constant through
     its endpoint is that same constant */
  for (const v of convolveReflect(flat, k1, true)) near(v, 0, 1e-9);
});

test("kernels: an extension shorter than the kernel still folds", () => {
  /* h = 6 at sigma 1.5, so a four-sample series folds more than once */
  const ramp = [0, 1, 2, 3];
  const odd = convolveReflect(ramp, gaussianKernel(1.5, 1), true);
  for (const v of odd) near(v, 1, 1e-6);
});

test("dft hears a planted rhythm", () => {
  const n = 52;
  const x = Array.from({ length: n }, (_, t) => 10 + 4 * Math.sin((2 * Math.PI * t) / 13));
  const { power, periods } = dft(x);
  let top = 0;
  for (let i = 1; i < power.length; i++) if (power[i] > power[top]) top = i;
  near(periods[top], 13, 1e-9);
  const r = dominantRhythm(x);
  assert.ok(r && Math.abs(r.period - 13) < 0.5 && r.ratio > 2);
  assert.equal(dominantRhythm(new Array(52).fill(5)), null);
});

test("laggedCorrelation recovers a planted shift", () => {
  const r = rng(11);
  const a = Array.from({ length: 60 }, () => r());
  const b = new Array(60).fill(0).map((_, t) => (t >= 3 ? a[t - 3] : 0));
  const hit = laggedCorrelation(a, b, 7);
  assert.equal(hit.lag, 3);
  assert.ok(hit.r > 0.95 && hit.z > 3.4);
});

test("zscore and entropy behave at the edges", () => {
  const z = zscore([1, 2, 3, 4]);
  near(z[0] + z[1] + z[2] + z[3], 0, 1e-12);
  assert.deepEqual([...zscore([5, 5, 5])], [0, 0, 0]);
  near(entropyBits([1, 1, 1, 1]), 2);
  near(entropyBits([1, 0, 0]), 0);
  near(entropyBits([]), 0);
});

/* ---------------- wavelet ---------------- */

test("the ridge hears a planted 13-week rhythm wherever it is defined", () => {
  const n = 53;
  const x = Array.from({ length: n }, (_, t) => 10 + 4 * Math.sin((2 * Math.PI * t) / 13));
  const scales = morletScales(n);
  const { period, power } = ridge(scalogram(x, scales), scales, n);
  let defined = 0;
  for (let t = 0; t < n; t++) {
    if (!(power[t] > 0)) continue;
    defined++;
    assert.ok(Math.abs(period[t] - 13) <= 0.5, `week ${t}: ${period[t]}`);
  }
  assert.ok(defined > 0);
});

test("the ridge of a chirp rises with it", () => {
  const n = 106;
  /* instantaneous period 6 → 20, linear in t; the phase is ∫ 2π / P(t) dt,
     which for a linear P is a logarithm */
  const x = Array.from({ length: n }, (_, t) =>
    Math.sin(2 * Math.PI * ((n - 1) / 14) * Math.log((6 + (14 * t) / (n - 1)) / 6)));
  const scales = morletScales(n);
  const { period, power } = ridge(scalogram(x, scales), scales, n);
  /* the middle half: clear of the cone's edges, where reflection folds
     the ends back on themselves */
  let prev = 0, seen = 0;
  for (let t = n >> 2; t < 3 * (n >> 2); t++) {
    if (!(power[t] > 0)) continue;
    assert.ok(period[t] >= prev, `week ${t}: ${period[t]} < ${prev}`);
    prev = period[t];
    seen++;
  }
  assert.ok(seen > 20);
});

test("scalogram power is invariant to amplitude and level", () => {
  /* the variance division cancels the gain: doubling the series is the
     same beat, and so is lifting it by a constant */
  const n = 53, r = rng(5);
  const x = Array.from({ length: n }, (_, t) => 3 * Math.sin(t / 2) + r());
  const scales = morletScales(n);
  const a = scalogram(x, scales).power;
  const b = scalogram(x.map(v => 2 * v + 7), scales).power;
  assert.equal(a.length, b.length);
  for (let i = 0; i < a.length; i++) near(a[i], b[i], 1e-9);
});

test("a flat series has no beat: all zeros, no NaN", () => {
  const scales = morletScales(53);
  const sg = scalogram(new Array(53).fill(4), scales);
  assert.ok(sg.power.every(v => v === 0));
  assert.ok(sg.coi.every(v => Number.isFinite(v)));
  const r = ridge(sg, scales, 53);
  assert.ok(r.period.every(v => v === 0) && r.power.every(v => v === 0));
});

test("morlet scales and periods agree with the textbook", () => {
  near(morletPeriod(1), (4 * Math.PI) / (6 + Math.sqrt(38)), 1e-12);
  const s = morletScales(53);
  near(morletPeriod(s[0]), 2, 1e-12);
  near(morletPeriod(s[s.length - 1]), 26.5, 1e-12);
  for (let i = 1; i < s.length; i++) assert.ok(s[i] > s[i - 1]);
});

/* ---------------- ranks, Spearman, Mantel, Procrustes ---------------- */

test("ranks average ties", () => {
  assert.deepEqual(Array.from(ranks([10, 20, 20, 30])), [1, 2.5, 2.5, 4]);
  assert.deepEqual(Array.from(ranks([3, 3, 3])), [2, 2, 2]);
  assert.deepEqual(Array.from(ranks([])), []);
});

test("spearman is Pearson on ranks: the textbook pair", () => {
  /* b's ranks are 1, 2, 3.5, 5, 3.5 against 1..5: ρ = 8/√95 */
  near(spearman([1, 2, 3, 4, 5], [5, 6, 7, 8, 7]), 8 / Math.sqrt(95), 1e-12);
  near(spearman([1, 2, 3], [3, 2, 1]), -1, 1e-12);
  near(spearman([1, 1, 1], [1, 2, 3]), 0);
});

/* a random symmetric distance matrix, zero diagonal */
function distances(n: number, seed: number): Float64Array {
  const rnd = rng(seed), d = new Float64Array(n * n);
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) d[i * n + j] = d[j * n + i] = 1 + rnd();
  return d;
}

test("mantel: a matrix against itself is ρ = 1 at the smallest p; against a stranger, nothing", () => {
  const n = 30, A = distances(n, 2), B = distances(n, 3);
  const self = mantel(A, A, n, { permutations: 200, seed: 1 });
  near(self.rho, 1, 1e-12);
  near(self.p, 1 / 201, 1e-12);
  const other = mantel(A, B, n, { permutations: 200, seed: 1 });
  assert.ok(Math.abs(other.rho) < 0.15, `rho ${other.rho}`);
  assert.ok(other.p > 0.05, `p ${other.p}`);
  assert.deepEqual(mantel(A, B, n, { permutations: 200, seed: 1 }), other);
  assert.deepEqual(mantel(A, A, 2), { rho: 0, p: 1 });
  assert.deepEqual(mantel(new Float64Array(9), A, 3), { rho: 0, p: 1 });
});

test("procrustes undoes a rotation, a reflection and a shift", () => {
  const n = 12, rnd = rng(6);
  const dst = { x: new Float64Array(n), y: new Float64Array(n), z: new Float64Array(n) };
  for (let i = 0; i < n; i++) { dst.x[i] = (rnd() - 0.5) * 10; dst.y[i] = (rnd() - 0.5) * 6; dst.z[i] = rnd(); }
  const th = 0.7, c = Math.cos(th), s = Math.sin(th);
  const src = { x: new Float64Array(n), y: new Float64Array(n), z: Float64Array.from(dst.z) };
  for (let i = 0; i < n; i++) {
    const x = -dst.x[i], y = dst.y[i];      /* reflect x, then turn, then shift */
    src.x[i] = c * x - s * y + 3; src.y[i] = s * x + c * y - 2;
  }
  const out = procrustes(src, dst);
  for (let i = 0; i < n; i++) { near(out.x[i], dst.x[i], 1e-9); near(out.y[i], dst.y[i], 1e-9); near(out.z[i], dst.z[i]); }
  /* collinear points still get a proper rotation, not NaN */
  const line = { x: new Float64Array([0, 1, 2]), y: new Float64Array([0, 0, 0]), z: new Float64Array(3) };
  const up = { x: new Float64Array([0, 0, 0]), y: new Float64Array([0, 1, 2]), z: new Float64Array(3) };
  const turned = procrustes(line, up);
  for (let i = 0; i < 3; i++) { near(turned.x[i], up.x[i], 1e-9); near(turned.y[i], up.y[i], 1e-9); }
});
