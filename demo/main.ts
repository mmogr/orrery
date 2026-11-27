/* The demo: four of the graph models, run live — proof that the package
   draws something. Each tab is one model with a line that says what you are
   looking at. Zero deps beyond the package itself; bundled from the same
   src/ the tests hold to account. */
import {
  rng,
  type Graph, normalisedLaplacian,
  spectralEmbedding, scaleToBox, type Embedding,
  diffuse,
  ollivierRicci,
  ricciFlowStep, cutCommunities,
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

/* ---------- the graph: three loose clusters, seeded ---------- */

/* three clusters of 12–18 nodes, a spanning tree plus stray links inside
   each, and a few bridges between them.
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
const emb = spectralEmbedding(graph, 7);   /* computed once */

/* place a centred embedding at (cx, cy) inside a w×h box */
function placed(e: Embedding, w: number, h: number, cx: number, cy: number): Embedding {
  const s = scaleToBox(e, w, h);
  return {
    x: Float64Array.from(s.x, v => v + cx),
    y: Float64Array.from(s.y, v => v + cy),
    z: s.z,
  };
}

const HALF = W / 2;

/* ---------- tab 1: the spectral embedding, turning ---------- */

/* three eigenvectors of the Laplacian and no iteration at all: x and y
   across, the third mode as depth. Turned slowly about the vertical, so the
   depth is seen as what it is, a third coordinate, and not a shading. */
const restBox = scaleToBox(emb, 520, 380);

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

function drawSpectral(now: number): void {
  const th = now / 4000, c = Math.cos(th), s = Math.sin(th);
  const x: number[] = [], y: number[] = [];
  for (let i = 0; i < graph.n; i++) {
    x.push(HALF + restBox.x[i] * c + restBox.z[i] * s);
    y.push(H / 2 - 14 + restBox.y[i]);
  }
  drawGraph(x, y, "rgba(90,140,255,0.18)", "rgba(210,224,255,0.95)");
  label("three eigenvectors: across, down, and depth", HALF, H - 18);
}

/* ---------- tab 2: heat on the graph ---------- */

/* the same graph, with the heat equation stepped on it every frame. A
   click puts a unit of warmth on the nearest node; diffuse() carries it
   along the links and the decay cools the whole field. */
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

/* ---------- tab 3: curvature — bridges and threads ---------- */

/* the same graph, every link coloured by its Ollivier–
   Ricci curvature: the transport cost between the lazy walks at its two
   ends, exact. warm is negative — a bottleneck, the neighbourhoods on
   either side barely overlap — and cool is positive, a link inside a
   weave. beside it, the textbook case: two 5-cliques over one bridge,
   the bridge at −3/5 and every clique edge at +5/8. computed once. */
const kappa = ollivierRicci(graph);
const twoCliques: Graph = (() => {
  const edges: Array<[number, number]> = [];
  for (let c = 0; c < 2; c++)
    for (let a = 0; a < 5; a++) for (let b = a + 1; b < 5; b++) edges.push([5 * c + a, 5 * c + b]);
  edges.push([4, 5]);
  return { n: 10, edges };
})();
const twoKappa = ollivierRicci(twoCliques);
let curvatureDrawn = false;

function curvatureColour(k: number): string {
  /* −1 is warm, +1 cool, 0 the quiet grey between */
  const t = Math.max(-1, Math.min(1, k));
  return t < 0
    ? `rgba(${255},${Math.round(150 + 60 * (1 + t))},${Math.round(90 + 90 * (1 + t))},0.85)`
    : `rgba(${Math.round(180 - 90 * t)},${Math.round(180 + 40 * t)},255,${0.55 + 0.35 * t})`;
}

function drawCurved(x: ArrayLike<number>, y: ArrayLike<number>, g: Graph, k: Float64Array): void {
  g.edges.forEach(([a, b], e) => {
    ctx.strokeStyle = curvatureColour(k[e]);
    ctx.lineWidth = 0.6 + 1.6 * Math.max(0, Math.min(1, (k[e] + 1) / 2));
    ctx.beginPath();
    ctx.moveTo(x[a], y[a]);
    ctx.lineTo(x[b], y[b]);
    ctx.stroke();
  });
  ctx.fillStyle = "rgba(210,224,255,0.95)";
  for (let i = 0; i < g.n; i++) {
    ctx.beginPath();
    ctx.arc(x[i], y[i], 2.4, 0, 6.2832);
    ctx.fill();
  }
}

function drawCurvature(): void {
  ctx.strokeStyle = "rgba(122,134,173,0.18)";
  ctx.beginPath();
  ctx.moveTo(HALF * 1.3, 24);
  ctx.lineTo(HALF * 1.3, H - 24);
  ctx.stroke();

  const left = placed(emb, 480, 380, HALF * 0.65, H / 2 - 14);
  drawCurved(left.x, left.y, graph, kappa);

  /* the two cliques on their own rest state, small, to the right */
  const right = placed(spectralEmbedding(twoCliques, 3), 240, 150, HALF * 1.65, H / 2 - 40);
  drawCurved(right.x, right.y, twoCliques, twoKappa);

  let lo = Infinity, hi = -Infinity;
  for (const v of kappa) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  label(`curvature, from ${lo.toFixed(2)} (warm, a bridge) to ${hi.toFixed(2)} (cool, a weave)`, HALF * 0.65, H - 18);
  label(`two 5-cliques: bridge ${twoKappa[twoKappa.length - 1].toFixed(2)}, inside ${twoKappa[0].toFixed(3)}`, HALF * 1.65, H - 18);
}

/* ---------- tab 4: Ricci flow — the graph parts into its communities ---------- */

/* the same graph under the flow: every link's length follows its curvature,
   a bridge stretching and a weave tightening, twelve steps computed once
   and played through. A link is drawn as firm as it is short and wears the
   curvature that drove the step; past the cut that modularity chose it
   fades; the nodes wear the community the final lengths put them in. */
const FLOW_STEPS = 12, FLOW_TICK = 600;
const flowLengths: Float64Array[] = [new Float64Array(graph.edges.length).fill(1)];
const flowKappa: Float64Array[] = [];
for (let s = 0; s < FLOW_STEPS; s++) {
  const len = Float64Array.from(flowLengths[s]);
  flowKappa.push(ricciFlowStep(graph, len));
  flowLengths.push(len);
}
flowKappa.push(flowKappa[FLOW_STEPS - 1]);
const flowCut = cutCommunities(graph, flowLengths[FLOW_STEPS]);
const COMMUNITY = ["rgba(255,200,55,0.95)", "rgba(120,200,255,0.95)", "rgba(190,150,255,0.95)",
                   "rgba(140,230,170,0.95)", "rgba(255,140,120,0.95)"];
let flowStart = -1;

function drawFlow(now: number): void {
  if (flowStart < 0) flowStart = now;
  const phase = (now - flowStart) / FLOW_TICK;
  if (phase > FLOW_STEPS + 4) { flowStart = now; return; }
  const at = Math.min(FLOW_STEPS, phase);
  const lo = Math.floor(at), hi = Math.min(FLOW_STEPS, lo + 1), f = at - lo;
  graph.edges.forEach(([a, b], e) => {
    const len = flowLengths[lo][e] + (flowLengths[hi][e] - flowLengths[lo][e]) * f;
    ctx.strokeStyle = curvatureColour(flowKappa[lo][e]);
    ctx.globalAlpha = len > flowCut.cut ? 0.15 : 1;
    ctx.lineWidth = Math.max(0.4, Math.min(3, 1.4 / len));
    ctx.beginPath();
    ctx.moveTo(restFull.x[a], restFull.y[a]);
    ctx.lineTo(restFull.x[b], restFull.y[b]);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
  for (let i = 0; i < graph.n; i++) {
    ctx.fillStyle = COMMUNITY[flowCut.label[i] % COMMUNITY.length];
    ctx.beginPath();
    ctx.arc(restFull.x[i], restFull.y[i], 2.6, 0, 6.2832);
    ctx.fill();
  }
  label(`step ${lo} of ${FLOW_STEPS} — ${flowCut.count} communities at the cut modularity chose ` +
        `(ℓ ≤ ${flowCut.cut.toFixed(2)}, Q = ${flowCut.q.toFixed(2)}); links past it fade`, HALF, H - 18);
}

/* ---------- the tabs ---------- */

const CAPTIONS = [
  "a graph placed by its own spectrum: three eigenvectors of the normalised Laplacian, no " +
  "iteration, no forces. what is linked together sits together, and the third mode is depth, " +
  "seen here by turning the shape.",

  "the heat equation on the graph, stepped live each frame — click a node and watch " +
  "warmth diffuse along its links and cool away.",

  "every link coloured by its Ollivier–Ricci curvature — one minus the exact transport " +
  "cost between the lazy random walks at its two ends. warm and thin is a bottleneck, " +
  "cool and firm a link inside a weave; the bridge between two 5-cliques sits at −3/5 " +
  "by closed form, and the picture agrees.",

  "discrete Ricci flow: ℓ ← ℓ(1 − εκ), rescaled to mean one, twelve steps, so a bridge (warm) " +
  "lengthens and a weave (cool) shortens until the communities stand apart. the cut is not a " +
  "number someone picked: of every distinct length above the mean, the one whose components " +
  "score the highest modularity, and the nodes wear the community it gives them.",
];

let tab = 0;
const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("#tabs button"));

function setTab(t: number): void {
  tab = t;
  buttons.forEach((b, i) => b.classList.toggle("on", i === t));
  capEl.textContent = CAPTIONS[t];
  if (t === 2) curvatureDrawn = false;   /* the static tab redraws once */
  if (t === 3) flowStart = -1;           /* the flow starts over on every visit */
}
buttons.forEach((b, i) => b.addEventListener("click", () => setTab(i)));
setTab(0);

function frame(now: number): void {
  if (tab === 2) {
    if (!curvatureDrawn) {
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, H);
      drawCurvature();
      curvatureDrawn = true;
    }
  } else {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    if (tab === 0) drawSpectral(now);
    else if (tab === 1) drawHeat();
    else drawFlow(now);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
