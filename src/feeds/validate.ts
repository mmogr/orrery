/* Total validators: every function takes whatever a feed dared to send and
   returns a clean value of the promised shape — never throwing, never
   trusting. The rules are the site's own, formalised: GitHub only mints
   [A-Za-z0-9._-] repo names so the name test rejects nothing real, the
   caps sit well above today's feeds, and "(private)" passes by name as the
   one sanctioned pseudonym. Callers own their sinks: these promise shape,
   not markup safety — escape at the edge you print. */
import type { GraphFeed, GraphNode, DayRecord, RepoRecord, RecentRow,
              RepoLangs, LangBytes, Ghosts, SemanticFeed, SemanticNote, FlowFeed } from "./types.ts";

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
  return { steps: whole(raw.steps), eps: pos(raw.eps), cut: pos(raw.cut), q,
           clusters: whole(raw.clusters), nodes, edges };
}
