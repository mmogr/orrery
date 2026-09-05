/* The feed contract under fire: junk types, hostile names, prototype
   pollution, oversize — total functions promise clean shapes back. */
import test from "node:test";
import assert from "node:assert/strict";
import { validateGraph, validateDays, validateRepoLangs, validateGhosts,
         validateRepos, validateLangBytes, validateRecents, validateSemantic, validateFlow,
         validateExcerpts, validateTextIndexManifest, validateTextShard, okName }
  from "../src/feeds/validate.ts";

test("okName is GitHub's alphabet and nothing more", () => {
  assert.ok(okName("gglib") && okName("a.b_c-d") && okName("A".repeat(100)));
  assert.ok(!okName("") && !okName("a".repeat(101)) && !okName("a b")
    && !okName("<img>") && !okName(42) && !okName(null));
});

test("validateGraph takes pairs or objects, drops strays, caps, rebuilds fields", () => {
  const g = validateGraph({
    nodes: [{ id: "a", label: "A", course: "c1", week: null, tags: ["t", 7], html: "a.html", evil: 1 },
            { id: "b", label: 2, course: "c1", week: "3", tags: "no", html: "b.html" },
            null, "junk"],
    edges: [["a", "b"], { from: "b", to: "a" }, ["a", "ghost"], null, ["x", "y"]],
  });
  assert.equal(g.nodes.length, 2);
  assert.deepEqual(Object.keys(g.nodes[0]).sort(), ["course", "html", "id", "label", "tags", "week"]);
  assert.deepEqual(g.nodes[0].tags, ["t"]);
  assert.equal(g.nodes[1].label, "");
  assert.equal(g.nodes[1].week, 3);
  assert.deepEqual(g.edges, [["a", "b"], ["b", "a"]]);
  const big = validateGraph({ nodes: Array.from({ length: 3000 }, (_, i) => ({ id: "n" + i })), edges: [] });
  assert.equal(big.nodes.length, 2000);
});

test("validateDays keeps the calendar honest and the buckets named", () => {
  const days = validateDays([
    { date: "2026-01-02", level: 1, count: "5",
      d: { c: [["gglib", 3], ["<script>", 9], ["(private)", 2], "junk"], x: "7",
           pl: { Python: "4", ["__proto__"]: 1 } } },
    { date: "not a date", count: 99 },
    null,
  ]);
  assert.equal(days.length, 1);
  assert.equal(days[0].count, 5);
  const det = days[0].d as any;
  assert.deepEqual(det.c, [["gglib", 3], ["(private)", 2]]);
  assert.equal(det.x, 7);
  assert.equal(det.pl.Python, 4);
  assert.ok(!Object.prototype.hasOwnProperty.call({}, "polluted"));
});

test("prototype pollution finds no purchase", () => {
  /* "__proto__" and "constructor" are legal GitHub names, so they survive
     as OWN data properties — what must never happen is a write through the
     prototype chain. Object.fromEntries guarantees exactly that. */
  const rl = validateRepoLangs(JSON.parse('{"__proto__": "X", "gglib": "Rust"}'));
  assert.equal((({}) as any).X, undefined);
  assert.equal(rl.gglib, "Rust");
  assert.equal(Object.getPrototypeOf(rl), Object.prototype);
  const lb = validateLangBytes(JSON.parse('{"constructor": {"a": "1"}, "gglib": {"Rust": "10"}}'));
  assert.equal(lb.gglib.Rust, 10);
  assert.equal(Object.keys(lb).length, 2);        /* kept, as data */
  assert.deepEqual(lb.constructor, { a: 1 });     /* and coerced like any other */
  assert.equal(typeof ({}).constructor, "function");   /* the real one untouched */
});

test("ghosts coerce to at most three years of at most 400 numbers", () => {
  const g = validateGhosts([[1, "2", null, {}], [3], [4], [5], "junk"]);
  assert.equal(g.length, 3);
  assert.deepEqual(g[0], [1, 2, 0, 0]);
});

test("repos keep only what the contract names", () => {
  const r = validateRepos([
    { name: "gglib", lang: "Rust", desc: "d", rel: { tag: "v1", at: "2026-01-01T00:00:00Z" },
      fork: false, archived: false, stars: 999 },
    { name: "bad name!" }, { lang: "Go" }, null,
  ]);
  assert.equal(r.length, 1);
  assert.deepEqual(Object.keys(r[0]).sort(), ["desc", "lang", "name", "rel"]);
});

test("recents cap at five and answer to href or path", () => {
  const r = validateRecents([
    { path: "a.html", course: "c", title: "T" },
    { href: "b.html", course: "c", title: "U" },
    {}, ...Array.from({ length: 9 }, (_, i) => ({ href: "x" + i })),
  ]);
  assert.equal(r.length, 5);
  assert.equal(r[0].href, "a.html");
  assert.equal(r[1].href, "b.html");
});

