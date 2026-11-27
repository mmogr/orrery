# A short series' rhythm: a small DFT and an honest bar

*`src/math/dft.ts`. The worked example is a year of weekly counts, $N = 53$.*

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
rival is not a story worth telling. (Series shorter than 8 points
— fewer than 4 bins — are refused outright for the same reason.)

## What the bar is for

A series with one strong cycle (a term, a quarter, a month of sprints)
clears the bar at that cycle's period. A steady series usually clears no
bar at all, and *null* is the correct reading, not a failure: it kept time
rather than rhythm.
