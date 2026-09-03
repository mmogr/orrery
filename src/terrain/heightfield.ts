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
  throw new Error("todo: cornerHeights");
}

/* bilinear height at (x, y) in cell units, clamped to the field */
export function sample(f: Field, x: number, y: number): number {
  throw new Error("todo: sample");
}

/* analytic gradient of the bilinear patch at (x, y): [dh/dx, dh/dy] */
export function gradient(f: Field, x: number, y: number): [number, number] {
  throw new Error("todo: gradient");
}
