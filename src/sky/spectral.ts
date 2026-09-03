/* The sky's shape from the links alone: a spectral embedding. Per connected
   component, the two smallest non-trivial eigenvectors of L_sym place the
   notes so that what is taught together sits together — a rest state the
   springs then breathe on. Deterministic: inverse iteration from a seeded
   start, deflating the trivial vector D^{1/2}·1 and each found vector.
   Components pack left-to-right by size along x. See docs/spectral-sky.md. */
import type { Graph } from "./laplacian.ts";

export interface Embedding {
  /* centred, unit-RMS per axis before scaleToBox */
  x: Float64Array;
  y: Float64Array;
}

export function spectralEmbedding(g: Graph, seed?: number): Embedding {
  throw new Error("todo: spectralEmbedding");
}

/* scale an embedding into a w×h box about the origin, preserving aspect */
export function scaleToBox(e: Embedding, w: number, h: number): Embedding {
  throw new Error("todo: scaleToBox");
}
