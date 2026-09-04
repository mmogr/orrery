/* Small statistics for short series, and a permutation test for two distance
   matrices. */
import { rng } from "../rng.ts";

/* z-scores: (x − mean) / sd (population); a zero-variance series comes
   back all zeros */
export function zscore(x: ArrayLike<number>): Float64Array {
  const n = x.length;
  const z = new Float64Array(n);
  if (!n) return z;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += x[i];
  mean /= n;
  let v = 0;
  for (let i = 0; i < n; i++) v += (x[i] - mean) ** 2;
  const sd = Math.sqrt(v / n);
  if (!sd) return z;
  for (let i = 0; i < n; i++) z[i] = (x[i] - mean) / sd;
  return z;
}

/* Pearson correlation of the overlap of a against b advanced by `lag`
   (pairs a[t], b[t + lag]); scans lag ∈ [−maxLag, maxLag] and returns the
   strongest |r|, with z the Fisher transform atanh(r)·√(overlap − 3).
   Positive lag: b trails a — what a did, b does `lag` steps later. */
export function laggedCorrelation(a: ArrayLike<number>, b: ArrayLike<number>, maxLag: number):
  { lag: number; r: number; z: number } {
  const n = Math.min(a.length, b.length);
  let best = { lag: 0, r: 0, z: 0 };
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    const from = Math.max(0, -lag), to = Math.min(n, n - lag);
    const m = to - from;
    if (m < 4) continue;
    let sa = 0, sb = 0;
    for (let t = from; t < to; t++) { sa += a[t]; sb += b[t + lag]; }
    sa /= m; sb /= m;
    let sab = 0, saa = 0, sbb = 0;
    for (let t = from; t < to; t++) {
      const da = a[t] - sa, db = b[t + lag] - sb;
      sab += da * db; saa += da * da; sbb += db * db;
    }
    if (!saa || !sbb) continue;
    const r = sab / Math.sqrt(saa * sbb);
    if (Math.abs(r) > Math.abs(best.r)) {
      const rc = Math.max(-0.999999, Math.min(0.999999, r));
      best = { lag, r, z: Math.atanh(rc) * Math.sqrt(Math.max(0, m - 3)) };
    }
  }
  return best;
}

/* Shannon entropy of a weight vector, in bits; weights need not be
   normalised, zeros contribute nothing, an empty or all-zero vector is 0 */
export function entropyBits(weights: ArrayLike<number>): number {
  let sum = 0;
  for (let i = 0; i < weights.length; i++) if (weights[i] > 0) sum += weights[i];
  if (!sum) return 0;
  let h = 0;
  for (let i = 0; i < weights.length; i++) {
    if (weights[i] <= 0) continue;
    const p = weights[i] / sum;
    h -= p * Math.log2(p);
  }
  return h;
}

/* Benjamini–Hochberg: q-values for a vector of p-values. Sort ascending,
   scale the i-th by m/i, take the running minimum from the top so q is
   monotone in p, clamp to one, and hand each back in its own slot. A
   discovery at q ≤ α is one of a set whose expected false share is α. */
export function benjaminiHochberg(p: ArrayLike<number>): Float64Array {
  const m = p.length;
  const order = Array.from({ length: m }, (_, i) => i).sort((a, b) => p[a] - p[b]);
  const q = new Float64Array(m);
  let running = 1;
  for (let rank = m; rank >= 1; rank--) {
    const i = order[rank - 1];
    running = Math.min(running, p[i] * m / rank);
    q[i] = running;
  }
  return q;
}

/* ranks with ties averaged: the rank of a value is the mean position it
   and its equals occupy in the sorted order, 1-based */
export function ranks(x: ArrayLike<number>): Float64Array {
  const n = x.length;
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => x[a] - x[b]);
  const r = new Float64Array(n);
  for (let i = 0; i < n;) {
    let j = i;
    while (j + 1 < n && x[order[j + 1]] === x[order[i]]) j++;
    const mean = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[order[k]] = mean;
    i = j + 1;
  }
  return r;
}

/* Pearson correlation of two equal-length series; 0 where either has no
   variance */
export function pearson(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  let ma = 0, mb = 0;
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
  ma /= n; mb /= n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - ma, db = b[i] - mb;
    sab += da * db; saa += da * da; sbb += db * db;
  }
  return saa && sbb ? sab / Math.sqrt(saa * sbb) : 0;
}

/* Spearman's rank correlation: Pearson on tie-averaged ranks */
export function spearman(a: ArrayLike<number>, b: ArrayLike<number>): number {
  return pearson(ranks(a), ranks(b));
}

export interface MantelOpts { permutations: number; seed: number }
export const MANTEL_DEFAULTS: MantelOpts = { permutations: 200, seed: 1 };

/* Mantel's test between two n×n distance matrices (row-major, symmetric):
   Spearman over the n(n−1)/2 pairs above the diagonal, against the null
   that the labels of one matrix carry no information about the other —
   relabel B's nodes at random and correlate again. Relabelling permutes
   which pair carries which rank but not the ranks themselves, so both
   matrices are ranked once and each permutation is a re-indexed dot
   product. p is one-sided: the share of relabellings that agree at least
   as well as the truth, plus one, over N + 1, as the binaries' null does.
   Fewer than three nodes, or a matrix with no variance, is no test at
   all: ρ = 0, p = 1. */
export function mantel(dA: ArrayLike<number>, dB: ArrayLike<number>, n: number,
                       opts: Partial<MantelOpts> = {}): { rho: number; p: number } {
  const { permutations, seed } = { ...MANTEL_DEFAULTS, ...opts };
  const m = n * (n - 1) / 2;
  if (n < 3) return { rho: 0, p: 1 };
  const a = new Float64Array(m), b = new Float64Array(m);
  for (let i = 0, k = 0; i < n; i++)
    for (let j = i + 1; j < n; j++, k++) { a[k] = dA[i * n + j]; b[k] = dB[i * n + j]; }
  const ra = ranks(a), rb = ranks(b);
  /* ranks of A back on the full matrix, so a relabelled pair reads its rank
     by (πi, πj) */
  const RA = new Float64Array(n * n);
  for (let i = 0, k = 0; i < n; i++)
    for (let j = i + 1; j < n; j++, k++) { RA[i * n + j] = ra[k]; RA[j * n + i] = ra[k]; }
  const mean = (m + 1) / 2;          /* every rank vector shares the mean of 1..m */
  let va = 0, vb = 0;
  for (let k = 0; k < m; k++) { va += (ra[k] - mean) ** 2; vb += (rb[k] - mean) ** 2; }
  if (!va || !vb) return { rho: 0, p: 1 };
  const norm = Math.sqrt(va * vb);
  const corr = (perm: Int32Array | null): number => {
    let s = 0;
    for (let i = 0, k = 0; i < n; i++)
      for (let j = i + 1; j < n; j++, k++) {
        const r = perm ? RA[perm[i] * n + perm[j]] : ra[k];
        s += (r - mean) * (rb[k] - mean);
      }
    return s / norm;
  };
  const rho = corr(null);
  const rnd = rng(seed);
  const perm = new Int32Array(n);
  let atLeast = 0;
  for (let t = 0; t < permutations; t++) {
    for (let i = 0; i < n; i++) perm[i] = i;
    for (let i = n - 1; i > 0; i--) {          /* Fisher–Yates */
      const j = Math.floor(rnd() * (i + 1));
      const tmp = perm[i]; perm[i] = perm[j]; perm[j] = tmp;
    }
    if (corr(perm) >= rho) atLeast++;
  }
  return { rho, p: (1 + atLeast) / (1 + permutations) };
}
