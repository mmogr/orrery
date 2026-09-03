/* Language space: the singular value decomposition of the repo × language
   byte matrix (row-normalised log-bytes, centred). PC1/PC2 are the principal
   directions of what gets built; each repo's coordinates say how far its mix
   sits from the others', and along what axis. docs/language-space.md. */

/* thin SVD of A (rows × cols) via the eigen-decomposition of the smaller
   Gram matrix; singular values descending */
export function svd(A: Float64Array, rows: number, cols: number):
  { U: Float64Array; S: Float64Array; V: Float64Array } {
  throw new Error("todo: svd");
}

export interface LanguageSpace {
  repos: string[];
  langs: string[];
  /* xy[i*2], xy[i*2+1]: repo i's PC1/PC2 coordinates */
  xy: Float64Array;
  /* the two languages loading PC1 hardest, negative end first */
  axis1: readonly [string, string];
}

export function languageSpace(bytes: Record<string, Record<string, number>>): LanguageSpace {
  throw new Error("todo: languageSpace");
}
