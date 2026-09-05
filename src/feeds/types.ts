/* The feed contracts: the shapes the observatory's three public feeds agree
   to speak. The site validates them once at its edge; the snapshot script
   validates before it saves, so a bad snapshot never reaches the repo. */

export interface GraphNode {
  id: string;
  label: string;
  course: string;
  week: number | null;
  tags: string[];
  html: string;
}

export interface GraphFeed {
  nodes: GraphNode[];
  /* normalised to pairs; the live feed's {from, to} objects are accepted */
  edges: Array<[string, string]>;
}

export interface DayDetail {
  c?: Array<[string, number]>;   /* commits per repo */
  p?: Array<[string, number]>;   /* PRs opened */
  i?: Array<[string, number]>;   /* issues opened */
  r?: Array<[string, number]>;   /* reviews */
  x?: number;                    /* private contributions, counted blind */
  pl?: Record<string, number>;   /* private work as language buckets */
}

export interface DayRecord {
  date: string;                  /* YYYY-MM-DD */
  level: number;                 /* 0..4 */
  count: number;
  d?: DayDetail;
}

export interface RepoRecord {
  name: string;
  lang?: string;
  desc?: string;
  rel?: { tag: string; at: string };
  fork?: boolean;
  archived?: boolean;
}

export interface RecentRow {
  href: string;
  course: string;
  title: string;
}

export type RepoLangs = Record<string, string>;
export type LangBytes = Record<string, Record<string, number>>;
export type Ghosts = number[][];

/* the notes' meaning: each note's embedding, reduced by the notes site to
   its leading principal directions (ordered by variance, each signed so its
   largest-|entry| note is positive) and published beside the graph. dim
   is the length of every v; a feed with dim 0 says the notes have not
   published their meaning yet. */
export interface SemanticNote {
  html: string;                  /* the same key the graph's nodes carry */
  v: number[];                   /* exactly dim coordinates */
}

export interface SemanticFeed {
  dim: number;
  model?: string;                /* the embedding model, for the legend */
  explained?: number;            /* the share of variance the kept directions carry, 0..1 */
  notes: SemanticNote[];
}

/* the Ricci flow, baked: the sky's own graph flowed for `steps` steps at
   ε = eps, every link's final length (edges as indices into nodes, with
   the length), and the communities read off it — `clusters` at the cut
   the modularity q chose. A feed with no nodes says no flow has been
   baked. */
export interface FlowFeed {
  steps: number;
  eps: number;
  cut: number;
  q: number;
  clusters: number;
  parted?: number;                            /* of those, how many the cut made */
  nodes: string[];                            /* note ids, once */
  edges: Array<[number, number, number]>;     /* [i, j, length] */
}

/* the excerpts feed: a note's opening prose, one line, keyed on the same
   html path the graph feed emits so the two join without a lookup table */
export interface Excerpt {
  html: string;
  ex: string;
}

export interface ExcerptsFeed {
  v: number;
  notes: Excerpt[];
}

/* the text index: a manifest naming the shards and the note ids their
   postings point into, and a shard mapping a term to those ids. The
   consumer hashes a query term to a shard, fetches that one file, and
   never sees the rest of the index. */
export interface TextIndexManifest {
  v: number;
  n: number;                                  /* shards, and the modulus of the hash */
  shards: string[];                           /* file names, in shard order; repeats allowed */
  ids: string[];                              /* html paths a posting indexes into */
}

export type TextShard = Record<string, number[]>;
