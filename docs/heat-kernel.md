# The heat kernel signature

docs/heat.md warms the graph from one note and watches the warmth spread.
Ask the opposite question — warm every note at once, by the same amount,
and see how much of its own warmth each one still holds a moment later —
and the answer is the diagonal of the heat kernel. It is a number per note
that depends only on the links, changes smoothly with the time you wait,
and at different waits reads different things: how busy a note's own
corner is, then which cluster it belongs to, then finally its share of the
whole. That is a signature, and it is what this module computes.

## Definition

With $L = L_{\mathrm{sym}}$ (docs/spectral-sky.md) and eigenpairs
$L\phi_k = \lambda_k \phi_k$, $\phi_k$ orthonormal, the heat kernel is
$e^{-tL}$ and the **heat kernel signature** of node $i$ at time $t$ is
its diagonal entry:

$$\mathrm{HKS}_t(i) = \big(e^{-tL}\big)_{ii}
  = \sum_{k=1}^{n} e^{-t\lambda_k}\, \phi_k(i)^2 .$$

Every eigenpair contributes, not just the smooth ones the embedding keeps.
Two things make it honest rather than merely spectral. It is the solution
of the heat equation $\partial u/\partial t = -Lu$ started from a unit at
$i$, read back at $i$ — exactly the field `diffuse` would produce from a
single source, if it were run to time $t$ without decay and we kept only
the source's own value. And it is a probability: the continuous-time
random walk that leaves a node at rate 1 for a uniformly chosen neighbour
has generator $I - D^{-1}A = D^{-1/2} L\, D^{1/2}$, so its transition
matrix $e^{-t(I - D^{-1}A)}$ is $D^{-1/2} e^{-tL} D^{1/2}$ and shares
its diagonal with $e^{-tL}$. $\mathrm{HKS}_t(i)$ is the chance that a
walker who left $i$ at time $0$ is home at time $t$. It lies in $(0, 1]$,
starts at $1$, and decreases.

## Small $t$: what separates nodes, and at what order

Expand the exponential:

$$\mathrm{HKS}_t(i) = 1 - t\,L_{ii} + \frac{t^2}{2}\,(L^2)_{ii} - \cdots$$

For $L_{\mathrm{sym}}$ every node with a neighbour has $L_{ii} = 1$, so
the first-order term is $-t$ for all of them: uniform, and it separates
nothing. Degree does *not* emerge at first order in this normalisation —
it would for the combinatorial Laplacian, where $L_{ii} = d_i$. What
separates nodes is the second-order term,

$$(L^2)_{ii} = \sum_j L_{ij}^2 = 1 + \sum_{j \sim i} \frac{1}{d_i\, d_j}
  = 1 + \frac{1}{d_i}\sum_{j \sim i}\frac{1}{d_j},$$

one plus the mean of $1/d_j$ over $i$'s neighbours. In the random-walk
reading it is plain: a walker who steps to a leaf can only step straight
back, so a note whose neighbours are dead ends is more likely to be home
again soon. On $K_{1,6}$ the hub's neighbours all have degree $1$, so its
term is $2$, while a leaf's is $1 + 1/6$, and the hub's signature is the
largest at every $t$ — narrowly at $t = 0.1$ ($0.9094$ against
$0.9056$), and by closed form: hub $\tfrac12(1 + e^{-2t})$, leaf
$\tfrac{1}{12}(1 + e^{-2t}) + \tfrac56 e^{-t}$, from the star's spectrum
$0, 1^{(5)}, 2$. Small $t$ therefore reads **locally busy**: a note that
is the centre of its own small neighbourhood, whose links lead to notes
with few other links. It is not degree on its own — on a $d$-regular graph
the term is $1 + 1/d$, falling with degree.

## Large $t$: the degree share

As $t \to \infty$ every mode with $\lambda_k > 0$ dies and only the
kernel survives. On a connected component the kernel of $L_{\mathrm{sym}}$
is $D^{1/2}\mathbf{1}$ (docs/spectral-sky.md), which normalised is
$\phi_1(i) = \sqrt{d_i / 2m}$ with $2m = \sum_i d_i$ the component's total
degree. Hence

$$\lim_{t \to \infty} \mathrm{HKS}_t(i) = \phi_1(i)^2 = \frac{d_i}{2m},$$

