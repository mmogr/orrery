/* Snow caps: clip a face to the half-space above the snowline
   (Sutherland–Hodgman against one plane), then serrate the cut edge with a
   deterministic hash so the frost is ragged but steady frame to frame. */
import type { V3 } from "./shade.ts";

export function clipZ(poly: V3[], zc: number): V3[] {
  throw new Error("todo: clipZ");
}

export function serrate(cap: V3[], zc: number, amp: number): V3[] {
  throw new Error("todo: serrate");
}
