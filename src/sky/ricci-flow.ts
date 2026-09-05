/* Discrete Ricci flow on the notes graph. Every link has a length; each
   step, a link with negative curvature (a bridge) grows and one with
   positive curvature (a thread in a weave) shrinks, in proportion —
   Hamilton's flow, on a graph, with Ollivier's curvature standing in for
   Ricci's. Renormalised so the mean length stays one, it separates
   communities without shrinking the sky. Reading the communities off the
   lengths is a choice of cut; here the cut is the one whose components
   score the highest modularity, so a new hub note moves the count only
   when it moves the communities. See docs/ricci-flow.md. */
import type { Graph } from "./laplacian.ts";
import { components } from "./laplacian.ts";
import { ollivierRicci } from "./curvature.ts";

export interface FlowOpts {
  alpha: number;   /* the walks' laziness, as for curvature */
  step: number;    /* ε: the share of κ a length changes by, per step */
  floor: number;   /* the shortest a link may become, in mean lengths */
  ceil: number;    /* and the longest */
}

export const FLOW_DEFAULTS: FlowOpts = { alpha: 0.5, step: 0.5, floor: 0.1, ceil: 16 };
export const FLOW_CUT_CANDIDATES = 64;   /* at most this many cuts are tried */

/* one step: κ on the current metric, then ℓ ← ℓ (1 − ε κ), clamped, and
   rescaled to mean one. lengths is changed in place; the κ used comes
   back so a consumer can show what drove the step. */
export function ricciFlowStep(g: Graph, lengths: Float64Array, opts: Partial<FlowOpts> = {}): Float64Array {
  const { alpha, step, floor, ceil } = { ...FLOW_DEFAULTS, ...opts };
  const kappa = ollivierRicci(g, { alpha, lengths });
  const m = lengths.length;
  let sum = 0;
  for (let e = 0; e < m; e++) {
    lengths[e] = Math.min(ceil, Math.max(floor, lengths[e] * (1 - step * kappa[e])));
    sum += lengths[e];
  }
  if (sum > 0) for (let e = 0; e < m; e++) lengths[e] *= m / sum;
  return kappa;
}

/* the flow from unit lengths for `steps` steps; the κ of the last step */
export function ricciFlow(g: Graph, steps: number, opts: Partial<FlowOpts> = {}):
  { lengths: Float64Array; kappa: Float64Array } {
  const lengths = new Float64Array(g.edges.length).fill(1);
  let kappa: Float64Array = new Float64Array(g.edges.length);
  for (let s = 0; s < steps; s++) kappa = ricciFlowStep(g, lengths, opts);
  return { lengths, kappa };
}

/* Newman's modularity of a labelling, on the unweighted graph:
   Q = Σ_c (e_c / m − (d_c / 2m)²), e_c the links inside community c and
   d_c the sum of its degrees. One community is 0; a split that cuts fewer
   links than chance expects is positive. */
export function modularity(g: Graph, label: ArrayLike<number>): number {
  let m = 0;
  const inside = new Map<number, number>(), degree = new Map<number, number>();
  for (const [a, b] of g.edges) {
    if (a === b) continue;
    m++;
    degree.set(label[a], (degree.get(label[a]) ?? 0) + 1);
    degree.set(label[b], (degree.get(label[b]) ?? 0) + 1);
    if (label[a] === label[b]) inside.set(label[a], (inside.get(label[a]) ?? 0) + 1);
  }
  if (!m) return 0;
  let q = 0;
  for (const [c, d] of degree) q += (inside.get(c) ?? 0) / m - (d / (2 * m)) ** 2;
  return q;
}

/* the communities the lengths imply: keep every link no longer than the
   cut and take the components. With no cut given, try every distinct
   length above the mean (thinned to FLOW_CUT_CANDIDATES quantiles) and
   keep the cut whose components score the highest modularity — the
   smallest such cut on a tie. Lengths all equal: one community, Q = 0.

   `parted` is how many of those communities the cut itself made: the count
   less the graph's own components, which were already apart before a single
   link was removed. A sky that arrives in three pieces and leaves in seven
   was parted four times, and that — not the seven — is what the flow did. */
export function cutCommunities(g: Graph, lengths: ArrayLike<number>, cut?: number):
  { count: number; label: Int32Array; cut: number; q: number; parted: number } {
  const m = lengths.length;
  let candidates: number[];
  if (cut != null) candidates = [cut];
  else {
    let mean = 0;
    for (let e = 0; e < m; e++) mean += lengths[e];
    mean = m ? mean / m : 0;
    const above = Array.from(new Set(Array.from({ length: m }, (_, e) => lengths[e]).filter(l => l > mean)))
      .sort((a, b) => a - b);
    let max = 0;
    for (let e = 0; e < m; e++) max = Math.max(max, lengths[e]);
    if (!above.length) candidates = [max];             /* all equal: keep every link */
    else {
      const thinned = above.length <= FLOW_CUT_CANDIDATES ? above
        : Array.from({ length: FLOW_CUT_CANDIDATES },
            (_, i) => above[Math.floor(i * (above.length - 1) / (FLOW_CUT_CANDIDATES - 1))]);
      /* a cut just under a length removes that length and everything
         longer; the length itself would keep it */
      candidates = thinned.map(c => c * (1 - 1e-9));
    }
  }
  let whole = 0;
  for (const l of components(g)) whole = Math.max(whole, l + 1);
  let best: { count: number; label: Int32Array; cut: number; q: number; parted: number } =
    { count: 1, label: new Int32Array(g.n), cut: candidates[0], q: -Infinity, parted: 0 };
  for (const c of candidates) {
    const sub: Graph = { n: g.n, edges: g.edges.filter((_, e) => lengths[e] <= c) };
    const label = components(sub);
    const q = modularity(g, label);
    if (q > best.q) {
      let count = 0;
      for (const l of label) count = Math.max(count, l + 1);
      best = { count, label, cut: c, q, parted: Math.max(0, count - whole) };
    }
  }
  return best;
}
