/* The week on a circle: the fit against what a spike, a uniform and a
   wrap-around must give, and the density against its own integral. */
import test from "node:test";
import assert from "node:assert/strict";
import { vonMisesFit, vonMisesDensity, besselI0e, KAPPA_MAX } from "../src/math/circular.ts";

const near = (a: number, b: number, tol = 1e-9) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} !~ ${b} (tol ${tol})`);
const TAU = 2 * Math.PI;

test("a spike in one bin points there with the largest κ", () => {
  const f = vonMisesFit([0, 0, 9, 0, 0, 0, 0]);
  near(f.mu, 2 * TAU / 7);
  near(f.R, 1);
  assert.equal(f.kappa, KAPPA_MAX);
});

test("uniform weights are the uniform fit, and so are no weights", () => {
  const u = vonMisesFit(new Array(7).fill(3));
  near(u.R, 0, 1e-12); near(u.kappa, 0, 1e-12);
  const e = vonMisesFit([]);
  assert.deepEqual(e, { mu: 0, kappa: 0, R: 0 });
  const z = vonMisesFit([0, 0, 0]);
  assert.deepEqual(z, { mu: 0, kappa: 0, R: 0 });
});

test("mass split across the wrap averages to the wrap, not the middle", () => {
  /* Saturday and Sunday: a plain mean says Wednesday; the circle says the
     weekend, with the resultant shortened by their spread */
  const f = vonMisesFit([1, 0, 0, 0, 0, 0, 1]);
  near(f.mu, TAU - TAU / 14, 1e-12);       /* half a day before Sunday, not Wednesday */
  near(f.R, Math.cos(TAU / 14));
});

test("I₀ scaled: the series and the asymptotic branch agree where they meet", () => {
  /* e^{-x} I₀(x) at x = 30 both ways */
  const series = besselI0e(30);
  const r = 1 / 240;
  const asym = (1 + r + 4.5 * r * r + 37.5 * r * r * r) / Math.sqrt(2 * Math.PI * 30);
  near(series, asym, 2e-6);
  near(besselI0e(0), 1);
  near(besselI0e(1), 1.2660658777520084 * Math.exp(-1), 1e-12);   /* I₀(1) */
});

test("the density integrates to one over the circle, sharp or flat", () => {
  for (const kappa of [0, 0.5, 2, 8, 50, 400]) {
    const N = 20000;
    let s = 0;
    for (let i = 0; i < N; i++) s += vonMisesDensity(TAU * (i + 0.5) / N, 1.3, kappa);
    near(s * TAU / N, 1, 1e-4);
  }
});

test("the fit recovers κ from a finely binned von Mises to a few parts in a thousand", () => {
  const K = 360;
  for (const kappa of [0.5, 2, 8]) {
    const w = Array.from({ length: K }, (_, k) => vonMisesDensity(TAU * k / K, 2.2, kappa));
    const f = vonMisesFit(w);
    near(f.mu, 2.2, 1e-9);
    assert.ok(Math.abs(f.kappa - kappa) / kappa < 0.01, `κ ${kappa} came back as ${f.kappa}`);
  }
});

test("seven bins: the coarse week biases κ by less than a tenth up to κ = 2", () => {
  /* aliasing of the sixth and eighth harmonics into the first — the
     honest limit of a seven-day circle, stated in docs/tide.md */
  for (const kappa of [0.3, 1, 2]) {
    const w = Array.from({ length: 7 }, (_, k) => vonMisesDensity(TAU * k / 7, 0.9, kappa));
    const f = vonMisesFit(w);
    near(f.mu, 0.9, 1e-4);                 /* the seven bins are not symmetric about 0.9 */
    assert.ok(Math.abs(f.kappa - kappa) / kappa < 0.1, `κ ${kappa} came back as ${f.kappa}`);
  }
});
