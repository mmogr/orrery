# The feed contracts

*`src/feeds/types.ts`, `src/feeds/validate.ts`*

Every other document here derives a model. This one describes the boundary
the models sit behind: the shapes the observatory's public feeds agree to
speak, and the total functions that turn whatever a feed actually sent into
one of those shapes.

## Total, never trusting

Each validator has the same signature in spirit — `unknown` in, a clean value
of the promised type out — and the same three promises:

- **It never throws.** A feed that has gone to HTML, to `null`, to an array
  where an object was promised, or to nothing at all returns the empty
  contract. A page that cannot draw because a JSON file moved is a page with
  a bug in it, not a page with a data problem.
- **It never trusts.** Numbers are finite and in range, strings are capped,
  arrays are capped, names match the alphabet that mints them, and anything
  that fails is dropped rather than repaired. The caps sit well above today's
  feeds, so they bite only on something that has gone wrong.
- **It owns no sink.** These promise *shape*, not markup safety. A validated
  string is still a string someone else wrote: escape it at the edge you
  print it.

Two callers, one contract: the page validates at its own edge on every load,
and the snapshot script validates before it writes, so a bad upstream day
cannot reach the repository, let alone the bake.

## The feeds

| feed | shape | validator | empty contract |
| --- | --- | --- | --- |
| graph | `{nodes, edges}` — a note's id, label, course, week, tags, html; links as pairs | `validateGraph` | no nodes, no edges |
| days | `[{date, count, detail?}]` — the contribution year | `validateDays` | no days |
| repos | `[{name, …}]` — the roster the planets are drawn from | `validateRepos` | no repos |
| repo languages | `{repo: language}` | `validateRepoLangs` | `{}` |
| language bytes | `{repo: {language: bytes}}` | `validateLangBytes` | `{}` |
| ghosts | `[[count, …], …]` — prior years' ridges | `validateGhosts` | no years |
| recents | `[{href, course, title}]`, at most five | `validateRecents` | no rows |
| semantic | `{dim, notes: [{html, v}], model?, explained?}` | `validateSemantic` | `dim` 0, no notes |
| flow | `{steps, eps, cut, q, clusters, parted?, nodes, edges}` | `validateFlow` | zeros, no nodes |
| excerpts | `{v, notes: [{html, ex}]}` | `validateExcerpts` | no notes |
| text index | `{v, n, shards, ids}` and one shard per file | `validateTextIndexManifest`, `validateTextShard` | `n` 0, no shards |

Feeds join on `html` — the path a note renders to — which the graph, semantic
and excerpts feeds all carry, so no lookup table has to be kept in step.

## Optional feeds

Three feeds are optional in the strong sense: a consumer must render
correctly when they have never existed. `validateSemantic(null)`,
`validateExcerpts(null)` and `validateTextIndexManifest(null)` each return
the empty contract rather than throwing, so a sky whose notes site has not
published its meaning yet says "not computed" instead of failing to draw.
The flow feed's `parted` is optional in the same way within a feed that
exists: a bake made before the field was added validates, and its consumer
falls back to the community count.

## The excerpts feed

A note's opening prose, one line, keyed on `html`. The consumer shows it
under a star on hover, which is exactly why it exists as a feed at all: the
line was previously read out of the notes site's whole-corpus search index,
several megabytes fetched to show one sentence. The validator trims, caps at
200 characters, drops a note whose line is empty after trimming, and lets the
first note win a duplicate `html`.

## The text index

A full-text search with no server and no megabytes. The index is inverted —
for each term, the notes it appears in — and cut into `n` shards by a hash of
the term, so a query fetches only the shards its own words land in.

The manifest names the shards **in shard order**: `shards[h(term) mod n]` is
the file holding that term, and the same name may appear twice when two
shards hold identical postings (on a small corpus, every empty one), which
costs a consumer nothing since it fetches by position. Postings are indices
into `ids`, not paths — one list of paths costs less than $n$ copies of it.

Two rules in the validator are not shape-checking but safety:

- **A shard name is a name, not a path.** It matches `^[a-f0-9]{8,64}\.json$`
  and nothing else, because a consumer turns it into a URL, and a feed that
  could put `../../` in that URL decides what the consumer fetches. A
  manifest with one bad name is empty, not partly good.
- **A shard has no prototype.** It is read by key, from JSON, so a shard is
  built with `Object.create(null)`: an inherited `constructor` or `toString`
  would otherwise answer a query it has no business answering.

The hash itself belongs to the producer and the consumer, not to this module
— they must compute the same one, and the contract here is only that the
manifest's order is the hash's order.

## Constants

| constant | value | role |
| --- | --- | --- |
| nodes, notes, ids | 2000 | notes a feed may carry |
| edges | 8000 | links a feed may carry |
| html path | 300 chars | the longest key a note may have |
| excerpt | 200 chars | the longest line the consumer will be handed |
| semantic `dim` | 64 | principal directions a feed may carry |
| recents | 5 | rows the listing may carry |
| shards `n` | 64 | the most shards a manifest may name |
| terms a shard | 5000 | postings lists in one shard |
| term | 64 chars | the longest term a shard may hold |

## Aesthetic terms

None. This module has no taste; it is the one place in the package where
being dull is the whole specification. The one judgement call is where the
caps sit, and they sit an order of magnitude above the feeds as they stand —
high enough never to truncate a real vault, low enough that a runaway or
hostile feed cannot make the page allocate its way out of memory.
