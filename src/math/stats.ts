/* Small statistics for short series. */

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
