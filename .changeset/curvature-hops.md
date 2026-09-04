---
"@mmogr/orrery": patch
---

`ollivierRicci` is several times faster on a real notes graph: the hop
table is built once per graph rather than walked per link, and the mass
the two walks already share stays put, so only each side's surplus is
transported. The numbers are unchanged; the closed forms still hold.
