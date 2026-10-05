/* Ollivier–Ricci curvature of a notes graph, one number per link: how far
   the two ends' neighbourhoods must travel to become each other. Each node
   spreads a lazy random walk — half its mass stays home, half goes to its
   neighbours — and the curvature of an edge is one minus the transport
   cost between the two walks. Negative on a bridge (the neighbourhoods
   live on opposite sides and everything must cross), positive inside a
   clique (they already overlap). The transport problem is exact: the
   supports are a handful of nodes and the costs are path lengths of at
   most three, so the primal-dual method solves it outright, and no
   regularisation stands between the number and its meaning.
   See docs/curvature.md. */
import type { Graph } from "./laplacian.ts";
import { shortestPaths } from "./paths.ts";
import { transportCost } from "./transport.ts";

export { transportCost };

export interface CurvatureOpts {
  /* the walk's laziness: the mass that stays put. ½ is Ollivier's usual */
  alpha: number;
  /* link lengths, indexed like g.edges: with them the walks' costs are
     shortest-path lengths and each κ is 1 − W₁ / ℓ, Ollivier's definition
     on a metric graph; without them every link is one hop long and the
     costs come from a three-hop table, bit for bit as before */
  lengths?: ArrayLike<number>;
}

const DEFAULTS: CurvatureOpts = { alpha: 0.5 };
const EPS = 1e-12;

/* curvature per edge of g, in the order g.edges gives them; a self-loop
   says nothing and gets 0 */
export function ollivierRicci(g: Graph, opts?: Partial<CurvatureOpts>): Float64Array {
  const { alpha } = { ...DEFAULTS, ...opts };
  const lengths = opts?.lengths;
  const n = g.n;
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const [a, b] of g.edges) {
    if (a === b) continue;
    adj[a].push(b); adj[b].push(a);
  }
  /* path lengths between every pair of nodes, capped at three hops — the
     farthest any node of one support can be from any node of the other,
     since u – i – j – v joins them. One breadth-first walk per node, once,
     so each link reads its costs from a table instead of walking again */
  const FAR = 255;
  const hops = new Uint8Array(lengths ? 0 : n * n).fill(FAR);
  const queue = new Int32Array(n);
  /* with lengths the table is the metric itself: shortest paths, exact */
  const dist = lengths ? shortestPaths(g, lengths) : null;
  for (let u = 0; !lengths && u < n; u++) {
    const row = u * n;
    hops[row + u] = 0;
    let head = 0, tail = 0;
    queue[tail++] = u;
    while (head < tail) {
      const x = queue[head++];
      const h = hops[row + x];
      if (h === 3) continue;
      for (const y of adj[x]) if (hops[row + y] === FAR) { hops[row + y] = h + 1; queue[tail++] = y; }
    }
  }
  const out = new Float64Array(g.edges.length);
  const massA = new Float64Array(n), massB = new Float64Array(n);
  g.edges.forEach(([i, j], e) => {
    if (i === j) return;
    /* the two walks; then whatever mass the two already agree on stays
       where it is — with a metric cost that is never worse than moving
       it — and only each side's surplus has to travel. Neighbourhoods
       inside a clique overlap almost entirely, so the problem that is
       left is a few nodes a side */
    massA[i] += alpha; massB[j] += alpha;
    for (const k of adj[i]) massA[k] += (1 - alpha) / adj[i].length;
    for (const k of adj[j]) massB[k] += (1 - alpha) / adj[j].length;
    const Si: number[] = [], Sj: number[] = [], av: number[] = [], bv: number[] = [];
    let total = 0;
    for (const u of [i, ...adj[i], j, ...adj[j]]) {
      if (massA[u] === 0 && massB[u] === 0) continue;
      const keep = Math.min(massA[u], massB[u]);
      const ra = massA[u] - keep, rb = massB[u] - keep;
      if (ra > EPS) { Si.push(u); av.push(ra); total += ra; }
      if (rb > EPS) { Sj.push(u); bv.push(rb); }
      massA[u] = 0; massB[u] = 0;
    }
    if (!Si.length || !Sj.length) { out[e] = 1; return; }   /* the same walk twice: nothing moves */
    /* the surplus on each side is a distribution of mass `total` */
    const a = Float64Array.from(av, v => v / total), b = Float64Array.from(bv, v => v / total);
    const C = new Float64Array(Si.length * Sj.length);
    for (let p = 0; p < Si.length; p++)
      for (let q = 0; q < Sj.length; q++)
        C[p * Sj.length + q] = dist ? dist[Si[p] * n + Sj[q]] : hops[Si[p] * n + Sj[q]];
    out[e] = 1 - total * transportCost(a, b, C) / (lengths ? lengths[e] : 1);
  });
  return out;
}
