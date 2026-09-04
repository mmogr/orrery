/* The demo: four models from the package, each run in this page as you
   watch. Nothing here is a recording — the eigenvectors, the springs, the
   heat, Kepler's equation and the rivers are all computed by the same code
   the tests hold to account, importing straight from src/. */
import {
  rng,
  type Graph, normalisedLaplacian,
  spectralEmbedding, scaleToBox, type Embedding,
  type Body, stepLayout, type LayoutEnv,
  diffuse,
  elementsFrom, orbitFrac, arcPos, type Elements,
  cornerHeights, type Field, traceRivers,
  faceNormal, lambert, type V3,
} from "../src/index.ts";

/* ---------- the stage: one canvas, DPR-aware ---------- */

const W = 960, H = 560;
const canvas = document.getElementById("stage") as HTMLCanvasElement;
const dpr = Math.min(2, window.devicePixelRatio || 1);
canvas.width = W * dpr;
canvas.height = H * dpr;
const ctx = canvas.getContext("2d")!;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

const BG = "#00000f";
const capEl = document.getElementById("caption")!;

/* ---------- the synthetic sky: a notes-like graph, seeded ---------- */

/* three clusters of 12–18 stars, a spanning tree plus stray links inside
   each, and a few bridges between them — the shape of a term's notes.
   Every roll comes from the package's own LCG, so the graph is the same
   graph on every load. */
function makeGraph(seed: number): Graph {
  const rnd = rng(seed);
  const sizes = [0, 0, 0].map(() => 12 + Math.floor(rnd() * 7));
  const clusters: number[][] = [];
  const seen = new Set<string>();
  const edges: Array<[number, number]> = [];
  const link = (a: number, b: number): void => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (a !== b && !seen.has(key)) { seen.add(key); edges.push([a, b]); }
  };
  let n = 0;
  for (const size of sizes) {
    const ids = Array.from({ length: size }, (_, i) => n + i);
    clusters.push(ids);
    for (let i = 1; i < size; i++) link(ids[i], ids[Math.floor(rnd() * i)]);
    for (let e = 0; e < Math.floor(size * 0.8); e++)
      link(ids[Math.floor(rnd() * size)], ids[Math.floor(rnd() * size)]);
    n += size;
  }
  for (const [ca, cb] of [[0, 1], [1, 2], [2, 0], [0, 1]])
    link(clusters[ca][Math.floor(rnd() * clusters[ca].length)],
         clusters[cb][Math.floor(rnd() * clusters[cb].length)]);
  return { n, edges };
}

const graph = makeGraph(7);
const emb = spectralEmbedding(graph, 7);   /* the rest state, computed once */

const degree = new Float64Array(graph.n);
for (const [a, b] of graph.edges) { degree[a]++; degree[b]++; }

/* place a centred embedding at (cx, cy) inside a w×h box */
function placed(e: Embedding, w: number, h: number, cx: number, cy: number): Embedding {
  const s = scaleToBox(e, w, h);
  return {
    x: Float64Array.from(s.x, v => v + cx),
    y: Float64Array.from(s.y, v => v + cy),
    z: s.z,
  };
}

/* ---------- tab 1: spectral sky — rest state vs springs finding it ---------- */

/* left half: the eigenvector positions, no iteration at all. right half:
   the same graph dropped at random and integrated live by stepLayout —
   the springs run in the frame's local coordinates (origin at the half's
   centre) because the window, ellipse and rest forces all speak about the
   origin. */
const HALF = W / 2;
const restLeft = placed(emb, 330, 380, HALF / 2, H / 2 - 14);
const restLocal = scaleToBox(emb, 330, 380);        /* right half, about (0,0) */
const springEnv: LayoutEnv = {
  K: 40,
  window: { x: 0, y: -14, hw: 200, hh: 215 },
  clearing: 0,               /* no hero type to clear on this page */
  floorY: 250,               /* no terrain either, just the frame's edge */
};
let bodies: Body[] = [];

