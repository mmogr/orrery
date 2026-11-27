/* Kepler's problem. A body on an ellipse about a fixed focus does not move
   uniformly: its mean anomaly M runs evenly in time, and its place on the
   orbit comes the honest way, mean anomaly → Kepler's equation by Newton →
   eccentric anomaly → true anomaly. The period follows the semi-major axis
   by the third law, T = k·a^{3/2}, with k the caller's unit of time.
   See docs/kepler.md. */

export interface Elements {
  a: number;      /* semi-major axis, in the caller's unit of length */
  e: number;      /* eccentricity, 0 ≤ e < 1 */
  T: number;      /* period, in the caller's unit of time: k·a^{3/2} by the third law */
  M0: number;     /* mean anomaly at epoch, rad */
}

const TAU = 2 * Math.PI;

/* solve M = E − e·sin E for E; Newton from E = M, ≤ 8 iterations. For
   modest eccentricities (tested to e = 0.2) Newton is safely quadratic from
   that start; a high one may need more, and the residual check throws
   rather than hand back an anomaly that does not satisfy the equation. */
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

/* orbit fraction ν/2π in [0,1) at time t: not uniform in time, since the
   body lingers near apoapsis and hurries through periapsis */
export function orbitFrac(el: Elements, tms: number): number {
  const M = wrap(TAU * (tms / el.T) + el.M0, TAU);
  const E = solveKepler(M, el.e);
  return wrap(trueAnomaly(E, el.e) / TAU, 1);
}

/* the time from tms until orbitFrac(el) next equals f. Exact through M(ν),
   no root-finding: invert ν → E → M and difference the mean anomalies,
   which do run uniformly. Result in (0, T]. */
export function timeToFrac(el: Elements, tms: number, f: number): number {
  const E = eccentricAnomaly(TAU * f, el.e);
  const Mtarget = wrap(E - el.e * Math.sin(E), TAU);
  const Mnow = wrap(TAU * (tms / el.T) + el.M0, TAU);
  let dM = wrap(Mtarget - Mnow, TAU);
  if (dM === 0) dM = TAU;                     /* "next", not "now" */
  return (dM / TAU) * el.T;
}
