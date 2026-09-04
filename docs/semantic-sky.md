# The sky by meaning

The spectral sky places a note by its links: what is taught together sits
together. But two notes can say the same thing and never link — a proof by
contradiction in one course, an argument by contradiction in another — and
the link layout cannot see it. The sky by meaning is a second layout, from
the notes' text, and the honest question beside it: how far do the two
agree?

## Where the meaning comes from

The page does not read the notes. The notes site embeds every note with a
local language model (768 numbers a note, unit length, the model's own
sense of what the text is about), and reduces them once, where the text
lives: centre the matrix, take its leading right-singular directions, and
project. Sixteen directions carry most of the variance of a few hundred
notes; the rest is noise about the choice of words. The feed publishes,
per note, its sixteen coordinates, ordered by the variance each direction
carries and signed so the note with the largest entry along each is
positive — the same convention the spectral sky uses for its eigenvectors,
so the same notes always face the same way.

That is `SemanticFeed`: `dim`, the coordinates per note; `notes`, each
with the note's `html` (the key the graph's nodes carry) and its `v`;
`explained`, the share of variance kept, for the legend. A feed with
`dim = 0` says the notes have not published their meaning yet, and the
consumer says so rather than inventing one.

## The drawn layout

The first two directions are a plane, and a plane is a layout. Scaled to
the same box as the spectral rest state, it is the meaning sky — up to a
rotation and a reflection, which principal directions never fix. Left as
they fall, a morph from the link layout to the meaning layout would spin
every star through an arbitrary angle. So the meaning layout is turned to
face the links first, by orthogonal Procrustes: with both clouds centred
and $M = \sum_i (s_i - \bar s)(d_i - \bar d)^\top$, the orthogonal $R$
minimising $\sum_i \|R s_i - d_i\|^2$ is $R = UV^\top$ from
$M = U\Sigma V^\top$. No scaling — the meaning layout keeps its own
extent — and a reflection is allowed, because a mirror image of the
notes is the same meaning. What remains after the turn is the genuine
disagreement between the two, and that is what the morph shows.

## The pairs that agree

Cosine similarity in all sixteen directions, not the two drawn, says how
close two notes are in meaning:

$$\cos(i, j) = \frac{v_i \cdot v_j}{\|v_i\|\,\|v_j\|}.$$

Among the pairs the graph does *not* link, the strongest — at least
$0.5$, at most twelve — are the suggested links: notes that say the same
things and were never joined. A note the feed did not know is the zero
vector and never pairs; ties break by index so the list is the same on
every machine.

## How far meaning and links agree

One number for the whole sky: Mantel's test between two distances on the
same notes — hop distance on the graph (a note in another component
counts as $n$, farther than any path), and cosine distance $1 - \cos$ in
sixteen directions. Over the $n(n-1)/2$ pairs, Spearman's rank
correlation $\rho$ says whether notes near in meaning tend to be near in
the graph. Spearman, not Pearson: hop distance is a small integer with
enormous ties and no linear relation to a cosine, and ranks ask only
whether the orderings agree.

The null is the one Mantel wrote: relabel the graph's nodes at random and
correlate again. Permuting *pairs* would be wrong — the pairs of a
distance matrix are not independent, every node touches $n-1$ of them —
so the labels move, and every pair moves with its endpoints. Relabelling
changes which pair carries which rank, never the ranks themselves, so both
matrices are ranked once and each of the $N$ permutations is a
re-indexed dot product. Then

$$p = \frac{1 + \#\{\text{relabellings with } \rho' \ge \rho\}}{1 + N},$$

one-sided, since the question is agreement: $p$ is the share of shuffled
skies that agree at least as well as the real one, with the observed sky
counted among them so $p$ is never zero. At $N = 200$ the smallest $p$ is
$1/201$, which is all a legend sentence needs.

## Constants

| constant | value | role |
| --- | --- | --- |
| `dim` | 16 (the feed's) | principal directions kept by the notes site; the page reads whatever it is sent, up to 64 |
| `count` | 12 | suggested links shown |
| `minSim` | 0.5 | the least cosine a suggestion needs |
| `permutations` | 200 | relabellings behind $p$; $p \ge 1/201$ |
| `seed` | 1 | the relabellings' stream; a consumer may pick its own |
| unreachable | $n$ | the hop distance charged between components |

## Aesthetic terms

The mathematics fixes the layout up to the turn, and Procrustes fixes the
turn. What is chosen: sixteen directions (enough that cosine means
something, few enough that the feed stays small), twelve suggestions at
half a cosine (a sky lightly annotated, not a second graph), and two
hundred relabellings (the smallest $p$ a legend would ever quote). How a
consumer morphs between the two layouts, and how faint a suggestion is
drawn, are its own admissions.
