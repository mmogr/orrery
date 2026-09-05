/* Total validators: every function takes whatever a feed dared to send and
   returns a clean value of the promised shape — never throwing, never
   trusting. The rules are the site's own, formalised: GitHub only mints
   [A-Za-z0-9._-] repo names so the name test rejects nothing real, the
   caps sit well above today's feeds, and "(private)" passes by name as the
   one sanctioned pseudonym. Callers own their sinks: these promise shape,
   not markup safety — escape at the edge you print. */
import type { GraphFeed, GraphNode, DayRecord, RepoRecord, RecentRow,
              RepoLangs, LangBytes, Ghosts, SemanticFeed, SemanticNote, FlowFeed,
              Excerpt, ExcerptsFeed, TextIndexManifest, TextShard } from "./types.ts";

export const okName = (r: unknown): r is string =>
  typeof r === "string" && /^[A-Za-z0-9._-]{1,100}$/.test(r);

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown): number => (Number.isFinite(+(v as number)) ? +(v as number) : 0);

export function validateGraph(d: unknown, caps = { nodes: 2000, edges: 8000 }): GraphFeed {
  const raw = (d && typeof d === "object" ? d : {}) as any;
  const nodes: GraphNode[] = (Array.isArray(raw.nodes) ? raw.nodes : [])
    .slice(0, caps.nodes)
    .filter((n: any) => n && typeof n === "object")
    .map((n: any): GraphNode => ({
      id: str(n.id), label: str(n.label), course: str(n.course),
      week: n.week == null ? null : num(n.week),
      tags: Array.isArray(n.tags) ? n.tags.filter((t: unknown) => typeof t === "string") : [],
      html: str(n.html),
    }));
  const ids = new Set(nodes.map(n => n.id));
  const edges: Array<[string, string]> = (Array.isArray(raw.edges) ? raw.edges : [])
    .map((e: any) => Array.isArray(e) ? { from: e[0], to: e[1] } : e)
    .filter((e: any) => e && ids.has(e.from) && ids.has(e.to))
    .slice(0, caps.edges)
    .map((e: any) => [e.from, e.to] as [string, string]);
  return { nodes, edges };
}

export function validateDays(days: unknown): DayRecord[] {
  return (Array.isArray(days) ? days : [])
    .filter((d: any) => d && typeof d === "object" && /^\d{4}-\d{2}-\d{2}$/.test(d.date))
    .map((d: any): DayRecord => {
      const out: DayRecord = { date: d.date, level: num(d.level), count: num(d.count) };
      const det = d.d;
      if (det && typeof det === "object") {
        const nd: any = {};
        for (const k of ["c", "p", "i", "r"] as const)
          if (Array.isArray(det[k]))
            nd[k] = det[k]
              .filter((e: any) => Array.isArray(e) && (e[0] === "(private)" || okName(e[0])))
              .map((e: any) => [e[0], num(e[1])] as [string, number]);
        if (det.x != null) nd.x = num(det.x);
        if (det.pl && typeof det.pl === "object")
          nd.pl = Object.fromEntries(Object.entries(det.pl)
            .filter(([k]) => typeof k === "string" && k.length <= 60)
            .map(([k, v]) => [k, num(v)]));
        out.d = nd;
      }
      return out;
    });
}

export function validateRepoLangs(v: unknown): RepoLangs {
  if (!v || typeof v !== "object") return {};
  return Object.fromEntries(Object.entries(v as object)
    .filter(([k, val]) => (k === "(private)" || okName(k)) && typeof val === "string")
    .slice(0, 300)) as RepoLangs;
}

export function validateLangBytes(v: unknown): LangBytes {
  if (!v || typeof v !== "object") return {};
  return Object.fromEntries(Object.entries(v as object)
    .filter(([k, val]) => okName(k) && val && typeof val === "object")
    .slice(0, 300)
    .map(([k, val]) => [k, Object.fromEntries(Object.entries(val as object)
      .filter(([l]) => typeof l === "string" && l.length <= 60)
      .map(([l, b]) => [l, num(b)]))])) as LangBytes;
}

