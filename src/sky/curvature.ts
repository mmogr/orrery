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

/* the minimum cost of moving distribution a (over m points) onto b (over
   n points) when moving one unit from point u to point v costs C[u·n+v]:
   the earth mover's distance, exactly, by the primal-dual method. Prices
   on both sides keep every reduced cost C + pu − pv at or above zero; mass
   moves only along routes whose reduced cost is zero, and every such route
   is used up before the prices are raised again. Raising them is one
   Dijkstra over the reduced costs, stopped at the nearest point still
   wanting mass. The costs here take a few distinct values — hops of one,
   two or three — so a handful of price rises settle a problem that one
   shortest-path search per unit of mass used to. The masses must have the
   same sum. */
export function transportCost(a: Float64Array, b: Float64Array, C: Float64Array): number {
  const m = a.length, n = b.length;
  const supply = Float64Array.from(a), demand = Float64Array.from(b);
  const flow = new Float64Array(m * n);
  const pu = new Float64Array(m), pv = new Float64Array(n);
  let left = 0, scale = 1;
  for (let u = 0; u < m; u++) {
    left += supply[u];
    let lo = Infinity;
    for (let v = 0; v < n; v++) { const c = C[u * n + v]; if (c < lo) lo = c; if (c > scale) scale = c; }
    pu[u] = -lo;                          /* every row starts with a free route */
  }
  const TOL = 1e-12 * scale;              /* a reduced cost this small is zero */
  const seenU = new Uint8Array(m), seenV = new Uint8Array(n);
  const viaU = new Int32Array(n), viaV = new Int32Array(m);   /* how each point was reached */
  const stack = new Int32Array(m);
  const du = new Float64Array(m), dv = new Float64Array(n);

  /* push what fits along the route that ends at demand t, walking back
     through viaU / viaV to the supply it started from */
  const push = (t: number): void => {
    let amount = demand[t], v = t;
    for (;;) {
      const u = viaU[v], back = viaV[u];
      if (back < 0) { amount = Math.min(amount, supply[u]); break; }
      amount = Math.min(amount, flow[u * n + back]);            /* a backward step undoes flow */
      v = back;
    }
    v = t;
    for (;;) {
      const u = viaU[v], back = viaV[u];
      flow[u * n + v] += amount;
      if (back < 0) { supply[u] -= amount; break; }
      flow[u * n + back] -= amount;
      v = back;
    }
    demand[t] -= amount;
    left -= amount;
  };

  /* one route of zero reduced cost from a supply with mass to a demand
     wanting it, depth first; false when there is none at these prices */
  const route = (): boolean => {
    seenU.fill(0); seenV.fill(0);
    let top = 0;
    for (let u = 0; u < m; u++) if (supply[u] > EPS) { seenU[u] = 1; viaV[u] = -1; stack[top++] = u; }
    while (top > 0) {
      const u = stack[--top], row = u * n, p = pu[u];
      for (let v = 0; v < n; v++) {
        if (seenV[v] || C[row + v] + p - pv[v] > TOL) continue;
        seenV[v] = 1; viaU[v] = u;
        if (demand[v] > EPS) { push(v); return true; }
        for (let w = 0; w < m; w++)
          if (!seenU[w] && flow[w * n + v] > EPS) { seenU[w] = 1; viaV[w] = v; stack[top++] = w; }
      }
    }
    return false;
  };

  while (left > EPS) {
    while (left > EPS && route()) { /* until these prices offer nothing more */ }
    if (left <= EPS) break;
    /* raise the prices: Dijkstra on reduced costs from every supply that
       still has mass, to the nearest demand still wanting some */
    du.fill(Infinity); dv.fill(Infinity); seenU.fill(0); seenV.fill(0);
    for (let u = 0; u < m; u++) if (supply[u] > EPS) { du[u] = 0; viaV[u] = -1; }
    let t = -1;
    for (;;) {
      let x = -1, best = Infinity, onU = true;
      for (let u = 0; u < m; u++) if (!seenU[u] && du[u] < best) { best = du[u]; x = u; }
      for (let v = 0; v < n; v++) if (!seenV[v] && dv[v] < best) { best = dv[v]; x = v; onU = false; }
      if (x < 0) break;
      if (onU) {
        seenU[x] = 1;
        const row = x * n, p = pu[x];
        for (let v = 0; v < n; v++) {
          if (seenV[v]) continue;
          const d = best + C[row + v] + p - pv[v];
          if (d < dv[v]) { dv[v] = d; viaU[v] = x; }
        }
      } else {
        seenV[x] = 1;
        if (demand[x] > EPS) { t = x; break; }
        for (let u = 0; u < m; u++)
          if (!seenU[u] && flow[u * n + x] > EPS && best < du[u]) { du[u] = best; viaV[u] = x; }
      }
    }
    if (t < 0) break;                      /* unreachable: the masses didn't balance */
    const far = dv[t];
    for (let u = 0; u < m; u++) pu[u] += Math.min(du[u], far);
    for (let v = 0; v < n; v++) pv[v] += Math.min(dv[v], far);
    push(t);                               /* the route Dijkstra found is now free */
  }
  let cost = 0;
  for (let k = 0; k < m * n; k++) if (flow[k] > 0) cost += flow[k] * C[k];
  return cost;
}

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
