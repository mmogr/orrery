# The notes graph

The sky is not the wikilink graph the notes publish; it is that graph
seen through a rule about what a star is. This module is the rule, so
the page and the script that bakes the flow build the same graph.

## The rule

A star is an evergreen concept note: no week, and not a course's landing
page (the note named for its course, `courses/c/c.qmd`). Weekly course
files are dated by nature and are not timeless, so they are not drawn —
but a concept a weekly note links is taught in that week alongside every
other concept it links, so the link is inherited: every pair of stars a
hidden weekly note touches is linked, and the constellations the writing
implies stay drawn. Landing pages link everything in their course and
never mediate; that would draw "same course" as a clique, which the
colour already says. An index note that fans out past `maxFanout` stars
is not a co-teaching signal either and mediates nothing.

The order of the links is the feed's: direct links between stars first,
in feed order, then the inherited pairs, hidden note by hidden note in
the order the feed first met each. Every consumer that indexes by link
position reads the same order.

## What comes back

The stars, in feed order; the links, by id; and for every hidden weekly
note the stars it touched, in order — the notes each concept resolves
into when a reader looks closer.

## Constants

| constant | value | role |
| --- | --- | --- |
| `maxFanout` | 64 | a hidden note touching more stars than this mediates nothing (the largest real bucket is about 21) |

## Aesthetic terms

The rule itself is editorial — what a star is — and named as such. The
fan-out cap is a guard against index pages, set a factor of three above
what the notes have needed.