test("validateSemantic keeps only notes that carry exactly dim finite numbers", () => {
  const f = validateSemantic({
    dim: 3, model: "nomic-embed-text-v1.5", explained: 0.6, evil: 1,
    notes: [
      { html: "a.html", v: [1, 2, 3], extra: true },
      { html: "b.html", v: [1, 2] },                  /* short */
      { html: "c.html", v: [1, 2, "3"] },             /* not a number */
      { html: "d.html", v: [1, 2, NaN] },             /* not finite */
      { html: "a.html", v: [9, 9, 9] },               /* duplicate: the first wins */
      { html: 5, v: [1, 2, 3] },                      /* no key */
      { html: "e.html", v: [0, 0, 0] },
      null, "junk",
    ],
  });
  assert.deepEqual(f, { dim: 3, model: "nomic-embed-text-v1.5", explained: 0.6,
    notes: [{ html: "a.html", v: [1, 2, 3] }, { html: "e.html", v: [0, 0, 0] }] });
  assert.ok(!("evil" in f) && !("extra" in f.notes[0]));
});

test("validateSemantic empties a feed with a bad dim and accepts the empty contract", () => {
  assert.deepEqual(validateSemantic({ dim: 2.5, notes: [{ html: "a.html", v: [1, 2] }] }), { dim: 0, notes: [] });
  assert.deepEqual(validateSemantic({ dim: 65, notes: [] }), { dim: 0, notes: [] });
  assert.deepEqual(validateSemantic({ dim: 0, notes: [] }), { dim: 0, notes: [] });
  assert.deepEqual(validateSemantic(null), { dim: 0, notes: [] });
  /* dim with no surviving note is dim 0: the page reads one field */
  assert.deepEqual(validateSemantic({ dim: 4, notes: [{ html: "a.html", v: [1] }] }), { dim: 0, notes: [] });
  /* a bad model or explained is dropped, not the feed */
  assert.deepEqual(validateSemantic({ dim: 1, model: 7, explained: 2, notes: [{ html: "a.html", v: [1] }] }),
    { dim: 1, notes: [{ html: "a.html", v: [1] }] });
  assert.equal(validateSemantic({ dim: 1, notes: Array.from({ length: 5 }, (_, i) => ({ html: `${i}.html`, v: [1] })) },
    { notes: 3, dim: 64 }).notes.length, 3);
});

test("validateFlow keeps links between known nodes with positive lengths and reads junk as zero", () => {
  const f = validateFlow({
    steps: 10, eps: 0.5, cut: 1.7, q: 0.45, clusters: 3, evil: 1,
    nodes: ["a", "b", "c", 7, ""],
    edges: [[0, 1, 1.2], [1, 2, 0.4], [0, 3, 1], [0, 0, 1], [2, 1, -1], [0, 1, NaN], [0, 1], "junk", null],
  });
  assert.deepEqual(f, { steps: 10, eps: 0.5, cut: 1.7, q: 0.45, clusters: 3, nodes: ["a", "b", "c"],
                        edges: [[0, 1, 1.2], [1, 2, 0.4]] });
  assert.deepEqual(validateFlow(null), { steps: 0, eps: 0, cut: 0, q: 0, clusters: 0, nodes: [], edges: [] });
  assert.deepEqual(validateFlow({ steps: 2.5, eps: -1, cut: "x", q: 3, clusters: -2, nodes: [], edges: [] }),
    { steps: 0, eps: 0, cut: 0, q: 0, clusters: 0, nodes: [], edges: [] });
  assert.equal(validateFlow({ nodes: ["a", "b"], edges: [[0, 1, 1], [1, 0, 1], [0, 1, 2]] }, { nodes: 2, edges: 2 }).edges.length, 2);
});

test("validateFlow's parted is optional, whole, and never more than the count", () => {
  const base = { steps: 10, eps: 0.5, cut: 1.7, q: 0.45, clusters: 3, nodes: [], edges: [] };
  assert.equal(validateFlow({ ...base, parted: 2 }).parted, 2);
  assert.equal(validateFlow({ ...base, parted: 0 }).parted, 0);
  assert.equal(validateFlow(base).parted, undefined);              /* an older bake */
  assert.equal(validateFlow({ ...base, parted: 4 }).parted, undefined);   /* more than the count */
  assert.equal(validateFlow({ ...base, parted: -1 }).parted, undefined);
  assert.equal(validateFlow({ ...base, parted: 1.5 }).parted, undefined);
  assert.equal(validateFlow({ ...base, parted: "2" }).parted, undefined);
});

