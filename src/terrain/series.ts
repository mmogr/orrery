/* The year as a signal. Weekly sums, Gaussian-smoothed level, first and
   second derivatives (velocity and acceleration of the work), the
   inflections where the tide turned, and momentum — the standing of the
   latest velocity against the year's own spread. docs/momentum-aurora.md. */
import { gaussianKernel, convolveReflect } from "../math/kernels.ts";

/* weekly sums from a daily series: chunks of seven from index 0, the last
   partial week kept, ⌈n/7⌉ out. What a chunk means is the caller's to
   arrange — hand it days whose index 0 opens a calendar week and the sums
   are that calendar's weeks; hand it an arbitrary window and they are only
   sevens. This module knows no calendar. A caller that already has the
   terrain's own column sums should pass those instead. */
export function weekly(days: ArrayLike<number>): Float64Array {
  const n = days.length, out = new Float64Array(Math.ceil(n / 7));
  for (let i = 0; i < n; i++) out[(i / 7) | 0] += days[i];
  return out;
}

/* the level and its first two derivatives, all from one Gaussian: smooth
   with the order-0 kernel, differentiate with the order-1 and order-2
   forms, extending past the ends so each estimate holds to the edges.
   The extension is chosen per order, opposite the kernel's parity: the even
   orders mirror the samples, the odd one reflects through the endpoint. An
   even mirror under the order-1 kernel would report a dead stop in the last
   week of every year. */
export function smoothed(x: ArrayLike<number>, sigma = 1.5):
  { s: Float64Array; d1: Float64Array; d2: Float64Array } {
  return {
    s: convolveReflect(x, gaussianKernel(sigma, 0)),
    d1: convolveReflect(x, gaussianKernel(sigma, 1), true),
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
