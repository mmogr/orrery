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

export declare const DEFAULT_FORCES: Forces;

export interface LayoutEnv {
  K: number;                                       /* the natural length scale */
  window: { x: number; y: number; hw: number; hh: number };
  clearing: number;
  floorY: number;
}

import type { Embedding } from "./spectral.ts";

/* one step; returns the mean distance of bodies outside the window, the
   old sim's temperature signal */
export function stepLayout(
  bodies: Body[],
  edges: ReadonlyArray<readonly [number, number]>,
  rest: Embedding,
  env: LayoutEnv,
  heat: number,
  f?: Forces,
): { outsideMean: number } {
  throw new Error("todo: stepLayout");
}

/* apply an impulse per body (yank, stir): fn returns [dvx, dvy] */
export function impulse(bodies: Body[], fn: (b: Body) => readonly [number, number]): void {
  throw new Error("todo: impulse");
}
