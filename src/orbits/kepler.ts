/* Kepler's sky. A project's year of commits sets its semi-major axis; the
   axis sets its period by the third law, T = k·a^{3/2}; its language-space
   coordinates stretch and lean the orbit. Position comes the honest way:
   mean anomaly → Kepler's equation by Newton → true anomaly → the sky arc.

   The old page drew periods from a line: T = (46 − 40·act) hours, busy
   repos low and fast. A power law can't be a line, but it can hug one —
   the constants below are the least-squares fit of log T over the old
   rule's samples, worst off by 10.7% in log (at act = 1, where the line
   dives for 6h and the power law settles for 6.68h). Fit and residual
   table: docs/kepler-orbits.md. The old altitude rule, alt = 0.16 +
   (1 − act)·0.14, is not an element here — but a is affine in (1 − act),
   so altitude stays affine in a at the call site:
   alt = 0.16 + 0.14·(a − aMin)/(aMax − aMin). */

export interface Elements {
  a: number;      /* semi-major axis, dimensionless (aMin..aMax) */
  e: number;      /* eccentricity, 0..eMax */
  T: number;      /* period, ms */
  M0: number;     /* mean anomaly at epoch, rad */
  tilt: number;   /* arc lean, fraction of H */
}

export interface KeplerFit {
  aMin: number;
  aMax: number;
  k: number;      /* ms per a^1.5 */
  eMax: number;
}

const TAU = 2 * Math.PI;

/* the constants fitted once against the page's recorded periods —
   fitKepler(old rule sampled at act ∈ {0, 0.1, …, 1}), aMax normalised
   to 1 (the model is invariant under a → s·a, k → k/s^1.5, so one of
   the three must be pinned by convention) */
export const FIT: KeplerFit = {
  aMin: 0.261629,
  aMax: 1,
  k: 179627484,   /* ms: T(aMax) = 49.90h vs the old 46h; T(aMin) = 6.68h vs 6h */
  eMax: 0.2,
};

export function elementsFrom(
  activity: number,       /* 0..1, the old log-activity act */
  langDistance: number,   /* 0..1, radius in language space */
  langLean: number,       /* -1..1, first principal coordinate */
  phase: number,          /* 0..1, the per-repo seeded phase */
  fit: KeplerFit = FIT,
): Elements {
  /* busy = low = small a = fast, by the third law rather than by decree */
  const a = fit.aMin + (fit.aMax - fit.aMin) * (1 - activity);
  return {
    a,
    e: fit.eMax * langDistance,   /* an unusual mix stretches the orbit */
    T: fit.k * Math.pow(a, 1.5),
    M0: phase * TAU,
    tilt: 0.04 * langLean,        /* and leans it, a little */
  };
}

/* solve M = E − e·sin E for E; Newton from E = M, ≤ 8 iterations. For the
   eccentricities this sky wears (e ≤ 0.2) Newton is safely quadratic from
   that start; the residual assertion is the proof carried at runtime. */
export function solveKepler(M: number, e: number): number {
  let E = M;
  for (let i = 0; i < 8; i++) {
    const r = E - e * Math.sin(E) - M;
    if (r === 0) break;
    E -= r / (1 - e * Math.cos(E));
  }
  const residual = E - e * Math.sin(E) - M;
  if (!(Math.abs(residual) < 1e-12))
    throw new Error(`solveKepler did not converge: M=${M} e=${e} residual=${residual}`);
  return E;
}

/* eccentric → true anomaly, by the half-angle form (quadrant-safe) */
export function trueAnomaly(E: number, e: number): number {
  return 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2),
  );
}

/* true → eccentric anomaly, the exact inverse of the form above */
function eccentricAnomaly(nu: number, e: number): number {
  return 2 * Math.atan2(
    Math.sqrt(1 - e) * Math.sin(nu / 2),
    Math.sqrt(1 + e) * Math.cos(nu / 2),
  );
}

const wrap = (x: number, m: number) => ((x % m) + m) % m;

/* orbit fraction ν/2π in [0,1): up while < 0.5, like the old planetFrac —
   but no longer uniform in time: the planet lingers near apoapsis and
   hurries through periapsis, as it should */
export function orbitFrac(el: Elements, tms: number): number {
  const M = wrap(TAU * (tms / el.T) + el.M0, TAU);
  const E = solveKepler(M, el.e);
  return wrap(trueAnomaly(E, el.e) / TAU, 1);
}

/* ms from tms until orbitFrac(el) next equals f — the almanac's
   "rises in" and the wound clock use this; exact through M(ν), no
   root-finding: invert ν → E → M and difference the mean anomalies,
   which DO run uniformly. Result in (0, T]. */
export function timeToFrac(el: Elements, tms: number, f: number): number {
  const E = eccentricAnomaly(TAU * f, el.e);
  const Mtarget = wrap(E - el.e * Math.sin(E), TAU);
  const Mnow = wrap(TAU * (tms / el.T) + el.M0, TAU);
  let dM = wrap(Mtarget - Mnow, TAU);
  if (dM === 0) dM = TAU;                     /* "next", not "now" */
  return (dM / TAU) * el.T;
}

/* least squares of log T on log a over (activity, period) samples: the
   model is log T = log k + 1.5·log(aMin + (aMax − aMin)(1 − act)), which
   is invariant under rescaling a, so aMax is pinned to 1 and the two real
   parameters remain: the shape ρ = aMin/aMax and the scale k. ρ is found
   by a deterministic grid-plus-ternary search (the SSE is smooth in ρ);
   k falls out in closed form as the mean log residual. */
export function fitKepler(samples: ReadonlyArray<{ activity: number; T: number }>): KeplerFit {
  const sse = (rho: number): { e: number; c: number } => {
    let c = 0;
    for (const s of samples)
      c += Math.log(s.T) - 1.5 * Math.log(rho + (1 - rho) * (1 - s.activity));
    c /= samples.length;
    let e = 0;
    for (const s of samples) {
      const m = c + 1.5 * Math.log(rho + (1 - rho) * (1 - s.activity));
      e += (Math.log(s.T) - m) ** 2;
    }
    return { e, c };
  };
  const N = 2000;
  let bi = 1, be = Infinity;
  for (let i = 1; i < N; i++) {
    const { e } = sse(i / N);
    if (e < be) { be = e; bi = i; }
  }
  let lo = Math.max(1e-9, (bi - 1) / N), hi = Math.min(1 - 1e-9, (bi + 1) / N);
  for (let it = 0; it < 200; it++) {
    const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
    if (sse(m1).e < sse(m2).e) hi = m2; else lo = m1;
  }
  const rho = (lo + hi) / 2;
  return { aMin: rho, aMax: 1, k: Math.exp(sse(rho).c), eMax: 0.2 };
}
