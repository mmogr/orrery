/* Motion toward a target, independent of the frame rate. A per-frame ease
   (x += (goal - x) * k each frame) is an exponential approach with time
   constant τ = -frame / ln(1 - k), and only looks the same at the frame rate
   it was tuned at; follow is that approach in closed form over any dt. A
   spring that overshoots and settles is a damped harmonic oscillator;
   stepDamped integrates it with dt, substepped. See docs/motion.md. */

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
