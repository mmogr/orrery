---
"@mmogr/orrery": minor
---

Double planets are now tested honestly: `findBinaries` judges each pair's
best lagged correlation against a permutation null of circularly shifted
years and keeps the pairs whose Benjamini–Hochberg q-value is within a
stated false-discovery rate (`fdr`, default 0.1), reporting `p` and `q`
with each pair. `benjaminiHochberg` is exported from the stats toolbox.
The Fisher-z bar and its `minZ` option are gone; `permutations` and
`seed` arrive.
