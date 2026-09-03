/* The moon, honestly. meanAge is the page's old fixed-epoch modulo — kept as
   the reference the ephemeris is measured against. phaseAge finds the true
   age: the k-th new moon by Meeus's polynomial (Astronomical Algorithms,
   ch. 49) with the E-corrected periodic terms large enough to matter — the
   sixteen principal terms are kept, the fourteen planetary A-terms (worst
   case under a millidays' worth each, ~0.0009 d in concert) are dropped, as
   is ΔT (~0.0008 d this era). Target error under 0.05 day against the
   almanac tables in docs/moon.md. */
export const SYNODIC = 29.53058867;

const DAY = 86400000;
const RAD = Math.PI / 180;
/* the page's epoch: the new moon of 2000-01-06 18:14 UTC, as a unix ms */
const EPOCH = 947182440000;
/* unix epoch as a Julian Date; JD = ms/DAY + this */
const JD_UNIX = 2440587.5;

/* the old model: days since the epoch new moon, mod one lunation */
export function meanAge(ms: number): number {
  return ((((ms - EPOCH) / DAY) % SYNODIC) + SYNODIC) % SYNODIC;
}

/* the instant (unix ms) of the k-th new moon after January 2000, by the
   Meeus series: the mean phase polynomial, then the periodic corrections
   driven by the sun's and moon's anomalies, the argument of latitude, and
   the node — all E-weighted where the eccentricity of Earth's orbit says
   they should be */
function newMoonMs(k: number): number {
  const T = k / 1236.85;
  let jde = 2451550.09766
    + 29.530588861 * k
    + 0.00015437 * T * T
    - 0.000000150 * T * T * T
    + 0.00000000073 * T * T * T * T;
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  const M = (2.5534 + 29.10535670 * k
    - 0.0000014 * T * T - 0.00000011 * T * T * T) * RAD;             /* sun */
  const Mp = (201.5643 + 385.81693528 * k
    + 0.0107582 * T * T + 0.00001238 * T * T * T
    - 0.000000058 * T * T * T * T) * RAD;                            /* moon */
  const F = (160.7108 + 390.67050284 * k
    - 0.0016118 * T * T - 0.00000227 * T * T * T
    + 0.000000011 * T * T * T * T) * RAD;                            /* latitude */
  const Om = (124.7746 - 1.56375588 * k
    + 0.0020672 * T * T + 0.00000215 * T * T * T) * RAD;             /* node */
  jde +=
    - 0.40720 * Math.sin(Mp)
    + 0.17241 * E * Math.sin(M)
    + 0.01608 * Math.sin(2 * Mp)
    + 0.01039 * Math.sin(2 * F)
    + 0.00739 * E * Math.sin(Mp - M)
    - 0.00514 * E * Math.sin(Mp + M)
    + 0.00208 * E * E * Math.sin(2 * M)
    - 0.00111 * Math.sin(Mp - 2 * F)
    - 0.00057 * Math.sin(Mp + 2 * F)
    + 0.00056 * E * Math.sin(2 * Mp + M)
    - 0.00042 * Math.sin(3 * Mp)
    + 0.00042 * E * Math.sin(M + 2 * F)
    + 0.00038 * E * Math.sin(M - 2 * F)
    - 0.00024 * E * Math.sin(2 * Mp - M)
    - 0.00017 * Math.sin(Om)
    - 0.00007 * Math.sin(Mp + 2 * M);
  return (jde - JD_UNIX) * DAY;
}

/* the true age in days since the actual preceding new moon: guess k from
   the Julian-year count of lunations since 2000, then walk it until
   JDE(k) ≤ ms < JDE(k+1) — the guess is off by one near the seam, never
   more, but the loops make the bracketing a fact rather than a hope */
export function phaseAge(ms: number): number {
  const year = 2000 + (ms / DAY + JD_UNIX - 2451545.0) / 365.25;
  let k = Math.round((year - 2000) * 12.3685);
  while (newMoonMs(k) > ms) k--;
  while (newMoonMs(k + 1) <= ms) k++;
  return (ms - newMoonMs(k)) / DAY;
}

/* the eight-phase name the legend uses, from an age in days —
   the same strings, the same rounding bucket */
const PHASES = ["new moon", "waxing crescent", "first quarter", "waxing gibbous",
                "full moon", "waning gibbous", "last quarter", "waning crescent"] as const;
export function phaseName(age: number): string {
  return PHASES[((Math.round(age / SYNODIC * 8) % 8) + 8) % 8];
}

/* the page's illumination terms: k = cos(2π·age/SYNODIC), 1 new → −1 full,
   and full = smoothstep of the wash-out window near full — the moonlight
   only starts drowning the faint stars in the last 7% of the approach */
export function illumination(age: number): { k: number; full: number } {
  const k = Math.cos(2 * Math.PI * age / SYNODIC);
  const x = ((1 - k) / 2 - 0.93) / 0.06;
  const full = x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  return { k, full };
}
