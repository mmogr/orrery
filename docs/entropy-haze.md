# Entropy haze: how many languages a week spoke, in bits

*`src/terrain/entropy.ts`, on `entropyBits` of `src/math/stats.ts`*

## The measurement

Each week carries a record of language weights — lines, commits, whatever
the caller measures in. Normalised to $p_j = w_j / \sum w$, the week's
Shannon entropy in bits is

$$
H = -\sum_j p_j \log_2 p_j .
$$

Zeros contribute nothing; an empty or all-zero week is $H = 0$. Weights
need not be normalised on the way in.

Bits earn their keep as the unit because they answer a plain question:
*to how many languages was this week equivalent?* $2^H$ is the effective
language count. One tongue: $H = 0$, clear air. Two even tongues: 1 bit.
Four even: 2 bits. Five languages with one dominant land somewhere between
— entropy sees the balance, not just the roster, which is why a week of
99% TypeScript and four garnish files stays nearly clear.

## The haze mapping

On the page the entropy becomes ground haze at each week's feet. The alpha
of the haze pool is

$$
\alpha = 0.17\,\bigl(0.4 + 0.6\, H / H_{\max}\bigr)
$$

where $H_{\max}$ is the largest weekly entropy of the year. The terms, each
admitted for what it is:

- $0.17$ — the page's existing peak haze alpha: the aesthetic ceiling,
  chosen so haze reads as atmosphere, never as fog hiding the relief;
- $0.4$ floor — any week hazy enough to plot at all gets 40% of the
  budget, so single-language weeks and polyglot weeks read as one family;
- $0.6\,H/H_{\max}$ — the measured part: haze thickness scales with the
  week's bits against the year's own thickest week, so the mapping is
  self-normalising across quiet years and polyglot ones alike.

A year of $H_{\max} = 0$ (one language, all year) draws no haze — the
mapping is only evaluated where there is entropy to show.
