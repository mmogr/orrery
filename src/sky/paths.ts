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
