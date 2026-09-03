# Heat on the graph

Open a note and warmth spreads to its neighbours, then to theirs, fading
as it goes. This is not a metaphor implemented with tweens — it is the
heat equation on the graph, solved the simplest honest way.

## The discrete heat equation

On a graph, the Laplacian plays the role $-\nabla^2$ plays in the
continuum. With $L = L_{\mathrm{sym}}$ (docs/spectral-sky.md), the heat
field $u \in \mathbb{R}^n$ obeys

$$\frac{\partial u}{\partial t} = -L u.$$

In the eigenbasis of $L$ each mode decays independently,
$\hat{u}_k(t) = e^{-\lambda_k t}\, \hat{u}_k(0)$: rough disagreements
between linked notes ($\lambda$ large) die fast, the smooth large-scale
distribution ($\lambda$ small) lingers. That is exactly the look we want —
a click flares locally and relaxes into a soft neighbourhood glow.

## Explicit Euler and its stability bound

We step with explicit Euler, in place, using a scratch buffer for $Lu$:

$$u \leftarrow \delta\,\big(u - \Delta t\, L u\big),$$

repeated `steps` times, where $\delta \le 1$ is a per-step decay. Per
eigenmode the update multiplies by $\delta\,(1 - \Delta t\,\lambda_k)$, so
the scheme is stable iff $|1 - \Delta t\,\lambda_k| \le 1$ for every
eigenvalue, i.e.

$$\Delta t \le \frac{2}{\lambda_{\max}}.$$

For $L_{\mathrm{sym}}$ we know $\lambda_{\max} \le 2$ unconditionally
(equality only for bipartite components), so $\Delta t \le 1$ is always
stable. We enforce the tighter

$$\Delta t \le 0.45,$$

and `diffuse` throws a `RangeError` past it. The margin buys a second
property: the update matrix is
$\delta\big((1 - \Delta t)\,I + \Delta t\, D^{-1/2} A D^{-1/2}\big)$,
whose entries are all non-negative once $\Delta t \le 1$ — so heat that
starts non-negative stays non-negative, no mode ever overshoots through
zero and flickers, and $0.45$ keeps us comfortably clear of the oscillatory
regime $1 - \Delta t\,\lambda \approx -1$ where a bipartite graph's
highest mode would ring sign-flipping from step to step.

Two small facts worth recording. Isolated nodes have $L_{ii} = 1$ and no
neighbours, so their heat simply relaxes toward $0$ at rate
$\delta(1 - \Delta t)$ per step — a lone note cools alone. And total heat
$\sum_i u_i$ is conserved (at $\delta = 1$) only on *regular* graphs,
where the rows of $L_{\mathrm{sym}}$ sum to zero; on an uneven graph the
normalisation trades a little mass at the hubs. We accept this: the field
drives glow, not accounting.

## Constants

| constant | value | role |
| --- | --- | --- |
| stability bound | $\Delta t \le 0.45$ | enforced; explicit Euler needs $\Delta t \le 2/\lambda_{\max}$, and $\lambda_{\max} \le 2$ |
| `dt` | caller's | time step per Euler iteration |
| `steps` | caller's | Euler iterations per call |
| `decay` | caller's, $\le 1$ | uniform cooling $\delta$ per step |

## Aesthetic terms

The physics fixes everything except the cooling: **decay** is attention
fading, not thermodynamics — $\delta = 1$ would let a reader's warmth pool
forever, and how fast the sky forgets is a choice about mood, made by the
caller per frame. Likewise **dt and steps** trade sharpness for spread
within the stability bound: many small steps give a rounder halo, one
large step a tighter flare. The bound $0.45$ itself is physics; where a
caller sits beneath it is taste.
