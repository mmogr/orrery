# Language space

GitHub reports, per repo, how many bytes of each language it holds. That
map is the raw material for two orbital elements: how *unusual* a repo's
mix is (its eccentricity) and *which way* it leans (its tilt). Both come
from the singular value decomposition of one small matrix.

## Building the matrix

Rows are repos, columns are languages, and three transformations stand
between the byte counts and the matrix $A$:

1. **Log**: $\log(1 + \text{bytes})$. Byte counts span four or five
   decades; a vendored megabyte of C would otherwise be the only fact the
   decomposition could see. The $1+$ keeps absent languages at exactly
   zero.
2. **Row normalisation** to unit sum. A repo should be its *mix*, not its
   size — a large Rust project and a small one are the same kind of
   thing. (Size already has a channel: it sets the planet's radius and
   activity.)
3. **Column centring**. Subtracting each language's mean makes the
   principal directions describe *difference from the typical repo*
   rather than the shared baseline; without it, PC1 would mostly recover
   "everything uses the common languages", which is true and useless.

## The decomposition

The thin SVD $A = U\Sigma V^\top$ is computed by the eigen-decomposition
of the smaller Gram matrix — $A^\top A$ when there are fewer languages
than repos, $AA^\top$ otherwise — using the same Jacobi eigensolver the
spectral sky uses. If $A^\top A\,v = \sigma^2 v$ then $u = Av/\sigma$
completes the pair, and symmetrically on the other side. Singular values
come out descending; a singular value within rounding of zero gets a
zeroed partner column rather than a fabricated one.

## What PC1 and PC2 mean

The right singular vectors $v_1, v_2$ are the two directions in language
space along which the repos disagree most (in the least-squares sense —
this is PCA on the centred rows). $v_1$'s entries are *loadings*: a
language with a large positive loading pulls repos rich in it toward one
end, a large negative loading toward the other. The label the page hangs
on the axis, `axis1`, is simply the two languages at $v_1$'s extremes,
most negative first.

A repo's coordinates are its projections,

$$x_i = \frac{(A v_1)_i}{\sqrt{n}} = \frac{\sigma_1 U_{i1}}{\sqrt{n}},
\qquad y_i = \frac{\sigma_2 U_{i2}}{\sqrt{n}},$$

scaled by $1/\sqrt{n}$ so the spread reads like a standard deviation
rather than a sum — the numbers stay comparable as the roster grows. From
these the orbit takes $d_{\text{lang}}$ (the radius $\sqrt{x^2 + y^2}$,
normalised to the roster's largest) and $\ell$ (the $x$ coordinate,
likewise normalised).

## The sign convention

A singular vector is only defined up to sign: $(u, v)$ and $(-u, -v)$
factor the same matrix, and which one an eigensolver returns depends on
rounding order. Left alone, a rebuilt feed could flip the sky's lean
overnight. So each principal direction is oriented by fiat: the language
with the largest $|$loading$|$ on that direction loads *positive* (ties
broken by column order, which is alphabetical). Same data, same picture,
every time.
