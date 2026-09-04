# @mmogr/orrery

## 0.2.1

### Patch Changes

- 1c1f0b1: `ollivierRicci` is several times faster on a real notes graph: the hop
  table is built once per graph rather than walked per link, and the mass
  the two walks already share stays put, so only each side's surplus is
  transported. The numbers are unchanged; the closed forms still hold.

## 0.2.0

### Minor Changes

- e795af4: Double planets are now tested honestly: `findBinaries` judges each pair's
  best lagged correlation against a permutation null of circularly shifted
  years and keeps the pairs whose Benjamini–Hochberg q-value is within a
  stated false-discovery rate (`fdr`, default 0.1), reporting `p` and `q`
  with each pair. `benjaminiHochberg` is exported from the stats toolbox.
  The Fisher-z bar and its `minZ` option are gone; `permutations` and
  `seed` arrive.
- c349736: Curvature: `ollivierRicci` gives every link of a graph its Ollivier–Ricci
  curvature, the transport cost between the two ends' lazy random walks
  turned into a number that is negative on a bridge and positive inside a
  clique. The transport is solved exactly by successive shortest paths
  (`transportCost`, also exported), not approximated.
- d3b9ea5: The sky gains a heat kernel signature: `heatKernelSignature` returns, for
  every note at each of a few diffusion times, how much of its own warmth
  would still be home — the diagonal of the heat kernel, summed over the
  whole spectrum of the normalised Laplacian, component by component. The
  default scales `HKS_SCALES = [1, 10]` read a note's local busyness against
  its structural place, and a component past `HKS_MAX_DENSE = 600` notes gets
  the large-time limit, its degree share, rather than a Jacobi run.
- 1d26e0a: The pull between planets: `phasePerturbations` integrates the sky's
  planets as a real planar n-body system — the centre Kepler's third law
  implies, and every project with a mass from its commits — by kick-drift-
  kick leapfrog, and returns the shift in orbit fraction each has
  accumulated from feeling the others. `keplerState`, `leapfrog` and
  `energy` are exported for anyone who wants the system itself.
- 0a20a44: The spectral sky gains depth: `spectralEmbedding` now returns a third
  coordinate, `z`, from the third non-trivial eigenvector of the normalised
  Laplacian, and `scaleToBox` scales it with the other two. `x` and `y` are
  unchanged. An `Embedding` you build by hand needs a `z` (zeros will do).
- 9b0ac95: Circular statistics: `vonMisesFit` puts weights on equally spaced
  directions — the seven days of a week — and returns the mean direction,
  the resultant length and the von Mises concentration κ; `vonMisesDensity`
  and `besselI0e` evaluate the fitted density without ever forming e^κ.
- 5ec4828: The year's beat: `math/wavelet` adds a Morlet scalogram of a short series
  by direct convolution, the cone of influence that says which scales each
  week can vouch for, and the ridge that reads off the loudest trustworthy
  period week by week — the time-resolved sibling of the year-rhythm DFT.
  A fifth demo tab draws it over the terrain's own weekly commits, and
  `docs/year-wavelet.md` carries the derivation.

### Patch Changes

- b9a357e: Depth draws its starting vectors from its own stream, so asking
  `spectralEmbedding` for the third coordinate leaves `x` and `y` exactly
  as the two-coordinate release drew them on every graph, repeated
  eigenvalues included.

## 0.1.1

### Patch Changes

- 4597ffc: The release pipeline: a standing version pull request gathered from
  changesets, publication to npm with provenance, and the tag and GitHub
  release cut from the same merge.

## 0.1.0

The observatory's physics, first release: a spectral sky, Verlet springs,
heat on the graph, Kepler orbits with language space and binaries, the
Meeus moon, shaded terrain with rivers and the year's derivatives, a damped
camera, and the feed contracts — every model with its derivation in docs/.
