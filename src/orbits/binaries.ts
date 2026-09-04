/* Double planets: two projects whose daily commits rose and fell together
   this year, within a week of each other. The statistic is the strongest
   lagged cross-correlation in ±maxLag days; what it takes to count is a
   permutation test — the same statistic on years shifted against each
   other, which keeps every series' own rhythm and its zeros — and a
   Benjamini–Hochberg false-discovery rate over all the pairs asked at
   once. Greedy best-first matching so each repo joins at most one pair.
   Derivation: docs/binaries.md. */
import { laggedCorrelation, benjaminiHochberg } from "../math/stats.ts";
import { rng } from "../rng.ts";

export interface BinaryOpts {
  maxLag: number;         /* days, default 7 */
  minActiveDays: number;  /* both series must have this many non-zero days, default 8 */
  minR: number;           /* default 0.3: too weak to draw, however sure */
  fdr: number;            /* default 0.1: one pair in ten may be luck */
  permutations: number;   /* default 1000: draws for the pooled null */
  seed: number;           /* default 1: the draws are reproducible */
}

export interface Binary {
  a: number; b: number;
  lag: number;            /* positive: b trails a by this many days */
  r: number;
  p: number;              /* permutation p-value of |r| */
  q: number;              /* its Benjamini–Hochberg q-value over the roster */
}

const DEFAULTS: BinaryOpts = { maxLag: 7, minActiveDays: 8, minR: 0.3, fdr: 0.1, permutations: 1000, seed: 1 };

export function findBinaries(
  series: ReadonlyArray<ArrayLike<number>>,
  opts?: Partial<BinaryOpts>,
): Binary[] {
  const o = { ...DEFAULTS, ...opts };

  /* a series that barely exists can't testify: demand a real history */
  const active: number[] = [];
  for (let i = 0; i < series.length; i++) {
    let days = 0;
    const s = series[i];
    for (let t = 0; t < s.length; t++) if (s[t] !== 0) days++;
    if (days >= o.minActiveDays) active.push(i);
  }
  const pairs: Array<[number, number]> = [];
  for (let ai = 0; ai < active.length; ai++)
    for (let bi = ai + 1; bi < active.length; bi++) pairs.push([active[ai], active[bi]]);
  if (!pairs.length) return [];

  /* the observed statistic per pair */
  const obs = pairs.map(([a, b]) => laggedCorrelation(series[a], series[b], o.maxLag));

  /* the null, pooled over the roster: each draw takes the next pair in
     turn and shifts one series circularly by at least maxLag, so its own
     autocorrelation and its zeros survive but its alignment with the
     other does not; then the same best-of-lags |r| */
  const rnd = rng(o.seed);
  const stat = new Float64Array(o.permutations);
  for (let k = 0; k < o.permutations; k++) {
    const [a, b] = pairs[k % pairs.length];
    const sb = series[b], n = Math.min(series[a].length, sb.length);
    const room = n - 2 * o.maxLag;
    const shift = room > 0 ? o.maxLag + Math.floor(rnd() * room) : Math.floor(rnd() * Math.max(1, n));
    const shifted = new Float64Array(sb.length);
    for (let t = 0; t < sb.length; t++) shifted[t] = sb[(t + shift) % sb.length];
    stat[k] = Math.abs(laggedCorrelation(series[a], shifted, o.maxLag).r);
  }
  stat.sort();

  /* p with the +1 in both places: the observed year is one more draw
     from its own null, so no p is ever zero */
  const p = obs.map(({ r }) => {
    let lo = 0, hi = stat.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (stat[mid] < Math.abs(r)) lo = mid + 1; else hi = mid; }
    return (1 + stat.length - lo) / (1 + stat.length);
  });
  const q = benjaminiHochberg(p);

  /* strong enough to see, and unlikely enough to be luck; then the
     strongest claims first, and a repo already spoken for sits out */
  const cands: Binary[] = [];
  pairs.forEach(([a, b], i) => {
    if (Math.abs(obs[i].r) >= o.minR && q[i] <= o.fdr)
      cands.push({ a, b, lag: obs[i].lag, r: obs[i].r, p: p[i], q: q[i] });
  });
  cands.sort((x, y) => Math.abs(y.r) - Math.abs(x.r) || x.a - y.a || x.b - y.b);
  const taken = new Set<number>();
  const out: Binary[] = [];
  for (const c of cands) {
    if (taken.has(c.a) || taken.has(c.b)) continue;
    taken.add(c.a); taken.add(c.b);
    out.push(c);
  }
  return out;
}
