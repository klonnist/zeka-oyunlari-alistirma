import { valueGame } from './base.js?v=6';
import { boxRegions, latinConstraints, randomFill, reduceGivens, to2 } from './latin.js?v=6';
import { numberOptions, diagonalArrow, range } from '../core/util.js?v=6';

export function diagSumQuestion(rng, n, sol2, extraText = '') {
  const { arrow, cells } = diagonalArrow(rng, n);
  const ans = cells.reduce((s, [r, c]) => s + Number(sol2[r][c]), 0);
  return {
    text: `Bulmacanın çözümünde, ok yönündeki hücrelere gelecek rakamların toplamı kaçtır?${extraText}`,
    arrow, cells, ...numberOptions(rng, ans, { min: n }),
  };
}

export default valueGame({
  id: 'sudoku',
  name: 'Klasik Sudoku',
  stage: 'okul',
  icon: '🔢',
  rules: 'Diyagramı her satırda, her sütunda ve kalın çizgili her bölgede 1’den N’ye kadar tüm rakamlar birer kez yer alacak şekilde doldur.',
  levels: { kolay: '4×4', orta: '6×6' },
  generate(rng, level) {
    const n = level === 'orta' ? 6 : 4;
    const regions = boxRegions(n);
    const cs = latinConstraints(n, regions);
    const vals = range(n).map((i) => i + 1);
    const sol = randomFill(n, vals, cs, rng);
    const kept = reduceGivens(n, vals, cs, sol, rng, level === 'orta' ? 0 : 6);
    const sol2 = to2(n, sol, String);
    const given = to2(n, sol.map((v, i) => (kept.has(i) ? String(v) : null)));
    return { n, rows: n, cols: n, regions, sol: sol2, given, q: diagSumQuestion(rng, n, sol2) };
  },
  palette: (p) => range(p.n).map((i) => String(i + 1)),
  extra: (p) => ({ regions: p.regions, pad: { t: 0.6, l: 0.6, r: 0.6 } }),
});