test("validateExcerpts trims, caps, dedupes and drops the wordless", () => {
  const e = validateExcerpts({
    v: 1, evil: 1,
    notes: [
      { html: "a.html", ex: "  the first line  " },
      { html: "a.html", ex: "a second try" },        /* the first html wins */
      { html: "b.html", ex: "x".repeat(400) },
      { html: "c.html", ex: "   " },                 /* nothing to say */
      { html: "d.html", ex: 7 },
      { html: "", ex: "no key" },
      { html: "e".repeat(400), ex: "too long a key" },
      null, "junk", { ex: "no html" },
    ],
  });
  assert.deepEqual(e.notes.map(n => n.html), ["a.html", "b.html"]);
  assert.equal(e.notes[0].ex, "the first line");
  assert.equal(e.notes[1].ex.length, 200);
  assert.equal(e.v, 1);
  /* the empty contract, for a notes site that has not published one yet */
  assert.deepEqual(validateExcerpts(null), { v: 1, notes: [] });
  assert.deepEqual(validateExcerpts("junk"), { v: 1, notes: [] });
  assert.equal(validateExcerpts({ notes: Array.from({ length: 3000 },
    (_, i) => ({ html: `n${i}.html`, ex: "x" })) }).notes.length, 2000);
});

test("validateTextIndexManifest takes n bare file names or nothing at all", () => {
  const names = Array.from({ length: 4 }, (_, i) => `${"0123456789abcdef".slice(i)}${"0".repeat(i)}0000.json`);
  const ok = validateTextIndexManifest({ v: 1, n: 4, shards: names, ids: ["a.html", "b.html"], evil: 1 });
  assert.deepEqual(ok, { v: 1, n: 4, shards: names, ids: ["a.html", "b.html"] });
  const empty = { v: 1, n: 0, shards: [], ids: [] };
  /* the count and the list must agree */
  assert.deepEqual(validateTextIndexManifest({ n: 4, shards: names.slice(0, 3), ids: ["a"] }), empty);
  assert.deepEqual(validateTextIndexManifest({ n: 200, shards: names, ids: ["a"] }), empty);
  assert.deepEqual(validateTextIndexManifest({ n: 0, shards: [], ids: ["a"] }), empty);
  /* a name is a name, not a path: it becomes a URL */
  assert.deepEqual(validateTextIndexManifest(
    { n: 1, shards: ["../../etc/passwd.json"], ids: ["a"] }), empty);
  assert.deepEqual(validateTextIndexManifest({ n: 1, shards: ["a/b0000000.json"], ids: ["a"] }), empty);
  assert.deepEqual(validateTextIndexManifest({ n: 1, shards: ["deadbeef.txt"], ids: ["a"] }), empty);
  assert.deepEqual(validateTextIndexManifest({ n: 1, shards: ["DEADBEEF.json"], ids: ["a"] }), empty);
  assert.deepEqual(validateTextIndexManifest({ n: 1, shards: ["deadbeef.json"], ids: [] }), empty);
  assert.deepEqual(validateTextIndexManifest(null), empty);
  assert.equal(validateTextIndexManifest({ n: 1, shards: ["deadbeef.json"],
    ids: Array.from({ length: 3000 }, (_, i) => `n${i}.html`) }).ids.length, 2000);
});

test("validateTextShard keeps whole ids in range, deduped, and inherits nothing", () => {
  const s = validateTextShard({
    stack: [2, 0, 2, 1],
    recursion: [0],
    ghost: [9, -1, 1.5, "x"],           /* every posting out of range: dropped */
    "": [0],
    ["x".repeat(80)]: [0],
    kepler: "not a list",
  }, 3);
  assert.deepEqual(s.stack, [0, 1, 2]);
  assert.deepEqual(s.recursion, [0]);
  assert.ok(!("ghost" in s) && !("kepler" in s) && !("" in s));
  /* a shard is read by key, so it must answer only for its own keys */
  assert.equal(Object.getPrototypeOf(s), null);
  assert.equal((s as any).constructor, undefined);
  assert.equal((s as any).__proto__, undefined);
  const evil = validateTextShard(JSON.parse('{"__proto__": [0], "toString": [0]}'), 1);
  assert.deepEqual(evil.toString as unknown, [0]);        /* an own key, harmlessly */
  assert.equal(({} as any).polluted, undefined);
  assert.deepEqual(Object.keys(validateTextShard(null, 3)), []);
  assert.deepEqual(Object.keys(validateTextShard([1, 2], 3)), []);
  assert.equal(Object.keys(validateTextShard(
    Object.fromEntries(Array.from({ length: 6000 }, (_, i) => [`t${i}`, [0]])), 1)).length, 5000);
});
