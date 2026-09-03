/* The graph as an operator. The symmetric normalised Laplacian
   L = I − D^{−1/2} A D^{−1/2} is what heat diffuses under and what the
   spectral embedding takes its eigenvectors from. Stored compressed sparse
   row, since a notes graph is a few hundred nodes and a few edges each. */
export interface Graph {
  n: number;
  edges: ReadonlyArray<readonly [number, number]>;
}

export interface CSR {
  rowPtr: Int32Array;
  col: Int32Array;
  val: Float64Array;
  deg: Float64Array;   /* plain degree of each node */
  n: number;
}

/* L_sym as CSR (diagonal included) */
export function normalisedLaplacian(g: Graph): CSR {
  const n = g.n;
  const deg = new Float64Array(n);
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const [a, b] of g.edges) {
    if (a === b) continue;               /* a note linking itself says nothing */
    adj[a].push(b); adj[b].push(a);
    deg[a]++; deg[b]++;
  }
  /* every row carries its diagonal 1 — with no self-loops the normalised
     adjacency has an empty diagonal, so I contributes it whole. An isolated
     node's row is just that 1: still a unit of identity, nothing to share. */
  const rowPtr = new Int32Array(n + 1);
  for (let i = 0; i < n; i++) rowPtr[i + 1] = rowPtr[i] + adj[i].length + 1;
  const nnz = rowPtr[n];
  const col = new Int32Array(nnz);
  const val = new Float64Array(nnz);
  for (let i = 0; i < n; i++) {
    const cols = adj[i].slice().sort((a, b) => a - b);
    let p = rowPtr[i], placed = false;
    for (const j of cols) {
      if (!placed && j > i) { col[p] = i; val[p] = 1; p++; placed = true; }
      col[p] = j; val[p] = -1 / Math.sqrt(deg[i] * deg[j]); p++;
    }
    if (!placed) { col[p] = i; val[p] = 1; }
  }
  return { rowPtr, col, val, deg, n };
}

/* connected component id per node, 0-based, components numbered by first
   touch in node order */
export function components(g: Graph): Int32Array {
  const n = g.n;
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const [a, b] of g.edges) {
    if (a === b) continue;
    adj[a].push(b); adj[b].push(a);
  }
  const id = new Int32Array(n).fill(-1);
  let next = 0;
  const stack: number[] = [];
  for (let s = 0; s < n; s++) {
    if (id[s] !== -1) continue;
    id[s] = next;
    stack.push(s);
    while (stack.length) {
      const u = stack.pop()!;
      for (const v of adj[u]) if (id[v] === -1) { id[v] = next; stack.push(v); }
    }
    next++;
  }
  return id;
}

/* y = L x for a CSR L, into out */
export function apply(L: CSR, x: Float64Array, out: Float64Array): void {
  for (let i = 0; i < L.n; i++) {
    let s = 0;
    for (let p = L.rowPtr[i]; p < L.rowPtr[i + 1]; p++) s += L.val[p] * x[L.col[p]];
    out[i] = s;
  }
}
