/* Kepler's sky. A project's year of commits sets its semi-major axis; the
   axis sets its period by the third law, T = k·a^{3/2}; its language-space
   coordinates stretch and lean the orbit. Position comes the honest way:
   mean anomaly → Kepler's equation by Newton → true anomaly → the sky arc.
   Fit and residuals against the old linear rule: docs/kepler-orbits.md. */

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

/* the constants fitted once against the page's recorded periods */
export declare const FIT: KeplerFit;

export function elementsFrom(
  activity: number,       /* 0..1, the old log-activity act */
  langDistance: number,   /* 0..1, radius in language space */
  langLean: number,       /* -1..1, first principal coordinate */
  phase: number,          /* 0..1, the per-repo seeded phase */
  fit?: KeplerFit,
): Elements {
  throw new Error("todo: elementsFrom");
}

/* solve M = E − e·sin E for E; Newton, ≤ 8 iterations, |residual| < 1e-12 */
export function solveKepler(M: number, e: number): number {
  throw new Error("todo: solveKepler");
}

export function trueAnomaly(E: number, e: number): number {
  throw new Error("todo: trueAnomaly");
}

/* orbit fraction ν/2π in [0,1): up while < 0.5, like the old planetFrac */
export function orbitFrac(el: Elements, tms: number): number {
  throw new Error("todo: orbitFrac");
}

/* ms from tms until orbitFrac(el) next equals f — the almanac's
   "rises in" and the wound clock use this; exact through M(ν) */
export function timeToFrac(el: Elements, tms: number, f: number): number {
  throw new Error("todo: timeToFrac");
}

/* least squares of log T on log a over the old rule's (activity, period)
   samples: recovers k and the a-range that reproduces the 6h..46h spread */
export function fitKepler(samples: ReadonlyArray<{ activity: number; T: number }>): KeplerFit {
  throw new Error("todo: fitKepler");
}
