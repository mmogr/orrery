/* Orbits, held to their promises: Kepler's equation to machine residual,
   the fit against the old sky, the language-space decomposition, and the
   double planets. */
import test from "node:test";
import assert from "node:assert/strict";
import { FIT, elementsFrom, solveKepler, trueAnomaly, orbitFrac, timeToFrac, fitKepler }
  from "../src/orbits/kepler.ts";
import type { Elements } from "../src/orbits/kepler.ts";
import { arcPos } from "../src/orbits/arc.ts";
import { svd, languageSpace } from "../src/orbits/svd.ts";
import { findBinaries } from "../src/orbits/binaries.ts";
import { benjaminiHochberg } from "../src/math/stats.ts";
import { rng } from "../src/rng.ts";

const near = (a: number, b: number, tol = 1e-9) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} !~ ${b} (tol ${tol})`);
/* distance on the circle of fractions [0,1) */
const cdist = (a: number, b: number) => {
  const d = Math.abs((((a - b) % 1) + 1) % 1);
  return Math.min(d, 1 - d);
};

test("solveKepler holds its residual across e and dense M", () => {
  for (const e of [0, 0.1, 0.2]) {
    for (let i = 0; i < 997; i++) {
      const M = (i / 997) * 2 * Math.PI;
      const E = solveKepler(M, e);
      assert.ok(Math.abs(E - e * Math.sin(E) - M) < 1e-12, `e=${e} M=${M}`);
    }
  }
});

test("trueAnomaly is the identity on a circle", () => {
  for (let i = 0; i < 50; i++) {
    const E = (i / 50) * 2 * Math.PI;
    near(cdist(trueAnomaly(E, 0) / (2 * Math.PI), E / (2 * Math.PI)), 0, 1e-12);
  }
});

test("e = 0 makes orbitFrac linear in time", () => {
  const el = elementsFrom(0.5, 0, 0.3, 0.37);   /* langDistance 0 → e = 0 */
  assert.equal(el.e, 0);
  for (let i = 0; i < 200; i++) {
    const t = i * 3.6e6 * 1.7;
    near(cdist(orbitFrac(el, t), (t / el.T + el.M0 / (2 * Math.PI)) % 1), 0, 1e-9);
  }
});

test("timeToFrac round-trips exactly, result in (0, T]", () => {
  for (const e of [0, 0.1, 0.2]) {
    const el: Elements = { a: 1, e, T: 86400e3, M0: 1.234, tilt: 0 };
    for (const t of [0, 3.7e6, 5.55e7, 9.9e8]) {
      for (const f of [0.01, 0.25, 0.5, 0.75, 0.99]) {
        const dt = timeToFrac(el, t, f);
        assert.ok(dt > 0 && dt <= el.T, `dt=${dt} out of (0,T]`);
        near(cdist(orbitFrac(el, t + dt), f), 0, 1e-9);
      }
      /* asking for where we already are: still in (0, T], still lands home */
      const here = orbitFrac(el, t);
      const dt = timeToFrac(el, t, here);
      assert.ok(dt > 0 && dt <= el.T);
      near(cdist(orbitFrac(el, t + dt), here), 0, 1e-9);
    }
  }
});

test("fitKepler recovers a planted power law", () => {
  const aMin = 0.3, k = 5e7;
  const samples = [];
  for (let i = 0; i <= 10; i++) {
    const activity = i / 10;
    samples.push({ activity, T: k * Math.pow(aMin + (1 - aMin) * (1 - activity), 1.5) });
  }
  const fit = fitKepler(samples);
  near(fit.aMin, aMin, 1e-4);
  near(fit.aMax, 1, 0);
  near(fit.k / k, 1, 1e-4);
});

test("FIT is the least-squares fit of the old linear rule", () => {
  const samples = [];
  for (let i = 0; i <= 10; i++)
    samples.push({ activity: i / 10, T: (46 - 40 * (i / 10)) * 3600e3 });
  const fit = fitKepler(samples);
  near(fit.aMin / FIT.aMin, 1, 1e-3);
  near(fit.k / FIT.k, 1, 1e-3);
  /* worst log-residual against the old line: quoted as 10.7% in the doc */
  let worst = 0;
  for (const s of samples) {
    const a = FIT.aMin + (FIT.aMax - FIT.aMin) * (1 - s.activity);
    worst = Math.max(worst, Math.abs(Math.log(FIT.k * Math.pow(a, 1.5) / s.T)));
  }
  assert.ok(worst < 0.11, `worst log residual ${worst}`);
});

test("elementsFrom maps the old endpoints through the third law", () => {
  const busy = elementsFrom(1, 0.5, -1, 0);
  const idle = elementsFrom(0, 1, 1, 0.5);
  assert.equal(busy.a, FIT.aMin);
  assert.equal(idle.a, FIT.aMax);
  assert.ok(busy.T < idle.T, "busy must be fast");
  near(busy.T / 3600e3, 6.68, 0.05);     /* the fit's 6h end */
  near(idle.T / 3600e3, 49.9, 0.05);     /* and its 46h end */
  near(busy.e, 0.1, 1e-12);
  near(idle.e, 0.2, 1e-12);
  near(busy.tilt, -0.04, 1e-12);
  near(idle.tilt, 0.04, 1e-12);
  near(idle.M0, Math.PI, 1e-12);
});

test("arcPos is the page's planetPos, verbatim", () => {
  const W = 1200, H = 800;
  /* the peak: f = 0.25, up = 1, mid-span, tilt term crosses zero */
  const peak = arcPos(0.25, 0.2, 0.07, W, H);
  near(peak.up, 1, 1e-12);
  near(peak.x, W * 0.5, 1e-9);
  near(peak.y, H * 0.72 - 0.2 * H, 1e-9);
  /* rising: f = 0.1 — the old formula, term by term */
  const f = 0.1, alt = 0.25, tilt = 0.07;
  const p = arcPos(f, alt, tilt, W, H);
  near(p.up, Math.sin(f * 2 * Math.PI), 1e-12);
  near(p.x, W * (0.05 + 0.90 * f * 2), 1e-9);
  near(p.y, H * 0.72 - p.up * alt * H + (f * 2 - 0.5) * H * tilt, 1e-9);
  /* set: up clamps to zero below the horizon */
  assert.equal(arcPos(0.5, 0.2, 0, W, H).up, 0);
  assert.equal(arcPos(0.9, 0.2, 0, W, H).up, 0);
  /* no tilt, no fork: the untilted y at the endpoints of the up half */
  near(arcPos(0.0, 0.2, 0, W, H).y, H * 0.72, 1e-9);
});

test("svd reconstructs, orders, and stays orthonormal", () => {
  const r = rng(11);
  for (const [rows, cols] of [[8, 5], [4, 6]] as const) {
    const k = Math.min(rows, cols);
    const A = Float64Array.from({ length: rows * cols }, () => r() * 2 - 1);
    const { U, S, V } = svd(A, rows, cols);
    for (let j = 1; j < k; j++) assert.ok(S[j] <= S[j - 1] + 1e-12, "S must descend");
    /* A = U diag(S) Vᵀ */
    for (let i = 0; i < rows; i++)
      for (let j = 0; j < cols; j++) {
        let s = 0;
        for (let t = 0; t < k; t++) s += U[i * k + t] * S[t] * V[j * k + t];
        near(s, A[i * cols + j], 1e-9);
      }
    /* UᵀU = I, VᵀV = I */
    for (let p = 0; p < k; p++)
      for (let q = 0; q < k; q++) {
        let uu = 0, vv = 0;
        for (let i = 0; i < rows; i++) uu += U[i * k + p] * U[i * k + q];
        for (let i = 0; i < cols; i++) vv += V[i * k + p] * V[i * k + q];
        near(uu, p === q ? 1 : 0, 1e-8);
        near(vv, p === q ? 1 : 0, 1e-8);
      }
  }
});

test("languageSpace separates two clusters on PC1, deterministically", () => {
  const bytes = {
    "crab-one":   { Rust: 500000, TOML: 20000 },
    "crab-two":   { Rust: 800000, Shell: 10000 },
    "crab-three": { Rust: 300000, TOML: 5000 },
    "snake-one":  { Python: 400000, Shell: 15000 },
    "snake-two":  { Python: 900000 },
    "snake-three": { Python: 250000, TOML: 8000 },
  };
  const ls = languageSpace(bytes);
  assert.deepEqual(ls.repos, Object.keys(bytes));
  /* PC1 tells crabs from snakes: same sign within, opposite across */
  const x = (i: number) => ls.xy[i * 2];
  for (const i of [0, 1, 2]) assert.ok(x(i) * x(0) > 0, "rust cluster coherent");
  for (const i of [3, 4, 5]) assert.ok(x(i) * x(3) > 0, "python cluster coherent");
  assert.ok(x(0) * x(3) < 0, "clusters must separate");
  /* the axis reads Rust ↔ Python, whichever way it points */
  assert.deepEqual([...ls.axis1].sort(), ["Python", "Rust"]);
  /* deterministic: same input, byte-identical output */
  const ls2 = languageSpace(bytes);
  assert.deepEqual([...ls.xy], [...ls2.xy]);
  assert.deepEqual(ls.axis1, ls2.axis1);
});

test("findBinaries: the planted pair, at its planted lag, and no double-booking", () => {
  const r = rng(7);
  const n = 64;
  const a = Array.from({ length: n }, () => (r() < 0.3 ? 1 + Math.floor(r() * 5) : 0));
  const b = a.map((_, t) => (t >= 3 ? a[t - 3] : 0));      /* b trails a by 3 days */
  const c = a.map((_, t) => (t >= 1 ? a[t - 1] : 0));      /* a rival echo */
  const noise = Array.from({ length: 3 }, () =>
    Array.from({ length: n }, () => (r() < 0.25 ? 1 + Math.floor(r() * 3) : 0)));
  /* a sparse identical pair: perfectly correlated, too few active days to count */
  const sparse = Array.from({ length: n }, (_, t) => (t % 13 === 0 && t < 60 ? 2 : 0));
  const series = [a, b, c, ...noise, sparse, [...sparse]];

  const pairs = findBinaries(series);
  const planted = pairs.find(p => (p.a === 0 && p.b === 1));
  assert.ok(planted, "the planted pair must be found");
  assert.equal(planted.lag, 3);
  assert.ok(Math.abs(planted.r) > 0.9);
  /* greedy uniqueness: no index twice */
  const seen = new Set<number>();
  for (const p of pairs) {
    assert.ok(!seen.has(p.a) && !seen.has(p.b), "an index may join one pair only");
    seen.add(p.a); seen.add(p.b);
  }
  /* the sparse twins never qualify */
  assert.ok(!pairs.some(p => p.a >= 6 || p.b >= 6), "sparse series must sit out");
});

/* ---------------- binaries: the false-discovery rate ---------------- */

test("benjaminiHochberg gives the textbook q-values, monotone and in place", () => {
  const q = benjaminiHochberg([0.01, 0.04, 0.03, 0.2]);
  /* sorted 0.01, 0.03, 0.04, 0.2 with m = 4: raw 0.04, 0.06, 0.0533, 0.2;
     the running minimum from the top pulls 0.06 down to 0.0533 */
  assert.deepEqual([...q].map(v => +v.toFixed(12)), [0.04, 0.053333333333, 0.053333333333, 0.2]);
  assert.deepEqual([...benjaminiHochberg([])], []);
  assert.deepEqual([...benjaminiHochberg([0.5])], [0.5]);
  for (const v of benjaminiHochberg([0.9, 0.95, 1])) assert.ok(v <= 1);
});

test("independent years pair with nothing, across seeds, at the stated rate or better", () => {
  /* six repos of pure noise: fifteen pairs a roster, ten rosters — with
     fdr 0.1 a handful of false pairs would be within its promise; the
     permutation null does better than that here */
  let found = 0;
  for (let seed = 0; seed < 10; seed++) {
    const r = rng(100 + seed);
    const noise = Array.from({ length: 6 }, () =>
      Array.from({ length: 365 }, () => (r() < 0.2 ? 1 + Math.floor(r() * 4) : 0)));
    found += findBinaries(noise, { seed }).length;
  }
  assert.ok(found <= 3, `${found} false pairs across ten rosters`);
});

test("a planted pair is found at its lag with a q-value that says so", () => {
  const r = rng(11);
  const a = Array.from({ length: 365 }, () => (r() < 0.25 ? 1 + Math.floor(r() * 5) : 0));
  const b = a.map((_, t) => (t >= 3 && r() < 0.8 ? a[t - 3] : (r() < 0.1 ? 1 : 0)));
  const noise = Array.from({ length: 4 }, () =>
    Array.from({ length: 365 }, () => (r() < 0.2 ? 1 + Math.floor(r() * 3) : 0)));
  const pairs = findBinaries([a, b, ...noise]);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].a, 0); assert.equal(pairs[0].b, 1);
  assert.equal(pairs[0].lag, 3);
  assert.ok(pairs[0].q < 0.05, `q = ${pairs[0].q}`);
  assert.ok(pairs[0].p >= 1 / 1001, "no p below one over the draws plus one");
  /* the same seed, the same answer */
  assert.deepEqual(findBinaries([a, b, ...noise]), pairs);
});
