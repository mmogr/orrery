/* Gaussian smoothing kernels and their derivative forms: one parameter,
   closed-form shapes, no edge polynomial fitting. Convolving with the
   order-0 kernel smooths; order 1 estimates the first derivative per unit
   step; order 2 the second. Each kernel is normalised so the estimate has
   unit gain: order 0 sums to one, order 1 recovers the slope of a ramp,
   order 2 the curvature of a parabola. */
export function gaussianKernel(sigma: number, order: 0 | 1 | 2): Float64Array {
  const h = Math.max(1, Math.ceil(4 * sigma));
  const g = new Float64Array(2 * h + 1);
  for (let i = -h; i <= h; i++) g[h + i] = Math.exp(-(i * i) / (2 * sigma * sigma));

  const k = new Float64Array(2 * h + 1);
  if (order === 0) {
    let sum = 0;
    for (const v of g) sum += v;
    for (let i = 0; i < k.length; i++) k[i] = g[i] / sum;
    return k;
  }
  if (order === 1) {
    /* i·G(i), scaled so a unit ramp answers with slope one */
    let norm = 0;
    for (let i = -h; i <= h; i++) norm += i * i * g[h + i];
    for (let i = -h; i <= h; i++) k[h + i] = (i * g[h + i]) / norm;
    return k;
  }
  /* order 2: (i² − s)·G(i) with s chosen to kill the constant response,
     scaled so t²/2 answers with one */
  let sg = 0, si2g = 0;
  for (let i = -h; i <= h; i++) { sg += g[h + i]; si2g += i * i * g[h + i]; }
  const s = si2g / sg;
  let norm = 0;
  for (let i = -h; i <= h; i++) norm += (i * i - s) * g[h + i] * (i * i) / 2;
  for (let i = -h; i <= h; i++) k[h + i] = ((i * i - s) * g[h + i]) / norm;
  return k;
}

/* correlate x with kernel k (y[j] = Σ k[h+i]·x[j+i]), extending x past both
   ends so the estimate does not fade at the boundaries.

   Two extensions, one per parity of the kernel. The default mirrors the
   samples about each endpoint (x̃[-m] = x[m]): the extension is even about
   the end, which holds a level steady there but makes every odd kernel
   answer zero, because it is integrating an even function against an odd
   one. Passing `odd` reflects through the endpoint instead
   (x̃[-m] = 2x[0] − x[m]), which continues a ramp as a ramp and keeps the
   order-1 estimate honest at the last sample — at the cost of forcing the
   order-2 estimate to zero there, by exactly the same argument. Choose the
   extension whose parity is opposite the kernel's. */
export function convolveReflect(x: ArrayLike<number>, k: Float64Array, odd = false): Float64Array {
  const n = x.length, h = (k.length - 1) >> 1;
  const y = new Float64Array(n);
  /* fold j back into range, carrying the affine correction each fold
     contributes: after the folds x̃[j] = a + b·x[j] */
  const at = (j: number) => {
    let a = 0, b = 1;
    while (j < 0 || j >= n) {
      if (odd) { a += 2 * b * (j < 0 ? x[0] : x[n - 1]); b = -b; }
      j = j < 0 ? -j : 2 * n - 2 - j;
    }
    return a + b * x[j];
  };
  for (let j = 0; j < n; j++) {
    let s = 0;
    for (let i = -h; i <= h; i++) s += k[h + i] * at(j + i);
    y[j] = s;
  }
  return y;
}
