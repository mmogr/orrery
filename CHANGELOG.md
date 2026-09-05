# @mmogr/orrery

## 0.4.0

### Minor Changes

- f207017: The flow says how many constellations it parted: `cutCommunities` returns `parted`, the community count less the graph's own components, so a consumer can say what the cut *did* rather than how many pieces the sky happens to be in. `FlowFeed.parted` and `validateFlow` carry it, optional and never larger than the count, so an older bake still validates. `FLOW_DEFAULTS.ceil` rises from 4 to 16: at ten steps a real notes graph pins a dozen bridges against a ceiling of four, and a length pinned at the ceiling has stopped saying anything — enough of them and the cut chosen from the lengths above the mean lands above every length in the bake.
- ee8c2d8: `magnitudes` in `sky/hks`: the heat kernel signature read on Pogson's ratio, $m = -2.5\log_{10}(v / \max v)$, so a consumer drawing it has a scale that uses its whole range instead of spending it on the top few notes. Zero is the brightest, a factor of a hundred is five magnitudes, and a non-positive value is floored rather than sent to infinity. `LinkOpts.perNode` in `sky/semantic`: at most this many suggested pairs may touch any one note, so a dense corner of the corpus cannot take every place in the list and say the same thing five times. Both default to today's behaviour.
- 78c48d0: The velocity holds to the last week: `convolveReflect` takes an `odd` flag and extends the series *through* its endpoint ($\tilde{x}[n-1+m] = 2x[n-1] - x[n-1-m]$) rather than mirroring it about it, and `smoothed` chooses the extension per order — the odd order-1 kernel against the odd extension, the even orders against the mirror. Under the mirror alone the order-1 estimate is identically zero at both ends, so a year that climbed all December reported a dead stop in its final week and momentum with it. `weekly` no longer claims to know what a chunk of seven means; that is the caller's calendar, not this module's.
- 7b49bcc: Two text feeds pass the same gate as the rest. `ExcerptsFeed` / `validateExcerpts`: a note's opening prose, one line, keyed on the `html` path the graph feed already emits — trimmed, capped, deduped, and optional in the strong sense, so `validateExcerpts(null)` is the empty contract. `TextIndexManifest` / `TextShard` with `validateTextIndexManifest` and `validateTextShard`: a sharded inverted index, so a page can search a corpus's full text by fetching the one shard its query hashes into. A shard name is checked as a *name* rather than a path, since the consumer turns it into a URL, and a shard is built with a null prototype, since it is read by key. `docs/feeds.md` is the first document for the feed layer and describes every contract in the package.

## 0.3.0

### Minor Changes

- 482d9ac: Ricci flow: `ollivierRicci` takes link `lengths` and becomes Ollivier's curvature on a metric graph (`shortestPaths` in `sky/paths`); `sky/ricci-flow` runs the normalised discrete flow (`ricciFlowStep`, `ricciFlow`) and reads communities off the lengths at the cut modularity chooses (`modularity`, `cutCommunities`); `stepLayout` honours per-link rest lengths through `LayoutEnv.lengths`; `sky/notes-graph` is the rule that makes a sky of a notes feed, so a page and a script build the same graph; and `FlowFeed` / `validateFlow` carry a baked flow.
- 584f205: The sky by meaning: a `SemanticFeed` contract for the notes' embeddings (`validateSemantic`), and `sky/semantic` — the meaning layout turned by Procrustes to face the link layout, the strongest unlinked pairs by cosine, and a Mantel test of how far meaning and links agree. Underneath: `procrustes` in `math/linalg`, `ranks`, `pearson`, `spearman` and `mantel` in `math/stats`, and `hopDistances` in `sky/paths`.

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
