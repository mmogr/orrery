/* Language space: the singular value decomposition of the repo × language
   byte matrix (row-normalised log-bytes, centred). PC1/PC2 are the principal
   directions of what gets built; each repo's coordinates say how far its mix
   sits from the others', and along what axis. docs/language-space.md. */
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

export interface LanguageSpace {
  repos: string[];
  langs: string[];
  /* xy[i*2], xy[i*2+1]: repo i's PC1/PC2 coordinates */
  xy: Float64Array;
  /* the two languages loading PC1 hardest, negative end first */
  axis1: readonly [string, string];
}

export function languageSpace(bytes: Record<string, Record<string, number>>): LanguageSpace {
  const repos = Object.keys(bytes);
  const langSet = new Set<string>();
  for (const r of repos) for (const l of Object.keys(bytes[r])) langSet.add(l);
  const langs = [...langSet].sort();               /* order fixed, not incidental */
  const rows = repos.length, cols = langs.length;
  const k = Math.min(rows, cols);

  /* log(1+bytes) tames the four-decade spread; each row normalised to
     unit sum so a repo is its mix, not its size; columns centred so the
     principal directions describe difference, not the shared baseline */
  const A = new Float64Array(rows * cols);
  for (let i = 0; i < rows; i++) {
    let sum = 0;
    for (let j = 0; j < cols; j++) {
      const v = Math.log(1 + (bytes[repos[i]][langs[j]] || 0));
      A[i * cols + j] = v;
      sum += v;
    }
    if (sum > 0) for (let j = 0; j < cols; j++) A[i * cols + j] /= sum;
  }
  for (let j = 0; j < cols; j++) {
    let mean = 0;
    for (let i = 0; i < rows; i++) mean += A[i * cols + j];
    mean /= rows || 1;
    for (let i = 0; i < rows; i++) A[i * cols + j] -= mean;
  }

  const { U, S, V } = svd(A, rows, cols);

  /* a singular vector is only defined up to sign; fix each principal
     direction so its largest-|loading| language loads positive, and the
     picture stops depending on rounding order */
  const pcs = Math.min(2, k);
  for (let pc = 0; pc < pcs; pc++) {
    let big = 0;
    for (let j = 1; j < cols; j++)
      if (Math.abs(V[j * k + pc]) > Math.abs(V[big * k + pc])) big = j;
    if (V[big * k + pc] < 0) {
      for (let j = 0; j < cols; j++) V[j * k + pc] = -V[j * k + pc];
      for (let i = 0; i < rows; i++) U[i * k + pc] = -U[i * k + pc];
    }
  }

  /* repo coordinates: the projection A·v_pc = s_pc·u_pc, scaled by 1/√rows
     so the spread reads like a standard deviation, not a sum */
  const xy = new Float64Array(rows * 2);
  const rs = Math.sqrt(rows || 1);
  for (let i = 0; i < rows; i++)
    for (let pc = 0; pc < pcs; pc++)
      xy[i * 2 + pc] = (U[i * k + pc] * S[pc]) / rs;

  /* the axis label: the languages at PC1's two extremes, negative first */
  let lo = 0, hi = 0;
  for (let j = 1; j < cols; j++) {
    if (V[j * k] < V[lo * k]) lo = j;
    if (V[j * k] > V[hi * k]) hi = j;
  }
  return { repos, langs, xy, axis1: [langs[lo], langs[hi]] as const };
}
