/* @mmogr/orrery: small, exact mathematics for pages that draw their data.
   A graph as an operator and what follows from it (its spectrum as a shape,
   heat, curvature, Ricci flow), Kepler's problem and the pull between
   bodies, motion that does not depend on the frame rate, and the dense
   linear algebra, statistics and transforms those stand on. No domain in
   it: nothing here knows what a node or a series means. The models have
   their derivations in docs/, and every constant a name. Zero dependencies;
   everything deterministic: time and randomness are arguments. */
export * from "./rng.ts";
export * from "./math/linalg.ts";
export * from "./math/svd.ts";
export * from "./math/kernels.ts";
export * from "./math/dft.ts";
export * from "./math/wavelet.ts";
export * from "./math/stats.ts";
export * from "./math/circular.ts";
export * from "./graph/laplacian.ts";
export * from "./graph/spectral.ts";
export * from "./graph/heat.ts";
export * from "./graph/curvature.ts";
export * from "./graph/ricci-flow.ts";
export * from "./graph/hks.ts";
export * from "./graph/paths.ts";
export * from "./orbit/kepler.ts";
export * from "./orbit/nbody.ts";
export * from "./motion.ts";
