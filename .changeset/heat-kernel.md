---
"@mmogr/orrery": minor
---

The sky gains a heat kernel signature: `heatKernelSignature` returns, for
every note at each of a few diffusion times, how much of its own warmth
would still be home — the diagonal of the heat kernel, summed over the
whole spectrum of the normalised Laplacian, component by component. The
default scales `HKS_SCALES = [1, 10]` read a note's local busyness against
its structural place, and a component past `HKS_MAX_DENSE = 600` notes gets
the large-time limit, its degree share, rather than a Jacobi run.
