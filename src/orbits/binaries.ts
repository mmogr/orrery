/* Double planets: two projects whose daily commits rose and fell together
   this year, within a week of each other. Lagged cross-correlation with a
   Fisher-z significance threshold, greedily matched best-first so each repo
   joins at most one pair. Threshold derivation: docs/binaries.md. */
import { laggedCorrelation } from "../math/stats.ts";

export interface BinaryOpts {
  maxLag: number;         /* days, default 7 */
  minActiveDays: number;  /* both series must have this many non-zero days, default 8 */
  minR: number;           /* default 0.3 */
  minZ: number;           /* default 3.4 — Bonferroni-ish for ~55 repo pairs */
}

const DEFAULTS: BinaryOpts = { maxLag: 7, minActiveDays: 8, minR: 0.3, minZ: 3.4 };

export function findBinaries(
  series: ReadonlyArray<ArrayLike<number>>,
  opts?: Partial<BinaryOpts>,
): Array<{ a: number; b: number; lag: number; r: number }> {
  const o = { ...DEFAULTS, ...opts };

  /* a series that barely exists can't testify: demand a real history */
  const active: number[] = [];
  for (let i = 0; i < series.length; i++) {
    let days = 0;
    const s = series[i];
    for (let t = 0; t < s.length; t++) if (s[t] !== 0) days++;
    if (days >= o.minActiveDays) active.push(i);
  }

  /* every qualifying pair, best lag in ±maxLag; keep the ones both strong
     (|r|) and unlikely to be luck (|z|, two-sided) */
  const cands: Array<{ a: number; b: number; lag: number; r: number }> = [];
  for (let ai = 0; ai < active.length; ai++) {
    for (let bi = ai + 1; bi < active.length; bi++) {
      const a = active[ai], b = active[bi];
      const { lag, r, z } = laggedCorrelation(series[a], series[b], o.maxLag);
      if (Math.abs(r) >= o.minR && Math.abs(z) >= o.minZ) cands.push({ a, b, lag, r });
    }
  }

  /* strongest claims first; a repo already spoken for sits the rest out */
  cands.sort((p, q) => Math.abs(q.r) - Math.abs(p.r) || p.a - q.a || p.b - q.b);
  const taken = new Set<number>();
  const out: Array<{ a: number; b: number; lag: number; r: number }> = [];
  for (const c of cands) {
    if (taken.has(c.a) || taken.has(c.b)) continue;
    taken.add(c.a); taken.add(c.b);
    out.push(c);
  }
  return out;
}
