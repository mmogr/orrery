/* The pull between planets: leapfrog against the properties a symplectic
   integrator must have, and the perturbation against its limits. */
import test from "node:test";
import assert from "node:assert/strict";
import { keplerState, leapfrog, energy, phasePerturbations, G_PLANETS } from "../src/orbits/nbody.ts";
import { orbitFrac, elementsFrom, FIT } from "../src/orbits/kepler.ts";
import type { Elements } from "../src/orbits/kepler.ts";

const near = (a: number, b: number, tol = 1e-9) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} !~ ${b} (tol ${tol})`);
const TAU = 2 * Math.PI;
const K = FIT.k;

const el = (a: number, e: number, M0 = 0): Elements => ({ a, e, T: K * Math.pow(a, 1.5), M0, tilt: 0 });

test("keplerState obeys the vis-viva equation and the orbit's own period", () => {
  for (const [a, e] of [[1, 0], [0.5, 0.2], [0.8, 0.1]] as const) {
    const o = el(a, e, 0.7);
    for (const tau of [0, 0.13, 0.4, 0.99]) {
      const [x, y, vx, vy] = keplerState(o, tau * o.T / K, K);
      const r = Math.hypot(x, y), v2 = vx * vx + vy * vy;
      near(v2, TAU * TAU * (2 / r - 1 / a), 1e-9);            /* GM = 4π² in these units */
    }
    /* one period later, the same place */
    const p = keplerState(o, 0, K), q = keplerState(o, o.T / K, K);
    for (let i = 0; i < 4; i++) near(p[i], q[i], 1e-9);
    /* the angle from the focus is Kepler's true anomaly */
    const [x, y] = keplerState(o, 0.3 * o.T / K, K);
    let f = Math.atan2(y, x) / TAU; if (f < 0) f += 1;
    near(f, orbitFrac(o, 0.3 * o.T), 1e-9);
  }
});

const system = (G: number) => {
  const bodies = [el(1, 0.2, 0), el(0.6, 0.1, 2)];
  const s = { x: new Float64Array(2), y: new Float64Array(2), vx: new Float64Array(2), vy: new Float64Array(2) };
  bodies.forEach((b, i) => {
    const [x, y, vx, vy] = keplerState(b, 0, K);
    s.x[i] = x; s.y[i] = y; s.vx[i] = vx; s.vy[i] = vy;
  });
  const m = [1, 0.4];
  return { s, m, e0: energy(s, m, G) };
};

test("leapfrog's energy error is second order in dt and bounded, not growing", () => {
  const G = 0.001;
  const errs = (dt: number, orbits: number): number[] => {
    const { s, m, e0 } = system(G);
    const per = Math.round(1 / dt), out: number[] = [];
    for (let o = 0; o < orbits; o++) {
      leapfrog(s, m, G, dt, per);
      out.push(Math.abs((energy(s, m, G) - e0) / e0));
    }
    return out;
  };
  const coarse = Math.max(...errs(1 / 400, 3)), fine = Math.max(...errs(1 / 800, 3));
  assert.ok(fine < coarse / 3, `halving dt should quarter the error: ${coarse} → ${fine}`);
  /* symplectic: the error oscillates within a band and the band does not
     widen — the second five orbits look like the first five */
  const e = errs(1 / 400, 10);
  const first = Math.max(...e.slice(0, 5)), second = Math.max(...e.slice(5));
  assert.ok(second < 2 * first, `energy error grew: ${first} then ${second}`);
  assert.ok(second < 1e-4, `energy error ${second}`);
});

test("the integrator alone tracks Kepler to second order in the step", () => {
  const o = el(1, 0.2, 0.3);
  const drift = (per: number): number => {
    const s = { x: new Float64Array(1), y: new Float64Array(1), vx: new Float64Array(1), vy: new Float64Array(1) };
    const [x, y, vx, vy] = keplerState(o, 0, K);
    s.x[0] = x; s.y[0] = y; s.vx[0] = vx; s.vy[0] = vy;
    leapfrog(s, [1], 0, 1 / per, 3 * per);          /* three orbits */
    const [ex, ey] = keplerState(o, 3, K);
    return Math.abs(Math.atan2(s.y[0], s.x[0]) - Math.atan2(ey, ex)) / TAU;
  };
  const a = drift(500), b = drift(1000);
  assert.ok(a < 1e-3, `phase error ${a} at 500 steps per orbit`);
  assert.ok(b < a / 3, `halving the step should quarter the phase error: ${a} → ${b}`);
});

test("leapfrog is reversible: run back, arrive where you started", () => {
  const G = 0.01;
  const { s, m } = system(G);
  const start = { x: Float64Array.from(s.x), y: Float64Array.from(s.y) };
  leapfrog(s, m, G, 1 / 500, 1500);
  for (let i = 0; i < 2; i++) { s.vx[i] = -s.vx[i]; s.vy[i] = -s.vy[i]; }
  leapfrog(s, m, G, 1 / 500, 1500);
  for (let i = 0; i < 2; i++) { near(s.x[i], start.x[i], 1e-9); near(s.y[i], start.y[i], 1e-9); }
});

test("with no mutual gravity the perturbation is exactly nothing, at any step", () => {
  /* the pulled and the unpulled runs are the same run, so the integrator's
     own phase error — large at sixty steps an orbit — cancels to the bit */
  const bodies = [{ m: 1, el: el(1, 0.2, 0.3) }, { m: 0.5, el: el(0.5, 0.15, 1.1) }];
  const d = phasePerturbations(bodies, 0, 3 * bodies[0].el.T, bodies[1].el.T / 60, 0);
  assert.deepEqual([...d], [0, 0]);
});

test("the perturbation is linear in G while G is small", () => {
  const bodies = [{ m: 1, el: el(1, 0.1, 0) }, { m: 0.3, el: el(0.7, 0.05, 2.5) }];
  const dt = bodies[1].el.T / 2000, span = 2 * bodies[0].el.T;
  const a = phasePerturbations(bodies, 0, span, dt, 1e-6);
  const b = phasePerturbations(bodies, 0, span, dt, 2e-6);
  for (let i = 0; i < 2; i++) {
    assert.ok(Math.abs(a[i]) > 1e-9, `no perturbation at all on body ${i}`);
    near(b[i] / a[i], 2, 1e-2);
  }
});

test("four weeks of the sky's own planets shift phases by a fraction of a percent", () => {
  /* eleven repos on the fitted elements, masses from a spread of activity;
     with G_PLANETS the largest shift over four weeks is small but not zero */
  const bodies = Array.from({ length: 11 }, (_, i) => {
    const act = 1 - i / 10;
    return { m: act, el: elementsFrom(act, (i % 3) / 3, 0, i / 11) };
  });
  const day = 86400e3, tmin = Math.min(...bodies.map(b => b.el.T));
  const d = phasePerturbations(bodies, 0, 28 * day, tmin / 64, G_PLANETS);
  let big = 0;
  for (const v of d) big = Math.max(big, Math.abs(v));
  assert.ok(big > 1e-4 && big < 1e-2, `largest shift ${big}`);
  console.log(`    largest phase shift over 28 days: ${(big * 100).toFixed(3)} % of an orbit`);
});

test("degenerate spans and steps give zeros, not NaN", () => {
  const bodies = [{ m: 1, el: el(1, 0, 0) }];
  assert.deepEqual([...phasePerturbations(bodies, 5, 5, 1)], [0]);
  assert.deepEqual([...phasePerturbations(bodies, 0, 10, 0)], [0]);
  assert.deepEqual([...phasePerturbations([], 0, 10, 1)], []);
});
