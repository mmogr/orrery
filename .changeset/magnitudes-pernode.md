---
"@mmogr/orrery": minor
---

`magnitudes` in `sky/hks`: the heat kernel signature read on Pogson's ratio, $m = -2.5\log_{10}(v / \max v)$, so a consumer drawing it has a scale that uses its whole range instead of spending it on the top few notes. Zero is the brightest, a factor of a hundred is five magnitudes, and a non-positive value is floored rather than sent to infinity. `LinkOpts.perNode` in `sky/semantic`: at most this many suggested pairs may touch any one note, so a dense corner of the corpus cannot take every place in the list and say the same thing five times. Both default to today's behaviour.
