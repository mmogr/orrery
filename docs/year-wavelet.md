# The year's beat: a Morlet scalogram and its ridge

*`src/math/wavelet.ts`, fed by the weekly series of `src/terrain/series.ts`
— the time-resolved sibling of docs/year-rhythm.md*

## Why a wavelet

The DFT of docs/year-rhythm.md answers one question well: *which* rhythm
did the year have? Its bins are periods, and a 13-week beat lands in the
13-week bin whether it ran all year or only through one term. What it
cannot say is *when* — a quarter that kept time in spring and fell silent
in autumn scores the same spectrum as one that beat evenly, because the
Fourier basis has no location. The scalogram trades a little frequency
resolution for exactly that: instead of one spectrum for the year it
gives a power for every week *and* every period, and the ridge reads off,
week by week, the period that beat loudest.

## The Morlet wavelet

The wavelet is a complex sinusoid under a Gaussian bell,

$$
\psi(\eta) = \pi^{-1/4}\, e^{i\omega_0 \eta}\, e^{-\eta^2/2},
$$

with $\omega_0 = 6$: the conventional centre frequency, the smallest at
which the wavelet is admissible without a correction term (its mean is of
order $e^{-\omega_0^2/2} = e^{-18}$, nothing) while still holding a few
cycles under the bell. Its spectrum is a Gaussian centred on $\omega_0$,
which is why a Morlet at scale $s$ answers most to one narrow band of
periods and lets the rest through faintly.

Stretched to scale $s$ and normalised in energy, the wavelet at sample
$t$ is $s^{-1/2}\,\psi\bigl((\tau - t)/s\bigr)$, and the transform of the
mean-removed series is the correlation

$$
W(s, t) = \frac{1}{\sqrt{s}} \sum_{\tau} (x_\tau - \bar{x})\,
\psi^{*}\!\left(\frac{\tau - t}{s}\right),
\qquad P(s, t) = \frac{|W(s, t)|^2}{\sigma^2},
$$

where $\sigma^2$ is the population variance of the series. Removing the
mean makes $P$ measure rhythm rather than level, as the DFT does; the
$1/\sqrt{s}$ gives every scale the same energy so their powers can be
compared; the division by $\sigma^2$ makes a busy year and a quiet year
of the same shape score the same picture, and turns a flat year into all
zeros rather than a division by nothing.

## Scale and period

A Morlet at scale $s$ does not simply hear the period $2\pi s / \omega_0$.
Feed the transform a pure wave $e^{i\omega\tau}$ and, with the
$1/\sqrt{s}$ normalisation above, the power it returns is proportional to
$s\, e^{-(s\omega - \omega_0)^2}$. Maximising over $s$ —
$\tfrac{d}{ds}\bigl[\ln s - (s\omega - \omega_0)^2\bigr] = 0$ — gives
$(s\omega)^2 - \omega_0\, s\omega - \tfrac12 = 0$, so the wave is heard
loudest at the scale where $s\omega = \tfrac12\bigl(\omega_0 +
\sqrt{\omega_0^2 + 2}\bigr)$. Inverting, the period a scale $s$ answers
to is

$$
\lambda(s) = \frac{4\pi s}{\omega_0 + \sqrt{2 + \omega_0^2}}
\approx 1.033\, s .
$$

This is the textbook relation (Torrence and Compo, 1998), and it is worth
seeing that it is derived under *exactly* this normalisation: with
$1/\sqrt{s}$ in the wavelet, a planted sinusoid's ridge lands on its true
period. The scales are laid out log-spaced so that the periods run from
2 samples — the Nyquist floor, shorter cannot be sampled — to $n/2$, the
longest that fits twice in the series; the default is 24 of them, about
six per octave over a year.

## The cone of influence

The series has ends, and near them the wavelet reaches past the data.
Reflecting the series at both ends (as the smoothing kernels do) keeps
the estimate from fading there, but a reflected end is a fold, not a
continuation, and its power is not to be trusted. The conventional edge
is the e-folding time of the wavelet power's autocorrelation. The
envelope's power is $|\psi|^2 \propto e^{-\eta^2}$, a Gaussian of
variance $\tfrac12$; the autocorrelation of a Gaussian doubles the
variance, giving $e^{-\eta^2/2}$, which has fallen by $e$ at $\eta =
\sqrt{2}$. So at scale $s$ the edge leaks in for $\sqrt{2}\, s$ samples,
and a sample $t$ is *inside the cone* for scale $s$ when

