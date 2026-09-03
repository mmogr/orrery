/* Lambert on the rock, with the lamp named. The light direction is the one
   the page has always implied; here it is normalised and stated, with the
   ambient/diffuse split as constants. docs/terrain-shading.md. */
export type V3 = readonly [number, number, number];

/* a fixed lamp high in the north-west (the page's -0.42, 0.3, 0.86, unit) */
export declare const LIGHT: V3;
export declare const AMBIENT: number;   /* 0.6 */
export declare const DIFFUSE: number;   /* 0.4 */

/* unit normal of the triangle ABC, flipped so z >= 0 */
export function faceNormal(A: V3, B: V3, C: V3): V3 {
  throw new Error("todo: faceNormal");
}

/* AMBIENT + DIFFUSE · max(0, n·L): the multiplier on the rock's own colour */
export function lambert(n: V3, L?: V3): number {
  throw new Error("todo: lambert");
}
