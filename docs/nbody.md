# The pull between planets

Kepler's sky (docs/kepler-orbits.md) moves each project on its own
ellipse and lets none of them feel the others. Real planets do, and the
effect is what a physics portfolio should not fake: here the sky is
integrated as a genuine planar $n$-body system, and what the page keeps
from it is the one thing the picture can honestly show — how far each
planet has been nudged along its own orbit by the rest.

## The system

Kepler's third law as fitted, $T = k\,a^{3/2}$, is what a central mass
$GM = 4\pi^2 / k^2$ produces (in the sky's length unit, with $a_{\max} =
1$). Time is measured in units of $k$ from here on, so $T = a^{3/2}$,
$GM = 4\pi^2$, and every number stays near one whatever the millisecond
period. Each project $i$ gets a mass $m_i \in [0, 1]$, its year of
commits as a fraction of the busiest, and a coupling $G$ that says how
strongly a full mass pulls relative to the centre. The equations of
motion in the orbit plane, periapsis on $+x$ and the focus at the origin,
are

$$\ddot{\mathbf r}_i = -\,4\pi^2\,\frac{\mathbf r_i}{|\mathbf r_i|^3}
  + G\,4\pi^2 \sum_{j \ne i} m_j\,\frac{\mathbf r_j - \mathbf r_i}{|\mathbf r_j - \mathbf r_i|^3}.$$

The centre is fixed: the planets' masses are small against it by
construction, and a moving centre would only add the reflex motion the
picture cannot show.

The initial state is Kepler's own. From the mean anomaly $M$ solve
$M = E - e\sin E$ (the same Newton as `orbitFrac`), then

$$\mathbf r = \big(a(\cos E - e),\; a\sqrt{1-e^2}\,\sin E\big), \qquad
  \dot{\mathbf r} = \dot E\,\big(-a\sin E,\; a\sqrt{1-e^2}\,\cos E\big),
  \qquad \dot E = \frac{2\pi/T}{1 - e\cos E},$$

which satisfies the vis-viva relation $v^2 = GM(2/r - 1/a)$ exactly — the
first test.

## Why leapfrog

Kick-drift-kick: half a velocity kick from the accelerations, a full
position drift, fresh accelerations, the other half kick. It is second
order, it is time-reversible (run it backward and it retraces its steps
to the bit), and it is symplectic: it conserves not the energy but a
nearby Hamiltonian, so the energy error oscillates within a band set by
$\Delta t^2$ and never drifts. A Runge–Kutta of the same order would be
more accurate per step and would bleed energy secularly; for an orbit
that must be trusted for a hundred revolutions, bounded error is the
property that matters. The tests hold it to that: halving the step
quarters the error, and the second five orbits look like the first five.

## What is kept, and how it is measured

The site's geometry belongs to Kepler — a planet's place on the arc is
`arcPos` of its orbit fraction. A full $n$-body position would not fit
that arc. What fits is a shift in orbit fraction, the along-track
component of the perturbation: after integrating from $t_0$ to $t_1$,
each body's angle from the focus is its true anomaly, and its difference
from the unperturbed angle is $\Delta f$, in turns.

The unperturbed angle is not taken from Kepler's closed form. The system
is integrated *twice*, once with $G$ and once with $G = 0$, and the
angles are differenced between the two runs. The integrator's own phase
error — sizeable at the sixty-odd steps per orbit the page can afford
for its fastest planet — is the same in both runs and cancels, so a
coarse step still measures the pull and nothing else. With $G = 0$ the
result is exactly zero at any step, which is the test.

## The size of it

On the sky's own elements, eleven planets with $a \in [0.26, 1]$ share a
plane, and neighbouring orbits pass within a few hundredths of a unit of
each other. That closeness is why $G$ must be small: at $G = 10^{-5}$ the
shifts are a quarter of an orbit and no longer linear in $G$; at
$G = 10^{-6}$ they are a percent and a half. `G_PLANETS` $= 2 \times
10^{-7}$ puts four weeks of pulling at about a third of a percent of an
orbit for the most-pulled planet — minutes in the almanac's "rises in",
less than a pixel on the arc — and inside the regime where doubling $G$
doubles the shift, which is what "a perturbation" ought to mean.

## Constants

| constant | value | role |
| --- | --- | --- |
| `G_PLANETS` | $2 \times 10^{-7}$ | a full mass pulls with this fraction of the centre's gravity |
| $GM$ | $4\pi^2$ | the centre, in units where $T = a^{3/2}$ |
| time unit | $k$ ms | the fit's constant, $T = k\,a^{3/2}$; all bodies must share it |
| step | caller's `dt` | the leapfrog step in ms; the page uses a sixty-fourth of the fastest period |

## Aesthetic terms

The equations, the integrator and the differencing are physics. Two
things are not. **`G_PLANETS`** is chosen for the size of the effect,
not measured from anything — projects do not have masses — and the
choice is that the pull be real, linear and invisible: a number in the
almanac rather than a wobble in the sky, which is the joke and the
point. And **the along-track restriction** is a choice about the
picture: the radial and normal components of the perturbation are
computed and discarded, because the arc a planet rides is Kepler's and
the page would rather keep one honest geometry than draw two.
