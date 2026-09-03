/* The year as a signal. Weekly sums, Gaussian-smoothed level, first and
   second derivatives (velocity and acceleration of the work), the
   inflections where the tide turned, and momentum — the standing of the
   latest velocity against the year's own spread. docs/momentum-aurora.md. */
import { gaussianKernel, convolveReflect } from "../math/kernels.ts";

/* 53 Sunday-anchored weekly sums from a daily series, as the terrain bins */
export function weekly(days: ArrayLike<number>): Float64Array {
  throw new Error("todo: weekly");
}

export function smoothed(x: ArrayLike<number>, sigma?: number):
  { s: Float64Array; d1: Float64Array; d2: Float64Array } {
  throw new Error("todo: smoothed");
}

/* indices where d2 changes sign while the pace |d1| is above floor */
export function inflections(d1: Float64Array, d2: Float64Array, floor: number): number[] {
  throw new Error("todo: inflections");
}

/* d1's latest value over its own standard deviation, clipped to [-1, 1] */
export function momentum(d1: Float64Array): number {
  throw new Error("todo: momentum");
}

void gaussianKernel; void convolveReflect;   /* stubs; the implementation uses these */
