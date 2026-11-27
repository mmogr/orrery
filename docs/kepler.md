# Kepler's problem

*`src/orbit/kepler.ts`*

A body on an ellipse about a fixed focus does not move at an even pace. An
orbit animated by easing a point round a path looks nearly right and is
wrong in the way that shows: it has no fast side. This module places the
body the way an almanac does, so the lingering at the far end and the hurry
at the near one are the second law and not a tween.

## The elements

An orbit here is four numbers: the semi-major axis $a$, the eccentricity
$e$ with $0 \le e < 1$, the period $T$, and the mean anomaly at epoch
$M_0$. Lengths and times are in the caller's units; nothing in the module
knows what a second is.

The period follows the axis by the third law,

$$T = k\,a^{3/2},$$

where $k$ is the period of an orbit with $a = 1$. A body
twice as far out takes $2^{3/2} \approx 2.83$ times as long, here as in the
solar system. The law is invariant under $a \to s\,a$, $k \to k/s^{3/2}$, so
the unit of length is a convention the caller fixes.

## Position, the honest way

Time gives the mean anomaly, $M = 2\pi\,t/T + M_0$, which runs uniformly.
Kepler's equation,

$$M = E - e\sin E,$$

is solved for the eccentric anomaly $E$ by Newton from $E_0 = M$, at most
eight iterations. The implementation checks that the final residual is
below $10^{-12}$ rad and throws if it is not, so a silent convergence
failure cannot happen. For modest eccentricities (the tests go to
$e = 0.2$) Newton is safely within its quadratic basin from that start; a
high eccentricity may need a better start than $M$, and will say so by
throwing rather than by being slightly wrong.

The true anomaly follows from the quadrant-safe half-angle form,

$$\nu = 2\,\mathrm{atan2}\!\big(\sqrt{1+e}\,\sin\tfrac{E}{2},\
\sqrt{1-e}\,\cos\tfrac{E}{2}\big),$$

which has an exact inverse. `orbitFrac` returns
$\nu/2\pi$ in $[0, 1)$: the fraction of the way round from periapsis.
With $e > 0$ this is not uniform in time.

## When it will next be somewhere

`timeToFrac` answers "how long until the body is at this fraction of its
orbit" and needs no root-finding. The target fraction is a true anomaly;
inverting the half-angle form gives its $E$, then $M = E - e\sin E$ gives
the mean anomaly at which the body will be there. Mean anomalies run
uniformly, so the answer is the wrapped difference of two angles scaled by
the period, exact, in $(0, T]$: asked for where it already is, the answer
is one whole period, since the question is "next".

## Constants

| constant | value | role |
| --- | --- | --- |
| Newton iterations | 8 | the most `solveKepler` will take |
| residual | $10^{-12}$ rad | past this it throws |

## Aesthetic terms

None. What an orbit's elements are made from, and how its place is drawn,
are the caller's.
