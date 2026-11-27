# Motion that does not depend on the frame rate

*`src/motion.ts`*

Motion on a page is usually written frame by frame: an ease is
`x += (goal - x) * k` once per requestAnimationFrame, and a spring is a
velocity nudged with per-frame constants. That is a perfectly good physics
engine that happens to assume 60 Hz. This module states the same two
behaviours in physical units, a time constant in milliseconds and $\zeta$
and $\omega$ in proper dimensions, so the motion is the same at any rate
and a dropped frame costs nothing but the frame.

## A per-frame ease is an exponential approach

`x += (g - x) * k` per frame leaves a fraction $(1-k)$ of the gap each
frame. At a frame interval $F$ that is exponential decay,
$\text{gap}(t) = \text{gap}(0)\,e^{-t/\tau}$, with

$$
(1 - k)^{t/F} = e^{-t/\tau}
\quad\Longrightarrow\quad
\tau = \frac{-F}{\ln(1 - k)} .
$$

So an ease tuned by eye at 60 Hz ($F = 16.\overline{6}$ ms) has a time
constant that can be read off it:

| per-frame $k$ at 60 Hz | $\tau = -16.667/\ln(1-k)$ |
|---|---|
| $0.45$ | $27.9$ ms |
| $0.22$ | $67.1$ ms |
| $0.18$ | $84.0$ ms |
| $0.06$ (a velocity multiplied by $0.94$) | $269$ ms |

`follow(x, target, tau, dt)` is then the *exact* solution
$x \mapsto \text{target} + (x - \text{target})\,e^{-dt/\tau}$: it lands on
the same value however $dt$ is split.

## A per-frame spring is a damped oscillator

A spring written per frame,

```
v -= x * s;   v *= d;
```

is a damped harmonic oscillator $\ddot{x} = -\omega^2 x - 2\zeta\omega\dot{x}$
in disguise, and its two constants can be read off the same way, with
$\Delta t$ the frame interval in seconds:

- the stiffness kick is $\omega^2 \Delta t^2 = s$, so
  $\omega = \sqrt{s}/\Delta t$;
- the drag removes $-\ln d$ of log-velocity per frame, and matching
  $e^{-2\zeta\omega\,\Delta t} = d$ gives
  $\zeta = -\ln d \,/\, (2\,\omega\,\Delta t)$.

For $s = 0.04$ and $d = 0.88$ at 60 Hz that is $\omega = 12$ rad/s and

$$
\zeta = \frac{0.1278}{2 \times 12 \times \tfrac{1}{60}} = 0.3196 \approx 0.32 ,
$$

underdamped ($\zeta < 1$): it overshoots and settles, with a 2% settling
time of roughly $4/(\zeta\omega) \approx 1.04$ s. Those are the values the
tests hold `stepDamped` to.

## Semi-implicit Euler, and why substeps

`stepDamped` integrates with semi-implicit (symplectic) Euler: velocity
first, then position from the *new* velocity,

$$
v \leftarrow v + \bigl(-\omega^2(x - \text{target}) - 2\zeta\omega v\bigr)\,h,
\qquad
x \leftarrow x + v\,h .
$$

Explicit Euler pumps energy into an oscillator and eventually explodes;
the semi-implicit form conserves it to first order, which is why the same
scheme survives in every game loop. Its accuracy still degrades as
$\omega h$ grows, so $dt$ is cut into substeps of at most $1/120$ s:
at $\omega = 12$ that keeps $\omega h \le 0.1$, where the discrete
oscillator's frequency error is $\sim (\omega h)^2/24 \approx 0.04\%$ and a
60 Hz frame and a 240 Hz frame land within 1% of each other. The substep
loop consumes the tail remainder exactly, so no time is dropped.

## Constants

| constant | value | role |
| --- | --- | --- |
| substep | $1/120$ s | the longest step `stepDamped` takes |

## Aesthetic terms

None here. Every time constant and every $\zeta$ and $\omega$ is the
caller's: this module only promises that they mean the same thing at any
frame rate.
