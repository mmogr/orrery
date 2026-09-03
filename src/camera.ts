/* The camera as the oscillator it always was. The page's per-frame eases
   (x += (goal - x) * k each 60Hz frame) are exponential approaches with
   time constants τ = -16.7ms / ln(1 - k); the sway spring is a damped
   harmonic oscillator with its ζ and ω fitted from the old constants.
   Framerate-independent: integrate with dt, substepped. docs/camera.md. */

export interface Damped { x: number; v: number }

/* semi-implicit Euler on x'' = -ω²(x - target) - 2ζω x', substeps ≤ 1/120s.
   dt is in milliseconds, ω in rad/s; velocity is in units per second.
   Substepping keeps the discrete oscillator honest at any framerate — one
   long step at low ω·dt error is cheaper than getting the wobble wrong. */
export function stepDamped(s: Damped, target: number, zeta: number, omega: number, dt: number): void {
  let rest = dt / 1000;                     /* seconds from here on */
  const maxH = 1 / 120;
  while (rest > 0) {
    const h = Math.min(rest, maxH);
    rest -= h;
    const a = -omega * omega * (s.x - target) - 2 * zeta * omega * s.v;
    s.v += a * h;                           /* velocity first — symplectic */
    s.x += s.v * h;
  }
}

/* exact exponential approach toward target with time constant tau (ms):
   the closed-form solution of x' = -(x - target)/τ over dt, so any split
   of dt into pieces lands on the same answer */
export function follow(x: number, target: number, tau: number, dt: number): number {
  return target + (x - target) * Math.exp(-dt / tau);
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
export const CAMERA: CameraConstants = {
  followTau: 67.1,     /* -16.667 / ln(1 - 0.22) */
  zoomTau: 27.9,       /* -16.667 / ln(1 - 0.45) */
  homingTau: 84.0,     /* -16.667 / ln(1 - 0.18) */
  flingTau: 269,       /* -16.667 / ln(0.94) — a flick's velocity half-life */
  sway: { zeta: 0.32, omega: 12 },   /* from vx -= x·0.04; vx *= 0.88 */
};

export interface Cam { x: number; y: number; z: number }
export interface Box { minX: number; maxX: number; minY: number; maxY: number }

/* the fence: where the camera may rest, from the layout's bounding box —
   the page's camBox, verbatim in behaviour. Zoomed out (zf → 0) the
   layout's centre may only drift a little from where it hangs; depth earns
   freedom — zoomed in (zf → 1), an edge keeping a foothold mid-screen is
   enough to navigate by. An empty bbox (x0 > x1) falls back to the screen. */
export function fence(
  cam: Cam,
  bbox: { x0: number; x1: number; y0: number; y1: number },
  W: number, H: number,
): Box {
  let { x0, x1, y0, y1 } = bbox;
  if (x0 > x1) { x0 = 0; x1 = W; y0 = 0; y1 = H; }
  const zf = Math.min(1, Math.max(0, (cam.z - 1) / 1.5));
  const bcx = (x0 + x1) / 2, bcy = (y0 + y1) / 2;
  const k = (a: number, b: number) => a + (b - a) * zf;
  return {
    minX: k(bcx - W * 0.08 - bcx * cam.z, W * 0.32 - x1 * cam.z),
    maxX: k(bcx + W * 0.08 - bcx * cam.z, W * 0.68 - x0 * cam.z),
    minY: k(bcy - H * 0.06 - bcy * cam.z, H * 0.3 - y1 * cam.z),
    maxY: k(bcy + H * 0.06 - bcy * cam.z, H * 0.55 - y0 * cam.z),
  };
}
