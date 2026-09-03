/* The range as a field. Cell heights (7 rows of days × N week columns)
   become shared corner heights — the mean of the up-to-four touching cells,
   off-range neighbours counted as sea level — and the field is bilinear
   between corners, so it has a height and a gradient everywhere, not just
   at bar centres. Coordinates: x along columns, y along rows, both in cell
   units; heights in the caller's unit. */
export interface Field {
  cols: number;
  rows: number;                /* 7 */
  h: Float64Array;             /* (rows+1) × (cols+1), row-major corners */
}

export function cornerHeights(
  cellH: ArrayLike<number>,
  idxAt: (row: number, col: number) => number,   /* -1 where no day */
  cols: number,
  rows?: number,
): Field {
  const R = rows ?? 7;
  const h = new Float64Array((R + 1) * (cols + 1));
  for (let r = 0; r <= R; r++) {
    for (let c = 0; c <= cols; c++) {
      /* the corner belongs to up to four cells; absent ones are sea level,
         and the divisor stays four — exactly the page's cornerH */
      let s = 0;
      for (const [rr, cc] of [[r - 1, c - 1], [r - 1, c], [r, c - 1], [r, c]]) {
        const ii = rr >= 0 && rr < R && cc >= 0 && cc < cols ? idxAt(rr, cc) : -1;
        if (ii >= 0) s += cellH[ii];
      }
      h[r * (cols + 1) + c] = s / 4;
    }
  }
  return { cols, rows: R, h };
}

/* bilinear height at (x, y) in cell units, clamped to the field */
export function sample(f: Field, x: number, y: number): number {
  const xx = Math.min(f.cols, Math.max(0, x));
  const yy = Math.min(f.rows, Math.max(0, y));
  const c = Math.min(f.cols - 1, Math.floor(xx));
  const r = Math.min(f.rows - 1, Math.floor(yy));
  const u = xx - c, v = yy - r, w = f.cols + 1;
  const h00 = f.h[r * w + c], h10 = f.h[r * w + c + 1];
  const h01 = f.h[(r + 1) * w + c], h11 = f.h[(r + 1) * w + c + 1];
  return h00 * (1 - u) * (1 - v) + h10 * u * (1 - v)
       + h01 * (1 - u) * v + h11 * u * v;
}

/* analytic gradient of the bilinear patch at (x, y): [dh/dx, dh/dy] —
   piecewise per cell, exact within each patch */
export function gradient(f: Field, x: number, y: number): [number, number] {
  const xx = Math.min(f.cols, Math.max(0, x));
  const yy = Math.min(f.rows, Math.max(0, y));
  const c = Math.min(f.cols - 1, Math.floor(xx));
  const r = Math.min(f.rows - 1, Math.floor(yy));
  const u = xx - c, v = yy - r, w = f.cols + 1;
  const h00 = f.h[r * w + c], h10 = f.h[r * w + c + 1];
  const h01 = f.h[(r + 1) * w + c], h11 = f.h[(r + 1) * w + c + 1];
  return [
    (h10 - h00) * (1 - v) + (h11 - h01) * v,
    (h01 - h00) * (1 - u) + (h11 - h10) * u,
  ];
}
