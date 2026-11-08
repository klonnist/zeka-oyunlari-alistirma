import { edgeGame } from './base.js';
import { isUnique } from '../core/csp.js';
import { range, N4, edgeKey, parseEdge, textOptions } from '../core/util.js';

const NAMES = ['A', 'B', 'C', 'D'];
const COLORS = ['#e4572e', '#3a86ff', '#2a9d8f', '#9b5de5'];

function hamiltonPath(rng, n) {
  let path = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) path.push([r, r % 2 ? n - 1 - c : c]);
  if (rng.chance(0.5)) path = path.map(([r, c]) => [c, r]);
  const key = (p) => p[0] * n + p[1];
  for (let it = 0; it < n * n * 30; it++) {
    if (rng.chance(0.5)) path.reverse();
    const head = path[0];
    const nb = N4.map(([dr, dc]) => [head[0] + dr, head[1] + dc]).filter(([r, c]) => r >= 0 && c >= 0 && r < n && c < n);
    const x = rng.pick(nb);
    const idx = path.findIndex((p) => key(p) === key(x));
    if (idx <= 1) continue;
    path = [...path.slice(0, idx).reverse(), ...path.slice(idx)];
  }
  return path;
}

export default edgeGame({
  id: 'baglamaca',
  name: 'ABC Bağlamaca',
  stage: 'okul',
  icon: '〰️',
  lattice: 'center',
  rules: 'Diyagramdaki tüm hücreleri kullanarak, yatay ya da dikey yönde ilerleyip aynı harfleri birbirine bağlayan yollar çiz. Yollar birbirini kesemez ve her hücreden tek bir yol geçer. Bir harften başlayıp parmağını hücre hücre sürükle; bir bağlantıyı silmek için iki hücre arasına dokun.',
  levels: { kolay: '4×4', orta: '5×5' },
  generate(rng, level) {
    const n = level === 'orta' ? 5 : 4, k = level === 'orta' ? 4 : 3;
    const nb = (i) => {
      const r = Math.floor(i / n), c = i % n;
      return N4.map(([dr, dc]) => [r + dr, c + dc]).filter(([a, b]) => a >= 0 && b >= 0 && a < n && b < n).map(([a, b]) => a * n + b);
    };
    for (let t = 0; t < 3000; t++) {
      const path = hamiltonPath(rng, n).map(([r, c]) => r * n + c);
      // k parçaya böl, her parça >= 3
      const cuts = [];
      let pos = 0;
      for (let j = 0; j < k - 1; j++) {
        const left = n * n - pos - 3 * (k - 1 - j);
        const len = rng.int(3, Math.max(3, Math.min(left - 3, Math.round((n * n) / k) + 2)));
        pos += len; cuts.push(pos);
      }
      if (n * n - pos < 3) continue;
      const color = new Array(n * n).fill(-1);
      const segs = [];
      let s = 0;
      [...cuts, n * n].forEach((e, j) => { const seg = path.slice(s, e); seg.forEach((x) => (color[x] = j)); segs.push(seg); s = e; });
      const endpoint = new Map();
      segs.forEach((seg, j) => { endpoint.set(seg[0], j); endpoint.set(seg[seg.length - 1], j); });
      // kendine değen parça olmasın
      const okSelf = segs.every((seg) => {
        const pos2 = new Map(seg.map((x, i) => [x, i]));
        return seg.every((x, i) => nb(x).every((y) => !pos2.has(y) || Math.abs(pos2.get(y) - i) === 1));
      });
      if (!okSelf) continue;
      const cs = range(n * n).map((v) => {
        const N = nb(v), need = endpoint.has(v) ? 1 : 2;
        return {
          vars: [v, ...N],
          check(a) {
            if (a[v] < 0) return true;
            let same = 0, unk = 0;
            for (const y of N) { if (a[y] < 0) unk++; else if (a[y] === a[v]) same++; }
            return same <= need && same + unk >= need;
          },
        };
      });
      const final = (a) => {
        for (let j = 0; j < k; j++) {
          const cells = range(n * n).filter((i) => a[i] === j);
          const seen = new Set([cells[0]]), st = [cells[0]];
          while (st.length) { const x = st.pop(); for (const y of nb(x)) if (a[y] === j && !seen.has(y)) { seen.add(y); st.push(y); } }
          if (seen.size !== cells.length) return false;
        }
        return true;
      };
      const prob = { n: n * n, domains: range(n * n).map((i) => (endpoint.has(i) ? [endpoint.get(i)] : range(k))), constraints: cs, final, maxNodes: 20000 };
      if (!isUnique(prob)) continue;
      const solEdges = [];
      for (let i = 0; i < n * n; i++) for (const y of nb(i)) if (y > i && color[y] === color[i]) solEdges.push(edgeKey(Math.floor(i / n), i % n, Math.floor(y / n), y % n));
      // soru: ok gösterilen satır/sütundaki harf sırası
      const lines = [];
      for (let i = 0; i < n; i++) {
        lines.push({ side: 'left', i, cells: range(n).map((c) => i * n + c) });
        lines.push({ side: 'top', i, cells: range(n).map((r) => r * n + i) });
      }
      const seqOf = (L) => { const out = []; for (const x of L.cells) { const ch = NAMES[color[x]]; if (out[out.length - 1] !== ch) out.push(ch); } return out.join(''); };
      const good = lines.filter((L) => seqOf(L).length >= 3);
      const L = rng.pick(good.length ? good : lines);
      const ans = seqOf(L);
      const letters = NAMES.slice(0, k);
      const q = {
        text: `ABC bağlamaca sorusunun çözümünde ok yönünde sırasıyla hangi harflerin yolu geçmektedir? (Aynı yol art arda bir kez yazılır)`,
        arrow: { kind: 'line', side: L.side, i: L.i },
        cells: L.cells.map((x) => [Math.floor(x / n), x % n]),
        ...textOptions(rng, ans, () => {
          const s = ans.split('');
          if (rng.chance(0.5) && s.length > 1) { const i = rng.int(0, s.length - 2); [s[i], s[i + 1]] = [s[i + 1], s[i]]; }
          else { const i = rng.int(0, s.length - 1); s[i] = rng.pick(letters); }
          const w = s.join('');
          return /(.)\1/.test(w) ? null : w;
        }),
      };
      const ends = [...endpoint].map(([i, j]) => [Math.floor(i / n), i % n, NAMES[j]]);
      return { n, rows: n, cols: n, k, ends, solEdges, q };
    }
    throw new Error('bağlamaca üretilemedi');
  },
  view(p, user, st = {}) {
    const n = p.n;
    const cells = range(n).map(() => range(n).map(() => ({})));
    for (const [r, c, ch] of p.ends) cells[r][c].endpoint = ch;
    const hl = new Set((p.q.cells || []).map(([r, c]) => r + ',' + c));
    for (const key of hl) { const [r, c] = key.split(',').map(Number); cells[r][c].fill = '#fff1d0'; }
    const set = st.showSol ? new Set(p.solEdges) : user;
    // kullanıcının yollarını harfe göre renklendir
    const adj = {};
    for (const e of set) { const [a, b, c, d] = parseEdge(e); (adj[a + ',' + b] ||= []).push([c + ',' + d, e]); (adj[c + ',' + d] ||= []).push([a + ',' + b, e]); }
    const colored = new Set(), paths = [];
    for (const [r, c, ch] of p.ends) {
      const s = new Set(), stack = [r + ',' + c], seen = new Set(stack);
      while (stack.length) { const x = stack.pop(); for (const [y, e] of adj[x] || []) { s.add(e); if (!seen.has(y)) { seen.add(y); stack.push(y); } } }
      for (const e of s) colored.add(e);
      paths.push({ set: s, color: COLORS[NAMES.indexOf(ch)] });
    }
    paths.unshift({ set: [...set].filter((e) => !colored.has(e)), color: '#adb5bd' });
    const pad = p.q.arrow.side === 'left' ? { l: 1, t: 0.2, r: 0.2 } : { t: 1, l: 0.2, r: 0.2 };
    return { rows: n, cols: n, cells, pad, arrow: p.q.arrow, lattice: { type: 'center', paths } };
  },
});