function scatterBodies(): void {
  const rnd = rng(21);
  bodies = Array.from({ length: graph.n }, (_, i) => {
    const x = (rnd() - 0.5) * 380, y = (rnd() - 0.5) * 380;
    return { x, y, px: x, py: y, deg: degree[i],
             temper: rnd(), c1: Math.cos(rnd() * 6.28), s1: Math.sin(rnd() * 6.28) };
  });
}

function drawGraph(x: Float64Array | number[], y: Float64Array | number[],
                   edgeStyle: string, nodeStyle: string): void {
  ctx.strokeStyle = edgeStyle;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const [a, b] of graph.edges) {
    ctx.moveTo(x[a], y[a]);
    ctx.lineTo(x[b], y[b]);
  }
  ctx.stroke();
  ctx.fillStyle = nodeStyle;
  for (let i = 0; i < graph.n; i++) {
    ctx.beginPath();
    ctx.arc(x[i], y[i], 2.4, 0, 6.2832);
    ctx.fill();
  }
}

function label(text: string, x: number, y: number): void {
  ctx.fillStyle = "#7a86ad";
  ctx.font = "10px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillText(text.toUpperCase(), x, y);
  ctx.textAlign = "left";
}

function drawSpectral(): void {
  /* one Verlet step per frame at a calm heat: the shape assembles in
     front of you and then breathes in place */
  stepLayout(bodies, graph.edges, restLocal, springEnv, 0.15);

  ctx.strokeStyle = "rgba(122,134,173,0.18)";
  ctx.beginPath();
  ctx.moveTo(HALF, 24);
  ctx.lineTo(HALF, H - 24);
  ctx.stroke();

  drawGraph(restLeft.x, restLeft.y, "rgba(90,140,255,0.18)", "rgba(210,224,255,0.95)");
  const lx: number[] = [], ly: number[] = [];
  for (let i = 0; i < graph.n; i++) {
    lx.push(bodies[i].x + HALF * 1.5);
    ly.push(bodies[i].y + H / 2 - 14);
  }
  drawGraph(lx, ly, "rgba(90,140,255,0.18)", "rgba(210,224,255,0.95)");

  label("rest state — eigenvectors", HALF / 2, H - 18);
  label("springs, live", HALF * 1.5, H - 18);
}

/* ---------- tab 2: heat on the graph ---------- */

/* the same sky at rest, with the heat equation stepped on it every frame.
   A click puts a unit of warmth on the nearest star; diffuse() carries it
   along the links and the decay cools the whole field, so attention
   spreads and fades the way it does on the page. */
const restFull = placed(emb, 840, 440, W / 2, H / 2 - 14);
const L = normalisedLaplacian(graph);
const u = new Float64Array(graph.n);

