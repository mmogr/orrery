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
  throw new Error("todo: normalisedLaplacian");
}

/* connected component id per node, 0-based, components numbered by first
   touch in node order */
export function components(g: Graph): Int32Array {
  throw new Error("todo: components");
}

/* y = L x for a CSR L, into out */
export function apply(L: CSR, x: Float64Array, out: Float64Array): void {
  throw new Error("todo: apply");
}
