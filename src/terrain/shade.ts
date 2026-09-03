/* Lambert on the rock, with the lamp named. The light direction is the one
   the page has always implied; here it is normalised and stated, with the
   ambient/diffuse split as constants. docs/terrain-shading.md. */
export type V3 = readonly [number, number, number];

/* a fixed lamp high in the north-west: the page's (-0.42, 0.3, 0.86),
   normalised here — the raw vector's length is 1.00295, so the page's
   diffuse term ran 0.3% hot; the unit lamp is the accepted correction */
const LM = Math.hypot(-0.42, 0.3, 0.86);
export const LIGHT: V3 = [-0.42 / LM, 0.3 / LM, 0.86 / LM];
export const AMBIENT = 0.6;   /* what the sky pays every face regardless */
export const DIFFUSE = 0.4;   /* what facing the lamp can earn on top */

/* unit normal of the triangle ABC, flipped so z >= 0 */
export function faceNormal(A: V3, B: V3, C: V3): V3 {
  const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2];
  const vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
  const m = Math.hypot(nx, ny, nz);
  if (!m) return [0, 0, 1];   /* a degenerate face lies flat */
  return [nx / m + 0, ny / m + 0, nz / m + 0];   /* + 0 tidies any -0 from the flip */
}

/* AMBIENT + DIFFUSE · max(0, n·L): the multiplier on the rock's own colour */
export function lambert(n: V3, L: V3 = LIGHT): number {
  return AMBIENT + DIFFUSE * Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
}
