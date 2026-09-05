# Momentum: the year as a signal, and the aurora it will drive

*`src/terrain/series.ts`, on `src/math/kernels.ts`*

## The weekly series

The daily contribution counts are summed into weeks exactly as the terrain
bins them: chunks of seven from index 0, the last partial week kept, so $n$
days yield $\lceil n/7 \rceil$ sums. What a chunk means belongs to the
caller: a series whose index 0 opens a calendar week yields that calendar's
weeks, and a caller who already holds its own column sums should hand those
over instead of re-chunking days. This module knows no calendar.

## Gaussian derivatives

Level, velocity and acceleration all come from one kernel family. With
$G_\sigma(i) = e^{-i^2/2\sigma^2}$ sampled on $i \in [-\lceil 4\sigma\rceil,
\lceil 4\sigma\rceil]$ (default $\sigma = 1.5$ weeks):

- **order 0** — $G_\sigma$ normalised to sum 1: the smoothed level $s$;
- **order 1** — $i\,G_\sigma(i)$, scaled so a unit ramp answers with slope
  1: the velocity $d_1$, in contributions/week per week;
- **order 2** — $(i^2 - s)\,G_\sigma(i)$ with $s$ chosen to kill the
  constant response, scaled so $t^2/2$ answers 1: the acceleration $d_2$.

Smoothing and differentiating commute here by construction — $d_1$ *is* the
derivative of the Gaussian-smoothed year.

## The boundary, per parity

A kernel of half-width $h$ needs $h$ samples that do not exist at either
end, and how they are invented decides what the estimate says about the
year's first and last weeks — the two the sky cares most about, since
momentum reads $d_1$ at the very last one.

Two extensions, and the choice is forced by parity. The **mirror** repeats
the samples about the endpoint,

$$\tilde{x}[-m] = x[m], \qquad \tilde{x}[n-1+m] = x[n-1-m],$$

which is even about the end. Integrated against the odd order-1 kernel that
is $\int (\text{even}) \cdot (\text{odd}) = 0$: the mirror reports a dead
stop in the last week of *every* year, whatever the year did. The
**reflection through the endpoint** continues the series instead,

$$\tilde{x}[-m] = 2x[0] - x[m], \qquad
  \tilde{x}[n-1+m] = 2x[n-1] - x[n-1-m],$$

which is odd about the end, and which a ramp satisfies exactly — so a year
climbing at three a week still reads three in its final week. The same
argument run the other way forces $d_2$ to zero under that extension, so the
orders take opposite extensions: $d_1$ reflects through the endpoint, $s$
and $d_2$ mirror. In short, **the extension's parity is the opposite of the
kernel's**.

`convolveReflect(x, k, odd)` folds an index back into range one reflection
at a time, carrying the affine correction $\tilde{x}[j] = a + b\,x[j]$ each
fold contributes, so a kernel wider than the series still extends correctly
rather than only once.

## Inflections

The weeks the year genuinely turned: indices $i \ge 1$ where

$$
\operatorname{sign} d_2[i] \ne \operatorname{sign} d_2[i-1],
\quad \text{both nonzero}, \quad |d_1[i]| > \text{floor}.
$$

The pace gate matters — a flat stretch's acceleration flickers around zero
and would otherwise mark a turn every other week. Only sign changes taken
*at speed* count.

## Momentum

$$
M = \operatorname{clip}\!\left(\frac{d_1[\text{last}]}{\sigma_{d_1}},\ -1,\ 1\right)
$$

where $\sigma_{d_1}$ is the *population* standard deviation of the whole
velocity series: the latest velocity measured as a z-score against the
year's own spread, so a sprint only counts as one by this year's standards.
The clip keeps one wild week from owning the sky; $\sigma_{d_1} = 0$ (a
perfectly steady year) scores 0 — no spread, no standing.

## The aurora rule (M5b, to come)

Momentum will drive the aurora's intensity. The rule, fixed here so the
constant is on record before the pixels are:

$$
\text{auroraI} = \max\bigl(\text{streak term},\ 0.25 + 0.75\,
\operatorname{smoothstep}(M)\bigr)
$$

— a floor of $0.25$ so a live streak always glows, the remaining $0.75$
budget eased in by momentum's smoothstep rather than linearly, so the sky
neither flickers at the threshold nor saturates early.
