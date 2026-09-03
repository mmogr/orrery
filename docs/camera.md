# Camera: the oscillator it always was

*`src/camera.ts`*

The page's camera was written frame by frame: every ease was
`x += (goal - x) * k` once per requestAnimationFrame, and the sway was a
spring nudged with per-frame constants. That is a perfectly good physics
engine that happens to assume 60 Hz. This module states the same behaviour
in physical units — time constants in milliseconds, $\zeta$ and $\omega$ in
proper dimensions — so the motion is identical at 60 Hz and unchanged in
meaning at any other rate.

## Per-frame ease → exponential time constant

`x += (g - x) * k` per frame leaves a fraction $(1-k)$ of the gap each
frame. At the frame interval $F = 1000/60 = 16.\overline{6}$ ms that is
exponential decay, $\text{gap}(t) = \text{gap}(0)\,e^{-t/\tau}$, with

$$
(1 - k)^{t/F} = e^{-t/\tau}
\quad\Longrightarrow\quad
\tau = \frac{-F}{\ln(1 - k)} .
$$

| ease | old per-frame $k$ | $\tau = -16.667/\ln(1-k)$ | constant |
|---|---|---|---|
| drawn camera trails target ($x, y$) | $0.22$ | $67.08$ ms | `followTau: 67.1` |
| zoom trails target ($z$) | $0.45$ | $27.88$ ms | `zoomTau: 27.9` |
| homing glide to a called position | $0.18$ | $83.98$ ms | `homingTau: 84.0` |
| fling velocity decay (×$0.94$/frame) | — | $-16.667/\ln 0.94 = 269.36$ ms | `flingTau: 269` |

`follow(x, target, tau, dt)` is then the *exact* solution
$x \mapsto \text{target} + (x - \text{target})\,e^{-dt/\tau}$: it lands on
the same value however $dt$ is split, so a dropped frame costs nothing but
the frame.

## The sway spring's $\zeta$ and $\omega$

The old sway, per 60 Hz frame:

```
vx -= x * 0.04;   vx *= 0.88;
```

Read as a damped harmonic oscillator $\ddot{x} = -\omega^2 x - 2\zeta\omega\dot{x}$:

- the stiffness kick `vx -= x * 0.04` is $\omega^2 \Delta t^2 = 0.04$ in
  frame units, so $\omega = 0.2$ rad/frame $= 0.2 \times 60 = 12$ rad/s
  (a $\sim 0.55$ s wobble period, damped);
- the drag `vx *= 0.88` removes $-\ln 0.88 = 0.1278$ of log-velocity per
  frame, and matching $e^{-2\zeta\omega\,\Delta t} = 0.88$ gives

$$
\zeta = \frac{-\ln 0.88}{2\,\omega\,\Delta t}
      = \frac{0.1278}{2 \times 12 \times \tfrac{1}{60}} = 0.3196 \approx 0.32 .
$$

So `sway: { zeta: 0.32, omega: 12 }` — underdamped ($\zeta < 1$), which is
the point: the constellation is meant to overshoot and wobble home, with a
2% settling time of roughly $4/(\zeta\omega) \approx 1.04$ s.

## Semi-implicit Euler, and why substeps

`stepDamped` integrates with semi-implicit (symplectic) Euler — velocity
first, then position from the *new* velocity:

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
60 Hz frame and a 240 Hz frame land within 1% of each other — the
framerate independence the per-frame original could not offer. The
substep loop consumes the tail remainder exactly, so no time is dropped.
