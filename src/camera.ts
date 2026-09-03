/* The camera as the oscillator it always was. The page's per-frame eases
   (x += (goal - x) * k each 60Hz frame) are exponential approaches with
   time constants τ = -16.7ms / ln(1 - k); the sway spring is a damped
   harmonic oscillator with its ζ and ω fitted from the old constants.
   Framerate-independent: integrate with dt, substepped. docs/camera.md. */

export interface Damped { x: number; v: number }

/* semi-implicit Euler on x'' = -ω²(x - target) - 2ζω x', substeps ≤ 1/120s */
export function stepDamped(s: Damped, target: number, zeta: number, omega: number, dt: number): void {
  throw new Error("todo: stepDamped");
}

/* exact exponential approach toward target with time constant tau (ms) */
export function follow(x: number, target: number, tau: number, dt: number): number {
  throw new Error("todo: follow");
}

export interface CameraConstants {
  followTau: number;   /* the drawn camera trailing the target */
  zoomTau: number;     /* zoom follows tighter */
  homingTau: number;   /* gliding to a called position */
  flingTau: number;    /* a flick's decay */
  sway: { zeta: number; omega: number };
}

/* fitted from the page's old per-frame constants (0.22, 0.45, 0.18, 0.94,
   and the 0.04/0.88 sway pair) at 60Hz — derivation in docs/camera.md */
export declare const CAMERA: CameraConstants;

export interface Cam { x: number; y: number; z: number }
export interface Box { minX: number; maxX: number; minY: number; maxY: number }

/* the fence: where the camera may rest, from the layout's bounding box —
   the page's camBox, verbatim in behaviour */
export function fence(
  cam: Cam,
  bbox: { x0: number; x1: number; y0: number; y1: number },
  W: number, H: number,
): Box {
  throw new Error("todo: fence");
}
