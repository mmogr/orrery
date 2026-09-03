/* Heat on the graph: open a note and warmth diffuses along the links —
   literally the heat equation ∂u/∂t = −Lu, stepped by explicit Euler.
   Stable for dt ≤ 0.45 since the eigenvalues of L_sym sit in [0, 2].
   decay < 1 cools the whole field so attention fades. In place. */
import type { CSR } from "./laplacian.ts";

export function diffuse(u: Float64Array, L: CSR, dt: number, steps: number, decay: number): void {
  throw new Error("todo: diffuse");
}
