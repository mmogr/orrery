# The spectral sky

The constellation's rest state comes from the links alone. No forces, no
iteration-until-it-looks-right: we ask the graph where its notes want to
sit, and the answer is an eigenvector problem.

## Why the normalised Laplacian

For a graph on $n$ nodes with adjacency $A$ and degree matrix $D$, the
symmetric normalised Laplacian is

$$L_{\mathrm{sym}} = I - D^{-1/2} A D^{-1/2}.$$

We prefer it to the combinatorial Laplacian $D - A$ for two reasons. First,
its spectrum is confined: $0 = \lambda_1 \le \lambda_2 \le \dots \le
\lambda_n \le 2$, independent of how uneven the degrees are — which is what
lets the heat solver (docs/heat.md) fix one stable time step for every
graph. Second, its quadratic form

$$x^\top L_{\mathrm{sym}}\, x = \sum_{(i,j) \in E}
\left( \frac{x_i}{\sqrt{d_i}} - \frac{x_j}{\sqrt{d_j}} \right)^{\!2}$$

measures disagreement per unit of degree, so a hub does not dominate the
embedding merely by having many edges. In a notes graph the hubs are index
pages; we want them central, not gravitational.

The kernel is easy to see from the quadratic form: it vanishes when
$x_i/\sqrt{d_i}$ is constant, i.e. on $x = D^{1/2}\mathbf{1}$. On a
connected component that is the whole kernel. This *trivial* eigenvector
carries no placement information — it is the "everything in one point"
solution — so we deflate it and look at what comes next.

## What the Fiedler vector means here

The first non-trivial eigenvector (the Fiedler vector, $\lambda_2$)
minimises the quadratic form subject to being orthogonal to the trivial
one: it is the smoothest possible non-constant function on the graph. Notes
that are linked — taught together — receive nearby values; the best
"cut" of the graph shows up as its sign change. On a path it is a single
cosine arch, monotone from one end to the other; on two cliques joined by
a bridge it is nearly constant on each clique, with opposite signs. Used as
an $x$-coordinate it spreads the graph along its longest intrinsic axis.
The next eigenvector, orthogonal to both, is the second-smoothest mode and
becomes $y$. Two coordinates, two smallest non-trivial eigenvectors: that
is the whole embedding.

One refinement: the eigenvector $v$ of $L_{\mathrm{sym}}$ lives in
$D^{1/2}$-weighted space. The coordinates we plot are $u = D^{-1/2} v$,
the corresponding eigenvector of the random-walk Laplacian
$I - D^{-1}\!A$. This undoes the degree weighting — on a path it is the
plain cosine mode, strictly monotone — and it is what makes "linked notes
sit together" true in the picture rather than merely in the weighted norm.

## Computing the eigenvectors

Components are embedded separately (eigenvectors of a disconnected graph
mix components arbitrarily). Per component, with $n$ at most a few hundred,
we densify $L_{\mathrm{sym}}$ from its CSR form and run **shifted inverse
iteration**:

1. factor $L_{\mathrm{sym}} + \sigma I$ once by Cholesky, $\sigma = 10^{-3}$
   (the shift lifts $\lambda = 0$ so the factor exists);
2. start from a seeded random vector, `rng(seed ?? 1)`;
3. repeat: solve, deflate (orthogonalise against $D^{1/2}\mathbf{1}$
   normalised and every eigenvector already found), normalise;
4. stop when successive iterates agree to $10^{-8}$ (sign-aligned), or
   after $200$ iterations.

Inverse iteration amplifies the eigenvector of the smallest remaining
eigenvalue at ratio $(\lambda_2 + \sigma)/(\lambda_3 + \sigma)$ per step;
with deflation applied every iteration the found subspace cannot leak back
in. The sign of each finished vector is pinned (largest-magnitude entry
positive) so the same graph always faces the same way.

## Assembling the whole sky

- Each component's coordinates are centred and lifted to unit per-axis RMS
  (an eigenvector is unit-norm, so multiplying by $\sqrt{n}$ does it), so
  components of different sizes speak the same units.
- Components pack along $x$ by size: the largest holds the centre, the
  rest alternate outward right, left, right…, each clearing its neighbour
  by its own half-width plus a margin of $1$ (in unit-RMS coordinates).
- An isolated node is its own component with nothing to diagonalise. It is
  placed on a small ring of radius $0.6$ about its pack slot, at angle
  $k \cdot 2.39996\ldots$ (the golden angle) for the $k$-th lone star —
  deterministic, and no two coincide.
- Finally the whole embedding is centred and each axis scaled to unit RMS.
  That is the contract: `spectralEmbedding` returns standard units, and
  `scaleToBox(e, w, h)` maps them into $[-w/2, w/2] \times [-h/2, h/2]$
  with a **single** factor for both axes — the tighter wall decides — so
  the sky's aspect is preserved, never stretched to fill.

## Constants

| constant | value | role |
| --- | --- | --- |
| $\sigma$ (shift) | $10^{-3}$ | makes $L_{\mathrm{sym}} + \sigma I$ positive definite for Cholesky |
| residual tolerance | $10^{-8}$ | inverse-iteration convergence |
| iteration cap | $200$ | per eigenvector |
| default seed | $1$ | `rng(seed ?? 1)` for the starting vectors |
| pack margin | $1$ | gap between components, unit-RMS coordinates |
| lone-star ring | $0.6$ | radius of the singleton ring |
| golden angle | $2.399963\ldots$ | singleton spacing around the ring |

## Aesthetic terms

Everything above is forced by the mathematics except: the **pack margin**
and its alternating right–left order (any deterministic packing would do;
this one keeps the biggest constellation where the eye rests); the
**lone-star ring** radius and its golden-angle stepping, which exist so
isolated notes read as a scattering rather than a stack; and the choice of
**two** eigenvectors — the sky is a plane because the page is. The
`restPull` force in docs/springs.md is the only consumer of this rest
state; its strength there, not anything here, decides how literally the
sky obeys the spectrum.
