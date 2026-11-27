/* Kepler's problem, held to its promises: the equation to machine residual,
   and when a body will next be somewhere; and the singular value
   decomposition beside it. */
import test from "node:test";
import assert from "node:assert/strict";
import { solveKepler, trueAnomaly, orbitFrac, timeToFrac } from "../src/orbit/kepler.ts";
import type { Elements } from "../src/orbit/kepler.ts";
import { svd } from "../src/math/svd.ts";
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
  const el: Elements = { a: 0.6, e: 0, T: 86400e3 * Math.pow(0.6, 1.5), M0: 0.37 * 2 * Math.PI };
  for (let i = 0; i < 200; i++) {
    const t = i * 3.6e6 * 1.7;
    near(cdist(orbitFrac(el, t), (t / el.T + el.M0 / (2 * Math.PI)) % 1), 0, 1e-9);
  }
});

test("timeToFrac round-trips exactly, result in (0, T]", () => {
  for (const e of [0, 0.1, 0.2]) {
    const el: Elements = { a: 1, e, T: 86400e3, M0: 1.234 };
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

test("benjaminiHochberg gives the textbook q-values, monotone and in place", () => {
  const q = benjaminiHochberg([0.01, 0.04, 0.03, 0.2]);
  /* sorted 0.01, 0.03, 0.04, 0.2 with m = 4: raw 0.04, 0.06, 0.0533, 0.2;
     the running minimum from the top pulls 0.06 down to 0.0533 */
  assert.deepEqual([...q].map(v => +v.toFixed(12)), [0.04, 0.053333333333, 0.053333333333, 0.2]);
  assert.deepEqual([...benjaminiHochberg([])], []);
  assert.deepEqual([...benjaminiHochberg([0.5])], [0.5]);
  for (const v of benjaminiHochberg([0.9, 0.95, 1])) assert.ok(v <= 1);
});
