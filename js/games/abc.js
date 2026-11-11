import { valueGame } from './base.js?v=5';
import { lineVars, randomFill, to2 } from './latin.js?v=5';
import { isUnique, reduceClues } from '../core/csp.js?v=5';
import { range, diagonalArrow, textOptions } from '../core/util.js?v=5';

const SYM = ['X', 'A', 'B', 'C'];

function lineConstraint(vs, nx) {
  return {
    vars: vs,
    check(a) {
      let seen = 0, x = 0, unk = 0;
      for (const v of vs) {
        const t = a[v];
        if (t < 0) { unk++; continue; }
        if (t === 0) { x++; continue; }
        if (seen & (1 << t)) return false;
        seen |= 1 << t;
      }
      return x <= nx && (unk || x === nx);
    },
  };
}
function clueConstraint(vs, letter) {
  return {
    vars: vs,
    check(a) {
      for (const v of vs) {
        if (a[v] < 0) return true;
        if (a[v] > 0) return a[v] === letter;
      }
      return false;
    },
  };
}

export default valueGame({
  id: 'abc',
  name: 'ABC Kadar Kolay',
  stage: 'okul',
  icon: '🔤',
  rules: 'Diyagrama A, B, C harflerinin her birini her satır ve sütunda birer kez yerleştir; kalan hücreler boş (X) kalır. Diyagramın dışındaki harfler, o yönden bakıldığında görülen ilk harfi gösterir.',
  levels: { kolay: '4×4', orta: '5×5' },
  generate(rng, level) {
    const n = level === 'orta' ? 5 : 4, nx = n - 3;
    const { rows, cols } = lineVars(n);
    const base = [...rows, ...cols].map((vs) => lineConstraint(vs, nx));
    const sol = randomFill(n, [0, 1, 2, 3], base, rng);
    // tüm dış ipuçları
    const clues = [];
    const firstOf = (vs) => { for (const v of vs) if (sol[v] > 0) return sol[v]; return 0; };
    for (let i = 0; i < n; i++) {
      clues.push({ side: 'top', i, vs: cols[i] });
      clues.push({ side: 'bottom', i, vs: cols[i].slice().reverse() });
      clues.push({ side: 'left', i, vs: rows[i] });
      clues.push({ side: 'right', i, vs: rows[i].slice().reverse() });
    }
    for (const cl of clues) cl.letter = firstOf(cl.vs);
    const all = range(n * n);
    const build = (keptClues, keptGivens) => ({
      n: n * n,
      domains: all.map((i) => (keptGivens.has(i) ? [sol[i]] : [0, 1, 2, 3])),
      constraints: [...base, ...[...keptClues].map((cl) => clueConstraint(cl.vs, cl.letter))],
      maxNodes: 40000,
    });
    const allClues = new Set(clues);
    const givens = reduceClues(all, (kg) => isUnique(build(allClues, kg)), rng);
    const keptClues = reduceClues(clues, (kc) => isUnique(build(kc, givens)), rng, level === 'orta' ? 0 : 8);
    const sol2 = to2(n, sol, (v) => SYM[v]);
    const given = to2(n, sol.map((v, i) => (givens.has(i) ? SYM[v] : null)));
    const outside = [...keptClues].map((cl) => ({ side: cl.side, i: cl.i, text: SYM[cl.letter] }));
    // daha çok harf içeren köşegeni seç (XXXXX gibi cevaplar olmasın)
    const d1 = diagonalArrow(rng, n), d2 = { arrow: { kind: 'diag', anti: !d1.arrow.anti }, cells: d1.cells.map(([r, c]) => [r, n - 1 - c]) };
    const xs = (d) => d.cells.filter(([r, c]) => sol[r * n + c] === 0).length;
    const { arrow, cells } = xs(d2) < xs(d1) ? d2 : d1;
    const ans = cells.map(([r, c]) => sol2[r][c]).join('');
    const q = {
      text: 'ABC kadar kolay sorusunun çözümünde ok yönündeki hücrelere gelecek harfler sırasıyla hangileridir? (Boş hücre = X)',
      arrow, cells,
      ...textOptions(rng, ans, () => {
        const s = ans.split('');
        if (rng.chance(0.5)) { const i = rng.int(0, n - 2); [s[i], s[i + 1]] = [s[i + 1], s[i]]; }
        else s[rng.int(0, n - 1)] = rng.pick(SYM);
        return s.join('');
      }),
    };
    return { n, rows: n, cols: n, sol: sol2, given, outside, q };
  },
  palette: () => ['A', 'B', 'C', 'X'],
  extra: (p) => ({ outside: p.outside, pad: { t: 1, l: 1, r: 1, b: 1 } }),
});