$$
\min(t,\ n - 1 - t) < \sqrt{2}\, s .
$$

`coi[t]` reports the largest scale still trustworthy at $t$: the biggest
with $\sqrt{2}\, s \le \min(t, n-1-t)$, or 0 where none is. At the
centre of 53 weeks that is a period of about 19 weeks; at week 9, about
six. The cone is the honest reason a year cannot vouch for its own
half-year rhythm anywhere.

## The ridge

Per sample, the ridge is the strongest scale outside the cone and its
power — with one refusal. If that strongest scale is the *last* one
outside the cone, the power was still rising when trust ran out: the
true peak lies among the scales the sample cannot vouch for, and the
ridge reports nothing (0 for both) rather than the edge. It also reports
nothing where every scale is inside the cone, and where nothing beats at
all.

An interior peak sits on a grid about six scales per octave wide, which
would quantise a 13-week beat to 12.1 or 13.5. The parabola through the
peak and its two neighbours in log-scale refines it: with powers $p_-,
p_0, p_+$ at scales $s_{k-1}, s_k, s_{k+1}$,

$$
\delta = \frac{p_- - p_+}{2\,(p_- - 2p_0 + p_+)},
\qquad
s^{*} = s_k \left(\frac{s_{k+1}}{s_{k-1}}\right)^{\delta/2},
$$

and the reported period is $\lambda(s^{*})$; the reported power stays
$p_0$, the strongest scale's own. A planted 13-week sinusoid reads 13.07.

## Computing it

Fifty-three weeks need no FFT here either. For each scale the conjugate
wavelet is tabulated once on $i \in [-\lceil 4s \rceil, \lceil 4s
\rceil]$ — beyond four scales the envelope is under $e^{-8}$, the same
truncation `gaussianKernel` uses — as separate real and imaginary
tables, and the series is correlated with both by direct sums, reflecting
indices at the ends exactly as `convolveReflect` does. The cost is
$O(n \cdot \sum_s 8s)$, a few hundred thousand multiplies for a year at
24 scales. Power is stored row-major by scale, `power[k * n + t]`, so a
scale's row is contiguous and a heatmap draws it in order.

`morletScales(n, count)` builds the grid, `scalogram(x, scales)` the
power and cone, `ridge(sg, scales, n)` the crest; `morletPeriod(s)`
labels any scale in samples. Everything is a pure function of its
arguments.

## Constants

| constant | value | role |
| --- | --- | --- |
| $\omega_0$ | $6$ | Morlet centre frequency: admissible, a few cycles under the bell |
| envelope support | $4s$ | where the Gaussian is dropped, below $e^{-8}$ |
| e-folding time | $\sqrt{2}\, s$ | the cone of influence's edge at scale $s$ |
| period floor | $2$ samples | Nyquist: the shortest period that can be sampled |
| period ceiling | $n/2$ | the longest period that fits twice in the series |
| default scale count | $24$ | about six scales per octave over a year |
| $\lambda(1)$ | $1.0330\ldots$ | samples of period per unit scale, at $\omega_0 = 6$ |

## Aesthetic terms

The transform, the period relation, the cone and the ridge's refusal at
the cone's edge are forced by the mathematics. What is not: $\omega_0 =
6$ is a convention, not a law — it trades time resolution for frequency
resolution, and five or seven would give a slightly blurrier or sharper
picture of the same year; **24 scales** is the resolution of the picture,
not of the maths, and any count returns the same ridge to within the
grid; the **parabolic refinement** is one reasonable sub-grid guess (a
Gaussian peak in log-scale is close to a parabola near its top), chosen
so the ridge draws as a curve rather than a staircase. On the demo page
the cone is *dimmed* rather than blanked, the colour ramp runs night
blue to the house gold with a 0.6 power so quiet beats still show, and
short periods sit at the top — all for the eye, none for the numbers.
