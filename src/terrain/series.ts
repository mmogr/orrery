/* The year as a signal. Weekly sums, Gaussian-smoothed level, first and
   second derivatives (velocity and acceleration of the work), the
   inflections where the tide turned, and momentum — the standing of the
   latest velocity against the year's own spread. docs/momentum-aurora.md. */
import { gaussianKernel, convolveReflect } from "../math/kernels.ts";

/* weekly sums from a daily series, exactly as the terrain bins days:
   weeks of seven from index 0, the last partial week kept, ⌈n/7⌉ out.
   The site hands this the terrain-aligned days — index 0 is the Sunday
   opening the year's first column — so the chunks are Sunday-anchored. */
export function weekly(days: ArrayLike<number>): Float64Array {
  const n = days.length, out = new Float64Array(Math.ceil(n / 7));
  for (let i = 0; i < n; i++) out[(i / 7) | 0] += days[i];
  return out;
}

/* the level and its first two derivatives, all from one Gaussian: smooth
   with the order-0 kernel, differentiate with the order-1 and order-2
   forms, reflecting at the ends so the estimate holds to the edges */
export function smoothed(x: ArrayLike<number>, sigma = 1.5):
  { s: Float64Array; d1: Float64Array; d2: Float64Array } {
  return {
    s: convolveReflect(x, gaussianKernel(sigma, 0)),
    d1: convolveReflect(x, gaussianKernel(sigma, 1)),
    d2: convolveReflect(x, gaussianKernel(sigma, 2)),
  };
}

/* indices where d2 changes sign while the pace |d1| is above floor: the
   weeks the year genuinely turned, not the ones it merely idled through */
export function inflections(d1: Float64Array, d2: Float64Array, floor: number): number[] {
  const out: number[] = [];
  for (let i = 1; i < d2.length; i++) {
    const a = Math.sign(d2[i - 1]), b = Math.sign(d2[i]);
    if (a && b && a !== b && Math.abs(d1[i]) > floor) out.push(i);
  }
  return out;
}

/* d1's latest value over its own (population) standard deviation, clipped
   to [-1, 1] — a z-score of now against the year; a flat year scores 0 */
export function momentum(d1: Float64Array): number {
  const n = d1.length;
  if (!n) return 0;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += d1[i];
  mean /= n;
  let v = 0;
  for (let i = 0; i < n; i++) v += (d1[i] - mean) ** 2;
  const sd = Math.sqrt(v / n);
  if (!sd) return 0;
  return Math.max(-1, Math.min(1, d1[n - 1] / sd));
}
