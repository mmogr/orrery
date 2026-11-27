# @mmogr/orrery

[![npm version](https://badge.fury.io/js/@mmogr%2Forrery.svg)](https://www.npmjs.com/package/@mmogr/orrery)

Small, exact mathematics for pages that draw their data. A graph as an
operator and what follows from it, Kepler's problem and the pull between
bodies, motion that does not depend on the frame rate, and the dense linear
algebra, statistics and transforms those stand on.

There is no domain in it. Nothing here knows what a node or a series means,
fetches anything, or draws anything: every function takes numbers and gives
numbers back, and what they stand for is the caller's. It began as the
working part of [mattogrady.com](https://mattogrady.com) and was that
page's physics until 0.5.0, when the page's own rules went home to it.

## The modules

| module | what it is |
|---|---|
| `graph/laplacian` | a graph as an operator: the symmetric normalised Laplacian in compressed sparse row, and the graph's connected components |
| `graph/spectral` | a graph's shape from its links alone: the three smallest non-trivial eigenvectors of its Laplacian, so what is linked together sits together, and the third mode is depth |
| `graph/heat` | the heat equation on the graph: warm a node and the warmth diffuses along its links |
| `graph/hks` | the heat kernel signature: what diffusing from every node at once leaves at each one, sampled at two times so a node reads locally busy against structurally central, and read as magnitudes on Pogson's ratio when it has to be drawn |
| `graph/paths` | hop counts and weighted shortest paths between every pair of nodes |
| `graph/curvature` | Ollivier–Ricci curvature per link, by exact optimal transport between the two ends' lazy walks: a bridge is negative, a clique positive |
| `graph/ricci-flow` | discrete Ricci flow on link lengths: a bridge stretches, a weave tightens, and the graph parts into the communities modularity reads off the lengths, counting how many of them the cut itself made |
| `orbit/kepler` | Kepler's problem: Kepler's equation by Newton with its residual checked, the true anomaly, where a body is on its orbit at a time, and when it will next be somewhere, exactly |
| `orbit/nbody` | the pull between bodies: the same system with masses, integrated by leapfrog, its energy, and the along-track shift the pull leaves on each Kepler orbit |
| `motion` | an exponential approach in closed form and a damped harmonic oscillator, substepped: the two per-frame eases, stated so they mean the same at any frame rate |
| `math/linalg` | Cholesky, Jacobi eigen, orthogonalisation and Procrustes, dense, for symmetric problems a few hundred wide |
| `math/svd` | the thin singular value decomposition, by the eigen-decomposition of the smaller Gram matrix |
| `math/stats` | z-scores, lagged correlation, entropy, ranks, Pearson and Spearman, Benjamini–Hochberg, and Mantel's permutation test for two distance matrices |
| `math/kernels` | Gaussian smoothing kernels and their derivative forms, with a boundary extension chosen per parity |
| `math/dft` | the discrete Fourier transform of a short series, and a blunt bar for saying it has a rhythm |
| `math/wavelet` | a Morlet scalogram by direct convolution, the cone of influence that says which scales each sample can vouch for, and the ridge |
| `math/circular` | statistics on a circle: a von Mises fit, mean direction, concentration κ, and a density that cannot overflow |
| `rng` | a seeded linear congruential generator, so a run is a function of its inputs |

The graph, orbit and motion models and the three transforms (`dft`,
`wavelet`, `circular`) each have a derivation in [`docs/`](./docs) listing
their equations and constants, with an "Aesthetic terms" section admitting
what is a choice rather than mathematics. The linear algebra, the SVD, the
kernels and the statistics are textbook, and are documented where they are
written.

## Character

- **Zero dependencies.** The whole package minifies to a few tens of
  kilobytes; a test keeps that promise.
- **Deterministic.** Time and randomness are arguments. Seed a model and it
  repeats to the bit.
- **Small dense maths, on purpose.** The graphs are hundreds of nodes, the
  matrices tens wide. Cholesky and Jacobi at that size are simpler, exact
  enough, and fit in your head — no numerics framework earns its place here.

## Use

```sh
npm install @mmogr/orrery
```

```ts
import { spectralEmbedding, scaleToBox } from "@mmogr/orrery";

const rest = scaleToBox(spectralEmbedding({ n, edges }), width, height);
```

Written in strict TypeScript as ES modules; `npm run build` emits the
JavaScript and declarations the package exports (installing from git runs
it for you). `npm test` runs the suites under Node's own test runner,
`npm run demo` serves the demo page, and the same demo runs live at
<https://mmogr.github.io/orrery/>. Three of the tests
look past the mathematics: `test/real-graph.test.ts` holds a real graph's (191 nodes, 1,368 links)
curvature and flow to the numbers on file (`UPDATE_GOLDEN=1 npm test` rewrites
them, for a change meant to move them) and the solver's work to a budget
counted in steps rather than milliseconds, and `test/package.test.ts` packs
the tarball and uses it by name, as a consumer would.

## From 0.4

0.5.0 took out everything that was one page's and not mathematics. If you
were using any of it, 0.4.1 stays on npm and is unchanged.

- **Gone:** the feed contracts and validators (`feeds/*`), the notes-graph
  rule, the semantic layout, the spring layout (`stepLayout`), the terrain,
  the moon, `Observable`, the orbit fitting (`FIT`, `fitKepler`,
  `elementsFrom`, `arcPos`), `findBinaries`, `languageSpace`, and the
  camera's constants and fence (`CAMERA`, `fence`).
- **Moved:** `sky/*` is `graph/*`, `orbits/*` is `orbit/*`, `camera` is
  `motion`, and `svd` is in `math/svd`. The package has one entry point, so
  the names you import are the same; only a deep path into `src/` changes.
- **Changed:** `Elements` has no `tilt`. `phasePerturbations` takes its
  coupling `G` as a required argument, since the default was one page's
  taste.

## Releasing

A release note travels with the change: a pull request that alters what the
package does adds a changeset (`npx changeset`, naming `patch`, `minor` or
`major` with a sentence in your own words; CI insists on one when `src/`
moves). A standing "Version Packages" pull request gathers the notes into
`CHANGELOG.md` and the version; merging it is the release — the workflow
tags `vX.Y.Z`, writes the GitHub release, and publishes to npm with
provenance through trusted publishing. Every version on npm carries a provenance attestation naming the commit
and the workflow run that built it.
