/* Small dense linear algebra over Float64Array, row-major, for symmetric
   problems a few hundred wide. Nothing here allocates per frame; everything
   is deterministic. */

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
