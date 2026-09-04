/* The living layer over the rest state: velocity-Verlet springs. Every
   force is named, every constant is either fitted to the recorded behaviour
   of the page's old simulation or listed in docs/springs.md as aesthetic.
   restPull is the new term: it remembers the spectral embedding, so the sky
   deforms under a hand and comes home to its shape. */

export interface Body {
  x: number; y: number;
  px: number; py: number;    /* previous position (Verlet) */
  deg: number;               /* incident springs: hubs sway less */
  temper: number;            /* how readily this star is thrown (old jf) */
  c1: number; s1: number;    /* its private throw angle (old c1/s1) */
}

export interface Forces {
  repulsion: number;
  spring: number;
  restPull: number;
  windowGravity: number;
  ellipse: readonly [number, number];
  clearing: number;
  floor: number;
  damping: number;
  vcap: readonly [number, number];   /* base cap, and the extra a hot sim earns */
}

/* the old sim's numbers, verbatim, save one: restPull is NEW — a gentle
   spring toward the spectral rest position, absent from the page's original
   step(). Small on purpose: the embedding suggests, the springs decide. */
export const DEFAULT_FORCES: Forces = {
  repulsion: 0.05,           /* K²/d² kick, cut off past 3K */
  spring: 0.01,              /* toward a rest length of 0.8K */
  restPull: 0.002,           /* NEW: homesickness for the embedding */
  windowGravity: 0.015,      /* the screen-sized window hauls strays home */
  ellipse: [0.0005, 0.0013], /* wide sky, held vertically */
  clearing: 0.55,            /* the push off the hero type */
  floor: 0.02,               /* the sky stays above the terrain */
  damping: 0.82,
  vcap: [2.5, 4],            /* a hot sim lets go of the reins a little */
};

export interface LayoutEnv {
  K: number;                                       /* the natural length scale */
  /* per-link multipliers of the 0.8K rest length, indexed like edges —
     the Ricci flow's lengths; absent, every link rests at 0.8K */
  lengths?: ArrayLike<number>;
  window: { x: number; y: number; hw: number; hh: number };
  clearing: number;
  floorY: number;
}

import type { Embedding } from "./spectral.ts";

/* one step; returns the mean distance of bodies outside the window, the
   old sim's temperature signal.

   Verlet keeps no velocity: it lives implicitly in v = (x − px). Each step
   gathers every force as an acceleration, then integrates the old sim's way
   exactly — v ← cap(damping · (v + a)), x ← x + v — which is velocity Verlet
   with the damping folded in, so the constants above mean what they always
   meant. The speed cap loosens with this step's own outside-mean, the same
   displacement-runs-hot feedback the camera used to close. */
export function stepLayout(
  bodies: Body[],
  edges: ReadonlyArray<readonly [number, number]>,
  rest: Embedding,
  env: LayoutEnv,
  heat: number,
  f?: Forces,
): { outsideMean: number } {
  const F = f ?? DEFAULT_FORCES;
  const n = bodies.length;
  const K = env.K;
  const ax = new Float64Array(n), ay = new Float64Array(n);

  /* repulsion: every pair, K²/d² with the old guard against coincident
     stars and the 3K cutoff that keeps far pairs strangers */
  for (let i = 0; i < n; i++) {
    const a = bodies[i];
    for (let j = i + 1; j < n; j++) {
      const b = bodies[j];
      let dx = a.x - b.x, dy = a.y - b.y;
      let d2 = dx * dx + dy * dy;
      if (d2 < 1) { dx = 0.5; dy = 0.5; d2 = 0.5; }
      if (d2 > K * K * 9) continue;
      const fr = (K * K) / d2 * F.repulsion * heat;
      const d = Math.sqrt(d2);
      ax[i] += dx / d * fr; ay[i] += dy / d * fr;
      ax[j] -= dx / d * fr; ay[j] -= dy / d * fr;
    }
  }

  /* springs: linear toward 0.8K, softened where a leaf meets a hub so the
     well-connected are not yanked about by every stray edge */
  const lengths = env.lengths;
  for (let e = 0; e < edges.length; e++) {
    const [i, j] = edges[e];
    const a = bodies[i], b = bodies[j];
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy) + 0.01;
    const norm = Math.sqrt(1 + Math.min(a.deg, b.deg) / 3);
    const fs = (d - K * 0.8 * (lengths ? lengths[e] : 1)) / d * F.spring * heat / norm;
    ax[i] += dx * fs; ay[i] += dy * fs;
    ax[j] -= dx * fs; ay[j] -= dy * fs;
  }

  let outSum = 0;
  for (let i = 0; i < n; i++) {
    const b = bodies[i];

    /* restPull (NEW): a spring toward the spectral rest position */
    ax[i] += (rest.x[i] - b.x) * F.restPull * heat;
    ay[i] += (rest.y[i] - b.y) * F.restPull * heat;

    /* window gravity: what drifts past the screen-sized window is pulled
       home; the distance outside is also the temperature signal */
    const bx = Math.max(env.window.x - env.window.hw, Math.min(env.window.x + env.window.hw, b.x));
    const by = Math.max(env.window.y - env.window.hh, Math.min(env.window.y + env.window.hh, b.y));
    ax[i] -= (b.x - bx) * F.windowGravity * heat;
    ay[i] -= (b.y - by) * F.windowGravity * heat;
    outSum += Math.hypot(b.x - bx, b.y - by);

    /* elliptical gravity: let the sky spread wide, hold it vertically */
    ax[i] -= b.x * F.ellipse[0] * heat;
    ay[i] -= b.y * F.ellipse[1] * heat;

    /* the clearing: an ellipse (x compressed by 2.2) around the hero type,
       pressed a touch harder to keep stars off the words */
    const ex = b.x / 2.2;
    const hd = Math.hypot(ex, b.y) + 0.01;
    if (hd < env.clearing) {
      const push = (env.clearing - hd) / env.clearing * F.clearing * heat;
      ax[i] += (ex / 2.2) / hd * push;
      ay[i] += b.y / hd * push;
    }

    /* soft floor: the sky stays above the terrain */
    if (b.y > env.floorY) ay[i] -= (b.y - env.floorY) * F.floor * heat;
  }

  const outsideMean = n ? outSum / n : 0;
  const temp = Math.min(0.5, outsideMean * 0.004);
  const vcap = F.vcap[0] + temp * F.vcap[1];

  for (let i = 0; i < n; i++) {
    const b = bodies[i];
    let vx = (b.x - b.px + ax[i]) * F.damping;
    let vy = (b.y - b.py + ay[i]) * F.damping;
    const sp = Math.hypot(vx, vy);
    if (sp > vcap) { vx *= vcap / sp; vy *= vcap / sp; }
    b.px = b.x; b.py = b.y;
    b.x += vx; b.y += vy;
  }
  return { outsideMean };
}

/* apply an impulse per body (yank, stir): fn returns [dvx, dvy].
   Velocity is implicit, v = x − px, so a kick is a step of the previous
   position the other way. */
export function impulse(bodies: Body[], fn: (b: Body) => readonly [number, number]): void {
  for (const b of bodies) {
    const [dvx, dvy] = fn(b);
    b.px -= dvx;
    b.py -= dvy;
  }
}
