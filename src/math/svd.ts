/* The singular value decomposition, for matrices a few hundred wide. */
import { jacobiEigen } from "../math/linalg.ts";

/* thin SVD of A (rows × cols, row-major) via the eigen-decomposition of
   the smaller Gram matrix — AᵀA when cols ≤ rows, AAᵀ otherwise; both are
   symmetric, which is what jacobiEigen is for. With k = min(rows, cols):
   U is rows × k, V is cols × k (both row-major, column j the j-th singular
   vector), S descending, and A = U·diag(S)·Vᵀ. A singular value within
   rounding of zero gets a zeroed partner column rather than a fabricated
   one — the reconstruction is unharmed and no noise gets dressed up as
   structure. */
export function svd(A: Float64Array, rows: number, cols: number):
  { U: Float64Array; S: Float64Array; V: Float64Array } {
  const k = Math.min(rows, cols);
  const small = cols <= rows;
  const n = small ? cols : rows;

  /* the n×n Gram matrix of the shorter side */
  const G = new Float64Array(n * n);
  if (small) {
    for (let i = 0; i < cols; i++)
      for (let j = i; j < cols; j++) {
        let s = 0;
        for (let t = 0; t < rows; t++) s += A[t * cols + i] * A[t * cols + j];
        G[i * n + j] = G[j * n + i] = s;
      }
  } else {
    for (let i = 0; i < rows; i++)
      for (let j = i; j < rows; j++) {
        let s = 0;
        for (let t = 0; t < cols; t++) s += A[i * cols + t] * A[j * cols + t];
        G[i * n + j] = G[j * n + i] = s;
      }
  }

  const { values, vectors } = jacobiEigen(G, n);   /* ascending */
  const S = new Float64Array(k);
  const U = new Float64Array(rows * k);
  const V = new Float64Array(cols * k);
  let scale = 0;
  for (let j = 0; j < n; j++) scale = Math.max(scale, Math.abs(values[j]));
  const tiny = Math.sqrt((scale || 1)) * 1e-9;

  for (let j = 0; j < k; j++) {
    const src = n - 1 - j;                         /* largest first */
    const s = Math.sqrt(Math.max(0, values[src]));
    S[j] = s;
    if (small) {
      for (let i = 0; i < cols; i++) V[i * k + j] = vectors[src * n + i];
      if (s > tiny)                                /* u = A v / s */
        for (let i = 0; i < rows; i++) {
          let d = 0;
          for (let t = 0; t < cols; t++) d += A[i * cols + t] * V[t * k + j];
          U[i * k + j] = d / s;
        }
    } else {
      for (let i = 0; i < rows; i++) U[i * k + j] = vectors[src * n + i];
      if (s > tiny)                                /* v = Aᵀ u / s */
        for (let i = 0; i < cols; i++) {
          let d = 0;
          for (let t = 0; t < rows; t++) d += A[t * cols + i] * U[t * k + j];
          V[i * k + j] = d / s;
        }
    }
  }
  return { U, S, V };
}
