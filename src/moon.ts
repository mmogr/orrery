/* The moon, honestly. meanAge is the page's old fixed-epoch modulo — kept as
   the reference the ephemeris is measured against. phaseAge finds the true
   age: the k-th new moon by Meeus's polynomial with the E-corrected periodic
   terms large enough to matter, target error under 0.05 day against the
   almanac tables in docs/moon.md. */
export const SYNODIC = 29.53058867;

/* the old model: days since the epoch new moon, mod one lunation */
export function meanAge(ms: number): number {
  throw new Error("todo: meanAge");
}

/* the true age in days since the actual preceding new moon */
export function phaseAge(ms: number): number {
  throw new Error("todo: phaseAge");
}

/* the eight-phase name the legend uses, from an age in days */
export function phaseName(age: number): string {
  throw new Error("todo: phaseName");
}

/* the page's illumination terms: k = cos(2π·age/SYNODIC), 1 new → −1 full,
   and full = smoothstep of the wash-out window near full */
export function illumination(age: number): { k: number; full: number } {
  throw new Error("todo: illumination");
}
