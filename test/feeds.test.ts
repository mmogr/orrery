/* The feed contract under fire: junk types, hostile names, prototype
   pollution, oversize — total functions promise clean shapes back. */
import test from "node:test";
import assert from "node:assert/strict";
import { validateGraph, validateDays, validateRepoLangs, validateGhosts,
         validateRepos, validateLangBytes, validateRecents, okName }
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
