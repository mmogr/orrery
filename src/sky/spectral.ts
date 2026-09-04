/* The sky's shape from the links alone: a spectral embedding. Per connected
   component, the three smallest non-trivial eigenvectors of L_sym place the
   notes so that what is taught together sits together — x and y on the
   page, z as depth — a rest state the springs then breathe on.
   Deterministic: inverse iteration from a seeded start, deflating the
   trivial vector D^{1/2}·1 and each found vector. Components pack
   left-to-right by size along x; depth is not packed. See
   docs/spectral-sky.md. */
import type { Graph } from "./laplacian.ts";
import { normalisedLaplacian, components } from "./laplacian.ts";
import { cholesky, solveChol, orthogonalise } from "../math/linalg.ts";
import { rng } from "../rng.ts";

export interface Embedding {
  /* centred, unit-RMS per axis before scaleToBox */
  x: Float64Array;
  y: Float64Array;
  /* depth: the third mode, same units; zero where a component is too
     small to have one (fewer than four notes) */
  z: Float64Array;
}

const SHIFT = 1e-3;         /* lifts λ = 0 so the Cholesky factor exists */
const TOL = 1e-8;
const MAX_ITER = 200;
const GOLDEN = 2.399963229728653;   /* the sunflower angle, for lone stars */
const DEPTH_STREAM = 1e6;           /* the seed offset of depth's own start vectors */

/* the smallest non-trivial eigenvectors of one component's L_sym, by
   shifted inverse iteration on the dense matrix (a component is at most a
   few hundred notes). Deflation keeps each iterate clear of the trivial
   D^{1/2}·1 direction and of vectors already found. */
function componentEigens(sub: Graph, want: number, rnd: () => number, rndDepth: () => number): Float64Array[] {
  const n = sub.n;
  const L = normalisedLaplacian(sub);
  const A = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let p = L.rowPtr[i]; p < L.rowPtr[i + 1]; p++) A[i * n + L.col[p]] = L.val[p];
    A[i * n + i] += SHIFT;
  }
  const F = cholesky(A, n);
  /* the kernel of L_sym on a connected graph is exactly D^{1/2}·1 */
  const trivial = new Float64Array(n);
  let t2 = 0;
  for (let i = 0; i < n; i++) { trivial[i] = Math.sqrt(L.deg[i]); t2 += L.deg[i]; }
  const tn = Math.sqrt(t2);
  for (let i = 0; i < n; i++) trivial[i] /= tn;

  const found: Float64Array[] = [];
  for (let e = 0; e < want; e++) {
    /* the page's two modes start from the stream they always did; depth
       draws from its own, so asking for it leaves x and y untouched on
       every graph — a degenerate eigenvalue picks its vector by the start */
    const draw = e < 2 ? rnd : rndDepth;
    let v: Float64Array = new Float64Array(n);
    for (let i = 0; i < n; i++) v[i] = draw() - 0.5;
    orthogonalise(v, [trivial, ...found]);
    normalise(v);
    for (let it = 0; it < MAX_ITER; it++) {
      const w = solveChol(F, n, v);
      orthogonalise(w, [trivial, ...found]);
      normalise(w);
      let dot = 0;
      for (let i = 0; i < n; i++) dot += w[i] * v[i];
      if (dot < 0) for (let i = 0; i < n; i++) w[i] = -w[i];
      let diff = 0;
      for (let i = 0; i < n; i++) { const d = w[i] - v[i]; diff += d * d; }
      v = w;
      if (Math.sqrt(diff) < TOL) break;
    }
    found.push(v);
  }
  /* the eigenvector v of L_sym lives in D^{1/2}-weighted space; the actual
     coordinates are u = D^{−1/2} v (the random-walk eigenvector), which
     undoes the degree weighting — on a path it is the plain cosine mode,
     monotone from end to end. Sign pinned — largest-magnitude entry
     positive — so the same graph always faces the same way. */
  return found.map(v => {
    const u = new Float64Array(n);
    for (let i = 0; i < n; i++) u[i] = v[i] / Math.sqrt(L.deg[i]);
    normalise(u);
    let mi = 0;
    for (let i = 1; i < n; i++) if (Math.abs(u[i]) > Math.abs(u[mi])) mi = i;
    if (u[mi] < 0) for (let i = 0; i < n; i++) u[i] = -u[i];
    return u;
  });
}

function normalise(v: Float64Array): void {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  s = Math.sqrt(s) || 1;
  for (let i = 0; i < v.length; i++) v[i] /= s;
}

function centre(v: Float64Array): void {
  let m = 0;
  for (let i = 0; i < v.length; i++) m += v[i];
  m /= v.length || 1;
  for (let i = 0; i < v.length; i++) v[i] -= m;
}

