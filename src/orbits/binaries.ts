/* Double planets: two projects whose daily commits rose and fell together
   this year, within a week of each other. Lagged cross-correlation with a
   Fisher-z significance threshold, greedily matched best-first so each repo
   joins at most one pair. Threshold derivation: docs/binaries.md. */

export interface BinaryOpts {
  maxLag: number;         /* days, default 7 */
  minActiveDays: number;  /* both series must have this many non-zero days, default 8 */
  minR: number;           /* default 0.3 */
  minZ: number;           /* default 3.4 — Bonferroni-ish for ~55 repo pairs */
}

export function findBinaries(
  series: ReadonlyArray<ArrayLike<number>>,
  opts?: Partial<BinaryOpts>,
): Array<{ a: number; b: number; lag: number; r: number }> {
  throw new Error("todo: findBinaries");
}