the stationary distribution of the walk: here degree emerges, as each
note's share of the component's links. The rate of approach is
$e^{-t\lambda_2}$, so a component with a weak cut (two cliques over a
bridge: $\lambda_2 \approx 0.05$) keeps a walker on its own side for a
long while — which is what the middle scale reads.

## The heat trace

Summing over nodes, the orthonormality $\sum_i \phi_k(i)^2 = 1$ collapses
the signature to the trace of the kernel:

$$\sum_i \mathrm{HKS}_t(i) = \sum_k e^{-t\lambda_k}
  = \operatorname{tr} e^{-tL}.$$

It is the check the tests lean on: the sum over nodes must equal the sum
over eigenvalues computed independently, to $10^{-9}$, at every $t$.
Isolated nodes obey it too — their row of $L_{\mathrm{sym}}$ is the lone
$1$, so $\lambda = 1$, $\phi = 1$, and $\mathrm{HKS}_t = e^{-t}$: the walk
from a note with nowhere to go is, in the symmetric normalisation, still
draining at unit rate, and the $1 \times 1$ decomposition gives exactly
that with no special case.

## Two scales

The spectrum of $L_{\mathrm{sym}}$ lies in $[0, 2]$. At $t = 1$ the rough
modes — $\lambda$ above $1$, the sign-alternating disagreements between
linked notes — are damped to $e^{-1}$ or less but still speak, and the
signature is the local reading above: a hop or two out and back. At
$t = 10$ everything above $\lambda = \tfrac12$ is gone to $e^{-5}$ and
only the smooth modes remain: the component's slow cuts, the cluster
structure the Fiedler vector draws. A note in a tight clique keeps more of
its walker at $t = 10$ than a note on a bridge; a note in a large loose
component is already near its degree share. That is **structurally
central**, and the ratio $\mathrm{HKS}_1 / \mathrm{HKS}_{10}$ reads one
against the other: high where a note is busy in a corner that matters
little to the whole, near $1$ where its corner *is* the whole.

## Computing it

Per connected component, as the embedding does, since the eigenvectors of
a disconnected graph mix components arbitrarily and the trace identity
holds component by component:

1. gather the component's members and relabel its edges locally;
2. build $L_{\mathrm{sym}}$ in CSR and densify it — a component is at
   most a few hundred notes;
3. take *all* eigenpairs by cyclic Jacobi (`jacobiEigen`, values
   ascending, vectors unit norm);
4. for each requested $t$ and each node, accumulate
   $\sum_k e^{-t\lambda_k}\phi_k(i)^2$ and scatter to the node's row.

The result is `n × times.length`, row-major by node:
`out[i * times.length + k]` is $\mathrm{HKS}_{t_k}(i)$. Jacobi is cubic
per sweep, so above `HKS_MAX_DENSE` $= 600$ notes in one component we do
not run it; that component receives the large-$t$ limit
$\mathrm{HKS}_t(i) = d_i / 2m$ at every scale — the shape the signature
was heading for, without the seconds to get there. On a graph of a few
hundred notes the cap never fires.

## Constants

| constant | value | role |
| --- | --- | --- |
| `HKS_SCALES` | $[1, 10]$ | default times to sample the kernel |
| `HKS_MAX_DENSE` | $600$ | largest component decomposed by Jacobi; beyond it, $d_i/2m$ |
| Jacobi tolerance | $10^{-11}$ of matrix scale | inherited from `jacobiEigen` |
| Jacobi sweeps | $64$ | inherited cap, likewise |
| $\lambda_{\max}$ | $\le 2$ | bounds the spectrum, so fixes what each $t$ can see |

## Aesthetic terms

The physics fixes the kernel: given the graph there is one $e^{-tL}$ and
one diagonal. Taste picks where to sample it. **The two scales** $1$ and
$10$ are that choice — a decade apart because the spectrum spans a decade
of rates, one just inside the rough modes and one just past them; three
scales, or $0.5$ and $20$, would be defensible and different. The
**large-component fallback** is an engineering admission rather than
physics: past the cap we report where the signature would end rather
than where it is. And nothing here decides what the numbers *look* like —
whether $\mathrm{HKS}_1$ sets a star's size and the ratio its glow, or the
other way round, belongs to the consumer, who should say so in their own
legend.
