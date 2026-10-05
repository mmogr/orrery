/* The transport solver under the curvature: the earth mover's distance
   between two small distributions, exactly. It lives apart from
   curvature.ts so that its tally — how much work it did — can be read by
   the tests without becoming part of the package's face. */

const EPS = 1e-12;

/* the solver's work since whoever last cleared it: problems solved,
   routes mass was pushed along, and times the prices had to rise. Counts,
   not milliseconds, so a budget on them means the same on every machine. */
export const tally = { problems: 0, routes: 0, rises: 0 };

/* the minimum cost of moving distribution a (over m points) onto b (over
   n points) when moving one unit from point u to point v costs C[u·n+v]:
   the earth mover's distance, exactly, by the primal-dual method. Prices
   on both sides keep every reduced cost C + pu − pv at or above zero; mass
   moves only along routes whose reduced cost is zero, and every such route
   is used up before the prices are raised again. Raising them is one
   Dijkstra over the reduced costs, stopped at the nearest point still
   wanting mass. The costs here take a few distinct values — hops of one,
   two or three — so a handful of price rises settle a problem that one
   shortest-path search per unit of mass used to. The masses must have the
   same sum. */
export function transportCost(a: Float64Array, b: Float64Array, C: Float64Array): number {
  tally.problems++;
  const m = a.length, n = b.length;
  const supply = Float64Array.from(a), demand = Float64Array.from(b);
  const flow = new Float64Array(m * n);
  const pu = new Float64Array(m), pv = new Float64Array(n);
  let left = 0, scale = 1;
  for (let u = 0; u < m; u++) {
    left += supply[u];
    let lo = Infinity;
    for (let v = 0; v < n; v++) { const c = C[u * n + v]; if (c < lo) lo = c; if (c > scale) scale = c; }
    pu[u] = -lo;                          /* every row starts with a free route */
  }
  const TOL = 1e-12 * scale;              /* a reduced cost this small is zero */
  const seenU = new Uint8Array(m), seenV = new Uint8Array(n);
  const viaU = new Int32Array(n), viaV = new Int32Array(m);   /* how each point was reached */
  const stack = new Int32Array(m);
  const du = new Float64Array(m), dv = new Float64Array(n);

  /* push what fits along the route that ends at demand t, walking back
     through viaU / viaV to the supply it started from */
  const push = (t: number): void => {
    let amount = demand[t], v = t;
    for (;;) {
      const u = viaU[v], back = viaV[u];
      if (back < 0) { amount = Math.min(amount, supply[u]); break; }
      amount = Math.min(amount, flow[u * n + back]);            /* a backward step undoes flow */
      v = back;
    }
    v = t;
    for (;;) {
      const u = viaU[v], back = viaV[u];
      flow[u * n + v] += amount;
      if (back < 0) { supply[u] -= amount; break; }
      flow[u * n + back] -= amount;
      v = back;
    }
    demand[t] -= amount;
    left -= amount;
    tally.routes++;
  };

  /* one route of zero reduced cost from a supply with mass to a demand
     wanting it, depth first; false when there is none at these prices */
  const route = (): boolean => {
    seenU.fill(0); seenV.fill(0);
    let top = 0;
    for (let u = 0; u < m; u++) if (supply[u] > EPS) { seenU[u] = 1; viaV[u] = -1; stack[top++] = u; }
    while (top > 0) {
      const u = stack[--top], row = u * n, p = pu[u];
      for (let v = 0; v < n; v++) {
        if (seenV[v] || C[row + v] + p - pv[v] > TOL) continue;
        seenV[v] = 1; viaU[v] = u;
        if (demand[v] > EPS) { push(v); return true; }
        for (let w = 0; w < m; w++)
          if (!seenU[w] && flow[w * n + v] > EPS) { seenU[w] = 1; viaV[w] = v; stack[top++] = w; }
      }
    }
    return false;
  };

  while (left > EPS) {
    while (left > EPS && route()) { /* until these prices offer nothing more */ }
    if (left <= EPS) break;
    /* raise the prices: Dijkstra on reduced costs from every supply that
       still has mass, to the nearest demand still wanting some */
    tally.rises++;
    du.fill(Infinity); dv.fill(Infinity); seenU.fill(0); seenV.fill(0);
    for (let u = 0; u < m; u++) if (supply[u] > EPS) { du[u] = 0; viaV[u] = -1; }
    let t = -1;
    for (;;) {
      let x = -1, best = Infinity, onU = true;
      for (let u = 0; u < m; u++) if (!seenU[u] && du[u] < best) { best = du[u]; x = u; }
      for (let v = 0; v < n; v++) if (!seenV[v] && dv[v] < best) { best = dv[v]; x = v; onU = false; }
      if (x < 0) break;
      if (onU) {
        seenU[x] = 1;
        const row = x * n, p = pu[x];
        for (let v = 0; v < n; v++) {
          if (seenV[v]) continue;
          const d = best + C[row + v] + p - pv[v];
          if (d < dv[v]) { dv[v] = d; viaU[v] = x; }
        }
      } else {
        seenV[x] = 1;
        if (demand[x] > EPS) { t = x; break; }
        for (let u = 0; u < m; u++)
          if (!seenU[u] && flow[u * n + x] > EPS && best < du[u]) { du[u] = best; viaV[u] = x; }
      }
    }
    if (t < 0) break;                      /* unreachable: the masses didn't balance */
    const far = dv[t];
    for (let u = 0; u < m; u++) pu[u] += Math.min(du[u], far);
    for (let v = 0; v < n; v++) pv[v] += Math.min(dv[v], far);
    push(t);                               /* the route Dijkstra found is now free */
  }
  let cost = 0;
  for (let k = 0; k < m * n; k++) if (flow[k] > 0) cost += flow[k] * C[k];
  return cost;
}
