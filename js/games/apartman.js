import { valueGame } from './base.js?v=6';
import { lineVars, latinConstraints, randomFill, to2 } from './latin.js?v=6';
import { isUnique, reduceClues } from '../core/csp.js?v=6';
import { range } from '../core/util.js?v=6';
import { diagSumQuestion } from './sudoku.js?v=6';

const visible = (xs) => { let m = 0, k = 0; for (const x of xs) if (x > m) { m = x; k++; } return k; };

function viewConstraint(vs, k) {
  return {
    vars: vs,
    check(a) {
      // ön ek tamamsa kısmi kontrol
      let m = 0, cnt = 0;
      for (const v of vs) {
        if (a[v] < 0) return cnt <= k;
        if (a[v] > m) { m = a[v]; cnt++; }
      }
      return cnt === k;
    },
  };
}

export default valueGame({
  id: 'apartman',
  name: 'Apartmanlar',
  stage: 'final',
  icon: '🏢',
  rules: 'Her satır ve sütuna 1’den N’ye kadar yükseklikte apartmanları birer kez yerleştir. Dışarıdaki rakamlar, o yönden bakıldığında görülebilen apartman sayısını gösterir. Daha yüksek bir apartmanın arkasındaki apartmanlar görünmez.',
  levels: { kolay: '4×4', orta: '5×5' },
  generate(rng, level) {
    const n = level === 'orta' ? 5 : 4;
    const base = latinConstraints(n);
    const vals = range(n).map((i) => i + 1);
    const sol = randomFill(n, vals, base, rng);
    const { rows, cols } = lineVars(n);
    const clues = [];
    for (let i = 0; i < n; i++) {
      clues.push({ side: 'top', i, vs: cols[i] });
      clues.push({ side: 'bottom', i, vs: cols[i].slice().reverse() });
      clues.push({ side: 'left', i, vs: rows[i] });
      clues.push({ side: 'right', i, vs: rows[i].slice().reverse() });
    }
    for (const cl of clues) cl.k = visible(cl.vs.map((v) => sol[v]));
    const all = range(n * n);
    const build = (kc, kg) => ({
      n: n * n,
      domains: all.map((i) => (kg.has(i) ? [sol[i]] : vals)),
      constraints: [...base, ...[...kc].map((cl) => viewConstraint(cl.vs, cl.k))],
      maxNodes: 8000,
    });
    const allC = new Set(clues);
    const givens = reduceClues(all, (kg) => isUnique(build(allC, kg)), rng);
    const kept = reduceClues(clues, (kc) => isUnique(build(kc, givens)), rng, level === 'orta' ? 0 : 9);
    const sol2 = to2(n, sol, String);
    const given = to2(n, sol.map((v, i) => (givens.has(i) ? String(v) : null)));
    const outside = [...kept].map((cl) => ({ side: cl.side, i: cl.i, text: String(cl.k) }));
    return { n, rows: n, cols: n, sol: sol2, given, outside, q: diagSumQuestion(rng, n, sol2) };
  },
  palette: (p) => range(p.n).map((i) => String(i + 1)),
  extra: (p) => ({ outside: p.outside, pad: { t: 1, l: 1, r: 1, b: 1 } }),
});
