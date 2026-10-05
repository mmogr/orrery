---
"@mmogr/orrery": patch
---

`ollivierRicci` is about four times faster on a real notes graph: `transportCost` is now the primal-dual method, which uses up every route the current prices offer before raising them, where successive shortest paths ran one Dijkstra per push. A sky of 191 notes and 1,368 links is curved in 19 ms, down from 80; the curvatures agree with the old solver's to 2e-15 and a baked Ricci flow comes out byte for byte the same. The cost had been growing much faster than the graph, since a hub's transport problem grows with its degree squared.
