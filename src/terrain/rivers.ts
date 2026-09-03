/* Rivers: the way rain would leave the year. From each local maximum of the
   height field, trace the steepest descent — a second-order Runge–Kutta step
   down the negative gradient — until the ground flattens, the range ends, or
   the trace joins an earlier river. Each point carries its height so the
   painter can drape the line on the relief. docs/rivers.md. */
import { type Field, sample, gradient } from "./heightfield.ts";

export interface RiverOpts {
  minPeak: number;    /* ignore maxima below this height */
  step: number;       /* RK2 step, cell units; default 0.25 */
  maxSteps: number;   /* default 80 */
  minSlope: number;   /* stop when |∇h| falls below; default 1e-3 */
  joinDist: number;   /* stop within this of an earlier trace; default 0.5 */
}

const DEFAULTS: RiverOpts = { minPeak: 0, step: 0.25, maxSteps: 80, minSlope: 1e-3, joinDist: 0.5 };

/* each river is a polyline of [x, y, h] in cell units */
export function traceRivers(f: Field, opts?: Partial<RiverOpts>): Array<Array<[number, number, number]>> {
  const o = { ...DEFAULTS, ...opts };

  /* springs: cell centres at least as high as all eight neighbouring
     centres (ties count — a ridge line still sheds water) and above the
     floor the caller cares about */
  const peaks: Array<{ x: number; y: number; h: number }> = [];
  for (let r = 0; r < f.rows; r++) {
    for (let c = 0; c < f.cols; c++) {
      const x = c + 0.5, y = r + 0.5;
      const h = sample(f, x, y);
      if (h < o.minPeak) continue;
      let top = true;
      for (let dr = -1; dr <= 1 && top; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const rr = r + dr, cc = c + dc;
          if (rr < 0 || rr >= f.rows || cc < 0 || cc >= f.cols) continue;
          if (sample(f, cc + 0.5, rr + 0.5) > h) { top = false; break; }
        }
      if (top) peaks.push({ x, y, h });
    }
  }
  peaks.sort((a, b) => b.h - a.h);   /* the tallest carves its valley first */

  const rivers: Array<Array<[number, number, number]>> = [];
  const joins = (x: number, y: number): boolean => {
    const d2 = o.joinDist * o.joinDist;
    for (const river of rivers)
      for (const [px, py] of river)
        if ((px - x) ** 2 + (py - y) ** 2 <= d2) return true;
    return false;
  };

  for (const peak of peaks) {
    let x = peak.x, y = peak.y;
    const trace: Array<[number, number, number]> = [[x, y, peak.h]];
    for (let s = 0; s < o.maxSteps; s++) {
      /* RK2 (midpoint): probe half a step down the slope, then commit a
         full step along the direction found there — the trace hugs curved
         valleys instead of ricocheting off them */
      const [gx, gy] = gradient(f, x, y);
      const g = Math.hypot(gx, gy);
      if (g < o.minSlope) break;                       /* the ground flattened */
      const mx = x - (o.step / 2) * (gx / g), my = y - (o.step / 2) * (gy / g);
      const [hx, hy] = gradient(f, mx, my);
      const m = Math.hypot(hx, hy);
      if (m === 0) break;                              /* the probe found dead flat */
      x -= o.step * (hx / m);
      y -= o.step * (hy / m);
      if (x < 0 || x > f.cols || y < 0 || y > f.rows) break;   /* off the range */
      trace.push([x, y, sample(f, x, y)]);
      if (joins(x, y)) break;                          /* met an earlier river */
    }
    rivers.push(trace);
  }
  return rivers;
}
