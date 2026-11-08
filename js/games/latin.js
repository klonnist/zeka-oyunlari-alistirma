// Latin kare ailesi için ortak araçlar
import { solve, isUnique, C, reduceClues } from '../core/csp.js';
import { range } from '../core/util.js';

export function boxRegions(n) {
  const [bh, bw] = n === 4 ? [2, 2] : n === 6 ? [2, 3] : n === 9 ? [3, 3] : [1, n];
  return range(n).map((r) => range(n).map((c) => Math.floor(r / bh) * (n / bw) + Math.floor(c / bw)));
}

export function lineVars(n) {
  const rows = range(n).map((r) => range(n).map((c) => r * n + c));
  const cols = range(n).map((c) => range(n).map((r) => r * n + c));
  return { rows, cols };
}

// Temel latin kısıtları (+ isteğe bağlı bölgeler)
export function latinConstraints(n, regions) {
  const { rows, cols } = lineVars(n);
  const cs = [...rows, ...cols].map((vs) => C.allDiff(vs));
  if (regions) {
    const g = {};
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) (g[regions[r][c]] ||= []).push(r * n + c);
    for (const k in g) cs.push(C.allDiff(g[k]));
  }
  return cs;
}

// Kısıtları sağlayan rastgele tam çözüm (düz dizi)
export function randomFill(n, values, constraints, rng, final) {
  for (let t = 0; t < 30; t++) {
    const r = solve({ n: n * n, domains: range(n * n).map(() => values), constraints, final, limit: 1, rng, maxNodes: 20000 });
    if (r.count) return r.solution;
  }
  return null;
}

// Verilen sayıları azalt; kalan verilenler Set(index)
export function reduceGivens(n, values, constraints, sol, rng, keepAtLeast = 0, final) {
  const all = range(n * n);
  const uniq = (kept) => isUnique({
    n: n * n,
    domains: all.map((i) => (kept.has(i) ? [sol[i]] : values)),
    constraints, final, maxNodes: 40000,
  });
  return reduceClues(all, uniq, rng, keepAtLeast);
}

export const to2 = (n, flat, f = (x) => x) => range(n).map((r) => range(n).map((c) => f(flat[r * n + c])));
