/* Heat on the graph: open a note and warmth diffuses along the links —
   literally the heat equation ∂u/∂t = −Lu, stepped by explicit Euler.
   Stable for dt ≤ 0.45 since the eigenvalues of L_sym sit in [0, 2].
   decay < 1 cools the whole field so attention fades. In place. */
import type { CSR } from "./laplacian.ts";
import { apply } from "./laplacian.ts";

export function diffuse(u: Float64Array, L: CSR, dt: number, steps: number, decay: number): void {
  /* explicit Euler is only stable while dt·λ ≤ 2 for every eigenvalue;
     λmax ≤ 2 for L_sym, and 0.45 keeps the update map non-negative too
     (see docs/heat.md), so past it we refuse rather than blow up */
  if (!(dt <= 0.45)) throw new RangeError(`dt = ${dt} exceeds the stability bound 0.45`);
  const scratch = new Float64Array(L.n);
  for (let s = 0; s < steps; s++) {
    apply(L, u, scratch);
    for (let i = 0; i < L.n; i++) u[i] = decay * (u[i] - dt * scratch[i]);
  }
}
