/* The notes graph the sky is drawn on, from the notes feed. Only evergreen
   concept notes make the sky — stars are timeless, weekly course files
   are not — and a link that passes through a hidden weekly note is
   inherited: the stars it links are linked to each other, so the
   constellations the writing implies stay drawn. Course landing pages
   link everything in their course, so they never mediate (that would
   draw "same course" as a clique, which the colour already says); only
   weekly notes do, and their inherited links mean "taught together". An
   index note that fans out past `maxFanout` is not a co-teaching signal
   and mediates nothing. See docs/notes-graph.md. */
import type { GraphFeed, GraphNode } from "../feeds/types.ts";

export interface NotesGraphOpts { maxFanout: number }
export const NOTES_GRAPH_DEFAULTS: NotesGraphOpts = { maxFanout: 64 };

export interface NotesGraph {
  nodes: GraphNode[];                  /* the stars, in feed order */
  edges: Array<[string, string]>;      /* by id: direct links first, then the inherited */
  /* every hidden weekly note's star neighbours, in the order met — the
     notes each concept resolves into at depth */
  hosts: Map<string, string[]>;
}

export const isLanding = (n: GraphNode): boolean => (n.id || "").endsWith("/" + n.course + ".qmd");
export const isStar = (n: GraphNode): boolean => n.week == null && !isLanding(n);

export function notesGraph(feed: GraphFeed, opts: Partial<NotesGraphOpts> = {}): NotesGraph {
  const { maxFanout } = { ...NOTES_GRAPH_DEFAULTS, ...opts };
  const nodes = feed.nodes.filter(isStar);
  const stars = new Set(nodes.map(n => n.id));
  const landings = new Set(feed.nodes.filter(isLanding).map(n => n.id));
  const seen = new Set<string>();
  const edges: Array<[string, string]> = [];
  const add = (a: string, b: string): void => {
    if (a === b) return;
    const k = a < b ? a + "|" + b : b + "|" + a;
    if (!seen.has(k)) { seen.add(k); edges.push([a, b]); }
  };
  const hosts = new Map<string, string[]>();
  const host = (hidden: string, star: string): void => {
    if (!hosts.has(hidden)) hosts.set(hidden, []);
    hosts.get(hidden)!.push(star);
  };
  for (const [a, b] of feed.edges) {
    const sa = stars.has(a), sb = stars.has(b);
    if (sa && sb) add(a, b);
    else if (sa && !landings.has(b)) host(b, a);
    else if (sb && !landings.has(a)) host(a, b);
  }
  for (const nb of hosts.values()) {
    if (nb.length > maxFanout) continue;
    for (let i = 0; i < nb.length; i++)
      for (let j = i + 1; j < nb.length; j++) add(nb[i], nb[j]);
  }
  return { nodes, edges, hosts };
}
