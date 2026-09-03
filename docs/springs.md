# The springs

The spectral embedding (docs/spectral-sky.md) is where the sky *rests*;
the springs are how it *lives* — how it breathes under the camera, parts
around the type, and comes back when a hand throws a star. The force law
is ported verbatim from the page's original simulation; the integrator is
rewritten as velocity Verlet, and one new term (`restPull`) ties the
living layer to the rest state.

## The integrator

Verlet stores no velocity. Each body carries its position $(x, y)$ and its
previous position $(p_x, p_y)$; the velocity is implicit,

$$v = x - p,$$

in units of distance per step. One step gathers every force below into an
acceleration $a$, then integrates exactly the way the old simulation did:

$$v \leftarrow \operatorname{cap}\big(\gamma\,(v + a)\big), \qquad
p \leftarrow x, \qquad x \leftarrow x + v,$$

with damping $\gamma = 0.82$ applied after the forces, and the speed cap
last — the same order of operations as the old `step()`, so every constant
keeps its measured meaning. An impulse (a yank, a stir) is a kick to the
implicit velocity: `impulse` moves $p$ the other way, $p \leftarrow p - \Delta v$.

Damping this strong makes the system heavily overdamped: energy leaves at
a factor $\gamma^2 \approx 0.67$ per step, which is why the sky settles as
jelly rather than ringing like a bell.

## The forces

All forces scale with `heat` $h$ (the boot ramp and interaction warmth) and
with the natural length $K$, the mean area per node:
$K = 0.95\sqrt{WH/n}$ in the page's usage. In reading order through the step:

**Repulsion** — every pair, an inverse-square kick with a guard and a cutoff:

$$f = \frac{K^2}{d^2} \cdot 0.05\,h,$$

applied along the pair's unit vector; coincident pairs ($d^2 < 1$) are
nudged apart along $(0.5, 0.5)$ with $d^2 := 0.5$; pairs beyond $d > 3K$
(i.e. $d^2 > 9K^2$) are strangers and skipped.

**Springs** — per edge, linear toward a rest length of $0.8K$:

$$f = \frac{d - 0.8K}{d} \cdot \frac{0.01\,h}{\sqrt{1 + \min(d_a, d_b)/3}},$$

applied to the displacement vector. The denominator softens the pull where
a leaf meets a hub, so well-connected notes are not yanked about by every
stray edge; it uses the *smaller* degree because that end moves more.

**restPull** — *the new term.* A spring toward the spectral rest position
$r_i$:

$$a_i \mathrel{+}= (r_i - x_i)\cdot 0.002\,h.$$

Small on purpose: over many steps it wins against nothing in particular
and everything drifts home, but within a gesture it is imperceptible. The
embedding suggests; the springs decide.

**Window gravity** — a screen-sized box rides the camera. Each body is
clamped to the box, $b = \operatorname{clamp}(x)$, and pulled back:

$$a \mathrel{-}= (x - b)\cdot 0.015\,h.$$

The distances $\lVert x - b\rVert$ are averaged into `outsideMean`, the
step's return value — the old simulation's temperature signal.

**Elliptical gravity** — a weak pull to the origin, wider than it is tall:

$$a_x \mathrel{-}= 0.0005\,h\,x, \qquad a_y \mathrel{-}= 0.0013\,h\,y.$$

The sky spreads to the page's width and is held vertically.

**The clearing** — an elliptical push off the hero type. With
$e_x = x/2.2$ and $\rho = \sqrt{e_x^2 + y^2} + 0.01$, bodies inside the
clear radius $c$ feel

$$\text{push} = \frac{c - \rho}{c}\cdot 0.55\,h$$

outward along $(e_x/2.2,\; y)/\rho$. The $2.2$ compression makes the
protected region a wide ellipse, matching the strip of navigation and
search.

**Soft floor** — below $y_{\text{floor}}$ (the terrain line),
$a_y \mathrel{-}= (y - y_{\text{floor}})\cdot 0.02\,h$: the sky stays
above the ground without a hard wall.

**Speed cap** — $v_{\max} = 2.5 + 4\,\tau$, where the step's own
temperature $\tau = \min(0.5,\ \text{outsideMean} \cdot 0.004)$ is the
same displacement-runs-hot feedback the old camera closed: a disturbed sky
is allowed to really fly, a settled one creeps.

## Constants (`DEFAULT_FORCES`)

| field | value | force |
| --- | --- | --- |
| `repulsion` | $0.05$ | pair kick $K^2/d^2$, cutoff $3K$, guard at $d^2 < 1$ |
| `spring` | $0.01$ | linear spring toward $0.8K$, hub-softened |
| `restPull` | $0.002$ | **new** — spring toward the spectral rest position |
| `windowGravity` | $0.015$ | pull back into the screen-sized window |
| `ellipse` | $[0.0005,\ 0.0013]$ | origin pull, $x$ then $y$ |
| `clearing` | $0.55$ | push strength inside the clear radius |
| `floor` | $0.02$ | soft floor stiffness |
| `damping` | $0.82$ | velocity retained per step |
| `vcap` | $[2.5,\ 4]$ | base speed cap, and the extra a hot sim earns |

The environment supplies the geometry: $K$, the window box, the clearing
radius, the floor height. Every constant above is dimensionally tied to
$K$ and to the step as the unit of time.

## Aesthetic terms

Honesty section: these exist for feel, not physics. The **clearing
ellipse** and its $2.2$ $x$-compression protect the type, nothing else;
change the layout of the page and they should change. The **temper**
fields on each body (`temper`, and the private throw angle `c1`, `s1` —
the old `jf`/`c1`/`s1`) are consumed by `impulse` callers to give every
star its own willingness and direction when the sky is stirred; the
integrator never reads them. The **restPull strength** $0.002$ is a taste
parameter — at $0$ the sky forgets its spectrum, an order of magnitude up
it snaps back like elastic; $0.002$ is "comes home over a few seconds".
And the **temperature feedback** constants ($0.004$, the $0.5$ ceiling,
the $+4$ cap bonus) are tuned so a thrown star flies without the whole
sky boiling.
