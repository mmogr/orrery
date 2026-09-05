/* The heat kernel signature: what diffusion from every note at once would
   leave at each one. docs/heat.md warms the graph from a single source;
   here the source is every node in turn and we keep only what stays home,
   HKS_t(i) = Σ_k e^{−t λ_k} φ_k(i)² over every eigenpair of L_sym. Small t
   reads how busy a note's own neighbourhood is, large t settles to its
   share of the component's degree. Per component, by Jacobi on the dense
   sub-matrix, since a component is at most a few hundred notes. See
   docs/heat-kernel.md. */
import type { Graph } from "./laplacian.ts";
import { normalisedLaplacian, components } from "./laplacian.ts";
import { jacobiEigen } from "../math/linalg.ts";

/* where to sample the kernel: t = 1 still within a hop or two, t = 10 well
   into the component's slow modes. The physics fixes the kernel; these two
   times are taste (docs/heat-kernel.md, aesthetic terms) */
export const HKS_SCALES: readonly [number, number] = [1, 10];

/* a full Jacobi decomposition is cubic per sweep; past this many notes in
   one component we hand back the large-t limit d_i / 2m instead */
export const HKS_MAX_DENSE = 600;

/* length g.n × times.length, row-major by node:
   out[i * times.length + k] = HKS_{times[k]}(i) */
export function heatKernelSignature(g: Graph, times: ArrayLike<number> = HKS_SCALES): Float64Array {
  const T = times.length;
  const out = new Float64Array(g.n * T);
  const comp = components(g);
  let nc = 0;
  for (let i = 0; i < g.n; i++) nc = Math.max(nc, comp[i] + 1);

  /* gather each component: its members, and its edges relabelled locally,
     as the embedding does — eigenvectors of a disconnected graph would mix
     components arbitrarily */
  const members: number[][] = Array.from({ length: nc }, () => []);
  const local = new Int32Array(g.n);
  for (let i = 0; i < g.n; i++) { local[i] = members[comp[i]].length; members[comp[i]].push(i); }
  const subEdges: [number, number][][] = Array.from({ length: nc }, () => []);
  for (const [a, b] of g.edges)
    if (a !== b) subEdges[comp[a]].push([local[a], local[b]]);

  for (let c = 0; c < nc; c++) {
    const m = members[c], n = m.length;
    const L = normalisedLaplacian({ n, edges: subEdges[c] });
    if (n > HKS_MAX_DENSE) {
      /* only the trivial mode φ_1 = D^{1/2}·1 / √(2m) survives as t → ∞,
         and φ_1(i)² = d_i / 2m is the whole signature at every scale */
      let vol = 0;
      for (let i = 0; i < n; i++) vol += L.deg[i];
      for (let i = 0; i < n; i++)
        for (let k = 0; k < T; k++) out[m[i] * T + k] = L.deg[i] / vol;
      continue;
    }
    const A = new Float64Array(n * n);
    for (let i = 0; i < n; i++)
      for (let p = L.rowPtr[i]; p < L.rowPtr[i + 1]; p++) A[i * n + L.col[p]] = L.val[p];
    /* an isolated note is the 1 × 1 matrix [1]: λ = 1, φ = 1, and the sum
       below gives e^{−t} with no special case */
    const { values, vectors } = jacobiEigen(A, n);
    for (let k = 0; k < T; k++) {
      for (let e = 0; e < n; e++) {
        const w = Math.exp(-times[k] * values[e]);
        for (let i = 0; i < n; i++) {
          const phi = vectors[e * n + i];
          out[m[i] * T + k] += w * phi * phi;
        }
      }
    }
  }
  return out;
}

/* the signature as magnitudes, in the astronomers' sense: the brightest
   value is magnitude 0 and every factor of a hundred below it is five more,

     m_i = −2.5 log10(v_i / max v).

   A heat kernel signature spans orders of magnitude — a hub note holds a
   hundred times what a leaf does — so a consumer that maps it linearly to
   anything (a radius, an opacity) spends its whole range on the top few
   notes and draws the rest identically. Pogson's ratio is the compression
   astronomy settled on for exactly that distribution, and it has the useful
   property that a difference of magnitudes is a ratio of brightnesses,
   whatever the units the signature came in.

   Small is bright, as in the sky: the maximum reads 0 and everything else
   is positive. A non-positive value is floored rather than sent to
   infinity, so an isolated note still lands somewhere finite; an all-zero
   input is all zeros out. */
export function magnitudes(values: ArrayLike<number>, floor = 1e-12): Float64Array {
  const n = values.length, out = new Float64Array(n);
  let max = 0;
  for (let i = 0; i < n; i++) if (values[i] > max) max = values[i];
  if (!(max > 0)) return out;
  for (let i = 0; i < n; i++)
    out[i] = -2.5 * Math.log10(Math.max(values[i], floor) / max);
  return out;
}
