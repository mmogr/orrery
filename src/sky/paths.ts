/* Distances on the graph. Hop counts by breadth-first search from every
   node — the metric the semantic sky compares meaning against, and the
   one Ollivier's transport costs read on an unweighted graph. n×n,
   row-major, 65535 where two nodes never meet. */
import type { Graph } from "./laplacian.ts";

export const UNREACHABLE = 65535;

export function adjacency(g: Graph): number[][] {
  const adj: number[][] = Array.from({ length: g.n }, () => []);
  for (const [a, b] of g.edges) {
    if (a === b) continue;
    adj[a].push(b); adj[b].push(a);
  }
  return adj;
}

export function hopDistances(g: Graph): Uint16Array {
  const n = g.n, adj = adjacency(g);
  const d = new Uint16Array(n * n).fill(UNREACHABLE);
  const queue = new Int32Array(n);
  for (let s = 0; s < n; s++) {
    const row = s * n;
    d[row + s] = 0;
    let head = 0, tail = 0;
    queue[tail++] = s;
    while (head < tail) {
      const u = queue[head++], du = d[row + u];
      for (const v of adj[u])
        if (d[row + v] === UNREACHABLE) { d[row + v] = du + 1; queue[tail++] = v; }
    }
  }
  return d;
}

/* shortest-path lengths on a graph whose links have lengths (indexed like
   g.edges), Dijkstra from every node with a binary heap; n×n row-major,
   Infinity where two nodes never meet. This is the metric the weighted
   curvature and the Ricci flow read. */
export function shortestPaths(g: Graph, lengths: ArrayLike<number>): Float64Array {
  const n = g.n;
  const adj: Array<Array<[number, number]>> = Array.from({ length: n }, () => []);
  g.edges.forEach(([a, b], e) => {
    if (a === b) return;
    adj[a].push([b, lengths[e]]); adj[b].push([a, lengths[e]]);
  });
  const d = new Float64Array(n * n).fill(Infinity);
  const heapV = new Int32Array(n * 4 + 4), heapD = new Float64Array(n * 4 + 4);
  for (let s = 0; s < n; s++) {
    const row = s * n;
    d[row + s] = 0;
    let size = 0;
    const push = (v: number, dv: number): void => {
      let i = size++;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heapD[p] <= dv) break;
        heapV[i] = heapV[p]; heapD[i] = heapD[p]; i = p;
      }
      heapV[i] = v; heapD[i] = dv;
    };
    push(s, 0);
    while (size) {
      const u = heapV[0], du = heapD[0];
      /* pop: sift the last item down */
      size--;
      const lv = heapV[size], ld = heapD[size];
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= size) break;
        if (c + 1 < size && heapD[c + 1] < heapD[c]) c++;
        if (heapD[c] >= ld) break;
        heapV[i] = heapV[c]; heapD[i] = heapD[c]; i = c;
      }
      if (size) { heapV[i] = lv; heapD[i] = ld; }
      if (du > d[row + u]) continue;               /* a stale entry */
      for (const [v, w] of adj[u]) {
        const nd = du + w;
        if (nd < d[row + v]) { d[row + v] = nd; push(v, nd); }
      }
    }
  }
  return d;
}
