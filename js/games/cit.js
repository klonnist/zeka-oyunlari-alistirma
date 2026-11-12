import { edgeGame } from './base.js?v=6';
import { isUnique, reduceClues } from '../core/csp.js?v=6';
import { range, numberOptions, N4, edgeKey } from '../core/util.js?v=6';

function makeRegion(rng, n) {
  const target = Math.round(n * n * rng.int(40, 62) / 100);
  for (let t = 0; t < 400; t++) {
    const inside = new Set([rng.int(0, n * n - 1)]);
    for (let k = 0; k < 300 && inside.size < target; k++) {
      const front = [];
      for (const i of inside) {
        const r = Math.floor(i / n), c = i % n;
        for (const [dr, dc] of N4) {
          const a = r + dr, b = c + dc;
          if (a >= 0 && b >= 0 && a < n && b < n && !inside.has(a * n + b)) front.push(a * n + b);
        }
      }
      const cand = rng.pick(front);
      inside.add(cand);
      if (!valid(inside, n)) inside.delete(cand);
    }
    if (inside.size >= target - 1 && valid(inside, n)) return inside;
  }
  return null;
}

function valid(inside, n) {
  const IN = (r, c) => r >= 0 && c >= 0 && r < n && c < n && inside.has(r * n + c);
  // köşede kendine değme yok
  for (let r = 0; r <= n; r++) for (let c = 0; c <= n; c++) {
    const a = IN(r - 1, c - 1), b = IN(r - 1, c), d = IN(r, c - 1), e = IN(r, c);
    if (a === e && b === d && a !== b) return false;
  }
  // dış bölge bağlı (delik yok)
  const seen = new Set(), st = [];
  for (let i = 0; i < n * n; i++) {
    const r = Math.floor(i / n), c = i % n;
    if (!inside.has(i) && (r === 0 || c === 0 || r === n - 1 || c === n - 1)) { seen.add(i); st.push(i); }
  }
  while (st.length) {
    const x = st.pop(), r = Math.floor(x / n), c = x % n;
    for (const [dr, dc] of N4) {
      const a = r + dr, b = c + dc, y = a * n + b;
      if (a >= 0 && b >= 0 && a < n && b < n && !inside.has(y) && !seen.has(y)) { seen.add(y); st.push(y); }
    }
  }
  return seen.size + inside.size === n * n;
}

