/* The pull between planets. Kepler's sky moves each project on its own
   ellipse about the observatory's centre and lets none of them feel the
   others. Here they do: the same planar system — a central mass that
   Kepler's third law implies, and every planet with a mass from its year
   of commits — integrated by kick-drift-kick leapfrog, and what is kept is
   the along-track difference from the unperturbed orbit, a shift in orbit
   fraction per body. The picture's geometry stays Kepler's; only the
   phase learns that other projects exist. See docs/nbody.md. */
import type { Elements } from "./kepler.ts";
import { solveKepler } from "./kepler.ts";

export interface MassiveBody {
  m: number;        /* mass as a fraction of the busiest project's (0..1) */
  el: Elements;
}

/* the state of every body in the orbit plane: position and velocity,
   with the central mass fixed at the origin */
export interface PlaneState {
  x: Float64Array; y: Float64Array;
  vx: Float64Array; vy: Float64Array;
}

const TAU = 2 * Math.PI;

/* the perturbing strength: a planet of full mass pulls with this fraction
   of the centre's gravity. Chosen, not derived — small enough that four
   weeks of pulling move the sky's fastest planet by a third of a percent
   of an orbit, minutes in the almanac and less than a pixel in the sky,
   on purpose, and small enough to stay in the regime where the shift is
   linear in G (docs/nbody.md, aesthetic terms) */
export const G_PLANETS = 2e-7;

/* position and velocity on a Kepler orbit at time t, in the orbit plane
   with periapsis on +x and the focus at the origin. Time runs in units of
   the fit's k (so T = a^{3/2} and GM = 4π²), which keeps the numbers near
   one whatever the millisecond period. */
export function keplerState(el: Elements, tau: number, k: number): [number, number, number, number] {
  const T = el.T / k;
  const M = wrap(TAU * tau / T + el.M0);
  const E = solveKepler(M, el.e);
  const cE = Math.cos(E), sE = Math.sin(E), q = Math.sqrt(1 - el.e * el.e);
  const Edot = (TAU / T) / (1 - el.e * cE);
  return [el.a * (cE - el.e), el.a * q * sE, -el.a * sE * Edot, el.a * q * cE * Edot];
}

/* kick-drift-kick leapfrog on the plane: the centre's 4π²/r² inward, and
   every other body's G·m_j/d² toward it. Symplectic and time-reversible,
   so energy wanders but never drifts. Advances state in place. */
export function leapfrog(s: PlaneState, m: ArrayLike<number>, G: number, dt: number, steps: number): void {
  const n = s.x.length;
  const ax = new Float64Array(n), ay = new Float64Array(n);
  const accel = (): void => {
    for (let i = 0; i < n; i++) {
      const r2 = s.x[i] * s.x[i] + s.y[i] * s.y[i];
      const f = -TAU * TAU / (r2 * Math.sqrt(r2));
      ax[i] = f * s.x[i]; ay[i] = f * s.y[i];
    }
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const dx = s.x[j] - s.x[i], dy = s.y[j] - s.y[i];
      const d2 = dx * dx + dy * dy;
      const f = G * TAU * TAU / (d2 * Math.sqrt(d2));
      ax[i] += f * m[j] * dx; ay[i] += f * m[j] * dy;
      ax[j] -= f * m[i] * dx; ay[j] -= f * m[i] * dy;
    }
  };
  accel();
  for (let step = 0; step < steps; step++) {
    for (let i = 0; i < n; i++) { s.vx[i] += 0.5 * dt * ax[i]; s.vy[i] += 0.5 * dt * ay[i]; }
    for (let i = 0; i < n; i++) { s.x[i] += dt * s.vx[i]; s.y[i] += dt * s.vy[i]; }
    accel();
    for (let i = 0; i < n; i++) { s.vx[i] += 0.5 * dt * ax[i]; s.vy[i] += 0.5 * dt * ay[i]; }
  }
}

/* the system's energy in the same units: kinetic, the centre's well, and
   the planets' own wells — the quantity leapfrog conserves */
export function energy(s: PlaneState, m: ArrayLike<number>, G: number): number {
  const n = s.x.length;
  let e = 0;
  for (let i = 0; i < n; i++) {
    e += 0.5 * m[i] * (s.vx[i] * s.vx[i] + s.vy[i] * s.vy[i]);
    e -= TAU * TAU * m[i] / Math.hypot(s.x[i], s.y[i]);
    for (let j = i + 1; j < n; j++)
      e -= G * TAU * TAU * m[i] * m[j] / Math.hypot(s.x[j] - s.x[i], s.y[j] - s.y[i]);
  }
  return e;
}

/* the shift in orbit fraction each body has accumulated by t1 from
   feeling the others since t0. The system is integrated twice from
   Kepler's state at t0 with time step dt (all three in ms): once with
   the mutual pull and once without, and each body's angle from the focus
   is differenced between the two. The integrator's own phase error is the
   same in both runs and cancels, so a coarse step still measures the
   pull and nothing else. Result in (−½, ½], per body. */
export function phasePerturbations(
  bodies: ReadonlyArray<MassiveBody>, t0: number, t1: number, dt: number, G = G_PLANETS,
): Float64Array {
  const n = bodies.length;
  const out = new Float64Array(n);
  if (!n || !(t1 > t0) || !(dt > 0)) return out;
  /* every body shares the fit, so k = T / a^{3/2} is one number */
  const k = bodies[0].el.T / Math.pow(bodies[0].el.a, 1.5);
  const m = bodies.map(b => b.m);
  const run = (g: number): PlaneState => {
    const s: PlaneState = { x: new Float64Array(n), y: new Float64Array(n),
                            vx: new Float64Array(n), vy: new Float64Array(n) };
    bodies.forEach((b, i) => {
      const [x, y, vx, vy] = keplerState(b.el, t0 / k, k);
      s.x[i] = x; s.y[i] = y; s.vx[i] = vx; s.vy[i] = vy;
    });
    const steps = Math.max(1, Math.round((t1 - t0) / dt));
    leapfrog(s, m, g, (t1 - t0) / k / steps, steps);
    return s;
  };
  const pulled = run(G), alone = run(0);
  for (let i = 0; i < n; i++) {
    let d = (Math.atan2(pulled.y[i], pulled.x[i]) - Math.atan2(alone.y[i], alone.x[i])) / TAU;
    d -= Math.round(d);
    out[i] = d;
  }
  return out;
}

function wrap(v: number): number {
  const r = v % TAU;
  return r < 0 ? r + TAU : r;
}
