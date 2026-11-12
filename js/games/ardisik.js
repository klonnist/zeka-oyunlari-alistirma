import { valueGame } from './base.js?v=6';
import { boxRegions, latinConstraints, randomFill, reduceGivens, to2 } from './latin.js?v=6';
import { range } from '../core/util.js?v=6';
import { diagSumQuestion } from './sudoku.js?v=6';

export default valueGame({
  id: 'ardisik',
  name: 'Ardışık Sudoku',
  stage: 'okul',
  icon: '⚫',
  rules: 'Diyagramı her satırda, her sütunda ve kalın çizgili her bölgede 1’den N’ye kadar tüm rakamlar birer kez yer alacak şekilde doldur. Ayrıca aralarında siyah nokta bulunan komşu hücrelerdeki rakamlar ardışık olmalıdır (ör. 2-3, 5-4).',
  levels: { kolay: '4×4', orta: '6×6' },
  generate(rng, level) {
    const n = level === 'orta' ? 6 : 4;
    const regions = boxRegions(n);
    const base = latinConstraints(n, regions);
    const vals = range(n).map((i) => i + 1);
    const sol = randomFill(n, vals, base, rng);
    const dots = [];
    const cs = base.slice();
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const r2 = r + dr, c2 = c + dc;
        if (r2 >= n || c2 >= n) continue;
        const a = r * n + c, b = r2 * n + c2;
        if (Math.abs(sol[a] - sol[b]) === 1) {
          dots.push([r, c, r2, c2]);
          cs.push({ vars: [a, b], check: (x) => x[a] < 0 || x[b] < 0 || Math.abs(x[a] - x[b]) === 1 });
        }
      }
    }
    const kept = reduceGivens(n, vals, cs, sol, rng, level === 'orta' ? 0 : 3);
    const sol2 = to2(n, sol, String);
    const given = to2(n, sol.map((v, i) => (kept.has(i) ? String(v) : null)));
    return { n, rows: n, cols: n, regions, dots, sol: sol2, given, q: diagSumQuestion(rng, n, sol2) };
  },
  palette: (p) => range(p.n).map((i) => String(i + 1)),
  extra: (p) => ({ regions: p.regions, dots: p.dots, pad: { t: 0.6, l: 0.6, r: 0.6 } }),
});
