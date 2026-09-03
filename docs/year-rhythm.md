# Year rhythm: a small DFT and an honest bar

*`src/math/dft.ts`, fed by the weekly series of `src/terrain/series.ts`*

## The transform

Fifty-three weeks need no FFT. The weekly series $x_t$, mean removed, goes
through the plain discrete Fourier transform:

$$
X_k = \sum_{t=0}^{N-1} (x_t - \bar{x})\, e^{-2\pi i k t / N},
\qquad P_k = |X_k|^2, \qquad k = 1 \ldots \lfloor N/2 \rfloor,
$$

with each bin labelled by its period $N/k$ in weeks. Removing the mean
first means $P_k$ measures *rhythm*, not level — a busy year and a quiet
year with the same shape score the same spectrum. $k = 0$ is the level and
is never reported.

## The ratio-2 bar for "a rhythm exists"

A spectrum always has a largest bin; that is not a finding. The dominant
rhythm is only announced when the peak stands clear of the runner-up by a
factor of two in power:

$$
\frac{P_{\text{top}}}{P_{\text{second}}} \ge 2
$$

— otherwise the answer is *null*: no one rhythm. The bar is deliberately
blunt. With $\sim 26$ bins from one noisy year there is no honest
significance test worth quoting; a peak that cannot double its nearest
rival is not a story the legend should tell. (Series shorter than 8 points
— fewer than 4 bins — are refused outright for the same reason.)

## Semester expectations

What the bar should catch, when it is real:

- **the semester** — teaching or coursework breathes on a $\sim 13$–$18$
  week cycle: two terms and their breaks put power near $N/3$ or $N/4$;
- **the quarter** — release trains and OKR seasons show near 13 weeks;
- **the monthly cadence** — sprint-of-sprints rhythms near 4–5 weeks.

A steady professional year usually clears no bar at all — and *null* is
the correct reading, not a failure: the year kept time rather than rhythm.