export function spectralEmbedding(g: Graph, seed?: number): Embedding {
  const rnd = rng(seed ?? 1);
  const rndDepth = rng((seed ?? 1) + DEPTH_STREAM);
  const comp = components(g);
  let nc = 0;
  for (let i = 0; i < g.n; i++) nc = Math.max(nc, comp[i] + 1);

  /* gather each component: its members, and its edges relabelled locally */
  const members: number[][] = Array.from({ length: nc }, () => []);
  const local = new Int32Array(g.n);
  for (let i = 0; i < g.n; i++) { local[i] = members[comp[i]].length; members[comp[i]].push(i); }
  const subEdges: [number, number][][] = Array.from({ length: nc }, () => []);
  for (const [a, b] of g.edges)
    if (a !== b) subEdges[comp[a]].push([local[a], local[b]]);

  /* per-component coordinates, centred, then lifted to unit per-axis RMS
     (an eigenvector is unit-norm, so ·√size does it) so components of
     different sizes speak the same units when we pack them */
  const cx: Float64Array[] = [], cy: Float64Array[] = [], cz: Float64Array[] = [];
  for (let c = 0; c < nc; c++) {
    const size = members[c].length;
    const lx = new Float64Array(size), ly = new Float64Array(size), lz = new Float64Array(size);
    if (size > 1) {
      const eig = componentEigens({ n: size, edges: subEdges[c] }, Math.min(3, size - 1), rnd, rndDepth);
      if (eig[0]) lx.set(eig[0]);
      if (eig[1]) ly.set(eig[1]);
      if (eig[2]) lz.set(eig[2]);
      centre(lx); centre(ly); centre(lz);
      const s = Math.sqrt(size);
      for (let i = 0; i < size; i++) { lx[i] *= s; ly[i] *= s; lz[i] *= s; }
    }
    cx.push(lx); cy.push(ly); cz.push(lz);
  }

  /* pack along x by size: the largest constellation holds the centre and the
     rest alternate outward, right then left, each clearing its neighbour by
     its own half-width plus a margin. Lone stars get a spot on a small ring
     around their slot, stepped by the golden angle so no two coincide. */
  const order = Array.from({ length: nc }, (_, c) => c)
    .sort((a, b) => members[b].length - members[a].length || a - b);
  const MARGIN = 1, RING = 0.6;
  let right = 0, left = 0, lone = 0;
  const x = new Float64Array(g.n), y = new Float64Array(g.n), z = new Float64Array(g.n);
  order.forEach((c, rank) => {
    const size = members[c].length;
    if (size === 1) {
      const th = GOLDEN * lone++;
      cx[c][0] = RING * Math.cos(th);
      cy[c][0] = RING * Math.sin(th);
    }
    let hw = RING;
    for (let i = 0; i < size; i++) hw = Math.max(hw, Math.abs(cx[c][i]));
    let at = 0;
    if (rank === 0) { right = hw; left = -hw; }
    else if (rank % 2 === 1) { at = right + MARGIN + hw; right = at + hw; }
    else { at = left - MARGIN - hw; left = at - hw; }
    for (let i = 0; i < size; i++) {
      x[members[c][i]] = cx[c][i] + at;
      y[members[c][i]] = cy[c][i];
      z[members[c][i]] = cz[c][i];
    }
  });

  /* the whole sky in standard units: centred, unit RMS per axis (a depth
     axis that is all zeros — every component too small — stays zero) */
  for (const v of [x, y, z]) {
    centre(v);
    let s = 0;
    for (let i = 0; i < v.length; i++) s += v[i] * v[i];
    const rms = Math.sqrt(s / (v.length || 1));
    if (rms > 1e-12) for (let i = 0; i < v.length; i++) v[i] /= rms;
  }
  return { x, y, z };
}

/* scale an embedding into a w×h box about the origin, preserving aspect;
   depth takes the same factor, so it stays in the page's units */
export function scaleToBox(e: Embedding, w: number, h: number): Embedding {
  let mx = 0, my = 0;
  for (let i = 0; i < e.x.length; i++) {
    mx = Math.max(mx, Math.abs(e.x[i]));
    my = Math.max(my, Math.abs(e.y[i]));
  }
  /* one factor for both axes: the shape keeps its aspect, the tighter
     constraint decides the fit */
  const s = Math.min(mx > 0 ? (w / 2) / mx : Infinity, my > 0 ? (h / 2) / my : Infinity);
  const k = Number.isFinite(s) ? s : 1;
  return {
    x: Float64Array.from(e.x, v => v * k),
    y: Float64Array.from(e.y, v => v * k),
    z: Float64Array.from(e.z, v => v * k),
  };
}
