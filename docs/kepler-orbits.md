# Kepler orbits

The old sky assigned periods by decree. From a repo's year of commits it
took a log-activity

$$\mathrm{act} = \frac{\log(1 + \text{commits})}{\log(1 + \max)}$$

and drew the orbit straight off a line: period $T = (46 - 40\cdot
\mathrm{act})$ hours (46h for a dormant repo, 6h for the busiest) and arc
peak $\mathrm{alt} = 0.16 + (1 - \mathrm{act})\cdot 0.14$. It looked
right — busy planets low and fast — but the numbers had no reason to be
those numbers.

The new model keeps the look and earns it. Activity sets a semi-major
axis, small when busy:

$$a = a_{\min} + (a_{\max} - a_{\min})(1 - \mathrm{act}),$$

and the period follows from Kepler's third law, $T = k\,a^{3/2}$. Now the
speed gradient across the sky is not eleven arbitrary hours of slope but
one physical exponent: the same $3/2$ that spaces the real planets. A
planet twice as high takes $2^{3/2} \approx 2.83$ times as long, here as
in the solar system, and the mean anomaly, eccentric anomaly and true
anomaly all mean what an almanac means by them.

## Fitting the third law to the old line

$T$ linear in $\mathrm{act}$ and $T \propto a^{3/2}$ with $a$ linear in
$\mathrm{act}$ cannot both hold exactly — a power law is not a line. The
constants are chosen to make them agree as closely as a power law can:
least squares of $\log T$ over the old rule sampled at $\mathrm{act} \in
\{0, 0.1, \dots, 1\}$. The model

$$\log T = \log k + \tfrac{3}{2}\log\!\big(a_{\min} + (a_{\max} -
a_{\min})(1 - \mathrm{act})\big)$$

is invariant under $a \to s\,a$, $k \to k/s^{3/2}$, so one constant is a
convention: we pin $a_{\max} = 1$. That leaves the shape $a_{\min}$
(found by a deterministic grid-plus-ternary search — the error is smooth
and single-welled in it) and the scale $k$, which falls out in closed
form as the mean log residual. `fitKepler` is exactly this procedure;
`FIT` is its output on the old rule, hardcoded:

$$a_{\min} = 0.261629, \qquad a_{\max} = 1, \qquad k = 1.79627484 \times
10^{8}\ \text{ms}.$$

The residuals, old line against fitted power law:

| act | $T_{\text{old}}$ (h) | $T_{\text{new}}$ (h) | $\log T_{\text{new}} - \log T_{\text{old}}$ |
|-----|------|--------|---------|
| 0.0 | 46.00 | 49.90 | +0.081 |
| 0.1 | 42.00 | 44.47 | +0.057 |
| 0.2 | 38.00 | 39.26 | +0.033 |
| 0.3 | 34.00 | 34.27 | +0.008 |
| 0.4 | 30.00 | 29.51 | −0.016 |
| 0.5 | 26.00 | 25.00 | −0.039 |
| 0.6 | 22.00 | 20.74 | −0.059 |
| 0.7 | 18.00 | 16.76 | −0.072 |
| 0.8 | 14.00 | 13.07 | −0.069 |
| 0.9 | 10.00 |  9.70 | −0.031 |
| 1.0 |  6.00 |  6.68 | +0.107 |

Worst case $|\Delta \log T| = 0.107$, about 11%, at the busy end, where
the line dives for 6h and the power law settles for 6.68h. In the middle
of the range — where most repos live — the two agree to a few percent.
We consider the trade a bargain: an 11% period shift no one can perceive,
for a sky whose fast planets are fast for Kepler's reason.

## Position, the honest way

Time gives the mean anomaly, $M = 2\pi\,t/T + M_0$, which runs uniformly.
Kepler's equation,

$$M = E - e\sin E,$$

is solved for the eccentric anomaly $E$ by Newton from $E_0 = M$, at most
eight iterations; the implementation asserts the final residual is below
$10^{-12}$ rad, so a silent convergence failure cannot happen. For the
eccentricities this sky wears ($e \le 0.2$) Newton is safely within its
quadratic basin from that start. The true anomaly follows from the
quadrant-safe half-angle form,

$$\nu = 2\,\mathrm{atan2}\!\big(\sqrt{1+e}\,\sin\tfrac{E}{2},\
\sqrt{1-e}\,\cos\tfrac{E}{2}\big),$$

and the orbit fraction the page draws is $\nu/2\pi$. With $e > 0$ this is
no longer uniform in time: the planet lingers near apoapsis and hurries
through periapsis, which is the second law showing through.

`timeToFrac` — the almanac's "rises in" — needs no root-finding. The
target fraction is a true anomaly; inverting the half-angle form gives
its $E$, then $M = E - e\sin E$ gives the mean anomaly at which the
planet will be there. Mean anomalies run uniformly, so the answer is the
wrapped difference of two angles scaled by the period, exact, in
$(0, T]$.

## Aesthetic terms

Everything above is fitted or derived; three mappings are admitted taste:

- **Eccentricity**: $e = e_{\max}\cdot d_{\text{lang}}$ with $e_{\max} =
  0.2$, where $d_{\text{lang}} \in [0,1]$ is the repo's radius in language
  space (docs/language-space.md). A repo with an unusual mix rides a
  visibly stretched orbit. The cap at 0.2 keeps Newton comfortable and
  the sky from melodrama.
- **Tilt**: $\mathrm{tilt} = 0.04\cdot\ell$, where $\ell \in [-1,1]$ is
  the first principal coordinate. The factor 0.04 is calibrated against
  the page's fork tilt of 0.07 — a language lean should read as a lean,
  never as capture.
- **Altitude**: not an element — the site keeps it. But the old rule
  survives unchanged, because $a$ is affine in $(1 - \mathrm{act})$ and
  so is alt; at the call site,

  $$\mathrm{alt} = 0.16 + 0.14\,\frac{a - a_{\min}}{a_{\max} - a_{\min}},$$

  which reproduces the old range exactly: the busiest planet peaks at
  $0.16\,H$, the stillest at $0.30\,H$. Higher orbit, higher arc, longer
  period — the three now move together for one reason.
