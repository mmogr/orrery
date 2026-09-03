# Rivers: steepest descent on the bilinear field

*`src/terrain/rivers.ts`, on the field of `src/terrain/heightfield.ts`*

Rivers are the answer to a physical question: if rain fell on the year,
where would it leave? Water follows the steepest descent of the height
field, so a river is an integral curve of

$$
\dot{p} = -\nabla h(p),
$$

traced from each summit until the ground gives out.

## The field

Cell heights (7 day-rows × N week-columns) are shared out to corners: each
corner of the $(rows{+}1)\times(cols{+}1)$ grid takes the mean of the up to
four cells that touch it, absent or off-range cells counting as height 0 —
sea level. The divisor is always four, exactly as the page builds `cornerH`,
so the range shores down to the sea at its edges. Between corners the field
is bilinear:

$$
h(u,v) = h_{00}(1{-}u)(1{-}v) + h_{10}u(1{-}v) + h_{01}(1{-}u)v + h_{11}uv
$$

per cell, which gives an analytic gradient, piecewise per cell:

$$
\frac{\partial h}{\partial x} = (h_{10}-h_{00})(1{-}v) + (h_{11}-h_{01})v,
\qquad
\frac{\partial h}{\partial y} = (h_{01}-h_{00})(1{-}u) + (h_{11}-h_{10})u .
$$

## Springs

A river rises at every local maximum: a cell centre $(c{+}0.5,\ r{+}0.5)$
whose sampled height is $\ge$ each of its eight neighbouring centres' (ties
count — a level ridge still sheds water) and $\ge$ `minPeak`. Summits are
traced tallest first, so the biggest week carves its valley before anyone
else may join it.

## The step: RK2 (midpoint)

Plain Euler down a gradient ricochets across curved valleys. One midpoint
probe fixes most of it:

$$
k_1 = -\nabla h(p), \qquad
k_2 = -\nabla h\!\left(p + \tfrac{\Delta s}{2}\,\hat{k}_1\right), \qquad
p \leftarrow p + \Delta s\,\hat{k}_2,
$$

with directions normalised ($\hat{k} = k/\lVert k\rVert$) so $\Delta s$
(default $0.25$ cell units) is an arc length, not a speed — the trace moves
at the same pace on a cliff and on a meadow, and its point spacing stays
even for the painter.

## Stopping rules

A trace records $[x, y, h]$ at every point, the summit included, and ends
when the first of these holds:

1. **The flat** — $\lVert \nabla h(p) \rVert <$ `minSlope` (default
   $10^{-3}$): the water has nowhere lower to go.
2. **The edge** — $p$ leaves $[0, cols]\times[0, rows]$: off the range,
   into the sea.
3. **The clock** — `maxSteps` (default 80) steps taken.
4. **The confluence** — the new point lands within `joinDist` (default
   $0.5$) of any point of an earlier river: tributaries stop where they
   meet the main stem rather than double-drawing the shared valley.

Everything is deterministic: the same field yields the same rivers, point
for point.
