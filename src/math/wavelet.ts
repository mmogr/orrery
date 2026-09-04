/* The year's beat, resolved in time: a continuous wavelet transform of a
   short series by direct convolution with the Morlet wavelet. The DFT in
   dft.ts says which rhythm a year had; the scalogram says when it had it,
   and the ridge reads off, week by week, the period that beat loudest.
   Fifty-three weeks need no FFT here either — O(n²·scales) is nothing. */

/* the Morlet centre frequency: 6 is the conventional choice, the smallest
   at which the wavelet is admissible without a correction term (its mean
   is e^{-18}, nothing) while still holding a few cycles under the bell */
const OMEGA0 = 6;
/* the Gaussian envelope is dropped beyond this many scales, where it has
   fallen below e^{-8} — the same truncation the smoothing kernels use */
const SUPPORT = 4;
/* the e-folding time of the wavelet's energy, in scales: |ψ|² has fallen
   by e at t = √2·s, the conventional edge of the cone of influence */
const EFOLD = Math.SQRT2;

/* the Fourier period a Morlet of scale s answers to:
   λ = 4πs / (ω0 + √(2 + ω0²)), so scale 1 is about 1.03 samples */
export function morletPeriod(scale: number, omega0 = OMEGA0): number {
  return (4 * Math.PI * scale) / (omega0 + Math.sqrt(2 + omega0 * omega0));
}

/* log-spaced scales whose periods run from 2 samples (Nyquist: shorter
   cannot be sampled) to n/2 (longer cannot fit twice in the series) */
export function morletScales(n: number, count = 24): Float64Array {
  const lo = 2 / morletPeriod(1), hi = n / 2 / morletPeriod(1);
  const out = new Float64Array(count);
  for (let i = 0; i < count; i++)
    out[i] = lo * Math.pow(hi / lo, count > 1 ? i / (count - 1) : 0);
  return out;
}

/* the wavelet power |W(s, t)|², scales.length × n row-major by scale, of
   the mean-removed series reflected at both ends, each wavelet scaled by
   1/√s so scales compare, the whole divided by the series' (population)
   variance so a busy year and a quiet one with the same shape score the
   same — and a flat series scores zero everywhere, not NaN. coi[t] is
   the largest scale still trustworthy at t: the biggest with √2·s within
   reach of both ends, 0 if none is */
export function scalogram(x: ArrayLike<number>, scales: ArrayLike<number>, omega0 = OMEGA0):
  { power: Float64Array; coi: Float64Array } {
  const n = x.length, S = scales.length;
  const power = new Float64Array(S * n), coi = new Float64Array(n);
  let mean = 0;
  for (let t = 0; t < n; t++) mean += x[t];
  mean /= n || 1;
  let variance = 0;
  for (let t = 0; t < n; t++) variance += (x[t] - mean) ** 2;
  variance /= n || 1;
  for (let t = 0; t < n; t++) {
    const reach = Math.min(t, n - 1 - t);
    for (let k = 0; k < S; k++)
      if (EFOLD * scales[k] <= reach && scales[k] > coi[t]) coi[t] = scales[k];
  }
  if (!variance) return { power, coi };
  const at = (j: number): number => {
    while (j < 0 || j >= n) j = j < 0 ? -j : 2 * n - 2 - j;
    return x[j] - mean;
  };
  for (let k = 0; k < S; k++) {
    const s = scales[k], h = Math.ceil(SUPPORT * s);
    /* ψ*(u) = π^{-1/4} e^{-u²/2} e^{-iω0 u} at u = i/s, tabulated once
       per scale; the 1/√s rides along in the amplitude */
    const re = new Float64Array(2 * h + 1), im = new Float64Array(2 * h + 1);
    for (let i = -h; i <= h; i++) {
      const u = i / s, a = Math.exp(-u * u / 2) / Math.sqrt(s * Math.sqrt(Math.PI));
      re[h + i] = a * Math.cos(omega0 * u);
      im[h + i] = -a * Math.sin(omega0 * u);
    }
    for (let t = 0; t < n; t++) {
      let wr = 0, wi = 0;
      for (let i = -h; i <= h; i++) {
        const v = at(t + i);
        wr += re[h + i] * v;
        wi += im[h + i] * v;
      }
      power[k * n + t] = (wr * wr + wi * wi) / variance;
    }
  }
  return { power, coi };
}

/* the ridge: per sample, the period (in samples) of the strongest scale
   outside the cone and its power. A peak pinned against the cone is not
   a peak — the true one lies in the untrustworthy scales — so both are 0
   there, as they are where every scale is inside the cone or nothing
   beats at all. An interior peak is refined by the parabola through it
   and its two neighbours in log-scale, so the period is not quantised to
   the grid */
export function ridge(sg: { power: Float64Array; coi: Float64Array }, scales: ArrayLike<number>, n: number):
  { period: Float64Array; power: Float64Array } {
  const S = scales.length;
  const period = new Float64Array(n), power = new Float64Array(n);
  for (let t = 0; t < n; t++) {
    let top = -1, edge = -1;
    for (let k = 0; k < S; k++) {
      if (scales[k] > sg.coi[t]) continue;
      edge = k;
      if (top < 0 || sg.power[k * n + t] > sg.power[top * n + t]) top = k;
    }
    const p0 = top < 0 ? 0 : sg.power[top * n + t];
    if (!p0 || top === edge) continue;
    let s = scales[top];
    if (top > 0) {
      const lo = sg.power[(top - 1) * n + t], hi = sg.power[(top + 1) * n + t];
      const curve = lo - 2 * p0 + hi;
      if (curve) s *= Math.pow(scales[top + 1] / scales[top - 1], (lo - hi) / (4 * curve));
    }
    period[t] = morletPeriod(s);
    power[t] = p0;
  }
  return { period, power };
}
