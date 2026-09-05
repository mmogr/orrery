/* The terrain models, held to their promises. */
import test from "node:test";
import assert from "node:assert/strict";
import { type Field, cornerHeights, sample, gradient } from "../src/terrain/heightfield.ts";
import { traceRivers } from "../src/terrain/rivers.ts";
import { LIGHT, AMBIENT, DIFFUSE, faceNormal, lambert, type V3 } from "../src/terrain/shade.ts";
import { clipZ, serrate } from "../src/terrain/snow.ts";
import { weekly, smoothed, inflections, momentum } from "../src/terrain/series.ts";
import { weeklyEntropy } from "../src/terrain/entropy.ts";

const near = (a: number, b: number, tol = 1e-9) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} !~ ${b} (tol ${tol})`);

/* a field straight from an analytic corner function — the terrain tests
   that are about the field, not about the binning, start here */
const fieldFrom = (fn: (x: number, y: number) => number, cols: number, rows: number): Field => {
  const h = new Float64Array((rows + 1) * (cols + 1));
  for (let r = 0; r <= rows; r++)
    for (let c = 0; c <= cols; c++) h[r * (cols + 1) + c] = fn(c, r);
  return { cols, rows, h };
};

test("cornerHeights: a single cell puts h/4 on each of its four corners", () => {
  const f = cornerHeights([4], (r, c) => (r === 0 && c === 0 ? 0 : -1), 1, 1);
  assert.equal(f.cols, 1);
  assert.equal(f.rows, 1);
  assert.equal(f.h.length, 4);
  for (const v of f.h) near(v, 1, 1e-12);   /* one touching cell, three at sea level */
});

test("sample: exact at corners, the corner mean at a cell centre, clamped outside", () => {
  const f: Field = { cols: 2, rows: 2, h: new Float64Array([1, 2, 3, 4, 5, 6, 7, 8, 9]) };
  near(sample(f, 0, 0), 1, 1e-12);
  near(sample(f, 2, 0), 3, 1e-12);
  near(sample(f, 1, 1), 5, 1e-12);
  near(sample(f, 2, 2), 9, 1e-12);
  near(sample(f, 0.5, 0.5), (1 + 2 + 4 + 5) / 4, 1e-12);
  near(sample(f, 1.5, 1.5), (5 + 6 + 8 + 9) / 4, 1e-12);
  near(sample(f, -3, -3), 1, 1e-12);        /* clamped to the field */
  near(sample(f, 99, 99), 9, 1e-12);
});

test("gradient: a planar ramp answers with the plane's slope everywhere", () => {
  const f = fieldFrom((x, y) => 2 * x + 3 * y + 1, 5, 4);
  for (const [x, y] of [[0.1, 0.1], [0.5, 0.5], [1.7, 2.3], [4.9, 3.9], [2.5, 2]]) {
    const [gx, gy] = gradient(f, x, y);
    near(gx, 2, 1e-12);
    near(gy, 3, 1e-12);
    near(sample(f, x, y), 2 * x + 3 * y + 1, 1e-12);   /* bilinear is exact on a plane */
  }
});

const bump = (x: number, y: number, cx: number, cy: number, A: number, s: number) =>
  A * Math.exp(-(((x - cx) ** 2 + (y - cy) ** 2)) / (2 * s * s));

test("rivers: a single peak descends strictly in h and stops at the flat", () => {
  const f = fieldFrom((x, y) => bump(x, y, 7.3, 5.2, 5, 1), 16, 12);
  const rivers = traceRivers(f, { minPeak: 0.5 });
  assert.equal(rivers.length, 1);
  const t = rivers[0];
  assert.ok(t.length > 5, "the river actually ran");
  for (let i = 1; i < t.length; i++)
    assert.ok(t[i][2] < t[i - 1][2], `strictly downhill at step ${i}`);
  const [ex, ey] = t[t.length - 1];
  assert.ok(ex >= 0 && ex <= 16 && ey >= 0 && ey <= 12, "ended inside the field");
  const [gx, gy] = gradient(f, ex, ey);
  assert.ok(Math.hypot(gx, gy) < 1e-3, "stopped because the ground flattened");
});

test("rivers: the second river joins the first, and every trace only falls", () => {
  /* two bumps on either side of a shallow valley along y = 6, the whole
     sheet tilted gently east — all water funnels into one channel */
  const f = fieldFrom(
    (x, y) => 0.05 * (16 - x) + 0.02 * (y - 6) ** 2
            + bump(x, y, 4.2, 3.2, 6, 1.2) + bump(x, y, 4.2, 8.8, 4.5, 1.2),
    16, 12);
  const rivers = traceRivers(f, { minPeak: 3 });
  assert.equal(rivers.length, 2);
  assert.ok(rivers[0][0][2] > rivers[1][0][2], "tallest peak traced first");
  for (const t of rivers)
    for (let i = 1; i < t.length; i++)
      assert.ok(t[i][2] <= t[i - 1][2] + 1e-9, "non-increasing within 1e-9");
  const [a, b] = rivers;
  assert.ok(b.length <= 80, "the joiner never outran its maxSteps");
  const end = b[b.length - 1];
  let dmin = Infinity;
  for (const p of a) dmin = Math.min(dmin, Math.hypot(p[0] - end[0], p[1] - end[1]));
  assert.ok(dmin <= 0.5, `second river ends within joinDist of the first (${dmin})`);
  assert.ok(b.length < a.length, "and stopped early to do it");
});

test("lambert: facing the lamp earns everything, grazing it only the ambient", () => {
  near(Math.hypot(...LIGHT), 1, 1e-12);            /* the lamp is unit, unlike the page's */
  near(lambert(LIGHT), AMBIENT + DIFFUSE, 1e-12);  /* = 1: full light */
  /* a normal perpendicular to the light sees only the sky */
  const p: V3 = [LIGHT[1], -LIGHT[0], 0];
  const m = Math.hypot(p[0], p[1], p[2]);
  near(lambert([p[0] / m, p[1] / m, p[2] / m]), AMBIENT, 1e-12);
  /* faceNormal: unit, z >= 0 whichever way the triangle winds, sane when flat */
  const up = faceNormal([0, 0, 0], [1, 0, 0], [0, 1, 0]);
  assert.deepEqual(up, [0, 0, 1]);
  const flipped = faceNormal([0, 0, 0], [0, 1, 0], [1, 0, 0]);
  assert.deepEqual(flipped, [0, 0, 1]);
  assert.deepEqual(faceNormal([0, 0, 0], [0, 0, 0], [0, 0, 0]), [0, 0, 1]);
  near(lambert(up), AMBIENT + DIFFUSE * LIGHT[2], 1e-12);
});

test("clipZ: keeps what stands above the line, crossing at exact interpolation", () => {
  const tri: V3[] = [[0, 0, 0], [2, 0, 2], [0, 2, 2]];
  assert.equal(clipZ(tri, -1).length, 3);      /* fully above: untouched */
  assert.equal(clipZ(tri, 5).length, 0);       /* fully below: gone */
  const cap = clipZ(tri, 1);                   /* one vertex under: a quad */
  assert.equal(cap.length, 4);
  assert.deepEqual(cap[0], [1, 0, 1]);         /* A→B crossing at k = 0.5 */
  assert.deepEqual(cap[1], [2, 0, 2]);
  assert.deepEqual(cap[2], [0, 2, 2]);
  assert.deepEqual(cap[3], [0, 1, 1]);         /* C→A crossing at k = 0.5 */
});

test("serrate: one tooth on a closed cut, deterministic and idempotent", () => {
  const cap = clipZ([[0, 0, 0], [2, 0, 2], [0, 2, 2]], 1);   /* ...,[0,1,1] then [1,0,1] closes on z=1 */
  const amp = 0.2;
  const out = serrate(cap, 1, amp);
  assert.equal(out.length, cap.length + 1);
  const tooth = out[out.length - 1];
  near(tooth[0], 0.5, 1e-12);                  /* the cut edge's midpoint */
  near(tooth[1], 0.5, 1e-12);
  assert.ok(tooth[2] < 1, "dipped below the line");
  assert.ok(tooth[2] >= 1 - 1.3 * amp && tooth[2] <= 1 - 0.7 * amp, "within the hash's band");
  assert.deepEqual(serrate(cap, 1, amp), out); /* same cut, same tooth */
  assert.deepEqual(serrate(out, 1, amp), out); /* the tooth ends the ring off-line: no double bite */
  const above: V3[] = [[0, 0, 2], [1, 0, 2], [0, 1, 2]];
  assert.deepEqual(serrate(above, 1, amp), above);   /* no cut, no tooth */
});

test("weekly: fifteen days chunk into 7 + 7 + 1", () => {
  const days = Array.from({ length: 15 }, (_, i) => i + 1);
  const w = weekly(days);
  assert.equal(w.length, 3);
  assert.deepEqual([...w], [28, 77, 15]);      /* 1..7, 8..14, 15 */
});

test("smoothed: a parabola's second derivative reads one mid-series", () => {
  const x = Float64Array.from({ length: 41 }, (_, i) => i * i / 2);
  const { d1, d2 } = smoothed(x);
  near(d1[20], 20, 1e-9);                      /* slope of t²/2 at t = 20 */
  near(d2[20], 1, 1e-9);                       /* curvature exactly recovered */
});

test("smoothed: the velocity holds to the last week", () => {
  /* a year that climbs steadily is still climbing in its last week: the
     order-1 estimate reflects through the endpoint, not about it */
  const x = Float64Array.from({ length: 53 }, (_, i) => 2 * i);
  const { d1, d2 } = smoothed(x);
  near(d1[52], 2, 1e-6);
  near(d1[0], 2, 1e-6);
  assert.ok(momentum(d1) > 0, "a climbing year has positive momentum");
  near(d2[26], 0, 1e-9);                       /* a ramp has no curvature */
  /* and a level year still reads flat at both ends */
  const level = smoothed(Float64Array.from({ length: 53 }, () => 4));
  near(level.d1[52], 0, 1e-9);
  near(level.d1[0], 0, 1e-9);
});

test("inflections: the turn of a sine, gated by pace", () => {
  const x = Float64Array.from({ length: 64 }, (_, i) => Math.sin((2 * Math.PI * i) / 32));
  const { d1, d2 } = smoothed(x);
  const turns = inflections(d1, d2, 0.05);
  assert.ok(turns.some(i => i >= 30 && i <= 34),
    `found the mid-series turn (got ${turns})`);
  assert.deepEqual(inflections(d1, d2, 1e9), []);   /* an impossible floor gates everything */
});

test("momentum: a rising pace scores positive, clipped to one; a flat year zero", () => {
  const rising = Float64Array.from({ length: 10 }, (_, i) => i);
  assert.equal(momentum(rising), 1);           /* 9 / sd(0..9) ≈ 3.1, clipped */
  const mild = new Float64Array([1, -1, 1, -1, 0.5]);
  near(momentum(mild), 0.5 / Math.sqrt(0.84), 1e-12);   /* an honest z-score when unclipped */
  assert.equal(momentum(new Float64Array([3, 3, 3, 3])), 0);
  assert.equal(momentum(new Float64Array(0)), 0);
});

test("weeklyEntropy: one tongue is clear, four equal tongues are two bits", () => {
  const h = weeklyEntropy([{ ts: 5 }, { ts: 1, py: 1, rs: 1, go: 1 }, {}]);
  near(h[0], 0, 1e-12);
  near(h[1], 2, 1e-12);
  near(h[2], 0, 1e-12);
});