export function validateGhosts(v: unknown): Ghosts {
  return (Array.isArray(v) ? v : [])
    .filter(Array.isArray).slice(0, 3)
    .map(a => a.slice(0, 400).map(num));
}

export function validateRepos(v: unknown): RepoRecord[] {
  return (Array.isArray(v) ? v : [])
    .filter((r: any) => r && typeof r === "object" && okName(r.name))
    .slice(0, 300)
    .map((r: any): RepoRecord => ({
      name: r.name,
      ...(typeof r.lang === "string" ? { lang: r.lang } : {}),
      ...(typeof r.desc === "string" ? { desc: r.desc } : {}),
      ...(r.rel && typeof r.rel === "object" && typeof r.rel.at === "string"
        ? { rel: { tag: str(r.rel.tag), at: r.rel.at } } : {}),
      ...(r.fork ? { fork: true } : {}),
      ...(r.archived ? { archived: true } : {}),
    }));
}

export function validateRecents(v: unknown): RecentRow[] {
  return (Array.isArray(v) ? v : [])
    .filter((r: any) => r && typeof r === "object")
    .map((r: any): RecentRow => ({
      href: str(r.href ?? r.path), course: str(r.course), title: str(r.title),
    }))
    .filter(r => r.href)
    .slice(0, 5);
}

/* the semantic feed: dim must be a whole number within the cap or the feed
   is empty; a note must carry a string html and exactly dim finite numbers
   or it is dropped; the first note wins a duplicate html; model and
   explained ride along only when they are the promised shape */
export function validateSemantic(d: unknown, caps = { notes: 2000, dim: 64 }): SemanticFeed {
  const raw = (d && typeof d === "object" ? d : {}) as any;
  const dim = Number.isInteger(raw.dim) && raw.dim >= 0 && raw.dim <= caps.dim ? raw.dim : 0;
  const seen = new Set<string>();
  const notes: SemanticNote[] = dim ? (Array.isArray(raw.notes) ? raw.notes : [])
    .filter((n: any) => n && typeof n === "object" && typeof n.html === "string"
      && n.html.length > 0 && n.html.length <= 300
      && Array.isArray(n.v) && n.v.length === dim
      && n.v.every((x: unknown) => typeof x === "number" && Number.isFinite(x)))
    .filter((n: any) => !seen.has(n.html) && seen.add(n.html))
    .slice(0, caps.notes)
    .map((n: any): SemanticNote => ({ html: n.html, v: n.v.map((x: number) => +x) })) : [];
  const out: SemanticFeed = { dim: notes.length ? dim : 0, notes };
  if (typeof raw.model === "string" && raw.model.length <= 100) out.model = raw.model;
  if (typeof raw.explained === "number" && raw.explained >= 0 && raw.explained <= 1)
    out.explained = raw.explained;
  return out;
}

/* the excerpts feed: a note is a string html of sensible length and a
   string line, trimmed and cut at the cap; the first note wins a duplicate
   html; a note whose line is empty after trimming carries nothing and is
   dropped. Optional, like the semantic feed: a site whose notes have not
   published excerpts yet validates null into the empty contract and says
   nothing rather than nothing-at-all. */
export function validateExcerpts(d: unknown, caps = { notes: 2000, ex: 200 }): ExcerptsFeed {
  const raw = (d && typeof d === "object" ? d : {}) as any;
  const seen = new Set<string>();
  const notes: Excerpt[] = (Array.isArray(raw.notes) ? raw.notes : [])
    .filter((n: any) => n && typeof n === "object" && typeof n.html === "string"
      && n.html.length > 0 && n.html.length <= 300 && typeof n.ex === "string")
    .filter((n: any) => !seen.has(n.html) && seen.add(n.html))
    .map((n: any): Excerpt => ({ html: n.html, ex: n.ex.trim().slice(0, caps.ex) }))
    .filter((n: Excerpt) => n.ex.length > 0)
    .slice(0, caps.notes);
  return { v: 1, notes };
}

/* the text index's manifest: n shards within the cap, exactly n names, each
   a bare hex-and-.json file name (never a path — a name from a feed becomes
   a URL, and a name that could climb out of its directory is not a name),
   and the ids the postings index into. Anything off and the manifest is
   empty, which the consumer reads as "no full-text search today". */
