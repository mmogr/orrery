# Double planets

Two repos whose daily commit series rose and fell together this year —
within a week of each other — are drawn as a binary. The test has to be
mean: a year of mostly-zero series offers a lot of ways to correlate by
accident, and a fake binary is worse than none.

## The statistic

For each qualifying pair the lagged cross-correlation scans offsets
$\tau \in [-7, +7]$ days and keeps the strongest Pearson $r$ over the
overlap (positive $\tau$: the second series does what the first did
$\tau$ days later). Only series with at least 8 non-zero days may enter —
a repo touched twice can't testify about anything.

Significance uses the Fisher transform. For a true correlation of zero,

$$z = \operatorname{atanh}(r)\,\sqrt{m - 3}$$

is approximately standard normal, where $m$ is the overlap length. So $z$
converts an $r$ on any sample size into "how many standard deviations of
luck would this take", and one threshold serves short overlaps and long
ones fairly.

## Why $z \ge 3.4$

With $n$ repos on the roster there are $\binom{n}{2}$ pairs; around
$n = 11$ that is $\sim 55$ hypotheses tested at once. Bonferroni at
family-wise $\alpha = 0.05$ demands per-pair $\alpha' = 0.05/55 \approx
9.1\times10^{-4}$, i.e. $|z| \ge 3.32$ two-sided. We round up to $3.4$
(two-sided $p \approx 6.7\times10^{-4}$, family-wise $\approx 0.037$),
and the small margin is honest about a wrinkle Bonferroni doesn't see:
each pair reports its *best* of 15 lags, not a single pre-registered
test, so its null distribution is a maximum, slightly heavier-tailed than
one normal. The extra strictness absorbs part of that; the $|r| \ge 0.3$
floor covers the rest by refusing correlations too weak to draw no
matter how long the overlap makes their $z$.

Both gates must pass: $|r|$ says the coupling is *strong enough to see*,
$|z|$ that it is *unlikely to be luck*. Either alone fails — a long
overlap can make a trivial $r = 0.15$ "significant", and a 10-day overlap
can produce $r = 0.9$ from nothing.

## Greedy matching

A busy repo would happily correlate with half the roster, and a sky of
overlapping binaries reads as noise. So pairs that pass both gates are
sorted by $|r|$ descending (ties broken by index, for determinism) and
matched greedily: each repo joins at most one binary, the strongest claim
on it winning. This is the standard greedy approximation to maximum-weight
matching — at least half the optimal total weight, and in practice on a
handful of pairs, indistinguishable from it — for one pass and no
machinery.
