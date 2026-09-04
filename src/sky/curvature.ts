/* Ollivier–Ricci curvature of a notes graph, one number per link: how far
   the two ends' neighbourhoods must travel to become each other. Each node
   spreads a lazy random walk — half its mass stays home, half goes to its
   neighbours — and the curvature of an edge is one minus the transport
   cost between the two walks. Negative on a bridge (the neighbourhoods
   live on opposite sides and everything must cross), positive inside a
   clique (they already overlap). The transport problem is exact: the
   supports are a handful of nodes and the costs are path lengths of at
   most three, so successive shortest paths solve it outright, and no
   regularisation stands between the number and its meaning.
   See docs/curvature.md. */
import type { Graph } from "./laplacian.ts";

export interface CurvatureOpts {
  /* the walk's laziness: the mass that stays put. ½ is Ollivier's usual */
  alpha: number;
}

const DEFAULTS: CurvatureOpts = { alpha: 0.5 };
const EPS = 1e-12;

/* the minimum cost of moving distribution a (over m points) onto b (over
   n points) when moving one unit from point u to point v costs C[u·n+v]:
   the earth mover's distance, by successive shortest paths on the dense
   bipartite residual graph with Johnson potentials so Dijkstra applies
   throughout. Masses must both sum to one. */
export function transportCost(a: Float64Array, b: Float64Array, C: Float64Array): number {
  const m = a.length, n = b.length, V = m + n;
  const supply = Float64Array.from(a), demand = Float64Array.from(b);
  const flow = new Float64Array(m * n);
  const pot = new Float64Array(V);
  const dist = new Float64Array(V), prev = new Int32Array(V), done = new Uint8Array(V);
  let cost = 0, left = 1;
  while (left > EPS) {
    /* Dijkstra from every supply that still has mass, on reduced costs */
    dist.fill(Infinity); prev.fill(-1); done.fill(0);
    for (let u = 0; u < m; u++) if (supply[u] > EPS) dist[u] = 0;
    for (;;) {
      let x = -1;
      for (let k = 0; k < V; k++) if (!done[k] && dist[k] < Infinity && (x < 0 || dist[k] < dist[x])) x = k;
      if (x < 0) break;
      done[x] = 1;
      if (x < m) {
        for (let v = 0; v < n; v++) {
          const d = dist[x] + C[x * n + v] + pot[x] - pot[m + v];
          if (d < dist[m + v] - EPS) { dist[m + v] = d; prev[m + v] = x; }
        }
      } else {
        const v = x - m;
        for (let u = 0; u < m; u++) {
          if (flow[u * n + v] <= EPS) continue;
          const d = dist[x] - C[u * n + v] + pot[x] - pot[u];
          if (d < dist[u] - EPS) { dist[u] = d; prev[u] = x; }
        }
      }
    }
    /* the nearest demand still wanting mass, then the path back to a supply */
    let t = -1;
    for (let v = 0; v < n; v++) if (demand[v] > EPS && dist[m + v] < Infinity && (t < 0 || dist[m + v] < dist[t])) t = m + v;
    if (t < 0) break;                      /* unreachable: masses didn't balance */
    let push = demand[t - m];
    let x = t;
    while (prev[x] >= 0) {
      const y = prev[x];
      if (x < m) push = Math.min(push, flow[x * n + (y - m)]);   /* a backward step undoes flow */
      x = y;
    }
    push = Math.min(push, supply[x]);
    x = t;
    while (prev[x] >= 0) {
      const y = prev[x];
      if (x >= m) { flow[y * n + (x - m)] += push; cost += push * C[y * n + (x - m)]; }
      else { flow[x * n + (y - m)] -= push; cost -= push * C[x * n + (y - m)]; }
      x = y;
    }
    supply[x] -= push;
    demand[t - m] -= push;
    left -= push;
    for (let k = 0; k < V; k++) if (dist[k] < Infinity) pot[k] += dist[k];
  }
  return cost;
}

/* curvature per edge of g, in the order g.edges gives them; a self-loop
   says nothing and gets 0 */
export function ollivierRicci(g: Graph, opts?: Partial<CurvatureOpts>): Float64Array {
  const { alpha } = { ...DEFAULTS, ...opts };
  const n = g.n;
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const [a, b] of g.edges) {
    if (a === b) continue;
    adj[a].push(b); adj[b].push(a);
  }
  /* path lengths from u to every node within three hops — the farthest any
     node of one support can be from any node of the other, since
     u – i – j – v joins them — as a map; a depth-bounded breadth-first walk */
  const seen = new Int32Array(n).fill(-1);
  const hop = new Int32Array(n);
  const reach = (u: number, want: Set<number>, out: Map<number, number>, stamp: number): void => {
    const queue: number[] = [u];
    seen[u] = stamp; hop[u] = 0;
    for (let q = 0; q < queue.length; q++) {
      const x = queue[q];
      if (want.has(x)) out.set(x, hop[x]);
      if (hop[x] === 3) continue;
      for (const y of adj[x]) if (seen[y] !== stamp) { seen[y] = stamp; hop[y] = hop[x] + 1; queue.push(y); }
    }
  };
  const out = new Float64Array(g.edges.length);
  let stamp = 0;
  g.edges.forEach(([i, j], e) => {
    if (i === j) return;
    const Si = [i, ...adj[i]], Sj = [j, ...adj[j]];
    const a = new Float64Array(Si.length), b = new Float64Array(Sj.length);
    a[0] = alpha; b[0] = alpha;
    for (let k = 1; k < Si.length; k++) a[k] = (1 - alpha) / adj[i].length;
    for (let k = 1; k < Sj.length; k++) b[k] = (1 - alpha) / adj[j].length;
    const want = new Set(Sj);
    const C = new Float64Array(Si.length * Sj.length);
    const d = new Map<number, number>();
    for (let p = 0; p < Si.length; p++) {
      d.clear();
      reach(Si[p], want, d, ++stamp);
      for (let q = 0; q < Sj.length; q++) C[p * Sj.length + q] = d.get(Sj[q])!;
    }
    out[e] = 1 - transportCost(a, b, C);
  });
  return out;
}
