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
