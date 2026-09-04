---
"@mmogr/orrery": patch
---

Depth draws its starting vectors from its own stream, so asking
`spectralEmbedding` for the third coordinate leaves `x` and `y` exactly
as the two-coordinate release drew them on every graph, repeated
eigenvalues included.
