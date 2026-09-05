---
"@mmogr/orrery": minor
---

The velocity holds to the last week: `convolveReflect` takes an `odd` flag and extends the series *through* its endpoint ($\tilde{x}[n-1+m] = 2x[n-1] - x[n-1-m]$) rather than mirroring it about it, and `smoothed` chooses the extension per order — the odd order-1 kernel against the odd extension, the even orders against the mirror. Under the mirror alone the order-1 estimate is identically zero at both ends, so a year that climbed all December reported a dead stop in its final week and momentum with it. `weekly` no longer claims to know what a chunk of seven means; that is the caller's calendar, not this module's.
