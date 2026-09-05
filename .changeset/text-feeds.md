---
"@mmogr/orrery": minor
---

Two text feeds pass the same gate as the rest. `ExcerptsFeed` / `validateExcerpts`: a note's opening prose, one line, keyed on the `html` path the graph feed already emits — trimmed, capped, deduped, and optional in the strong sense, so `validateExcerpts(null)` is the empty contract. `TextIndexManifest` / `TextShard` with `validateTextIndexManifest` and `validateTextShard`: a sharded inverted index, so a page can search a corpus's full text by fetching the one shard its query hashes into. A shard name is checked as a *name* rather than a path, since the consumer turns it into a URL, and a shard is built with a null prototype, since it is read by key. `docs/feeds.md` is the first document for the feed layer and describes every contract in the package.
