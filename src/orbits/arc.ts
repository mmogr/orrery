/* The sky arc: how an orbit fraction becomes a place over the range. This
   is the page's planetPos, ported verbatim as a pure function. The planet
   rides a half-sine while f < 0.5 and sits below the horizon after; x runs
   the visible span W·0.05 → W·0.95 over the UP half only — the ·2 in the
   x term means x keeps marching past the right edge for f > 0.5, which is
   fine, because a set planet isn't drawn. The tilt term is the old fork
   behaviour generalised: the fork's captured, slanted path was tilt = 0.07;
   language lean supplies smaller tilts of its own. */
export function arcPos(f: number, alt: number, tilt: number, W: number, H: number):
  { x: number; y: number; up: number } {
  const up = f < 0.5 ? Math.sin(f * 2 * Math.PI) : 0;
  const x = W * (0.05 + 0.90 * f * 2);
  let y = H * 0.72 - up * alt * H;
  y += (f * 2 - 0.5) * H * tilt;
  return { x, y, up };
}
