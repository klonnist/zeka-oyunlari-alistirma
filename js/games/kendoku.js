import { valueGame } from './base.js?v=6';
import { latinConstraints, randomFill, reduceGivens, to2 } from './latin.js?v=6';
import { range, N4 } from '../core/util.js?v=6';
import { diagSumQuestion } from './sudoku.js?v=6';

function makeCages(rng, n, level) {
  const id = range(n).map(() => Array(n).fill(-1));
  const cages = [];
  for (const i of rng.shuffle(range(n * n))) {
    const r = Math.floor(i / n), c = i % n;
    if (id[r][c] >= 0) continue;
    const want = rng.pick(level === 'orta' ? [1, 2, 2, 2, 3, 3] : [1, 2, 2, 2, 2, 3]);
    const cells = [[r, c]];
    id[r][c] = cages.length;
    while (cells.length < want) {
      const opts = [];
      for (const [cr, cc] of cells) for (const [dr, dc] of N4) {
        const a = cr + dr, b = cc + dc;
        if (a >= 0 && b >= 0 && a < n && b < n && id[a][b] < 0) opts.push([a, b]);
      }
      if (!opts.length) break;
      const [a, b] = rng.pick(opts);
      id[a][b] = cages.length;
      cells.push([a, b]);
    }
    cages.push({ cells });
  }
  return { id, cages };
}

export default valueGame({
  id: 'kendoku',
  name: 'Kendoku',
  stage: 'okul',
  icon: '➕',
  rules: 'Her satır ve sütunda 1’den N’ye kadar rakamlar birer kez yer alacak şekilde diyagramı doldur. Kalın çizgili bölgelerin köşesinde yazan işlem, o bölgedeki rakamlarla sağlanmalıdır (ör. +6: toplam 6; -2: büyük rakam eksi küçük rakam 2).',
  levels: { kolay: '4×4', orta: '5×5' },
  generate(rng, level) {
    const n = level === 'orta' ? 5 : 4;
    const base = latinConstraints(n);
    const vals = range(n).map((i) => i + 1);
    const sol = randomFill(n, vals, base, rng);
    const { id, cages } = makeCages(rng, n, level);
    const cs = base.slice();
    for (const cg of cages) {
      const vs = cg.cells.map(([r, c]) => r * n + c);
      const xs = vs.map((v) => sol[v]);
      let op;
      if (vs.length === 1) op = '=';
      else if (vs.length === 2) op = rng.pick(level === 'orta' ? ['+', '-', '×'] : ['+', '-', '+']);
      else op = level === 'orta' && rng.chance(0.3) ? '×' : '+';
      const target = op === '+' || op === '=' ? xs.reduce((s, x) => s + x, 0)
        : op === '-' ? Math.abs(xs[0] - xs[1]) : xs.reduce((s, x) => s * x, 1);
      cg.op = op; cg.target = target;
      cs.push({
        vars: vs,
        check(a) {
          let s = 0, p = 1, unk = 0;
          for (const v of vs) { if (a[v] < 0) unk++; else { s += a[v]; p *= a[v]; } }
          if (op === '+' || op === '=') return unk ? s + unk <= target : s === target;
          if (op === '×') return unk ? target % p === 0 : p === target;
          if (unk) return true;
          return Math.abs(a[vs[0]] - a[vs[1]]) === target;
        },
      });
      const [lr, lc] = cg.cells.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1])[0];
      cg.labelAt = [lr, lc];
      cg.label = op === '=' ? String(target) : (op === '×' ? '×' : op) + target;
    }
    const kept = reduceGivens(n, vals, cs, sol, rng, 0);
    const sol2 = to2(n, sol, String);
    const given = to2(n, sol.map((v, i) => (kept.has(i) ? String(v) : null)));
    const labels = {};
    for (const cg of cages) labels[cg.labelAt.join(',')] = cg.label;
    return { n, rows: n, cols: n, regions: id, labels, sol: sol2, given, q: diagSumQuestion(rng, n, sol2) };
  },
  palette: (p) => range(p.n).map((i) => String(i + 1)),
  extra: (p) => ({
    regions: p.regions,
    pad: { t: 0.6, l: 0.6, r: 0.6 },
    cell: (r, c) => (p.labels[r + ',' + c] ? { label: p.labels[r + ',' + c] } : {}),
  }),
});
