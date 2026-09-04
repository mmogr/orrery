/* Statistics on a circle, for the week. A plain mean of weekdays fails at
   the wrap — Saturday and Sunday average to Wednesday — so the week is
   put on a circle and its commits are treated as a von Mises sample: the
   direction of their resultant is the mean weekday, its length says how
   concentrated they are, and κ is the concentration in the density's own
   parameter. See docs/tide.md. */

export interface VonMises {
  mu: number;      /* mean direction, radians in [0, 2π) */
  kappa: number;   /* concentration: 0 is uniform, large is a spike */
  R: number;       /* mean resultant length in [0, 1], the raw evidence */
}

/* the largest κ reported: at R = 1 (everything in one bin) the estimator
   is infinite, and a spike is a spike */
export const KAPPA_MAX = 1e3;

/* fit a von Mises to weights on K equally spaced directions θ_k = 2πk/K.
   Empty weights give the uniform fit. */
export function vonMisesFit(weights: ArrayLike<number>): VonMises {
  const K = weights.length;
  let W = 0, C = 0, S = 0;
  for (let k = 0; k < K; k++) {
    const w = weights[k];
    if (!(w > 0)) continue;
    const th = 2 * Math.PI * k / K;
    W += w; C += w * Math.cos(th); S += w * Math.sin(th);
  }
  if (!W) return { mu: 0, kappa: 0, R: 0 };
  C /= W; S /= W;
  const R = Math.min(1, Math.hypot(C, S));
  let mu = Math.atan2(S, C);
  if (mu < 0) mu += 2 * Math.PI;
  return { mu, kappa: Math.min(KAPPA_MAX, invA(R)), R };
}

/* A(κ) = I₁(κ)/I₀(κ) is the resultant length a von Mises of concentration
   κ produces; the fit inverts it. Best & Fisher's three-branch
   approximation, accurate to a few parts in a thousand across the range */
function invA(R: number): number {
  if (R < 0.53) return 2 * R + R ** 3 + 5 * R ** 5 / 6;
  if (R < 0.85) return -0.4 + 1.39 * R + 0.43 / (1 - R);
  const d = R ** 3 - 4 * R ** 2 + 3 * R;
  return d > 0 ? 1 / d : Infinity;
}

/* the exponentially scaled modified Bessel function e^{−κ} I₀(κ): the
   power series while it is well conditioned, the asymptotic expansion
   beyond, both without ever forming e^κ */
export function besselI0e(x: number): number {
  const ax = Math.abs(x);
  if (ax <= 30) {
    let term = 1, sum = 1;
    const q = ax * ax / 4;
    for (let k = 1; k < 200; k++) {
      term *= q / (k * k);
      sum += term;
      if (term < sum * 1e-17) break;
    }
    return sum * Math.exp(-ax);
  }
  const r = 1 / (8 * ax);
  return (1 + r + 4.5 * r * r + 37.5 * r * r * r) / Math.sqrt(2 * Math.PI * ax);
}

/* the von Mises density at θ, written so a sharp κ cannot overflow:
   e^{κ cos(θ−μ)} / (2π I₀(κ)) = e^{κ (cos(θ−μ) − 1)} / (2π e^{−κ} I₀(κ)) */
export function vonMisesDensity(theta: number, mu: number, kappa: number): number {
  return Math.exp(kappa * (Math.cos(theta - mu) - 1)) / (2 * Math.PI * besselI0e(kappa));
}
