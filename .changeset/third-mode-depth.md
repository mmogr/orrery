---
"@mmogr/orrery": minor
---

The spectral sky gains depth: `spectralEmbedding` now returns a third
coordinate, `z`, from the third non-trivial eigenvector of the normalised
Laplacian, and `scaleToBox` scales it with the other two. `x` and `y` are
unchanged. An `Embedding` you build by hand needs a `z` (zeros will do).
