---
"@mmogr/orrery": minor
---

The flow says how many constellations it parted: `cutCommunities` returns `parted`, the community count less the graph's own components, so a consumer can say what the cut *did* rather than how many pieces the sky happens to be in. `FlowFeed.parted` and `validateFlow` carry it, optional and never larger than the count, so an older bake still validates. `FLOW_DEFAULTS.ceil` rises from 4 to 16: at ten steps a real notes graph pins a dozen bridges against a ceiling of four, and a length pinned at the ceiling has stopped saying anything — enough of them and the cut chosen from the lengths above the mean lands above every length in the bake.
