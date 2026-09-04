/* The sky by meaning. The notes site embeds every note with a language
   model and publishes the leading principal directions of those vectors
   (feeds/types.ts, SemanticFeed); this module takes them as a second
   layout — notes that say the same things sit together, whatever they
   link to — and asks two questions of it: which notes are close in
   meaning but never linked, and how far meaning and links agree at all.
   Nothing heavy happens here: the decomposition was done where the text
   lives. See docs/semantic-sky.md. */
import type { Graph } from "./laplacian.ts";
import type { Embedding } from "./spectral.ts";
import { scaleToBox } from "./spectral.ts";
import { procrustes } from "../math/linalg.ts";
import { mantel, type MantelOpts } from "../math/stats.ts";
import { hopDistances, UNREACHABLE } from "./paths.ts";

/* vectors: n × dim row-major; a note the feed did not know is all zeros */

/* the drawn layout: the first two directions as a plane, scaled into a
   w×h box like the spectral rest state, then turned by Procrustes to face
   the link layout so the morph between the two is the shortest move and
   not an arbitrary rotation. Depth is zero: meaning has no third axis
   here. */
export function semanticLayout(vectors: ArrayLike<number>, n: number, dim: number,
                               link: Embedding, w: number, h: number): Embedding {
  const x = new Float64Array(n), y = new Float64Array(n), z = new Float64Array(n);
  if (dim >= 2)
    for (let i = 0; i < n; i++) { x[i] = vectors[i * dim]; y[i] = vectors[i * dim + 1]; }
  return procrustes(scaleToBox({ x, y, z }, w, h), link);
}

/* cosine similarity of notes i and j in all dim directions; 0 where either
   is the zero vector */
export function cosine(vectors: ArrayLike<number>, dim: number, i: number, j: number): number {
  let dot = 0, ni = 0, nj = 0;
  for (let k = 0; k < dim; k++) {
    const a = vectors[i * dim + k], b = vectors[j * dim + k];
    dot += a * b; ni += a * a; nj += b * b;
  }
  return ni && nj ? dot / Math.sqrt(ni * nj) : 0;
}

export interface LinkOpts { count: number; minSim: number }
export const LINK_DEFAULTS: LinkOpts = { count: 12, minSim: 0.5 };

/* the strongest pairs by cosine that the graph does not link, descending,
   [i, j, sim] with i < j; ties broken by index so the list is the same on
   every machine. A zero vector never pairs. */
export function semanticLinks(vectors: ArrayLike<number>, n: number, dim: number, g: Graph,
                              opts: Partial<LinkOpts> = {}): Array<[number, number, number]> {
  const { count, minSim } = { ...LINK_DEFAULTS, ...opts };
  const linked = new Set<number>();
  for (const [a, b] of g.edges) linked.add(Math.min(a, b) * n + Math.max(a, b));
  const out: Array<[number, number, number]> = [];
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      if (linked.has(i * n + j)) continue;
      const s = cosine(vectors, dim, i, j);
      if (s >= minSim) out.push([i, j, s]);
    }
  out.sort((p, q) => q[2] - p[2] || p[0] - q[0] || p[1] - q[1]);
  return out.slice(0, count);
}

/* how far meaning and links agree: Mantel's test between hop distance on
   the graph (unreachable counted as n, farther than any path) and cosine
   distance 1 − cos in all dim directions, over the notes the feed knew.
   ρ > 0 says notes near in meaning tend to be near in the graph; p is the
   share of relabelled skies that agree at least as well. */
export function semanticAgreement(vectors: ArrayLike<number>, n: number, dim: number, g: Graph,
                                  opts: Partial<MantelOpts> = {}): { rho: number; p: number; known: number } {
  const known: number[] = [];
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k < dim; k++) s += vectors[i * dim + k] ** 2;
    if (s > 0) known.push(i);
  }
  const k = known.length;
  if (k < 3) return { rho: 0, p: 1, known: k };
  const hop = hopDistances(g);
  const dA = new Float64Array(k * k), dB = new Float64Array(k * k);
  for (let a = 0; a < k; a++)
    for (let b = a + 1; b < k; b++) {
      const h = hop[known[a] * n + known[b]];
      dA[a * k + b] = dA[b * k + a] = h === UNREACHABLE ? n : h;
      const c = 1 - cosine(vectors, dim, known[a], known[b]);
      dB[a * k + b] = dB[b * k + a] = c;
    }
  return { ...mantel(dA, dB, k, opts), known: k };
}
