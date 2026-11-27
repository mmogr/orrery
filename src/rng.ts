/* Seeded dice: a linear congruential generator, so every
   run of a model is a function of its inputs and nothing else. The constants
   are Numerical Recipes'; the stream never changes between versions, so a
   layout seeded rng(7) is the same layout wherever and whenever it is made. */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

/* a small string hash for seeding per-name streams (repo names, dates) */
export function strHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
