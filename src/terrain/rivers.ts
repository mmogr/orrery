/* Rivers: the way rain would leave the year. From each local maximum of the
   height field, trace the steepest descent — a second-order Runge–Kutta step
   down the negative gradient — until the ground flattens, the range ends, or
   the trace joins an earlier river. Each point carries its height so the
   painter can drape the line on the relief. docs/rivers.md. */
import type { Field } from "./heightfield.ts";

export interface RiverOpts {
  minPeak: number;    /* ignore maxima below this height */
  step: number;       /* RK2 step, cell units; default 0.25 */
  maxSteps: number;   /* default 80 */
  minSlope: number;   /* stop when |∇h| falls below; default 1e-3 */
  joinDist: number;   /* stop within this of an earlier trace; default 0.5 */
}

/* each river is a polyline of [x, y, h] in cell units */
export function traceRivers(f: Field, opts?: Partial<RiverOpts>): Array<Array<[number, number, number]>> {
  throw new Error("todo: traceRivers");
}