export default edgeGame({
  id: 'cit',
  name: 'Çit',
  stage: 'okul',
  icon: '🧱',
  lattice: 'corner',
  rules: 'Diyagramdaki noktaları yatay ve dikey çizgilerle birleştirerek kapalı ve kendini kesmeyen tek bir çit oluştur. Rakamlar, o hücrenin etrafından geçen çit parçası sayısını gösterir. Çizmek için iki nokta arasına dokun ya da parmağını noktadan noktaya sürükle.',
  levels: { kolay: '4×4', orta: '5×5' },
  generate(rng, level) {
    const n = level === 'orta' ? 5 : 4;
    // kenar indeksleri
    const H = (r, c) => r * n + c; // r 0..n, c 0..n-1
    const V = (r, c) => (n + 1) * n + r * (n + 1) + c; // r 0..n-1, c 0..n
    const E = 2 * n * (n + 1);
    const cellEdges = (r, c) => [H(r, c), H(r + 1, c), V(r, c), V(r, c + 1)];
    const vertexEdges = [];
    for (let r = 0; r <= n; r++) for (let c = 0; c <= n; c++) {
      const es = [];
      if (c > 0) es.push(H(r, c - 1));
      if (c < n) es.push(H(r, c));
      if (r > 0) es.push(V(r - 1, c));
      if (r < n) es.push(V(r, c));
      vertexEdges.push(es);
    }
    const ends = []; // kenar -> iki nokta
    for (let r = 0; r <= n; r++) for (let c = 0; c < n; c++) ends[H(r, c)] = [r * (n + 1) + c, r * (n + 1) + c + 1];
    for (let r = 0; r < n; r++) for (let c = 0; c <= n; c++) ends[V(r, c)] = [r * (n + 1) + c, (r + 1) * (n + 1) + c];
    const vcs = vertexEdges.map((es) => ({
      vars: es,
      check(a) {
        let on = 0, unk = 0;
        for (const e of es) { if (a[e] === 1) on++; else if (a[e] < 0) unk++; }
        if (on > 2) return false;
        if (unk) return !(on === 1 && unk === 0);
        return on === 0 || on === 2;
      },
    }));
    const single = (a) => {
      const on = [];
      for (let e = 0; e < E; e++) if (a[e] === 1) on.push(e);
      if (!on.length) return false;
      const adj = {};
      for (const e of on) for (const p of ends[e]) (adj[p] ||= []).push(e);
      const seen = new Set([on[0]]), st = [on[0]];
      while (st.length) {
        const e = st.pop();
        for (const p of ends[e]) for (const f of adj[p]) if (!seen.has(f)) { seen.add(f); st.push(f); }
      }
      return seen.size === on.length;
    };
    for (let t = 0; t < 60; t++) {
      const inside = makeRegion(rng, n);
      if (!inside) continue;
      const IN = (r, c) => r >= 0 && c >= 0 && r < n && c < n && inside.has(r * n + c);
      const loop = new Array(E).fill(0);
      for (let r = 0; r <= n; r++) for (let c = 0; c < n; c++) if (IN(r - 1, c) !== IN(r, c)) loop[H(r, c)] = 1;
      for (let r = 0; r < n; r++) for (let c = 0; c <= n; c++) if (IN(r, c - 1) !== IN(r, c)) loop[V(r, c)] = 1;
      const clue = (i) => cellEdges(Math.floor(i / n), i % n).reduce((s, e) => s + loop[e], 0);
      const build = (kept) => ({
        n: E,
        domains: range(E).map(() => [0, 1]),
        constraints: [...vcs, ...[...kept].map((i) => {
          const es = cellEdges(Math.floor(i / n), i % n), k = clue(i);
          return { vars: es, check(a) { let on = 0, u = 0; for (const e of es) { if (a[e] === 1) on++; else if (a[e] < 0) u++; } return on <= k && on + u >= k; } };
        })],
        final: single,
        maxNodes: 60000,
      });
      const all = range(n * n);
      if (!isUnique(build(new Set(all)))) continue;
      const kept = reduceClues(all, (k) => isUnique(build(k)), rng, level === 'orta' ? 0 : Math.round(n * n * 0.55));
      const shown = range(n).map((r) => range(n).map((c) => (kept.has(r * n + c) ? String(clue(r * n + c)) : '')));
      const solEdges = [];
      for (let r = 0; r <= n; r++) for (let c = 0; c < n; c++) if (loop[H(r, c)]) solEdges.push(edgeKey(r, c, r, c + 1));
      for (let r = 0; r < n; r++) for (let c = 0; c <= n; c++) if (loop[V(r, c)]) solEdges.push(edgeKey(r, c, r + 1, c));
      let ans = 0;
      for (const i of kept) if (inside.has(i)) ans += clue(i);
      return {
        n, rows: n, cols: n, shown, solEdges, inside: [...inside],
        q: { text: 'Çit oyununun çözümünde, çitin içinde kalan sayıların toplamı kaçtır?', ...numberOptions(rng, ans, { min: 0 }) },
      };
    }
    throw new Error('çit üretilemedi');
  },
  view(p, user, st = {}) {
    const cells = p.shown.map((row) => row.map((t) => ({ text: t, cls: 'clue' })));
    if (st.showSol) for (const i of p.inside) cells[Math.floor(i / p.n)][i % p.n].fill = '#e6f4ea';
    return { rows: p.n, cols: p.n, cells, noGrid: true, pad: { t: 0.3, l: 0.3, r: 0.3, b: 0.3 }, lattice: { type: 'corner', edges: st.showSol ? p.solEdges : user, color: st.showSol ? '#2a9d8f' : '#e4572e' } };
  },
});