export function validateTextIndexManifest(d: unknown, caps = { n: 64, ids: 2000 }): TextIndexManifest {
  const raw = (d && typeof d === "object" ? d : {}) as any;
  const empty: TextIndexManifest = { v: 1, n: 0, shards: [], ids: [] };
  const n = Number.isInteger(raw.n) && raw.n > 0 && raw.n <= caps.n ? raw.n : 0;
  if (!n || !Array.isArray(raw.shards) || raw.shards.length !== n) return empty;
  const shards: string[] = raw.shards
    .filter((f: unknown) => typeof f === "string" && /^[a-f0-9]{8,64}\.json$/.test(f));
  if (shards.length !== n) return empty;
  const ids: string[] = (Array.isArray(raw.ids) ? raw.ids : [])
    .filter((h: unknown) => typeof h === "string" && h.length > 0 && h.length <= 300)
    .slice(0, caps.ids);
  if (!ids.length) return empty;
  return { v: 1, n, shards, ids };
}

/* one shard of the text index: a plain map from term to the ids it appears
   in. Own properties only — a shard arrives as JSON and is read by key, so
   an inherited "constructor" or "__proto__" would answer a query it has no
   business answering. Every id is a whole number below idCount, deduped and
   ordered; a term too long or a posting out of range is dropped. */
export function validateTextShard(d: unknown, idCount: number,
                                  caps = { terms: 5000, term: 64, ids: 2000 }): TextShard {
  const out: TextShard = Object.create(null) as TextShard;
  if (!d || typeof d !== "object" || Array.isArray(d)) return out;
  let kept = 0;
  for (const term of Object.keys(d as object)) {
    if (kept >= caps.terms) break;
    if (!term.length || term.length > caps.term) continue;
    const v = (d as any)[term];
    if (!Array.isArray(v)) continue;
    const seen = new Set<number>();
    const ids = v.filter((i: unknown) => Number.isInteger(i) && (i as number) >= 0
        && (i as number) < idCount && !seen.has(i as number) && seen.add(i as number))
      .slice(0, caps.ids)
      .sort((a: number, b: number) => a - b);
    if (!ids.length) continue;
    out[term] = ids;
    kept++;
  }
  return out;
}

/* the flow feed: node ids are strings, a link is two indices in range and
   a positive finite length, the counts are whole numbers, q is a
   modularity in [−1, 1]; anything else is dropped or read as zero */
export function validateFlow(d: unknown, caps = { nodes: 2000, edges: 8000 }): FlowFeed {
  const raw = (d && typeof d === "object" ? d : {}) as any;
  const nodes: string[] = (Array.isArray(raw.nodes) ? raw.nodes : [])
    .filter((n: unknown) => typeof n === "string" && n.length > 0 && n.length <= 300)
    .slice(0, caps.nodes);
  const edges: Array<[number, number, number]> = (Array.isArray(raw.edges) ? raw.edges : [])
    .filter((e: any) => Array.isArray(e) && e.length === 3
      && Number.isInteger(e[0]) && Number.isInteger(e[1]) && e[0] !== e[1]
      && e[0] >= 0 && e[1] >= 0 && e[0] < nodes.length && e[1] < nodes.length
      && typeof e[2] === "number" && Number.isFinite(e[2]) && e[2] > 0)
    .slice(0, caps.edges)
    .map((e: any) => [e[0], e[1], e[2]] as [number, number, number]);
  const whole = (v: unknown): number => (Number.isInteger(v) && (v as number) >= 0 ? v as number : 0);
  const pos = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
  const q = typeof raw.q === "number" && raw.q >= -1 && raw.q <= 1 ? raw.q : 0;
  const clusters = whole(raw.clusters);
  const out: FlowFeed = { steps: whole(raw.steps), eps: pos(raw.eps), cut: pos(raw.cut), q,
                          clusters, nodes, edges };
  /* optional, and never more than the communities it is counted among: an
     older bake has no `parted` and the consumer falls back to the count */
  if (Number.isInteger(raw.parted) && raw.parted >= 0 && raw.parted <= clusters)
    out.parted = raw.parted;
  return out;
}
