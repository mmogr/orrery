/* Snow caps: clip a face to the half-space above the snowline
   (Sutherland–Hodgman against one plane), then serrate the cut edge with a
   deterministic hash so the frost is ragged but steady frame to frame. */
import type { V3 } from "./shade.ts";

/* clip a polygon against the plane z >= zc, interpolating the crossings —
   the surviving piece is what pokes above the snowline. One plane is the
   whole Sutherland–Hodgman pipeline: keep inside points, and emit the
   interpolated crossing whenever inside-ness flips along an edge. */
export function clipZ(poly: V3[], zc: number): V3[] {
  const out: V3[] = [];
  for (let v = 0; v < poly.length; v++) {
    const P = poly[v], Q = poly[(v + 1) % poly.length];
    if (P[2] >= zc) out.push(P);
    if ((P[2] >= zc) !== (Q[2] >= zc)) {
      const k = (zc - P[2]) / (Q[2] - P[2]);
      out.push([P[0] + (Q[0] - P[0]) * k, P[1] + (Q[1] - P[1]) * k, zc]);
    }
  }
  return out;
}

/* the snow edge is serrated, the way mountains are drawn: when the clip
   closed the ring exactly on the line — last and first vertices both at
   z === zc — the cut edge gains one tooth, a midpoint dipped below the
   line, its depth hashed from position so the serration is ragged but
   steady. Any other cap comes back untouched. */
export function serrate(cap: V3[], zc: number, amp: number): V3[] {
  const a = cap[cap.length - 1], b = cap[0];
  if (!a || !b || a[2] !== zc || b[2] !== zc) return cap;
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const h = Math.sin(mx * 12.9898 + my * 78.233) * 43758.5453;
  return [...cap, [mx, my, zc - amp * (0.7 + 0.6 * (h - Math.floor(h)))]];
}
