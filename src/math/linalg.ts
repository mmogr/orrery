/* Small dense linear algebra over Float64Array, row-major, for symmetric
   problems a few hundred wide. Nothing here allocates per frame; everything
   is deterministic. */

import type { Embedding } from "../sky/spectral.ts";

/* Cholesky factor L (lower) of a symmetric positive-definite A, so LLᵀ = A.
   Throws if A is not positive definite. A is not modified. */
export function cholesky(A: Float64Array, n: number): Float64Array {
  const L = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[i * n + j];
      for (let k = 0; k < j; k++) s -= L[i * n + k] * L[j * n + k];
      if (i === j) {
        if (s <= 0) throw new Error(`not positive definite at row ${i}`);
        L[i * n + i] = Math.sqrt(s);
      } else {
        L[i * n + j] = s / L[j * n + j];
      }
    }
  }
  return L;
}

/* solve LLᵀ x = b given the Cholesky factor; b is not modified */
export function solveChol(L: Float64Array, n: number, b: Float64Array): Float64Array {
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {          /* forward: L y = b */
    let s = b[i];
    for (let k = 0; k < i; k++) s -= L[i * n + k] * y[k];
    y[i] = s / L[i * n + i];
  }
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {     /* back: Lᵀ x = y */
    let s = y[i];
    for (let k = i + 1; k < n; k++) s -= L[k * n + i] * x[k];
    x[i] = s / L[i * n + i];
  }
  return x;
}

/* eigen-decomposition of a symmetric A by cyclic Jacobi rotations.
   values ascending; vectors[i*n .. i*n+n) is the eigenvector for values[i].
   A is not modified. Converges when the off-diagonal Frobenius norm falls
   below 1e-11 of the matrix scale, or after 64 sweeps. */
export function jacobiEigen(A: Float64Array, n: number): { values: Float64Array; vectors: Float64Array } {
  const a = Float64Array.from(A);
  const V = new Float64Array(n * n);
  for (let i = 0; i < n; i++) V[i * n + i] = 1;

  let scale = 0;
  for (let i = 0; i < n * n; i++) scale = Math.max(scale, Math.abs(a[i]));
  const tol = (scale || 1) * 1e-11;

  for (let sweep = 0; sweep < 64; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++)
      for (let q = p + 1; q < n; q++) off += a[p * n + q] * a[p * n + q];
    if (Math.sqrt(off) < tol) break;

    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = a[p * n + q];
        if (Math.abs(apq) < tol / (n * n)) continue;
        const app = a[p * n + p], aqq = a[q * n + q];
        const theta = (aqq - app) / (2 * apq);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < n; k++) {       /* rotate rows/cols p and q */
          const akp = a[k * n + p], akq = a[k * n + q];
          a[k * n + p] = c * akp - s * akq;
          a[k * n + q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p * n + k], aqk = a[q * n + k];
          a[p * n + k] = c * apk - s * aqk;
          a[q * n + k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {       /* accumulate the rotation */
          const vkp = V[p * n + k], vkq = V[q * n + k];
          V[p * n + k] = c * vkp - s * vkq;
          V[q * n + k] = s * vkp + c * vkq;
        }
      }
    }
  }

  const order = Array.from({ length: n }, (_, i) => i)
    .sort((i, j) => a[i * n + i] - a[j * n + j]);
  const values = new Float64Array(n);
  const vectors = new Float64Array(n * n);
  order.forEach((src, dst) => {
    values[dst] = a[src * n + src];
    for (let k = 0; k < n; k++) vectors[dst * n + k] = V[src * n + k];
  });
  return { values, vectors };
}

/* Gram–Schmidt: remove from v its components along each (unit) basis
   vector, in place */
export function orthogonalise(v: Float64Array, basis: Float64Array[]): void {
  for (const b of basis) {
    let d = 0;
    for (let i = 0; i < v.length; i++) d += v[i] * b[i];
    for (let i = 0; i < v.length; i++) v[i] -= d * b[i];
  }
}

/* Orthogonal Procrustes in the plane: the rotation or reflection R, and
   the shift, that carry the points of `src` closest to those of `dst` in
   the least-squares sense — no scaling, so a layout keeps its own size
   and only turns to face the other. Both are centred, M = Σ (s−s̄)(d−d̄)ᵀ,
   and R = U Vᵀ from M's singular vectors; a degenerate M (points on a
   line, or fewer than two) completes the missing direction orthogonally.
   Depth passes through untouched. */
export function procrustes(src: Embedding, dst: Embedding): Embedding {
  const n = Math.min(src.x.length, dst.x.length);
  let sx = 0, sy = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { sx += src.x[i]; sy += src.y[i]; dx += dst.x[i]; dy += dst.y[i]; }
  if (n) { sx /= n; sy /= n; dx /= n; dy /= n; }
  /* cross-covariance M (2×2, row-major) */
  const M = new Float64Array(4);
  for (let i = 0; i < n; i++) {
    const a = src.x[i] - sx, b = src.y[i] - sy, c = dst.x[i] - dx, d = dst.y[i] - dy;
    M[0] += a * c; M[1] += a * d; M[2] += b * c; M[3] += b * d;
  }
  /* MᵀM = V Σ² Vᵀ; U = M V / σ, completed orthogonally where σ vanishes */
  const MtM = new Float64Array([
    M[0] * M[0] + M[2] * M[2], M[0] * M[1] + M[2] * M[3],
    M[0] * M[1] + M[2] * M[3], M[1] * M[1] + M[3] * M[3]]);
  const { values, vectors } = jacobiEigen(MtM, 2);
  const scale = Math.sqrt(Math.max(values[0], values[1], 0)) || 1;
  const U: number[][] = [], V: number[][] = [];
  for (const c of [1, 0]) {                 /* largest singular value first */
    const v = [vectors[c * 2], vectors[c * 2 + 1]];
    const sigma = Math.sqrt(Math.max(values[c], 0));
    let u: number[];
    if (sigma > scale * 1e-9) u = [(M[0] * v[0] + M[1] * v[1]) / sigma, (M[2] * v[0] + M[3] * v[1]) / sigma];
    else if (U.length) u = [-U[0][1], U[0][0]];
    else u = [1, 0];
    U.push(u); V.push(v);
  }
  /* R = U Vᵀ */
  const R = [
    U[0][0] * V[0][0] + U[1][0] * V[1][0], U[0][0] * V[0][1] + U[1][0] * V[1][1],
    U[0][1] * V[0][0] + U[1][1] * V[1][0], U[0][1] * V[0][1] + U[1][1] * V[1][1]];
  const x = new Float64Array(src.x.length), y = new Float64Array(src.y.length);
  for (let i = 0; i < src.x.length; i++) {
    const a = src.x[i] - sx, b = src.y[i] - sy;
    x[i] = R[0] * a + R[1] * b + dx;
    y[i] = R[2] * a + R[3] * b + dy;
  }
  return { x, y, z: Float64Array.from(src.z) };
}
