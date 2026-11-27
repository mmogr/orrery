# The pull between bodies

*`src/orbit/nbody.ts`*

Kepler's problem (docs/kepler.md) moves each body on its own ellipse and
lets none of them feel the others. Real planets do. Here the same system
is integrated as a genuine planar $n$-body problem, and
`phasePerturbations` keeps from it one honest number per body: how far it
has been nudged along its own orbit by the rest.

## The system

Kepler's third law, $T = k\,a^{3/2}$, is what a central mass
$GM = 4\pi^2 / k^2$ produces. Time is measured in units of $k$ from here
on, so $T = a^{3/2}$, $GM = 4\pi^2$, and every number stays near one
whatever unit the periods are given in. Each body $i$ has a mass $m_i$,
and a coupling $G$ says how strongly a unit mass pulls relative to the
centre. The equations of
motion in the orbit plane, periapsis on $+x$ and the focus at the origin,
are

$$\ddot{\mathbf r}_i = -\,4\pi^2\,\frac{\mathbf r_i}{|\mathbf r_i|^3}
  + G\,4\pi^2 \sum_{j \ne i} m_j\,\frac{\mathbf r_j - \mathbf r_i}{|\mathbf r_j - \mathbf r_i|^3}.$$

The centre is fixed, which is the approximation that the bodies' masses
are small against it: $G\,m_i \ll 1$.

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

`leapfrog` and `energy` are the integrator and its conserved quantity,
and a caller who wants positions has them. `phasePerturbations` keeps
less: a shift in orbit fraction, the along-track component of the
perturbation, for a picture whose geometry stays Kepler's. After
integrating from $t_0$ to $t_1$,
each body's angle from the focus is its true anomaly, and its difference
from the unperturbed angle is $\Delta f$, in turns.

The unperturbed angle is not taken from Kepler's closed form. The system
is integrated *twice*, once with $G$ and once with $G = 0$, and the
angles are differenced between the two runs. The integrator's own phase
error, sizeable at sixty-odd steps an orbit, is the same in both runs and
cancels, so a
coarse step still measures the pull and nothing else. With $G = 0$ the
result is exactly zero at any step, which is the test.

## The size of it

How small $G$ must be depends on how close the orbits pass. In the test's
system, eleven bodies with $a \in [0.26, 1]$ share a plane and
neighbouring orbits pass within a few hundredths of a unit of each other.
There, at $G = 10^{-5}$ the shifts over four weeks of a fifty-hour outer
period are a quarter of an orbit and no longer linear in $G$; at
$G = 10^{-6}$ they are a percent and a half; at $G = 2 \times 10^{-7}$
about a third of a percent, inside the regime where doubling $G$ doubles
the shift, which is what "a perturbation" ought to mean.

## Constants

| constant | value | role |
| --- | --- | --- |
| $GM$ | $4\pi^2$ | the centre, in units where $T = a^{3/2}$ |
| time unit | $k$ | the third law's constant, $T = k\,a^{3/2}$; all bodies must share it |
| `G` | caller's | a unit mass pulls with this fraction of the centre's gravity |
| step | caller's `dt` | the leapfrog step, in the periods' unit |

## Aesthetic terms

The equations, the integrator and the differencing are physics. One thing
is a choice about the picture: **the along-track restriction** in
`phasePerturbations`. The radial and normal components of the
perturbation are computed and discarded, for a caller who draws each body
on its Kepler ellipse and would rather keep one honest geometry than draw
two.
