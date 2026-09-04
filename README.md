# @mmogr/orrery

The observatory's physics. Small derived models for pages that draw their
data as a world: a sky whose shape comes from a graph's spectrum, planets
that obey Kepler, a moon computed rather than faked, terrain lit by an
honest lamp, a camera that is the damped oscillator it always pretended
to be.

Built for and used by [mattogrady.com](https://mattogrady.com), where the
notes of a maths/CS/physics degree hang as constellations over a mountain
range grown from a year of commits. Everything here is the working part of
that page, extracted because a model worth deriving is worth reading.

## The models

| module | what it is |
|---|---|
| `sky/spectral` | rest positions for a notes graph from the three smallest non-trivial eigenvectors of its normalised Laplacian — what is taught together sits together, and the third mode is depth |
| `sky/springs` | a velocity-Verlet layer over the rest state: springs breathe, hands deform, the shape comes home |
| `sky/heat` | the heat equation on the graph — open a note and warmth diffuses along its links |
| `orbits/kepler` | activity → semi-major axis → period by $T^2 \propto a^3$; position by solving Kepler's equation, not by lookup |
| `orbits/svd` | language space: the principal directions of a repo × language byte matrix, stretching and leaning each orbit |
| `orbits/binaries` | double planets: repos whose commits rose and fell together, found by lagged correlation with a Fisher-z bar |
| `moon` | the true lunar age from a truncated Meeus ephemeris, held against the old mean-lunation model it replaces |
| `terrain/*` | a contribution heightfield with an analytic gradient, rivers by steepest descent, Lambert shading with a named lamp, snow by polygon clipping, and the year's derivatives, inflections and entropy |
| `camera` | exponential follows and a damped harmonic sway, fitted from the per-frame constants they replace |
| `math/*` | the small dense toolbox underneath: Cholesky, Jacobi eigen, Gaussian derivative kernels, DFT, lagged correlation, entropy |

Every model has a derivation in [`docs/`](./docs) listing its equations and
constants — and an "Aesthetic terms" section admitting what exists for feel
rather than physics. The rule of the house: every quantity that reaches the
sky carries a name, a unit, and one sentence a legend can say about it. If
the sentence cannot be written, it does not ship.

## Character

- **Zero dependencies.** The whole package minifies to a few tens of
  kilobytes; a test keeps that promise.
- **Deterministic.** Time and randomness are arguments. Seed a model and it
  repeats to the bit; the site's fixtures depend on it.
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
<https://mmogr.github.io/orrery/>.

## Releasing

A release note travels with the change: a pull request that alters what the
package does adds a changeset (`npx changeset`, naming `patch`, `minor` or
`major` with a sentence in your own words; CI insists on one when `src/`
moves). A standing "Version Packages" pull request gathers the notes into
`CHANGELOG.md` and the version; merging it is the release — the workflow
tags `vX.Y.Z`, writes the GitHub release, and publishes to npm with
provenance through trusted publishing. Every version on npm carries a provenance attestation naming the commit
and the workflow run that built it.
