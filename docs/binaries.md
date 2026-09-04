# Double planets

Two repos whose daily commit series rose and fell together this year —
within a week of each other — are drawn as a binary. The test has to be
mean: a year of mostly-zero series offers a lot of ways to correlate by
accident, and a fake binary is worse than none. So the question is put
properly: how often would shuffled years look this much alike, and of
all the pairs asked at once, what share of the ones drawn may be luck?

## The statistic

For each qualifying pair the lagged cross-correlation scans offsets
$\tau \in [-7, +7]$ days and keeps the strongest Pearson $r$ over the
overlap (positive $\tau$: the second series does what the first did
$\tau$ days later). Only series with at least 8 non-zero days may enter —
a repo touched twice can't testify about anything. The statistic is
$|r|$ at its best lag.

## Why not Fisher's $z$

The earlier version converted $r$ to $z = \operatorname{atanh}(r)\sqrt{m-3}$
and demanded $|z| \ge 3.4$, a Bonferroni bar for fifty-odd pairs. That
statistic assumes two Gaussian series and a single pre-registered test.
Neither holds: the series are zero-inflated counts, whose few active
days can line up by chance far more easily than Gaussian noise would,
and each pair reports the *best* of fifteen lags, a maximum whose tail is
heavier than one normal's. Both errors point the same way — toward
calling luck a binary — and a hand-tuned margin is not an answer to them.

## The permutation null

The honest null keeps everything about each series except its
alignment with the other. Shift one series of the pair circularly by
$s \ge 7$ days (never less than the lag window, so no shift is a lag in
disguise), and its zero-inflation, its bursts and its own autocorrelation
all survive; only the coincidence with the other series is destroyed.
Then take the same best-of-lags $|r|$. Done $N$ times this samples the
statistic's distribution under "these two years have nothing to do with
each other" with the series' actual character built in.

The draws are pooled over the roster: the $k$-th draw takes the $k$-th
pair in turn, so $N = 1000$ draws cost a thousand correlations rather
than a thousand per pair, and every pair is judged against the roster's
marginal null. The assumption is that the pairs are exchangeable under
shifting, which is true up to their sparsity: a pair sparser than the
roster's average is judged a shade leniently, a denser one a shade
strictly. With eleven repos of the same year that shade is small, and it
is stated.

A pair's p-value is

$$p = \frac{1 + \#\{\text{draws} \ge |r|_{\text{obs}}\}}{1 + N},$$

with the observed year counted as one more draw from its own null, so no
$p$ is ever zero and the smallest claimable is $1/(N+1)$. That is why
$N = 1000$: Benjamini–Hochberg at $\alpha = 0.1$ over $55$ pairs needs
its top-ranked $p$ below $0.1/55 \approx 0.0018$, which $N = 200$ could
never produce.

## The false-discovery rate

Fifty-five hypotheses at once need a family rule. Bonferroni controls the
chance of *any* false pair and pays for it in power; Benjamini–Hochberg
controls the expected *share* of false pairs among those drawn, which is
the promise a sky can keep. Sort the $m$ p-values, $p_{(1)} \le \dots \le
p_{(m)}$, and give each the q-value

$$q_{(i)} = \min_{j \ge i}\; \frac{m}{j}\,p_{(j)},$$

clamped to one. Drawing every pair with $q \le \alpha$ makes the expected
fraction of luck among them at most $\alpha$; here $\alpha = 0.1$, one
pair in ten. The running minimum from the top keeps $q$ monotone in $p$,
so a pair cannot pass while a stronger one fails.

Two gates still stand together: $|r| \ge 0.3$ says the coupling is
*strong enough to see*, $q \le 0.1$ that it is *unlikely enough to be
luck*. A long overlap can make a trivial $r = 0.15$ significant, and the
floor refuses to draw it.

## Greedy matching

A busy repo would happily correlate with half the roster, and a sky of
overlapping binaries reads as noise. So pairs that pass both gates are
sorted by $|r|$ descending (ties broken by index, for determinism) and
matched greedily: each repo joins at most one binary, the strongest claim
on it winning. This is the standard greedy approximation to maximum-weight
matching — at least half the optimal total weight, and in practice on a
handful of pairs, indistinguishable from it — for one pass and no
machinery.

## Constants

| constant | value | role |
| --- | --- | --- |
| `maxLag` | $7$ days | the lag window, and the least circular shift |
| `minActiveDays` | $8$ | a series must have this many non-zero days to enter |
| `minR` | $0.3$ | the floor on $\lvert r \rvert$: too weak to draw, however sure |
| `fdr` | $0.1$ | the share of drawn pairs allowed to be luck |
| `permutations` | $1000$ | pooled null draws; the smallest claimable $p$ is $1/1001$ |
| `seed` | $1$ | the draws are reproducible |

## Aesthetic terms

The permutation null and Benjamini–Hochberg are statistics, not taste.
What is chosen: **`fdr` $= 0.1$** is how much luck the sky will tolerate
for the sake of drawing something, and a stricter page would say $0.05$;
**`minR` $= 0.3$** is the weakest coupling worth a picture, a threshold on
visibility rather than on truth; and **greedy matching** trades a little
optimality for a sky with no overlapping binaries.
