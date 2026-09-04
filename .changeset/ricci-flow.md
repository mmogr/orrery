---
"@mmogr/orrery": minor
---

Ricci flow: `ollivierRicci` takes link `lengths` and becomes Ollivier's curvature on a metric graph (`shortestPaths` in `sky/paths`); `sky/ricci-flow` runs the normalised discrete flow (`ricciFlowStep`, `ricciFlow`) and reads communities off the lengths at the cut modularity chooses (`modularity`, `cutCommunities`); `stepLayout` honours per-link rest lengths through `LayoutEnv.lengths`; `sky/notes-graph` is the rule that makes a sky of a notes feed, so a page and a script build the same graph; and `FlowFeed` / `validateFlow` carry a baked flow.
