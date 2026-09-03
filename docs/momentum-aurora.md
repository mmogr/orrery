# Momentum: the year as a signal, and the aurora it will drive

*`src/terrain/series.ts`, on `src/math/kernels.ts`*

## The weekly series

The daily contribution counts are summed into weeks exactly as the terrain
bins them: chunks of seven from index 0, the last partial week kept, so $n$
days yield $\lceil n/7 \rceil$ sums. The site hands this function the
terrain-aligned days — index 0 is the Sunday that opens the year's first
column — which makes the chunks Sunday-anchored without this module knowing
a calendar exists.

## Gaussian derivatives

Level, velocity and acceleration all come from one kernel family. With
$G_\sigma(i) = e^{-i^2/2\sigma^2}$ sampled on $i \in [-\lceil 4\sigma\rceil,
\lceil 4\sigma\rceil]$ (default $\sigma = 1.5$ weeks):

- **order 0** — $G_\sigma$ normalised to sum 1: the smoothed level $s$;
- **order 1** — $i\,G_\sigma(i)$, scaled so a unit ramp answers with slope
  1: the velocity $d_1$, in contributions/week per week;
- **order 2** — $(i^2 - s)\,G_\sigma(i)$ with $s$ chosen to kill the
  constant response, scaled so $t^2/2$ answers 1: the acceleration $d_2$.

The series reflects at both ends before convolving, so the estimates hold
to the edges instead of fading. Smoothing and differentiating commute here
by construction — $d_1$ *is* the derivative of the Gaussian-smoothed year.

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
