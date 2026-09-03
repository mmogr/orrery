/* The discrete Fourier transform of a short real series — 53 weeks needs no
   FFT. The mean is removed first, so power at k measures rhythm, not level. */

/* power spectrum for k = 1..⌊N/2⌋; periods[k-1] = N/k, in the series' own
   step unit */
export function dft(x: ArrayLike<number>): { power: Float64Array; periods: Float64Array } {
  const n = x.length;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += x[i];
  mean /= n || 1;
  const K = n >> 1;
  const power = new Float64Array(K);
  const periods = new Float64Array(K);
  for (let k = 1; k <= K; k++) {
    let re = 0, im = 0;
    for (let t = 0; t < n; t++) {
      const v = x[t] - mean, a = (2 * Math.PI * k * t) / n;
      re += v * Math.cos(a);
      im -= v * Math.sin(a);
    }
    power[k - 1] = re * re + im * im;
    periods[k - 1] = n / k;
  }
  return { power, periods };
}

/* the dominant rhythm: the spectrum's peak, if it stands clear of the
   next-largest by a factor of two — otherwise null: no one rhythm */
export function dominantRhythm(x: ArrayLike<number>): { period: number; power: number; ratio: number } | null {
  const { power, periods } = dft(x);
  if (power.length < 4) return null;
  let top = 0;
  for (let i = 1; i < power.length; i++) if (power[i] > power[top]) top = i;
  let second = 0;
  for (let i = 0; i < power.length; i++)
    if (i !== top && power[i] > second) second = power[i];
  if (!power[top]) return null;
  const ratio = second ? power[top] / second : Infinity;
  if (ratio < 2) return null;
  return { period: periods[top], power: power[top], ratio };
}