canvas.addEventListener("click", ev => {
  if (tab !== 1) return;
  const r = canvas.getBoundingClientRect();
  const mx = (ev.clientX - r.left) * (W / r.width);
  const my = (ev.clientY - r.top) * (H / r.height);
  let best = -1, bd = 26 * 26;
  for (let i = 0; i < graph.n; i++) {
    const d = (restFull.x[i] - mx) ** 2 + (restFull.y[i] - my) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  if (best >= 0) u[best] = 1;
});

function drawHeat(): void {
  diffuse(u, L, 0.4, 2, 0.985);

  ctx.lineWidth = 1;
  for (const [a, b] of graph.edges) {
    ctx.strokeStyle = "rgba(90,140,255,0.14)";
    ctx.beginPath();
    ctx.moveTo(restFull.x[a], restFull.y[a]);
    ctx.lineTo(restFull.x[b], restFull.y[b]);
    ctx.stroke();
    const warm = Math.min(u[a], u[b]);
    if (warm > 0.004) {
      ctx.strokeStyle = `rgba(255,200,55,${Math.min(1, warm)})`;
      ctx.beginPath();
      ctx.moveTo(restFull.x[a], restFull.y[a]);
      ctx.lineTo(restFull.x[b], restFull.y[b]);
      ctx.stroke();
    }
  }
  for (let i = 0; i < graph.n; i++) {
    const w = Math.min(1, u[i]);
    ctx.fillStyle = `rgb(${(150 + 105 * w) | 0},${(170 + 30 * w) | 0},${(220 - 165 * w) | 0})`;
    ctx.beginPath();
    ctx.arc(restFull.x[i], restFull.y[i], 2.4 + 2.6 * w, 0, 6.2832);
    ctx.fill();
  }
}

/* ---------- tab 3: Kepler's sky ---------- */

/* eight synthetic planets: activity sets the semi-major axis, the axis
   sets the period by the third law, and position comes from solving
   Kepler's equation each frame. One planet carries the full language-space
   distance, so its e = 0.2 is the eccentricity cap made visible. Time runs
   at ~2000×, and each planet drops a bead on its trail every two simulated
   minutes — where the beads bunch, the planet is genuinely slow. */
const TIMESCALE = 2000;
const TRAIL_EVERY = 2 * 60000;         /* sim ms between beads */
const TRAIL_KEEP = 110 * 60000;        /* beads older than ~2 sim hours fade out */

interface Planet {
  el: Elements;
  alt: number;                          /* the affine altitude rule from kepler.ts */
  r: number;
  gold: boolean;                        /* the e = 0.2 planet wears the house gold */
  trail: Array<{ x: number; y: number; t: number }>;
  lastBead: number;
}

const planets: Planet[] = (() => {
  const rnd = rng(11);
  const acts = [0.95, 0.85, 0.7, 0.55, 0.45, 0.3, 0.15, 0.05];
  return acts.map((act, i) => {
    const eccentric = i === 2;
    const el = elementsFrom(act, eccentric ? 1 : rnd() * 0.25,
                            rnd() * 2 - 1, rnd());
    /* alt = 0.16 + 0.14·(a − aMin)/(aMax − aMin): the old altitude rule,
       affine in a exactly as the module's header promises */
    const alt = 0.16 + 0.24 * (el.a - 0.261629) / (1 - 0.261629);
    return { el, alt, r: 1.8 + 3.4 * act, gold: eccentric, trail: [], lastBead: -Infinity };
  });
})();

const t0 = performance.now();

function drawKepler(now: number): void {
  const sim = (now - t0) * TIMESCALE;
  const horizon = H * 0.72;

  ctx.strokeStyle = "rgba(122,134,173,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(24, horizon);
  ctx.lineTo(W - 24, horizon);
  ctx.stroke();
  label("horizon", W - 60, horizon + 14);

  ctx.font = "10px 'IBM Plex Mono', ui-monospace, monospace";
  for (const p of planets) {
    const f = orbitFrac(p.el, sim);
    const pos = arcPos(f, p.alt, p.el.tilt, W, H);

    if (pos.up > 0 && sim - p.lastBead >= TRAIL_EVERY) {
      p.trail.push({ x: pos.x, y: pos.y, t: sim });
      p.lastBead = sim;
    }
    while (p.trail.length && sim - p.trail[0].t > TRAIL_KEEP) p.trail.shift();

    const [cr, cg, cb] = p.gold ? [255, 200, 55] : [170, 195, 255];
    for (const bead of p.trail) {
      const age = 1 - (sim - bead.t) / TRAIL_KEEP;
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${(0.38 * age).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(bead.x, bead.y, 1.1, 0, 6.2832);
      ctx.fill();
    }

    if (pos.up > 0) {
      ctx.fillStyle = p.gold ? "#ffc837" : "#e8ecff";
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, p.r, 0, 6.2832);
      ctx.fill();
      ctx.fillStyle = p.gold ? "rgba(255,200,55,0.8)" : "#7a86ad";
      const hrs = (p.el.T / 3600000).toFixed(1);
      ctx.fillText(`${hrs}h${p.gold ? "  e=0.2" : ""}`, pos.x + p.r + 5, pos.y - 5);
    }
  }
}

/* ---------- tab 4: terrain — rain leaving the year ---------- */

/* the real terrain.json: a year of contribution days. Cell heights take
   the page's 0.75 power curve, corners share them into a bilinear field,
   and the field is drawn in the page's own oblique projection — x across,
   y foreshortened by sin 0.42, z up by cos 0.42 — each quad shaded by its
   face normal under the named lamp. Then the rivers: steepest descent
   from every summit, draped back on the relief at their own height. */
const PITCH = 0.42;
const SP = Math.sin(PITCH), CP = Math.cos(PITCH);
const ZCELL = 7.5;                     /* peak height in cell units, the site's maxH/base */

interface TerrainScene {
  cols: number;
  field: Field;
  rivers: Array<Array<[number, number, number]>>;
  frontRow: Array<{ c: number; i: number }>;
  cellRC: Array<[number, number]>;     /* row, col per day cell */
  cellH: Float64Array;
}
let terra: TerrainScene | null = null;
let terraDrawn = false;

async function loadTerrain(): Promise<void> {
  const days: Array<{ date: string; count: number }> =
    await (await fetch("./data/terrain.json")).json();
  /* the calendar walk: a new column each Sunday, row = day of week */
  let col = -1;
  let prev: number | null = null;
  const cellRC: Array<[number, number]> = [];
  for (const d of days) {
    const dow = new Date(d.date + "T00:00:00").getDay();
    if (dow === 0 || prev === null) col++;
    prev = dow;
    cellRC.push([dow, col]);
  }
  const cols = col + 1;
  const maxc = Math.max(1, ...days.map(d => d.count));
  const cellH = Float64Array.from(days, d => Math.pow(d.count / maxc, 0.75));
  const grid = new Int32Array(7 * cols).fill(-1);
  cellRC.forEach(([r, c], i) => { grid[r * cols + c] = i; });
  const field = cornerHeights(cellH, (r, c) => grid[r * cols + c], cols);
  const rivers = traceRivers(field, { minPeak: 0.12 });
  const frontRow = cellRC.flatMap(([r, c], i) => (r === 6 ? [{ c, i }] : []));
  terra = { cols, field, rivers, frontRow, cellRC, cellH };
  terraDrawn = false;
}
loadTerrain();

function drawTerrain(): void {
  if (!terra) {
    label("fetching the year…", W / 2, H / 2);
    return;
  }
  const { cols, field, rivers, cellRC } = terra;
  const base = Math.min((W * 0.94) / (cols + 2), (H * 0.4) / 10);
  const ox = W / 2, oy = H - 84;
  const p3 = (x: number, y: number, z: number): [number, number] =>
    [ox + (x - cols / 2) * base, oy + (y - 3.5) * base * SP - z * base * CP];

  const cw = cols + 1;
  const corner = (r: number, c: number): number => field.h[r * cw + c];

  interface Face { depth: number; pts: Array<[number, number]>; fill: string; }
  const faces: Face[] = [];
  const ramp = (h: number, f: number): string => {
    const k = Math.pow(Math.min(1, h), 0.8);
    const R = 24 + 106 * k, G = 34 + 116 * k, B = 60 + 130 * k;
    return `rgb(${(R * f) | 0},${(G * f) | 0},${(B * f) | 0})`;
  };

  for (let i = 0; i < cellRC.length; i++) {
    const [r, c] = cellRC[i];
    const h00 = corner(r, c), h10 = corner(r, c + 1),
          h01 = corner(r + 1, c), h11 = corner(r + 1, c + 1);
    const hMean = (h00 + h10 + h01 + h11) / 4;
    /* one normal for the quad: the two triangle normals of the bilinear
       patch, averaged — z in cell units so the slopes are as steep to the
       lamp as they are to the eye */
    const w00: V3 = [c, r, h00 * ZCELL], w10: V3 = [c + 1, r, h10 * ZCELL],
          w01: V3 = [c, r + 1, h01 * ZCELL], w11: V3 = [c + 1, r + 1, h11 * ZCELL];
    const n1 = faceNormal(w00, w10, w11), n2 = faceNormal(w00, w11, w01);
    const nm = Math.hypot(n1[0] + n2[0], n1[1] + n2[1], n1[2] + n2[2]) || 1;
    const n: V3 = [(n1[0] + n2[0]) / nm, (n1[1] + n2[1]) / nm, (n1[2] + n2[2]) / nm];
    const f = lambert(n);
    faces.push({
      depth: r + 0.5,
      pts: [p3(c, r, h00 * ZCELL), p3(c + 1, r, h10 * ZCELL),
            p3(c + 1, r + 1, h11 * ZCELL), p3(c, r + 1, h01 * ZCELL)],
      fill: ramp(hMean, f),
    });
    /* the front row shows its cut face down to the sea, so the range
       stands on the ground instead of floating */
    if (r === 6 && Math.max(h01, h11) > 0.002) {
      faces.push({
        depth: r + 1.01,
        pts: [p3(c, r + 1, h01 * ZCELL), p3(c + 1, r + 1, h11 * ZCELL),
              p3(c + 1, r + 1, 0), p3(c, r + 1, 0)],
        fill: ramp(hMean, 0.34),
      });
    }
  }

  faces.sort((a, b) => a.depth - b.depth);
  for (const face of faces) {
    ctx.fillStyle = face.fill;
    ctx.beginPath();
    ctx.moveTo(face.pts[0][0], face.pts[0][1]);
    for (let k = 1; k < face.pts.length; k++) ctx.lineTo(face.pts[k][0], face.pts[k][1]);
    ctx.closePath();
    ctx.fill();
  }

  /* the rivers, draped: every point already carries its height, so the
     polyline lies on the relief it was traced over */
  ctx.strokeStyle = "rgba(160,205,255,0.6)";
  ctx.lineWidth = 1;
  ctx.lineJoin = "round";
  for (const river of rivers) {
    if (river.length < 3) continue;
    ctx.beginPath();
    river.forEach(([x, y, h], k) => {
      const [px, py] = p3(x, y, h * ZCELL);
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }
}

/* ---------- the tabs ---------- */

const CAPTIONS = [
  "the same graph twice, live: left, its spectral rest state — two eigenvectors of the " +
  "Laplacian, no iteration; right, springs integrated every frame, homing on that shape. " +
  "what the spectrum buys is the destination.",

  "the heat equation on the graph, stepped live each frame — click a star and watch " +
  "warmth diffuse along its links and cool away.",

  "T² ∝ a³: eight planets, periods set by activity through the third law, positions by " +
  "solving Kepler's equation every frame at ~2000× time. the gold one lingers where its " +
  "beads bunch — real eccentricity (e = 0.2), not easing.",

  "a year of commits as a bilinear heightfield under the named lamp, rivers traced by " +
  "steepest descent from every summit — rain leaving the year. computed from the data " +
  "at load, not drawn by hand.",
];

let tab = 0;
const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("#tabs button"));

function setTab(t: number): void {
  tab = t;
  buttons.forEach((b, i) => b.classList.toggle("on", i === t));
  capEl.textContent = CAPTIONS[t];
  if (t === 0) scatterBodies();     /* watch the springs find home again */
  if (t === 3) terraDrawn = false;  /* the one static tab redraws once */
}
buttons.forEach((b, i) => b.addEventListener("click", () => setTab(i)));
setTab(0);

function frame(now: number): void {
  if (tab === 3) {
    /* static: render once per visit (and once more when the fetch lands) */
    if (!terraDrawn) {
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, H);
      drawTerrain();
      terraDrawn = terra !== null;
    }
  } else {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    if (tab === 0) drawSpectral();
    else if (tab === 1) drawHeat();
    else drawKepler(now);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
