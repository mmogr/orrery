# Curvature

A link between two notes can be a bottleneck or a thread in a weave. The
picture should say which — a bridge between courses drawn as thinly as a
link inside a clique tells the reader nothing about how the graph holds
together. Ollivier's Ricci curvature is the number that distinguishes
them, and it is computed, not tuned.

## Two walks and the distance between them

Put a lazy random walk on every node: from $i$, with probability $\alpha$
stay at $i$, otherwise step to a uniformly chosen neighbour. Its one-step
distribution is

$$m_i = \alpha\,\delta_i + (1 - \alpha)\,\frac{1}{d_i}\sum_{k \sim i} \delta_k .$$

Two adjacent nodes $i \sim j$ have two such distributions, supported on
$\{i\} \cup N(i)$ and $\{j\} \cup N(j)$. Their Wasserstein-1 distance —
the least total cost of moving the mass of $m_i$ onto $m_j$, when moving a
unit from $u$ to $v$ costs the path length $d(u, v)$ — is what Ollivier
compares to the length of the edge itself:

$$\kappa(i, j) = 1 - \frac{W_1(m_i, m_j)}{d(i, j)} = 1 - W_1(m_i, m_j),$$

since $d(i, j) = 1$ on an unweighted graph. If the two neighbourhoods
already overlap, little has to move and $\kappa > 0$; if they lie on
opposite sides of the edge, everything must cross it and $\kappa < 0$.
The range is $[-2, 1]$.

## What it says on graphs we can do by hand

- **A complete graph $K_n$.** Both walks put $(1-\alpha)/(n-1)$ on every
  common neighbour; only $i$'s surplus $\alpha - (1-\alpha)/(n-1)$ has to
  move, one step, to $j$. So $W_1 = (\alpha n - 1)/(n-1)$ and, at
  $\alpha = \tfrac12$, $\kappa = n / (2(n-1))$: $\tfrac23$ on $K_4$,
  $\tfrac58$ on $K_5$, tending to $\tfrac12$.
- **A tree.** With $\alpha = \tfrac12$ the surplus at $i$ is
  $\tfrac12 - \tfrac1{2d_i}$ and the rest of $i$'s mass sits on
  neighbours two steps from $j$'s; the optimum works out to
  $\kappa = \tfrac1{d_i} + \tfrac1{d_j} - 1$. A leaf edge is
  $\tfrac1{d}$, the interior of a path is $0$ (flat, as a line should be),
  and two degree-three nodes joined make $-\tfrac13$.
- **Two 5-cliques over a bridge.** Each end has degree $5$ and a surplus of
  $\tfrac25$; the four clique-mates on each side carry $\tfrac1{10}$ each
  and are two steps from the far end. The best plan sends both surpluses
  two steps: $W_1 = \tfrac85$, $\kappa = -\tfrac35$, while every edge
  inside a clique stays positive. That is the whole story of a bottleneck
  in one number.

On a notes graph the reading is the same: a link inside a course's cluster
is positive, a link that alone joins two courses is negative, and the
most negative edges are the graph's load-bearing beams.

## Computing it exactly

The transport problem is small — each support has $d + 1$ nodes and the
costs are integers, because any node of one support is within three hops
of any node of the other ($u \to i \to j \to v$) — so it is solved
outright rather than approximated. `transportCost` is the primal-dual
method on the dense bipartite problem. A price on every source and every
sink keeps each reduced cost $C_{uv} + p_u - p_v$ non-negative, and mass
moves only along routes whose reduced cost is zero: a depth-first search
finds one from a source still holding mass to a sink still wanting it,
pushes the bottleneck amount, undoing flow where the route runs backward,
and looks again. When the prices offer nothing more they are raised — one
Dijkstra on the reduced costs, stopped at the nearest sink still wanting
mass — and the search resumes. Each push saturates a source, a sink, or a
backward edge, so the loop is finite.

It replaced successive shortest paths, which ran that Dijkstra once per
push. The costs take three values, so the prices need raising only a
handful of times per link, where the pushes number about one per node of
the supports; on a hub with thirty-odd neighbours that is the difference
between a search over the whole residual graph thirty times and three.
The two solvers agree to the last few bits.

Two things keep it that small on a real graph. The costs come from one
table: a breadth-first walk from every node, once, capped at three hops,
so a link reads its costs rather than walking for them. And the mass the
two walks already agree on — $\min(m_i(u), m_j(u))$ at every $u$ — stays
where it is: with a metric cost, moving overlapping mass away and
replacing it can never beat leaving it, so only each side's surplus
enters the transport. Inside a clique the neighbourhoods overlap almost
entirely and the problem left is a few nodes a side; on the notes graph,
fourteen hundred links take some twenty milliseconds.

Entropic regularisation (Sinkhorn) was considered and set aside: with unit
costs the bias it introduces, of order $\varepsilon \log(|S_i|\,|S_j|)$,
would be comparable to the curvatures being measured unless $\varepsilon$
were made so small that the iteration crawled. Exact is both simpler and
right.

## Constants

| constant | value | role |
| --- | --- | --- |
| $\alpha$ | $\tfrac12$ | laziness: the mass that stays home in one step |
| hop bound | $3$ | the greatest distance between the two supports, so the breadth-first walk stops there |
| tolerance | $10^{-12}$ | mass below which a source or sink counts as spent |

## Aesthetic terms

None in the number. Ollivier's construction fixes the walk, the metric
and the cost; $\alpha = \tfrac12$ is his own default and the one the
closed forms above assume, not a tuning. What a consumer *does* with
$\kappa$ — how thin to draw a bridge, how faint — is a choice about
emphasis and lives with the consumer.
