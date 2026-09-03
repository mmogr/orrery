# The moon

The page has always drawn the real moon: every visitor sees tonight's
phase, because the phase comes from the clock, not from art direction.
This note is about upgrading *which* moon — from a mean moon to the true
one — and being precise about how far each sits from the sky.

## The mean moon

The old model is one line:

$$\text{age} = \big((t - t_0)/86400000\big) \bmod S,$$

with $t_0$ the new moon of 2000-01-06 18:14 UTC (unix ms 947182440000)
and $S = 29.53058867$ days the mean synodic month. `meanAge` keeps it,
wrapped positive, both for continuity and as the yardstick the ephemeris
is measured against.

It is a good line. The mean month is right by construction; the error is
periodic, not secular. But the moon's orbit is eccentric and perturbed,
so individual lunations run from about 29.27 to 29.83 days, and the mean
moon drifts up to roughly $\pm 0.7$ day from the true phase — the
crescent a sharp-eyed visitor checks against the window can be a
half-day's width wrong.

## The true moon

`phaseAge` finds the actual preceding new moon by the series in Meeus,
*Astronomical Algorithms*, ch. 49. Lunations are indexed by $k$ ($k = 0$
is the first new moon of 2000 — the page's own epoch, pleasingly); with
$T = k/1236.85$ (Julian centuries), the mean instant is

$$\mathrm{JDE} = 2451550.09766 + 29.530588861\,k + 0.00015437\,T^2
- 1.50\times10^{-7}\,T^3 + 7.3\times10^{-10}\,T^4,$$

corrected by periodic terms in the sun's mean anomaly $M$, the moon's
mean anomaly $M'$, the argument of latitude $F$ and the node $\Omega$
(each a polynomial in $k$ and $T$), weighted where appropriate by
$E = 1 - 0.002516\,T - 0.0000074\,T^2$, the slow decay of Earth's orbital
eccentricity. The largest term, $-0.40720\sin M'$, is the eccentricity of
the moon's own orbit: nearly ten hours of swing by itself.

**Kept**: the sixteen principal terms of the new-moon column (through
$-0.00007\sin(M' + 2M)$, i.e. everything of amplitude
$\ge 2\times10^{-4}$ d save the planetary row).

**Dropped, and by how much**: the fourteen planetary $A$-terms — the
largest is $3.25\times10^{-4}$ d ($\approx 28$ s), and in concert they
are worth under $\sim 0.001$ d; the sub-$10^{-4}$ tail of the main table
($\lesssim 2\times10^{-4}$ d combined); and $\Delta T$, the TT−UT offset
the series is expressed in ($\approx 0.0008$ d this era, growing slowly).
Together: comfortably under $0.002$ d, which is where our checks find the
implementation sitting.

Bracketing is done honestly. The first guess $k = \operatorname{round}
\big((y - 2000)\cdot 12.3685\big)$ (with $y$ the Julian year) can land
one lunation off near a seam, so the code walks $k$ until
$\mathrm{JDE}(k) \le t < \mathrm{JDE}(k+1)$ as a checked fact. The age is
then days since $\mathrm{JDE}(k)$ — which can legitimately reach 29.8:
a true lunation is allowed to outlast the mean one, and the age only
wraps when the *actual* new moon arrives.

## Error, honestly

The target is $\pm 0.05$ d against the almanac. The reference instants in
the tests are eclipse-anchored on purpose — an eclipse pins a syzygy to
the minute in the public record, so the test can't quietly compare the
code against itself:

- 1999-08-11 11:08 UTC (total solar eclipse): recovered to
  $\lesssim 0.002$ d.
- 2000-01-06 18:14 UTC (the page's epoch new moon): $\lesssim 0.001$ d.
- 2015-09-28 02:47 UTC (the eclipsed supermoon): the computed age is
  14.836 d. Note that this is $0.07$ beyond $S/2$ — not model error but
  the sky's: that new-to-full leg genuinely ran 14.837 days. The
  ephemeris is right to $\sim 0.002$ d; "full at half the mean month" is
  the approximation, and the test says so rather than hiding it.

So the honest statement is: new-moon instants to a few thousandths of a
day (minutes), an order of magnitude inside the $0.05$ d target; the
$0.05$ tolerance in the tests is slack for the dropped terms over the
centuries-wide range the polynomial covers, not slack we currently use.
Against the mean moon, the true age stays within $\pm 0.75$ d over
2024–2028 (measured weekly), which is exactly the drift the upgrade
exists to remove.

## Names and light

`phaseName` buckets the age into the legend's eight strings —
$\operatorname{round}(8\,\text{age}/S) \bmod 8$, the page's own rounding,
so "new moon" owns the last half-eighth as well as the first.
`illumination` reproduces the page's two derived quantities:
$k = \cos(2\pi\,\text{age}/S)$ (1 new, −1 full), and the wash-out factor,
a smoothstep over the last 7% of the approach to full,

$$\text{full} = \operatorname{smoothstep}\!\left(\frac{(1-k)/2 - 0.93}
{0.06}\right),$$

which is what lets moonlight drown the faint stars only when the disc is
nearly whole.
