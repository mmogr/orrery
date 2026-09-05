# Ricci flow

Curvature says, link by link, what the graph is made of: a bridge is
negative, a thread in a weave positive. Ricci flow lets the graph act on
that knowledge. Every link is given a length; each step a bridge grows
and a weave tightens, in proportion to its curvature; and after a few
steps the communities of the graph stand apart, joined by links that have
stretched. Hamilton wrote the flow for surfaces, where it rounds a
metric toward constant curvature; Ollivier's curvature lets the same
equation run on a graph, where it does the opposite of rounding — it
finds the seams.

## The flow on a metric graph

Give every link $e$ a length $\ell_e$, so that the distance between two
nodes is the shortest path by those lengths. Ollivier's curvature on a
metric graph is the same construction as before with the lengths in it:
the two lazy walks at the ends of a link, the cost of moving one onto the
other measured in path length, and

$$\kappa_e = 1 - \frac{W_1(m_i, m_j)}{\ell_e}.$$

The flow is

$$\ell_e \leftarrow \ell_e\,(1 - \varepsilon\,\kappa_e),$$

the discrete form of $\partial_t \ell = -\kappa\,\ell$. A negative
curvature makes the link longer, and a longer link moves the two walks'
supports farther apart, which makes the curvature more negative still:
bridges run away. A positive curvature shortens a link, and a shorter
link inside a weave overlaps the neighbourhoods more. Left alone the
whole graph would also shrink or swell; so after each step the lengths
are rescaled to a mean of one — the normalised flow, which keeps the
sky's size and lets only its shape move. A floor and a ceiling stop a
length from collapsing to nothing or running past the drawing.

Rescaling changes no curvature: $W_1$ and $\ell_e$ scale together, so
$\kappa$ is invariant under a uniform change of lengths, and the test
holds it to $10^{-12}$.

## The barbell by hand

Two 5-cliques joined by one bridge, every length one, $\alpha = \tfrac12$.
The bridge has $\kappa = -\tfrac35$ (docs/curvature.md). The clique edges
are of two kinds now: the twelve whose ends both sit away from the
bridge see the full $K_5$ closed form, $\kappa = \tfrac58$; the eight
with one end on the bridge see that end's walk send a tenth of its mass
across to the other clique, and come to $\kappa = 0.425$ — the shipped
solver's number, not a closed form, and the test pins it.

One step at $\varepsilon = \tfrac12$, before rescaling: the bridge
$1 + 0.3 = 1.3$, the twelve inner edges $1 - \tfrac{5}{16} = 0.6875$,
the eight bridge-adjacent edges $1 - 0.2125 = 0.7875$. The mean is
$(12 \cdot 0.6875 + 8 \cdot 0.7875 + 1.3)/21 = 0.754762$, so after
rescaling the bridge stands at $1.7224$, the inner edges at $0.9109$ and
the adjacent ones at $1.0434$: already the bridge is the longest link by
a wide margin. Ten steps later it passes twice the mean and keeps going;
where it settles is not a closed form — the flow stops stretching it
where the walks' costs, now dominated by the bridge itself, balance the
shrinking cliques — and the test asks only that it has passed the cut.

## Reading the communities

The lengths are a picture; a count is a choice of cut. Keep every link no
longer than the cut and take the connected components. A fixed cut —
twice the mean, say — is brittle: one new hub note next week shifts the
curvature of every link near it, and the count would swing with the
noise. So the cut is chosen the way the flow's authors choose it: try the
cut just below every distinct length above the mean, and keep the one
whose components score the highest modularity on the original graph,

$$Q = \sum_c \left( \frac{e_c}{m} - \left(\frac{d_c}{2m}\right)^2 \right),$$

$e_c$ the links inside community $c$, $d_c$ the sum of its degrees, $m$
the links in all. $Q$ is the share of links inside communities beyond
what a random graph with the same degrees would have; one community
scores zero, a clique split in two scores below zero, the barbell parted
at its bridge scores $2\,(\tfrac{10}{21} - \tfrac14) = \tfrac{19}{42}$.
Modularity moves only when the communities do, so the count reads the
graph and not the week. A graph whose lengths are all equal has no
candidate above the mean and is one community.

### How many the cut made

The count is how many pieces the sky is in; it is not how many the flow
put it in. A notes graph usually arrives with a few components already —
a course nobody has linked out of yet, a stray pair — and the cut inherits
every one of them without doing anything. So `cutCommunities` also returns

$$\text{parted} = \text{count} - c(G),$$

$c(G)$ the components of the whole graph, before a single link is removed
(clamped at zero, since a cut can only ever add components). Two barbells
side by side flow to four communities and a `parted` of two: two seams cut,
two pieces that were never joined. A consumer with a sentence to say about
what the flow *did* should say this number.

## The ceiling

The ceiling exists so a runaway bridge cannot leave the drawing, and it
binds before the rescaling, which means it also has to leave room for the
flow's own answer. At $\varepsilon = \tfrac12$ and ten steps a bridge in a
real notes graph reaches four in half a dozen steps and then sits there,
pinned — and a length pinned at the ceiling is a length that has stopped
saying anything: every saturated seam reports the same number, the mean
lands above it, and the cut chosen from the lengths above the mean can end
up above every length in the bake. Sixteen is four steps of headroom past
that, still finite, and no barbell reaches it.

## Constants

| constant | value | role |
| --- | --- | --- |
| $\alpha$ | $\tfrac12$ | the walks' laziness, as for curvature |
| $\varepsilon$ | $\tfrac12$ | the share of $\kappa$ a length moves by, per step |
| floor, ceiling | $0.1$, $16$ | the shortest and longest a link may become, before rescaling |
| candidate cuts | $\le 64$ | distinct lengths above the mean, thinned to quantiles past that |

## Aesthetic terms

Hamilton's equation, Ollivier's curvature and Newman's modularity are
all as published; $\varepsilon = \tfrac12$ and ten steps are the
consumer's choice of how far to let the flow run before drawing (enough
to part the barbell, not so far that the cliques collapse), and the clamp
exists so a picture stays a picture. How a consumer plays the flow — held
under a key, ramped from one to the baked lengths, faded past the cut —
is its own admission.
