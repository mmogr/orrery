/* The sky by meaning: the layout faces the links, the suggestions never
   repeat a link, and the agreement test finds planted communities. */
import test from "node:test";
import assert from "node:assert/strict";
import { semanticLayout, cosine, semanticLinks, semanticAgreement } from "../src/sky/semantic.ts";
import { hopDistances, UNREACHABLE } from "../src/sky/paths.ts";
import type { Graph } from "../src/sky/laplacian.ts";
import type { Embedding } from "../src/sky/spectral.ts";
import { rng } from "../src/rng.ts";

const near = (a: number, b: number, tol = 1e-9) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} !~ ${b} (tol ${tol})`);

const DIM = 16;

/* a link layout of n stars, and a box that fits it exactly so scaleToBox
   is the identity and the comparison is about the turn alone */
function layout(n: number, seed: number): { link: Embedding; w: number; h: number } {
  const rnd = rng(seed);
  const link = { x: new Float64Array(n), y: new Float64Array(n), z: new Float64Array(n) };
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) {
    link.x[i] = (rnd() - 0.5) * 300; link.y[i] = (rnd() - 0.5) * 200;
    mx = Math.max(mx, Math.abs(link.x[i])); my = Math.max(my, Math.abs(link.y[i]));
  }
  return { link, w: 2 * mx, h: 2 * my };
}

test("semanticLayout returns the link layout when meaning is the link layout", () => {
  const n = 20, { link, w, h } = layout(n, 4);
  const v = new Float64Array(n * DIM);
  for (let i = 0; i < n; i++) { v[i * DIM] = link.x[i]; v[i * DIM + 1] = link.y[i]; }
  const e = semanticLayout(v, n, DIM, link, w, h);
  for (let i = 0; i < n; i++) { near(e.x[i], link.x[i], 1e-9); near(e.y[i], link.y[i], 1e-9); near(e.z[i], 0); }
});

test("semanticLayout turns a rotated and reflected copy back to face the links", () => {
  const n = 20, { link } = layout(n, 5);
  const th = 1.1, c = Math.cos(th), s = Math.sin(th);
  const v = new Float64Array(n * DIM);
  for (let i = 0; i < n; i++) {
    /* reflect y, then rotate by θ: two things Procrustes must undo (the
       shift it also undoes is the linalg test's business — scaleToBox
       measures about the origin, so a shifted cloud would fit differently) */
    const x = link.x[i], y = -link.y[i];
    v[i * DIM] = c * x - s * y; v[i * DIM + 1] = s * x + c * y;
  }
  /* the box: rotation changes the extents, so measure them */
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx = Math.max(mx, Math.abs(v[i * DIM])); my = Math.max(my, Math.abs(v[i * DIM + 1])); }
  /* the box matched to the turned cloud so scaleToBox is the identity: the
     turn, the mirror and the shift are undone to 1e-9 */
  const exact = semanticLayout(v, n, DIM, link, 2 * mx, 2 * my);
  for (let i = 0; i < n; i++) { near(exact.x[i], link.x[i], 1e-9); near(exact.y[i], link.y[i], 1e-9); }
});

test("cosine is 1 on a copy, 0 against the zero vector", () => {
  const v = new Float64Array([1, 2, 3, 2, 4, 6, 0, 0, 0]);
  near(cosine(v, 3, 0, 1), 1, 1e-12);
  near(cosine(v, 3, 0, 2), 0);
});

test("semanticLinks: perNode lets a note keep only its strongest", () => {
  /* four notes in a huddle and a pair of their own off to one side.
     Unlimited, the huddle's pairs take the whole list and note 1 appears
     three times over; at one a note, every note appears once and the pair
     off to the side gets a place. */
  const n = 6, dim = 2;
  const v = new Float64Array([
    1, 0,                          /* 0 \                      */
    1, 0.02,                       /* 1  | the huddle: every    */
    1, 0.05,                       /* 2  | pair of them is near */
    1, 0.09,                       /* 3 /                       */
    0, 1,                          /* 4 \ a pair of their own,  */
    0.06, 1,                       /* 5 / farther apart than any of the huddle's */
  ]);
  const g: Graph = { n, edges: [] };
  const all = semanticLinks(v, n, dim, g, { count: 4, minSim: 0.5 });
  assert.equal(all.length, 4);
  assert.equal(all.filter(([a, b]) => a === 1 || b === 1).length, 2);
  assert.ok(!all.some(([a, b]) => a === 4 && b === 5), "the distant pair is crowded out");

  const one = semanticLinks(v, n, dim, g, { count: 4, minSim: 0.5, perNode: 1 });
  assert.deepEqual(one[0].slice(0, 2), all[0].slice(0, 2));   /* the strongest pair still leads */
  const seen = new Set<number>();
  for (const [a, b] of one) {
    assert.ok(!seen.has(a) && !seen.has(b), `${a}–${b} reuses a note: ${JSON.stringify(one)}`);
    seen.add(a); seen.add(b);
  }
  assert.ok(one.some(([a, b]) => a === 4 && b === 5), `the distant pair gets in: ${JSON.stringify(one)}`);
  /* perNode 0 is the old behaviour exactly */
  assert.deepEqual(semanticLinks(v, n, dim, g, { count: 4, minSim: 0.5, perNode: 0 }), all);
});

test("semanticLinks skips links and zero vectors and ranks the unlinked twin first", () => {
  const n = 6, dim = 3;
  const v = new Float64Array([
    1, 0, 0,   1, 0, 0,        /* 0 and 1: twins, unlinked */
    0, 1, 0,   0, 1, 0,        /* 2 and 3: twins, linked */
    0, 0, 0,                   /* 4: unknown to the feed */
    0.8, 0.6, 0,               /* 5: near 0 and 1, nearer 2 and 3 */
  ]);
  const g: Graph = { n, edges: [[2, 3], [0, 5]] };
  const out = semanticLinks(v, n, dim, g, { count: 12, minSim: 0.5 });
  assert.deepEqual(out[0].slice(0, 2), [0, 1]);
  near(out[0][2], 1, 1e-12);
  assert.ok(!out.some(([a, b]) => a === 2 && b === 3), "a link is never suggested");
  assert.ok(!out.some(([a, b]) => a === 4 || b === 4), "a zero vector never pairs");
  assert.ok(!out.some(([a, b]) => a === 0 && b === 5), "the other link is skipped too");
  assert.ok(out.every(([, , s]) => s >= 0.5));
  assert.equal(semanticLinks(v, n, dim, g, { count: 1 }).length, 1);
});

/* three communities of eight, cliques with two bridges between each pair */
function communities(): { g: Graph; of: number[] } {
  const edges: Array<[number, number]> = [], of: number[] = [];
  for (let c = 0; c < 3; c++)
    for (let a = 0; a < 8; a++) {
      of.push(c);
      for (let b = a + 1; b < 8; b++) edges.push([8 * c + a, 8 * c + b]);
    }
  edges.push([0, 8], [1, 9], [8, 16], [9, 17], [16, 0], [17, 1]);
  return { g: { n: 24, edges }, of };
}

test("semanticAgreement finds planted communities and calls a shuffled sky what it is", () => {
  const { g, of } = communities();
  const rnd = rng(9);
  const centre = Array.from({ length: 3 }, () => Float64Array.from({ length: DIM }, () => rnd() - 0.5));
  const v = new Float64Array(g.n * DIM);
  for (let i = 0; i < g.n; i++)
    for (let k = 0; k < DIM; k++) v[i * DIM + k] = centre[of[i]][k] + (rnd() - 0.5) * 0.2;
  const a = semanticAgreement(v, g.n, DIM, g, { permutations: 200, seed: 1 });
  assert.ok(a.rho > 0.5, `rho ${a.rho}`);
  assert.ok(a.p < 0.01, `p ${a.p}`);
  assert.equal(a.known, g.n);
  /* the same vectors dealt to the wrong notes: no agreement to speak of */
  const shuffled = new Float64Array(g.n * DIM);
  const perm = Array.from({ length: g.n }, (_, i) => i).sort(() => rnd() - 0.5);
  for (let i = 0; i < g.n; i++)
    for (let k = 0; k < DIM; k++) shuffled[i * DIM + k] = v[perm[i] * DIM + k];
  const b = semanticAgreement(shuffled, g.n, DIM, g, { permutations: 200, seed: 1 });
  assert.ok(Math.abs(b.rho) < 0.3, `rho ${b.rho}`);
  assert.ok(b.p > 0.05, `p ${b.p}`);
  /* fewer than three known notes is no test */
  const few = new Float64Array(g.n * DIM);
  few[0] = 1; few[DIM] = 1;
  assert.deepEqual(semanticAgreement(few, g.n, DIM, g), { rho: 0, p: 1, known: 2 });
  /* and the same seed gives the same answer */
  assert.deepEqual(semanticAgreement(v, g.n, DIM, g, { permutations: 200, seed: 1 }), a);
});

test("hopDistances counts hops and marks what cannot be reached", () => {
  const path: Graph = { n: 5, edges: [[0, 1], [1, 2], [2, 3], [3, 4]] };
  const d = hopDistances(path);
  assert.equal(d[0 * 5 + 4], 4);
  assert.equal(d[2 * 5 + 2], 0);
  assert.equal(d[1 * 5 + 3], 2);
  const split: Graph = { n: 4, edges: [[0, 1], [2, 3]] };
  const e = hopDistances(split);
  assert.equal(e[0 * 4 + 1], 1);
  assert.equal(e[0 * 4 + 2], UNREACHABLE);
});

test("a notes-sized sky agrees or not in well under a frame's worth of frames", () => {
  const n = 150, rnd = rng(11);
  const edges: Array<[number, number]> = [];
  const seen = new Set<string>();
  while (edges.length < 320) {
    const a = Math.floor(rnd() * n), b = Math.floor(rnd() * n);
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (a !== b && !seen.has(key)) { seen.add(key); edges.push([a, b]); }
  }
  const g: Graph = { n, edges };
  const v = Float64Array.from({ length: n * DIM }, () => rnd() - 0.5);
  const t0 = performance.now();
  const a = semanticAgreement(v, n, DIM, g, { permutations: 200, seed: 1 });
  const links = semanticLinks(v, n, DIM, g);
  const ms = performance.now() - t0;
  console.log(`semantic agreement + links, n=${n}, dim=${DIM}, 200 permutations: ${ms.toFixed(1)} ms`);
  assert.ok(ms < 200, `${ms} ms`);
  assert.ok(a.rho > -1 && a.rho < 1 && a.p > 0 && a.p <= 1);
  assert.ok(links.length <= 12);
});
